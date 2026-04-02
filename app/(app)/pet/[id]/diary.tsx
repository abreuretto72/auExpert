/**
 * Diary screen — the pet's timeline of entries, AI narrations, and events.
 *
 * This screen is now a thin orchestrator that composes:
 * - DiaryTimeline (FlatList + filters + cards)
 * - PdfExportModal (PDF export with filters)
 *
 * Previously 1898 lines — now ~100 lines.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../../constants/colors';
import { useDiary } from '../../../../hooks/useDiary';
import { useDiaryEntry } from '../../../../hooks/useDiaryEntry';
import { usePet } from '../../../../hooks/usePets';
import { useToast } from '../../../../components/Toast';
import { moods } from '../../../../constants/moods';
import DiaryTimeline from '../../../../components/diary/DiaryTimeline';
import { OfflineBanner } from '../../../../components/ui/OfflineBanner';
import PdfExportModal from '../../../../components/diary/PdfExportModal';
import { diaryEntryToEvent } from '../../../../components/diary/timelineTypes';

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const { data: pet } = usePet(id!);
  const { entries, isLoading, refetch } = useDiary(id!);
  const { retryEntry } = useDiaryEntry(id!);
  const { toast } = useToast();

  const petName = pet?.name ?? '...';
  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  // ── PDF modal ──
  const [pdfModalVisible, setPdfModalVisible] = useState(false);

  const timelineEvents = useMemo(() => {
    const events = entries.map(diaryEntryToEvent);
    events.sort((a, b) => b.sortDate - a.sortDate);
    return events;
  }, [entries]);

  const getMoodData = useCallback(
    (moodId: string | null | undefined) => {
      if (!moodId) return null;
      const mood = moods.find((m) => m.id === moodId);
      if (!mood) return null;
      return { label: isEnglish ? mood.label_en : mood.label, color: mood.color };
    },
    [isEnglish],
  );

  const handleNewEntry = useCallback(() => {
    router.push(`/pet/${id}/diary/new`);
  }, [router, id]);

  const handleEditEntry = useCallback((entryId: string) => {
    router.push(`/pet/${id}/diary/${entryId}/edit` as never);
  }, [router, id]);

  const handleRetryEntry = useCallback((entryId: string) => {
    retryEntry(entryId).catch(() => {});
  }, [retryEntry]);

  const handleOpenPdf = useCallback(() => {
    if (timelineEvents.length === 0) {
      toast(t('diary.emptyTitle'), 'warning');
      return;
    }
    setPdfModalVisible(true);
  }, [timelineEvents.length, toast, t]);

  // ── Render ──

  return (
    <View style={styles.container}>
      <OfflineBanner petId={id!} />
      <DiaryTimeline
        entries={entries}
        isLoading={isLoading}
        petName={petName}
        petSpecies={pet?.species}
        petAvatarUrl={pet?.avatar_url}
        petCreatedAt={pet?.created_at}
        petPersonality={pet?.ai_personality}
        onRefresh={refetch}
        onNewEntry={handleNewEntry}
        onEditEntry={handleEditEntry}
        onRetryEntry={handleRetryEntry}
      />

      <PdfExportModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        events={timelineEvents}
        petName={petName}
        getMoodData={getMoodData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
