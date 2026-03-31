/**
 * LentesTab — 2-column grid of 9 lens cards for the pet screen "Lentes" tab.
 *
 * Each card shows:
 *   - Colored icon (large, 40px container)
 *   - Lens name
 *   - Dynamic badge (count / value / status)
 *
 * The 9th card (Agenda) spans full width.
 * Badge data comes from lightweight queries so this tab doesn't re-fetch
 * what's already loaded by other hooks.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import {
  ShieldCheck, UtensilsCrossed, Receipt, Heart,
  Trophy, Smile, Plane, CalendarDays,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { spacing, radii } from '../../constants/spacing';
import PawIcon from '../PawIcon';
import { useLensExpenses, useLensNutrition, useLensFriends, useLensPlans, useLensAchievements, useLensMoodTrend, useLensTravel } from '../../hooks/useLens';
import { useVaccines } from '../../hooks/useHealth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// ── Upcoming-events count (next 7 days) ───────────────────────────────────────

function useAgendaBadge(petId: string) {
  return useQuery({
    queryKey: ['pets', petId, 'lens', 'agenda', 'badge'],
    queryFn: async (): Promise<number> => {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { count, error } = await supabase
        .from('scheduled_events')
        .select('id', { count: 'exact', head: true })
        .eq('pet_id', petId)
        .eq('is_active', true)
        .in('status', ['scheduled', 'confirmed'])
        .gte('scheduled_for', now.toISOString())
        .lte('scheduled_for', in7.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Badge formatting helpers ──────────────────────────────────────────────────

function formatCurrency(val: number) {
  return `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ── LensCard ──────────────────────────────────────────────────────────────────

interface LensCardProps {
  icon: React.ElementType;
  isPaw?: boolean;
  color: string;
  label: string;
  badge: string | null;
  badgeColor?: string;
  fullWidth?: boolean;
  onPress: () => void;
}

const LensCard = React.memo(({
  icon: IconComp, isPaw, color, label, badge, badgeColor, fullWidth, onPress,
}: LensCardProps) => (
  <TouchableOpacity
    style={[styles.card, fullWidth && styles.cardFull]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.iconWrap, { backgroundColor: color + '12' }]}>
      {isPaw
        ? <PawIcon size={rs(20)} color={color} />
        : <IconComp size={rs(20)} color={color} strokeWidth={1.8} />
      }
    </View>
    <Text style={styles.cardLabel} numberOfLines={1}>{label}</Text>
    {badge ? (
      <View style={[styles.badge, { backgroundColor: (badgeColor ?? color) + '18', borderColor: (badgeColor ?? color) + '35' }]}>
        <Text style={[styles.badgeText, { color: badgeColor ?? color }]} numberOfLines={1}>{badge}</Text>
      </View>
    ) : null}
  </TouchableOpacity>
));

// ── Main component ────────────────────────────────────────────────────────────

interface LentesTabProps {
  petId: string;
  petName: string;
  overdueVaccines: number;
}

export default function LentesTab({ petId, petName, overdueVaccines }: LentesTabProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  // Badge data — lightweight
  const { data: expenses } = useLensExpenses(petId);
  const { data: nutrition } = useLensNutrition(petId);
  const { data: friends } = useLensFriends(petId);
  const { data: plans } = useLensPlans(petId);
  const { data: achievements } = useLensAchievements(petId);
  const { data: happiness } = useLensMoodTrend(petId);
  const { data: travels } = useLensTravel(petId);
  const { data: agendaCount } = useAgendaBadge(petId);

  // ── Badge values ─────────────────────────────────────────────────────────

  // Health
  const healthBadge = overdueVaccines > 0
    ? `${overdueVaccines} ${t('lenses.badgeOverdue')}`
    : t('lenses.badgeOk');
  const healthBadgeColor = overdueVaccines > 0 ? colors.danger : colors.success;

  // Nutrition
  const nutritionBadge = nutrition?.currentFood?.product_name ?? t('lenses.badgeAdd');

  // Expenses — current month total
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthTotal = (expenses ?? [])
    .filter((e) => (e.date ?? '') >= monthStart)
    .reduce((s, e) => s + e.total, 0);
  const expensesBadge = monthTotal > 0
    ? `${formatCurrency(monthTotal)} · ${t('lenses.badgeThisMonth')}`
    : t('lenses.badgeNoData');

  // Friends
  const friendsBadge = friends != null
    ? `${friends.length} ${t('lenses.badgeFriends')}`
    : null;

  // Achievements
  const achBadge = achievements
    ? `${achievements.achievements.length} ${t('lenses.badgeBadges')} · ${t('lenses.badgeLevel')} ${achievements.level}`
    : null;

  // Happiness
  const happinessBadge = happiness
    ? `${happiness.avgScore}/100`
    : null;

  // Travels
  const travelBadge = travels
    ? `${travels.totalTrips} ${t('lenses.badgeTravels')}`
    : null;

  // Plans
  const plansBadge = plans
    ? plans.summary.active_count > 0
      ? `${plans.summary.active_count} ${t('lenses.badgeActive')} · ${formatCurrency(plans.summary.total_monthly_cost)}/${t('lenses.badgeMonth')}`
      : t('lenses.badgeNoData')
    : null;

  // Agenda
  const agendaBadge = agendaCount != null && agendaCount > 0
    ? `${agendaCount} ${t('lenses.badgeNext7Days')}`
    : null;

  const nav = (route: string) => router.push(`/pet/${petId}/${route}` as never);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('lenses.title', { name: petName.toUpperCase() })}</Text>

      <View style={styles.grid}>
        {/* Row 1: Prontuário · Nutrição */}
        <LensCard
          icon={ShieldCheck} color={colors.success}
          label={t('lenses.health')} badge={healthBadge} badgeColor={healthBadgeColor}
          onPress={() => nav('health')}
        />
        <LensCard
          icon={UtensilsCrossed} color={colors.lime}
          label={t('lenses.nutrition')} badge={nutritionBadge}
          onPress={() => nav('nutrition')}
        />

        {/* Row 2: Gastos · Amigos */}
        <LensCard
          icon={Receipt} color={colors.gold}
          label={t('lenses.expenses')} badge={expensesBadge}
          onPress={() => nav('expenses')}
        />
        <LensCard
          icon={PawIcon as unknown as React.ElementType} isPaw color={colors.accent}
          label={t('lenses.friends')} badge={friendsBadge}
          onPress={() => nav('friends')}
        />

        {/* Row 3: Conquistas · Felicidade */}
        <LensCard
          icon={Trophy} color={colors.gold}
          label={t('lenses.achievements')} badge={achBadge}
          onPress={() => nav('achievements')}
        />
        <LensCard
          icon={Smile} color={colors.success}
          label={t('lenses.happiness')} badge={happinessBadge}
          onPress={() => nav('happiness')}
        />

        {/* Row 4: Viagens · Planos */}
        <LensCard
          icon={Plane} color={colors.sky}
          label={t('lenses.travels')} badge={travelBadge}
          onPress={() => nav('travel')}
        />
        <LensCard
          icon={Heart} color={colors.rose}
          label={t('lenses.plans')} badge={plansBadge}
          onPress={() => nav('plans')}
        />

        {/* Row 5: Agenda — full width */}
        <LensCard
          icon={CalendarDays} color={colors.petrol}
          label={t('lenses.agenda')}
          badge={agendaBadge}
          badgeColor={agendaCount && agendaCount > 0 ? colors.petrol : undefined}
          fullWidth
          onPress={() => nav('agenda')}
        />
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const CARD_GAP = rs(spacing.sm);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    paddingBottom: rs(spacing.xl),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(spacing.md),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    // 2-column: subtract gap and divide
    width: `${(100 - 3) / 2}%` as unknown as number,
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(spacing.md),
    alignItems: 'center',
    gap: rs(6),
    minHeight: rs(100),
    justifyContent: 'center',
  },
  cardFull: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: rs(spacing.md),
    minHeight: rs(60),
    paddingHorizontal: rs(spacing.md),
  },
  iconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.text,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.sm),
    borderWidth: 1,
    maxWidth: '100%',
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    textAlign: 'center',
  },
});
