/**
 * skipAIPath — Fast-path save for entries with AI disabled (Tier B of backgroundClassify).
 *
 * When `opts.skipAI` is true (e.g., manual entry without IA routines), the
 * pipeline skips classification entirely and just persists the entry with
 * uploaded media URLs + default mood/tags. No narration, no lenses, no
 * embeddings beyond the raw-text one, no insights.
 *
 * Caller (backgroundClassifyAndSave) short-circuits with `return` after this
 * resolves — it always runs to completion even on errors (marks the entry
 * as 'error' in the cache rather than throwing).
 *
 * Verbatim extraction from backgroundClassify.ts — preserves all console.logs,
 * all error handling, all behavior.
 */
import type { useQueryClient } from '@tanstack/react-query';
import * as api from '../../../lib/api';
import { generateEmbedding } from '../../../lib/rag';
import { updatePendingStatus } from '../../../lib/localDb';
import { supabase } from '../../../lib/supabase';

export async function skipAIPath(opts: {
  qc: ReturnType<typeof useQueryClient>;
  petId: string;
  userId: string;
  queryKey: readonly string[];
  tempId: string;
  originalEntry: import('../../../types/database').DiaryEntry;
  text: string | null;
  inputType: string;
  uploadedPhotos: string[];
  uploadedVideoUrls: string[];
  videoThumbUrls: (string | null)[];
  uploadedAudioUrl: string | null;
  videoDuration: number | undefined;
  audioDuration: number | undefined;
  audioOriginalName: string | undefined;
  mediaUris: string[] | undefined;
}): Promise<void> {
  const {
    qc, petId, userId, queryKey, tempId, originalEntry, text, inputType,
    uploadedPhotos, uploadedVideoUrls, videoThumbUrls, uploadedAudioUrl,
    videoDuration, audioDuration, audioOriginalName, mediaUris,
  } = opts;

  try {
    const inputMethod: import('../../../types/database').DiaryEntry['input_method'] =
      inputType === 'ocr_scan' ? 'ocr_scan'
      : inputType === 'pdf' ? 'pdf'
      : ['photo', 'gallery'].includes(inputType) ? 'gallery'
      : inputType === 'voice' ? 'voice'
      : inputType === 'video' ? 'video'
      : inputType === 'audio' ? 'audio'
      : inputType === 'pet_audio' ? 'pet_audio'
      : 'text';

    const entryData = {
      pet_id: petId,
      user_id: userId,
      content: text ?? '(media)',
      input_method: inputMethod,
      mood_id: 'calm' as const,
      mood_score: 50,
      mood_source: 'manual' as const,
      tags: [] as string[],
      photos: uploadedPhotos,
      is_special: false,
    };
    const entryId = await api.createDiaryEntry(entryData);

    const extraFields: Record<string, unknown> = {
      input_type: inputType,
      primary_type: 'moment',
    };
    if (uploadedVideoUrls.length > 0) {
      extraFields.video_url = uploadedVideoUrls[0];
      extraFields.video_duration = videoDuration ?? null;
    }
    if (uploadedAudioUrl) {
      extraFields.audio_url = uploadedAudioUrl;
      extraFields.audio_duration = audioDuration ?? null;
    }

    const mediaAnalysesArr: Array<Record<string, unknown>> = [];
    if (inputType !== 'video' && inputType !== 'pet_audio' && uploadedPhotos.length > 0) {
      uploadedPhotos.forEach((url) => {
        mediaAnalysesArr.push({ type: 'photo', mediaUrl: url, analysis: null });
      });
    }
    uploadedVideoUrls.forEach((url, i) => {
      mediaAnalysesArr.push({ type: 'video', mediaUrl: url, thumbnailUrl: videoThumbUrls[i] ?? null, analysis: null, videoAnalysis: null });
    });
    if (uploadedAudioUrl) {
      const audioFilename = audioOriginalName
        ?? (mediaUris ?? []).find((u) => /\.(m4a|aac|mp3|wav|ogg)$/i.test(u ?? ''))?.split('/').pop()
        ?? 'audio';
      mediaAnalysesArr.push({ type: 'audio', mediaUrl: uploadedAudioUrl, fileName: audioFilename, petAudioAnalysis: null, analysis: null });
    }
    if (mediaAnalysesArr.length > 0) extraFields.media_analyses = mediaAnalysesArr;

    await supabase.from('diary_entries').update(extraFields).eq('id', entryId);

    generateEmbedding(petId, 'diary', entryId, text ?? '', 0.5, userId).catch(() => {});
    updatePendingStatus(tempId, 'synced');

    const { data: freshEntry } = await supabase
      .from('diary_entries')
      .select(`*, expenses:expenses!expenses_diary_entry_id_fkey(id, total, currency, category, notes, vendor), vaccines:vaccines!diary_entries_linked_vaccine_id_fkey(id, name, laboratory, veterinarian, clinic, date_administered, next_due_date, batch_number), consultations:consultations!diary_entries_linked_consultation_id_fkey(id, veterinarian, clinic, type, diagnosis, date), clinical_metrics:clinical_metrics!diary_entries_linked_weight_metric_id_fkey(id, metric_type, value, unit, measured_at), medications:medications!diary_entries_linked_medication_id_fkey(id, name, dosage, frequency, veterinarian)`)
      .eq('id', entryId)
      .single();

    const finalEntry = (freshEntry ?? {
      ...entryData,
      id: entryId,
      narration: null,
      entry_type: 'manual' as const,
      primary_type: 'moment',
      classifications: [],
      input_type: inputType,
      urgency: 'none',
      mood_confidence: null,
      is_registration_entry: false,
      linked_photo_analysis_id: null,
      entry_date: new Date().toISOString().split('T')[0],
      is_active: true,
      processing_status: 'done' as const,
      created_at: originalEntry.created_at,
      updated_at: new Date().toISOString(),
      video_url: uploadedVideoUrls[0] ?? null,
      audio_url: uploadedAudioUrl,
      media_analyses: mediaAnalysesArr.length > 0 ? mediaAnalysesArr : null,
    }) as import('../../../types/database').DiaryEntry;

    qc.setQueryData<import('../../../types/database').DiaryEntry[]>(queryKey, (old) => {
      const withoutTemp = (old ?? []).filter((e) => !e.id.startsWith('temp-'));
      return [finalEntry, ...withoutTemp];
    });
    setTimeout(() => {
      qc.fetchQuery({
        queryKey: ['pets', petId, 'diary'],
        queryFn: async () => {
          const { fetchDiaryEntries } = await import('../../../lib/api');
          const fresh = await fetchDiaryEntries(petId);
          if (fresh && fresh.length > 0) return fresh;
          return qc.getQueryData(['pets', petId, 'diary']) ?? [];
        },
      }).catch(() => {});
    }, 5000);

    qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
  } catch (err) {
    console.error('[SKIP-AI] save failed:', err);
    qc.setQueryData<import('../../../types/database').DiaryEntry[]>(queryKey, (old) =>
      old?.map((e) => e.id === tempId ? { ...e, processing_status: 'error' as const } : e) ?? [],
    );
  }
}
