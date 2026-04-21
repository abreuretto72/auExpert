/**
 * useProntuario — hook for generating and caching the pet medical record (prontuário).
 *
 * - Calls the generate-prontuario Edge Function on first load or when stale.
 * - Uses React Query for caching (staleTime = 24h to match server-side TTL).
 * - Exposes emergency_token for the QR screen.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProntuarioAlert {
  type: 'critical' | 'warning' | 'info';
  message: string;
  action: string;
}

export interface ProntuarioVaccine {
  id: string;
  name: string;
  date_administered: string | null;
  next_due_date: string | null;
  batch_number: string | null;
  veterinarian: string | null;
  is_overdue: boolean;
  // Fase 1 — campos já existentes no banco, agora surfaceados
  laboratory: string | null;
  dose_number: string | null;
  clinic: string | null;
  notes: string | null;
}

export interface ProntuarioMedication {
  id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  // Fase 1 — campos já existentes no banco, agora surfaceados
  type: string | null;
  reason: string | null;
  prescribed_by: string | null;
  notes: string | null;
}

export interface ProntuarioAllergy {
  id: string;
  allergen: string;
  reaction: string | null;
  severity: string | null;
  // Fase 1 — campos já existentes no banco, agora surfaceados
  diagnosed_date: string | null;
  diagnosed_by: string | null;
  confirmed: boolean;
}

// Fase 3e — sinais vitais do exame físico (colunas adicionadas a consultations em 3b)
export interface ProntuarioVitalSigns {
  temperature_celsius: number | null;
  heart_rate_bpm: number | null;
  respiratory_rate_rpm: number | null;
  capillary_refill_sec: number | null;
  mucous_color:
    | 'pink'
    | 'pale'
    | 'cyanotic'
    | 'icteric'
    | 'brick_red'
    | 'unknown'
    | null;
  hydration_status:
    | 'normal'
    | 'mild_dehydration'
    | 'moderate_dehydration'
    | 'severe_dehydration'
    | 'unknown'
    | null;
}

export interface ProntuarioConsultation {
  id: string;
  date: string | null;
  veterinarian: string | null;
  clinic: string | null;
  diagnosis: string | null;
  notes: string | null;
  consult_type: string | null;
  // Fase 1 — campos já existentes no banco, agora surfaceados
  type: string | null;
  time: string | null;
  prescriptions: string | null;
  follow_up_at: string | null;
  cost: number | null;
  // Fase 3e — sinais vitais (null quando nenhuma das 6 colunas está preenchida)
  vital_signs: ProntuarioVitalSigns | null;
}

// ── Fase 3e — novas tabelas vet-grade (body_condition_scores, parasite_control,
//              chronic_conditions, trusted_vets) — surfaceadas direto do banco
//              pela Edge Function generate-prontuario.

export interface ProntuarioBodyConditionScore {
  id: string;
  score: number; // 1-9 WSAVA
  measured_at: string; // ISO date
  measured_by: 'tutor' | 'vet' | 'ai_photo';
  weight_kg: number | null;
  notes: string | null;
  source: 'manual' | 'ai';
}

export interface ProntuarioParasiteControl {
  id: string;
  type: 'flea_tick' | 'vermifuge' | 'heartworm' | 'combined';
  product_name: string;
  dose: string | null;
  administered_at: string; // ISO date
  next_due_date: string | null;
  administered_by: string | null;
  notes: string | null;
  source: 'manual' | 'ai';
  is_overdue: boolean;
}

export interface ProntuarioChronicConditionRecord {
  id: string;
  name: string;
  code: string | null; // ICD-10-Vet opcional
  diagnosed_date: string | null;
  diagnosed_by: string | null;
  severity: 'mild' | 'moderate' | 'severe' | null;
  status: 'active' | 'controlled' | 'remission' | 'resolved';
  treatment_summary: string | null;
  notes: string | null;
  source: 'manual' | 'ai';
}

export interface ProntuarioTrustedVet {
  id: string;
  name: string;
  specialty: string | null;
  phone: string | null;
  clinic: string | null;
  address: string | null;
  crmv: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
}

// Fase 1 — tabela `surgeries` existia em 011_health_tables.sql mas estava ignorada
export interface ProntuarioSurgery {
  id: string;
  name: string;
  date: string | null;
  veterinarian: string | null;
  clinic: string | null;
  anesthesia: string | null;
  status: 'scheduled' | 'recovering' | 'recovered' | 'complications' | null;
  notes: string | null;
}

// ── Fase 2 — campos derivados pela IA (vet-grade) ─────────────────────────────

export interface ProntuarioBreedPredisposition {
  condition: string;
  rationale: string;
  severity: 'monitor' | 'watch' | 'manage';
}

export interface ProntuarioDrugInteraction {
  drugs: string[];
  warning: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export type ProntuarioCalendarType =
  | 'vaccine'
  | 'deworming'
  | 'flea_tick'
  | 'dental'
  | 'annual_check';

export type ProntuarioCalendarStatus =
  | 'overdue'
  | 'upcoming'
  | 'scheduled'
  | 'done';

export interface ProntuarioPreventiveCalendarItem {
  type: ProntuarioCalendarType;
  label: string;
  due_date: string | null;
  status: ProntuarioCalendarStatus;
}

export type ProntuarioBodySystem =
  | 'cardiovascular'
  | 'respiratory'
  | 'gastrointestinal'
  | 'urinary'
  | 'neurological'
  | 'musculoskeletal'
  | 'dermatologic'
  | 'ophthalmologic'
  | 'otologic'
  | 'dental';

export interface ProntuarioBodySystemReview {
  system: ProntuarioBodySystem;
  status: 'normal' | 'attention' | 'abnormal' | 'unknown';
  notes: string | null;
}

export interface ProntuarioExamAbnormalFlag {
  exam_name: string;
  parameter: string;
  value: string;
  reference: string | null;
  flag: 'low' | 'high' | 'abnormal';
}

export interface ProntuarioEmergencyCardMed {
  name: string;
  dose: string | null;
}

export interface ProntuarioEmergencyCardContact {
  tutor_name: string | null;
  phone: string | null;
  vet_name: string | null;
  vet_phone: string | null;
}

export interface ProntuarioEmergencyCard {
  critical_allergies: string[];
  active_meds_with_dose: ProntuarioEmergencyCardMed[];
  chronic_conditions_flagged: string[];
  blood_type: string | null;
  contact: ProntuarioEmergencyCardContact;
}

export interface Prontuario {
  pet_id: string;
  age_label: string;
  weight_kg: number | null;
  is_neutered: boolean | null;
  microchip: string | null;
  tutor_name: string | null;
  ai_summary: string | null;
  ai_summary_vet: string | null;
  alerts: ProntuarioAlert[];
  vaccines_status: 'current' | 'partial' | 'overdue' | 'none';
  vaccines: ProntuarioVaccine[];
  active_medications: ProntuarioMedication[];
  allergies: ProntuarioAllergy[];
  chronic_conditions: string[];
  consultations: ProntuarioConsultation[];
  last_consultation: ProntuarioConsultation | null;
  last_exam_date: string | null;
  last_consultation_date: string | null;
  total_entries: number;
  period_label: string;
  weight_history: { date: string; weight_kg: number }[];
  mood_distribution: Record<string, number>;
  dominant_mood: string | null;
  usual_vet: string | null;
  weight_trend: 'stable' | 'gaining' | 'losing' | 'unknown';
  emergency_token: string;
  generated_at: string;
  is_stale: boolean;
  // Fase 1 — campos já existentes no banco, agora surfaceados
  sex: 'male' | 'female' | null;
  birth_date: string | null;
  size: 'small' | 'medium' | 'large' | null;
  color: string | null;
  blood_type: string | null;
  surgeries: ProntuarioSurgery[];
  exam_abnormal_count: number;
  // Fase 2 — campos derivados pela IA (opcional — IA pode não gerar em todas as chamadas)
  breed_predispositions?: ProntuarioBreedPredisposition[];
  drug_interactions?: ProntuarioDrugInteraction[];
  preventive_calendar?: ProntuarioPreventiveCalendarItem[];
  body_systems_review?: ProntuarioBodySystemReview[];
  exam_abnormal_flags?: ProntuarioExamAbnormalFlag[];
  emergency_card?: ProntuarioEmergencyCard | null;
  // Fase 3e — dados surfaceados direto das tabelas novas (podem ser [] se o tutor
  // ainda não registrou nada). Arrays vazios, não undefined.
  body_condition_scores?: ProntuarioBodyConditionScore[];
  parasite_control?: ProntuarioParasiteControl[];
  chronic_conditions_records?: ProntuarioChronicConditionRecord[];
  trusted_vets?: ProntuarioTrustedVet[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const PRONTUARIO_STALE_TIME = 24 * 60 * 60 * 1000; // 24h — matches server TTL

export function useProntuario(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  // Load from cache (React Query) or fetch fresh from Edge Function
  const query = useQuery<Prontuario>({
    queryKey: ['pets', petId, 'prontuario'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        prontuario: Prontuario;
        cached: boolean;
      }>('generate-prontuario', {
        body: { pet_id: petId, language: i18n.language },
      });
      if (error) {
        console.error('[useProntuario] invoke error | pet:', petId.slice(-8), '| message:', error.message, '| context:', JSON.stringify((error as any).context ?? {}));
        throw error;
      }
      if (!data?.prontuario) {
        console.error('[useProntuario] no prontuario returned | data:', JSON.stringify(data));
        throw new Error('No prontuario returned');
      }
      console.log('[useProntuario] loaded OK | cached:', data.cached, '| pet:', petId.slice(-8));
      return data.prontuario;
    },
    enabled: isAuthenticated && !!petId,
    staleTime: PRONTUARIO_STALE_TIME,
    gcTime: PRONTUARIO_STALE_TIME + 30 * 60 * 1000, // keep 30min extra
    retry: 1,
  });

  // Force regeneration mutation (ignores cache)
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        prontuario: Prontuario;
        cached: boolean;
      }>('generate-prontuario', {
        body: { pet_id: petId, language: i18n.language, force_refresh: true },
      });
      if (error) throw error;
      if (!data?.prontuario) throw new Error('No prontuario returned');
      return data.prontuario;
    },
    onSuccess: (fresh) => {
      qc.setQueryData(['pets', petId, 'prontuario'], fresh);
    },
  });

  return {
    prontuario: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    regenerate: regenerateMutation.mutateAsync,
    isRegenerating: regenerateMutation.isPending,
  };
}
