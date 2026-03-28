import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, usePathname, useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart, ShieldCheck, Sparkles, BookOpen, ChevronLeft,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';

const TABS = [
  { key: 'index', icon: Heart, labelKey: 'common.home' },
  { key: 'health', icon: ShieldCheck, labelKey: 'common.health' },
  { key: 'photo-analysis', icon: Sparkles, labelKey: 'common.ia' },
  { key: 'diary', icon: BookOpen, labelKey: 'common.diary' },
] as const;

export default function PetTabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const pathname = usePathname();
  const { data: pet } = usePet(id!);

  // Determinar aba ativa pelo pathname
  const activeTab = TABS.find((tab) => {
    if (tab.key === 'index') return pathname.endsWith(`/${id}`) || pathname.endsWith(`/${id}/`);
    return pathname.includes(tab.key);
  })?.key ?? 'index';

  const navigateTab = (key: string) => {
    if (key === 'index') {
      router.replace(`/pet/${id}` as never);
    } else {
      router.replace(`/pet/${id}/${key}` as never);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{pet?.name ?? '...'}</Text>
        <View style={s.backBtn} />
      </View>

      {/* Conteúdo da aba ativa */}
      <View style={s.content}>
        <Slot />
      </View>

      {/* Bottom Tab Bar */}
      <View style={s.tabBar}>
        <View style={s.tabBarInner}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const Icon = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[s.tab, isActive && s.tabActive]}
                onPress={() => navigateTab(tab.key)}
                activeOpacity={0.7}
              >
                <Icon
                  size={rs(20)}
                  color={isActive ? colors.accent : colors.textDim}
                  strokeWidth={isActive ? 2 : 1.8}
                />
                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    gap: rs(12),
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    paddingHorizontal: rs(16),
    paddingBottom: rs(8),
    paddingTop: rs(4),
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(4),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(10),
    borderRadius: rs(16),
    gap: rs(4),
  },
  tabActive: {
    backgroundColor: colors.accent + '20',
  },
  tabLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
  },
  tabLabelActive: {
    color: colors.accent,
    fontFamily: 'Sora_600SemiBold',
  },
});
