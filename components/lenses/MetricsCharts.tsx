/**
 * MetricsCharts — Displays clinical_metrics from the database as
 * sparkline charts per metric type using react-native-svg.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

// ── Types ──────────────────────────────────────────────────────────────────

interface MetricPoint {
  measured_at: string;
  value: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
}

interface MetricGroup {
  type: string;
  points: MetricPoint[];
  unit: string;
}

// ── Metric display config ─────────────────────────────────────────────────

const METRIC_CONFIG: Record<string, { labelKey: string; color: string; icon: string }> = {
  weight:       { labelKey: 'health.metricWeight',      color: colors.petrol,   icon: 'weight' },
  health_score: { labelKey: 'health.metricHealthScore', color: colors.success,  icon: 'score' },
  temperature:  { labelKey: 'health.metricTemperature', color: colors.warning,  icon: 'temp' },
  heart_rate:   { labelKey: 'health.metricHeartRate',   color: colors.danger,   icon: 'heart' },
  glucose:      { labelKey: 'health.metricGlucose',     color: colors.warning,     icon: 'glucose' },
};

const STATUS_COLORS: Record<string, string> = {
  normal:   colors.success,
  low:      colors.warning,
  high:     colors.warning,
  critical: colors.danger,
};

// ── Sparkline chart ────────────────────────────────────────────────────────

const CHART_W = 260;
const CHART_H = 80;
const PAD = 12;

function Sparkline({ points, color }: { points: MetricPoint[]; color: string }) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toX = (i: number) => PAD + (i / Math.max(points.length - 1, 1)) * (CHART_W - PAD * 2);
  const toY = (v: number) => PAD + (1 - (v - min) / range) * (CHART_H - PAD * 2);

  const polyPoints = points.map((p, i) => `${toX(i)},${toY(p.value)}`).join(' ');
  const lastPoint = points[points.length - 1];
  const lastX = toX(points.length - 1);
  const lastY = toY(lastPoint.value);
  const dotColor = STATUS_COLORS[lastPoint.status] ?? color;

  return (
    <Svg width={CHART_W} height={CHART_H}>
      {/* Baseline */}
      <Line
        x1={PAD} y1={CHART_H - PAD}
        x2={CHART_W - PAD} y2={CHART_H - PAD}
        stroke={colors.border} strokeWidth={1}
      />
      {/* Line */}
      <Polyline
        points={polyPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <Circle cx={lastX} cy={lastY} r={4} fill={dotColor} />
      {/* Min/max labels */}
      {min !== max && (
        <>
          <SvgText x={PAD} y={CHART_H - PAD + 12} fontSize={9} fill={colors.textDim}>
            {min}
          </SvgText>
          <SvgText x={PAD} y={PAD + 4} fontSize={9} fill={colors.textDim}>
            {max}
          </SvgText>
        </>
      )}
    </Svg>
  );
}

// ── Single metric card ─────────────────────────────────────────────────────

function MetricCard({ group }: { group: MetricGroup }) {
  const { t } = useTranslation();
  const cfg = METRIC_CONFIG[group.type] ?? { labelKey: `health.metric_${group.type}`, color: colors.petrol, icon: '' };
  const latest = group.points[group.points.length - 1];
  const prev = group.points[group.points.length - 2];

  const trend = prev
    ? latest.value > prev.value ? 'up' : latest.value < prev.value ? 'down' : 'flat'
    : 'flat';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'flat' ? colors.textDim : colors.textSec;

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricTitle, { color: cfg.color }]}>
          {t(cfg.labelKey, { defaultValue: group.type })}
        </Text>
        <View style={styles.metricLatest}>
          <TrendIcon size={rs(14)} color={trendColor} strokeWidth={1.8} />
          <Text style={[styles.metricValue, { color: STATUS_COLORS[latest.status] ?? cfg.color }]}>
            {latest.value} {group.unit}
          </Text>
        </View>
      </View>

      {group.points.length >= 2 ? (
        <Sparkline points={group.points} color={cfg.color} />
      ) : (
        <View style={styles.singlePoint}>
          <Text style={styles.singlePointText}>{t('health.metricsNeedMore')}</Text>
        </View>
      )}

      <Text style={styles.metricCount}>
        {group.points.length} {t('health.metricsRecords')}
        {' · '}{t('health.metricsLast')}: {new Date(latest.measured_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function MetricsCharts({ petId }: { petId: string }) {
  const { t } = useTranslation();

  const { data: rawMetrics, isLoading } = useQuery({
    queryKey: ['pets', petId, 'clinical_metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_metrics')
        .select('metric_type, value, unit, status, measured_at')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('measured_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 60 * 1000,
  });

  const groups = useMemo<MetricGroup[]>(() => {
    if (!rawMetrics) return [];
    const map: Record<string, MetricPoint[]> = {};
    for (const row of rawMetrics) {
      if (!map[row.metric_type]) map[row.metric_type] = [];
      map[row.metric_type].push({
        measured_at: row.measured_at,
        value: Number(row.value),
        unit: row.unit ?? '',
        status: row.status ?? 'normal',
      });
    }
    return Object.entries(map).map(([type, points]) => ({
      type,
      points,
      unit: points[0]?.unit ?? '',
    }));
  }, [rawMetrics]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.click} />
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <TrendingUp size={rs(36)} color={colors.textGhost} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>{t('health.metricsEmpty')}</Text>
        <Text style={styles.emptyText}>{t('health.metricsEmptyHint')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {groups.map((g) => <MetricCard key={g.type} group={g} />)}
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
  metricCard: {
    backgroundColor: colors.card,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(16),
    gap: rs(8),
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: fs(13),
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  metricLatest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  metricValue: {
    fontSize: fs(16),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  singlePoint: {
    height: rs(40),
    alignItems: 'center',
    justifyContent: 'center',
  },
  singlePointText: {
    color: colors.textDim,
    fontSize: fs(12),
    fontStyle: 'italic',
  },
  metricCount: {
    color: colors.textDim,
    fontSize: fs(10),
    fontWeight: '500',
  },
});
