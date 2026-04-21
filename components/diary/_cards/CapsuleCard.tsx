/**
 * CapsuleCard — rendered for time-capsule timeline events.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Gift, Lock } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { type CardProps, CardActions } from './shared';
import { styles } from './styles';

// ── CapsuleCard ──

export const CapsuleCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      {event.locked
        ? <Lock size={rs(16)} color={colors.purple} strokeWidth={1.8} />
        : <Gift size={rs(16)} color={colors.purple} strokeWidth={1.8} />}
      <Text style={[styles.cardTypeLabel, { color: colors.purple }]}>{t('diary.capsuleLabel')}</Text>
      {event.locked && (
        <View style={[styles.severityBadge, { backgroundColor: colors.purple + '20' }]}>
          <Lock size={rs(10)} color={colors.purple} strokeWidth={2} />
          <Text style={[styles.severityText, { color: colors.purple, marginLeft: rs(4) }]}>
            {t('diary.capsuleLocked')}
          </Text>
        </View>
      )}
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    {event.locked && event.condition && (
      <Text style={styles.capsuleCondition}>{t('diary.capsuleCondition')}: {event.condition}</Text>
    )}
    {!event.locked && event.capsuleMessage && (
      <Text style={styles.capsuleMessage}>{event.capsuleMessage}</Text>
    )}
    {!event.locked && (
      <View style={styles.capsuleDates}>
        {event.recordedDate && (
          <Text style={styles.capsuleDateText}>{t('diary.capsuleRecorded')} {event.recordedDate}</Text>
        )}
        {event.unlockedDate && (
          <Text style={styles.capsuleDateText}>{t('diary.capsuleUnlocked')} {event.unlockedDate}</Text>
        )}
      </View>
    )}
  </View>
));
