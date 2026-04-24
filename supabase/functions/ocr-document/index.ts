import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import { validateAuth } from '../_shared/validate-auth.ts';
import { callAnthropicWithFallback, AnthropicCallError } from '../_shared/callAnthropicWithFallback.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const t0 = Date.now();
  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { photo_base64, document_type, language = 'pt-BR', media_type: inputMediaType } = await req.json();

    if (!photo_base64) {
      return new Response(
        JSON.stringify({ error: 'photo_base64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    let mediaType = inputMediaType ?? 'image/jpeg';
    if (photo_base64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (photo_base64.startsWith('iVBOR')) mediaType = 'image/png';
    else if (photo_base64.startsWith('UklGR')) mediaType = 'image/webp';

    const LANG_NAMES: Record<string, string> = {
      'pt-BR': 'Portuguese (Brazil)', 'pt': 'Portuguese (Brazil)',
      'en': 'English', 'en-US': 'English',
      'es': 'Spanish', 'fr': 'French', 'de': 'German',
    };
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    const schemas: Record<string, string> = {
      vaccine: `{
  "vaccines": [{
    "name": "vaccine name",
    "laboratory": "lab name or null",
    "batch_number": "batch/lot number or null",
    "date_administered": "YYYY-MM-DD",
    "next_due_date": "YYYY-MM-DD or null",
    "dose_number": "1st dose, 2nd dose, booster, etc or null",
    "veterinarian": "vet name or null",
    "clinic": "clinic name or null",
    "notes": "any notes or null"
  }]
}`,
      exam: `{
  "exams": [{
    "name": "exam name",
    "date": "YYYY-MM-DD",
    "status": "normal|attention|critical",
    "results": [{ "item": "parameter", "value": "result", "reference": "ref range", "normal": true|false }],
    "laboratory": "lab name or null",
    "veterinarian": "vet name or null",
    "notes": "any notes or null"
  }]
}`,
      prescription: `{
  "medications": [{
    "name": "medication name + dosage",
    "type": "category (antibiotic, anti-inflammatory, supplement, etc)",
    "frequency": "how often (daily, 2x/day, monthly, etc)",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD or null if continuous",
    "veterinarian": "vet name or null",
    "notes": "instructions, observations or null"
  }]
}`,
      general: `{
  "type": "vaccine|exam|prescription|consultation|surgery",
  "data": { ... extracted fields ... }
}`,
    };

    const schema = schemas[document_type] ?? schemas.general;

    // System prompt — 100% estático (sem interpolação). Fica cacheado pela Anthropic
    // por 5 min via cache_control. Idioma saiu daqui e foi pro user prompt, pra não
    // invalidar o cache entre tutores com locales diferentes.
    const systemPrompt = `You are a veterinary document OCR specialist for AuExpert.
Extract ALL text and data from the document photo with maximum accuracy.
Return ONLY valid JSON matching the schema. No markdown, no explanation.
Dates must be in YYYY-MM-DD format. Convert any date format to this.
If a field is not visible/readable, set it to null.`;

    const userPrompt = `Extract data from this ${document_type ?? 'veterinary'} document photo.
Return JSON with this exact structure:
${schema}

Respond in ${lang}.`;

    const cfg = await getAIConfig();
    const t1 = Date.now();
    const reqId = Math.random().toString(36).slice(2, 10);
    const diagClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let response: Response;
    try {
      const callResult = await callAnthropicWithFallback({
        models: cfg.model_vision_chain,
        apiKey: ANTHROPIC_API_KEY,
        anthropicVersion: cfg.anthropic_version,
        requestId: reqId,
        diagClient,
        functionName: 'ocr-document',
        buildPayload: (model) => ({
          model,
          max_tokens: 1500,
          // temperature removido: Opus 4.7+ deprecou. Self-heal cobre o caso
          // legado, mas deixar o campo só gera latência extra de retry.
          system: [
            { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: photo_base64 } },
              { type: 'text', text: userPrompt },
            ],
          }],
        }),
      });
      response = callResult.response;
    } catch (callErr) {
      const err = callErr as AnthropicCallError;
      console.error(`[ocr-document] [${reqId}] call failed:`, err.message);
      return new Response(
        JSON.stringify({ error: 'OCR failed', status: err.status ?? 502, details: err.body }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const t2 = Date.now();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: 'Empty response' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText);
    const t3 = Date.now();

    console.log('[ocr-document] timing', JSON.stringify({
      boot_ms: t1 - t0,
      ai_ms: t2 - t1,
      post_ms: t3 - t2,
      total_ms: t3 - t0,
      cache_read: aiResponse.usage?.cache_read_input_tokens ?? 0,
      cache_write: aiResponse.usage?.cache_creation_input_tokens ?? 0,
      input_tokens: aiResponse.usage?.input_tokens ?? 0,
      output_tokens: aiResponse.usage?.output_tokens ?? 0,
      doc_type: document_type ?? 'general',
    }));

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[ocr-document] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
