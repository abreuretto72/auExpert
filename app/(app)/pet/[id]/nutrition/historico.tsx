/**
 * nutrition/historico.tsx — Histórico de alimentações ao longo da vida do pet.
 *
 * Mostra cada ração/dieta usada com foto, marca, categoria, porção, calorias,
 * datas, duração e notas. Header tem stats agregadas (total de mudanças,
 * tempo médio por alimentação, alimentação mais longa).
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Clock, ChevronRight, FileText, Beef, Utensils, Soup,
  History, Award, BarChart3,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao, type NutritionFood } from '../../../../../hooks/useNutricao';
import PdfActionModal from '../../../../../components/pdf/PdfActionModal';
import { previewNutritionPdf, shareNutritionPdf } from '../../../../../lib/nutritionPdf';

export default function HistoricoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { nutricao } = useNutricao(petId ?? '');
  const [pdfModal, setPdfModal] = useState(false);

  const history = nutricao?.food_history ?? [];

  // ── Helpers ─────────────────────────────────────────────────────────────
  const daysBetween = (start: string | null, end: string | null): number => {
    if (!start) return 0;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const formatDuration = (days: number): string => {
    if (days === 0) return '—';
    if (days < 30) return t('nutrition.historicoDaysShort', { n: days });
    const months = Math.round(days / 30);
    return t('nutrition.historicoMonths', { n: months });
  };

  const formatPortion = (food: NutritionFood): string | null => {
    const parts: string[] = [];
    if (food.portion_grams) parts.push(`${food.portion_grams}g`);
    if (food.daily_portions) parts.push(`× ${food.daily_portions}`);
    return parts.length > 0 ? parts.join(' ') : null;
  };

  const formatCalories = (food: NutritionFood): string | null => {
    if (!food.calories_kcal) return null;
    const portions = food.daily_portions ?? 1;
    const totalKcal = Math.round(food.calories_kcal * portions);
    return t('nutrition.historicoKcalDay', { n: totalKcal });
  };

  // ── Stats agregadas ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const totalDays = history.reduce(
      (acc, f) => acc + daysBetween(f.started_at, f.ended_at ?? null),
      0,
    );
    const longest = [...history].sort(
      (a, b) =>
        daysBetween(b.started_at, b.ended_at ?? null) -
        daysBetween(a.started_at, a.ended_at ?? null),
    )[0];
    const longestDays = longest ? daysBetween(longest.started_at, longest.ended_at ?? null) : 0;
    const avgDays = history.length > 0 ? Math.round(totalDays / history.length) : 0;
    return {
      changes: history.length,
      avgDays,
      longest: longest?.product_name ?? '—',
      longestDays,
    };
  }, [history]);

  // ── Ícone semântico fallback quando não há foto ─────────────────────────
  const fallbackIcon = (food: NutritionFood) => {
    const m = food.modalidade ?? '';
    if (m === 'so_natural') return Beef;
    if (m === 'racao_natural') return Utensils;
    return Soup;
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.historicoTitle')}</Text>
        <TouchableOpacity
          onPress={() => setPdfModal(true)}
          style={s.backBtn}
          accessibilityLabel={t('nutritionPdf.icon')}
        >
          <FileText size={rs(20)} color={colors.click} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Stats agregadas — só aparece se tiver mais de 1 alimentação */}
        {stats && stats.changes > 1 && (
          <View style={s.statsRow}>
            <StatCard
              icon={History}
              value={String(stats.changes)}
              label={t('nutrition.historicoStatChanges')}
              color={colors.click}
            />
            <StatCard
              icon={BarChart3}
              value={formatDuration(stats.avgDays)}
              label={t('nutrition.historicoStatAvg')}
              color={colors.petrol}
            />
            <StatCard
              icon={Award}
              value={formatDuration(stats.longestDays)}
              label={t('nutrition.historicoStatLongest')}
              color={colors.success}
            />
          </View>
        )}

        {history.length === 0 ? (
          <View style={s.emptyWrap}>
            <Clock size={rs(48)} color={colors.textGhost} />
            <Text style={s.emptyTitle}>{t('nutrition.historicoEmpty')}</Text>
            <Text style={s.emptyHint}>{t('nutrition.historicoHint')}</Text>
          </View>
        ) : (
          <View style={s.timeline}>
            {history.map((food, i) => {
              const isCurrent = !food.ended_at;
              const days = daysBetween(food.started_at, food.ended_at ?? null);
              const portion = formatPortion(food);
              const kcal = formatCalories(food);
              const FallbackIcon = fallbackIcon(food);

              return (
                <View key={food.id} style={s.timelineItem}>
                  {/* Dot + line */}
                  <View style={s.timelineLine}>
                    <View style={[s.dot, isCurrent && s.dotCurrent]} />
                    {i < history.length - 1 && <View style={s.line} />}
                  </View>

                  {/* Card enriquecido */}
                  <View style={[s.card, isCurrent && s.cardCurrent]}>
                    <View style={s.cardTopRow}>
                      {/* Foto da ração ou ícone semântico */}
                      {food.photo_url ? (
                        <Image source={{ uri: food.photo_url }} style={s.thumb} />
                      ) : (
                        <View style={[s.thumb, s.thumbFallback, isCurrent && { borderColor: colors.success + '50' }]}>
                          <FallbackIcon size={rs(20)} color={isCurrent ? colors.success : colors.textDim} strokeWidth={1.6} />
                        </View>
                      )}

                      {/* Nome + badges */}
                      <View style={{ flex: 1, gap: rs(4) }}>
                        <View style={s.nameRow}>
                          <Text style={s.foodName} numberOfLines={2}>{food.product_name ?? '—'}</Text>
                          {isCurrent && (
                            <View style={s.currentBadge}>
                              <Text style={s.currentBadgeText}>{t('nutrition.historicoCurrent')}</Text>
                            </View>
                          )}
                        </View>
                        {food.brand && <Text style={s.foodBrand}>{food.brand}</Text>}
                        {food.category && (
                          <View style={s.categoryChip}>
                            <Text style={s.categoryText}>{food.category}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Linha de stats — porção + calorias */}
                    {(portion || kcal) && (
                      <View style={s.metaRow}>
                        {portion && (
                          <View style={s.metaItem}>
                            <Text style={s.metaLabel}>{t('nutrition.historicoPortion')}</Text>
                            <Text style={s.metaValue}>{portion}</Text>
                          </View>
                        )}
                        {kcal && (
                          <View style={s.metaItem}>
                            <Text style={s.metaLabel}>{t('nutrition.historicoCalories')}</Text>
                            <Text style={s.metaValue}>{kcal}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Datas + duração */}
                    <View style={s.dateRow}>
                      <Clock size={rs(12)} color={colors.textDim} />
                      <Text style={s.dateText}>
                        {food.started_at
                          ? new Date(food.started_at).toLocaleDateString()
                          : t('nutrition.historicoDateUnknown')}
                        {food.ended_at
                          ? ` → ${new Date(food.ended_at).toLocaleDateString()}`
                          : ''}
                      </Text>
                      {days > 0 && (
                        <Text style={s.daysText}>· {formatDuration(days)}</Text>
                      )}
                    </View>

                    {/* Notas */}
                    {food.notes && (
                      <Text style={s.notes} numberOfLines={3}>
                        "{food.notes}"
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Add food CTA */}
        <TouchableOpacity
          style={s.ctaBtn}
          onPress={() => router.push(`/pet/${petId}/nutrition/trocar` as never)}
          activeOpacity={0.8}
        >
          <Text style={s.ctaBtnText}>{t('nutrition.btnChangeFood')}</Text>
          <ChevronRight size={rs(18)} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      <PdfActionModal
        visible={pdfModal}
        onClose={() => setPdfModal(false)}
        title={t('nutritionPdf.title', { name: '' })}
        onPreview={() => previewNutritionPdf({ petId: petId ?? '', petName: '' })}
        onShare={() => shareNutritionPdf({ petId: petId ?? '', petName: '' })}
      />
    </SafeAreaView>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, value, label, color,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[s.statCard, { borderColor: color + '30' }]}>
      <Icon size={rs(16)} color={color} strokeWidth={1.8} />
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel} numberOfLines={2}>{label}</Text>
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
  content: { padding: rs(16), paddingBottom: rs(40) },

  // Stats
  statsRow: { flexDirection: 'row', gap: rs(8), marginBottom: rs(16) },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: rs(12),
    padding: rs(10), gap: rs(4), alignItems: 'center',
    borderWidth: 1,
  },
  statValue: { fontSize: fs(15), fontWeight: '700' },
  statLabel: {
    fontSize: fs(10), color: colors.textDim, textAlign: 'center',
    letterSpacing: 0.4, textTransform: 'uppercase',
  },

  // Empty
  emptyWrap: { alignItems: 'center', paddingVertical: rs(48), gap: rs(12) },
  emptyTitle: { fontSize: fs(15), fontWeight: '600', color: colors.textSec },
  emptyHint: { fontSize: fs(13), color: colors.textDim, textAlign: 'center' },

  // Timeline
  timeline: { gap: rs(0) },
  timelineItem: { flexDirection: 'row', gap: rs(12) },
  timelineLine: { alignItems: 'center', width: rs(20), paddingTop: rs(18) },
  dot: {
    width: rs(12), height: rs(12), borderRadius: rs(6),
    backgroundColor: colors.textGhost, borderWidth: 2, borderColor: colors.border,
  },
  dotCurrent: { backgroundColor: colors.success, borderColor: colors.success },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: rs(2) },

  // Card
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: rs(14),
    padding: rs(14), marginBottom: rs(12), gap: rs(10),
    borderWidth: 1, borderColor: colors.border,
  },
  cardCurrent: { borderColor: colors.success + '50' },

  cardTopRow: { flexDirection: 'row', gap: rs(12), alignItems: 'flex-start' },
  thumb: {
    width: rs(56), height: rs(56), borderRadius: rs(10),
    backgroundColor: colors.bgCard,
  },
  thumbFallback: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(8), flexWrap: 'wrap' },
  foodName: { flex: 1, fontSize: fs(15), fontWeight: '700', color: colors.text },
  foodBrand: { fontSize: fs(12), color: colors.textSec },
  currentBadge: {
    backgroundColor: colors.successSoft, borderRadius: rs(6),
    paddingHorizontal: rs(8), paddingVertical: rs(2),
  },
  currentBadgeText: { fontSize: fs(10), color: colors.success, fontWeight: '700', letterSpacing: 0.4 },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.clickSoft, borderRadius: rs(6),
    paddingHorizontal: rs(7), paddingVertical: rs(2),
  },
  categoryText: { fontSize: fs(10), color: colors.click, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },

  metaRow: {
    flexDirection: 'row', gap: rs(16),
    paddingTop: rs(8), borderTopWidth: 1, borderTopColor: colors.border,
  },
  metaItem: { gap: rs(2) },
  metaLabel: {
    fontSize: fs(9), color: colors.textDim,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  metaValue: { fontSize: fs(13), fontWeight: '700', color: colors.text },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: rs(5), flexWrap: 'wrap' },
  dateText: { fontSize: fs(12), color: colors.textDim },
  daysText: { fontSize: fs(12), color: colors.textDim, fontWeight: '600' },
  notes: {
    fontSize: fs(12), color: colors.textSec, fontStyle: 'italic',
    paddingTop: rs(6), borderTopWidth: 1, borderTopColor: colors.border,
  },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, borderRadius: rs(14), padding: rs(16), marginTop: rs(16),
  },
  ctaBtnText: { fontSize: fs(15), fontWeight: '700', color: '#fff' },
});
