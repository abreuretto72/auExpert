/**
 * MonthSummaryCard — rendered for the monthly summary timeline event.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { type CardProps } from './shared';
import { styles } from './styles';

// ── MonthSummaryCard ──

export const MonthSummaryCard = React.memo(({ event, t }: CardProps) => {
  const stats = event.monthStats;
  return (
    <View style={styles.cardBase}>
      <View style={styles.monthHeader}>
        <Calendar size={rs(16)} color={colors.click} strokeWidth={1.8} />
        <Text style={styles.monthTitle}>{event.monthLabel}</Text>
      </View>
      <Text style={styles.monthSummaryLabel}>{t('diary.monthSummary')}</Text>
      <Text style={styles.cardDetail}>{event.monthSummaryText}</Text>
      {stats && (
        <View style={styles.monthStatsRow}>
          {[
            { value: stats.walks, label: t('diary.walks') },
            { value: stats.photos, label: t('diary.photos') },
            { value: stats.vet, label: t('diary.vet') },
            { value: stats.mood, label: t('diary.moodLabel'), color: colors.success },
          ].map((s) => (
            <View key={s.label} style={styles.monthStat}>
              <Text style={[styles.monthStatValue, s.color ? { color: s.color } : undefined]}>{s.value}</Text>
              <Text style={styles.monthStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});
