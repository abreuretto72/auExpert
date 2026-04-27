/**
 * nutrition/cardapio-detail.tsx — Visualização de um cardápio do histórico.
 *
 * Recebe `historyId` por params (NUNCA o JSON completo — ver bug histórico em
 * cardapio-history.tsx:handleViewCardapio). Busca o cardápio em duas etapas:
 *   1. Cache do React Query (`useNutricao(petId).cardapioHistory`) — instant
 *   2. Fallback: query direta `nutrition_cardapio_history` por id
 *
 * Garante que a tela funciona mesmo num deep-link cold start, sem cache.
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, FileText, Utensils,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { supabase } from '../../../../../lib/supabase';
import { usePets } from '../../../../../hooks/usePets';
import { useNutricao } from '../../../../../hooks/useNutricao';
import type {
  Cardapio, CardapioDia, CardapioHistoryItem,
} from '../../../../../hooks/useNutricao';

const WEEKDAY_COLORS = [
  colors.click, colors.petrol, colors.click, colors.success,
  colors.warning, colors.rose, colors.sky,
];

export default function CardapioDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId, historyId, petName } = useLocalSearchParams<{
    id: string;
    historyId: string;
    petName: string;
  }>();
  const { pets } = usePets();

  // 1ª linha de busca: cache em memória do React Query (carregado pela tela
  // anterior). Match instantâneo no caminho normal — usuário entra no histórico,
  // toca o card, abre detail.
  const { cardapioHistory } = useNutricao(petId ?? '');
  const cachedItem = cardapioHistory.find((h) => h.id === historyId) ?? null;

  // 2ª linha: fallback DB. Cobre cold start (deep link direto pra detail sem
  // ter passado pela history) e cache invalidado. Disabled quando já temos
  // cache pra não fazer round-trip à toa.
  const dbQuery = useQuery({
    queryKey: ['cardapio-history-item', historyId] as const,
    queryFn: async (): Promise<CardapioHistoryItem | null> => {
      if (!historyId) return null;
      const { data, error } = await supabase
        .from('nutrition_cardapio_history')
        .select('id, modalidade, data, is_fallback, generated_at')
        .eq('id', historyId)
        .maybeSingle();
      if (error) {
        console.warn('[cardapio-detail] db fetch failed:', error.message);
        return null;
      }
      return data as CardapioHistoryItem | null;
    },
    enabled: !!historyId && !cachedItem,
    staleTime: 5 * 60 * 1000,
  });

  const item: CardapioHistoryItem | null = cachedItem ?? dbQuery.data ?? null;
  const cardapio: Cardapio | null = item?.data ?? null;
  const generatedDate = item?.generated_at
    ? new Date(item.generated_at).toLocaleDateString()
    : null;
  const isLoadingDb = !cachedItem && dbQuery.isLoading;

  console.log('[cardapio-detail] render', {
    petId, historyId, source: cachedItem ? 'cache' : (dbQuery.data ? 'db' : 'none'),
    days: cardapio?.days?.length ?? 0,
  });

  const handleViewRecipe = (day: CardapioDia, recipeName: string) => {
    const recipe = day.recipes?.find((r) => r.name === recipeName);
    if (!recipe) return;
    router.push({
      pathname: `/pet/nutrition/receita` as never,
      params: {
        recipeName: recipe.name,
        recipeData: JSON.stringify(recipe),
        petName: petName ?? '',
      },
    });
  };

  const handleOpenPdf = () => {
    if (!cardapio) return;
    router.push({
      pathname: `/pet/${petId}/nutrition/cardapio-pdf` as never,
      params: { cardapioData: JSON.stringify(cardapio), isHistory: 'true' },
    });
  };

  if (isLoadingDb) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header
          onBack={() => router.back()}
          title={t('nutrition.cardapioTitle')}
          onPdf={handleOpenPdf}
          canExport={false}
        />
        <View style={s.centered}>
          <ActivityIndicator size="large" color={colors.click} />
        </View>
      </SafeAreaView>
    );
  }
  if (!cardapio) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header
          onBack={() => router.back()}
          title={t('nutrition.cardapioTitle')}
          onPdf={handleOpenPdf}
          canExport={false}
        />
        <View style={s.centered}>
          <Text style={s.errorText}>{t('nutrition.cardapioError')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <Header
        onBack={() => router.back()}
        title={t('nutrition.cardapioTitle')}
        onPdf={handleOpenPdf}
        canExport={true}
      />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Meta */}
        {generatedDate ? (
          <Text style={s.dateText}>{t('nutrition.cardapioGenerated', { date: generatedDate })}</Text>
        ) : null}

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
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  onBack, title, onPdf, canExport,
}: {
  onBack: () => void;
  title: string;
  onPdf: () => void;
  canExport: boolean;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <ChevronLeft size={rs(22)} color={colors.click} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.headerActions}>
        <TouchableOpacity
          onPress={onPdf}
          style={s.iconBtn}
          disabled={!canExport}
          activeOpacity={0.7}
        >
          <FileText size={rs(20)} color={canExport ? colors.click : colors.textGhost} />
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
  backBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(17), fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: rs(16), gap: rs(12), paddingBottom: rs(40) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(24) },
  errorText: { fontSize: fs(14), color: colors.textSec, textAlign: 'center' },
  dateText: { fontSize: fs(11), color: colors.textDim, textAlign: 'right' },
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
});
