/**
 * MilestoneCard — rendered for milestone/achievement timeline events.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { Trophy, Star } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import { type CardProps, CardActions } from './shared';
import { styles } from './styles';

// ── MilestoneCard ──

export const MilestoneCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={[styles.cardBase, styles.milestoneCard]}>
    <View style={styles.milestoneActions}>
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Trophy size={rs(28)} color={colors.gold} strokeWidth={1.8} />
    <Text style={styles.milestoneTitle}>{event.title}</Text>
    <Text style={styles.milestoneDetail}>{event.detail}</Text>
    {event.badgeName && (
      <View style={styles.badgeChip}>
        <Star size={rs(12)} color={colors.gold} strokeWidth={1.8} />
        <Text style={styles.badgeChipText}>{event.badgeName}</Text>
      </View>
    )}
  </View>
));
