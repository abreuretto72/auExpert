/**
 * persistDogWalker — records a dog-walking session.
 *
 * Extracted verbatim from the `case 'dog_walker'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Dual-write pattern:
 *   1. Creates a scheduled_event for the walk.
 *   2. If a price is present, inserts an `expenses` row under the
 *     'cuidados' category.
 *
 * Behavior preserved exactly:
 *   - Time handling: `${walkDate}T${start_time}:00` when start_time is
 *     provided, else `${walkDate}T08:00:00` with `allDay = true`.
 *   - Event title: "<walkerBase> · <walker_name>" when known,
 *     else just "<walkerBase>".
 *   - Location is always null (walks start from the tutor's address which is
 *     already on the pet record).
 *   - Expense description: fixed i18n key ai.expense.dogWalker.
 *   - Currency hardcoded to 'BRL'.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistDogWalker: Persister = async (extracted, ctx) => {
  const walkDate = (extracted.date as string) ?? ctx.today;
  const walkTime = (extracted.start_time as string) ?? null;
  const walkerBase = i18n.t('ai.event.dogWalker');
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'dog_walker',
    extracted.walker_name ? `${walkerBase} · ${extracted.walker_name}` : walkerBase,
    walkTime ? `${walkDate}T${walkTime}:00` : `${walkDate}T08:00:00`, !walkTime,
    (extracted.walker_name as string) ?? null,
    null,
  ).catch(() => {});
  const walkerPrice = extracted.price != null ? Number(extracted.price) : null;
  if (walkerPrice) {
    await supabase.from('expenses').insert({
      pet_id:        ctx.petId,
      user_id:       ctx.userId,
      diary_entry_id:ctx.diaryEntryId,
      date:          walkDate,
      vendor:        (extracted.walker_name as string) ?? null,
      category:      'cuidados',
      total:         walkerPrice,
      currency:      'BRL',
      description:   i18n.t('ai.expense.dogWalker'),
      source:        'ai',
    });
  }
};
