/**
 * NutritionLensContent — Real-data nutrition sections for the diary-centric
 * nutrition screen. Renders 5 sections from nutrition_records:
 *   1. CurrentFoodCard    — active ração
 *   2. SupplementsList    — active supplements
 *   3. TreatsSummary      — treats last 30 days
 *   4. IntolerancesList   — intolerances / restrictions
 *   5. FoodHistoryTimeline — past food changes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  UtensilsCrossed, Pill, Cookie, AlertTriangle,
  Clock, CheckCircle, Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useLensNutrition, type NutritionRecord } from '../../hooks/useLens';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function estimateTreatsKcal(treats: NutritionRecord[]): number {
  return treats.reduce((sum, t) => sum + (t.calories_kcal ? Number(t.calories_kcal) : 30), 0);
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, color, count }: {
  icon: React.ElementType;
  label: string;
  color: string;
  count?: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + '18' }]}>
        <Icon size={rs(14)} color={color} strokeWidth={1.8} />
      </View>
      <Text style={[styles.sectionTitle, { color }]}>{label}</Text>
      {count != null && count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: color + '18' }]}>
          <Text style={[styles.countText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyRow({ label }: { label: string }) {
  return (
    <Text style={styles.emptyText}>{label}</Text>
  );
}

// ── 1. CurrentFoodCard ────────────────────────────────────────────────────────

function CurrentFoodCard({ food }: { food: NutritionRecord | null }) {
  const { t } = useTranslation();

  if (!food) {
    return (
      <View style={[styles.card, styles.currentFoodCard]}>
        <SectionHeader
          icon={UtensilsCrossed}
          label={t('nutrition.currentFood')}
          color={colors.lime}
        />
        <EmptyRow label={t('nutrition.noCurrentFood')} />
      </View>
    );
  }

  const name = food.product_name ?? food.brand ?? '—';
  const kcalDay = food.calories_kcal != null && food.daily_portions != null
    ? Math.round(Number(food.calories_kcal) * food.daily_portions)
    : null;

  return (
    <View style={[styles.card, styles.currentFoodCard]}>
      <SectionHeader
        icon={UtensilsCrossed}
        label={t('nutrition.currentFood')}
        color={colors.lime}
      />
      <Text style={styles.foodName}>{name}</Text>
      {food.brand && food.product_name && food.product_name !== food.brand && (
        <Text style={styles.foodBrand}>{food.brand}</Text>
      )}
      <View style={styles.foodMeta}>
        {food.portion_grams != null && (
          <Text style={styles.foodMetaItem}>
            {food.portion_grams}g/{t('nutrition.portionDay')}
          </Text>
        )}
        {food.daily_portions != null && food.daily_portions > 1 && (
          <Text style={styles.foodMetaItem}>
            {food.daily_portions}x {t('nutrition.dailyPortions')}
          </Text>
        )}
        {kcalDay != null && (
          <Text style={[styles.foodMetaItem, { color: colors.lime }]}>
            ~{kcalDay} kcal/{t('nutrition.portionDay')}
          </Text>
        )}
      </View>
      {food.started_at && (
        <View style={styles.sinceRow}>
          <Clock size={rs(12)} color={colors.textDim} strokeWidth={1.8} />
          <Text style={styles.sinceText}>
            {t('nutrition.since')} {formatDate(food.started_at)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── 2. SupplementsList ────────────────────────────────────────────────────────

function SupplementsList({ supplements }: { supplements: NutritionRecord[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={Pill}
        label={t('nutrition.activeSupplements')}
        color={colors.petrol}
        count={supplements.length}
      />
      {supplements.length === 0
        ? <EmptyRow label={t('nutrition.noSupplements')} />
        : supplements.map((s) => (
            <View key={s.id} style={styles.listRow}>
              <View style={[styles.listDot, { backgroundColor: colors.petrol }]} />
              <View style={styles.listTextWrap}>
                <Text style={styles.listName}>{s.product_name ?? s.notes ?? '—'}</Text>
                {s.daily_portions != null && (
                  <Text style={styles.listNote}>
                    {s.daily_portions}x/{t('nutrition.portionDay')}
                    {s.portion_grams != null ? ` · ${s.portion_grams}g` : ''}
                  </Text>
                )}
              </View>
            </View>
          ))
      }
    </View>
  );
}

// ── 3. TreatsSummary ─────────────────────────────────────────────────────────

function TreatsSummary({ treats }: { treats: NutritionRecord[] }) {
  const { t } = useTranslation();
  const kcalEstimate = estimateTreatsKcal(treats);

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={Cookie}
        label={t('nutrition.recentTreats')}
        color={colors.gold}
        count={treats.length}
      />
      {treats.length === 0
        ? <EmptyRow label={t('nutrition.noTreats')} />
        : (
          <View style={styles.treatsRow}>
            <View style={[styles.treatsStat, { borderColor: colors.gold + '30' }]}>
              <Text style={[styles.treatsStatValue, { color: colors.gold }]}>
                {treats.length}
              </Text>
              <Text style={styles.treatsStatLabel}>{t('nutrition.treatsCount')}</Text>
            </View>
            <View style={[styles.treatsStat, { borderColor: colors.gold + '30' }]}>
              <Text style={[styles.treatsStatValue, { color: colors.gold }]}>
                ~{kcalEstimate}
              </Text>
              <Text style={styles.treatsStatLabel}>{t('nutrition.treatsKcal')}</Text>
            </View>
          </View>
        )
      }
    </View>
  );
}

// ── 4. IntolerancesList ───────────────────────────────────────────────────────

function IntolerancesList({ intolerances }: { intolerances: NutritionRecord[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={AlertTriangle}
        label={t('nutrition.intolerances')}
        color={colors.danger}
        count={intolerances.length}
      />
      {intolerances.length === 0
        ? <EmptyRow label={t('nutrition.noIntolerances')} />
        : intolerances.map((i) => (
            <View key={i.id} style={styles.listRow}>
              <View style={[styles.listDot, { backgroundColor: colors.danger }]} />
              <View style={styles.listTextWrap}>
                <Text style={styles.listName}>{i.product_name ?? '—'}</Text>
                {i.notes && <Text style={styles.listNote}>{i.notes}</Text>}
              </View>
            </View>
          ))
      }
    </View>
  );
}

// ── 5. FoodHistoryTimeline ────────────────────────────────────────────────────

function FoodHistoryTimeline({ history }: { history: NutritionRecord[] }) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <SectionHeader
        icon={Clock}
        label={t('nutrition.foodHistory')}
        color={colors.textDim}
      />
      {history.length === 0
        ? <EmptyRow label={t('nutrition.noHistory')} />
        : history.map((h, idx) => (
            <View key={h.id} style={styles.historyRow}>
              <View style={styles.historyTimelineCol}>
                <View style={[styles.historyDot, h.is_current && styles.historyDotCurrent]} >
                  {h.is_current && (
                    <CheckCircle size={rs(10)} color={colors.bg} strokeWidth={2.5} />
                  )}
                </View>
                {idx < history.length - 1 && <View style={styles.historyLine} />}
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyName}>
                  {h.product_name ?? '—'}
                  {h.is_current ? (
                    <Text style={{ color: colors.lime }}> · {t('nutrition.current')}</Text>
                  ) : null}
                </Text>
                <Text style={styles.historyDates}>
                  {formatDate(h.started_at)} – {h.ended_at ? formatDate(h.ended_at) : t('nutrition.current')}
                </Text>
              </View>
            </View>
          ))
      }
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NutritionLensContentProps {
  petId: string;
}

export function NutritionLensContent({ petId }: NutritionLensContentProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useLensNutrition(petId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton width="100%" height={rs(100)} borderRadius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(80)} borderRadius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(80)} borderRadius={radii.card} />
      </View>
    );
  }

  if (!data) return null;

  const hasAnyData =
    data.currentFood !== null ||
    data.activeSupplements.length > 0 ||
    data.recentTreats.length > 0 ||
    data.intolerances.length > 0;

  return (
    <View>
      {/* AI hint when no data yet */}
      {!hasAnyData && (
        <View style={styles.aiHint}>
          <Sparkles size={rs(16)} color={colors.lime} strokeWidth={1.8} />
          <Text style={styles.aiHintText}>{t('nutrition.aiHintRecords')}</Text>
        </View>
      )}

      <CurrentFoodCard food={data.currentFood} />
      <SupplementsList supplements={data.activeSupplements} />
      <TreatsSummary treats={data.recentTreats} />
      <IntolerancesList intolerances={data.intolerances} />
      {data.foodHistory.length > 0 && (
        <FoodHistoryTimeline history={data.foodHistory} />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  currentFoodCard: {
    borderWidth: 1,
    borderColor: colors.lime + '30',
    backgroundColor: colors.lime + '06',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(10),
    gap: rs(6),
  },
  sectionIconWrap: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(8),
  },
  countText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
  },

  // Empty
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    fontStyle: 'italic',
  },

  // Current food
  foodName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
  },
  foodBrand: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginTop: rs(2),
  },
  foodMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    marginTop: rs(6),
  },
  foodMetaItem: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.textSec,
  },
  sinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    marginTop: rs(6),
  },
  sinceText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },

  // List rows (supplements, intolerances)
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: rs(5),
  },
  listDot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(4),
    marginTop: rs(5),
    marginRight: spacing.sm,
  },
  listTextWrap: {
    flex: 1,
  },
  listName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  listNote: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    marginTop: rs(1),
  },

  // Treats
  treatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  treatsStat: {
    flex: 1,
    backgroundColor: colors.goldSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: 'center',
  },
  treatsStatValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(20),
  },
  treatsStatLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
    textAlign: 'center',
  },

  // History
  historyRow: {
    flexDirection: 'row',
    marginBottom: rs(4),
  },
  historyTimelineCol: {
    alignItems: 'center',
    width: rs(20),
    marginRight: spacing.sm,
  },
  historyDot: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(8),
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyDotCurrent: {
    backgroundColor: colors.lime,
  },
  historyLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: rs(3),
  },
  historyInfo: {
    flex: 1,
    paddingBottom: rs(8),
  },
  historyName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  historyDates: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
  },

  // AI hint
  aiHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.limeSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  aiHintText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(14),
    color: colors.lime,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: fs(14) * 1.6,
  },
});
