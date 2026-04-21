/**
 * persistGrooming — records a grooming appointment.
 *
 * Extracted verbatim from the `case 'grooming'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Dual-write pattern:
 *   1. Always creates a scheduled_event (future_date guard inside createFutureEvent
 *      still applies — past grooming entries silently skip the event).
 *   2. If a `price` is present, also inserts an `expenses` row under the
 *     'cuidados' category.
 *
 * Behavior preserved exactly:
 *   - Event title: "<groomBase> · <establishment>" when establishment is set,
 *     else just "<groomBase>" (from i18n key ai.event.grooming).
 *   - Time handling: `${groomDate}T${groomTime}:00` when time is provided,
 *     else `${groomDate}T09:00:00` with `allDay = true`.
 *   - Expense description: explicit `service_type` (e.g. "banho e tosa") or
 *     default i18n key ai.expense.grooming.
 *   - Currency hardcoded to 'BRL' — matches the rest of saveToModule
 *     (pre-existing limitation; currency i18n is TODO elsewhere).
 *   - Any scheduled-event failure is swallowed (`.catch(() => {})`).
 *   - No linkedField return (grooming is not linked back to diary_entries).
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistGrooming: Persister = async (extracted, ctx) => {
  const groomDate = (extracted.date as string) ?? ctx.today;
  const groomTime = (extracted.time as string) ?? null;
  const groomBase = i18n.t('ai.event.grooming');
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'grooming',
    extracted.establishment ? `${groomBase} · ${extracted.establishment}` : groomBase,
    groomTime ? `${groomDate}T${groomTime}:00` : `${groomDate}T09:00:00`, !groomTime,
    (extracted.professional as string) ?? null,
    (extracted.establishment as string) ?? null,
  ).catch(() => {});
  const groomPrice = extracted.price != null ? Number(extracted.price) : null;
  if (groomPrice) {
    await supabase.from('expenses').insert({
      pet_id:        ctx.petId,
      user_id:       ctx.userId,
      diary_entry_id:ctx.diaryEntryId,
      date:          groomDate,
      vendor:        (extracted.establishment as string) ?? null,
      category:      'cuidados',
      total:         groomPrice,
      currency:      'BRL',
      description:   (extracted.service_type as string) ?? i18n.t('ai.expense.grooming'),
      source:        'ai',
    });
  }
};
