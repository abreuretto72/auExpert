/**
 * persistTravel — records a trip taken with the pet.
 *
 * Extracted verbatim from the `case 'travel'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Returns `{ linkedField: { linked_travel_id } }` when the insert succeeds.
 *
 * Behavior preserved exactly:
 *   - Skips entirely when `destination` is missing — a trip card with no
 *     destination is not meaningful.
 *   - `country` defaults to 'BR' (classifier for PT-BR tutors doesn't always
 *     emit country; we've decided BR is the safest default rather than null).
 *   - `travel_type` whitelist: ['road_trip', 'flight', 'local', 'international',
 *     'camping', 'other']. Unknown values fall back to 'road_trip'.
 *   - `status` hardcoded to 'completed' — historical trips only flow through
 *     this path; upcoming trips go through scheduled_events and never touch
 *     pet_travels until after the fact.
 *   - All dates/distance/notes/tags pass through with null/empty fallback.
 *   - Full `extracted` payload saved to `extracted_data`.
 *   - `source: 'ai'`.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

const VALID_TRAVEL_TYPES = ['road_trip', 'flight', 'local', 'international', 'camping', 'other'];

export const persistTravel: Persister = async (extracted, ctx) => {
  const destination = (extracted.destination as string) ?? null;
  if (!destination) return;

  const rawTravelType = extracted.travel_type as string;
  const travelType = VALID_TRAVEL_TYPES.includes(rawTravelType) ? rawTravelType : 'road_trip';

  const { data } = await supabase.from('pet_travels').insert({
    pet_id:        ctx.petId,
    user_id:       ctx.userId,
    diary_entry_id:ctx.diaryEntryId,
    destination,
    country:       (extracted.country as string) ?? 'BR',
    region:        (extracted.region as string) ?? null,
    travel_type:   travelType,
    status:        'completed',
    start_date:    (extracted.start_date as string) ?? null,
    end_date:      (extracted.end_date as string) ?? null,
    distance_km:   extracted.distance_km != null ? Number(extracted.distance_km) : null,
    notes:         (extracted.notes as string) ?? null,
    tags:          (extracted.tags as string[]) ?? [],
    extracted_data:extracted,
    source:        'ai',
  }).select('id').single();
  if (!data?.id) return;

  return { linkedField: { linked_travel_id: data.id } };
};
