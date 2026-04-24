/**
 * nutrition/so-racao.tsx — Tela 8: Rotina para modalidade "Só ração"
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Sparkles, Star, Puzzle, FlameKindling } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { usePets } from '../../../../../hooks/usePets';
import { sexContext } from '../../../../../utils/petGender';

const TOPPERS = [
  { emoji: '🍗', key: 'foodChicken', noteKey: 'foodChickenNote' },
  { emoji: '🥕', key: 'foodCarrot', noteKey: 'foodCarrotNote' },
  { emoji: '🍚', key: 'foodRice', noteKey: 'foodRiceNote' },
  { emoji: '🥚', key: 'foodEgg', noteKey: 'foodEggNote' },
];

export default function SoRacaoScreen() {
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
        <Text style={s.headerTitle}>{t('nutrition.soRacaoScreenTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.heroCard}>
          <FlameKindling size={rs(40)} color={colors.click} />
          <Text style={s.heroTitle}>{t('nutrition.soRacaoScreenTitle')}</Text>
          <Text style={s.heroSubtitle}>{t('nutrition.soRacaoScreenSubtitle')}</Text>
        </View>

        {/* Toppers */}
        <SectionLabel icon={<Star size={rs(13)} color={colors.warning} />} label={t('nutrition.topperTitle')} />
        <Text style={s.hint}>{t('nutrition.topperHint')}</Text>
        <View style={s.topperGrid}>
          {TOPPERS.map((topper) => (
            <View key={topper.key} style={s.topperCard}>
              <Text style={s.topperName}>{t(`nutrition.${topper.key}`)}</Text>
              <Text style={s.topperNote}>{t(`nutrition.${topper.noteKey}`)}</Text>
            </View>
          ))}
        </View>

        {/* Enrichment */}
        <SectionLabel icon={<Puzzle size={rs(13)} color={colors.petrol} />} label={t('nutrition.enrichmentTitle')} />
        <Text style={s.hint}>{t('nutrition.enrichmentHint', { name: petName })}</Text>
        <View style={s.enrichCard}>
          {(['enrichmentLickMat', 'enrichmentPuzzle', 'enrichmentSniffing'] as const).map((key) => (
            <View key={key} style={s.enrichRow}>
              <View style={s.enrichDot} />
              <Text style={s.enrichText}>{t(`nutrition.${key}`)}</Text>
            </View>
          ))}
        </View>

        {/* AI hint */}
        <View style={s.aiCard}>
          <Sparkles size={rs(16)} color={colors.purple} />
          <Text style={s.aiText}>{t('nutrition.aiHintRecords', { name: petName, context: sexContext(pet?.sex) })}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={secS.row}>
      {icon}
      <Text style={secS.label}>{label}</Text>
    </View>
  );
}

const secS = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  label: { fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 1.2 },
});

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
  content: { padding: rs(16), gap: rs(14), paddingBottom: rs(40) },
  heroCard: {
    backgroundColor: colors.clickSoft, borderRadius: rs(20), padding: rs(24),
    alignItems: 'center', gap: rs(8), borderWidth: 1, borderColor: colors.click + '30',
  },
  heroTitle: { fontSize: fs(18), fontWeight: '800', color: colors.text },
  heroSubtitle: { fontSize: fs(13), color: colors.textSec, textAlign: 'center' },
  hint: { fontSize: fs(13), color: colors.textSec, marginTop: rs(-8) },
  topperGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  topperCard: {
    flexGrow: 1, flexBasis: '45%',
    backgroundColor: colors.card, borderRadius: rs(12), padding: rs(12),
    borderWidth: 1, borderColor: colors.border,
  },
  topperName: { fontSize: fs(13), fontWeight: '700', color: colors.text, marginBottom: rs(2) },
  topperNote: { fontSize: fs(12), color: colors.textSec },
  enrichCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(10),
  },
  enrichRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10) },
  enrichDot: { width: rs(7), height: rs(7), borderRadius: rs(4), backgroundColor: colors.petrol, marginTop: rs(6) },
  enrichText: { flex: 1, fontSize: fs(14), color: colors.text, lineHeight: rs(20) },
  aiCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(10),
    backgroundColor: colors.purpleSoft, borderRadius: rs(12), padding: rs(14),
    borderWidth: 1, borderColor: colors.purple + '30',
  },
  aiText: { flex: 1, fontSize: fs(13), color: colors.textSec, lineHeight: rs(20) },
});
