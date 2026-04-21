/**
 * nutrition/cardapio.tsx — Tela 11: Cardápio semanal gerado por IA
 */
import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, Sparkles, RefreshCw, AlertTriangle,
  Utensils, FileText, History,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { usePets } from '../../../../../hooks/usePets';
import type { CardapioDia } from '../../../../../hooks/useNutricao';

const WEEKDAY_COLORS = [
  colors.accent, colors.petrol, colors.purple, colors.success,
  colors.warning, colors.rose, colors.sky,
];

export default function CardapioScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const petName = pet?.name ?? '';
  const {
    cardapio,
    isLoadingCardapio,
    cardapioError,
    regenerarCardapio,
    isRegeneratingCardapio,
  } = useNutricao(petId ?? '');

  useEffect(() => {
    console.log('[CardapioScreen] state — isLoading:', isLoadingCardapio, 'isRegenerating:', isRegeneratingCardapio, 'error:', cardapioError?.message ?? null, 'hasDays:', cardapio?.days?.length ?? null, 'isFallback:', cardapio?.is_fallback ?? null);
  }, [isLoadingCardapio, isRegeneratingCardapio, cardapioError, cardapio]);

  const handleViewRecipe = (day: CardapioDia, recipeName: string) => {
    const recipe = day.recipes?.find((r) => r.name === recipeName);
    if (!recipe) return;
    router.push({
      pathname: `/pet/${petId}/nutrition/receita` as never,
      params: { recipeName: recipe.name, recipeData: JSON.stringify(recipe), petName },
    });
  };

  const handleOpenPdf = () => {
    if (!cardapio) return;
    router.push({
      pathname: `/pet/${petId}/nutrition/cardapio-pdf` as never,
      params: { cardapioData: JSON.stringify(cardapio) },
    });
  };

  const handleOpenHistory = () => {
    router.push(`/pet/${petId}/nutrition/cardapio-history` as never);
  };

  if (isLoadingCardapio) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header
          onBack={() => router.back()}
          title={t('nutrition.cardapioTitle')}
          onPdf={handleOpenPdf}
          onHistory={handleOpenHistory}
          canExport={false}
        />
        <View style={s.centered}>
          <ActivityIndicator color={colors.purple} size="large" />
          <Text style={s.loadingText}>{t('nutrition.cardapioLoading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cardapioError || !cardapio) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header
          onBack={() => router.back()}
          title={t('nutrition.cardapioTitle')}
          onPdf={handleOpenPdf}
          onHistory={handleOpenHistory}
          canExport={false}
        />
        <View style={s.centered}>
          <AlertTriangle size={rs(40)} color={colors.warning} />
          <Text style={s.errorText}>{t('nutrition.cardapioError')}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => regenerarCardapio()} activeOpacity={0.8}>
            <RefreshCw size={rs(16)} color={colors.accent} />
            <Text style={s.retryBtnText}>{t('nutrition.btnRegenerateMenu')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const generatedDate = cardapio.generated_at
    ? new Date(cardapio.generated_at).toLocaleDateString()
    : '';

  return (
    <SafeAreaView style={s.safeArea}>
      <Header
        onBack={() => router.back()}
        title={t('nutrition.cardapioTitle')}
        onPdf={handleOpenPdf}
        onHistory={handleOpenHistory}
        canExport={!cardapio.is_fallback}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Subtitle + meta */}
        <View style={s.metaRow}>
          <View style={s.sparkleWrap}>
            <Sparkles size={rs(14)} color={colors.purple} />
            <Text style={s.metaText}>{t('nutrition.cardapioSubtitle', { name: petName })}</Text>
          </View>
          {generatedDate ? (
            <Text style={s.dateText}>{t('nutrition.cardapioGenerated', { date: generatedDate })}</Text>
          ) : null}
        </View>

        {/* Fallback warning */}
        {cardapio.is_fallback && (
          <View style={s.fallbackCard}>
            <AlertTriangle size={rs(14)} color={colors.warning} />
            <Text style={s.fallbackText}>{t('nutrition.cardapioIsFallback')}</Text>
          </View>
        )}

        {/* Day cards */}
        {cardapio.days?.map((day, idx) => {
          const color = WEEKDAY_COLORS[idx % WEEKDAY_COLORS.length];
          const recipeCount = day.recipes?.length ?? 0;
          return (
            <View key={idx} style={[s.dayCard, { borderLeftColor: color, borderLeftWidth: rs(4) }]}>
              <View style={s.dayHeader}>
                <View style={[s.dayBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[s.dayBadgeText, { color }]}>{day.weekday}</Text>
                </View>
                <Text style={s.dayTitle}>{day.title}</Text>
                <Text style={s.dayRecipeCount}>
                  {recipeCount > 0
                    ? t('nutrition.cardapioDayRecipes', { n: recipeCount })
                    : t('nutrition.noRecipes')}
                </Text>
              </View>
              {day.description ? <Text style={s.dayDesc}>{day.description}</Text> : null}
              {day.ingredients && day.ingredients.length > 0 && (
                <View style={s.ingredientsList}>
                  {day.ingredients.map((item, ii) => (
                    <View key={ii} style={s.ingredientChip}>
                      <Text style={s.ingredientText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}
              {day.recipes && day.recipes.length > 0 && (
                <View style={s.recipesList}>
                  {day.recipes.map((recipe, ri) => (
                    <TouchableOpacity
                      key={ri}
                      style={s.recipeRow}
                      onPress={() => handleViewRecipe(day, recipe.name)}
                      activeOpacity={0.8}
                    >
                      <Utensils size={rs(14)} color={color} />
                      <Text style={s.recipeName} numberOfLines={1}>{recipe.name}</Text>
                      <View style={s.recipeRowRight}>
                        <Text style={s.recipeMeta}>{recipe.prep_minutes ?? 0} min</Text>
                        <ChevronRight size={rs(14)} color={colors.textDim} />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Regenerate */}
        <TouchableOpacity
          style={[s.regenBtn, isRegeneratingCardapio && s.btnDisabled]}
          onPress={() => regenerarCardapio()}
          disabled={isRegeneratingCardapio}
          activeOpacity={0.8}
        >
          {isRegeneratingCardapio
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <RefreshCw size={rs(16)} color="#FFFFFF" />}
          <Text style={s.regenBtnText}>{t('nutrition.btnRegenerateMenu')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  onBack, title, onPdf, onHistory, canExport,
}: {
  onBack: () => void;
  title: string;
  onPdf: () => void;
  onHistory: () => void;
  canExport: boolean;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.iconBtn}>
        <ChevronLeft size={rs(22)} color={colors.accent} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.headerActions}>
        <TouchableOpacity onPress={onHistory} style={s.iconBtn} activeOpacity={0.7}>
          <History size={rs(20)} color={colors.accent} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onPdf}
          style={s.iconBtn}
          disabled={!canExport}
          activeOpacity={0.7}
        >
          <FileText size={rs(20)} color={canExport ? colors.accent : colors.textGhost} />
        </TouchableOpacity>
      </View>
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
  iconBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(17), fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: rs(16), gap: rs(12), paddingBottom: rs(40) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(14), padding: rs(24) },
  loadingText: { fontSize: fs(14), color: colors.textSec, textAlign: 'center' },
  errorText: { fontSize: fs(14), color: colors.textSec, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.accentGlow, borderRadius: rs(12), padding: rs(14),
    borderWidth: 1, borderColor: colors.accent + '40',
  },
  retryBtnText: { fontSize: fs(14), color: colors.accent, fontWeight: '600' },
  metaRow: { gap: rs(4) },
  sparkleWrap: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  metaText: { fontSize: fs(13), color: colors.textSec, flex: 1 },
  dateText: { fontSize: fs(11), color: colors.textDim },
  fallbackCard: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.warningSoft, borderRadius: rs(10), padding: rs(12),
    borderWidth: 1, borderColor: colors.warning + '30',
  },
  fallbackText: { flex: 1, fontSize: fs(12), color: colors.warning },
  dayCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(14),
    borderWidth: 1, borderColor: colors.border, gap: rs(8),
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(10) },
  dayBadge: { paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(6) },
  dayBadgeText: { fontSize: fs(11), fontWeight: '700' },
  dayTitle: { flex: 1, fontSize: fs(14), fontWeight: '700', color: colors.text },
  dayRecipeCount: { fontSize: fs(11), color: colors.textDim },
  dayDesc: { fontSize: fs(13), color: colors.textSec, lineHeight: rs(18) },
  ingredientsList: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: rs(2) },
  ingredientChip: {
    backgroundColor: colors.bgCard, borderRadius: rs(8),
    paddingHorizontal: rs(10), paddingVertical: rs(4),
    borderWidth: 1, borderColor: colors.border,
  },
  ingredientText: { fontSize: fs(12), color: colors.textSec },
  recipesList: { gap: rs(6), marginTop: rs(2) },
  recipeRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.bgCard, borderRadius: rs(10), padding: rs(10),
  },
  recipeName: { flex: 1, fontSize: fs(13), color: colors.text, fontWeight: '500' },
  recipeRowRight: { flexDirection: 'row', alignItems: 'center', gap: rs(4) },
  recipeMeta: { fontSize: fs(11), color: colors.textDim },
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.accent, borderRadius: rs(14), padding: rs(14),
    marginTop: rs(4),
  },
  regenBtnText: { fontSize: fs(14), color: '#FFFFFF', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
