/**
 * backfill-pet-rag — Edge Function
 *
 * PROBLEM
 * -------
 * RAG was rolled out after pets already existed in the database. All the
 * vaccines, allergies, consultations, medications, exams, surgeries,
 * expenses, clinical metrics, nutrition and diary entries that predate
 * `generateEmbedding()` calls have NO row in `pet_embeddings`.
 *
 * The assistant then answers as if the pet has no history, because
 * `search-rag` returns nothing. This is the CRITICAL bug #2 from the
 * RAG audit.
 *
 * FIX
 * ---
 * Walk every structured source table for a pet, build the same content
 * prose that `lib/rag.ts::buildEmbeddingContent` + `indexPetHealthData`
 * would produce, skip rows that are already indexed (by the tuple
 * `(pet_id, category, content_id)`), embed with the Supabase AI
 * `gte-small` session, and batch-insert into `pet_embeddings`.
 *
 * Called once per pet per install by `hooks/useBackfillRAG.ts`, which
 * persists an AsyncStorage flag `backfill:done:v1:<pet_id>` so the same
 * pet is never backfilled twice.
 *
 * SECURITY
 * --------
 * verify_jwt = true. The caller's JWT scopes the Supabase client so RLS
 * enforces "you can only backfill pets you own". No service role key is
 * used — inserts go through RLS policies of `pet_embeddings`.
 *
 * POST body:
 *   pet_id   string   — UUID of the pet to backfill
 *
 * Returns:
 *   {
 *     pet_id: string,
 *     existing: number,      // rows already indexed before this run
 *     to_insert: number,     // rows that were candidates for insert
 *     inserted: number,      // rows actually inserted
 *     failed: number,        // rows that failed (embed or insert error)
 *     by_category: Record<string, number>,  // inserted count per category
 *   }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Singleton — constructing a Session is expensive; reuse across invocations.
// deno-lint-ignore no-explicit-any
const embedModel = new (globalThis as any).Supabase.ai.Session('gte-small');

// Importance weights (must match CLAUDE.md §13.3 and lib/rag.ts).
const IMPORTANCE = {
  profile:         1.00,
  allergy:         0.95,
  vaccine:         0.90,
  surgery:         0.90,
  medication:      0.85,
  clinical_metric: 0.85,
  consultation:    0.80,
  symptom:         0.80,
  exam:            0.75,
  weight:          0.70,
  food:            0.60,
  plan:            0.60,
  diary:           0.50,
  moment:          0.50,
  expense:         0.40,
} as const;

// gte-small safe input cap.
const MAX_TEXT_LEN = 512;
// Batch size for inserts — balances edge-function CPU budget vs round trips.
const BATCH_SIZE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function clean(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

function joinParts(parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join('. ');
}

async function embed(text: string): Promise<number[] | null> {
  const input = (text ?? '').trim().slice(0, MAX_TEXT_LEN);
  if (!input) return null;
  try {
    const output = await embedModel.run(input, { mean_pool: true, normalize: true });
    return Array.from(output as Float32Array) as number[];
  } catch (err) {
    console.error('[backfill] embed error:', err);
    return null;
  }
}

type Candidate = {
  category: string;
  content_id: string;
  content_text: string;
  importance: number;
  diary_entry_id?: string | null;
};

// ── Content builders (mirror lib/rag.ts prose) ────────────────────────────────

function buildProfile(pet: Record<string, unknown>): string | null {
  const name = clean(pet.name);
  if (!name) return null;
  return joinParts([
    `${name} é um ${pet.species === 'dog' ? 'cão' : 'gato'}`,
    pet.breed ? `da raça ${pet.breed}` : '',
    pet.sex ? `sexo ${pet.sex === 'male' ? 'macho' : 'fêmea'}` : '',
    pet.weight_kg ? `pesando ${pet.weight_kg} kg` : '',
    pet.blood_type ? `tipo sanguíneo ${pet.blood_type}` : '',
    pet.birth_date ? `nascido em ${pet.birth_date}` : '',
  ]);
}

function buildVaccine(v: Record<string, unknown>): string | null {
  const name = clean(v.name);
  if (!name) return null;
  return joinParts([
    `Vacina ${name} aplicada`,
    v.date_administered ? `em ${v.date_administered}` : '',
    v.veterinarian ? `pela ${v.veterinarian}` : '',
    v.clinic ? `na ${v.clinic}` : '',
    v.next_due_date ? `Próxima dose: ${v.next_due_date}` : '',
  ]);
}

function buildAllergy(a: Record<string, unknown>): string | null {
  const allergen = clean(a.allergen);
  if (!allergen) return null;
  return joinParts([
    `Alergia confirmada: ${allergen}`,
    a.reaction ? `Reação: ${a.reaction}` : '',
    a.severity ? `Severidade: ${a.severity}` : '',
    a.diagnosed_date ? `Diagnosticada em ${a.diagnosed_date}` : '',
  ]);
}

function buildConsultation(c: Record<string, unknown>): string | null {
  return joinParts([
    'Consulta veterinária',
    c.veterinarian ? `com ${c.veterinarian}` : '',
    c.clinic ? `na ${c.clinic}` : '',
    c.date ? `em ${c.date}` : '',
    c.diagnosis ? `Diagnóstico: ${c.diagnosis}` : '',
    c.summary ? `Resumo: ${c.summary}` : '',
    c.type ? `Tipo: ${c.type}` : '',
  ]) || null;
}

function buildMedication(m: Record<string, unknown>): string | null {
  const name = clean(m.name);
  if (!name) return null;
  return joinParts([
    `Medicamento: ${name}`,
    m.dosage ? `Dose: ${m.dosage}` : '',
    m.frequency ? `Frequência: ${m.frequency}` : '',
    m.start_date ? `Início: ${m.start_date}` : '',
    m.end_date ? `Término: ${m.end_date}` : '',
    m.is_continuous ? 'Uso contínuo' : '',
    m.veterinarian ? `Prescrito por ${m.veterinarian}` : m.prescribed_by ? `Prescrito por ${m.prescribed_by}` : '',
    m.reason ? `Motivo: ${m.reason}` : '',
  ]);
}

function buildExam(e: Record<string, unknown>): string | null {
  const name = clean(e.name);
  if (!name) return null;
  const results = (e.results as Array<{ item?: string; value?: unknown; unit?: string; status?: string }>) ?? [];
  const resultsSummary = results
    .filter((r) => r?.value != null)
    .slice(0, 6)
    .map((r) => {
      const item = clean(r.item);
      const unit = clean(r.unit);
      const status = clean(r.status);
      const mark = status && status !== 'normal' ? ` (${status})` : '';
      return item ? `${item}: ${r.value}${unit ? ' ' + unit : ''}${mark}` : '';
    })
    .filter(Boolean)
    .join('; ');
  return joinParts([
    `Exame: ${name}`,
    e.date ? `em ${e.date}` : '',
    e.laboratory ? `laboratório ${e.laboratory}` : '',
    e.veterinarian ? `solicitado por ${e.veterinarian}` : '',
    e.status ? `Status: ${e.status}` : '',
    resultsSummary ? `Resultados: ${resultsSummary}` : '',
  ]);
}

function buildSurgery(s: Record<string, unknown>): string | null {
  const name = clean(s.name);
  if (!name) return null;
  return joinParts([
    `Cirurgia: ${name}`,
    s.veterinarian ? `por ${s.veterinarian}` : '',
    s.clinic ? `na ${s.clinic}` : '',
    s.date ? `em ${s.date}` : '',
    s.anesthesia ? `Anestesia: ${s.anesthesia}` : '',
    s.status ? `Status: ${s.status}` : '',
  ]);
}

function buildExpense(x: Record<string, unknown>): string | null {
  const items = (x.items as Array<{ name?: string; qty?: number; unit_price?: number }>) ?? [];
  const total = x.total ?? items.reduce((sum, i) => sum + ((i?.qty ?? 1) * (i?.unit_price ?? 0)), 0);
  const currency = clean(x.currency) || 'BRL';
  const vendor = clean(x.vendor);
  const category = clean(x.category);
  const itemsSummary = items
    .slice(0, 5)
    .map((i) => clean(i?.name))
    .filter(Boolean)
    .join(', ');
  if (!total && !vendor && !category && !itemsSummary) return null;
  return joinParts([
    `Gasto registrado${category ? ` (${category})` : ''}`,
    total ? `valor ${currency} ${total}` : '',
    vendor ? `em ${vendor}` : '',
    x.date ? `em ${x.date}` : '',
    itemsSummary ? `Itens: ${itemsSummary}` : '',
  ]);
}

function buildClinicalMetric(m: Record<string, unknown>): string | null {
  const type = clean(m.metric_type);
  if (!type) return null;
  const val = m.value;
  const unit = clean(m.unit);
  const when = m.measured_at ? ` (em ${m.measured_at})` : '';
  switch (type) {
    case 'temperature':
      return m.is_fever
        ? `Febre registrada: ${val}°C — acima do normal${when}.`
        : `Temperatura: ${val}°C (normal)${when}.`;
    case 'heart_rate':
      return `Frequência cardíaca: ${val} bpm${m.is_abnormal ? ' — fora do normal' : ''}${when}.`;
    case 'respiratory_rate':
      return `Frequência respiratória: ${val} rpm${m.is_abnormal ? ' — alterada' : ''}${when}.`;
    case 'blood_glucose':
      return `Glicemia: ${val} mg/dL${m.fasting ? ' (em jejum)' : ''}${m.is_abnormal ? ' — fora do normal' : ''}${when}.`;
    case 'blood_pressure':
      return m.secondary_value != null
        ? `Pressão arterial: ${val}/${m.secondary_value} mmHg${m.is_abnormal ? ' — alterada' : ''}${when}.`
        : `Pressão arterial sistólica: ${val} mmHg${when}.`;
    case 'oxygen_saturation':
      return `SpO2: ${val}%${m.is_abnormal ? ' — abaixo do normal' : ' (normal)'}${when}.`;
    case 'lab_result':
      return m.marker_name
        ? `Resultado lab: ${m.marker_name} = ${val}${unit ? ' ' + unit : ''}${m.is_abnormal ? ' — alterado' : ''}${when}.`
        : null;
    case 'body_condition_score':
      return m.score != null
        ? `Escore de Condição Corporal (BCS): ${m.score}/9${when}.`
        : `Condição corporal: ${val}${when}.`;
    default:
      return `Métrica clínica (${type}): ${val}${unit ? ' ' + unit : ''}${when}.`;
  }
}

function buildNutrition(n: Record<string, unknown>): string | null {
  const product = clean(n.product_name);
  if (!product) return null;
  return joinParts([
    `Alimentação: ${product}`,
    n.brand ? `marca ${n.brand}` : '',
    n.category ? `categoria ${n.category}` : '',
    n.record_type ? `tipo ${n.record_type}` : '',
    n.portion_grams ? `porção ${n.portion_grams}g` : '',
    n.daily_portions ? `${n.daily_portions} porções/dia` : '',
    n.calories_kcal ? `${n.calories_kcal} kcal` : '',
    n.is_current ? 'ração atual' : '',
    n.started_at ? `iniciado em ${n.started_at}` : '',
    n.ended_at ? `encerrado em ${n.ended_at}` : '',
  ]);
}

function buildDiary(d: Record<string, unknown>): string | null {
  // Prefer narration (the IA summary) since it is more semantic than raw content.
  const narration = clean(d.narration);
  const content = clean(d.content);
  const body = narration || content;
  if (!body) return null;
  return joinParts([
    'Registro no diário',
    d.entry_date ? `em ${d.entry_date}` : '',
    body,
  ]);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'missing Authorization header' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const { pet_id } = await req.json();
    if (!pet_id || typeof pet_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'pet_id is required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // RLS-scoped client — only sees/touches rows the caller owns.
    const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Verify ownership. If RLS blocks or pet doesn't exist, .single() returns error.
    const { data: pet, error: petErr } = await supabase
      .from('pets')
      .select('id, user_id, name, species, breed, birth_date, sex, weight_kg, blood_type, microchip_id')
      .eq('id', pet_id)
      .maybeSingle();

    if (petErr || !pet) {
      return new Response(
        JSON.stringify({ error: 'pet not found or access denied' }),
        { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const userId = pet.user_id as string;

    // 2. Load the set of already-indexed (category, content_id) tuples for this pet.
    const { data: existing, error: existingErr } = await supabase
      .from('pet_embeddings')
      .select('category, content_id')
      .eq('pet_id', pet_id);

    if (existingErr) {
      console.error('[backfill] failed to load existing embeddings:', existingErr.message);
      return new Response(
        JSON.stringify({ error: 'failed to read existing embeddings' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const indexedKey = (cat: string | null, cid: string | null) => `${cat ?? ''}::${cid ?? ''}`;
    const indexed = new Set<string>();
    for (const row of existing ?? []) {
      indexed.add(indexedKey(row.category, row.content_id));
    }
    const existingCount = existing?.length ?? 0;

    // 3. Walk each source table, collect candidates.
    const candidates: Candidate[] = [];

    // 3a. Pet profile (content_id = pet.id, category = 'profile')
    if (!indexed.has(indexedKey('profile', pet.id))) {
      const text = buildProfile(pet as Record<string, unknown>);
      if (text) {
        candidates.push({
          category: 'profile',
          content_id: pet.id,
          content_text: text,
          importance: IMPORTANCE.profile,
        });
      }
    }

    // 3b. Helper to pull a table and push candidates.
    const pullTable = async <T extends Record<string, unknown>>(
      table: string,
      selectCols: string,
      category: keyof typeof IMPORTANCE,
      build: (row: T) => string | null,
    ) => {
      const { data, error } = await supabase
        .from(table)
        .select(selectCols)
        .eq('pet_id', pet_id)
        .eq('is_active', true);
      if (error) {
        console.warn(`[backfill] ${table} read error:`, error.message);
        return;
      }
      for (const row of (data ?? []) as T[]) {
        const rid = row.id as string | undefined;
        if (!rid) continue;
        if (indexed.has(indexedKey(category, rid))) continue;
        const text = build(row);
        if (!text) continue;
        candidates.push({
          category,
          content_id: rid,
          content_text: text,
          importance: IMPORTANCE[category],
        });
      }
    };

    await pullTable(
      'vaccines',
      'id, name, date_administered, next_due_date, veterinarian, clinic',
      'vaccine',
      buildVaccine,
    );
    await pullTable(
      'allergies',
      'id, allergen, reaction, severity, diagnosed_date',
      'allergy',
      buildAllergy,
    );
    await pullTable(
      'consultations',
      'id, date, veterinarian, clinic, diagnosis, summary, type',
      'consultation',
      buildConsultation,
    );
    await pullTable(
      'medications',
      'id, name, dosage, frequency, start_date, end_date, is_continuous, veterinarian, prescribed_by, reason',
      'medication',
      buildMedication,
    );
    await pullTable(
      'exams',
      'id, name, date, status, results, laboratory, veterinarian',
      'exam',
      buildExam,
    );
    await pullTable(
      'surgeries',
      'id, name, date, veterinarian, clinic, anesthesia, status',
      'surgery',
      buildSurgery,
    );
    await pullTable(
      'expenses',
      'id, date, vendor, category, total, currency, items',
      'expense',
      buildExpense,
    );
    await pullTable(
      'clinical_metrics',
      'id, metric_type, value, unit, marker_name, secondary_value, is_fever, is_abnormal, fasting, score, measured_at',
      'clinical_metric',
      buildClinicalMetric,
    );
    await pullTable(
      'nutrition_records',
      'id, record_type, product_name, brand, category, portion_grams, daily_portions, calories_kcal, is_current, started_at, ended_at',
      'food',
      buildNutrition,
    );

    // 3c. Diary entries — special case: the content_id is diary_entry.id AND
    // we also populate the diary_entry_id column for joins with the UI timeline.
    const { data: diaries, error: diaryErr } = await supabase
      .from('diary_entries')
      .select('id, content, narration, entry_date')
      .eq('pet_id', pet_id)
      .eq('is_active', true);
    if (diaryErr) {
      console.warn('[backfill] diary_entries read error:', diaryErr.message);
    } else {
      for (const d of diaries ?? []) {
        if (!d.id) continue;
        if (indexed.has(indexedKey('diary', d.id))) continue;
        const text = buildDiary(d as Record<string, unknown>);
        if (!text) continue;
        candidates.push({
          category: 'diary',
          content_id: d.id,
          content_text: text,
          importance: IMPORTANCE.diary,
          diary_entry_id: d.id,
        });
      }
    }

    const toInsertCount = candidates.length;

    if (toInsertCount === 0) {
      return new Response(
        JSON.stringify({
          pet_id,
          existing: existingCount,
          to_insert: 0,
          inserted: 0,
          failed: 0,
          by_category: {},
        }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Embed + batch insert.
    let insertedCount = 0;
    let failedCount = 0;
    const byCategory: Record<string, number> = {};

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);

      const rows: Array<Record<string, unknown>> = [];
      for (const c of batch) {
        const vec = await embed(c.content_text);
        if (!vec) {
          failedCount++;
          continue;
        }
        rows.push({
          pet_id,
          user_id: userId,
          diary_entry_id: c.diary_entry_id ?? null,
          category: c.category,
          content_id: c.content_id,
          content_type: c.category,
          content_text: c.content_text.slice(0, 4000),
          embedding: vec,
          importance: c.importance,
          is_active: true,
        });
      }

      if (rows.length === 0) continue;

      const { error: insErr } = await supabase.from('pet_embeddings').insert(rows);
      if (insErr) {
        console.error('[backfill] insert batch error:', insErr.message);
        failedCount += rows.length;
        continue;
      }

      insertedCount += rows.length;
      for (const r of rows) {
        const cat = (r.category as string) ?? 'unknown';
        byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      }
    }

    return new Response(
      JSON.stringify({
        pet_id,
        existing: existingCount,
        to_insert: toInsertCount,
        inserted: insertedCount,
        failed: failedCount,
        by_category: byCategory,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[backfill-pet-rag] error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
