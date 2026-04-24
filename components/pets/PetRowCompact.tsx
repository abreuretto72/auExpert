import React, { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Dog, Cat, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import type { PetCardData } from '../PetCard';

interface PetRowCompactProps {
  pet: PetCardData;
  onPress: (id: string) => void;
}

const PetRowCompact: React.FC<PetRowCompactProps> = ({ pet, onPress }) => {
  const isDog = pet.species === 'dog';
  const vaccineOverdue = pet.vaccine_status === 'overdue';

  const subtitleParts: string[] = [];
  if (pet.breed) subtitleParts.push(pet.breed);
  if (pet.size) {
    const sizeMap: Record<string, string> = {
      small: 'Pequeno',
      medium: 'Médio',
      large: 'Grande',
    };
    subtitleParts.push(sizeMap[pet.size] ?? pet.size);
  }
  if (pet.weight_kg != null) {
    subtitleParts.push(
      pet.weight_kg.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg'
    );
  }
  const subtitle = subtitleParts.join(' · ');

  return (
    <TouchableOpacity
      onPress={() => onPress(pet.id)}
      activeOpacity={0.7}
      style={styles.row}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        {pet.avatar_url ? (
          <Image
            source={{ uri: pet.avatar_url }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            {isDog ? (
              <Dog size={rs(18)} color={isDog ? colors.click : colors.purple} strokeWidth={1.8} />
            ) : (
              <Cat size={rs(18)} color={colors.purple} strokeWidth={1.8} />
            )}
          </View>
        )}
      </View>

      {/* Name + subtitle */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {pet.name}
        </Text>
        {subtitle.length > 0 && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Vaccine badge */}
      <View
        style={[
          styles.vaccineBadge,
          {
            backgroundColor: vaccineOverdue
              ? colors.dangerSoft
              : colors.successSoft,
          },
        ]}
      >
        {vaccineOverdue ? (
          <AlertCircle size={rs(14)} color={colors.danger} strokeWidth={2} />
        ) : (
          <ShieldCheck size={rs(14)} color={colors.success} strokeWidth={2} />
        )}
      </View>

      {/* Row separator — rendered as a bottom border on the container */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: rs(56),
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    gap: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(8),
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImage: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(8),
  },
  avatarPlaceholder: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(8),
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: rs(2),
  },
  name: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  vaccineBadge: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(6),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default memo(PetRowCompact);
