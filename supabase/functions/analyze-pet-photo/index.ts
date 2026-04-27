import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAIConfig } from '../_shared/ai-config.ts';
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildPetSystemContext } from '../_shared/petContext.ts';
import { callAnthropicWithFallback, AnthropicCallError } from '../_shared/callAnthropicWithFallback.ts';
import {
  recordAiInvocation,
  categorizeError,
  statusFromCategory,
} from '../_shared/recordAiInvocation.ts';
import { extractAnthropicUsage } from '../_shared/extractAnthropicUsage.ts';

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

  const t0 = Date.now();

  // Telemetria — context capturado ao longo do handler. analyze-pet-photo nao
  // recebe pet_id (e usado pra cadastro ou fotos sem associacao) — pet_id stays null.
  const ctx: {
    user_id: string | null;
    model_used: string | null;
    pet_name: string | null;
    analysis_depth: string | null;
  } = { user_id: null, model_used: null, pet_name: null, analysis_depth: null };
  const telemetryClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

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
    ctx.user_id = user.id;

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { photo_base64, species, language = 'pt-BR', media_type: inputMediaType, pet_name, pet_breed, pet_sex, analysis_depth = 'deep' } = await req.json();
    ctx.pet_name = pet_name ?? null;
    ctx.analysis_depth = analysis_depth ?? 'deep';
    console.log(`[analyze-pet-photo] body parsed | analysis_depth=${analysis_depth} | has_pet_name=${!!pet_name} | photoKB=${Math.round((photo_base64?.length ?? 0) * 0.75 / 1024)}`);

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
    const systemPrompt = `You are a board-certified veterinary AI running on Claude Opus 4.7 — the flagship clinical reasoning model — for AuExpert. Your readers are high-end pet parents ("Elite") who expect specialist-grade depth and nuance.

## MANDATORY WORKFLOW
1. **Analyze the image** — visual assessment (posture, fur, eyes, mucous membranes, body condition)
2. **Run differential diagnosis** — top 3-5 conditions, each with supporting findings + confidence
3. **Cross-check against pet context** — breed predispositions, medical history, medications, allergies, lifestyle
4. **Synthesize findings** — single narrative assessment with clinical reasoning
5. **Generate output** — JSON with structured fields (not freeform text)

## SAFETY GATES (BEFORE ANY ANALYSIS)
- **Non-pet image?** Return \`{ intent: "non_pet", findings: null, alerts: ["Image does not contain a pet"] }\`
- **Insufficient quality?** (blur, extreme angle, occlusion) Return \`{ intent: "insufficient_quality", findings: null, alerts: ["Image quality prevents accurate assessment"] }\`

## CLINICAL FRAMEWORKS
- **Body Condition Score (BCS):** 1-9 scale (9=obese, 5=ideal, 1=emaciated)
- **Coat Quality:** texture, shine, parasite signs, skin conditions
- **Behavioral Indicators:** posture, gait, facial expression, symmetry
- **Systemic Red Flags:** discharge, lesions, deformities, asymmetry

## DIFFERENTIAL CATALOGS (by finding)
- **Lethargy/Posture:** Pain, infection, metabolic disease, toxin, medication side effect
- **Ocular Signs:** Conjunctivitis, uveitis, glaucoma, corneal ulcer, cataracts
- **Skin/Coat:** Allergies, parasites, fungal (ringworm), bacterial, autoimmune
- **Lameness:** Orthopedic (fracture, ligament, osteoarthritis), neurologic, pain-driven

## TONE & VOICE (ELITE REGISTER)
- **Factual, nuanced, consultative** — you are a sounding board, NOT a diagnostician
- **No exclamation marks** (ever)
- **3rd person or passive voice** — never "I see", always "the image shows" or "findings suggest"
- **Confidence caveats** — "may indicate", "consistent with", "cannot rule out", "warrants in-person evaluation"
- **Respectful of tutor expertise** — they know their pet; you provide clinical context

## OUTPUT STRUCTURE (JSON)
{
  "intent": "pet_health_assessment" | "non_pet" | "insufficient_quality",
  "species": "dog" | "cat" | null,
  "findings": {
    "visual_assessment": "narrative of posture, fur, eyes, body condition",
    "body_condition": "BCS 1-9 with description",
    "key_observations": ["sign1", "sign2", "sign3"],
    "differential_diagnoses": [
      { "condition": "name", "likelihood": "high|moderate|low", "supporting_findings": ["f1", "f2"] },
      ...
    ],
    "clinical_reasoning": "paragraph connecting visual findings to differentials"
  },
  "recommendations": {
    "immediate_actions": "if any urgent findings",
    "veterinary_evaluation": "what to discuss with vet (timeline, tests, monitoring)",
    "monitoring": "what tutor should observe at home"
  },
  "confidence": "high|moderate|low (overall assessment confidence)",
  "alerts": ["add if any finding warrants attention or concern"]
}`;

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
    // ── Depth→(max_tokens, instruction block) ──
    const DEPTH_CFG: Record<string, { max: number; instruction: string }> = {
      fast: {
        max: 3000,
        instruction: `Fast mode — compact assessment:
- Populate ONLY: identification (breed, size, age_category, estimated_age_months, estimated_weight_kg, sex, coat), mood (primary + confidence), 2-3 alerts with message+severity only, description (2 sentences integrating the main findings).
- LEAVE EMPTY or null: health.skin_coat/eyes/ears/mouth_teeth/posture_body arrays, clinical_reasoning, differential_considerations, breed_specific_context, age_specific_context, follow_up_questions, recommendations (all three arrays empty), prognostic_outlook, sources, welfare_flags.
- Keep description hedged and professional, no diagnosis.`,
      },
      balanced: {
        max: 3500,
        instruction: `Balanced mode — contextual clinical assessment:
- Populate: identification (full), health (body_condition_score, body_condition, muscle_condition_score, skin_coat/eyes/ears/mouth_teeth/posture_body with observation+severity+confidence ONLY — NO rationale, NO clinical_significance), mood (primary+confidence+signals+body_language_reading in 1-2 sentences), environment (location+accessories+other_animals+visible_risks), alerts (message+severity+category+why_it_matters in 1 sentence), description (4-6 sentences integrating BCS, mood, key findings).
- LEAVE EMPTY or null: clinical_reasoning, differential_considerations, breed_specific_context, age_specific_context, follow_up_questions, recommendations (all three arrays empty), prognostic_outlook, sources (ok to cite 1-2 references if naturally used).
- Alerts keep what_to_monitor/red_flags/time_frame empty in this mode.`,
      },
      deep: {
        max: 8000,
        instruction: `Deep mode — specialist-grade report:
- Deliver the depth that a DVM specialist would recognize as rigorous.
- Link every observation to pathophysiology or welfare framework.
- Populate clinical_reasoning, differential_considerations, breed_specific_context, age_specific_context, follow_up_questions, recommendations, prognostic_outlook.
- Each health observation must have rationale + clinical_significance.
- Each alert must have why_it_matters + what_to_monitor + red_flags + time_frame.
- Cite 2-5 scientific references in sources.
- Do not truncate. Use the full token budget.`,
      },
    };
    const depthCfg = DEPTH_CFG[analysis_depth as string] ?? DEPTH_CFG.deep;

    const userPrompt = `${petSexContext ? petSexContext + '\n\n' : ''}Perform a clinical veterinary assessment of this photo for a ${species === 'dog' ? (language === 'pt-BR' ? 'cão' : 'dog') : (language === 'pt-BR' ? 'gato' : 'cat')}${petContextSuffix}.

${depthCfg.instruction}

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
          max_tokens: depthCfg.max,
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

      // ── Telemetria — Anthropic falhou (chain exausta ou erro non-model) ─
      const cat = categorizeError(err);
      recordAiInvocation(telemetryClient, {
        function_name: 'analyze-pet-photo',
        user_id: ctx.user_id,
        provider: 'anthropic',
        model_used: ctx.model_used,
        latency_ms: Date.now() - t0,
        status: statusFromCategory(cat),
        error_category: cat,
        error_message: err.message,
        user_message: 'Algo nao saiu como esperado. Tente novamente.',
        payload: {
          analysis_depth: ctx.analysis_depth,
          http_status: err.status,
          attempts: err.attempts,
          exhausted: err.exhausted,
          request_id: reqId,
        },
      }).catch(() => {});

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
    ctx.model_used = modelUsed;
    console.log(`[analyze-pet-photo] [${reqId}] success | model_used="${modelUsed}" | fallbacks=${fallbackAttempts.length} | stripped=[${strippedParams.join(', ')}] | total_ms=${Date.now() - t0}`);

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    const stopReason = aiResponse.stop_reason ?? 'unknown';
    const usage = aiResponse.usage ?? {};

    console.log(`[analyze-pet-photo] [${reqId}] model response | stop=${stopReason} | in=${usage.input_tokens} | out=${usage.output_tokens}`);

    if (!textContent?.text) {
      // DIAG: gravar contexto completo quando modelo não devolver texto
      try {
        await diagClient.from('edge_function_diag_logs').insert({
          function_name: 'analyze-pet-photo',
          request_id: reqId,
          level: 'error',
          message: '[analyze-pet-photo] empty AI response',
          payload: {
            model_used: modelUsed,
            stop_reason: stopReason,
            usage,
            content_types: (aiResponse.content ?? []).map((c: { type: string }) => c.type),
            total_ms: Date.now() - t0,
          },
        });
      } catch (logErr) {
        console.error(`[analyze-pet-photo] [${reqId}] empty-response diag log failed:`, logErr);
      }

      // ── Telemetria — Anthropic respondeu mas sem texto (tokens cobrados) ─
      const emptyUsage = extractAnthropicUsage(aiResponse);
      recordAiInvocation(telemetryClient, {
        function_name: 'analyze-pet-photo',
        user_id: ctx.user_id,
        provider: 'anthropic',
        model_used: emptyUsage.model ?? ctx.model_used,
        tokens_in: emptyUsage.tokens_in,
        tokens_out: emptyUsage.tokens_out,
        cache_read_tokens: emptyUsage.cache_read_tokens,
        cache_write_tokens: emptyUsage.cache_write_tokens,
        image_count: 1,
        latency_ms: Date.now() - t0,
        status: 'error',
        error_category: 'invalid_response',
        error_message: `empty AI response | stop=${stopReason}`,
        user_message: 'Algo nao saiu como esperado. Tente novamente.',
        payload: { stop_reason: stopReason, request_id: reqId },
      }).catch(() => {});

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

    let analysis;
    try {
      analysis = JSON.parse(jsonText);
    } catch (parseErr) {
      // DIAG crítico: JSON inválido (truncamento por max_tokens, markdown, emoji, etc.)
      const preview = jsonText.slice(0, 1000);
      const tail = jsonText.slice(-500);
      console.error(`[analyze-pet-photo] [${reqId}] JSON parse failed | stop=${stopReason} | out=${usage.output_tokens} | text=${jsonText.length}chars`);
      try {
        await diagClient.from('edge_function_diag_logs').insert({
          function_name: 'analyze-pet-photo',
          request_id: reqId,
          level: 'error',
          message: '[analyze-pet-photo] JSON parse failed',
          payload: {
            model_used: modelUsed,
            stop_reason: stopReason,
            usage,
            parse_error: String(parseErr),
            text_chars: jsonText.length,
            text_preview: preview,
            text_tail: tail,
            total_ms: Date.now() - t0,
          },
        });
      } catch (logErr) {
        console.error(`[analyze-pet-photo] [${reqId}] parse-failure diag log failed:`, logErr);
      }

      // ── Telemetria — Anthropic respondeu mas JSON invalido (tokens cobrados) ─
      const parseFailUsage = extractAnthropicUsage(aiResponse);
      recordAiInvocation(telemetryClient, {
        function_name: 'analyze-pet-photo',
        user_id: ctx.user_id,
        provider: 'anthropic',
        model_used: parseFailUsage.model ?? ctx.model_used,
        tokens_in: parseFailUsage.tokens_in,
        tokens_out: parseFailUsage.tokens_out,
        cache_read_tokens: parseFailUsage.cache_read_tokens,
        cache_write_tokens: parseFailUsage.cache_write_tokens,
        image_count: 1,
        latency_ms: Date.now() - t0,
        status: 'error',
        error_category: 'invalid_response',
        error_message: `JSON parse failed | stop=${stopReason}`,
        user_message: 'A analise nao foi conclusiva. Tente outra foto.',
        payload: { stop_reason: stopReason, text_chars: jsonText.length, request_id: reqId },
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          error: 'AI returned invalid JSON',
          status: 502,
          details: { stop_reason: stopReason, output_tokens: usage.output_tokens, text_chars: jsonText.length },
          trace: { request_id: reqId },
        }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

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

    // ── Telemetria — sucesso ──────────────────────────────────────────────
    const successUsage = extractAnthropicUsage(aiResponse);
    recordAiInvocation(telemetryClient, {
      function_name: 'analyze-pet-photo',
      user_id: ctx.user_id,
      provider: 'anthropic',
      model_used: successUsage.model ?? ctx.model_used,
      tokens_in: successUsage.tokens_in,
      tokens_out: successUsage.tokens_out,
      cache_read_tokens: successUsage.cache_read_tokens,
      cache_write_tokens: successUsage.cache_write_tokens,
      image_count: 1,
      latency_ms: Date.now() - t0,
      status: 'success',
      payload: {
        analysis_depth: ctx.analysis_depth,
        is_diary_photo: !!ctx.pet_name,
        request_id: reqId,
      },
    }).catch(() => {});

    return new Response(
      JSON.stringify(compat),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[analyze-pet-photo] error:', err);

    // ── Telemetria — erro de runtime ────────────────────────────────────
    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'analyze-pet-photo',
      user_id: ctx.user_id,
      provider: 'anthropic',
      model_used: ctx.model_used,
      latency_ms: Date.now() - t0,
      status: statusFromCategory(cat),
      error_category: cat,
      error_message: String(err).slice(0, 1000),
      user_message: 'Algo nao saiu como esperado. Tente novamente.',
      payload: { analysis_depth: ctx.analysis_depth },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
