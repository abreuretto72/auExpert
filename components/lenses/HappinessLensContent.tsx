/**
 * HappinessLensContent — Mood trend, emotional curve, and distribution.
 * Visualizes mood_logs for the last 90 days with a manual sparkline chart,
 * dominant mood, streak, and distribution by category.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TrendingUp, TrendingDown, Minus, Flame, Star,
  SmilePlus, Smile, Meh, BatteryLow, AlertCircle, Frown,
  Dumbbell, HeartPulse,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useLensMoodTrend, type MoodDay } from '../../hooks/useLens';

// ── Mood config ───────────────────────────────────────────────────────────────

const MOOD_CONFIG: Record<string, { icon: React.ElementType; color: string; labelKey: string }> = {
  ecstatic: { icon: SmilePlus,   color: colors.gold,    labelKey: 'happiness.moodEcstatic' },
  happy:    { icon: Smile,       color: colors.success,  labelKey: 'happiness.moodHappy' },
  calm:     { icon: Meh,         color: colors.petrol,   labelKey: 'happiness.moodCalm' },
  playful:  { icon: Dumbbell,    color: colors.accent,   labelKey: 'happiness.moodPlayful' },
  tired:    { icon: BatteryLow,  color: colors.warning,  labelKey: 'happiness.moodTired' },
  anxious:  { icon: AlertCircle, color: colors.warning,  labelKey: 'happiness.moodAnxious' },
  sad:      { icon: Frown,       color: colors.danger,   labelKey: 'happiness.moodSad' },
  sick:     { icon: HeartPulse,  color: colors.danger,   labelKey: 'happiness.moodSick' },
};

function scoreColor(score: number): string {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.accent;
  if (score >= 40) return colors.warning;
  return colors.danger;
}

// ── Score card (big average + trend) ─────────────────────────────────────────

function ScoreCard({
  avgScore,
  trend,
  dominantMood,
  streakDays,
}: {
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  dominantMood: string;
  streakDays: number;
}) {
  const { t } = useTranslation();
  const color = scoreColor(avgScore);
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? colors.success : trend === 'down' ? colors.danger : colors.textDim;
  const moodCfg = MOOD_CONFIG[dominantMood] ?? MOOD_CONFIG.calm;
  const MoodIcon = moodCfg.icon;

  return (
    <View style={styles.scoreCard}>
      {/* Big score */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreCircle, { borderColor: color + '40', backgroundColor: color + '10' }]}>
          <Text style={[styles.scoreNumber, { color }]}>{avgScore}</Text>
          <Text style={styles.scoreLabel}>/100</Text>
        </View>

        <View style={styles.scoreRight}>
          <Text style={styles.scoreTitle}>{t('happiness.avgScore')}</Text>

          {/* Trend */}
          <View style={[styles.trendBadge, { backgroundColor: trendColor + '15' }]}>
            <TrendIcon size={rs(12)} color={trendColor} strokeWidth={2} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {t(`happiness.trend_${trend}`)}
            </Text>
          </View>

          {/* Dominant mood */}
          <View style={[styles.moodBadge, { backgroundColor: moodCfg.color + '15', borderColor: moodCfg.color + '30' }]}>
            <MoodIcon size={rs(12)} color={moodCfg.color} strokeWidth={1.8} />
            <Text style={[styles.moodBadgeText, { color: moodCfg.color }]}>
              {t(moodCfg.labelKey)}
            </Text>
          </View>
        </View>
      </View>

      {/* Streak */}
      {streakDays > 0 && (
        <View style={styles.streakRow}>
          <Flame size={rs(13)} color={colors.accent} strokeWidth={2} />
          <Text style={styles.streakText}>
            {t('happiness.streak', { days: streakDays })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Mini sparkline chart (14 most recent days) ────────────────────────────────

function MoodChart({ days }: { days: MoodDay[] }) {
  const { t } = useTranslation();
  // Show last 14 days, reversed so oldest is on the left
  const chartDays = days.slice(0, 14).reverse();

  if (chartDays.length === 0) return null;

  const maxScore = 100;
  const BAR_MAX_HEIGHT = rs(48);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{t('happiness.chartTitle').toUpperCase()}</Text>
      <View style={styles.chartArea}>
        {chartDays.map((day) => {
          const barH = Math.max(rs(4), Math.round((day.avgScore / maxScore) * BAR_MAX_HEIGHT));
          const color = scoreColor(day.avgScore);
          const label = day.date.slice(5); // MM-DD
          return (
            <View key={day.date} style={styles.chartCol}>
              <View style={styles.chartBarWrap}>
                <View style={[styles.chartBar, { height: barH, backgroundColor: color }]} />
              </View>
              <Text style={styles.chartLabel}>{label}</Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.chartLegend}>
        {([
          { color: colors.success, key: 'happiness.legendGood' },
          { color: colors.accent,  key: 'happiness.legendOk' },
          { color: colors.warning, key: 'happiness.legendLow' },
          { color: colors.danger,  key: 'happiness.legendBad' },
        ] as const).map((item) => (
          <View key={item.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{t(item.key)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Mood distribution ─────────────────────────────────────────────────────────

function MoodDistribution({
  distribution,
  total,
}: {
  distribution: Record<string, number>;
  total: number;
}) {
  const { t } = useTranslation();
  const entries = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  if (entries.length === 0) return null;

  return (
    <View style={styles.distCard}>
      <Text style={styles.distTitle}>{t('happiness.distributionTitle').toUpperCase()}</Text>
      {entries.map(([moodId, count]) => {
        const cfg = MOOD_CONFIG[moodId] ?? MOOD_CONFIG.calm;
        const Icon = cfg.icon;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <View key={moodId} style={styles.distRow}>
            <Icon size={rs(14)} color={cfg.color} strokeWidth={1.8} />
            <Text style={styles.distMood}>{t(cfg.labelKey)}</Text>
            <View style={styles.distBarWrap}>
              <View style={[styles.distBarFill, { width: `${pct}%` as unknown as number, backgroundColor: cfg.color }]} />
            </View>
            <Text style={[styles.distPct, { color: cfg.color }]}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyCard}>
      <Star size={rs(28)} color={colors.gold} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>{t('happiness.emptyTitle')}</Text>
      <Text style={styles.emptyHint}>{t('happiness.emptyHint')}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface HappinessLensContentProps {
  petId: string;
}

export function HappinessLensContent({ petId }: HappinessLensContentProps) {
  const { data, isLoading } = useLensMoodTrend(petId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton width="100%" height={rs(110)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(100)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(120)} radius={radii.card} />
      </View>
    );
  }

  if (!data || data.totalEntries === 0) {
    return <EmptyState />;
  }

  return (
    <View>
      <ScoreCard
        avgScore={data.avgScore}
        trend={data.trend}
        dominantMood={data.dominantMood}
        streakDays={data.streakDays}
      />
      <MoodChart days={data.days} />
      <MoodDistribution distribution={data.moodDistribution} total={data.totalEntries} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: { gap: spacing.sm },

  // Score card
  scoreCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  scoreCircle: {
    width: rs(84),
    height: rs(84),
    borderRadius: rs(42),
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scoreNumber: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(28),
    lineHeight: fs(28) * 1.1,
  },
  scoreLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
  },
  scoreRight: {
    flex: 1,
    gap: rs(6),
  },
  scoreTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    alignSelf: 'flex-start',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(8),
  },
  trendText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    alignSelf: 'flex-start',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  moodBadgeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    marginTop: rs(10),
    paddingTop: rs(10),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  streakText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },

  // Chart card
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(12),
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rs(4),
    height: rs(64),
    marginBottom: rs(8),
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
  },
  chartBarWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  chartBar: {
    width: '80%',
    borderRadius: rs(3),
    minHeight: rs(4),
  },
  chartLabel: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(7),
    color: colors.textGhost,
    marginTop: rs(3),
  },
  chartLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    marginTop: rs(4),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  legendDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  legendText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
  },

  // Distribution card
  distCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  distTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(12),
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(8),
  },
  distMood: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textSec,
    width: rs(60),
  },
  distBarWrap: {
    flex: 1,
    height: rs(5),
    backgroundColor: colors.border,
    borderRadius: rs(3),
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: rs(3),
  },
  distPct: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    width: rs(30),
    textAlign: 'right',
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: fs(15) * 1.9,
  },
});
