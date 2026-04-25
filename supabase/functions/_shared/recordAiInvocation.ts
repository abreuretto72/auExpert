/**
 * _shared/recordAiInvocation.ts
 *
 * Helper best-effort que insere 1 linha em public.ai_invocations a cada
 * chamada de Edge Function de IA. Chamado no final do handler, tanto no
 * caminho de sucesso quanto no de erro.
 *
 * Filosofia:
 *  - NUNCA bloqueia a resposta da EF (fire-and-forget OU await com try/catch)
 *  - NUNCA lanca excecao — falha de logging silenciosa via console.warn
 *  - Usa service_role (passe o supabase client ja autenticado pela EF)
 *
 * Uso tipico no fim do handler:
 *
 *   const t0 = Date.now();
 *   try {
 *     const result = await callClaude(...);
 *     await recordAiInvocation(diagClient, {
 *       function_name: 'classify-diary-entry',
 *       user_id,
 *       pet_id,
 *       model_used: result.modelUsed,
 *       tokens_in: result.usage.input_tokens,
 *       tokens_out: result.usage.output_tokens,
 *       latency_ms: Date.now() - t0,
 *       cost_estimated_usd: estimateCost(result),
 *       status: 'success',
 *     });
 *     return new Response(...);
 *   } catch (err) {
 *     await recordAiInvocation(diagClient, {
 *       function_name: 'classify-diary-entry',
 *       user_id,
 *       latency_ms: Date.now() - t0,
 *       status: errorStatus(err),         // 'error' | 'timeout' | 'rate_limited'
 *       error_category: categorizeError(err),
 *       error_message: String(err).slice(0, 500),
 *       user_message: getUserFacingMessage(err),
 *     });
 *     throw err;
 *   }
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type AiInvocationStatus = 'success' | 'error' | 'timeout' | 'rate_limited';

export type AiErrorCategory =
  | 'timeout'
  | 'network'
  | 'api_error'
  | 'invalid_response'
  | 'quota_exceeded'
  | 'safety_filter'
  | 'auth_error'
  | 'validation_error'
  | 'unknown';

export type AiProvider = 'anthropic' | 'google' | 'supabase' | 'openai' | 'other';

export interface AiInvocationRecord {
  /** Nome da Edge Function. Convencao: kebab-case do nome no Supabase. */
  function_name: string;
  /** Tutor que disparou a chamada (null para chamadas sistemicas/cron). */
  user_id?: string | null;
  /** Pet alvo da chamada, quando aplicavel. */
  pet_id?: string | null;
  /** Modelo IA usado (claude-opus-4-7, gemini-2.5-flash-preview-04-17, ...). */
  model_used?: string | null;
  /** Provedor: anthropic | google | supabase | openai | other. */
  provider?: AiProvider | null;
  /** Input tokens (prompt). Anthropic: response.usage.input_tokens. */
  tokens_in?: number | null;
  /** Output tokens (resposta). Anthropic: response.usage.output_tokens. */
  tokens_out?: number | null;
  /** Anthropic prompt caching: tokens lidos do cache (~10% do input). */
  cache_read_tokens?: number | null;
  /** Anthropic prompt caching: tokens escritos no cache (~125% do input). */
  cache_write_tokens?: number | null;
  /** Numero de imagens enviadas (auditoria; custo ja vai em tokens_in). */
  image_count?: number | null;
  /** Duracao em segundos de audio enviado (auditoria; custo ja vai em tokens_in). */
  audio_seconds?: number | null;
  latency_ms?: number | null;
  /**
   * @deprecated Custo agora e derivado via JOIN com ai_pricing na RPC.
   * Mantido por compat — pode passar mas e ignorado nas agregacoes.
   */
  cost_estimated_usd?: number | null;
  status: AiInvocationStatus;
  error_category?: AiErrorCategory | null;
  error_message?: string | null;
  user_message?: string | null;
  /** Payload extra opcional: request_id, depth, etc. */
  payload?: Record<string, unknown> | null;
}

/**
 * Insere uma linha em ai_invocations. Nunca lanca excecao.
 * Retorna `true` se gravou, `false` se houve erro (logado via console.warn
 * E em edge_function_diag_logs como forensic).
 */
export async function recordAiInvocation(
  client: SupabaseClient,
  record: AiInvocationRecord,
): Promise<boolean> {
  try {
    const { error } = await client.from('ai_invocations').insert({
      function_name:        record.function_name,
      user_id:              record.user_id ?? null,
      pet_id:               record.pet_id ?? null,
      model_used:           record.model_used ?? null,
      provider:             record.provider ?? null,
      tokens_in:            record.tokens_in ?? null,
      tokens_out:           record.tokens_out ?? null,
      cache_read_tokens:    record.cache_read_tokens ?? null,
      cache_write_tokens:   record.cache_write_tokens ?? null,
      image_count:          record.image_count ?? null,
      audio_seconds:        record.audio_seconds ?? null,
      latency_ms:           record.latency_ms ?? null,
      cost_estimated_usd:   record.cost_estimated_usd ?? null,
      status:               record.status,
      error_category:       record.error_category ?? null,
      error_message:        record.error_message
                              ? String(record.error_message).slice(0, 1000)
                              : null,
      user_message:         record.user_message
                              ? String(record.user_message).slice(0, 500)
                              : null,
      payload:              record.payload ?? null,
    });
    if (error) {
      console.warn(`[recordAiInvocation] insert failed for ${record.function_name}:`, error.message);
      // Forensic: tenta logar em edge_function_diag_logs pra que o admin
      // possa ver POR QUE o INSERT falhou (RLS, schema, type mismatch, etc.).
      // Se isso tambem falhar, segue silencioso — nunca trava a EF.
      client.from('edge_function_diag_logs').insert({
        function_name: record.function_name,
        request_id:    null,
        level:         'error',
        message:       `[recordAiInvocation] insert into ai_invocations FAILED: ${error.message}`,
        payload: {
          model_used: record.model_used,
          status:     record.status,
          tokens_in:  record.tokens_in,
          tokens_out: record.tokens_out,
          pg_error:   error,
        },
      }).then(() => {}, () => {});
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[recordAiInvocation] exception for ${record.function_name}:`, err);
    return false;
  }
}

// ── Helpers de categorizacao de erro ────────────────────────────────────────

/**
 * Categoriza um Error em AiErrorCategory com base em substrings do message.
 * Heuristica simples — caller pode passar categoria explicita se souber.
 */
export function categorizeError(err: unknown): AiErrorCategory {
  const msg = String(err?.toString?.() ?? err ?? '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) return 'timeout';
  if (msg.includes('network') || msg.includes('fetch failed') || msg.includes('econn')) return 'network';
  if (msg.includes('rate') && msg.includes('limit')) return 'quota_exceeded';
  if (msg.includes('quota')) return 'quota_exceeded';
  if (msg.includes('safety') || msg.includes('content_filter')) return 'safety_filter';
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) return 'auth_error';
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('400')) return 'validation_error';
  if (msg.includes('parse') || msg.includes('unexpected') || msg.includes('json')) return 'invalid_response';
  if (msg.includes('api error') || msg.includes('500') || msg.includes('502') || msg.includes('503')) return 'api_error';
  return 'unknown';
}

/** Mapeia categoria pra status — `quota_exceeded` vira 'rate_limited', timeout vira 'timeout'. */
export function statusFromCategory(cat: AiErrorCategory): AiInvocationStatus {
  if (cat === 'timeout') return 'timeout';
  if (cat === 'quota_exceeded') return 'rate_limited';
  return 'error';
}
