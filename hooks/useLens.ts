/**
 * useLens — Generic hook for lens data (clinical_metrics, expenses).
 *
 * A "lens" is a focused view of structured data extracted from diary entries
 * by AI classification. This hook provides a thin React Query wrapper per
 * lens type so lens components stay stateless.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────

export interface LensMetricRow {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  measured_at: string;
  diary_entry_id: string | null;
}

export interface LensExpenseRow {
  id: string;
  date: string;
  vendor: string | null;
  category: string;
  total: number;
  currency: string;
  items: Array<{ name: string; qty: number; unit_price: number }>;
  diary_entry_id: string | null;
}

// ── useLensExpenses — expenses per pet ────────────────────────────────────

export function useLensExpenses(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'expenses'],
    queryFn: async (): Promise<LensExpenseRow[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('id, date, vendor, category, total, currency, items, diary_entry_id')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        total: Number(r.total),
        items: (r.items as LensExpenseRow['items']) ?? [],
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── useLensNutrition — nutrition_records per pet ─────────────────────────

export interface NutritionRecord {
  id: string;
  record_type: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  portion_grams: number | null;
  daily_portions: number | null;
  calories_kcal: number | null;
  is_current: boolean;
  notes: string | null;
  started_at: string | null;
  ended_at: string | null;
  source: string;
  created_at: string;
}

export interface NutritionData {
  currentFood: NutritionRecord | null;
  activeSupplements: NutritionRecord[];
  recentTreats: NutritionRecord[];
  intolerances: NutritionRecord[];
  foodHistory: NutritionRecord[];
}

async function fetchNutritionData(petId: string): Promise<NutritionData> {
  const { data, error } = await supabase
    .from('nutrition_records')
    .select('id, record_type, product_name, brand, category, portion_grams, daily_portions, calories_kcal, is_current, notes, started_at, ended_at, source, created_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as NutritionRecord[];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    currentFood: rows.find((r) => r.record_type === 'food' && r.is_current) ?? null,
    activeSupplements: rows.filter((r) => r.record_type === 'supplement'),
    recentTreats: rows.filter((r) => r.record_type === 'treat' && (r.created_at ?? '') >= thirtyDaysAgo),
    intolerances: rows.filter((r) => r.record_type === 'intolerance' || r.record_type === 'restriction'),
    foodHistory: rows.filter((r) => r.record_type === 'food').slice(0, 10),
  };
}

export function useLensNutrition(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'nutrition'],
    queryFn: () => fetchNutritionData(petId),
    staleTime: 30 * 60 * 1000, // 30 min — food rarely changes
  });
}

// ── useLensFriends — pet_connections per pet ─────────────────────────────

export interface PetConnection {
  id: string;
  friend_name: string;
  friend_species: string;
  friend_breed: string | null;
  friend_owner: string | null;
  connection_type: string;
  first_met_at: string | null;
  last_seen_at: string | null;
  meet_count: number;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
}

export function useLensFriends(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'friends'],
    queryFn: async (): Promise<PetConnection[]> => {
      const { data, error } = await supabase
        .from('pet_connections')
        .select('id, friend_name, friend_species, friend_breed, friend_owner, connection_type, first_met_at, last_seen_at, meet_count, photo_url, notes, created_at')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('last_seen_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, meet_count: Number(r.meet_count) }));
    },
    staleTime: 30 * 60 * 1000,
  });
}

// ── useLensPlans — pet_plans per pet ─────────────────────────────────────

export interface PetPlan {
  id: string;
  plan_type: 'health' | 'insurance' | 'funeral' | 'assistance' | 'emergency';
  provider: string;
  plan_name: string | null;
  plan_code: string | null;
  monthly_cost: number | null;
  annual_cost: number | null;
  coverage_limit: number | null;
  currency: string;
  coverage_items: string[];
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  source: string;
  created_at: string;
}

export interface PlansSummary {
  active_count: number;
  total_monthly_cost: number;
  total_reimbursed: number;
  next_renewal_date: string | null;
}

export interface PlansData {
  plans: PetPlan[];
  summary: PlansSummary;
}

async function fetchPlansData(petId: string): Promise<PlansData> {
  const [plansRes, summaryRes] = await Promise.all([
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

  if (plansRes.error) throw plansRes.error;
  if (summaryRes.error) throw summaryRes.error;

  const plans = (plansRes.data ?? []).map((r) => ({
    ...r,
    monthly_cost: r.monthly_cost != null ? Number(r.monthly_cost) : null,
    annual_cost: r.annual_cost != null ? Number(r.annual_cost) : null,
    coverage_limit: r.coverage_limit != null ? Number(r.coverage_limit) : null,
    coverage_items: (r.coverage_items as string[]) ?? [],
  })) as PetPlan[];

  const summary: PlansSummary = summaryRes.data
    ? {
        active_count: Number(summaryRes.data.active_count) || 0,
        total_monthly_cost: Number(summaryRes.data.total_monthly_cost) || 0,
        total_reimbursed: Number(summaryRes.data.total_reimbursed) || 0,
        next_renewal_date: summaryRes.data.next_renewal_date ?? null,
      }
    : { active_count: 0, total_monthly_cost: 0, total_reimbursed: 0, next_renewal_date: null };

  return { plans, summary };
}

export function useLensPlans(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'plans'],
    queryFn: () => fetchPlansData(petId),
    staleTime: 24 * 60 * 60 * 1000, // 24h — plans rarely change
  });
}

// ── useLensAchievements — achievements per pet ───────────────────────────────

export interface Achievement {
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

export interface AchievementsData {
  achievements: Achievement[];
  level: number;
  xpTotal: number;
  xpForNextLevel: number;
  xpProgress: number;         // 0-1 fraction for progress bar
  byCategory: Record<string, Achievement[]>;
  recent: Achievement[];       // last 5 unlocked
}

async function fetchAchievementsData(petId: string): Promise<AchievementsData> {
  const [achRes, petRes] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, achievement_key, title, description, category, xp_reward, rarity, icon_name, unlocked_at')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('unlocked_at', { ascending: false }),
    supabase
      .from('pets')
      .select('xp_total, level')
      .eq('id', petId)
      .single(),
  ]);

  if (achRes.error) throw achRes.error;

  const achievements = (achRes.data ?? []) as Achievement[];
  const level = petRes.data?.level ?? 1;
  const xpTotal = petRes.data?.xp_total ?? 0;

  // XP thresholds for current and next level
  const XP_THRESHOLDS = [0, 80, 200, 400, 700, 1000, 1500, 2000, 3000, 5000];
  const currentThreshold = XP_THRESHOLDS[Math.min(level - 1, 9)] ?? 0;
  const nextThreshold = XP_THRESHOLDS[Math.min(level, 9)] ?? 5000;
  const xpInLevel = xpTotal - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const xpProgress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;

  const byCategory = achievements.reduce<Record<string, Achievement[]>>((acc, a) => {
    acc[a.category] = acc[a.category] ?? [];
    acc[a.category].push(a);
    return acc;
  }, {});

  return {
    achievements,
    level,
    xpTotal,
    xpForNextLevel: nextThreshold,
    xpProgress,
    byCategory,
    recent: achievements.slice(0, 5),
  };
}

export function useLensAchievements(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'achievements'],
    queryFn: () => fetchAchievementsData(petId),
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

// ── useLensMoodTrend — mood_logs per pet (last 90 days) ──────────────────────

export interface MoodDay {
  date: string;        // YYYY-MM-DD
  avgScore: number;    // 0-100
  dominantMood: string;
  count: number;
}

export interface MoodTrendData {
  days: MoodDay[];                           // only days with data, newest-first
  avgScore: number;                          // overall average of all entries
  dominantMood: string;                      // most frequent mood_id
  totalEntries: number;
  streakDays: number;                        // consecutive days from today backwards
  moodDistribution: Record<string, number>;  // mood_id → count
  trend: 'up' | 'down' | 'stable';          // last 7 days vs prev 7 days avg
}

async function fetchMoodTrendData(petId: string): Promise<MoodTrendData> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('mood_logs')
    .select('id, mood_id, score, created_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as { id: string; mood_id: string; score: number; created_at: string }[];

  if (rows.length === 0) {
    return {
      days: [],
      avgScore: 0,
      dominantMood: 'calm',
      totalEntries: 0,
      streakDays: 0,
      moodDistribution: {},
      trend: 'stable',
    };
  }

  // Group by day
  const byDay = new Map<string, { scores: number[]; moods: string[] }>();
  const moodCounts: Record<string, number> = {};

  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { scores: [], moods: [] });
    byDay.get(day)!.scores.push(Number(row.score));
    byDay.get(day)!.moods.push(row.mood_id);
    moodCounts[row.mood_id] = (moodCounts[row.mood_id] ?? 0) + 1;
  }

  const days: MoodDay[] = Array.from(byDay.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))  // newest first
    .map(([date, { scores, moods }]) => {
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      const modeCount = new Map<string, number>();
      moods.forEach((m) => modeCount.set(m, (modeCount.get(m) ?? 0) + 1));
      const dominantMood = [...modeCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { date, avgScore, dominantMood, count: scores.length };
    });

  // Overall average
  const avgScore = Math.round(rows.reduce((a, b) => a + Number(b.score), 0) / rows.length);

  // Dominant mood overall
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Streak — consecutive calendar days from today backwards that have entries
  const daySet = new Set(days.map((d) => d.date));
  let streakDays = 0;
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streakDays++;
    } else {
      break;
    }
  }

  // Trend — last 7 days avg vs previous 7 days avg
  const last7 = days.slice(0, 7);
  const prev7 = days.slice(7, 14);
  const avg7 = last7.length ? last7.reduce((a, b) => a + b.avgScore, 0) / last7.length : 0;
  const avgPrev7 = prev7.length ? prev7.reduce((a, b) => a + b.avgScore, 0) / prev7.length : avg7;
  const diff = avg7 - avgPrev7;
  const trend: 'up' | 'down' | 'stable' = diff > 4 ? 'up' : diff < -4 ? 'down' : 'stable';

  return {
    days,
    avgScore,
    dominantMood,
    totalEntries: rows.length,
    streakDays,
    moodDistribution: moodCounts,
    trend,
  };
}

export function useLensMoodTrend(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'mood_trend'],
    queryFn: () => fetchMoodTrendData(petId),
    staleTime: 15 * 60 * 1000, // 15 min
  });
}

// ── useLensTravel — pet_travels per pet ──────────────────────────────────────

export interface PetTravel {
  id: string;
  destination: string;
  country: string;
  region: string | null;
  travel_type: 'road_trip' | 'flight' | 'local' | 'international' | 'camping' | 'other';
  status: 'planned' | 'active' | 'completed';
  start_date: string | null;
  end_date: string | null;
  distance_km: number | null;
  notes: string | null;
  photos: string[];
  tags: string[];
  diary_entry_id: string | null;
  created_at: string;
}

export interface TravelData {
  travels: PetTravel[];
  totalTrips: number;
  totalKm: number;
  totalDays: number;
}

async function fetchTravelData(petId: string): Promise<TravelData> {
  const { data, error } = await supabase
    .from('pet_travels')
    .select('id, destination, country, region, travel_type, status, start_date, end_date, distance_km, notes, photos, tags, diary_entry_id, created_at')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .order('start_date', { ascending: false });

  if (error) throw error;

  const travels = (data ?? []).map((r) => ({
    ...r,
    distance_km: r.distance_km != null ? Number(r.distance_km) : null,
    photos: (r.photos as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
  })) as PetTravel[];

  const completed = travels.filter((t) => t.status === 'completed');

  const totalKm = Math.round(
    completed.reduce((acc, t) => acc + (t.distance_km ?? 0), 0),
  );

  const totalDays = completed.reduce((acc, t) => {
    if (!t.start_date || !t.end_date) return acc;
    const diff = Math.round(
      (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1;
    return acc + Math.max(diff, 1);
  }, 0);

  return {
    travels,
    totalTrips: completed.length,
    totalKm,
    totalDays,
  };
}

export function useLensTravel(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'travels'],
    queryFn: () => fetchTravelData(petId),
    staleTime: 30 * 60 * 1000, // 30 min
  });
}

// ── useLensAgenda — calendar dots + day entries ──────────────────────────────

export type AgendaCategory =
  | 'saude' | 'medicacao' | 'cuidados' | 'financeiro'
  | 'momento' | 'lembrete' | 'agendado';

export interface AgendaItem {
  id: string;
  kind: 'diary' | 'event';
  primary_type?: string;
  event_type?: string;
  title: string;
  sub: string;
  time: string | null;    // HH:MM or null (all-day)
  all_day: boolean;
  status: string | null;
  is_recurring: boolean;
  category: AgendaCategory;
}

// Maps primary_type → category
const PRIMARY_TO_CAT: Record<string, AgendaCategory> = {
  moment: 'momento', vaccine: 'saude', exam: 'saude', medication: 'medicacao',
  consultation: 'saude', return_visit: 'saude', allergy: 'saude', weight: 'saude',
  surgery: 'saude', symptom: 'saude', food: 'momento', expense: 'financeiro',
  connection: 'momento', travel: 'momento', achievement: 'momento',
  mood: 'momento', insurance: 'financeiro', plan: 'financeiro', pet_audio: 'momento',
};

const EVENT_TO_CAT: Record<string, AgendaCategory> = {
  consultation: 'saude', exam: 'saude', surgery: 'saude', return_visit: 'saude',
  physiotherapy: 'saude', vaccine: 'saude', travel_vaccine: 'saude',
  medication_dose: 'medicacao', medication_series: 'medicacao',
  deworming: 'medicacao', antiparasitic: 'medicacao',
  grooming: 'cuidados', nail_trim: 'cuidados', dental_cleaning: 'cuidados', microchip: 'cuidados',
  plan_renewal: 'financeiro', insurance_renewal: 'financeiro', plan_payment: 'financeiro',
  training: 'momento', behaviorist: 'momento', socialization: 'momento',
  travel_checklist: 'momento', custom: 'lembrete',
};

export const DOT_PRIORITY: AgendaCategory[] = [
  'saude', 'medicacao', 'agendado', 'cuidados', 'financeiro', 'momento', 'lembrete',
];

export const CAT_COLORS: Record<AgendaCategory, string> = {
  saude:      '#1D9E75',
  medicacao:  '#3B6D11',
  cuidados:   '#BA7517',
  financeiro: '#534AB7',
  momento:    '#888780',
  lembrete:   '#D85A30',
  agendado:   '#185FA5',
};

// Returns: { 'YYYY-MM-DD': AgendaCategory[] } — max 4 dots per day
export async function fetchMonthDots(
  petId: string,
  year: number,
  month: number,         // 0-based
): Promise<Record<string, AgendaCategory[]>> {
  const start = new Date(year, month, 1).toISOString();
  const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const [diaryRes, eventsRes] = await Promise.all([
    supabase
      .from('diary_entries')
      .select('entry_date, primary_type')
      .eq('pet_id', petId)
      .gte('entry_date', start.slice(0, 10))
      .lte('entry_date', end.slice(0, 10))
      .eq('is_active', true),
    supabase
      .from('scheduled_events')
      .select('scheduled_for, event_type, status')
      .eq('pet_id', petId)
      .gte('scheduled_for', start)
      .lte('scheduled_for', end)
      .eq('is_active', true),
  ]);

  const map: Record<string, Set<AgendaCategory>> = {};

  (diaryRes.data ?? []).forEach((e: { entry_date: string; primary_type: string }) => {
    const key = e.entry_date.slice(0, 10);
    if (!map[key]) map[key] = new Set();
    const cat = PRIMARY_TO_CAT[e.primary_type] ?? 'momento';
    map[key].add(cat);
  });

  (eventsRes.data ?? []).forEach((e: { scheduled_for: string; event_type: string; status: string }) => {
    const key = e.scheduled_for.slice(0, 10);
    if (!map[key]) map[key] = new Set();
    const isUpcoming = e.status === 'scheduled' || e.status === 'confirmed';
    const cat: AgendaCategory = isUpcoming ? 'agendado' : (EVENT_TO_CAT[e.event_type] ?? 'momento');
    map[key].add(cat);
  });

  return Object.fromEntries(
    Object.entries(map).map(([k, v]) => [
      k,
      DOT_PRIORITY.filter((p) => v.has(p)).slice(0, 4),
    ]),
  );
}

export async function fetchDayItems(
  petId: string,
  dateStr: string,   // YYYY-MM-DD
): Promise<AgendaItem[]> {
  const dayStart = `${dateStr}T00:00:00.000Z`;
  const dayEnd   = `${dateStr}T23:59:59.999Z`;

  const [diaryRes, eventsRes] = await Promise.all([
    supabase
      .from('diary_entries')
      .select('id, primary_type, narration, mood_id, entry_date, created_at, extracted_data')
      .eq('pet_id', petId)
      .eq('entry_date', dateStr)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('scheduled_events')
      .select('id, event_type, title, description, professional, location, scheduled_for, all_day, status, is_recurring, recurrence_rule')
      .eq('pet_id', petId)
      .gte('scheduled_for', dayStart)
      .lte('scheduled_for', dayEnd)
      .eq('is_active', true)
      .order('scheduled_for', { ascending: true }),
  ]);

  const diaryItems: AgendaItem[] = (diaryRes.data ?? []).map((e: {
    id: string; primary_type: string; narration: string | null;
    mood_id: string | null; entry_date: string; created_at: string;
    extracted_data: Record<string, unknown> | null;
  }) => {
    const d = (e.extracted_data ?? {}) as Record<string, unknown>;
    const category = PRIMARY_TO_CAT[e.primary_type] ?? 'momento';
    const time = e.created_at.slice(11, 16);

    // Build smart subtitle
    let sub = '';
    switch (e.primary_type) {
      case 'consultation':
      case 'return_visit':
        sub = [d.vet_name, d.clinic].filter(Boolean).join(' · ');
        break;
      case 'vaccine':
        sub = [d.vaccine_name, d.laboratory].filter(Boolean).join(' · ');
        break;
      case 'exam':
        sub = [d.exam_name, d.lab_name].filter(Boolean).join(' · ');
        break;
      case 'medication':
        sub = (d.is_recurring ? `Recorrente diário` : d.medication_name ?? '') as string;
        break;
      case 'weight':
        sub = `${d.value ?? ''} ${d.unit ?? 'kg'}`.trim();
        break;
      case 'expense':
        sub = [d.merchant_type, d.merchant_name, d.total ? `R$ ${d.total}` : null].filter(Boolean).join(' · ');
        break;
      case 'travel':
        sub = [d.destination, d.travel_type].filter(Boolean).join(' · ');
        break;
      case 'connection':
        sub = d.friend_name ? `Com ${d.friend_name}` : '';
        break;
      default:
        sub = e.narration ? e.narration.slice(0, 60) : '';
    }

    return {
      id: e.id,
      kind: 'diary',
      primary_type: e.primary_type,
      title: buildDiaryTitle(e.primary_type, d),
      sub: sub || '—',
      time,
      all_day: false,
      status: null,
      is_recurring: false,
      category,
    };
  });

  const eventItems: AgendaItem[] = (eventsRes.data ?? []).map((e: {
    id: string; event_type: string; title: string;
    description: string | null; professional: string | null; location: string | null;
    scheduled_for: string; all_day: boolean; status: string;
    is_recurring: boolean; recurrence_rule: string | null;
  }) => {
    const isUpcoming = e.status === 'scheduled' || e.status === 'confirmed';
    const category: AgendaCategory = isUpcoming ? 'agendado' : (EVENT_TO_CAT[e.event_type] ?? 'momento');
    const sub = [e.professional, e.location, e.description].filter(Boolean).join(' · ');
    return {
      id: e.id,
      kind: 'event',
      event_type: e.event_type,
      title: e.title,
      sub: sub || '—',
      time: e.all_day ? null : e.scheduled_for.slice(11, 16),
      all_day: e.all_day,
      status: e.status,
      is_recurring: e.is_recurring,
      category,
    };
  });

  // Events first (upcoming), then diary entries newest-first
  return [...eventItems, ...diaryItems];
}

function buildDiaryTitle(primaryType: string, d: Record<string, unknown>): string {
  switch (primaryType) {
    case 'vaccine':      return `Vacinação · ${d.vaccine_name ?? ''}`.trimEnd().replace(/ ·$/, '');
    case 'exam':         return `Exame · ${d.exam_name ?? ''}`.trimEnd().replace(/ ·$/, '');
    case 'medication':   return `Medicação · ${d.medication_name ?? ''}`.trimEnd().replace(/ ·$/, '');
    case 'consultation': return d.clinic ? `Consulta · ${d.clinic}` : 'Consulta veterinária';
    case 'weight':       return `Peso registrado: ${d.value ?? '?'} ${d.unit ?? 'kg'}`;
    case 'expense':      return `${d.merchant_name ?? 'Gasto'} · ${d.total ? `R$ ${d.total}` : ''}`.trimEnd().replace(/ ·$/, '');
    case 'travel':       return d.destination ? `Viagem: ${d.destination}` : 'Viagem registrada';
    case 'connection':   return d.friend_name ? `Encontro com ${d.friend_name}` : 'Encontro registrado';
    case 'surgery':      return 'Cirurgia registrada';
    case 'allergy':      return 'Alergia registrada';
    default:             return 'Registro no diário';
  }
}

export function useLensAgenda(petId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'agenda', 'dots', year, month],
    queryFn: () => fetchMonthDots(petId, year, month),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLensAgendaDay(petId: string, dateStr: string | null) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'agenda', 'day', dateStr],
    queryFn: () => fetchDayItems(petId, dateStr!),
    enabled: !!dateStr,
    staleTime: 2 * 60 * 1000,
  });
}

// ── useLensMetrics — clinical_metrics per pet ─────────────────────────────

export function useLensMetrics(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'metrics'],
    queryFn: async (): Promise<LensMetricRow[]> => {
      const { data, error } = await supabase
        .from('clinical_metrics')
        .select('id, metric_type, value, unit, status, measured_at, diary_entry_id')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('measured_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        value: Number(r.value),
      }));
    },
    staleTime: 60 * 60 * 1000, // 1 hour — metrics don't change often
  });
}
