/**
 * resilience.test.ts — testes unitários exaustivos do core de resiliência.
 *
 * Cobre:
 *   1. callAnthropicWithFallback — 10 cenários (happy path + edge cases)
 *   2. resolveModelChain bucketing — determinismo + distribuição
 *
 * Rodar: deno test --allow-net --allow-env --allow-read supabase/functions/_tests/resilience.test.ts
 */

import { assertEquals, assertRejects, assertExists, assertAlmostEquals } from "jsr:@std/assert";
import {
  callAnthropicWithFallback,
  AnthropicCallError,
  type FallbackAttempt,
} from "../_shared/callAnthropicWithFallback.ts";

// ─── Fetch mock infrastructure ────────────────────────────────────────────

type MockResponse = {
  status: number;
  body: unknown;
};

let fetchCalls: Array<{ model: string; hasParam: Record<string, boolean> }> = [];
let mockResponses: MockResponse[] = [];
let mockResponseIndex = 0;

const originalFetch = globalThis.fetch;

function installMockFetch() {
  fetchCalls = [];
  mockResponseIndex = 0;
  globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const body = init?.body ? JSON.parse(init.body as string) : {};
    const model = body.model as string;
    fetchCalls.push({
      model,
      hasParam: {
        temperature: 'temperature' in body,
        max_tokens: 'max_tokens' in body,
        system: 'system' in body,
      },
    });
    const resp = mockResponses[mockResponseIndex++];
    if (!resp) throw new Error(`[mock] exhausted mock responses at call ${mockResponseIndex}`);
    return new Response(JSON.stringify(resp.body), { status: resp.status });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function mockOk() {
  return { status: 200, body: { content: [{ type: 'text', text: 'ok' }] } };
}

function mockAnthropicError(status: number, type: string, message: string): MockResponse {
  return {
    status,
    body: { type: 'error', error: { type, message } },
  };
}

const BASE_OPTS = {
  apiKey: 'test-key',
  anthropicVersion: '2023-06-01',
  requestId: 'test-req',
  buildPayload: (model: string) => ({
    model,
    max_tokens: 100,
    temperature: 0,
    system: [{ type: 'text', text: 'test' }],
    messages: [{ role: 'user', content: 'hi' }],
  }),
};

// ─── 1. HAPPY PATH — primeiro modelo funciona ────────────────────────────

Deno.test("happy path: first model returns 200", async () => {
  installMockFetch();
  mockResponses = [mockOk()];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['claude-opus-4-7', 'claude-opus-4-6'],
  });

  assertEquals(result.modelUsed, 'claude-opus-4-7', 'used primary model');
  assertEquals(result.attempts.length, 0, 'no failed attempts');
  assertEquals(result.strippedParams.length, 0, 'no params stripped');
  assertEquals(fetchCalls.length, 1, 'exactly 1 HTTP call');
  restoreFetch();
});

// ─── 2. FALLBACK — not_found_error no primário, sucesso no secundário ────

Deno.test("fallback: not_found_error → next model succeeds", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(404, 'not_found_error', 'model not found'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['bogus-model', 'claude-opus-4-7'],
  });

  assertEquals(result.modelUsed, 'claude-opus-4-7', 'used fallback');
  assertEquals(result.attempts.length, 1, '1 failed attempt');
  assertEquals(result.attempts[0].error_type, 'not_found_error');
  assertEquals(fetchCalls.length, 2, '2 HTTP calls');
  restoreFetch();
});

// ─── 3. FALLBACK — permission_denied idem ────────────────────────────────

Deno.test("fallback: permission_denied → next model", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(403, 'permission_denied', 'no access to this model'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['restricted-model', 'claude-opus-4-6'],
  });

  assertEquals(result.modelUsed, 'claude-opus-4-6');
  assertEquals(result.attempts[0].error_type, 'permission_denied');
  restoreFetch();
});

// ─── 4. FALLBACK — overloaded_error idem ─────────────────────────────────

Deno.test("fallback: overloaded_error → next model", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(529, 'overloaded_error', 'overloaded'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['busy-model', 'spare-model'],
  });

  assertEquals(result.modelUsed, 'spare-model');
  restoreFetch();
});

// ─── 5. SELF-HEAL — temperature deprecated, strippa e retry no MESMO modelo

Deno.test("self-heal: deprecated param → strip and retry SAME model", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(400, 'invalid_request_error', '`temperature` is deprecated for this model.'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['claude-opus-4-7', 'claude-opus-4-6'],
  });

  assertEquals(result.modelUsed, 'claude-opus-4-7', 'SAME model (not fallback)');
  assertEquals(result.strippedParams, ['temperature'], 'temperature stripped');
  assertEquals(fetchCalls.length, 2, '2 HTTP calls');
  assertEquals(fetchCalls[0].model, 'claude-opus-4-7');
  assertEquals(fetchCalls[0].hasParam.temperature, true, 'first had temperature');
  assertEquals(fetchCalls[1].hasParam.temperature, false, 'retry stripped it');
  restoreFetch();
});

// ─── 6. SELF-HEAL — múltiplos params deprecados em sequência ─────────────

Deno.test("self-heal: multiple deprecated params, all stripped", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(400, 'invalid_request_error', '`temperature` is deprecated for this model.'),
    mockAnthropicError(400, 'invalid_request_error', '`top_p` is not supported for this model'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['claude-opus-4-7'],
    buildPayload: (model) => ({
      model,
      max_tokens: 100,
      temperature: 0,
      top_p: 0.9,
      system: [], messages: [],
    }),
  });

  assertEquals(result.modelUsed, 'claude-opus-4-7');
  assertEquals(result.strippedParams.sort(), ['temperature', 'top_p'].sort());
  assertEquals(fetchCalls.length, 3);
  restoreFetch();
});

// ─── 7. SELF-HEAL — limite de 3 tentativas por modelo ────────────────────

Deno.test("self-heal: max 3 attempts per model, then next", async () => {
  installMockFetch();
  // 3 params deprecados em seq pro model A → esgota self-heal → fallback pro B
  mockResponses = [
    mockAnthropicError(400, 'invalid_request_error', '`p1` is deprecated'),
    mockAnthropicError(400, 'invalid_request_error', '`p2` is deprecated'),
    mockAnthropicError(400, 'invalid_request_error', '`p3` is deprecated'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['model-a', 'model-b'],
    buildPayload: (model) => ({
      model, max_tokens: 100,
      p1: 1, p2: 2, p3: 3, p4: 4,
      system: [], messages: [],
    }),
  });

  // The 4th attempt on model-a won't happen because max is 3 → falls through.
  // But the response for p3 was invalid_request — since it mentions a deprecated
  // param it's treated as "tried to self-heal but hit limit" → falls back to model-b
  assertEquals(result.modelUsed, 'model-b', 'fell back after self-heal exhausted');
  restoreFetch();
});

// ─── 8. BUBBLE UP — authentication_error não cai em fallback ─────────────

Deno.test("bubble up: authentication_error throws immediately (no fallback)", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(401, 'authentication_error', 'invalid x-api-key'),
    // Se caísse em fallback, faria outra call — mas não deve
  ];

  await assertRejects(
    () => callAnthropicWithFallback({
      ...BASE_OPTS,
      models: ['any-model', 'another-model'],
    }),
    AnthropicCallError,
    undefined,
    'should throw AnthropicCallError',
  );

  assertEquals(fetchCalls.length, 1, 'only 1 call made (no fallback on auth)');
  restoreFetch();
});

// ─── 9. BUBBLE UP — rate_limit_error não cai em fallback ─────────────────

Deno.test("bubble up: rate_limit_error throws (don't burn quota on another model)", async () => {
  installMockFetch();
  mockResponses = [mockAnthropicError(429, 'rate_limit_error', 'too many')];

  await assertRejects(
    () => callAnthropicWithFallback({
      ...BASE_OPTS,
      models: ['a', 'b', 'c'],
    }),
    AnthropicCallError,
  );

  assertEquals(fetchCalls.length, 1);
  restoreFetch();
});

// ─── 10. EXHAUSTION — todos os modelos falham, throw com exhausted=true ──

Deno.test("exhaustion: all models fail → throw exhausted", async () => {
  installMockFetch();
  mockResponses = [
    mockAnthropicError(404, 'not_found_error', 'model A not found'),
    mockAnthropicError(404, 'not_found_error', 'model B not found'),
    mockAnthropicError(404, 'not_found_error', 'model C not found'),
  ];

  try {
    await callAnthropicWithFallback({
      ...BASE_OPTS,
      models: ['a', 'b', 'c'],
    });
    throw new Error('should have thrown');
  } catch (e) {
    const err = e as AnthropicCallError;
    assertEquals(err.exhausted, true, 'exhausted flag set');
    assertEquals(err.attempts.length, 3, '3 attempts recorded');
    assertEquals(fetchCalls.length, 3, 'tried all 3 models');
  }
  restoreFetch();
});

// ─── 11. NETWORK ERROR — bubble up, não tenta fallback ───────────────────

Deno.test("network error: bubble up, do not try next model", async () => {
  fetchCalls = [];
  mockResponseIndex = 0;
  globalThis.fetch = async () => {
    fetchCalls.push({ model: 'dns-fail', hasParam: {} });
    throw new Error('ENETUNREACH');
  };

  await assertRejects(
    () => callAnthropicWithFallback({
      ...BASE_OPTS,
      models: ['a', 'b'],
    }),
    AnthropicCallError,
  );

  assertEquals(fetchCalls.length, 1, 'only 1 call made (no fallback on network err)');
  restoreFetch();
});

// ─── 12. EMPTY MODELS — throws imediato ──────────────────────────────────

Deno.test("guard: empty models array throws", async () => {
  await assertRejects(
    () => callAnthropicWithFallback({
      ...BASE_OPTS,
      models: [],
    }),
    Error,
    'empty models array',
  );
});

// ─── 13. UNSTRIPPABLE — não strippa `model` ou `messages` ────────────────

Deno.test("self-heal: won't strip core params (model, messages)", async () => {
  installMockFetch();
  // Simulação absurda: Anthropic dizendo `messages` deprecated.
  // Helper NÃO deve strippar (iria quebrar). Deve cair no próximo modelo.
  mockResponses = [
    mockAnthropicError(400, 'invalid_request_error', '`messages` is deprecated for this model.'),
    mockOk(),
  ];

  const result = await callAnthropicWithFallback({
    ...BASE_OPTS,
    models: ['a', 'b'],
  });

  // Se tivesse strippado `messages`, faria retry no mesmo 'a'. Se não strippou,
  // cai pro 'b'. Comportamento correto: NÃO strippa → cai pro b.
  assertEquals(result.modelUsed, 'b', 'did not strip core param, fell back');
  restoreFetch();
});

// ═══════════════════════════════════════════════════════════════════════════
// Part 2 — resolveModelChain bucketing tests
// Importamos a função via `ai-config.ts`
// ═══════════════════════════════════════════════════════════════════════════

import { resolveModelChain, type AIConfig } from "../_shared/ai-config.ts";

function makeCfg(opts: {
  currentChain: string[];
  previousChain?: string[] | null;
  percent?: number;
}): AIConfig {
  return {
    model_classify: opts.currentChain[0],
    model_vision: opts.currentChain[0],
    model_chat: opts.currentChain[0],
    model_narrate: opts.currentChain[0],
    model_insights: opts.currentChain[0],
    model_simple: opts.currentChain[0],
    model_classify_chain: opts.currentChain,
    model_vision_chain: opts.currentChain,
    model_chat_chain: opts.currentChain,
    model_narrate_chain: opts.currentChain,
    model_insights_chain: opts.currentChain,
    model_simple_chain: opts.currentChain,
    rollout: {
      ai_model_vision: {
        chain_current: opts.currentChain,
        chain_previous: opts.previousChain ?? null,
        percent: opts.percent ?? 100,
      },
    },
    timeout_ms: 30000,
    anthropic_version: '2023-06-01',
  };
}

// ─── 14. Sem user_id → usa current ──────────────────────────────────────

Deno.test("resolve: no userId → returns current chain", () => {
  const cfg = makeCfg({ currentChain: ['new-model'], previousChain: ['old-model'], percent: 5 });
  const chain = resolveModelChain(cfg, 'vision');
  assertEquals(chain, ['new-model'], 'no userId = current chain (ignore rollout)');
});

// ─── 15. Com user_id mas percent=100 → current ──────────────────────────

Deno.test("resolve: percent=100 → everyone gets current", () => {
  const cfg = makeCfg({ currentChain: ['new-model'], previousChain: ['old-model'], percent: 100 });
  for (let i = 0; i < 20; i++) {
    const chain = resolveModelChain(cfg, 'vision', `user-${i}`);
    assertEquals(chain, ['new-model'], `user ${i} should get current`);
  }
});

// ─── 16. Com percent=0 → todos pegam previous ───────────────────────────

Deno.test("resolve: percent=0 → everyone gets previous (rollback)", () => {
  const cfg = makeCfg({ currentChain: ['broken-new'], previousChain: ['safe-old'], percent: 0 });
  for (let i = 0; i < 20; i++) {
    const chain = resolveModelChain(cfg, 'vision', `user-${i}`);
    assertEquals(chain, ['safe-old'], `user ${i} should get previous`);
  }
});

// ─── 17. Determinismo — mesmo userId sempre retorna mesma chain ─────────

Deno.test("resolve: deterministic — same userId always same chain", () => {
  const cfg = makeCfg({ currentChain: ['new'], previousChain: ['old'], percent: 50 });
  const userId = 'stable-user-id-xyz';
  const first = resolveModelChain(cfg, 'vision', userId);
  for (let i = 0; i < 100; i++) {
    const again = resolveModelChain(cfg, 'vision', userId);
    assertEquals(again, first, 'determinism broken');
  }
});

// ─── 18. Distribuição — percent=10 com 1000 users → ~10% no current ─────

Deno.test("resolve: distribution approximates rollout_percent across many users", () => {
  const cfg = makeCfg({ currentChain: ['new'], previousChain: ['old'], percent: 10 });
  let countNew = 0;
  const total = 1000;
  for (let i = 0; i < total; i++) {
    const chain = resolveModelChain(cfg, 'vision', `user-${i}-some-uuid`);
    if (chain[0] === 'new') countNew++;
  }
  const pct = (countNew / total) * 100;
  // Hash bucket não é perfeitamente uniforme — margem de 4 pontos percentuais OK
  assertAlmostEquals(pct, 10, 4, `expected ~10%, got ${pct.toFixed(1)}%`);
});

// ─── 19. percent=50 → ~metade em cada ───────────────────────────────────

Deno.test("resolve: percent=50 splits roughly half", () => {
  const cfg = makeCfg({ currentChain: ['new'], previousChain: ['old'], percent: 50 });
  let countNew = 0;
  const total = 1000;
  for (let i = 0; i < total; i++) {
    const chain = resolveModelChain(cfg, 'vision', `user-${i}-test`);
    if (chain[0] === 'new') countNew++;
  }
  const pct = (countNew / total) * 100;
  assertAlmostEquals(pct, 50, 5, `expected ~50%, got ${pct.toFixed(1)}%`);
});

// ─── 20. previous ausente → sempre current mesmo com percent baixo ──────

Deno.test("resolve: no previous chain → always current (safety net)", () => {
  const cfg = makeCfg({ currentChain: ['solo'], previousChain: null, percent: 5 });
  for (let i = 0; i < 50; i++) {
    const chain = resolveModelChain(cfg, 'vision', `u${i}`);
    assertEquals(chain, ['solo'], 'fallback to current when previous is null');
  }
});
