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

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = MAX_TOKENS,
  extraHeaders: Record<string, string> = {},
  modelOverride?: string,
): Promise<{ text: string; tokensUsed: number }> {
  const cfg = await getAIConfig();
  // Usa chain se disponível, senão cai pro single model do local ai-config.
  // Se modelOverride vier, ele tem prioridade (caller sabe o que quer).
  const chain: string[] = modelOverride
    ? [modelOverride]
    // deno-lint-ignore no-explicit-any
    : ((cfg as any).model_classify_chain as string[] | undefined) ?? [cfg.model_classify];

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

  return {
    text: textContent.text,
    tokensUsed: aiResponse.usage?.output_tokens ?? 0,
  };
}
