/**
 * e2e_block_c.ts — Fase 2, Bloco C (accept / decline de convites profissionais)
 *
 * Purpose
 * -------
 * Valida a Edge Function `professional-invite-accept` (sub-passo 2.3.4) end-to-end:
 *   - accept cria access_grants + UPDATE access_invites (status='accepted') + audit
 *   - decline só UPDATE access_invites (status='declined') + audit; nenhum grant
 *   - proteções: expirado, já consumido, grant duplicado, sem perfil profissional
 *
 * Importa primitivas de `e2e_pro_module.ts` (createTutor / createProfessional /
 * createPet / asUser / cleanup).
 *
 * Cenários (ordem importa — C4 e C5 dependem do estado de C1):
 *
 *   C1. Accept happy path
 *       Pro com perfil ativo, email bate com invite.invite_email, status='pending',
 *       não expirado, sem grant ativo prévio.
 *       → 200 + { ok, grant_id, pet_id, role, granted_at, invite_id }
 *       → invite.status='accepted', accepted_at, accepted_by, created_grant_id=grant_id
 *       → 1 linha nova em access_grants (is_active=true)
 *       → 1 linha em access_audit_log (event_type='grant_accepted')
 *
 *   C2. Decline happy path
 *       Pro com perfil ativo rejeita convite válido separado (novo pet, novo invite).
 *       → 200 + { ok, invite_id, status: 'declined' }
 *       → invite.status='declined', accepted_at/accepted_by/created_grant_id null
 *       → 0 grants criados (por esta decline)
 *       → 1 linha em access_audit_log (event_type='invite_declined')
 *
 *   C3. Expired
 *       Invite com expires_at no passado, status='pending'. Pro tenta aceitar.
 *       → 410 + code='GONE' + error menciona expirado
 *
 *   C4. Already consumed
 *       Tenta aceitar de novo o invite aceito em C1 (status='accepted').
 *       → 410 + code='GONE' + error menciona 'accepted'
 *
 *   C5. Duplicate active grant
 *       Após C1, pro já tem grant ativo em (pet, pro). Novo invite para
 *       mesmo (pet, pro.email); accept dispara precheck de duplicate grant.
 *       → 409 + code='DUPLICATE_ACTIVE_GRANT'
 *
 *   C6. Needs onboarding
 *       Usuário logado tem email que bate com invite.invite_email, mas não tem
 *       linha em `public.professionals` (is_active=true). Tenta aceitar.
 *       → 403 + code='NEEDS_ONBOARDING'
 *
 * Rodar:
 *   npx tsx scripts/e2e_block_c.ts
 *
 * Exit 0 em sucesso, 1 em qualquer falha. Sempre tenta cleanup.
 *
 * Cleanup
 * -------
 * O harness só rastreia grants criados via `createGrant()`. O grant criado pela
 * EF em C1 NÃO é rastreado — mas `access_grants.pet_id → pets ON DELETE CASCADE`
 * (e idem professional_id), então o grant cai junto quando cleanup() deleta os
 * pets+professionals do registry. `access_invites.pet_id` também é CASCADE, e
 * `access_audit_log.pet_id` também. Cleanup padrão do Bloco B funciona aqui.
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

function requireEnv(): void {
  const missing: string[] = [];
  if (!(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL))
    missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!(process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY))
    missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    console.error(`[block-c] Missing env vars: ${missing.join(', ')}`);
    console.error('[block-c] See scripts/e2e_pro_module.README.md for setup.');
    process.exit(1);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type AcceptResp = { status: number; body: unknown };
type AcceptBody = { token: string; action: 'accept' | 'decline' };

async function callInviteAccept(
  accessToken: string,
  payload: AcceptBody,
): Promise<AcceptResp> {
  const res = await asUser(accessToken, '/functions/v1/professional-invite-accept', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

/**
 * 48 bytes → 64 chars base64url (sem padding). Atende
 * `access_invites_token_check` (alfabeto [A-Za-z0-9_-], len 43..128) e
 * supera piso OWASP de 256 bits de entropia.
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
  },
): Promise<{ id: string; token: string }> {
  const token = freshToken();
  const expiresAt = (opts.expiresAt ?? new Date(Date.now() + 7 * 86_400_000)).toISOString();
  const { data, error } = await admin
    .from('access_invites')
    .insert({
      pet_id: opts.petId,
      invited_by: opts.invitedBy,
      invite_email: opts.inviteEmail.toLowerCase(),
      role: opts.role ?? 'vet_read',
      token,
      expires_at: expiresAt,
      can_see_finances: false,
      scope_notes: null,
    })
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

async function blockC(): Promise<void> {
  const admin = adminClient();

  // Setup --------------------------------------------------------------------
  console.log('[block-c] setup: tutor owner + pet + 1 pro + orphan (tutor-only)');
  const tutor = await createTutor(admin);
  const { petId } = await createPet(admin, tutor.userId, {
    name: 'ConviteC',
    species: 'dog',
  });
  const pro = await createProfessional(admin, {
    professionalType: 'veterinarian',
    displayName: 'Dra. Bloco C',
  });
  const orphan = await createTutor(admin); // sem perfil em professionals
  console.log(
    `       ok — tutor=${tutor.userId.slice(0, 8)}… pet=${petId.slice(0, 8)}… ` +
      `pro=${pro.userId.slice(0, 8)}… (${pro.email}) orphan=${orphan.userId.slice(0, 8)}… (${orphan.email})`,
  );

  // C1: Accept happy path ----------------------------------------------------
  console.log('[block-c] C1: pro accepts valid invite → 200 + grant + audit');
  let c1InviteId = '';
  let c1GrantId = '';
  {
    const { id, token } = await insertInvite(admin, {
      petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
    });
    c1InviteId = id;

    const { status, body } = await callInviteAccept(pro.accessToken, {
      token,
      action: 'accept',
    });
    expectEq(status, 200, 'C1 status');
    const b = body as {
      ok?: boolean;
      grant_id?: string;
      pet_id?: string;
      role?: string;
      granted_at?: string;
      invite_id?: string;
    };
    expectEq(b.ok, true, 'C1 body.ok');
    expect(typeof b.grant_id === 'string' && b.grant_id.length > 0, 'C1 body.grant_id');
    expectEq(b.pet_id, petId, 'C1 body.pet_id');
    expectEq(b.role, 'vet_read', 'C1 body.role');
    expect(typeof b.granted_at === 'string' && b.granted_at.length > 0, 'C1 body.granted_at');
    expectEq(b.invite_id, c1InviteId, 'C1 body.invite_id');
    c1GrantId = b.grant_id!;

    // Inspect invite
    const { data: inv, error: invErr } = await admin
      .from('access_invites')
      .select('status, accepted_at, accepted_by, created_grant_id')
      .eq('id', c1InviteId)
      .single();
    if (invErr) throw new Error(`C1 invite select: ${invErr.message}`);
    expectEq(inv.status, 'accepted', 'C1 invite.status');
    expect(!!inv.accepted_at, 'C1 invite.accepted_at not null');
    expectEq(inv.accepted_by, pro.userId, 'C1 invite.accepted_by');
    expectEq(inv.created_grant_id, c1GrantId, 'C1 invite.created_grant_id');

    // Inspect grant
    const { data: g, error: gErr } = await admin
      .from('access_grants')
      .select('pet_id, professional_id, granted_by, role, is_active, invite_token')
      .eq('id', c1GrantId)
      .single();
    if (gErr) throw new Error(`C1 grant select: ${gErr.message}`);
    expectEq(g.pet_id, petId, 'C1 grant.pet_id');
    expectEq(g.professional_id, pro.professionalId, 'C1 grant.professional_id');
    expectEq(g.granted_by, tutor.userId, 'C1 grant.granted_by');
    expectEq(g.role, 'vet_read', 'C1 grant.role');
    expectEq(g.is_active, true, 'C1 grant.is_active');
    expectEq(g.invite_token, token, 'C1 grant.invite_token matches');

    // Inspect audit
    const { data: aud, error: audErr } = await admin
      .from('access_audit_log')
      .select('actor_user_id, professional_id, access_grant_id, event_type, target_table, target_id, context')
      .eq('access_grant_id', c1GrantId)
      .eq('event_type', 'grant_accepted');
    if (audErr) throw new Error(`C1 audit select: ${audErr.message}`);
    expectEq(aud?.length ?? 0, 1, 'C1 audit row count');
    const a = aud![0] as {
      actor_user_id: string;
      professional_id: string;
      event_type: string;
      target_table: string | null;
      target_id: string | null;
      context: { invite_id?: string; role?: string; invited_by?: string } | null;
    };
    expectEq(a.actor_user_id, pro.userId, 'C1 audit.actor_user_id');
    expectEq(a.professional_id, pro.professionalId, 'C1 audit.professional_id');
    expectEq(a.target_table, 'access_grants', 'C1 audit.target_table');
    expectEq(a.target_id, c1GrantId, 'C1 audit.target_id');
    expectEq(a.context?.invite_id, c1InviteId, 'C1 audit.context.invite_id');
    expectEq(a.context?.role, 'vet_read', 'C1 audit.context.role');
    expectEq(a.context?.invited_by, tutor.userId, 'C1 audit.context.invited_by');
  }
  console.log('       ok — 200, invite=accepted, grant ativo, audit grant_accepted');

  // C2: Decline happy path ---------------------------------------------------
  // Novo pet (pra evitar colidir com o DUPLICATE_ACTIVE_GRANT guard de C1)
  console.log('[block-c] C2: pro declines valid invite → 200 + status=declined + audit');
  const c2Pet = await createPet(admin, tutor.userId, { name: 'DeclineC2', species: 'dog' });
  let c2InviteId = '';
  {
    const { id, token } = await insertInvite(admin, {
      petId: c2Pet.petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
    });
    c2InviteId = id;

    // Snapshot grant count antes do decline
    const { count: grantsBefore } = await admin
      .from('access_grants')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', c2Pet.petId);

    const { status, body } = await callInviteAccept(pro.accessToken, {
      token,
      action: 'decline',
    });
    expectEq(status, 200, 'C2 status');
    const b = body as { ok?: boolean; invite_id?: string; status?: string };
    expectEq(b.ok, true, 'C2 body.ok');
    expectEq(b.invite_id, c2InviteId, 'C2 body.invite_id');
    expectEq(b.status, 'declined', 'C2 body.status');

    // Invite state
    const { data: inv } = await admin
      .from('access_invites')
      .select('status, accepted_at, accepted_by, created_grant_id')
      .eq('id', c2InviteId)
      .single();
    expectEq(inv!.status, 'declined', 'C2 invite.status');
    expect(inv!.accepted_at === null, 'C2 invite.accepted_at null');
    expect(inv!.accepted_by === null, 'C2 invite.accepted_by null');
    expect(inv!.created_grant_id === null, 'C2 invite.created_grant_id null');

    // Nenhum grant novo pro par (pet, pro)
    const { count: grantsAfter } = await admin
      .from('access_grants')
      .select('id', { count: 'exact', head: true })
      .eq('pet_id', c2Pet.petId);
    expectEq(grantsAfter ?? 0, grantsBefore ?? 0, 'C2 no new grants created');

    // Audit invite_declined
    const { data: aud } = await admin
      .from('access_audit_log')
      .select('actor_user_id, event_type, target_table, target_id, access_grant_id, context')
      .eq('target_id', c2InviteId)
      .eq('event_type', 'invite_declined');
    expectEq(aud?.length ?? 0, 1, 'C2 audit row count');
    const a = aud![0] as {
      actor_user_id: string;
      event_type: string;
      target_table: string | null;
      access_grant_id: string | null;
      context: { invite_id?: string; role?: string } | null;
    };
    expectEq(a.actor_user_id, pro.userId, 'C2 audit.actor_user_id');
    expectEq(a.target_table, 'access_invites', 'C2 audit.target_table');
    expect(a.access_grant_id === null, 'C2 audit.access_grant_id null');
    expectEq(a.context?.invite_id, c2InviteId, 'C2 audit.context.invite_id');
  }
  console.log('       ok — 200, invite=declined, zero grants novos, audit invite_declined');

  // C3: Expired --------------------------------------------------------------
  console.log('[block-c] C3: expired invite (expires_at no passado) → 410 GONE');
  const c3Pet = await createPet(admin, tutor.userId, { name: 'ExpireC3', species: 'cat' });
  {
    const { token } = await insertInvite(admin, {
      petId: c3Pet.petId,
      invitedBy: tutor.userId,
      inviteEmail: pro.email,
      role: 'vet_read',
      expiresAt: new Date(Date.now() - 60_000), // 1 minuto no passado
    });
    const { status, body } = await callInviteAccept(pro.accessToken, {
      token,
      action: 'accept',
    });
    expectEq(status, 410, 'C3 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'GONE', 'C3 body.code');
    expect(
      typeof b.error === 'string' && /expir/i.test(b.error),
      `C3 body.error menciona expirado: got ${b.error}`,
    );
  }
  console.log('       ok — 410 GONE, mensagem menciona expirado');

  // C4: Already consumed -----------------------------------------------------
  // Reaproveita o invite aceito em C1 — já está status='accepted'.
  console.log('[block-c] C4: re-accept do invite já aceito em C1 → 410 GONE');
  {
    // Precisamos do token — re-lê do banco
    const { data: inv } = await admin
      .from('access_invites')
      .select('token, status')
      .eq('id', c1InviteId)
      .single();
    expectEq(inv!.status, 'accepted', 'C4 precondition: C1 invite still accepted');
    const { status, body } = await callInviteAccept(pro.accessToken, {
      token: inv!.token,
      action: 'accept',
    });
    expectEq(status, 410, 'C4 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'GONE', 'C4 body.code');
    expect(
      typeof b.error === 'string' && /accepted/i.test(b.error),
      `C4 body.error menciona 'accepted': got ${b.error}`,
    );
  }
  console.log('       ok — 410 GONE, mensagem menciona já accepted');

  // C5: Duplicate active grant -----------------------------------------------
  // Após C1, o pro já tem grant ativo em (petId, pro.professionalId). Novo
  // invite para mesmo pet+pro.email → accept dispara precheck DUPLICATE.
  console.log('[block-c] C5: novo invite com grant ativo já existente → 409 DUPLICATE_ACTIVE_GRANT');
  {
    const { token } = await insertInvite(admin, {
      petId,                       // MESMO pet do C1
      invitedBy: tutor.userId,
      inviteEmail: pro.email,      // MESMO pro
      role: 'vet_full',            // role diferente — não importa, grant existente bloqueia
    });
    const { status, body } = await callInviteAccept(pro.accessToken, {
      token,
      action: 'accept',
    });
    expectEq(status, 409, 'C5 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'DUPLICATE_ACTIVE_GRANT', 'C5 body.code');
    expect(
      typeof b.error === 'string' && /acesso/i.test(b.error),
      `C5 body.error menciona acesso: got ${b.error}`,
    );

    // Garante que o grant do C1 continua intacto
    const { data: g } = await admin
      .from('access_grants')
      .select('id, is_active, role')
      .eq('id', c1GrantId)
      .single();
    expectEq(g!.is_active, true, 'C5 C1 grant ainda ativo');
    expectEq(g!.role, 'vet_read', 'C5 C1 grant role inalterado');
  }
  console.log('       ok — 409 DUPLICATE_ACTIVE_GRANT, grant C1 inalterado');

  // C6: Needs onboarding -----------------------------------------------------
  // Orphan é tutor-only (createTutor não insere em professionals). Email bate
  // com invite.invite_email; EF detecta falta de professional e retorna 403.
  console.log('[block-c] C6: user sem perfil profissional tenta aceitar → 403 NEEDS_ONBOARDING');
  const c6Pet = await createPet(admin, tutor.userId, { name: 'OrphanC6', species: 'dog' });
  {
    const { token } = await insertInvite(admin, {
      petId: c6Pet.petId,
      invitedBy: tutor.userId,
      inviteEmail: orphan.email,    // email do tutor-only orphan
      role: 'vet_read',
    });
    const { status, body } = await callInviteAccept(orphan.accessToken, {
      token,
      action: 'accept',
    });
    expectEq(status, 403, 'C6 status');
    const b = body as { error?: string; code?: string };
    expectEq(b.code, 'NEEDS_ONBOARDING', 'C6 body.code');
    expect(
      typeof b.error === 'string' && /profissional/i.test(b.error),
      `C6 body.error menciona perfil profissional: got ${b.error}`,
    );

    // Confirma que o invite continua pending (não virou accepted nem declined)
    const { data: inv } = await admin
      .from('access_invites')
      .select('status')
      .eq('invite_email', orphan.email.toLowerCase())
      .single();
    expectEq(inv!.status, 'pending', 'C6 invite.status ainda pending');
  }
  console.log('       ok — 403 NEEDS_ONBOARDING, invite ainda pending');

  // Cleanup ------------------------------------------------------------------
  console.log('[block-c] cleanup');
  await cleanup(admin);
  console.log('       ok — fixtures removidas (access_grants + access_invites cascata via pets/professionals)');
}

// ── Entry ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  requireEnv();
  const admin = adminClient();
  const started = Date.now();
  try {
    await blockC();
    console.log(`[block-c] OK (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    process.exit(0);
  } catch (e) {
    const err = e as Error;
    console.error('[block-c] FAIL:', err.message);
    if (err.stack) console.error(err.stack);
    try {
      await cleanup(admin);
      console.error('[block-c] cleanup OK after failure');
    } catch (cleanupErr) {
      console.error('[block-c] cleanup FAILED:', (cleanupErr as Error).message);
      console.error('[block-c] manual cleanup may be required. tracked:');
      console.error('     ', tracked());
    }
    process.exit(1);
  }
}

// Suppress unused import warning — randomUUID kept for potential future scenarios
void randomUUID;

const invoked = process.argv[1] ?? '';
if (invoked.endsWith('e2e_block_c.ts') || invoked.endsWith('e2e_block_c.js')) {
  main();
}
