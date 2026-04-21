/**
 * Classifier module — builds the system prompt, calls Claude API,
 * and parses the structured JSON response.
 */

import type { PetContext } from './context.ts';
import { getAIConfig } from './_classifier/ai-config.ts';
import {
  GEMINI_API_KEY,
  MAX_TOKENS,
  resolveLanguage,
} from './_classifier/constants.ts';
import type {
  ClassificationType,
  MoodId,
  Classification,
  ClinicalMetric,
  OCRField,
  OCRItem,
  OCRData,
  PetAudioAnalysis,
  VideoAnalysis,
  ClassifyResult,
  ClassifyInput,
  ClaudeMessage,
} from './_classifier/types.ts';
import { buildSystemPrompt } from './_classifier/prompts/system.ts';
import { buildPetAudioPrompt } from './_classifier/prompts/petAudio.ts';
import {
  buildPDFMessages,
  buildOCRMessages,
  buildMessages,
} from './_classifier/messages.ts';
import { callClaude } from './_classifier/callClaude.ts';
import { callGeminiMedia } from './_classifier/callGemini.ts';
import { parseClassification } from './_classifier/parseClassification.ts';
import { inferExpenseCategory } from './_classifier/inferExpenseCategory.ts';

// Re-export public types so consumers of classifier.ts keep their surface area.
export type {
  ClassificationType,
  MoodId,
  Classification,
  ClinicalMetric,
  OCRField,
  OCRItem,
  OCRData,
  PetAudioAnalysis,
  VideoAnalysis,
  ClassifyResult,
  ClassifyInput,
};




// ── Public API ──

// `resolveLanguage` now lives in ./_classifier/constants.ts — re-export for
// backwards compatibility with any external importer that may have used it.
export { resolveLanguage } from './_classifier/constants.ts';

/**
 * Classify a diary entry: build prompt, call Claude, parse response.
 * Returns a normalized ClassifyResult.
 */
export async function classifyEntry(input: ClassifyInput): Promise<ClassifyResult> {
  const lang = resolveLanguage(input.language);
  const systemPrompt = input.input_type === 'pet_audio'
    ? buildPetAudioPrompt(input.petContext, lang, input.audio_duration_seconds)
    : buildSystemPrompt(input.petContext, lang, input.input_type, input.text);

  let messages: ClaudeMessage[];
  let maxTokens = MAX_TOKENS;

  const aiConfig = await getAIConfig();
  let rawText: string;
  let tokensUsed: number;

  if (input.input_type === 'pdf_upload' && input.pdf_base64) {
    // ── Claude: PDF ──
    messages = buildPDFMessages(input.pdf_base64, input.text);
    maxTokens = 3000;
    console.log('[classifier] Calling Claude (PDF) | lang:', lang);
    ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));

  } else if (input.input_type === 'ocr_scan') {
    // ── Claude: OCR ──
    maxTokens = 4000;
    const ocrPhoto = (input.photos_base64?.length ? input.photos_base64 : input.photo_base64 ? [input.photo_base64] : undefined)?.[0];
    console.log('[classifier] OCR branch | photo present:', !!ocrPhoto, '| photo KB:', ocrPhoto ? Math.round(ocrPhoto.length * 0.75 / 1024) : 0);
    messages = buildOCRMessages(ocrPhoto);
    console.log('[classifier] Calling Claude (OCR) | lang:', lang);
    ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));

  } else if (input.input_type === 'pet_audio') {
    // ── pet_audio: Gemini (if key+url available) or text-Claude fallback ──
    console.log('[classifier] pet_audio | audio_url:', !!input.audio_url, '| GEMINI_API_KEY:', !!GEMINI_API_KEY, '| model_audio:', aiConfig.model_audio);
    if (input.audio_url && GEMINI_API_KEY) {
      try {
        ;({ rawText, tokensUsed } = await callGeminiMedia(
          systemPrompt, input.audio_url, 'audio', input.text, aiConfig.model_audio, maxTokens,
        ));
      } catch (err) {
        console.warn('[classifier] pet_audio — ❌ Gemini FAILED → text-Claude fallback | error:', String(err));
        const durationSec = input.audio_duration_seconds;
        const durationNote = durationSec != null && durationSec > 0 ? `[Audio recording: ${durationSec}s]` : '[Audio recording]';
        const audioCtx = input.text?.trim() ? `${durationNote}\nTutor's description: "${input.text.trim()}"` : durationNote;
        messages = buildMessages(audioCtx, undefined);
        ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));
      }
    } else {
      const reason = !input.audio_url ? 'no audio_url' : 'no GEMINI_API_KEY';
      const durationSec = input.audio_duration_seconds;
      const durationNote = durationSec != null && durationSec > 0 ? `[Audio recording: ${durationSec}s]` : '[Audio recording]';
      const audioCtx = input.text?.trim() ? `${durationNote}\nTutor's description: "${input.text.trim()}"` : durationNote;
      messages = buildMessages(audioCtx, undefined);
      console.log('[classifier] pet_audio — text-Claude (reason:', reason, ') | duration:', durationSec, '| hasTutorDesc:', !!(input.text?.trim()));
      ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));
    }

  } else if (input.input_type === 'video') {
    // ── video: Gemini (if key+url available) or Claude thumbnail fallback ──
    console.log('[classifier] video | video_url:', !!input.video_url, '| GEMINI_API_KEY:', !!GEMINI_API_KEY, '| model_video:', aiConfig.model_video);
    if (input.video_url && GEMINI_API_KEY) {
      try {
        ;({ rawText, tokensUsed } = await callGeminiMedia(
          systemPrompt, input.video_url, 'video', input.text, aiConfig.model_video, maxTokens,
        ));
      } catch (err) {
        console.warn('[classifier] video — ❌ Gemini FAILED → Claude thumbnail fallback | error:', String(err));
        const allPhotos = input.photos_base64?.length ? input.photos_base64 : input.photo_base64 ? [input.photo_base64] : undefined;
        messages = buildMessages(input.text, allPhotos?.slice(0, 1));
        ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));
      }
    } else {
      const reason = !input.video_url ? 'no video_url' : 'no GEMINI_API_KEY';
      const allPhotos = input.photos_base64?.length ? input.photos_base64 : input.photo_base64 ? [input.photo_base64] : undefined;
      messages = buildMessages(input.text, allPhotos?.slice(0, 1));
      console.log('[classifier] video — Claude thumbnail (reason:', reason, ') | hasThumb:', !!(allPhotos?.length));
      ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));
    }

  } else {
    // ── Claude: text / photos (default path) ──
    const allPhotos = input.photos_base64?.length
      ? input.photos_base64
      : input.photo_base64 ? [input.photo_base64] : undefined;
    const photos = allPhotos?.slice(0, 2);
    messages = buildMessages(input.text, photos);
    console.log('[classifier] Calling Claude | lang:', lang, '| maxTokens:', maxTokens, '| input_type:', input.input_type, '| photos:', photos?.length ?? 0);
    ;({ text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens));
  }

  // ── RAW RESPONSE TRACE ──
  console.log('[classifier] RAW response | tokens:', tokensUsed, '| chars:', rawText.length, '| input_type:', input.input_type);
  console.log('[classifier] RAW first 600:', rawText.slice(0, 600));
  if (rawText.length > 600) console.log('[classifier] RAW last 300:', rawText.slice(-300));

  const result = parseClassification(rawText, input.text);

  console.log('[classifier] OK —',
    'primary:', result.primary_type,
    'classifications:', (result.classifications as unknown[])?.length,
    'mood:', result.mood,
    'urgency:', result.urgency,
    'tokens:', tokensUsed,
  );

  // Apply expense category fallback (guarantees 'outros' is only used when truly no context)
  const rawClassifications = (result.classifications as Classification[]) ?? [{ type: 'moment', confidence: 1.0, extracted_data: {} }];
  const classifications = inferExpenseCategory(rawClassifications);

  // Normalize with safe defaults
  return {
    classifications,
    primary_type: (result.primary_type as ClassificationType) ?? 'moment',
    narration: (result.narration as string) ?? '',
    mood: (result.mood as MoodId) ?? 'calm',
    mood_confidence: (result.mood_confidence as number) ?? 0.5,
    urgency: (result.urgency as ClassifyResult['urgency']) ?? 'none',
    clinical_metrics: (result.clinical_metrics as ClinicalMetric[]) ?? [],
    suggestions: (result.suggestions as string[]) ?? [],
    tags_suggested: (result.tags_suggested as string[]) ?? [],
    language: input.language,
    tokens_used: tokensUsed,
    // OCR fields (only populated when input_type === 'ocr_scan')
    ...(input.input_type === 'ocr_scan' && (() => {
      const doc_type = (result.document_type as string) ?? 'other';
      const ocr_data = (result.ocr_data as OCRData) ?? { fields: [] };
      console.log('[classifier] RETURN OCR | document_type:', doc_type, '| fields:', ocr_data.fields?.length ?? 0, '| items:', ocr_data.items?.length ?? 0);
      if (ocr_data.fields?.length) {
        console.log('[classifier] RETURN OCR first 3 fields:', JSON.stringify(ocr_data.fields.slice(0, 3)));
      } else {
        console.warn('[classifier] RETURN OCR fields EMPTY — result.ocr_data was:', JSON.stringify(result.ocr_data)?.slice(0, 200));
      }
      return { document_type: doc_type, ocr_data };
    })()),
    // PDF fields (only populated when input_type === 'pdf_upload')
    ...(input.input_type === 'pdf_upload' && {
      document_summary: (result.document_summary as string) ?? null,
      date_range: (result.date_range as { from: string; to: string }) ?? null,
      import_count: (result.import_count as ClassifyResult['import_count']) ?? {
        vaccines: 0, consultations: 0, exams: 0, medications: 0, surgeries: 0, other: 0,
      },
    }),
    // Video fields (only populated when input_type === 'video')
    ...(input.input_type === 'video' && {
      video_analysis: (result.video_analysis as VideoAnalysis) ?? {
        locomotion_score: 70,
        energy_score: 70,
        calm_score: 70,
        behavior_summary: '',
        health_observations: [],
      },
    }),
    // Pet audio fields (only populated when input_type === 'pet_audio')
    ...(input.input_type === 'pet_audio' && {
      pet_audio_analysis: (result.pet_audio_analysis as PetAudioAnalysis) ?? {
        sound_type: 'other',
        emotional_state: 'unknown',
        intensity: 'medium',
        pattern_notes: '',
      },
    }),
  };
}
