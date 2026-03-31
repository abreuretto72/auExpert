/**
 * Classifier module — builds the system prompt, calls Claude API,
 * and parses the structured JSON response.
 */

import type { PetContext } from './context.ts';

// ── Constants ──

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1500;

const LANG_NAMES: Record<string, string> = {
  'pt-BR': 'Brazilian Portuguese', 'pt': 'Brazilian Portuguese',
  'en': 'English', 'en-US': 'English',
  'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
  'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese (Simplified)',
  'ar': 'Arabic', 'hi': 'Hindi', 'ru': 'Russian', 'tr': 'Turkish',
};

const CLASSIFICATION_TYPES = [
  'moment', 'vaccine', 'exam', 'medication', 'consultation',
  'allergy', 'weight', 'surgery', 'symptom', 'food',
  'expense', 'connection', 'travel', 'partner',
  'achievement', 'mood', 'insurance', 'plan',
] as const;

const MOOD_IDS = [
  'ecstatic', 'happy', 'calm', 'playful',
  'tired', 'anxious', 'sad', 'sick',
] as const;

// ── Types ──

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
  input_type: string;
  language: string;
  petContext: PetContext;
}

// ── Prompt builder ──

function buildSystemPrompt(pet: PetContext, lang: string, inputType?: string): string {
  const petSex = pet.sex === 'male' ? 'male' : pet.sex === 'female' ? 'female' : 'unknown sex';
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';

  if (inputType === 'ocr_scan') {
    return buildOCRPrompt(pet, lang);
  }

  if (inputType === 'pdf_upload') {
    return buildPDFPrompt(pet, lang);
  }

  if (inputType === 'video') {
    return buildVideoPrompt(pet, lang);
  }

  if (inputType === 'pet_audio') {
    return buildPetAudioPrompt(pet, lang);
  }

  return `You are the AI classifier and narrator for AuExpert, a premium pet diary app.

Analyze the tutor's input about their pet and return a structured JSON response.

## PET CONTEXT
- Name: ${pet.name}
- Species: ${speciesWord} (${petSex})
- Breed: ${pet.breed ?? 'mixed/unknown'}
- Age: ${pet.age_desc}
- Weight: ${pet.weight_kg ? pet.weight_kg + 'kg' : 'unknown'}
- Recent memories: ${pet.recent_memories || 'none yet'}

## NARRATION RULES (CRITICAL)
- ALWAYS write in THIRD PERSON about ${pet.name}
- Examples: "Today ${pet.name} went to...", "${pet.name} was photographed..."
- NEVER write in first person: NEVER "I went...", "My owner...", "I ate..."
- Factual, descriptive, warm but professional tone
- Include extracted data (names, values, dates) when available
- Maximum 150 words
- Respond in ${lang}

## CLASSIFICATION RULES
- Classify the entry into one or more types from: ${CLASSIFICATION_TYPES.join(', ')}
- Each classification has: type, confidence (0.0-1.0), extracted_data (object)
- primary_type = the highest confidence classification
- If multiple items detected (e.g., "went to vet, got vaccine, weighed 32kg"), return multiple classifications
- Extract clinical values when mentioned (weight, temperature, etc.)

## FOOD EXTRACTION (type = 'food')
When food/nutrition is mentioned, extract:
  record_type: 'food'|'treat'|'supplement'|'restriction'|'intolerance'
  product_name, brand, category, portion_grams, daily_portions, calories_kcal
  is_current: true if changing to a new food ("mudou a ração para", "starting")
  started_at (YYYY-MM-DD), notes

## CONNECTION EXTRACTION (type = 'connection')
When another pet is mentioned, extract:
  friend_name (the other pet's name)
  friend_species: 'dog'|'cat'|'bird'|'rabbit'|'other'|'unknown'
  friend_breed (if mentioned)
  friend_owner (owner name if mentioned)
  connection_type: 'friend'|'playmate'|'neighbor'|'relative'|'rival'|'unknown'
  date (YYYY-MM-DD, the encounter date)
  notes (context: "at the park", "neighbor's dog")

## PLAN / INSURANCE EXTRACTION (type = 'plan' or 'insurance')
When a pet health plan, insurance, funeral plan, or assistance plan is mentioned, extract:
  plan_type: 'health'|'insurance'|'funeral'|'assistance'|'emergency'
  provider (company name, e.g. "Petz Saúde", "Seres Vivos")
  plan_name (e.g. "Plano Ouro", "Seguro Total")
  plan_code (apólice / contract number if present)
  monthly_cost (number, monthly fee), annual_cost (number, if annual)
  coverage_limit (maximum coverage amount)
  start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), renewal_date (YYYY-MM-DD)
  coverage: array of covered items (e.g. ["cirurgias", "internação", "exames"])
  Use type 'insurance' for funeral/life insurance, 'plan' for health/care plans

## TRAVEL EXTRACTION (type = 'travel')
When a trip, journey, outing, or travel experience is mentioned, extract:
  destination: name of the place, city, or region visited
  country: 2-letter ISO country code (default 'BR')
  region: state or region name (e.g. "São Paulo", "Nordeste")
  travel_type: 'road_trip'|'flight'|'local'|'international'|'camping'|'other'
  start_date (YYYY-MM-DD), end_date (YYYY-MM-DD) if mentioned
  distance_km: approximate distance in km if mentioned
  notes: a brief description of the trip experience
  tags: array of relevant tags (e.g. ["praia", "cachoeira", "pet-friendly"])
  Use 'local' for short outings within the same city, 'road_trip' for regional drives

## MOOD DETECTION
- Detect mood from: ${MOOD_IDS.join(', ')}
- mood_confidence: 0.0 to 1.0

## URGENCY
- none: casual moment, routine
- low: minor health observation
- medium: symptom that needs attention soon
- high: emergency, severe symptom, immediate vet needed

## SUGGESTIONS
- Short action texts for the tutor (max 2-3)
- Example: "Register V10 vaccine in health records", "Update weight to 32kg"
- Only suggest when confidence > 0.7

## OUTPUT FORMAT
Return ONLY valid JSON (no markdown, no backticks):
{
  "classifications": [{"type": "...", "confidence": 0.0, "extracted_data": {}}],
  "primary_type": "moment",
  "narration": "Today ${pet.name}...",
  "mood": "happy",
  "mood_confidence": 0.85,
  "urgency": "none",
  "clinical_metrics": [{"type": "weight", "value": 32, "unit": "kg", "status": "normal"}],
  "suggestions": ["suggestion text"],
  "tags_suggested": ["tag1", "tag2"]
}`;
}

function buildOCRPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  return `You are the intelligent scanner for AuExpert, a pet care app.
Extract ALL data from the photographed document and return ONLY valid JSON.

Pet: ${pet.name}, ${pet.breed ?? 'mixed'}, ${speciesWord}

Identify the document type and extract relevant fields:

VACCINE CARD → type "vaccine":
  vaccine_name, laboratory, batch, dose, date, next_due, vet_name, clinic

VETERINARY PRESCRIPTION → type "medication":
  medication_name, dosage, frequency, duration, vet_name, date

EXAM REPORT / LAB RESULT → type "exam":
  exam_name, date, lab_name, results: [{item, value, unit, reference_min, reference_max, status}]
  Include clinical_metrics for numeric values found.

INVOICE / RECEIPT → type "expense":
  merchant_name, merchant_type, date, total, currency, items: [{name, qty, unit_price}]

INSURANCE / PLAN → type "plan":
  provider, plan_name, type, monthly_cost, coverage_limit, start_date, end_date

MEDICATION BOX / PACKAGE INSERT → type "medication":
  active_ingredient, dosage_info, contraindications

VET REPORT / CERTIFICATE → type "consultation":
  date, vet_name, clinic, diagnosis, prescriptions, follow_up

For EACH extracted field, include confidence (0.0-1.0).
Narration: write 1-2 sentences about ${pet.name} in THIRD PERSON.
Respond in ${lang}.

Return ONLY valid JSON:
{
  "document_type": "vaccine_card|prescription|exam_result|invoice|receipt|insurance|vet_report|medication_box|other",
  "classifications": [{"type": "...", "confidence": 0.0, "extracted_data": {}}],
  "primary_type": "...",
  "ocr_data": {
    "fields": [{"key": "Field Name", "value": "Extracted Value", "confidence": 0.95}],
    "items": [{"name": "...", "qty": 1, "unit_price": 0.00}]
  },
  "narration": "${pet.name} had a document scanned...",
  "mood": "calm",
  "mood_confidence": 0.5,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": ["Short action for the tutor"],
  "tags_suggested": ["ocr", "document"]
}`;
}

function buildPDFPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  return `You are the intelligent veterinary record importer for AuExpert.
Analyze this PDF document containing ${pet.name}'s veterinary history.

Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}

Extract EVERY health record found in the document. For each record, create a separate classification entry.

VACCINES → type "vaccine":
  vaccine_name, laboratory, batch, dose, date (YYYY-MM-DD), next_due (YYYY-MM-DD), vet_name, clinic

CONSULTATIONS → type "consultation":
  date (YYYY-MM-DD), vet_name, clinic, reason, diagnosis, prescriptions, notes

EXAMS / LAB RESULTS → type "exam":
  exam_name, date (YYYY-MM-DD), lab_name, vet_name, results: [{item, value, unit, reference_min, reference_max, status}]

MEDICATIONS → type "medication":
  medication_name, dosage, frequency, start_date (YYYY-MM-DD), end_date (YYYY-MM-DD), vet_name

SURGERIES → type "surgery":
  name, date (YYYY-MM-DD), vet_name, clinic, notes, anesthesia

WEIGHTS / METRICS → type "weight":
  value (number), unit ("kg" or "g"), date (YYYY-MM-DD)

ALLERGIES → type "allergy":
  allergen, reaction, severity ("mild"|"moderate"|"severe"), date (YYYY-MM-DD)

RULES:
- Extract ALL records, even if dates are unclear (estimate from context)
- Each extracted record becomes a separate entry in "classifications"
- Set confidence based on how clearly the data was extracted
- Narration: 2-3 sentences about ${pet.name}'s health history found in this document. Third person only.
- Respond in ${lang}

Return ONLY valid JSON:
{
  "document_summary": "2-line summary of the document content",
  "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "import_count": { "vaccines": 0, "consultations": 0, "exams": 0, "medications": 0, "surgeries": 0, "other": 0 },
  "classifications": [
    { "type": "vaccine", "confidence": 0.95, "extracted_data": { "vaccine_name": "...", "date": "..." } }
  ],
  "primary_type": "consultation",
  "narration": "${pet.name} had a comprehensive veterinary history documented...",
  "mood": "calm",
  "mood_confidence": 0.5,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": [],
  "tags_suggested": ["pdf-import", "historical"]
}`;
}

function buildVideoPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  return `You are the AI analyzer for AuExpert, a pet care app.
The tutor has recorded a video of their pet and described what they observed.

Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}
Recent memories: ${pet.recent_memories || 'none yet'}

## NARRATION RULES (CRITICAL)
- Write in THIRD PERSON about ${pet.name}
- Examples: "Today ${pet.name} showed great energy...", "${pet.name} was recorded moving..."
- NEVER use first person: "I ran", "My paws"
- Warm, observational tone — describe movement, behavior, mood
- Maximum 150 words
- Respond in ${lang}

## VIDEO ANALYSIS
Based on the tutor's description, analyze the pet's:
- locomotion_score: 0-100 (how well/freely the pet moves)
- energy_score: 0-100 (energy level observed)
- calm_score: 0-100 (calmness level)
- behavior_summary: 1-2 sentence description of behavior
- health_observations: array of notable health-relevant observations (empty if nothing notable)

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "classifications": [{"type": "moment", "confidence": 0.9, "extracted_data": {}}],
  "primary_type": "moment",
  "narration": "${pet.name} was recorded...",
  "mood": "happy",
  "mood_confidence": 0.8,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": [],
  "tags_suggested": ["video", "activity"],
  "video_analysis": {
    "locomotion_score": 85,
    "energy_score": 75,
    "calm_score": 60,
    "behavior_summary": "Moving freely with good energy",
    "health_observations": []
  }
}`;
}

function buildPetAudioPrompt(pet: PetContext, lang: string): string {
  const speciesWord = pet.species === 'dog' ? 'dog' : 'cat';
  const soundTypes = pet.species === 'dog'
    ? 'bark (alert, play, anxiety, fear, pain), whine, growl'
    : 'meow (hunger, attention, pain, stress), purr (content), growl';
  const emotionalStates = pet.species === 'dog'
    ? 'alert, playful, anxious, fearful, in-pain, excited, content'
    : 'hungry, attention-seeking, in-pain, stressed, content, fearful';

  return `You are a pet behavior and vocalization specialist for AuExpert.
The tutor recorded audio of their pet and described what they heard.

Pet: ${pet.name}, ${pet.breed ?? 'mixed/unknown'}, ${speciesWord}
Recent mood patterns: ${pet.recent_memories || 'none yet'}

## ANALYSIS
Based on the tutor's description, analyze:
- sound_type: ${soundTypes}
- emotional_state: ${emotionalStates}
- intensity: "low" | "medium" | "high"
- pattern_notes: brief description of the vocal pattern

## NARRATION RULES
- Write in THIRD PERSON about ${pet.name}
- Focus on emotional state and what the sound communicates
- Be warm, empathetic — this is the pet's voice
- Maximum 150 words
- Respond in ${lang}

Return ONLY valid JSON:
{
  "classifications": [{"type": "mood", "confidence": 0.85, "extracted_data": {
    "sound_type": "bark",
    "emotional_state": "playful",
    "intensity": "medium",
    "pattern_notes": "short rhythmic barks with rising pitch"
  }}],
  "primary_type": "mood",
  "narration": "${pet.name} expressed themselves through...",
  "mood": "happy",
  "mood_confidence": 0.85,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": [],
  "tags_suggested": ["audio", "vocalization"],
  "pet_audio_analysis": {
    "sound_type": "bark",
    "emotional_state": "playful",
    "intensity": "medium",
    "pattern_notes": "short rhythmic barks"
  }
}`;
}

function buildPDFMessages(pdfBase64: string, text?: string): ClaudeMessage[] {
  return [{
    role: 'user',
    content: [
      {
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
      },
      {
        type: 'text',
        text: text ?? 'Analyze this veterinary document and extract all health records for this pet.',
      },
    ],
  }];
}

// ── Message builder ──

interface ClaudeMessage {
  role: string;
  content: unknown;
}

function buildMessages(text?: string, photos_base64?: string[]): ClaudeMessage[] {
  const photos = (photos_base64 ?? []).slice(0, 5); // max 5 images
  if (photos.length > 0) {
    const imageContent = photos.map((p) => ({
      type: 'image',
      source: { type: 'base64', media_type: detectMediaType(p), data: p },
    }));
    return [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text',
          text: text || (photos.length > 1 ? 'Analyze these images of my pet.' : 'Analyze this image of my pet.'),
        },
      ],
    }];
  }

  return [{ role: 'user', content: text }];
}

function detectMediaType(base64: string): string {
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

// ── Claude API call ──

async function callClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  maxTokens: number = MAX_TOKENS,
): Promise<{ text: string; tokensUsed: number }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[classifier] Claude API error:', response.status, errorBody);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const textContent = aiResponse.content?.find((c: { type: string }) => c.type === 'text');

  if (!textContent?.text) {
    throw new Error('Empty AI response');
  }

  return {
    text: textContent.text,
    tokensUsed: aiResponse.usage?.output_tokens ?? 0,
  };
}

// ── JSON parser with fallback ──

function parseClassification(rawText: string, fallbackText?: string): Record<string, unknown> {
  let jsonText = rawText.trim();

  // Strip markdown code fences if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(jsonText);
  } catch {
    console.error('[classifier] JSON parse error, using fallback. Raw:', jsonText.slice(0, 200));
    return {
      classifications: [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
      primary_type: 'moment',
      narration: fallbackText || 'Entry recorded.',
      mood: 'calm',
      mood_confidence: 0.5,
      urgency: 'none',
      clinical_metrics: [],
      suggestions: [],
      tags_suggested: [],
    };
  }
}

// ── Public API ──

/** Resolve language code to full language name. */
export function resolveLanguage(langCode: string): string {
  return LANG_NAMES[langCode] ?? LANG_NAMES[langCode?.split('-')[0]] ?? 'English';
}

/**
 * Classify a diary entry: build prompt, call Claude, parse response.
 * Returns a normalized ClassifyResult.
 */
export async function classifyEntry(input: ClassifyInput): Promise<ClassifyResult> {
  const lang = resolveLanguage(input.language);
  const systemPrompt = buildSystemPrompt(input.petContext, lang, input.input_type);

  let messages: ClaudeMessage[];
  let maxTokens = MAX_TOKENS;

  if (input.input_type === 'pdf_upload' && input.pdf_base64) {
    messages = buildPDFMessages(input.pdf_base64, input.text);
    maxTokens = 3000; // PDF may contain many records
  } else {
    // Merge legacy photo_base64 + new photos_base64 array
    const photos = input.photos_base64?.length
      ? input.photos_base64
      : input.photo_base64
        ? [input.photo_base64]
        : undefined;
    messages = buildMessages(input.text, photos);
  }

  console.log('[classifier] Calling Claude —', MODEL, '| lang:', lang, '| maxTokens:', maxTokens);

  const { text: rawText, tokensUsed } = await callClaude(systemPrompt, messages, maxTokens);
  const result = parseClassification(rawText, input.text);

  console.log('[classifier] OK —',
    'primary:', result.primary_type,
    'classifications:', (result.classifications as unknown[])?.length,
    'mood:', result.mood,
    'urgency:', result.urgency,
    'tokens:', tokensUsed,
  );

  // Normalize with safe defaults
  return {
    classifications: (result.classifications as Classification[]) ?? [{ type: 'moment', confidence: 1.0, extracted_data: {} }],
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
    ...(input.input_type === 'ocr_scan' && {
      document_type: (result.document_type as string) ?? 'other',
      ocr_data: (result.ocr_data as OCRData) ?? { fields: [] },
    }),
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
