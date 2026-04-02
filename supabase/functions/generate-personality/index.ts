import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import { validateAuth } from '../_shared/validate-auth.ts';

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

const MIN_ENTRIES = 3;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authResult = await validateAuth(req, CORS_HEADERS);
    if (authResult instanceof Response) return authResult;

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const { pet_id, language = 'pt-BR' } = await req.json();
    console.log('[generate-personality] pet_id:', pet_id, 'lang:', language);

    if (!pet_id) {
      return new Response(
        JSON.stringify({ error: 'pet_id is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pet data
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('name, species, sex, breed, estimated_age_months, weight_kg, size, color, ai_personality')
      .eq('id', pet_id)
      .single();

    if (petError || !pet) {
      console.error('[generate-personality] Pet not found:', petError?.message);
      return new Response(
        JSON.stringify({ error: 'Pet not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch recent diary entries (last 20, with narration)
    const { data: entries, error: entriesError } = await supabase
      .from('diary_entries')
      .select('content, narration, mood_id, tags, created_at')
      .eq('pet_id', pet_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (entriesError) {
      console.error('[generate-personality] Error fetching entries:', entriesError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch diary entries' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    if (!entries || entries.length < MIN_ENTRIES) {
      console.log('[generate-personality] Not enough entries:', entries?.length ?? 0, '/', MIN_ENTRIES);
      return new Response(
        JSON.stringify({ personality: null, reason: 'not_enough_entries', count: entries?.length ?? 0, min: MIN_ENTRIES }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch mood distribution
    const { data: moodStats } = await supabase
      .from('mood_logs')
      .select('mood_id')
      .eq('pet_id', pet_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);

    const moodCounts: Record<string, number> = {};
    (moodStats ?? []).forEach((m: { mood_id: string }) => {
      moodCounts[m.mood_id] = (moodCounts[m.mood_id] ?? 0) + 1;
    });
    const dominantMoods = Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([mood, count]) => `${mood} (${count}x)`);

    // Build diary summary for the prompt
    const entrySummaries = entries.map((e: { content: string; narration: string | null; mood_id: string; tags: string[]; created_at: string }, i: number) => {
      const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const tags = (e.tags ?? []).join(', ');
      return `[${date}] Mood: ${e.mood_id}${tags ? ` | Tags: ${tags}` : ''}\nTutor: ${e.content.slice(0, 200)}${e.narration ? `\nPet narrated: ${e.narration.slice(0, 150)}` : ''}`;
    }).join('\n\n');

    const petName = pet.name;
    const species = pet.species === 'dog' ? 'dog' : 'cat';
    const ageDesc = pet.estimated_age_months
      ? (pet.estimated_age_months >= 12
        ? `${Math.floor(pet.estimated_age_months / 12)} year(s) old`
        : `${pet.estimated_age_months} month(s) old`)
      : 'unknown age';
    const breedDesc = pet.breed ?? 'mixed breed';
    const petSex = pet.sex ?? 'unknown';
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    const systemPrompt = `You are an expert animal behaviorist and pet personality analyst for AuExpert, a premium pet care app.

Analyze the diary entries below and create a personality profile for ${petName}, a ${petSex} ${species} (${breedDesc}, ${ageDesc}).

RULES:
- Write in third person about ${petName} (e.g., "${petName} is..." not "I am...")
- Maximum 3 sentences (40-60 words total)
- Be specific — reference actual behaviors and patterns from the diary
- Include emotional tendencies, energy level, and social traits
- Make it feel like a professional yet warm pet personality assessment
- Dominant moods lately: ${dominantMoods.join(', ') || 'not enough data'}
- Respond ONLY in ${lang}
- Return ONLY valid JSON, no markdown

Return this exact JSON:
{
  "personality": "the personality description text",
  "traits": ["trait1", "trait2", "trait3"],
  "energy_level": "low" | "medium" | "high",
  "social_style": "independent" | "social" | "clingy"
}`;

    console.log('[generate-personality] Calling Anthropic — entries:', entries.length, 'moods:', dominantMoods.join(', '));

    const cfg = await getAIConfig();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model: cfg.model_chat,
        max_tokens: 512,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Here are ${petName}'s recent diary entries:\n\n${entrySummaries}\n\nGenerate ${petName}'s personality profile based on these entries.`,
        }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[generate-personality] Anthropic API error:', response.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'AI personality generation failed', status: response.status }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

    if (!textContent?.text) {
      console.error('[generate-personality] Empty AI response');
      return new Response(
        JSON.stringify({ error: 'Empty AI response' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Parse JSON
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const result = JSON.parse(jsonText);
    console.log('[generate-personality] AI result — personality length:', result.personality?.length, 'traits:', result.traits);

    // Save to pets table
    const { error: updateError } = await supabase
      .from('pets')
      .update({ ai_personality: result.personality })
      .eq('id', pet_id);

    if (updateError) {
      console.error('[generate-personality] Failed to save personality:', updateError.message);
    } else {
      console.log('[generate-personality] Personality saved to pets table');
    }

    return new Response(
      JSON.stringify({
        personality: result.personality,
        traits: result.traits ?? [],
        energy_level: result.energy_level ?? null,
        social_style: result.social_style ?? null,
        entries_analyzed: entries.length,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[generate-personality] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
