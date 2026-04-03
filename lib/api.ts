import { supabase } from './supabase';
import type { Pet, DiaryEntry, Vaccine, Allergy, MoodLog } from '../types/database';

// ══════════════════════════════════════
// PETS
// ══════════════════════════════════════

export async function fetchPets(): Promise<Pet[]> {
  console.log('[api.fetchPets] iniciando query...');
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  console.log('[api.fetchPets] data:', data?.length ?? 0, '| error:', error?.message ?? 'ok');
  if (error) throw error;
  return (data as Pet[]) ?? [];
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

const DIARY_MODULE_SELECT = `
  *,
  expenses(id, total, currency, category, notes, vendor),
  vaccines(id, name, laboratory, veterinarian, clinic, date_administered, next_due_date, batch_number),
  consultations(id, veterinarian, clinic, type, diagnosis, date),
  clinical_metrics(id, metric_type, value, unit, measured_at),
  medications(id, name, dosage, frequency, veterinarian)
`.trim();

export async function fetchDiaryEntries(petId: string, page = 1, perPage = 20): Promise<DiaryEntry[]> {
  // Direct query with module JOINs — richer than the RPC (which doesn't have module data)
  const from = (page - 1) * perPage;
  const to = page * perPage - 1;

  const { data, error } = await supabase
    .from('diary_entries')
    .select(DIARY_MODULE_SELECT)
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    // Fallback to RPC if direct query fails (e.g. missing FK relationships)
    const { data: rpc, error: rpcError } = await supabase
      .rpc('fn_get_diary_timeline', {
        p_pet_id: petId,
        p_page: page,
        p_per_page: perPage,
      });
    if (rpcError) throw rpcError;
    return (rpc as DiaryEntry[]) ?? [];
  }

  return (data as unknown as DiaryEntry[]) ?? [];
}

export interface CreateDiaryParams {
  pet_id: string;
  user_id: string;
  content: string;
  input_method: 'voice' | 'photo' | 'text';
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
  const { data, error } = await supabase.rpc('fn_create_diary_entry', {
    p_pet_id: params.pet_id,
    p_author_id: params.user_id,
    p_content: params.content,
    p_input_method: params.input_method,
    p_mood_id: params.mood_id,
    p_mood_score: params.mood_score ?? null,
    p_mood_source: params.mood_source ?? 'manual',
    p_entry_type: params.entry_type ?? 'manual',
    p_tags: JSON.stringify(params.tags ?? []),
    p_is_special: params.is_special ?? false,
    p_photos: JSON.stringify(params.photos ?? []),
    p_linked_photo_analysis_id: params.linked_photo_analysis_id ?? null,
  });

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
    p_tags: tags ? JSON.stringify(tags) : null,
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
  const { data, error } = await supabase
    .from('vaccines')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('next_due_date', { ascending: true });

  if (error) throw error;
  return (data as Vaccine[]) ?? [];
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

export async function fetchConsultations(petId: string) {
  const { data, error } = await supabase
    .from('consultations')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('date', { ascending: false });
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
  const { data, error } = await supabase
    .from('allergies')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true);

  if (error) throw error;
  return (data as Allergy[]) ?? [];
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
