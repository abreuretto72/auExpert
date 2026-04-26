/**
 * scan-professional-document — OCR de documento profissional via Claude Vision.
 *
 * Recebe foto base64 de uma carteira de conselho, diploma, badge ou certificado
 * profissional e retorna campos extraídos (nome, conselho, número, especialidades,
 * etc.). Usado pela tela de cadastro do profissional pra preencher formulário.
 *
 * Decisão arquitetural (2026-04-25): EF SEPARADA do `analyze-pet-photo`
 * (protected file, motor central de análise visual de pets). Padrão CLAUDE.md:
 * "criar arquivo separado que reuse o protegido — não mexer no original".
 *
 * NOTA: Este arquivo é SELF-CONTAINED (não importa de _shared) pra simplificar
 * o deploy e isolar do motor central. Telemetria mínima inline.
 *
 * POST body:
 *   { photo_base64: string, media_type?: string, language?: string }
 *
 * Resposta:
 *   {
 *     document_type, full_name, council_name, council_number, council_uf,
 *     country, specialties[], valid_until, institution, confidence
 *   }
 *
 * Auth: Bearer JWT obrigatório.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_VERSION = '2023-06-01';

// Cadeia de modelos vision — ordem de fallback. Espelha o padrão do app_config.
// Se o primeiro modelo falhar (overload, not_found, etc.), tenta o próximo.
const VISION_MODEL_CHAIN = ['claude-opus-4-7', 'claude-opus-4-6', 'claude-sonnet-4-6'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const SYSTEM_PROMPT = `You are an OCR assistant for professional credential documents.
Extract information from this professional document image.

This could be any type of professional credential worldwide:
veterinary council card, diploma, professional license, badge,
CRMV card (Brazil), AVMA member card (USA), RCVS certificate (UK),
OMVQ (Canada/Quebec), or any other professional document.

CRITICAL RULES:
- Extract ONLY what is clearly visible in the image
- DO NOT infer or invent information not present
- If a field is illegible or absent, return null
- For specialties, only return what is explicitly listed on the document
- For country, return the full English country name (Brazil, United States, United Kingdom, etc.)
- Confidence reflects YOUR certainty about the extraction (0.0 = guessing, 1.0 = perfectly clear)

Return ONLY valid JSON in this exact shape (no markdown, no code fences):

{
  "document_type": "council_card|diploma|license|badge|certificate|other",
  "full_name": "string or null",
  "council_name": "string or null (e.g. CRMV-SP, AVMA, RCVS)",
  "council_number": "string or null (registration number)",
  "council_uf": "string or null (state/province if applicable)",
  "country": "string or null (English name)",
  "specialties": ["array of strings"],
  "valid_until": "YYYY-MM-DD or null",
  "institution": "string or null (university or issuing institution)",
  "confidence": 0.0
}`;

interface VisionAttempt {
  model: string;
  status: number;
  ms: number;
  error?: string;
}

/**
 * Chama Anthropic Messages API com fallback simples entre modelos da cadeia.
 * Não tem self-heal de params (suficiente pra este caso) — se quebrar por
 * `temperature` deprecated etc., o caller pode editar este arquivo.
 */
async function callVisionWithFallback(
  payloadBuilder: (model: string) => Record<string, unknown>,
): Promise<{ response: Response; modelUsed: string; attempts: VisionAttempt[] }> {
  const attempts: VisionAttempt[] = [];
  for (let i = 0; i < VISION_MODEL_CHAIN.length; i++) {
    const model = VISION_MODEL_CHAIN[i];
    const isLast = i === VISION_MODEL_CHAIN.length - 1;
    const start = Date.now();
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify(payloadBuilder(model)),
      });
    } catch (err) {
      attempts.push({ model, status: 0, ms: Date.now() - start, error: String(err) });
      if (isLast) throw new Error(`network error on all models: ${String(err)}`);
      continue;
    }
    const ms = Date.now() - start;
    if (response.ok) {
      return { response, modelUsed: model, attempts };
    }
    const body = await response.text();
    attempts.push({ model, status: response.status, ms, error: body.slice(0, 200) });
    // Só tenta próximo modelo em erros transitórios (5xx) ou not_found.
    // 4xx que não seja 404/429 sobe direto.
    if (!isLast && (response.status >= 500 || response.status === 404 || response.status === 429)) {
      continue;
    }
    if (isLast) {
      throw new Error(`vision failed: ${response.status} ${body.slice(0, 200)}`);
    }
    throw new Error(`vision ${response.status}: ${body.slice(0, 200)}`);
  }
  throw new Error('vision unreachable');
}

/**
 * Telemetria minima: insere uma linha em ai_invocations. Best-effort, nunca lanca.
 */
async function recordInvocation(
  client: ReturnType<typeof createClient>,
  record: {
    user_id: string | null;
    model_used: string | null;
    tokens_in?: number;
    tokens_out?: number;
    cache_read_tokens?: number;
    cache_write_tokens?: number;
    latency_ms: number;
    status: 'success' | 'error' | 'timeout' | 'rate_limited';
    error_category?: string | null;
    error_message?: string | null;
    user_message?: string | null;
    payload?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    await client.from('ai_invocations').insert({
      function_name: 'scan-professional-document',
      provider: 'anthropic',
      image_count: 1,
      ...record,
      error_message: record.error_message ? String(record.error_message).slice(0, 1000) : null,
      user_message: record.user_message ? String(record.user_message).slice(0, 500) : null,
    });
  } catch (e) {
    console.warn('[scan-professional-document] telemetry insert failed:', e);
  }
}

function categorize(err: unknown): { cat: string; status: 'error' | 'timeout' | 'rate_limited' } {
  const msg = String(err).toLowerCase();
  if (msg.includes('timeout') || msg.includes('timed out')) return { cat: 'timeout', status: 'timeout' };
  if (msg.includes('rate') && msg.includes('limit')) return { cat: 'quota_exceeded', status: 'rate_limited' };
  if (msg.includes('network') || msg.includes('fetch failed')) return { cat: 'network', status: 'error' };
  return { cat: 'unknown', status: 'error' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return jsonResp({ error: 'method not allowed' }, 405);

  const t0 = Date.now();
  const ctx: { user_id: string | null; model_used: string | null } = {
    user_id: null,
    model_used: null,
  };
  const telemetry = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user } } = await anon.auth.getUser(token);
    if (!user) return jsonResp({ error: 'unauthorized' }, 401);
    ctx.user_id = user.id;

    if (!ANTHROPIC_API_KEY) {
      return jsonResp({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
    }

    // Body
    const { photo_base64, media_type: inputMediaType } =
      await req.json().catch(() => ({}));

    if (typeof photo_base64 !== 'string' || photo_base64.length < 100) {
      return jsonResp({ error: 'photo_base64 required' }, 400);
    }

    let mediaType = inputMediaType ?? 'image/jpeg';
    if (photo_base64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (photo_base64.startsWith('iVBOR')) mediaType = 'image/png';
    else if (photo_base64.startsWith('UklGR')) mediaType = 'image/webp';

    const reqId = Math.random().toString(36).slice(2, 10);

    let response: Response;
    try {
      const callResult = await callVisionWithFallback((model) => ({
        model,
        max_tokens: 1500,
        system: [
          { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        ],
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: photo_base64 } },
            { type: 'text', text: 'Extract the credential data from this document.' },
          ],
        }],
      }));
      response = callResult.response;
      ctx.model_used = callResult.modelUsed;
    } catch (callErr) {
      console.error(`[scan-professional-document] [${reqId}] call failed:`, callErr);
      const { cat, status } = categorize(callErr);
      recordInvocation(telemetry, {
        user_id: ctx.user_id,
        model_used: ctx.model_used,
        latency_ms: Date.now() - t0,
        status,
        error_category: cat,
        error_message: String(callErr),
        user_message: 'Não foi possível ler o documento. Tente novamente com mais luz.',
      }).catch(() => {});
      return jsonResp({ error: 'scan failed' }, 502);
    }

    const aiResponse = await response.json();
    const usageRaw = aiResponse.usage ?? {};
    const usage = {
      tokens_in: typeof usageRaw.input_tokens === 'number' ? usageRaw.input_tokens : 0,
      tokens_out: typeof usageRaw.output_tokens === 'number' ? usageRaw.output_tokens : 0,
      cache_read_tokens: typeof usageRaw.cache_read_input_tokens === 'number' ? usageRaw.cache_read_input_tokens : 0,
      cache_write_tokens: typeof usageRaw.cache_creation_input_tokens === 'number' ? usageRaw.cache_creation_input_tokens : 0,
    };
    const modelFromResp = typeof aiResponse.model === 'string' ? aiResponse.model : ctx.model_used;

    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    if (!textContent?.text) {
      recordInvocation(telemetry, {
        user_id: ctx.user_id,
        model_used: modelFromResp,
        ...usage,
        latency_ms: Date.now() - t0,
        status: 'error',
        error_category: 'invalid_response',
        error_message: 'empty AI response',
      }).catch(() => {});
      return jsonResp({ error: 'empty response' }, 502);
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let extracted;
    try {
      extracted = JSON.parse(jsonText);
    } catch (parseErr) {
      recordInvocation(telemetry, {
        user_id: ctx.user_id,
        model_used: modelFromResp,
        ...usage,
        latency_ms: Date.now() - t0,
        status: 'error',
        error_category: 'invalid_response',
        error_message: `parse failed: ${parseErr}`,
        user_message: 'Documento ilegível. Tente outra foto.',
      }).catch(() => {});
      return jsonResp({ error: 'invalid JSON from AI', preview: jsonText.slice(0, 200) }, 502);
    }

    recordInvocation(telemetry, {
      user_id: ctx.user_id,
      model_used: modelFromResp,
      ...usage,
      latency_ms: Date.now() - t0,
      status: 'success',
      payload: {
        document_type: extracted.document_type ?? 'unknown',
        confidence: extracted.confidence ?? null,
        request_id: reqId,
      },
    }).catch(() => {});

    return jsonResp({
      document_type: extracted.document_type ?? 'other',
      full_name: extracted.full_name ?? null,
      council_name: extracted.council_name ?? null,
      council_number: extracted.council_number ?? null,
      council_uf: extracted.council_uf ?? null,
      country: extracted.country ?? null,
      specialties: Array.isArray(extracted.specialties) ? extracted.specialties : [],
      valid_until: extracted.valid_until ?? null,
      institution: extracted.institution ?? null,
      confidence: typeof extracted.confidence === 'number' ? extracted.confidence : 0,
    });
  } catch (err) {
    console.error('[scan-professional-document] unhandled:', err);
    const { cat, status } = categorize(err);
    recordInvocation(telemetry, {
      user_id: ctx.user_id,
      model_used: ctx.model_used,
      latency_ms: Date.now() - t0,
      status,
      error_category: cat,
      error_message: String(err),
    }).catch(() => {});
    return jsonResp({ error: 'internal error', message: String(err) }, 500);
  }
});
