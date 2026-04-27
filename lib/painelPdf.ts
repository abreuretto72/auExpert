/**
 * painelPdf.ts
 *
 * Builds an aggregate "painel" (dashboard) PDF that summarizes all 8 lenses:
 *   Prontuário · Nutrição · Gastos · Amigos
 *   Conquistas · Felicidade · Viagens · Planos
 *
 * Each lens is a compact section with its headline metric plus a short list
 * of highlights. The tutor gets a one-document overview that they can hand
 * to a vet, sitter, or family member.
 *
 * Called from app/(app)/pet/[id]/painel-pdf.tsx.
 */
import { previewPdf, sharePdf } from './pdf';
import { supabase } from './supabase';
import i18n from '../i18n';
import { colors } from '../constants/colors';
import { moods } from '../constants/moods';
import type {
  LensExpenseRow, NutritionData, NutritionRecord, PetConnection,
  PlansData, AchievementsData, Achievement, MoodTrendData, TravelData,
} from '../hooks/useLens';

// ── Types ─────────────────────────────────────────────────────────────────────
interface VaccineRow {
  id: string;
  vaccine_name: string;
  applied_date: string | null;
  next_due_date: string | null;
  status: 'up_to_date' | 'overdue' | 'due_soon' | 'scheduled' | string;
}

interface PainelData {
  // Prontuário
  vaccines: VaccineRow[];
  overdueCount: number;
  upcomingCount: number;
  // Nutrição
  nutrition: NutritionData | null;
  // Gastos
  expenses: LensExpenseRow[];
  monthTotal: number;
  monthCategories: Array<{ category: string; total: number }>;
  // Amigos
  friends: PetConnection[];
  // Conquistas
  achievements: AchievementsData | null;
  // Felicidade
  happiness: MoodTrendData | null;
  // Viagens
  travel: TravelData | null;
  // Planos
  plans: PlansData | null;
}

// ── Data fetch ────────────────────────────────────────────────────────────────
async function fetchPainel(petId: string): Promise<PainelData> {
  // Run all 8 queries in parallel
  const [
    vacRes, nutRes, expRes, friRes, achRes, moodRes, travRes, planRes, planSumRes,
  ] = await Promise.all([
    supabase
      .from('vaccines')
      .select('id, vaccine_name, applied_date, next_due_date, status')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('next_due_date', { ascending: true }),
    supabase
      .from('nutrition_records')
      .select('id, record_type, product_name, brand, category, portion_grams, daily_portions, calories_kcal, is_current, notes, started_at, ended_at, source, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('id, date, vendor, category, total, currency, items, diary_entry_id')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('date', { ascending: false }),
    supabase
      // pet_connections não tem meet_count/photo_url — agregação é client-side
      // (1 row = 1 menção no diário). Pedir essas colunas inexistentes faz
      // PostgREST devolver 42703 e o painel inteiro fica vazio.
      .from('pet_connections')
      .select('id, friend_name, friend_species, friend_breed, friend_owner, connection_type, first_met_at, last_seen_at, notes, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('last_seen_at', { ascending: false }),
    supabase
      .from('achievements')
      .select('id, achievement_key, title, description, category, xp_reward, rarity, icon_name, unlocked_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('unlocked_at', { ascending: false }),
    supabase
      .from('mood_logs')
      .select('id, mood_id, score, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }),
    supabase
      .from('pet_travels')
      .select('id, destination, country, region, travel_type, status, start_date, end_date, distance_km, notes, photos, tags, diary_entry_id, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('start_date', { ascending: false }),
    supabase
      .from('pet_plans')
      .select('id, plan_type, provider, plan_name, plan_code, monthly_cost, annual_cost, coverage_limit, currency, coverage_items, start_date, end_date, renewal_date, status, source, created_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('pet_plans_summary')
      .select('active_count, total_monthly_cost, total_reimbursed, next_renewal_date')
      .eq('pet_id', petId)
      .maybeSingle(),
  ]);

  // Vaccines
  const vaccines = (vacRes.data ?? []) as VaccineRow[];
  const today = new Date().toISOString().slice(0, 10);
  const overdueCount = vaccines.filter(
    (v) => v.next_due_date && v.next_due_date < today && v.status !== 'up_to_date',
  ).length;
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const upcomingCount = vaccines.filter(
    (v) => v.next_due_date && v.next_due_date >= today && v.next_due_date <= in30,
  ).length;

  // Nutrition
  const nutRows = (nutRes.data ?? []) as NutritionRecord[];
  const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nutrition: NutritionData | null = nutRows.length > 0 ? {
    currentFood: nutRows.find((r) => r.record_type === 'food' && r.is_current) ?? null,
    activeSupplements: nutRows.filter((r) => r.record_type === 'supplement'),
    recentTreats: nutRows.filter((r) => r.record_type === 'treat' && (r.created_at ?? '') >= thirty),
    intolerances: nutRows.filter((r) => r.record_type === 'intolerance' || r.record_type === 'restriction'),
    foodHistory: nutRows.filter((r) => r.record_type === 'food').slice(0, 10),
  } : null;

  // Expenses — current month total + by category
  const expenses = (expRes.data ?? []).map((r) => ({
    ...r,
    total: Number(r.total),
    items: (r.items as LensExpenseRow['items']) ?? [],
  })) as LensExpenseRow[];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const monthRows = expenses.filter((e) => (e.date ?? '') >= monthStart);
  const monthTotal = monthRows.reduce((s, e) => s + e.total, 0);
  const catMap = new Map<string, number>();
  monthRows.forEach((e) => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.total));
  const monthCategories = [...catMap.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  // Friends — agregação client-side (1 row = 1 menção; agrupa por friend_name).
  const friendRows = (friRes.data ?? []) as Array<{
    id: string;
    friend_name: string;
    friend_species: string | null;
    friend_breed: string | null;
    friend_owner: string | null;
    connection_type: string | null;
    first_met_at: string | null;
    last_seen_at: string | null;
    notes: string | null;
    created_at: string;
  }>;
  const friendMap = new Map<string, PetConnection>();
  for (const r of friendRows) {
    const key = r.friend_name.trim().toLowerCase();
    const existing = friendMap.get(key);
    if (!existing) {
      friendMap.set(key, {
        id: r.id,
        friend_name: r.friend_name,
        friend_species: r.friend_species ?? 'unknown',
        friend_breed: r.friend_breed,
        friend_owner: r.friend_owner,
        connection_type: r.connection_type ?? 'friend',
        first_met_at: r.first_met_at,
        last_seen_at: r.last_seen_at,
        meet_count: 1,
        notes: r.notes,
        created_at: r.created_at,
      });
    } else {
      existing.meet_count += 1;
      if (!existing.first_met_at || (r.first_met_at && r.first_met_at < existing.first_met_at)) {
        existing.first_met_at = r.first_met_at ?? existing.first_met_at;
      }
      if (!existing.last_seen_at || (r.last_seen_at && r.last_seen_at > existing.last_seen_at)) {
        existing.last_seen_at = r.last_seen_at ?? existing.last_seen_at;
      }
      existing.friend_breed = existing.friend_breed ?? r.friend_breed;
      existing.friend_owner = existing.friend_owner ?? r.friend_owner;
      existing.notes = existing.notes ?? r.notes;
    }
  }
  const friends = [...friendMap.values()].sort((a, b) => {
    const da = a.last_seen_at ?? a.created_at;
    const db = b.last_seen_at ?? b.created_at;
    return db.localeCompare(da);
  });

  // Achievements (replicate useLens logic)
  const achievementsRaw = (achRes.data ?? []) as unknown as Achievement[];
  let achievements: AchievementsData | null = null;
  if (achievementsRaw.length > 0) {
    const xpTotal = achievementsRaw.reduce((sum, a) => sum + (a.xp_reward ?? 0), 0);
    const XP_THRESHOLDS = [0, 80, 200, 400, 700, 1000, 1500, 2000, 3000, 5000];
    let level = 1;
    for (let i = 1; i < XP_THRESHOLDS.length; i++) {
      if (xpTotal >= XP_THRESHOLDS[i]) level = i + 1;
    }
    const currentThreshold = XP_THRESHOLDS[Math.min(level - 1, 9)] ?? 0;
    const nextThreshold = XP_THRESHOLDS[Math.min(level, 9)] ?? 5000;
    const xpInLevel = xpTotal - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;
    const xpProgress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;
    const byCategory = achievementsRaw.reduce<Record<string, Achievement[]>>((acc, a) => {
      acc[a.category] = acc[a.category] ?? [];
      acc[a.category].push(a);
      return acc;
    }, {});
    achievements = {
      achievements: achievementsRaw,
      level,
      xpTotal,
      xpForNextLevel: nextThreshold,
      xpProgress,
      byCategory,
      recent: achievementsRaw.slice(0, 5),
    };
  }

  // Happiness (replicate useLens logic)
  const moodRows = (moodRes.data ?? []) as { id: string; mood_id: string; score: number; created_at: string }[];
  let happiness: MoodTrendData | null = null;
  if (moodRows.length > 0) {
    const byDay = new Map<string, { scores: number[]; moods: string[] }>();
    const moodCounts: Record<string, number> = {};
    for (const row of moodRows) {
      const day = row.created_at.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, { scores: [], moods: [] });
      byDay.get(day)!.scores.push(Number(row.score));
      byDay.get(day)!.moods.push(row.mood_id);
      moodCounts[row.mood_id] = (moodCounts[row.mood_id] ?? 0) + 1;
    }
    const days = [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, { scores, moods: ms }]) => {
        const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const modeCount = new Map<string, number>();
        ms.forEach((m) => modeCount.set(m, (modeCount.get(m) ?? 0) + 1));
        const dominantMood = [...modeCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
        return { date, avgScore, dominantMood, count: scores.length };
      });
    const avgScore = Math.round(moodRows.reduce((a, b) => a + Number(b.score), 0) / moodRows.length);
    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];
    const daySet = new Set(days.map((d) => d.date));
    let streakDays = 0;
    const todayD = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(todayD);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (daySet.has(key)) streakDays++;
      else break;
    }
    const last7 = days.slice(0, 7);
    const prev7 = days.slice(7, 14);
    const avg7 = last7.length ? last7.reduce((a, b) => a + b.avgScore, 0) / last7.length : 0;
    const avgPrev7 = prev7.length ? prev7.reduce((a, b) => a + b.avgScore, 0) / prev7.length : avg7;
    const diff = avg7 - avgPrev7;
    const trend: 'up' | 'down' | 'stable' = diff > 4 ? 'up' : diff < -4 ? 'down' : 'stable';
    happiness = {
      days, avgScore, dominantMood,
      totalEntries: moodRows.length,
      streakDays,
      moodDistribution: moodCounts,
      trend,
    };
  }

  // Travels
  const travels = (travRes.data ?? []).map((r) => ({
    ...r,
    distance_km: r.distance_km != null ? Number(r.distance_km) : null,
    photos: (r.photos as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
  }));
  const completedTravels = travels.filter((t) => t.status === 'completed');
  const totalKm = Math.round(completedTravels.reduce((acc, t) => acc + (t.distance_km ?? 0), 0));
  const totalDays = completedTravels.reduce((acc, t) => {
    if (!t.start_date || !t.end_date) return acc;
    const diff = Math.round(
      (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1;
    return acc + Math.max(diff, 1);
  }, 0);
  const travel: TravelData | null = travels.length > 0
    ? { travels: travels as TravelData['travels'], totalTrips: completedTravels.length, totalKm, totalDays }
    : null;

  // Plans
  const plans = (planRes.data ?? []).map((r) => ({
    ...r,
    monthly_cost: r.monthly_cost != null ? Number(r.monthly_cost) : null,
    annual_cost: r.annual_cost != null ? Number(r.annual_cost) : null,
    coverage_limit: r.coverage_limit != null ? Number(r.coverage_limit) : null,
    coverage_items: (r.coverage_items as string[]) ?? [],
  })) as PlansData['plans'];
  const planSum = planSumRes.data
    ? {
        active_count: Number(planSumRes.data.active_count) || 0,
        total_monthly_cost: Number(planSumRes.data.total_monthly_cost) || 0,
        total_reimbursed: Number(planSumRes.data.total_reimbursed) || 0,
        next_renewal_date: planSumRes.data.next_renewal_date ?? null,
      }
    : { active_count: 0, total_monthly_cost: 0, total_reimbursed: 0, next_renewal_date: null };
  const plansData: PlansData | null = plans.length > 0 ? { plans, summary: planSum } : null;

  return {
    vaccines, overdueCount, upcomingCount,
    nutrition,
    expenses, monthTotal, monthCategories,
    friends,
    achievements,
    happiness,
    travel,
    plans: plansData,
  };
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatMoney(val: number, lang: string): string {
  return `R$ ${val.toLocaleString(lang, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return '—';
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString(lang, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function moodLabel(moodId: string, lang: string): string {
  const m = moods.find((x) => x.id === moodId);
  if (!m) return moodId;
  return lang.startsWith('en') ? m.label_en : m.label;
}

function scoreColor(score: number): string {
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.danger;
}

function sectionHeader(title: string, color: string): string {
  return `<h2 style="font-size:13px;color:#222;margin:0 0 8px 0;border-bottom:2px solid ${color};padding-bottom:3px;">${escHtml(title)}</h2>`;
}

function statCard(label: string, value: string, valueColor: string): string {
  return `
    <div style="flex:1;min-width:110px;border:1px solid #ddd;border-radius:8px;padding:8px 10px;">
      <div style="font-size:8px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">${escHtml(label)}</div>
      <div style="font-size:15px;font-weight:700;color:${valueColor};margin-top:2px;">${escHtml(value)}</div>
    </div>
  `;
}

// ── Body builders (one per lens) ──────────────────────────────────────────────
function buildProntuario(data: PainelData): string {
  const t = i18n.t.bind(i18n);
  const totalVac = data.vaccines.length;
  const okCount = totalVac - data.overdueCount;
  const overdueColor = data.overdueCount > 0 ? colors.danger : colors.success;
  const overdueList = data.vaccines
    .filter((v) => v.next_due_date && v.next_due_date < new Date().toISOString().slice(0, 10))
    .slice(0, 5);

  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.prontuarioTitle'), colors.click)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${statCard(t('painelPdf.prontuarioTotalVac'), String(totalVac), colors.petrol)}
        ${statCard(t('painelPdf.prontuarioOk'), String(okCount), colors.success)}
        ${statCard(t('painelPdf.prontuarioOverdue'), String(data.overdueCount), overdueColor)}
        ${statCard(t('painelPdf.prontuarioUpcoming'), String(data.upcomingCount), colors.warning)}
      </div>
      ${overdueList.length > 0 ? `
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-top:6px;margin-bottom:4px;">${escHtml(t('painelPdf.prontuarioOverdueList'))}</div>
        ${overdueList.map((v) => `<div style="font-size:10px;color:#555;padding:3px 0;border-bottom:1px solid #eee;"><strong>${escHtml(v.vaccine_name)}</strong> — ${escHtml(formatDate(v.next_due_date, i18n.language))}</div>`).join('')}
      ` : ''}
    </section>
  `;
}

function buildNutricao(data: PainelData): string {
  const t = i18n.t.bind(i18n);
  const n = data.nutrition;

  if (!n || !n.currentFood) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.nutritionTitle'), colors.success)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.nutritionNone'))}</p>
      </section>
    `;
  }

  const cf = n.currentFood;
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.nutritionTitle'), colors.success)}
      <div style="border:1px solid #e5e7eb;border-left:3px solid ${colors.success};border-radius:6px;padding:8px 10px;margin-bottom:6px;">
        <div style="font-size:11px;font-weight:700;color:#222;">${escHtml(cf.product_name ?? '—')}</div>
        ${cf.brand ? `<div style="font-size:10px;color:#666;margin-top:2px;">${escHtml(cf.brand)}</div>` : ''}
        <div style="font-size:10px;color:#555;margin-top:4px;display:flex;gap:12px;flex-wrap:wrap;">
          ${cf.portion_grams ? `<span><strong>${escHtml(t('painelPdf.nutritionPortion'))}:</strong> ${cf.portion_grams}g</span>` : ''}
          ${cf.daily_portions ? `<span><strong>${escHtml(t('painelPdf.nutritionDaily'))}:</strong> ${cf.daily_portions}×</span>` : ''}
          ${cf.calories_kcal ? `<span><strong>${escHtml(t('painelPdf.nutritionKcal'))}:</strong> ${cf.calories_kcal} kcal</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${statCard(t('painelPdf.nutritionSupplements'), String(n.activeSupplements.length), colors.petrol)}
        ${statCard(t('painelPdf.nutritionTreats'), String(n.recentTreats.length), colors.warning)}
        ${statCard(t('painelPdf.nutritionIntolerances'), String(n.intolerances.length), n.intolerances.length > 0 ? colors.danger : colors.textDim)}
      </div>
    </section>
  `;
}

function buildGastos(data: PainelData, lang: string): string {
  const t = i18n.t.bind(i18n);
  if (data.monthTotal === 0) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.expensesTitle'), colors.warning)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.expensesNone'))}</p>
      </section>
    `;
  }
  const topCats = data.monthCategories.slice(0, 4);
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.expensesTitle'), colors.warning)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${statCard(t('painelPdf.expensesMonthTotal'), formatMoney(data.monthTotal, lang), colors.warning)}
        ${statCard(t('painelPdf.expensesMonthCount'), String(data.expenses.filter((e) => (e.date ?? '') >= new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)).length), colors.petrol)}
      </div>
      ${topCats.length > 0 ? `
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escHtml(t('painelPdf.expensesTopCategories'))}</div>
        ${topCats.map((c) => `
          <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eee;font-size:10px;">
            <span style="color:#555;">${escHtml(c.category)}</span>
            <span style="color:#333;font-weight:700;">${escHtml(formatMoney(c.total, lang))}</span>
          </div>
        `).join('')}
      ` : ''}
    </section>
  `;
}

function buildAmigos(data: PainelData): string {
  const t = i18n.t.bind(i18n);
  if (data.friends.length === 0) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.friendsTitle'), colors.click)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.friendsNone'))}</p>
      </section>
    `;
  }
  const bestFriends = data.friends.filter((f) => f.connection_type === 'best_friend');
  const top5 = data.friends.slice(0, 5);
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.friendsTitle'), colors.click)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${statCard(t('painelPdf.friendsTotal'), String(data.friends.length), colors.click)}
        ${statCard(t('painelPdf.friendsBest'), String(bestFriends.length), colors.rose)}
      </div>
      ${top5.map((f) => `
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eee;font-size:10px;">
          <span style="color:#333;"><strong>${escHtml(f.friend_name)}</strong>${f.friend_breed ? ` · ${escHtml(f.friend_breed)}` : ''}</span>
          <span style="color:#888;">${f.meet_count}×</span>
        </div>
      `).join('')}
    </section>
  `;
}

function buildConquistas(data: PainelData): string {
  const t = i18n.t.bind(i18n);
  const a = data.achievements;
  if (!a || a.achievements.length === 0) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.achievementsTitle'), colors.warning)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.achievementsNone'))}</p>
      </section>
    `;
  }
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.achievementsTitle'), colors.warning)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${statCard(t('painelPdf.achievementsLevel'), String(a.level), colors.warning)}
        ${statCard(t('painelPdf.achievementsXP'), String(a.xpTotal), colors.petrol)}
        ${statCard(t('painelPdf.achievementsCount'), String(a.achievements.length), colors.click)}
      </div>
      ${a.recent.length > 0 ? `
        <div style="font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escHtml(t('painelPdf.achievementsRecent'))}</div>
        ${a.recent.map((ach) => `
          <div style="padding:3px 0;border-bottom:1px solid #eee;font-size:10px;">
            <strong style="color:#333;">${escHtml(ach.title)}</strong>
            <span style="color:#888;"> · +${ach.xp_reward} XP</span>
          </div>
        `).join('')}
      ` : ''}
    </section>
  `;
}

function buildFelicidade(data: PainelData, lang: string): string {
  const t = i18n.t.bind(i18n);
  const h = data.happiness;
  if (!h || h.totalEntries === 0) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.happinessTitle'), colors.success)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.happinessNone'))}</p>
      </section>
    `;
  }
  const trendKey = h.trend === 'up' ? 'painelPdf.trendUp'
                 : h.trend === 'down' ? 'painelPdf.trendDown'
                 : 'painelPdf.trendStable';
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.happinessTitle'), colors.success)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${statCard(t('painelPdf.happinessAvg'), `${h.avgScore}/100`, scoreColor(h.avgScore))}
        ${statCard(t('painelPdf.happinessDominant'), moodLabel(h.dominantMood, lang), colors.petrol)}
        ${statCard(t('painelPdf.happinessStreak'), `${h.streakDays}d`, colors.click)}
        ${statCard(t('painelPdf.happinessEntries'), String(h.totalEntries), colors.petrol)}
      </div>
      <div style="font-size:10px;color:#666;margin-top:6px;">
        <strong>${escHtml(t('painelPdf.happinessTrendLabel'))}:</strong> ${escHtml(t(trendKey))}
      </div>
    </section>
  `;
}

function buildViagens(data: PainelData): string {
  const t = i18n.t.bind(i18n);
  const tr = data.travel;
  if (!tr || tr.travels.length === 0) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.travelsTitle'), colors.sky)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.travelsNone'))}</p>
      </section>
    `;
  }
  const recent = tr.travels.slice(0, 3);
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.travelsTitle'), colors.sky)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${statCard(t('painelPdf.travelsTrips'), String(tr.totalTrips), colors.sky)}
        ${statCard(t('painelPdf.travelsKm'), tr.totalKm.toLocaleString(), colors.click)}
        ${statCard(t('painelPdf.travelsDays'), String(tr.totalDays), colors.success)}
      </div>
      ${recent.map((t2) => `
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eee;font-size:10px;">
          <span style="color:#333;"><strong>${escHtml(t2.destination)}</strong>${t2.country ? ` · ${escHtml(t2.country)}` : ''}</span>
          <span style="color:#888;">${escHtml(t2.status)}</span>
        </div>
      `).join('')}
    </section>
  `;
}

function buildPlanos(data: PainelData, lang: string): string {
  const t = i18n.t.bind(i18n);
  const p = data.plans;
  if (!p || p.plans.length === 0) {
    return `
      <section style="margin-bottom:14px;page-break-inside:avoid;">
        ${sectionHeader(t('painelPdf.plansTitle'), colors.rose)}
        <p style="font-size:10px;color:#888;margin:0;">${escHtml(t('painelPdf.plansNone'))}</p>
      </section>
    `;
  }
  return `
    <section style="margin-bottom:14px;page-break-inside:avoid;">
      ${sectionHeader(t('painelPdf.plansTitle'), colors.rose)}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        ${statCard(t('painelPdf.plansActive'), String(p.summary.active_count), colors.success)}
        ${statCard(t('painelPdf.plansMonthly'), formatMoney(p.summary.total_monthly_cost, lang), colors.click)}
        ${statCard(t('painelPdf.plansNextRenewal'), formatDate(p.summary.next_renewal_date, lang), colors.petrol)}
      </div>
      ${p.plans.slice(0, 4).map((pl) => `
        <div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #eee;font-size:10px;">
          <span style="color:#333;"><strong>${escHtml(pl.provider)}</strong>${pl.plan_name ? ` · ${escHtml(pl.plan_name)}` : ''}</span>
          <span style="color:#888;">${pl.monthly_cost != null ? escHtml(formatMoney(pl.monthly_cost, lang)) : '—'}</span>
        </div>
      `).join('')}
    </section>
  `;
}

// ── Body ──────────────────────────────────────────────────────────────────────
function buildBody(data: PainelData, lang: string): string {
  return [
    buildProntuario(data),
    buildNutricao(data),
    buildGastos(data, lang),
    buildAmigos(data),
    buildConquistas(data),
    buildFelicidade(data, lang),
    buildViagens(data),
    buildPlanos(data, lang),
  ].join('');
}

// ── Public API ────────────────────────────────────────────────────────────────
export interface PainelPdfOptions {
  petId: string;
  petName: string;
}

export async function previewPainelPdf({ petId, petName }: PainelPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchPainel(petId);
  const body = buildBody(data, i18n.language);
  await previewPdf({
    title: t('painelPdf.title', { name: petName }),
    subtitle: t('painelPdf.subtitle'),
    bodyHtml: body,
    language: i18n.language,
  });
}

export async function sharePainelPdf({ petId, petName }: PainelPdfOptions): Promise<void> {
  const t = i18n.t.bind(i18n);
  const data = await fetchPainel(petId);
  const body = buildBody(data, i18n.language);
  await sharePdf(
    {
      title: t('painelPdf.title', { name: petName }),
      subtitle: t('painelPdf.subtitle'),
      bodyHtml: body,
      language: i18n.language,
    },
    `painel_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`,
  );
}
