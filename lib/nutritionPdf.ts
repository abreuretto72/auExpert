/**
 * nutritionPdf.ts
 *
 * Builds an aggregated PDF of the pet's nutrition data. Mirrors the Nutrition
 * screen: modalidade + life stage + weight pills, current food card, alerts,
 * restrictions, supplements, food history and AI evaluation (score + pros/cons).
 *
 * Called from app/(app)/pet/[id]/nutrition-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';
import type { Nutricao } from '../hooks/useNutricao';

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchNutricao(petId: string): Promise<Nutricao> {
  const language = i18n.language ?? 'pt-BR';
  const { data, error } = await supabase.functions.invoke<{ nutricao: Nutricao }>(
    'get-nutricao',
    { body: { pet_id: petId, language } },
  );
  if (error) throw error;
  if (!data?.nutricao) throw new Error('no nutricao data');
  return data.nutricao;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso.includes('T') ? iso : iso + 'T00:00:00');
    return d.toLocaleDateString(lang, {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function sectionHeader(title: string, color: string): string {
  return `
    <h2 style="font-size:14px;color:#222;margin:18px 0 10px 0;border-bottom:2px solid ${color};padding-bottom:3px;">
      ${escHtml(title)}
    </h2>
  `;
}

function pill(text: string, color: string): string {
  return `<span style="background:${color}18;color:${color};font-size:9px;font-weight:700;padding:3px 7px;border-radius:8px;margin-right:4px;">${escHtml(text)}</span>`;
}

function modalidadeLabel(modalidade: string): string {
  const t = i18n.t.bind(i18n);
  const map: Record<string, string> = {
    so_racao: t('nutrition.modalidadeLabelSoRacao'),
    racao_natural: t('nutrition.modalidadeLabelRacaoNatural'),
    so_natural: t('nutrition.modalidadeLabelSoNatural'),
  };
  return map[modalidade] ?? modalidade;
}

function lifeStageLabel(stage: string): string {
  const t = i18n.t.bind(i18n);
  const map: Record<string, string> = {
    puppy: t('nutrition.lifeStagePuppy'),
    kitten: t('nutrition.lifeStageKitten'),
    adult: t('nutrition.lifeStageAdult'),
    senior: t('nutrition.lifeStageSenior'),
  };
  return map[stage] ?? stage;
}

function categoryLabel(cat: string | null): string {
  if (!cat) return '';
  const t = i18n.t.bind(i18n);
  const map: Record<string, string> = {
    dry_food: t('nutrition.categoryDryFood'),
    wet_food: t('nutrition.categoryWetFood'),
    raw: t('nutrition.categoryRaw'),
    homemade: t('nutrition.categoryHomemade'),
    treat: t('nutrition.categoryTreat'),
    supplement: t('nutrition.categorySupplement'),
    prescription: t('nutrition.categoryPrescription'),
  };
  return map[cat] ?? cat;
}

function severityColor(severity: string): string {
  if (severity === 'error') return colors.danger;
  if (severity === 'warning') return colors.warning;
  return colors.petrol;
}

// ── Section builders ─────────────────────────────────────────────────────────
function buildOverview(data: Nutricao): string {
  const t = i18n.t.bind(i18n);
  const weight = data.weight_kg != null
    ? t('nutrition.weightKg', { weight: data.weight_kg })
    : t('nutrition.weightUnknown');

  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('nutritionPdf.sectionOverview'), colors.success)}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:150px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('nutritionPdf.modalidade'))}</div>
          <div style="font-size:14px;font-weight:700;color:${colors.success};margin-top:4px;">${escHtml(modalidadeLabel(data.modalidade))}</div>
          ${data.modalidade === 'racao_natural' ? `<div style="font-size:9px;color:#888;margin-top:2px;">${data.natural_pct}% ${escHtml(t('nutritionPdf.natural'))}</div>` : ''}
        </div>
        <div style="flex:1;min-width:150px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('nutritionPdf.lifeStage'))}</div>
          <div style="font-size:14px;font-weight:700;color:${colors.petrol};margin-top:4px;">${escHtml(lifeStageLabel(data.life_stage))}${data.age_label ? ' · ' + escHtml(data.age_label) : ''}</div>
        </div>
        <div style="flex:1;min-width:150px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('nutritionPdf.weight'))}</div>
          <div style="font-size:14px;font-weight:700;color:${colors.petrol};margin-top:4px;">${escHtml(weight)}</div>
        </div>
      </div>
    </section>
  `;
}

function buildAlerts(data: Nutricao): string {
  const t = i18n.t.bind(i18n);
  if (data.alerts.length === 0) return '';
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('nutritionPdf.sectionAlerts'), colors.warning)}
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;background:#FFFBEB;">
        ${data.alerts.map((a) => `
          <div style="display:flex;gap:8px;margin:4px 0;font-size:11px;color:${severityColor(a.severity)};">
            <span style="font-weight:700;">•</span>
            <span>${escHtml(t(a.message_key))}</span>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function buildCurrentFood(data: Nutricao, lang: string): string {
  const t = i18n.t.bind(i18n);
  if (!data.current_food) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('nutritionPdf.sectionCurrentFood'), colors.success)}
        <div style="border:1px dashed #e5e7eb;border-radius:8px;padding:14px;text-align:center;font-size:11px;color:#888;">
          ${escHtml(t('nutritionPdf.noCurrentFood'))}
        </div>
      </section>
    `;
  }

  const f = data.current_food;
  const pills: string[] = [];
  if (f.portion_grams != null) pills.push(t('nutrition.racaoPortionValue', { g: f.portion_grams }));
  if (f.daily_portions != null) pills.push(t('nutrition.racaoDailyPortions', { n: f.daily_portions }));
  if (f.calories_kcal != null) pills.push(t('nutrition.racaoCalories', { kcal: f.calories_kcal }));
  if (f.category) pills.push(categoryLabel(f.category) ?? '');

  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('nutritionPdf.sectionCurrentFood'), colors.success)}
      <div style="border:1px solid #e5e7eb;border-left:3px solid ${colors.success};border-radius:8px;padding:12px 14px;">
        <div style="font-size:14px;font-weight:700;color:#222;">${escHtml(f.product_name ?? '—')}</div>
        ${f.brand ? `<div style="font-size:11px;color:#666;margin-top:2px;">${escHtml(f.brand)}</div>` : ''}
        ${pills.length > 0 ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">${pills.map((p) => `<span style="background:#F1F5F9;color:#1A2B3D;font-size:10px;padding:3px 8px;border-radius:6px;">${escHtml(p)}</span>`).join('')}</div>` : ''}
        ${f.started_at ? `<div style="font-size:10px;color:#888;margin-top:8px;"><strong>${escHtml(t('nutritionPdf.startedAt'))}:</strong> ${escHtml(formatDate(f.started_at, lang))}</div>` : ''}
        ${f.notes ? `<div style="font-size:10px;color:#666;margin-top:6px;font-style:italic;">${escHtml(f.notes)}</div>` : ''}
      </div>
    </section>
  `;
}

function buildRestrictions(data: Nutricao): string {
  const t = i18n.t.bind(i18n);
  if (data.restrictions.length === 0) return '';
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('nutritionPdf.sectionRestrictions'), colors.warning)}
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;">
        ${data.restrictions.map((r) => `
          <div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #F1F5F9;">
            <span style="color:${colors.warning};font-weight:700;">•</span>
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:600;color:#222;">${escHtml(r.product_name ?? r.notes ?? '—')}</div>
              ${r.notes && r.product_name ? `<div style="font-size:10px;color:#888;margin-top:2px;">${escHtml(r.notes)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function buildSupplements(data: Nutricao): string {
  const t = i18n.t.bind(i18n);
  if (data.supplements.length === 0) return '';
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('nutritionPdf.sectionSupplements'), colors.purple)}
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;">
        ${data.supplements.map((s) => {
          const dose: string[] = [];
          if (s.portion_grams != null) dose.push(t('nutrition.racaoPortionValue', { g: s.portion_grams }));
          if (s.daily_portions != null) dose.push(t('nutrition.racaoDailyPortions', { n: s.daily_portions }));
          return `
            <div style="padding:6px 0;border-bottom:1px solid #F1F5F9;">
              <div style="font-size:12px;font-weight:600;color:#222;">${escHtml(s.product_name ?? '—')}${s.brand ? ` <span style="color:#888;font-weight:400;">· ${escHtml(s.brand)}</span>` : ''}</div>
              ${dose.length > 0 ? `<div style="font-size:10px;color:#666;margin-top:2px;">${escHtml(dose.join(' · '))}</div>` : ''}
              ${s.notes ? `<div style="font-size:10px;color:#888;margin-top:2px;font-style:italic;">${escHtml(s.notes)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function buildHistory(data: Nutricao, lang: string): string {
  const t = i18n.t.bind(i18n);
  if (data.food_history.length === 0) return '';
  return `
    <section style="margin-bottom:14px;page-break-inside:auto;">
      ${sectionHeader(t('nutritionPdf.sectionHistory'), colors.petrol)}
      ${data.food_history.map((f) => {
        const dateRange = f.started_at
          ? `${formatDate(f.started_at, lang)} – ${f.ended_at ? formatDate(f.ended_at, lang) : escHtml(t('nutritionPdf.ongoing'))}`
          : '—';
        return `
          <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:6px;page-break-inside:avoid;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;">
              <div style="flex:1;">
                <div style="font-size:12px;font-weight:700;color:#222;">${escHtml(f.product_name ?? '—')}</div>
                ${f.brand ? `<div style="font-size:10px;color:#888;margin-top:1px;">${escHtml(f.brand)}</div>` : ''}
              </div>
              ${f.category ? pill(categoryLabel(f.category) ?? '', colors.petrol) : ''}
            </div>
            <div style="font-size:10px;color:#555;margin-top:4px;">${escHtml(dateRange)}</div>
            ${f.notes ? `<div style="font-size:10px;color:#666;margin-top:4px;font-style:italic;">${escHtml(f.notes)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </section>
  `;
}

function buildAIEvaluation(data: Nutricao, lang: string): string {
  const t = i18n.t.bind(i18n);
  if (!data.ai_evaluation) return '';
  const e = data.ai_evaluation;
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('nutritionPdf.sectionAI'), colors.purple)}
      <div style="border:1px solid #e5e7eb;border-left:3px solid ${colors.purple};border-radius:8px;padding:12px 14px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:8px;">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('nutritionPdf.aiScore'))}</div>
          <div style="font-size:20px;font-weight:800;color:${colors.purple};">${e.score}<span style="font-size:10px;color:#888;font-weight:400;">/100</span></div>
        </div>
        <div style="font-size:12px;color:#1A2B3D;line-height:1.5;">${escHtml(e.summary)}</div>
        ${e.pros.length > 0 ? `
          <div style="margin-top:10px;">
            <div style="font-size:10px;font-weight:700;color:${colors.success};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escHtml(t('nutritionPdf.aiPros'))}</div>
            <ul style="margin:0;padding-left:16px;font-size:11px;color:#1A2B3D;line-height:1.5;">
              ${e.pros.map((p) => `<li>${escHtml(p)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${e.cons.length > 0 ? `
          <div style="margin-top:8px;">
            <div style="font-size:10px;font-weight:700;color:${colors.warning};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escHtml(t('nutritionPdf.aiCons'))}</div>
            <ul style="margin:0;padding-left:16px;font-size:11px;color:#1A2B3D;line-height:1.5;">
              ${e.cons.map((c) => `<li>${escHtml(c)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${e.recommendation ? `
          <div style="margin-top:10px;padding:8px 10px;background:${colors.purple}08;border-radius:6px;">
            <div style="font-size:10px;font-weight:700;color:${colors.purple};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${escHtml(t('nutritionPdf.aiRecommendation'))}</div>
            <div style="font-size:11px;color:#1A2B3D;line-height:1.5;">${escHtml(e.recommendation)}</div>
          </div>
        ` : ''}
        ${data.ai_evaluation_updated_at ? `
          <div style="font-size:9px;color:#888;margin-top:8px;text-align:right;">${escHtml(t('nutritionPdf.aiUpdatedAt'))}: ${escHtml(formatDate(data.ai_evaluation_updated_at, lang))}</div>
        ` : ''}
      </div>
    </section>
  `;
}

// ── Body ──────────────────────────────────────────────────────────────────────
function buildBody(data: Nutricao, lang: string): string {
  const t = i18n.t.bind(i18n);
  const parts: string[] = [
    buildOverview(data),
    buildAlerts(data),
    buildCurrentFood(data, lang),
    buildRestrictions(data),
    buildSupplements(data),
    buildHistory(data, lang),
    buildAIEvaluation(data, lang),
  ];
  const body = parts.filter(Boolean).join('');

  // If everything is empty (no food, no restrictions, no AI), show empty state.
  if (!data.current_food && data.restrictions.length === 0 && data.supplements.length === 0 && data.food_history.length === 0 && !data.ai_evaluation) {
    return `
      ${buildOverview(data)}
      <p style="text-align:center;color:${colors.textDim};padding:40px 0;font-size:11px;">
        ${escHtml(t('pdfCommon.empty'))}
      </p>
    `;
  }

  return body;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface NutritionPdfOptions {
  petId: string;
  petName: string;
}

export async function previewNutritionPdf({ petId, petName }: NutritionPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchNutricao(petId);
  const body = buildBody(data, i18n.language);
  await previewPdf({
    title: t('nutritionPdf.title', { name: petName }),
    subtitle: t('nutritionPdf.subtitle'),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareNutritionPdf({ petId, petName }: NutritionPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchNutricao(petId);
  const body = buildBody(data, i18n.language);
  await sharePdf(
    {
      title: t('nutritionPdf.title', { name: petName }),
      subtitle: t('nutritionPdf.subtitle'),
      bodyHtml: body,
      language: i18n.language,
    },
    `nutricao_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
