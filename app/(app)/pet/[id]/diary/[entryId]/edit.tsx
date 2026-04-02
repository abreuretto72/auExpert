import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check } from 'lucide-react-native';
import { supabase } from '../../../../../../lib/supabase';
import * as api from '../../../../../../lib/api';
import { useToast } from '../../../../../../components/Toast';
import { colors } from '../../../../../../constants/colors';
import { rs, fs } from '../../../../../../hooks/useResponsive';
import { moods, type MoodId } from '../../../../../../constants/moods';

export default function DiaryEntryEditScreen() {
  const { id, entryId } = useLocalSearchParams<{ id: string; entryId: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast, confirm } = useToast();
  const qc = useQueryClient();

  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  const { data: entry, isLoading } = useQuery({
    queryKey: ['pets', id, 'diary', 'edit', entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('id, content, mood_id, narration, tags, is_special')
        .eq('id', entryId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!entryId,
  });

  const [text, setText] = useState('');
  const [moodId, setMoodId] = useState<MoodId | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (entry && !initialised.current) {
      setText(entry.content ?? '');
      setMoodId((entry.mood_id as MoodId) ?? null);
      initialised.current = true;
    }
  }, [entry]);

  const isDirty = entry
    ? text !== (entry.content ?? '') || moodId !== ((entry.mood_id as MoodId) ?? null)
    : false;

  const handleBack = useCallback(async () => {
    if (isDirty) {
      const discard = await confirm({ text: t('diary.discardEdit'), type: 'warning' });
      if (!discard) return;
    }
    router.back();
  }, [isDirty, confirm, t, router]);

  const handleSave = useCallback(async () => {
    if (!entryId || !text.trim()) return;
    setIsSaving(true);
    try {
      await api.updateDiaryEntry(entryId, {
        content: text.trim(),
        mood_id: moodId ?? undefined,
      });
      qc.invalidateQueries({ queryKey: ['pets', id, 'diary'] });
      toast(t('toast.editSaved'), 'success');
      router.back();
    } catch {
      toast(t('errors.editFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [entryId, text, moodId, qc, id, toast, t, router]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.headerBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('diary.editTitle')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={s.headerBtn}
          disabled={isSaving || !isDirty}
          activeOpacity={0.7}
        >
          {isSaving
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Check size={rs(20)} color={isDirty ? colors.accent : colors.textDim} strokeWidth={2} />
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={rs(80)}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Content input */}
          <Text style={s.label}>{t('diary.editContentLabel')}</Text>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder={t('diary.editContentPlaceholder')}
            placeholderTextColor={colors.placeholder}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            autoFocus
          />
          <Text style={s.charCount}>{text.length}/2000</Text>

          {/* Mood selector */}
          <Text style={s.label}>{t('diary.editMoodLabel')}</Text>
          <View style={s.moodGrid}>
            {moods.map((mood) => {
              const isActive = moodId === mood.id;
              return (
                <TouchableOpacity
                  key={mood.id}
                  style={[s.moodChip, isActive && { borderColor: mood.color, backgroundColor: mood.color + '22' }]}
                  onPress={() => setMoodId(mood.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.moodLabel, isActive && { color: mood.color }]}>
                    {isEnglish ? mood.label_en : mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[s.saveButton, (!isDirty || isSaving) && s.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || !isDirty}
            activeOpacity={0.8}
          >
            {isSaving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.saveButtonText}>{t('diary.editSave')}</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    gap: rs(12),
  },
  headerBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
    textAlign: 'center',
  },
  scroll: {
    padding: rs(16),
    paddingBottom: rs(40),
    gap: rs(8),
  },
  label: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: rs(8),
    marginTop: rs(8),
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: rs(12),
    padding: rs(16),
    fontFamily: 'Sora_400Regular',
    fontSize: fs(15),
    color: colors.text,
    minHeight: rs(160),
    lineHeight: fs(22),
  },
  charCount: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    textAlign: 'right',
    marginTop: rs(4),
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  moodChip: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(12),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  moodLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.textSec,
  },
  saveButton: {
    marginTop: rs(24),
    backgroundColor: colors.accent,
    borderRadius: rs(14),
    paddingVertical: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: '#fff',
  },
});
