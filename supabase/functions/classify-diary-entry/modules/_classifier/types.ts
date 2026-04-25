/**
 * Classifier types — public classification result shapes plus the
 * internal Claude message envelope shared by message builders and
 * the Claude API caller.
 */

import type { PetContext } from '../context.ts';
import type { CLASSIFICATION_TYPES, MOOD_IDS } from './constants.ts';

export type ClassificationType = typeof CLASSIFICATION_TYPES[number];
export type MoodId = typeof MOOD_IDS[number];

export interface Classification {
  type: ClassificationType;
  confidence: number;
  extracted_data: Record<string, unknown>;
}

export interface ClinicalMetric {
  type: string;
  value: number;
  unit: string;
  status: 'normal' | 'low' | 'high' | 'critical';
}

export interface OCRField {
  key: string;
  value: string;
  confidence: number;
}

export interface OCRItem {
  name: string;
  qty: number;
  unit_price: number;
}

export interface OCRData {
  fields: OCRField[];
  items?: OCRItem[];
  document_type?: string;
}

export interface PetAudioAnalysis {
  sound_type: 'bark' | 'meow' | 'purr' | 'whine' | 'growl' | 'other';
  emotional_state: string;
  intensity: 'low' | 'medium' | 'high';
  pattern_notes: string;
}

export interface VideoAnalysis {
  locomotion_score: number;
  energy_score: number;
  calm_score: number;
  behavior_summary: string;
  health_observations: string[];
}

export interface ClassifyResult {
  classifications: Classification[];
  primary_type: ClassificationType;
  narration: string;
  mood: MoodId;
  mood_confidence: number;
  urgency: 'none' | 'low' | 'medium' | 'high';
  clinical_metrics: ClinicalMetric[];
  suggestions: string[];
  tags_suggested: string[];
  language: string;
  tokens_used: number;
  /**
   * Telemetria do call IA real — usage detalhado para recordAiInvocation.
   * Sempre presente (best-effort): claude OU gemini, exclusivo.
   */
  _telemetry?: {
    provider: 'anthropic' | 'google';
    actual_model: string | null;
    claude_usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens: number;
      cache_creation_input_tokens: number;
    };
    gemini_usage?: {
      prompt_tokens: number;
      candidates_tokens: number;
      cached_tokens: number;
      total_tokens: number;
    };
  };
  // OCR-specific (only present when input_type === 'ocr_scan')
  document_type?: string;
  ocr_data?: OCRData;
  // PDF-specific (only present when input_type === 'pdf_upload')
  document_summary?: string;
  date_range?: { from: string; to: string } | null;
  import_count?: { vaccines: number; consultations: number; exams: number; medications: number; surgeries: number; other: number };
  // Video-specific (only present when input_type === 'video')
  video_analysis?: VideoAnalysis;
  // Pet audio-specific (only present when input_type === 'pet_audio')
  pet_audio_analysis?: PetAudioAnalysis;
}

export interface ClassifyInput {
  text?: string;
  photo_base64?: string;
  photos_base64?: string[];
  pdf_base64?: string;
  audio_url?: string;
  audio_duration_seconds?: number;
  video_url?: string;
  input_type: string;
  language: string;
  petContext: PetContext;
  analysisDepth?: 'off' | 'fast' | 'balanced' | 'deep';
}

// ── Internal ──

export interface ClaudeMessage {
  role: string;
  content: unknown;
}
