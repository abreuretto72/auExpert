import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Dog, Cat } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import type { Pet } from '../../types/database';

interface RecentPetsRowProps {
  recent: Pet[];
  onSelectPet: (name: string) => void;
}

/**
 * Returns a short relative time string: "Xm", "Xh", "Xd"
 * from an ISO date string, relative to now.
 */
function relativeShort(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d`;
}

const RecentPetsRow: React.FC<RecentPetsRowProps> = ({ recent, onSelectPet }) => {
  const { t } = useTranslation();

  const handleSelect = useCallback(
    (name: string) => {
      onSelectPet(name);
    },
    [onSelectPet]
  );

  if (recent.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{t('pets.recentLabel').toUpperCase()}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recent.map((pet, index) => {
          const isDog = pet.species === 'dog';
          // Pet type from database.ts does not have `last_accessed_at`; fall back to updated_at
          const lastDate = (pet as Pet & { last_accessed_at?: string | null }).last_accessed_at
            ?? pet.updated_at;
          const timeAgo = relativeShort(lastDate);
          const isFirst = index === 0;

          return (
            <TouchableOpacity
              key={pet.id}
              onPress={() => handleSelect(pet.name)}
              activeOpacity={0.7}
              style={[
                styles.chip,
                isFirst ? styles.chipFirst : styles.chipDefault,
              ]}
            >
              {/* Mini avatar */}
              <View style={styles.miniAvatar}>
                {pet.avatar_url ? (
                  <Image
                    source={{ uri: pet.avatar_url }}
                    style={styles.miniAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  isDog ? (
                    <Dog size={rs(12)} color={colors.click} strokeWidth={1.8} />
                  ) : (
                    <Cat size={rs(12)} color={colors.purple} strokeWidth={1.8} />
                  )
                )}
              </View>

              <Text style={styles.chipName} numberOfLines={1}>
                {pet.name}
              </Text>

              {timeAgo.length > 0 && (
                <Text style={styles.chipTime}>{timeAgo}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: rs(16),
    gap: rs(8),
  },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 1.5,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: rs(8),
    paddingBottom: rs(4),
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(20),
    borderWidth: 1,
    gap: rs(6),
  },
  chipFirst: {
    borderColor: colors.click + '40',
    backgroundColor: colors.clickSoft,
  },
  chipDefault: {
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  miniAvatar: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(6),
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  miniAvatarImage: {
    width: rs(22),
    height: rs(22),
  },
  chipName: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.text,
    maxWidth: rs(80),
  },
  chipTime: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
  },
});

export default memo(RecentPetsRow);
