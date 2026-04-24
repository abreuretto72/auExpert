/**
 * _shared/callAnthropicWithFallback.ts
 *
 * Chama a Messages API da Anthropic com 2 camadas de resiliência:
 *
 * ┌─ Camada 1: SELF-HEALING (mesmo modelo) ──────────────────────────────────┐
 * │ Quando a Anthropic retorna invalid_request_error dizendo que um          │
 * │ parâmetro foi deprecated/removed, o helper REMOVE esse param do payload  │
 * │ e tenta de novo no mesmo modelo. Exemplo real:                           │
 * │   • Request inicial: { model: 'claude-opus-4-7', temperature: 0, ... }   │
 * │   • Anthropic: 400 "`temperature` is deprecated for this model"          │
 * │   • Helper: strip "temperature", retry mesmo modelo                      │
 * │   • Anthropic: 200 OK                                                    │
 * │ Usuário nunca vê erro. Deploy não é necessário. Apenas um warning no    │
 * │ diag log alertando que o código deveria ser atualizado.                  │
 * │                                                                          │
 * │ Limite: 3 parâmetros stripados por modelo (evita loop infinito).         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ Camada 2: FALLBACK DE MODELO (próximo da cadeia) ───────────────────────┐
 * │ Se self-heal falhou OU o erro não é de param deprecated mas é de MODELO  │
 * │ (not_found, permission_denied, overloaded, invalid_request mencionando   │
 * │ "model"), cai pro próximo modelo da cadeia.                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Erros que NÃO ativam nenhuma camada e sobem pro caller:
 *   - authentication_error  → API key errada, trocar modelo não resolve
 *   - rate_limit_error      → slow down, não gaste quota de outro modelo
 *   - api_error (5xx)       → Anthropic com problema, independe de modelo
 */

import { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface FallbackAttempt {
  model: string;
  status: number;
  error_type?: string;
  error_message?: string;
  ms: number;
  /** Params que foram removidos via self-heal antes dessa tentativa falhar */
  stripped_params?: string[];
}

export interface AnthropicCallResult {
  response: Response;
  modelUsed: string;
  attempts: FallbackAttempt[];  // só inclui os que FALHARAM (antes do sucesso)
  /** Params removidos via self-heal pro request que deu sucesso. Vazio se não precisou self-heal. */
  strippedParams: string[];
}

export class AnthropicCallError extends Error {
  status: number;
  body: string;
  parsed: unknown;
  attempts: FallbackAttempt[];
  exhausted: boolean;

  constructor(opts: {
    message: string;
    status: number;
    body: string;
    parsed: unknown;
    attempts: FallbackAttempt[];
    exhausted: boolean;
  }) {
    super(opts.message);
    this.name = 'AnthropicCallError';
    this.status = opts.status;
    this.body = opts.body;
    this.parsed = opts.parsed;
    this.attempts = opts.attempts;
    this.exhausted = opts.exhausted;
  }
}

// Tipos de erro que ATIVAM fallback pro próximo modelo da cadeia
const MODEL_FALLBACK_ERROR_TYPES = new Set([
  'not_found_error',
  'permission_denied',
  'overloaded_error',
]);

// Se invalid_request_error mencionar um desses termos, é erro de modelo (não de param)
const MODEL_HINT_PATTERNS = ['claude-', 'this model does not', 'model not found'];

// Self-healing: detecta "param is deprecated/not supported/removed" no message da Anthropic.
// Formato típico: "`temperature` is deprecated for this model."
//                 "`top_k` is not supported for this model."
const DEPRECATED_PARAM_RE = /^\s*`([a-z_][a-z0-9_]*)`\s+(?:is\s+)?(deprecated|not\s+supported|no\s+longer\s+supported|has\s+been\s+removed)/i;

// Params que NÃO devem ser strippados (seriam removidos mas são core — melhor fallback).
// Se a Anthropic deprecar `model` em algum momento (improvável), strippar quebra o request;
// fallback pro próximo modelo é mais seguro.
const UNSTRIPPABLE_PARAMS = new Set(['model', 'messages']);

const MAX_SELF_HEAL_ATTEMPTS_PER_MODEL = 3;

function extractDeprecatedParam(errorMessage: string | undefined | null): string | null {
  if (!errorMessage) return null;
  const match = errorMessage.match(DEPRECATED_PARAM_RE);
  if (!match) return null;
  const param = match[1];
  if (UNSTRIPPABLE_PARAMS.has(param)) return null;
  return param;
}

function isModelFallbackError(errorType: string | undefined, errorMessage: string | undefined): boolean {
  if (errorType && MODEL_FALLBACK_ERROR_TYPES.has(errorType)) return true;
  if (errorType === 'invalid_request_error' && errorMessage) {
    const lower = errorMessage.toLowerCase();
    return MODEL_HINT_PATTERNS.some(p => lower.includes(p));
  }
  return false;
}

interface CallOpts {
  models: string[];
  apiKey: string;
  anthropicVersion: string;
  /** Recebe o modelo selecionado e retorna o corpo do request. Model vai dentro do payload. */
  buildPayload: (model: string) => Record<string, unknown>;
  requestId: string;
  /** Cliente service_role pra gravar log em edge_function_diag_logs (opcional). */
  diagClient?: SupabaseClient;
  /** Nome da função que chamou — aparece no diag log. */
  functionName?: string;
}

export async function callAnthropicWithFallback(opts: CallOpts): Promise<AnthropicCallResult> {
  const { models, apiKey, anthropicVersion, buildPayload, requestId, diagClient, functionName = 'unknown' } = opts;

  if (!models || models.length === 0) {
    throw new Error('[callAnthropicWithFallback] empty models array');
  }

  const attempts: FallbackAttempt[] = [];  // acumula falhas através de TODOS os modelos

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const isLastModel = i === models.length - 1;
    const strippedParams = new Set<string>();   // params stripped SÓ neste modelo
    let selfHealAttempts = 0;

    // Loop de self-healing pro modelo atual.
    // Cada iteração: tenta com payload atual; se falhar por param deprecated,
    // stripa o param e retry no mesmo modelo. Máx MAX_SELF_HEAL_ATTEMPTS_PER_MODEL.
    while (true) {
      // Build fresh e remove params que stripamos neste modelo
      const payload = buildPayload(model);
      for (const p of strippedParams) delete payload[p];

      const start = Date.now();
      let response: Response;
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': anthropicVersion,
          },
          body: JSON.stringify(payload),
        });
      } catch (networkErr) {
        // Erro de rede — não tenta próximo modelo (outros vão falhar igual).
        throw new AnthropicCallError({
          message: `Network error calling Anthropic: ${String(networkErr)}`,
          status: 0,
          body: String(networkErr),
          parsed: null,
          attempts,
          exhausted: false,
        });
      }

      const ms = Date.now() - start;

      if (response.ok) {
        // Sucesso. Logar se precisou de fallback entre modelos OU self-heal.
        const hadFallback = attempts.length > 0;
        const hadSelfHeal = strippedParams.size > 0;

        if (hadFallback || hadSelfHeal) {
          const stripped = [...strippedParams];
          const msg = hadSelfHeal && hadFallback
            ? `Success via fallback+self-heal: "${model}" after ${attempts.length} model fallback(s), stripped [${stripped.join(', ')}]`
            : hadSelfHeal
              ? `Self-heal success: "${model}" succeeded after stripping [${stripped.join(', ')}]`
              : `Fallback success: used "${model}" after ${attempts.length} failed model(s)`;
          console.warn(`[anthropic-resilience] [${requestId}] ${msg}`);

          if (diagClient) {
            await diagClient.from('edge_function_diag_logs').insert({
              function_name: functionName,
              request_id: requestId,
              level: 'warn',
              message: msg,
              payload: {
                models,
                model_used: model,
                failed_attempts: attempts,
                successful_index: i,
                stripped_params: stripped,
                self_heal_triggered: hadSelfHeal,
                fallback_triggered: hadFallback,
              },
            }).then(() => {}, (e) => console.error('[resilience] diag insert failed:', e));
          }
        }

        return { response, modelUsed: model, attempts, strippedParams: [...strippedParams] };
      }

      // Falhou — ler body e classificar o erro
      const body = await response.text();
      let parsed: { type?: string; error?: { type?: string; message?: string } } | null = null;
      try { parsed = JSON.parse(body); } catch { /* non-JSON body */ }

      const errorType = parsed?.error?.type ?? parsed?.type;
      const errorMessage = parsed?.error?.message;

      // ── Camada 1: tentar self-heal (param deprecated no mesmo modelo) ──
      if (errorType === 'invalid_request_error' && selfHealAttempts < MAX_SELF_HEAL_ATTEMPTS_PER_MODEL) {
        const deprecatedParam = extractDeprecatedParam(errorMessage);
        if (deprecatedParam && !strippedParams.has(deprecatedParam)) {
          strippedParams.add(deprecatedParam);
          selfHealAttempts++;
          console.warn(`[anthropic-self-heal] [${requestId}] "${model}" rejected "${deprecatedParam}" (${errorMessage}) — stripping and retrying [attempt ${selfHealAttempts}/${MAX_SELF_HEAL_ATTEMPTS_PER_MODEL}]`);
          continue;  // retry MESMO modelo sem o param
        }
      }

      // Não dá pra self-heal. Registra a falha cumulativa.
      attempts.push({
        model,
        status: response.status,
        error_type: errorType,
        error_message: errorMessage,
        ms,
        stripped_params: strippedParams.size > 0 ? [...strippedParams] : undefined,
      });

      // ── Camada 2: fallback pro próximo modelo? ──
      const shouldFallback = isModelFallbackError(errorType, errorMessage);

      if (!shouldFallback) {
        // Erro não é de modelo (auth, rate limit, 5xx, bug de payload não-deprecable).
        // Nenhuma camada resolve. Bubble up.
        throw new AnthropicCallError({
          message: `Anthropic ${response.status} (${errorType ?? 'unknown'}): ${errorMessage ?? body.slice(0, 200)}`,
          status: response.status,
          body,
          parsed,
          attempts,
          exhausted: false,
        });
      }

      if (isLastModel) {
        // Era erro de modelo + já é o último da cadeia. Fim.
        throw new AnthropicCallError({
          message: `All ${models.length} models failed. Last: ${model} → ${errorType}: ${errorMessage}`,
          status: response.status,
          body,
          parsed,
          attempts,
          exhausted: true,
        });
      }

      // Fallback pro próximo modelo. Log e quebra o while interno.
      const nextModel = models[i + 1];
      console.warn(`[anthropic-fallback] [${requestId}] "${model}" failed (${errorType}): "${errorMessage}" — trying "${nextModel}"`);
      break;
    }
  }

  // Unreachable — o loop externo sempre retorna ou throwa via isLastModel
  throw new Error('[callAnthropicWithFallback] unreachable state');
}
