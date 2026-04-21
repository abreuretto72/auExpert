/**
 * happinessPdf.ts
 *
 * Builds a PDF summary of the pet's happiness/mood trend over the last 90 days.
 * Mirrors the HappinessLens summary: avg score, dominant mood, streak, trend,
 * and a per-day breakdown.
 *
 * Called from app/(app)/pet/[id]/happiness-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';
import { moods } from '../constants/moods';

// ── Types ─────────────────────────────────────────────────────────────────────
interface MoodRow {
  id: string;
  mood_id: string;
  score: number;
  created_at: string;
}

interface AggregatedDay {
  date: string;          // YYYY-MM-DD
  avgScore: number;      // 0-100
  dominantMood: string;
  count: number;
}

interface HappinessAgg {
  days: AggregatedDay[];
  avgScore: number;
  dominantMood: string;
  totalEntries: number;
  streakDays: number;
  trend: 'up' | 'down' | 'stable';
}

// ── Data fetch + aggregate ────────────────────────────────────────────────────
async function fetchHappiness(petId: string): Promise<HappinessAgg> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('mood_logs')
    .select('id, mood_id, score, created_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as MoodRow[];

  if (rows.length === 0) {
    return { days: [], avgScore: 0, dominantMood: 'calm', totalEntries: 0, streakDays: 0, trend: 'stable' };
  }

  const byDay = new Map<string, { scores: number[]; moods: string[] }>();
  const moodCounts: Record<string, number> = {};

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { scores: [], moods: [] });
    byDay.get(day)!.scores.push(Number(row.score));
    byDay.get(day)!.moods.push(row.mood_id);
    moodCounts[row.mood_id] = (moodCounts[row.mood_id] ?? 0) + 1;
  }

  const days: AggregatedDay[] = [...byDay.entries()]
    .map(([date, v]) => {
      const modeMood = v.moods.reduce<Record<string, number>>((acc, m) => {
        acc[m] = (acc[m] ?? 0) + 1;
        return acc;
      }, {});
      const dominant = Object.entries(modeMood).sort((a, b) => b[1] - a[1])[0][0];
      const avg = v.scores.reduce((s, x) => s + x, 0) / v.scores.length;
      return { date, avgScore: Math.round(avg), dominantMood: dominant, count: v.scores.length };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalScore = rows.reduce((s, r) => s + Number(r.score), 0);
  const avgScore = Math.round(totalScore / rows.length);
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];

  // streak — consecutive days from today backwards
  const today = new Date();
  let streakDays = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    if (byDay.has(key)) streakDays++;
    else break;
  }

  // trend: last 7 vs prev 7 days
  const last7 = days.slice(0, 7);
  const prev7 = days.slice(7, 14);
  const avgLast = last7.length ? last7.reduce((s, d) => s + d.avgScore, 0) / last7.length : 0;
  const avgPrev = prev7.length ? prev7.reduce((s, d) => s + d.avgScore, 0) / prev7.length : avgLast;
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (avgLast - avgPrev > 5) trend = 'up';
  else if (avgPrev - avgLast > 5) trend = 'down';

  return { days, avgScore, dominantMood, totalEntries: rows.length, streakDays, trend };
}

// ── HTML ──────────────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function moodLabel(moodId: string, lang: string): string {
  const mood = moods.find((m) => m.id === moodId);
  if (!mood) return moodId;
  return lang.startsWith('en') ? mood.label_en : mood.label;
}

function formatDate(isoDay: string, lang: string): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' });
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function buildBody(data: HappinessAgg, lang: string): string {
  const t = i18n.t.bind(i18n);

  if (data.totalEntries === 0) {
    return `<p style="text-align:center;color:${colors.textDim};padding:40px 0;">${escHtml(t('pdfCommon.empty'))}</p>`;
  }

  const trendKey = data.trend === 'up' ? 'happinessPdf.trendUp'
                : data.trend === 'down' ? 'happinessPdf.trendDown'
                : 'happinessPdf.trendStable';
  const trendColor = data.trend === 'up' ? colors.success
                   : data.trend === 'down' ? colors.danger
                   : colors.textDim;

  const summaryHtml = `
    <section style="margin-bottom:18px;page-break-inside:avoid;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.accent};padding-bottom:3px;">${escHtml(t('happinessPdf.summary'))}</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px;">
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('happinessPdf.avgScore'))}</div>
          <div style="font-size:20px;font-weight:700;color:${scoreColor(data.avgScore)};margin-top:2px;">${data.avgScore}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('happinessPdf.dominantMood'))}</div>
          <div style="font-size:14px;font-weight:700;color:#222;margin-top:2px;">${escHtml(moodLabel(data.dominantMood, lang))}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('happinessPdf.totalEntries'))}</div>
          <div style="font-size:20px;font-weight:700;color:${colors.accent};margin-top:2px;">${data.totalEntries}</div>
        </div>
        <div style="flex:1;min-width:120px;border:1px solid #ddd;border-radius:8px;padding:10px;">
          <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(t('happinessPdf.streak'))}</div>
          <div style="font-size:20px;font-weight:700;color:${colors.accent};margin-top:2px;">${data.streakDays} <span style="font-size:11px;font-weight:400;color:#888;">${escHtml(t('happinessPdf.streakDays'))}</span></div>
        </div>
      </div>
      <div style="font-size:11px;color:${trendColor};font-weight:600;">
        ${escHtml(t('happinessPdf.trend'))}: ${escHtml(t(trendKey))}
      </div>
    </section>
  `;

  const daysHtml = `
    <section style="page-break-inside:auto;">
      <h2 style="font-size:14px;color:#222;margin-bottom:10px;border-bottom:2px solid ${colors.accent};padding-bottom:3px;">${escHtml(t('happinessPdf.daysBreakdown'))}</h2>
      ${data.days.map((d) => `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-bottom:1px solid #eee;page-break-inside:avoid;">
          <div style="flex:1;font-size:11px;color:#333;">${escHtml(formatDate(d.date, lang))}</div>
          <div style="flex:1;font-size:11px;color:#666;">${escHtml(moodLabel(d.dominantMood, lang))}</div>
          <div style="font-size:12px;font-weight:700;color:${scoreColor(d.avgScore)};min-width:36px;text-align:right;">${d.avgScore}</div>
          <div style="font-size:9px;color:#999;min-width:30px;text-align:right;">${d.count}×</div>
        </div>
      `).join('')}
    </section>
  `;

  return summaryHtml + daysHtml;
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface HappinessPdfOptions {
  petId: string;
  petName: string;
}

export async function previewHappinessPdf({ petId, petName }: HappinessPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchHappiness(petId);
  const body = buildBody(data, i18n.language);
  await previewPdf({
    title: t('happinessPdf.title', { name: petName }),
    subtitle: t('happinessPdf.subtitle'),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function shareHappinessPdf({ petId, petName }: HappinessPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchHappiness(petId);
  const body = buildBody(data, i18n.language);
  await sharePdf(
    {
      title: t('happinessPdf.title', { name: petName }),
      subtitle: t('happinessPdf.subtitle'),
      bodyHtml: body,
      language: i18n.language,
    },
    `happiness_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
