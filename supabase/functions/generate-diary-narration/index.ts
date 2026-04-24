import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import { validateAuth } from '../_shared/validate-auth.ts';
import { buildPetSystemContext } from '../_shared/petContext.ts';
import { callAnthropicWithFallback, AnthropicCallError } from '../_shared/callAnthropicWithFallback.ts';

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
  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;

    if (!ANTHROPIC_API_KEY) {
      console.error('[generate-diary-narration] ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { pet_id, content, mood_id, language = 'pt-BR', context = 'diary' } = await req.json();
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
      const registrationSystemPrompt = `You are a warm storyteller writing the first diary entry for a newly registered pet.
Write in THIRD PERSON about the pet, using the pet's name provided in the user message.

FORMAT: "Hoje [PET_NAME] foi cadastrado no auExpert. [description of the pet based on the provided analysis, max 60 words, 3rd person, warm tone]"

RULES:
- Start with "Hoje [PET_NAME] foi cadastrado no auExpert." (replace [PET_NAME] with the actual name)
- Use the analysis data provided to describe the pet (breed, mood, appearance, health highlights)
- Maximum 60 words total
- Warm, celebratory tone — this is a special moment
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
            max_tokens: 400,
            temperature: 0.7,
            system: [
              { type: 'text', text: registrationSystemPrompt, cache_control: { type: 'ephemeral' } },
            ],
            messages: [{ role: 'user', content: registrationUserPrompt }],
          }),
        });
        regResponse = callResult.response;
      } catch (callErr) {
        const err = callErr as AnthropicCallError;
        console.error(`[generate-diary-narration] [${reqId}] registration call failed:`, err.message);
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
    const systemPrompt = `You are a warm, empathetic storyteller narrating the life of a pet (dog or cat).
You write diary entries in THIRD PERSON, as if narrating a story about the pet to their tutor.

The user message will provide: pet name, species, breed, age, sex, current mood, language, and the tutor's content.

UNIVERSAL RULES:
- Write in THIRD PERSON using the pet's name: "[PET_NAME] foi ao parque" / "[PET_NAME] went to the park"
- NEVER use "I", "me", "my", "Eu", "meu", "minha" — always use the pet's name or "ele/ela / he/she"
- Maximum 50 words — be BRIEF, concise, punchy. 2-3 short sentences MAX
- Tone must vary with the mood specified in the user message
- Be authentic to the species — dogs: loyal, excited, loves attention; cats: independent, curious, a bit sassy
- Include emotional nuances that reflect the mood
- Do NOT be generic — reference specific details from what the tutor said
- Respect the grammatical gender note provided in the user message (masculine/feminine)
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

Narrate this in third person about ${petName}, reflecting their ${moodDesc} mood.`;

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
          max_tokens: 400,
          temperature: 0.7,
          system: [
            { type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      response = callResult.response;
    } catch (callErr) {
      const err = callErr as AnthropicCallError;
      console.error(`[generate-diary-narration] [${reqId2}] diary call failed:`, err.message);
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
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
