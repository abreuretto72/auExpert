/**
 * handleSubmitText — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same body, same console.log messages (including
 * the [SUBMIT] series, the [handleSubmitText] media: diagnostic, and the
 * [S1] series), same ordering of submitEntry/router.back(), same deps
 * array, same parallel ImageManipulator compression (800px / 60% JPEG),
 * same inline-requires of expo-file-system/legacy and expo-image-manipulator,
 * same optional-chaining fix from commit 94f6ee4 (photo.localUri?.slice(-30)),
 * same mediaUris.filter((uri): uri is string => !!uri) narrowing.
 *
 * Note: `analyzeWithAI` is referenced inside the callback but is NOT in the
 * deps array — preserved verbatim (stale-closure semantics match original).
 *
 * Exposes `useHandleSubmitText(params)` — custom hook that returns the
 * useCallback handler.
 */
import { useCallback } from 'react';
import type { Attachment } from '../../../../../../components/diary/AttachmentThumb';
import type { SubmitEntryParams } from '../../../../../../hooks/useDiaryEntry';

type UseHandleSubmitTextParams = {
  tutorText: string;
  attachments: Attachment[];
  analyzeWithAI: boolean;
  submitEntry: (params: SubmitEntryParams) => Promise<void>;
  router: { back: () => void };
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useHandleSubmitText({
  tutorText,
  attachments,
  analyzeWithAI,
  submitEntry,
  router,
  toast,
  t,
}: UseHandleSubmitTextParams) {
  const handleSubmitText = useCallback(async () => {
    console.log('[SUBMIT] handleSubmitText chamado');
    console.log('[SUBMIT] attachments:', attachments.length);
    console.log('[handleSubmitText] media:', attachments.map((m) => m.type));
    attachments.forEach((a, i) => {
      console.log(`[SUBMIT] attachment[${i}]: type=${a.type} uri=${a.localUri?.slice(-30)} size=${a.fileSize}`);
    });

    const text = tutorText.trim();

    const hasContent = text.length >= 3 || attachments.length > 0;
    if (!hasContent) {
      toast(t('diary.contentMin'), 'warning');
      return;
    }

    const photoAttachments = attachments.filter((a) => a.type === 'photo');
    const videoAttachments = attachments.filter((a) => a.type === 'video');
    const audioAttachments = attachments.filter((a) => a.type === 'audio');
    const docAttachments   = attachments.filter((a) => a.type === 'document');

    // Determine inputType for classify:
    // fotos + vídeo → 'gallery' (prompt clínico vê fotos; hasVideo garante extração de frames)
    // só vídeo      → 'video'   (prompt de comportamento)
    let inputType = 'text';
    if (videoAttachments.length > 0 && photoAttachments.length > 0) {
      inputType = 'gallery';  // classify usa prompt clínico das fotos
    } else if (videoAttachments.length > 0) {
      inputType = 'video';
    } else if (audioAttachments.length > 0) {
      inputType = 'pet_audio';
    } else if (photoAttachments.length > 0) {
      inputType = 'gallery';
    } else if (docAttachments.length > 0 && tutorText.trim().length < 50) {
      // Pure document scan with no significant text → dedicated OCR prompt
      inputType = 'ocr_scan';
    }
    // When text + doc: inputType stays 'text' → inlineDocBase64 handles doc as secondary OCR call
    const hasVideo = videoAttachments.length > 0;

    // Log BEFORE base64 read so we know if crash is during read or before
    console.log('[S1] handleSubmitText iniciado');
    console.log('[S1] inputType:', inputType);
    console.log('[S1] photoAttachments:', photoAttachments.length);
    console.log('[S1] videoAttachments:', videoAttachments.length);
    console.log('[S1] audioAttachments:', audioAttachments.length);

    // Read base64 only for AI path — skip-AI doesn't need it (upload happens in background)
    // Max 3 photos for AI analysis — remaining photos (4-10) are upload-only (no AI)
    const photosForAI     = photoAttachments.slice(0, 3);
    const photosOnlyUpload = photoAttachments.slice(3);
    let photosBase64: string[] | null = null;
    if (analyzeWithAI && photosForAI.length > 0) {
      console.log('[S1] iniciando leitura de base64 (', photosForAI.length, 'fotos para IA,', photosOnlyUpload.length, 'só upload) em paralelo...');
      try {
        const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
        const ImageManipulator = require('expo-image-manipulator');
        const t0 = Date.now();
        // Comprime + lê base64 de todas as fotos em paralelo (antes era serial, 3x mais lento)
        const results = await Promise.all(
          photosForAI.map(async (photo) => {
            try {
              const compressed = await ImageManipulator.manipulateAsync(
                photo.localUri,
                [{ resize: { width: 800 } }],
                { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
              );
              const b64 = await readAsStringAsync(compressed.uri, { encoding: EncodingType.Base64 });
              if (b64) {
                console.log('[S1] foto pronta:', Math.round(b64.length * 0.75 / 1024), 'KB');
                return b64;
              }
            } catch (err) {
              console.warn('[S1] falha em 1 foto:', String(err));
            }
            return null;
          }),
        );
        const validResults = results.filter((b64): b64 is string => b64 !== null);
        console.log('[S1] compressão paralela completa:', validResults.length, '/', photosForAI.length, 'em', Date.now() - t0, 'ms');
        photosBase64 = validResults.length > 0 ? validResults : null;
      } catch (e) {
        console.warn('[S1] base64 read failed:', e);
        photosBase64 = null;
      }
    }

    // If OCR-only entry (no photos for AI) but a scanned document attachment has inline base64,
    // pass it directly as the OCR image (no photos in this case)
    if (photosBase64 === null && inputType === 'ocr_scan' && docAttachments.length > 0) {
      const docBase64 = docAttachments[0].base64;
      if (docBase64) photosBase64 = [docBase64];
    }

    // Extract inline doc base64 for ALL entries that have a scanned document attachment.
    // For ocr_scan: used by runOCRClassification to extract fields; upload is handled by the
    // OCR-specific path (analysisFramesCapped → uploadedPhotos[0]), not by DOC-ATTACH.
    // For mixed entries (photos + doc): pipeline uploads + OCR-classifies it separately.
    const inlineDocBase64 = docAttachments.length > 0
      ? (docAttachments[0].base64 ?? undefined)
      : undefined;

    // All attachment URIs: photos first, then video/audio (order matters for BG upload logic)
    const mediaUris = [
      ...photoAttachments.map((a) => a.localUri),
      ...videoAttachments.map((a) => a.localUri),
      ...audioAttachments.map((a) => a.localUri),
    ].filter((uri): uri is string => !!uri);

    const videoDuration = videoAttachments[0]?.duration
      ? Math.round(videoAttachments[0].duration) : undefined;
    const audioDuration = audioAttachments[0]?.duration
      ? Math.round(audioAttachments[0].duration) : undefined;

    console.log('[S1] submitEntry chamado | photosBase64:', photosBase64?.length ?? 0, '| mediaUris:', mediaUris.length, mediaUris);
    void submitEntry({
      text: text || null,
      photosBase64,
      inputType,
      mediaUris,
      videoDuration,
      audioDuration,
      audioOriginalName: audioAttachments[0]?.fileName,
      hasVideo,
      docBase64: inlineDocBase64,
      skipAI: !analyzeWithAI,
    });
    router.back();
  }, [tutorText, attachments, toast, t, submitEntry, router]);

  return handleSubmitText;
}
