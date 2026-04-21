/**
 * FriendsLensContent — Social graph of the pet.
 * Shows all pet connections discovered from diary entries via AI,
 * ordered by last encounter.
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Dog, Cat, Bird, Heart, Users, Sparkles } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useLensFriends, type PetConnection } from '../../hooks/useLens';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const SPECIES_ICON: Record<string, React.ElementType> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
};

const SPECIES_COLOR: Record<string, string> = {
  dog: colors.accent,
  cat: colors.purple,
  bird: colors.sky,
  rabbit: colors.success,
  other: colors.petrol,
  unknown: colors.textDim,
};

const CONNECTION_TYPE_KEY: Record<string, string> = {
  friend: 'friends.typeFriend',
  playmate: 'friends.typePlaymate',
  neighbor: 'friends.typeNeighbor',
  relative: 'friends.typeRelative',
  rival: 'friends.typeRival',
  caretaker_pet: 'friends.typeCaretaker',
  unknown: 'friends.typeUnknown',
};

// ── FriendCard ────────────────────────────────────────────────────────────────

const FriendCard = React.memo(function FriendCard({ connection }: { connection: PetConnection }) {
  const { t } = useTranslation();
  const species = connection.friend_species ?? 'unknown';
  const SpeciesIcon = SPECIES_ICON[species] ?? Dog;
  const color = SPECIES_COLOR[species] ?? colors.textDim;
  const typeKey = CONNECTION_TYPE_KEY[connection.connection_type] ?? 'friends.typeFriend';

  return (
    <View style={styles.card}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color + '14', borderColor: color + '30' }]}>
        <SpeciesIcon size={rs(20)} color={color} strokeWidth={1.8} />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.friendName}>{connection.friend_name}</Text>
          {connection.friend_breed && (
            <Text style={styles.friendBreed}> · {connection.friend_breed}</Text>
          )}
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.typeBadge, { color, backgroundColor: color + '14' }]}>
            {t(typeKey)}
          </Text>
          {connection.friend_owner && (
            <Text style={styles.ownerText}>{t('friends.owner')}: {connection.friend_owner}</Text>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Heart size={rs(11)} color={colors.rose} strokeWidth={2} />
            <Text style={styles.statText}>
              {connection.meet_count} {t('friends.meets')}
            </Text>
          </View>
          {connection.last_seen_at && (
            <Text style={styles.lastSeenText}>
              {t('friends.lastSeen')}: {formatDate(connection.last_seen_at)}
            </Text>
          )}
        </View>

        {connection.notes && (
          <Text style={styles.notes} numberOfLines={1}>
            "{connection.notes}"
          </Text>
        )}
      </View>
    </View>
  );
});

// ── FriendsSummary ────────────────────────────────────────────────────────────

function FriendsSummary({ total, topFriend }: { total: number; topFriend: PetConnection | null }) {
  const { t } = useTranslation();

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryLeft}>
        <View style={[styles.summaryIconWrap, { backgroundColor: colors.accentGlow }]}>
          <Users size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </View>
        <View>
          <Text style={styles.summaryCount}>{total}</Text>
          <Text style={styles.summaryLabel}>{t('friends.totalFriends')}</Text>
        </View>
      </View>
      {topFriend && (
        <View style={styles.summaryRight}>
          <Text style={styles.bestFriendLabel}>{t('friends.bestFriend')}</Text>
          <Text style={styles.bestFriendName}>{topFriend.friend_name}</Text>
          <Text style={styles.bestFriendMeets}>{topFriend.meet_count}x</Text>
        </View>
      )}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface FriendsLensContentProps {
  petId: string;
}

export function FriendsLensContent({ petId }: FriendsLensContentProps) {
  const { t } = useTranslation();
  const { data: connections, isLoading } = useLensFriends(petId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton width="100%" height={rs(72)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(90)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(90)} radius={radii.card} />
      </View>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <View>
        <View style={styles.emptyCard}>
          <Sparkles size={rs(24)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.emptyTitle}>{t('friends.emptyTitle')}</Text>
          <Text style={styles.emptyHint}>{t('friends.emptyHint')}</Text>
        </View>
      </View>
    );
  }

  // Best friend = most encounters
  const topFriend = [...connections].sort((a, b) => b.meet_count - a.meet_count)[0] ?? null;

  return (
    <View>
      <FriendsSummary total={connections.length} topFriend={topFriend} />

      <Text style={styles.listHeader}>{t('friends.listTitle').toUpperCase()}</Text>

      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FriendCard connection={item} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: {
    gap: spacing.sm,
  },

  // Summary
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryIconWrap: {
    width: rs(46),
    height: rs(46),
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(28),
    color: colors.accent,
    lineHeight: fs(30),
  },
  summaryLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  bestFriendLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(9),
    color: colors.textDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bestFriendName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
    marginTop: rs(2),
  },
  bestFriendMeets: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.rose,
    marginTop: rs(1),
  },

  // List header
  listHeader: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(10),
  },

  // Friend card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  avatar: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: rs(4),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  friendName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
  },
  friendBreed: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    flexWrap: 'wrap',
  },
  typeBadge: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    letterSpacing: 0.5,
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(6),
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  ownerText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  statText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.rose,
  },
  lastSeenText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
  },
  notes: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    fontStyle: 'italic',
  },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(14),
    color: colors.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: fs(14) * 1.6,
  },
});
