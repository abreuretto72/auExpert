/**
 * e2e_block_b.ts — Fase 2, Bloco B (convites profissionais)
 *
 * Purpose
 * -------
 * Valida a Edge Function `professional-invite-create` (sub-passo 2.2.4) end-to-end:
 *   - grava em `access_invites` (status='pending')
 *   - grava em `access_audit_log` (event_type='invite_created')
 *   - grava em `notifications_queue` (type='professional_invite_email_pending')
 *   - aplica autorização (owner do pet) + rate limit (20/h) + dedup por email
 *
 * Importa primitivas de `e2e_pro_module.ts` (createTutor / createPet / asUser / cleanup).
 *
 * Cenários (ordem importa — cada um constrói sobre o anterior):
 *   B1. Happy path: tutor chama com payload válido
 *       → 201 + invite_id + token 64 chars base64url + invite_link
 *       → 1 row em access_invites (status='pending', token não-nulo)
 *       → 1 row em access_audit_log (event_type='invite_created', context rico)
 *       → 1 row em notifications_queue (type pending, data com recipient_email/token/link)
 *
 *   B2. Duplicate pending: tutor chama de novo com mesmo email/pet
 *       → 409 + body.invite_id = invite_id do B1 (referência ao pendente)
 *
 *   B3. Invalid role: tutor chama com role='nao_existe'
 *       → 400 + mensagem lista roles válidos
 *
 *   B4. Non-owner: outro tutor (sem vínculo) chama pro MESMO pet
 *       → 403 ("Sem permissão para convidar profissionais...")
 *
 *   B5. Rate limit: tutor cria 20 convites (email único cada) → 201 nos 20 primeiros;
 *       a 21ª chamada estoura o limite de 20/h → 429
 *
 * Rodar:
 *   npx tsx scripts/e2e_block_b.ts
 *
 * Exit 0 em sucesso, 1 em qualquer falha. Sempre tenta cleanup.
 *
 * Cleanup
 * -------
 * `access_invites.pet_id` tem FK ON DELETE CASCADE pra pets → ao deletar pets no
 * cleanup do harness, os invites somem junto. `access_audit_log.pet_id` também
 * CASCADE. `notifications_queue.user_id` CASCADE pra users (deletados por último).
 * Não precisa helper extra como o `cleanupBlockA` do Bloco A.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import {
  adminClient,
  asUser,
  cleanup,
  createPet,
  createTutor,
  tracked,
  type TestUser,
} from './e2e_pro_module';

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
    console.error(`[block-b] Missing env vars: ${missing.join(', ')}`);
    console.error('[block-b] See scripts/e2e_pro_module.README.md for setup.');
    process.exit(1);
  }
}

// ── Invite helper ────────────────────────────────────────────────────────────

type InviteResp = {
  status: number;
  body: unknown;
};

type InviteBody = {
  pet_id: string;
  invite_email: string;
  role: string;
  can_see_finances?: boolean;
  scope_notes?: string | null;
  expires_days?: number;
  locale?: string;
};

async function callInviteCreate(
  accessToken: string,
  payload: InviteBody,
): Promise<InviteResp> {
  const res = await asUser(accessToken, '/functions/v1/professional-invite-create', {
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

function randomEmail(prefix: string): string {
  return `e2e-b-${prefix}-${randomUUID().slice(0, 8)}@e2e.auexpert.test`;
}

// base64url = A-Z a-z 0-9 - _  (no padding)
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

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

async function blockB(): Promise<void> {
  const admin = adminClient();

  // Setup --------------------------------------------------------------------
  console.log('[block-b] setup: tutor owner + pet + outsider tutor');
  const tutor = await createTutor(admin);
  const outsider = await createTutor(admin);
  const { petId } = await createPet(admin, tutor.userId, {
    name: 'ConviteB',
    species: 'dog',
  });
  console.log(
    `       ok — owner=${tutor.userId.slice(0, 8)}… outsider=${outsider.userId.slice(0, 8)}… pet=${petId.slice(0, 8)}…`,
  );

  // B1: Happy path -----------------------------------------------------------
  console.log('[block-b] B1: owner creates invite with valid payload → 201 + invite + audit + queue');
  const b1Email = randomEmail('b1');
  let b1InviteId = '';
  let b1Token = '';
  {
    const { status, body } = await callInviteCreate(tutor.accessToken, {
      pet_id: petId,
      invite_email: b1Email,
      role: 'vet_read',
      can_see_finances: false,
      scope_notes: 'Convite de smoke test B1',
      expires_days: 7,
      locale: 'pt-BR',
    });
    expectEq(status, 201, 'B1 status');
    const b = body as {
      invite_id?: string;
      token?: string;
      invite_link?: string;
      expires_at?: string;
    };
    expect(!!b.invite_id && typeof b.invite_id === 'string', 'B1 body.invite_id');
    expect(!!b.token && typeof b.token === 'string', 'B1 body.token');
    expect(!!b.invite_link && typeof b.invite_link === 'string', 'B1 body.invite_link');
    expect(!!b.expires_at && typeof b.expires_at === 'string', 'B1 body.expires_at');
    expect(
      BASE64URL_RE.test(b.token!) && b.token!.length >= 43 && b.token!.length <= 128,
      `B1 token format (base64url 43..128): got length ${b.token!.length}`,
    );
    expect(
      b.invite_link!.endsWith(`/invite/${b.token}`),
      `B1 invite_link ends with /invite/<token>: got ${b.invite_link}`,
    );
    b1InviteId = b.invite_id!;
    b1Token = b.token!;
  }

  // Inspect access_invites
  {
    const { data: row, error } = await admin
      .from('access_invites')
      .select('*')
      .eq('id', b1InviteId)
      .single();
    if (error) throw new Error(`B1 access_invites select: ${error.message}`);
    expectEq(row.pet_id, petId, 'B1 access_invites.pet_id');
    expectEq(row.invited_by, tutor.userId, 'B1 access_invites.invited_by');
    expectEq(row.invite_email, b1Email, 'B1 access_invites.invite_email');
    expectEq(row.role, 'vet_read', 'B1 access_invites.role');
    expectEq(row.status, 'pending', 'B1 access_invites.status');
    expectEq(row.token, b1Token, 'B1 access_invites.token matches response');
    expect(row.accepted_at === null, 'B1 access_invites.accepted_at null');
    expect(row.accepted_by === null, 'B1 access_invites.accepted_by null');
    expect(row.created_grant_id === null, 'B1 access_invites.created_grant_id null');
  }

  // Inspect access_audit_log
  {
    const { data: rows, error } = await admin
      .from('access_audit_log')
      .select('*')
      .eq('pet_id', petId)
      .eq('event_type', 'invite_created');
    if (error) throw new Error(`B1 audit select: ${error.message}`);
    expectEq(rows?.length ?? 0, 1, 'B1 audit row count');
    const audit = rows![0] as {
      actor_user_id: string;
      target_table: string | null;
      target_id: string | null;
      context: { invite_email?: string; role?: string; locale?: string } | null;
    };
    expectEq(audit.actor_user_id, tutor.userId, 'B1 audit.actor_user_id');
    expectEq(audit.target_table, 'access_invites', 'B1 audit.target_table');
    expectEq(audit.target_id, b1InviteId, 'B1 audit.target_id');
    expectEq(audit.context?.invite_email, b1Email, 'B1 audit.context.invite_email');
    expectEq(audit.context?.role, 'vet_read', 'B1 audit.context.role');
    expectEq(audit.context?.locale, 'pt-BR', 'B1 audit.context.locale');
  }

  // Inspect notifications_queue
  {
    const { data: rows, error } = await admin
      .from('notifications_queue')
      .select('*')
      .eq('pet_id', petId)
      .eq('type', 'professional_invite_email_pending');
    if (error) throw new Error(`B1 queue select: ${error.message}`);
    expectEq(rows?.length ?? 0, 1, 'B1 queue row count');
    const q = rows![0] as {
      user_id: string;
      title: string;
      body: string;
      data: {
        recipient_email?: string;
        token?: string;
        invite_link?: string;
        invite_id?: string;
        locale?: string;
      } | null;
    };
    expectEq(q.user_id, tutor.userId, 'B1 queue.user_id');
    expect(typeof q.title === 'string' && q.title.length > 0, 'B1 queue.title');
    expect(typeof q.body === 'string' && q.body.length > 0, 'B1 queue.body');
    expectEq(q.data?.recipient_email, b1Email, 'B1 queue.data.recipient_email');
    expectEq(q.data?.token, b1Token, 'B1 queue.data.token');
    expectEq(q.data?.invite_id, b1InviteId, 'B1 queue.data.invite_id');
    expectEq(q.data?.locale, 'pt-BR', 'B1 queue.data.locale');
    expect(
      !!q.data?.invite_link && q.data.invite_link.endsWith(`/invite/${b1Token}`),
      'B1 queue.data.invite_link',
    );
  }
  console.log('       ok — 201, token 64 chars, 1 invite + 1 audit + 1 queue com payload esperado');

  // B2: Duplicate pending ----------------------------------------------------
  console.log('[block-b] B2: same email/pet de novo → 409 + invite_id aponta pro pendente');
  {
    const { status, body } = await callInviteCreate(tutor.accessToken, {
      pet_id: petId,
      invite_email: b1Email,
      role: 'vet_read',
    });
    expectEq(status, 409, 'B2 status');
    const b = body as { invite_id?: string; error?: string };
    expectEq(b.invite_id, b1InviteId, 'B2 body.invite_id points at B1 pending invite');
    expect(
      typeof b.error === 'string' && /pendente/i.test(b.error),
      `B2 error message mentions "pendente": got ${b.error}`,
    );
  }
  console.log('       ok — 409, invite_id aponta pro pendente');

  // B3: Invalid role ---------------------------------------------------------
  console.log('[block-b] B3: role inválido → 400');
  {
    const { status, body } = await callInviteCreate(tutor.accessToken, {
      pet_id: petId,
      invite_email: randomEmail('b3'),
      role: 'nao_existe',
    });
    expectEq(status, 400, 'B3 status');
    const b = body as { error?: string };
    expect(
      typeof b.error === 'string' && /role/i.test(b.error) && /v[aá]lido/i.test(b.error),
      `B3 error mentions "role" + "válido": got ${b.error}`,
    );
  }
  console.log('       ok — 400, mensagem menciona role inválido');

  // B4: Non-owner ------------------------------------------------------------
  console.log('[block-b] B4: outsider (não-owner) tenta convidar → 403');
  {
    const { status, body } = await callInviteCreate(outsider.accessToken, {
      pet_id: petId,
      invite_email: randomEmail('b4'),
      role: 'vet_read',
    });
    expectEq(status, 403, 'B4 status');
    const b = body as { error?: string };
    expect(
      typeof b.error === 'string' && /permiss/i.test(b.error),
      `B4 error mentions "permissão": got ${b.error}`,
    );
  }
  console.log('       ok — 403, outsider rejeitado');

  // B5: Rate limit -----------------------------------------------------------
  // O cenário B1 já gravou 1 convite. O Edge Function conta por `invited_by`
  // na última hora. Fazer mais 19 convites válidos chegamos a 20 → a 21ª
  // estoura.
  console.log('[block-b] B5: rate limit — 19 mais convites → 20 total ativos, a 21ª estoura 429');
  const b5FreshPet = await createPet(admin, tutor.userId, {
    name: 'RateLimitPet',
    species: 'dog',
  });
  {
    // 19 convites adicionais (total com B1 = 20, no limite)
    for (let i = 0; i < 19; i++) {
      const { status } = await callInviteCreate(tutor.accessToken, {
        pet_id: b5FreshPet.petId,
        invite_email: randomEmail(`b5-${i}`),
        role: 'vet_read',
      });
      if (status !== 201) {
        throw new Error(`B5 convite #${i + 1} esperava 201, recebeu ${status}`);
      }
    }

    // 21º convite → deve estourar 429
    const { status, body } = await callInviteCreate(tutor.accessToken, {
      pet_id: b5FreshPet.petId,
      invite_email: randomEmail('b5-over'),
      role: 'vet_read',
    });
    expectEq(status, 429, 'B5 status on 21st invite');
    const b = body as { error?: string };
    expect(
      typeof b.error === 'string' && /20/.test(b.error),
      `B5 error mentions "20" limit: got ${b.error}`,
    );

    // Confirma via banco que temos exatamente 20 convites pendentes pelo tutor
    const { count, error: countErr } = await admin
      .from('access_invites')
      .select('id', { count: 'exact', head: true })
      .eq('invited_by', tutor.userId);
    if (countErr) throw new Error(`B5 count error: ${countErr.message}`);
    expectEq(count ?? 0, 20, 'B5 total invites em access_invites (por tutor)');
  }
  console.log('       ok — 20º convite passou, 21º bloqueado com 429, total no banco=20');

  // Cleanup ------------------------------------------------------------------
  console.log('[block-b] cleanup');
  await cleanup(admin);
  console.log('       ok — fixtures removidas (access_invites cascata via pets)');

  // suppress unused warnings for helpers we keep for debug
  void TEST_USER_MARKER;
}

// Marker para o TS não reclamar do import `TestUser` mesmo que a gente não o
// use diretamente no corpo. Mantém o import pra facilitar extensões futuras.
const TEST_USER_MARKER: TestUser | null = null;

// ── Entry ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  requireEnv();
  const admin = adminClient();
  const started = Date.now();
  try {
    await blockB();
    console.log(`[block-b] OK (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    process.exit(0);
  } catch (e) {
    const err = e as Error;
    console.error('[block-b] FAIL:', err.message);
    if (err.stack) console.error(err.stack);
    try {
      await cleanup(admin);
      console.error('[block-b] cleanup OK after failure');
    } catch (cleanupErr) {
      console.error('[block-b] cleanup FAILED:', (cleanupErr as Error).message);
      console.error('[block-b] manual cleanup may be required. tracked:');
      console.error('     ', tracked());
    }
    process.exit(1);
  }
}

const invoked = process.argv[1] ?? '';
if (invoked.endsWith('e2e_block_b.ts') || invoked.endsWith('e2e_block_b.js')) {
  main();
}
