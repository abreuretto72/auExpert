/**
 * Classifier constants — env keys, max tokens, language map,
 * classification type catalogue, mood id catalogue, and the
 * resolveLanguage helper that reads from LANG_NAMES.
 */

export const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
export const GEMINI_API_KEY    = Deno.env.get('GEMINI_API_KEY');

// Default máximo de tokens. A resposta típica do classificador (3-4 classificações +
// narração de ~150 palavras + mood/tags/urgency) fica em 1500-2500 tokens. 4000 dá
// folga confortável sem reservar budget desnecessário no modelo. OCR/PDF têm
// overrides específicos abaixo (4000/3000).
export const MAX_TOKENS = 4000;

export const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
  'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
  'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian', 'tr': 'Turkish',
};

export const CLASSIFICATION_TYPES = [
  'moment', 'vaccine', 'exam', 'medication', 'consultation',
  'allergy', 'weight', 'surgery', 'symptom', 'food',
  'expense', 'connection', 'travel', 'partner',
  'achievement', 'mood', 'insurance', 'plan',
  'grooming', 'boarding', 'pet_sitter', 'dog_walker', 'training', 'funeral_plan',
  'purchase', 'place_visit', 'documentation', 'lost_found', 'emergency', 'memorial', 'adoption',
  'clinical_metric',
] as const;

export const MOOD_IDS = [
  'ecstatic', 'happy', 'calm', 'playful',
  'tired', 'anxious', 'sad', 'sick',
] as const;

/** Resolve language code to full language name. */
export function resolveLanguage(langCode: string): string {
  return LANG_NAMES[langCode] ?? LANG_NAMES[langCode?.split('-')[0]] ?? 'English';
}
