import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, LayoutGrid, List } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { UI_THRESHOLDS } from '../../constants/uiThresholds';
import PetSearchBar from './PetSearchBar';
import RecentPetsRow from './RecentPetsRow';
import type { Pet } from '../../types/database';

interface PetListHeaderProps {
  totalPets: number;
  density: 'card' | 'compact';
  onToggleDensity: () => void;
  onAddPet: () => void;
  query: string;
  onChangeQuery: (text: string) => void;
  recent: Pet[];
  onSelectRecent: (name: string) => void;
  isSearching: boolean;
  children?: React.ReactNode;
}

const PetListHeader: React.FC<PetListHeaderProps> = ({
  totalPets,
  density,
  onToggleDensity,
  onAddPet,
  query,
  onChangeQuery,
  recent,
  onSelectRecent,
  isSearching,
  children,
}) => {
  const { t } = useTranslation();

  const showDensityToggle = totalPets >= UI_THRESHOLDS.DENSITY_TOGGLE;
  const showSearch = totalPets >= UI_THRESHOLDS.SEARCH;
  const showRecent =
    totalPets >= UI_THRESHOLDS.RECENT_SECTION && !isSearching;

  return (
    <View style={styles.container}>
      {/* Slot: TutorCard, RedeSolidariaCard, vaccine alert, etc. */}
      {children}

      {/* Section header row */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {t('pets.myPets').toUpperCase()} · {totalPets}
        </Text>

        <View style={styles.sectionActions}>
          {showDensityToggle && (
            <TouchableOpacity
              onPress={onToggleDensity}
              activeOpacity={0.7}
              style={styles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {density === 'card' ? (
                <List size={rs(18)} color={colors.click} strokeWidth={1.8} />
              ) : (
                <LayoutGrid size={rs(18)} color={colors.click} strokeWidth={1.8} />
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onAddPet}
            activeOpacity={0.7}
            style={styles.addBtn}
          >
            <Plus size={rs(14)} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.addBtnText}>{t('pets.addNew')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchWrapper}>
          <PetSearchBar
            value={query}
            onChangeText={onChangeQuery}
          />
        </View>
      )}

      {/* Recent pets row */}
      {showRecent && recent.length > 0 && (
        <View style={styles.recentWrapper}>
          <RecentPetsRow recent={recent} onSelectPet={onSelectRecent} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: rs(12),
    paddingBottom: rs(8),
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
  },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: 1.5,
  },
  sectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  iconBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(8),
    backgroundColor: colors.clickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.click,
    borderRadius: rs(10),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    gap: rs(4),
  },
  addBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: '#FFFFFF',
  },
  searchWrapper: {
    paddingHorizontal: rs(16),
  },
  recentWrapper: {
    // RecentPetsRow manages its own horizontal margin
  },
});

export default memo(PetListHeader);
