/**
 * persistConnection — inserts a `pet_connections` row when the classifier
 * identifies a new friend/pet that the pet interacted with.
 *
 * Extracted verbatim from the `case 'connection'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Behavior preserved exactly:
 *   - Skip silently when `friend_name` is missing (no insert attempted).
 *   - `first_met_at` and `last_seen_at` both default to `ctx.today` so a new
 *     connection without an explicit date looks like it was met today.
 *   - `friend_species` defaults to 'unknown' (NOT 'dog' / 'cat') so the
 *     downstream grafo-social logic can bucket mystery connections separately.
 *   - `connection_type` defaults to 'friend'.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

export const persistConnection: Persister = async (extracted, ctx) => {
  const friendName = (extracted.friend_name as string) ?? null;
  if (!friendName) return;

  await supabase.from('pet_connections').insert({
    pet_id:         ctx.petId,
    user_id:        ctx.userId,
    diary_entry_id: ctx.diaryEntryId,
    friend_name:    friendName,
    friend_species: (extracted.friend_species as string) ?? 'unknown',
    friend_breed:   (extracted.friend_breed as string) ?? null,
    friend_owner:   (extracted.friend_owner as string) ?? null,
    connection_type:(extracted.connection_type as string) ?? 'friend',
    first_met_at:   (extracted.date as string) ?? ctx.today,
    last_seen_at:   (extracted.date as string) ?? ctx.today,
    notes:          (extracted.notes as string) ?? null,
  });
};
