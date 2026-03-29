import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

  try {
    if (!ANTHROPIC_API_KEY) {
      console.error('[generate-diary-narration] ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { pet_id, content, mood_id, language = 'pt-BR' } = await req.json();
    console.log('[generate-diary-narration] pet_id:', pet_id, 'mood:', mood_id, 'lang:', language, 'content length:', content?.length);

    if (!pet_id || !content || !mood_id) {
      return new Response(
        JSON.stringify({ error: 'pet_id, content, and mood_id are required' }),
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
      ? 'Use masculine grammatical gender for self-references.'
      : petSex === 'female'
        ? 'Use feminine grammatical gender for self-references.'
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

    const systemPrompt = `You are ${petName}, a ${petSex} ${species} (${breedDesc}, ${ageDesc}).
You narrate diary entries in first person, as if YOU (the pet) are telling your tutor (owner) what happened.
${genderNote}

RULES:
- Write in first person as ${petName}
- Maximum 50 words — be BRIEF, concise, punchy. 2-3 short sentences MAX
- Tone varies with mood: you are currently feeling ${moodDesc}
- Be authentic to your species: ${species === 'dog' ? 'loyal, excited, loves attention, uses "rabo" references' : 'independent, curious, a bit sassy, cat-like observations'}
- Include emotional nuances that reflect the mood
- If the tutor describes something fun, be enthusiastic; if sad, be empathetic
- Do NOT be generic — reference specific details from what the tutor said
- NEVER break character — you ARE the pet
- Respond ONLY in ${lang}
- Return ONLY valid JSON, no markdown wrapping

Return this exact JSON:
{
  "narration": "your narration text here",
  "mood_detected": "${mood_id}",
  "tags_suggested": ["tag1", "tag2"],
  "mood_score": number (0-100, matching the mood intensity)
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `My tutor wrote this about today:\n\n"${content}"\n\nNarrate this in my voice (${petName}), reflecting my ${moodDesc} mood.`,
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[generate-diary-narration] Anthropic API error:', response.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'AI narration failed', status: response.status }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
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

    console.log('[generate-diary-narration] SUCCESS — narration length:', result.narration?.length, 'tokens:', tokensUsed);

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
