/**
 * breedPdf.ts
 *
 * Geradores de PDF do Breed Intelligence:
 *   - previewBreedPostPdf / shareBreedPostPdf  → 1 post completo (artigo)
 *   - previewBreedFeedPdf  / shareBreedFeedPdf  → feed inteiro filtrado por raça
 *
 * Usa o template padrão (lib/pdf.ts) com header + footer + paginação.
 * Toda chamada deve passar pelo PdfActionModal do componente comum.
 */
import { previewPdf, sharePdf } from './pdf';
import { colors } from '../constants/colors';
import i18n from '../i18n';
import type { BreedPost } from '../hooks/useBreedIntelligence';

// ── HTML helpers ─────────────────────────────────────────────────────────

function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateTime(iso: string, lang: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
}

function urgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical': return colors.danger;
    case 'high':     return colors.danger;
    case 'medium':   return colors.warning;
    case 'low':      return colors.click;
    default:         return colors.textDim;
  }
}

function urgencyLabel(urgency: string): string {
  if (urgency === 'high' || urgency === 'critical') return 'ALERTA';
  return '';
}

function postTypeLabel(post_type: string): string {
  switch (post_type) {
    case 'editorial':      return 'EDITORIAL';
    case 'recommendation': return 'RECOMENDAÇÃO';
    case 'tutor':          return 'TUTOR';
    default:               return 'POST';
  }
}

// ── Card HTML ────────────────────────────────────────────────────────────

function buildPostCardHtml(post: BreedPost, lang: string, fullBody: boolean): string {
  const isAlert = post.urgency === 'high' || post.urgency === 'critical';
  const typeColor = isAlert ? colors.danger : colors.click;
  const typeBadge = isAlert ? urgencyLabel(post.urgency) : postTypeLabel(post.post_type);
  const sourceLine = post.source_name ? ` · ${escHtml(post.source_name)}` : '';
  const datetime = post.published_at ? formatDateTime(post.published_at, lang) : '';

  const aspectStyle =
    post.post_type === 'editorial'      ? 'aspect-ratio: 16 / 9;' :
    post.post_type === 'recommendation' ? 'aspect-ratio: 1 / 1;' :
                                          'aspect-ratio: 4 / 5;';

  const imageUrl = post.thumbnail_url ?? post.media_thumbnails?.[0] ?? post.media_urls?.[0] ?? null;
  const imageHtml = imageUrl
    ? `<img src="${escHtml(imageUrl)}" style="width:100%; ${aspectStyle} object-fit:cover; border-radius:6px; border:1px solid #ddd; display:block; margin-bottom:10px;" />`
    : '';

  const tagsHtml = (post.ai_tags?.length ?? 0) > 0
    ? `<div style="margin-top:8px; font-size:11px; color:${colors.click};">
         ${post.ai_tags!.map(t => `#${escHtml(t)}`).join(' ')}
       </div>`
    : '';

  const sourceUrlHtml = post.source_url
    ? `<div style="margin-top:8px; font-size:11px; color:${colors.click};">
         🔗 ${escHtml(post.source_name ?? 'Fonte')}: ${escHtml(post.source_url)}
       </div>`
    : '';

  const bodyHtml = fullBody && post.body
    ? `<div style="margin-top:10px; font-size:13px; line-height:1.7; color:#333; white-space:pre-wrap;">${escHtml(post.body)}</div>`
    : '';

  return `
  <div class="breed-card" style="border:1px solid #ddd; border-radius:8px; padding:14px; margin-bottom:14px; page-break-inside:avoid;">
    <div style="display:flex; flex-direction:row; justify-content:space-between; align-items:center; margin-bottom:6px;">
      <span style="font-size:10px; font-weight:700; letter-spacing:0.6px; color:${typeColor}; text-transform:uppercase;">
        ${escHtml(typeBadge)}${sourceLine}
      </span>
      <span style="font-size:10px; color:#888;">${escHtml(datetime)}</span>
    </div>
    ${imageHtml}
    ${post.title ? `<div style="font-size:15px; font-weight:700; color:#1a1a1a; line-height:1.4; margin-bottom:6px;">${escHtml(post.title)}</div>` : ''}
    <div style="font-size:13px; color:#444; font-style:italic; line-height:1.5;">${escHtml(post.ai_caption)}</div>
    ${bodyHtml}
    ${tagsHtml}
    ${sourceUrlHtml}
  </div>`;
}

// ── 1 post completo (tela de detalhe) ────────────────────────────────────

export async function previewBreedPostPdf(post: BreedPost, petName: string): Promise<void> {
  const lang = i18n.language;
  const subtitle = `${petName ? petName + ' · ' : ''}${post.target_breeds?.[0] ?? ''}`;
  const bodyHtml = buildPostCardHtml(post, lang, true);
  await previewPdf({
    title: post.title ?? 'Breed Intelligence',
    subtitle,
    bodyHtml,
    language: lang,
  });
}

export async function shareBreedPostPdf(post: BreedPost, petName: string): Promise<void> {
  const lang = i18n.language;
  const subtitle = `${petName ? petName + ' · ' : ''}${post.target_breeds?.[0] ?? ''}`;
  const bodyHtml = buildPostCardHtml(post, lang, true);
  const safeName = (post.title ?? 'breed-post')
    .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 60);
  await sharePdf({
    title: post.title ?? 'Breed Intelligence',
    subtitle,
    bodyHtml,
    language: lang,
  }, `breed-${safeName}.pdf`);
}

// ── Feed inteiro filtrado (tela index) ───────────────────────────────────

export async function previewBreedFeedPdf(
  posts: BreedPost[],
  petName: string,
  filterLabel: string,
): Promise<void> {
  const lang = i18n.language;
  const subtitle = `${petName ? petName + ' · ' : ''}${filterLabel} · ${posts.length} ${posts.length === 1 ? 'item' : 'itens'}`;
  const bodyHtml = posts.length > 0
    ? posts.map(p => buildPostCardHtml(p, lang, false)).join('')
    : `<div style="text-align:center; padding:30px; color:#888;">Nenhum item.</div>`;
  await previewPdf({
    title: 'Breed Intelligence',
    subtitle,
    bodyHtml,
    language: lang,
  });
}

export async function shareBreedFeedPdf(
  posts: BreedPost[],
  petName: string,
  filterLabel: string,
): Promise<void> {
  const lang = i18n.language;
  const subtitle = `${petName ? petName + ' · ' : ''}${filterLabel} · ${posts.length} ${posts.length === 1 ? 'item' : 'itens'}`;
  const bodyHtml = posts.length > 0
    ? posts.map(p => buildPostCardHtml(p, lang, false)).join('')
    : `<div style="text-align:center; padding:30px; color:#888;">Nenhum item.</div>`;
  const safePet = petName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 30);
  await sharePdf({
    title: 'Breed Intelligence',
    subtitle,
    bodyHtml,
    language: lang,
  }, `breed-feed-${safePet || 'pet'}.pdf`);
}
