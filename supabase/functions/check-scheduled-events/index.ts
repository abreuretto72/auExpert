/**
 * check-scheduled-events — CRON Edge Function
 *
 * Runs 2x/day (07:00 and 20:00 BRT).
 * Generates pet_insights for:
 *   - Vaccines due (30d / 7d / 1d / overdue)
 *   - Medications ending soon (≤ 2 days)
 *   - Scheduled events coming up (72h / 24h / 1h)
 *   - Plan renewals (≤ 7 days)
 *   - Pet birthdays (today)
 *   - Adoption anniversaries (today)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Translations ───────────────────────────────────────────────────────────

type Lang = string;

const TRANSLATIONS: Record<string, Record<string, string>> = {
  'pt-BR': {
    vaccineOverdueTitle:    'Vacina {{name}} da {{pet}} está vencida!',
    vaccineOverdueBody:     'A vacina {{name}} venceu há {{days}} dia(s). Agende a vacinação o quanto antes.',
    vaccineTomorrowTitle:   'Vacina {{name}} da {{pet}} vence amanhã',
    vaccineTomorrowBody:    'Apenas {{days}} para a próxima {{name}}. Agende agora!',
    vaccineTomorrowDays:    'hoje',
    vaccineTomorrowDays1:   '1 dia',
    vaccineSoonTitle:       'Vacina {{name}} da {{pet}} em {{days}} dias',
    vaccineSoonBody:        'A {{name}} da {{pet}} vence em {{days}} dias. Hora de agendar a vacinação.',
    vaccineUpcomingTitle:   'Vacina {{name}} da {{pet}} em {{days}} dias',
    vaccineUpcomingBody:    'A {{name}} da {{pet}} vence em {{days}} dias. Lembre-se de agendar com antecedência.',
    vaccineActionLabel:     'Agendar vacinação',
    medEndTitle:            'Tratamento de {{name}} da {{pet}} termina {{when}}',
    medEndToday:            'hoje',
    medEndTomorrow:         'amanhã',
    medEndBody:             'O tratamento com {{name}} termina em {{when}}. Verifique com o veterinário se deve continuar.',
    medEndBodyToday:        'hoje',
    medEndBody1Day:         '1 dia',
    medEndBodyDays:         '{{days}} dias',
    medActionLabel:         'Ver diário',
    eventTitle:             '{{type}} da {{pet}} {{when}}',
    eventWhen1h:            'em menos de 1 hora',
    eventWhen24h:           'amanhã',
    eventWhenDays:          'em {{days}} dias',
    eventBody:              'Lembrete: {{type}}{{place}} agendado para {{date}}.',
    eventBodyPlace:         ' em {{place}}',
    eventActionLabel:       'Ver agenda',
    planTitle:              'Plano {{provider}} da {{pet}} renova em {{days}} dia(s)',
    planBody:               'O plano {{plan}} da {{pet}} renova em {{days}} dia(s){{cost}}.',
    planCost:               ' — R$ {{cost}}',
    planActionLabel:        'Ver plano',
    birthdayTitle:          'Hoje é o aniversário de {{years}} ano(s) da {{pet}}!',
    birthdayBody:           'Que dia especial! {{pet}} está completando {{years}} ano(s) hoje. Que tal registrar este momento no diário?',
    birthdayActionLabel:    'Registrar no diário',
  },
  'en': {
    vaccineOverdueTitle:    '{{pet}}\'s {{name}} vaccine is overdue!',
    vaccineOverdueBody:     'The {{name}} vaccine expired {{days}} day(s) ago. Schedule the vaccination as soon as possible.',
    vaccineTomorrowTitle:   '{{pet}}\'s {{name}} vaccine is due tomorrow',
    vaccineTomorrowBody:    'Only {{days}} until {{pet}}\'s next {{name}}. Schedule now!',
    vaccineTomorrowDays:    'today',
    vaccineTomorrowDays1:   '1 day',
    vaccineSoonTitle:       '{{pet}}\'s {{name}} vaccine is due in {{days}} days',
    vaccineSoonBody:        '{{pet}}\'s {{name}} is due in {{days}} days. Time to schedule the vaccination.',
    vaccineUpcomingTitle:   '{{pet}}\'s {{name}} vaccine is due in {{days}} days',
    vaccineUpcomingBody:    '{{pet}}\'s {{name}} is due in {{days}} days. Remember to schedule in advance.',
    vaccineActionLabel:     'Schedule vaccination',
    medEndTitle:            '{{pet}}\'s {{name}} treatment ends {{when}}',
    medEndToday:            'today',
    medEndTomorrow:         'tomorrow',
    medEndBody:             'The treatment with {{name}} ends in {{when}}. Check with your vet if it should continue.',
    medEndBodyToday:        'today',
    medEndBody1Day:         '1 day',
    medEndBodyDays:         '{{days}} days',
    medActionLabel:         'View diary',
    eventTitle:             '{{pet}}\'s {{type}} {{when}}',
    eventWhen1h:            'in less than 1 hour',
    eventWhen24h:           'tomorrow',
    eventWhenDays:          'in {{days}} days',
    eventBody:              'Reminder: {{type}}{{place}} scheduled for {{date}}.',
    eventBodyPlace:         ' at {{place}}',
    eventActionLabel:       'View agenda',
    planTitle:              '{{pet}}\'s {{provider}} plan renews in {{days}} day(s)',
    planBody:               '{{pet}}\'s {{plan}} plan renews in {{days}} day(s){{cost}}.',
    planCost:               ' — ${{cost}}',
    planActionLabel:        'View plan',
    birthdayTitle:          'Today is {{pet}}\'s {{years}}-year birthday!',
    birthdayBody:           'What a special day! {{pet}} is turning {{years}} year(s) old today. Why not record this moment in the diary?',
    birthdayActionLabel:    'Add to diary',
  },
};

function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const map = TRANSLATIONS[lang.startsWith('pt') ? 'pt-BR' : 'en'] ?? TRANSLATIONS['pt-BR'];
  let str = map[key] ?? TRANSLATIONS['pt-BR'][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return str;
}

// ── Types ──────────────────────────────────────────────────────────────────

interface InsightRow {
  pet_id:       string;
  user_id:      string;
  type:         string;
  urgency:      string;
  title:        string;
  body:         string;
  action_label: string | null;
  action_route: string | null;
  source:       string;
  due_date:     string | null;
}

// ── Deduplication check ────────────────────────────────────────────────────

async function alreadyExists(
  sb: ReturnType<typeof createClient>,
  petId: string,
  source: string,
  dueDateIso: string | null,
  windowHours = 24,
): Promise<boolean> {
  const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
  let q = sb
    .from('pet_insights')
    .select('id', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('source', source)
    .gte('created_at', since);

  if (dueDateIso) {
    q = q.eq('due_date', dueDateIso);
  }

  const { count } = await q;
  return (count ?? 0) > 0;
}

// ── Insert helper ──────────────────────────────────────────────────────────

async function insertInsight(
  sb: ReturnType<typeof createClient>,
  row: InsightRow,
): Promise<void> {
  const { error } = await sb.from('pet_insights').insert({ ...row, is_active: true });
  if (error) console.error('[check-scheduled-events] insert error:', error.message);
}

// ── User language cache ────────────────────────────────────────────────────

const userLangCache = new Map<string, string>();

async function getUserLanguage(
  sb: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  if (userLangCache.has(userId)) return userLangCache.get(userId)!;
  const { data } = await sb.from('users').select('language').eq('id', userId).single();
  const lang = (data as { language?: string } | null)?.language ?? 'pt-BR';
  userLangCache.set(userId, lang);
  return lang;
}

// ── Date helpers ───────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const then = new Date(dateStr); then.setHours(0, 0, 0, 0);
  return Math.round((then.getTime() - now.getTime()) / 86_400_000);
}

function today(): string { return new Date().toISOString().slice(0, 10); }
function offsetDate(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Handlers ───────────────────────────────────────────────────────────────

async function checkVaccines(sb: ReturnType<typeof createClient>) {
  const { data: vaccines } = await sb
    .from('vaccines')
    .select('id, name, next_due_date, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .lte('next_due_date', offsetDate(30))
    .order('next_due_date', { ascending: true });

  for (const v of vaccines ?? []) {
    const pet     = v.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const days    = daysUntil(v.next_due_date);
    const source  = `cron_vaccine_${v.id}`;
    const lang    = await getUserLanguage(sb, pet.user_id);

    let urgency: string;
    let title: string;
    let body: string;

    if (days < 0) {
      urgency = 'critical';
      title   = t(lang, 'vaccineOverdueTitle', { name: v.name, pet: pet.name });
      body    = t(lang, 'vaccineOverdueBody',  { name: v.name, days: Math.abs(days) });
    } else if (days <= 1) {
      urgency = 'high';
      title   = t(lang, 'vaccineTomorrowTitle', { name: v.name, pet: pet.name });
      const daysWord = days === 0 ? t(lang, 'vaccineTomorrowDays') : t(lang, 'vaccineTomorrowDays1');
      body    = t(lang, 'vaccineTomorrowBody',  { name: v.name, pet: pet.name, days: daysWord });
    } else if (days <= 7) {
      urgency = 'medium';
      title   = t(lang, 'vaccineSoonTitle',     { name: v.name, pet: pet.name, days });
      body    = t(lang, 'vaccineSoonBody',      { name: v.name, pet: pet.name, days });
    } else {
      urgency = 'low';
      title   = t(lang, 'vaccineUpcomingTitle', { name: v.name, pet: pet.name, days });
      body    = t(lang, 'vaccineUpcomingBody',  { name: v.name, pet: pet.name, days });
    }

    const windowHours = days <= 1 ? 12 : days <= 7 ? 24 : 48;
    if (await alreadyExists(sb, v.pet_id, source, v.next_due_date, windowHours)) continue;

    await insertInsight(sb, {
      pet_id:       v.pet_id,
      user_id:      pet.user_id,
      type:         days < 0 ? 'alert' : 'reminder',
      urgency,
      title,
      body,
      action_label: t(lang, 'vaccineActionLabel'),
      action_route: `/pet/${v.pet_id}?tab=agenda`,
      source,
      due_date:     v.next_due_date,
    });
  }
}

async function checkMedications(sb: ReturnType<typeof createClient>) {
  const { data: meds } = await sb
    .from('medications')
    .select('id, name, end_date, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .not('end_date', 'is', null)
    .lte('end_date', offsetDate(2))
    .gte('end_date', today());

  for (const m of meds ?? []) {
    const pet    = m.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const days   = daysUntil(m.end_date);
    const source = `cron_medication_end_${m.id}`;
    const lang   = await getUserLanguage(sb, pet.user_id);
    if (await alreadyExists(sb, m.pet_id, source, m.end_date)) continue;

    const whenTitle = days === 0 ? t(lang, 'medEndToday') : t(lang, 'medEndTomorrow');
    const whenBody  = days <= 1
      ? (days === 0 ? t(lang, 'medEndBodyToday') : t(lang, 'medEndBody1Day'))
      : t(lang, 'medEndBodyDays', { days });

    await insertInsight(sb, {
      pet_id:       m.pet_id,
      user_id:      pet.user_id,
      type:         'reminder',
      urgency:      'medium',
      title:        t(lang, 'medEndTitle', { name: m.name, pet: pet.name, when: whenTitle }),
      body:         t(lang, 'medEndBody',  { name: m.name, when: whenBody }),
      action_label: t(lang, 'medActionLabel'),
      action_route: `/pet/${m.pet_id}/diary`,
      source,
      due_date:     m.end_date,
    });
  }
}

async function checkScheduledEvents(sb: ReturnType<typeof createClient>) {
  const { data: events } = await sb
    .from('scheduled_events')
    .select('id, event_type, scheduled_for, location, pet_id, user_id, pets(name)')
    .eq('is_active', true)
    .in('status', ['scheduled', 'confirmed'])
    .lte('scheduled_for', new Date(Date.now() + 3 * 86_400_000).toISOString())
    .gte('scheduled_for', new Date().toISOString());

  for (const ev of events ?? []) {
    const petData  = ev.pets as { name: string } | null;
    const petName  = petData?.name ?? '';
    const userId   = ev.user_id as string;
    const hoursUntil = (new Date(ev.scheduled_for).getTime() - Date.now()) / 3_600_000;
    const source   = `cron_event_${ev.id}`;
    const lang     = await getUserLanguage(sb, userId);

    let urgency: string;
    if (hoursUntil <= 1)       urgency = 'high';
    else if (hoursUntil <= 24) urgency = 'medium';
    else                       urgency = 'low';

    const when = hoursUntil <= 1
      ? t(lang, 'eventWhen1h')
      : hoursUntil <= 24
        ? t(lang, 'eventWhen24h')
        : t(lang, 'eventWhenDays', { days: Math.round(hoursUntil / 24) });

    if (await alreadyExists(sb, ev.pet_id, source, null, 6)) continue;

    const typeLabel = ev.event_type.replace(/_/g, ' ');
    const placeStr  = ev.location ? t(lang, 'eventBodyPlace', { place: ev.location }) : '';
    const dateStr   = new Date(ev.scheduled_for).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' });

    await insertInsight(sb, {
      pet_id:       ev.pet_id,
      user_id:      userId,
      type:         'reminder',
      urgency,
      title:        t(lang, 'eventTitle', { type: typeLabel, pet: petName, when }),
      body:         t(lang, 'eventBody',  { type: typeLabel, place: placeStr, date: dateStr }),
      action_label: t(lang, 'eventActionLabel'),
      action_route: `/pet/${ev.pet_id}?tab=agenda`,
      source,
      due_date:     ev.scheduled_for,
    });
  }
}

async function checkPlanRenewals(sb: ReturnType<typeof createClient>) {
  const { data: plans } = await sb
    .from('pet_plans')
    .select('id, provider, plan_name, renewal_date, monthly_cost, currency, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .not('renewal_date', 'is', null)
    .lte('renewal_date', offsetDate(7))
    .gte('renewal_date', today());

  for (const p of plans ?? []) {
    const pet    = p.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const days   = daysUntil(p.renewal_date);
    const source = `cron_plan_renewal_${p.id}`;
    const lang   = await getUserLanguage(sb, pet.user_id);
    if (await alreadyExists(sb, p.pet_id, source, p.renewal_date, 48)) continue;

    const costStr = p.monthly_cost ? t(lang, 'planCost', { cost: p.monthly_cost }) : '';

    await insertInsight(sb, {
      pet_id:       p.pet_id,
      user_id:      pet.user_id,
      type:         'reminder',
      urgency:      'low',
      title:        t(lang, 'planTitle', { provider: p.provider || p.plan_name || '', pet: pet.name, days }),
      body:         t(lang, 'planBody',  { plan: p.plan_name ?? '', pet: pet.name, days, cost: costStr }),
      action_label: t(lang, 'planActionLabel'),
      action_route: `/pet/${p.pet_id}?tab=saude`,
      source,
      due_date:     p.renewal_date,
    });
  }
}

async function checkBirthdays(sb: ReturnType<typeof createClient>) {
  const todayStr = today();
  const todayMonth = new Date().getMonth() + 1;
  const todayDay   = new Date().getDate();

  const { data: pets } = await sb
    .from('pets')
    .select('id, name, birth_date, user_id, estimated_age_months')
    .eq('is_active', true)
    .eq('is_memorial', false);

  for (const p of pets ?? []) {
    if (!p.birth_date) continue;
    const bd = new Date(p.birth_date);
    if (bd.getMonth() + 1 !== todayMonth || bd.getDate() !== todayDay) continue;

    const years  = new Date().getFullYear() - bd.getFullYear();
    const source = `cron_birthday_${p.id}_${todayStr}`;
    const lang   = await getUserLanguage(sb, p.user_id);
    if (await alreadyExists(sb, p.id, source, todayStr, 20)) continue;

    await insertInsight(sb, {
      pet_id:       p.id,
      user_id:      p.user_id,
      type:         'celebration',
      urgency:      'low',
      title:        t(lang, 'birthdayTitle', { pet: p.name, years }),
      body:         t(lang, 'birthdayBody',  { pet: p.name, years }),
      action_label: t(lang, 'birthdayActionLabel'),
      action_route: `/pet/${p.id}/diary/new`,
      source,
      due_date:     todayStr,
    });
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    await Promise.allSettled([
      checkVaccines(sb),
      checkMedications(sb),
      checkScheduledEvents(sb),
      // checkPlanRenewals(sb), // pet_plans table not yet created
      checkBirthdays(sb),
    ]);

    return new Response(
      JSON.stringify({ ok: true, ts: new Date().toISOString() }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[check-scheduled-events] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
