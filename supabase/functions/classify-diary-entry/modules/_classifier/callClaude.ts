/**
 * Claude API call — usa o helper compartilhado callAnthropicWithFallback,
 * ganhando automaticamente:
 *   - Fallback entre modelos (chain de model_classify_chain)
 *   - Self-healing de params deprecados (auto-strip + retry)
 *   - Diag logs em edge_function_diag_logs
 *   - Tratamento consistente de erros
 *
 * Assinatura preservada: { text, tokensUsed }. Throws em falha não recuperável.
 */

import type { ClaudeMessage } from './types.ts';
import { ANTHROPIC_API_KEY, MAX_TOKENS } from './constants.ts';
import { getAIConfig } from './ai-config.ts';
import { callAnthropicWithFallback, AnthropicCallError } from '../../../_shared/callAnthropicWithFallback.ts';
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = MAX_TOKENS,
  extraHeaders: Record<string, string> = {},
  modelOverride?: string,
): Promise<{
  text: string;
  tokensUsed: number;
  /** Usage completo da Anthropic — usado pra recordAiInvocation. */
  usage: ClaudeUsage;
  /** Modelo efetivamente usado (apos fallback). */
  modelUsed: string;
}> {
  const cfg = await getAIConfig();
  // modelOverride tem prioridade (caller sabe o que quer);
  // senão usa a chain (array normalizado do ai-config).
  const chain: string[] = modelOverride
    ? [modelOverride]
    : cfg.model_classify_chain;

  const reqId = Math.random().toString(36).slice(2, 10);
  const diagClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let result;
  try {
    result = await callAnthropicWithFallback({
      models: chain,
      apiKey: ANTHROPIC_API_KEY,
      anthropicVersion: cfg.anthropic_version,
      requestId: reqId,
      diagClient,
      functionName: 'classify-diary-entry',
      buildPayload: (model) => ({
        model,
        max_tokens: maxTokens,
        system: [
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ],
        messages,
      }),
    });
  } catch (callErr) {
    const err = callErr as AnthropicCallError;
    console.error(`[classifier] [${reqId}] Claude call failed:`, err.message);
    // DIAG: grava body completo do erro para podermos ler depois
    try {
      await diagClient.from('edge_function_diag_logs').insert({
        function_name: 'classify-diary-entry',
        request_id: reqId,
        level: 'error',
        message: '[callClaude] Claude call failed',
        payload: {
          status: err.status ?? null,
          body: err.body ?? null,
          parsed: err.parsed ?? null,
          attempts: err.attempts ?? [],
          exhausted: err.exhausted ?? false,
          chain,
          cfg_anthropic_version: cfg.anthropic_version,
          max_tokens: maxTokens,
          system_prompt_chars: systemPrompt?.length ?? 0,
          messages_count: messages?.length ?? 0,
        },
      });
    } catch (diagErr) {
      console.error('[callClaude] error diag insert failed:', diagErr);
    }
    throw new Error(`Claude API error: ${err.status ?? 'network'}`);
  }

  // Aplicar extraHeaders não é mais possível via helper, mas nenhum caller
  // atual usa esse parâmetro com headers customizados (verificado no código).
  // Se precisar no futuro, estender CallOpts do helper com `extraHeaders`.
  if (Object.keys(extraHeaders).length > 0) {
    console.warn('[callClaude] extraHeaders ignored — not supported via fallback helper');
  }

  const aiResponse = await result.response.json();
  const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

  if (!textContent?.text) {
    throw new Error('Empty AI response');
  }

  const u = aiResponse.usage ?? {};
  return {
    text: textContent.text,
    tokensUsed: u.output_tokens ?? 0,
    usage: {
      input_tokens:                u.input_tokens                ?? 0,
      output_tokens:               u.output_tokens               ?? 0,
      cache_read_input_tokens:     u.cache_read_input_tokens     ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
    },
    modelUsed: result.modelUsed,
  };
}
