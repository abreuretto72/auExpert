/**
 * agendaPdf.ts
 *
 * Builds a full-agenda PDF (past 12 months + future 12 months of scheduled events
 * and diary entries), grouped by date, split into past vs upcoming sections.
 *
 * Called from app/(app)/pet/[id]/agenda-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';

// ── Constants ─────────────────────────────────────────────────────────────────
export const MAX_AGENDA_ENTRIES = 400;

const STATUS_COLOR: Record<string, string> = {
  scheduled:  colors.petrol,
  confirmed:  colors.success,
  done:       colors.success,
  cancelled:  colors.textDim,
  missed:     colors.danger,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgendaPdfRow {
  kind: 'event' | 'diary';
  date: Date;          // real Date in device local tz
  all_day: boolean;
  title: string;
  sub: string;
  category: string;
  status: string | null;
  is_recurring: boolean;
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchAgendaRows(petId: string): Promise<AgendaPdfRow[]> {
  const now = new Date();
  const from = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
  const to   = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [eventsRes, diaryRes] = await Promise.all([
    supabase
      .from('scheduled_events')
      .select('id, event_type, title, description, professional, location, scheduled_for, all_day, status, is_recurring')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .gte('scheduled_for', from)
      .lte('scheduled_for', to)
      .order('scheduled_for', { ascending: true }),
    supabase
      .from('diary_entries')
      .select('id, primary_type, narration, entry_date, created_at, classifications')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .gte('entry_date', from.slice(0, 10))
      .lte('entry_date', to.slice(0, 10))
      .order('entry_date', { ascending: false }),
  ]);

  if (eventsRes.error) throw eventsRes.error;
  if (diaryRes.error) throw diaryRes.error;

  const eventRows: AgendaPdfRow[] = (eventsRes.data ?? []).map((e) => ({
    kind: 'event',
    date: new Date(e.scheduled_for),
    all_day: e.all_day,
    title: e.title,
    sub: [e.professional, e.location, e.description].filter(Boolean).join(' · '),
    category: e.event_type,
    status: e.status,
    is_recurring: e.is_recurring,
  }));

  const diaryRows: AgendaPdfRow[] = (diaryRes.data ?? []).map((e) => {
    const cls = (e.classifications as Array<{ extracted_data?: Record<string, unknown> }> | null) ?? [];
    const d = cls[0]?.extracted_data ?? {};
    return {
      kind: 'diary' as const,
      date: new Date(e.created_at),
      all_day: false,
      title: buildDiaryTitle(e.primary_type, d),
      sub: (e.narration ?? '').slice(0, 140),
      category: e.primary_type,
      status: null,
      is_recurring: false,
    };
  });

  // Newest first for past, oldest first (chronological) for upcoming is handled at render.
  const all = [...eventRows, ...diaryRows].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
  return all.slice(0, MAX_AGENDA_ENTRIES);
}

function buildDiaryTitle(primary: string, d: Record<string, unknown>): string {
  const t = i18n.t.bind(i18n);
  switch (primary) {
    case 'vaccine':      return `${t('agenda.typeVaccine')}${d.vaccine_name ? ` · ${d.vaccine_name}` : ''}`;
    case 'exam':         return `${t('agenda.typeExam')}${d.exam_name ? ` · ${d.exam_name}` : ''}`;
    case 'medication':   return `${t('agenda.typeMedication')}${d.medication_name ? ` · ${d.medication_name}` : ''}`;
    case 'consultation': return d.clinic ? `${t('agenda.typeConsultation').split(' ')[0]} · ${d.clinic}` : t('agenda.typeConsultation');
    case 'weight':       return t('agenda.typeWeight', { value: d.value ?? '?', unit: d.unit ?? 'kg' });
    case 'expense':      return `${d.merchant_name ?? t('agenda.typeExpense')}${d.total ? ` · ${d.total}` : ''}`.trimEnd().replace(/ ·$/, '');
    case 'travel':       return d.destination ? t('agenda.typeTravelTo', { destination: d.destination }) : t('agenda.typeTravel');
    case 'connection':   return d.friend_name ? t('agenda.typeConnectionWith', { name: d.friend_name }) : t('agenda.typeConnection');
    case 'surgery':      return t('agenda.typeSurgery');
    case 'allergy':      return t('agenda.typeAllergy');
    default:             return t('agenda.typeDiaryEntry');
  }
}

// ── HTML builder ──────────────────────────────────────────────────────────────
function escHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDateHeader(d: Date, lang: string): string {
  return d.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function statusLabel(status: string | null): string {
  if (!status) return '';
  const key = `agendaPdf.status_${status}`;
  const translated = i18n.t(key);
  return translated === key ? status : translated;
}

function buildBody(rows: AgendaPdfRow[]): string {
  const lang = i18n.language;
  const t = i18n.t.bind(i18n);
  const now = Date.now();

  const upcoming = rows.filter((r) => r.date.getTime() >= now).sort((a, b) => a.date.getTime() - b.date.getTime());
  const past = rows.filter((r) => r.date.getTime() < now).sort((a, b) => b.date.getTime() - a.date.getTime());

  if (rows.length === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  const renderRow = (row: AgendaPdfRow): string => {
    const timeStr = row.all_day ? t('agendaPdf.allDay') : formatTime(row.date);
    const statusPill = row.status
      ? `<span style="background:${STATUS_COLOR[row.status] ?? '#888'}22;color:${STATUS_COLOR[row.status] ?? '#888'};border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:6px;">${escHtml(statusLabel(row.status))}</span>`
      : '';
    const recurring = row.is_recurring
      ? `<span style="background:${colors.accent}22;color:${colors.accent};border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:6px;">${escHtml(t('agendaPdf.recurrent'))}</span>`
      : '';
    return `<div style="border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:11px;color:#666;font-weight:600;">${escHtml(timeStr)}${statusPill}${recurring}</span>
        <span style="font-size:9px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(row.kind)}</span>
      </div>
      <div style="font-size:13px;font-weight:600;color:#222;">${escHtml(row.title)}</div>
      ${row.sub ? `<div style="font-size:11px;color:#666;margin-top:3px;">${escHtml(row.sub)}</div>` : ''}
    </div>`;
  };

  // Group rows by date for each section
  const groupByDate = (list: AgendaPdfRow[]): Map<string, AgendaPdfRow[]> => {
    const map = new Map<string, AgendaPdfRow[]>();
    list.forEach((r) => {
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return map;
  };

  const renderSection = (heading: string, list: AgendaPdfRow[]): string => {
    if (list.length === 0) return '';
    const groups = groupByDate(list);
    const groupsHtml = [...groups.entries()].map(([, items]) => {
      const dateStr = formatDateHeader(items[0].date, lang);
      const itemsHtml = items.map(renderRow).join('');
      return `<div style="margin-bottom:14px;page-break-inside:avoid;">
        <h3 style="font-size:12px;color:${colors.accent};margin-bottom:6px;border-bottom:1px solid ${colors.accent}44;padding-bottom:2px;">${escHtml(dateStr)}</h3>
        ${itemsHtml}
      </div>`;
    }).join('');
    return `<section style="margin-bottom:20px;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.accent};padding-bottom:4px;">${escHtml(heading)}</h2>
      ${groupsHtml}
    </section>`;
  };

  return renderSection(t('agendaPdf.sectionUpcoming'), upcoming) + renderSection(t('agendaPdf.sectionPast'), past);
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface AgendaPdfOptions {
  petId: string;
  petName: string;
}

export async function previewAgendaPdf({ petId, petName }: AgendaPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const rows = await fetchAgendaRows(petId);
  const body = buildBody(rows);
  await previewPdf({
    title: t('agendaPdf.title', { name: petName }),
    subtitle: t('agendaPdf.subtitle', { count: rows.length }),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareAgendaPdf({ petId, petName }: AgendaPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const rows = await fetchAgendaRows(petId);
  const body = buildBody(rows);
  await sharePdf(
    {
      title: t('agendaPdf.title', { name: petName }),
      subtitle: t('agendaPdf.subtitle', { count: rows.length }),
      bodyHtml: body,
      language: i18n.language,
    },
    `agenda_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
