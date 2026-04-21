/**
 * professional-invite-expire — CRON Edge Function
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco D · sub-passo 2.4.3
 *
 * Varre convites pendentes cuja expires_at já passou e transiciona o status
 * para 'expired', gerando um audit event por convite expirado.
 *
 * POST /functions/v1/professional-invite-expire
 *
 * Body: {} (ignorado)
 *
 * Resposta 200:
 *   { ok: true, expired_count, expired_ids: [...], timestamp }
 *
 * Erros:
 *   500  erro interno
 *
 * Desenho:
 *   - verify_jwt = false no config.toml (invocada por pg_cron via net.http_post
 *     sem header Authorization — padrão do check-scheduled-events etc.)
 *   - Sem validateAuth — a função é fronteira do próprio sistema; a barreira
 *     contra invocação abusiva fica no gateway + verify_jwt=false aceitando
 *     apenas chamadas do servidor (rate limit do gateway + ausência de dados
 *     sensíveis na resposta tornam o risco irrelevante, igual aos demais
 *     CRONs do projeto)
 *   - Única UPDATE com RETURNING pra capturar em lote as linhas afetadas,
 *     depois batch INSERT em access_audit_log (1 linha audit por invite)
 *   - Idempotente: rodar 2x em sequência produz expired_count=0 na segunda
 *     (o WHERE status='pending' filtra os já processados)
 *   - actor_user_id=NULL — é um evento de sistema, não de usuário
 *   - Audit write é non-fatal: se falhar, UPDATE já foi comitado e não
 *     reconciliamos (melhor perder auditoria do que re-processar depois)
 *   - professional_id=NULL no audit — convite expira sem ter virado grant,
 *     e o destinatário pode não ter perfil profissional
 * ═══════════════════════════════════════════════════════════════════════════
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Constantes ────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Helpers ───────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ─── Handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')    return jsonResponse({ error: 'Method not allowed' }, 405);

  const startedAt = new Date().toISOString();
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. UPDATE em lote: todos os pending cuja expires_at já passou
  const nowIso = new Date().toISOString();
  const { data: expired, error: updErr } = await supa
    .from('access_invites')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', nowIso)
    .select('id, pet_id, invited_by, invite_email, role');

  if (updErr) {
    console.error('[professional-invite-expire] sweep UPDATE failed', updErr);
    return jsonResponse({ error: 'Erro ao expirar convites', code: 'INTERNAL' }, 500);
  }

  const rows = expired ?? [];
  const expiredCount = rows.length;

  if (expiredCount === 0) {
    return jsonResponse({
      ok: true,
      expired_count: 0,
      expired_ids: [],
      timestamp: startedAt,
    });
  }

  // 2. Batch audit insert (non-fatal)
  const auditRows = rows.map((r) => ({
    pet_id: r.pet_id,
    actor_user_id: null,
    professional_id: null,
    access_grant_id: null,
    event_type: 'invite_expired',
    target_table: 'access_invites',
    target_id: r.id,
    context: {
      invite_id: r.id,
      role: r.role,
      invite_email: r.invite_email,
      invited_by: r.invited_by,
      expired_at: nowIso,
    },
  }));

  const { error: auditErr } = await supa.from('access_audit_log').insert(auditRows);
  if (auditErr) {
    console.error(
      '[professional-invite-expire] audit batch insert failed (non-fatal)',
      auditErr,
      'expired_count=', expiredCount,
    );
  }

  console.log(
    `[professional-invite-expire] swept ${expiredCount} invite(s) at ${startedAt}`,
  );

  return jsonResponse({
    ok: true,
    expired_count: expiredCount,
    expired_ids: rows.map((r) => r.id),
    timestamp: startedAt,
  });
});
