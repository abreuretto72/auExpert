/**
 * PhotoAnalysisCard — rendered for photo-analysis timeline items (non-DiaryCard variant).
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Camera } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { type CardProps, CardActions } from './shared';
import { styles } from './styles';

// ── PhotoAnalysisCard ──

export const PhotoAnalysisCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Camera size={rs(16)} color={colors.success} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.success }]}>{t('diary.photoAnalysis')}</Text>
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
  </View>
));
