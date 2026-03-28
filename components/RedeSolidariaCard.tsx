import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, MapPin, Zap, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../hooks/useResponsive';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';

interface RedeSolidariaCardProps {
  aldeiaName?: string;
  city?: string;
  tutorCount?: number;
  sosCount?: number;
  newRequests?: number;
  onPress: () => void;
}

const RedeSolidariaCard: React.FC<RedeSolidariaCardProps> = ({
  aldeiaName,
  city,
  tutorCount = 0,
  sosCount = 0,
  newRequests = 0,
  onPress,
}) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={onPress}>
      {/* Icon */}
      <View style={s.iconWrap}>
        <Users size={rs(24)} color={colors.petrol} strokeWidth={1.8} />
      </View>

      {/* Info */}
      <View style={s.info}>
        <View style={s.titleRow}>
          <Text style={s.title}>{t('rede.title')}</Text>
          {sosCount > 0 && (
            <View style={s.sosBadge}>
              <Zap size={rs(10)} color={colors.danger} strokeWidth={2} />
              <Text style={s.sosText}>{sosCount} SOS</Text>
            </View>
          )}
        </View>

        <View style={s.metaRow}>
          {city && (
            <>
              <MapPin size={rs(10)} color={colors.petrol} strokeWidth={1.8} />
              <Text style={s.metaText}>{aldeiaName ?? t('rede.village')} {city}</Text>
            </>
          )}
          {tutorCount > 0 && (
            <>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.metaText}>{tutorCount} {t('rede.tutors')}</Text>
            </>
          )}
          {newRequests > 0 && (
            <>
              <Text style={s.metaDot}>·</Text>
              <Text style={s.newText}>{newRequests} {t('rede.newRequests')}</Text>
            </>
          )}
        </View>
      </View>

      {/* Arrow */}
      <ChevronRight size={rs(16)} color={colors.accent} strokeWidth={1.8} />
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.petrol + '20',
    borderRadius: radii.card,
    padding: rs(14),
    gap: rs(12),
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    backgroundColor: colors.petrol + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(4),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  sosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(3),
    backgroundColor: colors.dangerSoft,
    borderRadius: rs(6),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
  },
  sosText: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(9),
    color: colors.danger,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    flexWrap: 'wrap',
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
  newText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.accent,
  },
});

export default React.memo(RedeSolidariaCard);
