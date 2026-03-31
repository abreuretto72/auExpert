/**
 * LensGrid — Grid of "lenses" (module shortcuts) for the pet dashboard.
 * Based on prototype: pet_dashboard_v2_diary.jsx
 *
 * Each lens is a 4-column grid button with:
 * - Colored icon (36x36 container)
 * - Label (9px)
 * - Optional badge (top-right, colored)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  ShieldCheck, UtensilsCrossed, Receipt, Heart,
  Trophy, Plane, Smile,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import PawIcon from '../PawIcon';

// ── Lens configuration ──

interface LensConfig {
  id: string;
  icon: React.ElementType;
  iconProps?: Record<string, unknown>;
  labelKey: string;
  color: string;
  route?: string;
  badge?: string | null;
  badgeColor?: string;
  comingSoon?: boolean;
}

const LENSES: LensConfig[] = [
  { id: 'health', icon: ShieldCheck, labelKey: 'lenses.health', color: colors.success, route: 'health' },
  { id: 'nutrition', icon: UtensilsCrossed, labelKey: 'lenses.nutrition', color: colors.lime, route: 'nutrition' },
  { id: 'expenses', icon: Receipt, labelKey: 'lenses.expenses', color: colors.gold, route: 'expenses' },
  { id: 'friends', icon: PawIcon, labelKey: 'lenses.friends', color: colors.accent, route: 'friends' },
  { id: 'plans', icon: Heart, labelKey: 'lenses.plans', color: colors.rose, route: 'plans' },
  { id: 'achievements', icon: Trophy, labelKey: 'lenses.achievements', color: colors.gold, route: 'achievements' },
  { id: 'happiness', icon: Smile, labelKey: 'lenses.happiness', color: colors.success, route: 'happiness' },
  { id: 'travels', icon: Plane, labelKey: 'lenses.travels', color: colors.sky, route: 'travel' },
];

// ── Lens button ──

const LensButton = React.memo(({ lens, onPress, t }: {
  lens: LensConfig;
  onPress: () => void;
  t: (k: string) => string;
}) => {
  const IconComp = lens.icon;
  const isPaw = lens.icon === PawIcon;

  return (
    <TouchableOpacity style={styles.lensButton} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.lensIconWrap, { backgroundColor: lens.color + '10' }]}>
        {isPaw
          ? <PawIcon size={rs(16)} color={lens.color} />
          : <IconComp size={rs(16)} color={lens.color} strokeWidth={1.8} />}
      </View>
      <Text style={styles.lensLabel} numberOfLines={1}>{t(lens.labelKey)}</Text>

      {lens.badge && (
        <View style={[styles.lensBadge, { backgroundColor: (lens.badgeColor ?? lens.color) + '18', borderColor: (lens.badgeColor ?? lens.color) + '30' }]}>
          <Text style={[styles.lensBadgeText, { color: lens.badgeColor ?? lens.color }]}>{lens.badge}</Text>
        </View>
      )}

      {lens.comingSoon && (
        <View style={styles.comingSoonDot} />
      )}
    </TouchableOpacity>
  );
});

// ── LensGrid ──

interface LensGridProps {
  petId: string;
  petName: string;
  /** Override badges dynamically: { health: "2", expenses: "R$910" } */
  badges?: Record<string, string>;
}

export default function LensGrid({ petId, petName, badges }: LensGridProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handlePress = (lens: LensConfig) => {
    if (lens.comingSoon) return;
    if (lens.route) {
      router.push(`/pet/${petId}/${lens.route}` as never);
    }
  };

  const lensesWithBadges = LENSES.map((lens) => ({
    ...lens,
    badge: badges?.[lens.id] ?? lens.badge ?? null,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        {t('lenses.title', { name: petName.toUpperCase() })}
      </Text>
      <View style={styles.grid}>
        {lensesWithBadges.map((lens) => (
          <LensButton
            key={lens.id}
            lens={lens}
            onPress={() => handlePress(lens)}
            t={t}
          />
        ))}
      </View>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    marginHorizontal: rs(16),
    marginTop: rs(20),
    marginBottom: rs(8),
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(12),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  lensButton: {
    width: '30%',
    backgroundColor: colors.card,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
    alignItems: 'center',
    position: 'relative',
  },
  lensIconWrap: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(6),
  },
  lensLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(9),
    color: colors.textDim,
    textAlign: 'center',
  },
  lensBadge: {
    position: 'absolute',
    top: rs(4),
    right: rs(4),
    paddingHorizontal: rs(5),
    paddingVertical: rs(2),
    borderRadius: rs(6),
    borderWidth: 1,
  },
  lensBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(8),
  },
  comingSoonDot: {
    position: 'absolute',
    top: rs(6),
    right: rs(6),
    width: rs(4),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.textGhost,
  },
});
