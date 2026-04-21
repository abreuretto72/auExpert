/**
 * DiaryNarration — read-only narration block for timeline diary cards.
 * Editing is done indirectly: tutor edits the original text → AI regenerates.
 * showDelete is only true when explicitly passed (e.g. never used currently).
 */
import React, { memo, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import PawIcon from '../PawIcon';

interface DiaryNarrationProps {
  entryId: string;
  narration: string;
  petName: string;
  onDeleted?: () => void;
  /** Show delete button — reserved for future use; currently always false */
  showDelete?: boolean;
}

const DiaryNarration = ({ entryId, narration, petName, onDeleted, showDelete = false }: DiaryNarrationProps) => {
  const { t } = useTranslation();
  const { confirm, toast } = useToast();
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDeleteNarration = useCallback(async () => {
    const yes = await confirm({ text: t('diary.deleteNarrationConfirm'), type: 'warning' });
    if (!yes) return;
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({ narration: null })
        .eq('id', entryId);
      if (error) throw error;
      setIsDeleted(true);
      toast(t('diary.narrationDeleted'), 'success');
      onDeleted?.();
    } catch {
      toast(t('errors.editFailed'), 'error');
    }
  }, [entryId, confirm, t, toast, onDeleted]);

  if (isDeleted) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PawIcon size={rs(14)} color={colors.accent} />
        <Text style={styles.title} numberOfLines={1}>
          {t('diary.petNarrates', { name: petName })}
        </Text>
        {showDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteNarration}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Trash2 size={rs(13)} color={colors.danger} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.narrationText}>{narration}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent + '08',
    borderWidth: 1,
    borderColor: colors.accent + '12',
    borderRadius: rs(radii.lg),
    padding: rs(spacing.sm + 4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(8),
  },
  title: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.accent,
    flex: 1,
  },
  deleteBtn: {
    padding: rs(2),
  },
  narrationText: {
    fontSize: fs(15),
    color: colors.textSec,
    lineHeight: rs(27),
  },
});

export default memo(DiaryNarration);
