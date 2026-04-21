/**
 * persistMemorial — marks a pet as memorialised.
 *
 * Extracted verbatim from the `case 'memorial'` arm of
 * `hooks/_diary/saveToModule.ts`. This persister does not read from
 * `extracted_data` at all — the memorial flag is inferred purely from the
 * classification type.
 *
 * Behavior preserved exactly:
 *   - Sets `pets.is_memorial = true` for the current pet.
 *   - No scheduled_events, no expenses, no linkedField.
 *   - Does NOT filter on `is_active` (matches the original behavior so that
 *     even soft-deleted pets can be memorialised — the original code did the
 *     same with an unguarded .eq('id', petId)).
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

export const persistMemorial: Persister = async (_extracted, ctx) => {
  await supabase.from('pets').update({ is_memorial: true }).eq('id', ctx.petId);
};
