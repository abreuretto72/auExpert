/**
 * PetHeader — Compact fixed header shown on all 4 pet tabs.
 *
 * Layout:
 *   [Avatar 32px] [pet.name]           [Settings icon]
 *                 [breed · age · mood]
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
} from 'react-native';
import { Dog, Cat, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { spacing, radii } from '../../constants/spacing';
import { formatAge } from '../../utils/format';
import { moods } from '../../constants/moods';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed?: string | null;
  estimated_age_months?: number | null;
  current_mood?: string | null;
  avatar_url?: string | null;
}

interface PetHeaderProps {
  pet: Pet;
  onSettings: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PetHeader({ pet, onSettings }: PetHeaderProps) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';
  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;

  const moodData = pet.current_mood
    ? moods.find((m) => m.id === pet.current_mood)
    : null;

  const subParts: string[] = [];
  if (pet.breed) subParts.push(pet.breed);
  if (pet.estimated_age_months) subParts.push(formatAge(pet.estimated_age_months));
  if (moodData) subParts.push(isEnglish ? moodData.label_en : moodData.label);

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={[styles.avatar, { borderColor: petColor + '30' }]}>
        {pet.avatar_url ? (
          <Image source={{ uri: pet.avatar_url }} style={styles.avatarImg} />
        ) : isDog ? (
          <Dog size={rs(18)} color={petColor} strokeWidth={1.6} />
        ) : (
          <Cat size={rs(18)} color={petColor} strokeWidth={1.6} />
        )}
      </View>

      {/* Name + sub */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{pet.name}</Text>
        {subParts.length > 0 && (
          <Text style={styles.sub} numberOfLines={1}>
            {subParts.join(' · ')}
          </Text>
        )}
      </View>

      {/* Settings */}
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={onSettings}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Settings size={rs(18)} color={colors.accent} strokeWidth={1.8} />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.sm),
    paddingHorizontal: rs(spacing.md),
    paddingVertical: rs(10),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  info: {
    flex: 1,
    gap: rs(2),
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
  },
  sub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  settingsBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
