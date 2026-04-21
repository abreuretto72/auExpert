/**
 * expensesPdf.ts
 *
 * Builds a PDF of the pet's expenses grouped by category, with a per-item list.
 *
 * Called from app/(app)/pet/[id]/expenses-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ExpenseRow {
  id: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  description: string | null;
  merchant_name: string | null;
  date: string | null;
  created_at: string;
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchExpenses(petId: string): Promise<ExpenseRow[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, amount, currency, category, description, merchant_name, date, created_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('date', { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as ExpenseRow[];
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(value: string | null, lang: string): string {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return escHtml(value);
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatAmount(row: ExpenseRow): string {
  const amt = Number(row.amount ?? 0);
  const cur = row.currency ?? '';
  return `${cur} ${amt.toFixed(2)}`.trim();
}

function buildBody(rows: ExpenseRow[], lang: string): string {
  const t = i18n.t.bind(i18n);

  if (rows.length === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  // Group by category
  const byCat = new Map<string, { rows: ExpenseRow[]; total: number }>();
  let grandTotal = 0;
  for (const r of rows) {
    const cat = r.category ?? 'other';
    const v = Number(r.amount ?? 0);
    grandTotal += isNaN(v) ? 0 : v;
    if (!byCat.has(cat)) byCat.set(cat, { rows: [], total: 0 });
    const bucket = byCat.get(cat)!;
    bucket.rows.push(r);
    bucket.total += isNaN(v) ? 0 : v;
  }

  const currencySample = rows.find((r) => r.currency)?.currency ?? '';

  // Summary — total + by-category breakdown
  const summaryHtml = `
    <section style="margin-bottom:18px;page-break-inside:avoid;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.accent};padding-bottom:3px;">
        ${escHtml(t('expensesPdf.total'))}
      </h2>
      <div style="font-size:24px;font-weight:800;color:${colors.accent};margin-bottom:10px;">
        ${escHtml(currencySample)} ${grandTotal.toFixed(2)}
      </div>
      <h3 style="font-size:12px;color:#222;margin-bottom:6px;">${escHtml(t('expensesPdf.byCategory'))}</h3>
      ${[...byCat.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([cat, v]) => {
          const pct = grandTotal > 0 ? Math.round((v.total / grandTotal) * 100) : 0;
          return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #eee;">
            <div style="font-size:11px;color:#333;">${escHtml(cat)} <span style="color:#999;">(${v.rows.length})</span></div>
            <div style="font-size:11px;font-weight:600;color:#222;">${escHtml(currencySample)} ${v.total.toFixed(2)} <span style="color:#888;font-weight:400;">· ${pct}%</span></div>
          </div>`;
        }).join('')}
    </section>
  `;

  // Items table per category
  const itemsHtml = [...byCat.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, v]) => `
      <section style="margin-bottom:16px;page-break-inside:auto;">
        <h3 style="font-size:12px;color:${colors.accent};margin-bottom:6px;border-bottom:1px solid ${colors.accent}44;padding-bottom:2px;">
          ${escHtml(cat)}
        </h3>
        ${v.rows.map((r) => `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid #eee;page-break-inside:avoid;">
            <div style="flex:1;">
              <div style="font-size:11px;color:#333;font-weight:600;">${escHtml(r.description ?? r.merchant_name ?? '—')}</div>
              <div style="font-size:10px;color:#888;">${escHtml(formatDate(r.date ?? r.created_at.slice(0, 10), lang))}${r.merchant_name && r.description ? ` · ${escHtml(r.merchant_name)}` : ''}</div>
            </div>
            <div style="font-size:11px;font-weight:700;color:#222;margin-left:8px;">${escHtml(formatAmount(r))}</div>
          </div>
        `).join('')}
      </section>
    `).join('');

  return summaryHtml + `<h2 style="font-size:14px;color:#222;margin:18px 0 10px;border-bottom:2px solid ${colors.accent};padding-bottom:3px;">${escHtml(t('expensesPdf.itemsTable'))}</h2>` + itemsHtml;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface ExpensesPdfOptions {
  petId: string;
  petName: string;
}

export async function previewExpensesPdf({ petId, petName }: ExpensesPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const rows = await fetchExpenses(petId);
  const body = buildBody(rows, i18n.language);
  await previewPdf({
    title: t('expensesPdf.title', { name: petName }),
    subtitle: t('expensesPdf.subtitle', { count: rows.length }),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareExpensesPdf({ petId, petName }: ExpensesPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const rows = await fetchExpenses(petId);
  const body = buildBody(rows, i18n.language);
  await sharePdf(
    {
      title: t('expensesPdf.title', { name: petName }),
      subtitle: t('expensesPdf.subtitle', { count: rows.length }),
      bodyHtml: body,
      language: i18n.language,
    },
    `expenses_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
