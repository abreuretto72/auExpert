/**
 * ConnectionCard — rendered for pet-to-pet connection timeline events.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Heart } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { type CardProps, CardActions } from './shared';
import { styles } from './styles';

// ── ConnectionCard ──

export const ConnectionCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Heart size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.petrol }]}>{t('diary.connectionLabel')}</Text>
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Text style={styles.cardTitle}>{t('diary.newFriend')}: {event.friendName}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
    {event.matchPct != null && (
      <View style={[styles.severityBadge, { backgroundColor: colors.petrol + '20', alignSelf: 'flex-start', marginTop: rs(8) }]}>
        <Text style={[styles.severityText, { color: colors.petrol }]}>
          {t('diary.matchPercent', { pct: String(event.matchPct) })}
        </Text>
      </View>
    )}
  </View>
));
