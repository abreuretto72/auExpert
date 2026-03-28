import { supabase } from './supabase';
import type { Pet, DiaryEntry, Vaccine, Allergy, MoodLog } from '../types/database';

// ══════════════════════════════════════
// PETS
// ══════════════════════════════════════

export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

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
  console.log('[api.createPet] INSERT payload keys:', Object.keys(pet));
  const { data, error } = await supabase
    .from('pets')
    .insert(pet)
    .select()
    .single();

  if (error) {
    console.error('[api.createPet] ERRO Supabase:', error.message, error.code, error.details, error.hint);
    throw error;
  }
  console.log('[api.createPet] OK, id:', data?.id);
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

export async function fetchDiaryEntries(petId: string): Promise<DiaryEntry[]> {
  const { data, error } = await supabase
    .from('diary_entries')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as DiaryEntry[]) ?? [];
}

export async function createDiaryEntry(
  entry: Omit<DiaryEntry, 'id' | 'created_at' | 'is_active'>,
): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data as DiaryEntry;
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
