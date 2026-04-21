/**
 * persistVaccine — inserts a `vaccines` row, schedules the vaccination itself
 * into the agenda when the date is in the future, and, when a `next_due` date
 * is present, also schedules the future revaccination reminder.
 *
 * Extracted originally from the `case 'vaccine'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Returns `{ linkedField: { linked_vaccine_id } }` when the insert succeeds so
 * the dispatcher can write it back onto the diary_entries row.
 *
 * Behavior preserved from the original dispatcher:
 *   - Name priority: `vaccine_name` → `vaccine_type` → i18n default.
 *   - Batch priority: `batch_number` → `batch` (some classifier versions use
 *     the shorter key). Laboratory, veterinarian (alias `vet_name`), clinic
 *     all pass through as-is with null fallback.
 *   - `date_administered` defaults to `ctx.today` — if the tutor didn't
 *     mention a date, the vaccine is recorded as given today.
 *   - `status` is always 'up_to_date' on insert.
 *   - `source` is always 'ai'.
 *   - Revaccination reminder: when `next_due` is set, a scheduled_event is
 *     created (all-day) at that date. Title is "<ai.event.revaccination>
 *     <vaccine_name>" trimmed.
 *   - Console.log preserved (debug-log-discipline: still informative for
 *     classifier regressions).
 *   - createFutureEvent error is swallowed — a failed reminder never blocks
 *     the vaccine insert.
 *
 * Added by the "compromisso não aparece na agenda" fix (April 2026):
 *   - When `date` is in the future (a booked vaccination), the same row is
 *     also pushed into `scheduled_events` via `scheduleIfFuture`. Past dates
 *     no-op inside the helper, so vaccines-of-record (already given) stay
 *     behaving exactly as before.
 *   - Default time is 09:00 when the tutor omitted the hour.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import { scheduleIfFuture } from './scheduleIfFuture';
import type { Persister } from './types';

export const persistVaccine: Persister = async (extracted, ctx) => {
  const vaccineName = (extracted.vaccine_name as string) ?? (extracted.vaccine_type as string) ?? i18n.t('ai.default.vaccine');
  const vetName = (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null;
  const clinicName = (extracted.clinic as string) ?? null;

  const { data, error: vaccErr } = await supabase.from('vaccines').insert({
    pet_id:           ctx.petId,
    user_id:          ctx.userId,
    name:             vaccineName,
    laboratory:       (extracted.laboratory as string) ?? null,
    batch_number:     (extracted.batch_number as string) ?? (extracted.batch as string) ?? null,
    date_administered:(extracted.date as string) ?? ctx.today,
    next_due_date:    (extracted.next_due as string) ?? null,
    veterinarian:     vetName,
    clinic:           clinicName,
    status:           'up_to_date',
    source:           'ai',
  }).select('id').single();
  console.log('[MOD] vacina salva:', data?.id?.slice(-8), '| erro:', vaccErr?.message);
  if (!data?.id) return;

  // Agenda row for the booked vaccination itself (new — closes the gap where
  // future vaccinations appeared only in the diary lens, never in the agenda).
  // `scheduleIfFuture` no-ops for past dates, so already-given vaccines don't
  // get a bogus reminder.
  await scheduleIfFuture(extracted, ctx, {
    eventType:    'vaccine',
    title:        `${i18n.t('ai.default.vaccine')} · ${vaccineName}`,
    professional: vetName,
    location:     clinicName,
    defaultTime:  '09:00',
  });

  // Revaccination reminder at `next_due` (pre-existing behavior, unchanged).
  const nextDue = extracted.next_due as string | undefined;
  if (nextDue) {
    const vaccineNameSuffix = extracted.vaccine_name ? ` ${extracted.vaccine_name}` : '';
    createFutureEvent(
      ctx.petId, ctx.userId, ctx.diaryEntryId, 'vaccine',
      `${i18n.t('ai.event.revaccination')}${vaccineNameSuffix}`.trim(),
      nextDue, true,
      vetName,
      clinicName,
    ).catch(() => {});
  }

  return { linkedField: { linked_vaccine_id: data.id } };
};
