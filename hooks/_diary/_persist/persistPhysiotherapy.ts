/**
 * persistPhysiotherapy — creates a scheduled_event for a physiotherapy session.
 *
 * Extracted verbatim from the `case 'physiotherapy'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Like surgery, physiotherapy has no dedicated table in the MVP — the
 * scheduled_event IS the record. Historical sessions show up in the diary
 * timeline via the diary_entry that spawned them.
 *
 * Behavior preserved exactly:
 *   - Event date: `extracted.date` → `ctx.today`.
 *   - Event type: 'physiotherapy'.
 *   - Title: i18n `ai.event.physiotherapy` (no name/product field in
 *     the classifier schema — generic label is fine).
 *   - Time: `${date}T10:00:00`, NOT all-day.
 *   - `professional` (not `veterinarian`) is the relevant role — physio
 *     practitioners are usually separate professionals.
 *   - `location` is separate from clinic, passes through with null fallback.
 *   - No linkedField.
 */
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistPhysiotherapy: Persister = async (extracted, ctx) => {
  const physioDate = (extracted.date as string) ?? ctx.today;
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'physiotherapy',
    i18n.t('ai.event.physiotherapy'),
    `${physioDate}T10:00:00`, false,
    (extracted.professional as string) ?? null,
    (extracted.location as string) ?? null,
  ).catch(() => {});
};
