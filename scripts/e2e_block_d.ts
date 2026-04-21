/**
 * e2e_block_d.ts — Fase 2, Bloco D (cancel / expire de convites profissionais)
 *
 * Purpose
 * -------
 * Valida as Edge Functions do lifecycle terminal de convites:
 *   - `professional-invite-cancel` (sub-passo 2.4.2): tutor/emissor revoga pending
 *   - `professional-invite-expire` (sub-passo 2.4.3): CRON sweep idempotente
 *
 * Importa primitivas de `e2e_pro_module.ts` (createTutor / createProfessional /
 * createPet / asUser / cleanup).
 *
 * Cenários (ordem importa — D6 depende do estado de D5, D7 depende de D1):
 *
 *   D1. Cancel happy path
 *       Tutor emite invite pending e cancela pelo invite_id.
 *       → 200 + { ok, invite_id, status: 'cancelled' }
 *       → access_invites.status='cancelled'
 *       → 1 linha access_audit_log (event_type='invite_cancelled',
 *         actor_user_id=tutor, access_grant_id=null)
 *
 *   D2. Cancel por não-emissor
 *       Tutor A emite, tutor B (outro owner) tenta cancelar pelo invite_id.
 *       → 403 + code='UNAUTHORIZED'
 *       → invite permanece pending
 *
 *   D3. Cancel de invite não-pending
 *       Invite pré-setado com status='declined' via admin. Emissor tenta cancelar.
 *       → 409 + code='INVALID_STATE'
 *       → invite permanece declined (não vira cancelled)
 *
 *   D4. Cancel com invite_id inexistente
 *       UUID aleatório que não existe em access_invites.
 *       → 404 + code='INVITE_NOT_FOUND'
 *
 *   D5. Expire happy path
 *       Insere invite com expires_at no passado e status='pending'. Dispara a
 *       EF de sweep sem Authorization (fluxo pg_cron).
 *       → 200 + expired_ids inclui o invite; invite.status='expired'
 *       → 1 linha audit invite_expired (actor_user_id=null, professional_id=null)
 *
 *   D6. Expire idempotente
 *       Roda a EF de sweep uma segunda vez. O invite de D5 NÃO deve aparecer
 *       em expired_ids, e não deve ser criada nova linha audit invite_expired
 *       para ele.
 *
 *   D7. Accept sobre invite cancelled em D1
 *       Pro destinatário tenta aceitar o invite que já foi cancelled.
 *       → 410 + code='GONE' (CONSUMED_STATUSES.has('cancelled') em
 *         professional-invite-accept)
 *
 * Rodar:
 *   npx tsx scripts/e2e_block_d.ts
 *
 * Exit 0 em sucesso, 1 em qualquer falha. Sempre tenta cleanup.
 *
 * Cleanup
 * -------
 * `access_invites.pet_id → pets ON DELETE CASCADE` e
 * `access_audit_log.pet_id → pets ON DELETE CASCADE` — o cleanup padrão do
 * registry (que deleta pets+professionals+users) basta pra tirar convites
 * e audits deste harness.
 */

import { randomBytes, randomUUID } from 'node:crypto';
import {
  adminClient,
  asUser,
  cleanup,
  createPet,
  createProfessional,
  createTutor,
  tracked,
} from './e2e_pro_module';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Env check ────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(): void {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ANON_KEY) missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    console.error(`[block-d] Missing env vars: ${missing.join(', ')}`);
    console.error('[block-d] See scripts/e2e_pro_module.README.md for setup.');
    process.exit(1);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type HttpResp = { status: number; body: unknown };

async function callInviteCancel(
  accessToken: string,
  payload: { invite_id: string },
): Promise<HttpResp> {
  const res = await asUser(accessToken, '/functions/v1/professional-invite-cancel', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await parseBody(res) };
}

/**
 * A EF de expire tem verify_jwt=false e é invocada por pg_cron sem Authorization.
 * Usamos fetch direto (não asUser) pra refletir exatamente esse fluxo — apikey
 * no header pra passar pelo gateway, sem Bearer token.
 */
async function callInviteExpire(): Promise<HttpResp> {
  const url = `${SUPABASE_URL}/functions/v1/professional-invite-expire`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY!,
    },
    body: '{}',
  });
  return { status: res.status, body: await parseBody(res) };
}

async function callInviteAccept(
  accessToken: string,
  payload: { token: string; action: 'accept' | 'decline' },
): Promise<HttpResp> {
  const res = await asUser(accessToken, '/functions/v1/professional-invite-accept', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await parseBody(res) };
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * 48 bytes → 64 chars base64url (sem padding). Atende
 * `access_invites_token_check` (alfabeto [A-Za-z0-9_-], len 43..128).
 */
function freshToken(): string {
  return randomBytes(48).toString('base64url');
}

async function insertInvite(
  admin: SupabaseClient,
  opts: {
    petId: string;
    invitedBy: string;
    inviteEmail: string;
    role?: string;
    expiresAt?: Date;
    status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  },
): Promise<{ id: string; token: string }> {
  const token = freshToken();
  const expiresAt = (opts.expiresAt ?? new Date(Date.now() + 7 * 86_400_000)).toISOString();
  const payload: Record<string, unknown> = {
    pet_id: opts.petId,
    invited_by: opts.invitedBy,
    invite_email: opts.inviteEmail.toLowerCase(),
    role: opts.role ?? 'vet_read',
    token,
    expires_at: expiresAt,
    can_see_finances: false,
    scope_notes: null,
  };
  if (opts.status) payload.status = opts.status;

  const { data, error } = await admin
    .from('access_invites')
    .insert(payload)
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`insert access_invites failed: ${error?.message ?? 'no row'}`);
  }
  return { id: data.id, token };
}

// ── Assertions ───────────────────────────────────────────────────────────────

function expect(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function expectEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

// ── Scenarios ────────────────────────────────────────────────────────────────

async function blockD(): Promise<void> {
  const admin = adminClient();

  // Setup --------------------------------------------------------------------
  console.log('[block-d] setup: tutor emissor + tutor não-emissor + pro + pets');
  const tutor = await createTutor(admin);
  const otherTutor = await createTutor(admin); // usado em D2 (tenta cancelar sem ser emissor)
  const pro = await createProfessional(admin, {
    professionalType: 'veterinarian',
    displayName: 'Dra. Bloco D',
  });
  const { petId } = await createPet(admin, tutor.userId, {
    name: 'ConviteD',
    species: 'dog',
  });
  console.log(
    `       ok — tutor=${tutor.userId.slice(0, 8)}… other=${otherTutor.userId.slice(0, 8)}… ` +
      `pro=${pro.userId.slice(0, 8)}… (${pro.email}) pet=${petId.slice(0, 8)}…`,
  );

  // D1: Cancel happy path ----------------------------------------------------
  console.log('[block-d] D1: tutor cancela invite pending → 200 + status=cancelled + audit');
  let d1InviteId = '';
  let d1Token = '';
  {
    const { id, token } = await insertInvite(admin, {
      petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
    });
    d1InviteId = id;
    d1Token = token;

    const { status, body } = await callInviteCancel(tutor.accessToken, {
      invite_id: d1InviteId,
    });
    expectEq(status, 200, 'D1 status');
    const b = body as { ok?: boolean; invite_id?: string; status?: string };
    expectEq(b.ok, true, 'D1 body.ok');
    expectEq(b.invite_id, d1InviteId, 'D1 body.invite_id');
    expectEq(b.status, 'cancelled', 'D1 body.status');

    // Inspect invite
    const { data: inv, error: invErr } = await admin
      .from('access_invites')
      .select('status, accepted_at, accepted_by, created_grant_id')
      .eq('id', d1InviteId)
      .single();
    if (invErr) throw new Error(`D1 invite select: ${invErr.message}`);
    expectEq(inv.status, 'cancelled', 'D1 invite.status');
    expect(inv.accepted_at === null, 'D1 invite.accepted_at null');
    expect(inv.accepted_by === null, 'D1 invite.accepted_by null');
    expect(inv.created_grant_id === null, 'D1 invite.created_grant_id null');

    // Inspect audit
    const { data: aud, error: audErr } = await admin
      .from('access_audit_log')
      .select('actor_user_id, professional_id, access_grant_id, event_type, target_table, target_id, context')
      .eq('target_id', d1InviteId)
      .eq('event_type', 'invite_cancelled');
    if (audErr) throw new Error(`D1 audit select: ${audErr.message}`);
    expectEq(aud?.length ?? 0, 1, 'D1 audit row count');
    const a = aud![0] as {
      actor_user_id: string;
      professional_id: string | null;
      access_grant_id: string | null;
      event_type: string;
      target_table: string | null;
      target_id: string | null;
      context: { invite_id?: string; role?: string; invite_email?: string } | null;
    };
    expectEq(a.actor_user_id, tutor.userId, 'D1 audit.actor_user_id');
    expect(a.professional_id === null, 'D1 audit.professional_id null');
    expect(a.access_grant_id === null, 'D1 audit.access_grant_id null');
    expectEq(a.target_table, 'access_invites', 'D1 audit.target_table');
    expectEq(a.target_id, d1InviteId, 'D1 audit.target_id');
    expectEq(a.context?.invite_id, d1InviteId, 'D1 audit.context.invite_id');
    expectEq(a.context?.role, 'vet_read', 'D1 audit.context.role');
    expectEq(a.context?.invite_email, pro.email.toLowerCase(), 'D1 audit.context.invite_email');
  }
  console.log('       ok — 200, invite=cancelled, audit invite_cancelled');

  // D2: Cancel por não-emissor -----------------------------------------------
  console.log('[block-d] D2: tutor não-emissor tenta cancelar → 403 UNAUTHORIZED');
  const d2Pet = await createPet(admin, tutor.userId, { name: 'CancelD2', species: 'dog' });
  {
    const { id } = await insertInvite(admin, {
      petId: d2Pet.petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
    });

    const { status, body } = await callInviteCancel(otherTutor.accessToken, {
      invite_id: id,
    });
    expectEq(status, 403, 'D2 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'UNAUTHORIZED', 'D2 body.code');
    expect(
      typeof b.error === 'string' && b.error.length > 0,
      'D2 body.error não vazio',
    );

    // Invite permanece pending
    const { data: inv } = await admin
      .from('access_invites')
      .select('status')
      .eq('id', id)
      .single();
    expectEq(inv!.status, 'pending', 'D2 invite permanece pending');
  }
  console.log('       ok — 403 UNAUTHORIZED, invite intacto (pending)');

  // D3: Cancel de invite não-pending -----------------------------------------
  console.log('[block-d] D3: cancel em invite status=declined → 409 INVALID_STATE');
  const d3Pet = await createPet(admin, tutor.userId, { name: 'CancelD3', species: 'cat' });
  {
    const { id } = await insertInvite(admin, {
      petId: d3Pet.petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
      status: 'declined',
    });

    const { status, body } = await callInviteCancel(tutor.accessToken, {
      invite_id: id,
    });
    expectEq(status, 409, 'D3 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'INVALID_STATE', 'D3 body.code');
    expect(
      typeof b.error === 'string' && /declined/i.test(b.error),
      `D3 body.error menciona declined: got ${b.error}`,
    );

    // Invite permanece declined (não virou cancelled)
    const { data: inv } = await admin
      .from('access_invites')
      .select('status')
      .eq('id', id)
      .single();
    expectEq(inv!.status, 'declined', 'D3 invite permanece declined');
  }
  console.log('       ok — 409 INVALID_STATE, invite permanece declined');

  // D4: Cancel de invite_id inexistente --------------------------------------
  console.log('[block-d] D4: invite_id inexistente (UUID aleatório) → 404 INVITE_NOT_FOUND');
  {
    const ghostId = randomUUID();
    const { status, body } = await callInviteCancel(tutor.accessToken, {
      invite_id: ghostId,
    });
    expectEq(status, 404, 'D4 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'INVITE_NOT_FOUND', 'D4 body.code');
  }
  console.log('       ok — 404 INVITE_NOT_FOUND');

  // D5: Expire happy path ----------------------------------------------------
  console.log('[block-d] D5: expires_at passado + sweep → 200 + status=expired + audit');
  const d5Pet = await createPet(admin, tutor.userId, { name: 'ExpireD5', species: 'dog' });
  let d5InviteId = '';
  {
    const { id } = await insertInvite(admin, {
      petId: d5Pet.petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
      expiresAt: new Date(Date.now() - 86_400_000), // 1 dia no passado
    });
    d5InviteId = id;

    const { status, body } = await callInviteExpire();
    expectEq(status, 200, 'D5 status');
    const b = body as {
      ok?: boolean;
      expired_count?: number;
      expired_ids?: string[];
      timestamp?: string;
    };
    expectEq(b.ok, true, 'D5 body.ok');
    expect(typeof b.expired_count === 'number', 'D5 body.expired_count is number');
    expect(Array.isArray(b.expired_ids), 'D5 body.expired_ids is array');
    expect(
      b.expired_ids!.includes(d5InviteId),
      `D5 expired_ids contém d5InviteId: got ${JSON.stringify(b.expired_ids)}`,
    );
    expect(typeof b.timestamp === 'string' && b.timestamp.length > 0, 'D5 body.timestamp');

    // Invite agora é expired
    const { data: inv } = await admin
      .from('access_invites')
      .select('status')
      .eq('id', d5InviteId)
      .single();
    expectEq(inv!.status, 'expired', 'D5 invite.status');

    // Audit invite_expired (sistema — actor_user_id null, professional_id null)
    const { data: aud } = await admin
      .from('access_audit_log')
      .select('actor_user_id, professional_id, access_grant_id, event_type, target_table, target_id, context')
      .eq('target_id', d5InviteId)
      .eq('event_type', 'invite_expired');
    expectEq(aud?.length ?? 0, 1, 'D5 audit row count');
    const a = aud![0] as {
      actor_user_id: string | null;
      professional_id: string | null;
      access_grant_id: string | null;
      target_table: string | null;
      context: { invite_id?: string; role?: string; invited_by?: string; expired_at?: string } | null;
    };
    expect(a.actor_user_id === null, 'D5 audit.actor_user_id null (evento de sistema)');
    expect(a.professional_id === null, 'D5 audit.professional_id null');
    expect(a.access_grant_id === null, 'D5 audit.access_grant_id null');
    expectEq(a.target_table, 'access_invites', 'D5 audit.target_table');
    expectEq(a.context?.invite_id, d5InviteId, 'D5 audit.context.invite_id');
    expectEq(a.context?.role, 'vet_read', 'D5 audit.context.role');
    expectEq(a.context?.invited_by, tutor.userId, 'D5 audit.context.invited_by');
  }
  console.log('       ok — 200, invite=expired, audit invite_expired (actor=null)');

  // D6: Expire idempotente ---------------------------------------------------
  console.log('[block-d] D6: sweep 2ª vez → invite D5 não re-processado');
  {
    const { status, body } = await callInviteExpire();
    expectEq(status, 200, 'D6 status');
    const b = body as { ok?: boolean; expired_count?: number; expired_ids?: string[] };
    expectEq(b.ok, true, 'D6 body.ok');
    expect(
      !b.expired_ids!.includes(d5InviteId),
      `D6 expired_ids NÃO deve conter d5InviteId: got ${JSON.stringify(b.expired_ids)}`,
    );

    // Audit NÃO deve ter uma 2ª linha invite_expired para o mesmo invite
    const { count } = await admin
      .from('access_audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('target_id', d5InviteId)
      .eq('event_type', 'invite_expired');
    expectEq(count ?? 0, 1, 'D6 audit invite_expired ainda com 1 linha (não duplicou)');

    // Invite permanece expired
    const { data: inv } = await admin
      .from('access_invites')
      .select('status')
      .eq('id', d5InviteId)
      .single();
    expectEq(inv!.status, 'expired', 'D6 invite.status ainda expired');
  }
  console.log('       ok — sweep idempotente, invite permanece expired, audit sem duplicar');

  // D7: Accept sobre invite cancelled (de D1) --------------------------------
  console.log('[block-d] D7: pro tenta aceitar invite cancelled em D1 → 410 GONE');
  {
    // Garante que o invite do D1 ainda está cancelled (não foi mexido pelo D2/D3/etc.)
    const { data: precondInv } = await admin
      .from('access_invites')
      .select('status, token')
      .eq('id', d1InviteId)
      .single();
    expectEq(precondInv!.status, 'cancelled', 'D7 precondition: D1 invite ainda cancelled');

    const { status, body } = await callInviteAccept(pro.accessToken, {
      token: d1Token,
      action: 'accept',
    });
    expectEq(status, 410, 'D7 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'GONE', 'D7 body.code');
    expect(
      typeof b.error === 'string' && /cancelled/i.test(b.error),
      `D7 body.error menciona cancelled: got ${b.error}`,
    );

    // Estado do invite não mudou por conta do accept tentado
    const { data: postInv } = await admin
      .from('access_invites')
      .select('status, accepted_at, accepted_by, created_grant_id')
      .eq('id', d1InviteId)
      .single();
    expectEq(postInv!.status, 'cancelled', 'D7 invite permanece cancelled');
    expect(postInv!.accepted_at === null, 'D7 invite.accepted_at null');
    expect(postInv!.accepted_by === null, 'D7 invite.accepted_by null');
    expect(postInv!.created_grant_id === null, 'D7 invite.created_grant_id null');

    // Nenhum grant foi criado pra este invite
    const { count: grantCount } = await admin
      .from('access_grants')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', petId)
      .eq('professional_id', pro.professionalId);
    expectEq(grantCount ?? 0, 0, 'D7 zero grants criados para (petId, pro)');
  }
  console.log('       ok — 410 GONE, invite cancelled intacto, zero grants');

  // Cleanup ------------------------------------------------------------------
  console.log('[block-d] cleanup');
  await cleanup(admin);
  console.log('       ok — fixtures removidas (invites/audits cascata via pets/users)');
}

// ── Entry ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  requireEnv();
  const admin = adminClient();
  const started = Date.now();
  try {
    await blockD();
    console.log(`[block-d] OK (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    process.exit(0);
  } catch (e) {
    const err = e as Error;
    console.error('[block-d] FAIL:', err.message);
    if (err.stack) console.error(err.stack);
    try {
      await cleanup(admin);
      console.error('[block-d] cleanup OK after failure');
    } catch (cleanupErr) {
      console.error('[block-d] cleanup FAILED:', (cleanupErr as Error).message);
      console.error('[block-d] manual cleanup may be required. tracked:');
      console.error('     ', tracked());
    }
    process.exit(1);
  }
}

const invoked = process.argv[1] ?? '';
if (invoked.endsWith('e2e_block_d.ts') || invoked.endsWith('e2e_block_d.js')) {
  main();
}
