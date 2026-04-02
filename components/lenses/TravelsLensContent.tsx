/**
 * TravelsLensContent — Trip history and travel stats.
 * Shows summary stats (trips, km, days) + ordered trip list with status badges.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Plane, Car, Tent, MapPin, Navigation,
  Calendar, Clock, Globe, Sparkles,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useLensTravel, type PetTravel } from '../../hooks/useLens';

// ── Travel type config ────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; labelKey: string }> = {
  road_trip:     { icon: Car,       color: colors.accent,  labelKey: 'travels.typeRoadTrip' },
  flight:        { icon: Plane,     color: colors.sky,     labelKey: 'travels.typeFlight' },
  local:         { icon: MapPin,    color: colors.petrol,  labelKey: 'travels.typeLocal' },
  international: { icon: Globe,     color: colors.purple,  labelKey: 'travels.typeInternational' },
  camping:       { icon: Tent,      color: colors.success, labelKey: 'travels.typeCamping' },
  other:         { icon: Navigation,color: colors.textDim, labelKey: 'travels.typeOther' },
};

const STATUS_COLOR: Record<string, string> = {
  completed: colors.petrol,
  active:    colors.success,
  planned:   colors.gold,
};

// ── Summary card ──────────────────────────────────────────────────────────────

function TravelSummaryCard({
  totalTrips,
  totalKm,
  totalDays,
}: {
  totalTrips: number;
  totalKm: number;
  totalDays: number;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.sky + '15' }]}>
            <Plane size={rs(16)} color={colors.sky} strokeWidth={1.8} />
          </View>
          <Text style={styles.statValue}>{totalTrips}</Text>
          <Text style={styles.statLabel}>{t('travels.statTrips')}</Text>
        </View>

        <View style={[styles.statItem, styles.statBorder]}>
          <View style={[styles.statIcon, { backgroundColor: colors.accent + '15' }]}>
            <Navigation size={rs(16)} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Text style={styles.statValue}>{totalKm.toLocaleString()}</Text>
          <Text style={styles.statLabel}>{t('travels.statKm')}</Text>
        </View>

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: colors.success + '15' }]}>
            <Calendar size={rs(16)} color={colors.success} strokeWidth={1.8} />
          </View>
          <Text style={styles.statValue}>{totalDays}</Text>
          <Text style={styles.statLabel}>{t('travels.statDays')}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Trip card ─────────────────────────────────────────────────────────────────

const TripCard = React.memo(function TripCard({ travel }: { travel: PetTravel }) {
  const { t } = useTranslation();
  const typeCfg = TYPE_CONFIG[travel.travel_type] ?? TYPE_CONFIG.other;
  const TypeIcon = typeCfg.icon;
  const statusColor = STATUS_COLOR[travel.status] ?? colors.textDim;

  const dateRange = (() => {
    if (!travel.start_date) return null;
    const start = new Date(travel.start_date + 'T00:00:00').toLocaleDateString(
      undefined, { day: '2-digit', month: '2-digit', year: '2-digit' },
    );
    if (!travel.end_date) return start;
    const end = new Date(travel.end_date + 'T00:00:00').toLocaleDateString(
      undefined, { day: '2-digit', month: '2-digit', year: '2-digit' },
    );
    return `${start} – ${end}`;
  })();

  return (
    <View style={styles.tripCard}>
      <View style={[styles.tripAccent, { backgroundColor: statusColor }]} />

      <View style={styles.tripContent}>
        {/* Header */}
        <View style={styles.tripHeader}>
          <View style={[styles.tripTypeIcon, { backgroundColor: typeCfg.color + '15' }]}>
            <TypeIcon size={rs(16)} color={typeCfg.color} strokeWidth={1.8} />
          </View>
          <View style={styles.tripInfo}>
            <Text style={styles.tripDestination} numberOfLines={1}>{travel.destination}</Text>
            {travel.region && (
              <Text style={styles.tripRegion} numberOfLines={1}>{travel.region}</Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`travels.status_${travel.status}`)}
            </Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.tripMeta}>
          {dateRange && (
            <View style={styles.metaItem}>
              <Clock size={rs(11)} color={colors.textGhost} strokeWidth={1.8} />
              <Text style={styles.metaText}>{dateRange}</Text>
            </View>
          )}
          {travel.distance_km != null && travel.distance_km > 0 && (
            <View style={styles.metaItem}>
              <Navigation size={rs(11)} color={colors.textGhost} strokeWidth={1.8} />
              <Text style={styles.metaText}>{travel.distance_km.toLocaleString()} km</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <MapPin size={rs(11)} color={colors.textGhost} strokeWidth={1.8} />
            <Text style={styles.metaText}>{t(typeCfg.labelKey)}</Text>
          </View>
        </View>

        {/* Tags */}
        {travel.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {travel.tags.slice(0, 4).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyCard}>
      <Sparkles size={rs(28)} color={colors.sky} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>{t('travels.emptyTitle')}</Text>
      <Text style={styles.emptyHint}>{t('travels.emptyHint')}</Text>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TravelsLensContentProps {
  petId: string;
}

export function TravelsLensContent({ petId }: TravelsLensContentProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useLensTravel(petId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton width="100%" height={rs(80)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(88)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(88)} radius={radii.card} />
      </View>
    );
  }

  if (!data || data.travels.length === 0) {
    return <EmptyState />;
  }

  const { travels, totalTrips, totalKm, totalDays } = data;

  return (
    <View>
      <TravelSummaryCard
        totalTrips={totalTrips}
        totalKm={totalKm}
        totalDays={totalDays}
      />

      <Text style={styles.listHeader}>{t('travels.listTitle').toUpperCase()}</Text>

      {travels.map((travel) => (
        <TripCard key={travel.id} travel={travel} />
      ))}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: { gap: spacing.sm },

  // Summary
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(6),
  },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
    textAlign: 'center',
  },

  // List header
  listHeader: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(10),
  },

  // Trip card
  tripCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  tripAccent: {
    height: rs(3),
  },
  tripContent: {
    padding: spacing.sm,
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    marginBottom: rs(6),
  },
  tripTypeIcon: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  tripRegion: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(1),
  },
  statusBadge: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(8),
    flexShrink: 0,
  },
  statusText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
  },
  tripMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
    marginBottom: rs(4),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  metaText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(5),
    marginTop: rs(4),
  },
  tag: {
    backgroundColor: colors.sky + '12',
    borderRadius: rs(6),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
  },
  tagText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(9),
    color: colors.sky,
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textDim,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: fs(15) * 1.9,
  },
});
