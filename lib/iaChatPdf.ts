import { previewPdf, sharePdf } from './pdf';
import i18n from '../i18n';
import type { ChatMessage } from '../hooks/usePetAssistant';
import { colors } from '../constants/colors';

function escHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(i18n.language, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function buildBody(messages: ChatMessage[], petName: string): string {
  const t = i18n.t.bind(i18n);

  if (messages.length === 0) {
    return `<p style="color:#888;font-size:12px;font-style:italic;text-align:center;padding:24px 0;">${escHtml(t('ia.pdfEmpty'))}</p>`;
  }

  const sectionLabel = `
    <div style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:1.2px;
                color:#888;text-transform:uppercase;border-bottom:1px solid #e0e0e0;padding-bottom:6px;">
      ${escHtml(t('ia.pdfConversation', { name: petName.toUpperCase() }))}
    </div>`;

  const rows = messages.map((m) => {
    const isUser = m.role === 'user';
    const accentColor = isUser ? colors.click : colors.purple;
    const labelColor  = isUser ? colors.clickDark : '#6c3483';
    const label       = isUser
      ? escHtml(t('ia.pdfYou'))
      : escHtml(t('ia.pdfAI', { name: petName }));

    return `
      <div style="border:1px solid #ddd;border-left:3px solid ${accentColor};
                  border-radius:8px;padding:14px;margin-bottom:14px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:700;color:${labelColor};letter-spacing:0.4px;">${label}</span>
          <span style="font-size:10px;color:#888;">${escHtml(formatTime(m.timestamp))}</span>
        </div>
        <div style="font-size:13px;color:#333;line-height:1.65;white-space:pre-wrap;">${escHtml(m.content)}</div>
      </div>`;
  }).join('');

  return sectionLabel + rows;
}

export async function previewIaChatPdf(messages: ChatMessage[], petName: string): Promise<void> {
  const t = i18n.t.bind(i18n);
  await previewPdf({
    title:    t('ia.pdfTitle',    { name: petName }),
    subtitle: t('ia.pdfSubtitle', { count: messages.length }),
    bodyHtml: buildBody(messages, petName),
  });
}

export async function shareIaChatPdf(messages: ChatMessage[], petName: string): Promise<void> {
  const t = i18n.t.bind(i18n);
  const safe = petName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  await sharePdf(
    {
      title:    t('ia.pdfTitle',    { name: petName }),
      subtitle: t('ia.pdfSubtitle', { count: messages.length }),
      bodyHtml: buildBody(messages, petName),
    },
    `conversa_ia_${safe}.pdf`,
  );
}
