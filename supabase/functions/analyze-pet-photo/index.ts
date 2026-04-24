import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAIConfig } from '../_shared/ai-config.ts';
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildPetSystemContext } from '../_shared/petContext.ts';
import { callAnthropicWithFallback, AnthropicCallError } from '../_shared/callAnthropicWithFallback.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // Auth enforcement — verify_jwt disabled at gateway (ES256/HS256 mismatch);
    // validate here via getUser() which handles ES256 correctly via Auth server
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { photo_base64, species, language = 'pt-BR', media_type: inputMediaType, pet_name, pet_breed, pet_sex } = await req.json();

    if (!photo_base64) {
      return new Response(
        JSON.stringify({ error: 'photo_base64 is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Detectar media_type pelo header base64
    let mediaType = inputMediaType ?? 'image/jpeg';
    if (photo_base64.startsWith('/9j/')) mediaType = 'image/jpeg';
    else if (photo_base64.startsWith('iVBOR')) mediaType = 'image/png';
    else if (photo_base64.startsWith('UklGR')) mediaType = 'image/webp';
    console.log('[analyze-pet-photo] mediaType:', mediaType, 'base64 length:', photo_base64.length);

    const LANG_NAMES: Record<string, string> = {
      'pt-BR': 'Portuguese (Brazil)', 'pt': 'Portuguese (Brazil)',
      'en': 'English', 'en-US': 'English',
      'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
      'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
      'zh-Hant': 'Chinese (Traditional)', 'ar': 'Arabic', 'hi': 'Hindi',
      'ru': 'Russian', 'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish',
      'sv': 'Swedish', 'th': 'Thai', 'vi': 'Vietnamese', 'id': 'Indonesian',
      'uk': 'Ukrainian', 'cs': 'Czech', 'ro': 'Romanian', 'he': 'Hebrew',
    };
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    // System prompt: 100% estático (frameworks clínicos + JSON schema + requirements).
    // Todo conteúdo fixo vai aqui para maximizar o bloco cacheável. O `${lang}` foi
    // movido para a user message (é a única coisa que varia além da foto). Com ~1800
    // tokens estáticos, ultrapassa o mínimo de 1024 tokens do prompt caching
    // (Sonnet) → hit de cache em fotos subsequentes corta input tokens em ~90% e
    // reduz TTFT. Primeira chamada paga +25% (write), seguintes pagam −90% (read).
    const systemPrompt = `You are a clinical veterinary AI analyst for AuExpert.
Apply these evidence-based frameworks when analyzing photos:

PET HEALTH: Use BCS 1-9 (WSAVA). Assess pain via UNESP-Botucatu signals (orbital tightening, ear flattening, muzzle tension, hunched posture). Evaluate coat/skin primary lesions (macule, papule, pustule, plaque) and secondary (crust, scale, erosion, ulcer). Eye discharge: serous=clear, mucoid=white/gray, mucopurulent=yellow/green.

FECES: Apply Purina Fecal Score 1-7. Score 1-2=constipation, 3-4=normal, 5=soft, 6-7=diarrhea. Color: brown=normal, yellow/green=rapid transit or infection, black/tarry=upper GI bleeding URGENT, red=lower GI bleeding URGENT, white/gray=pancreatic or liver issue. Check for parasites (roundworms=spaghetti-like, tapeworm=rice grains).

WOUNDS: Classify as superficial/partial/full thickness. Infection signs: erythema, edema, purulent exudate, necrosis. Healing stages: inflammatory 0-4d, proliferative 4-21d, remodeling over 21d.

PLANTS/FOOD: Cross-reference ASPCA Animal Poison Control Center. Identify genus+common name. Note toxicity mechanism: GI irritant, hepatotoxic, nephrotoxic, cardiotoxic, neurotoxic.

Use hedged language: "consistent with", "suggestive of", "warrants veterinary evaluation".
NEVER diagnose. Return ONLY valid JSON. No markdown.

Return this exact JSON structure with real values (not type annotations):

{
  "identification": {
    "species": { "value": "dog|cat", "confidence": 0.0 },
    "breed": { "primary": "Labrador Retriever", "confidence": 0.8, "is_mixed": false, "secondary_breeds": null },
    "size": "medium",
    "age_category": "adult",
    "estimated_age_months": 36,
    "estimated_weight_kg": 10.5,
    "sex": { "value": "female", "confidence": 0.7 },
    "coat": { "color": "golden", "pattern": "solid", "quality": "healthy", "length": "short" }
  },
  "health": {
    "body_condition_score": 5,
    "body_condition": "ideal",
    "skin_coat": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "eyes": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "ears": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "mouth_teeth": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "posture_body": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0 }],
    "nails": { "observation": "length appropriate", "needs_trimming": false },
    "hygiene": "clean",
    "visible_parasites": false,
    "visible_lumps": false
  },
  "mood": {
    "primary": "ecstatic|happy|calm|tired|anxious|sad|playful|sick|alert|fearful|submissive",
    "confidence": 0.0,
    "signals": ["string"]
  },
  "environment": {
    "location": "home_indoor|home_outdoor|park|beach|clinic|car|street|unknown",
    "accessories": [{ "type": "collar|leash|harness|clothes|muzzle|id_tag|other", "description": "string" }],
    "other_animals": false,
    "visible_risks": null
  },
  "alerts": [{ "message": "string", "severity": "info|attention|concern", "category": "health|safety|care|toxicity" }],
  "disclaimer": "string",
  "description": "REQUIRED — never null. Clinical interpretation in 2-3 sentences. For pets: BCS assessment, pain signals, coat/skin condition, behavioral state. For feces: Bristol score, color significance, parasite risk. For wounds: classification, infection signs, urgency. For plants/food: toxicity risk with mechanism. For environment: safety hazards. Always actionable for the tutor.",
  "toxicity_check": {
    "has_toxic_items": false,
    "items": null
  },
  "sources": ["WSAVA Body Condition Score Guidelines (2021)"]
}

Requirements:
- description: 2-3 actionable sentences with clinical interpretation. NEVER null.
- For feces: include Bristol score, color assessment, parasite check.
- For wounds: include classification, infection signs, urgency level.
- For plants/food: include ASPCA toxicity assessment.
- For pets: include BCS score, pain signals, behavioral state.
- toxicity_check: always fill, even if has_toxic_items is false.
- sources: list up to 3 scientific references actually used. NEVER null.
- alerts: add if any finding warrants attention or concern.`;

    const petIdentity = [pet_name, pet_breed].filter(Boolean).join(', ');
    const petContextSuffix = petIdentity ? ` (${petIdentity})` : '';
    // petSexContext: gender rules prepended to user prompt so the static system prompt
    // remains fully cacheable (cache_control: ephemeral). Per-request data stays in
    // the user message, not the system message.
    const petSexContext = pet_name
      ? buildPetSystemContext({
          name: pet_name,
          sex: pet_sex ?? 'unknown',
          species: species ?? 'dog',
          locale: language ?? 'pt-BR',
        })
      : '';
    // User prompt agora é só o que varia: espécie, nome/raça do pet, idioma.
    // Tudo o mais (frameworks clínicos + schema + requirements) está cacheado no system.
    const userPrompt = `${petSexContext ? petSexContext + '\n\n' : ''}Perform a clinical veterinary assessment of this photo for a ${species === 'dog' ? (language === 'pt-BR' ? 'cão' : 'dog') : (language === 'pt-BR' ? 'gato' : 'cat')}${petContextSuffix}.
Write all text fields in ${lang}.`;

    const cfg = await getAIConfig();

    // ── Diagnostic tracing ────────────────────────────────────────────────
    // Short request ID pra casar logs do EF com o erro que o cliente vê.
    const reqId = Math.random().toString(36).slice(2, 10);
    const t0 = Date.now();
    console.log(`[analyze-pet-photo] [${reqId}] start | user=${user.id.slice(0, 8)} | species=${species} | lang=${lang} | mediaType=${mediaType} | photoKB=${Math.round(photo_base64.length * 0.75 / 1024)}`);
    console.log(`[analyze-pet-photo] [${reqId}] config | chain=[${cfg.model_vision_chain.join(', ')}] | anthropic_version="${cfg.anthropic_version}"`);
    console.log(`[analyze-pet-photo] [${reqId}] prompts | system=${systemPrompt.length}chars | user=${userPrompt.length}chars`);

    const diagClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Chamada com fallback automático: tenta cada modelo da cadeia em ordem.
    // Se o primário (Opus 4.7) falhar com erro de modelo, cai pro secundário
    // (Opus 4.6), depois Sonnet 4.6. O usuário nunca vê 502 por falha de modelo.
    let callResult;
    try {
      callResult = await callAnthropicWithFallback({
        models: cfg.model_vision_chain,
        apiKey: ANTHROPIC_API_KEY,
        anthropicVersion: cfg.anthropic_version,
        requestId: reqId,
        diagClient,
        functionName: 'analyze-pet-photo',
        buildPayload: (model) => ({
          model,
          max_tokens: 2500,
          // temperature removido: Opus 4.7+ deprecou esse parâmetro (retorna 400
          // com `invalid_request_error`). O prompt pede JSON estruturado, então
          // o determinismo vem da estrutura do schema, não da temperatura.
          // Prompt caching: o system inteiro é estático (~1800 tokens) → cache hit
          // em fotos subsequentes corta input tokens em ~90% e reduz TTFT.
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
    } catch (callErr) {
      // Toda a cadeia falhou, OU erro não-model (auth/rate_limit/network).
      // Log completo na tabela e 502 pro cliente.
      const err = callErr as AnthropicCallError;
      console.error(`[analyze-pet-photo] [${reqId}] call failed | exhausted=${err.exhausted ?? false} | attempts=${err.attempts?.length ?? 0}:`, err.message);

      try {
        await diagClient.from('edge_function_diag_logs').insert({
          function_name: 'analyze-pet-photo',
          request_id: reqId,
          level: 'error',
          message: err.message ?? 'Anthropic call failed',
          payload: {
            status: err.status ?? null,
            body_raw: err.body ?? null,
            body_parsed: err.parsed ?? null,
            attempts: err.attempts ?? [],
            exhausted: err.exhausted ?? false,
            chain: cfg.model_vision_chain,
            anthropic_version: cfg.anthropic_version,
            system_prompt_chars: systemPrompt.length,
            user_prompt_chars: userPrompt.length,
            total_ms: Date.now() - t0,
            media_type: mediaType,
            photo_kb: Math.round(photo_base64.length * 0.75 / 1024),
          },
        });
      } catch (logErr) {
        console.error(`[analyze-pet-photo] [${reqId}] diag log insert failed:`, logErr);
      }

      return new Response(
        JSON.stringify({
          error: 'AI analysis failed',
          status: err.status ?? 502,
          details: err.body ?? err.message,
          parsed: err.parsed ?? null,
          trace: {
            request_id: reqId,
            chain: cfg.model_vision_chain,
            attempts: err.attempts ?? [],
            exhausted: err.exhausted ?? false,
            total_ms: Date.now() - t0,
          },
        }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { response, modelUsed, attempts: fallbackAttempts, strippedParams } = callResult;
    console.log(`[analyze-pet-photo] [${reqId}] success | model_used="${modelUsed}" | fallbacks=${fallbackAttempts.length} | stripped=[${strippedParams.join(', ')}] | total_ms=${Date.now() - t0}`);

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

    const analysis = JSON.parse(jsonText);

    // When pet_name is provided, this is a diary photo — ignore AI breed/species inference.
    // The pet identity is already known from the profile. Only health/behavior data matters.
    const compat = {
      ...analysis,
      // Nullify identification fields when analyzing a known pet's diary photo
      // to prevent wrong breed/species from overwriting profile data in the app.
      ...(pet_name ? {
        identification: {
          ...analysis.identification,
          breed: null,        // never overwrite known breed from profile
          species: null,      // never overwrite known species from profile
        },
      } : {}),
      // Top-level shortcuts for AddPetModal (only used when pet_name is NOT provided)
      breed: pet_name ? null : (analysis.identification?.breed
        ? { name: analysis.identification.breed.primary, confidence: analysis.identification.breed.confidence }
        : null),
      estimated_age_months: pet_name ? null : (analysis.identification?.estimated_age_months ?? null),
      estimated_weight_kg: pet_name ? null : (analysis.identification?.estimated_weight_kg ?? null),
      size: pet_name ? null : (analysis.identification?.size === 'giant' ? 'large' : (analysis.identification?.size ?? null)),
      color: pet_name ? null : (analysis.identification?.coat?.color ?? null),
    };

    return new Response(
      JSON.stringify(compat),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[analyze-pet-photo] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
