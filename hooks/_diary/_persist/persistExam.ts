/**
 * persistExam — creates an `exams` row, a scheduled_event for future exams,
 * and bulk-inserts any structured `clinical_metrics` rows embedded in the
 * exam's results array (e.g. labs, panels).
 *
 * Extracted originally from the `case 'exam'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Behavior preserved from the original dispatcher:
 *   - Exam insert uses `extracted.date` → `ctx.today` fallback for the `date`
 *     column. `results` falls back to empty array.
 *   - Lab and vet names support two field names each (`laboratory` |
 *     `lab_name`, `veterinarian` | `vet_name`).
 *   - Future exams are also scheduled into the agenda.
 *   - Clinical metrics extraction from `results[]`:
 *       - Filters out items with `value == null` (keeps 0 but drops missing).
 *       - `metric_type` is `item.toLowerCase().replace(/\s+/g, '_')` or
 *         'unknown' as fallback.
 *       - `unit` defaults to '' (empty string), `status` to 'normal'.
 *       - Bulk-inserted as a single `.insert(metricsRows)` call.
 *       - NOTE: unlike persistClinicalMetric, this path does NOT call
 *         `checkMetricAlert` per row — matching original behavior. Exam-derived
 *         metrics rely on the exam card itself for surface area.
 *   - Returns `linked_exam_id` only when the exam insert yielded an id.
 *
 * Updated by the "compromisso não aparece na agenda" fix (April 2026):
 *   - Replaced the inline `new Date(examDate).getTime() > Date.now()` check
 *     with `scheduleIfFuture`, which also picks up an optional `extracted.time`
 *     field (the classifier now extracts hour/minute when the tutor dictates
 *     them). No time → all-day at 08:00, same behavior as before but without
 *     the ambiguity of passing a YYYY-MM-DD string straight to `new Date()`.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { scheduleIfFuture } from './scheduleIfFuture';
import type { Persister } from './types';

export const persistExam: Persister = async (extracted, ctx) => {
  const examName = (extracted.exam_name as string) ?? i18n.t('ai.default.exam');
  const vetName = (extracted.veterinarian as string) ?? (extracted.vet_name as string) ?? null;
  const labName = (extracted.laboratory as string) ?? (extracted.lab_name as string) ?? null;

  const { data } = await supabase.from('exams').insert({
    pet_id:       ctx.petId,
    user_id:      ctx.userId,
    name:         examName,
    date:         (extracted.date as string) ?? ctx.today,
    laboratory:   labName,
    veterinarian: vetName,
    results:      (extracted.results as unknown[]) ?? [],
    source:       'ai',
  }).select('id').single();

  let linkedField: { linked_exam_id?: string } | undefined;
  if (data?.id) {
    linkedField = { linked_exam_id: data.id };
    // Agenda row for future exams — helper silently no-ops on past/missing dates.
    await scheduleIfFuture(extracted, ctx, {
      eventType:    'exam',
      title:        `${i18n.t('ai.event.exam')} · ${examName}`,
      professional: vetName,
      location:     labName,
      defaultTime:  '08:00',
    });
  }

  // Extract clinical metrics from exam results and bulk-insert
  const results = (extracted.results as Array<{ item: string; value: number; unit: string; status: string }>) ?? [];
  if (results.length > 0) {
    const metricsRows = results
      .filter((r) => r.value != null)
      .map((r) => ({
        pet_id:         ctx.petId,
        user_id:        ctx.userId,
        diary_entry_id: ctx.diaryEntryId,
        metric_type:    r.item?.toLowerCase().replace(/\s+/g, '_') ?? 'unknown',
        value:          r.value,
        unit:           r.unit ?? '',
        status:         r.status ?? 'normal',
        source:         'ai' as const,
        measured_at:    new Date().toISOString(),
      }));
    await supabase.from('clinical_metrics').insert(metricsRows);
  }

  return linkedField ? { linkedField } : undefined;
};
