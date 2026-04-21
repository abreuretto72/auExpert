/**
 * AI config loader — reads model names and defaults from app_config
 * with a 5-min in-memory cache (currently disabled: expiry = now + 1).
 *
 * Inlined inside the classify-diary-entry deploy bundle to avoid
 * cross-directory imports at deploy time.
 */

export interface AIConfig {
  model_classify:    string;
  model_vision:      string;
  model_chat:        string;
  model_narrate:     string;
  model_insights:    string;
  model_simple:      string;
  model_audio:       string;  // Gemini model for native audio analysis
  model_video:       string;  // Gemini model for native video analysis
  timeout_ms:        number;
  anthropic_version: string;
}

const AI_CONFIG_DEFAULTS: AIConfig = {
  model_classify:    'claude-sonnet-4-6',
  model_vision:      'claude-sonnet-4-6',
  model_chat:        'claude-sonnet-4-6',
  model_narrate:     'claude-sonnet-4-6',
  model_insights:    'claude-sonnet-4-6',
  model_simple:      'claude-sonnet-4-6',
  model_audio:       'gemini-2.5-flash-preview-04-17', // Gemini — native audio support
  model_video:       'gemini-2.5-flash-preview-04-17', // Gemini — native video support
  timeout_ms:        30_000,
  anthropic_version: '2023-06-01',
};

let _cachedAIConfig: AIConfig | null = null;
let _aiConfigExpiry = 0;

export async function getAIConfig(): Promise<AIConfig> {
  const now = Date.now();
  if (_cachedAIConfig && now < _aiConfigExpiry) return _cachedAIConfig;
  try {
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const client = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const keys = [
      'ai_model_classify', 'ai_model_vision', 'ai_model_chat',
      'ai_model_narrate', 'ai_model_insights', 'ai_model_simple',
      'ai_model_audio', 'ai_model_video',
      'ai_timeout_ms', 'ai_anthropic_version',
    ];
    const { data, error } = await client.from('app_config').select('key, value').in('key', keys);
    if (error || !data?.length) throw new Error('app_config fetch failed');
    const map: Record<string, unknown> = {};
    for (const row of data) map[row.key] = row.value;
    _cachedAIConfig = {
      model_classify:    (map['ai_model_classify']    as string) ?? AI_CONFIG_DEFAULTS.model_classify,
      model_vision:      (map['ai_model_vision']      as string) ?? AI_CONFIG_DEFAULTS.model_vision,
      model_chat:        (map['ai_model_chat']        as string) ?? AI_CONFIG_DEFAULTS.model_chat,
      model_narrate:     (map['ai_model_narrate']     as string) ?? AI_CONFIG_DEFAULTS.model_narrate,
      model_insights:    (map['ai_model_insights']    as string) ?? AI_CONFIG_DEFAULTS.model_insights,
      model_simple:      (map['ai_model_simple']      as string) ?? AI_CONFIG_DEFAULTS.model_simple,
      model_audio:       (map['ai_model_audio']       as string) ?? AI_CONFIG_DEFAULTS.model_audio,
      model_video:       (map['ai_model_video']       as string) ?? AI_CONFIG_DEFAULTS.model_video,
      timeout_ms:        Number(map['ai_timeout_ms']  ?? AI_CONFIG_DEFAULTS.timeout_ms),
      anthropic_version: (map['ai_anthropic_version'] as string) ?? AI_CONFIG_DEFAULTS.anthropic_version,
    };
    _aiConfigExpiry = now + 1; // cache desativado temporariamente
    return _cachedAIConfig;
  } catch {
    return AI_CONFIG_DEFAULTS;
  }
}
