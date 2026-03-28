import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import {
  Dog,
  Cat,
  Clock,
  BookOpen,
  ScanEye,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { moods } from '../constants/moods';
import type { MoodId } from '../constants/moods';
import { formatAge, formatWeight, formatRelativeDate } from '../utils/format';

export interface PetCardData {
  id: string;
  name: string;
  species: 'dog' | 'cat';
  breed: string | null;
  weight_kg: number | null;
  health_score: number | null;
  happiness_score?: number | null;
  current_mood?: MoodId | null;
  user_id: string;
  estimated_age_months?: number | null;
  diary_count?: number;
  photo_count?: number;
  vaccine_status?: 'up_to_date' | 'overdue' | 'upcoming';
  last_activity?: string | null;
  avatar_url?: string | null;
}

interface PetCardProps {
  pet: PetCardData;
  onPress?: () => void;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onPress }) => {
  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  if (pet.avatar_url) console.log('[PetCard]', pet.name, 'avatar:', pet.avatar_url.substring(0, 60) + '...');
  const mood = pet.current_mood
    ? moods.find((m) => m.id === pet.current_mood)
    : null;
  const healthScore = pet.health_score ?? 0;
  const healthColor =
    healthScore >= 80
      ? colors.success
      : healthScore >= 50
        ? colors.warning
        : colors.danger;
  const vaccineOverdue = pet.vaccine_status === 'overdue';
  const vaccineColor = vaccineOverdue ? colors.danger : colors.success;
  const diaryCount = pet.diary_count ?? 0;
  const photoCount = pet.photo_count ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { shadowColor: petColor }]}
    >
      {/* Top row: avatar + info + chevron */}
      <View style={styles.topRow}>
        <View style={[styles.avatarOuter, { borderColor: petColor + '40' }]}>
          {pet.avatar_url ? (
            <Image source={{ uri: pet.avatar_url }} style={styles.avatarImage} />
          ) : (
            <>
              <View style={[styles.avatarGlow, { backgroundColor: petColor + '10' }]} />
              {isDog ? (
                <Dog size={36} color={colors.accent} strokeWidth={1.8} />
              ) : (
                <Cat size={36} color={colors.purple} strokeWidth={1.8} />
              )}
            </>
          )}
        </View>

        <View style={styles.topInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {pet.name}
            </Text>
            {mood ? (
              <View
                style={[
                  styles.moodBadge,
                  { backgroundColor: mood.color + '1F' },
                ]}
              >
                <View
                  style={[styles.moodDot, { backgroundColor: mood.color }]}
                />
                <Text style={[styles.moodText, { color: mood.color }]}>
                  {mood.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.breed} numberOfLines={1}>
            {pet.breed ?? 'Sem raca definida'}
          </Text>

          <View style={styles.tagsRow}>
            {[
              pet.estimated_age_months
                ? formatAge(pet.estimated_age_months)
                : null,
              pet.weight_kg ? formatWeight(pet.weight_kg) : null,
              isDog ? 'Cao' : 'Gato',
            ]
              .filter(Boolean)
              .map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
          </View>
        </View>

        <ChevronRight size={20} color={colors.accent} strokeWidth={1.8} />
      </View>

      {/* Stats: saude, diario, fotos */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <ShieldCheck size={16} color={healthColor} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: healthColor }]}>
            {healthScore || '--'}
          </Text>
          <Text style={styles.statLabel}>Saude</Text>
        </View>
        <View style={styles.statBox}>
          <BookOpen size={16} color={colors.accent} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {diaryCount}
          </Text>
          <Text style={styles.statLabel}>Diario</Text>
        </View>
        <View style={styles.statBox}>
          <ScanEye size={16} color={colors.purple} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: colors.purple }]}>
            {photoCount}
          </Text>
          <Text style={styles.statLabel}>Fotos</Text>
        </View>
      </View>

      {/* Bottom: vacina status + last activity */}
      <View style={styles.bottomRow}>
        <View
          style={[styles.vaccineBar, { backgroundColor: vaccineColor + '1F' }]}
        >
          {vaccineOverdue ? (
            <AlertTriangle
              size={13}
              color={colors.danger}
              strokeWidth={2}
            />
          ) : (
            <ShieldCheck
              size={13}
              color={colors.success}
              strokeWidth={2}
            />
          )}
          <Text style={[styles.vaccineText, { color: vaccineColor }]}>
            {vaccineOverdue ? 'Vacinas atrasadas' : 'Vacinas em dia'}
          </Text>
        </View>
        {pet.last_activity ? (
          <View style={styles.lastActivity}>
            <Clock size={12} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.lastActivityText}>
              {formatRelativeDate(pet.last_activity)}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOuter: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  topInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: colors.text,
    flexShrink: 1,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.md,
    gap: 5,
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moodText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 10,
  },
  breed: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: colors.textDim,
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: colors.textSec,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
  },
  statLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 0.3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  vaccineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  vaccineText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
  },
  lastActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastActivityText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: colors.textDim,
  },
});

export default memo(PetCard);
