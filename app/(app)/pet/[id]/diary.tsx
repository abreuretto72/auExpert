/**
 * Diary screen — the pet's timeline of entries, AI narrations, and events.
 *
 * This screen is now a thin orchestrator that composes:
 * - DiaryTimeline (FlatList + filters + cards)
 * PDF export navigates to diary-pdf.tsx (dedicated screen)
 *
 * Previously 1898 lines — now ~100 lines.
 */

import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../../constants/colors';
import { useDiary } from '../../../../hooks/useDiary';
import { useDiaryEntry } from '../../../../hooks/useDiaryEntry';
import { usePet } from '../../../../hooks/usePets';
import { useToast } from '../../../../components/Toast';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { SectionErrorBoundary } from '../../../../components/SectionErrorBoundary';
import DiaryTimeline from '../../../../components/diary/DiaryTimeline';
import { OfflineBanner } from '../../../../components/ui/OfflineBanner';
import { diaryEntryToEvent, scheduledEventToTimelineEvent } from '../../../../components/diary/timelineTypes';

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const { data: pet } = usePet(id!);
  const { entries, isLoading, refetch, scheduledEvents } = useDiary(id!);
  const { retryEntry } = useDiaryEntry(id!);
  const { toast } = useToast();

  const petName = pet?.name ?? '...';

  const timelineEvents = useMemo(() => {
    const events = [
      ...entries.map(diaryEntryToEvent),
      ...scheduledEvents.map(scheduledEventToTimelineEvent),
    ];
    events.sort((a, b) => b.sortDate - a.sortDate);
    return events;
  }, [entries, scheduledEvents]);

  const handleNewEntry = useCallback(() => {
    router.push(`/pet/${id}/diary/new`);
  }, [router, id]);

  const handleEditEntry = useCallback((entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    router.push({
      pathname: `/pet/${id}/diary/${entryId}/edit` as never,
      params: {
        prefillContent: entry?.content ?? '',
        prefillMoodId: entry?.mood_id ?? '',
      },
    });
  }, [router, id, entries]);

  const handleRetryEntry = useCallback((entryId: string) => {
    retryEntry(entryId).catch((err) => toast(getErrorMessage(err), 'error'));
  }, [retryEntry, toast]);

  const handleOpenPdf = useCallback(() => {
    if (timelineEvents.length === 0) {
      toast(t('diary.emptyTitle'), 'warning');
      return;
    }
    router.push(`/pet/${id}/diary-pdf`);
  }, [timelineEvents.length, toast, t, router, id]);

  // ── Render ──

  return (
    <View style={styles.container}>
      <OfflineBanner petId={id!} />
      <SectionErrorBoundary sectionName="diary" resetKeys={[id]} onReset={refetch}>
        <DiaryTimeline
          entries={entries}
          scheduledEvents={scheduledEvents}
          isLoading={isLoading}
          petId={id!}
          petName={petName}
          petSex={pet?.sex}
          petSpecies={pet?.species}
          petAvatarUrl={pet?.avatar_url}
          petCreatedAt={pet?.created_at}
          onRefresh={refetch}
          onNewEntry={handleNewEntry}
          onEditEntry={handleEditEntry}
          onRetryEntry={handleRetryEntry}
          onOpenPdf={handleOpenPdf}
        />
      </SectionErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
