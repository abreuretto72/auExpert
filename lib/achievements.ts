/**
 * achievements — Catalog, stats, and client-side award logic.
 *
 * After each diary save, call checkAndAwardAchievements() to detect and
 * unlock any newly earned badges. The DB UNIQUE constraint on (pet_id,
 * achievement_key) makes it safe to call repeatedly.
 */
import { supabase } from './supabase';

// ── XP Level table ────────────────────────────────────────────────────────────

const XP_THRESHOLDS = [0, 80, 200, 400, 700, 1000, 1500, 2000, 3000, 5000];

export function xpForLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level - 1, XP_THRESHOLDS.length - 1)] ?? 0;
}

export function xpForNextLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)] ?? 5000;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  titleKey: string;   // i18n key, falls back to title
  title: string;      // PT-BR fallback stored in DB
  descKey: string;
  desc: string;
  category: 'diary' | 'health' | 'social' | 'financial' | 'travel' | 'milestone' | 'special';
  xp: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;       // Lucide icon name
  evaluate: (stats: PetStats) => boolean;
}

export interface PetStats {
  diary_count: number;
  photo_count: number;
  voice_count: number;
  video_count: number;
  pdf_count: number;
  ocr_count: number;
  friends_count: number;
  max_friend_meets: number;
  expense_count: number;
  invoice_ocr_count: number;
  vaccine_count: number;
  exam_count: number;
  weight_count: number;
  travel_count: number;
  streak: number;
  diary_age_months: number;
  xp_total: number;
  level: number;
  plan_roi: number;   // total_reimbursed / (active_plans × months × monthly_cost)
  // Input type usage flags
  used_text: boolean;
  used_voice: boolean;
  used_photo: boolean;
  used_video: boolean;
  used_gallery: boolean;
  used_scanner: boolean;
  used_document: boolean;
  used_listen: boolean;
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  // ── DIÁRIO ──────────────────────────────────────────────────────────────────
  {
    key: 'first_entry', titleKey: 'achievements.catalog.first_entry.title', title: 'Primeiro Registro',
    descKey: 'achievements.catalog.first_entry.desc', desc: 'Criou a primeira entrada no diário',
    category: 'diary', xp: 10, rarity: 'common', icon: 'BookOpen',
    evaluate: (s) => s.diary_count >= 1,
  },
  {
    key: 'diary_10', titleKey: 'achievements.catalog.diary_10.title', title: 'Contador Iniciante',
    descKey: 'achievements.catalog.diary_10.desc', desc: '10 entradas no diário',
    category: 'diary', xp: 20, rarity: 'common', icon: 'BookOpen',
    evaluate: (s) => s.diary_count >= 10,
  },
  {
    key: 'diary_50', titleKey: 'achievements.catalog.diary_50.title', title: 'Cronista Dedicado',
    descKey: 'achievements.catalog.diary_50.desc', desc: '50 entradas no diário',
    category: 'diary', xp: 50, rarity: 'rare', icon: 'BookMarked',
    evaluate: (s) => s.diary_count >= 50,
  },
  {
    key: 'diary_100', titleKey: 'achievements.catalog.diary_100.title', title: 'Memória Viva',
    descKey: 'achievements.catalog.diary_100.desc', desc: '100 entradas no diário',
    category: 'diary', xp: 100, rarity: 'epic', icon: 'Library',
    evaluate: (s) => s.diary_count >= 100,
  },
  {
    key: 'diary_365', titleKey: 'achievements.catalog.diary_365.title', title: 'Um Ano de Histórias',
    descKey: 'achievements.catalog.diary_365.desc', desc: '365 entradas no diário',
    category: 'diary', xp: 300, rarity: 'legendary', icon: 'BookHeart',
    evaluate: (s) => s.diary_count >= 365,
  },
  {
    key: 'first_photo', titleKey: 'achievements.catalog.first_photo.title', title: 'Fotógrafo Estreante',
    descKey: 'achievements.catalog.first_photo.desc', desc: 'Primeira foto tirada pelo app',
    category: 'diary', xp: 15, rarity: 'common', icon: 'Camera',
    evaluate: (s) => s.photo_count >= 1,
  },
  {
    key: 'photo_10', titleKey: 'achievements.catalog.photo_10.title', title: 'Fotógrafo Iniciante',
    descKey: 'achievements.catalog.photo_10.desc', desc: '10 fotos classificadas pela IA',
    category: 'diary', xp: 30, rarity: 'common', icon: 'Camera',
    evaluate: (s) => s.photo_count >= 10,
  },
  {
    key: 'photo_50', titleKey: 'achievements.catalog.photo_50.title', title: 'Scanner Pro',
    descKey: 'achievements.catalog.photo_50.desc', desc: '50 fotos e documentos classificados',
    category: 'diary', xp: 75, rarity: 'rare', icon: 'ScanSearch',
    evaluate: (s) => s.photo_count + s.ocr_count >= 50,
  },
  {
    key: 'first_voice', titleKey: 'achievements.catalog.first_voice.title', title: 'Primeira Voz',
    descKey: 'achievements.catalog.first_voice.desc', desc: 'Primeiro registro por voz',
    category: 'diary', xp: 15, rarity: 'common', icon: 'Mic',
    evaluate: (s) => s.voice_count >= 1,
  },
  {
    key: 'first_video', titleKey: 'achievements.catalog.first_video.title', title: 'Diretor Estreante',
    descKey: 'achievements.catalog.first_video.desc', desc: 'Primeiro vídeo gravado',
    category: 'diary', xp: 20, rarity: 'common', icon: 'Video',
    evaluate: (s) => s.video_count >= 1,
  },
  {
    key: 'first_pdf', titleKey: 'achievements.catalog.first_pdf.title', title: 'Importador',
    descKey: 'achievements.catalog.first_pdf.desc', desc: 'Primeiro prontuário importado em PDF',
    category: 'diary', xp: 25, rarity: 'common', icon: 'FileUp',
    evaluate: (s) => s.pdf_count >= 1,
  },
  {
    key: 'all_input_types', titleKey: 'achievements.catalog.all_input_types.title', title: 'Explorador Completo',
    descKey: 'achievements.catalog.all_input_types.desc', desc: 'Usou todos os 8 tipos de entrada',
    category: 'diary', xp: 100, rarity: 'epic', icon: 'Layers',
    evaluate: (s) =>
      s.used_text && s.used_voice && s.used_photo && s.used_video &&
      s.used_gallery && s.used_scanner && s.used_document && s.used_listen,
  },
  {
    key: 'streak_7', titleKey: 'achievements.catalog.streak_7.title', title: '7 Dias Seguidos',
    descKey: 'achievements.catalog.streak_7.desc', desc: '7 dias consecutivos com registro',
    category: 'diary', xp: 50, rarity: 'rare', icon: 'Flame',
    evaluate: (s) => s.streak >= 7,
  },
  {
    key: 'streak_30', titleKey: 'achievements.catalog.streak_30.title', title: 'Hábito Formado',
    descKey: 'achievements.catalog.streak_30.desc', desc: '30 dias consecutivos com registro',
    category: 'diary', xp: 200, rarity: 'epic', icon: 'FlameKindling',
    evaluate: (s) => s.streak >= 30,
  },

  // ── SAÚDE ────────────────────────────────────────────────────────────────────
  {
    key: 'first_vaccine_scan', titleKey: 'achievements.catalog.first_vaccine_scan.title', title: 'Prontuário Inteligente',
    descKey: 'achievements.catalog.first_vaccine_scan.desc', desc: 'Registrou vacina via foto da carteirinha',
    category: 'health', xp: 30, rarity: 'common', icon: 'ScanLine',
    evaluate: (s) => s.ocr_count >= 1 && s.vaccine_count >= 1,
  },
  {
    key: 'first_exam_import', titleKey: 'achievements.catalog.first_exam_import.title', title: 'Laudos Digitais',
    descKey: 'achievements.catalog.first_exam_import.desc', desc: 'Importou primeiro resultado de exame',
    category: 'health', xp: 30, rarity: 'common', icon: 'ClipboardList',
    evaluate: (s) => s.exam_count >= 1,
  },
  {
    key: 'first_weight', titleKey: 'achievements.catalog.first_weight.title', title: 'Peso Registrado',
    descKey: 'achievements.catalog.first_weight.desc', desc: 'Primeiro registro de peso',
    category: 'health', xp: 10, rarity: 'common', icon: 'Scale',
    evaluate: (s) => s.weight_count >= 1,
  },
  {
    key: 'weight_12_months', titleKey: 'achievements.catalog.weight_12_months.title', title: 'Evolução Completa',
    descKey: 'achievements.catalog.weight_12_months.desc', desc: '12 meses de peso registrado',
    category: 'health', xp: 100, rarity: 'epic', icon: 'TrendingUp',
    evaluate: (s) => s.weight_count >= 12,
  },

  // ── SOCIAL ───────────────────────────────────────────────────────────────────
  {
    key: 'first_friend', titleKey: 'achievements.catalog.first_friend.title', title: 'Primeiro Amigo',
    descKey: 'achievements.catalog.first_friend.desc', desc: 'Primeiro amigo registrado no diário',
    category: 'social', xp: 15, rarity: 'common', icon: 'PawPrint',
    evaluate: (s) => s.friends_count >= 1,
  },
  {
    key: 'friends_5', titleKey: 'achievements.catalog.friends_5.title', title: 'Pet Popular',
    descKey: 'achievements.catalog.friends_5.desc', desc: '5 amigos diferentes registrados',
    category: 'social', xp: 50, rarity: 'rare', icon: 'Users',
    evaluate: (s) => s.friends_count >= 5,
  },
  {
    key: 'best_friend', titleKey: 'achievements.catalog.best_friend.title', title: 'Melhor Amigo',
    descKey: 'achievements.catalog.best_friend.desc', desc: 'Mesmo pet encontrado 8+ vezes',
    category: 'social', xp: 75, rarity: 'rare', icon: 'Heart',
    evaluate: (s) => s.max_friend_meets >= 8,
  },
  {
    key: 'social_butterfly', titleKey: 'achievements.catalog.social_butterfly.title', title: 'Muito Sociável',
    descKey: 'achievements.catalog.social_butterfly.desc', desc: '10 amigos diferentes registrados',
    category: 'social', xp: 100, rarity: 'epic', icon: 'Network',
    evaluate: (s) => s.friends_count >= 10,
  },

  // ── FINANCEIRO ────────────────────────────────────────────────────────────────
  {
    key: 'first_expense', titleKey: 'achievements.catalog.first_expense.title', title: 'Primeiro Gasto',
    descKey: 'achievements.catalog.first_expense.desc', desc: 'Primeiro gasto registrado',
    category: 'financial', xp: 10, rarity: 'common', icon: 'Receipt',
    evaluate: (s) => s.expense_count >= 1,
  },
  {
    key: 'expense_10', titleKey: 'achievements.catalog.expense_10.title', title: 'Contador de Gastos',
    descKey: 'achievements.catalog.expense_10.desc', desc: '10 gastos registrados',
    category: 'financial', xp: 30, rarity: 'common', icon: 'ReceiptText',
    evaluate: (s) => s.expense_count >= 10,
  },
  {
    key: 'first_invoice_scan', titleKey: 'achievements.catalog.first_invoice_scan.title', title: 'Nota Fiscal Scanner',
    descKey: 'achievements.catalog.first_invoice_scan.desc', desc: 'Primeiro gasto via scanner de nota fiscal',
    category: 'financial', xp: 25, rarity: 'common', icon: 'ScanLine',
    evaluate: (s) => s.invoice_ocr_count >= 1,
  },
  {
    key: 'plan_roi_positive', titleKey: 'achievements.catalog.plan_roi_positive.title', title: 'Investimento Inteligente',
    descKey: 'achievements.catalog.plan_roi_positive.desc', desc: 'Plano pet se pagou (reembolso > mensalidades)',
    category: 'financial', xp: 75, rarity: 'rare', icon: 'TrendingUp',
    evaluate: (s) => s.plan_roi > 1.0,
  },

  // ── VIAGENS ──────────────────────────────────────────────────────────────────
  {
    key: 'first_travel', titleKey: 'achievements.catalog.first_travel.title', title: 'Primeira Aventura',
    descKey: 'achievements.catalog.first_travel.desc', desc: 'Primeira viagem registrada com o pet',
    category: 'travel', xp: 25, rarity: 'common', icon: 'Plane',
    evaluate: (s) => s.travel_count >= 1,
  },
  {
    key: 'travel_5', titleKey: 'achievements.catalog.travel_5.title', title: 'Pet Viajante',
    descKey: 'achievements.catalog.travel_5.desc', desc: '5 viagens diferentes registradas',
    category: 'travel', xp: 75, rarity: 'rare', icon: 'Map',
    evaluate: (s) => s.travel_count >= 5,
  },
  {
    key: 'travel_10', titleKey: 'achievements.catalog.travel_10.title', title: 'Explorador Aventureiro',
    descKey: 'achievements.catalog.travel_10.desc', desc: '10 viagens registradas',
    category: 'travel', xp: 150, rarity: 'epic', icon: 'Globe',
    evaluate: (s) => s.travel_count >= 10,
  },

  // ── MARCOS ───────────────────────────────────────────────────────────────────
  {
    key: 'pet_birthday_1', titleKey: 'achievements.catalog.pet_birthday_1.title', title: '1 Ano Juntos',
    descKey: 'achievements.catalog.pet_birthday_1.desc', desc: '1 ano de diário ativo',
    category: 'milestone', xp: 100, rarity: 'epic', icon: 'PartyPopper',
    evaluate: (s) => s.diary_age_months >= 12,
  },
  {
    key: 'anxiety_improvement', titleKey: 'achievements.catalog.anxiety_improvement.title', title: 'Mais Tranquilo',
    descKey: 'achievements.catalog.anxiety_improvement.desc', desc: 'Humor positivo por 14 dias seguidos',
    category: 'milestone', xp: 75, rarity: 'rare', icon: 'Smile',
    evaluate: (s) => s.streak >= 14,
  },

  // ── ESPECIAIS ─────────────────────────────────────────────────────────────────
  {
    key: 'early_adopter', titleKey: 'achievements.catalog.early_adopter.title', title: 'Pioneiro',
    descKey: 'achievements.catalog.early_adopter.desc', desc: 'Um dos primeiros tutores do auExpert',
    category: 'special', xp: 200, rarity: 'legendary', icon: 'Rocket',
    evaluate: (s) => s.diary_count >= 1, // awarded once to early users
  },
];

// ── Pet stats fetcher ─────────────────────────────────────────────────────────

export async function getPetStats(petId: string): Promise<PetStats> {
  const [
    diaryRes,
    friendsRes,
    expenseRes,
    examRes,
    weightRes,
    petRes,
    planSummaryRes,
  ] = await Promise.all([
    supabase
      .from('diary_entries')
      .select('input_type, input_method, created_at', { count: 'exact' })
      .eq('pet_id', petId)
      .eq('is_active', true),
    supabase
      .from('pet_connections')
      .select('meet_count')
      .eq('pet_id', petId)
      .eq('is_active', true),
    supabase
      .from('expenses')
      .select('id', { count: 'exact' })
      .eq('pet_id', petId)
      .eq('is_active', true),
    supabase
      .from('exams')
      .select('id', { count: 'exact' })
      .eq('pet_id', petId)
      .eq('is_active', true),
    supabase
      .from('clinical_metrics')
      .select('id', { count: 'exact' })
      .eq('pet_id', petId)
      .eq('metric_type', 'weight')
      .eq('is_active', true),
    supabase
      .from('pets')
      .select('xp_total, level, created_at')
      .eq('id', petId)
      .single(),
    supabase
      .from('pet_plans_summary')
      .select('total_monthly_cost, total_reimbursed')
      .eq('pet_id', petId)
      .maybeSingle(),
  ]);

  const diaryEntries = diaryRes.data ?? [];
  const diaryCount = diaryRes.count ?? diaryEntries.length;

  // Input type counts
  const inputTypes = new Set(diaryEntries.map((e) => e.input_type as string));
  const inputMethods = new Set(diaryEntries.map((e) => e.input_method as string));
  const photoCount = diaryEntries.filter((e) =>
    e.input_type === 'photo' || e.input_type === 'gallery' || e.input_method === 'photo'
  ).length;
  const voiceCount = diaryEntries.filter((e) =>
    e.input_type === 'voice' || e.input_method === 'voice'
  ).length;
  const videoCount = diaryEntries.filter((e) => e.input_type === 'video').length;
  const pdfCount = diaryEntries.filter((e) => e.input_type === 'pdf_upload').length;
  const ocrCount = diaryEntries.filter((e) => e.input_type === 'ocr_scan').length;
  const listenCount = diaryEntries.filter((e) => e.input_type === 'pet_audio').length;

  // Streak — consecutive days with at least one diary entry
  const streak = computeStreak(diaryEntries.map((e) => e.created_at as string));

  // Diary age in months (first entry to now)
  const firstEntryDate = diaryEntries.length > 0
    ? new Date(diaryEntries.sort((a, b) =>
        new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()
      )[0].created_at as string)
    : null;
  const diaryAgeMonths = firstEntryDate
    ? Math.floor((Date.now() - firstEntryDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  // Friends
  const connections = friendsRes.data ?? [];
  const friendsCount = connections.length;
  const maxFriendMeets = connections.reduce((max, c) => Math.max(max, Number(c.meet_count) || 0), 0);

  // Plan ROI
  const planData = planSummaryRes.data;
  const totalMonthly = Number(planData?.total_monthly_cost) || 0;
  const totalReimbursed = Number(planData?.total_reimbursed) || 0;
  const planRoi = totalMonthly > 0 ? totalReimbursed / (totalMonthly * 12) : 0;

  const pet = petRes.data;

  return {
    diary_count: diaryCount,
    photo_count: photoCount,
    voice_count: voiceCount,
    video_count: videoCount,
    pdf_count: pdfCount,
    ocr_count: ocrCount,
    friends_count: friendsCount,
    max_friend_meets: maxFriendMeets,
    expense_count: expenseRes.count ?? 0,
    invoice_ocr_count: ocrCount,
    vaccine_count: 0, // simplified — vaccines table
    exam_count: examRes.count ?? 0,
    weight_count: weightRes.count ?? 0,
    travel_count: 0, // Sprint 4.4
    streak,
    diary_age_months: diaryAgeMonths,
    xp_total: pet?.xp_total ?? 0,
    level: pet?.level ?? 1,
    plan_roi: planRoi,
    used_text: inputTypes.has('text') || inputMethods.has('text'),
    used_voice: inputTypes.has('voice') || inputMethods.has('voice'),
    used_photo: inputTypes.has('photo') || inputMethods.has('photo'),
    used_video: inputTypes.has('video'),
    used_gallery: inputTypes.has('gallery') || inputMethods.has('gallery'),
    used_scanner: inputTypes.has('ocr_scan'),
    used_document: inputTypes.has('pdf_upload'),
    used_listen: inputTypes.has('pet_audio'),
  };
}

function computeStreak(isoTimestamps: string[]): number {
  if (isoTimestamps.length === 0) return 0;
  const days = [...new Set(
    isoTimestamps.map((ts) => new Date(ts).toISOString().slice(0, 10))
  )].sort().reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  for (const day of days) {
    const d = new Date(day);
    const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0 || diff === 1) {
      streak++;
      cursor = d;
    } else {
      break;
    }
  }
  return streak;
}

// ── Award logic ───────────────────────────────────────────────────────────────

export interface AwardedAchievement {
  key: string;
  title: string;
  xp: number;
  rarity: string;
}

/**
 * Check all catalog items against current pet stats and insert
 * newly earned achievements. Safe to call multiple times — DB UNIQUE
 * constraint prevents duplicates silently.
 *
 * Returns the list of newly awarded achievements (for notification display).
 */
export async function checkAndAwardAchievements(
  petId: string,
  userId: string,
  diaryEntryId: string,
): Promise<AwardedAchievement[]> {
  const [stats, alreadyUnlocked] = await Promise.all([
    getPetStats(petId),
    supabase
      .from('achievements')
      .select('achievement_key')
      .eq('pet_id', petId)
      .then((r) => new Set((r.data ?? []).map((a) => a.achievement_key as string))),
  ]);

  const toUnlock = ACHIEVEMENT_CATALOG.filter(
    (a) => !alreadyUnlocked.has(a.key) && a.evaluate(stats)
  );

  if (toUnlock.length === 0) return [];

  const rows = toUnlock.map((a) => ({
    pet_id: petId,
    user_id: userId,
    diary_entry_id: diaryEntryId,
    achievement_key: a.key,
    title: a.title,
    description: a.desc,
    category: a.category,
    xp_reward: a.xp,
    rarity: a.rarity,
    icon_name: a.icon,
  }));

  // upsert with ignoreDuplicates to handle race conditions gracefully
  await supabase.from('achievements').upsert(rows, { ignoreDuplicates: true });

  return toUnlock.map((a) => ({ key: a.key, title: a.title, xp: a.xp, rarity: a.rarity }));
}
