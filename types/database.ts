export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  language: 'pt-BR' | 'en-US';
  biometric_enabled: boolean;
  failed_login_attempts: number;
  locked_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string;
}

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: 'dog' | 'cat';
  sex: 'male' | 'female' | null;
  breed: string | null;
  birth_date: string | null;
  estimated_age_months: number | null;
  weight_kg: number | null;
  size: 'small' | 'medium' | 'large' | null;
  color: string | null;
  microchip_id: string | null;
  avatar_url: string | null;
  health_score: number | null;
  happiness_score: number | null;
  current_mood: string | null;
  current_mood_updated_at: string | null;
  total_diary_entries: number;
  total_photos: number;
  ai_personality: string | null;
  personality_summary: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiaryEntry {
  id: string;
  pet_id: string;
  user_id: string;
  content: string;
  input_method: 'voice' | 'photo' | 'text';
  narration: string | null;
  mood_id: string;
  mood_score: number | null;
  mood_source: 'manual' | 'ai_suggested';
  entry_type: 'manual' | 'photo_analysis' | 'vaccine' | 'allergy' | 'ai_insight' | 'milestone' | 'mood_change';
  tags: string[];
  photos: string[];
  is_special: boolean;
  linked_photo_analysis_id: string | null;
  entry_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MoodLog {
  id: string;
  pet_id: string;
  user_id: string;
  mood_id: string;
  score: number;
  source: 'manual' | 'ai_photo' | 'ai_diary' | 'ai_auto';
  source_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PhotoAnalysis {
  id: string;
  pet_id: string;
  user_id: string;
  photo_url: string;
  analysis_result: Record<string, unknown>;
  confidence: number;
  analysis_type: 'breed' | 'mood' | 'health' | 'general';
  is_active: boolean;
  created_at: string;
}

export interface Vaccine {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  date_administered: string;
  next_due_date: string | null;
  lot_number: string | null;
  veterinarian: string | null;
  clinic: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Allergy {
  id: string;
  pet_id: string;
  user_id: string;
  allergen: string;
  reaction: string | null;
  severity: 'mild' | 'moderate' | 'severe';
  diagnosed_date: string | null;
  diagnosed_by: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PetEmbedding {
  id: string;
  pet_id: string;
  content_type: 'diary' | 'photo' | 'vaccine' | 'mood' | 'allergy';
  content_id: string;
  embedding: number[];
  content_text: string;
  importance: number;
  is_active: boolean;
  created_at: string;
}

export interface RagConversation {
  id: string;
  pet_id: string;
  user_id: string;
  query: string;
  response: string;
  context_ids: string[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  pet_id: string | null;
  type: 'vaccine_reminder' | 'diary_reminder' | 'ai_insight' | 'welcome';
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  scheduled_for: string;
  sent_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MediaFile {
  id: string;
  user_id: string;
  pet_id: string | null;
  bucket: string;
  path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  is_active: boolean;
  created_at: string;
}
