export type PetSex = 'male' | 'female' | 'unknown';

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
  sex: PetSex;
  breed: string | null;
  birth_date: string | null;
  estimated_age_months: number | null;
  weight_kg: number | null;
  size: 'small' | 'medium' | 'large' | null;
  color: string | null;
  microchip_id: string | null;
  blood_type: string | null;
  neutered: boolean;
  avatar_url: string | null;
  health_score: number | null;
  happiness_score: number | null;
  current_mood: string | null;
  current_mood_updated_at: string | null;
  total_diary_entries: number;
  total_photos: number;
  // xp_total e personality_summary foram removidos — não existem na tabela `pets`
  // em produção (migration 019 nunca foi aplicada). Gamificação é derivada dos
  // achievements em runtime (ver hooks/useLens.ts).
  ai_personality: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
}

export interface DiaryEntry {
  id: string;
  pet_id: string;
  user_id: string;
  content: string;
  input_method?: 'voice' | 'text' | 'gallery' | 'video' | 'audio' | 'ocr_scan' | 'pdf' | 'pet_audio';
  narration: string | null;
  mood_id: string;
  mood_score: number | null;
  mood_source: 'manual' | 'ai_suggested';
  entry_type: 'manual' | 'photo_analysis' | 'vaccine' | 'allergy' | 'ai_insight' | 'milestone' | 'mood_change';
  tags: string[];
  photos: string[];
  video_url?: string | null;
  audio_url?: string | null;
  /** Local-only thumbnail URI for optimistic video temp entries (not persisted to DB). */
  video_thumb_url?: string | null;
  media_analyses?: unknown[] | null;
  is_special: boolean;
  is_registration_entry: boolean;
  linked_photo_analysis_id: string | null;
  input_type?: string;
  primary_type?: string;
  classifications?: Array<{ type: string; confidence: number; extracted_data: Record<string, unknown> }> | null;
  urgency?: 'none' | 'low' | 'medium' | 'high';
  mood_confidence?: number | null;
  entry_date: string;
  processing_status?: 'processing' | 'done' | 'error';
  narration_outdated?: boolean;
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
  batch_number: string | null;
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

export interface Exam {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  date: string;
  status: 'normal' | 'attention' | 'abnormal' | 'critical' | 'pending';
  results: unknown[];
  laboratory: string | null;
  veterinarian: string | null;
  notes: string | null;
  photo_url: string | null;
  source: 'manual' | 'ocr' | 'voice' | 'ai';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  type: 'antiparasitic' | 'supplement' | 'antibiotic' | 'anti_inflammatory' | 'analgesic' | 'antifungal' | 'vermifuge' | 'other';
  dosage: string | null;
  frequency: string;
  start_date: string;
  end_date: string | null;
  active: boolean;
  reason: string | null;
  prescribed_by: string | null;
  notes: string | null;
  source: 'manual' | 'ocr' | 'voice' | 'ai';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: string;
  pet_id: string;
  user_id: string;
  date: string;
  time: string | null;
  type: 'routine' | 'emergency' | 'specialist' | 'surgery' | 'follow_up';
  veterinarian: string;
  clinic: string | null;
  summary: string;
  diagnosis: string | null;
  prescriptions: string | null;
  follow_up_at: string | null;
  cost: number | null;
  source: 'manual' | 'ocr' | 'voice' | 'ai';
  photo_url: string | null;
  // --- sinais vitais (Fase 3 vet-grade, 2026-04-20) ---
  // Todos opcionais porque consultas antigas não têm estes valores.
  temperature_celsius?: number | null;
  heart_rate_bpm?: number | null;
  respiratory_rate_rpm?: number | null;
  capillary_refill_sec?: number | null;
  mucous_color?: 'pink' | 'pale' | 'cyanotic' | 'jaundiced' | 'injected' | 'other' | null;
  hydration_status?: 'normal' | 'mild' | 'moderate' | 'severe' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ==========================================================================
// Fase 3 vet-grade (2026-04-20) — 5 novas tabelas clínicas
// ==========================================================================

export interface BodyConditionScore {
  id: string;
  pet_id: string;
  user_id: string;
  /** BCS 1-9 escala WSAVA (1 = caquético, 5 = ideal, 9 = obeso severo). */
  score: number;
  measured_at: string;
  measured_by: 'tutor' | 'vet' | 'ai_photo';
  weight_kg: number | null;
  notes: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ParasiteControl {
  id: string;
  pet_id: string;
  user_id: string;
  type: 'flea_tick' | 'vermifuge' | 'heartworm' | 'combined' | 'other';
  product_name: string;
  dose: string | null;
  administered_at: string;
  next_due_date: string | null;
  administered_by: 'tutor' | 'vet' | 'other' | null;
  notes: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChronicCondition {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  code: string | null;
  diagnosed_date: string | null;
  diagnosed_by: string | null;
  severity: 'mild' | 'moderate' | 'severe' | null;
  status: 'active' | 'controlled' | 'remission' | 'resolved';
  treatment_summary: string | null;
  notes: string | null;
  source: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrustedVet {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  clinic: string | null;
  address: string | null;
  crmv: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Dicionário global (não é per-pet). Chaveado por (species, breed, condition_key).
 * Leitura pública; escrita apenas via service_role (seeds + fallback AI).
 */
export interface BreedPredisposition {
  id: string;
  species: 'dog' | 'cat';
  breed: string;
  condition_key: string;
  condition_pt: string;
  condition_en: string;
  rationale_pt: string | null;
  rationale_en: string | null;
  severity: 'monitor' | 'watch' | 'manage';
  source: 'seed' | 'ai';
  created_at: string;
  updated_at: string;
}

export interface Surgery {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  date: string;
  veterinarian: string | null;
  clinic: string | null;
  anesthesia: string | null;
  status: 'scheduled' | 'recovering' | 'recovered' | 'complications';
  notes: string | null;
  source: 'manual' | 'ocr' | 'voice' | 'ai';
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

// ==========================================================================
// Módulo Profissional (Fase 1 — 2026-04-21)
// Tabelas: professionals, access_grants, role_permissions,
//          professional_signatures, access_audit_log
// ==========================================================================

export type ProfessionalType =
  | 'veterinarian'
  | 'vet_tech'
  | 'groomer'
  | 'trainer'
  | 'walker'
  | 'sitter'
  | 'boarding'
  | 'shop_employee'
  | 'ong_member'
  | 'breeder';

export type AccessRole =
  | 'vet_full'
  | 'vet_read'
  | 'vet_tech'
  | 'groomer'
  | 'trainer'
  | 'walker'
  | 'sitter'
  | 'boarding'
  | 'shop_employee'
  | 'ong_member';

export type AccessPermission =
  | 'read_clinical'
  | 'write_clinical'
  | 'sign_clinical'
  | 'read_diary'
  | 'write_diary'
  | 'read_contact'
  | 'request_access'
  | 'export_data';

export type SignatureTargetTable =
  | 'vaccines'
  | 'allergies'
  | 'exams'
  | 'consultations'
  | 'medications'
  | 'surgeries'
  | 'chronic_conditions'
  | 'parasite_control'
  | 'clinical_metrics'
  | 'body_condition_scores'
  | 'photo_analyses'
  | 'diary_entries';

export type AccessAuditEventType =
  | 'grant_created'
  | 'grant_accepted'
  | 'grant_rejected'
  | 'grant_revoked'
  | 'grant_expired'
  | 'clinical_read'
  | 'clinical_write'
  | 'clinical_sign'
  | 'diary_read'
  | 'diary_write'
  | 'export_pdf';

export interface Professional {
  id: string;
  user_id: string;
  professional_type: ProfessionalType;
  country_code: string;
  council_name: string | null;
  council_number: string | null;
  fiscal_id_type: string | null;
  fiscal_id_value: string | null;
  display_name: string;
  bio: string | null;
  languages: string[] | null;
  specialties: string[] | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_payload: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessGrant {
  id: string;
  pet_id: string;
  professional_id: string;
  granted_by: string;
  role: AccessRole;
  invite_token: string | null;
  invite_sent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
  scope_notes: string | null;
  can_see_finances: boolean | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: AccessRole;
  permission: AccessPermission;
  allowed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalSignature {
  id: string;
  professional_id: string;
  access_grant_id: string;
  pet_id: string;
  target_table: SignatureTargetTable;
  target_id: string;
  payload_hash: string;
  payload_snapshot: Record<string, unknown>;
  signature_version: string;
  signed_display_name: string;
  signed_council_name: string | null;
  signed_council_number: string | null;
  signed_as_declared: boolean;
  created_at: string;
}

export interface AccessAuditLog {
  id: string;
  pet_id: string;
  actor_user_id: string | null;
  professional_id: string | null;
  access_grant_id: string | null;
  event_type: AccessAuditEventType;
  target_table: string | null;
  target_id: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}
