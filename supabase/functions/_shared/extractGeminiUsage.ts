/**
 * _shared/extractGeminiUsage.ts
 *
 * Parsea o `usageMetadata` retornado pela Generative Language API do Google
 * (Gemini) e converte pro shape esperado por recordAiInvocation.
 *
 * Shape oficial do Gemini (v2026-04):
 *   {
 *     "candidates": [...],
 *     "usageMetadata": {
 *       "promptTokenCount": 1234,
 *       "candidatesTokenCount": 567,
 *       "totalTokenCount": 1801,
 *       "cachedContentTokenCount": 0    // opcional, somente com context cache
 *     },
 *     "modelVersion": "gemini-2.5-flash"
 *   }
 *
 * Audio e video tambem viram tokens — Gemini conta ~32 tokens/segundo de audio
 * e ~258 tokens/frame para video. promptTokenCount ja inclui esse custo.
 *
 * Uso:
 *   const json = await response.json();
 *   const usage = extractGeminiUsage(json, requestedModel);
 *   await recordAiInvocation(client, {
 *     function_name: 'classify-diary-entry',
 *     provider: 'google',
 *     model_used: usage.model,
 *     tokens_in: usage.tokens_in,
 *     tokens_out: usage.tokens_out,
 *     cache_read_tokens: usage.cache_read_tokens,
 *     ...
 *   });
 */

export interface GeminiUsage {
  /** Modelo efetivamente usado. response.modelVersion ou fallback para o pedido. */
  model: string | null;
  tokens_in: number;
  tokens_out: number;
  /** Context cache do Gemini (cachedContentTokenCount). */
  cache_read_tokens: number;
  /** Gemini nao expoe cache write tokens — sempre 0. */
  cache_write_tokens: number;
}

/**
 * Extrai usage de um response JSON do Gemini.
 *
 * @param response  JSON ja parseado da API.
 * @param fallbackModel  Modelo pedido (caso modelVersion nao venha no response).
 */
export function extractGeminiUsage(
  response: unknown,
  fallbackModel: string | null = null,
): GeminiUsage {
  const empty: GeminiUsage = {
    model: fallbackModel,
    tokens_in: 0,
    tokens_out: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
  };

  if (!response || typeof response !== 'object') return empty;
  const r = response as Record<string, unknown>;

  // Modelo: response.modelVersion (preferencia) ou fallback
  const model =
    (typeof r.modelVersion === 'string' && r.modelVersion) ||
    (typeof r.model === 'string' && r.model) ||
    fallbackModel;

  const meta =
    (r.usageMetadata as Record<string, unknown> | undefined) ??
    ((r.response as Record<string, unknown> | undefined)?.usageMetadata as Record<string, unknown> | undefined);

  if (!meta) return { ...empty, model };

  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0);

  // promptTokenCount inclui todos os tokens de entrada (texto + cache + imagem + audio).
  // cachedContentTokenCount e um SUBCONJUNTO de promptTokenCount (vem do cache).
  // Para nao contar duas vezes, descontamos o cache do tokens_in.
  const promptTotal     = num(meta.promptTokenCount);
  const cachedTokens    = num(meta.cachedContentTokenCount);
  const tokens_in_fresh = Math.max(0, promptTotal - cachedTokens);

  return {
    model,
    tokens_in:          tokens_in_fresh,
    tokens_out:         num(meta.candidatesTokenCount),
    cache_read_tokens:  cachedTokens,
    cache_write_tokens: 0, // Gemini nao distingue escrita
  };
}
