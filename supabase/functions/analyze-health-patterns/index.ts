/**
 * analyze-health-patterns — CRON Edge Function
 *
 * Runs 1x/day at 07:30 BRT.
 * Analyzes each active pet for:
 *   - Weight trends (gaining / losing / missing)
 *   - Negative mood patterns
 *   - Recurring symptoms
 *   - Overdue bloodwork
 *   - Antiparasitic due
 *   - Lack of physical activity
 *   - Diary inactivity
 *   - Dangerous symptom combinations
 *   - Preventive care by age/species
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SB = ReturnType<typeof createClient>;

interface PetRow {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  estimated_age_months: number | null;
  user_id: string;
  weight_kg: number | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString();
}

function today(): string { return new Date().toISOString().slice(0, 10); }

async function alreadyExists(
  sb: SB, petId: string, source: string, windowDays = 1,
): Promise<boolean> {
  const since = daysAgo(windowDays);
  const { count } = await sb
    .from('pet_insights')
    .select('id', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('source', source)
    .gte('created_at', since);
  return (count ?? 0) > 0;
}

async function insertInsight(sb: SB, row: {
  pet_id: string; user_id: string; type: string; urgency: string;
  title: string; body: string; source: string;
  action_label?: string; action_route?: string;
}): Promise<void> {
  const { error } = await sb.from('pet_insights').insert({ ...row, is_active: true });
  if (error) console.error('[analyze-health-patterns] insert:', error.message);
}

function ageMonths(pet: PetRow): number {
  if (pet.estimated_age_months) return pet.estimated_age_months;
  if (!pet.birth_date) return 0;
  const diff = Date.now() - new Date(pet.birth_date).getTime();
  return Math.floor(diff / (30.44 * 86_400_000));
}

// ── Weight trend ───────────────────────────────────────────────────────────

async function analyzeWeight(sb: SB, pet: PetRow): Promise<void> {
  const { data: weights } = await sb
    .from('clinical_metrics')
    .select('value, measured_at')
    .eq('pet_id', pet.id)
    .eq('metric_type', 'weight')
    .eq('is_active', true)
    .order('measured_at', { ascending: false })
    .limit(4);

  if (!weights || weights.length === 0) {
    // No weight recorded — suggest weighing
    if (await alreadyExists(sb, pet.id, 'cron_weight_missing', 30)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'reminder', urgency: 'low',
      title: `${pet.name} não tem peso registrado`,
      body:  `Registre o peso de ${pet.name} regularmente para acompanhar a saúde. Pesar a cada 3 meses é o ideal.`,
      source: 'cron_weight_missing',
      action_label: 'Registrar peso', action_route: `/pet/${pet.id}/health`,
    });
    return;
  }

  // Check days since last weighing
  const lastWeighed = new Date(weights[0].measured_at);
  const daysSince   = Math.floor((Date.now() - lastWeighed.getTime()) / 86_400_000);
  if (daysSince > 60) {
    if (await alreadyExists(sb, pet.id, 'cron_weight_outdated', 30)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'reminder', urgency: 'low',
      title: `${pet.name} está há ${daysSince} dias sem ser pesada`,
      body:  `A última pesagem de ${pet.name} foi há ${daysSince} dias. Pesar a cada 3 meses ajuda a monitorar a saúde.`,
      source: 'cron_weight_outdated',
      action_label: 'Registrar peso', action_route: `/pet/${pet.id}/health`,
    });
    return;
  }

  if (weights.length < 2) return;

  // Trend: first = newest, last = oldest
  const newest = Number(weights[0].value);
  const oldest = Number(weights[weights.length - 1].value);
  const pctChange = ((newest - oldest) / oldest) * 100;
  const daySpan   = Math.floor(
    (new Date(weights[0].measured_at).getTime() - new Date(weights[weights.length - 1].measured_at).getTime()) / 86_400_000,
  );

  if (pctChange > 10 && daySpan <= 60) {
    if (await alreadyExists(sb, pet.id, 'cron_weight_gain', 14)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'trend', urgency: 'medium',
      title: `${pet.name} ganhou ${pctChange.toFixed(1)}% de peso em ${daySpan} dias`,
      body:  `${pet.name} pesava ${oldest} kg e agora pesa ${newest} kg. Controle a alimentação e consulte o veterinário se necessário.`,
      source: 'cron_weight_gain',
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  } else if (pctChange < -10 && daySpan <= 30) {
    if (await alreadyExists(sb, pet.id, 'cron_weight_loss', 14)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: `${pet.name} perdeu ${Math.abs(pctChange).toFixed(1)}% de peso em ${daySpan} dias`,
      body:  `${pet.name} pesava ${oldest} kg e agora pesa ${newest} kg. Perda rápida de peso pode indicar problema de saúde. Consulte o veterinário.`,
      source: 'cron_weight_loss',
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  }
}

// ── Mood patterns ──────────────────────────────────────────────────────────

async function analyzeMood(sb: SB, pet: PetRow): Promise<void> {
  const { data: entries } = await sb
    .from('diary_entries')
    .select('mood_id, created_at')
    .eq('pet_id', pet.id)
    .eq('is_active', true)
    .in('mood_id', ['anxious', 'sad', 'sick', 'fearful'])
    .gte('created_at', daysAgo(14));

  if (!entries || entries.length < 3) return;

  // Count in last 7 days
  const last7 = entries.filter(e => new Date(e.created_at) > new Date(daysAgo(7)));
  if (last7.length < 3) return;
  if (await alreadyExists(sb, pet.id, 'cron_mood_negative', 7)) return;

  const mostFrequent = last7.reduce((acc: Record<string, number>, e) => {
    acc[e.mood_id] = (acc[e.mood_id] ?? 0) + 1; return acc;
  }, {});
  const topMood = Object.entries(mostFrequent).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'negativo';

  await insertInsight(sb, {
    pet_id: pet.id, user_id: pet.user_id,
    type: 'trend', urgency: 'medium',
    title: `${pet.name} está com humor ${topMood} com frequência`,
    body:  `${pet.name} apresentou humor negativo ${last7.length} vezes nos últimos 7 dias. Pode ser sinal de ansiedade ou problema de saúde. Avalie com o veterinário.`,
    source: 'cron_mood_negative',
    action_label: 'Ver diário', action_route: `/pet/${pet.id}/diary`,
  });
}

// ── Recurring symptoms ─────────────────────────────────────────────────────

async function analyzeSymptoms(sb: SB, pet: PetRow): Promise<void> {
  const { data: entries } = await sb
    .from('diary_entries')
    .select('classifications, created_at')
    .eq('pet_id', pet.id)
    .eq('primary_type', 'symptom')
    .eq('is_active', true)
    .gte('created_at', daysAgo(30));

  if (!entries || entries.length < 2) return;
  if (await alreadyExists(sb, pet.id, 'cron_symptom_recurring', 7)) return;

  // Extract symptom descriptions
  const symptoms: string[] = [];
  for (const e of entries) {
    const cls = (e.classifications as Array<{ type: string; extracted_data?: { symptom?: string; symptom_description?: string } }> | null) ?? [];
    for (const c of cls) {
      if (c.type === 'symptom' && c.extracted_data) {
        const desc = c.extracted_data.symptom_description ?? c.extracted_data.symptom ?? '';
        if (desc) symptoms.push(desc.toLowerCase().slice(0, 50));
      }
    }
  }

  if (symptoms.length < 2) return;

  await insertInsight(sb, {
    pet_id: pet.id, user_id: pet.user_id,
    type: 'alert', urgency: 'high',
    title: `${pet.name} apresentou sintomas ${entries.length} vezes em 30 dias`,
    body:  `Sintomas recorrentes detectados para ${pet.name}. Recomendamos consulta veterinária para avaliação completa.`,
    source: 'cron_symptom_recurring',
    action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
  });
}

// ── Dangerous symptom combinations ────────────────────────────────────────

async function analyzeSymptomCombinations(sb: SB, pet: PetRow): Promise<void> {
  const { data: entries } = await sb
    .from('diary_entries')
    .select('classifications, input_text, mood_id, created_at')
    .eq('pet_id', pet.id)
    .eq('is_active', true)
    .gte('created_at', daysAgo(7));

  if (!entries || entries.length === 0) return;

  // Collect signals
  const texts = entries.map(e => (e.input_text ?? '').toLowerCase()).join(' ');
  const moods  = entries.map(e => e.mood_id ?? '');
  const source = 'cron_symptom_combination';

  const has = (...words: string[]) => words.some(w => texts.includes(w));

  if (has('apatia', 'apática', 'sem apetite', 'não quer comer', 'recusando comida')) {
    if (await alreadyExists(sb, pet.id, source + '_digestive', 3)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: `Combinação de sintomas preocupante em ${pet.name}`,
      body:  `Apatia e falta de apetite simultâneas podem indicar problema sistêmico em ${pet.name}. Recomendamos consulta veterinária.`,
      source: source + '_digestive',
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  }

  if (has('beber muito', 'muita água', 'polidipsia') && has('urinar muito', 'xixi frequente')) {
    if (await alreadyExists(sb, pet.id, source + '_renal', 3)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: `Sinais de alerta renal/metabólico em ${pet.name}`,
      body:  `Polidipsia e poliúria simultâneas são sinais de alerta para doença renal ou diabetes. Consulte o veterinário com urgência.`,
      source: source + '_renal',
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  }

  if (has('tosse') && has('cansaço', 'cansada') && has('barriga inchada', 'abdômen')) {
    if (await alreadyExists(sb, pet.id, source + '_cardiac', 1)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'critical',
      title: `URGENTE: Sinais cardíacos em ${pet.name}`,
      body:  `Tosse, cansaço e abdômen distendido podem indicar problema cardíaco em ${pet.name}. Procure veterinário com urgência!`,
      source: source + '_cardiac',
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  }

  const negativeMoodCount = moods.filter(m => ['anxious', 'sad', 'sick'].includes(m)).length;
  if (negativeMoodCount >= 5 && has('não brinca', 'sem brincar') && has('não come', 'sem comer')) {
    if (await alreadyExists(sb, pet.id, source + '_depression', 3)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: `Possível depressão ou dor crônica em ${pet.name}`,
      body:  `Combinação de humor negativo persistente, inatividade e falta de apetite em ${pet.name}. Avaliação veterinária e comportamental recomendada.`,
      source: source + '_depression',
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  }
}

// ── Diary inactivity ───────────────────────────────────────────────────────

async function analyzeDiaryInactivity(sb: SB, pet: PetRow): Promise<void> {
  const { data: last } = await sb
    .from('diary_entries')
    .select('created_at')
    .eq('pet_id', pet.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!last) return;
  const days = Math.floor((Date.now() - new Date(last.created_at).getTime()) / 86_400_000);
  if (days < 3) return;
  if (await alreadyExists(sb, pet.id, 'cron_diary_inactive', 3)) return;

  await insertInsight(sb, {
    pet_id: pet.id, user_id: pet.user_id,
    type: 'reminder', urgency: 'low',
    title: `Você não registra sobre ${pet.name} há ${days} dias`,
    body:  `O diário de ${pet.name} está quieto. Como ela está? Conte o que aconteceu!`,
    source: 'cron_diary_inactive',
    action_label: 'Fazer registro', action_route: `/pet/${pet.id}/diary/new`,
  });
}

// ── Antiparasitic due ──────────────────────────────────────────────────────

async function analyzeAntiparasitic(sb: SB, pet: PetRow): Promise<void> {
  const keywords = ['%antipulgas%', '%frontline%', '%nexgard%', '%bravecto%', '%simparica%', '%seresto%'];
  let lastDate: Date | null = null;
  let product = '';

  for (const kw of keywords) {
    const { data } = await sb
      .from('diary_entries')
      .select('created_at, input_text')
      .eq('pet_id', pet.id)
      .eq('is_active', true)
      .ilike('input_text', kw)
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const d = new Date(data[0].created_at);
      if (!lastDate || d > lastDate) {
        lastDate = d;
        product = kw.replace(/%/g, '');
      }
    }
  }

  const daysSince = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / 86_400_000)
    : null;

  // Bravecto lasts ~90 days, others ~30 days
  const threshold = product === 'bravecto' ? 85 : 35;
  if (!daysSince || daysSince < threshold) return;
  if (await alreadyExists(sb, pet.id, 'cron_antiparasitic', 14)) return;

  await insertInsight(sb, {
    pet_id: pet.id, user_id: pet.user_id,
    type: 'reminder', urgency: 'medium',
    title: `Proteção antipulgas de ${pet.name} pode estar vencida`,
    body:  `A última aplicação de antipulgas de ${pet.name} foi há ${daysSince} dias${product ? ' (produto: ' + product + ')' : ''}. Verifique a proteção antiparasitária.`,
    source: 'cron_antiparasitic',
    action_label: 'Registrar aplicação', action_route: `/pet/${pet.id}/diary/new`,
  });
}

// ── Preventive care by age ─────────────────────────────────────────────────

async function analyzePreventive(sb: SB, pet: PetRow): Promise<void> {
  const months = ageMonths(pet);
  const source = `cron_preventive_${pet.id}_${today().slice(0, 7)}`; // monthly dedup
  if (await alreadyExists(sb, pet.id, source, 25)) return;

  // Annual checkup
  const { data: lastConsult } = await sb
    .from('consultations')
    .select('date')
    .eq('pet_id', pet.id)
    .eq('is_active', true)
    .order('date', { ascending: false })
    .limit(1);

  const daysSinceConsult = lastConsult?.[0]?.date
    ? Math.floor((Date.now() - new Date(lastConsult[0].date).getTime()) / 86_400_000)
    : null;

  if (months > 12 && (!daysSinceConsult || daysSinceConsult > 365)) {
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'preventive', urgency: 'medium',
      title: `${pet.name} está há mais de 1 ano sem consulta de rotina`,
      body:  `Check-up anual é recomendado para pets adultos saudáveis. Agende a consulta de rotina de ${pet.name}.`,
      source,
      action_label: 'Agendar consulta', action_route: `/pet/${pet.id}?tab=agenda`,
    });
    return;
  }

  // Senior care (> 7 years = 84 months)
  if (months > 84) {
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'preventive', urgency: 'low',
      title: `Cuidados sênior para ${pet.name}`,
      body:  `${pet.name} é um pet sênior e merece check-up semestral, hemograma e bioquímica a cada 6 meses, e avaliação de dor articular.`,
      source,
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
    return;
  }

  // Puppy/kitten (< 6 months)
  if (months < 6) {
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'preventive', urgency: 'low',
      title: `Fase essencial de ${pet.name}: vacinação e socialização`,
      body:  `${pet.name} está na fase filhote — período crítico para completar o esquema vacinal e a socialização. Consulte o veterinário sobre o calendário completo.`,
      source,
      action_label: 'Ver saúde', action_route: `/pet/${pet.id}/health`,
    });
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch all active, non-memorial pets
    const { data: pets, error } = await sb
      .from('pets')
      .select('id, name, species, breed, birth_date, estimated_age_months, user_id, weight_kg')
      .eq('is_active', true)
      .eq('is_memorial', false);

    if (error) throw error;

    let processed = 0;
    for (const pet of pets ?? []) {
      await Promise.allSettled([
        analyzeWeight(sb, pet),
        analyzeMood(sb, pet),
        analyzeSymptoms(sb, pet),
        analyzeSymptomCombinations(sb, pet),
        analyzeDiaryInactivity(sb, pet),
        analyzeAntiparasitic(sb, pet),
        analyzePreventive(sb, pet),
      ]);
      processed++;
    }

    return new Response(
      JSON.stringify({ ok: true, pets_analyzed: processed, ts: new Date().toISOString() }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[analyze-health-patterns] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
