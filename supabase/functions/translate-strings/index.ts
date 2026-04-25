import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import { validateAuth } from '../_shared/validate-auth.ts';
import {
  recordAiInvocation,
  categorizeError,
  statusFromCategory,
} from '../_shared/recordAiInvocation.ts';
import { extractAnthropicUsage } from '../_shared/extractAnthropicUsage.ts';

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
  const ctx: { user_id: string | null; model_used: string | null; target_language: string | null } =
    { user_id: null, model_used: null, target_language: null };
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;
    ctx.user_id = authResult.userId;

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { strings, targetLanguage, targetLanguageName } = await req.json();
    ctx.target_language = targetLanguage ?? null;

    if (!strings || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'strings and targetLanguage are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const systemPrompt = `You are a professional literary translator for AuExpert, a premium pet care app for dogs and cats.

TRANSLATION RULES:
- Translate from Brazilian Portuguese to ${targetLanguageName ?? targetLanguage}
- The source text is written in an ELITE LITERARY REGISTER — contemplative, sensorial, close, inspired by Clarice Lispector in "Laços de Família". Preserve this register in the target language.
- Third person, impersonal, or passive voice — NEVER first-person pet voice ("I", "me", "my").
- NO performative exclamations ("!"). NO onomatopoeia ("Yay", "Oops", "Hmm", "Eba", "Xi"). NO cutesy pet-to-owner vocatives ("human", "humano", "hein", "tá?"). NO textual sign-off ("— your pet", "— seu pet", "— tu mascota").
- Polite imperative ("Please try again", "Tente novamente"), never casual ("Tenta", "try it").
- Short sentences. One period per idea. Commas for breath, not decoration.
- Warmth comes from observed precision, not from adjective pile-up.
- Preserve all {{variables}} exactly as they are (e.g., {{name}}, {{count}}, {{value}})
- Preserve all special characters and punctuation style
- Keep brand name "AuExpert" unchanged
- Keep technical terms that are universal (Wi-Fi, FAQ, email, backup)
- Adapt idioms naturally — don't translate literally, but keep the Elite register
- For gendered languages, use the most natural/neutral form
- Return ONLY a valid JSON object with the exact same structure as the input
- Do NOT add any explanation, markdown, or text outside the JSON`;

    const cfg = await getAIConfig();
    ctx.model_used = cfg.model_simple;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model: cfg.model_simple,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Translate the following JSON strings to ${targetLanguageName ?? targetLanguage}. Return the translated JSON with the EXACT same keys and structure:\n\n${JSON.stringify(strings, null, 2)}`,
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Anthropic API error:', response.status, errorBody);

      const cat = response.status === 429 ? 'quota_exceeded'
                : response.status === 401 || response.status === 403 ? 'auth_error'
                : response.status >= 500 ? 'api_error' : 'validation_error';
      recordAiInvocation(telemetryClient, {
        function_name: 'translate-strings',
        user_id: ctx.user_id, provider: 'anthropic',
        model_used: ctx.model_used, latency_ms: Date.now() - t0,
        status: statusFromCategory(cat), error_category: cat,
        error_message: `HTTP ${response.status} — ${errorBody.slice(0, 500)}`,
        payload: { target_language: ctx.target_language, http_status: response.status },
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: 'Translation failed', status: response.status }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

    if (!textContent?.text) {
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Parse JSON (handle possible markdown wrapping)
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const translated = JSON.parse(jsonText);

    // Telemetria — sucesso
    const usage = extractAnthropicUsage(aiResponse);
    recordAiInvocation(telemetryClient, {
      function_name: 'translate-strings',
      user_id: ctx.user_id, provider: 'anthropic',
      model_used: usage.model ?? ctx.model_used,
      tokens_in: usage.tokens_in, tokens_out: usage.tokens_out,
      cache_read_tokens: usage.cache_read_tokens, cache_write_tokens: usage.cache_write_tokens,
      latency_ms: Date.now() - t0, status: 'success',
      payload: { target_language: ctx.target_language, keys_count: Object.keys(strings ?? {}).length },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ translations: translated, language: targetLanguage }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('translate-strings error:', err);

    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'translate-strings',
      user_id: ctx.user_id, provider: 'anthropic',
      model_used: ctx.model_used, latency_ms: Date.now() - t0,
      status: statusFromCategory(cat), error_category: cat,
      error_message: String(err).slice(0, 1000),
      payload: { target_language: ctx.target_language },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
