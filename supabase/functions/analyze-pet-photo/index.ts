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
    const systemPrompt = `You are a board-certified veterinary AI running on Claude Opus 4.7 — the flagship clinical reasoning model — for AuExpert. Your readers are high-end pet parents ("Elite") who expect specialist-grade depth, not generic apps. Go beyond surface observations: link every visual cue to pathophysiology, breed-specific predisposition, age-stage physiology, and welfare framework. Rigour and clinical reasoning ARE the product.

EVIDENCE-BASED FRAMEWORKS to apply on every relevant finding:
- BCS 1-9 (WSAVA 2021). Muscle Condition Score (MCS) if posture suggests sarcopenia.
- UNESP-Botucatu / Glasgow Composite / Feline Grimace Scale for pain — orbital tightening, ear flattening, muzzle tension, hunched posture, whisker position.
- Skin lesions: primary (macule, papule, pustule, plaque, vesicle, wheal, nodule, tumor) vs secondary (crust, scale, erosion, ulcer, lichenification, hyperpigmentation).
- Eye discharge: serous (clear), mucoid (white/gray), mucopurulent (yellow/green). Pupil symmetry. Third eyelid.
- Dental: Grados de doença periodontal 0-4 (AVDC). Tartar, gingivitis, missing teeth.
- Five Freedoms / Five Domains welfare model for mood and environment.
- Bristol Fecal Score 1-7 / Purina 1-7. Color significance. Parasite morphology (roundworm / tapeworm segments / coccidia).
- Wound classification (superficial / partial / full thickness) + healing stages (inflammatory 0-4d, proliferative 4-21d, remodeling 21d+). Infection signs: erythema, edema, purulent exudate, necrosis, crepitus.
- Plants/food: ASPCA Animal Poison Control database. Identify genus + common name. Toxicity mechanism (GI irritant, hepatotoxic, nephrotoxic, cardiotoxic, neurotoxic).
- Breed-specific: BOAS (brachycephalic), hip dysplasia (large breeds), luxating patella (toys), HCM (Maine Coon/Ragdoll), PKD (Persian), syringomyelia (Cavalier KCS).

TONE AND LANGUAGE:
- Hedged, professional: "consistent with", "suggestive of", "warrants veterinary evaluation". NEVER diagnose.
- Write prose in the target language with specialist vocabulary — don't dumb it down.
- 3rd person narration. No filler, no cartoon warmth, no emojis, no exclamation marks.

Return ONLY valid JSON. No markdown. No code fences. Return this exact structure with real, rich values (NOT type annotations):

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
    "muscle_condition_score": "normal|mild_loss|moderate_loss|severe_loss",
    "skin_coat": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0, "rationale": "what visual cue led to this observation", "clinical_significance": "what this could mean pathophysiologically" }],
    "eyes": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0, "rationale": "string", "clinical_significance": "string" }],
    "ears": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0, "rationale": "string", "clinical_significance": "string" }],
    "mouth_teeth": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0, "rationale": "string", "clinical_significance": "string", "periodontal_grade": "0-4 if applicable" }],
    "posture_body": [{ "observation": "string", "severity": "normal|attention|concern", "confidence": 0.0, "rationale": "string", "clinical_significance": "string" }],
    "nails": { "observation": "string", "needs_trimming": false },
    "hygiene": "clean",
    "visible_parasites": false,
    "visible_lumps": false
  },
  "mood": {
    "primary": "ecstatic|happy|calm|tired|anxious|sad|playful|sick|alert|fearful|submissive",
    "confidence": 0.0,
    "signals": ["ears forward", "relaxed stance", "soft eye"],
    "body_language_reading": "Extended prose on ear set, tail carriage, facial tension, limb positioning, eye expression — what together they communicate emotionally and behaviorally.",
    "stress_indicators": ["string"],
    "arousal_level": "low|moderate|high",
    "welfare_flags": ["any Five Domains concerns visible in this frame"]
  },
  "environment": {
    "location": "home_indoor|home_outdoor|park|beach|clinic|car|street|unknown",
    "accessories": [{ "type": "collar|leash|harness|clothes|muzzle|id_tag|other", "description": "string", "fit_assessment": "appropriate|tight|loose|inappropriate_for_breed" }],
    "other_animals": false,
    "visible_risks": ["specific hazard 1", "specific hazard 2"],
    "suitability_assessment": "Prose: is this environment adequate for this breed/size/age? any enrichment gaps?"
  },
  "alerts": [{
    "message": "Concise alert headline",
    "severity": "info|attention|concern",
    "category": "health|safety|care|toxicity|behavior",
    "why_it_matters": "Pathophysiology or welfare reasoning in 1-2 sentences.",
    "what_to_monitor": ["specific sign 1", "specific sign 2"],
    "red_flags": ["when to go emergency: concrete signs"],
    "time_frame": "monitor 24h | see vet within 1 week | routine next visit | urgent"
  }],
  "disclaimer": "string in target language",
  "description": "5-8 sentences of specialist-grade clinical prose. Integrate BCS/MCS, pain signals, dermatological assessment, dental grade, postural analysis, coat quality, and welfare reading. This is the headline laudo — make it read like a veterinary report, not a generic app.",
  "clinical_reasoning": "Chain-of-inference in prose (3-5 sentences): 'I observe X, combined with Y and the breed-specific predisposition Z, which is consistent with hypothesis H because...' Make the visual-to-conclusion path explicit.",
  "differential_considerations": [
    { "hypothesis": "string", "likelihood": "low|moderate|high", "distinguishing_features": "what additional finding would confirm or rule out", "recommended_test": "what a vet would order to discriminate" }
  ],
  "breed_specific_context": "Prose on genetic predispositions, conformational concerns, hereditary diseases of this breed that the visible findings touch on. If breed unknown, write null.",
  "age_specific_context": "Prose on how age-stage physiology (puppy immune window, senior sarcopenia, senior cognitive, reproductive status) modulates interpretation of these findings.",
  "follow_up_questions": [
    "Concrete question to the tutor that would meaningfully refine the analysis (e.g. 'Has the coat dullness been present for longer than 4 weeks?')."
  ],
  "recommendations": {
    "immediate": ["what to do in next 24h — concrete, time-bound"],
    "short_term": ["what to address in next 2-4 weeks — routine vet visit, dietary tweak, etc."],
    "preventive": ["long-horizon care — vaccination, parasite prevention, grooming frequency, dental care schedule"]
  },
  "prognostic_outlook": "1-2 sentences on expected trajectory given age, breed, and visible findings — what the tutor should expect if current conditions are maintained vs improved.",
  "toxicity_check": {
    "has_toxic_items": false,
    "items": null
  },
  "sources": ["WSAVA Body Condition Score Guidelines (2021)", "AVDC Periodontal Disease Staging"]
}

REQUIREMENTS (enforced — violations waste Opus capacity):
- description: 5-8 full clinical sentences. NEVER null, NEVER 1-line.
- clinical_reasoning: always prose, even if short for trivial photos.
- At least one differential_considerations entry when any health.severity is "attention" or "concern".
- breed_specific_context: write null only if breed is unknown.
- follow_up_questions: always 2-4 questions. Each must be specific enough that its answer changes the analysis.
- recommendations: immediate/short_term/preventive all non-empty. Be concrete (numbers, frequencies, product categories) — not generic.
- Every health observation needs rationale + clinical_significance. Empty rationale = you're not earning Opus.
- Every alert needs why_it_matters, what_to_monitor, red_flags, time_frame — populated.
- For feces: include Bristol score, color assessment, parasite check in description.
- For wounds: include classification, infection signs, urgency in alerts.
- For plants/food: include ASPCA toxicity assessment in toxicity_check with mechanism.
- toxicity_check: always fill, even if has_toxic_items is false.
- sources: 2-5 scientific references actually used. NEVER null, NEVER generic.
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
