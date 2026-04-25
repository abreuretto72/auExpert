import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
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

const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'fr': 'French', 'de': 'German',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const t0 = Date.now();
  const ctx: { user_id: string | null; pet_id: string | null; model_used: string | null } =
    { user_id: null, pet_id: null, model_used: null };
  const telemetryClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ── JWT validation — must be an authenticated user ────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user: authUser }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // event_type: 'vaccine' | 'allergy'
    // event_summary: brief clinical summary (e.g. "V10 applied, Dr. Carla, lot XY123")
    // pet_id, language (user_id is derived from JWT)
    const { pet_id, user_id: _user_id, event_type, event_summary, language = 'pt-BR' } = await req.json();
    // Always use the authenticated user's ID — never trust client-supplied user_id
    const user_id = authUser.id;
    ctx.user_id = user_id;
    ctx.pet_id = pet_id ?? null;
    console.log('[bridge-health-to-diary] pet:', pet_id, 'type:', event_type, 'lang:', language);

    if (!pet_id || !event_type || !event_summary) {
      return new Response(
        JSON.stringify({ error: 'pet_id, user_id, event_type, and event_summary are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pet data
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('name, species, sex, breed, estimated_age_months')
      .eq('id', pet_id)
      .single();

    if (petError || !pet) {
      console.error('[bridge-health-to-diary] Pet not found:', petError?.message);
      return new Response(
        JSON.stringify({ error: 'Pet not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';
    const species = pet.species === 'dog' ? 'dog' : 'cat';
    const breedDesc = pet.breed ?? 'unknown breed';
    const petSex = pet.sex ?? 'unknown';
    const genderNote = petSex === 'male'
      ? `Use masculine grammatical gender when referring to ${pet.name} (ele/his/him).`
      : petSex === 'female'
        ? `Use feminine grammatical gender when referring to ${pet.name} (ela/her).`
        : '';

    const eventContext = event_type === 'vaccine'
      ? `just got a vaccine at the vet`
      : `was checked for an allergy`;

    const systemPrompt = `You are a literary narrator observing a life event of ${pet.name}, a ${petSex} ${species} (${breedDesc}). Register: Clarice Lispector in "Laços de Família" — contemplative, sensorial, close, without emotional excess.
${genderNote}
Write in THIRD PERSON about ${pet.name}. ${pet.name} ${eventContext}.

RULES:
- Write in THIRD PERSON: "${pet.name} foi ao veterinário" / "${pet.name} went to the vet" — NEVER "Fui" / "I went"
- NEVER use "I", "me", "my", "Eu", "meu", "minha" — always use ${pet.name}'s name or the pronoun
- Maximum 40 words — 2 short sentences
- Narrate the SENSORY and EMOTIONAL experience, NOT the clinical data
- Never mention clinical details like lot numbers, drug names, dosages, or test results
- Observe nuance: the room, the waiting, a small gesture — not grand feelings
- ${species === 'dog' ? `${pet.name} carries a dog's attention — loyal, alert, reading the room.` : `${pet.name} carries a cat's reserve — observant, self-contained, unhurried.`}
- NO performative exclamations ("!"), NO onomatopoeia ("Yay", "Oops", "Hmm"), NO pet-to-owner vocatives ("human", "humano"), NO sign-off ("— your pet")
- Short sentences. Periods mark ideas. Commas for breath.
- Warmth comes from observed precision, not from adjective pile-up.
- Respond ONLY in ${lang}
- Return ONLY valid JSON: {"narration": "your text here"}`;

    const cfg = await getAIConfig();
    ctx.model_used = cfg.model_narrate;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model: cfg.model_narrate,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Clinical event for ${pet.name} (for context only, do NOT repeat these details): ${event_summary}\n\nNarrate this experience emotionally about ${pet.name} in third person.`,
        }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[bridge-health-to-diary] AI error:', response.status, errBody);

      const cat = response.status === 429 ? 'quota_exceeded'
                : response.status === 401 || response.status === 403 ? 'auth_error'
                : response.status >= 500 ? 'api_error'
                : 'validation_error';
      recordAiInvocation(telemetryClient, {
        function_name: 'bridge-health-to-diary',
        user_id: ctx.user_id, pet_id: ctx.pet_id, provider: 'anthropic',
        model_used: ctx.model_used, latency_ms: Date.now() - t0,
        status: statusFromCategory(cat), error_category: cat,
        error_message: `HTTP ${response.status} — ${errBody.slice(0, 500)}`,
        payload: { event_type, http_status: response.status },
      }).catch(() => {});

      return new Response(
        JSON.stringify({ error: 'AI narration failed' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();

    // Telemetria — sucesso da chamada IA (independente do parse JSON)
    {
      const usage = extractAnthropicUsage(aiResponse);
      recordAiInvocation(telemetryClient, {
        function_name: 'bridge-health-to-diary',
        user_id: ctx.user_id, pet_id: ctx.pet_id, provider: 'anthropic',
        model_used: usage.model ?? ctx.model_used,
        tokens_in: usage.tokens_in, tokens_out: usage.tokens_out,
        cache_read_tokens: usage.cache_read_tokens, cache_write_tokens: usage.cache_write_tokens,
        latency_ms: Date.now() - t0, status: 'success',
        payload: { event_type, language },
      }).catch(() => {});
    }
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    let narration = '';

    if (textContent?.text) {
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(jsonText);
      narration = parsed.narration ?? '';
    }

    if (!narration) {
      // Fallback narration (3rd person — CLAUDE.md rule #5)
      narration = language.startsWith('pt')
        ? (event_type === 'vaccine'
            ? `${pet.name} foi ao veterinário hoje. Levou uma picadinha, mas foi muito corajoso!`
            : `Fizeram alguns testes no ${pet.name} hoje. Ficou curioso, mas cooperou muito bem.`)
        : (event_type === 'vaccine'
            ? `${pet.name} went to the vet today. Got a little poke but was very brave!`
            : `${pet.name} had some tests done today. Was curious but cooperated beautifully.`);
    }

    // Create diary entry
    const moodId = event_type === 'vaccine' ? 'calm' : 'anxious';
    const { data: entry, error: insertError } = await supabase
      .from('diary_entries')
      .insert({
        pet_id,
        user_id,
        content: event_summary,
        narration,
        mood_id: moodId,
        entry_type: 'manual',
        tags: [event_type],
        is_special: false,
        entry_date: new Date().toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[bridge-health-to-diary] Insert failed:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to create diary entry', details: insertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    console.log('[bridge-health-to-diary] SUCCESS — diary entry:', entry.id, 'narration length:', narration.length);

    return new Response(
      JSON.stringify({ diary_entry_id: entry.id, narration }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[bridge-health-to-diary] error:', err);

    const cat = categorizeError(err);
    recordAiInvocation(telemetryClient, {
      function_name: 'bridge-health-to-diary',
      user_id: ctx.user_id, pet_id: ctx.pet_id, provider: 'anthropic',
      model_used: ctx.model_used, latency_ms: Date.now() - t0,
      status: statusFromCategory(cat), error_category: cat,
      error_message: String(err).slice(0, 1000),
    }).catch(() => {});

    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
