import type { DiaryNarrationResponse, PhotoAnalysisResponse, AIInsightResponse } from '../types/ai';
import { supabase } from './supabase';

export async function generateDiaryNarration(
  petId: string,
  content: string,
  moodId: string,
  language: 'pt-BR' | 'en-US' = 'pt-BR',
): Promise<DiaryNarrationResponse> {
  console.log('[ai] generateDiaryNarration — pet:', petId, 'mood:', moodId, 'lang:', language);
  const { data, error } = await supabase.functions.invoke('generate-diary-narration', {
    body: { pet_id: petId, content, mood_id: moodId, language },
  });
  if (error) {
    console.error('[ai] generateDiaryNarration ERRO →', error);
    throw error;
  }
  console.log('[ai] generateDiaryNarration OK — narration length:', data?.narration?.length);
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
  console.log('[ai] generatePersonality — pet:', petId, 'lang:', language);
  const { data, error } = await supabase.functions.invoke('generate-personality', {
    body: { pet_id: petId, language },
  });
  if (error) {
    console.error('[ai] generatePersonality ERRO →', error);
    throw error;
  }
  console.log('[ai] generatePersonality OK — personality:', data?.personality?.slice(0, 60), 'entries:', data?.entries_analyzed);
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
): Promise<ClassifyDiaryResponse> {
  console.log('[ai] classifyDiaryEntry — pet:', petId, 'input:', inputType, 'text_len:', text?.length ?? 0, 'photos:', photosBase64?.length ?? 0, 'pdf:', !!pdfBase64);

  const { data, error } = await supabase.functions.invoke('classify-diary-entry', {
    body: {
      pet_id: petId,
      text,
      photos_base64: photosBase64,
      pdf_base64: pdfBase64 ?? undefined,
      input_type: inputType,
      language,
    },
  });

  if (error) {
    console.error('[ai] classifyDiaryEntry ERRO →', error);
    throw error;
  }

  console.log('[ai] classifyDiaryEntry OK —',
    'primary:', data?.primary_type,
    'mood:', data?.mood,
    'classifications:', data?.classifications?.length,
    'narration_len:', data?.narration?.length,
    'tokens:', data?.tokens_used,
  );

  return data as ClassifyDiaryResponse;
}

export async function generateAIInsight(petId: string): Promise<AIInsightResponse> {
  const { data, error } = await supabase.functions.invoke('generate-ai-insight', {
    body: { pet_id: petId },
  });
  if (error) throw error;
  return data as AIInsightResponse;
}
