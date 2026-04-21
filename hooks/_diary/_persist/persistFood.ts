/**
 * persistFood — inserts a `nutrition_records` row when the classifier detects
 * food / kibble / treat information (from OCR of a package or from free-text).
 *
 * Extracted verbatim from the `case 'food'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Behavior preserved exactly:
 *   - `record_type` defaults to 'food' (other valid values come from the
 *     classifier: 'kibble', 'treat', 'supplement', etc.).
 *   - `product_name` falls back to `brand_name` when absent (OCR often returns
 *     only brand_name for plain kibble packaging).
 *   - `brand` falls back to `brand_name` too (same reason).
 *   - `daily_portions` defaults to 1 when unspecified — matches the original
 *     `?? 1` which applies BEFORE the Number() coercion would turn null into 0.
 *   - `is_current` defaults to false — the tutor has to explicitly mark a food
 *     as currently-in-use.
 *   - `notes` merges three possible sources in priority order: `notes`,
 *     `transition_guide`, `ocr_confidence_note`.
 *   - Full `extracted` payload is persisted as `extracted_data` for audit.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

export const persistFood: Persister = async (extracted, ctx) => {
  await supabase.from('nutrition_records').insert({
    pet_id:        ctx.petId,
    user_id:       ctx.userId,
    diary_entry_id:ctx.diaryEntryId,
    record_type:   (extracted.record_type as string) ?? 'food',
    product_name:  (extracted.product_name as string) ?? (extracted.brand_name as string) ?? null,
    brand:         (extracted.brand as string) ?? (extracted.brand_name as string) ?? null,
    category:      (extracted.category as string) ?? null,
    portion_grams: extracted.portion_grams != null ? Number(extracted.portion_grams) : null,
    daily_portions:extracted.daily_portions != null ? Number(extracted.daily_portions) : 1,
    calories_kcal: extracted.calories_kcal != null ? Number(extracted.calories_kcal) : null,
    is_current:    (extracted.is_current as boolean) ?? false,
    notes:         (extracted.notes as string) ?? (extracted.transition_guide as string) ?? (extracted.ocr_confidence_note as string) ?? null,
    started_at:    (extracted.started_at as string) ?? ctx.today,
    source:        'ai',
    extracted_data:extracted,
  });
};
