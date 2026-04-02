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
  'es': 'Spanish', 'fr': 'French', 'de': 'German',
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  health:    ['saúde', 'health', 'vacina', 'vaccine', 'sintoma', 'symptom', 'veterinário', 'vet', 'doença', 'sick', 'peso', 'weight'],
  behavior:  ['comportamento', 'behavior', 'brincar', 'play', 'ansiedade', 'anxiety', 'treino', 'training', 'latiu', 'barked'],
  nutrition: ['comida', 'food', 'alimentação', 'nutrition', 'ração', 'kibble', 'petiscos', 'treats', 'água', 'water'],
  care:      ['banho', 'bath', 'tosa', 'grooming', 'passeio', 'walk', 'carinho', 'affection', 'dormiu', 'slept'],
};

function detectCategory(text: string): 'health' | 'behavior' | 'nutrition' | 'care' {
  const lower = text.toLowerCase();
  let best: 'health' | 'behavior' | 'nutrition' | 'care' = 'care';
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = cat as typeof best; }
  }
  return best;
}

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

    if (!pet_id) {
      return new Response(
        JSON.stringify({ error: 'pet_id is required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const lang = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    // Fetch pet profile
    const { data: pet, error: petError } = await supabase
      .from('pets')
      .select('name, species, breed, sex, estimated_age_months')
      .eq('id', pet_id)
      .single();

    if (petError || !pet) {
      return new Response(
        JSON.stringify({ error: 'Pet not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Fetch last 10 diary entries (last ~2 weeks)
    const { data: entries } = await supabase
      .from('diary_entries')
      .select('content, narration, mood_id, entry_date, tags')
      .eq('pet_id', pet_id)
      .eq('is_active', true)
      .order('entry_date', { ascending: false })
      .limit(10);

    // Fetch last 7 mood logs
    const { data: moods } = await supabase
      .from('mood_logs')
      .select('mood_id, mood_score, logged_at')
      .eq('pet_id', pet_id)
      .order('logged_at', { ascending: false })
      .limit(7);

    if (!entries?.length && !moods?.length) {
      return new Response(
        JSON.stringify({ error: 'Not enough data to generate insight' }),
        { status: 422, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Build context summary
    const diaryContext = (entries ?? []).map(e =>
      `[${e.entry_date}] mood:${e.mood_id} tags:${(e.tags ?? []).join(',')} — ${e.content?.slice(0, 120) ?? ''}`
    ).join('\n');

    const moodContext = (moods ?? []).map(m =>
      `${m.logged_at?.slice(0, 10)} mood:${m.mood_id} score:${m.mood_score ?? 'n/a'}`
    ).join('\n');

    const petDesc = `${pet.name}, ${pet.sex ?? 'unknown sex'} ${pet.species} (${pet.breed ?? 'mixed'}, ~${pet.estimated_age_months ?? '?'} months)`;
    const basedOn = (entries ?? []).map(e => e.entry_date).filter(Boolean) as string[];

    const systemPrompt = `You are AuExpert's veterinary AI specialist. You analyze pet behavioral and health patterns from diary data.
Generate a single, specific, actionable insight for ${pet.name}'s tutor based on recent records.
Rules:
- Maximum 60 words
- Be specific and concrete — mention what you observed
- Suggest one clear action (but NEVER diagnose diseases)
- Use warm, caring language appropriate for a pet care app
- Respond ONLY in ${lang}
- Return ONLY valid JSON: {"insight": "text here", "category": "health|behavior|nutrition|care"}`;

    const userPrompt = `Pet: ${petDesc}

Recent diary entries:
${diaryContext || 'No diary entries yet.'}

Recent mood history:
${moodContext || 'No mood logs yet.'}

Generate one specific insight and categorize it.`;

    const cfg = await getAIConfig();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model: cfg.model_insights,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[generate-ai-insight] AI error:', response.status, errBody);
      return new Response(
        JSON.stringify({ error: 'AI insight failed' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');
    let insight = '';
    let category: 'health' | 'behavior' | 'nutrition' | 'care' = 'care';

    if (textContent?.text) {
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(jsonText);
      insight  = parsed.insight  ?? '';
      category = parsed.category ?? detectCategory(parsed.insight ?? '');
    }

    if (!insight) {
      insight = language.startsWith('pt')
        ? `${pet.name} tem mostrado sinais interessantes ultimamente. Continue acompanhando o diário para identificar padrões!`
        : `${pet.name} has been showing interesting signs lately. Keep tracking the diary to identify patterns!`;
      category = 'care';
    }

    return new Response(
      JSON.stringify({ insight, category, pet_id, based_on: basedOn }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[generate-ai-insight] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }
});
