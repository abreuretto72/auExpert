/**
 * nutrition/historico.tsx — Tela 4: Histórico de rações
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Clock, ChevronRight, FileText } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';

export default function HistoricoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { nutricao } = useNutricao(petId ?? '');

  const history = nutricao?.food_history ?? [];

  const monthsBetween = (start: string | null, end: string | null): number => {
    if (!start) return 0;
    const s = new Date(start);
    const e = end ? new Date(end) : new Date();
    return Math.max(0, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.historicoTitle')}</Text>
        <TouchableOpacity
          onPress={() => router.push(`/pet/${petId}/nutrition-pdf` as never)}
          style={s.backBtn}
          accessibilityLabel={t('nutritionPdf.icon')}
        >
          <FileText size={rs(20)} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
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
              const months = monthsBetween(food.started_at, food.ended_at ?? null);
              return (
                <View key={food.id} style={s.timelineItem}>
                  {/* Dot + line */}
                  <View style={s.timelineLine}>
                    <View style={[s.dot, isCurrent && s.dotCurrent]} />
                    {i < history.length - 1 && <View style={s.line} />}
                  </View>

                  {/* Content */}
                  <View style={[s.card, isCurrent && s.cardCurrent]}>
                    <View style={s.cardTop}>
                      <Text style={s.foodName} numberOfLines={1}>{food.product_name ?? '—'}</Text>
                      {isCurrent && (
                        <View style={s.currentBadge}>
                          <Text style={s.currentBadgeText}>{t('nutrition.historicoCurrent')}</Text>
                        </View>
                      )}
                    </View>
                    {food.brand && <Text style={s.foodBrand}>{food.brand}</Text>}
                    <View style={s.dateRow}>
                      <Clock size={rs(12)} color={colors.textDim} />
                      <Text style={s.dateText}>
                        {food.started_at
                          ? new Date(food.started_at).toLocaleDateString()
                          : '—'}
                        {food.ended_at
                          ? ` → ${new Date(food.ended_at).toLocaleDateString()}`
                          : ''}
                      </Text>
                      {months > 0 && (
                        <Text style={s.monthsText}>
                          · {t('nutrition.historicoMonths', { n: months })}
                        </Text>
                      )}
                    </View>
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
  content: { padding: rs(16), paddingBottom: rs(40) },
  emptyWrap: { alignItems: 'center', paddingVertical: rs(48), gap: rs(12) },
  emptyTitle: { fontSize: fs(15), fontWeight: '600', color: colors.textSec },
  emptyHint: { fontSize: fs(13), color: colors.textDim, textAlign: 'center' },
  timeline: { gap: rs(0) },
  timelineItem: { flexDirection: 'row', gap: rs(12) },
  timelineLine: { alignItems: 'center', width: rs(20) },
  dot: {
    width: rs(12), height: rs(12), borderRadius: rs(6),
    backgroundColor: colors.textGhost, borderWidth: 2, borderColor: colors.border,
  },
  dotCurrent: { backgroundColor: colors.lime, borderColor: colors.lime },
  line: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: rs(2) },
  card: {
    flex: 1, backgroundColor: colors.card, borderRadius: rs(14),
    padding: rs(14), marginBottom: rs(12),
    borderWidth: 1, borderColor: colors.border,
  },
  cardCurrent: { borderColor: colors.lime + '50' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4) },
  foodName: { flex: 1, fontSize: fs(14), fontWeight: '700', color: colors.text },
  foodBrand: { fontSize: fs(12), color: colors.textSec, marginBottom: rs(6) },
  currentBadge: {
    backgroundColor: colors.limeSoft, borderRadius: rs(6),
    paddingHorizontal: rs(8), paddingVertical: rs(2),
  },
  currentBadgeText: { fontSize: fs(11), color: colors.lime, fontWeight: '700' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: rs(5) },
  dateText: { fontSize: fs(12), color: colors.textDim },
  monthsText: { fontSize: fs(12), color: colors.textDim },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.accent, borderRadius: rs(14), padding: rs(16), marginTop: rs(16),
  },
  ctaBtnText: { fontSize: fs(15), fontWeight: '700', color: '#fff' },
});
