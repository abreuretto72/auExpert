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

// ── Translations ───────────────────────────────────────────────────────────

const TRANSLATIONS: Record<string, Record<string, string>> = {
  'pt-BR': {
    // weight
    'weight.noRecordTitle':  '{{name}} não tem peso registrado',
    'weight.noRecordBody':   'Registre o peso de {{name}} regularmente para acompanhar a saúde. Pesar a cada 3 meses é o ideal.',
    'weight.noRecordAction': 'Registrar peso',
    'weight.outdatedTitle':  '{{name}} está há {{days}} dias sem ser pesada',
    'weight.outdatedBody':   'A última pesagem de {{name}} foi há {{days}} dias. Pesar a cada 3 meses ajuda a monitorar a saúde.',
    'weight.gainTitle':      '{{name}} ganhou {{pct}}% de peso em {{days}} dias',
    'weight.gainBody':       '{{name}} pesava {{old}} kg e agora pesa {{new}} kg. Controle a alimentação e consulte o veterinário se necessário.',
    'weight.lossTitle':      '{{name}} perdeu {{pct}}% de peso em {{days}} dias',
    'weight.lossBody':       '{{name}} pesava {{old}} kg e agora pesa {{new}} kg. Perda rápida de peso pode indicar problema de saúde. Consulte o veterinário.',
    'weight.viewHealth':     'Ver saúde',
    // mood
    'mood.negativeTitle':    '{{name}} está com humor {{mood}} com frequência',
    'mood.negativeBody':     '{{name}} apresentou humor negativo {{count}} vezes nos últimos 7 dias. Pode ser sinal de ansiedade ou problema de saúde. Avalie com o veterinário.',
    'mood.viewDiary':        'Ver diário',
    // symptom
    'symptom.recurringTitle':  '{{name}} apresentou sintomas {{count}} vezes em 30 dias',
    'symptom.recurringBody':   'Sintomas recorrentes detectados para {{name}}. Recomendamos consulta veterinária para avaliação completa.',
    'symptom.viewHealth':      'Ver saúde',
    'symptom.digestiveTitle':  'Combinação de sintomas preocupante em {{name}}',
    'symptom.digestiveBody':   'Apatia e falta de apetite simultâneas podem indicar problema sistêmico em {{name}}. Recomendamos consulta veterinária.',
    'symptom.renalTitle':      'Sinais de alerta renal/metabólico em {{name}}',
    'symptom.renalBody':       'Polidipsia e poliúria simultâneas são sinais de alerta para doença renal ou diabetes. Consulte o veterinário com urgência.',
    'symptom.cardiacTitle':    'URGENTE: Sinais cardíacos em {{name}}',
    'symptom.cardiacBody':     'Tosse, cansaço e abdômen distendido podem indicar problema cardíaco em {{name}}. Procure veterinário com urgência!',
    'symptom.depressionTitle': 'Possível depressão ou dor crônica em {{name}}',
    'symptom.depressionBody':  'Combinação de humor negativo persistente, inatividade e falta de apetite em {{name}}. Avaliação veterinária e comportamental recomendada.',
    // diary
    'diary.inactiveTitle': 'Você não registra sobre {{name}} há {{days}} dias',
    'diary.inactiveBody':  'O diário de {{name}} está quieto. Como ela está? Conte o que aconteceu!',
    'diary.addEntry':      'Fazer registro',
    // antiparasitic
    'anti.dueTitle':      'Proteção antipulgas de {{name}} pode estar vencida',
    'anti.dueBody':       'A última aplicação de antipulgas de {{name}} foi há {{days}} dias{{product}}. Verifique a proteção antiparasitária.',
    'anti.productSuffix': ' (produto: {{product}})',
    'anti.addEntry':      'Registrar aplicação',
    // preventive
    'prev.annualTitle':  '{{name}} está há mais de 1 ano sem consulta de rotina',
    'prev.annualBody':   'Check-up anual é recomendado para pets adultos saudáveis. Agende a consulta de rotina de {{name}}.',
    'prev.annualAction': 'Agendar consulta',
    'prev.seniorTitle':  'Cuidados sênior para {{name}}',
    'prev.seniorBody':   '{{name}} é um pet sênior e merece check-up semestral, hemograma e bioquímica a cada 6 meses, e avaliação de dor articular.',
    'prev.puppyTitle':   'Fase essencial de {{name}}: vacinação e socialização',
    'prev.puppyBody':    '{{name}} está na fase filhote — período crítico para completar o esquema vacinal e a socialização. Consulte o veterinário sobre o calendário completo.',
    'prev.viewHealth':   'Ver saúde',
  },
  'en': {
    // weight
    'weight.noRecordTitle':  '{{name}} has no weight recorded',
    'weight.noRecordBody':   "Record {{name}}'s weight regularly to track health. Weighing every 3 months is ideal.",
    'weight.noRecordAction': 'Record weight',
    'weight.outdatedTitle':  "{{name}} hasn't been weighed in {{days}} days",
    'weight.outdatedBody':   "{{name}}'s last weigh-in was {{days}} days ago. Weighing every 3 months helps monitor health.",
    'weight.gainTitle':      '{{name}} gained {{pct}}% weight in {{days}} days',
    'weight.gainBody':       '{{name}} weighed {{old}} kg and now weighs {{new}} kg. Control their diet and consult the vet if needed.',
    'weight.lossTitle':      '{{name}} lost {{pct}}% weight in {{days}} days',
    'weight.lossBody':       '{{name}} weighed {{old}} kg and now weighs {{new}} kg. Rapid weight loss may indicate a health issue. Consult your vet.',
    'weight.viewHealth':     'View health',
    // mood
    'mood.negativeTitle':    '{{name}} frequently shows {{mood}} mood',
    'mood.negativeBody':     '{{name}} showed negative mood {{count}} times in the last 7 days. This may indicate anxiety or a health issue. Consult your vet.',
    'mood.viewDiary':        'View diary',
    // symptom
    'symptom.recurringTitle':  '{{name}} showed symptoms {{count}} times in 30 days',
    'symptom.recurringBody':   'Recurring symptoms detected for {{name}}. We recommend a vet consultation for a full evaluation.',
    'symptom.viewHealth':      'View health',
    'symptom.digestiveTitle':  'Concerning symptom combination in {{name}}',
    'symptom.digestiveBody':   'Simultaneous lethargy and loss of appetite may indicate a systemic issue in {{name}}. We recommend a vet visit.',
    'symptom.renalTitle':      'Renal/metabolic warning signs in {{name}}',
    'symptom.renalBody':       'Simultaneous polydipsia and polyuria are warning signs for kidney disease or diabetes. Consult your vet urgently.',
    'symptom.cardiacTitle':    'URGENT: Cardiac signs in {{name}}',
    'symptom.cardiacBody':     'Cough, fatigue and distended abdomen may indicate a cardiac issue in {{name}}. Seek vet care urgently!',
    'symptom.depressionTitle': 'Possible depression or chronic pain in {{name}}',
    'symptom.depressionBody':  'Persistent negative mood, inactivity and loss of appetite in {{name}}. Veterinary and behavioral evaluation recommended.',
    // diary
    'diary.inactiveTitle': "You haven't logged about {{name}} in {{days}} days",
    'diary.inactiveBody':  "{{name}}'s diary has been quiet. How are they doing? Tell us what happened!",
    'diary.addEntry':      'Add entry',
    // antiparasitic
    'anti.dueTitle':      "{{name}}'s flea protection may be overdue",
    'anti.dueBody':       "{{name}}'s last flea treatment was {{days}} days ago{{product}}. Check their antiparasitic protection.",
    'anti.productSuffix': ' (product: {{product}})',
    'anti.addEntry':      'Record application',
    // preventive
    'prev.annualTitle':  "{{name}} hasn't had a routine checkup in over 1 year",
    'prev.annualBody':   "Annual checkups are recommended for healthy adult pets. Schedule {{name}}'s routine consultation.",
    'prev.annualAction': 'Schedule appointment',
    'prev.seniorTitle':  'Senior care for {{name}}',
    'prev.seniorBody':   '{{name}} is a senior pet and deserves biannual checkups, blood panel every 6 months, and joint pain evaluation.',
    'prev.puppyTitle':   'Essential phase for {{name}}: vaccination and socialization',
    'prev.puppyBody':    '{{name}} is in the puppy/kitten phase — critical period to complete the vaccination schedule and socialization. Consult your vet about the full calendar.',
    'prev.viewHealth':   'View health',
  },
};

function t(lang: string, key: string, vars?: Record<string, string | number>): string {
  const map = TRANSLATIONS[lang.startsWith('pt') ? 'pt-BR' : 'en'] ?? TRANSLATIONS['pt-BR'];
  let str = map[key] ?? TRANSLATIONS['pt-BR'][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return str;
}

// ── User language cache ────────────────────────────────────────────────────

const userLangCache = new Map<string, string>();

async function getUserLanguage(sb: SB, userId: string): Promise<string> {
  if (userLangCache.has(userId)) return userLangCache.get(userId)!;
  const { data } = await sb.from('users').select('language').eq('id', userId).single();
  const lang = (data as { language?: string } | null)?.language ?? 'pt-BR';
  userLangCache.set(userId, lang);
  return lang;
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

async function analyzeWeight(sb: SB, pet: PetRow, lang: string): Promise<void> {
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
      title: t(lang, 'weight.noRecordTitle', { name: pet.name }),
      body:  t(lang, 'weight.noRecordBody',  { name: pet.name }),
      source: 'cron_weight_missing',
      action_label: t(lang, 'weight.noRecordAction'),
      action_route: `/pet/${pet.id}/health`,
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
      title: t(lang, 'weight.outdatedTitle', { name: pet.name, days: daysSince }),
      body:  t(lang, 'weight.outdatedBody',  { name: pet.name, days: daysSince }),
      source: 'cron_weight_outdated',
      action_label: t(lang, 'weight.noRecordAction'),
      action_route: `/pet/${pet.id}/health`,
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
      title: t(lang, 'weight.gainTitle', { name: pet.name, pct: pctChange.toFixed(1), days: daySpan }),
      body:  t(lang, 'weight.gainBody',  { name: pet.name, old: oldest, new: newest }),
      source: 'cron_weight_gain',
      action_label: t(lang, 'weight.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
  } else if (pctChange < -10 && daySpan <= 30) {
    if (await alreadyExists(sb, pet.id, 'cron_weight_loss', 14)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: t(lang, 'weight.lossTitle', { name: pet.name, pct: Math.abs(pctChange).toFixed(1), days: daySpan }),
      body:  t(lang, 'weight.lossBody',  { name: pet.name, old: oldest, new: newest }),
      source: 'cron_weight_loss',
      action_label: t(lang, 'weight.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
  }
}

// ── Mood patterns ──────────────────────────────────────────────────────────

async function analyzeMood(sb: SB, pet: PetRow, lang: string): Promise<void> {
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
    title: t(lang, 'mood.negativeTitle', { name: pet.name, mood: topMood }),
    body:  t(lang, 'mood.negativeBody',  { name: pet.name, count: last7.length }),
    source: 'cron_mood_negative',
    action_label: t(lang, 'mood.viewDiary'),
    action_route: `/pet/${pet.id}/diary`,
  });
}

// ── Recurring symptoms ─────────────────────────────────────────────────────

async function analyzeSymptoms(sb: SB, pet: PetRow, lang: string): Promise<void> {
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
    title: t(lang, 'symptom.recurringTitle', { name: pet.name, count: entries.length }),
    body:  t(lang, 'symptom.recurringBody',  { name: pet.name }),
    source: 'cron_symptom_recurring',
    action_label: t(lang, 'symptom.viewHealth'),
    action_route: `/pet/${pet.id}/health`,
  });
}

// ── Dangerous symptom combinations ────────────────────────────────────────

async function analyzeSymptomCombinations(sb: SB, pet: PetRow, lang: string): Promise<void> {
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
      title: t(lang, 'symptom.digestiveTitle', { name: pet.name }),
      body:  t(lang, 'symptom.digestiveBody',  { name: pet.name }),
      source: source + '_digestive',
      action_label: t(lang, 'symptom.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
  }

  if (has('beber muito', 'muita água', 'polidipsia') && has('urinar muito', 'xixi frequente')) {
    if (await alreadyExists(sb, pet.id, source + '_renal', 3)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: t(lang, 'symptom.renalTitle', { name: pet.name }),
      body:  t(lang, 'symptom.renalBody',  { name: pet.name }),
      source: source + '_renal',
      action_label: t(lang, 'symptom.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
  }

  if (has('tosse') && has('cansaço', 'cansada') && has('barriga inchada', 'abdômen')) {
    if (await alreadyExists(sb, pet.id, source + '_cardiac', 1)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'critical',
      title: t(lang, 'symptom.cardiacTitle', { name: pet.name }),
      body:  t(lang, 'symptom.cardiacBody',  { name: pet.name }),
      source: source + '_cardiac',
      action_label: t(lang, 'symptom.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
  }

  const negativeMoodCount = moods.filter(m => ['anxious', 'sad', 'sick'].includes(m)).length;
  if (negativeMoodCount >= 5 && has('não brinca', 'sem brincar') && has('não come', 'sem comer')) {
    if (await alreadyExists(sb, pet.id, source + '_depression', 3)) return;
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'alert', urgency: 'high',
      title: t(lang, 'symptom.depressionTitle', { name: pet.name }),
      body:  t(lang, 'symptom.depressionBody',  { name: pet.name }),
      source: source + '_depression',
      action_label: t(lang, 'symptom.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
  }
}

// ── Diary inactivity ───────────────────────────────────────────────────────

async function analyzeDiaryInactivity(sb: SB, pet: PetRow, lang: string): Promise<void> {
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
    title: t(lang, 'diary.inactiveTitle', { name: pet.name, days }),
    body:  t(lang, 'diary.inactiveBody',  { name: pet.name }),
    source: 'cron_diary_inactive',
    action_label: t(lang, 'diary.addEntry'),
    action_route: `/pet/${pet.id}/diary/new`,
  });
}

// ── Antiparasitic due ──────────────────────────────────────────────────────

async function analyzeAntiparasitic(sb: SB, pet: PetRow, lang: string): Promise<void> {
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

  const productSuffix = product ? t(lang, 'anti.productSuffix', { product }) : '';

  await insertInsight(sb, {
    pet_id: pet.id, user_id: pet.user_id,
    type: 'reminder', urgency: 'medium',
    title: t(lang, 'anti.dueTitle', { name: pet.name }),
    body:  t(lang, 'anti.dueBody',  { name: pet.name, days: daysSince, product: productSuffix }),
    source: 'cron_antiparasitic',
    action_label: t(lang, 'anti.addEntry'),
    action_route: `/pet/${pet.id}/diary/new`,
  });
}

// ── Preventive care by age ─────────────────────────────────────────────────

async function analyzePreventive(sb: SB, pet: PetRow, lang: string): Promise<void> {
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
      title: t(lang, 'prev.annualTitle', { name: pet.name }),
      body:  t(lang, 'prev.annualBody',  { name: pet.name }),
      source,
      action_label: t(lang, 'prev.annualAction'),
      action_route: `/pet/${pet.id}?tab=agenda`,
    });
    return;
  }

  // Senior care (> 7 years = 84 months)
  if (months > 84) {
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'preventive', urgency: 'low',
      title: t(lang, 'prev.seniorTitle', { name: pet.name }),
      body:  t(lang, 'prev.seniorBody',  { name: pet.name }),
      source,
      action_label: t(lang, 'prev.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
    });
    return;
  }

  // Puppy/kitten (< 6 months)
  if (months < 6) {
    await insertInsight(sb, {
      pet_id: pet.id, user_id: pet.user_id,
      type: 'preventive', urgency: 'low',
      title: t(lang, 'prev.puppyTitle', { name: pet.name }),
      body:  t(lang, 'prev.puppyBody',  { name: pet.name }),
      source,
      action_label: t(lang, 'prev.viewHealth'),
      action_route: `/pet/${pet.id}/health`,
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
      const lang = await getUserLanguage(sb, pet.user_id);
      await Promise.allSettled([
        analyzeWeight(sb, pet, lang),
        analyzeMood(sb, pet, lang),
        analyzeSymptoms(sb, pet, lang),
        analyzeSymptomCombinations(sb, pet, lang),
        analyzeDiaryInactivity(sb, pet, lang),
        analyzeAntiparasitic(sb, pet, lang),
        analyzePreventive(sb, pet, lang),
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
