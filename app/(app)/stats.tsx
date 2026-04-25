/**
 * stats.tsx — Tela "Minhas Estatísticas" do tutor.
 *
 * Consumida pela rota `/stats` (registrada no DrawerMenu via `route: '/stats'`).
 * Mostra um resumo mensal: uso de IA, pets, pessoas vinculadas, profissionais
 * convidados e atividade. Dados vêm da RPC `get_user_stats` via useUserStats.
 *
 * i18n: namespace `stats.*` em pt-BR + en-US. Drawer label em `menu.stats`.
 */

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  Video,
  Mic,
  ScanLine,
  UtensilsCrossed,
  FileText,
  Dog,
  Cat,
  Users,
  Stethoscope,
  Calendar,
  ChevronDown,
  ChevronLeft,
  BarChart3,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import {
  useUserStats,
  getCurrentYearMonth,
  getLastNMonths,
} from '../../hooks/useUserStats';
import { PROFESSIONAL_TYPE_I18N_KEY } from '../../types/userStats';
import i18n from '../../i18n';

// ── StatCard ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: number | string;
  hint?: string;
  /** Cor de destaque (default: jade do design system, ex: colors.ai). */
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, hint, color = colors.ai }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <Icon size={rs(18)} color={color} strokeWidth={1.6} />
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
    <Text style={[styles.cardValue, { color }]}>{value}</Text>
    {hint ? <Text style={styles.cardHint}>{hint}</Text> : null}
  </View>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ── Main screen ──────────────────────────────────────────────────────────────

export default function UserStatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [{ year, month }, setPeriod] = useState(getCurrentYearMonth);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const months = useMemo(() => getLastNMonths(12, i18n.language || 'pt-BR'), []);

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useUserStats({ year, month });

  const currentLabel = useMemo(() => {
    return months.find((m) => m.year === year && m.month === month)?.label
      ?? `${month}/${year}`;
  }, [months, year, month]);

  const lastLoginLabel = useMemo(() => {
    if (!data?.activity.last_login_at) return t('stats.activityNoLogin');
    const d = new Date(data.activity.last_login_at);
    return t('stats.activityLastLogin', { date: d.toLocaleDateString(i18n.language || 'pt-BR') });
  }, [data?.activity.last_login_at, t]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header — padrão das telas em (app)/ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <BarChart3 size={rs(16)} color={colors.click} strokeWidth={1.8} />
          <Text style={styles.headerTitle}>{t('stats.title')}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.ai}
          />
        }
      >
        {/* Seletor de mês */}
        <Pressable
          onPress={() => setShowMonthPicker((v) => !v)}
          style={styles.monthSelector}
        >
          <Calendar size={rs(16)} color={colors.click} strokeWidth={1.8} />
          <Text style={styles.monthSelectorText}>{currentLabel}</Text>
          <ChevronDown size={rs(16)} color={colors.click} strokeWidth={1.8} />
        </Pressable>

        {showMonthPicker && (
          <View style={styles.monthPicker}>
            {months.map((m) => {
              const selected = m.year === year && m.month === month;
              return (
                <Pressable
                  key={`${m.year}-${m.month}`}
                  onPress={() => {
                    setPeriod({ year: m.year, month: m.month });
                    setShowMonthPicker(false);
                  }}
                  style={[styles.monthOption, selected && styles.monthOptionSelected]}
                >
                  <Text
                    style={[
                      styles.monthOptionText,
                      selected && styles.monthOptionTextSelected,
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Estados: loading / error / data */}
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.ai} />
          </View>
        ) : isError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{t('stats.errorTitle')}</Text>
            <Text style={styles.errorHint}>{error?.message}</Text>
          </View>
        ) : data ? (
          <>
            {/* AI usage */}
            <SectionHeader title={t('stats.sectionAiUsage')} />
            <View style={styles.grid}>
              <StatCard icon={Camera}           label={t('stats.aiImages')}      value={data.ai_usage.images} />
              <StatCard icon={Video}            label={t('stats.aiVideos')}      value={data.ai_usage.videos} />
              <StatCard icon={Mic}              label={t('stats.aiAudios')}      value={data.ai_usage.audios} />
              <StatCard icon={ScanLine}         label={t('stats.aiScanners')}    value={data.ai_usage.scanners} />
              <StatCard icon={UtensilsCrossed}  label={t('stats.aiCardapios')}   value={data.ai_usage.cardapios} />
              <StatCard icon={FileText}         label={t('stats.aiProntuarios')} value={data.ai_usage.prontuarios} />
            </View>

            {/* Pets */}
            <SectionHeader title={t('stats.sectionPets')} />
            <View style={styles.grid}>
              <StatCard icon={Dog} label={t('stats.petsDogs')}  value={data.pets.dogs}  color={colors.click} />
              <StatCard icon={Cat} label={t('stats.petsCats')} value={data.pets.cats} color={colors.click} />
            </View>

            {/* Pessoas */}
            <SectionHeader title={t('stats.sectionPeople')} />
            <View style={styles.grid}>
              <StatCard icon={Users} label={t('stats.peopleCoParents')} value={data.people.co_parents} color={colors.click} />
              <StatCard icon={Users} label={t('stats.peopleCaregivers')} value={data.people.caregivers} color={colors.click} />
              <StatCard icon={Users} label={t('stats.peopleVisitors')}   value={data.people.visitors}    color={colors.click} />
              <StatCard icon={Users} label={t('stats.peopleTotal')}       value={data.people.total}       color={colors.ai} />
            </View>

            {/* Profissionais */}
            <SectionHeader title={t('stats.sectionProfessionals')} />
            {data.professionals.total === 0 && data.professionals.pending_invites === 0 ? (
              <Text style={styles.empty}>{t('stats.professionalsEmpty')}</Text>
            ) : (
              <View style={styles.grid}>
                {Object.entries(data.professionals.by_type ?? {}).map(([type, count]) => {
                  const i18nKey = PROFESSIONAL_TYPE_I18N_KEY[type];
                  const label = i18nKey ? t(i18nKey, { defaultValue: type }) : type;
                  return (
                    <StatCard
                      key={type}
                      icon={Stethoscope}
                      label={label}
                      value={count}
                      color={colors.click}
                    />
                  );
                })}
                {data.professionals.pending_invites > 0 && (
                  <StatCard
                    icon={Stethoscope}
                    label={t('stats.professionalsPending')}
                    value={data.professionals.pending_invites}
                    hint={t('stats.professionalsPendingHint')}
                    color={colors.textDim}
                  />
                )}
              </View>
            )}

            {/* Atividade */}
            <SectionHeader title={t('stats.sectionActivity')} />
            <View style={styles.grid}>
              <StatCard
                icon={Calendar}
                label={t('stats.activityDaysActive')}
                value={data.activity.logins_days_count}
                hint={lastLoginLabel}
              />
            </View>

            <View style={{ height: rs(32) }} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.sm),
    paddingBottom: rs(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.card,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
  },

  // Body
  scrollContent: {
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    paddingBottom: rs(spacing.xl),
  },

  // States
  centered: {
    paddingVertical: rs(48),
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
  },
  errorHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(8),
    textAlign: 'center',
  },

  // Month selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    alignSelf: 'flex-start',
    paddingHorizontal: rs(14),
    paddingVertical: rs(10),
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginBottom: rs(spacing.md),
  },
  monthSelectorText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.text,
  },
  monthPicker: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(4),
    marginBottom: rs(spacing.md),
  },
  monthOption: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    borderRadius: radii.md,
  },
  monthOptionSelected: {
    backgroundColor: colors.ai + '22',
  },
  monthOptionText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
  },
  monthOptionTextSelected: {
    fontFamily: 'Sora_600SemiBold',
    color: colors.ai,
  },

  // Section
  sectionHeader: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.click,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: rs(spacing.md),
    marginBottom: rs(spacing.sm),
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
  },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: rs(14),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(10),
  },
  cardLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(11),
    color: colors.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  cardValue: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(28),
    lineHeight: fs(32),
  },
  cardHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(6),
  },

  // Empty state
  empty: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textDim,
    fontStyle: 'italic',
    paddingVertical: rs(spacing.sm),
  },
});
