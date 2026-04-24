/**
 * PetBottomNav — 4-tab bottom navigation for the pet screen.
 *
 * Tabs: Diário · Painel · Agenda · IA
 * Active tab: accent (orange) indicator dot + accent label.
 * Inactive tab: textDim label, no dot.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  BookOpen, LayoutGrid, CalendarDays, Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { spacing } from '../../constants/spacing';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PetTab = 'diario' | 'painel' | 'agenda' | 'ia';

interface TabConfig {
  id: PetTab;
  labelKey: string;
  icon: React.ElementType;
}

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: TabConfig[] = [
  { id: 'diario', labelKey: 'petNav.diary',   icon: BookOpen },
  { id: 'painel', labelKey: 'petNav.painel',  icon: LayoutGrid },
  { id: 'agenda', labelKey: 'petNav.agenda',  icon: CalendarDays },
  { id: 'ia',     labelKey: 'petNav.ai',      icon: Sparkles },
];

// Active color — teal as specified in the nav design
const ACTIVE_COLOR = colors.click;

// ── Component ─────────────────────────────────────────────────────────────────

interface PetBottomNavProps {
  active: PetTab;
  onChange: (tab: PetTab) => void;
}

export default function PetBottomNav({ active, onChange }: PetBottomNavProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, rs(spacing.sm)) }]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const IconComp = tab.icon;
        const color = isActive ? ACTIVE_COLOR : colors.textDim;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.7}
          >
            <IconComp
              size={rs(20)}
              color={color}
              strokeWidth={isActive ? 2.0 : 1.6}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(tab.labelKey)}
            </Text>
            {isActive && <View style={styles.dot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: rs(spacing.sm),
    // paddingBottom is applied inline with useSafeAreaInsets
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(3),
    paddingVertical: rs(4),
    position: 'relative',
  },
  label: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
  },
  labelActive: {
    color: colors.click,
  },
  dot: {
    width: rs(4),
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.click,
    marginTop: rs(1),
  },
});
