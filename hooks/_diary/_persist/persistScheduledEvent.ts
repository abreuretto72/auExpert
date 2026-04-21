/**
 * persistScheduledEvent — creates a generic scheduled_event when the tutor
 * mentioned a future date/time that doesn't fit a more specific type.
 *
 * Extracted verbatim from the `case 'scheduled_event'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Triggered by free-text like "levar ao vet na próxima quinta" — the
 * classifier couldn't map it to surgery/vaccine/return_visit/etc., but DID
 * extract a date and rough title, so we keep the reminder anyway under the
 * 'custom' event type.
 *
 * Behavior preserved exactly:
 *   - Event date: `extracted.date` → `ctx.today`.
 *   - Event type: 'custom' (NOT 'scheduled_event' — `scheduled_event` is the
 *     classifier label, 'custom' is the scheduled_events table enum value).
 *   - Title priority: `title` → `description` → i18n `ai.event.custom`.
 *   - Time: `${date}T09:00:00`.
 *   - all_day: `extracted.all_day` → true (default true because tutors rarely
 *     specify times in free-form future references).
 *   - `professional` and `location` pass through with null fallback.
 *   - No linkedField.
 */
import i18n from '../../../i18n';
import { createFutureEvent } from './createFutureEvent';
import type { Persister } from './types';

export const persistScheduledEvent: Persister = async (extracted, ctx) => {
  const schedDate = (extracted.date as string) ?? ctx.today;
  const schedTitle = (extracted.title as string)
    ?? (extracted.description as string)
    ?? i18n.t('ai.event.custom');
  createFutureEvent(
    ctx.petId, ctx.userId, ctx.diaryEntryId, 'custom',
    schedTitle,
    `${schedDate}T09:00:00`, (extracted.all_day as boolean) ?? true,
    (extracted.professional as string) ?? null,
    (extracted.location as string) ?? null,
  ).catch(() => {});
};
