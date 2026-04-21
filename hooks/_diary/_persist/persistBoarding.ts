/**
 * persistBoarding — records a pet-hotel / boarding stay.
 *
 * Extracted verbatim from the `case 'boarding'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Dual-write pattern:
 *   1. Creates a scheduled_event pinned to check-in day at noon (all-day).
 *   2. If a total price can be computed, inserts an `expenses` row under
 *     the 'hospedagem' category.
 *
 * Behavior preserved exactly:
 *   - Total-price inference order:
 *       explicit total_price → (price_per_night * nights) → null.
 *     Nights are computed from check-in/check-out dates (min 1, rounded).
 *   - Check-out defaults to null when omitted — in that case `nights = 1`.
 *   - Expense date is the check-in date (NOT today or checkout).
 *   - Scheduled-event title: "<boardingBase> · <establishment>" when
 *     establishment is known, else just "<boardingBase>".
 *   - Scheduled-event time: check-in at 12:00 with `allDay = true`.
 *   - Currency hardcoded to 'BRL'.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistBoarding: Persister = async (extracted, ctx) => {
  const checkIn = (extracted.check_in_date as string) ?? ctx.today;
  const checkOut = (extracted.check_out_date as string) ?? null;
  const boardingBase = i18n.t('ai.event.boarding');
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'boarding',
    extracted.establishment ? `${boardingBase} · ${extracted.establishment}` : boardingBase,
    `${checkIn}T12:00:00`, true,
    (extracted.professional as string) ?? null,
    (extracted.establishment as string) ?? null,
  ).catch(() => {});
  const perNight = extracted.price_per_night != null ? Number(extracted.price_per_night) : null;
  const nights = (checkOut && checkIn)
    ? Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 1;
  const boardingTotal = extracted.total_price != null
    ? Number(extracted.total_price)
    : perNight ? perNight * nights : null;
  if (boardingTotal) {
    await supabase.from('expenses').insert({
      pet_id:        ctx.petId,
      user_id:       ctx.userId,
      diary_entry_id:ctx.diaryEntryId,
      date:          checkIn,
      vendor:        (extracted.establishment as string) ?? null,
      category:      'hospedagem',
      total:         boardingTotal,
      currency:      'BRL',
      description:   i18n.t('ai.expense.boarding'),
      source:        'ai',
    });
  }
};
