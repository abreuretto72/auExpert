/**
 * useDiaryEntry — Hook único de entrada para o diário (novo conceito).
 *
 * Substitui o fluxo antigo (input → mood → processing → preview → publish)
 * por: input → classify (1 chamada IA) → preview com cards de sugestão → save.
 *
 * A IA classifica, narra em 3ª pessoa, detecta humor e sugere módulos.
 */
import React from 'react';
import { useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/Toast';
import { classifyDiaryEntry } from '../lib/ai';
import type { ClassifyDiaryResponse } from '../lib/ai';
import * as api from '../lib/api';
import { generateEmbedding, updatePetRAG } from '../lib/rag';
import { addToQueue } from '../lib/offlineQueue';
import { savePendingEntry } from '../lib/localDb';
import { supabase } from '../lib/supabase';
import type { DiaryEntry } from '../types/database';
import i18n from '../i18n';
import type {
  SubmitEntryParams,
  PDFImportParams,
} from './_diary/types';
// Re-export for backward compatibility with any future external consumer.
export type { SubmitEntryParams, PDFImportParams };
import { saveToModule } from './_diary/saveToModule';
import { backgroundClassifyAndSave } from './_diary/backgroundClassify';

export function useDiaryEntry(petId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const queryKey = ['pets', petId, 'diary'] as const;

  // ── PDF classify (separate from step-based flow) ──
  const pdfClassifyMutation = useMutation({
    mutationFn: async (params: PDFImportParams): Promise<ClassifyDiaryResponse> => {
      return classifyDiaryEntry(
        petId,
        params.additionalText ?? null,
        null,
        'pdf_upload',
        i18n.language,
        params.pdfBase64,
      );
    },
  });

  // ── PDF import save (parent + N children) ──
  const pdfSaveMutation = useMutation({
    mutationFn: async (params: {
      pdfResult: ClassifyDiaryResponse;
      selectedClassifications: ClassifyDiaryResponse['classifications'];
      fileName: string;
    }) => {
      const { pdfResult, selectedClassifications, fileName } = params;

      // 1. Save parent entry (the PDF upload itself)
      const parentEntryId = await api.createDiaryEntry({
        pet_id: petId,
        user_id: user!.id,
        content: `PDF: ${fileName}`,
        input_method: 'text',
        mood_id: pdfResult.mood ?? 'calm',
        mood_score: Math.round((pdfResult.mood_confidence ?? 0.5) * 100),
        mood_source: 'ai_suggested' as const,
        tags: ['pdf-import'],
        photos: [],
        is_special: false,
      });

      // Update parent entry with input_type and narration
      const sb = supabase;
      await sb.from('diary_entries').update({
        input_type: 'pdf_upload',
        primary_type: pdfResult.primary_type,
        classifications: pdfResult.classifications,
        narration: pdfResult.narration,
        urgency: 'none',
      }).eq('id', parentEntryId);

      // 2. Save each selected classification as a child diary entry
      const childIds: string[] = [];
      for (const cls of selectedClassifications) {
        const childId = await api.createDiaryEntry({
          pet_id: petId,
          user_id: user!.id,
          content: `${cls.type}: ${JSON.stringify(cls.extracted_data).slice(0, 200)}`,
          input_method: 'text',
          mood_id: 'calm',
          mood_score: 50,
          mood_source: 'ai_suggested' as const,
          tags: ['pdf-import', cls.type],
          photos: [],
          is_special: false,
        });

        // Link to parent and set classification data
        await sb.from('diary_entries').update({
          parent_entry_id: parentEntryId,
          input_type: 'pdf_upload',
          primary_type: cls.type,
          classifications: [cls],
          urgency: 'none',
        }).eq('id', childId);

        childIds.push(childId);

        // Save to health module
        const mockClassification: ClassifyDiaryResponse = {
          ...pdfResult,
          primary_type: cls.type,
          classifications: [cls],
        };
        saveToModule(petId, user!.id, childId, mockClassification, qc).catch(() => {});
      }

      return { parentEntryId, childIds };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
    },
  });

  // ── Step 1: Classify (send to AI, get classifications + narration) ──
  const classifyMutation = useMutation({
    mutationFn: async (params: SubmitEntryParams): Promise<ClassifyDiaryResponse> => {
      if (!onlineManager.isOnline()) {
        // Offline fallback: return basic classification without AI
        return {
          classifications: [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
          primary_type: 'moment',
          narration: params.text ?? '',
          mood: 'calm',
          mood_confidence: 0.5,
          urgency: 'none',
          clinical_metrics: [],
          suggestions: [],
          tags_suggested: [],
          language: i18n.language,
          tokens_used: 0,
        };
      }

      return classifyDiaryEntry(
        petId,
        params.text,
        params.photosBase64,
        params.inputType,
        i18n.language,
      );
    },
  });

  // ── Step 2: Save entry (after tutor reviews classification) ──
  const saveMutation = useMutation({
    mutationFn: async (params: {
      text: string;
      inputType: string;
      classification: ClassifyDiaryResponse;
      photos?: string[];
      videoUri?: string;
      videoDuration?: number;
      audioUri?: string;
      audioDuration?: number;
    }) => {
      const { text, inputType, classification, photos, videoUri, videoDuration, audioUri, audioDuration } = params;

      const entryData = {
        pet_id: petId,
        user_id: user!.id,
        content: text || '(photo)',
        input_method: (inputType === 'photo' ? 'photo' : inputType === 'voice' ? 'voice' : 'text') as 'voice' | 'photo' | 'text',
        mood_id: classification.mood,
        mood_score: Math.round((classification.mood_confidence ?? 0.5) * 100),
        mood_source: 'ai_suggested' as const,
        tags: classification.tags_suggested ?? [],
        photos: photos ?? [],
        is_special: false,
      };

      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'createDiaryEntry',
          payload: entryData as unknown as Record<string, unknown>,
        });
        return {
          id: `temp-${Date.now()}`,
          ...entryData,
          narration: classification.narration,
          entry_type: 'manual' as const,
          input_type: inputType,
          primary_type: classification.primary_type,
          classifications: classification.classifications,
          urgency: classification.urgency,
          entry_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as DiaryEntry & { primary_type: string; classifications: unknown[]; urgency: string };
      }

      // Create entry via DB function
      const entryId = await api.createDiaryEntry(entryData);

      // Save narration
      if (classification.narration) {
        await api.updateDiaryNarration(
          entryId,
          classification.narration,
          Math.round((classification.mood_confidence ?? 0.5) * 100),
          classification.tags_suggested,
        );
      }

      // Update new diary_entries fields (classifications, primary_type, etc.)
      try {
        const { error } = await (await import('../lib/supabase')).supabase
          .from('diary_entries')
          .update({
            input_type: inputType,
            primary_type: classification.primary_type,
            classifications: classification.classifications,
            mood_confidence: classification.mood_confidence,
            urgency: classification.urgency,
          })
          .eq('id', entryId);
        if (error) console.warn('[useDiaryEntry] Update new fields failed:', error.message);
      } catch {
        // Non-critical — fields may not exist yet
      }

      // Upload video and save video_url / video_duration / video_analysis (non-blocking if fails)
      if (inputType === 'video' && videoUri) {
        try {
          const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
          const videoPath = await uploadPetMedia(user!.id, petId, videoUri, 'video');
          const videoUrl = getPublicUrl('pet-photos', videoPath);
          await supabase.from('diary_entries').update({
            video_url: videoUrl,
            video_duration: videoDuration ?? null,
            video_analysis: classification.video_analysis ?? null,
          }).eq('id', entryId);
        } catch (err) {
          console.warn('[useDiaryEntry] Video upload failed (non-critical):', err);
        }
      }

      // Upload audio and save audio_url / audio_duration / pet_audio_analysis (non-blocking if fails)
      if (inputType === 'pet_audio' && audioUri) {
        try {
          const { uploadPetMedia, getPublicUrl } = await import('../lib/storage');
          const audioPath = await uploadPetMedia(user!.id, petId, audioUri, 'video'); // reuse video bucket
          const audioUrl = getPublicUrl('pet-photos', audioPath);
          await supabase.from('diary_entries').update({
            audio_url: audioUrl,
            audio_duration: audioDuration ?? null,
            pet_audio_analysis: classification.pet_audio_analysis ?? null,
          }).eq('id', entryId);
        } catch (err) {
          console.warn('[useDiaryEntry] Audio upload failed (non-critical):', err);
        }
      }

      // Generate embedding (non-blocking)
      const embeddingText = classification.narration
        ? `${text}\n\n${classification.narration}`
        : text;
      generateEmbedding(petId, 'diary', entryId, embeddingText, 0.5, user!.id).catch(() => {});
      updatePetRAG(petId, user!.id, entryId, classification.classifications ?? []).catch(() => {});

      // Save to health module if IA classified a health type (non-blocking, best-effort)
      saveToModule(petId, user!.id, entryId, classification, qc).catch((err) =>
        console.warn('[useDiaryEntry] saveToModule failed (non-critical):', err),
      );

      // Check and award achievements (non-blocking, best-effort)
      import('../lib/achievements').then(({ checkAndAwardAchievements }) => {
        checkAndAwardAchievements(petId, user!.id, entryId).catch(() => {});
      }).catch(() => {});

      return {
        id: entryId,
        ...entryData,
        narration: classification.narration,
        entry_type: 'manual' as const,
        input_type: inputType,
        primary_type: classification.primary_type,
        classifications: classification.classifications,
        urgency: classification.urgency,
        entry_date: new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DiaryEntry & { primary_type: string; classifications: unknown[]; urgency: string };
    },
    onSuccess: (newEntry) => {
      // Remove any stale temp entries, then prepend the real entry
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) => {
        const withoutTemp = (old ?? []).filter((e) => !e.id.startsWith('temp-'));
        return [newEntry as DiaryEntry, ...withoutTemp];
      });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'expenses'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'metrics'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'achievements'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'travels'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'mood_trend'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'vaccines'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'consultations'] });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'insights'] });
    },
  });

  // ── submitEntry — optimistic insert + background classify + save ────────────
  // Inserts a temp "processing" entry into the cache immediately, then runs
  // classify + save in the background. The caller navigates away right after.
  const submitEntry = React.useCallback(async (params: SubmitEntryParams): Promise<void> => {
    if (!user?.id) return;

    const { text, photosBase64, inputType, hasVideo, mediaUris = [] } = params;
    console.log('[S1] submitEntry chamado | photosBase64:', photosBase64?.length ?? 0, '| mediaUris:', mediaUris.length);
    console.log('[S1] text length:', (text ?? '').length, '| preview:', (text ?? '').slice(0, 80));
    console.log('[S1] inputType:', inputType, '| hasVideo:', hasVideo);

    const tempId = `temp-${Date.now()}`;

    // OFFLINE FIRST — save locally before any network call
    savePendingEntry({
      id:               tempId,
      pet_id:           petId,
      input_text:       params.text,
      input_type:       params.inputType,
      photos_base64:    params.photosBase64,
      local_media_uris: params.mediaUris ?? null,
      created_at:       new Date().toISOString(),
    });
    // Mapeamento alinhado com a constraint diary_entries_input_method_check:
    // ['voice','text','gallery','video','audio','ocr_scan','pdf','pet_audio'].
    // 'photo' NÃO é valor válido no banco — por isso precisamos mapear
    // 'photo'/'gallery' → 'gallery' e 'ocr_scan' → 'ocr_scan' separadamente.
    // Padrão replicado de hooks/_diary/backgroundClassify.ts:415 e
    // hooks/_diary/_bg/skipAIPath.ts:48.
    const inputMethod: DiaryEntry['input_method'] =
      params.inputType === 'ocr_scan' ? 'ocr_scan'
      : params.inputType === 'pdf' ? 'pdf'
      : params.inputType === 'video' ? 'video'
      : params.inputType === 'audio' ? 'audio'
      : params.inputType === 'pet_audio' ? 'pet_audio'
      : ['photo', 'gallery'].includes(params.inputType) ? 'gallery'
      : params.inputType === 'voice' ? 'voice'
      : 'text';

    // M4 — split local mediaUris by kind so the temp entry surfaces each in
    // the right TimelineCards subcard (photo → PhotoSubcard,
    // video → VideoSubcard, audio → AudioSubcard). Before M4 we dumped every
    // URI into `photos`, so video/audio URIs rendered as broken images and
    // VideoSubcard/AudioSubcard never appeared until the upload finished.
    //
    // Matching strategy (mirrors the background upload in this file):
    //   - File extension for anything that has one (file:// on iOS; Android
    //     photos; gallery-picked videos).
    //   - inputType hint for Android content:// URIs from DocumentPicker,
    //     which lack extensions.
    const VIDEO_EXT_RE = /\.(mp4|mov|webm|m4v|avi|mkv|3gp)$/i;
    const AUDIO_EXT_RE = /\.(m4a|mp3|wav|aac|ogg|caf|amr)$/i;
    const rawUris = params.mediaUris ?? [];
    const photoUris: string[] = [];
    const videoUris: string[] = [];
    const audioUris: string[] = [];
    for (const u of rawUris) {
      if (!u) continue;
      const isContent = u.startsWith('content://');
      if (VIDEO_EXT_RE.test(u) || (isContent && params.inputType === 'video')) {
        videoUris.push(u);
      } else if (
        AUDIO_EXT_RE.test(u) ||
        (isContent && (params.inputType === 'pet_audio' || /audio/i.test(u)))
      ) {
        audioUris.push(u);
      } else {
        photoUris.push(u);
      }
    }
    console.log('[S1] split uris | photos:', photoUris.length, '| videos:', videoUris.length, '| audios:', audioUris.length);

    const tempEntry: DiaryEntry = {
      id: tempId,
      pet_id: petId,
      user_id: user.id,
      content: params.text ?? '(media)',
      input_method: inputMethod,
      input_type: params.inputType,
      narration: null,
      mood_id: 'calm',
      mood_score: null,
      mood_source: 'manual',
      entry_type: 'manual',
      tags: [],
      photos: photoUris,
      video_url: videoUris[0] ?? null,
      audio_url: audioUris[0] ?? null,
      is_special: false,
      is_registration_entry: false,
      linked_photo_analysis_id: null,
      entry_date: new Date().toISOString().split('T')[0],
      is_active: true,
      processing_status: 'processing' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insert into cache immediately so the timeline shows the entry right away
    qc.setQueryData<DiaryEntry[]>(queryKey, (old) => [tempEntry, ...(old ?? [])]);

    // M4 — generate a local thumbnail for the video, patch into the temp entry
    // as soon as it's ready. Stored in `video_thumb_url` (a virtual field on
    // DiaryEntry) so it doesn't pollute `photos[]` and trigger a duplicate
    // PhotoSubcard in the TimelineCards fallback path.
    // Fire-and-forget: if it fails, VideoSubcard still shows a play button
    // over a dark placeholder.
    const videoForThumb = videoUris[0];
    if (videoForThumb) {
      void (async () => {
        try {
          const VideoThumbnails = await import('expo-video-thumbnails');
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(
            videoForThumb,
            { time: 1000, quality: 0.3 },
          );
          if (!thumbUri) return;
          // Patch only the temp entry; if it's been replaced (real id) or
          // dropped, this no-ops.
          qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
            (old ?? []).map((e) =>
              e.id === tempId
                ? { ...e, video_thumb_url: thumbUri }
                : e,
            ),
          );
          console.log('[S1] video thumb ready for', tempId);
        } catch (err) {
          console.warn('[S1] video thumb failed (non-critical):', err);
        }
      })();
    }

    // Background: classify → save → update cache entry to done/error
    const cachedPets = qc.getQueryData<Array<{id: string; species?: string}>>(['pets']) ?? [];
    const petSpecies = cachedPets.find(p => p.id === petId)?.species ?? 'dog';

    void backgroundClassifyAndSave({
      qc, petId, userId: user.id, queryKey,
      tempId, originalEntry: tempEntry,
      text: params.text, photosBase64: params.photosBase64,
      inputType: params.inputType, photos: [],
      mediaUris: params.mediaUris,
      videoDuration: params.videoDuration,
      audioDuration: params.audioDuration,
      audioOriginalName: params.audioOriginalName,
      additionalContext: params.additionalContext,
      hasVideo: params.hasVideo,
      docBase64: params.docBase64,
      skipAI: params.skipAI,
      species: petSpecies,
      petName: cachedPets.find(p => p.id === petId)?.name ?? undefined,
      petBreed: cachedPets.find(p => p.id === petId)?.breed ?? undefined,
      toast,
    });
  }, [petId, user, qc, queryKey]);

  // ── retryEntry — re-run classify+save for a failed temp entry ───────────────
  const retryEntry = React.useCallback(async (tempId: string): Promise<void> => {
    if (!user?.id) return;
    const entry = (qc.getQueryData<DiaryEntry[]>(queryKey) ?? []).find((e) => e.id === tempId);
    if (!entry) return;

    // Set back to processing
    qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
      old?.map((e) => e.id === tempId ? { ...e, processing_status: 'processing' as const } : e) ?? [],
    );

    void backgroundClassifyAndSave({
      qc, petId, userId: user.id, queryKey,
      tempId, originalEntry: entry,
      text: entry.content, photosBase64: null,
      inputType: entry.input_method, photos: Array.isArray(entry.photos) ? entry.photos : [],
      toast,
    });
  }, [petId, user, qc, queryKey]);

  return {
    // Step 1: classify
    classify: classifyMutation.mutateAsync,
    isClassifying: classifyMutation.isPending,
    classificationResult: classifyMutation.data ?? null,
    classificationError: classifyMutation.error,

    // Step 2: save
    saveEntry: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,

    // Fire-and-forget submit (optimistic UI + background AI)
    submitEntry,
    retryEntry,

    // PDF import
    classifyPDF: pdfClassifyMutation.mutateAsync,
    isClassifyingPDF: pdfClassifyMutation.isPending,
    pdfResult: pdfClassifyMutation.data ?? null,
    savePDFImport: pdfSaveMutation.mutateAsync,
    isSavingPDF: pdfSaveMutation.isPending,

    // Reset
    reset: () => {
      classifyMutation.reset();
      saveMutation.reset();
      pdfClassifyMutation.reset();
      pdfSaveMutation.reset();
    },
  };
}
