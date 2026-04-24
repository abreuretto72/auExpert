/**
 * _shared/ai-config.ts
 *
 * Configuração centralizada de modelos de IA. Carrega de app_config com
 * cache de 30s (propagação rápida de rollbacks em emergência).
 *
 * Formato em app_config (JSONB):
 *   - String:  "claude-opus-4-7"                     — modelo único
 *   - Array:   ["claude-opus-4-7", "claude-opus-4-6"] — cadeia com fallback
 *
 * Canary rollout (opcional, via colunas value_previous + rollout_percent):
 *   - rollout_percent = 100  → todo mundo recebe `value` (default)
 *   - rollout_percent = 5    → 5% dos users recebem `value`, 95% `value_previous`
 *   - Bucket determinístico por hash(user_id) % 100
 *
 * Callers sem user_id ou sem canary ativo → comportamento clássico.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface AIConfig {
  // Primary (first of chain) — backward compat pra callers sem fallback
  model_classify:    string;
  model_vision:      string;
  model_chat:        string;
  model_narrate:     string;
  model_insights:    string;
  model_simple:      string;

  // Full chain — use com callAnthropicWithFallback
  model_classify_chain:  string[];
  model_vision_chain:    string[];
  model_chat_chain:      string[];
  model_narrate_chain:   string[];
  model_insights_chain:  string[];
  model_simple_chain:    string[];

  // Canary rollout: se rollout_percent < 100 E user_id foi passado pro
  // getAIConfig, o resolver bucketiza. Caso contrário, usa value (current).
  rollout: Record<string, RolloutConfig>;

  timeout_ms:        number;
  anthropic_version: string;
}

interface RolloutConfig {
  chain_current: string[];
  chain_previous: string[] | null;
  percent: number;
}

const DEFAULTS: AIConfig = {
  model_classify:        'claude-sonnet-4-6',
  model_vision:          'claude-opus-4-7',
  model_chat:            'claude-sonnet-4-6',
  model_narrate:         'claude-sonnet-4-6',
  model_insights:        'claude-haiku-4-5-20251001',
  model_simple:          'claude-sonnet-4-6',

  model_classify_chain:  ['claude-sonnet-4-6'],
  model_vision_chain:    ['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6'],
  model_chat_chain:      ['claude-sonnet-4-6'],
  model_narrate_chain:   ['claude-sonnet-4-6'],
  model_insights_chain:  ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6'],
  model_simple_chain:    ['claude-sonnet-4-6'],

  rollout: {},
  timeout_ms:        30_000,
  anthropic_version: '2023-06-01',
};

const AI_KEYS = [
  'ai_model_classify', 'ai_model_vision', 'ai_model_chat',
  'ai_model_narrate',  'ai_model_insights', 'ai_model_simple',
  'ai_timeout_ms',     'ai_anthropic_version',
] as const;

let cachedConfig: AIConfig | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 30 * 1000; // 30s — propagação rápida de rollback

function toChain(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) {
    const filtered = raw.map((x) => String(x).trim()).filter(Boolean);
    return filtered.length > 0 ? filtered : fallback;
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return [raw.trim()];
  }
  return fallback;
}

export async function getAIConfig(sb?: SupabaseClient): Promise<AIConfig> {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiry) return cachedConfig;

  try {
    const client = sb ?? createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Agora precisamos também de value_previous e rollout_percent (canary)
    const { data, error } = await client
      .from('app_config')
      .select('key, value, value_previous, rollout_percent')
      .in('key', AI_KEYS);

    if (error || !data?.length) throw new Error('app_config fetch failed');

    const map: Record<string, { value: unknown; value_previous: unknown; rollout_percent: number }> = {};
    for (const row of data) {
      map[row.key] = {
        value: row.value,
        value_previous: row.value_previous ?? null,
        rollout_percent: row.rollout_percent ?? 100,
      };
    }

    // Primary chain = current value (o que ficou no app_config.value)
    const classifyChain = toChain(map['ai_model_classify']?.value, DEFAULTS.model_classify_chain);
    const visionChain   = toChain(map['ai_model_vision']?.value,   DEFAULTS.model_vision_chain);
    const chatChain     = toChain(map['ai_model_chat']?.value,     DEFAULTS.model_chat_chain);
    const narrateChain  = toChain(map['ai_model_narrate']?.value,  DEFAULTS.model_narrate_chain);
    const insightsChain = toChain(map['ai_model_insights']?.value, DEFAULTS.model_insights_chain);
    const simpleChain   = toChain(map['ai_model_simple']?.value,   DEFAULTS.model_simple_chain);

    // Rollout info: previous chain + percent. Previous pode ser null se não houver canary.
    const rollout: Record<string, RolloutConfig> = {};
    for (const key of ['ai_model_classify', 'ai_model_vision', 'ai_model_chat', 'ai_model_narrate', 'ai_model_insights', 'ai_model_simple']) {
      const entry = map[key];
      if (!entry) continue;
      rollout[key] = {
        chain_current: toChain(entry.value, []),
        chain_previous: entry.value_previous ? toChain(entry.value_previous, []) : null,
        percent: entry.rollout_percent,
      };
    }

    const config: AIConfig = {
      model_classify:        classifyChain[0],
      model_vision:          visionChain[0],
      model_chat:            chatChain[0],
      model_narrate:         narrateChain[0],
      model_insights:        insightsChain[0],
      model_simple:          simpleChain[0],

      model_classify_chain:  classifyChain,
      model_vision_chain:    visionChain,
      model_chat_chain:      chatChain,
      model_narrate_chain:   narrateChain,
      model_insights_chain:  insightsChain,
      model_simple_chain:    simpleChain,

      rollout,
      timeout_ms:        Number(map['ai_timeout_ms']?.value  ?? DEFAULTS.timeout_ms),
      anthropic_version: (map['ai_anthropic_version']?.value as string) ?? DEFAULTS.anthropic_version,
    };

    cachedConfig = config;
    cacheExpiry  = now + CACHE_TTL_MS;
    return config;

  } catch (e) {
    console.warn('[ai-config] falling back to DEFAULTS:', (e as Error)?.message ?? e);
    cachedConfig = DEFAULTS;
    cacheExpiry  = Date.now() + 60_000;
    return DEFAULTS;
  }
}

/**
 * Hash determinístico simples pra bucket % 100 — FNV-1a 32-bit é suficiente,
 * não precisamos criptográfico aqui.
 */
function bucketFromUserId(userId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 100;
}

/**
 * Resolve a cadeia de modelos aplicável ao usuário. Se não houver canary ativo
 * (ou user_id não passado), retorna a chain "current". Caso contrário, bucketiza.
 *
 * @param config  — resultado de getAIConfig()
 * @param which   — 'vision' | 'classify' | 'chat' | 'narrate' | 'insights' | 'simple'
 * @param userId  — opcional. Se omitido, usa chain current.
 */
export function resolveModelChain(
  config: AIConfig,
  which: 'vision' | 'classify' | 'chat' | 'narrate' | 'insights' | 'simple',
  userId?: string | null,
): string[] {
  const keyMap = {
    vision: 'ai_model_vision',
    classify: 'ai_model_classify',
    chat: 'ai_model_chat',
    narrate: 'ai_model_narrate',
    insights: 'ai_model_insights',
    simple: 'ai_model_simple',
  } as const;

  const chainMap = {
    vision: config.model_vision_chain,
    classify: config.model_classify_chain,
    chat: config.model_chat_chain,
    narrate: config.model_narrate_chain,
    insights: config.model_insights_chain,
    simple: config.model_simple_chain,
  } as const;

  const rollout = config.rollout?.[keyMap[which]];
  if (!userId || !rollout || rollout.percent >= 100 || !rollout.chain_previous) {
    return chainMap[which];  // comportamento clássico
  }

  const bucket = bucketFromUserId(userId);
  return bucket < rollout.percent ? rollout.chain_current : rollout.chain_previous;
}
