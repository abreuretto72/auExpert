import { previewPdf, sharePdf } from './pdf';
import i18n from '../i18n';

export interface PreferencesPdfData {
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  aiTrainingGranted: boolean;
}

function escHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sectionHeader(title: string): string {
  return `<div style="margin-top:18px;margin-bottom:8px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#5E7A94;text-transform:uppercase;border-bottom:1px solid #E2E8F040;padding-bottom:4px;">${escHtml(title)}</div>`;
}

function kv(label: string, value: string, valueColor = '#1A2B3D'): string {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #F1F5F9;font-size:11px;">
      <span style="color:#5E7A94;font-weight:600;">${escHtml(label)}</span>
      <span style="color:${valueColor};font-weight:700;">${escHtml(value)}</span>
    </div>
  `;
}


function card(content: string): string {
  return `<div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:4px 14px;margin-bottom:4px;">${content}</div>`;
}

function buildBody(data: PreferencesPdfData): string {
  const t = i18n.t.bind(i18n);
  const yes  = t('common.yes',  { defaultValue: 'Sim' });
  const no   = t('common.no',   { defaultValue: 'Não' });
  const on   = t('common.on',   { defaultValue: 'Ativo' });
  const off  = t('common.off',  { defaultValue: 'Inativo' });
  const boolVal   = (v: boolean) => (v ? yes  : no);
  const toggleVal = (v: boolean) => (v ? on   : off);
  const toggleColor = (v: boolean) => (v ? '#2ECC71' : '#E74C3C');

  const sections: string[] = [];

  // ── Notificações ──────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('settings.notifications')));
  sections.push(card(
    kv(t('settings.notifications'), toggleVal(data.notificationsEnabled), toggleColor(data.notificationsEnabled)) +
    `<div style="font-size:10px;color:#5E7A94;padding:6px 0;">${escHtml(t('settings.notificationsDesc'))}</div>`
  ));

  // ── Biometria ─────────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('settings.biometric')));
  sections.push(card(
    kv(t('settings.biometric'), toggleVal(data.biometricEnabled), toggleColor(data.biometricEnabled)) +
    `<div style="font-size:10px;color:#5E7A94;padding:6px 0;">${escHtml(t('settings.biometricDesc'))}</div>`
  ));

  // ── Privacidade / IA ──────────────────────────────────────────────────────
  sections.push(sectionHeader(t('settings.privacy')));
  sections.push(card(
    kv(t('settings.aiTraining'), boolVal(data.aiTrainingGranted), data.aiTrainingGranted ? '#9B59B6' : '#1A2B3D') +
    `<div style="font-size:10px;color:#5E7A94;padding:6px 0;">${escHtml(t('settings.aiTrainingNote'))}</div>`
  ));

  // ── Termos de Uso ─────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('legal.termsTitle')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:4px;">
      <div style="font-size:11px;color:#5E7A94;margin-bottom:10px;line-height:1.6;">${escHtml(t('legal.termsIntro'))}</div>
      ${[t('legal.termsUse'), t('legal.termsAi'), t('legal.termsContent'), t('legal.termsChanges')]
        .map(item => `<div style="font-size:11px;color:#1A2B3D;padding:6px 0 6px 10px;border-left:3px solid #E8813A;margin-bottom:6px;line-height:1.6;">${escHtml(item)}</div>`)
        .join('')}
    </div>
  `);

  // ── Política de Privacidade ───────────────────────────────────────────────
  sections.push(sectionHeader(t('legal.privacyTitle')));
  sections.push(`
    <div style="background:#fff;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:4px;">
      <div style="font-size:11px;color:#5E7A94;margin-bottom:10px;line-height:1.6;">${escHtml(t('legal.privacyIntro'))}</div>
      ${[t('legal.privacyData'), t('legal.privacyPhotos'), t('legal.privacyAi'), t('legal.privacyDelete')]
        .map(item => `<div style="font-size:11px;color:#1A2B3D;padding:6px 0 6px 10px;border-left:3px solid #2ECC71;margin-bottom:6px;line-height:1.6;">${escHtml(item)}</div>`)
        .join('')}
    </div>
  `);

  // ── Sobre ─────────────────────────────────────────────────────────────────
  sections.push(sectionHeader(t('settings.about')));
  sections.push(card(
    kv(t('settings.version'), '1.0.0-beta')
  ));

  // ── Zona de perigo ────────────────────────────────────────────────────────
  sections.push(`<div style="margin-top:18px;margin-bottom:8px;font-size:10px;font-weight:700;letter-spacing:1.4px;color:#E74C3C;text-transform:uppercase;border-bottom:1px solid #E74C3C40;padding-bottom:4px;">${escHtml(t('settings.dangerZone'))}</div>`);
  sections.push(`
    <div style="background:#E74C3C08;border:1px solid #E74C3C30;border-radius:10px;padding:12px 14px;">
      <div style="font-size:11px;font-weight:700;color:#E74C3C;">${escHtml(t('settings.deleteAccount'))}</div>
      <div style="font-size:10px;color:#5E7A94;margin-top:4px;">${escHtml(t('settings.deleteAccountDesc'))}</div>
    </div>
  `);

  return sections.join('\n');
}

export async function previewPreferencesPdf(data: PreferencesPdfData): Promise<void> {
  const t = i18n.t.bind(i18n);
  await previewPdf({
    title: t('settings.preferencesPdfTitle', { defaultValue: 'Preferências do App' }),
    subtitle: t('settings.preferencesPdfSubtitle', { defaultValue: 'Configurações do dispositivo' }),
    bodyHtml: buildBody(data),
    language: i18n.language,
  });
}

export async function sharePreferencesPdf(data: PreferencesPdfData): Promise<void> {
  const t = i18n.t.bind(i18n);
  await sharePdf({
    title: t('settings.preferencesPdfTitle', { defaultValue: 'Preferências do App' }),
    subtitle: t('settings.preferencesPdfSubtitle', { defaultValue: 'Configurações do dispositivo' }),
    bodyHtml: buildBody(data),
    language: i18n.language,
  }, 'preferencias_app.pdf');
}
