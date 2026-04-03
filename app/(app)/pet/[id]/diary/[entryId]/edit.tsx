import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { ChevronLeft, Check, Trash2 } from 'lucide-react-native';
import { supabase } from '../../../../../../lib/supabase';
import { useToast } from '../../../../../../components/Toast';
import DiaryNarration from '../../../../../../components/diary/DiaryNarration';
import { DiaryModuleCard } from '../../../../../../components/diary/DiaryModuleCard';
import { colors } from '../../../../../../constants/colors';
import { rs, fs } from '../../../../../../hooks/useResponsive';
import { moods, type MoodId } from '../../../../../../constants/moods';
import type { DiaryEntry } from '../../../../../../types/database';

// ── Types ────────────────────────────────────────────────────────────────────

type ModuleRow = Record<string, unknown> & { id: string };

const MODULE_TYPE_TO_KEY: Record<string, string> = {
  vaccine:      'vaccines',
  consultation: 'consultations',
  return_visit: 'consultations',
  expense:      'expenses',
  weight:       'clinical_metrics',
  medication:   'medications',
};

// ── Full select matching api.ts DIARY_MODULE_SELECT ───────────────────────────

const EDIT_SELECT = `
  id, content, mood_id, narration, classifications, processing_status, tags, is_special,
  expenses(id, total, currency, category, notes, vendor),
  vaccines(id, name, laboratory, veterinarian, clinic, date_administered, next_due_date, batch_number),
  consultations(id, veterinarian, clinic, type, diagnosis, date),
  clinical_metrics(id, metric_type, value, unit, measured_at),
  medications(id, name, dosage, frequency, veterinarian)
`.trim();

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DiaryEntryEditScreen() {
  const { id, entryId, prefillContent, prefillMoodId } = useLocalSearchParams<{
    id: string;
    entryId: string;
    prefillContent?: string;
    prefillMoodId?: string;
  }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast, confirm } = useToast();
  const qc = useQueryClient();

  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  const { data: entry, isLoading } = useQuery({
    queryKey: ['pets', id, 'diary', 'edit', entryId],
    queryFn: async () => {
      // Try full join first (mirrors api.ts DIARY_MODULE_SELECT pattern)
      const { data, error } = await supabase
        .from('diary_entries')
        .select(EDIT_SELECT)
        .eq('id', entryId!)
        .single();

      if (!error) {
        return data as DiaryEntry & {
          expenses: ModuleRow[];
          vaccines: ModuleRow[];
          consultations: ModuleRow[];
          clinical_metrics: ModuleRow[];
          medications: ModuleRow[];
        };
      }

      // Fallback to simple select if FK relationships fail (e.g. missing join)
      const { data: simple, error: simpleError } = await supabase
        .from('diary_entries')
        .select('id, content, mood_id, narration, classifications, processing_status, tags, is_special')
        .eq('id', entryId!)
        .single();
      if (simpleError) throw simpleError;
      return simple as DiaryEntry & {
        expenses: ModuleRow[];
        vaccines: ModuleRow[];
        consultations: ModuleRow[];
        clinical_metrics: ModuleRow[];
        medications: ModuleRow[];
      };
    },
    enabled: !!entryId,
  });

  // Initialise immediately from prefill params (passed by diary.tsx from cache)
  const [text, setText] = useState(prefillContent ?? '');
  const [moodId, setMoodId] = useState<MoodId | null>((prefillMoodId as MoodId) || null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (entry && !initialised) {
      // Only override if prefill was empty (e.g. entry not in cache when navigating)
      if (!prefillContent && entry.content) setText(entry.content);
      if (!prefillMoodId && entry.mood_id) setMoodId(entry.mood_id as MoodId);
      setInitialised(true);
    }
  }, [entry, initialised, prefillContent, prefillMoodId]);

  const isDirty = entry
    ? text !== (entry.content ?? '') || moodId !== ((entry.mood_id as MoodId) ?? null)
    : false;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function resolveModuleRow(type: string, index: number): ModuleRow | undefined {
    if (!entry) return undefined;
    const key = MODULE_TYPE_TO_KEY[type];
    if (!key) return undefined;
    const arr = (entry as Record<string, unknown>)[key] as ModuleRow[] | undefined;
    if (!arr || arr.length === 0) return undefined;
    return arr[index] ?? arr[0];
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleBack = useCallback(async () => {
    if (isDirty) {
      const discard = await confirm({ text: t('diary.discardEdit'), type: 'warning' });
      if (!discard) return;
    }
    router.back();
  }, [isDirty, confirm, t, router]);

  // ── Delete entry ───────────────────────────────────────────────────────────

  const handleDeleteEntry = useCallback(async () => {
    const yes = await confirm({ text: t('diary.deleteConfirmDiary'), type: 'warning' });
    if (!yes) return;
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({ is_active: false })
        .eq('id', entryId!);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['pets', id, 'diary'] });
      toast(t('diary.deleted'), 'success');
      router.back();
    } catch {
      toast(t('diary.deleteFailed'), 'error');
    }
  }, [entryId, id, confirm, t, qc, toast, router]);

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!entryId) return;
    const newText = text.trim();
    const oldText = (entry?.content ?? '').trim();
    const textCleared = newText === '';
    const textChanged = newText !== oldText;
    setIsSaving(true);

    // Tables with diary_entry_id FK (only these can be soft-deleted by entry)
    const MODULE_TABLES = ['expenses', 'clinical_metrics'] as const;

    try {
      if (textCleared) {
        // Tutor apagou o texto — limpar tudo
        await supabase.from('diary_entries').update({
          content: null,
          mood_id: moodId ?? null,
          narration: null,
          classifications: [],
          processing_status: 'done',
        }).eq('id', entryId!);

        Promise.all(
          MODULE_TABLES.map((table) =>
            supabase.from(table).update({ is_active: false }).eq('diary_entry_id', entryId!),
          ),
        ).catch(() => {});

        qc.invalidateQueries({ queryKey: ['pets', id, 'diary'] });
        toast(t('diary.editEntry.cleared'), 'success');
        router.back();

      } else if (textChanged) {
        // Tutor editou o texto — reprocessar com IA
        await supabase.from('diary_entries').update({
          content: newText,
          mood_id: moodId ?? null,
          narration: null,
          classifications: [],
          processing_status: 'processing',
        }).eq('id', entryId!);

        // Soft-delete módulos linkados à entry (fire-and-forget)
        Promise.all(
          MODULE_TABLES.map((table) =>
            supabase.from(table).update({ is_active: false }).eq('diary_entry_id', entryId!),
          ),
        ).catch(() => {});

        // Optimistic cache update
        qc.setQueryData<DiaryEntry[]>(['pets', id, 'diary'], (old) =>
          (old ?? []).map((e) => e.id === entryId
            ? { ...e, content: newText, narration: null, classifications: [], processing_status: 'processing' }
            : e),
        );

        toast(t('diary.editEntry.reprocessing'), 'info');
        router.back();

        // Reprocessar em background (fire-and-forget)
        const language = getLocales()[0]?.languageTag ?? 'pt-BR';
        supabase.functions.invoke('classify-diary-entry', {
          body: { pet_id: id, text: newText, language },
        }).then(({ data: result }) => {
          if (!result) return;
          return supabase.from('diary_entries').update({
            narration:         result.narration ?? null,
            classifications:   result.classifications ?? [],
            primary_type:      result.primary_type ?? null,
            mood_id:           result.mood ?? moodId ?? null,
            processing_status: 'done',
          }).eq('id', entryId!);
        }).then(() => {
          qc.invalidateQueries({ queryKey: ['pets', id, 'diary'] });
        }).catch(() => {
          supabase.from('diary_entries').update({ processing_status: 'done' }).eq('id', entryId!);
          qc.invalidateQueries({ queryKey: ['pets', id, 'diary'] });
        });

      } else {
        // Só mood mudou
        await supabase.from('diary_entries').update({ mood_id: moodId ?? null }).eq('id', entryId!);
        qc.invalidateQueries({ queryKey: ['pets', id, 'diary'] });
        toast(t('toast.editSaved'), 'success');
        router.back();
      }
    } catch {
      toast(t('errors.editFailed'), 'error');
    } finally {
      setIsSaving(false);
    }
  }, [entryId, text, moodId, entry, id, qc, toast, t, router]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const classifications = (entry?.classifications as Array<{ type: string; confidence: number; extracted_data: Record<string, unknown> }> | null) ?? [];
  const visibleClassifications = classifications.filter((c) => c.confidence >= 0.5);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={handleBack} style={s.headerBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('diary.editTitle')}</Text>
        <TouchableOpacity onPress={handleDeleteEntry} style={s.deleteBtn} activeOpacity={0.7}>
          <Trash2 size={rs(18)} color={colors.danger} strokeWidth={1.8} />
        </TouchableOpacity>
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
          {/* Original text */}
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
          />
          <Text style={s.charCount}>{text.length}/2000</Text>

          {/* AI narration — read-only */}
          {entry?.narration ? (
            <View style={s.narrationWrapper}>
              <DiaryNarration
                entryId={entryId!}
                narration={entry.narration}
                petName=""
              />
            </View>
          ) : null}

          {/* Module cards — read-only */}
          {visibleClassifications.length > 0 && (
            <View style={s.moduleSection}>
              <Text style={s.label}>{t('diary.editModulesLabel')}</Text>
              {visibleClassifications.map((cls, idx) => {
                const moduleRow = resolveModuleRow(cls.type, idx);
                return (
                  <DiaryModuleCard
                    key={`${cls.type}-${idx}`}
                    classification={cls}
                    moduleRow={moduleRow}
                    t={t}
                  />
                );
              })}
            </View>
          )}

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

// ── Styles ────────────────────────────────────────────────────────────────────

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
  deleteBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    backgroundColor: 'rgba(231,76,60,0.10)',
    borderWidth: 1,
    borderColor: colors.danger + '30',
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
  narrationWrapper: {
    marginTop: rs(4),
  },
  moduleSection: {
    marginTop: rs(4),
    gap: rs(8),
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
