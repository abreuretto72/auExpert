/**
 * HealthCard — rendered for health-event timeline items.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { type CardProps, CardActions } from './shared';
import { styles } from './styles';

// ── HealthCard ──

export const HealthCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => {
  const severityColor = event.severity === 'high' ? colors.danger
    : event.severity === 'medium' ? colors.warning : colors.success;
  const severityLabel = event.severity === 'high' ? t('diary.severityHigh')
    : event.severity === 'medium' ? t('diary.severityMedium') : t('diary.severityLow');
  const sourceLabel = event.source === 'vet' ? t('diary.sourceVet')
    : event.source === 'ai_photo' ? t('diary.sourceAiPhoto')
      : event.source === 'ai_audio' ? t('diary.sourceAiAudio') : t('diary.sourceTutor');

  return (
    <View style={[styles.cardBase, { borderLeftWidth: 3, borderLeftColor: severityColor }]}>
      <View style={styles.cardIconRow}>
        <ShieldCheck size={rs(16)} color={colors.success} strokeWidth={1.8} />
        <Text style={styles.cardTypeLabel}>{t('diary.healthEvent')}</Text>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>{severityLabel}</Text>
        </View>
        <CardActions event={event} onDelete={onDelete} isOwner={isOwner} onAdminDeactivate={onAdminDeactivate} />
      </View>
      <Text style={styles.cardTitle}>{event.title}</Text>
      <Text style={styles.cardDetail}>{event.detail}</Text>
      <View style={styles.sourceBadge}>
        <Text style={styles.healthSourceText}>{sourceLabel}</Text>
      </View>
    </View>
  );
});
