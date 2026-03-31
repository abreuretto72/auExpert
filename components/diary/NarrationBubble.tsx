import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, RefreshCw } from 'lucide-react-native';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { moods } from '../../constants/moods';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

interface NarrationBubbleProps {
  narration: string;
  petName: string;
  mood: string;
  moodConfidence: number;
  tags?: string[];
  onRegenerate?: () => void;
}

// ══════════════════════════════════════
// MOOD CONFIG
// ══════════════════════════════════════

interface MoodVisual {
  readonly color: string;
  readonly dotColor: string;
}

const MOOD_COLORS: Readonly<Record<string, MoodVisual>> = {
  ecstatic: { color: colors.gold, dotColor: colors.gold },
  happy: { color: colors.success, dotColor: colors.success },
  playful: { color: colors.accent, dotColor: colors.accent },
  calm: { color: colors.petrol, dotColor: colors.petrol },
  tired: { color: colors.textDim, dotColor: colors.textDim },
  anxious: { color: colors.warning, dotColor: colors.warning },
  sad: { color: colors.sky, dotColor: colors.sky },
  sick: { color: colors.danger, dotColor: colors.danger },
};

const DEFAULT_MOOD: MoodVisual = {
  color: colors.textSec,
  dotColor: colors.textSec,
};

const getMoodVisual = (mood: string): MoodVisual =>
  MOOD_COLORS[mood] ?? DEFAULT_MOOD;

const formatConfidence = (value: number): string =>
  `${Math.round(value * 100)}%`;

// ══════════════════════════════════════
// TAG COLORS — rotate through theme colors
// ══════════════════════════════════════

const TAG_COLORS: readonly string[] = [
  colors.accent,
  colors.petrol,
  colors.purple,
  colors.success,
  colors.gold,
  colors.sky,
  colors.lime,
  colors.rose,
];

const getTagColor = (index: number): string =>
  TAG_COLORS[index % TAG_COLORS.length];

// ══════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════

const NarrationBubble: React.FC<NarrationBubbleProps> = ({
  narration,
  petName,
  mood,
  moodConfidence,
  tags,
  onRegenerate,
}) => {
  const { t, i18n } = useTranslation();

  const moodVisual = useMemo(() => getMoodVisual(mood), [mood]);
  const handleRegenerate = useCallback(() => onRegenerate?.(), [onRegenerate]);

  const moodLabel = useMemo(() => {
    const found = moods.find((m) => m.id === mood);
    if (!found) return mood;
    return i18n.language?.startsWith('en') ? found.label_en : found.label;
  }, [mood, i18n.language]);

  return (
    <View style={styles.card}>
      {/* Header: sparkles + AI NARRATES + mood badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={rs(16)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.aiLabel}>{t('diary.aiNarrates')}</Text>
        </View>
        <View style={[styles.moodBadge, { backgroundColor: `${moodVisual.color}15` }]}>
          <View style={[styles.moodDot, { backgroundColor: moodVisual.dotColor }]} />
          <Text style={[styles.moodText, { color: moodVisual.color }]}>
            {moodLabel}
          </Text>
          <Text style={styles.moodConfidence}>
            {formatConfidence(moodConfidence)}
          </Text>
        </View>
      </View>

      {/* Narration body — Sora italic, NOT Caveat (3rd person narrator) */}
      <Text style={styles.narrationText}>{narration}</Text>

      {/* Footer: signature + regenerate */}
      <View style={styles.footer}>
        <Text style={styles.signature}>{t('diary.aiSignature')}</Text>
        {onRegenerate && (
          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={handleRegenerate}
            activeOpacity={0.7}
          >
            <RefreshCw size={rs(14)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.regenerateText}>{t('diary.regenerate')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tags row */}
      {tags && tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((tag, index) => {
            const tagColor = getTagColor(index);
            return (
              <View
                key={tag}
                style={[styles.tagChip, { backgroundColor: `${tagColor}15` }]}
              >
                <Text style={[styles.tagText, { color: tagColor }]}>
                  {tag}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    borderLeftWidth: rs(4),
    borderLeftColor: colors.purple,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  aiLabel: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: fs(11),
    color: colors.purple,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(4),
    paddingHorizontal: rs(10),
    borderRadius: radii.sm,
    gap: rs(5),
  },
  moodDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  moodText: {
    fontFamily: 'Sora',
    fontWeight: '600',
    fontSize: fs(11),
  },
  moodConfidence: {
    fontFamily: 'JetBrains Mono',
    fontWeight: '500',
    fontSize: fs(10),
    color: colors.textDim,
  },
  narrationText: {
    fontFamily: 'Sora',
    fontWeight: '400',
    fontSize: fs(14),
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: fs(14) * 1.7,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  signature: {
    fontFamily: 'Sora',
    fontWeight: '500',
    fontSize: fs(11),
    color: colors.textDim,
    fontStyle: 'italic',
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    paddingVertical: rs(4),
    paddingHorizontal: rs(8),
  },
  regenerateText: {
    fontFamily: 'Sora',
    fontWeight: '600',
    fontSize: fs(12),
    color: colors.accent,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tagChip: {
    paddingVertical: rs(4),
    paddingHorizontal: rs(10),
    borderRadius: radii.sm,
  },
  tagText: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: fs(10),
    letterSpacing: 0.3,
  },
});

export default memo(NarrationBubble);
