/**
 * createFutureEvent — inserts a row into `scheduled_events` when a
 * classification references a future date/time, and schedules the agenda
 * push notifications for that row.
 *
 * Extracted originally from `hooks/_diary/saveToModule.ts` so every persister
 * under `_persist/` can share the same helper without pulling in the whole
 * module.
 *
 * Behavior:
 *   - Skips (with breadcrumb log) if `scheduledFor` is unparseable OR in the past
 *   - Uses `is_active: true` + `status: 'scheduled'` + `source: 'ai'`
 *   - Notification body receives an empty `petName` (petName is not available
 *     at this layer; the underlying scheduleAgendaReminders handles that)
 *
 * April 2026 — silent-failure fix:
 *   The previous version used `if (!error && data)` to branch on the insert
 *   result and never logged the error path. When RLS or a constraint rejected
 *   the insert, callers saw nothing — the tutor would record "marquei retorno
 *   para o dia 6 de maio" and the agenda would stay empty with no trace in the
 *   Edge Function logs. Now we log BOTH the happy path (✓ agendado …) and any
 *   insert error, so the same symptom in the future produces a diagnosable log.
 *   Notification failures are still non-blocking but no longer swallowed
 *   into a bare `.catch(() => {})`.
 */
import { supabase } from '../../../lib/supabase';
import { scheduleAgendaReminders } from '../../../lib/notifications';

export async function createFutureEvent(
  petId: string,
  userId: string,
  diaryEntryId: string,
  eventType: string,
  title: string,
  scheduledFor: string,
  allDay: boolean,
  professional: string | null,
  location: string | null,
): Promise<void> {
  const date = new Date(scheduledFor);
  if (isNaN(date.getTime())) {
    console.warn('[createFutureEvent] ❌ scheduledFor inválido:', scheduledFor);
    return;
  }
  if (date.getTime() <= Date.now()) {
    // Past-date no-op is normal (e.g. dual-write where the consultation already
    // happened). Log a breadcrumb so "why didn't the reminder fire" debugging
    // isn't blind about WHICH path we took.
    console.log('[createFutureEvent] ⏭ passado — ignorando:', eventType, scheduledFor);
    return;
  }

  const { data, error } = await supabase.from('scheduled_events').insert({
    pet_id:        petId,
    user_id:       userId,
    diary_entry_id: diaryEntryId,
    event_type:    eventType,
    title,
    professional,
    location,
    scheduled_for: date.toISOString(),
    all_day:       allDay,
    status:        'scheduled',
    source:        'ai',
    is_active:     true,
  }).select('id, title, scheduled_for, all_day').single();

  if (error) {
    console.warn(
      '[createFutureEvent] ❌ insert falhou:', eventType,
      '| scheduled_for=', scheduledFor,
      '| erro=', error.message,
    );
    return;
  }

  if (!data) {
    console.warn('[createFutureEvent] ❌ insert sem data retornado:', eventType, scheduledFor);
    return;
  }

  console.log(
    '[createFutureEvent] ✓ agendado:', eventType,
    '| id=', data.id?.slice(-8),
    '| scheduled_for=', data.scheduled_for,
    '| all_day=', data.all_day,
  );

  const sub = [professional, location].filter(Boolean).join(' · ');
  scheduleAgendaReminders(
    { id: data.id, title: data.title, scheduled_for: data.scheduled_for, all_day: data.all_day, sub },
    '',  // petName not available here — notification body will still work
  ).catch((err) => {
    console.warn('[createFutureEvent] scheduleAgendaReminders falhou:', err?.message ?? err);
  });
}
