/**
 * _shared/extractAnthropicUsage.ts
 *
 * Parsea o `usage` retornado pela Messages API da Anthropic e converte pro
 * shape esperado por recordAiInvocation. Captura tokens de input, output,
 * cache_read e cache_creation (5-min ephemeral cache).
 *
 * Shape oficial da Anthropic (v2026-04):
 *   {
 *     "usage": {
 *       "input_tokens": 1234,
 *       "output_tokens": 567,
 *       "cache_read_input_tokens": 0,           // opcional
 *       "cache_creation_input_tokens": 0        // opcional
 *     },
 *     "model": "claude-sonnet-4-20250514"
 *   }
 *
 * Uso:
 *   const json = await response.json();
 *   const usage = extractAnthropicUsage(json);
 *   await recordAiInvocation(client, {
 *     function_name: 'analyze-pet-photo',
 *     provider: 'anthropic',
 *     model_used: usage.model,
 *     tokens_in: usage.tokens_in,
 *     tokens_out: usage.tokens_out,
 *     cache_read_tokens: usage.cache_read_tokens,
 *     cache_write_tokens: usage.cache_write_tokens,
 *     ...
 *   });
 */

export interface AnthropicUsage {
  /** Modelo efetivamente usado (vem do response.model). */
  model: string | null;
  /** Tokens de input nao-cacheados. */
  tokens_in: number;
  /** Tokens de output. */
  tokens_out: number;
  /** Tokens lidos do prompt cache (custam ~10% do input price). */
  cache_read_tokens: number;
  /** Tokens escritos no prompt cache (custam ~125% do input price). */
  cache_write_tokens: number;
}

/**
 * Extrai usage de um response JSON da Messages API. Aceita:
 *   - response JSON ja parseado (Record<string, unknown>)
 *   - tenta nas chaves `usage` E `response.usage` (alguns wrappers aninham)
 *
 * Retorna zeros e null quando o campo nao existe — nunca lanca.
 */
export function extractAnthropicUsage(
  response: unknown,
): AnthropicUsage {
  const empty: AnthropicUsage = {
    model: null,
    tokens_in: 0,
    tokens_out: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
  };

  if (!response || typeof response !== 'object') return empty;
  const r = response as Record<string, unknown>;

  // Modelo: tipicamente em response.model
  const model = typeof r.model === 'string' ? r.model : null;

  // Usage pode estar em r.usage ou r.response.usage (raros wrappers)
  const usage =
    (r.usage as Record<string, unknown> | undefined) ??
    ((r.response as Record<string, unknown> | undefined)?.usage as Record<string, unknown> | undefined);

  if (!usage) return { ...empty, model };

  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);

  return {
    model,
    tokens_in:          num(usage.input_tokens),
    tokens_out:         num(usage.output_tokens),
    cache_read_tokens:  num(usage.cache_read_input_tokens),
    cache_write_tokens: num(usage.cache_creation_input_tokens),
  };
}
