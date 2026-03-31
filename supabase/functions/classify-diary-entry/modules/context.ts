/**
 * Pet context module — fetches pet profile + recent diary memories for RAG.
 * Provides the context needed by the classifier prompt.
 */

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Pet profile data needed for the classifier prompt. */
export interface PetContext {
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  age_desc: string;
  weight_kg: number | null;
  recent_memories: string;
}

interface PetRow {
  name: string;
  species: string;
  sex: string | null;
  breed: string | null;
  estimated_age_months: number | null;
  weight_kg: number | null;
}

interface DiaryRow {
  content: string;
  primary_type: string;
  mood_id: string;
}

/** Creates a service-role Supabase client (bypasses RLS). */
export function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Fetch the pet profile and last 5 diary entries for RAG context.
 * Returns null if pet not found.
 */
export async function fetchPetContext(
  petId: string,
  supabase?: SupabaseClient,
): Promise<PetContext | null> {
  const client = supabase ?? createServiceClient();

  // Fetch pet profile
  const { data: pet, error: petError } = await client
    .from('pets')
    .select('name, species, sex, breed, estimated_age_months, weight_kg')
    .eq('id', petId)
    .single<PetRow>();

  if (petError || !pet) {
    console.error('[context] Pet not found:', petError?.message);
    return null;
  }

  // Fetch recent diary entries for memory context
  const { data: recentEntries } = await client
    .from('diary_entries')
    .select('content, primary_type, mood_id')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentMemories = (recentEntries ?? [])
    .map((e: DiaryRow) => `[${e.primary_type}] ${e.content?.slice(0, 80)}`)
    .join(' | ') || 'none';

  const ageDesc = formatAge(pet.estimated_age_months);

  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    age_desc: ageDesc,
    weight_kg: pet.weight_kg,
    recent_memories: recentMemories,
  };
}

/** Format age in months to a human-readable description. */
function formatAge(months: number | null): string {
  if (!months) return 'unknown age';
  if (months >= 12) return `${Math.floor(months / 12)} year(s) old`;
  return `${months} month(s) old`;
}
