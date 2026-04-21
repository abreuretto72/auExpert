/**
 * professional-invite-cancel
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco D · sub-passo 2.4.2
 *
 * Tutor (ou co-parent quem emitiu o convite) revoga um convite pendente antes
 * do profissional aceitar/recusar/expirar.
 *
 * POST /functions/v1/professional-invite-cancel
 *
 * Body:
 *   invite_id  uuid    id do convite (access_invites.id)
 *
 * Resposta 200:
 *   { ok: true, invite_id, status: 'cancelled' }
 *
 * Erros:
 *   400  payload inválido | MISSING_INVITE_ID
 *   401  sem/inválido Authorization Bearer
 *   403  user logado não é o emissor do convite (UNAUTHORIZED)
 *   404  invite_id inexistente (INVITE_NOT_FOUND)
 *   409  convite não está mais pendente (INVALID_STATE — accepted/declined/
 *        cancelled/expired)
 *   500  erro interno
 *
 * Desenho:
 *   - verify_jwt = false no config.toml (ES256 vs HS256 gateway) — auth manual
 *   - Escrita via service_role (não há policy UPDATE aberta pra authenticated
 *     em access_invites; fronteira é a EF, igual às demais do lifecycle)
 *   - Identifica invite por id (não por token) — o tutor/emissor não precisa
 *     armazenar token, apenas o id que vem da própria listagem dele
 *   - Enforcement de ownership é feito em memória antes do UPDATE (para
 *     distinguir 403 UNAUTHORIZED de 404 INVITE_NOT_FOUND) e reforçado no
 *     WHERE do UPDATE (defense in depth contra TOCTOU)
 *   - UPDATE condicional WHERE status='pending' AND invited_by=userId
 *     → se affected=0 após já termos confirmado ownership, é race →
 *       re-lê status atual pra mensagem precisa (INVALID_STATE)
 *   - Audit event_type='invite_cancelled' (non-fatal write); CHECK já aceita
 *     desde migration 20260423_access_audit_event_invite.sql (sub-passo 2.2.4)
 *   - professional_id sempre NULL no audit — o convite é cancelado antes
 *     de virar grant, e o destinatário pode nem ter perfil profissional ainda
 * ═══════════════════════════════════════════════════════════════════════════
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { validateAuth } from "../_shared/validate-auth.ts";

// ─── Constantes ────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// UUID v4/v5 (case-insensitive, aceita 8-4-4-4-12)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Helpers ───────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function errorBody(code: string, message: string): { error: string; code: string } {
  return { error: message, code };
}

// ─── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return jsonResponse({ error: 'Method not allowed' }, 405);

  // 1. Auth
  const auth = await validateAuth(req, CORS);
  if (auth instanceof Response) return auth;
  const userId = auth.userId;

  // 2. Parse body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const inviteId = typeof body.invite_id === 'string' ? body.invite_id.trim() : '';
  if (!inviteId) {
    return jsonResponse(errorBody('MISSING_INVITE_ID', 'invite_id é obrigatório'), 400);
  }
  if (!UUID_RE.test(inviteId)) {
    return jsonResponse(errorBody('MISSING_INVITE_ID', 'invite_id deve ser um UUID válido'), 400);
  }

  // 3. Client service_role (bypassa RLS — fronteira é aqui)
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  // 4. Carrega invite pelo id (precisa saber invited_by e status antes do UPDATE
  //    pra distinguir 404 de 403 de 409)
  const { data: invite, error: invErr } = await supa
    .from('access_invites')
    .select('id, pet_id, invited_by, invite_email, role, status')
    .eq('id', inviteId)
    .maybeSingle();

  if (invErr) {
    console.error('[professional-invite-cancel] invite lookup error', invErr);
    return jsonResponse(errorBody('INTERNAL', 'Erro ao buscar convite'), 500);
  }
  if (!invite) {
    return jsonResponse(errorBody('INVITE_NOT_FOUND', 'Convite não encontrado'), 404);
  }

  // 5. Ownership: só quem emitiu pode cancelar
  if (invite.invited_by !== userId) {
    return jsonResponse(
      errorBody('UNAUTHORIZED', 'Apenas quem emitiu o convite pode cancelá-lo'),
      403,
    );
  }

  // 6. Estado: só pending pode virar cancelled
  if (invite.status !== 'pending') {
    return jsonResponse(
      errorBody('INVALID_STATE', `Convite já está ${invite.status} e não pode ser cancelado`),
      409,
    );
  }

  // 7. UPDATE condicional (defense-in-depth contra race com accept/decline/expire)
  const { data: cancelled, error: updErr } = await supa
    .from('access_invites')
    .update({ status: 'cancelled' })
    .eq('id', invite.id)
    .eq('status', 'pending')
    .eq('invited_by', userId)
    .select('id, status')
    .maybeSingle();

  if (updErr) {
    console.error('[professional-invite-cancel] update failed', updErr);
    return jsonResponse(errorBody('INTERNAL', 'Erro ao cancelar convite'), 500);
  }
  if (!cancelled) {
    // Race: entre SELECT e UPDATE alguém mudou o status. Re-lê pra mensagem clara.
    const { data: fresh } = await supa
      .from('access_invites')
      .select('status')
      .eq('id', invite.id)
      .maybeSingle();
    return jsonResponse(
      errorBody(
        'INVALID_STATE',
        `Convite já está ${fresh?.status ?? 'indisponível'} e não pode ser cancelado`,
      ),
      409,
    );
  }

  // 8. Audit log (non-fatal)
  const { error: auditErr } = await supa.from('access_audit_log').insert({
    pet_id: invite.pet_id,
    actor_user_id: userId,
    professional_id: null,
    access_grant_id: null,
    event_type: 'invite_cancelled',
    target_table: 'access_invites',
    target_id: invite.id,
    context: {
      invite_id: invite.id,
      role: invite.role,
      invite_email: invite.invite_email,
    },
  });
  if (auditErr) {
    console.error('[professional-invite-cancel] audit write failed (non-fatal)', auditErr);
  }

  return jsonResponse({
    ok: true,
    invite_id: invite.id,
    status: 'cancelled',
  });
});
