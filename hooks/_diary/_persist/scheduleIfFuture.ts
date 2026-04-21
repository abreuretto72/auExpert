/**
 * scheduleIfFuture — higher-level wrapper around `createFutureEvent` that
 * reads `date` + optional `time` from a classifier `extracted_data` payload,
 * builds a well-formed ISO `scheduled_for` string, and only schedules when
 * the moment is in the future.
 *
 * Rationale
 * ─────────
 * The original dispatcher only scheduled a `scheduled_event` for follow-ups
 * (return_date, next_due) or for the "always-schedule" families (grooming,
 * boarding, pet_sitter, dog_walker, training, surgery, physiotherapy, …).
 *
 * For consultations / vaccines / exams the date was written straight into the
 * domain table (consultations.date / vaccines.date_administered / exams.date)
 * as if the event had already happened. When a tutor dictated something like
 *
 *     "Marquei uma consulta com o vet no dia 5 de maio de 2026 às 10h."
 *
 * the row landed in `consultations` (surfaces in the diary lens), but nothing
 * was ever pushed into `scheduled_events` — so the agenda tab stayed empty and
 * no notification ever fired. That is the "compromisso não apareceu na agenda"
 * bug.
 *
 * User intent (verbatim, April 2026): "Todos os compromissos marcados descritos
 * na entrada do diário devem ser agendados na agenda como compromisso e quando
 * chega o dia notificar o tutor do compromisso."
 *
 * This helper is the foundation for that: every date-bearing persister can call
 * it defensively. Past dates become no-ops (via `createFutureEvent`'s internal
 * guard); future dates always end up in the agenda.
 *
 * Time handling
 * ─────────────
 * - Accepts these shapes in `extracted.<timeField>` (default `time`):
 *     "10:00", "10:00:00", "10h", "10hs", "10h30", "10", "09:30", "HH:MM:SS"
 *   and normalises them to `HH:MM` (two-digit each). Invalid strings fall back
 *   to `opts.defaultTime` (or 09:00 when unspecified).
 * - When `extracted.<timeField>` is absent the event is treated as all-day
 *   unless `opts.allDay` is explicitly `false`.
 * - When the date is already an ISO timestamp (`YYYY-MM-DDTHH:MM:SS` or with
 *   timezone) we preserve it verbatim — the classifier occasionally emits full
 *   ISO strings for very precise references.
 *
 * Return value
 * ────────────
 * - `true` — event was in the future and `createFutureEvent` was invoked
 *   (the actual DB insert is fire-and-forget inside that helper).
 * - `false` — the date was missing, unparseable, or already in the past.
 *
 * Callers can use the boolean to branch; for consultation/vaccine/exam we keep
 * inserting into the domain table either way (so the prontuário still records
 * the appointment). Future-only persisters (surgery, scheduled_event, …) don't
 * need the return value but the signature is uniform for consistency.
 */
import { createFutureEvent } from './createFutureEvent';
import type { PersistContext } from './types';

/** Two-digit `HH:MM` output — or `null` when the input can't be normalised. */
function normalizeTime(raw: unknown, fallback: string): string {
  const fallbackClean = /^\d{2}:\d{2}$/.test(fallback) ? fallback : '09:00';
  if (raw == null) return fallbackClean;
  const s = String(raw).trim().toLowerCase();
  if (!s) return fallbackClean;

  // "10:30", "10:30:00", "10:30:00.000Z" — take HH:MM prefix
  let m = s.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // "10h", "10hs", "10h00", "10h30"
  m = s.match(/^(\d{1,2})\s*h(?:s)?\s*(\d{2})?/);
  if (m) {
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = m[2] ? Math.min(59, Math.max(0, parseInt(m[2], 10))) : 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  // Bare hour "10"
  m = s.match(/^(\d{1,2})$/);
  if (m) {
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    return `${String(h).padStart(2, '0')}:00`;
  }

  return fallbackClean;
}

/**
 * Build the ISO `scheduled_for` string from a date (already a YYYY-MM-DD or
 * full ISO timestamp) + optional normalised time.
 *
 * - If `dateRaw` is already a full ISO timestamp (contains 'T'), return it
 *   verbatim — we trust the upstream source.
 * - Otherwise we append `T${time}:00` to produce a local-time ISO string.
 *   Note: `new Date('YYYY-MM-DDTHH:MM:00')` (no timezone suffix) parses in the
 *   device's local timezone, which is exactly what we want — the tutor said
 *   "às 10h" meaning 10h on their wall clock. `createFutureEvent` then calls
 *   `.toISOString()` to convert back to UTC for storage. This round-trip is
 *   timezone-correct.
 */
function buildScheduledFor(dateRaw: string, time: string): string {
  // Already a full ISO timestamp (YYYY-MM-DDTHH:MM:SS[.sss][Z|±HH:MM])
  if (dateRaw.includes('T')) return dateRaw;
  // Plain date → local-time ISO string with seconds zeroed
  return `${dateRaw}T${time}:00`;
}

export type ScheduleIfFutureOpts = {
  /** `scheduled_events.event_type` enum value (e.g. 'consultation'). */
  eventType: string;
  /** User-facing title shown in the agenda and push payload. */
  title: string;
  /** Veterinarian / walker / sitter / trainer name — stored on the row. */
  professional?: string | null;
  /** Clinic / hotel / venue name — stored on the row. */
  location?: string | null;
  /**
   * Extracted-data key holding the date string. Defaults to `'date'`.
   * Some classifier types use different names (e.g. boarding uses
   * `check_in_date`) — pass it here rather than copying the value upstream.
   */
  dateField?: string;
  /**
   * Extracted-data key holding the time string. Defaults to `'time'`.
   * Walker/sitter schemas use `'start_time'`.
   */
  timeField?: string;
  /**
   * Fallback `HH:MM` when no time is present. Defaults to `'09:00'`.
   * Each persister picks a sensible default for its domain (08:00 for walks,
   * 10:00 for training, 12:00 for boarding check-in, …).
   */
  defaultTime?: string;
  /**
   * Force `all_day`. When omitted we infer: `all_day = !extracted.<timeField>`,
   * i.e. a time that the tutor specified wins. Pass `false` to always pin a
   * specific hour even in the absence of tutor-supplied time (rare — used
   * when the domain intrinsically has a known time, e.g. physiotherapy 10am).
   */
  allDay?: boolean;
};

export async function scheduleIfFuture(
  extracted: Record<string, unknown>,
  ctx: PersistContext,
  opts: ScheduleIfFutureOpts,
): Promise<boolean> {
  const dateField = opts.dateField ?? 'date';
  const timeField = opts.timeField ?? 'time';
  const defaultTime = opts.defaultTime ?? '09:00';

  const dateRaw = extracted[dateField];
  if (typeof dateRaw !== 'string' || !dateRaw.trim()) return false;

  const timeRaw = extracted[timeField];
  const hasExplicitTime = typeof timeRaw === 'string' && timeRaw.trim().length > 0;
  const normalizedTime = normalizeTime(timeRaw, defaultTime);
  const scheduledFor = buildScheduledFor(dateRaw.trim(), normalizedTime);

  // Parse to gate on "is this actually in the future?". `createFutureEvent`
  // duplicates this check internally, but we want an early boolean return so
  // callers can branch (e.g. skip domain-table writes when they choose to).
  const ts = new Date(scheduledFor).getTime();
  if (isNaN(ts) || ts <= Date.now()) return false;

  const allDay = opts.allDay ?? !hasExplicitTime;

  await createFutureEvent(
    ctx.petId,
    ctx.userId,
    ctx.diaryEntryId,
    opts.eventType,
    opts.title,
    scheduledFor,
    allDay,
    opts.professional ?? null,
    opts.location ?? null,
  ).catch(() => { /* reminder failures never block the caller */ });

  return true;
}
