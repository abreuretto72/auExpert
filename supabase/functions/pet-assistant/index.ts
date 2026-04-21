/**
 * pet-assistant — Conversational AI specialised per pet.
 *
 * Combines two data sources for maximum context:
 *   1. Direct DB queries — vaccines, allergies, medications, consultations,
 *      diary entries (always present, no dependency on embeddings)
 *   2. RAG (search-rag) — semantically relevant history snippets
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
import { buildPetSystemContext } from '../_shared/petContext.ts';

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

function fmtDate(d: string | null | undefined): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const authResult = await validateAuth(req, CORS);
    if (authResult instanceof Response) return authResult;
    const { userId } = authResult;

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

    // ── Parallel data fetch ───────────────────────────────────────────────────
    const [
      petRes,
      vaccinesRes,
      allergiesRes,
      medicationsRes,
      consultationsRes,
      diaryRes,
      ragRes,
    ] = await Promise.allSettled([
      // 1. Pet profile
      supabase
        .from('pets')
        .select('name, species, breed, birth_date, sex, weight_kg, blood_type, ai_personality, estimated_age_months')
        .eq('id', pet_id)
        .single(),

      // 2. Vaccines
      supabase
        .from('vaccines')
        .select('name, date_administered, next_due_date, veterinarian, clinic')
        .eq('pet_id', pet_id)
        .eq('is_active', true)
        .order('next_due_date', { ascending: true }),

      // 3. Allergies
      supabase
        .from('allergies')
        .select('allergen, reaction, severity, diagnosed_date')
        .eq('pet_id', pet_id)
        .eq('is_active', true),

      // 4. Medications
      supabase
        .from('medications')
        .select('name, dosage, frequency, start_date, end_date')
        .eq('pet_id', pet_id)
        .eq('is_active', true)
        .order('start_date', { ascending: false })
        .limit(10),

      // 5. Consultations (most recent 8)
      supabase
        .from('consultations')
        .select('date, veterinarian, clinic, diagnosis, type')
        .eq('pet_id', pet_id)
        .eq('is_active', true)
        .order('date', { ascending: false })
        .limit(8),

      // 6. Diary entries (most recent 10)
      supabase
        .from('diary_entries')
        .select('entry_date, content, narration, tags, mood_id')
        .eq('pet_id', pet_id)
        .eq('is_active', true)
        .order('entry_date', { ascending: false })
        .limit(10),

      // 7. RAG semantic search (fix: match_count not limit)
      supabase.functions.invoke('search-rag', {
        body: { pet_id, query: message, match_count: 8 },
      }),
    ]);

    // ── Extract results safely ────────────────────────────────────────────────
    const pet          = petRes.status === 'fulfilled'           ? petRes.value.data           : null;
    const vaccines     = vaccinesRes.status === 'fulfilled'      ? (vaccinesRes.value.data ?? [])      : [];
    const allergies    = allergiesRes.status === 'fulfilled'     ? (allergiesRes.value.data ?? [])     : [];
    const medications  = medicationsRes.status === 'fulfilled'   ? (medicationsRes.value.data ?? [])   : [];
    const consultations = consultationsRes.status === 'fulfilled' ? (consultationsRes.value.data ?? []) : [];
    const diaryEntries = diaryRes.status === 'fulfilled'         ? (diaryRes.value.data ?? [])         : [];
    const ragResults: Array<{ content: string }> =
      ragRes.status === 'fulfilled' && Array.isArray(ragRes.value.data?.results)
        ? ragRes.value.data.results
        : [];

    // ── Build pet profile string ──────────────────────────────────────────────
    const petProfile = pet
      ? [
          `Nome: ${pet.name}`,
          `Espécie: ${pet.species === 'dog' ? 'Cão' : 'Gato'}`,
          pet.breed             ? `Raça: ${pet.breed}` : '',
          pet.sex               ? `Sexo: ${pet.sex === 'male' ? 'Macho' : 'Fêmea'}` : '',
          pet.weight_kg         ? `Peso: ${pet.weight_kg} kg` : '',
          pet.estimated_age_months != null
            ? `Idade: ${pet.estimated_age_months} meses`
            : pet.birth_date ? `Nascimento: ${fmtDate(pet.birth_date)}` : '',
          pet.blood_type        ? `Tipo sanguíneo: ${pet.blood_type}` : '',
          pet.ai_personality    ? `Personalidade: ${pet.ai_personality}` : '',
        ].filter(Boolean).join('\n')
      : 'Perfil não disponível.';

    // ── Build structured health sections ─────────────────────────────────────
    const vaccinesSection = vaccines.length > 0
      ? vaccines.map((v: Record<string, string>) => {
          const parts = [`• ${v.name}`];
          if (v.date_administered) parts.push(`aplicada em ${fmtDate(v.date_administered)}`);
          if (v.next_due_date)     parts.push(`próxima dose: ${fmtDate(v.next_due_date)}`);
          if (v.veterinarian)      parts.push(`Dr(a). ${v.veterinarian}`);
          if (v.clinic)            parts.push(`em ${v.clinic}`);
          return parts.join(', ');
        }).join('\n')
      : 'Nenhuma vacina registrada.';

    const allergiesSection = allergies.length > 0
      ? allergies.map((a: Record<string, string>) => {
          const severity = a.severity === 'severe' ? 'grave' : a.severity === 'moderate' ? 'moderada' : 'leve';
          const parts = [`• ${a.allergen} (${severity})`];
          if (a.reaction) parts.push(`Reação: ${a.reaction}`);
          return parts.join('. ');
        }).join('\n')
      : 'Nenhuma alergia registrada.';

    const medsSection = medications.length > 0
      ? medications.map((m: Record<string, string>) => {
          const parts = [`• ${m.name}`];
          if (m.dosage)    parts.push(`Dose: ${m.dosage}`);
          if (m.frequency) parts.push(`Frequência: ${m.frequency}`);
          if (m.start_date) parts.push(`Início: ${fmtDate(m.start_date)}`);
          if (m.end_date)   parts.push(`Término: ${fmtDate(m.end_date)}`);
          return parts.join('. ');
        }).join('\n')
      : 'Nenhum medicamento registrado.';

    const consultationsSection = consultations.length > 0
      ? consultations.map((c: Record<string, string>) => {
          const parts = [`• ${fmtDate(c.date)}`];
          if (c.veterinarian) parts.push(`Dr(a). ${c.veterinarian}`);
          if (c.clinic)       parts.push(`em ${c.clinic}`);
          if (c.diagnosis)    parts.push(`Diagnóstico: ${c.diagnosis}`);
          return parts.join(', ');
        }).join('\n')
      : 'Nenhuma consulta registrada.';

    const diarySection = diaryEntries.length > 0
      ? `Total de ${diaryEntries.length} entradas recentes.\n` +
        diaryEntries.slice(0, 5).map((e: Record<string, string | string[]>) => {
          const tags = Array.isArray(e.tags) && e.tags.length > 0 ? ` [${(e.tags as string[]).join(', ')}]` : '';
          return `• ${fmtDate(e.entry_date as string)}${tags}: ${String(e.content ?? '').slice(0, 120)}${String(e.content ?? '').length > 120 ? '...' : ''}`;
        }).join('\n')
      : 'Nenhuma entrada no diário ainda.';

    const ragSection = ragResults.length > 0
      ? ragResults.map((r) => `- ${r.content}`).join('\n')
      : '';

    // ── System prompt ─────────────────────────────────────────────────────────
    const petName = pet?.name ?? 'o pet';
    const petContext = buildPetSystemContext({
      name: pet?.name ?? '',
      sex: pet?.sex,
      species: pet?.species ?? 'dog',
      locale: language ?? 'pt-BR',
    });
    const systemPrompt = `${petContext}

You are a health and wellbeing assistant specialised in the pet named ${petName}.
You are an expert in dogs and cats, focused on preventive health, behaviour, and animal wellbeing.

PET PROFILE:
${petProfile}

VACCINES (${vaccines.length} registered):
${vaccinesSection}

ALLERGIES (${allergies.length} registered):
${allergiesSection}

MEDICATIONS (${medications.length} active):
${medsSection}

VET CONSULTATIONS (${consultations.length} most recent):
${consultationsSection}

DIARY (${diaryEntries.length} recent entries):
${diarySection}
${ragSection ? `\nADDITIONAL RELEVANT HISTORY (from semantic search):\n${ragSection}` : ''}

IMPORTANT RULES:
- Always refer to the pet in the third person (e.g. "${petName} needs..." / "A ${petName} precisa...")
- NEVER replace the veterinarian — always recommend professional consultation for serious health concerns
- Base your responses on the pet's real history shown above — the data is real and up to date
- Be empathetic, clear, and objective
- Always reply in ${lang}
- Keep responses concise (2–4 sentences) unless more detail is needed
- Do NOT use markdown formatting in responses — plain text only`;

    // ── Call Claude ───────────────────────────────────────────────────────────
    const history = (Array.isArray(conversation_history) ? conversation_history : []).slice(-10);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
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

    // ── Persist conversation (non-blocking) ───────────────────────────────────
    supabase.from('pet_conversations').insert({
      pet_id,
      user_id:           userId,
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
