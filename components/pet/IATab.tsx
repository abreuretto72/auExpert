/**
 * IATab — AI-generated insights for the pet.
 * Design: IAScreen.jsx prototype
 *
 * - SummaryBar: urgency counts (Alertas / Atenções / Dicas)
 * - FilterBar:  category chips, adaptive (only present categories shown)
 * - InsightCard: expandable, 3px left border colored by urgency
 *   One card expanded at a time; tap again to collapse
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, RefreshControl,
} from 'react-native';
import { Sparkles, ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { spacing, radii } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useInsights, PetInsight, InsightUrgency } from '../../hooks/useInsights';

// ── Types ─────────────────────────────────────────────────────────────────────

type InsightCategory =
  | 'saude' | 'comportamento' | 'peso' | 'vacina' | 'financeiro' | 'nutricao';

// ── Urgency palette ───────────────────────────────────────────────────────────

const URGENCY_STYLE: Record<InsightUrgency, {
  borderColor: string;
  badgeBg: string;
  badgeColor: string;
}> = {
  high:   { borderColor: '#E24B4A', badgeBg: '#FCEBEB', badgeColor: '#A32D2D' },
  medium: { borderColor: '#BA7517', badgeBg: '#FAEEDA', badgeColor: '#633806' },
  low:    { borderColor: '#1D9E75', badgeBg: '#E1F5EE', badgeColor: '#085041' },
};

const URGENCY_ORDER: Record<InsightUrgency, number> = { high: 0, medium: 1, low: 2 };

const CATEGORY_ORDER: InsightCategory[] = [
  'saude', 'comportamento', 'peso', 'vacina', 'financeiro', 'nutricao',
];

// ── SummaryBar ────────────────────────────────────────────────────────────────

function SummaryBar({ insights }: { insights: PetInsight[] }) {
  const { t } = useTranslation();
  const high   = insights.filter((i) => i.urgency === 'high').length;
  const medium = insights.filter((i) => i.urgency === 'medium').length;
  const low    = insights.filter((i) => i.urgency === 'low').length;

  return (
    <View style={styles.summaryBar}>
      {([
        { count: high,   labelKey: 'insights.summaryAlerts',      bg: '#FCEBEB', color: '#A32D2D' },
        { count: medium, labelKey: 'insights.summaryAttentions',  bg: '#FAEEDA', color: '#633806' },
        { count: low,    labelKey: 'insights.summaryTips',        bg: '#E1F5EE', color: '#085041' },
      ] as const).map(({ count, labelKey, bg, color }) => (
        <View key={labelKey} style={[styles.summaryBox, { backgroundColor: bg }]}>
          <Text style={[styles.summaryCount, { color }]}>{count}</Text>
          <Text style={[styles.summaryLabel, { color }]}>{t(labelKey)}</Text>
        </View>
      ))}
    </View>
  );
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

function FilterBar({
  categories,
  active,
  onChange,
}: {
  categories: InsightCategory[];
  active: InsightCategory | 'all';
  onChange: (c: InsightCategory | 'all') => void;
}) {
  const { t } = useTranslation();
  const chips = [
    { id: 'all' as const, label: t('insights.catAll') },
    ...CATEGORY_ORDER
      .filter((c) => categories.includes(c))
      .map((c) => ({ id: c, label: t(`insights.cat_${c}`) })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      style={styles.filterScroll}
    >
      {chips.map((chip) => {
        const isActive = chip.id === active;
        return (
          <TouchableOpacity
            key={chip.id}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => onChange(chip.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── InsightCard ───────────────────────────────────────────────────────────────

const InsightCard = React.memo(function InsightCard({
  insight,
  expanded,
  onToggle,
}: {
  insight: PetInsight;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const u = URGENCY_STYLE[insight.urgency];

  const dateLabel = useMemo(() => {
    const d = new Date(insight.created_at);
    const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
    if (diffDays === 0) return t('insights.today');
    if (diffDays === 1) return t('insights.yesterday');
    return d.toLocaleDateString();
  }, [insight.created_at, t]);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: u.borderColor }]}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={[styles.cardIconBox, { backgroundColor: u.badgeBg }]}>
          <Sparkles size={rs(14)} color={u.badgeColor} strokeWidth={1.8} />
        </View>

        <View style={styles.cardTitleWrap}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={expanded ? undefined : 2}>
              {insight.title}
            </Text>
            <View style={[styles.urgencyBadge, { backgroundColor: u.badgeBg }]}>
              <Text style={[styles.urgencyBadgeText, { color: u.badgeColor }]}>
                {t(`insights.badge_${insight.urgency}`)}
              </Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {insight.source ? `${insight.source} · ` : ''}{dateLabel}
          </Text>
        </View>

        <View style={expanded ? styles.chevronExpanded : undefined}>
          <ChevronRight size={rs(14)} color={colors.textGhost} strokeWidth={1.8} />
        </View>
      </View>

      {/* Expanded body */}
      {expanded && (
        <View style={styles.cardBody}>
          <Text style={styles.cardBodyText}>{insight.body}</Text>
          {insight.action_label && (
            <View style={[styles.actionBtn, { backgroundColor: u.badgeBg }]}>
              <Text style={[styles.actionBtnText, { color: u.badgeColor }]}>
                {insight.action_label} →
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Skeleton ──────────────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      {[1, 2, 3].map((i) => (
        <Skeleton
          key={i}
          width="100%"
          height={rs(80)}
          radius={rs(radii.card)}
          style={{ marginBottom: rs(spacing.sm) }}
        />
      ))}
    </View>
  );
}

// ── Empty ─────────────────────────────────────────────────────────────────────

function EmptyInsights({ filter }: { filter: InsightCategory | 'all' }) {
  const { t } = useTranslation();
  return (
    <View style={styles.empty}>
      <Sparkles size={rs(40)} color={colors.purple} strokeWidth={1.4} />
      <Text style={styles.emptyTitle}>
        {filter === 'all'
          ? t('insights.emptyTitle')
          : t('insights.emptyCategory', { category: t(`insights.cat_${filter}`) })}
      </Text>
      <Text style={styles.emptyBody}>{t('insights.emptyBody', { name: '' })}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface IATabProps {
  petId: string;
  petName?: string;
}

export default function IATab({ petId, petName }: IATabProps) {
  const { t } = useTranslation();
  const { insights, isLoading, refetch } = useInsights(petId);

  const [filter, setFilter]         = useState<InsightCategory | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const presentCategories = useMemo(
    () => CATEGORY_ORDER.filter((c) => insights.some((i) => i.category === c)),
    [insights],
  );

  const filtered = useMemo(() => {
    const list = filter === 'all'
      ? insights
      : insights.filter((i) => i.category === filter);
    return [...list].sort((a, b) => URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]);
  }, [insights, filter]);

  const handleFilterChange = useCallback((c: InsightCategory | 'all') => {
    setFilter(c);
    setExpandedId(null);
  }, []);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  if (isLoading) return <InsightsSkeleton />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refetch} tintColor={colors.purple} />
      }
    >
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Sparkles size={rs(16)} color={colors.purple} strokeWidth={1.8} />
        <Text style={styles.sectionTitle}>
          {t('insights.sectionTitle', { name: (petName ?? '').toUpperCase() })}
        </Text>
        {insights.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {t('insights.countBadge', { count: insights.length })}
            </Text>
          </View>
        )}
      </View>

      {/* Summary bar */}
      {insights.length > 0 && <SummaryBar insights={insights} />}

      {/* Filter chips */}
      {presentCategories.length > 0 && (
        <FilterBar
          categories={presentCategories}
          active={filter}
          onChange={handleFilterChange}
        />
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyInsights filter={filter} />
      ) : (
        filtered.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            expanded={expandedId === insight.id}
            onToggle={() => handleToggle(insight.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    paddingBottom: rs(spacing.xl),
    gap: rs(spacing.sm),
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(4),
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.sm),
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
  },
  countBadgeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: rs(4),
  },
  summaryBox: {
    flex: 1,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(10),
    alignItems: 'center',
    gap: rs(2),
  },
  summaryCount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(20),
  },
  summaryLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
  },

  // Filter bar
  filterScroll: { marginBottom: rs(4) },
  filterRow: { gap: rs(6), paddingHorizontal: rs(2) },
  filterChip: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(5),
    borderRadius: rs(999),
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterChipActive: {
    backgroundColor: colors.purple + '20',
    borderColor: colors.purple,
  },
  filterChipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textDim,
  },
  filterChipTextActive: {
    color: colors.purple,
    fontFamily: 'Sora_700Bold',
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: rs(3),
    padding: rs(spacing.md),
    gap: rs(6),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(10),
  },
  cardIconBox: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitleWrap: { flex: 1 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(6),
    marginBottom: rs(3),
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.text,
    flex: 1,
    lineHeight: fs(18),
  },
  urgencyBadge: {
    borderRadius: rs(999),
    paddingHorizontal: rs(6),
    paddingVertical: rs(1),
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  urgencyBadgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
  },
  cardMeta: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textGhost,
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },

  // Expanded body
  cardBody: {
    paddingLeft: rs(38),
    gap: rs(10),
    paddingTop: rs(4),
  },
  cardBodyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: fs(12) * 1.65,
  },
  actionBtn: {
    alignSelf: 'flex-start',
    borderRadius: rs(8),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
  },
  actionBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
  },

  // Skeleton
  skeletonWrap: { padding: rs(spacing.md) },

  // Empty
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(spacing.md),
    paddingTop: rs(60),
    paddingHorizontal: rs(spacing.xl),
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: fs(20),
  },
});
