/**
 * Pet context module — fetches pet profile + RAG memories for the classifier.
 *
 * Provides a rich context string that includes:
 *   1. Pet profile (name, species, breed, age, weight, mood, health score)
 *   2. Active allergies and upcoming vaccines
 *   3. Top-5 most semantically relevant memories (vector search)
 *   4. Top-10 critical memories by importance (always included)
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ── Inlined embedding helper — Supabase AI gte-small (384d), no API key ──
// deno-lint-ignore no-explicit-any
const _embedModel = new (globalThis as any).Supabase.ai.Session('gte-small');

async function generateEmbedding(text: string): Promise<number[]> {
  const input = (text ?? '').trim().slice(0, 512);
  if (!input) throw new Error('empty text');
  const output = await _embedModel.run(input, { mean_pool: true, normalize: true });
  return Array.from(output as Float32Array) as number[];
}

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── Types ──────────────────────────────────────────────────────────────────

export interface PetContext {
  /** Structured string passed directly into the system prompt */
  contextString: string;
  /** Raw fields kept for backward compat with classifier */
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age_desc: string;
  weight_kg: number | null;
  /** Legacy: plain-text recent memories (first 5 diary entries) */
  recent_memories: string;
}

interface PetRow {
  id: string;
  name: string;
  species: string;
  sex: string | null;
  breed: string | null;
  estimated_age_months: number | null;
  weight_kg: number | null;
  current_mood: string | null;
  health_score: number | null;
}

interface AllergyRow { allergen: string; reaction: string | null }
interface VaccineRow { name: string; next_due_date: string | null }
interface MemoryRow  { content_text: string; importance: number; category: string | null }

// ── Service client ─────────────────────────────────────────────────────────

export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Fetch the pet profile and RAG memories, returning a structured context
 * for the classifier prompt. Falls back gracefully if embedding fails.
 */
export async function fetchPetContext(
  petId:       string,
  inputText?:  string,
  supabase?:   SupabaseClient,
): Promise<PetContext | null> {
  const client = supabase ?? createServiceClient();

  // ── 1. Pet profile ────────────────────────────────────────────────────────

  const { data: pet, error: petError } = await client
    .from('pets')
    .select('id, name, species, sex, breed, estimated_age_months, weight_kg, current_mood, health_score')
    .eq('id', petId)
    .eq('is_active', true)
    .single<PetRow>();

  if (petError || !pet) {
    console.error('[context] Pet not found:', petError?.message);
    return null;
  }

  // ── 2. Active allergies ───────────────────────────────────────────────────

  const { data: allergies } = await client
    .from('allergies')
    .select('allergen, reaction')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .limit(10);

  // ── 3. Upcoming vaccines (next 60 days) ───────────────────────────────────

  const { data: vaccines } = await client
    .from('vaccines')
    .select('name, next_due_date')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .not('next_due_date', 'is', null)
    .gte('next_due_date', new Date().toISOString().slice(0, 10))
    .lte('next_due_date', offsetDate(60))
    .order('next_due_date', { ascending: true })
    .limit(5);

  // ── 4. Critical memories (importance ≥ 0.8, always included) ─────────────

  const { data: criticalMems } = await client
    .from('pet_embeddings')
    .select('content_text, importance, category')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .gte('importance', 0.8)
    .order('importance', { ascending: false })
    .limit(10);

  // ── 5. Relevant memories (vector similarity search) ───────────────────────

  let relevantMems: MemoryRow[] = [];

  if (inputText && inputText.trim().length > 0) {
    try {
      const queryEmbedding = await generateEmbedding(inputText);

      const { data: vecResults } = await client.rpc('match_pet_embeddings', {
        p_pet_id:          petId,
        p_query_embedding: queryEmbedding,
        p_match_threshold: 0.65,
        p_match_count:     5,
      });

      if (vecResults && vecResults.length > 0) {
        // Avoid duplicating entries already in criticalMems
        const criticalTexts = new Set((criticalMems ?? []).map((m: MemoryRow) => m.content_text));
        relevantMems = (vecResults as Array<{ content_text: string; importance: number; category: string | null }>)
          .filter((r) => !criticalTexts.has(r.content_text))
          .map((r) => ({ content_text: r.content_text, importance: r.importance, category: r.category }));
      }
    } catch (embErr) {
      // Embedding failed — continue without vector search, fallback to recent entries
      console.warn('[context] Vector search skipped:', String(embErr));

      // Fallback: last 5 diary entries
      const { data: recentEntries } = await client
        .from('diary_entries')
        .select('content, primary_type')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      relevantMems = (recentEntries ?? []).map((e: { content: string; primary_type: string }) => ({
        content_text: `[${e.primary_type}] ${e.content?.slice(0, 120)}`,
        importance: 0.5,
        category: e.primary_type,
      }));
    }
  }

  // ── 6. Build context string ───────────────────────────────────────────────

  const contextString = buildContextString(pet, allergies ?? [], vaccines ?? [], criticalMems ?? [], relevantMems);

  // Legacy fields (kept so classifier.ts buildSystemPrompt() still works)
  const ageDesc = formatAge(pet.estimated_age_months);
  const recentMemories = relevantMems
    .map(m => `[${m.category ?? '?'}] ${m.content_text.slice(0, 80)}`)
    .join(' | ') || 'none';

  return {
    contextString,
    name:            pet.name,
    species:         pet.species,
    breed:           pet.breed,
    sex:             pet.sex,
    age_desc:        ageDesc,
    weight_kg:       pet.weight_kg,
    recent_memories: recentMemories,
  };
}

// ── Context string builder ─────────────────────────────────────────────────

function buildContextString(
  pet:          PetRow,
  allergies:    AllergyRow[],
  vaccines:     VaccineRow[],
  critical:     MemoryRow[],
  relevant:     MemoryRow[],
): string {
  const ageDesc = formatAge(pet.estimated_age_months);
  const speciesLabel = pet.species === 'dog' ? 'cão' : 'gato';

  const allergyText = allergies.length > 0
    ? allergies.map(a => `${a.allergen}${a.reaction ? ' (reação: ' + a.reaction + ')' : ''}`).join(', ')
    : 'nenhuma conhecida';

  const vaccineText = vaccines.length > 0
    ? vaccines.map(v => `${v.name} vence em ${v.next_due_date}`).join(', ')
    : '';

  const criticalText = critical.length > 0
    ? critical.map(m => `• ${m.content_text}`).join('\n')
    : 'nenhuma ainda';

  const relevantText = relevant.length > 0
    ? relevant.map(m => `• ${m.content_text}`).join('\n')
    : 'nenhuma encontrada';

  return [
    'DADOS DO PET:',
    `  Nome:        ${pet.name}`,
    `  Espécie:     ${speciesLabel}`,
    `  Raça:        ${pet.breed || 'não informada'}`,
    `  Idade:       ${ageDesc}`,
    `  Peso atual:  ${pet.weight_kg != null ? pet.weight_kg + ' kg' : 'não registrado'}`,
    `  Humor atual: ${pet.current_mood || 'não registrado'}`,
    `  Saúde score: ${pet.health_score != null ? pet.health_score + '/100' : 'não registrado'}`,
    `  Alergias:    ${allergyText}`,
    vaccineText ? `  Vacinas:     ${vaccineText}` : '',
    '',
    'MEMÓRIAS CRÍTICAS (alta importância — sempre considerar ao classificar e narrar):',
    criticalText,
    '',
    'MEMÓRIAS RELEVANTES AO CONTEXTO ATUAL:',
    relevantText,
    '',
    'INSTRUÇÕES PARA USO DAS MEMÓRIAS:',
    '- Se o tutor menciona "o remédio" sem especificar → usar medicamento ativo das memórias',
    '- Se menciona "a vet" sem nome → usar veterinário das memórias',
    '- Se menciona "a clínica" → usar clínica frequente das memórias',
    '- Se menciona "o amigo" → verificar pets amigos nas memórias',
    '- Peso: comparar com peso anterior nas memórias',
    '- Vacina: verificar se é reforço com base na memória anterior',
    '- Sintoma: verificar se é recorrente nas memórias',
  ].filter(line => line !== '').join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatAge(months: number | null): string {
  if (!months) return 'idade desconhecida';
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const rem   = months % 12;
    return rem > 0 ? `${years} ano(s) e ${rem} mês(es)` : `${years} ano(s)`;
  }
  return `${months} mês(es)`;
}

function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
