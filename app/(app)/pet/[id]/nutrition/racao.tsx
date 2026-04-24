/**
 * nutrition/racao.tsx — Tela 2: Detalhes da ração atual + calculadora de porção
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Utensils, ChevronRight, AlertTriangle,
  Calculator, Plus,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { usePets } from '../../../../../hooks/usePets';
import { sexContext } from '../../../../../utils/petGender';

function categoryLabel(t: (k: string) => string, cat: string | null): string {
  if (!cat) return '—';
  const map: Record<string, string> = {
    dry_food: t('nutrition.categoryDryFood'),
    wet_food: t('nutrition.categoryWetFood'),
    raw: t('nutrition.categoryRaw'),
    homemade: t('nutrition.categoryHomemade'),
    treat: t('nutrition.categoryTreat'),
    supplement: t('nutrition.categorySupplement'),
    prescription: t('nutrition.categoryPrescription'),
  };
  return map[cat] ?? cat;
}

export default function RacaoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const { nutricao } = useNutricao(petId ?? '');
  const [calcWeight, setCalcWeight] = useState(String(nutricao?.weight_kg ?? ''));

  const food = nutricao?.current_food;
  const petName = pet?.name ?? '';

  // Simple portion suggestion: ~2-3% of body weight for natural, ~standard label for dry
  const suggestedPortion = calcWeight
    ? Math.round(parseFloat(calcWeight) * 20)
    : null;

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.racaoTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {food ? (
          <>
            {/* Main food card */}
            <View style={s.foodCard}>
              <View style={s.foodIconWrap}>
                <Utensils size={rs(28)} color={colors.success} />
              </View>
              <View style={s.foodInfo}>
                <Text style={s.foodName}>{food.product_name ?? '—'}</Text>
                {food.brand && <Text style={s.foodBrand}>{food.brand}</Text>}
                {food.category && (
                  <View style={s.categoryPill}>
                    <Text style={s.categoryText}>{categoryLabel(t, food.category)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Life stage alert */}
            {nutricao?.alerts?.some((a) => a.type === 'life_stage_mismatch') && (
              <View style={s.alertRow}>
                <AlertTriangle size={rs(16)} color={colors.warning} />
                <Text style={s.alertText}>{t('nutrition.racaoLifeStageAlert')}</Text>
              </View>
            )}

            {/* Stats grid */}
            <View style={s.statsGrid}>
              {food.portion_grams != null && (
                <StatBox label={t('nutrition.racaoPortion')} value={t('nutrition.racaoPortionValue', { g: food.portion_grams })} />
              )}
              {food.daily_portions != null && (
                <StatBox label={t('nutrition.dailyPortions')} value={t('nutrition.racaoDailyPortions', { n: food.daily_portions })} />
              )}
              {food.calories_kcal != null && (
                <StatBox label={t('nutrition.caloriesPerDayLabel')} value={String(food.calories_kcal)} />
              )}
              {food.started_at && (
                <StatBox label={t('nutrition.since')} value={new Date(food.started_at).toLocaleDateString()} />
              )}
            </View>

            {food.notes && (
              <View style={s.notesCard}>
                <Text style={s.notesText}>{food.notes}</Text>
              </View>
            )}

            {/* Portion calculator */}
            <Text style={s.sectionLabel}>{t('nutrition.racaoCalcTitle')}</Text>
            <View style={s.calcCard}>
              <Text style={s.calcLabel}>{t('nutrition.racaoCalcWeightLabel')}</Text>
              <TextInput
                style={s.calcInput}
                value={calcWeight}
                onChangeText={setCalcWeight}
                keyboardType="decimal-pad"
                placeholderTextColor={colors.placeholder}
                placeholder={t('nutrition.racaoCalcWeightPlaceholder')}
              />
              {suggestedPortion != null && !isNaN(suggestedPortion) && (
                <View style={s.calcResult}>
                  <Calculator size={rs(16)} color={colors.petrol} />
                  <Text style={s.calcResultText}>
                    {t('nutrition.racaoCalcSuggestion', { g: suggestedPortion })}
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={s.emptyWrap}>
            <Utensils size={rs(48)} color={colors.textGhost} />
            <Text style={s.emptyText}>{t('nutrition.noCurrentFood', { name: petName, context: sexContext(pet?.sex) })}</Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={s.ctaBtn}
          onPress={() => router.push(`/pet/${petId}/nutrition/trocar` as never)}
          activeOpacity={0.8}
        >
          <Plus size={rs(18)} color="#fff" />
          <Text style={s.ctaBtnText}>{t('nutrition.btnTrocarRacao')}</Text>
          <ChevronRight size={rs(18)} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={statBoxS.box}>
      <Text style={statBoxS.label}>{label}</Text>
      <Text style={statBoxS.value}>{value}</Text>
    </View>
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
  content: { padding: rs(16), gap: rs(14), paddingBottom: rs(40) },
  foodCard: {
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16),
    flexDirection: 'row', gap: rs(14), borderWidth: 1, borderColor: colors.border,
  },
  foodIconWrap: {
    width: rs(56), height: rs(56), borderRadius: rs(28),
    backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center',
  },
  foodInfo: { flex: 1, justifyContent: 'center' },
  foodName: { fontSize: fs(16), fontWeight: '700', color: colors.text, marginBottom: rs(2) },
  foodBrand: { fontSize: fs(13), color: colors.textSec, marginBottom: rs(6) },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successSoft, borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(3),
  },
  categoryText: { fontSize: fs(11), color: colors.success, fontWeight: '600' },
  alertRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(8),
    backgroundColor: colors.warningSoft, borderRadius: rs(10),
    padding: rs(12), borderWidth: 1, borderColor: colors.warning + '30',
  },
  alertText: { flex: 1, fontSize: fs(13), color: colors.warning },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10) },
  notesCard: {
    backgroundColor: colors.card, borderRadius: rs(12), padding: rs(12),
    borderWidth: 1, borderColor: colors.border,
  },
  notesText: { fontSize: fs(13), color: colors.textSec, lineHeight: rs(20) },
  sectionLabel: {
    fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 1.2,
    marginTop: rs(4),
  },
  calcCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(10),
  },
  calcLabel: { fontSize: fs(13), color: colors.textSec },
  calcInput: {
    backgroundColor: colors.bgCard, borderRadius: rs(10), padding: rs(12),
    fontSize: fs(15), color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  calcResult: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.textSec, borderRadius: rs(8), padding: rs(10),
  },
  calcResultText: { fontSize: fs(14), color: colors.petrol, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: rs(40), gap: rs(12) },
  emptyText: { fontSize: fs(14), color: colors.textDim, textAlign: 'center' },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, borderRadius: rs(14), padding: rs(16),
    marginTop: rs(8),
  },
  ctaBtnText: { fontSize: fs(15), fontWeight: '700', color: '#fff' },
});

const statBoxS = StyleSheet.create({
  box: {
    flexGrow: 1, flexBasis: '45%',
    backgroundColor: colors.card, borderRadius: rs(12),
    padding: rs(12), borderWidth: 1, borderColor: colors.border,
  },
  label: { fontSize: fs(11), color: colors.textDim, marginBottom: rs(4), letterSpacing: 0.5 },
  value: { fontSize: fs(15), fontWeight: '700', color: colors.text },
});
