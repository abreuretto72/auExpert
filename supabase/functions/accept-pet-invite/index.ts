/**
 * accept-pet-invite — aceita um convite de co-tutoria via token.
 *
 * Corpo da requisição:
 *   token  string — token UUID gerado pelo invite-pet-member
 *
 * Retorna: { pet_id: string, role: string }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const bearerToken = authHeader.replace('Bearer ', '');

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser(bearerToken);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // ── Body ──────────────────────────────────────────────────────────────────
    const { token } = await req.json() as { token: string };
    if (!token) return json({ error: 'token é obrigatório' }, 400);

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    // ── Buscar convite ────────────────────────────────────────────────────────
    const { data: invite, error: fetchErr } = await supa
      .from('pet_members')
      .select('id, pet_id, role, email, expires_at, accepted_at')
      .eq('invite_token', token)
      .eq('is_active', true)
      .is('accepted_at', null)
      .single();

    if (fetchErr || !invite) {
      return json({ error: 'Convite inválido ou já utilizado' }, 404);
    }

    // ── Verificar expiração ───────────────────────────────────────────────────
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      await supa
        .from('pet_members')
        .update({ is_active: false })
        .eq('id', invite.id);
      return json({ error: 'Convite expirado' }, 410);
    }

    // ── Verificar email (se o convite especificou um) ─────────────────────────
    if (invite.email && invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return json({ error: 'Este convite é para outro endereço de e-mail' }, 403);
    }

    // ── Aceitar convite ───────────────────────────────────────────────────────
    const { error: updateErr } = await supa
      .from('pet_members')
      .update({
        user_id:      user.id,
        accepted_at:  new Date().toISOString(),
        invite_token: null,   // invalida o token após uso
        updated_at:   new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateErr) throw updateErr;

    return json({ pet_id: invite.pet_id, role: invite.role });

  } catch (err) {
    console.error('[accept-pet-invite]', err);
    return json({ error: 'Erro interno' }, 500);
  }
});
