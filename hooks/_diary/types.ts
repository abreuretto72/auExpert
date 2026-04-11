/**
 * types.ts — Tipos compartilhados para o pipeline de análise de mídia do diário.
 *
 * Cada rotina independente (texto, fotos, vídeo, áudio, OCR) retorna um
 * RoutineOutcome<T> que descreve se o dado foi obtido, pulado ou falhou.
 * O orquestrador em useDiaryEntry.ts consume esses outcomes sem que uma
 * falha bloqueie as demais rotinas.
 */

import type { ClassifyDiaryResponse } from '../../lib/ai';

// ── AIAnalysisFlags ────────────────────────────────────────────────────────────
// Controla quais rotinas de análise rodam para uma entrada do diário.
// Criado a partir da switch de IA na tela e propagado via opts.

export interface AIAnalysisFlags {
  /** Gera narração + classificação a partir do texto. */
  narrateText: boolean;
  /** Analisa fotos via analyze-pet-photo Edge Function. */
  analyzePhotos: boolean;
  /** Analisa vídeo (frames + URL) via classify-diary-entry. */
  analyzeVideo: boolean;
  /** Analisa áudio do pet via classify-diary-entry (input_type: pet_audio). */
  analyzeAudio: boolean;
  /** Executa OCR via classify-diary-entry (input_type: ocr_scan). */
  analyzeOCR: boolean;
}

/** Todos os flags ativos — usado como default quando aiFlags não é passado. */
export const AI_FLAGS_ALL_ON: AIAnalysisFlags = {
  narrateText:   true,
  analyzePhotos: true,
  analyzeVideo:  true,
  analyzeAudio:  true,
  analyzeOCR:    true,
};

/** Todos os flags desativados — equivalente ao skipAI = true. */
export const AI_FLAGS_ALL_OFF: AIAnalysisFlags = {
  narrateText:   false,
  analyzePhotos: false,
  analyzeVideo:  false,
  analyzeAudio:  false,
  analyzeOCR:    false,
};

// ── RoutineOutcome<T> ─────────────────────────────────────────────────────────
// Discriminated union que representa o resultado de uma rotina de análise.
// Nunca lança exceção — erros são capturados e convertidos em outcomes.

export type RoutineOutcome<T> =
  | { status: 'ok';      value: T }
  | { status: 'skipped'; reason: 'toggle_off' | 'no_input' }
  | { status: 'timeout'; label: string }
  | { status: 'error';   error: unknown };

// ── Outcomes tipados por rotina ───────────────────────────────────────────────

export type TextClassificationOutcome = RoutineOutcome<ClassifyDiaryResponse>;

/** Array de resultados por frame/foto. Cada item pode ser null (analyze-pet-photo falhou). */
export type PhotoAnalysesOutcome = RoutineOutcome<Array<Record<string, unknown> | null>>;

export type VideoClassificationOutcome = RoutineOutcome<ClassifyDiaryResponse>;

export type AudioClassificationOutcome = RoutineOutcome<ClassifyDiaryResponse>;

export type OCRClassificationOutcome = RoutineOutcome<ClassifyDiaryResponse>;

// ── MediaAnalysisBundle ───────────────────────────────────────────────────────
// Resultado completo das 5 rotinas paralelas retornado pelo orquestrador.

export interface MediaAnalysisBundle {
  textClassification: TextClassificationOutcome;
  photoAnalyses:      PhotoAnalysesOutcome;
  videoClassification: VideoClassificationOutcome;
  audioClassification: AudioClassificationOutcome;
  ocrClassification:  OCRClassificationOutcome;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrai o valor de um outcome quando status === 'ok', senão undefined. */
export function outcomeValue<T>(outcome: RoutineOutcome<T>): T | undefined {
  return outcome.status === 'ok' ? outcome.value : undefined;
}

/** Conta quantas rotinas que FORAM tentadas (não puladas) resultaram em falha. */
export function countFailedRoutines(bundle: MediaAnalysisBundle): number {
  return Object.values(bundle).filter(
    (o) => o.status === 'timeout' || o.status === 'error',
  ).length;
}

/** Conta quantas rotinas foram tentadas (não puladas). */
export function countAttemptedRoutines(bundle: MediaAnalysisBundle): number {
  return Object.values(bundle).filter(
    (o) => o.status !== 'skipped',
  ).length;
}
