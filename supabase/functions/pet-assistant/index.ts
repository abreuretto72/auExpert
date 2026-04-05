/**
 * pet-assistant — Conversational AI specialised per pet.
 *
 * Uses RAG (search-rag) to fetch the pet's relevant history
 * and Claude to answer questions about health and wellbeing.
 *
 * POST body:
 *   pet_id               string   — pet UUID
 *   message              string   — tutor's question
 *   language             string   — locale tag (e.g. 'pt-BR')
 *   conversation_history Array    — last messages in Anthropic format
 *
 * Returns:
 *   { reply: string, tokens_used: { input_tokens: number, output_tokens: number } }
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getAIConfig } from '../_shared/ai-config.ts';
import { validateAuth } from '../_shared/validate-auth.ts';

const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'es-MX': 'Spanish (Mexico)', 'es-AR': 'Spanish (Argentina)',
  'fr': 'French', 'de': 'German', 'it': 'Italian',
  'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authResult = await validateAuth(req, CORS);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const { pet_id, message, language = 'pt-BR', conversation_history = [] } =
      await req.json();

    if (!pet_id || !message) {
      return new Response(
        JSON.stringify({ error: 'pet_id and message are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const cfg      = await getAIConfig(supabase);
    const lang     = LANG_NAMES[language] ?? LANG_NAMES[language.split('-')[0]] ?? 'English';

    // 1. Fetch RAG context (up to 8 most relevant snippets)
    const ragResults: Array<{ content: string }> = [];
    try {
      const { data: ragData } = await supabase.functions.invoke('search-rag', {
        body: { pet_id, query: message, limit: 8 },
      });
      if (Array.isArray(ragData?.results)) {
        ragResults.push(...(ragData.results as Array<{ content: string }>));
      }
    } catch (e) {
      console.warn('[pet-assistant] RAG lookup failed:', e);
    }

    // 2. Fetch pet profile
    const { data: pet } = await supabase
      .from('pets')
      .select('name, species, breed, birth_date, sex, weight_kg, blood_type, ai_personality, estimated_age_months')
      .eq('id', pet_id)
      .single();

    // 3. Build context strings
    const ragContext = ragResults.map((r) => `- ${r.content}`).join('\n');

    const petProfile = pet
      ? [
          `Nome: ${pet.name}`,
          `Espécie: ${pet.species === 'dog' ? 'Cão' : 'Gato'}`,
          pet.breed        ? `Raça: ${pet.breed}` : '',
          pet.sex          ? `Sexo: ${pet.sex === 'male' ? 'Macho' : 'Fêmea'}` : '',
          pet.weight_kg    ? `Peso: ${pet.weight_kg} kg` : '',
          pet.estimated_age_months != null
            ? `Idade: ${pet.estimated_age_months} meses`
            : pet.birth_date ? `Nascimento: ${pet.birth_date}` : '',
          pet.blood_type   ? `Tipo sanguíneo: ${pet.blood_type}` : '',
          pet.ai_personality ? `Personalidade: ${pet.ai_personality}` : '',
        ].filter(Boolean).join('\n')
      : 'Perfil não disponível.';

    // 4. System prompt
    const petName  = pet?.name ?? 'o pet';
    const systemPrompt = `You are a health and wellbeing assistant specialised in the pet named ${petName}.
You are an expert in dogs and cats, focused on preventive health, behaviour, and animal wellbeing.

PET PROFILE:
${petProfile}

RELEVANT HISTORY (from diary and health records):
${ragContext || 'No records found yet.'}

IMPORTANT RULES:
- Always refer to the pet in the third person (e.g. "${petName} needs..." / "A ${petName} precisa...")
- NEVER replace the veterinarian — always recommend professional consultation for serious health concerns
- Base your responses on the pet's real history when available
- Be empathetic, clear, and objective
- Always reply in ${lang}
- If you don't have a specific record about the pet, say you don't have that information yet
- Keep responses concise (2–4 sentences) unless more detail is needed
- Do NOT use markdown formatting in responses — plain text only`;

    // 5. Call Claude (keep last 10 messages of history)
    const history = (Array.isArray(conversation_history) ? conversation_history : []).slice(-10);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       ANTHROPIC_API_KEY,
        'anthropic-version': cfg.anthropic_version,
      },
      body: JSON.stringify({
        model:      cfg.model_chat,
        max_tokens: 1024,
        system:     systemPrompt,
        messages: [
          ...history,
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[pet-assistant] Anthropic error:', response.status, errBody);
      return new Response(
        JSON.stringify({ error: 'AI request failed', details: errBody }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    const aiResponse = await response.json();
    const textContent = aiResponse.content?.find(
      (c: { type: string }) => c.type === 'text',
    );
    const reply = textContent?.text ?? '';

    // 6. Persist conversation (non-blocking)
    supabase.from('pet_conversations').insert({
      pet_id,
      user_id:           user.id,
      user_message:      message,
      assistant_message: reply,
      tokens_used:       (aiResponse.usage?.input_tokens ?? 0) + (aiResponse.usage?.output_tokens ?? 0),
    }).then(() => {}).catch((e: unknown) => {
      console.warn('[pet-assistant] Failed to save conversation:', e);
    });

    return new Response(
      JSON.stringify({ reply, tokens_used: aiResponse.usage }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error('[pet-assistant] error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error', message: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
