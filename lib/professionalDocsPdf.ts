/**
 * lib/professionalDocsPdf.ts
 *
 * Geração de PDFs para os 4 documentos profissionais que persistem assinatura:
 *   - prontuario  → previewProntuarioPdf(prontuarioId)
 *   - receituario → previewReceituarioPdf(receituarioId)
 *   - asa         → previewAsaPdf(atestadoId)
 *   - tci         → previewTciPdf(tciId)
 *
 * Cada função:
 *   1. Faz SELECT no documento + JOIN em professional_signatures (se assinado)
 *   2. Monta bodyHtml estruturado (cabeçalho do profissional + corpo + hash)
 *   3. Chama previewPdf() do lib/pdf.ts (template padrão do app)
 *
 * Documento NÃO assinado também pode virar PDF (rascunho), mas com marca-d-agua
 * "RASCUNHO — NÃO ASSINADO" no topo.
 */
import { supabase } from './supabase';
import { previewPdf } from './pdf';
import i18n from '../i18n';

interface ProSignature {
  payload_hash: string;
  signed_display_name: string;
  signed_council_name: string | null;
  signed_council_number: string | null;
  created_at: string;
}

function htmlEscape(s: string | null | undefined): string {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c));
}

function professionalHeader(sig: ProSignature | null, fallbackProf?: { display_name: string; council_name: string | null; council_number: string | null }): string {
  const prof = sig
    ? { display_name: sig.signed_display_name, council_name: sig.signed_council_name, council_number: sig.signed_council_number }
    : fallbackProf ?? { display_name: '—', council_name: null, council_number: null };
  return `
    <div style="border-bottom: 1px solid #ddd; padding-bottom: 12px; margin-bottom: 18px;">
      <div style="font-size: 14px; font-weight: 700;">${htmlEscape(prof.display_name)}</div>
      ${prof.council_name ? `<div style="font-size: 11px; color: #666;">${htmlEscape(prof.council_name)} ${htmlEscape(prof.council_number ?? '')}</div>` : ''}
    </div>
  `;
}

function signatureFooter(sig: ProSignature | null): string {
  if (!sig) {
    return `<div style="margin-top: 30px; padding: 12px; background: #fff8e0; border: 1px dashed #d4a017; border-radius: 6px; color: #8a6d00; font-size: 11px; text-align: center;">RASCUNHO — DOCUMENTO NÃO ASSINADO</div>`;
  }
  const dt = new Date(sig.created_at).toLocaleString('pt-BR');
  return `
    <div style="margin-top: 36px; border-top: 1px solid #ccc; padding-top: 12px;">
      <div style="font-size: 11px; color: #555;">Assinado digitalmente por <strong>${htmlEscape(sig.signed_display_name)}</strong> em ${htmlEscape(dt)}</div>
      <div style="font-size: 9px; color: #888; margin-top: 4px; word-break: break-all; font-family: monospace;">SHA-256: ${htmlEscape(sig.payload_hash)}</div>
    </div>
  `;
}

async function fetchSignature(targetTable: string, targetId: string): Promise<ProSignature | null> {
  const { data } = await supabase
    .from('professional_signatures')
    .select('payload_hash, signed_display_name, signed_council_name, signed_council_number, created_at')
    .eq('target_table', targetTable)
    .eq('target_id', targetId)
    .maybeSingle();
  return (data as ProSignature | null) ?? null;
}

// ── Prontuário ──────────────────────────────────────────────────────────────
export async function previewProntuarioPdf(prontuarioId: string): Promise<void> {
  const [{ data: doc }, sig] = await Promise.all([
    supabase.from('prontuarios').select('*').eq('id', prontuarioId).maybeSingle(),
    fetchSignature('prontuarios', prontuarioId),
  ]);
  if (!doc) throw new Error('Prontuário não encontrado.');

  const diagList = Array.isArray(doc.diagnoses) && doc.diagnoses.length > 0
    ? `<ul>${doc.diagnoses.map((d: string) => `<li>${htmlEscape(d)}</li>`).join('')}</ul>`
    : '<p style="color:#888">—</p>';

  const bodyHtml = `
    ${professionalHeader(sig)}
    <h3 style="font-size: 13px; margin: 18px 0 8px;">Queixa principal</h3>
    <p style="font-size: 12px;">${htmlEscape(doc.chief_complaint)}</p>

    ${doc.history ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Histórico</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.history)}</p>` : ''}
    ${doc.current_medications ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Medicações em uso</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.current_medications)}</p>` : ''}
    ${doc.physical_exam_notes ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Exame físico</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.physical_exam_notes)}</p>` : ''}

    <h3 style="font-size: 13px; margin: 18px 0 8px;">Diagnósticos</h3>
    ${diagList}

    ${doc.treatment_plan ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Conduta</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.treatment_plan)}</p>` : ''}
    ${doc.follow_up_days ? `<p style="font-size: 11px; color: #555; margin-top: 12px;"><strong>Retorno:</strong> ${doc.follow_up_days} dias</p>` : ''}
    ${doc.prognosis ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Prognóstico</h3><p style="font-size: 12px;">${htmlEscape(doc.prognosis)}</p>` : ''}

    ${signatureFooter(sig)}
  `;

  await previewPdf({
    title: 'Prontuário Veterinário',
    subtitle: `CFMV 1.236/2018`,
    bodyHtml,
    language: i18n.language,
  });
}

// ── Receituário ─────────────────────────────────────────────────────────────
export async function previewReceituarioPdf(receituarioId: string): Promise<void> {
  const [{ data: doc }, sig] = await Promise.all([
    supabase.from('receituarios').select('*').eq('id', receituarioId).maybeSingle(),
    fetchSignature('receituarios', receituarioId),
  ]);
  if (!doc) throw new Error('Receituário não encontrado.');

  const items = Array.isArray(doc.items) ? doc.items : [];
  const itemsHtml = items.length > 0
    ? items.map((it: any, i: number) => `
        <div style="margin: 10px 0; padding: 10px; border: 1px solid #e5e5e5; border-radius: 6px;">
          <div style="font-size: 13px; font-weight: 700;">${i + 1}. ${htmlEscape(it.name)}</div>
          ${it.dose ? `<div style="font-size: 11px; color: #555;"><strong>Dose:</strong> ${htmlEscape(it.dose)}</div>` : ''}
          ${it.frequency ? `<div style="font-size: 11px; color: #555;"><strong>Posologia:</strong> ${htmlEscape(it.frequency)}</div>` : ''}
          ${it.duration ? `<div style="font-size: 11px; color: #555;"><strong>Duração:</strong> ${htmlEscape(it.duration)}</div>` : ''}
          ${it.route ? `<div style="font-size: 11px; color: #555;"><strong>Via:</strong> ${htmlEscape(it.route)}</div>` : ''}
          ${it.notes ? `<div style="font-size: 11px; color: #777; font-style: italic; margin-top: 4px;">${htmlEscape(it.notes)}</div>` : ''}
        </div>
      `).join('')
    : '<p>—</p>';

  const typeLabel = { standard: 'Receita comum', controlled: 'Receita controlada (Portaria 344)', special: 'Receita especial' }[doc.prescription_type as string] ?? 'Receita';

  const bodyHtml = `
    ${professionalHeader(sig)}
    <div style="background: ${doc.prescription_type === 'standard' ? '#e8f5e9' : '#fff3cd'}; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 12px; font-weight: 600;">
      ${typeLabel}
    </div>
    ${doc.clinical_indication ? `<h3 style="font-size: 13px; margin: 0 0 8px;">Indicação clínica</h3><p style="font-size: 12px;">${htmlEscape(doc.clinical_indication)}</p>` : ''}
    <h3 style="font-size: 13px; margin: 18px 0 8px;">Medicamentos</h3>
    ${itemsHtml}
    ${doc.observations ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Observações</h3><p style="font-size: 12px;">${htmlEscape(doc.observations)}</p>` : ''}
    ${doc.expires_at ? `<p style="font-size: 11px; color: #555; margin-top: 12px;"><strong>Válida até:</strong> ${new Date(doc.expires_at).toLocaleDateString('pt-BR')}</p>` : ''}
    ${signatureFooter(sig)}
  `;

  await previewPdf({
    title: 'Receituário',
    subtitle: typeLabel,
    bodyHtml,
    language: i18n.language,
  });
}

// ── ASA ─────────────────────────────────────────────────────────────────────
export async function previewAsaPdf(atestadoId: string): Promise<void> {
  const [{ data: doc }, sig] = await Promise.all([
    supabase.from('atestados_saude').select('*').eq('id', atestadoId).maybeSingle(),
    fetchSignature('atestados_saude', atestadoId),
  ]);
  if (!doc) throw new Error('Atestado não encontrado.');

  const bodyHtml = `
    ${professionalHeader(sig)}
    <h2 style="text-align: center; font-size: 16px; margin: 12px 0 24px;">ATESTADO DE SAÚDE ANIMAL</h2>
    <p style="font-size: 12px;"><strong>Finalidade:</strong> ${htmlEscape(doc.purpose)}</p>
    ${doc.destination ? `<p style="font-size: 12px;"><strong>Destino:</strong> ${htmlEscape(doc.destination)}</p>` : ''}
    ${doc.transport_company ? `<p style="font-size: 12px;"><strong>Transporte:</strong> ${htmlEscape(doc.transport_company)}</p>` : ''}

    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;"><strong>Vacinas em dia:</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; color: ${doc.vaccines_up_to_date ? '#2e7d32' : '#c62828'};">${doc.vaccines_up_to_date ? 'SIM' : 'NÃO'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;"><strong>Controle de parasitas OK:</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; color: ${doc.parasite_control_ok ? '#2e7d32' : '#c62828'};">${doc.parasite_control_ok ? 'SIM' : 'NÃO'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;"><strong>Apto para viagem/transporte:</strong></td>
        <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px; color: ${doc.fit_for_travel ? '#2e7d32' : '#c62828'};">${doc.fit_for_travel ? 'SIM' : 'NÃO'}</td>
      </tr>
    </table>

    ${doc.clinical_findings ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Achados clínicos</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.clinical_findings)}</p>` : ''}
    ${doc.observations ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Observações</h3><p style="font-size: 12px;">${htmlEscape(doc.observations)}</p>` : ''}
    ${doc.valid_until ? `<p style="font-size: 11px; color: #555; margin-top: 16px;"><strong>Válido até:</strong> ${new Date(doc.valid_until).toLocaleDateString('pt-BR')} (10 dias após a assinatura)</p>` : ''}

    ${signatureFooter(sig)}
  `;

  await previewPdf({
    title: 'Atestado de Saúde Animal',
    bodyHtml,
    language: i18n.language,
  });
}

// ── TCI ─────────────────────────────────────────────────────────────────────
export async function previewTciPdf(tciId: string): Promise<void> {
  const [{ data: doc }, sig] = await Promise.all([
    supabase.from('termos_consentimento').select('*').eq('id', tciId).maybeSingle(),
    fetchSignature('termos_consentimento', tciId),
  ]);
  if (!doc) throw new Error('Termo não encontrado.');

  const tutorSigned = doc.tutor_signed_at ? new Date(doc.tutor_signed_at).toLocaleString('pt-BR') : null;
  const profSigned = doc.professional_signed_at ? new Date(doc.professional_signed_at).toLocaleString('pt-BR') : null;

  const bodyHtml = `
    ${professionalHeader(sig)}
    <h2 style="text-align: center; font-size: 16px; margin: 12px 0 24px;">TERMO DE CONSENTIMENTO INFORMADO</h2>

    <p style="font-size: 12px;"><strong>Procedimento:</strong> ${htmlEscape(doc.procedure_type)}</p>
    <p style="font-size: 12px;">${htmlEscape(doc.procedure_description)}</p>

    ${doc.risks_described ? `<h3 style="font-size: 13px; margin: 18px 0 8px; color: #c62828;">Riscos descritos</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.risks_described)}</p>` : ''}
    ${doc.alternatives_described ? `<h3 style="font-size: 13px; margin: 18px 0 8px;">Alternativas</h3><p style="font-size: 12px; white-space: pre-wrap;">${htmlEscape(doc.alternatives_described)}</p>` : ''}

    <div style="margin-top: 28px; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
      <h3 style="font-size: 13px; margin: 0 0 12px;">Assinaturas</h3>
      <p style="font-size: 11px;"><strong>Tutor:</strong> ${tutorSigned ? `assinado em ${tutorSigned}` : 'aguardando assinatura'}</p>
      <p style="font-size: 11px;"><strong>Profissional:</strong> ${profSigned ? `assinado em ${profSigned}` : 'aguardando assinatura'}</p>
    </div>

    ${signatureFooter(sig)}
  `;

  await previewPdf({
    title: 'Termo de Consentimento Informado',
    subtitle: doc.procedure_type,
    bodyHtml,
    language: i18n.language,
  });
}
