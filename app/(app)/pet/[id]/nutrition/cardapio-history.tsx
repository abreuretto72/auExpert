/**
 * nutrition/cardapio-history.tsx — Histórico de cardápios gerados por IA
 */
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, ChevronRight, History, Utensils, FileText, RefreshCw,
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
    router.push({
      pathname: `/pet/${petId}/nutrition/cardapio-detail` as never,
      params: {
        historyId: item.id,
        historyData: JSON.stringify(item.data),
        petName,
        generatedAt: item.generated_at,
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

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => handleViewCardapio(item)}
        activeOpacity={0.8}
      >
        <View style={[s.cardAccent, { backgroundColor: color }]} />
        <View style={s.cardBody}>
          <View style={s.cardRow}>
            <View style={[s.modBadge, { backgroundColor: color + '20' }]}>
              <Text style={[s.modBadgeText, { color }]}>
                {t(`nutrition.modalidade_${item.modalidade}` as never, item.modalidade)}
              </Text>
            </View>
            <Text style={s.dateText}>{date} {time}</Text>
          </View>

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
      </TouchableOpacity>
    );
  };

  if (isLoadingCardapioHistory) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header onBack={() => router.back()} title={t('nutrition.cardapioHistoryTitle')} />
        <View style={s.centered}>
          <ActivityIndicator color={colors.purple} size="large" />
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
  },
  cardAccent: { width: rs(4) },
  cardBody: { flex: 1, padding: rs(12), gap: rs(8) },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modBadge: { paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(6) },
  modBadgeText: { fontSize: fs(11), fontWeight: '700' },
  dateText: { fontSize: fs(11), color: colors.textDim },
  statsRow: { flexDirection: 'row', gap: rs(16) },
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
