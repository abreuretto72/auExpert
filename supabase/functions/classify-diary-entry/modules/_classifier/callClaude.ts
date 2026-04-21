/**
 * Claude API call — wraps fetch to api.anthropic.com/v1/messages with the
 * configured model, timeout, prompt caching on the system prefix, and token
 * usage extraction. Returns { text, tokensUsed } on success; throws on
 * non-2xx responses or empty content blocks.
 */

import type { ClaudeMessage } from './types.ts';
import { ANTHROPIC_API_KEY, MAX_TOKENS } from './constants.ts';
import { getAIConfig } from './ai-config.ts';

// ── Claude API call ──

export async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = MAX_TOKENS,
  extraHeaders: Record<string, string> = {},
  modelOverride?: string,
): Promise<{ text: string; tokensUsed: number }> {
  const cfg = await getAIConfig();
  const model = modelOverride ?? cfg.model_classify;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cfg.timeout_ms);
  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        // Prompt caching: Claude cacheia o prefix do system (~5min TTL) e reaproveita
        // em chamadas subsequentes com o mesmo prefixo. Para o mesmo pet em sessão
        // ativa (tutor adiciona múltiplas entradas seguidas), dá hit e corta
        // tokens de input em ~90% + reduz TTFT. Primeira chamada cria o cache
        // (custo +25%), chamadas seguintes leem dele (custo −90%).
        system: [
          { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
        ],
        messages,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[classifier] Claude API error:', response.status, errorBody);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

  if (!textContent?.text) {
    throw new Error('Empty AI response');
  }

  return {
    text: textContent.text,
    tokensUsed: aiResponse.usage?.output_tokens ?? 0,
  };
}
