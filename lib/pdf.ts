import * as Print from 'expo-print';
import i18n from '../i18n';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { colors } from '../constants/colors';

// ── Cache logo base64 ──
let logoBase64Cache: string | null = null;

async function getLogoBase64(): Promise<string> {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const asset = Asset.fromModule(require('../assets/images/logotipotrans.png'));
    await asset.downloadAsync();
    if (asset.localUri) {
      logoBase64Cache = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  } catch {
    // Fallback: empty
    logoBase64Cache = '';
  }
  return logoBase64Cache ?? '';
}

// ── PDF Template ──

export interface PdfOptions {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  language?: string;
}

function getDateTimeStr(): string {
  const now = new Date();
  return now.toLocaleString(i18n.language, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function buildHtml(logoB64: string, options: PdfOptions): string {
  const { title, subtitle, bodyHtml } = options;
  const dateTime = getDateTimeStr();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 25mm 15mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #222;
      line-height: 1.5;
    }

    /* ── Header ── */
    .header {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid ${colors.accent};
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header-left {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      height: 32px;
      width: auto;
    }
    .header-title {
      font-size: 16px;
      font-weight: 700;
      color: ${colors.bg};
    }
    .header-subtitle {
      font-size: 10px;
      color: #666;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 9px;
      color: #888;
    }

    /* ── Body ── */
    .body { margin-bottom: 30px; }

    /* ── Entry card ── */
    .entry {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .entry-date {
      font-size: 10px;
      font-weight: 700;
      color: #444;
    }
    .entry-mood {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      color: #fff;
    }
    .entry-content {
      font-size: 11px;
      color: #333;
      margin-bottom: 6px;
      white-space: pre-wrap;
    }
    .entry-narration {
      font-size: 11px;
      font-style: italic;
      color: #666;
      border-left: 3px solid ${colors.accent};
      padding-left: 8px;
      margin-top: 6px;
    }
    .entry-tags {
      margin-top: 6px;
      font-size: 9px;
      color: ${colors.petrol};
    }
    .entry-special {
      color: ${colors.gold};
      font-weight: 700;
      font-size: 9px;
    }

    /* ── Photos ── */
    .entry-photos {
      display: flex;
      flex-direction: row;
      gap: 6px;
      margin-top: 6px;
    }
    .entry-photo {
      width: 60px;
      height: 60px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid #ddd;
    }

    /* ── Footer ── */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8px;
      color: #aaa;
      border-top: 1px solid #ddd;
      padding-top: 6px;
      padding-bottom: 4px;
    }

    /* ── Mood colors ── */
    .mood-ecstatic { background-color: #E74C3C; }
    .mood-happy { background-color: #2ECC71; }
    .mood-playful { background-color: #E8813A; }
    .mood-calm { background-color: #3498DB; }
    .mood-tired { background-color: #95A5A6; }
    .mood-anxious { background-color: #F1C40F; color: #333 !important; }
    .mood-sad { background-color: #8E44AD; }
    .mood-sick { background-color: #E74C3C; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${logoB64 ? `<img src="data:image/png;base64,${logoB64}" class="header-logo" />` : ''}
      <div>
        <div class="header-title">${title}</div>
        ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ''}
      </div>
    </div>
    <div class="header-right">
      ${dateTime}
    </div>
  </div>

  <!-- Body -->
  <div class="body">
    ${bodyHtml}
  </div>

  <!-- Footer -->
  <div class="footer">
    Multiverso Digital &copy; 2026 &mdash; auExpert
  </div>
</body>
</html>`;
}

// ── Public API ──

/**
 * Generate PDF and show print preview (tutor can print or share).
 */
export async function previewPdf(options: PdfOptions): Promise<void> {
  const logoB64 = await getLogoBase64();
  const html = buildHtml(logoB64, options);
  await Print.printAsync({ html });
}

/**
 * Generate PDF and share as file.
 */
export async function sharePdf(options: PdfOptions, fileName: string): Promise<void> {
  const logoB64 = await getLogoBase64();
  const html = buildHtml(logoB64, options);
  const { uri } = await Print.printToFileAsync({ html });
  // Rename to desired filename
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  await shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

/**
 * Generate PDF and return local URI — used for in-app preview.
 */
export async function generatePdfUri(options: PdfOptions, fileName: string): Promise<string> {
  const logoB64 = await getLogoBase64();
  const html = buildHtml(logoB64, options);
  const { uri } = await Print.printToFileAsync({ html });
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}
