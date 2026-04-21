/**
 * persistSurgery — creates a scheduled_event for an upcoming surgery.
 *
 * Extracted verbatim from the `case 'surgery'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * There is NO dedicated `surgeries` table — surgeries live only as
 * scheduled_events until performed. Post-op data is captured via consultations
 * or exams. So this persister intentionally has no linkedField return.
 *
 * Behavior preserved exactly:
 *   - Event date: `extracted.date` → `ctx.today`.
 *   - Event type: 'surgery'.
 *   - Title: `procedure` → i18n `ai.event.surgery`.
 *   - Time: `${date}T08:00:00`, NOT all-day (surgery appointments typically
 *     have a specific morning slot).
 *   - Vet and clinic pass through with null fallback.
 *   - createFutureEvent error swallowed.
 *   - No linkedField.
 */
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistSurgery: Persister = async (extracted, ctx) => {
  const surgDate = (extracted.date as string) ?? ctx.today;
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'surgery',
    (extracted.procedure as string) ?? i18n.t('ai.event.surgery'),
    `${surgDate}T08:00:00`, false,
    (extracted.veterinarian as string) ?? null,
    (extracted.clinic as string) ?? null,
  ).catch(() => {});
};
