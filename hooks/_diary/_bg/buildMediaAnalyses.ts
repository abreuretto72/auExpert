/**
 * buildMediaAnalyses — Build and persist the `media_analyses` JSONB array.
 *
 * Section "6. Build media_analyses array and save it" extracted verbatim from
 * backgroundClassify.ts. The helper mutates two arrays in place:
 *   - `mediaAnalysesArr`: the shared array declared in the shell (used later by
 *     insights + finalEntry fallback), so we push into it instead of returning.
 *   - `postSavePromises`: the shared promise bucket awaited via Promise.allSettled.
 *
 * Verbatim extraction — preserves 4 branches (A/B/C/D), all console.logs,
 * the inline Supabase update with its error handling, and the OCR-vs-text
 * classification selection logic.
 *
 * NOTE: The old streaming sibling `pushMediaAnalysis` (used by the
 * now-deleted `streamMediaRoutines.ts` during the FASE 4 fire-and-forget
 * experiment) has been removed along with the rest of that experiment —
 * the blocking-before-create flow only needs this batched writer.
 */
import type { ClassifyDiaryResponse } from '../../../lib/ai';
import { supabase } from '../../../lib/supabase';

export function buildMediaAnalyses(opts: {
  /** Mutated in place — section pushes photo/video/audio/document entries here. */
  mediaAnalysesArr: Array<Record<string, unknown>>;
  /** Mutated in place — the supabase.update save promise is pushed into this bucket. */
  postSavePromises: Promise<unknown>[];
  entryId: string;
  photoAnalysisResults: PromiseSettledResult<Record<string, unknown> | null>[] | null;
  photosBase64: string[] | null;
  uploadedPhotos: string[];
  uploadedVideoUrls: string[];
  videoThumbnailUrl: string | null;
  uploadedAudioUrl: string | null;
  uploadedDocUrl: string | null;
  audioOriginalName: string | undefined;
  mediaUris: string[] | undefined;
  ocrClassification: Record<string, unknown> | null;
  classification: ClassifyDiaryResponse;
  inputType: string;
}): void {
  const {
    mediaAnalysesArr, postSavePromises, entryId,
    photoAnalysisResults, photosBase64, uploadedPhotos, uploadedVideoUrls,
    videoThumbnailUrl, uploadedAudioUrl, uploadedDocUrl,
    audioOriginalName, mediaUris, ocrClassification, classification, inputType,
  } = opts;

  const photoResultsRaw = Array.isArray(photoAnalysisResults)
    ? (photoAnalysisResults as PromiseSettledResult<Record<string, unknown> | null>[])
        .map((r) => r.status === 'fulfilled' ? (r.value ?? null) : null)
    : [];

  // A) Fotos (not video/audio/ocr_scan — ocr_scan gets a 'document' item in section D instead)
  if (inputType !== 'video' && inputType !== 'pet_audio' && inputType !== 'ocr_scan' && uploadedPhotos.length > 0) {
    uploadedPhotos.forEach((photoUrl, idx) => {
      mediaAnalysesArr.push({ type: 'photo', mediaUrl: photoUrl, analysis: photoResultsRaw[idx] ?? null });
    });
  }

  // B) Vídeos — um subcard por vídeo
  uploadedVideoUrls.forEach((videoUrl, idx) => {
    const videoThumb = idx === 0 ? videoThumbnailUrl : null;
    const videoFrameAnalysis = idx === 0
      ? (photoResultsRaw[(photosBase64?.length ?? 0) + idx] ?? null)
      : null;
    mediaAnalysesArr.push({
      type: 'video',
      mediaUrl: videoUrl,
      thumbnailUrl: videoThumb,
      analysis: videoFrameAnalysis,
      videoAnalysis: idx === 0
        ? ((classification as Record<string, unknown>).video_analysis ?? null)
        : null,
    });
  });

  // C) Áudio
  if (uploadedAudioUrl) {
    // Use original filename from tutor's file pick — fall back to URI-derived name
    const audioFilename = audioOriginalName
      ?? (mediaUris ?? []).find((u) => /\.(m4a|aac|mp3|wav|ogg)$/i.test(u ?? ''))?.split('/').pop()
      ?? 'audio';
    mediaAnalysesArr.push({
      type: 'audio',
      mediaUrl: uploadedAudioUrl,
      fileName: audioFilename,
      petAudioAnalysis: (classification as Record<string, unknown>).pet_audio_analysis ?? null,
      analysis: null,
    });
  }

  // D) Documento OCR — two cases:
  //    1. Pure OCR entry (inputType === 'ocr_scan'): use main classify result + uploadedPhotos[0]
  //    2. Mixed entry (photos + scanned doc): use ocrClassification result + uploadedDocUrl
  const docMediaUrl = inputType === 'ocr_scan' ? uploadedPhotos[0] : uploadedDocUrl;
  // For ocr_scan: use ocrClassification (runOCRClassification result) which has ocr_data.fields.
  // Fall back to text classification only if OCR routine failed/skipped.
  // For mixed entries (photos + doc): ocrClassification is always the OCR source.
  const docOcrSource = inputType === 'ocr_scan'
    ? ((ocrClassification as Record<string, unknown> | null) ?? (classification as Record<string, unknown>))
    : ((ocrClassification as Record<string, unknown> | null) ?? null);

  if (docMediaUrl) {
    console.log('[OCR-MOD] docMediaUrl:', docMediaUrl?.slice(0, 60));
    console.log('[OCR-MOD] docOcrSource:', docOcrSource ? 'present' : 'null (OCR falhou — doc salvo sem campos)');
    if (docOcrSource) {
      console.log('[OCR-MOD] docOcrSource keys:', Object.keys(docOcrSource).join(', '));
      console.log('[OCR-MOD] document_type:', (docOcrSource as Record<string,unknown>).document_type);
      const _ocrData = (docOcrSource as Record<string,unknown>).ocr_data as Record<string,unknown> | undefined;
      console.log('[OCR-MOD] ocr_data.fields count:', (_ocrData?.fields as unknown[])?.length ?? 0);
      if ((_ocrData?.fields as unknown[])?.length) {
        console.log('[OCR-MOD] ocr_data first 3 fields:', JSON.stringify((_ocrData.fields as unknown[]).slice(0, 3)));
      } else {
        console.warn('[OCR-MOD] ocr_data.fields EMPTY | full ocr_data:', JSON.stringify(_ocrData));
      }
    }
    mediaAnalysesArr.push({
      type: 'document',
      mediaUrl: docMediaUrl,
      ocrData: {
        fields: (docOcrSource?.ocr_data as { fields?: Array<{key: string; value: string}> } | undefined)?.fields ?? [],
        document_type: (docOcrSource?.document_type as string) ?? 'other',
        items: (docOcrSource?.ocr_data as { items?: Array<{name: string; qty: number; unit_price: number}> } | undefined)?.items ?? undefined,
      },
      analysis: inputType === 'ocr_scan' ? (photoResultsRaw[0] ?? null) : null,
    });
  }

  if (mediaAnalysesArr.length > 0) {
    console.log('[S5] media_analyses:', mediaAnalysesArr.length, 'items', mediaAnalysesArr.map((m) => m.type));
    postSavePromises.push(
      supabase.from('diary_entries')
        .update({ media_analyses: mediaAnalysesArr })
        .eq('id', entryId)
        .then(({ error: updErr }) => {
          if (updErr) console.error('[S5] media_analyses UPDATE FALHOU:', updErr.code, updErr.message);
          else console.log('[S5] media_analyses salvo OK');
        }).catch((e) => console.error('[S5] media_analyses catch:', e)),
    );
  }
}

