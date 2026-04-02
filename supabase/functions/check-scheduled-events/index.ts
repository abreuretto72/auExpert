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
    .select('id, vaccine_name, next_due, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .lte('next_due', offsetDate(30))
    .order('next_due', { ascending: true });

  for (const v of vaccines ?? []) {
    const pet     = v.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const days    = daysUntil(v.next_due);
    const source  = `cron_vaccine_${v.id}`;

    let urgency: string;
    let title: string;
    let body: string;

    if (days < 0) {
      urgency = 'critical';
      title   = `Vacina ${v.vaccine_name} da ${pet.name} está vencida!`;
      body    = `A vacina ${v.vaccine_name} venceu há ${Math.abs(days)} dia(s). Agende a vacinação o quanto antes.`;
    } else if (days <= 1) {
      urgency = 'high';
      title   = `Vacina ${v.vaccine_name} da ${pet.name} vence amanhã`;
      body    = `Apenas ${days === 0 ? 'hoje' : '1 dia'} para a próxima ${v.vaccine_name}. Agende agora!`;
    } else if (days <= 7) {
      urgency = 'medium';
      title   = `Vacina ${v.vaccine_name} da ${pet.name} em ${days} dias`;
      body    = `A ${v.vaccine_name} da ${pet.name} vence em ${days} dias. Hora de agendar a vacinação.`;
    } else {
      urgency = 'low';
      title   = `Vacina ${v.vaccine_name} da ${pet.name} em ${days} dias`;
      body    = `A ${v.vaccine_name} da ${pet.name} vence em ${days} dias. Lembre-se de agendar com antecedência.`;
    }

    const windowHours = days <= 1 ? 12 : days <= 7 ? 24 : 48;
    if (await alreadyExists(sb, v.pet_id, source, v.next_due, windowHours)) continue;

    await insertInsight(sb, {
      pet_id:       v.pet_id,
      user_id:      pet.user_id,
      type:         days < 0 ? 'alert' : 'reminder',
      urgency,
      title,
      body,
      action_label: 'Agendar vacinação',
      action_route: `/pet/${v.pet_id}?tab=agenda`,
      source,
      due_date:     v.next_due,
    });
  }
}

async function checkMedications(sb: ReturnType<typeof createClient>) {
  const { data: meds } = await sb
    .from('medications')
    .select('id, medication_name, end_date, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .not('end_date', 'is', null)
    .lte('end_date', offsetDate(2))
    .gte('end_date', today());

  for (const m of meds ?? []) {
    const pet    = m.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const days   = daysUntil(m.end_date);
    const source = `cron_medication_end_${m.id}`;
    if (await alreadyExists(sb, m.pet_id, source, m.end_date)) continue;

    await insertInsight(sb, {
      pet_id:       m.pet_id,
      user_id:      pet.user_id,
      type:         'reminder',
      urgency:      'medium',
      title:        `Tratamento de ${m.medication_name} da ${pet.name} termina ${days === 0 ? 'hoje' : 'amanhã'}`,
      body:         `O tratamento com ${m.medication_name} termina em ${days <= 1 ? (days === 0 ? 'hoje' : '1 dia') : days + ' dias'}. Verifique com o veterinário se deve continuar.`,
      action_label: 'Ver diário',
      action_route: `/pet/${m.pet_id}/diary`,
      source,
      due_date:     m.end_date,
    });
  }
}

async function checkScheduledEvents(sb: ReturnType<typeof createClient>) {
  const { data: events } = await sb
    .from('scheduled_events')
    .select('id, event_type, scheduled_for, establishment, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .in('status', ['scheduled', 'confirmed'])
    .lte('scheduled_for', new Date(Date.now() + 3 * 86_400_000).toISOString())
    .gte('scheduled_for', new Date().toISOString());

  for (const ev of events ?? []) {
    const pet      = ev.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const hoursUntil = (new Date(ev.scheduled_for).getTime() - Date.now()) / 3_600_000;
    const source   = `cron_event_${ev.id}`;

    let urgency: string;
    if (hoursUntil <= 1)       urgency = 'high';
    else if (hoursUntil <= 24) urgency = 'medium';
    else                       urgency = 'low';

    const timeLabel = hoursUntil <= 1   ? 'em menos de 1 hora'
                    : hoursUntil <= 24  ? 'amanhã'
                    : `em ${Math.round(hoursUntil / 24)} dias`;

    if (await alreadyExists(sb, ev.pet_id, source, null, 6)) continue;

    const typeLabel = ev.event_type.replace(/_/g, ' ');
    await insertInsight(sb, {
      pet_id:       ev.pet_id,
      user_id:      pet.user_id,
      type:         'reminder',
      urgency,
      title:        `${typeLabel} da ${pet.name} ${timeLabel}`,
      body:         `Lembrete: ${typeLabel}${ev.establishment ? ' em ' + ev.establishment : ''} agendado para ${new Date(ev.scheduled_for).toLocaleString('pt-BR')}.`,
      action_label: 'Ver agenda',
      action_route: `/pet/${ev.pet_id}?tab=agenda`,
      source,
      due_date:     ev.scheduled_for,
    });
  }
}

async function checkPlanRenewals(sb: ReturnType<typeof createClient>) {
  const { data: plans } = await sb
    .from('pet_plans')
    .select('id, provider, plan_name, renewal_date, monthly_cost, pet_id, pets(name, user_id)')
    .eq('is_active', true)
    .not('renewal_date', 'is', null)
    .lte('renewal_date', offsetDate(7))
    .gte('renewal_date', today());

  for (const p of plans ?? []) {
    const pet    = p.pets as { name: string; user_id: string } | null;
    if (!pet) continue;
    const days   = daysUntil(p.renewal_date);
    const source = `cron_plan_renewal_${p.id}`;
    if (await alreadyExists(sb, p.pet_id, source, p.renewal_date, 48)) continue;

    await insertInsight(sb, {
      pet_id:       p.pet_id,
      user_id:      pet.user_id,
      type:         'reminder',
      urgency:      'low',
      title:        `Plano ${p.provider || p.plan_name} da ${pet.name} renova em ${days} dia(s)`,
      body:         `O plano ${p.plan_name ?? ''} da ${pet.name} renuncia em ${days} dia(s)${p.monthly_cost ? ' — R$ ' + p.monthly_cost : ''}.`,
      action_label: 'Ver plano',
      action_route: `/pet/${p.pet_id}?tab=saude`,
      source,
      due_date:     p.renewal_date,
    });
  }
}

async function checkBirthdays(sb: ReturnType<typeof createClient>) {
  const todayStr = today();
  const [todayMonth, todayDay] = [
    new Date().getMonth() + 1,
    new Date().getDate(),
  ];

  const { data: pets } = await sb
    .from('pets')
    .select('id, name, birth_date, user_id, estimated_age_months')
    .eq('is_active', true)
    .eq('is_memorial', false);

  for (const p of pets ?? []) {
    if (!p.birth_date) continue;
    const bd = new Date(p.birth_date);
    if (bd.getMonth() + 1 !== todayMonth || bd.getDate() !== todayDay) continue;

    const years = new Date().getFullYear() - bd.getFullYear();
    const source = `cron_birthday_${p.id}_${todayStr}`;
    if (await alreadyExists(sb, p.id, source, todayStr, 20)) continue;

    await insertInsight(sb, {
      pet_id:       p.id,
      user_id:      p.user_id,
      type:         'celebration',
      urgency:      'low',
      title:        `Hoje é o aniversário de ${years} ano(s) da ${p.name}!`,
      body:         `Que dia especial! ${p.name} está completando ${years} ano(s) hoje. Que tal registrar este momento no diário?`,
      action_label: 'Registrar no diário',
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
      checkPlanRenewals(sb),
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
