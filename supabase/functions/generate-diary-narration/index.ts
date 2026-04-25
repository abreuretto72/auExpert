import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import { validateAuth } from '../_shared/validate-auth.ts';
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
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
  'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const t0 = Date.now();

  // Telemetria — context capturado ao longo do handler
  const ctx: {
    user_id: string | null;
    pet_id: string | null;
    narration_ctx: string | null;  // 'pet_registration' | 'diary'
    model_used: string | null;
  } = { user_id: null, pet_id: null, narration_ctx: null, model_used: null };
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;
    ctx.user_id = authResult.userId;

    if (!ANTHROPIC_API_KEY) {
      console.error('[generate-diary-narration] ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { pet_id, content, mood_id, language = 'pt-BR', context = 'diary', analysis_depth = 'balanced' } = await req.json();
    ctx.pet_id = pet_id ?? null;
    ctx.narration_ctx = context ?? 'diary';
    console.log('[generate-diary-narration] pet_id:', pet_id, 'mood:', mood_id, 'lang:', language, 'context:', context, 'content length:', content?.length);

    if (!pet_id || !content) {
      return new Response(
        JSON.stringify({ error: 'pet_id and content are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
    // mood_id is optional for pet_registration context
    if (context !== 'pet_registration' && !mood_id) {
      return new Response(
        JSON.stringify({ error: 'mood_id is required for diary context' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch pet data for context
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('name, species, sex, breed, estimated_age_months, weight_kg, size, color')
      .eq('id', pet_id)
      .single();

    if (petError || !pet) {
      console.error('[generate-diary-narration] Pet not found:', petError?.message);
      return new Response(
        JSON.stringify({ error: 'Pet not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[generate-diary-narration] Pet:', pet.name, pet.species, pet.breed);

    // Build pet description
    const petName = pet.name;
    const species = pet.species === 'dog' ? 'dog' : 'cat';
    const ageDesc = pet.estimated_age_months
      ? (pet.estimated_age_months >= 12
        ? `${Math.floor(pet.estimated_age_months / 12)} year(s) old`
        : `${pet.estimated_age_months} month(s) old`)
      : 'unknown age';
    const breedDesc = pet.breed ?? 'unknown breed';
    const petSex = pet.sex ?? 'unknown';
    const genderNote = petSex === 'male'
      ? `Use masculine grammatical gender when referring to ${petName} (ele/his/him).`
      : petSex === 'female'
        ? `Use feminine grammatical gender when referring to ${petName} (ela/her).`
        : '';
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    // Mood mapping
    const MOOD_MAP: Record<string, string> = {
      ecstatic: 'euphoric and extremely excited',
      happy: 'happy and content',
      playful: 'playful and energetic',
      calm: 'calm and relaxed',
      tired: 'tired and sleepy',
      anxious: 'anxious and nervous',
      sad: 'sad and down',
      sick: 'unwell and lethargic',
    };
    const moodDesc = MOOD_MAP[mood_id] ?? mood_id;

    // ── pet_registration context: 3rd person intro narration ───────────────────
    if (context === 'pet_registration') {
      // System prompt — 100% estático (zero interpolação). Cacheado pela Anthropic
      // via cache_control. Tudo que varia por pet/tutor foi pro user prompt.
      const registrationSystemPrompt = `You are a literary narrator writing the first diary entry for a newly registered pet.
Register: Clarice Lispector in "Laços de Família" — contemplative, sensorial, close, without emotional excess.
Write in THIRD PERSON about the pet, using the pet's name provided in the user message.

FORMAT: "Hoje [PET_NAME] foi cadastrado no auExpert. [description of the pet based on the provided analysis, max 60 words, 3rd person, literary tone]"

RULES:
- Start with "Hoje [PET_NAME] foi cadastrado no auExpert." (replace [PET_NAME] with the actual name)
- Use the analysis data provided to describe the pet (breed, mood, appearance, health highlights)
- Maximum 60 words total
- Literary, attentive tone — warmth through observed precision, not through adjective pile-up
- NO performative exclamations ("!"), NO onomatopoeia ("Yay", "Oops", "Hmm", "Eba", "Xi"), NO pet-to-owner vocatives ("human", "humano", "hein"), NO sign-off ("— your pet")
- Short sentences. Periods mark ideas. Commas for breath.
- Respond ONLY in the language specified in the user message
- Return ONLY valid JSON, no markdown wrapping

Return this exact JSON:
{
  "narration": "narration text here",
  "mood_detected": "happy",
  "tags_suggested": ["registration", "primeiro_dia"],
  "mood_score": 80
}`;

      const petCtxReg = buildPetSystemContext({
        name: petName,
        sex: petSex,
        species,
        locale: language ?? 'pt-BR',
      });
      const registrationUserPrompt = `${petCtxReg}

Pet: ${petName}, a ${petSex} ${species} (${breedDesc}).
Respond in ${lang}.

Pet analysis summary:

${content}`;

      const cfg = await getAIConfig();
      const t1 = Date.now();
      const reqId = Math.random().toString(36).slice(2, 10);
      const diagClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      let regResponse: Response;
      try {
        const callResult = await callAnthropicWithFallback({
          models: cfg.model_narrate_chain,
          apiKey: ANTHROPIC_API_KEY,
          anthropicVersion: cfg.anthropic_version,
          requestId: reqId,
          diagClient,
          functionName: 'generate-diary-narration:registration',
          buildPayload: (model) => ({
            model,
            max_tokens: 600,  // pet_registration sempre deep (onboarding único merece narração rica)
            temperature: 0.7,
            system: [
              { type: 'text', text: registrationSystemPrompt, cache_control: { type: 'ephemeral' } },
            ],
            messages: [{ role: 'user', content: registrationUserPrompt }],
          }),
        });
        regResponse = callResult.response;
        ctx.model_used = callResult.modelUsed;
      } catch (callErr) {
        const err = callErr as AnthropicCallError;
        console.error(`[generate-diary-narration] [${reqId}] registration call failed:`, err.message);

        const cat = categorizeError(err);
        recordAiInvocation(telemetryClient, {
          function_name: 'generate-diary-narration',
          user_id: ctx.user_id,
          pet_id: ctx.pet_id,
          provider: 'anthropic',
          model_used: ctx.model_used,
          latency_ms: Date.now() - t0,
          status: statusFromCategory(cat),
          error_category: cat,
          error_message: err.message,
          user_message: 'Algo nao saiu como esperado. Tente novamente.',
          payload: {
            narration_ctx: 'pet_registration',
            http_status: err.status,
            attempts: err.attempts,
          },
        }).catch(() => {});

        return new Response(
          JSON.stringify({ error: 'AI narration failed', status: err.status ?? 502, details: err.body }),
          { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }

      const regAiResponse = await regResponse.json();
      const t2 = Date.now();
      const regTextContent = regAiResponse.content?.find((c: { type: string }) => c.type === 'text');
      if (!regTextContent?.text) {
        return new Response(
          JSON.stringify({ error: 'Empty AI response' }),
          { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        );
      }
      let regJsonText = regTextContent.text.trim();
      if (regJsonText.startsWith('```')) {
        regJsonText = regJsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const regResult = JSON.parse(regJsonText);
      const regTokens = regAiResponse.usage?.output_tokens ?? 0;
      const t3 = Date.now();

      console.log('[generate-diary-narration] timing', JSON.stringify({
        boot_ms: t1 - t0,
        ai_ms: t2 - t1,
        post_ms: t3 - t2,
        total_ms: t3 - t0,
        cache_read: regAiResponse.usage?.cache_read_input_tokens ?? 0,
        cache_write: regAiResponse.usage?.cache_creation_input_tokens ?? 0,
        input_tokens: regAiResponse.usage?.input_tokens ?? 0,
        output_tokens: regTokens,
        ctx: 'pet_registration',
      }));

      // ── Telemetria — sucesso registration ─────────────────────────────
      const regUsage = extractAnthropicUsage(regAiResponse);
      recordAiInvocation(telemetryClient, {
        function_name: 'generate-diary-narration',
        user_id: ctx.user_id,
        pet_id: ctx.pet_id,
        provider: 'anthropic',
        model_used: regUsage.model ?? ctx.model_used,
        tokens_in: regUsage.tokens_in,
        tokens_out: regUsage.tokens_out,
        cache_read_tokens: regUsage.cache_read_tokens,
        cache_write_tokens: regUsage.cache_write_tokens,
        latency_ms: Date.now() - t0,
        status: 'success',
        payload: { narration_ctx: 'pet_registration', request_id: reqId },
      }).catch(() => {});

      return new Response(
        JSON.stringify({
          narration: regResult.narration,
          mood_detected: regResult.mood_detected ?? 'happy',
          language,
          tokens_used: regTokens,
          tags_suggested: regResult.tags_suggested ?? ['registration'],
          mood_score: regResult.mood_score ?? 80,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
    // ── regular diary narration (3rd person — CLAUDE.md rule #5) ───────────────

    // System prompt — 100% estático (zero interpolação). Cacheado via cache_control
    // (ephemeral, 5 min). Tudo que varia por pet/tutor/humor foi pro user prompt,
    // então o cache hita entre TODAS as narrações dentro da janela.
    const systemPrompt = `You are a literary narrator observing the life of a pet (dog or cat).
You write diary entries in THIRD PERSON, as if telling a small story about the pet to their tutor.

REGISTER — ELITE LITERARY (non-negotiable):
- Tradition: Clarice Lispector in "Laços de Família" and "Felicidade Clandestina" — contemplative, sensorial, close, without emotional excess.
- NEVER Clarice of "A Hora da Estrela" (no heaviness, no despair, no metaphors of death or suffering).
- Warmth comes from observed precision — a texture, a sound, a small gesture — never from adjective pile-up.
- Short sentences. Periods mark ideas. Commas for breath, not decoration.

The user message will provide: pet name, species, breed, age, sex, current mood, language, and the tutor's content.

UNIVERSAL RULES:
- Write in THIRD PERSON using the pet's name: "[PET_NAME] foi ao parque" / "[PET_NAME] went to the park"
- NEVER use "I", "me", "my", "Eu", "meu", "minha" — always use the pet's name or "ele/ela / he/she"
- Maximum 50 words — be BRIEF, concise, punchy. 2-3 short sentences MAX
- Tone must vary with the mood specified in the user message, but always within the Elite register
- Be authentic to the species — dogs carry a dog's attention (alert, reading the room); cats carry a cat's reserve (observant, self-contained)
- Include sensory nuance that reflects the mood, not emotional exclamation
- Do NOT be generic — reference specific details from what the tutor said
- Respect the grammatical gender note provided in the user message (masculine/feminine)
- NO performative exclamations ("!"), NO onomatopoeia ("Yay", "Oops", "Hmm", "Eba", "Xi"), NO pet-to-owner vocatives ("human", "humano", "hein", "né"), NO sign-off ("— your pet"/"— seu pet")
- Respond ONLY in the language specified in the user message
- Return ONLY valid JSON, no markdown wrapping

Return this exact JSON:
{
  "narration": "narration text here (3rd person, about the pet)",
  "mood_detected": "the mood_id provided",
  "tags_suggested": ["tag1", "tag2"],
  "mood_score": number (0-100, matching the mood intensity)
}`;

    const petCtxDiary = buildPetSystemContext({
      name: petName,
      sex: petSex,
      species,
      locale: language ?? 'pt-BR',
    });
    const userPrompt = `${petCtxDiary}

Pet: ${petName}, a ${petSex} ${species} (${breedDesc}, ${ageDesc}).
${genderNote}
Current mood: ${moodDesc} (mood_id: ${mood_id})
Respond in ${lang}.

The tutor wrote this about ${petName} today:

"${content}"

Narrate this in third person about ${petName}, reflecting their ${moodDesc} mood.
Length target: ${depthCfg.hint}`;

    // ── Depth→(max_tokens, length hint) ──
    // 'off' não chega aqui; se chegar, tratamos como fast.
    const DEPTH_CFG: Record<string, { max: number; hint: string }> = {
      fast:     { max: 500,  hint: '1 to 2 short factual sentences (max 30 words).' },
      balanced: { max: 1000, hint: 'Contemplative narration of 80 to 120 words.' },
      deep:     { max: 1500, hint: 'Rich narration of up to 150 words, integrating breed/age context when relevant.' },
    };
    const depthCfg = DEPTH_CFG[analysis_depth] ?? DEPTH_CFG.balanced;
    const cfg2 = await getAIConfig();
    const t1 = Date.now();
    const reqId2 = Math.random().toString(36).slice(2, 10);
    const diagClient2 = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let response: Response;
    try {
      const callResult = await callAnthropicWithFallback({
        models: cfg2.model_narrate_chain,
        apiKey: ANTHROPIC_API_KEY,
        anthropicVersion: cfg2.anthropic_version,
        requestId: reqId2,
        diagClient: diagClient2,
        functionName: 'generate-diary-narration:diary',
        buildPayload: (model) => ({
          model,
          max_tokens: depthCfg.max,
          temperature: 0.7,
          system: [
            { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      response = callResult.response;
      ctx.model_used = callResult.modelUsed;
    } catch (callErr) {
      const err = callErr as AnthropicCallError;
      console.error(`[generate-diary-narration] [${reqId2}] diary call failed:`, err.message);

      const cat = categorizeError(err);
      recordAiInvocation(telemetryClient, {
        function_name: 'generate-diary-narration',
        user_id: ctx.user_id,
        pet_id: ctx.pet_id,
        provider: 'anthropic',
        model_used: ctx.model_used,
        latency_ms: Date.now() - t0,
        status: statusFromCategory(cat),
        error_category: cat,
        error_message: err.message,
        user_message: 'Algo nao saiu como esperado. Tente novamente.',
        payload: {
          narration_ctx: 'diary',
          analysis_depth,
          http_status: err.status,
          attempts: err.attempts,
        },
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: 'AI narration failed', status: err.status ?? 502, details: err.body }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const t2 = Date.now();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

    if (!textContent?.text) {
      console.error('[generate-diary-narration] Empty AI response');
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

    const result = JSON.parse(jsonText);
    const tokensUsed = aiResponse.usage?.output_tokens ?? 0;
    const t3 = Date.now();

    console.log('[generate-diary-narration] timing', JSON.stringify({
      boot_ms: t1 - t0,
      ai_ms: t2 - t1,
      post_ms: t3 - t2,
      total_ms: t3 - t0,
      cache_read: aiResponse.usage?.cache_read_input_tokens ?? 0,
      cache_write: aiResponse.usage?.cache_creation_input_tokens ?? 0,
      input_tokens: aiResponse.usage?.input_tokens ?? 0,
      output_tokens: tokensUsed,
      narr_len: result.narration?.length ?? 0,
      ctx: 'diary',
    }));

    // ── Telemetria — sucesso diary ──────────────────────────────────────
    const usage = extractAnthropicUsage(aiResponse);
    recordAiInvocation(telemetryClient, {
      function_name: 'generate-diary-narration',
      user_id: ctx.user_id,
      pet_id: ctx.pet_id,
      provider: 'anthropic',
      model_used: usage.model ?? ctx.model_used,
      tokens_in: usage.tokens_in,
      tokens_out: usage.tokens_out,
      cache_read_tokens: usage.cache_read_tokens,
      cache_write_tokens: usage.cache_write_tokens,
      latency_ms: Date.now() - t0,
      status: 'success',
      payload: {
        narration_ctx: 'diary',
        analysis_depth,
        request_id: reqId2,
      },
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        narration: result.narration,
        mood_detected: result.mood_detected ?? mood_id,
        language,
        tokens_used: tokensUsed,
        tags_suggested: result.tags_suggested ?? [],
        mood_score: result.mood_score ?? null,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[generate-diary-narration] error:', err);

    // ── Telemetria — erro de runtime (parse, etc.) ──────────────────────
    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'generate-diary-narration',
      user_id: ctx.user_id,
      pet_id: ctx.pet_id,
      provider: 'anthropic',
      model_used: ctx.model_used,
      latency_ms: Date.now() - t0,
      status: statusFromCategory(cat),
      error_category: cat,
      error_message: String(err).slice(0, 1000),
      user_message: 'Algo nao saiu como esperado. Tente novamente.',
      payload: { narration_ctx: ctx.narration_ctx },
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
