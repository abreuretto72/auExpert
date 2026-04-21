/**
 * persistTraining — records a training session (obedience, behavioural,
 * agility, etc.).
 *
 * Extracted verbatim from the `case 'training'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Dual-write pattern:
 *   1. Creates a scheduled_event pinned to the training day at 10:00 (all-day).
 *   2. If a price is present, inserts an `expenses` row under the
 *     'treinamento' category.
 *
 * Behavior preserved exactly:
 *   - Event title: "<trainingBase> · <trainer_name>" when known,
 *     else just "<trainingBase>".
 *   - Event time: `${trainDate}T10:00:00` with `allDay = true`.
 *   - Location is always null.
 *   - Expense description: explicit `session_type` (e.g. "adestramento") when
 *     provided, else default i18n key ai.expense.training.
 *   - Currency hardcoded to 'BRL'.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistTraining: Persister = async (extracted, ctx) => {
  const trainDate = (extracted.date as string) ?? ctx.today;
  const trainingBase = i18n.t('ai.event.training');
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'training',
    extracted.trainer_name ? `${trainingBase} · ${extracted.trainer_name}` : trainingBase,
    `${trainDate}T10:00:00`, true,
    (extracted.trainer_name as string) ?? null,
    null,
  ).catch(() => {});
  const trainPrice = extracted.price != null ? Number(extracted.price) : null;
  if (trainPrice) {
    await supabase.from('expenses').insert({
      pet_id:        ctx.petId,
      user_id:       ctx.userId,
      diary_entry_id:ctx.diaryEntryId,
      date:          trainDate,
      vendor:        (extracted.trainer_name as string) ?? null,
      category:      'treinamento',
      total:         trainPrice,
      currency:      'BRL',
      description:   (extracted.session_type as string) ?? i18n.t('ai.expense.training'),
      source:        'ai',
    });
  }
};
