/**
 * _shared/estimateAiCost.ts
 *
 * @deprecated desde 2026-04-25. Custo agora e DERIVADO em SQL via JOIN
 * com a tabela `public.ai_pricing` (versionada por valid_from), dentro
 * da RPC get_admin_ai_breakdown. Mudanca de preco = INSERT em ai_pricing,
 * sem deploy. Helper preservado por compat com callers antigos
 * (classify-diary-entry passava cost_estimated_usd no record).
 *
 * Para nova instrumentacao: NAO calcule custo no client.
 *   - Capture tokens crus via extractAnthropicUsage / extractGeminiUsage
 *   - Passe pra recordAiInvocation
 *   - A RPC calcula custo via ai_pricing na hora da query
 *
 * Calculo de custo USD a partir de tokens consumidos. Tabela de precos
 * baseada em pricing publicado pela Anthropic (Claude) e Google (Gemini)
 * em abril/2026. Atualizar quando os providers mudarem precos.
 *
 * Fluxo de uso (legacy):
 *   import { estimateAiCost } from '../_shared/estimateAiCost.ts';
 *   const cost = estimateAiCost('claude-sonnet-4-6', 1500, 800);
 *   // cost = (1500 * 3.00 / 1e6) + (800 * 15.00 / 1e6) = 0.0165 USD
 *
 * Modelos nao mapeados retornam 0 e logam warning. Adicione novos modelos
 * em PRICES_USD_PER_MTOK conforme novos providers entrarem no projeto.
 */

interface PriceUsd {
  /** USD por 1 milhao de tokens de input (prompt). */
  in: number;
  /** USD por 1 milhao de tokens de output (resposta). */
  out: number;
}

/**
 * Tabela de precos. Chave = nome canonico do modelo (mesmo string que a API
 * aceita). Aliases vao logo abaixo.
 *
 * Fontes (snapshot 2026-04):
 *   - https://www.anthropic.com/pricing  (Claude)
 *   - https://ai.google.dev/pricing      (Gemini)
 */
export const PRICES_USD_PER_MTOK: Record<string, PriceUsd> = {
  // ── Claude (Anthropic) ──────────────────────────────────────────────────
  'claude-opus-4-7':              { in: 15.00, out: 75.00 },
  'claude-opus-4-6':              { in: 15.00, out: 75.00 },
  'claude-sonnet-4-6':            { in:  3.00, out: 15.00 },
  'claude-sonnet-4-20250514':     { in:  3.00, out: 15.00 },
  'claude-haiku-4-5':             { in:  0.80, out:  4.00 },
  'claude-haiku-4-5-20251001':    { in:  0.80, out:  4.00 },

  // ── Gemini (Google) ─────────────────────────────────────────────────────
  // Gemini 2.5 Flash (preview) — usado em video + pet_audio analysis
  'gemini-2.5-flash-preview-04-17': { in: 0.075, out: 0.30 },
  'gemini-2.5-flash':               { in: 0.075, out: 0.30 },

  // ── Supabase AI (gte-small) — embeddings ────────────────────────────────
  // Sem custo USD direto exposto (incluso no plano Supabase). 0 por enquanto.
  'gte-small':                      { in: 0,    out: 0    },
};

/**
 * Estima o custo USD de uma chamada IA dada modelo + tokens.
 * Retorna 0 (e loga warning uma vez por modelo desconhecido) quando o modelo
 * nao esta na tabela. NUNCA lanca excecao.
 */
const _warnedModels = new Set<string>();

export function estimateAiCost(
  model: string | null | undefined,
  tokensIn: number | null | undefined,
  tokensOut: number | null | undefined,
): number {
  if (!model) return 0;
  const price = PRICES_USD_PER_MTOK[model];
  if (!price) {
    if (!_warnedModels.has(model)) {
      _warnedModels.add(model);
      console.warn(`[estimateAiCost] modelo desconhecido: "${model}". Adicione em PRICES_USD_PER_MTOK.`);
    }
    return 0;
  }
  const inTok  = Math.max(0, tokensIn  ?? 0);
  const outTok = Math.max(0, tokensOut ?? 0);
  const cost = (inTok * price.in / 1_000_000) + (outTok * price.out / 1_000_000);
  // Arredondar pra 4 casas (compativel com NUMERIC(12,4) da coluna do banco)
  return Math.round(cost * 10_000) / 10_000;
}

/**
 * Resolve uma cadeia de modelos (ex: chain de fallback Opus→Sonnet) para o
 * primeiro modelo NAO desconhecido. Util quando o caller passa o array de
 * `model_*_chain` mas so quer o efetivamente usado.
 */
export function resolveModelKey(model: string | null | undefined): string | null {
  return model && PRICES_USD_PER_MTOK[model] ? model : (model ?? null);
}
