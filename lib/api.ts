import { supabase } from './supabase';
import type { Pet, DiaryEntry, Vaccine, Allergy, MoodLog } from '../types/database';
import {
  PetSchema,
  DiaryEntrySchema,
  VaccineSchema,
  AllergySchema,
  ScheduledEventSchema,
  type ScheduledEvent,
} from './schemas';
import { safeArray, safeOne } from './validate';
import { withTimeout, DEFAULT_TIMEOUT_MS } from './withTimeout';

// Re-export ScheduledEvent para manter compatibilidade com callers existentes
// que importam de `lib/api` (a interface agora mora em lib/schemas).
export type { ScheduledEvent };

// ══════════════════════════════════════
// PETS
// ══════════════════════════════════════

export async function fetchPets(): Promise<Pet[]> {
  // 1. Pets que sou dono (RLS filtra por user_id automaticamente)
  const { data: ownedPets, error: ownedError } = await withTimeout(
    supabase
      .from('pets')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    DEFAULT_TIMEOUT_MS,
    'fetchPets:owned',
  );

  if (ownedError) throw ownedError;

  // 2. Pets onde sou co-tutor/cuidador/visualizador ativo
  const { data: memberRows, error: memberError } = await withTimeout(
    supabase
      .from('pet_members')
      .select('pets(*), role')
      .eq('is_active', true)
      .not('accepted_at', 'is', null),
    DEFAULT_TIMEOUT_MS,
    'fetchPets:members',
  );

  if (memberError) throw memberError;

  // Valida pets próprios (passthrough tolera colunas novas do banco).
  const owned = safeArray(ownedPets, PetSchema, 'fetchPets:owned');

  // Pets compartilhados vêm com nested join — validar o pet embutido e
  // mesclar com o role do membership. safeOne retorna null se inválido;
  // filter(Boolean) descarta.
  const ownedIds = new Set(owned.map((p) => p.id));
  const shared: Pet[] = [];
  for (const m of memberRows ?? []) {
    const raw = (m as { pets?: unknown }).pets;
    if (!raw) continue;
    const pet = safeOne(raw, PetSchema, 'fetchPets:shared');
    if (!pet || ownedIds.has(pet.id)) continue;
    // Anexa _role como metadado extra — passthrough garante que está no objeto
    // mesmo que não apareça no type inferido.
    shared.push(Object.assign(pet, { _role: (m as { role?: unknown }).role }));
  }

  return [...owned, ...shared];
}

export async function fetchPetById(id: string): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Pet;
}

export async function createPet(
  pet: Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'is_active'>,
): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .insert(pet)
    .select()
    .single();

  if (error) {
    console.error('[api.createPet] ERRO Supabase:', error.message, error.code, error.details, error.hint);
    throw error;
  }
  return data as Pet;
}

export async function updatePet(
  id: string,
  updates: Partial<Pet>,
): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Pet;
}

export async function deletePet(id: string): Promise<void> {
  const { error } = await supabase
    .from('pets')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ══════════════════════════════════════
// DIARY
// ══════════════════════════════════════

export async function fetchScheduledEvents(petId: string): Promise<ScheduledEvent[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('scheduled_events')
      .select('*')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .in('status', ['scheduled', 'confirmed'])
      .order('scheduled_for', { ascending: true }),
    DEFAULT_TIMEOUT_MS,
    `fetchScheduledEvents:${petId.slice(-8)}`,
  );

  if (error) throw error;
  return safeArray(data, ScheduledEventSchema, `fetchScheduledEvents:${petId.slice(-8)}`);
}

export async function fetchDiaryEntries(
  petId: string, page = 1, perPage = 20,
): Promise<DiaryEntry[]> {
  const from = (page - 1) * perPage;
  const to   = page * perPage - 1;

  const { data, error } = await withTimeout(
    supabase
      .from('diary_entries')
      .select('*, registered_by_user:users!user_id(full_name,email)')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to),
    DEFAULT_TIMEOUT_MS,
    `fetchDiaryEntries:${petId.slice(-8)}`,
  );

  console.log('[API] fetchDiaryEntries petId:', petId.slice(-8));
  console.log('[API] total:', data?.length ?? 0, '| erro:', error ? `${error.message} (code=${error.code} details=${error.details})` : 'ok');
  if (data && data.length > 0) {
    const e = data[0] as Record<string, unknown>;
    console.log('[API] entry[0]:', (e.id as string).slice(-8),
      '| fotos:', (e.photos as unknown[] | null)?.length ?? 0,
      '| photo_analysis:', !!e.photo_analysis_data,
      '| narration:', !!e.narration,
      '| video_url:', !!e.video_url,
      '| classif:', (e.classifications as unknown[] | null)?.length ?? 0,
      '| media_analyses:', (e.media_analyses as unknown[] | null)?.length ?? 'null',
    );
  }

  if (error) throw error;
  return safeArray(data, DiaryEntrySchema, `fetchDiaryEntries:${petId.slice(-8)}`);
}

export interface CreateDiaryParams {
  pet_id: string;
  user_id: string;
  content: string;
  input_method: 'voice' | 'photo' | 'text' | 'gallery' | 'video' | 'audio' | 'ocr_scan' | 'pdf' | 'pet_audio';
  mood_id: string;
  mood_score?: number | null;
  mood_source?: 'manual' | 'ai_suggested';
  entry_type?: DiaryEntry['entry_type'];
  tags?: string[];
  is_special?: boolean;
  photos?: string[];
  linked_photo_analysis_id?: string | null;
}

export async function createDiaryEntry(params: CreateDiaryParams): Promise<string> {
  // Try using the DB function (atomic: creates entry + mood_log)
  // p_tags and p_photos are omitted when empty so the DB default '[]'::jsonb is used —
  // passing a JS [] can arrive as a scalar to jsonb_array_length() in some Supabase client versions.
  const rpcParams: Record<string, unknown> = {
    p_pet_id:    params.pet_id,
    p_author_id: params.user_id,
    p_content:   params.content,
    p_input_method: params.input_method,
    p_mood_id:   params.mood_id,
    p_mood_score: params.mood_score ?? null,
    p_mood_source: params.mood_source ?? 'manual',
    p_entry_type:  params.entry_type ?? 'manual',
    p_is_special:  params.is_special ?? false,
    p_linked_photo_analysis_id: params.linked_photo_analysis_id ?? null,
  };
  if (params.tags?.length)   rpcParams.p_tags   = params.tags;
  if (params.photos?.length) rpcParams.p_photos = params.photos;

  const { data, error } = await supabase.rpc('fn_create_diary_entry', rpcParams);

  if (error) {
    console.warn('[api.createDiaryEntry] rpc fn_create_diary_entry failed →', error.code, error.message);
    // Fallback to direct insert — only columns that exist in the table
    const { data: fallback, error: fbError } = await supabase
      .from('diary_entries')
      .insert({
        pet_id: params.pet_id,
        user_id: params.user_id,
        content: params.content,
        narration: null,
        mood_id: params.mood_id,
        tags: params.tags ?? [],
        is_special: params.is_special ?? false,
        photos: params.photos ?? [],
        entry_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (fbError) {
      console.error('[api.createDiaryEntry] Fallback ALSO failed →', fbError.code, fbError.message, fbError.details);
      throw fbError;
    }
    return (fallback as { id: string }).id;
  }

  return data as string;
}

export async function updateDiaryEntry(
  id: string,
  updates: Partial<Pick<DiaryEntry, 'content' | 'narration' | 'mood_id' | 'mood_score' | 'tags' | 'photos' | 'is_special'>>,
): Promise<DiaryEntry> {
  // Only send columns that exist in the actual DB table
  // mood_score may not exist if migration 009 hasn't been applied
  const safeUpdates: Record<string, unknown> = {};
  if (updates.content !== undefined) safeUpdates.content = updates.content;
  if (updates.narration !== undefined) safeUpdates.narration = updates.narration;
  if (updates.mood_id !== undefined) safeUpdates.mood_id = updates.mood_id;
  if (updates.tags !== undefined) safeUpdates.tags = updates.tags;
  if (updates.photos !== undefined) safeUpdates.photos = updates.photos;
  if (updates.is_special !== undefined) safeUpdates.is_special = updates.is_special;

  // Try with mood_score first, fallback without it
  if (updates.mood_score !== undefined) safeUpdates.mood_score = updates.mood_score;

  const { data, error } = await supabase
    .from('diary_entries')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error?.code === 'PGRST204' && safeUpdates.mood_score !== undefined) {
    // mood_score column doesn't exist yet — retry without it
    delete safeUpdates.mood_score;
    const { data: fallback, error: fbError } = await supabase
      .from('diary_entries')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();
    if (fbError) throw fbError;
    return fallback as DiaryEntry;
  }

  if (error) throw error;
  return data as DiaryEntry;
}

export async function updateDiaryNarration(
  entryId: string,
  narration: string,
  moodScore?: number | null,
  tags?: string[] | null,
): Promise<void> {
  const { error } = await supabase.rpc('fn_update_diary_narration', {
    p_entry_id: entryId,
    p_narration: narration,
    p_mood_score: moodScore ?? null,
    p_tags: tags ?? null,
  });

  // Fallback to direct update — only columns that exist in the table
  if (error) {
    const updates: Record<string, unknown> = { narration };
    if (tags) updates.tags = tags;
    const { error: fbError } = await supabase
      .from('diary_entries')
      .update(updates)
      .eq('id', entryId);
    if (fbError) throw fbError;
  }
}

export async function deleteDiaryEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('diary_entries')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ══════════════════════════════════════
// VACCINES
// ══════════════════════════════════════

export async function fetchVaccines(petId: string): Promise<Vaccine[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('vaccines')
      .select('*')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('next_due_date', { ascending: true }),
    DEFAULT_TIMEOUT_MS,
    `fetchVaccines:${petId.slice(-8)}`,
  );

  if (error) throw error;
  return safeArray(data, VaccineSchema, `fetchVaccines:${petId.slice(-8)}`);
}

export async function createVaccine(
  vaccine: Omit<Vaccine, 'id' | 'created_at' | 'is_active'>,
): Promise<Vaccine> {
  const { data, error } = await supabase
    .from('vaccines')
    .insert(vaccine)
    .select()
    .single();

  if (error) {
    console.error('[api.createVaccine] ERROR:', error.message, error.code);
    throw error;
  }
  return data as Vaccine;
}

// ══════════════════════════════════════
// EXAMS
// ══════════════════════════════════════

export async function fetchExams(petId: string) {
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExam(exam: Record<string, unknown>) {
  const { data, error } = await supabase.from('exams').insert(exam).select().single();
  if (error) throw error;
  return data;
}

// ══════════════════════════════════════
// MEDICATIONS
// ══════════════════════════════════════

export async function fetchMedications(petId: string) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createMedication(medication: Record<string, unknown>) {
  const { data, error } = await supabase.from('medications').insert(medication).select().single();
  if (error) throw error;
  return data;
}

// ══════════════════════════════════════
// CONSULTATIONS
// ══════════════════════════════════════

export async function fetchConsultations(petId: string, limit = 16) {
  const { data, error } = await supabase
    .from('consultations')
    .select('*, registered_by_user:users!user_id(full_name)')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function createConsultation(consultation: Record<string, unknown>) {
  const { data, error } = await supabase.from('consultations').insert(consultation).select().single();
  if (error) throw error;
  return data;
}

// ══════════════════════════════════════
// SURGERIES
// ══════════════════════════════════════

export async function fetchSurgeries(petId: string) {
  const { data, error } = await supabase
    .from('surgeries')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSurgery(surgery: Record<string, unknown>) {
  const { data, error } = await supabase.from('surgeries').insert(surgery).select().single();
  if (error) throw error;
  return data;
}

// ══════════════════════════════════════
// ALLERGIES
// ══════════════════════════════════════

export async function fetchAllergies(petId: string): Promise<Allergy[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('allergies')
      .select('*')
      .eq('pet_id', petId)
      .eq('is_active', true),
    DEFAULT_TIMEOUT_MS,
    `fetchAllergies:${petId.slice(-8)}`,
  );

  if (error) throw error;
  return safeArray(data, AllergySchema, `fetchAllergies:${petId.slice(-8)}`);
}

export async function createAllergy(
  allergy: Omit<Allergy, 'id' | 'created_at' | 'is_active'>,
): Promise<Allergy> {
  const { data, error } = await supabase
    .from('allergies')
    .insert(allergy)
    .select()
    .single();

  if (error) throw error;
  return data as Allergy;
}

// ══════════════════════════════════════
// MOOD LOGS
// ══════════════════════════════════════

export async function fetchMoodLogs(petId: string, limit = 30): Promise<MoodLog[]> {
  const { data, error } = await supabase
    .from('mood_logs')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as MoodLog[]) ?? [];
}

export async function createMoodLog(
  log: Omit<MoodLog, 'id' | 'created_at' | 'is_active'>,
): Promise<MoodLog> {
  const { data, error } = await supabase
    .from('mood_logs')
    .insert(log)
    .select()
    .single();

  if (error) throw error;
  return data as MoodLog;
}

// ══════════════════════════════════════
// SCHEDULED EVENTS (mutations)
// ══════════════════════════════════════

export async function createScheduledEvent(payload: Record<string, unknown>): Promise<ScheduledEvent> {
  const { data, error } = await supabase
    .from('scheduled_events')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledEvent;
}

export async function updateScheduledEvent(
  id: string,
  updates: Record<string, unknown>,
): Promise<ScheduledEvent> {
  const { data, error } = await supabase
    .from('scheduled_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ScheduledEvent;
}

// ══════════════════════════════════════
// NUTRITION
// ══════════════════════════════════════

/**
 * Upsert nutrition_profiles for a pet.
 * Checks for existing active row; UPDATEs or INSERTs accordingly.
 * (There is no unique constraint on pet_id + is_active, so we can't use real upsert.)
 */
export async function upsertNutritionProfile(params: {
  pet_id: string;
  user_id: string;
  modalidade: string;
  natural_pct?: number;
}): Promise<void> {
  const { pet_id, user_id, modalidade, natural_pct = 0 } = params;

  const { data: existing, error: selectErr } = await supabase
    .from('nutrition_profiles')
    .select('id')
    .eq('pet_id', pet_id)
    .eq('is_active', true)
    .maybeSingle();
  if (selectErr) throw selectErr;

  if (existing) {
    const { error } = await supabase
      .from('nutrition_profiles')
      .update({ modalidade, natural_pct })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('nutrition_profiles')
      .insert({ pet_id, user_id, modalidade, natural_pct });
    if (error) throw error;
  }
}

export async function createNutritionRecord(record: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from('nutrition_records').insert(record);
  if (error) throw error;
}

/** Soft delete — is_active = false (CLAUDE.md rule #4). */
export async function deleteNutritionRecord(id: string, petId: string): Promise<void> {
  const { error } = await supabase
    .from('nutrition_records')
    .update({ is_active: false })
    .eq('id', id)
    .eq('pet_id', petId);
  if (error) throw error;
}

// ══════════════════════════════════════
// CONSENT
// ══════════════════════════════════════

export async function upsertUserConsent(params: {
  user_id: string;
  consent_type: string;
  granted: boolean;
  document_version?: string;
}): Promise<void> {
  const { user_id, consent_type, granted, document_version = '1.0' } = params;
  const now = new Date().toISOString();
  const { error } = await supabase.from('user_consents').upsert(
    {
      user_id,
      consent_type,
      granted,
      granted_at: granted ? now : null,
      revoked_at: granted ? null : now,
      document_version,
    },
    { onConflict: 'user_id,consent_type' },
  );
  if (error) throw error;
}

// ══════════════════════════════════════
// DELETED RECORDS (restore)
// ══════════════════════════════════════

export async function restoreDiaryEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('diary_entries')
    .update({ is_active: true })
    .eq('id', id);
  if (error) throw error;
}

// ══════════════════════════════════════
// INSIGHTS
// ══════════════════════════════════════

export async function markInsightRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('pet_insights')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function dismissInsight(id: string): Promise<void> {
  const { error } = await supabase
    .from('pet_insights')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}
