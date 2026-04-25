/**
 * admin-team-accept — convidado clica no link e aceita virar admin do painel.
 *
 * GET  /admin-team-accept?token=XXX → retorna info do convite (email, role, expires)
 *                                      pra UI mostrar "Você foi convidado como X"
 * POST body:
 *   {
 *     token: string,                 // sempre obrigatório
 *     password?: string,             // se user novo (cadastrar senha)
 *     full_name?: string             // se user novo
 *   }
 *   ── Auth obrigatório no POST se já existe conta com esse email; se for
 *      conta nova, dispensa Bearer JWT.
 *
 * Resp POST:
 *   { ok: true, user_id: uuid, role: 'admin' | ..., redirect: '/' }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

interface AdminInviteRow {
  id: string;
  email: string;
  role: 'admin' | 'admin_financial' | 'admin_support';
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by: string | null;
}

async function loadInvite(sb: ReturnType<typeof createClient>, token: string): Promise<{
  invite: AdminInviteRow | null;
  error?: string;
}> {
  if (!token || token.length < 43) return { invite: null, error: 'invalid token' };
  const { data, error } = await sb
    .from('admin_invites')
    .select('id, email, role, expires_at, accepted_at, revoked_at, invited_by')
    .eq('token', token)
    .maybeSingle();
  if (error) return { invite: null, error: error.message };
  if (!data)  return { invite: null, error: 'invite not found' };

  if (data.revoked_at)  return { invite: null, error: 'invite revoked' };
  if (data.accepted_at) return { invite: null, error: 'invite already accepted' };
  if (new Date(data.expires_at) < new Date()) return { invite: null, error: 'invite expired' };

  return { invite: data as AdminInviteRow };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── GET: info do convite pra UI mostrar antes de aceitar ────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') ?? '';
    const { invite, error } = await loadInvite(sb, token);
    if (!invite) return jsonResp({ error: error ?? 'invalid invite' }, 400);

    return jsonResp({
      email: invite.email,
      role:  invite.role,
      expires_at: invite.expires_at,
    });
  }

  // ── POST: aceitar o convite ─────────────────────────────────────────────
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token     = (body.token ?? '').toString();
    const password  = body.password as string | undefined;
    const full_name = (body.full_name ?? '').toString().trim();

    const { invite, error } = await loadInvite(sb, token);
    if (!invite) return jsonResp({ error: error ?? 'invalid invite' }, 400);

    // ── Já existe user no auth com esse email? ────────────────────────────
    // Tentamos resolver pela tabela public.users primeiro (mais barato)
    const { data: existingPublicUser } = await sb
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', invite.email)
      .maybeSingle();

    let userId: string;

    if (existingPublicUser) {
      // ── Caminho A: usuário já existe (provavelmente é tutor) ──────────
      // Exige Bearer JWT comprovando que quem está aceitando É essa pessoa
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return jsonResp({
          error: 'auth required',
          message: 'Esse e-mail já tem conta. Faça login pelo app primeiro e tente o link novamente.',
        }, 401);
      }
      const jwt = authHeader.replace('Bearer ', '');
      const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user: authUser } } = await anon.auth.getUser(jwt);

      if (!authUser || authUser.id !== existingPublicUser.id) {
        return jsonResp({
          error: 'wrong account',
          message: 'O e-mail do convite não corresponde à conta logada.',
        }, 403);
      }
      userId = existingPublicUser.id;
    } else {
      // ── Caminho B: usuário novo — cria auth + public.users ──────────
      if (!password || password.length < 8) {
        return jsonResp({ error: 'password required (min 8 chars)' }, 400);
      }

      // Cria no auth.users
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,                  // já confirma — convite valida o email
        user_metadata: { invited_via: 'admin-team-accept' },
      });
      if (createErr || !created.user) {
        console.error('[admin-team-accept] createUser failed:', createErr);
        return jsonResp({
          error: 'failed to create account',
          details: createErr?.message,
        }, 500);
      }

      userId = created.user.id;

      // Cria row em public.users com role do convite
      const { error: insErr } = await sb.from('users').insert({
        id:        userId,
        email:     invite.email,
        full_name: full_name || invite.email.split('@')[0],
        role:      invite.role,
        is_active: true,
      });
      if (insErr) {
        console.error('[admin-team-accept] users insert failed:', insErr);
        return jsonResp({
          error: 'failed to create profile',
          details: insErr.message,
        }, 500);
      }
    }

    // ── Atribui o role (caso A: user existia como tutor; caso B: já no insert acima)
    if (existingPublicUser) {
      const { error: roleErr } = await sb
        .from('users')
        .update({ role: invite.role, is_active: true })
        .eq('id', userId);
      if (roleErr) {
        console.error('[admin-team-accept] role update failed:', roleErr);
        return jsonResp({ error: 'failed to update role', details: roleErr.message }, 500);
      }
    }

    // ── Marca convite como aceito ──────────────────────────────────────
    await sb.from('admin_invites').update({
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    }).eq('id', invite.id);

    return jsonResp({
      ok: true,
      user_id: userId,
      role: invite.role,
      redirect: '/',
      already_existed: !!existingPublicUser,
    });
  } catch (err) {
    console.error('[admin-team-accept] unhandled:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
