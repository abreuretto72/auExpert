/**
 * nutrition/cardapio-history.tsx — Histórico de cardápios gerados por IA
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, History, Utensils, FileText, RefreshCw,
  Beef, Soup,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { usePets } from '../../../../../hooks/usePets';
import { previewPdf } from '../../../../../lib/pdf';
import { useToast } from '../../../../../components/Toast';
import { buildCardapioPdfBody } from '../../../../../lib/cardapioPdf';
import type { CardapioHistoryItem } from '../../../../../hooks/useNutricao';

const MODALIDADE_COLORS: Record<string, string> = {
  so_racao: colors.petrol,
  racao_natural: colors.success,
  so_natural: colors.success,
};

export default function CardapioHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const petName = pet?.name ?? '';
  const { toast } = useToast();

  const {
    cardapioHistory,
    isLoadingCardapioHistory,
    refetchCardapioHistory,
  } = useNutricao(petId ?? '');

  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleExportPdf = async (item: CardapioHistoryItem) => {
    if (exportingId) return;
    setExportingId(item.id);
    try {
      const bodyHtml = buildCardapioPdfBody(item.data, t);
      const date = new Date(item.generated_at).toLocaleDateString();
      await previewPdf({
        title: t('nutrition.cardapioPdfTitle', { name: petName }),
        subtitle: t('nutrition.cardapioHistoryPdfSubtitle', { date }),
        bodyHtml,
      });
    } catch {
      toast(t('errors.generic'), 'error');
    } finally {
      setExportingId(null);
    }
  };

  const handleViewCardapio = (item: CardapioHistoryItem) => {
    // Bug histórico (corrigido 2026-04-27): antes passávamos `historyData:
    // JSON.stringify(item.data)` (~6KB) como param. Android trunca/corrompe
    // strings grandes na URL → JSON.parse falhava silenciosamente e a tela
    // ficava em branco. Agora só o id vai pelos params; a tela detail busca
    // pelo cache do React Query (instantâneo) ou pelo Supabase (fallback).
    router.push({
      pathname: `/pet/${petId}/nutrition/cardapio-detail` as never,
      params: {
        historyId: item.id,
        petName,
      },
    });
  };

  const renderItem = ({ item }: { item: CardapioHistoryItem }) => {
    const color = MODALIDADE_COLORS[item.modalidade] ?? colors.petrol;
    const date = new Date(item.generated_at).toLocaleDateString();
    const time = new Date(item.generated_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const dayCount = item.data?.days?.length ?? 0;
    const recipeCount = item.data?.days?.reduce((acc, d) => acc + (d.recipes?.length ?? 0), 0) ?? 0;
    const isExporting = exportingId === item.id;

    // Ícone fallback quando não há foto da ração: respeitando a modalidade.
    // Beef pra natural/BARF (carne crua), Utensils pra ração mista, Soup pra
    // só ração (kibble servido). Cor segue a modalidade pra coerência visual.
    const FallbackIcon = item.modalidade === 'so_natural'
      ? Beef
      : item.modalidade === 'racao_natural'
      ? Utensils
      : Soup;

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => handleViewCardapio(item)}
        activeOpacity={0.8}
      >
        {/* Thumb da ração (foto se houver, senão ícone semântico) — substitui
            a faixa colorida vertical antiga, dando peso visual maior à
            identidade da ração. */}
        {item.food_photo_url ? (
          <Image source={{ uri: item.food_photo_url }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbFallback, { backgroundColor: color + '15', borderColor: color + '40' }]}>
            <FallbackIcon size={rs(22)} color={color} strokeWidth={1.6} />
          </View>
        )}

        <View style={s.cardBody}>
          {/* Linha 1: modalidade (badge colorido) + data/hora */}
          <View style={s.cardRow}>
            <View style={[s.modBadge, { backgroundColor: color + '20' }]}>
              <Text style={[s.modBadgeText, { color }]}>
                {t(`nutrition.modalidade_${item.modalidade}` as never, item.modalidade)}
              </Text>
            </View>
            <View style={s.dateBlock}>
              <Text style={s.dateText}>{date}</Text>
              <Text style={s.timeText}>{time}</Text>
            </View>
          </View>

          {/* Linha 2: stats + ações */}
          <View style={s.bottomRow}>
            <View style={s.statsRow}>
              <View style={s.stat}>
                <Text style={s.statValue}>{dayCount}</Text>
                <Text style={s.statLabel}>{t('nutrition.cardapioHistoryDays')}</Text>
              </View>
              <View style={s.stat}>
                <Utensils size={rs(12)} color={colors.textDim} />
                <Text style={s.statValue}>{recipeCount}</Text>
                <Text style={s.statLabel}>{t('nutrition.cardapioHistoryRecipes')}</Text>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity
                style={s.exportIconBtn}
                onPress={() => handleExportPdf(item)}
                disabled={!!exportingId}
                activeOpacity={0.7}
              >
                {isExporting
                  ? <ActivityIndicator size="small" color={colors.click} />
                  : <FileText size={rs(16)} color={colors.click} />}
              </TouchableOpacity>
              <ChevronRight size={rs(16)} color={colors.textDim} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoadingCardapioHistory) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header onBack={() => router.back()} title={t('nutrition.cardapioHistoryTitle')} />
        <View style={s.centered}>
          <ActivityIndicator color={colors.click} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <Header onBack={() => router.back()} title={t('nutrition.cardapioHistoryTitle')} />
      <FlatList
        data={cardapioHistory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onRefresh={refetchCardapioHistory}
        refreshing={isLoadingCardapioHistory}
        ListEmptyComponent={
          <View style={s.empty}>
            <History size={rs(40)} color={colors.textDim} />
            <Text style={s.emptyText}>{t('nutrition.cardapioHistoryEmpty')}</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <ChevronLeft size={rs(22)} color={colors.click} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.backBtn} />
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
  list: { padding: rs(16), gap: rs(10), paddingBottom: rs(40) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12), paddingTop: rs(80) },
  emptyText: { fontSize: fs(14), color: colors.textSec, textAlign: 'center' },
  card: {
    backgroundColor: colors.card, borderRadius: rs(14),
    borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', overflow: 'hidden',
    padding: rs(10), gap: rs(10), alignItems: 'center',
  },
  thumb: {
    width: rs(56), height: rs(56), borderRadius: rs(10),
    backgroundColor: colors.bgCard,
  },
  thumbFallback: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  cardBody: { flex: 1, gap: rs(8) },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: rs(8) },
  modBadge: { paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(6) },
  modBadgeText: { fontSize: fs(11), fontWeight: '700' },
  dateBlock: { alignItems: 'flex-end' },
  dateText: { fontSize: fs(12), color: colors.text, fontWeight: '600' },
  timeText: { fontSize: fs(11), color: colors.textDim, marginTop: rs(1) },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsRow: { flexDirection: 'row', gap: rs(14) },
  stat: { flexDirection: 'row', alignItems: 'center', gap: rs(4) },
  statValue: { fontSize: fs(13), fontWeight: '700', color: colors.text },
  statLabel: { fontSize: fs(11), color: colors.textDim },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: rs(8) },
  exportIconBtn: {
    width: rs(32), height: rs(32), alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.clickSoft, borderRadius: rs(8),
    borderWidth: 1, borderColor: colors.click + '40',
  },
});
