import type { DiaryNarrationResponse, PhotoAnalysisResponse, AIInsightResponse } from '../types/ai';
import { supabase } from './supabase';

export async function generateDiaryNarration(
  petId: string,
  content: string,
  moodId: string,
  language: 'pt-BR' | 'en-US' = 'pt-BR',
): Promise<DiaryNarrationResponse> {
  const { data, error } = await supabase.functions.invoke('generate-diary-narration', {
    body: { pet_id: petId, content, mood_id: moodId, language },
  });
  if (error) {
    console.error('[ai] generateDiaryNarration ERRO →', error);
    throw error;
  }
  return data as DiaryNarrationResponse;
}

export async function analyzePetPhoto(
  petId: string,
  photoUrl: string,
  analysisType: 'breed' | 'mood' | 'health' | 'general' = 'general',
): Promise<PhotoAnalysisResponse> {
  const { data, error } = await supabase.functions.invoke('analyze-pet-photo', {
    body: { pet_id: petId, photo_url: photoUrl, analysis_type: analysisType },
  });
  if (error) throw error;
  return data as PhotoAnalysisResponse;
}

export async function generatePersonality(
  petId: string,
  language: string = 'pt-BR',
): Promise<{ personality: string | null; traits: string[]; entries_analyzed: number }> {
  const { data, error } = await supabase.functions.invoke('generate-personality', {
    body: { pet_id: petId, language },
  });
  if (error) {
    console.error('[ai] generatePersonality ERRO →', error);
    throw error;
  }
  return data as { personality: string | null; traits: string[]; entries_analyzed: number };
}

// ── New concept: unified classification + narration (3rd person) ──

export interface ClassificationResult {
  type: string;
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

export interface ClassifyDiaryResponse {
  classifications: ClassificationResult[];
  primary_type: string;
  narration: string;
  mood: string;
  mood_confidence: number;
  urgency: 'none' | 'low' | 'medium' | 'high';
  clinical_metrics: ClinicalMetric[];
  suggestions: string[];
  tags_suggested: string[];
  language: string;
  tokens_used: number;
  // OCR-specific
  document_type?: string;
  ocr_data?: { fields: OCRField[]; items?: OCRItem[] };
  // PDF-specific
  document_summary?: string;
  date_range?: { from: string; to: string } | null;
  import_count?: { vaccines: number; consultations: number; exams: number; medications: number; surgeries: number; other: number };
  // Video-specific
  video_analysis?: VideoAnalysis;
  // Pet audio-specific
  pet_audio_analysis?: PetAudioAnalysis;
}

export async function classifyDiaryEntry(
  petId: string,
  text: string | null,
  photosBase64: string[] | null,
  inputType: string = 'text',
  language: string = 'pt-BR',
  pdfBase64?: string,
  audioUrl?: string,
  audioDurationSeconds?: number,
  videoUrl?: string,
  headers?: Record<string, string>,
): Promise<ClassifyDiaryResponse> {
  const { data, error } = await supabase.functions.invoke('classify-diary-entry', {
    headers,
    body: {
      pet_id: petId,
      text,
      photos_base64: photosBase64,
      pdf_base64: pdfBase64 ?? undefined,
      audio_url: audioUrl ?? undefined,
      audio_duration_seconds: audioDurationSeconds ?? undefined,
      video_url: videoUrl ?? undefined,
      input_type: inputType,
      language,
    },
  });

  console.log('[AI] invoke classify-diary-entry concluído');
  console.log('[AI] error:', error ? JSON.stringify(error).slice(0, 400) : 'nenhum');
  console.log('[AI] data keys:', data ? Object.keys(data).join(', ') : 'null');
  if (error) {
    const ctx = (error as Record<string,unknown>).context as Response | undefined;
    console.log('[AI-ERR] status HTTP:', ctx?.status);
    console.log('[AI-ERR] url:', ctx?.url);
    try {
      const errBody = await (ctx as any)?.json?.();
      console.log('[AI-ERR] body:', JSON.stringify(errBody));
    } catch {
      try {
        const errText = await (ctx as any)?.text?.();
        console.log('[AI-ERR] body text:', errText?.slice(0, 300));
      } catch {}
    }
  }

  if (error) {
    console.error('[ai] classifyDiaryEntry ERRO →', error);
    throw error;
  }

  return data as ClassifyDiaryResponse;
}

// ── Typed wrappers for each media analysis routine ───────────────────────────
// These wrap classifyDiaryEntry() with explicit, named parameters per media type.
// The underlying Edge Function is unchanged — they call the same endpoint with
// the appropriate input_type. Legacy callers that use classifyDiaryEntry()
// directly (PDF import, retryEntry, offline sync) are unaffected.

/** Classify text only: generates narration, classifications, mood, urgency, tags. */
export async function classifyTextOnly(
  petId: string,
  text: string,
  language: string,
  headers?: Record<string, string>,
): Promise<ClassifyDiaryResponse> {
  return classifyDiaryEntry(petId, text, null, 'text', language, undefined, undefined, undefined, undefined, headers);
}

/** Classify video: analyzes video URL + optional thumbnail frame for visual behavior. */
export async function classifyVideo(
  petId: string,
  videoUrl: string,
  text: string | null,
  thumbnailFrameBase64: string | null,
  language: string,
  headers?: Record<string, string>,
): Promise<ClassifyDiaryResponse> {
  return classifyDiaryEntry(
    petId,
    text,
    thumbnailFrameBase64 ? [thumbnailFrameBase64] : null,
    'video',
    language,
    undefined,
    undefined,
    undefined,
    videoUrl,
    headers,
  );
}

/** Classify pet audio: analyzes audio URL for emotional state and sound type. */
export async function classifyPetAudio(
  petId: string,
  audioUrl: string,
  text: string | null,
  durationSeconds: number | null,
  language: string,
  headers?: Record<string, string>,
): Promise<ClassifyDiaryResponse> {
  return classifyDiaryEntry(
    petId,
    text,
    null,
    'pet_audio',
    language,
    undefined,
    audioUrl,
    durationSeconds ?? undefined,
    undefined,
    headers,
  );
}

/** Classify OCR document: runs OCR extraction on a scanned document (base64). */
export async function classifyOCR(
  petId: string,
  docBase64: string,
  language: string,
  headers?: Record<string, string>,
): Promise<ClassifyDiaryResponse> {
  return classifyDiaryEntry(petId, null, [docBase64], 'ocr_scan', language, undefined, undefined, undefined, undefined, headers);
}

export async function generateAIInsight(petId: string): Promise<AIInsightResponse> {
  const { data, error } = await supabase.functions.invoke('generate-ai-insight', {
    body: { pet_id: petId },
  });
  if (error) throw error;
  return data as AIInsightResponse;
}
