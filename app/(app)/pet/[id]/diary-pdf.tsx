/**
 * DiaryPdfScreen — dedicated PDF preview/share screen for the pet diary.
 *
 * Opens the native print dialog immediately on mount.
 * Provides Download (print/save) and Share2 (share file) buttons.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download, Share2, BookOpen } from 'lucide-react-native';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { useDiary } from '../../../../hooks/useDiary';
import { useToast } from '../../../../components/Toast';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { moods } from '../../../../constants/moods';
import { diaryEntryToEvent, scheduledEventToTimelineEvent } from '../../../../components/diary/timelineTypes';
import { previewDiaryPdf, shareDiaryPdf } from '../../../../lib/diaryPdf';

export default function DiaryPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const { data: pet } = usePet(id!);
  const { entries, scheduledEvents, isLoading } = useDiary(id!);

  const [isGenerating, setIsGenerating] = useState(false);

  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  const getMoodLabel = useCallback((moodId: string | null | undefined): string => {
    if (!moodId) return '';
    const mood = moods.find((m) => m.id === moodId);
    if (!mood) return moodId;
    return isEnglish ? mood.label_en : mood.label;
  }, [isEnglish]);

  const timelineEvents = useMemo(() => {
    const events = [
      ...entries.map(diaryEntryToEvent),
      ...scheduledEvents.map(scheduledEventToTimelineEvent),
    ];
    events.sort((a, b) => b.sortDate - a.sortDate);
    return events;
  }, [entries, scheduledEvents]);

  const pdfOptions = useMemo(() => ({
    events: timelineEvents,
    petName: pet?.name ?? '',
    getMoodLabel,
  }), [timelineEvents, pet?.name, getMoodLabel]);

  // Auto-open print dialog on mount
  useEffect(() => {
    if (isLoading || !pet || entries.length === 0) return;
    let cancelled = false;
    (async () => {
      setIsGenerating(true);
      try {
        await previewDiaryPdf(pdfOptions);
      } catch {
        // silent — user can retry with button
      } finally {
        if (!cancelled) setIsGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pet?.id, entries.length]);

  const handlePreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      await previewDiaryPdf(pdfOptions);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [pdfOptions, toast]);

  const handleShare = useCallback(async () => {
    setIsGenerating(true);
    try {
      await shareDiaryPdf(pdfOptions);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [pdfOptions, toast]);

  // Loading state
  if (isLoading || !pet) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('diary.pdfExport')}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator color={colors.click} />
          <Text style={s.loadingText}>{t('diary.generating')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('diary.pdfTitle', { name: pet.name })}</Text>
        <View style={s.headerBtn} />
      </View>

      <View style={s.content}>
        {/* Preview illustration */}
        <View style={s.previewBox}>
          <View style={s.previewIconWrap}>
            <BookOpen size={rs(48)} color={colors.click} strokeWidth={1.3} />
          </View>
          <Text style={s.previewTitle}>{t('diary.pdfReady')}</Text>
          <Text style={s.previewSubtitle}>{t('diary.pdfReadySubtitle')}</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.click + '40' }]}
            onPress={handlePreview}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.clickSoft }]}>
              {isGenerating
                ? <ActivityIndicator color={colors.click} size="small" />
                : <Download size={rs(22)} color={colors.click} strokeWidth={1.8} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('diary.printOrSave')}</Text>
              <Text style={s.actionSubtitle}>{t('diary.printOrSaveHint')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.petrol + '40' }]}
            onPress={handleShare}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.petrolSoft }]}>
              <Share2 size={rs(22)} color={colors.petrol} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('diary.shareFile')}</Text>
              <Text style={s.actionSubtitle}>{t('diary.shareFileHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{t('diary.pdfDisclaimer')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(16), paddingVertical: rs(10),
    gap: rs(12), borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12) },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim },
  content: { flex: 1, padding: rs(24) },
  previewBox: { alignItems: 'center', padding: rs(32) },
  previewIconWrap: {
    width: rs(96), height: rs(96), borderRadius: rs(28),
    backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center',
    marginBottom: rs(16),
  },
  previewTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text, textAlign: 'center' },
  previewSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim,
    textAlign: 'center', marginTop: rs(8), lineHeight: fs(14) * 1.6,
  },
  actions: { gap: rs(12), marginTop: rs(8) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16),
    borderWidth: 1,
  },
  actionIcon: { width: rs(48), height: rs(48), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(15), color: colors.text },
  actionSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, marginTop: rs(2) },
  disclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim,
    textAlign: 'center', marginTop: rs(24),
  },
});
