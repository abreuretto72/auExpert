/**
 * plansPdf.ts
 *
 * Builds a PDF summary of the pet's plans (health, insurance, funeral,
 * assistance, emergency). Mirrors PlansLensContent: a summary card (active
 * count, total monthly cost, next renewal) + an ordered list of plans.
 *
 * Called from app/(app)/pet/[id]/plans-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';
import type { PetPlan, PlansData, PlansSummary } from '../hooks/useLens';

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchPlans(petId: string): Promise<PlansData> {
  const [plansRes, summaryRes] = await Promise.all([
    supabase
      .from('pet_plans')
      .select('id, plan_type, provider, plan_name, plan_code, monthly_cost, annual_cost, coverage_limit, currency, coverage_items, start_date, end_date, renewal_date, status, source, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('pet_plans_summary')
      .select('active_count, total_monthly_cost, total_reimbursed, next_renewal_date')
      .eq('pet_id', petId)
      .maybeSingle(),
  ]);

  if (plansRes.error) throw plansRes.error;
  if (summaryRes.error) throw summaryRes.error;

  const plans = (plansRes.data ?? []).map((r) => ({
    ...r,
    monthly_cost: r.monthly_cost != null ? Number(r.monthly_cost) : null,
    annual_cost: r.annual_cost != null ? Number(r.annual_cost) : null,
    coverage_limit: r.coverage_limit != null ? Number(r.coverage_limit) : null,
    coverage_items: (r.coverage_items as string[]) ?? [],
  })) as PetPlan[];

  const summary: PlansSummary = summaryRes.data
    ? {
        active_count: Number(summaryRes.data.active_count) || 0,
        total_monthly_cost: Number(summaryRes.data.total_monthly_cost) || 0,
        total_reimbursed: Number(summaryRes.data.total_reimbursed) || 0,
        next_renewal_date: summaryRes.data.next_renewal_date ?? null,
      }
    : { active_count: 0, total_monthly_cost: 0, total_reimbursed: 0, next_renewal_date: null };

  return { plans, summary };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T00:00:00').toLocaleDateString(lang, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatMoney(val: number | null, currency: string): string {
  if (val == null) return '—';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : 'R$';
  return `${symbol} ${val.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TYPE_COLOR: Record<string, string> = {
  health:     colors.success,
  insurance:  colors.petrol,
  funeral:    colors.rose,
  assistance: colors.accent,
  emergency:  colors.danger,
};

const STATUS_COLOR: Record<string, string> = {
  active:    colors.success,
  expired:   colors.danger,
  cancelled: colors.textDim,
  pending:   colors.gold,
};

function typeLabel(type: string): string {
  const t = i18n.t.bind(i18n);
  return t(`plans.type_${type}`, type);
}

function statusLabel(status: string): string {
  const t = i18n.t.bind(i18n);
  return t(`plans.status_${status}`, status);
}

// ── Body ──────────────────────────────────────────────────────────────────────
function buildBody(data: PlansData, lang: string): string {
  const t = i18n.t.bind(i18n);

  if (data.plans.length === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  const summaryHtml = `
    <section style="margin-bottom:18px;page-break-inside:avoid;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.rose};padding-bottom:3px;">${escHtml(t('plansPdf.summary'))}</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('plansPdf.active'))}</div>
          <div style="font-size:20px;font-weight:700;color:${colors.success};margin-top:2px;">${data.summary.active_count}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('plansPdf.monthlyCost'))}</div>
          <div style="font-size:18px;font-weight:700;color:${colors.accent};margin-top:2px;">R$ ${data.summary.total_monthly_cost.toLocaleString(lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('plansPdf.nextRenewal'))}</div>
          <div style="font-size:12px;font-weight:700;color:${colors.petrol};margin-top:4px;">${escHtml(formatDate(data.summary.next_renewal_date, lang))}</div>
        </div>
      </div>
    </section>
  `;

  const plansHtml = `
    <section style="page-break-inside:auto;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.rose};padding-bottom:3px;">${escHtml(t('plansPdf.listTitle'))}</h2>
      ${data.plans.map((p) => {
        const typeCol = TYPE_COLOR[p.plan_type] ?? colors.textDim;
        const statusCol = STATUS_COLOR[p.status] ?? colors.textDim;
        return `
          <div style="border:1px solid #e5e7eb;border-left:3px solid ${typeCol};border-radius:8px;padding:10px 12px;margin-bottom:8px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;">
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:#222;">${escHtml(p.provider)}</div>
                ${p.plan_name ? `<div style="font-size:11px;color:#555;margin-top:2px;">${escHtml(p.plan_name)}</div>` : ''}
                ${p.plan_code ? `<div style="font-size:9px;color:#999;margin-top:2px;font-family:monospace;">${escHtml(p.plan_code)}</div>` : ''}
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;flex-direction:column;align-items:flex-end;">
                <span style="background:${typeCol}18;color:${typeCol};font-size:9px;font-weight:700;padding:3px 7px;border-radius:8px;">${escHtml(typeLabel(p.plan_type))}</span>
                <span style="background:${statusCol}18;color:${statusCol};font-size:9px;font-weight:700;padding:3px 7px;border-radius:8px;">${escHtml(statusLabel(p.status))}</span>
              </div>
            </div>
            <div style="font-size:10px;color:#555;display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;">
              ${p.monthly_cost != null ? `<span><strong>${escHtml(t('plansPdf.monthly'))}:</strong> ${escHtml(formatMoney(p.monthly_cost, p.currency))}</span>` : ''}
              ${p.annual_cost != null ? `<span><strong>${escHtml(t('plansPdf.annual'))}:</strong> ${escHtml(formatMoney(p.annual_cost, p.currency))}</span>` : ''}
              ${p.coverage_limit != null ? `<span><strong>${escHtml(t('plansPdf.coverage'))}:</strong> ${escHtml(formatMoney(p.coverage_limit, p.currency))}</span>` : ''}
            </div>
            <div style="font-size:10px;color:#555;display:flex;gap:14px;flex-wrap:wrap;margin-top:4px;">
              ${p.start_date ? `<span><strong>${escHtml(t('plansPdf.start'))}:</strong> ${escHtml(formatDate(p.start_date, lang))}</span>` : ''}
              ${p.end_date ? `<span><strong>${escHtml(t('plansPdf.end'))}:</strong> ${escHtml(formatDate(p.end_date, lang))}</span>` : ''}
              ${p.renewal_date ? `<span><strong>${escHtml(t('plansPdf.renewal'))}:</strong> ${escHtml(formatDate(p.renewal_date, lang))}</span>` : ''}
            </div>
            ${p.coverage_items.length > 0 ? `<div style="margin-top:6px;"><div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">${escHtml(t('plansPdf.coverageIncludes'))}</div><div style="display:flex;flex-wrap:wrap;gap:4px;">${p.coverage_items.map((c) => `<span style="background:${typeCol}12;color:${typeCol};font-size:9px;padding:2px 6px;border-radius:6px;">${escHtml(c)}</span>`).join('')}</div></div>` : ''}
          </div>
        `;
      }).join('')}
    </section>
  `;

  return summaryHtml + plansHtml;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface PlansPdfOptions {
  petId: string;
  petName: string;
}

export async function previewPlansPdf({ petId, petName }: PlansPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchPlans(petId);
  const body = buildBody(data, i18n.language);
  await previewPdf({
    title: t('plansPdf.title', { name: petName }),
    subtitle: t('plansPdf.subtitle'),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function sharePlansPdf({ petId, petName }: PlansPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchPlans(petId);
  const body = buildBody(data, i18n.language);
  await sharePdf(
    {
      title: t('plansPdf.title', { name: petName }),
      subtitle: t('plansPdf.subtitle'),
      bodyHtml: body,
      language: i18n.language,
    },
    `plans_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
