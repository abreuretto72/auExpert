import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Newspaper, ChevronRight, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../hooks/useResponsive';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';

/**
 * Card de entrada do Breed Intelligence no Hub.
 * (Substitui a antiga "Aldeia Solidária" — Breed Intelligence é o sucessor:
 * conteúdo clínico exclusivo por raça do pet, com fontes verificáveis.)
 *
 * O nome do arquivo + props ficaram herdados pra não quebrar imports antigos,
 * mas o card visualmente é Breed Intelligence.
 */
interface RedeSolidariaCardProps {
  aldeiaName?: string;
  city?: string;
  tutorCount?: number;
  sosCount?: number;
  newRequests?: number;
  onPress: () => void;
}

const RedeSolidariaCard: React.FC<RedeSolidariaCardProps> = ({ onPress }) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={onPress}>
      {/* Icon */}
      <View style={s.iconWrap}>
        <Newspaper size={rs(24)} color={colors.click} strokeWidth={1.8} />
      </View>

      {/* Info */}
      <View style={s.info}>
        <View style={s.titleRow}>
          <Text style={s.title}>{t('breedIntel.title')}</Text>
          <View style={s.eliteBadge}>
            <Sparkles size={rs(10)} color={colors.click} strokeWidth={2} />
            <Text style={s.eliteText}>Elite</Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <Text style={s.metaText} numberOfLines={1} ellipsizeMode="tail">
            {t('breedIntel.cardSubtitle')}
          </Text>
        </View>
      </View>

      {/* Arrow */}
      <ChevronRight size={rs(16)} color={colors.click} strokeWidth={1.8} />
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.click + '30',
    borderRadius: radii.card,
    padding: rs(14),
    gap: rs(12),
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    backgroundColor: colors.clickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eliteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(3),
    backgroundColor: colors.clickSoft,
    borderRadius: rs(6),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
  },
  eliteText: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(9),
    color: colors.click,
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
    color: colors.click,
  },
});

export default React.memo(RedeSolidariaCard);