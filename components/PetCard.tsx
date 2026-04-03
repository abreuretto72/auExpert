import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { rs, fs } from '../hooks/useResponsive';
import { useTranslation } from 'react-i18next';
import {
  Dog,
  Cat,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Syringe,
  BookOpen,
  CalendarDays,
  Users,
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
  sex?: 'male' | 'female' | null;
  breed: string | null;
  weight_kg: number | null;
  health_score: number | null;
  current_mood?: MoodId | null;
  user_id: string;
  estimated_age_months?: number | null;
  vaccine_status?: 'up_to_date' | 'overdue' | 'upcoming';
  last_activity?: string | null;
  avatar_url?: string | null;
  last_diary_entry?: string | null;
  agenda_count?: number | null;
}

interface PetCardProps {
  pet: PetCardData;
  onPress?: () => void;
  onEdit?: () => void;
  onPressVaccine?: () => void;
  onPressDiary?: () => void;
  onPressAgenda?: () => void;
  onPressMembers?: () => void;
}

const PetCard: React.FC<PetCardProps> = ({
  pet, onPress, onEdit,
  onPressVaccine, onPressDiary, onPressAgenda, onPressMembers,
}) => {
  const { t } = useTranslation();
  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const mood = pet.current_mood
    ? moods.find((m) => m.id === pet.current_mood)
    : null;
  const vaccineOverdue = pet.vaccine_status === 'overdue';
  const vaccineColor = vaccineOverdue ? colors.danger : colors.success;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, { shadowColor: petColor }]}
    >
      {/* Top row: avatar + info + edit */}
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
            {pet.sex && (
              <Text style={[styles.sexSymbol, { color: pet.sex === 'male' ? colors.petrol : colors.rose }]}>
                {pet.sex === 'male' ? '♂' : '♀'}
              </Text>
            )}
            {mood ? (
              <View style={[styles.moodBadge, { backgroundColor: mood.color + '1F' }]}>
                <View style={[styles.moodDot, { backgroundColor: mood.color }]} />
                <Text style={[styles.moodText, { color: mood.color }]}>
                  {mood.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.breed} numberOfLines={1}>
            {pet.breed ?? t('pets.noBreed')}
          </Text>

          <View style={styles.tagsRow}>
            {[
              pet.estimated_age_months ? formatAge(pet.estimated_age_months) : null,
              pet.weight_kg ? formatWeight(pet.weight_kg) : null,
              isDog ? t('pets.dog') : t('pets.cat'),
            ]
              .filter(Boolean)
              .map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onEdit?.(); }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.editBtn}
        >
          <Pencil size={rs(16)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Stats: Vacinas · Diário · Agenda */}
      <View style={styles.statsRow}>

        {/* Box 1 — Vacinas */}
        <TouchableOpacity
          style={styles.statBox}
          onPress={(e) => { e.stopPropagation(); onPressVaccine?.(); }}
          activeOpacity={0.7}
        >
          <Syringe size={rs(16)} color={vaccineColor} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: vaccineColor }]}>
            {vaccineOverdue ? t('pets.boxVaccineOverdue') : t('pets.boxVaccineOk')}
          </Text>
          <Text style={styles.statLabel}>{t('pets.boxVaccineLabel')}</Text>
        </TouchableOpacity>

        {/* Box 2 — Diário */}
        <TouchableOpacity
          style={styles.statBox}
          onPress={(e) => { e.stopPropagation(); onPressDiary?.(); }}
          activeOpacity={0.7}
        >
          <BookOpen size={rs(16)} color={colors.accent} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: colors.accent }]} numberOfLines={1}>
            {pet.last_diary_entry
              ? formatRelativeDate(pet.last_diary_entry)
              : t('pets.boxDiaryEmpty')}
          </Text>
          <Text style={styles.statLabel}>{t('pets.boxDiaryLabel')}</Text>
        </TouchableOpacity>

        {/* Box 3 — Agenda */}
        <TouchableOpacity
          style={styles.statBox}
          onPress={(e) => { e.stopPropagation(); onPressAgenda?.(); }}
          activeOpacity={0.7}
        >
          <CalendarDays size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
          <Text style={[styles.statValue, { color: colors.petrol }]} numberOfLines={1}>
            {pet.agenda_count != null && pet.agenda_count > 0
              ? t('pets.boxAgendaCount', { count: pet.agenda_count })
              : t('pets.boxAgendaEmpty')}
          </Text>
          <Text style={styles.statLabel}>{t('pets.boxAgendaLabel')}</Text>
        </TouchableOpacity>

      </View>

      {/* Bottom: vacina badge + última atividade */}
      <View style={styles.bottomRow}>
        <View style={[styles.vaccineBar, { backgroundColor: vaccineColor + '1F' }]}>
          {vaccineOverdue ? (
            <AlertTriangle size={13} color={colors.danger} strokeWidth={2} />
          ) : (
            <ShieldCheck size={13} color={colors.success} strokeWidth={2} />
          )}
          <Text style={[styles.vaccineText, { color: vaccineColor }]}>
            {vaccineOverdue ? t('pets.vaccinesOverdue') : t('pets.vaccineUpToDate')}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.membersBtn}
          onPress={(e) => { e.stopPropagation(); onPressMembers?.(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Users size={rs(16)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>

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
    borderWidth: rs(1),
    borderColor: colors.border,
    borderRadius: rs(radii.card),
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.15,
    shadowRadius: rs(16),
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOuter: {
    width: rs(68),
    height: rs(68),
    borderRadius: rs(18),
    borderWidth: rs(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: rs(16),
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: rs(18),
  },
  topInfo: {
    flex: 1,
    marginLeft: rs(14),
    marginRight: rs(8),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(22),
    color: colors.text,
    flexShrink: 1,
  },
  sexSymbol: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.md),
    gap: rs(5),
  },
  moodDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  moodText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
  },
  breed: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textDim,
    marginTop: rs(2),
  },
  tagsRow: {
    flexDirection: 'row',
    gap: rs(6),
    marginTop: rs(8),
  },
  tag: {
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
    borderRadius: rs(radii.sm),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
  },
  tagText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(11),
    color: colors.textSec,
  },
  statsRow: {
    flexDirection: 'row',
    gap: rs(spacing.sm),
    marginTop: rs(14),
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(10),
    alignItems: 'center',
    gap: rs(4),
  },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    textAlign: 'center',
  },
  statLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: rs(0.3),
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs(12),
  },
  vaccineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderRadius: rs(radii.sm),
  },
  vaccineText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
  },
  membersBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  lastActivityText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
  },
});

export default memo(PetCard);
