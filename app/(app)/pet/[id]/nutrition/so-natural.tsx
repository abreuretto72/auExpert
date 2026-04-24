/**
 * nutrition/so-natural.tsx — Tela 10: Aviso sobre dieta 100% Natural / BARF
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, AlertTriangle, Salad, CheckCircle, Info } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { usePets } from '../../../../../hooks/usePets';

const BARF_COMPONENTS = [
  { key: 'barf1', i18nKey: 'barfMuscle' },
  { key: 'barf2', i18nKey: 'barfBone' },
  { key: 'barf3', i18nKey: 'barfOrgan' },
  { key: 'barf4', i18nKey: 'barfVeggie' },
  { key: 'barf5', i18nKey: 'barfFruit' },
];

export default function SoNaturalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const petName = pet?.name ?? '';

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.soNaturalScreenTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.heroCard}>
          <Salad size={rs(44)} color={colors.success} />
          <Text style={s.heroTitle}>{t('nutrition.soNaturalScreenTitle')}</Text>
          <Text style={s.heroSubtitle}>{t('nutrition.soNaturalDesc')}</Text>
        </View>

        {/* Vet Warning */}
        <View style={s.warnCard}>
          <View style={s.warnHeader}>
            <AlertTriangle size={rs(20)} color={colors.warning} />
            <Text style={s.warnTitle}>{t('nutrition.soNaturalWarning')}</Text>
          </View>
          <Text style={s.warnDesc}>{t('nutrition.soNaturalWarningDesc', { name: petName })}</Text>
        </View>

        {/* BARF Components */}
        <View style={s.sectionRow}>
          <Info size={rs(13)} color={colors.petrol} />
          <Text style={s.sectionLabel}>{t('nutrition.barfComponentsTitle')}</Text>
        </View>
        <View style={s.componentsCard}>
          {BARF_COMPONENTS.map((item) => (
            <View key={item.key} style={s.componentRow}>
              <CheckCircle size={rs(16)} color={colors.success} />
              <Text style={s.componentText}>{t(`nutrition.${item.i18nKey}`)}</Text>
            </View>
          ))}
        </View>

        {/* Benefits */}
        <View style={s.sectionRow}>
          <CheckCircle size={rs(13)} color={colors.success} />
          <Text style={s.sectionLabel}>{t('nutrition.barfBenefitsTitle')}</Text>
        </View>
        <View style={s.benefitsCard}>
          {(['barfBenefit1', 'barfBenefit2', 'barfBenefit3'] as const).map((key) => (
            <View key={key} style={s.benefitRow}>
              <View style={s.dot} />
              <Text style={s.benefitText}>{t(`nutrition.${key}`)}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={s.ctaBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <CheckCircle size={rs(18)} color="#fff" />
          <Text style={s.ctaBtnText}>{t('nutrition.soNaturalVetBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(17), fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: rs(16), gap: rs(16), paddingBottom: rs(40) },
  heroCard: {
    backgroundColor: colors.successSoft, borderRadius: rs(20), padding: rs(24),
    alignItems: 'center', gap: rs(8), borderWidth: 1, borderColor: colors.success + '30',
  },
  heroTitle: { fontSize: fs(18), fontWeight: '800', color: colors.text },
  heroSubtitle: { fontSize: fs(13), color: colors.textSec, textAlign: 'center', lineHeight: rs(20) },
  warnCard: {
    backgroundColor: colors.warningSoft, borderRadius: rs(14), padding: rs(16),
    gap: rs(8), borderWidth: 1, borderColor: colors.warning + '30',
  },
  warnHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  warnTitle: { fontSize: fs(14), fontWeight: '700', color: colors.warning },
  warnDesc: { fontSize: fs(13), color: colors.textSec, lineHeight: rs(20) },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  sectionLabel: { fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 1.2 },
  componentsCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(12),
  },
  componentRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10) },
  componentText: { fontSize: fs(14), color: colors.text, fontWeight: '500' },
  benefitsCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(10),
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10) },
  dot: {
    width: rs(7), height: rs(7), borderRadius: rs(4),
    backgroundColor: colors.success, marginTop: rs(6),
  },
  benefitText: { flex: 1, fontSize: fs(14), color: colors.text, lineHeight: rs(20) },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.success, borderRadius: rs(14), padding: rs(16),
  },
  ctaBtnText: { fontSize: fs(15), fontWeight: '700', color: '#fff' },
});
