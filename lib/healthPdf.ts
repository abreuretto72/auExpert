/**
 * healthPdf.ts
 *
 * Builds a comprehensive health PDF covering all 8 tabs of the health screen:
 * vaccines, allergies, exams, medications, consultations, surgeries,
 * clinical metrics (weight/height/temp/etc.), and expenses.
 *
 * Called from app/(app)/pet/[id]/health-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;

interface HealthPdfData {
  vaccines: Row[];
  allergies: Row[];
  exams: Row[];
  medications: Row[];
  consultations: Row[];
  surgeries: Row[];
  metrics: Row[];
  expenses: Row[];
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchHealthRows(petId: string): Promise<HealthPdfData> {
  const tables = ['vaccines', 'allergies', 'exams', 'medications', 'consultations', 'surgeries', 'clinical_metrics', 'expenses'] as const;
  const results = await Promise.all(
    tables.map((tbl) =>
      supabase
        .from(tbl)
        .select('*')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .limit(500),
    ),
  );

  const [vacRes, allRes, exRes, medRes, consRes, surgRes, metRes, expRes] = results;

  return {
    vaccines: (vacRes.data ?? []) as Row[],
    allergies: (allRes.data ?? []) as Row[],
    exams: (exRes.data ?? []) as Row[],
    medications: (medRes.data ?? []) as Row[],
    consultations: (consRes.data ?? []) as Row[],
    surgeries: (surgRes.data ?? []) as Row[],
    metrics: (metRes.data ?? []) as Row[],
    expenses: (expRes.data ?? []) as Row[],
  };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(value: unknown, lang: string): string {
  if (!value) return '—';
  const s = String(value);
  const d = new Date(s);
  if (isNaN(d.getTime())) return escHtml(s);
  // Date-only strings (YYYY-MM-DD): render without timezone shift.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, day] = s.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

function pill(text: string, color: string): string {
  return `<span style="background:${color}22;color:${color};border-radius:4px;padding:1px 6px;font-size:9px;font-weight:700;margin-left:6px;">${escHtml(text)}</span>`;
}

function sectionWrap(heading: string, count: number, innerHtml: string): string {
  return `<section style="margin-bottom:20px;page-break-inside:avoid;">
    <h2 style="font-size:13px;color:#222;margin-bottom:8px;border-bottom:2px solid ${colors.accent};padding-bottom:3px;">
      ${escHtml(heading)} <span style="color:${colors.textDim};font-weight:400;font-size:11px;">(${count})</span>
    </h2>
    ${innerHtml}
  </section>`;
}

function row(title: string, metaLines: Array<string | undefined>): string {
  const meta = metaLines.filter(Boolean).join('<br>');
  return `<div style="border:1px solid #ddd;border-radius:8px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
    <div style="font-size:12px;font-weight:600;color:#222;">${title}</div>
    ${meta ? `<div style="font-size:10px;color:#666;margin-top:3px;line-height:1.5;">${meta}</div>` : ''}
  </div>`;
}

// ── Section renderers ─────────────────────────────────────────────────────────
function buildBody(data: HealthPdfData, lang: string): string {
  const t = i18n.t.bind(i18n);
  const { vaccines, allergies, exams, medications, consultations, surgeries, metrics, expenses } = data;
  const total = vaccines.length + allergies.length + exams.length + medications.length
              + consultations.length + surgeries.length + metrics.length + expenses.length;

  if (total === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  const out: string[] = [];

  // Vaccines
  if (vaccines.length) {
    const inner = vaccines.map((v) => {
      const now = new Date();
      const due = v.next_due_date ? new Date(String(v.next_due_date)) : null;
      const overdue = due && due.getTime() < now.getTime();
      const statusPill = due
        ? (overdue
            ? pill(t('healthPdf.overdue'), colors.danger)
            : pill(t('healthPdf.upToDate'), colors.success))
        : '';
      const title = `${escHtml(v.name)}${statusPill}`;
      const meta: Array<string | undefined> = [
        `${escHtml(t('healthPdf.administered'))}: ${formatDate(v.date_administered, lang)}`,
        v.next_due_date ? `${escHtml(t('healthPdf.nextDue'))}: ${formatDate(v.next_due_date, lang)}` : undefined,
        v.veterinarian ? `${escHtml(t('healthPdf.vet'))}: ${escHtml(v.veterinarian)}` : undefined,
        v.clinic ? `${escHtml(t('healthPdf.clinic'))}: ${escHtml(v.clinic)}` : undefined,
        v.batch_number ? `${escHtml(t('healthPdf.batch'))}: ${escHtml(v.batch_number)}` : undefined,
        v.notes ? escHtml(v.notes) : undefined,
      ];
      return row(title, meta);
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionVaccines'), vaccines.length, inner));
  }

  // Allergies
  if (allergies.length) {
    const inner = allergies.map((a) => {
      const severityColor = a.severity === 'severe' ? colors.danger
                         : a.severity === 'moderate' ? colors.warning
                         : colors.textDim;
      const title = `${escHtml(a.allergen ?? a.name)}${a.severity ? pill(String(a.severity), severityColor) : ''}`;
      const meta: Array<string | undefined> = [
        a.reaction ? `${escHtml(t('healthPdf.reaction'))}: ${escHtml(a.reaction)}` : undefined,
        a.notes ? escHtml(a.notes) : undefined,
      ];
      return row(title, meta);
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionAllergies'), allergies.length, inner));
  }

  // Consultations
  if (consultations.length) {
    const inner = consultations.map((c) => {
      const title = escHtml((c as Row & { reason?: string }).reason ?? (c as Row & { summary?: string }).summary ?? t('healthPdf.consultation'));
      const meta: Array<string | undefined> = [
        c.date ? formatDate(c.date, lang) : undefined,
        c.veterinarian ? `${escHtml(t('healthPdf.vet'))}: ${escHtml(c.veterinarian)}` : undefined,
        c.clinic ? `${escHtml(t('healthPdf.clinic'))}: ${escHtml(c.clinic)}` : undefined,
        c.diagnosis ? `${escHtml(t('healthPdf.diagnosis'))}: ${escHtml(c.diagnosis)}` : undefined,
        c.notes ? escHtml(c.notes) : undefined,
      ];
      return row(title, meta);
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionConsultations'), consultations.length, inner));
  }

  // Exams
  if (exams.length) {
    const inner = exams.map((e) => {
      const title = escHtml(e.name);
      const meta: Array<string | undefined> = [
        e.date ? formatDate(e.date, lang) : undefined,
        e.result ? `${escHtml(t('healthPdf.result'))}: ${escHtml(e.result)}` : undefined,
        e.veterinarian ? `${escHtml(t('healthPdf.vet'))}: ${escHtml(e.veterinarian)}` : undefined,
        e.notes ? escHtml(e.notes) : undefined,
      ];
      return row(title, meta);
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionExams'), exams.length, inner));
  }

  // Medications
  if (medications.length) {
    const inner = medications.map((m) => {
      const title = escHtml(m.name);
      const meta: Array<string | undefined> = [
        m.dosage ? `${escHtml(t('healthPdf.dosage'))}: ${escHtml(m.dosage)}` : undefined,
        m.frequency ? `${escHtml(t('healthPdf.frequency'))}: ${escHtml(m.frequency)}` : undefined,
        m.start_date ? `${escHtml(t('healthPdf.start'))}: ${formatDate(m.start_date, lang)}` : undefined,
        m.end_date ? `${escHtml(t('healthPdf.end'))}: ${formatDate(m.end_date, lang)}` : undefined,
        m.notes ? escHtml(m.notes) : undefined,
      ];
      return row(title, meta);
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionMedications'), medications.length, inner));
  }

  // Surgeries
  if (surgeries.length) {
    const inner = surgeries.map((s) => {
      const title = escHtml(s.name ?? s.procedure);
      const meta: Array<string | undefined> = [
        s.date ? formatDate(s.date, lang) : undefined,
        s.veterinarian ? `${escHtml(t('healthPdf.vet'))}: ${escHtml(s.veterinarian)}` : undefined,
        s.clinic ? `${escHtml(t('healthPdf.clinic'))}: ${escHtml(s.clinic)}` : undefined,
        s.notes ? escHtml(s.notes) : undefined,
      ];
      return row(title, meta);
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionSurgeries'), surgeries.length, inner));
  }

  // Metrics
  if (metrics.length) {
    const grouped = new Map<string, Row[]>();
    metrics.forEach((m) => {
      const type = String((m as Row & { metric_type?: string }).metric_type ?? 'other');
      if (!grouped.has(type)) grouped.set(type, []);
      grouped.get(type)!.push(m);
    });
    const inner = [...grouped.entries()].map(([type, items]) => {
      const rows = items.slice(0, 20).map((m) => {
        const typedM = m as Row & { value?: unknown; unit?: string; measured_at?: string; date?: string };
        const val = `${escHtml(typedM.value ?? '')} ${escHtml(typedM.unit ?? '')}`.trim();
        const when = formatDate(typedM.measured_at ?? typedM.date, lang);
        return `<div style="font-size:11px;color:#333;padding:3px 0;">${when} — <strong>${val}</strong></div>`;
      }).join('');
      return `<div style="margin-bottom:8px;">
        <div style="font-size:11px;font-weight:700;color:${colors.accent};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${escHtml(type)}</div>
        ${rows}
      </div>`;
    }).join('');
    out.push(sectionWrap(t('healthPdf.sectionMetrics'), metrics.length, inner));
  }

  // Expenses
  if (expenses.length) {
    const total = expenses.reduce((s, e) => {
      const v = Number((e as Row & { amount?: unknown }).amount ?? 0);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    const inner = expenses.slice(0, 100).map((e) => {
      const typedE = e as Row & { amount?: unknown; currency?: string; category?: string; description?: string; merchant_name?: string; date?: string };
      const amount = typedE.amount != null ? `${typedE.currency ?? ''} ${typedE.amount}` : '';
      const title = escHtml(typedE.description ?? typedE.merchant_name ?? typedE.category ?? '—');
      const meta: Array<string | undefined> = [
        typedE.date ? formatDate(typedE.date, lang) : undefined,
        typedE.category ? `${escHtml(t('healthPdf.category'))}: ${escHtml(typedE.category)}` : undefined,
        amount ? `<strong>${escHtml(amount)}</strong>` : undefined,
      ];
      return row(title, meta);
    }).join('');
    const totalLine = `<div style="font-size:12px;font-weight:700;color:${colors.accent};margin-top:6px;text-align:right;">${escHtml(t('healthPdf.total'))}: ${total.toFixed(2)}</div>`;
    out.push(sectionWrap(t('healthPdf.sectionExpenses'), expenses.length, inner + totalLine));
  }

  return out.join('');
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface HealthPdfOptions {
  petId: string;
  petName: string;
}

export async function previewHealthPdf({ petId, petName }: HealthPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchHealthRows(petId);
  const body = buildBody(data, i18n.language);
  await previewPdf({
    title: t('healthPdf.title', { name: petName }),
    subtitle: t('healthPdf.subtitle'),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareHealthPdf({ petId, petName }: HealthPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchHealthRows(petId);
  const body = buildBody(data, i18n.language);
  await sharePdf(
    {
      title: t('healthPdf.title', { name: petName }),
      subtitle: t('healthPdf.subtitle'),
      bodyHtml: body,
      language: i18n.language,
    },
    `health_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
