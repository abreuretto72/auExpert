/**
 * photoAnalysisPdf.ts
 *
 * HTML body generator for the photo-analysis history PDF.
 * Mirrors the pattern of prontuarioPdf.ts and idCardPdf.ts — uses
 * previewPdf()/sharePdf() from lib/pdf.ts which wraps the shared PDF template
 * (header with logo + title + date, body injected here, footer
 * "Multiverso Digital © 2026 — auExpert").
 *
 * Per CLAUDE.md §12.8: toda exportação PDF DEVE ser feita via tela dedicada de
 * preview (app/.../photo-analysis-pdf.tsx). Este arquivo é só o gerador de body.
 */
import type { PhotoAnalysisResponse } from '../types/ai';
import { previewPdf, sharePdf } from './pdf';
import i18n from '../i18n';

export interface AnalysisRecord {
  id: string;
  photo_url: string;
  findings: PhotoAnalysisResponse;
  confidence: number;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr: string, language: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(language || undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function severityColor(severity: string | undefined): string {
  if (severity === 'concern') return '#E74C3C';
  if (severity === 'attention') return '#F1C40F';
  return '#2ECC71';
}

function severityLabel(severity: string | undefined, t: (k: string) => string): string {
  if (severity === 'concern') return t('photoAnalysis.severityConcern');
  if (severity === 'attention') return t('photoAnalysis.severityAttention');
  return t('photoAnalysis.severityNormal');
}

function sectionHeader(title: string): string {
  return `<div style="margin-top:14px;margin-bottom:6px;font-size:10px;font-weight:700;letter-spacing:1.2px;color:#5E7A94;text-transform:uppercase;">${escHtml(title)}</div>`;
}

function kv(label: string, value: string | null | undefined): string {
  if (value == null || value === '') return '';
  return `
    <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F1F5F9;font-size:11px;">
      <span style="color:#5E7A94;font-weight:600;">${escHtml(label)}</span>
      <span style="color:#1A2B3D;font-weight:600;text-align:right;">${escHtml(value)}</span>
    </div>
  `;
}

function observationRow(
  label: string,
  observation: string,
  severity: string | undefined,
  severityText: string,
): string {
  const color = severityColor(severity);
  return `
    <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;">
      <div style="width:8px;height:8px;border-radius:4px;background:${color};margin-top:5px;flex-shrink:0;"></div>
      <div style="flex:1;font-size:11px;color:#1A2B3D;line-height:1.5;">
        <span style="font-weight:700;">${escHtml(label)}:</span>
        ${escHtml(observation)}
        <span style="color:${color};font-weight:700;margin-left:4px;">[${escHtml(severityText)}]</span>
      </div>
    </div>
  `;
}

// ── Body HTML builder ─────────────────────────────────────────────────────────

export function buildPhotoAnalysisBodyHtml(
  analyses: AnalysisRecord[],
  petName: string,
): string {
  const t = i18n.t.bind(i18n);
  const language = i18n.language;
  const sections: string[] = [];

  if (!analyses || analyses.length === 0) {
    sections.push(`
      <div style="text-align:center;padding:40px 20px;color:#5E7A94;font-size:13px;">
        ${escHtml(t('photoAnalysis.emptyExport'))}
      </div>
    `);
    return sections.join('\n');
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  sections.push(`
    <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px;margin-bottom:12px;border:1px solid #E2E8F0;">
      <div style="font-size:14px;font-weight:700;color:#0F1923;">${escHtml(petName)}</div>
      <div style="font-size:11px;color:#5E7A94;margin-top:3px;">
        ${analyses.length} ${escHtml(t('photoAnalysis.pdfSubtitle'))}
      </div>
    </div>
  `);

  // ── Per-analysis card ────────────────────────────────────────────────────
  for (const analysis of analyses) {
    const f = analysis.findings;
    if (!f) continue;

    const breedObj = (f.breed ?? f.identification?.breed) as
      | { name?: string; primary?: string; confidence?: number }
      | null
      | undefined;
    const breedName = breedObj?.name ?? breedObj?.primary ?? '—';
    const breedConf = Math.round((breedObj?.confidence ?? analysis.confidence ?? 0) * 100);

    const mood = f.mood;
    const moodName = mood?.primary ?? '—';

    const health = f.health;
    const alerts = f.alerts;

    const photoHtml = analysis.photo_url
      ? `<img src="${analysis.photo_url}" style="width:80px;height:80px;border-radius:10px;object-fit:cover;flex-shrink:0;" />`
      : `<div style="width:80px;height:80px;border-radius:10px;background:#F1F5F9;flex-shrink:0;"></div>`;

    const analysisHtml: string[] = [];

    // Header: photo + date + confidence
    analysisHtml.push(`
      <div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:10px;">
        ${photoHtml}
        <div style="flex:1;">
          <div style="font-size:11px;color:#5E7A94;font-weight:600;">${escHtml(formatDate(analysis.created_at, language))}</div>
          <div style="margin-top:6px;display:inline-block;background:#9B59B618;color:#9B59B6;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;">
            ${breedConf}% · ${escHtml(t('ai.confidence', { defaultValue: 'IA' }))}
          </div>
        </div>
      </div>
    `);

    // Identification section
    analysisHtml.push(sectionHeader(t('photoAnalysis.sectionBreed')));
    analysisHtml.push(`
      <div style="padding:4px 0;">
        ${kv(t('addPet.breed'), breedName)}
        ${f.estimated_age_months != null ? kv(t('addPet.estimatedAge'), `${f.estimated_age_months}m`) : ''}
        ${f.estimated_weight_kg != null ? kv(t('addPet.estimatedWeight'), `${f.estimated_weight_kg} kg`) : ''}
        ${f.size ? kv(t('addPet.petSize'), t(`addPet.size${f.size.charAt(0).toUpperCase()}${f.size.slice(1)}`, { defaultValue: f.size })) : ''}
        ${f.color ? kv(t('addPet.coatColor'), f.color) : ''}
      </div>
    `);

    // Mood section
    if (moodName && moodName !== '—') {
      analysisHtml.push(sectionHeader(t('photoAnalysis.sectionMood')));
      analysisHtml.push(`
        <div style="padding:4px 0;">
          ${kv(t('diary.mood'), moodName)}
          ${mood?.confidence != null ? kv(t('ai.confidence', { defaultValue: 'Confiança' }), `${Math.round(mood.confidence * 100)}%`) : ''}
        </div>
      `);
    }

    // Health section
    if (health) {
      analysisHtml.push(sectionHeader(t('photoAnalysis.sectionHealth')));
      const healthLines: string[] = [];
      if (health.body_condition_score != null) {
        healthLines.push(kv(t('photoAnalysis.bodyCondition'), `${health.body_condition_score}/9`));
      }
      analysisHtml.push(`<div style="padding:4px 0;">${healthLines.join('')}</div>`);

      const healthCategories: Array<{ key: keyof typeof health; labelKey: string }> = [
        { key: 'skin_coat', labelKey: 'photoAnalysis.skinCoat' },
        { key: 'eyes', labelKey: 'photoAnalysis.eyes' },
        { key: 'ears', labelKey: 'photoAnalysis.ears' },
        { key: 'mouth_teeth', labelKey: 'photoAnalysis.mouthTeeth' },
        { key: 'posture_body', labelKey: 'photoAnalysis.posture' },
      ];
      for (const cat of healthCategories) {
        const items = health[cat.key] as Array<{ observation: string; severity: string }> | undefined;
        if (!Array.isArray(items) || items.length === 0) continue;
        for (const item of items) {
          analysisHtml.push(observationRow(
            t(cat.labelKey),
            item.observation,
            item.severity,
            severityLabel(item.severity, t),
          ));
        }
      }
    }

    // Alerts section
    if (alerts && alerts.length > 0) {
      analysisHtml.push(sectionHeader(t('photoAnalysis.sectionAlerts')));
      for (const alert of alerts) {
        analysisHtml.push(observationRow(
          escHtml(alert.category ?? ''),
          alert.message,
          alert.severity,
          severityLabel(alert.severity, t),
        ));
      }
    } else {
      analysisHtml.push(sectionHeader(t('photoAnalysis.sectionAlerts')));
      analysisHtml.push(`
        <div style="padding:6px 0;color:#5E7A94;font-size:11px;font-style:italic;">
          ${escHtml(t('photoAnalysis.noAlerts'))}
        </div>
      `);
    }

    // Wrap in a page-break-safe card
    sections.push(`
      <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:14px;margin-bottom:14px;page-break-inside:avoid;">
        ${analysisHtml.join('\n')}
      </div>
    `);
  }

  // ── Footer disclaimer ────────────────────────────────────────────────────
  sections.push(`
    <div style="margin-top:20px;padding:10px 14px;background:#9B59B608;border-left:3px solid #9B59B6;border-radius:6px;font-size:10px;color:#1A2B3D;line-height:1.5;">
      ${escHtml(t('photoAnalysis.pdfDisclaimer'))}
    </div>
  `);

  return sections.join('\n');
}

// ── Export functions ──────────────────────────────────────────────────────────

export async function previewPhotoAnalysisPdf(
  analyses: AnalysisRecord[],
  petName: string,
): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildPhotoAnalysisBodyHtml(analyses, petName);
  await previewPdf({
    title: t('photoAnalysis.pdfTitle', { name: petName }),
    subtitle: t('photoAnalysis.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  });
}

export async function sharePhotoAnalysisPdf(
  analyses: AnalysisRecord[],
  petName: string,
): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildPhotoAnalysisBodyHtml(analyses, petName);
  const fileName = `analises_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  await sharePdf({
    title: t('photoAnalysis.pdfTitle', { name: petName }),
    subtitle: t('photoAnalysis.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  }, fileName);
}
