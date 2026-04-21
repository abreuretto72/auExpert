/**
 * persistPetSitter — records a pet-sitting arrangement (someone looking after
 * the pet at home or at their place).
 *
 * Extracted verbatim from the `case 'pet_sitter'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Dual-write pattern:
 *   1. Creates a scheduled_event pinned to the sitter day at 09:00 (all-day).
 *   2. If a price is present, inserts an `expenses` row under the
 *     'cuidados' category.
 *
 * Behavior preserved exactly:
 *   - Event title: "<sitterBase> · <caretaker_name>" when known,
 *     else just "<sitterBase>".
 *   - Event time: `${sitterDate}T09:00:00` with `allDay = true`.
 *   - Location is always null for pet-sitter (sitter comes to the tutor, or
 *     takes the pet to their own unnamed place).
 *   - Expense description: fixed i18n key ai.expense.petSitter.
 *   - Currency hardcoded to 'BRL'.
 *   - No linkedField return.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistPetSitter: Persister = async (extracted, ctx) => {
  const sitterDate = (extracted.date as string) ?? ctx.today;
  const sitterBase = i18n.t('ai.event.petSitter');
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'pet_sitter',
    extracted.caretaker_name ? `${sitterBase} · ${extracted.caretaker_name}` : sitterBase,
    `${sitterDate}T09:00:00`, true,
    (extracted.caretaker_name as string) ?? null,
    null,
  ).catch(() => {});
  const sitterPrice = extracted.price != null ? Number(extracted.price) : null;
  if (sitterPrice) {
    await supabase.from('expenses').insert({
      pet_id:        ctx.petId,
      user_id:       ctx.userId,
      diary_entry_id:ctx.diaryEntryId,
      date:          sitterDate,
      vendor:        (extracted.caretaker_name as string) ?? null,
      category:      'cuidados',
      total:         sitterPrice,
      currency:      'BRL',
      description:   i18n.t('ai.expense.petSitter'),
      source:        'ai',
    });
  }
};
