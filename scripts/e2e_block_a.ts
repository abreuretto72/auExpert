/**
 * e2e_block_a.ts — Fase 2, Bloco A
 *
 * Purpose
 * -------
 * Valida a RPC `get_pet_clinical_bundle` (migration
 * `20260422_clinical_read_rpc.sql`) e o registro automático em
 * `access_audit_log` quando um profissional exerce o grant.
 *
 * Importa as primitivas do harness `e2e_pro_module.ts` pra não reinventar
 * create-tutor/create-pro/create-pet/create-grant/asUser/cleanup.
 *
 * Cenários (ordem importa — cada um constrói sobre o anterior):
 *   A1. Pro SEM grant chama RPC                → 403 + ZERO audit logs
 *   A2. Depois do grant vet_read (read_clinical)
 *       a) Pro chama RPC                        → 200 + bundle JSONB + 1 audit log
 *       b) Pro tenta /rest/v1/vaccines direto   → RLS segue bloqueando
 *   A3. Tutor (dono) chama RPC                  → 200 + bundle + 0 audit logs novos
 *                                                  (short-circuit `is_pet_owner`)
 *   A4. Regressão: tutor /rest/v1/vaccines direto → 200 + N linhas
 *       (prova que a policy RLS continua intacta — sem regressão da Fase 1)
 *
 * Rodar:
 *   npx tsx scripts/e2e_block_a.ts
 *
 * Exit 0 em sucesso, 1 em qualquer falha. Sempre tenta cleanup.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  adminClient,
  asUser,
  cleanup,
  createGrant,
  createPet,
  createProfessional,
  createTutor,
  tracked,
} from './e2e_pro_module';

// ── Env check (primitivas já leem env, mas dá mensagem melhor aqui) ───────────

function requireEnv(): void {
  const missing: string[] = [];
  if (!(process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL))
    missing.push('SUPABASE_URL');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!(process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY))
    missing.push('SUPABASE_ANON_KEY');
  if (missing.length) {
    console.error(`[block-a] Missing env vars: ${missing.join(', ')}`);
    console.error('[block-a] See scripts/e2e_pro_module.README.md for setup.');
    process.exit(1);
  }
}

// ── Fixtures clínicos ────────────────────────────────────────────────────────

/**
 * Popula as 8 tabelas clínicas para um pet de teste. As contagens retornadas
 * precisam bater com o que `get_pet_clinical_bundle` vai devolver.
 */
async function populateClinical(
  admin: SupabaseClient,
  petId: string,
  tutorUserId: string,
): Promise<Record<string, number>> {
  // vaccines (2)
  {
    const { error } = await admin.from('vaccines').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        name: 'V10',
        date_administered: '2026-01-15',
        next_due_date: '2027-01-15',
        dose_number: 1,
        veterinarian: 'Dr. Teste',
      },
      {
        pet_id: petId,
        user_id: tutorUserId,
        name: 'Antirrabica',
        date_administered: '2026-02-20',
        next_due_date: '2027-02-20',
        dose_number: 1,
        veterinarian: 'Dr. Teste',
      },
    ]);
    if (error) throw new Error(`insert vaccines: ${error.message}`);
  }

  // allergies (1)
  {
    const { error } = await admin.from('allergies').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        allergen: 'frango',
        reaction: 'coceira generalizada',
        severity: 'moderate',
        confirmed: true,
      },
    ]);
    if (error) throw new Error(`insert allergies: ${error.message}`);
  }

  // consultations (1) — NO ACTION no FK: precisa ser limpa manualmente
  {
    const { error } = await admin.from('consultations').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        date: '2026-03-10',
        veterinarian: 'Dra. Clinica',
        clinic: 'Clinica Teste',
        type: 'checkup',
        summary: 'Check-up anual de rotina',
      },
    ]);
    if (error) throw new Error(`insert consultations: ${error.message}`);
  }

  // medications (1) — NO ACTION no FK
  {
    const { error } = await admin.from('medications').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        name: 'Vermifugo',
        frequency: 'mensal',
        start_date: '2026-03-01',
        dosage: '1 comprimido',
      },
    ]);
    if (error) throw new Error(`insert medications: ${error.message}`);
  }

  // exams (1) — NO ACTION no FK
  {
    const { error } = await admin.from('exams').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        name: 'Hemograma',
        date: '2026-03-05',
        status: 'normal',
      },
    ]);
    if (error) throw new Error(`insert exams: ${error.message}`);
  }

  // surgeries (1) — NO ACTION no FK
  {
    const { error } = await admin.from('surgeries').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        name: 'Castracao',
        date: '2024-06-01',
        veterinarian: 'Dr. Cirurgia',
        status: 'recovered',
      },
    ]);
    if (error) throw new Error(`insert surgeries: ${error.message}`);
  }

  // clinical_metrics (1) — weight
  {
    const { error } = await admin.from('clinical_metrics').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        metric_type: 'weight',
        value: 8.5,
        unit: 'kg',
        measured_at: '2026-03-10T10:00:00Z',
      },
    ]);
    if (error) throw new Error(`insert clinical_metrics: ${error.message}`);
  }

  // diary_entries (1) — precisa primary_type IN clinical allowlist
  {
    const { error } = await admin.from('diary_entries').insert([
      {
        pet_id: petId,
        user_id: tutorUserId,
        content: 'Espirrou bastante hoje, pode ser algo do ar-condicionado.',
        mood_id: 'calm',
        entry_date: '2026-03-11',
        primary_type: 'symptom',
      },
    ]);
    if (error) throw new Error(`insert diary_entries: ${error.message}`);
  }

  return {
    vaccines: 2,
    allergies: 1,
    consultations: 1,
    medications: 1,
    exams: 1,
    surgeries: 1,
    clinical_metrics: 1,
    diary_entries: 1,
  };
}

/**
 * Limpa as 4 tabelas com FK `NO ACTION` pra pets. Precisa rodar ANTES do
 * `cleanup()` do harness — senão o DELETE dos pets quebra por RESTRICT.
 * As outras 4 (vaccines/allergies/clinical_metrics/diary_entries) caem
 * via CASCADE.
 */
async function cleanupBlockA(
  admin: SupabaseClient,
  petIds: readonly string[],
): Promise<void> {
  if (!petIds.length) return;
  const tables = ['consultations', 'medications', 'exams', 'surgeries'] as const;
  for (const t of tables) {
    const { error } = await admin.from(t).delete().in('pet_id', petIds);
    if (error) throw new Error(`cleanupBlockA ${t}: ${error.message}`);
  }
}

// ── RPC / audit helpers ──────────────────────────────────────────────────────

type BundleResp = {
  status: number;
  body: unknown;
};

async function callBundleRpc(accessToken: string, petId: string): Promise<BundleResp> {
  const res = await asUser(accessToken, '/rest/v1/rpc/get_pet_clinical_bundle', {
    method: 'POST',
    body: JSON.stringify({ p_pet_id: petId }),
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

async function countClinicalReadAudits(
  admin: SupabaseClient,
  petId: string,
): Promise<number> {
  const { count, error } = await admin
    .from('access_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('event_type', 'clinical_read');
  if (error) throw new Error(`audit count: ${error.message}`);
  return count ?? 0;
}

// ── Assertions helpers ───────────────────────────────────────────────────────

function expect(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function expectEq<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ── Test scenarios ───────────────────────────────────────────────────────────

async function blockA(): Promise<void> {
  const admin = adminClient();

  // Setup --------------------------------------------------------------------
  console.log('[block-a] setup: tutor + pet + pro + populate clinical data');
  const tutor = await createTutor(admin);
  const { petId } = await createPet(admin, tutor.userId, {
    name: 'ClinicoA',
    species: 'dog',
  });
  const pro = await createProfessional(admin, { displayName: 'Dr. Block A' });
  const expected = await populateClinical(admin, petId, tutor.userId);
  console.log(
    `       ok — tutor=${tutor.userId.slice(0, 8)}… pet=${petId.slice(0, 8)}… pro=${pro.professionalId.slice(0, 8)}…`,
  );

  // A1: pro SEM grant ---------------------------------------------------------
  console.log('[block-a] A1: pro WITHOUT grant calls RPC → expect 403 + 0 audit logs');
  {
    const { status, body } = await callBundleRpc(pro.accessToken, petId);
    expectEq(status, 403, 'A1 RPC status');
    // PostgREST envelopa o erro em { code, message, hint, details }
    const b = body as { code?: string; message?: string } | null;
    expect(
      typeof b?.message === 'string' && /forbidden/i.test(b.message),
      `A1 body should carry "forbidden" message, got ${JSON.stringify(body)}`,
    );
    const audits = await countClinicalReadAudits(admin, petId);
    expectEq(audits, 0, 'A1 audit log count');
  }
  console.log('       ok — 403 (forbidden), 0 audit logs');

  // A2: pro COM grant vet_read -----------------------------------------------
  console.log('[block-a] A2: grant vet_read, pro calls RPC → expect 200 + bundle + 1 audit log');
  await createGrant(admin, {
    petId,
    professionalId: pro.professionalId,
    grantedByUserId: tutor.userId,
    role: 'vet_read',
    accepted: true,
    expiresInDays: 30,
  });

  {
    const { status, body } = await callBundleRpc(pro.accessToken, petId);
    expectEq(status, 200, 'A2 RPC status');
    const bundle = body as Record<string, unknown>;
    expect(bundle && typeof bundle === 'object', 'A2 bundle is object');
    expectEq(bundle.pet_id, petId, 'A2 bundle.pet_id');
    for (const [key, count] of Object.entries(expected)) {
      const arr = bundle[key];
      expect(Array.isArray(arr), `A2 bundle.${key} is array`);
      expectEq((arr as unknown[]).length, count, `A2 bundle.${key}.length`);
    }
  }

  // Inspeciona a linha do audit log
  const { data: auditRows, error: auditErr } = await admin
    .from('access_audit_log')
    .select('*')
    .eq('pet_id', petId)
    .eq('event_type', 'clinical_read');
  if (auditErr) throw new Error(`audit select: ${auditErr.message}`);
  expectEq(auditRows?.length ?? 0, 1, 'A2 audit row count');
  const audit = auditRows![0] as {
    actor_user_id: string;
    professional_id: string;
    access_grant_id: string | null;
    target_table: string | null;
    target_id: string | null;
    context: { rpc?: string; counts?: Record<string, number> } | null;
  };
  expectEq(audit.actor_user_id, pro.userId, 'A2 audit.actor_user_id');
  expectEq(audit.professional_id, pro.professionalId, 'A2 audit.professional_id');
  expect(audit.access_grant_id !== null, 'A2 audit.access_grant_id is set');
  expectEq(audit.target_table, null, 'A2 audit.target_table');
  expectEq(audit.target_id, null, 'A2 audit.target_id');
  expectEq(audit.context?.rpc, 'get_pet_clinical_bundle', 'A2 audit.context.rpc');
  const counts = audit.context?.counts ?? {};
  for (const [key, n] of Object.entries(expected)) {
    expectEq(counts[key], n, `A2 audit.context.counts.${key}`);
  }
  console.log('       ok — 200, bundle has 8 categories with expected counts, 1 audit log with matching context');

  // A2.5: RLS segue bloqueando o pro no REST direto, mesmo com grant ativo
  console.log('[block-a] A2.5: pro tries /rest/v1/vaccines direct → expect blocked by RLS (0 rows)');
  {
    const res = await asUser(
      pro.accessToken,
      `/rest/v1/vaccines?pet_id=eq.${petId}&is_active=eq.true&select=id,name`,
    );
    expectEq(res.status, 200, 'A2.5 REST status');
    const rows = (await res.json()) as Array<{ id: string }>;
    expectEq(rows.length, 0, 'A2.5 REST rows visible to pro');
  }
  console.log('       ok — RLS blocks pro on REST direct (RPC é o único caminho)');

  // A3: tutor chamando a RPC (short-circuit) ----------------------------------
  console.log('[block-a] A3: tutor calls RPC → expect 200 + bundle + 0 NEW audit logs');
  {
    const { status, body } = await callBundleRpc(tutor.accessToken, petId);
    expectEq(status, 200, 'A3 RPC status');
    const bundle = body as Record<string, unknown>;
    expect(
      Array.isArray(bundle.vaccines) && (bundle.vaccines as unknown[]).length === 2,
      'A3 bundle.vaccines length 2',
    );
    expect(
      Array.isArray(bundle.diary_entries) && (bundle.diary_entries as unknown[]).length === 1,
      'A3 bundle.diary_entries length 1',
    );
    const totalAfter = await countClinicalReadAudits(admin, petId);
    expectEq(totalAfter, 1, 'A3 total audit logs unchanged (tutor is short-circuited)');
  }
  console.log('       ok — 200, bundle delivered, audit count ainda em 1 (tutor não audita)');

  // A4: regressão — tutor /rest/v1/vaccines direto ----------------------------
  console.log('[block-a] A4: regression — tutor reads /rest/v1/vaccines direct → expect 2 rows');
  {
    const res = await asUser(
      tutor.accessToken,
      `/rest/v1/vaccines?pet_id=eq.${petId}&is_active=eq.true&select=id,name`,
    );
    expectEq(res.status, 200, 'A4 REST status');
    const rows = (await res.json()) as Array<{ id: string; name: string }>;
    expectEq(rows.length, 2, 'A4 REST rows');
  }
  console.log('       ok — RLS policy de vaccines intacta, tutor REST direto segue lendo');

  // Cleanup ------------------------------------------------------------------
  console.log('[block-a] cleanup');
  const snapshot = tracked();
  await cleanupBlockA(admin, snapshot.petIds);
  await cleanup(admin);
  console.log('       ok — all fixtures removed');
}

// ── Entry ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  requireEnv();
  const admin = adminClient();
  const started = Date.now();
  try {
    await blockA();
    console.log(`[block-a] OK (${((Date.now() - started) / 1000).toFixed(1)}s)`);
    process.exit(0);
  } catch (e) {
    const err = e as Error;
    console.error('[block-a] FAIL:', err.message);
    if (err.stack) console.error(err.stack);
    try {
      const snapshot = tracked();
      await cleanupBlockA(admin, snapshot.petIds);
      await cleanup(admin);
      console.error('[block-a] cleanup OK after failure');
    } catch (cleanupErr) {
      console.error('[block-a] cleanup FAILED:', (cleanupErr as Error).message);
      console.error('[block-a] manual cleanup may be required. tracked:');
      console.error('     ', tracked());
    }
    process.exit(1);
  }
}

const invoked = process.argv[1] ?? '';
if (invoked.endsWith('e2e_block_a.ts') || invoked.endsWith('e2e_block_a.js')) {
  main();
}
