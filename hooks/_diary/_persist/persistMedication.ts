/**
 * persistMedication — inserts a `medications` row and, when an end date is
 * present, schedules a `medication_series` reminder so the tutor knows the
 * course is ending.
 *
 * Extracted verbatim from the `case 'medication'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Returns `{ linkedField: { linked_medication_id } }` when the insert succeeds.
 *
 * Behavior preserved exactly:
 *   - Name: `medication_name` → i18n default.
 *   - Dosage passes through, null when absent.
 *   - Frequency: explicit `frequency` → i18n fallback (`ai.expense.medicationFrequency`).
 *     Using a fallback string (not null) so the column is never empty — the UI
 *     would render a blank row otherwise.
 *   - `start_date` defaults to `ctx.today`.
 *   - `prescribed_by` priority: `veterinarian` → `vet_name` → null.
 *   - End-date reminder: created only when `end_date` is present. Event title
 *     is the i18n `ai.event.medicationEnd` label, all-day, no vet/clinic.
 *   - `source: 'ai'` hardcoded.
 *   - createFutureEvent error swallowed as in the original.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistMedication: Persister = async (extracted, ctx) => {
  const { data } = await supabase.from('medications').insert({
    pet_id:       ctx.petId,
    user_id:      ctx.userId,
    name:         (extracted.medication_name as string) ?? i18n.t('ai.default.medication'),
    dosage:       (extracted.dosage as string) ?? null,
    frequency:    (extracted.frequency as string) ?? i18n.t('ai.expense.medicationFrequency'),
    start_date:   (extracted.date as string) ?? ctx.today,
    end_date:     (extracted.end_date as string) ?? null,
    prescribed_by:(extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null,
    source:       'ai',
  }).select('id').single();
  if (!data?.id) return;

  const endDate = extracted.end_date as string | undefined;
  if (endDate) {
    createFutureEvent(
      ctx.petId, ctx.userId, ctx.diaryEntryId, 'medication_series',
      i18n.t('ai.event.medicationEnd'),
      endDate, true, null, null,
    ).catch(() => {});
  }

  return { linkedField: { linked_medication_id: data.id } };
};
