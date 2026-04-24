/**
 * validate-ai-model Edge Function
 *
 * Valida se um ou mais modelos da Anthropic estão respondendo corretamente
 * ANTES de virarem ativos em app_config. Usado pelo RPC `set_ai_model`
 * (ver migration) pra bloquear UPDATEs com string inválida, typo, modelo
 * sem acesso, ou contrato quebrado.
 *
 * Input:  { "models": ["claude-opus-4-7", "claude-opus-4-6"] }
 * Output: { "valid": true, "results": [{model, ok, error?, ms}] }
 *
 * Teste feito por modelo: Messages API com 1 token de saída, prompt mínimo.
 * Custo por validação: <$0.001 por modelo. Latência: ~500ms por modelo.
 *
 * Auth: service_role only (chamado do DB via net.http_post). Sem JWT check.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_VERSION = '2023-06-01';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResult {
  model: string;
  ok: boolean;
  status?: number;
  error_type?: string;
  error_message?: string;
  ms: number;
}

async function testModel(model: string): Promise<ValidationResult> {
  const start = Date.now();
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ok' }],
      }),
    });
    const ms = Date.now() - start;

    if (response.ok) {
      return { model, ok: true, status: 200, ms };
    }

    const body = await response.text();
    let parsed: { error?: { type?: string; message?: string } } | null = null;
    try { parsed = JSON.parse(body); } catch {}

    return {
      model,
      ok: false,
      status: response.status,
      error_type: parsed?.error?.type ?? 'unknown',
      error_message: parsed?.error?.message ?? body.slice(0, 200),
      ms,
    };
  } catch (err) {
    return {
      model,
      ok: false,
      error_type: 'network',
      error_message: String(err),
      ms: Date.now() - start,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Só aceita chamada com service_role key no header — evita abuso.
    const auth = req.headers.get('authorization') ?? '';
    if (!auth.includes(SERVICE_ROLE_KEY)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: service_role required' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { models } = await req.json();
    if (!Array.isArray(models) || models.length === 0) {
      return new Response(
        JSON.stringify({ error: 'models must be a non-empty array of strings' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Limita a 5 modelos por chamada pra evitar abuso ou custo alto.
    if (models.length > 5) {
      return new Response(
        JSON.stringify({ error: 'max 5 models per validation call' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Valida TODOS em paralelo pra reduzir latência total.
    const results = await Promise.all(models.map((m: string) => testModel(String(m))));
    const allOk = results.every(r => r.ok);

    return new Response(
      JSON.stringify({ valid: allOk, results }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
