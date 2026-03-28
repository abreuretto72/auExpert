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
import { rs, fs } from '../hooks/useResponsive';

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
          <User size={rs(28)} color="#fff" strokeWidth={1.8} />
        </LinearGradient>
      )}

      {/* Info */}
      <View style={styles.info}>
        {/* Nome + seta */}
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <ChevronRight size={rs(14)} color={colors.accent} strokeWidth={2} />
        </View>

        {/* Localização + membro desde */}
        <View style={styles.metaRow}>
          {location ? (
            <>
              <MapPin size={rs(11)} color={colors.petrol} strokeWidth={1.8} />
              <Text style={styles.metaText}>{location}</Text>
              <Text style={styles.metaDot}>·</Text>
            </>
          ) : null}
          {memberSince ? (
            <>
              <Calendar size={rs(11)} color={colors.textDim} strokeWidth={1.8} />
              <Text style={styles.metaText}>{memberSince}</Text>
            </>
          ) : null}
        </View>

        {/* Mini stats */}
        <View style={styles.statsRow}>
          <Heart size={rs(12)} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.statValue}>{petsCount}</Text>
          <Text style={styles.statLabel}>{t('tutor.statPets').toLowerCase()}</Text>
          <View style={styles.statGap} />
          <BookOpen size={rs(12)} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.statValue}>{diaryCount}</Text>
          <Text style={styles.statLabel}>{t('tutor.statDiary').toLowerCase()}</Text>
          <View style={styles.statGap} />
          <ScanEye size={rs(12)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.statValue}>{photoCount}</Text>
          <Text style={styles.statLabel}>{t('tutor.statAnalysis').toLowerCase()}</Text>
        </View>

        {/* XP bar */}
        <View style={styles.xpRow}>
          <Trophy size={rs(14)} color={colors.gold} strokeWidth={1.8} />
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
    borderWidth: rs(1),
    borderColor: colors.accent + '15',
    borderRadius: rs(radii.card),
    padding: rs(20),
    gap: rs(16),
    marginBottom: rs(spacing.md),
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: rs(-20),
    right: rs(-20),
    width: rs(100),
    height: rs(100),
    borderRadius: rs(50),
    backgroundColor: colors.accent + '06',
  },
  avatar: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.25,
    shadowRadius: rs(16),
    elevation: 4,
  },
  avatarImage: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(20),
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(4),
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    marginBottom: rs(10),
  },
  metaText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  metaDot: {
    color: colors.textGhost,
    fontSize: fs(9),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    marginBottom: rs(10),
  },
  statValue: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
  },
  statGap: {
    width: rs(8),
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  xpLevel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.gold,
  },
  xpTrack: {
    flex: 1,
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.border,
  },
  xpFill: {
    height: '100%',
    borderRadius: rs(2),
    backgroundColor: colors.gold,
  },
  xpText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(9),
    color: colors.textGhost,
  },
});

export default React.memo(TutorCard);
