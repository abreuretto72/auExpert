/**
 * send-push-notifications — CRON Edge Function
 *
 * Runs multiple times/day. Sends Expo push notifications for pending
 * pet_insights respecting:
 *   - User quiet hours
 *   - Deduplication (no repeat within window)
 *   - Urgency batching (critical/high = immediate, medium/low = preferred hour)
 *   - notification_preferences opt-outs
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EXPO_URL     = 'https://exp.host/--/api/v2/push/send';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SB = ReturnType<typeof createClient>;

interface InsightWithPrefs {
  id:           string;
  pet_id:       string;
  user_id:      string;
  type:         string;
  urgency:      string;
  title:        string;
  body:         string;
  action_route: string | null;
  source:       string;
  created_at:   string;
  // joined from users
  expo_push_token: string | null;
  // joined from notification_preferences
  push_enabled:  boolean;
  quiet_start:   string;   // e.g. "22:00:00"
  quiet_end:     string;   // e.g. "08:00:00"
  preferred_hour: number;
  // type flags
  reminders:    boolean;
  health_alerts: boolean;
  trends:       boolean;
  preventive:   boolean;
  financial:    boolean;
  celebrations: boolean;
}

// ── Quiet hours check ──────────────────────────────────────────────────────

function isQuietTime(quietStart: string, quietEnd: string): boolean {
  const now = new Date();
  const hhmm = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const nowMins   = now.getHours() * 60 + now.getMinutes();
  const startMins = hhmm(quietStart);
  const endMins   = hhmm(quietEnd);

  // Overnight window (e.g. 22:00 – 08:00)
  if (startMins > endMins) return nowMins >= startMins || nowMins < endMins;
  return nowMins >= startMins && nowMins < endMins;
}

// ── Type to preference key mapping ─────────────────────────────────────────

function isTypeEnabled(insight: InsightWithPrefs): boolean {
  switch (insight.type) {
    case 'reminder':    return insight.reminders;
    case 'alert':       return insight.health_alerts;
    case 'trend':       return insight.trends;
    case 'preventive':  return insight.preventive;
    case 'financial':   return insight.financial;
    case 'celebration': return insight.celebrations;
    default:            return true;
  }
}

// ── Expo push helper ───────────────────────────────────────────────────────

async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const payload = {
    to:    token,
    sound: 'default',
    title,
    body,
    data:  data ?? {},
  };

  const res = await fetch(EXPO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Expo push failed: ${res.status} ${errText}`);
  }
}

// ── Mark insight as push sent ──────────────────────────────────────────────

async function markSent(sb: SB, insightId: string): Promise<void> {
  await sb
    .from('pet_insights')
    .update({ push_sent: true, push_sent_at: new Date().toISOString() })
    .eq('id', insightId);
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch pending insights
    const { data: rawInsights, error } = await sb
      .from('pet_insights')
      .select('id, pet_id, user_id, type, urgency, title, body, action_route, source, created_at')
      .eq('push_sent', false)
      .eq('dismissed', false)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;
    if (!rawInsights?.length) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, skipped: 0, ts: new Date().toISOString() }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // Batch-fetch user tokens and notification preferences
    const userIds = [...new Set(rawInsights.map((i) => i.user_id))];

    const [{ data: usersData }, { data: prefsData }] = await Promise.all([
      sb.from('users').select('id, expo_push_token').in('id', userIds),
      sb.from('notification_preferences').select(
        'user_id, push_enabled, quiet_start, quiet_end, preferred_hour, reminders, health_alerts, trends, preventive, financial, celebrations'
      ).in('user_id', userIds),
    ]);

    const userMap = new Map((usersData ?? []).map((u) => [u.id, u.expo_push_token as string | null]));
    const prefsMap = new Map((prefsData ?? []).map((p) => [p.user_id, p]));

    let sent = 0;
    let skipped = 0;

    for (const raw of rawInsights) {
      const prefs = prefsMap.get(raw.user_id);

      const insight = raw as unknown as InsightWithPrefs;
      insight.expo_push_token = userMap.get(raw.user_id) ?? null;
      insight.push_enabled    = prefs?.push_enabled    ?? true;
      insight.quiet_start     = prefs?.quiet_start     ?? '22:00:00';
      insight.quiet_end       = prefs?.quiet_end       ?? '08:00:00';
      insight.preferred_hour  = prefs?.preferred_hour  ?? 9;
      insight.reminders       = prefs?.reminders       ?? true;
      insight.health_alerts   = prefs?.health_alerts   ?? true;
      insight.trends          = prefs?.trends          ?? true;
      insight.preventive      = prefs?.preventive      ?? true;
      insight.financial       = prefs?.financial       ?? false;
      insight.celebrations    = prefs?.celebrations    ?? true;

      const token = insight.expo_push_token;

      // Skip if no token or push disabled
      if (!token || !insight.push_enabled) {
        await markSent(sb, insight.id);
        skipped++;
        continue;
      }

      // Skip if type is disabled in preferences
      if (!isTypeEnabled(insight)) {
        await markSent(sb, insight.id);
        skipped++;
        continue;
      }

      // Skip critical/high during quiet hours only if NOT critical
      if (insight.urgency !== 'critical' && isQuietTime(insight.quiet_start, insight.quiet_end)) {
        // Don't mark sent — try again next run
        skipped++;
        continue;
      }

      // For low/medium urgency: only send during preferred hour window (±1h)
      if (['low', 'medium'].includes(insight.urgency)) {
        const nowHour = new Date().getHours();
        const prefH   = insight.preferred_hour;
        if (Math.abs(nowHour - prefH) > 1) {
          skipped++;
          continue;
        }
      }

      // Send push
      try {
        await sendExpoPush(
          token,
          insight.title,
          insight.body,
          insight.action_route ? { route: insight.action_route } : undefined,
        );
        await markSent(sb, insight.id);
        sent++;
      } catch (pushErr) {
        console.error('[send-push-notifications] Push failed for insight', insight.id, pushErr);
        // Don't mark as sent — retry on next run
      }
    }

    return new Response(
      JSON.stringify({ ok: true, sent, skipped, ts: new Date().toISOString() }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[send-push-notifications] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
