/**
 * Confirm handlers (from preview steps) — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same bodies, same console.warn messages,
 * same ordering of submitEntry/showAnalyzingAndBack, same deps arrays.
 *
 * Exposes `useConfirmHandlers(params)` — custom hook that returns the
 * five useCallback handlers (photo, gallery, video, audio, document).
 *
 * Bug histórico (corrigido 2026-04-27 — Elite-grade fix):
 *   Tutor escrevia "Tiao fez amizade com Bobby" e anexava foto do Bobby —
 *   o pipeline clínico analisava o Bobby como se fosse o Tiao. Resolvido
 *   passando texto + dados do pet titular ao classify-photo-intent. Quando
 *   a EF detecta foto de OUTRO pet com alta confiança:
 *     - aiFlags.analyzePhotos = false (pula análise clínica)
 *     - additionalContext sinaliza ao classificador que a foto é de amigo
 *     - persistConnection ainda extrai o amigo do texto normalmente
 */
import { useCallback } from 'react';
import type { SubmitEntryParams } from '../../../hooks/useDiaryEntry';
import { AI_FLAGS_ALL_ON } from '../../../hooks/_diary/types';
import type { DocType } from '../../../components/diary/CapturePreview';
import {
  classifyPhotoIntent,
  shouldRouteToOCR,
  shouldSkipClinicalAnalysis,
} from '../../../lib/photoIntent';

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
  /** Nome do pet titular do diário — usado pelo pre-classify pra distinguir foto do pet vs foto de amigo. */
  petName?: string | null;
  /** Raça do pet titular — sinal extra pra classify-photo-intent. */
  petBreed?: string | null;
  submitEntry: (params: SubmitEntryParams) => Promise<void>;
  showAnalyzingAndBack: () => void;
};

/** Mensagem que vai como [CONTEXT: ...] pro classify-diary-entry quando other_pet detectado. */
const OTHER_PET_CONTEXT_MSG =
  'ATTENTION: The attached photo shows a DIFFERENT pet (a friend the subject pet interacted with) — NOT the subject pet of this diary. Do NOT analyze the photo as the subject pet\'s clinical state. Use the text to extract friend information for pet_connections, but never assign breed, weight, or health findings from the photo to the subject pet.';

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
  petName,
  petBreed,
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

    // Pre-check com contexto do pet titular: detecta documento OU foto de
    // outro pet (amigo). Em caso de erro/timeout, segue o fluxo original.
    const tutorText = captureCaption.trim();
    let inputType: SubmitEntryParams['inputType'] = 'photo';
    let extraParams: Partial<SubmitEntryParams> = {};
    if (b64) {
      const intent = await classifyPhotoIntent(b64, {
        textContext: tutorText || null,
        subjectPetName: petName ?? null,
        subjectPetBreed: petBreed ?? null,
      });
      if (shouldRouteToOCR(intent)) {
        console.log('[handleConfirmPhoto] doc detected → routing to OCR', { conf: intent.confidence });
        inputType = 'ocr_scan';
      } else if (shouldSkipClinicalAnalysis(intent)) {
        console.log('[handleConfirmPhoto] OTHER PET detected → skipping clinical analysis', {
          conf: intent.confidence, reason: intent.reason, subject: petName,
        });
        extraParams = {
          additionalContext: OTHER_PET_CONTEXT_MSG,
          aiFlags: { ...AI_FLAGS_ALL_ON, analyzePhotos: false },
        };
      }
    }

    void submitEntry({
      text: tutorText || null,
      photosBase64: b64 ? [b64] : null,
      inputType,
      mediaUris: [capturedPhotoUri!],
      ...extraParams,
    });
  }, [captureCaption, capturedPhotoUri, petName, petBreed, submitEntry, showAnalyzingAndBack]);

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

    // Pre-check com contexto do pet titular: usamos a primeira imagem como
    // amostra (raro misturar foto pet + caderneta + amigo no mesmo upload).
    const tutorText = captureCaption.trim();
    let inputType: SubmitEntryParams['inputType'] = 'gallery';
    let extraParams: Partial<SubmitEntryParams> = {};
    if (galleryBase64 && galleryBase64.length > 0) {
      const intent = await classifyPhotoIntent(galleryBase64[0], {
        textContext: tutorText || null,
        subjectPetName: petName ?? null,
        subjectPetBreed: petBreed ?? null,
      });
      if (shouldRouteToOCR(intent)) {
        console.log('[handleConfirmGallery] doc detected → routing to OCR', { conf: intent.confidence });
        inputType = 'ocr_scan';
      } else if (shouldSkipClinicalAnalysis(intent)) {
        console.log('[handleConfirmGallery] OTHER PET detected → skipping clinical analysis', {
          conf: intent.confidence, reason: intent.reason, subject: petName,
        });
        extraParams = {
          additionalContext: OTHER_PET_CONTEXT_MSG,
          aiFlags: { ...AI_FLAGS_ALL_ON, analyzePhotos: false },
        };
      }
    }

    void submitEntry({
      text: tutorText || null,
      photosBase64: galleryBase64,
      inputType,
      mediaUris: capturedGalleryUris,
      ...extraParams,
    });
  }, [captureCaption, capturedGalleryUris, petName, petBreed, submitEntry, showAnalyzingAndBack]);

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
