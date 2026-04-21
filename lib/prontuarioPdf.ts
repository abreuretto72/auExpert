/**
 * prontuarioPdf.ts — vet-grade prontuário PDF.
 *
 * Estrutura:
 *  • Capa COLORIDA: foto do pet, identidade, pílulas de status, tutor
 *  • Corpo PRETO-E-BRANCO (clínico):
 *      Pág 2 — AI summaries + alertas + última consulta com sinais vitais
 *      Pág 3 — Vacinas + medicações ativas
 *      Pág 4 — Alergias + condições crônicas (strings e registros) + cirurgias
 *      Pág 5 — BCS + controle parasitário + calendário preventivo
 *      Pág 6 — Revisão sistêmica + predisposições de raça + interações + exames alterados
 *      Pág 7 — Cartão de emergência + veterinários de confiança
 *
 *  A divisão não é exatamente 7 páginas — depende do conteúdo. Mas a capa
 *  é sempre colorida e o resto é sempre clínico em B&W.
 */
import type {
  Prontuario,
  ProntuarioVitalSigns,
  ProntuarioBodyConditionScore,
  ProntuarioParasiteControl,
  ProntuarioChronicConditionRecord,
  ProntuarioTrustedVet,
  ProntuarioBreedPredisposition,
  ProntuarioDrugInteraction,
  ProntuarioBodySystemReview,
  ProntuarioExamAbnormalFlag,
  ProntuarioPreventiveCalendarItem,
  ProntuarioSurgery,
  ProntuarioEmergencyCard,
} from '../hooks/useProntuario';
import { previewPdf, sharePdf } from './pdf';
import i18n from '../i18n';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(i18n.language, {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function escHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Cores para a capa (coloridas) ─────────────────────────────────────────────
function vaccineStatusColor(status: Prontuario['vaccines_status']): string {
  switch (status) {
    case 'current':  return '#2ECC71';
    case 'partial':  return '#F1C40F';
    case 'overdue':  return '#E74C3C';
    default:         return '#8FA3B8';
  }
}

// ── Cores do corpo (B&W clínico) ──────────────────────────────────────────────
const BW = {
  ink:        '#1a1a1a',   // texto principal
  text:       '#333333',   // texto secundário
  muted:      '#666666',   // labels, captions
  dim:        '#888888',   // timestamps, hints
  line:       '#cccccc',   // bordas
  lineLight:  '#e5e5e5',   // bordas internas
  bg:         '#fafafa',   // fundo de cards
  bgAlt:      '#f1f1f1',   // fundo alternado de linhas
  chipBg:     '#ebebeb',
  alertBg:    '#f5f5f5',
  alertBorder:'#555555',
};

// ── Pill / chip ───────────────────────────────────────────────────────────────
function coloredPill(text: string, color: string): string {
  return `<span style="display:inline-block;background:${color}1a;color:${color};border-radius:999px;padding:3px 10px;font-size:9px;font-weight:700;margin:2px 4px 2px 0;">${escHtml(text)}</span>`;
}
function bwPill(text: string, intensity: 'solid' | 'outline' = 'outline'): string {
  if (intensity === 'solid') {
    return `<span style="display:inline-block;background:${BW.ink};color:#fff;border-radius:3px;padding:2px 8px;font-size:8.5px;font-weight:700;margin:2px 4px 2px 0;letter-spacing:0.3px;">${escHtml(text)}</span>`;
  }
  return `<span style="display:inline-block;background:${BW.chipBg};color:${BW.ink};border-radius:3px;padding:2px 8px;font-size:8.5px;font-weight:700;margin:2px 4px 2px 0;letter-spacing:0.3px;">${escHtml(text)}</span>`;
}

// ── Section headers (B&W clínico) ─────────────────────────────────────────────
function bwSectionHeader(title: string, subtitle?: string): string {
  return `<div style="margin-top:14px;margin-bottom:8px;page-break-after:avoid;">
    <div style="font-size:10px;font-weight:800;letter-spacing:1.8px;color:${BW.ink};text-transform:uppercase;border-bottom:1.5px solid ${BW.ink};padding-bottom:3px;">${escHtml(title)}</div>
    ${subtitle ? `<div style="font-size:8.5px;color:${BW.muted};margin-top:2px;">${escHtml(subtitle)}</div>` : ''}
  </div>`;
}

// ── Page break ────────────────────────────────────────────────────────────────
function pageBreak(): string {
  return `<div style="page-break-before:always;"></div>`;
}
function pageBreakAfter(): string {
  return `<div style="page-break-after:always;"></div>`;
}

// ── Empty state ───────────────────────────────────────────────────────────────
function emptyNote(text: string): string {
  return `<div style="font-size:9.5px;color:${BW.dim};font-style:italic;padding:6px 0;">${escHtml(text)}</div>`;
}

// ── Traduções de enums clínicos ───────────────────────────────────────────────
function tVitalMucous(v: ProntuarioVitalSigns['mucous_color']): string {
  if (!v) return '—';
  const t = i18n.t.bind(i18n);
  return t(`prontuario.vitalSigns.mucousColor.${v}`, { defaultValue: v });
}
function tVitalHydration(v: ProntuarioVitalSigns['hydration_status']): string {
  if (!v) return '—';
  const t = i18n.t.bind(i18n);
  return t(`prontuario.vitalSigns.hydrationStatus.${v}`, { defaultValue: v });
}
function tParasiteType(v: ProntuarioParasiteControl['type']): string {
  const t = i18n.t.bind(i18n);
  return t(`prontuario.parasiteControl.types.${v}`, { defaultValue: v });
}
function tBcsMeasuredBy(v: ProntuarioBodyConditionScore['measured_by']): string {
  const t = i18n.t.bind(i18n);
  return t(`prontuario.bodyConditionScores.measuredBy.${v}`, { defaultValue: v });
}
function tChronicStatus(v: ProntuarioChronicConditionRecord['status']): string {
  const t = i18n.t.bind(i18n);
  return t(`prontuario.chronicConditionsRecords.status.${v}`, { defaultValue: v });
}
function tChronicSeverity(v: ProntuarioChronicConditionRecord['severity']): string {
  if (!v) return '';
  const t = i18n.t.bind(i18n);
  return t(`prontuario.chronicConditionsRecords.severity.${v}`, { defaultValue: v });
}

// ── 1. COVER PAGE (colorida) ──────────────────────────────────────────────────

function buildCoverPage(p: Prontuario, petName: string, petAvatarUrl?: string | null): string {
  const t = i18n.t.bind(i18n);

  const vacStatusLabel = t(`prontuario.vaccinesStatus.${p.vaccines_status}`, { defaultValue: p.vaccines_status });
  const vacColor = vaccineStatusColor(p.vaccines_status);
  const overdueCount = p.vaccines.filter((v) => v.is_overdue).length;

  const avatarHtml = petAvatarUrl
    ? `<img src="${petAvatarUrl}" style="width:130px;height:130px;border-radius:65px;object-fit:cover;border:4px solid #E8813A;box-shadow:0 4px 12px rgba(0,0,0,0.08);" />`
    : `<div style="width:130px;height:130px;border-radius:65px;background:linear-gradient(135deg,#E8813A,#CC6E2E);display:flex;align-items:center;justify-content:center;color:#fff;font-size:54px;font-weight:800;">${escHtml(petName[0]?.toUpperCase() ?? 'P')}</div>`;

  // Identity facts
  const facts: string[] = [];
  if (p.age_label) facts.push(escHtml(p.age_label));
  if (p.weight_kg) facts.push(`${p.weight_kg} kg`);
  if (p.sex) facts.push(t(`prontuario.sexLabel.${p.sex}`, { defaultValue: p.sex }));
  if (p.is_neutered !== null) facts.push(p.is_neutered ? t('prontuario.neutered') : t('prontuario.notNeutered'));
  if (p.size) facts.push(t(`prontuario.sizeLabel.${p.size}`, { defaultValue: p.size }));
  if (p.color) facts.push(escHtml(p.color));
  if (p.blood_type) facts.push(`${t('prontuario.bloodType')}: ${escHtml(p.blood_type)}`);

  // Status pills
  const pills: string[] = [];
  pills.push(coloredPill(vacStatusLabel, vacColor));
  if (overdueCount > 0) pills.push(coloredPill(`${overdueCount} ${t('prontuario.overdueVaccines')}`, '#E74C3C'));
  if (p.active_medications.length > 0) pills.push(coloredPill(`${p.active_medications.length} ${t('prontuario.activeMeds')}`, '#9B59B6'));
  if (p.allergies.length > 0) pills.push(coloredPill(`${p.allergies.length} ${t('prontuario.allergiesCount')}`, '#E74C3C'));
  if (p.chronic_conditions.length > 0) pills.push(coloredPill(`${p.chronic_conditions.length} ${t('prontuario.chronicConditions')}`, '#F1C40F'));
  if (p.alerts.filter((a) => a.type === 'critical').length > 0) pills.push(coloredPill(`${p.alerts.filter((a) => a.type === 'critical').length} ${t('prontuario.criticalAlerts')}`, '#E74C3C'));

  return `
    <div style="page-break-after:always;padding:12px 0;">
      <!-- Título grande -->
      <div style="text-align:center;margin:18px 0 10px 0;">
        <div style="font-size:10px;font-weight:700;letter-spacing:4px;color:#E8813A;text-transform:uppercase;">auExpert</div>
        <div style="font-size:22px;font-weight:800;color:#0F1923;margin-top:4px;letter-spacing:-0.3px;">${escHtml(t('prontuario.pdfTitle', { name: petName }))}</div>
        <div style="font-size:11px;color:#5E7A94;margin-top:4px;">${escHtml(t('prontuario.pdfSubtitle'))}</div>
      </div>

      <!-- Hero: avatar + nome -->
      <div style="text-align:center;margin:22px 0 14px 0;">
        ${avatarHtml}
        <div style="font-size:26px;font-weight:800;color:#0F1923;margin-top:14px;letter-spacing:-0.5px;">${escHtml(petName)}</div>
        ${p.tutor_name ? `<div style="font-size:11px;color:#5E7A94;margin-top:4px;">${t('prontuario.tutor')}: ${escHtml(p.tutor_name)}</div>` : ''}
      </div>

      <!-- Facts -->
      ${facts.length > 0 ? `
        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 16px;margin:10px 20px;text-align:center;">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#5E7A94;text-transform:uppercase;margin-bottom:6px;">${t('prontuario.title')}</div>
          <div style="font-size:11.5px;color:#1A2B3D;line-height:1.8;">${facts.join(' &nbsp;·&nbsp; ')}</div>
          ${p.microchip ? `<div style="font-size:10px;color:#8FA3B8;margin-top:6px;font-family:monospace;">${t('prontuario.microchipLabel')}: ${escHtml(p.microchip)}</div>` : ''}
          ${p.birth_date ? `<div style="font-size:10px;color:#8FA3B8;margin-top:2px;">${t('prontuario.birthDate')}: ${formatDate(p.birth_date)}</div>` : ''}
        </div>
      ` : ''}

      <!-- Status pills -->
      ${pills.length > 0 ? `
        <div style="text-align:center;margin:14px 20px;">
          ${pills.join('')}
        </div>
      ` : ''}

      <!-- Rodapé da capa -->
      <div style="position:relative;margin-top:30px;padding:14px 20px;border-top:1px solid #E2E8F0;text-align:center;">
        <div style="font-size:9px;color:#8FA3B8;letter-spacing:1px;">
          ${t('prontuario.generatedAt')}: ${formatDate(p.generated_at)} &nbsp;·&nbsp; ${t('prontuario.aiDisclaimer')}
        </div>
      </div>
    </div>
  `;
}

// ── 2. CLINICAL SECTIONS (B&W) ────────────────────────────────────────────────

// ─── Vital signs inline row (usado em consultas) ───
function vitalSignsRowHtml(v: ProntuarioVitalSigns): string {
  const t = i18n.t.bind(i18n);
  const items: string[] = [];
  if (v.temperature_celsius !== null) items.push(`${t('prontuario.vitalSigns.temperature')}: <b>${v.temperature_celsius}°C</b>`);
  if (v.heart_rate_bpm !== null) items.push(`${t('prontuario.vitalSigns.heartRate')}: <b>${v.heart_rate_bpm} bpm</b>`);
  if (v.respiratory_rate_rpm !== null) items.push(`${t('prontuario.vitalSigns.respiratoryRate')}: <b>${v.respiratory_rate_rpm} rpm</b>`);
  if (v.capillary_refill_sec !== null) items.push(`${t('prontuario.vitalSigns.crt')}: <b>${v.capillary_refill_sec}s</b>`);
  if (v.mucous_color) items.push(`${t('prontuario.vitalSigns.mucous')}: <b>${tVitalMucous(v.mucous_color)}</b>`);
  if (v.hydration_status) items.push(`${t('prontuario.vitalSigns.hydration')}: <b>${tVitalHydration(v.hydration_status)}</b>`);
  if (items.length === 0) return '';
  return `<div style="margin-top:6px;padding:6px 8px;background:${BW.bg};border-left:2px solid ${BW.ink};font-size:9.5px;color:${BW.text};line-height:1.7;">
    <div style="font-weight:700;letter-spacing:0.8px;color:${BW.ink};font-size:8.5px;text-transform:uppercase;margin-bottom:2px;">${t('prontuario.vitalSigns.title')}</div>
    ${items.join(' &nbsp;·&nbsp; ')}
  </div>`;
}

// ─── Page 2: AI summary + alerts + last consultation ───
function buildPage2Clinical(p: Prontuario): string {
  const t = i18n.t.bind(i18n);
  const out: string[] = [];

  // AI summary (tutor)
  if (p.ai_summary) {
    out.push(bwSectionHeader(t('prontuario.summary')));
    out.push(`<div style="background:${BW.bg};border-left:3px solid ${BW.ink};padding:10px 12px;font-size:10.5px;color:${BW.text};line-height:1.6;">${escHtml(p.ai_summary)}</div>`);
  }

  // AI summary (vet)
  if (p.ai_summary_vet) {
    out.push(bwSectionHeader(t('prontuario.summaryVet')));
    out.push(`<div style="background:${BW.bg};border:1px dashed ${BW.line};padding:10px 12px;font-size:10.5px;color:${BW.text};line-height:1.6;">${escHtml(p.ai_summary_vet)}</div>`);
  }

  // Alerts
  if (p.alerts.length > 0) {
    out.push(bwSectionHeader(t('prontuario.alerts')));
    out.push(p.alerts.map((a) => {
      const prefix = a.type === 'critical' ? '!! ' : a.type === 'warning' ? '! ' : '• ';
      const weight = a.type === 'critical' ? '800' : '700';
      return `
      <div style="background:${BW.alertBg};border-left:3px solid ${BW.alertBorder};padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="font-size:10px;font-weight:${weight};color:${BW.ink};">${escHtml(prefix)}${escHtml(a.message)}</div>
        ${a.action ? `<div style="font-size:9px;color:${BW.muted};margin-top:3px;">${escHtml(a.action)}</div>` : ''}
      </div>`;
    }).join(''));
  }

  // Last consultation (with vital signs)
  if (p.last_consultation) {
    const c = p.last_consultation;
    out.push(bwSectionHeader(t('prontuario.lastConsultation')));
    out.push(`
      <div style="border:1px solid ${BW.line};border-radius:6px;padding:10px 12px;page-break-inside:avoid;">
        <div style="font-weight:800;color:${BW.ink};font-size:11px;">${formatDate(c.date)}${c.time ? ` · ${escHtml(c.time)}` : ''}</div>
        ${c.consult_type || c.type ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${escHtml(c.consult_type || c.type)}</div>` : ''}
        ${c.veterinarian ? `<div style="font-size:10px;color:${BW.text};margin-top:4px;">${escHtml(c.veterinarian)}${c.clinic ? ` — ${escHtml(c.clinic)}` : ''}</div>` : ''}
        ${c.diagnosis ? `<div style="font-size:10px;color:${BW.ink};margin-top:6px;"><b>${t('health.diagnosis', { defaultValue: 'Diagnosis' })}:</b> ${escHtml(c.diagnosis)}</div>` : ''}
        ${c.notes ? `<div style="font-size:10px;color:${BW.text};margin-top:4px;line-height:1.6;">${escHtml(c.notes)}</div>` : ''}
        ${c.prescriptions ? `<div style="font-size:9.5px;color:${BW.text};margin-top:4px;"><b>${t('prontuario.consultationPrescriptions')}:</b> ${escHtml(c.prescriptions)}</div>` : ''}
        ${c.follow_up_at ? `<div style="font-size:9.5px;color:${BW.text};margin-top:2px;"><b>${t('prontuario.consultationFollowUp')}:</b> ${formatDate(c.follow_up_at)}</div>` : ''}
        ${c.vital_signs ? vitalSignsRowHtml(c.vital_signs) : ''}
      </div>
    `);
  }

  if (out.length === 0) {
    out.push(bwSectionHeader(t('prontuario.summary')));
    out.push(emptyNote(t('prontuario.aiDisclaimer')));
  }

  return out.join('\n');
}

// ─── Page 3: Vaccines + active medications ───
function buildPage3Vaccines(p: Prontuario): string {
  const t = i18n.t.bind(i18n);
  const out: string[] = [];

  // Vaccines
  out.push(bwSectionHeader(t('health.vaccines')));
  if (p.vaccines.length === 0) {
    out.push(emptyNote(t('prontuario.aiDisclaimer')));
  } else {
    out.push(`<table style="width:100%;border-collapse:collapse;font-size:9.5px;">
      <thead>
        <tr style="background:${BW.ink};color:#fff;font-weight:700;font-size:8.5px;">
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">${t('health.vaccineName')}</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">${t('health.vaccineDate')}</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">${t('health.vaccineNext')}</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">${t('prontuario.vaccineLab', { defaultValue: 'Lab' })}</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">${t('health.status')}</th>
        </tr>
      </thead>
      <tbody>
        ${p.vaccines.map((v, i) => `
          <tr style="border-bottom:1px solid ${BW.lineLight};background:${i % 2 === 0 ? '#fff' : BW.bgAlt};page-break-inside:avoid;">
            <td style="padding:6px 8px;color:${BW.ink};">
              <div style="font-weight:700;">${escHtml(v.name)}</div>
              ${v.dose_number ? `<div style="font-size:8.5px;color:${BW.muted};">${t('prontuario.vaccineDose')}: ${escHtml(v.dose_number)}</div>` : ''}
              ${v.batch_number ? `<div style="font-size:8.5px;color:${BW.muted};font-family:monospace;">Lote: ${escHtml(v.batch_number)}</div>` : ''}
            </td>
            <td style="padding:6px 8px;text-align:center;color:${BW.text};">${formatDate(v.date_administered)}</td>
            <td style="padding:6px 8px;text-align:center;color:${BW.text};">${formatDate(v.next_due_date)}</td>
            <td style="padding:6px 8px;text-align:center;color:${BW.text};font-size:8.5px;">${escHtml(v.laboratory || '—')}</td>
            <td style="padding:6px 8px;text-align:center;">
              ${v.is_overdue
                ? `<span style="color:${BW.ink};font-weight:800;font-size:8.5px;text-decoration:underline;">${t('health.overdue')}</span>`
                : `<span style="color:${BW.muted};font-weight:600;font-size:8.5px;">${t('health.current')}</span>`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`);
  }

  // Active medications
  out.push(bwSectionHeader(t('health.medications')));
  if (p.active_medications.length === 0) {
    out.push(emptyNote(t('prontuario.aiDisclaimer')));
  } else {
    out.push(p.active_medications.map((m) => `
      <div style="border:1px solid ${BW.line};border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(m.name)}</div>
          ${m.type ? bwPill(m.type) : ''}
        </div>
        <div style="font-size:9.5px;color:${BW.text};margin-top:3px;">
          ${m.dosage ? `<b>${escHtml(m.dosage)}</b>` : ''}
          ${m.frequency ? ` · ${escHtml(m.frequency)}` : ''}
        </div>
        <div style="font-size:9px;color:${BW.muted};margin-top:2px;">
          ${m.start_date ? `${t('health.from')}: ${formatDate(m.start_date)}` : ''}
          ${m.end_date ? ` · ${t('health.to')}: ${formatDate(m.end_date)}` : ` · ${t('prontuario.ongoing')}`}
        </div>
        ${m.reason ? `<div style="font-size:9px;color:${BW.muted};margin-top:3px;"><b>${t('prontuario.medicationReason')}:</b> ${escHtml(m.reason)}</div>` : ''}
        ${m.prescribed_by ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${t('prontuario.prescribedBy')}: ${escHtml(m.prescribed_by)}</div>` : ''}
        ${m.notes ? `<div style="font-size:9px;color:${BW.text};margin-top:3px;line-height:1.5;">${escHtml(m.notes)}</div>` : ''}
      </div>
    `).join(''));
  }

  return out.join('\n');
}

// ─── Page 4: Allergies + chronic conditions + surgeries ───
function buildPage4Chronic(p: Prontuario): string {
  const t = i18n.t.bind(i18n);
  const out: string[] = [];

  // Allergies
  out.push(bwSectionHeader(t('health.allergies')));
  if (p.allergies.length === 0) {
    out.push(emptyNote(t('prontuario.aiDisclaimer')));
  } else {
    out.push(p.allergies.map((a) => `
      <div style="border:2px solid ${BW.ink};border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(a.allergen)}</div>
          ${a.confirmed ? bwPill(t('prontuario.allergyConfirmed'), 'solid') : bwPill(t('prontuario.allergyUnconfirmed'))}
        </div>
        ${a.reaction ? `<div style="font-size:9.5px;color:${BW.text};margin-top:3px;"><b>${escHtml(a.reaction)}</b>${a.severity ? ` · ${escHtml(a.severity)}` : ''}</div>` : ''}
        ${a.diagnosed_date || a.diagnosed_by ? `<div style="font-size:9px;color:${BW.muted};margin-top:3px;">
          ${a.diagnosed_date ? `${t('prontuario.allergyDiagnosedDate')}: ${formatDate(a.diagnosed_date)}` : ''}
          ${a.diagnosed_by ? `${a.diagnosed_date ? ' · ' : ''}${t('prontuario.allergyDiagnosedBy')}: ${escHtml(a.diagnosed_by)}` : ''}
        </div>` : ''}
      </div>
    `).join(''));
  }

  // Chronic conditions (strings legadas)
  if (p.chronic_conditions.length > 0) {
    out.push(bwSectionHeader(t('prontuario.chronicConditions')));
    out.push(`<div style="line-height:1.8;">${p.chronic_conditions.map((c) => bwPill(c, 'solid')).join('')}</div>`);
  }

  // Chronic conditions records (Fase 3e — estruturados)
  const records = p.chronic_conditions_records ?? [];
  if (records.length > 0) {
    out.push(bwSectionHeader(t('prontuario.chronicConditionsRecords.title', { defaultValue: t('prontuario.chronicConditionsRecords') }) as string));
    out.push(records.map((r: ProntuarioChronicConditionRecord) => `
      <div style="border:1px solid ${BW.line};border-left:4px solid ${BW.ink};border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div>
            <span style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(r.name)}</span>
            ${r.code ? `<span style="font-size:9px;color:${BW.muted};margin-left:6px;font-family:monospace;">[${escHtml(r.code)}]</span>` : ''}
          </div>
          ${bwPill(tChronicStatus(r.status), 'solid')}
        </div>
        ${r.severity ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${tChronicSeverity(r.severity)}</div>` : ''}
        ${r.diagnosed_date || r.diagnosed_by ? `<div style="font-size:9px;color:${BW.muted};margin-top:3px;">
          ${r.diagnosed_date ? formatDate(r.diagnosed_date) : ''}
          ${r.diagnosed_by ? `${r.diagnosed_date ? ' · ' : ''}${escHtml(r.diagnosed_by)}` : ''}
        </div>` : ''}
        ${r.treatment_summary ? `<div style="font-size:9.5px;color:${BW.text};margin-top:4px;line-height:1.5;"><b>Tratamento:</b> ${escHtml(r.treatment_summary)}</div>` : ''}
        ${r.notes ? `<div style="font-size:9px;color:${BW.text};margin-top:3px;line-height:1.5;">${escHtml(r.notes)}</div>` : ''}
      </div>
    `).join(''));
  }

  // Surgeries
  if (p.surgeries.length > 0) {
    out.push(bwSectionHeader(t('prontuario.surgeriesTitle')));
    out.push(p.surgeries.map((s: ProntuarioSurgery) => `
      <div style="border:1px solid ${BW.line};border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(s.name)}</div>
          ${s.status ? bwPill(t(`prontuario.surgeryStatus.${s.status}`, { defaultValue: s.status }) as string) : ''}
        </div>
        ${s.date ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${formatDate(s.date)}</div>` : ''}
        ${s.veterinarian || s.clinic ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">
          ${s.veterinarian ? escHtml(s.veterinarian) : ''}
          ${s.clinic ? `${s.veterinarian ? ' — ' : ''}${escHtml(s.clinic)}` : ''}
        </div>` : ''}
        ${s.anesthesia ? `<div style="font-size:9px;color:${BW.text};margin-top:3px;"><b>${t('prontuario.surgeryAnesthesia')}:</b> ${escHtml(s.anesthesia)}</div>` : ''}
        ${s.notes ? `<div style="font-size:9px;color:${BW.text};margin-top:3px;line-height:1.5;">${escHtml(s.notes)}</div>` : ''}
      </div>
    `).join(''));
  }

  return out.join('\n');
}

// ─── Page 5: BCS + parasite control + preventive calendar ───
function buildPage5Prevention(p: Prontuario): string {
  const t = i18n.t.bind(i18n);
  const out: string[] = [];

  // Body condition scores (WSAVA 1-9)
  const bcs = p.body_condition_scores ?? [];
  if (bcs.length > 0) {
    out.push(bwSectionHeader(t('prontuario.bodyConditionScores.title', { defaultValue: t('prontuario.bodyConditionScores') }) as string, 'WSAVA 1-9'));
    out.push(`<table style="width:100%;border-collapse:collapse;font-size:9.5px;">
      <thead>
        <tr style="background:${BW.ink};color:#fff;font-weight:700;font-size:8.5px;">
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">Score</th>
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">${t('health.vaccineDate')}</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">Peso</th>
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">Medido por</th>
        </tr>
      </thead>
      <tbody>
        ${bcs.map((b: ProntuarioBodyConditionScore, i: number) => `
          <tr style="border-bottom:1px solid ${BW.lineLight};background:${i % 2 === 0 ? '#fff' : BW.bgAlt};page-break-inside:avoid;">
            <td style="padding:6px 8px;text-align:center;">
              <span style="display:inline-block;border:2px solid ${BW.ink};border-radius:50%;width:26px;height:26px;line-height:22px;font-weight:800;color:${BW.ink};">${b.score}</span>
              <div style="font-size:8px;color:${BW.dim};margin-top:2px;">/ 9</div>
            </td>
            <td style="padding:6px 8px;color:${BW.text};">${formatDate(b.measured_at)}</td>
            <td style="padding:6px 8px;text-align:center;color:${BW.text};">${b.weight_kg ? `${b.weight_kg} kg` : '—'}</td>
            <td style="padding:6px 8px;color:${BW.muted};font-size:9px;">${escHtml(tBcsMeasuredBy(b.measured_by))}${b.notes ? `<div style="font-size:8.5px;color:${BW.muted};margin-top:2px;">${escHtml(b.notes)}</div>` : ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`);
  }

  // Parasite control
  const parasites = p.parasite_control ?? [];
  if (parasites.length > 0) {
    out.push(bwSectionHeader(t('prontuario.parasiteControl.title', { defaultValue: t('prontuario.parasiteControl') }) as string));
    out.push(parasites.map((pc: ProntuarioParasiteControl) => `
      <div style="border:1px solid ${BW.line};${pc.is_overdue ? 'border-left:4px solid ' + BW.ink + ';' : ''}border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(pc.product_name)}</div>
          ${bwPill(tParasiteType(pc.type))}
        </div>
        <div style="font-size:9.5px;color:${BW.text};margin-top:3px;">
          ${t('health.from', { defaultValue: 'Administered' })}: <b>${formatDate(pc.administered_at)}</b>
          ${pc.dose ? ` · Dose: ${escHtml(pc.dose)}` : ''}
        </div>
        ${pc.next_due_date ? `<div style="font-size:9px;color:${pc.is_overdue ? BW.ink : BW.muted};margin-top:2px;font-weight:${pc.is_overdue ? '800' : '600'};">
          ${t('health.vaccineNext')}: ${formatDate(pc.next_due_date)}
          ${pc.is_overdue ? ` — <u>${t('health.overdue')}</u>` : ''}
        </div>` : ''}
        ${pc.administered_by ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${escHtml(pc.administered_by)}</div>` : ''}
        ${pc.notes ? `<div style="font-size:9px;color:${BW.text};margin-top:3px;line-height:1.5;">${escHtml(pc.notes)}</div>` : ''}
      </div>
    `).join(''));
  }

  // Preventive calendar
  const calendar = p.preventive_calendar ?? [];
  if (calendar.length > 0) {
    out.push(bwSectionHeader(t('prontuario.preventive', { defaultValue: 'Preventive schedule' }) as string));
    out.push(`<table style="width:100%;border-collapse:collapse;font-size:9.5px;">
      <thead>
        <tr style="background:${BW.ink};color:#fff;font-weight:700;font-size:8.5px;">
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">Item</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">${t('health.vaccineNext')}</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">${t('health.status')}</th>
        </tr>
      </thead>
      <tbody>
        ${calendar.map((item: ProntuarioPreventiveCalendarItem, i: number) => `
          <tr style="border-bottom:1px solid ${BW.lineLight};background:${i % 2 === 0 ? '#fff' : BW.bgAlt};page-break-inside:avoid;">
            <td style="padding:6px 8px;color:${BW.ink};font-weight:700;">${escHtml(item.label)}</td>
            <td style="padding:6px 8px;text-align:center;color:${BW.text};">${formatDate(item.due_date)}</td>
            <td style="padding:6px 8px;text-align:center;">
              ${item.status === 'overdue'
                ? `<span style="color:${BW.ink};font-weight:800;text-decoration:underline;">${item.status}</span>`
                : `<span style="color:${BW.muted};font-weight:600;">${item.status}</span>`}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`);
  }

  if (out.length === 0) return '';
  return out.join('\n');
}

// ─── Page 6: Body systems + breed predispositions + drug interactions + exam flags ───
function buildPage6VetGrade(p: Prontuario): string {
  const t = i18n.t.bind(i18n);
  const out: string[] = [];

  // Body systems review
  const bodySystems = p.body_systems_review ?? [];
  if (bodySystems.length > 0) {
    out.push(bwSectionHeader(t('prontuario.bodySystems', { defaultValue: 'Body systems review' }) as string));
    out.push(`<table style="width:100%;border-collapse:collapse;font-size:9.5px;">
      <thead>
        <tr style="background:${BW.ink};color:#fff;font-weight:700;font-size:8.5px;">
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">Sistema</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">Status</th>
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">Notas</th>
        </tr>
      </thead>
      <tbody>
        ${bodySystems.map((s: ProntuarioBodySystemReview, i: number) => {
          const label = t(`prontuario.bodySystems.${s.system}`, { defaultValue: s.system });
          const attention = s.status === 'attention' || s.status === 'abnormal';
          return `
          <tr style="border-bottom:1px solid ${BW.lineLight};background:${i % 2 === 0 ? '#fff' : BW.bgAlt};page-break-inside:avoid;">
            <td style="padding:6px 8px;color:${BW.ink};font-weight:700;text-transform:capitalize;">${escHtml(label)}</td>
            <td style="padding:6px 8px;text-align:center;">
              ${attention
                ? `<span style="color:${BW.ink};font-weight:800;text-decoration:underline;">${escHtml(s.status)}</span>`
                : `<span style="color:${BW.muted};font-weight:600;">${escHtml(s.status)}</span>`}
            </td>
            <td style="padding:6px 8px;color:${BW.text};font-size:9px;">${escHtml(s.notes || '—')}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>`);
  }

  // Breed predispositions
  const predisp = p.breed_predispositions ?? [];
  if (predisp.length > 0) {
    out.push(bwSectionHeader(t('prontuario.predispositions', { defaultValue: 'Breed predispositions' }) as string));
    out.push(predisp.map((bp: ProntuarioBreedPredisposition) => {
      const sev = bp.severity === 'manage' ? 'solid' : 'outline';
      return `
      <div style="border:1px solid ${BW.line};${bp.severity === 'manage' ? `border-left:4px solid ${BW.ink};` : ''}border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(bp.condition)}</div>
          ${bwPill(bp.severity, sev)}
        </div>
        <div style="font-size:9.5px;color:${BW.text};margin-top:3px;line-height:1.5;">${escHtml(bp.rationale)}</div>
      </div>
      `;
    }).join(''));
  }

  // Drug interactions
  const drugs = p.drug_interactions ?? [];
  if (drugs.length > 0) {
    out.push(bwSectionHeader(t('prontuario.drugInteractions', { defaultValue: 'Drug interactions' }) as string));
    out.push(drugs.map((di: ProntuarioDrugInteraction) => {
      const severe = di.severity === 'severe';
      return `
      <div style="border:${severe ? '2px' : '1px'} solid ${BW.ink};border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10px;">${di.drugs.map((d) => escHtml(d)).join(' &harr; ')}</div>
          ${bwPill(di.severity, severe ? 'solid' : 'outline')}
        </div>
        <div style="font-size:9.5px;color:${BW.text};margin-top:3px;line-height:1.5;">${escHtml(di.warning)}</div>
      </div>
      `;
    }).join(''));
  }

  // Exam abnormal flags
  const flags = p.exam_abnormal_flags ?? [];
  if (flags.length > 0) {
    out.push(bwSectionHeader(t('prontuario.examFlags', { defaultValue: 'Abnormal exam flags' }) as string));
    out.push(`<table style="width:100%;border-collapse:collapse;font-size:9.5px;">
      <thead>
        <tr style="background:${BW.ink};color:#fff;font-weight:700;font-size:8.5px;">
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">Exame</th>
          <th style="padding:6px 8px;text-align:left;letter-spacing:0.5px;">Parâmetro</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">Valor</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">Ref.</th>
          <th style="padding:6px 8px;text-align:center;letter-spacing:0.5px;">Flag</th>
        </tr>
      </thead>
      <tbody>
        ${flags.map((f: ProntuarioExamAbnormalFlag, i: number) => `
          <tr style="border-bottom:1px solid ${BW.lineLight};background:${i % 2 === 0 ? '#fff' : BW.bgAlt};page-break-inside:avoid;">
            <td style="padding:6px 8px;color:${BW.ink};font-weight:700;">${escHtml(f.exam_name)}</td>
            <td style="padding:6px 8px;color:${BW.text};">${escHtml(f.parameter)}</td>
            <td style="padding:6px 8px;text-align:center;color:${BW.ink};font-weight:800;">${escHtml(f.value)}</td>
            <td style="padding:6px 8px;text-align:center;color:${BW.muted};font-size:8.5px;">${escHtml(f.reference || '—')}</td>
            <td style="padding:6px 8px;text-align:center;">
              <span style="color:${BW.ink};font-weight:800;text-decoration:underline;text-transform:uppercase;font-size:8.5px;">${escHtml(f.flag)}</span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`);
  }

  if (out.length === 0) return '';
  return out.join('\n');
}

// ─── Page 7: Emergency card + trusted vets ───
function buildPage7Emergency(p: Prontuario): string {
  const t = i18n.t.bind(i18n);
  const out: string[] = [];

  // Emergency card
  const card = p.emergency_card;
  if (card) {
    out.push(bwSectionHeader(t('prontuario.emergencyCard'), 'SOS'));
    out.push(`
      <div style="border:3px solid ${BW.ink};border-radius:6px;padding:12px 14px;margin-bottom:10px;page-break-inside:avoid;">
        ${card.critical_allergies.length > 0 ? `
          <div style="margin-bottom:8px;">
            <div style="font-size:8.5px;font-weight:800;letter-spacing:1px;color:${BW.ink};text-transform:uppercase;">!! ${t('prontuario.allergiesCount', { defaultValue: 'Allergies' })}</div>
            <div style="font-size:11px;color:${BW.ink};font-weight:700;margin-top:3px;">${card.critical_allergies.map((a) => escHtml(a)).join(' · ')}</div>
          </div>
        ` : ''}

        ${card.active_meds_with_dose.length > 0 ? `
          <div style="margin-bottom:8px;padding-top:8px;border-top:1px solid ${BW.lineLight};">
            <div style="font-size:8.5px;font-weight:800;letter-spacing:1px;color:${BW.ink};text-transform:uppercase;">${t('prontuario.activeMeds')}</div>
            <div style="font-size:10px;color:${BW.text};margin-top:3px;line-height:1.7;">
              ${card.active_meds_with_dose.map((m) => `<div><b>${escHtml(m.name)}</b>${m.dose ? ` · ${escHtml(m.dose)}` : ''}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        ${card.chronic_conditions_flagged.length > 0 ? `
          <div style="margin-bottom:8px;padding-top:8px;border-top:1px solid ${BW.lineLight};">
            <div style="font-size:8.5px;font-weight:800;letter-spacing:1px;color:${BW.ink};text-transform:uppercase;">${t('prontuario.chronicConditions')}</div>
            <div style="font-size:10px;color:${BW.text};margin-top:3px;line-height:1.7;">${card.chronic_conditions_flagged.map((c) => escHtml(c)).join(' · ')}</div>
          </div>
        ` : ''}

        ${card.blood_type ? `
          <div style="margin-bottom:8px;padding-top:8px;border-top:1px solid ${BW.lineLight};">
            <div style="font-size:8.5px;font-weight:800;letter-spacing:1px;color:${BW.ink};text-transform:uppercase;">${t('prontuario.bloodType')}</div>
            <div style="font-size:12px;color:${BW.ink};font-weight:800;margin-top:3px;font-family:monospace;">${escHtml(card.blood_type)}</div>
          </div>
        ` : ''}

        <div style="padding-top:8px;border-top:1px solid ${BW.lineLight};">
          <div style="font-size:8.5px;font-weight:800;letter-spacing:1px;color:${BW.ink};text-transform:uppercase;">Contato</div>
          <div style="font-size:10px;color:${BW.text};margin-top:3px;line-height:1.7;">
            ${card.contact.tutor_name ? `<div><b>${t('prontuario.tutor')}:</b> ${escHtml(card.contact.tutor_name)}${card.contact.phone ? ` · ${escHtml(card.contact.phone)}` : ''}</div>` : ''}
            ${card.contact.vet_name ? `<div><b>Vet:</b> ${escHtml(card.contact.vet_name)}${card.contact.vet_phone ? ` · ${escHtml(card.contact.vet_phone)}` : ''}</div>` : ''}
          </div>
        </div>
      </div>
    `);
  }

  // Trusted vets — primary first
  const vets = (p.trusted_vets ?? []).slice().sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
  if (vets.length > 0) {
    out.push(bwSectionHeader(t('prontuario.trustedVets')));
    out.push(vets.map((v: ProntuarioTrustedVet) => `
      <div style="border:1px solid ${BW.line};${v.is_primary ? `border-left:4px solid ${BW.ink};` : ''}border-radius:4px;padding:8px 10px;margin-bottom:6px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;">
          <div style="font-weight:800;color:${BW.ink};font-size:10.5px;">${escHtml(v.name)}</div>
          ${v.is_primary ? bwPill('Primary', 'solid') : ''}
        </div>
        ${v.specialty ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${escHtml(v.specialty)}</div>` : ''}
        ${v.clinic ? `<div style="font-size:9.5px;color:${BW.text};margin-top:3px;">${escHtml(v.clinic)}</div>` : ''}
        ${v.address ? `<div style="font-size:9px;color:${BW.muted};margin-top:2px;">${escHtml(v.address)}</div>` : ''}
        <div style="font-size:9.5px;color:${BW.text};margin-top:4px;line-height:1.6;">
          ${v.phone ? `<div><b>Tel:</b> ${escHtml(v.phone)}</div>` : ''}
          ${v.email ? `<div><b>Email:</b> ${escHtml(v.email)}</div>` : ''}
          ${v.crmv ? `<div><b>CRMV:</b> <span style="font-family:monospace;">${escHtml(v.crmv)}</span></div>` : ''}
        </div>
        ${v.notes ? `<div style="font-size:9px;color:${BW.text};margin-top:3px;font-style:italic;line-height:1.5;">${escHtml(v.notes)}</div>` : ''}
      </div>
    `).join(''));
  }

  if (out.length === 0) return '';
  return out.join('\n');
}

// ── Main builder ──────────────────────────────────────────────────────────────

export function buildProntuarioBodyHtml(
  p: Prontuario,
  petName: string,
  petAvatarUrl?: string | null
): string {
  const parts: string[] = [];

  // Page 1 — cover (colored, page-break-after:always embedded)
  parts.push(buildCoverPage(p, petName, petAvatarUrl));

  // Container B&W para todo o corpo clínico — wrappa todas as páginas restantes
  // Cada helper abaixo pode gerar 0+ seções; inserimos page-break entre eles
  // apenas quando há conteúdo substancial, pra não desperdiçar folha em branco.
  const clinical: string[] = [];

  const page2 = buildPage2Clinical(p);
  if (page2) clinical.push(page2);

  const page3 = buildPage3Vaccines(p);
  if (page3) clinical.push(pageBreak() + page3);

  const page4 = buildPage4Chronic(p);
  if (page4) clinical.push(pageBreak() + page4);

  const page5 = buildPage5Prevention(p);
  if (page5) clinical.push(pageBreak() + page5);

  const page6 = buildPage6VetGrade(p);
  if (page6) clinical.push(pageBreak() + page6);

  const page7 = buildPage7Emergency(p);
  if (page7) clinical.push(pageBreak() + page7);

  // Rodapé clínico (final de todas as páginas B&W)
  const t = i18n.t.bind(i18n);
  clinical.push(`
    <div style="margin-top:24px;padding-top:8px;border-top:1px solid ${BW.lineLight};font-size:8px;color:${BW.dim};text-align:center;line-height:1.6;">
      ${t('prontuario.generatedAt')}: ${formatDate(p.generated_at)}<br/>
      ${t('prontuario.aiDisclaimer')}
    </div>
  `);

  // Embrulha todo o corpo clínico em um container com filtro grayscale como defesa
  // final: caso algum estilo inline escape, o CSS remove a saturação do bloco inteiro.
  parts.push(`<div class="clinical-body" style="filter:grayscale(100%);-webkit-filter:grayscale(100%);">
    ${clinical.join('\n')}
  </div>`);

  return parts.join('\n');
}

// ── Export functions ──────────────────────────────────────────────────────────

export async function previewProntuarioPdf(
  prontuario: Prontuario,
  petName: string,
  petAvatarUrl?: string | null
): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildProntuarioBodyHtml(prontuario, petName, petAvatarUrl);
  await previewPdf({
    title: t('prontuario.pdfTitle', { name: petName }),
    subtitle: t('prontuario.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  });
}

export async function shareProntuarioPdf(
  prontuario: Prontuario,
  petName: string,
  petAvatarUrl?: string | null
): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bodyHtml = buildProntuarioBodyHtml(prontuario, petName, petAvatarUrl);
  const fileName = `prontuario_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
  await sharePdf({
    title: t('prontuario.pdfTitle', { name: petName }),
    subtitle: t('prontuario.pdfSubtitle'),
    bodyHtml,
    language: i18n.language,
  }, fileName);
}
