/**
 * professional-invite-create
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco B · sub-passo 2.2.4
 *
 * Tutor ou co-parent cria convite pro profissional aceitar acesso ao pet.
 * Grava linha em access_invites (pendente) + access_audit_log (invite_created)
 * + notifications_queue (stub de email).
 *
 * POST /functions/v1/professional-invite-create
 *
 * Body:
 *   pet_id            string   UUID do pet
 *   invite_email      string   email do profissional (normalizado para lowercase)
 *   role              string   papel do grant (um dos 10 roles)
 *   can_see_finances  boolean? default false
 *   scope_notes       string?  nota livre que acompanha o grant
 *   expires_days      number?  1..30 (default 7)
 *   locale            string?  pt-BR | en-US | es-MX | es-AR | pt-PT (default pt-BR)
 *
 * Resposta 201:
 *   { invite_id, token, invite_link, expires_at }
 *
 * Erros:
 *   400  payload inválido | email inválido | role inválido | expires_days fora do range
 *   401  sem/inválido Authorization Bearer
 *   403  usuário não é owner do pet nem co_parent ativo
 *   404  pet não existe
 *   409  já existe convite pendente pra esse email nesse pet
 *   429  rate limit (20 convites/hora por usuário)
 *   500  erro interno
 *
 * Segurança:
 *   - verify_jwt = false no config.toml (projeto usa ES256, gateway espera HS256)
 *   - Auth manual via validateAuth() (faz getUser contra o Auth server)
 *   - Token de 48 bytes (≥256 bits) via crypto.getRandomValues + base64url
 *   - Todas as escritas usam service_role (bypassa RLS da access_invites — fronteira é aqui)
 *   - RESPONSE: token retornado apenas uma vez, nunca mais lido do banco
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
const APP_URL      = Deno.env.get('APP_URL') ?? 'auexpert://';

const VALID_ROLES = [
  'vet_full', 'vet_read', 'vet_tech', 'groomer', 'trainer',
  'walker', 'sitter', 'boarding', 'shop_employee', 'ong_member',
] as const;
type AccessRole = typeof VALID_ROLES[number];

const VALID_LOCALES = ['pt-BR', 'en-US', 'es-MX', 'es-AR', 'pt-PT'] as const;
type Locale = typeof VALID_LOCALES[number];

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

const MAX_INVITES_PER_HOUR   = 20;
const DEFAULT_EXPIRES_DAYS   = 7;
const MIN_EXPIRES_DAYS       = 1;
const MAX_EXPIRES_DAYS       = 30;
const MAX_SCOPE_NOTES_LENGTH = 500;

// ─── Helpers ───────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Gera token URL-safe de 48 bytes = 64 chars base64url (≥256 bits efetivos). */
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(48));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  // btoa + troca pra base64url + remove padding
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

type InviteEmailTemplate = { subject: string; body: string };

function emailTemplate(locale: Locale, petName: string, inviterName: string): InviteEmailTemplate {
  const t: Record<Locale, InviteEmailTemplate> = {
    'pt-BR': {
      subject: `${inviterName} convidou você para cuidar de ${petName} no auExpert`,
      body: `${inviterName} te convidou para acessar o perfil de ${petName} no auExpert. Abra o link do convite para aceitar.`,
    },
    'pt-PT': {
      subject: `${inviterName} convidou-o para cuidar de ${petName} no auExpert`,
      body: `${inviterName} convidou-o para aceder ao perfil de ${petName} no auExpert. Abra a ligação do convite para aceitar.`,
    },
    'en-US': {
      subject: `${inviterName} invited you to care for ${petName} on auExpert`,
      body: `${inviterName} invited you to access ${petName}'s profile on auExpert. Open the invite link to accept.`,
    },
    'es-MX': {
      subject: `${inviterName} te invitó a cuidar a ${petName} en auExpert`,
      body: `${inviterName} te invitó a acceder al perfil de ${petName} en auExpert. Abre el enlace de invitación para aceptar.`,
    },
    'es-AR': {
      subject: `${inviterName} te invitó a cuidar a ${petName} en auExpert`,
      body: `${inviterName} te invitó a acceder al perfil de ${petName} en auExpert. Abrí el enlace de invitación para aceptar.`,
    },
  };
  return t[locale];
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

  const pet_id           = typeof body.pet_id === 'string' ? body.pet_id : '';
  const raw_email        = typeof body.invite_email === 'string' ? body.invite_email : '';
  const role             = typeof body.role === 'string' ? body.role : '';
  const can_see_finances = typeof body.can_see_finances === 'boolean' ? body.can_see_finances : false;
  const scope_notes      = typeof body.scope_notes === 'string' ? body.scope_notes.trim() : null;
  const expires_days_raw = typeof body.expires_days === 'number' ? body.expires_days : DEFAULT_EXPIRES_DAYS;
  const locale_raw       = typeof body.locale === 'string' ? body.locale : 'pt-BR';

  // 3. Validar campos
  if (!pet_id || !raw_email || !role) {
    return jsonResponse({ error: 'pet_id, invite_email e role são obrigatórios' }, 400);
  }

  const invite_email = raw_email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(invite_email)) {
    return jsonResponse({ error: 'invite_email inválido' }, 400);
  }

  if (!VALID_ROLES.includes(role as AccessRole)) {
    return jsonResponse({ error: `role inválido. Esperado um de: ${VALID_ROLES.join(', ')}` }, 400);
  }

  const expires_days = Math.floor(expires_days_raw);
  if (!Number.isFinite(expires_days) || expires_days < MIN_EXPIRES_DAYS || expires_days > MAX_EXPIRES_DAYS) {
    return jsonResponse({
      error: `expires_days fora do range (${MIN_EXPIRES_DAYS}..${MAX_EXPIRES_DAYS})`,
    }, 400);
  }

  if (scope_notes && scope_notes.length > MAX_SCOPE_NOTES_LENGTH) {
    return jsonResponse({ error: `scope_notes excede ${MAX_SCOPE_NOTES_LENGTH} caracteres` }, 400);
  }

  const locale: Locale = (VALID_LOCALES as readonly string[]).includes(locale_raw)
    ? (locale_raw as Locale)
    : 'pt-BR';

  // 4. Client com service_role (todas as queries e writes)
  const supa = createClient(SUPABASE_URL, SERVICE_KEY);

  // 5. Verificar pet + permissão
  const { data: pet, error: petErr } = await supa
    .from('pets')
    .select('id, name, user_id, is_active')
    .eq('id', pet_id)
    .maybeSingle();

  if (petErr) {
    console.error('[professional-invite-create] pet lookup error', petErr);
    return jsonResponse({ error: 'Erro ao buscar pet' }, 500);
  }
  if (!pet || !pet.is_active) {
    return jsonResponse({ error: 'Pet não encontrado' }, 404);
  }

  let isAuthorized = pet.user_id === userId;

  if (!isAuthorized) {
    const { data: member } = await supa
      .from('pet_members')
      .select('role')
      .eq('pet_id', pet_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('accepted_at', 'is', null)
      .maybeSingle();

    isAuthorized = member?.role === 'co_parent';
  }

  if (!isAuthorized) {
    return jsonResponse({ error: 'Sem permissão para convidar profissionais para este pet' }, 403);
  }

  // 6. Rate limit — 20 convites/hora por usuário
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recentCount, error: rateErr } = await supa
    .from('access_invites')
    .select('id', { count: 'exact', head: true })
    .eq('invited_by', userId)
    .gte('created_at', oneHourAgo);

  if (rateErr) {
    console.error('[professional-invite-create] rate limit lookup error', rateErr);
    return jsonResponse({ error: 'Erro ao verificar rate limit' }, 500);
  }
  if ((recentCount ?? 0) >= MAX_INVITES_PER_HOUR) {
    return jsonResponse({
      error: `Limite de ${MAX_INVITES_PER_HOUR} convites por hora atingido. Tente novamente mais tarde.`,
    }, 429);
  }

  // 7. Dedup — já existe convite pendente pra esse email neste pet?
  const { data: existing } = await supa
    .from('access_invites')
    .select('id')
    .eq('pet_id', pet_id)
    .eq('invite_email', invite_email)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return jsonResponse({
      error: 'Já existe convite pendente para este email neste pet',
      invite_id: existing.id,
    }, 409);
  }

  // 8. Buscar nome do tutor (para email + audit)
  const { data: inviter } = await supa
    .from('users')
    .select('full_name, email')
    .eq('id', userId)
    .maybeSingle();

  const inviterName  = inviter?.full_name ?? 'Um tutor';
  const inviterEmail = inviter?.email ?? null;

  // 9. Criar convite
  const token      = generateToken();
  const now        = new Date();
  const expires_at = new Date(now.getTime() + expires_days * 86_400_000).toISOString();

  const { data: invite, error: insertErr } = await supa
    .from('access_invites')
    .insert({
      pet_id,
      invited_by: userId,
      invite_email,
      role,
      can_see_finances,
      scope_notes,
      token,
      expires_at,
      status: 'pending',
    })
    .select('id, expires_at')
    .single();

  if (insertErr || !invite) {
    console.error('[professional-invite-create] insert failed', insertErr);
    return jsonResponse({ error: 'Erro ao criar convite' }, 500);
  }

  const invite_link = `${APP_URL.replace(/\/+$/, '')}/invite/${token}`;

  // 10. Audit log
  const { error: auditErr } = await supa.from('access_audit_log').insert({
    pet_id,
    actor_user_id: userId,
    access_grant_id: null,
    event_type: 'invite_created',
    target_table: 'access_invites',
    target_id: invite.id,
    context: {
      invite_email,
      role,
      can_see_finances,
      expires_at: invite.expires_at,
      inviter_email: inviterEmail,
      locale,
    },
  });
  if (auditErr) {
    console.error('[professional-invite-create] audit write failed (non-fatal)', auditErr);
  }

  // 11. Email stub via notifications_queue
  // TODO(2.2.5 real): substituir por Resend/SendGrid direto ou cron dedicado
  const tpl = emailTemplate(locale, pet.name, inviterName);
  const { error: queueErr } = await supa.from('notifications_queue').insert({
    user_id: userId,              // workaround: recipient não tem user_id
    pet_id,
    type: 'professional_invite_email_pending',
    title: tpl.subject,
    body: tpl.body,
    data: {
      recipient_email: invite_email,
      token,
      role,
      expires_at: invite.expires_at,
      pet_name: pet.name,
      pet_id,
      inviter_name: inviterName,
      inviter_email: inviterEmail,
      invite_link,
      invite_id: invite.id,
      locale,
    },
  });
  if (queueErr) {
    console.error('[professional-invite-create] queue write failed (non-fatal)', queueErr);
  }

  // 12. Resposta
  return jsonResponse({
    invite_id: invite.id,
    token,
    invite_link,
    expires_at: invite.expires_at,
  }, 201);
});
