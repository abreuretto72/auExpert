/**
 * Confirm handlers (from preview steps) — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same bodies, same console.warn messages,
 * same ordering of submitEntry/showAnalyzingAndBack, same deps arrays.
 *
 * Exposes `useConfirmHandlers(params)` — custom hook that returns the
 * five useCallback handlers (photo, gallery, video, audio, document).
 */
import { useCallback } from 'react';
import type { SubmitEntryParams } from '../../../../../../hooks/useDiaryEntry';
import type { DocType } from '../../../../../../components/diary/CapturePreview';

type UseConfirmHandlersParams = {
  captureCaption: string;
  capturedPhotoUri: string | null;
  capturedGalleryUris: string[];
  capturedVideoUri: string | null;
  capturedVideoDuration: number;
  capturedAudioUri: string | null;
  capturedAudioDuration: number;
  docType: DocType;
  capturedDocBase64: string | null;
  submitEntry: (params: SubmitEntryParams) => Promise<void>;
  showAnalyzingAndBack: () => void;
};

export function useConfirmHandlers({
  captureCaption,
  capturedPhotoUri,
  capturedGalleryUris,
  capturedVideoUri,
  capturedVideoDuration,
  capturedAudioUri,
  capturedAudioDuration,
  docType,
  capturedDocBase64,
  submitEntry,
  showAnalyzingAndBack,
}: UseConfirmHandlersParams) {
  const handleConfirmPhoto = useCallback(async () => {
    showAnalyzingAndBack();
    let b64: string | null = null;
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      b64 = await readAsStringAsync(capturedPhotoUri!, { encoding: EncodingType.Base64 });
    } catch (e) {
      console.warn('[handleConfirmPhoto] base64 read failed:', e);
    }
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: b64 ? [b64] : null,
      inputType: 'photo',
      mediaUris: [capturedPhotoUri!],
    });
  }, [captureCaption, capturedPhotoUri, submitEntry, showAnalyzingAndBack]);

  const handleConfirmGallery = useCallback(async () => {
    showAnalyzingAndBack();
    let galleryBase64: string[] | null = null;
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      const results: string[] = [];
      for (const uri of capturedGalleryUris) {
        const b64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
        if (b64) results.push(b64);
      }
      galleryBase64 = results.length > 0 ? results : null;
    } catch (e) {
      console.warn('[handleConfirmGallery] base64 read failed:', e);
    }
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: galleryBase64,
      inputType: 'gallery',
      mediaUris: capturedGalleryUris,
    });
  }, [captureCaption, capturedGalleryUris, submitEntry, showAnalyzingAndBack]);

  const handleConfirmVideo = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: null,
      inputType: 'video',
      mediaUris: [capturedVideoUri!],
      videoDuration: capturedVideoDuration,
    });
    showAnalyzingAndBack();
  }, [captureCaption, capturedVideoUri, capturedVideoDuration, submitEntry, showAnalyzingAndBack]);

  const handleConfirmAudio = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: null,
      inputType: 'pet_audio',
      mediaUris: [capturedAudioUri!],
      audioDuration: capturedAudioDuration,
    });
    showAnalyzingAndBack();
  }, [captureCaption, capturedAudioUri, capturedAudioDuration, submitEntry, showAnalyzingAndBack]);

  const handleConfirmDocument = useCallback(() => {
    // Pass docType as text so the classifier has explicit context
    void submitEntry({
      text: docType !== 'other' ? docType : null,
      photosBase64: [capturedDocBase64!],
      inputType: 'ocr_scan',
    });
    showAnalyzingAndBack();
  }, [docType, capturedDocBase64, submitEntry, showAnalyzingAndBack]);

  return {
    handleConfirmPhoto,
    handleConfirmGallery,
    handleConfirmVideo,
    handleConfirmAudio,
    handleConfirmDocument,
  };
}
