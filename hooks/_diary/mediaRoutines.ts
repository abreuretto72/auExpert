/**
 * mediaRoutines.ts — Rotinas independentes de análise de mídia para o diário.
 *
 * Cada rotina:
 *   - Aceita inputs tipados e explícitos
 *   - Tem seu próprio timeout independente
 *   - NUNCA lança exceção — erros são convertidos em RoutineOutcome
 *   - Retorna RoutineOutcome<T>: ok | skipped | timeout | error
 *
 * O orquestrador em useDiaryEntry.ts usa Promise.all() sobre essas rotinas.
 * Como nenhuma lança, o Promise.all não cancela as demais em caso de falha.
 *
 * Timeouts por tipo:
 *   - Texto (classify):  30s
 *   - Fotos (per-frame): 30s total (análise em paralelo por foto)
 *   - Vídeo (classify):  45s (análise mais pesada, Gemini nativo)
 *   - Áudio (classify):  30s
 *   - OCR   (classify):  55s (pode ter muitos campos para extrair)
 */

import { supabase } from '../../lib/supabase';
import { classifyTextOnly, classifyVideo, classifyPetAudio, classifyOCR } from '../../lib/ai';
import { withTimeout, TimeoutError } from './withTimeout';
import type {
  TextClassificationOutcome,
  PhotoAnalysesOutcome,
  VideoClassificationOutcome,
  AudioClassificationOutcome,
  OCRClassificationOutcome,
} from './types';

// ── Timeouts por tipo (ms) ─────────────────────────────────────────────────────

const TIMEOUT_TEXT_MS  = 30_000;
const TIMEOUT_PHOTO_MS = 30_000;
const TIMEOUT_VIDEO_MS = 45_000;
const TIMEOUT_AUDIO_MS = 30_000;
const TIMEOUT_OCR_MS   = 55_000;

// ── runTextClassification ──────────────────────────────────────────────────────

export interface TextClassificationInput {
  petId:      string;
  text:       string;
  language:   string;
  authHeader: Record<string, string>;
}

/**
 * Gera narração, classificações, mood, urgência e tags a partir do texto.
 * Retorna 'skipped' com reason 'no_input' quando text está vazio.
 */
export async function runTextClassification(
  input: TextClassificationInput,
): Promise<TextClassificationOutcome> {
  if (!input.text?.trim()) {
    return { status: 'skipped', reason: 'no_input' };
  }
  try {
    const value = await withTimeout(
      classifyTextOnly(input.petId, input.text, input.language, input.authHeader),
      TIMEOUT_TEXT_MS,
      'text',
    );
    console.log('[ROUTINE-TEXT] OK | primary_type:', value.primary_type, '| narration:', !!value.narration);
    return { status: 'ok', value };
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.warn('[ROUTINE-TEXT] timeout');
      return { status: 'timeout', label: err.label };
    }
    console.warn('[ROUTINE-TEXT] error:', String(err));
    return { status: 'error', error: err };
  }
}

// ── runPhotoAnalyses ───────────────────────────────────────────────────────────

export interface PhotoAnalysesInput {
  /** Array de frames base64 (fotos do tutor + frames de vídeo intercalados). */
  framesBase64:    string[];
  /** Quantas posições iniciais do array são fotos reais do tutor (não frames de vídeo). */
  tutorPhotoCount: number;
  species:         string;
  petName:         string | null;
  petBreed:        string | null;
  language:        string;
  authHeader:      Record<string, string>;
}

/**
 * Analisa fotos e frames de vídeo via Edge Function analyze-pet-photo.
 * Cada frame é analisado independentemente em paralelo.
 * Retorna 'skipped' quando não há frames.
 * Os frames além de tutorPhotoCount são marcados com context: 'video_frame'.
 */
export async function runPhotoAnalyses(
  input: PhotoAnalysesInput,
): Promise<PhotoAnalysesOutcome> {
  if (input.framesBase64.length === 0) {
    return { status: 'skipped', reason: 'no_input' };
  }

  try {
    const analysisPromises = input.framesBase64.map((b64, idx) =>
      supabase.functions
        .invoke('analyze-pet-photo', {
          headers: input.authHeader,
          body: {
            photo_base64: b64,
            language:     input.language,
            species:      input.species,
            pet_name:     input.petName,
            pet_breed:    input.petBreed,
            // Frames além das fotos do tutor são marcados como video_frame
            ...(input.tutorPhotoCount === 0 || idx >= input.tutorPhotoCount
              ? { context: 'video_frame' }
              : {}),
          },
        })
        .then(({ data, error }) => {
          if (error) {
            console.warn('[ROUTINE-PHOTO] analyze-pet-photo idx=' + idx + ':', JSON.stringify(error).slice(0, 200));
            // Tenta logar o body da resposta de erro (best-effort)
            const blob = (error as Record<string, unknown>).context as Record<string, unknown> | undefined;
            const bodyBlob = blob?._bodyBlob as Blob | undefined;
            if (bodyBlob) {
              bodyBlob.text().then((txt: string) => {
                console.warn('[ROUTINE-PHOTO-BODY] idx=' + idx + ':', txt);
              }).catch(() => {});
            }
          }
          return data as Record<string, unknown> | null;
        })
        .catch((err: unknown) => {
          console.warn('[ROUTINE-PHOTO] invoke error idx=' + idx + ':', String(err));
          return null;
        }),
    );

    const results = await withTimeout(
      Promise.all(analysisPromises),
      TIMEOUT_PHOTO_MS,
      'photos',
    );

    const okCount = results.filter((r) => r != null).length;
    console.log('[ROUTINE-PHOTO] OK | analyzed:', okCount, '/', input.framesBase64.length);
    return { status: 'ok', value: results };
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.warn('[ROUTINE-PHOTO] timeout');
      return { status: 'timeout', label: err.label };
    }
    console.warn('[ROUTINE-PHOTO] error:', String(err));
    return { status: 'error', error: err };
  }
}

// ── runVideoClassification ─────────────────────────────────────────────────────

export interface VideoClassificationInput {
  petId:               string;
  videoUrl:            string;
  text:                string | null;
  thumbnailFrameBase64: string | null;
  language:            string;
  authHeader:          Record<string, string>;
}

/**
 * Analisa vídeo (comportamento, locomoção, humor visual) via classify-diary-entry.
 * Usa Gemini nativo para análise de vídeo quando disponível.
 * Retorna 'skipped' quando não há videoUrl.
 */
export async function runVideoClassification(
  input: VideoClassificationInput,
): Promise<VideoClassificationOutcome> {
  if (!input.videoUrl) {
    return { status: 'skipped', reason: 'no_input' };
  }
  try {
    const value = await withTimeout(
      classifyVideo(
        input.petId,
        input.videoUrl,
        input.text,
        input.thumbnailFrameBase64,
        input.language,
        input.authHeader,
      ),
      TIMEOUT_VIDEO_MS,
      'video',
    );
    console.log('[ROUTINE-VIDEO] OK | video_analysis:', !!value.video_analysis);
    return { status: 'ok', value };
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.warn('[ROUTINE-VIDEO] timeout');
      return { status: 'timeout', label: err.label };
    }
    console.warn('[ROUTINE-VIDEO] error:', String(err));
    return { status: 'error', error: err };
  }
}

// ── runAudioClassification ─────────────────────────────────────────────────────

export interface AudioClassificationInput {
  petId:           string;
  audioUrl:        string;
  text:            string | null;
  durationSeconds: number | null;
  language:        string;
  authHeader:      Record<string, string>;
}

/**
 * Analisa áudio do pet (som_type, estado emocional, intensidade) via classify-diary-entry.
 * Retorna 'skipped' quando não há audioUrl.
 */
export async function runAudioClassification(
  input: AudioClassificationInput,
): Promise<AudioClassificationOutcome> {
  if (!input.audioUrl) {
    return { status: 'skipped', reason: 'no_input' };
  }
  try {
    const value = await withTimeout(
      classifyPetAudio(
        input.petId,
        input.audioUrl,
        input.text,
        input.durationSeconds,
        input.language,
        input.authHeader,
      ),
      TIMEOUT_AUDIO_MS,
      'audio',
    );
    console.log('[ROUTINE-AUDIO] OK | pet_audio_analysis:', !!value.pet_audio_analysis);
    return { status: 'ok', value };
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.warn('[ROUTINE-AUDIO] timeout');
      return { status: 'timeout', label: err.label };
    }
    console.warn('[ROUTINE-AUDIO] error:', String(err));
    return { status: 'error', error: err };
  }
}

// ── runOCRClassification ───────────────────────────────────────────────────────

export interface OCRClassificationInput {
  petId:      string;
  docBase64:  string;
  language:   string;
  authHeader: Record<string, string>;
}

/**
 * Executa OCR em documento escaneado via classify-diary-entry (input_type: ocr_scan).
 * IMPORTANTE: mesmo quando esta rotina falha ou timeout, o documento DEVE ser
 * salvo no diário — o caller (useDiaryEntry.ts) controla isso separadamente
 * verificando docMediaUrl, não o resultado desta rotina.
 * Retorna 'skipped' quando não há docBase64.
 */
export async function runOCRClassification(
  input: OCRClassificationInput,
): Promise<OCRClassificationOutcome> {
  if (!input.docBase64) {
    return { status: 'skipped', reason: 'no_input' };
  }
  try {
    const value = await withTimeout(
      classifyOCR(input.petId, input.docBase64, input.language, input.authHeader),
      TIMEOUT_OCR_MS,
      'ocr',
    );
    const fieldCount = value.ocr_data?.fields?.length ?? 0;
    console.log('[ROUTINE-OCR] OK | document_type:', value.document_type, '| fields:', fieldCount);
    return { status: 'ok', value };
  } catch (err) {
    if (err instanceof TimeoutError) {
      console.warn('[ROUTINE-OCR] timeout — doc será salvo sem campos extraídos');
      return { status: 'timeout', label: err.label };
    }
    console.warn('[ROUTINE-OCR] error:', String(err));
    return { status: 'error', error: err };
  }
}
