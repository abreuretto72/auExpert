// ══════════════════════════════════════
// Análise completa de foto (Edge Function analyze-pet-photo)
// ══════════════════════════════════════

export interface HealthObservation {
  observation: string;
  severity: 'normal' | 'attention' | 'concern';
  confidence: number;
}

export interface PhotoAnalysisIdentification {
  species: { value: 'dog' | 'cat'; confidence: number };
  breed: {
    primary: string;
    confidence: number;
    is_mixed: boolean;
    secondary_breeds: string[] | null;
  } | null;
  size: 'small' | 'medium' | 'large' | 'giant' | null;
  age_category: 'puppy' | 'young' | 'adult' | 'senior' | null;
  estimated_age_months: number | null;
  estimated_weight_kg: number | null;
  sex: { value: 'male' | 'female' | 'unknown'; confidence: number } | null;
  coat: {
    color: string;
    pattern: 'solid' | 'bicolor' | 'tricolor' | 'merle' | 'tabby' | 'brindle' | 'spotted' | 'tuxedo' | 'other';
    quality: 'shiny' | 'healthy' | 'dull' | 'rough' | 'matted';
    length: 'short' | 'medium' | 'long';
  } | null;
}

export interface PhotoAnalysisHealth {
  body_condition_score: number | null; // 1-9
  body_condition: 'underweight' | 'ideal' | 'overweight' | 'obese' | null;
  skin_coat: HealthObservation[];
  eyes: HealthObservation[];
  ears: HealthObservation[];
  mouth_teeth: HealthObservation[];
  posture_body: HealthObservation[];
  nails: { observation: string; needs_trimming: boolean } | null;
  hygiene: 'clean' | 'moderate' | 'dirty' | null;
  visible_parasites: boolean | null;
  visible_lumps: boolean | null;
}

export interface PhotoAnalysisMood {
  primary: 'ecstatic' | 'happy' | 'calm' | 'tired' | 'anxious' | 'sad' | 'playful' | 'sick' | 'alert' | 'fearful' | 'submissive';
  confidence: number;
  signals: string[];
}

export interface PhotoAnalysisEnvironment {
  location: 'home_indoor' | 'home_outdoor' | 'park' | 'beach' | 'clinic' | 'car' | 'street' | 'unknown';
  accessories: { type: string; description: string }[];
  other_animals: boolean;
  visible_risks: string[] | null;
}

export interface PhotoAnalysisAlert {
  message: string;
  severity: 'info' | 'attention' | 'concern';
  category: 'health' | 'safety' | 'care';
}

export interface PhotoAnalysisResponse {
  // Estrutura completa
  identification: PhotoAnalysisIdentification;
  health: PhotoAnalysisHealth;
  mood: PhotoAnalysisMood;
  environment: PhotoAnalysisEnvironment;
  alerts: PhotoAnalysisAlert[];
  disclaimer: string;

  // Atalhos top-level (backward compat com AddPetModal)
  breed: { name: string; confidence: number } | null;
  estimated_age_months: number | null;
  estimated_weight_kg: number | null;
  size: 'small' | 'medium' | 'large' | null;
  color: string | null;
}

// ══════════════════════════════════════
// Narração do diário
// ══════════════════════════════════════

export interface DiaryNarrationResponse {
  narration: string;
  mood_detected: string | null;
  language: 'pt-BR' | 'en-US';
  tokens_used: number;
}

// ══════════════════════════════════════
// Insight semanal
// ══════════════════════════════════════

export interface AIInsightResponse {
  insight: string;
  category: 'health' | 'behavior' | 'nutrition' | 'care';
  pet_id: string;
  based_on: string[];
}
