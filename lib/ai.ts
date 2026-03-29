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

export async function generateAIInsight(petId: string): Promise<AIInsightResponse> {
  const { data, error } = await supabase.functions.invoke('generate-ai-insight', {
    body: { pet_id: petId },
  });
  if (error) throw error;
  return data as AIInsightResponse;
}
