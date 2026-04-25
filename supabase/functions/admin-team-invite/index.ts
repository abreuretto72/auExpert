/**
 * admin-team-invite — super-admin convida nova pessoa para o painel admin.
 *
 * POST body: { email: string, role: 'admin' | 'admin_financial' | 'admin_support' }
 * Auth: Bearer JWT obrigatório, role='admin' (super-admin)
 *
 * Resposta:
 *   {
 *     ok: true,
 *     invite_id: uuid,
 *     accept_url: string,    // link pro super-admin copiar/enviar
 *     token: string,         // mesmo token, exposto pra QR/print/etc.
 *     expires_at: ISO,
 *     emailed: boolean       // tenta enviar via Supabase Auth; se falhar, ok=true mas emailed=false
 *   }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// URL do admin-dashboard pra montar o link de aceite
const ADMIN_BASE_URL = Deno.env.get('ADMIN_BASE_URL') ?? 'https://admin.auexpert.com.br';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_ROLES = new Set(['admin', 'admin_financial', 'admin_support']);

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Token de 48 bytes em base64url (64 chars, ~256 bits de entropia). */
function generateToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return jsonResp({ error: 'unauthorized' }, 401);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: caller } = await sb
      .from('users')
      .select('role, is_active')
      .eq('id', user.id)
      .single();
    if (!caller || caller.role !== 'admin' || !caller.is_active) {
      return jsonResp({ error: 'forbidden — super-admin only' }, 403);
    }

    // ── Body ──────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const email = (body.email ?? '').toString().trim().toLowerCase();
    const role  = (body.role ?? '').toString();

    if (!email || !email.includes('@')) return jsonResp({ error: 'invalid email' }, 400);
    if (!VALID_ROLES.has(role))         return jsonResp({ error: 'invalid role' }, 400);

    // ── Verifica duplicata: convite pendente OU já é admin ────────────────
    const { data: existingAdmin } = await sb
      .from('users')
      .select('id, role')
      .eq('email', email)
      .eq('is_active', true)
      .maybeSingle();
    if (existingAdmin && ['admin','admin_financial','admin_support'].includes(existingAdmin.role)) {
      return jsonResp({
        error: 'user already has admin access',
        details: `Atual: ${existingAdmin.role}`,
      }, 409);
    }

    const { data: pendingInvite } = await sb
      .from('admin_invites')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (pendingInvite) {
      return jsonResp({
        error: 'pending invite already exists for this email',
        invite_id: pendingInvite.id,
      }, 409);
    }

    // ── Cria convite ──────────────────────────────────────────────────────
    const inviteToken = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const { data: invite, error: insErr } = await sb
      .from('admin_invites')
      .insert({
        email,
        role,
        token:      inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (insErr || !invite) {
      console.error('[admin-team-invite] insert failed:', insErr);
      return jsonResp({ error: 'failed to create invite', details: insErr?.message }, 500);
    }

    const acceptUrl = `${ADMIN_BASE_URL}/accept-invite?token=${inviteToken}`;

    // ── Tenta enviar email via Supabase Auth (best-effort) ────────────────
    // inviteUserByEmail só funciona se SMTP está configurado no Supabase.
    // Se não funciona, retornamos emailed: false e o admin copia o link manual.
    let emailed = false;
    try {
      const { error: emailErr } = await sb.auth.admin.inviteUserByEmail(email, {
        redirectTo: acceptUrl,
        data: {
          source: 'admin-team-invite',
          intended_role: role,
          invite_id: invite.id,
        },
      });
      if (!emailErr) emailed = true;
      else console.warn('[admin-team-invite] inviteUserByEmail failed:', emailErr.message);
    } catch (e) {
      console.warn('[admin-team-invite] email send exception:', e);
    }

    return jsonResp({
      ok: true,
      invite_id:  invite.id,
      accept_url: acceptUrl,
      token:      inviteToken,
      expires_at: expiresAt.toISOString(),
      emailed,
    });
  } catch (err) {
    console.error('[admin-team-invite] unhandled error:', err);
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
