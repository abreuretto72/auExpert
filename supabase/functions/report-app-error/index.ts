/**
 * report-app-error — recebe erro do app React Native e persiste em app_errors.
 *
 * Filosofia:
 *   - Best-effort. Se o INSERT falhar, retorna 200 com warning (nunca trava o app).
 *   - Auth opcional — se houver Bearer JWT, usa user_id; senão grava com user_id null.
 *   - Deduplicação via fingerprint (hash de message + 3 primeiras linhas do stack).
 *     Se já existir um registro com mesmo fingerprint não-resolvido nas últimas
 *     24h, incrementa occurrence_count em vez de criar nova linha.
 *
 * POST body:
 *   {
 *     severity: 'info'|'warning'|'error'|'critical',
 *     category: 'crash'|'unhandled'|'network'|'ai_failure'|'validation'|
 *               'permission'|'manual_report'|'other',
 *     message: string,
 *     stack?: string,
 *     route?: string,
 *     component?: string,
 *     app_version?: string,
 *     platform?: 'ios'|'android'|'web',
 *     os_version?: string,
 *     device_model?: string,
 *     locale?: string,
 *     is_online?: boolean,
 *     user_message?: string,
 *     screenshot_url?: string,
 *     pet_id?: string,
 *     payload?: Record<string, unknown>
 *   }
 *
 * Resp: { ok: true, id: string, deduplicated: boolean }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_SEVERITY = new Set(['info', 'warning', 'error', 'critical']);
const VALID_CATEGORY = new Set([
  'crash', 'unhandled', 'network', 'ai_failure',
  'validation', 'permission', 'manual_report', 'other',
]);

/**
 * Fingerprint = SHA-256 dos primeiros 200 chars de message + 3 primeiras linhas
 * do stack (normalizadas). Mesma exception em locais diferentes ou com stack
 * truncado vai consolidar — quanto mais conservador o fingerprint, mais consolida.
 */
async function computeFingerprint(message: string, stack: string | null): Promise<string> {
  const msg = (message ?? '').slice(0, 200).trim();
  const stackHead = (stack ?? '')
    .split('\n')
    .slice(0, 3)
    .map(l => l.trim().replace(/:\d+:\d+/g, ''))  // drop line:col, varia entre builds
    .join('|');
  const data = new TextEncoder().encode(`${msg}::${stackHead}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const {
      severity, category, message, stack, route, component,
      app_version, platform, os_version, device_model, locale,
      is_online, user_message, screenshot_url, pet_id, payload,
    } = body as Record<string, unknown>;

    // Validações mínimas
    if (typeof severity !== 'string' || !VALID_SEVERITY.has(severity)) {
      return jsonResp({ error: 'invalid severity' }, 400);
    }
    if (typeof category !== 'string' || !VALID_CATEGORY.has(category)) {
      return jsonResp({ error: 'invalid category' }, 400);
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return jsonResp({ error: 'message required' }, 400);
    }

    // Resolve user_id se Bearer JWT presente (best-effort, não bloqueia)
    let user_id: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data } = await anonClient.auth.getUser(token);
        user_id = data?.user?.id ?? null;
      } catch {
        // ignore — registro fica anônimo
      }
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const fingerprint = await computeFingerprint(message, typeof stack === 'string' ? stack : null);

    // Tenta deduplicar — incrementa occurrence_count se já há ocorrência aberta nas últimas 24h
    if (fingerprint) {
      const { data: existing } = await sb
        .from('app_errors')
        .select('id, occurrence_count')
        .eq('fingerprint', fingerprint)
        .eq('status', 'open')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await sb.from('app_errors').update({
          occurrence_count: (existing.occurrence_count ?? 1) + 1,
        }).eq('id', existing.id);
        return jsonResp({ ok: true, id: existing.id, deduplicated: true });
      }
    }

    // Trunca campos longos pra evitar payloads gigantes
    const safeStack       = typeof stack === 'string'         ? stack.slice(0, 8000)        : null;
    const safeMessage     = String(message).slice(0, 2000);
    const safeUserMessage = typeof user_message === 'string'  ? user_message.slice(0, 1000) : null;

    const { data: inserted, error: insErr } = await sb.from('app_errors').insert({
      user_id,
      pet_id:         typeof pet_id === 'string' ? pet_id : null,
      severity,
      category,
      message:        safeMessage,
      stack:          safeStack,
      route:          typeof route === 'string'        ? route.slice(0, 500)         : null,
      component:      typeof component === 'string'    ? component.slice(0, 200)     : null,
      app_version:    typeof app_version === 'string'  ? app_version.slice(0, 50)    : null,
      platform:       platform === 'ios' || platform === 'android' || platform === 'web' ? platform : null,
      os_version:     typeof os_version === 'string'   ? os_version.slice(0, 50)     : null,
      device_model:   typeof device_model === 'string' ? device_model.slice(0, 100)  : null,
      locale:         typeof locale === 'string'       ? locale.slice(0, 20)         : null,
      is_online:      typeof is_online === 'boolean'   ? is_online : null,
      user_message:   safeUserMessage,
      screenshot_url: typeof screenshot_url === 'string' ? screenshot_url.slice(0, 500) : null,
      fingerprint,
      payload:        (payload && typeof payload === 'object') ? payload : null,
    }).select('id').single();

    if (insErr) {
      console.warn('[report-app-error] insert failed:', insErr.message);
      // Best-effort — retorna sucesso pro client mas com flag
      return jsonResp({ ok: false, warning: insErr.message }, 200);
    }

    return jsonResp({ ok: true, id: inserted!.id, deduplicated: false });
  } catch (err) {
    console.error('[report-app-error] unhandled error:', err);
    return jsonResp({ ok: false, warning: String(err) }, 200);
  }
});
