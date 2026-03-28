import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  ChevronRight,
  Heart,
  BookOpen,
  ScanEye,
  MapPin,
  Calendar,
  Trophy,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';

interface TutorCardProps {
  name: string;
  email: string;
  avatarUrl?: string | null;
  city?: string | null;
  state?: string | null;
  memberSince?: string;
  petsCount: number;
  diaryCount: number;
  photoCount: number;
  level: number;
  xp: number;
  xpNext: number;
  onPress: () => void;
}

const TutorCard: React.FC<TutorCardProps> = ({
  name,
  avatarUrl,
  city,
  state,
  memberSince,
  petsCount,
  diaryCount,
  photoCount,
  level,
  xp,
  xpNext,
  onPress,
}) => {
  const { t } = useTranslation();
  const xpPct = xpNext > 0 ? Math.min((xp / xpNext) * 100, 100) : 0;
  const location = [city, state].filter(Boolean).join(', ');
  console.log('[TutorCard] avatarUrl:', avatarUrl ? avatarUrl.substring(0, 60) + '...' : 'NULL');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      {/* Glow sutil */}
      <View style={styles.glow} />

      {/* Avatar */}
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
      ) : (
        <LinearGradient colors={[colors.accent, colors.accentDark]} style={styles.avatar}>
          <User size={28} color="#fff" strokeWidth={1.8} />
        </LinearGradient>
      )}

      {/* Info */}
      <View style={styles.info}>
        {/* Nome + seta */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <ChevronRight size={14} color={colors.accent} strokeWidth={2} />
        </View>

        {/* Localização + membro desde */}
        <View style={styles.metaRow}>
          {location ? (
            <>
              <MapPin size={11} color={colors.petrol} strokeWidth={1.8} />
              <Text style={styles.metaText}>{location}</Text>
              <Text style={styles.metaDot}>·</Text>
            </>
          ) : null}
          {memberSince ? (
            <>
              <Calendar size={11} color={colors.textDim} strokeWidth={1.8} />
              <Text style={styles.metaText}>{memberSince}</Text>
            </>
          ) : null}
        </View>

        {/* Mini stats */}
        <View style={styles.statsRow}>
          <Heart size={12} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.statValue}>{petsCount}</Text>
          <Text style={styles.statLabel}>{t('tutor.statPets').toLowerCase()}</Text>
          <View style={styles.statGap} />
          <BookOpen size={12} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.statValue}>{diaryCount}</Text>
          <Text style={styles.statLabel}>{t('tutor.statDiary').toLowerCase()}</Text>
          <View style={styles.statGap} />
          <ScanEye size={12} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.statValue}>{photoCount}</Text>
          <Text style={styles.statLabel}>{t('tutor.statAnalysis').toLowerCase()}</Text>
        </View>

        {/* XP bar */}
        <View style={styles.xpRow}>
          <Trophy size={14} color={colors.gold} strokeWidth={1.8} />
          <Text style={styles.xpLevel}>Nv.{level}</Text>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${xpPct}%` }]} />
          </View>
          <Text style={styles.xpText}>{xp}/{xpNext}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent + '15',
    borderRadius: radii.card,
    padding: 20,
    gap: 16,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent + '06',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  metaText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: colors.textDim,
  },
  metaDot: {
    color: colors.textGhost,
    fontSize: 9,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  statValue: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: 11,
    color: colors.textSec,
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 10,
    color: colors.textDim,
  },
  statGap: {
    width: 8,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpLevel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    color: colors.gold,
  },
  xpTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  xpText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 9,
    color: colors.textGhost,
  },
});

export default React.memo(TutorCard);
