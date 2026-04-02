/**
 * DiaryNarration — inline-editable narration block for timeline diary cards.
 * No regeneration (that lives in NarrationBubble for the new-entry flow).
 * Saves directly to diary_entries.narration on confirm.
 */
import React, { memo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Pencil, Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import PawIcon from '../PawIcon';

interface DiaryNarrationProps {
  entryId: string;
  narration: string;
  petName: string;
  onUpdated?: (newNarration: string) => void;
}

const DiaryNarration = ({ entryId, narration, petName, onUpdated }: DiaryNarrationProps) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditStart = useCallback(() => {
    setEditText(narration);
    setIsEditing(true);
  }, [narration]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditText('');
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === narration) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({ narration: trimmed, updated_at: new Date().toISOString() })
        .eq('id', entryId);
      if (!error) {
        onUpdated?.(trimmed);
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [editText, narration, entryId, onUpdated]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PawIcon size={rs(14)} color={colors.accent} />
        <Text style={styles.title} numberOfLines={1}>
          {t('diary.petNarrates', { name: petName })}
        </Text>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={handleEditStart}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Pencil size={rs(13)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>

      {isEditing ? (
        <>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            autoFocus
            maxLength={600}
            placeholderTextColor={colors.placeholder}
            selectionColor={colors.accent}
          />
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.7} disabled={isSaving}>
              <X size={rs(13)} color={colors.textDim} strokeWidth={2} />
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7} disabled={isSaving}>
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Check size={rs(13)} color="#fff" strokeWidth={2} />
              }
              <Text style={styles.saveText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.narrationText}>{narration}</Text>
      )}
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
  editBtn: {
    padding: rs(2),
  },
  narrationText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textSec,
    lineHeight: rs(27),
    fontStyle: 'italic',
  },
  editInput: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: rs(27),
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.accent + '50',
    borderRadius: rs(radii.md),
    padding: rs(10),
    minHeight: rs(80),
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    gap: rs(8),
    marginTop: rs(8),
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(6),
    paddingHorizontal: rs(10),
    borderRadius: rs(radii.md),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textDim,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(6),
    paddingHorizontal: rs(12),
    borderRadius: rs(radii.md),
    backgroundColor: colors.accent,
  },
  saveText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: '#fff',
  },
});

export default memo(DiaryNarration);
