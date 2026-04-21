/**
 * persistConsultation — inserts a `consultations` row, schedules the
 * consultation itself into the agenda when the date is in the future, and,
 * when a return date is set, also schedules the follow-up visit.
 *
 * Extracted originally from the `case 'consultation'` and `case 'return_visit'`
 * arms of `hooks/_diary/saveToModule.ts` — BOTH arms share the same body, so
 * one persister handles both. The dispatcher maps both type strings here.
 *
 * Returns `{ linkedField: { linked_consultation_id } }` when the insert succeeds.
 *
 * Behavior preserved from the original dispatcher:
 *   - Veterinarian priority: `veterinarian` → `vet_name` → i18n default
 *     (a placeholder like "veterinário" — the tutor can edit later).
 *   - Clinic priority: `clinic` → `clinic_name`.
 *   - Type is always 'checkup'. The original arm never branches on anything
 *     finer-grained even though the consultations enum has other values
 *     (emergency, specialist, …). A future tier-up diff can reclassify.
 *   - Summary priority: `diagnosis` → `summary` → `classification.narration`
 *     → i18n default. The narration fallback is WHY this persister needs the
 *     full classification in its context.
 *   - `follow_up_at` is set from `return_date` when provided, else null.
 *   - Return-visit reminder: created when `return_date` is present. Title
 *     format: "<ai.event.returnVisit> · <vet>" when vet known, else base label.
 *
 * Added by the "compromisso não aparece na agenda" fix (April 2026):
 *   - Dual-write pattern now applies to consultation too: every consultation
 *     row ALSO gets a scheduled_events row IF its date is in the future (past
 *     consultations are no-ops inside `scheduleIfFuture`). This is what makes
 *     "Marquei consulta dia 5 de maio às 10h" actually show in the agenda.
 *     The consultations row is still written regardless — the prontuário
 *     treats future-planned consultations as "consultation of record" the
 *     same way the tutor treats them mentally.
 *   - Default time is 09:00 when the tutor omitted the hour; the `time` field
 *     comes straight from classifier output (see `_classifier/prompts/system.ts`).
 *
 * Second fix (April 20 2026 — "retorno não apareceu na agenda"):
 *   - The classifier was emitting `next_appointment`/`renewal_date` instead of
 *     the expected `return_date`/`return_time`, so the return-visit block never
 *     fired. Prompt was updated (see system.ts — "RETORNO AO VETERINÁRIO").
 *   - Return-visit scheduling now goes through `scheduleIfFuture` (same helper
 *     used by the consultation itself), reading `return_date` + `return_time`.
 *     The old path passed a bare `YYYY-MM-DD` string to `createFutureEvent`,
 *     which parsed as midnight UTC and could drift into "past" in some timezones.
 *     `scheduleIfFuture` builds a proper local-time ISO string with defaultTime.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { scheduleIfFuture } from './scheduleIfFuture';
import type { Persister } from './types';

export const persistConsultation: Persister = async (extracted, ctx) => {
  const { classification } = ctx;
  const vetName = (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null;
  const clinicName = (extracted.clinic as string) ?? (extracted.clinic_name as string) ?? null;

  const { data, error: consErr } = await supabase.from('consultations').insert({
    pet_id:      ctx.petId,
    user_id:     ctx.userId,
    date:        (extracted.date as string) ?? ctx.today,
    veterinarian: vetName ?? i18n.t('ai.default.veterinarian'),
    clinic:      clinicName,
    type:        'checkup',
    summary:     (extracted.diagnosis as string) ?? (extracted.summary as string) ?? classification.narration ?? i18n.t('ai.expense.consultation'),
    diagnosis:   (extracted.diagnosis as string) ?? null,
    prescriptions:(extracted.prescriptions as string) ?? null,
    follow_up_at:(extracted.return_date as string) ?? null,
    source:      'ai',
  }).select('id').single();
  console.log('[MOD] consulta salva:', data?.id?.slice(-8), '| erro:', consErr?.message);
  if (!data?.id) return;

  // Agenda row for the consultation itself (new — this closes the bug where
  // future consultations appeared in the diary lens but never in the agenda).
  // `scheduleIfFuture` silently no-ops on past dates, so this is safe for
  // consultations-of-record describing visits that already happened.
  const consultationTitle = vetName
    ? `${i18n.t('ai.event.consultation')} · ${vetName}`
    : i18n.t('ai.event.consultation');
  await scheduleIfFuture(extracted, ctx, {
    eventType:    'consultation',
    title:        consultationTitle,
    professional: vetName,
    location:     clinicName,
    defaultTime:  '09:00',
  });

  // Return-visit reminder.
  // Now routed through scheduleIfFuture so it honors `return_time` from the
  // classifier prompt (see system.ts — "RETORNO AO VETERINÁRIO — CRÍTICO").
  // Why this matters: the old path passed `returnDate` (YYYY-MM-DD) directly
  // to createFutureEvent, which built `new Date("2026-05-06")` = midnight UTC,
  // not wall-clock local time. scheduleIfFuture handles the date+time combo
  // correctly and falls back to 09:00 when the tutor omitted the hour.
  const returnDate = extracted.return_date as string | undefined;
  if (returnDate) {
    const returnTitle = vetName
      ? `${i18n.t('ai.event.returnVisit')} · ${vetName}`
      : i18n.t('ai.event.returnVisit');
    await scheduleIfFuture(extracted, ctx, {
      eventType:    'return_visit',
      title:        returnTitle,
      professional: vetName,
      location:     clinicName,
      dateField:    'return_date',
      timeField:    'return_time',
      defaultTime:  '09:00',
    });
  }

  return { linkedField: { linked_consultation_id: data.id } };
};
