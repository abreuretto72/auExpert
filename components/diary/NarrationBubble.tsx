import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Sparkles, RefreshCw, Pencil, Check, X } from 'lucide-react-native';
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
  onEdit?: (editedNarration: string) => void;
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
  onEdit,
}) => {
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const moodVisual = useMemo(() => getMoodVisual(mood), [mood]);
  const handleRegenerate = useCallback(() => onRegenerate?.(), [onRegenerate]);

  const handleEditStart = useCallback(() => {
    setEditText(narration);
    setIsEditing(true);
  }, [narration]);

  const handleEditConfirm = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed.length > 0) onEdit?.(trimmed);
    setIsEditing(false);
  }, [editText, onEdit]);

  const handleEditCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

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

      {/* Narration body */}
      {isEditing ? (
        <TextInput
          style={styles.editInput}
          value={editText}
          onChangeText={setEditText}
          multiline
          autoFocus
          maxLength={600}
          placeholderTextColor={colors.placeholder}
        />
      ) : (
        <Text style={styles.narrationText}>{narration}</Text>
      )}

      {/* Footer: signature + actions */}
      <View style={styles.footer}>
        {isEditing ? (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={handleEditCancel} activeOpacity={0.7}>
              <X size={rs(14)} color={colors.textDim} strokeWidth={2} />
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.confirmBtn]} onPress={handleEditConfirm} activeOpacity={0.7}>
              <Check size={rs(14)} color="#fff" strokeWidth={2} />
              <Text style={styles.confirmText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.signature}>{t('diary.aiSignature')}</Text>
            <View style={styles.footerActions}>
              {onEdit && (
                <TouchableOpacity style={styles.regenerateBtn} onPress={handleEditStart} activeOpacity={0.7}>
                  <Pencil size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                </TouchableOpacity>
              )}
              {onRegenerate && (
                <TouchableOpacity style={styles.regenerateBtn} onPress={handleRegenerate} activeOpacity={0.7}>
                  <RefreshCw size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                  <Text style={styles.regenerateText}>{t('diary.regenerate')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
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
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
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
    paddingVertical: rs(6),
    paddingHorizontal: rs(8),
  },
  regenerateText: {
    fontFamily: 'Sora',
    fontWeight: '600',
    fontSize: fs(12),
    color: colors.accent,
  },
  editInput: {
    fontFamily: 'Sora',
    fontWeight: '400',
    fontSize: fs(14),
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: fs(14) * 1.7,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.accent + '60',
    borderRadius: rs(10),
    padding: rs(10),
    marginBottom: spacing.sm,
    minHeight: rs(80),
    textAlignVertical: 'top',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    paddingVertical: rs(6),
    paddingHorizontal: rs(12),
    borderRadius: rs(8),
  },
  confirmBtn: {
    backgroundColor: colors.accent,
  },
  cancelText: {
    fontFamily: 'Sora',
    fontWeight: '600',
    fontSize: fs(12),
    color: colors.textDim,
  },
  confirmText: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: fs(12),
    color: '#fff',
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
