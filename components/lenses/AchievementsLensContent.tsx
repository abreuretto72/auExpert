/**
 * AchievementsLensContent — Pet badges, XP, and level progress.
 * Shows unlocked achievements grouped by category + XP progress bar.
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import {
  BookOpen, Camera, Mic, Video, FileUp, Layers, Flame,
  ScanLine, ClipboardList, Scale, TrendingUp,
  PawPrint, Users, Heart, Network,
  Receipt, ReceiptText,
  Plane, Map, Globe,
  PartyPopper, Smile, Rocket,
  Star, Trophy, Lock,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useLensAchievements, type Achievement } from '../../hooks/useLens';
import { ACHIEVEMENT_CATALOG } from '../../lib/achievements';

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, BookMarked: BookOpen, Library: BookOpen, BookHeart: Heart,
  Camera, ScanSearch: Camera,
  Mic, Video, FileUp,
  Layers, Flame, FlameKindling: Flame,
  ScanLine, ClipboardList, Scale, TrendingUp,
  PawPrint, Users, Heart, Network,
  Receipt, ReceiptText,
  Plane, Map, Globe,
  PartyPopper, Smile, Rocket,
  Star, Trophy,
};

const RARITY_COLOR: Record<string, string> = {
  common:    colors.textDim,
  rare:      colors.petrol,
  epic:      colors.purple,
  legendary: colors.warning,
};

const CATEGORY_ORDER = ['diary', 'health', 'social', 'financial', 'travel', 'milestone', 'special'];

// ── XP Progress Bar ───────────────────────────────────────────────────────────

function XPProgressBar({
  level,
  xpTotal,
  xpForNextLevel,
  xpProgress,
}: {
  level: number;
  xpTotal: number;
  xpForNextLevel: number;
  xpProgress: number;
}) {
  const { t } = useTranslation();
  const pct = Math.round(xpProgress * 100);

  return (
    <View style={styles.xpCard}>
      <View style={styles.xpHeader}>
        <View style={styles.levelBadge}>
          <Trophy size={rs(14)} color={colors.warning} strokeWidth={2} />
          <Text style={styles.levelText}>{t('achievements.level', { level })}</Text>
        </View>
        <Text style={styles.xpTotal}>{xpTotal} XP</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` as unknown as number }]} />
      </View>

      <Text style={styles.xpSubtext}>
        {t('achievements.xpToNext', { xp: xpForNextLevel - xpTotal })}
      </Text>
    </View>
  );
}

// ── Badge tile (unlocked or locked) ──────────────────────────────────────────

const BadgeTile = React.memo(function BadgeTile({
  achievement,
  isUnlocked,
}: {
  achievement: (typeof ACHIEVEMENT_CATALOG)[number];
  isUnlocked: boolean;
}) {
  const { t } = useTranslation();
  const IconComp = ICON_MAP[achievement.icon] ?? Star;
  const color = isUnlocked ? (RARITY_COLOR[achievement.rarity] ?? colors.textDim) : colors.textGhost;

  const displayTitle = t(achievement.titleKey);

  return (
    <View style={[styles.badgeTile, !isUnlocked && styles.badgeTileLocked]}>
      <View style={[
        styles.badgeIcon,
        { backgroundColor: color + (isUnlocked ? '18' : '10'), borderColor: color + '30' },
      ]}>
        {isUnlocked
          ? <IconComp size={rs(18)} color={color} strokeWidth={1.8} />
          : <Lock size={rs(14)} color={colors.textGhost} strokeWidth={1.8} />}
      </View>

      {isUnlocked && (
        <View style={[styles.xpBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.xpBadgeText, { color }]}>+{achievement.xp}</Text>
        </View>
      )}

      <Text style={[styles.badgeLabel, !isUnlocked && { color: colors.textGhost }]} numberOfLines={2}>
        {isUnlocked ? displayTitle : '???'}
      </Text>
    </View>
  );
});

// ── Achievement category section ──────────────────────────────────────────────

function AchievementCategory({
  category,
  unlockedKeys,
}: {
  category: string;
  unlockedKeys: Set<string>;
}) {
  const { t } = useTranslation();
  const catalogItems = ACHIEVEMENT_CATALOG.filter((a) => a.category === category);
  if (catalogItems.length === 0) return null;

  const unlockedCount = catalogItems.filter((a) => unlockedKeys.has(a.key)).length;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryTitle}>
          {t(`achievements.category_${category}`).toUpperCase()}
        </Text>
        <Text style={styles.categoryCount}>
          {unlockedCount}/{catalogItems.length}
        </Text>
      </View>

      <View style={styles.badgeGrid}>
        {catalogItems.map((item) => (
          <BadgeTile
            key={item.key}
            achievement={item}
            isUnlocked={unlockedKeys.has(item.key)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Recent achievements ───────────────────────────────────────────────────────

function RecentAchievements({ achievements }: { achievements: Achievement[] }) {
  const { t } = useTranslation();
  if (achievements.length === 0) return null;

  return (
    <View style={styles.recentSection}>
      <Text style={styles.sectionHeader}>{t('achievements.recentTitle').toUpperCase()}</Text>
      {achievements.map((a) => {
        const catalogItem = ACHIEVEMENT_CATALOG.find((c) => c.key === a.achievement_key);
        const IconComp = catalogItem ? (ICON_MAP[catalogItem.icon] ?? Star) : Star;
        const color = RARITY_COLOR[a.rarity] ?? colors.textDim;
        // Prefer current catalog key (always renders in current UI language).
        // Fallback: a.title is either an i18n key (new rows) or legacy raw text
        // (rows inserted before the refactor). t() returns the string unchanged
        // if it's not a recognized key, so legacy rows still render correctly.
        const displayTitle = catalogItem ? t(catalogItem.titleKey) : t(a.title);
        return (
          <View key={a.id} style={styles.recentRow}>
            <View style={[styles.recentIcon, { backgroundColor: color + '18', borderColor: color + '30' }]}>
              <IconComp size={rs(16)} color={color} strokeWidth={1.8} />
            </View>
            <View style={styles.recentInfo}>
              <Text style={styles.recentTitle}>{displayTitle}</Text>
              <Text style={styles.recentDate}>
                {new Date(a.unlocked_at).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })}
              </Text>
            </View>
            <Text style={[styles.recentXP, { color }]}>+{a.xp_reward} XP</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AchievementsLensContentProps {
  petId: string;
}

export function AchievementsLensContent({ petId }: AchievementsLensContentProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useLensAchievements(petId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton width="100%" height={rs(80)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(60)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(140)} radius={radii.card} />
      </View>
    );
  }

  const {
    level = 1,
    xpTotal = 0,
    xpForNextLevel = 80,
    xpProgress = 0,
    achievements = [],
    recent = [],
  } = data ?? {};

  const unlockedKeys = new Set(achievements.map((a) => a.achievement_key));
  const totalUnlocked = achievements.length;
  const totalCatalog = ACHIEVEMENT_CATALOG.length;

  return (
    <View>
      {/* XP Progress */}
      <XPProgressBar
        level={level}
        xpTotal={xpTotal}
        xpForNextLevel={xpForNextLevel}
        xpProgress={xpProgress}
      />

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {t('achievements.unlockedCount', { count: totalUnlocked, total: totalCatalog })}
        </Text>
      </View>

      {/* Recent unlocked */}
      {recent.length > 0 && <RecentAchievements achievements={recent} />}

      {/* All categories */}
      <FlatList
        data={CATEGORY_ORDER}
        keyExtractor={(c) => c}
        renderItem={({ item: category }) => (
          <AchievementCategory category={category} unlockedKeys={unlockedKeys} />
        )}
        scrollEnabled={false}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: { gap: spacing.sm },

  // XP card
  xpCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(10),
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: colors.warning + '18',
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  levelText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.warning,
  },
  xpTotal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  progressTrack: {
    height: rs(6),
    backgroundColor: colors.border,
    borderRadius: rs(3),
    overflow: 'hidden',
    marginBottom: rs(6),
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warning,
    borderRadius: rs(3),
  },
  xpSubtext: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    textAlign: 'right',
  },

  // Summary
  summaryRow: {
    marginBottom: spacing.md,
  },
  summaryText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
  },

  // Recent
  recentSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(10),
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
    marginBottom: rs(6),
  },
  recentIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  recentDate: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
  },
  recentXP: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(12),
  },

  // Category
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(10),
  },
  categoryTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
  },
  categoryCount: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },

  // Badge tile — 3 per row
  badgeTile: {
    width: '30.5%',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(10),
    alignItems: 'center',
    gap: rs(6),
    position: 'relative',
  },
  badgeTileLocked: {
    opacity: 0.45,
  },
  badgeIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpBadge: {
    position: 'absolute',
    top: rs(4),
    right: rs(4),
    paddingHorizontal: rs(4),
    paddingVertical: rs(1),
    borderRadius: rs(5),
  },
  xpBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(8),
  },
  badgeLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(9),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: fs(9) * 1.4,
  },
});
