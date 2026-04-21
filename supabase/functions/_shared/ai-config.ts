/**
 * _shared/ai-config.ts
 *
 * Centralised AI model configuration loaded from app_config.
 * Falls back to hardcoded defaults if the DB call fails.
 * Cache TTL: 5 minutes (in-memory, per Edge Function instance).
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface AIConfig {
  model_classify:    string;
  model_vision:      string;
  model_chat:        string;
  model_narrate:     string;
  model_insights:    string;
  model_simple:      string;
  timeout_ms:        number;
  anthropic_version: string;
}

const DEFAULTS: AIConfig = {
  model_classify:    'claude-sonnet-4-6',
  model_vision:      'claude-sonnet-4-6',
  model_chat:        'claude-sonnet-4-6',
  model_narrate:     'claude-sonnet-4-6',
  model_insights:    'claude-sonnet-4-6',
  model_simple:      'claude-sonnet-4-6',
  timeout_ms:        30_000,
  anthropic_version: '2023-06-01',
};

const AI_KEYS = [
  'ai_model_classify', 'ai_model_vision', 'ai_model_chat',
  'ai_model_narrate',  'ai_model_insights', 'ai_model_simple',
  'ai_timeout_ms',     'ai_anthropic_version',
] as const;

// ── In-memory cache ────────────────────────────────────────────────────────

let cachedConfig: AIConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Loader ─────────────────────────────────────────────────────────────────

export async function getAIConfig(sb?: SupabaseClient): Promise<AIConfig> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) return cachedConfig;

  try {
    const client = sb ?? createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await client
      .from('app_config')
      .select('key, value')
      .in('key', AI_KEYS);

    if (error || !data?.length) throw new Error('app_config fetch failed');

    const map: Record<string, unknown> = {};
    for (const row of data) {
      // JSONB values come back as parsed JS — strings already unwrapped
      map[row.key] = typeof row.value === 'string' ? row.value : row.value;
    }

    const config: AIConfig = {
      model_classify:    (map['ai_model_classify']    as string) ?? DEFAULTS.model_classify,
      model_vision:      (map['ai_model_vision']      as string) ?? DEFAULTS.model_vision,
      model_chat:        (map['ai_model_chat']        as string) ?? DEFAULTS.model_chat,
      model_narrate:     (map['ai_model_narrate']     as string) ?? DEFAULTS.model_narrate,
      model_insights:    (map['ai_model_insights']    as string) ?? DEFAULTS.model_insights,
      model_simple:      (map['ai_model_simple']      as string) ?? DEFAULTS.model_simple,
      timeout_ms:        Number(map['ai_timeout_ms']  ?? DEFAULTS.timeout_ms),
      anthropic_version: (map['ai_anthropic_version'] as string) ?? DEFAULTS.anthropic_version,
    };

    cachedConfig = config;
    cacheExpiry  = now + CACHE_TTL_MS; // cache 5 min — evita SELECT em app_config a cada invocação
    return config;

  } catch {
    // Graceful fallback — never crash a function because config is unavailable
    return DEFAULTS;
  }
}
