import * as Print from 'expo-print';
import i18n from '../i18n';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { colors } from '../constants/colors';

// ── Caches ──
let logoBase64Cache: string | null = null;
const imageCache = new Map<string, string>();

// ── Inline remote images so expo-print WebView can render them ──
function mimeFromUrl(url: string): { mime: string; tmpExt: string } {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'webp') return { mime: 'image/webp', tmpExt: 'webp' };
  if (ext === 'png')  return { mime: 'image/png',  tmpExt: 'png'  };
  if (ext === 'gif')  return { mime: 'image/gif',  tmpExt: 'gif'  };
  return { mime: 'image/jpeg', tmpExt: 'jpg' };
}

async function inlineRemoteImages(html: string): Promise<string> {
  const urlRegex = /src="(https?:\/\/[^"]+)"/g;
  const uniqueUrls = [...new Set([...html.matchAll(urlRegex)].map((m) => m[1]))];
  if (uniqueUrls.length === 0) return html;

  const base64Map: Record<string, string> = {};
  await Promise.all(
    uniqueUrls.map(async (url) => {
      // Use cache if available
      if (imageCache.has(url)) {
        base64Map[url] = imageCache.get(url)!;
        return;
      }
      try {
        const { mime, tmpExt } = mimeFromUrl(url);
        const tmpPath = `${FileSystem.cacheDirectory}pdf_img_${Date.now()}_${Math.random().toString(36).slice(2)}.${tmpExt}`;
        const result = await FileSystem.downloadAsync(url, tmpPath);
        if (result.status < 200 || result.status >= 300) return;
        const b64 = await FileSystem.readAsStringAsync(tmpPath, { encoding: FileSystem.EncodingType.Base64 });
        const dataUri = `data:${mime};base64,${b64}`;
        imageCache.set(url, dataUri);
        base64Map[url] = dataUri;
      } catch {
        // skip — image omitted from PDF
      }
    })
  );

  return html.replace(urlRegex, (_match, url) => {
    const b64 = base64Map[url];
    return b64 ? `src="${b64}"` : `src=""`;
  });
}

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

function getDateStr(): string {
  const now = new Date();
  return now.toLocaleDateString(i18n.language, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function buildHtml(logoB64: string, options: PdfOptions): string {
  const { title, subtitle, bodyHtml } = options;
  const dateStr = getDateStr();
  const logoImg = logoB64
    ? `<img src="data:image/png;base64,${logoB64}" class="header-logo" />`
    : `<span style="font-size:15px;font-weight:700;color:${colors.click};">auExpert</span>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page {
      size: A4;
      margin: 8mm 15mm 16mm 15mm;
      @bottom-right {
        content: counter(page) " / " counter(pages);
        font-size: 9px;
        color: #aaa;
        font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      line-height: 1.6;
    }

    /* ── thead/tfoot repeating header/footer on every page ── */
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tbody { display: table-row-group; }

    /* ── Header ── */
    .page-header {
      background: #fff;
      border-bottom: 2.5px solid ${colors.click};
      padding: 8px 0 10px 0;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .header-logo {
      height: 34px;
      width: auto;
    }
    .header-title {
      font-size: 15px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .header-subtitle {
      font-size: 11px;
      color: #666;
      margin-top: 1px;
    }
    .header-right {
      text-align: right;
      font-size: 10px;
      color: #888;
      white-space: nowrap;
    }
    .header-date {
      display: block;
    }

    /* ── Body ── */
    .body { padding-bottom: 30px; }

    /* ── Entry card ── */
    .entry {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 14px;
      page-break-inside: avoid;
    }
    .entry-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .entry-date {
      font-size: 12px;
      font-weight: 700;
      color: #444;
    }
    .entry-mood {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 10px;
      color: #fff;
    }
    .entry-content {
      font-size: 13px;
      color: #333;
      margin-bottom: 8px;
      white-space: pre-wrap;
    }
    .entry-narration {
      font-size: 13px;
      font-style: italic;
      color: #555;
      border-left: 3px solid ${colors.click};
      padding-left: 10px;
      margin-top: 8px;
    }
    .entry-tags {
      margin-top: 8px;
      font-size: 11px;
      color: ${colors.petrol};
    }
    .entry-special {
      color: ${colors.warning};
      font-weight: 700;
      font-size: 11px;
    }

    /* ── Photos ── */
    .entry-photos {
      display: flex;
      flex-direction: row;
      gap: 6px;
      margin-top: 8px;
    }
    .entry-photo {
      width: 70px;
      height: 70px;
      border-radius: 6px;
      object-fit: cover;
      border: 1px solid #ddd;
    }

    /* ── Footer ── */
    .page-footer {
      text-align: center;
      font-size: 9px;
      color: #aaa;
      border-top: 1px solid #e0e0e0;
      padding: 6px 0 0 0;
      margin-top: 14px;
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
  <table style="width:100%; border-collapse:collapse;">
    <thead>
      <tr><td>
        <div class="page-header">
          <div class="header-left">
            ${logoImg}
            <div>
              <div class="header-title">${title}</div>
              ${subtitle ? `<div class="header-subtitle">${subtitle}</div>` : ''}
            </div>
          </div>
          <div class="header-right">
            <span class="header-date">${dateStr}</span>
          </div>
        </div>
      </td></tr>
    </thead>
    <tfoot>
      <tr><td>
        <div class="page-footer">
          Multiverso Digital &copy; 2026 &mdash; auExpert
        </div>
      </td></tr>
    </tfoot>
    <tbody>
      <tr><td>
        <div class="body">
          ${bodyHtml}
        </div>
      </td></tr>
    </tbody>
  </table>
</body>
</html>`;
}

// ── Public API ──

/**
 * Generate PDF and show print preview (tutor can print or share from native dialog).
 */
export async function previewPdf(options: PdfOptions): Promise<void> {
  const [logoB64, bodyHtmlInlined] = await Promise.all([
    getLogoBase64(),
    inlineRemoteImages(options.bodyHtml),
  ]);
  const html = buildHtml(logoB64, { ...options, bodyHtml: bodyHtmlInlined });
  await Print.printAsync({ html });
}

/**
 * Generate PDF and share as file.
 */
export async function sharePdf(options: PdfOptions, fileName: string): Promise<void> {
  const [logoB64, bodyHtmlInlined] = await Promise.all([
    getLogoBase64(),
    inlineRemoteImages(options.bodyHtml),
  ]);
  const html = buildHtml(logoB64, { ...options, bodyHtml: bodyHtmlInlined });
  const { uri } = await Print.printToFileAsync({ html });
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  await shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

/**
 * Generate PDF and return local URI — used for in-app preview.
 */
export async function generatePdfUri(options: PdfOptions, fileName: string): Promise<string> {
  const [logoB64, bodyHtmlInlined] = await Promise.all([
    getLogoBase64(),
    inlineRemoteImages(options.bodyHtml),
  ]);
  const html = buildHtml(logoB64, { ...options, bodyHtml: bodyHtmlInlined });
  const { uri } = await Print.printToFileAsync({ html });
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  return dest;
}
