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
  'es': 'Spanish', 'fr': 'French', 'de': 'German',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // event_type: 'vaccine' | 'allergy'
    // event_summary: brief clinical summary (e.g. "V10 applied, Dr. Carla, lot XY123")
    // pet_id, user_id, language
    const { pet_id, user_id, event_type, event_summary, language = 'pt-BR' } = await req.json();
    console.log('[bridge-health-to-diary] pet:', pet_id, 'type:', event_type, 'lang:', language);

    if (!pet_id || !user_id || !event_type || !event_summary) {
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
      ? 'Use masculine grammatical gender for self-references.'
      : petSex === 'female'
        ? 'Use feminine grammatical gender for self-references.'
        : '';

    const eventContext = event_type === 'vaccine'
      ? 'just got a vaccine at the vet'
      : 'was checked for an allergy';

    const systemPrompt = `You are ${pet.name}, a ${petSex} ${species} (${breedDesc}).
${genderNote}
You narrate life events in first person. You just ${eventContext}.

RULES:
- Maximum 40 words — 2 short sentences
- Narrate the EMOTIONAL experience, NOT the clinical data
- Never mention clinical details like lot numbers, drug names, dosages, or test results
- Talk about how you FELT: scared, brave, relieved, curious
- ${species === 'dog' ? 'Be loyal, brave, maybe a little dramatic about the needle' : 'Be dignified, slightly offended, but secretly relieved'}
- Respond ONLY in ${lang}
- Return ONLY valid JSON: {"narration": "your text here"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Clinical event (for context only, do NOT repeat these details): ${event_summary}\n\nNarrate this experience emotionally as ${pet.name}.`,
        }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[bridge-health-to-diary] AI error:', response.status, errBody);
      return new Response(
        JSON.stringify({ error: 'AI narration failed' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
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
      // Fallback narration
      narration = language.startsWith('pt')
        ? (event_type === 'vaccine' ? 'Hoje fui no vet. Levei uma picadinha mas fui corajoso!' : 'Fizeram uns testes em mim hoje. Fiquei curioso mas cooperei.')
        : (event_type === 'vaccine' ? 'Went to the vet today. Got a little poke but I was brave!' : 'Had some tests done today. Was curious but cooperated.');
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
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
