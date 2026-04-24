/**
 * achievementsPdf.ts
 *
 * Builds a PDF of the pet's unlocked achievements + level + XP.
 *
 * Called from app/(app)/pet/[id]/achievements-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AchievementRow {
  id: string;
  achievement_key: string;
  title: string;
  description: string;
  category: string;
  xp_reward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon_name: string | null;
  unlocked_at: string;
}

interface AchievementsBundle {
  achievements: AchievementRow[];
  level: number;
  xpTotal: number;
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchAchievements(petId: string): Promise<AchievementsBundle> {
  const { data, error } = await supabase
    .from('achievements')
    .select('id, achievement_key, title, description, category, xp_reward, rarity, icon_name, unlocked_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .not('unlocked_at', 'is', null)
    .order('unlocked_at', { ascending: false });

  if (error) throw error;

  const achievements = (data ?? []) as AchievementRow[];
  const xpTotal = achievements.reduce((sum, a) => sum + (Number(a.xp_reward) || 0), 0);

  // Mirror the level calculation used in useLensAchievements (source of truth).
  const XP_THRESHOLDS = [0, 80, 200, 400, 700, 1000, 1500, 2000, 3000, 5000];
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xpTotal >= XP_THRESHOLDS[i]) level = i + 1;
  }

  return { achievements, level, xpTotal };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(value: string | null, lang: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return escHtml(value);
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
}

function rarityColor(rarity: AchievementRow['rarity']): string {
  switch (rarity) {
    case 'legendary': return colors.warning;
    case 'epic':      return colors.purple;
    case 'rare':      return colors.petrol;
    default:          return colors.textDim;
  }
}

// ── Body builder ──────────────────────────────────────────────────────────────
function buildBody(bundle: AchievementsBundle, lang: string): string {
  const t = i18n.t.bind(i18n);
  const { achievements, level, xpTotal } = bundle;

  if (achievements.length === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  // Summary — level + xp
  const summaryHtml = `
    <section style="margin-bottom:18px;page-break-inside:avoid;">
      <div style="display:flex;gap:12px;">
        <div style="flex:1;padding:12px;border:1px solid ${colors.click}30;border-radius:8px;background:${colors.click}0a;">
          <div style="font-size:10px;color:${colors.textDim};text-transform:uppercase;letter-spacing:0.8px;">${escHtml(t('achievementsPdf.level'))}</div>
          <div style="font-size:22px;font-weight:800;color:${colors.click};margin-top:4px;">${level}</div>
        </div>
        <div style="flex:1;padding:12px;border:1px solid ${colors.warning}30;border-radius:8px;background:${colors.warning}0a;">
          <div style="font-size:10px;color:${colors.textDim};text-transform:uppercase;letter-spacing:0.8px;">${escHtml(t('achievementsPdf.xp'))}</div>
          <div style="font-size:22px;font-weight:800;color:${colors.warning};margin-top:4px;">${xpTotal}</div>
        </div>
        <div style="flex:1;padding:12px;border:1px solid ${colors.purple}30;border-radius:8px;background:${colors.purple}0a;">
          <div style="font-size:10px;color:${colors.textDim};text-transform:uppercase;letter-spacing:0.8px;">Total</div>
          <div style="font-size:22px;font-weight:800;color:${colors.purple};margin-top:4px;">${achievements.length}</div>
        </div>
      </div>
    </section>
  `;

  // Group by category
  const byCategory = achievements.reduce<Record<string, AchievementRow[]>>((acc, a) => {
    const cat = a.category ?? 'other';
    acc[cat] = acc[cat] ?? [];
    acc[cat].push(a);
    return acc;
  }, {});

  const categoriesHtml = Object.entries(byCategory)
    .map(([cat, rows]) => `
      <section style="margin-bottom:16px;page-break-inside:auto;">
        <h3 style="font-size:12px;color:${colors.click};margin:0 0 8px;border-bottom:1px solid ${colors.click}44;padding-bottom:2px;text-transform:uppercase;letter-spacing:1px;">
          ${escHtml(cat)} <span style="color:${colors.textDim};font-weight:400;">(${rows.length})</span>
        </h3>
        ${rows.map((a) => {
          const rColor = rarityColor(a.rarity);
          const rarityLabel = t(`achievementsPdf.rarity_${a.rarity}`);
          return `
            <div style="padding:10px 12px;border:1px solid #eee;border-radius:8px;margin-bottom:6px;page-break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div style="flex:1;">
                  <div style="font-size:12px;font-weight:700;color:#222;">${escHtml(a.title)}</div>
                  <div style="font-size:10.5px;color:#555;margin-top:3px;line-height:1.4;">${escHtml(a.description)}</div>
                </div>
                <div style="text-align:right;min-width:80px;">
                  <div style="display:inline-block;font-size:9px;font-weight:700;color:${rColor};background:${rColor}15;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.5px;">
                    ${escHtml(rarityLabel)}
                  </div>
                  <div style="font-size:11px;font-weight:700;color:${colors.warning};margin-top:4px;">+${a.xp_reward} XP</div>
                </div>
              </div>
              <div style="font-size:9.5px;color:#888;margin-top:6px;padding-top:6px;border-top:1px dashed #eee;">
                <strong style="color:#555;">${escHtml(t('achievementsPdf.unlockedAt'))}:</strong> ${escHtml(formatDate(a.unlocked_at, lang))}
              </div>
            </div>
          `;
        }).join('')}
      </section>
    `).join('');

  return summaryHtml + categoriesHtml;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface AchievementsPdfOptions {
  petId: string;
  petName: string;
}

export async function previewAchievementsPdf({ petId, petName }: AchievementsPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bundle = await fetchAchievements(petId);
  const body = buildBody(bundle, i18n.language);
  await previewPdf({
    title: t('achievementsPdf.title', { name: petName }),
    subtitle: t('achievementsPdf.subtitle', { level: bundle.level, xp: bundle.xpTotal }),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareAchievementsPdf({ petId, petName }: AchievementsPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const bundle = await fetchAchievements(petId);
  const body = buildBody(bundle, i18n.language);
  await sharePdf(
    {
      title: t('achievementsPdf.title', { name: petName }),
      subtitle: t('achievementsPdf.subtitle', { level: bundle.level, xp: bundle.xpTotal }),
      bodyHtml: body,
      language: i18n.language,
    },
    `achievements_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
