/**
 * professional-invite-accept
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco C · sub-passo 2.3.4 + 2.5.2
 *
 * Profissional logado visualiza, aceita ou recusa convite emitido por
 * tutor/co-parent.
 *
 * POST /functions/v1/professional-invite-accept
 *
 * Body:
 *   token    string                             token base64url do convite
 *   action   'preview' | 'accept' | 'decline'   ação do profissional
 *
 * Resposta (preview) 200:
 *   { ok: true, invite_id, role, can_see_finances, scope_notes, expires_at,
 *     needs_onboarding, duplicate_active_grant,
 *     pet: { id, name, species, avatar_url },
 *     inviter: { display_name } }
 * Resposta (accept) 200:
 *   { ok: true, grant_id, pet_id, role, granted_at, invite_id }
 * Resposta (decline) 200:
 *   { ok: true, invite_id, status: 'declined' }
 *
 * Erros:
 *   400  payload inválido | action inválido
 *   401  sem/inválido Authorization Bearer
 *   403  email do convite não bate com user logado (WRONG_RECIPIENT)
 *          | user não tem perfil em professionals ao aceitar (NEEDS_ONBOARDING)
 *   404  token inexistente (INVITE_NOT_FOUND)
 *   409  grant ativo duplicado pro par (pet, professional) (DUPLICATE_ACTIVE_GRANT)
 *          | race condition perdida (RACE)
 *   410  convite já consumido ou expirado (GONE)
 *   500  erro interno
 *
 * Desenho:
 *   - verify_jwt = false no config.toml (ES256 vs HS256 gateway) — auth manual
 *   - Todas as escritas via service_role (RLS INSERT de access_grants exige tutor,
 *     e o profissional não bate — service_role é a fronteira)
 *   - Preview (read-only): carrega invite + pet + inviter via service_role
 *     (RLS dos JOINs falharia porque profissional ainda não tem grant ativo).
 *     Valida token, status, expiração e email match. NÃO exige perfil profissional
 *     (onboarding pode vir depois). Retorna flags needs_onboarding / duplicate_active_grant
 *     pra UI decidir o fluxo. Nenhuma escrita; não audita (leitura).
 *   - Ordem do accept (CHECK accepted_consistency exige created_grant_id quando
 *     status='accepted'):
 *       1) INSERT access_grants → obtém grant_id
 *       2) UPDATE access_invites (SET status='accepted', accepted_at, accepted_by,
 *            created_grant_id=grant_id) com WHERE id=? AND status='pending'
 *          → se affected=0 (race), DELETE do grant recém-criado + 409 RACE
 *       3) INSERT access_audit_log (event_type='grant_accepted')
 *   - Decline: UPDATE condicional (status='pending') + audit. Grant nunca criado.
 *   - Expirado (expires_at <= NOW()): responde 410; a transição pra status='expired'
 *     fica a cargo de um cron dedicado (fora do Bloco C).
 *   - Same-email check (invite_email vs users.email do logado): impede uso
 *     do link por terceiro. Normaliza lower-case antes de comparar.
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

const VALID_ACTIONS = ['preview', 'accept', 'decline'] as const;
type InviteAction = typeof VALID_ACTIONS[number];

// Invite status válidos (pra validar transição)
const CONSUMED_STATUSES = new Set(['accepted', 'declined', 'cancelled', 'expired']);

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

  const token  = typeof body.token  === 'string' ? body.token.trim()  : '';
  const action = typeof body.action === 'string' ? body.action.trim() : '';

  if (!token) {
    return jsonResponse(errorBody('MISSING_TOKEN', 'token é obrigatório'), 400);
  }
  if (!VALID_ACTIONS.includes(action as InviteAction)) {
    return jsonResponse(
      errorBody('INVALID_ACTION', `action inválido. Esperado: ${VALID_ACTIONS.join(' ou ')}`),
      400,
    );
  }
  const typedAction = action as InviteAction;

  // 3. Client service_role (bypassa RLS — fronteira é aqui)
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  // 4. Carrega invite pelo token
  const { data: invite, error: invErr } = await supa
    .from('access_invites')
    .select(
      'id, pet_id, invited_by, invite_email, role, can_see_finances, scope_notes, expires_at, status, created_at',
    )
    .eq('token', token)
    .maybeSingle();

  if (invErr) {
    console.error('[professional-invite-accept] invite lookup error', invErr);
    return jsonResponse(errorBody('INTERNAL', 'Erro ao buscar convite'), 500);
  }
  if (!invite) {
    return jsonResponse(errorBody('INVITE_NOT_FOUND', 'Convite não encontrado'), 404);
  }

  // 5. Validações de estado
  if (CONSUMED_STATUSES.has(invite.status)) {
    return jsonResponse(
      errorBody('GONE', `Convite já foi ${invite.status}`),
      410,
    );
  }
  if (new Date(invite.expires_at).getTime() <= Date.now()) {
    return jsonResponse(
      errorBody('GONE', 'Convite expirado'),
      410,
    );
  }

  // 6. Verifica que o user logado é o destinatário (email match)
  const { data: me } = await supa
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .maybeSingle();

  const myEmail = (me?.email ?? '').trim().toLowerCase();
  if (!myEmail || myEmail !== invite.invite_email) {
    return jsonResponse(
      errorBody('WRONG_RECIPIENT', 'Convite destinado a outro usuário'),
      403,
    );
  }

  // 7. Carrega perfil profissional do user (pode ser null pra decline)
  const { data: professional } = await supa
    .from('professionals')
    .select('id, display_name, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  const hasProfile = professional && professional.is_active;

  // ──────────────────────────────────────────────────────────────────────
  // PREVIEW FLOW (read-only; não escreve, não audita)
  // ──────────────────────────────────────────────────────────────────────
  if (typedAction === 'preview') {
    // Pet: nome + espécie + avatar pra card de boas-vindas
    const { data: pet, error: petErr } = await supa
      .from('pets')
      .select('id, name, species, avatar_url')
      .eq('id', invite.pet_id)
      .maybeSingle();
    if (petErr) {
      console.error('[professional-invite-accept] preview pet lookup failed', petErr);
      return jsonResponse(errorBody('INTERNAL', 'Erro ao carregar pet do convite'), 500);
    }

    // Tutor/co-parent que emitiu (users.full_name ou fallback pra email parte local)
    const { data: inviter } = await supa
      .from('users')
      .select('id, full_name, email')
      .eq('id', invite.invited_by)
      .maybeSingle();

    const inviterDisplay =
      inviter?.full_name?.trim() ||
      (inviter?.email ? inviter.email.split('@')[0] : null) ||
      null;

    // Duplicate active grant pro mesmo par (pet, professional) — só se já tem perfil
    let duplicateActiveGrant = false;
    if (hasProfile) {
      const { data: existing } = await supa
        .from('access_grants')
        .select('id')
        .eq('pet_id', invite.pet_id)
        .eq('professional_id', professional.id)
        .eq('is_active', true)
        .maybeSingle();
      duplicateActiveGrant = !!existing;
    }

    return jsonResponse({
      ok: true,
      invite_id: invite.id,
      role: invite.role,
      can_see_finances: invite.can_see_finances,
      scope_notes: invite.scope_notes,
      expires_at: invite.expires_at,
      needs_onboarding: !hasProfile,
      duplicate_active_grant: duplicateActiveGrant,
      pet: pet
        ? {
            id: pet.id,
            name: pet.name,
            species: pet.species,
            avatar_url: pet.avatar_url ?? null,
          }
        : null,
      inviter: {
        display_name: inviterDisplay,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // DECLINE FLOW
  // ──────────────────────────────────────────────────────────────────────
  if (typedAction === 'decline') {
    const { data: declined, error: updErr } = await supa
      .from('access_invites')
      .update({ status: 'declined' })
      .eq('id', invite.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (updErr) {
      console.error('[professional-invite-accept] decline update failed', updErr);
      return jsonResponse(errorBody('INTERNAL', 'Erro ao recusar convite'), 500);
    }
    if (!declined) {
      // Race: alguém consumiu entre SELECT e UPDATE
      return jsonResponse(errorBody('GONE', 'Convite já foi consumido'), 410);
    }

    // Audit (non-fatal)
    const { error: auditErr } = await supa.from('access_audit_log').insert({
      pet_id: invite.pet_id,
      actor_user_id: userId,
      professional_id: hasProfile ? professional.id : null,
      access_grant_id: null,
      event_type: 'invite_declined',
      target_table: 'access_invites',
      target_id: invite.id,
      context: {
        invite_id: invite.id,
        role: invite.role,
        invited_by: invite.invited_by,
      },
    });
    if (auditErr) {
      console.error('[professional-invite-accept] audit write failed (non-fatal)', auditErr);
    }

    return jsonResponse({
      ok: true,
      invite_id: invite.id,
      status: 'declined',
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // ACCEPT FLOW
  // ──────────────────────────────────────────────────────────────────────

  // 8. Exige perfil profissional pro accept
  if (!hasProfile) {
    return jsonResponse(
      errorBody('NEEDS_ONBOARDING', 'É necessário completar o cadastro como profissional antes de aceitar o convite'),
      403,
    );
  }

  // 9. Verifica duplicate active grant (pet, professional) — UNIQUE index cobre,
  //    mas retornamos 409 antes do INSERT pra mensagem clara.
  const { data: existingGrant } = await supa
    .from('access_grants')
    .select('id')
    .eq('pet_id', invite.pet_id)
    .eq('professional_id', professional.id)
    .eq('is_active', true)
    .maybeSingle();

  if (existingGrant) {
    return jsonResponse(
      errorBody(
        'DUPLICATE_ACTIVE_GRANT',
        'Já existe um acesso ativo seu para este pet. Peça ao tutor para revogar o acesso atual antes de aceitar um novo.',
      ),
      409,
    );
  }

  // 10. INSERT access_grants (grant-first, depois UPDATE invite — CHECK
  //     accepted_consistency exige created_grant_id NOT NULL quando status='accepted')
  const nowIso = new Date().toISOString();
  const { data: grant, error: grantErr } = await supa
    .from('access_grants')
    .insert({
      pet_id: invite.pet_id,
      professional_id: professional.id,
      granted_by: invite.invited_by,
      role: invite.role,
      invite_token: token,
      invite_sent_at: invite.created_at,
      accepted_at: nowIso,
      expires_at: null,                    // MVP: sem prazo no grant; tutor revoga
      can_see_finances: invite.can_see_finances,
      scope_notes: invite.scope_notes,
      is_active: true,
    })
    .select('id, pet_id, role')
    .single();

  if (grantErr || !grant) {
    // Pode ser UNIQUE violation do partial index (is_active=true) em corrida
    const message = grantErr?.message ?? '';
    if (message.includes('access_grants_unique_active_idx') || message.toLowerCase().includes('unique')) {
      return jsonResponse(
        errorBody('DUPLICATE_ACTIVE_GRANT', 'Já existe um acesso ativo seu para este pet'),
        409,
      );
    }
    console.error('[professional-invite-accept] grant insert failed', grantErr);
    return jsonResponse(errorBody('INTERNAL', 'Erro ao criar acesso'), 500);
  }

  // 11. UPDATE invite condicional (WHERE status='pending') — se perder a
  //     corrida, rollback do grant criado.
  const { data: accepted, error: acceptErr } = await supa
    .from('access_invites')
    .update({
      status: 'accepted',
      accepted_at: nowIso,
      accepted_by: userId,
      created_grant_id: grant.id,
    })
    .eq('id', invite.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (acceptErr || !accepted) {
    // Race: alguém consumiu o invite enquanto criávamos o grant.
    // Rollback manual do grant pra não deixar órfão.
    const { error: rollbackErr } = await supa
      .from('access_grants')
      .delete()
      .eq('id', grant.id);
    if (rollbackErr) {
      console.error('[professional-invite-accept] rollback failed — orphan grant', rollbackErr, 'grant_id=', grant.id);
    }
    if (acceptErr) {
      console.error('[professional-invite-accept] invite accept update failed', acceptErr);
      return jsonResponse(errorBody('INTERNAL', 'Erro ao marcar convite como aceito'), 500);
    }
    return jsonResponse(errorBody('RACE', 'Convite foi consumido por outra ação'), 409);
  }

  // 12. Audit log (non-fatal)
  const { error: auditErr } = await supa.from('access_audit_log').insert({
    pet_id: invite.pet_id,
    actor_user_id: userId,
    professional_id: professional.id,
    access_grant_id: grant.id,
    event_type: 'grant_accepted',
    target_table: 'access_grants',
    target_id: grant.id,
    context: {
      invite_id: invite.id,
      role: invite.role,
      invited_by: invite.invited_by,
    },
  });
  if (auditErr) {
    console.error('[professional-invite-accept] audit write failed (non-fatal)', auditErr);
  }

  return jsonResponse({
    ok: true,
    grant_id: grant.id,
    pet_id: grant.pet_id,
    role: grant.role,
    granted_at: nowIso,
    invite_id: invite.id,
  });
});
