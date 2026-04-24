/**
 * nutrition/receita.tsx — Tela 12: Detalhe de uma receita do cardápio
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Clock, Utensils, ThumbsUp, AlertTriangle, Sparkles,
  Refrigerator, Snowflake, CheckCircle,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import type { Receita } from '../../../../../hooks/useNutricao';

export default function ReceitaScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{
    recipeName: string;
    recipeData: string;
    petName: string;
  }>();

  const petName = params.petName ?? '';
  let recipe: Receita | null = null;
  try {
    recipe = params.recipeData ? JSON.parse(params.recipeData) : null;
  } catch {
    recipe = null;
  }

  if (!recipe) {
    return (
      <SafeAreaView style={s.safeArea}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ChevronLeft size={rs(22)} color={colors.click} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('nutrition.receitaTitle')}</Text>
          <View style={s.backBtn} />
        </View>
        <View style={s.centered}>
          <AlertTriangle size={rs(36)} color={colors.warning} />
          <Text style={s.emptyText}>{t('errors.generic')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{recipe.name}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Hero stats row */}
        <View style={s.statsRow}>
          {recipe.prep_minutes != null && (
            <View style={s.statChip}>
              <Clock size={rs(14)} color={colors.textDim} />
              <Text style={s.statText}>{t('nutrition.receitaPrepTime', { n: recipe.prep_minutes })}</Text>
            </View>
          )}
          {recipe.portion_g != null && (
            <View style={s.statChip}>
              <Utensils size={rs(14)} color={colors.textDim} />
              <Text style={s.statText}>{t('nutrition.receitaPortion', { g: recipe.portion_g })}</Text>
            </View>
          )}
          {recipe.servings != null && (
            <View style={s.statChip}>
              <ThumbsUp size={rs(14)} color={colors.textDim} />
              <Text style={s.statText}>{t('nutrition.receitaServings', { n: recipe.servings })}</Text>
            </View>
          )}
        </View>

        {/* Safety badge */}
        <View style={[s.safetyBadge, recipe.is_safe ? s.safetyBadgeSafe : s.safetyBadgeWarn]}>
          {recipe.is_safe
            ? <CheckCircle size={rs(16)} color={colors.success} />
            : <AlertTriangle size={rs(16)} color={colors.warning} />}
          <Text style={[s.safetyText, recipe.is_safe ? s.safetyTextSafe : s.safetyTextWarn]}>
            {recipe.is_safe
              ? t('nutrition.receitaSafe', { name: petName })
              : t('nutrition.receitaUnsafe')}
          </Text>
        </View>

        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <>
            <SectionLabel label={t('nutrition.receitaIngredients')} />
            <View style={s.listCard}>
              {recipe.ingredients.map((ing, i) => (
                <View key={i} style={s.listRow}>
                  <View style={[s.dot, { backgroundColor: colors.success }]} />
                  <Text style={s.listText}>{ing}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Steps */}
        {recipe.steps && recipe.steps.length > 0 && (
          <>
            <SectionLabel label={t('nutrition.receitaSteps')} />
            <View style={s.listCard}>
              {recipe.steps.map((step, i) => (
                <View key={i} style={s.stepRow}>
                  <View style={s.stepNumber}>
                    <Text style={s.stepNumberText}>{i + 1}</Text>
                  </View>
                  <Text style={s.listText}>{step}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Storage */}
        {(recipe.storage_fridge || recipe.storage_freezer) && (
          <>
            <SectionLabel label={t('nutrition.receitaStorage')} />
            <View style={s.storageCard}>
              {recipe.storage_fridge && (
                <View style={s.storageRow}>
                  <Refrigerator size={rs(16)} color={colors.petrol} />
                  <Text style={s.storageText}>
                    {t('nutrition.receitaFridge', { days: recipe.storage_fridge })}
                  </Text>
                </View>
              )}
              {recipe.storage_freezer && (
                <View style={s.storageRow}>
                  <Snowflake size={rs(16)} color={colors.sky} />
                  <Text style={s.storageText}>
                    {t('nutrition.receitaFreezer', { days: recipe.storage_freezer })}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* AI Tip */}
        {recipe.ai_tip && (
          <>
            <SectionLabel label={t('nutrition.receitaAITip')} />
            <View style={s.aiTipCard}>
              <Sparkles size={rs(16)} color={colors.purple} />
              <Text style={s.aiTipText}>{recipe.ai_tip}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={secS.label}>{label}</Text>;
}

const secS = StyleSheet.create({
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
  headerTitle: { flex: 1, fontSize: fs(16), fontWeight: '700', color: colors.text, textAlign: 'center', marginHorizontal: rs(8) },
  scroll: { flex: 1 },
  content: { padding: rs(16), gap: rs(14), paddingBottom: rs(40) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12) },
  emptyText: { fontSize: fs(14), color: colors.textSec },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: rs(5),
    backgroundColor: colors.card, borderRadius: rs(10), paddingHorizontal: rs(10), paddingVertical: rs(7),
    borderWidth: 1, borderColor: colors.border,
  },
  statText: { fontSize: fs(12), color: colors.textSec, fontWeight: '500' },
  safetyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    borderRadius: rs(10), padding: rs(12), borderWidth: 1,
  },
  safetyBadgeSafe: { backgroundColor: colors.successSoft, borderColor: colors.success + '30' },
  safetyBadgeWarn: { backgroundColor: colors.warningSoft, borderColor: colors.warning + '30' },
  safetyText: { fontSize: fs(13), fontWeight: '600', flex: 1 },
  safetyTextSafe: { color: colors.success },
  safetyTextWarn: { color: colors.warning },
  listCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(10),
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10) },
  dot: { width: rs(7), height: rs(7), borderRadius: rs(4), marginTop: rs(6) },
  listText: { flex: 1, fontSize: fs(14), color: colors.text, lineHeight: rs(22) },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(12) },
  stepNumber: {
    width: rs(22), height: rs(22), borderRadius: rs(11),
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.click + '40',
    alignItems: 'center', justifyContent: 'center', marginTop: rs(2),
  },
  stepNumberText: { fontSize: fs(11), fontWeight: '700', color: colors.click },
  storageCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(14),
    borderWidth: 1, borderColor: colors.border, gap: rs(10),
  },
  storageRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10) },
  storageText: { fontSize: fs(14), color: colors.text },
  aiTipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(10),
    backgroundColor: colors.purpleSoft, borderRadius: rs(12), padding: rs(14),
    borderWidth: 1, borderColor: colors.purple + '30',
  },
  aiTipText: { flex: 1, fontSize: fs(13), color: colors.textSec, lineHeight: rs(20) },
});
