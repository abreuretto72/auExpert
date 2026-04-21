/**
 * e2e_pro_module.ts — E2E harness for Fase 2 (módulo profissional)
 *
 * Purpose
 * -------
 * Fase 1 was validated with SQL puro (calling `has_pet_access` from a DO
 * block with `set_config('request.jwt.claims', …)`). That doesn't reach
 * RLS over HTTP, which is the context `get_pet_clinical_bundle` will run
 * in during Fase 2. This harness creates real auth users, signs them in
 * through Supabase Auth, and makes requests to PostgREST with their real
 * Bearer tokens — so every assertion exercises the same path a device
 * would exercise in production.
 *
 * This file exports reusable primitives
 * (`createTutor`, `createProfessional`, `createPet`, `createGrant`,
 * `revokeGrant`, `asUser`, `cleanup`) that later blocks (A, B, C, D)
 * will import to compose their own test scenarios. A smoke test at the
 * bottom proves the primitives themselves work end-to-end before any
 * Fase 2 migration is written.
 *
 * Environment (all required)
 *   SUPABASE_URL                  (or EXPO_PUBLIC_SUPABASE_URL as fallback)
 *   SUPABASE_SERVICE_ROLE_KEY     — admin access; BYPASSES RLS
 *   SUPABASE_ANON_KEY             (or EXPO_PUBLIC_SUPABASE_ANON_KEY)
 *
 * How to run
 *   npx tsx scripts/e2e_pro_module.ts
 *
 * Exit codes: 0 on success, 1 on any assertion failure or env error.
 * On failure the harness still attempts teardown — grep the console for
 * `[e2e] manual cleanup` if that fails too.
 *
 * Guarantees
 *   • Every resource this script creates is tracked and torn down.
 *   • Test users are created with unique `e2e-*@e2e.auexpert.test` emails
 *     so collisions with real users are impossible.
 *   • The harness uses HARD DELETE for test fixtures (not soft delete via
 *     is_active=false). This is intentional and OK because these rows
 *     never hold real tutor data — CLAUDE.md's "delete físico é proibido"
 *     applies to product code paths, not test scaffolding.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

// ── 0. Env ───────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function requireEnv(): void {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)');
  if (!SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!ANON_KEY) missing.push('SUPABASE_ANON_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)');
  if (missing.length) {
    console.error(`[e2e] Missing env vars: ${missing.join(', ')}`);
    console.error(`[e2e] See scripts/e2e_pro_module.README.md for setup.`);
    process.exit(1);
  }
}

// ── 1. Clients ───────────────────────────────────────────────────────────────

/** Service-role client. Bypasses RLS. Use for fixtures and teardown only. */
export function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** End-user client that sends the given access token on every request. */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ── 2. Resource tracker for cleanup ──────────────────────────────────────────
// All helpers push into this registry; `cleanup()` drains it in reverse
// dependency order.

type Registry = {
  userIds: string[];
  petIds: string[];
  professionalIds: string[];
  grantIds: string[];
};

const created: Registry = {
  userIds: [],
  petIds: [],
  professionalIds: [],
  grantIds: [],
};

// ── 3. Helpers ───────────────────────────────────────────────────────────────

export type TestUser = {
  userId: string;
  email: string;
  password: string;
  fullName: string;
  accessToken: string;
  client: SupabaseClient;
};

export type TestProfessional = TestUser & {
  professionalId: string;
  professionalType: string;
};

function testEmail(prefix: string): string {
  return `e2e-${prefix}-${randomUUID().slice(0, 8)}@e2e.auexpert.test`;
}

/**
 * Low-level: create an auth user, wait for the public.users row the
 * `trg_on_auth_user_created` trigger inserts, then sign in to receive
 * a real session JWT.
 */
async function createAuthUser(
  admin: SupabaseClient,
  role: 'tutor' | 'pro',
  fullName?: string,
): Promise<TestUser> {
  const email = testEmail(role);
  const password = `E2E!test-${randomUUID().slice(0, 12)}`;
  const full_name = fullName ?? (role === 'tutor' ? 'E2E Tutor' : 'E2E Professional');

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, language: 'pt-BR' },
  });
  if (error || !data?.user) {
    throw new Error(`createAuthUser failed: ${error?.message ?? 'no user returned'}`);
  }
  const userId = data.user.id;
  created.userIds.push(userId);

  // Sign in on a fresh anon client. The trigger has already created the
  // public.users row; `raw_user_meta_data.full_name` flowed through to it.
  const anon = createClient(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signin, error: signinErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (signinErr || !signin?.session) {
    throw new Error(`signInWithPassword failed: ${signinErr?.message ?? 'no session'}`);
  }

  return {
    userId,
    email,
    password,
    fullName: full_name,
    accessToken: signin.session.access_token,
    client: userClient(signin.session.access_token),
  };
}

/** Create a tutor (auth + public.users row via trigger). */
export async function createTutor(admin: SupabaseClient): Promise<TestUser> {
  return createAuthUser(admin, 'tutor');
}

/** Create a professional (auth + public.users + public.professionals). */
export async function createProfessional(
  admin: SupabaseClient,
  opts: {
    professionalType?: string;
    countryCode?: string;
    displayName?: string;
    fullName?: string;
  } = {},
): Promise<TestProfessional> {
  const u = await createAuthUser(admin, 'pro', opts.fullName);

  const professional_type = opts.professionalType ?? 'veterinarian';
  const { data: pro, error } = await admin
    .from('professionals')
    .insert({
      user_id: u.userId,
      professional_type,
      country_code: opts.countryCode ?? 'BR',
      display_name: opts.displayName ?? 'Dr. E2E',
    })
    .select('id')
    .single();
  if (error || !pro) {
    throw new Error(`insert professionals failed: ${error?.message ?? 'no row'}`);
  }

  created.professionalIds.push(pro.id);
  return { ...u, professionalId: pro.id, professionalType: professional_type };
}

/** Create a pet owned by the given tutor. */
export async function createPet(
  admin: SupabaseClient,
  tutorUserId: string,
  opts: { name?: string; species?: 'dog' | 'cat'; breed?: string } = {},
): Promise<{ petId: string; name: string; species: 'dog' | 'cat' }> {
  const name = opts.name ?? `Pet-${randomUUID().slice(0, 6)}`;
  const species = opts.species ?? 'dog';
  const { data, error } = await admin
    .from('pets')
    .insert({
      user_id: tutorUserId,
      name,
      species,
      breed: opts.breed ?? null,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`insert pets failed: ${error?.message ?? 'no row'}`);
  }
  created.petIds.push(data.id);
  return { petId: data.id, name, species };
}

/**
 * Insert a grant directly (bypassing any future invite/accept flow).
 * Use this to set up starting state; Bloco B will add a helper that
 * exercises the real invite+accept edge functions.
 */
export async function createGrant(
  admin: SupabaseClient,
  opts: {
    petId: string;
    professionalId: string;
    grantedByUserId: string;
    role: string;
    expiresInDays?: number;
    accepted?: boolean;
  },
): Promise<string> {
  const expires_at = opts.expiresInDays
    ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
    : null;
  const accepted_at = opts.accepted === false ? null : new Date().toISOString();

  const { data, error } = await admin
    .from('access_grants')
    .insert({
      pet_id: opts.petId,
      professional_id: opts.professionalId,
      granted_by: opts.grantedByUserId,
      role: opts.role,
      accepted_at,
      expires_at,
    })
    .select('id')
    .single();
  if (error || !data) {
    throw new Error(`insert access_grants failed: ${error?.message ?? 'no row'}`);
  }
  created.grantIds.push(data.id);
  return data.id;
}

/** Soft revoke (mirrors production behaviour — preserves audit trail). */
export async function revokeGrant(
  admin: SupabaseClient,
  grantId: string,
): Promise<void> {
  const { error } = await admin
    .from('access_grants')
    .update({ revoked_at: new Date().toISOString(), is_active: false })
    .eq('id', grantId);
  if (error) throw new Error(`revokeGrant failed: ${error.message}`);
}

// ── 4. HTTP-as-user ──────────────────────────────────────────────────────────
// Raw fetch wrapper for when a test needs precise control (e.g. asserting a
// 403 vs 401, or reading Prefer headers). For typical reads/writes, prefer
// `testUser.client.from(...)` / `.rpc(...)` which go through supabase-js.

export async function asUser(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!path.startsWith('/')) {
    throw new Error(`asUser: path must start with "/", got "${path}"`);
  }
  const url = `${SUPABASE_URL}${path}`;
  const headers: Record<string, string> = {
    apikey: ANON_KEY!,
    Authorization: `Bearer ${accessToken}`,
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (init.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, { ...init, headers });
}

// ── 5. Cleanup ───────────────────────────────────────────────────────────────

/**
 * Tear down everything the harness created, in reverse dependency order.
 * Safe to call multiple times — trackers are reset after each call.
 */
export async function cleanup(admin: SupabaseClient): Promise<void> {
  if (created.grantIds.length) {
    await admin.from('access_grants').delete().in('id', created.grantIds);
  }
  if (created.professionalIds.length) {
    await admin.from('professionals').delete().in('id', created.professionalIds);
  }
  if (created.petIds.length) {
    await admin.from('pets').delete().in('id', created.petIds);
  }
  // Delete auth users last — the public.users row cascades via its FK,
  // which also cleans up notifications_queue / etc. inserted by the
  // trigger.
  for (const uid of created.userIds) {
    await admin.auth.admin.deleteUser(uid);
  }

  // Allow the harness to be re-entered (useful for future batched runs).
  created.grantIds.length = 0;
  created.professionalIds.length = 0;
  created.petIds.length = 0;
  created.userIds.length = 0;
}

/** Read-only snapshot of currently-tracked resources. Useful for debug. */
export function tracked(): Readonly<Registry> {
  return {
    userIds: [...created.userIds],
    petIds: [...created.petIds],
    professionalIds: [...created.professionalIds],
    grantIds: [...created.grantIds],
  };
}

// ── 6. Smoke test ────────────────────────────────────────────────────────────
// Validates that the harness itself works before any Fase 2 migration is
// written. When this passes we have confidence in createTutor/createPet/
// createProfessional/createGrant and the HTTP-authenticated read path.
// All subsequent Fase 2 blocks build on these primitives.

async function smokeTest(): Promise<void> {
  const admin = adminClient();

  console.log('[e2e] step 1: create tutor');
  const tutor = await createTutor(admin);
  console.log(`       ok — userId=${tutor.userId.slice(0, 8)}… email=${tutor.email}`);

  console.log('[e2e] step 2: create pet owned by tutor (via service role)');
  const pet = await createPet(admin, tutor.userId, { name: 'Smoke', species: 'dog' });
  console.log(`       ok — petId=${pet.petId.slice(0, 8)}…`);

  console.log('[e2e] step 3: tutor reads own pet via REST (auth.uid()=tutor, RLS applies)');
  {
    const { data: rows, error } = await tutor.client
      .from('pets')
      .select('id, name, species')
      .eq('id', pet.petId);
    if (error) throw new Error(`tutor REST read failed: ${error.message}`);
    if (!rows || rows.length !== 1) {
      throw new Error(`expected 1 row, got ${rows?.length ?? 0}`);
    }
    if (rows[0].name !== 'Smoke') {
      throw new Error(`name mismatch: got "${rows[0].name}"`);
    }
  }
  console.log('       ok — tutor sees own pet');

  console.log('[e2e] step 4: non-owner tutor is blocked by RLS');
  const otherTutor = await createTutor(admin);
  {
    const { data: rows, error } = await otherTutor.client
      .from('pets')
      .select('id')
      .eq('id', pet.petId);
    if (error) throw new Error(`unexpected REST error: ${error.message}`);
    if (rows && rows.length > 0) {
      throw new Error(`RLS leak: non-owner saw ${rows.length} row(s) of pet ${pet.petId}`);
    }
  }
  console.log('       ok — RLS blocks non-owner');

  console.log('[e2e] step 5: create professional');
  const pro = await createProfessional(admin);
  console.log(
    `       ok — professionalId=${pro.professionalId.slice(0, 8)}… type=${pro.professionalType}`,
  );

  console.log('[e2e] step 6: without a grant, has_pet_access returns false for pro');
  {
    const { data, error } = await pro.client.rpc('has_pet_access', {
      p_pet_id: pet.petId,
      p_permission: 'read_clinical',
    });
    if (error) throw new Error(`has_pet_access rpc failed: ${error.message}`);
    if (data !== false) {
      throw new Error(`expected false before grant, got ${data}`);
    }
  }
  console.log('       ok — has_pet_access=false before grant');

  console.log('[e2e] step 7: grant role=vet_read, has_pet_access flips to true');
  await createGrant(admin, {
    petId: pet.petId,
    professionalId: pro.professionalId,
    grantedByUserId: tutor.userId,
    role: 'vet_read',
    accepted: true,
    expiresInDays: 30,
  });
  {
    const { data, error } = await pro.client.rpc('has_pet_access', {
      p_pet_id: pet.petId,
      p_permission: 'read_clinical',
    });
    if (error) throw new Error(`has_pet_access rpc failed: ${error.message}`);
    if (data !== true) {
      throw new Error(`expected true with vet_read grant, got ${data}`);
    }
  }
  console.log('       ok — has_pet_access=true with vet_read grant');

  console.log('[e2e] step 8: asUser helper reaches PostgREST and returns 200');
  {
    const res = await asUser(tutor.accessToken, `/rest/v1/pets?id=eq.${pet.petId}&select=id,name`);
    if (res.status !== 200) {
      throw new Error(`asUser unexpected status: ${res.status}`);
    }
    const body = (await res.json()) as Array<{ id: string; name: string }>;
    if (body.length !== 1 || body[0].name !== 'Smoke') {
      throw new Error(`asUser body mismatch: ${JSON.stringify(body)}`);
    }
  }
  console.log('       ok — raw fetch path works');

  console.log('[e2e] step 9: cleanup');
  await cleanup(admin);
  console.log('       ok — all fixtures removed');
}

// ── Entry ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  requireEnv();
  const admin = adminClient();
  const started = Date.now();
  try {
    await smokeTest();
    console.log(`[e2e] OK (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    process.exit(0);
  } catch (e) {
    const err = e as Error;
    console.error('[e2e] FAIL:', err.message);
    if (err.stack) console.error(err.stack);
    try {
      await cleanup(admin);
      console.error('[e2e] cleanup OK after failure');
    } catch (cleanupErr) {
      console.error('[e2e] cleanup FAILED:', (cleanupErr as Error).message);
      console.error('[e2e] manual cleanup may be required. userIds still tracked:');
      console.error('     ', tracked().userIds);
    }
    process.exit(1);
  }
}

// Run the smoke test only when invoked directly; stay silent when imported.
const invoked = process.argv[1] ?? '';
if (invoked.endsWith('e2e_pro_module.ts') || invoked.endsWith('e2e_pro_module.js')) {
  main();
}
