/**
 * ExpensesLens — Displays pet-care expenses extracted from diary entries
 * (OCR receipts / manual). Grouped by month with total and category breakdown.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Receipt, TrendingDown, ShoppingBag, Stethoscope, Pill, Scissors, Home, Shield, Dumbbell, Package, Cpu, FileText, Smile, AlertCircle, MoreHorizontal } from 'lucide-react-native';
import { useLensExpenses } from '../../hooks/useLens';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

// ── Category config ────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { labelKey: string; color: string; Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }> }> = {
  saude:        { labelKey: 'expenses.category.saude',        color: colors.danger,   Icon: Stethoscope },
  alimentacao:  { labelKey: 'expenses.category.alimentacao',  color: colors.success,  Icon: ShoppingBag },
  higiene:      { labelKey: 'expenses.category.higiene',      color: colors.petrol,   Icon: Scissors },
  hospedagem:   { labelKey: 'expenses.category.hospedagem',   color: colors.sky,      Icon: Home },
  cuidados:     { labelKey: 'expenses.category.cuidados',     color: colors.purple,   Icon: Shield },
  treinamento:  { labelKey: 'expenses.category.treinamento',  color: colors.purple,   Icon: Dumbbell },
  acessorios:   { labelKey: 'expenses.category.acessorios',   color: colors.gold,     Icon: Package },
  tecnologia:   { labelKey: 'expenses.category.tecnologia',   color: colors.petrol,   Icon: Cpu },
  plano:        { labelKey: 'expenses.category.plano',        color: colors.gold,     Icon: Receipt },
  funerario:    { labelKey: 'expenses.category.funerario',    color: colors.textDim,  Icon: Pill },
  emergencia:   { labelKey: 'expenses.category.emergencia',   color: colors.danger,   Icon: AlertCircle },
  lazer:        { labelKey: 'expenses.category.lazer',        color: colors.accent,   Icon: Smile },
  documentacao: { labelKey: 'expenses.category.documentacao', color: colors.textDim,  Icon: FileText },
  outros:       { labelKey: 'expenses.category.outros',       color: colors.textDim,  Icon: MoreHorizontal },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category?.toLowerCase()] ?? CATEGORY_CONFIG.outros;
}

// ── Currency formatter ─────────────────────────────────────────────────────

function formatCurrency(value: number, currency = 'BRL'): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

interface ExpenseRow {
  id: string;
  date: string;
  vendor: string | null;
  category: string;
  total: number;
  currency: string;
  items: Array<{ name: string; qty: number; unit_price: number }>;
}

interface MonthGroup {
  monthKey: string;  // "2026-03"
  label: string;     // "Março 2026"
  rows: ExpenseRow[];
  total: number;
  currency: string;
}

// ── Month grouping ─────────────────────────────────────────────────────────

function groupByMonth(rows: ExpenseRow[]): MonthGroup[] {
  const map = new Map<string, ExpenseRow[]>();
  for (const row of rows) {
    const key = row.date.slice(0, 7); // "YYYY-MM"
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([key, entries]) => {
      const [year, month] = key.split('-');
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      const currency = entries[0]?.currency ?? 'BRL';
      const total = entries.reduce((s, e) => s + Number(e.total), 0);
      return { monthKey: key, label, rows: entries, total, currency };
    });
}

// ── Category breakdown bar ─────────────────────────────────────────────────

function CategoryBar({ rows, currency }: { rows: ExpenseRow[]; currency: string }) {
  const { t } = useTranslation();
  const totals: Record<string, number> = {};
  for (const row of rows) {
    totals[row.category] = (totals[row.category] ?? 0) + Number(row.total);
  }
  const grand = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a);

  return (
    <View style={styles.categoryBar}>
      {/* Stacked bar */}
      <View style={styles.barTrack}>
        {sorted.map(([cat, val]) => {
          const cfg = getCategoryConfig(cat);
          const pct = (val / grand) * 100;
          return (
            <View
              key={cat}
              style={[styles.barSegment, { width: `${pct}%` as unknown as number, backgroundColor: cfg.color }]}
            />
          );
        })}
      </View>
      {/* Legend */}
      <View style={styles.legend}>
        {sorted.map(([cat, val]) => {
          const cfg = getCategoryConfig(cat);
          return (
            <View key={cat} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: cfg.color }]} />
              <Text style={styles.legendLabel}>{t(cfg.labelKey, { defaultValue: cat })}</Text>
              <Text style={[styles.legendValue, { color: cfg.color }]}>{formatCurrency(val, currency)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Single expense row ─────────────────────────────────────────────────────

function ExpenseItem({ row }: { row: ExpenseRow }) {
  const { t } = useTranslation();
  const cfg = getCategoryConfig(row.category);
  const Icon = cfg.Icon;
  const dateStr = new Date(row.date + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short' });

  return (
    <View style={styles.expenseRow}>
      <View style={[styles.expenseIcon, { backgroundColor: cfg.color + '18' }]}>
        <Icon size={rs(16)} color={cfg.color} strokeWidth={1.8} />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseVendor} numberOfLines={1}>
          {row.vendor ?? t(cfg.labelKey, { defaultValue: row.category })}
        </Text>
        <Text style={styles.expenseDate}>{dateStr}</Text>
        {row.items.length > 0 && (
          <Text style={styles.expenseItems} numberOfLines={1}>
            {row.items.map((i) => i.name).join(' · ')}
          </Text>
        )}
      </View>
      <Text style={[styles.expenseTotal, { color: cfg.color }]}>
        {formatCurrency(row.total, row.currency)}
      </Text>
    </View>
  );
}

// ── Month card ─────────────────────────────────────────────────────────────

function MonthCard({ group }: { group: MonthGroup }) {
  const { t } = useTranslation();
  return (
    <View style={styles.monthCard}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthLabel}>{group.label}</Text>
        <View style={styles.monthTotalBadge}>
          <TrendingDown size={rs(12)} color={colors.gold} strokeWidth={2} />
          <Text style={styles.monthTotal}>{formatCurrency(group.total, group.currency)}</Text>
        </View>
      </View>

      <CategoryBar rows={group.rows} currency={group.currency} />

      <View style={styles.separator} />

      {group.rows.map((row) => <ExpenseItem key={row.id} row={row} />)}

      <Text style={styles.monthCount}>
        {group.rows.length} {t('expenses.records')}
      </Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ExpensesLens({ petId }: { petId: string }) {
  const { t } = useTranslation();
  const { data: rawExpenses, isLoading } = useLensExpenses(petId);

  const groups = useMemo<MonthGroup[]>(() => {
    if (!rawExpenses) return [];
    return groupByMonth(rawExpenses as ExpenseRow[]);
  }, [rawExpenses]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Receipt size={rs(36)} color={colors.textGhost} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>{t('expenses.empty')}</Text>
        <Text style={styles.emptyText}>{t('expenses.emptyHint')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {groups.map((g) => <MonthCard key={g.monthKey} group={g} />)}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: rs(12),
    paddingBottom: rs(32),
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(40),
  },
  empty: {
    alignItems: 'center',
    paddingVertical: rs(48),
    gap: rs(12),
    paddingHorizontal: rs(32),
  },
  emptyTitle: {
    color: colors.textSec,
    fontSize: fs(15),
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: fs(13),
    textAlign: 'center',
    lineHeight: fs(19),
  },
  monthCard: {
    backgroundColor: colors.card,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(16),
    gap: rs(10),
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    color: colors.text,
    fontSize: fs(14),
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  monthTotalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: colors.goldSoft,
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: rs(10),
  },
  monthTotal: {
    color: colors.gold,
    fontSize: fs(13),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  categoryBar: {
    gap: rs(8),
  },
  barTrack: {
    flexDirection: 'row',
    height: rs(6),
    borderRadius: rs(3),
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  legendDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  legendLabel: {
    color: colors.textDim,
    fontSize: fs(10),
    fontWeight: '600',
  },
  legendValue: {
    fontSize: fs(10),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  expenseIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    gap: rs(2),
  },
  expenseVendor: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '600',
  },
  expenseDate: {
    color: colors.textDim,
    fontSize: fs(11),
    fontWeight: '500',
  },
  expenseItems: {
    color: colors.textDim,
    fontSize: fs(10),
  },
  expenseTotal: {
    fontSize: fs(14),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  monthCount: {
    color: colors.textDim,
    fontSize: fs(10),
    fontWeight: '500',
  },
});
