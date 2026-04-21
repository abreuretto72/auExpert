/**
 * ═══════════════════════════════════════════════════════════════════════════
 * lib/schemas.ts
 *
 * Zod schemas — fonte de verdade para validação de dados em tempo de execução.
 *
 * Por que existem:
 *   O TypeScript mente em runtime. `data as Pet[]` no fetch do Supabase passa
 *   pelo compilador sem questionar a forma real da resposta. Se o banco mudar
 *   um tipo, adicionar um enum, ou uma migration quebrar a forma esperada,
 *   o bug só aparece quando a UI tenta usar o dado — longe do ponto de falha.
 *
 *   Esses schemas validam o shape REAL antes de entregar à UI. Em dev: quebra
 *   alto e cedo. Em prod: filtra linhas inválidas, loga detalhes e segue.
 *
 * Como usar:
 *   - Schemas são exportados com sufixo `Schema` (PetSchema, DiaryEntrySchema...)
 *   - Types inferidos são exportados SEM sufixo (Pet, DiaryEntry...) via z.infer<>
 *   - Consumers devem importar os types DESTE arquivo em vez de types/database.ts
 *     para as entidades cobertas aqui — progressivamente.
 *
 * Regras de design:
 *   - .nullable() para colunas `| null` (NULL no banco)
 *   - .optional() para campos `?` (podem não existir na row retornada)
 *   - .passthrough() em TODOS os schemas — colunas novas no banco não quebram
 *     a validação. A frente não se importa com campos extras.
 *   - z.enum([...]) para unions de string literais (espécie, severidade...)
 *   - z.string() para timestamps ISO (Supabase retorna string, não Date)
 *   - Schemas devem espelhar types/database.ts até que a migração esteja completa.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// Pet
// ═══════════════════════════════════════════════════════════════════════════

export const PetSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    name: z.string(),
    species: z.enum(['dog', 'cat']),
    sex: z.enum(['male', 'female']).nullable(),
    breed: z.string().nullable(),
    birth_date: z.string().nullable(),
    estimated_age_months: z.number().nullable(),
    weight_kg: z.number().nullable(),
    size: z.enum(['small', 'medium', 'large']).nullable(),
    color: z.string().nullable(),
    microchip_id: z.string().nullable(),
    blood_type: z.string().nullable(),
    neutered: z.boolean(),
    avatar_url: z.string().nullable(),
    health_score: z.number().nullable(),
    happiness_score: z.number().nullable(),
    current_mood: z.string().nullable(),
    current_mood_updated_at: z.string().nullable(),
    total_diary_entries: z.number(),
    total_photos: z.number(),
    // xp_total e personality_summary foram removidos — não existem na tabela `pets` real.
    // Gamificação (XP/level) é derivada de `achievements` em runtime (ver hooks/useLens.ts).
    // Se forem reintroduzidos via migration, recolocar como z.number()/z.string().nullable().
    ai_personality: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export type Pet = z.infer<typeof PetSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// DiaryEntry
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classificação extraída pela IA em uma entry — cada entry pode ter várias
 * (uma consulta pode classificar como 'consultation' + 'expense' + 'medication').
 */
const ClassificationSchema = z
  .object({
    type: z.string(),
    confidence: z.number(),
    extracted_data: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const DiaryEntrySchema = z
  .object({
    id: z.string().uuid(),
    pet_id: z.string().uuid(),
    user_id: z.string().uuid(),
    content: z.string(),
    input_method: z
      .enum(['voice', 'text', 'gallery', 'video', 'audio', 'ocr_scan', 'pdf', 'pet_audio'])
      .optional(),
    narration: z.string().nullable(),
    mood_id: z.string(),
    mood_score: z.number().nullable(),
    mood_source: z.enum(['manual', 'ai_suggested']),
    entry_type: z.enum([
      'manual',
      'photo_analysis',
      'vaccine',
      'allergy',
      'ai_insight',
      'milestone',
      'mood_change',
    ]),
    tags: z.array(z.string()),
    photos: z.array(z.string()),
    video_url: z.string().nullable().optional(),
    audio_url: z.string().nullable().optional(),
    video_thumb_url: z.string().nullable().optional(),
    media_analyses: z.array(z.unknown()).nullable().optional(),
    is_special: z.boolean(),
    is_registration_entry: z.boolean(),
    linked_photo_analysis_id: z.string().nullable(),
    input_type: z.string().optional(),
    primary_type: z.string().optional(),
    classifications: z.array(ClassificationSchema).nullable().optional(),
    urgency: z.enum(['none', 'low', 'medium', 'high']).optional(),
    mood_confidence: z.number().nullable().optional(),
    entry_date: z.string(),
    processing_status: z.enum(['processing', 'done', 'error']).optional(),
    narration_outdated: z.boolean().optional(),
    is_active: z.boolean(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export type DiaryEntry = z.infer<typeof DiaryEntrySchema>;

// ═══════════════════════════════════════════════════════════════════════════
// Vaccine
// ═══════════════════════════════════════════════════════════════════════════

export const VaccineSchema = z
  .object({
    id: z.string().uuid(),
    pet_id: z.string().uuid(),
    user_id: z.string().uuid(),
    name: z.string(),
    date_administered: z.string(),
    next_due_date: z.string().nullable(),
    batch_number: z.string().nullable(),
    veterinarian: z.string().nullable(),
    clinic: z.string().nullable(),
    notes: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
  })
  .passthrough();

export type Vaccine = z.infer<typeof VaccineSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// Allergy
// ═══════════════════════════════════════════════════════════════════════════

export const AllergySchema = z
  .object({
    id: z.string().uuid(),
    pet_id: z.string().uuid(),
    user_id: z.string().uuid(),
    allergen: z.string(),
    reaction: z.string().nullable(),
    severity: z.enum(['mild', 'moderate', 'severe']),
    diagnosed_date: z.string().nullable(),
    diagnosed_by: z.string().nullable(),
    is_active: z.boolean(),
    created_at: z.string(),
  })
  .passthrough();

export type Allergy = z.infer<typeof AllergySchema>;

// ═══════════════════════════════════════════════════════════════════════════
// ScheduledEvent
//
// Originalmente declarada inline em lib/api.ts (export interface ScheduledEvent).
// Movida para cá para consolidar todos os schemas em um lugar.
// ═══════════════════════════════════════════════════════════════════════════

export const ScheduledEventSchema = z
  .object({
    id: z.string().uuid(),
    pet_id: z.string().uuid(),
    user_id: z.string().uuid(),
    diary_entry_id: z.string().nullable(),
    event_type: z.string(),
    title: z.string(),
    description: z.string().nullable(),
    professional: z.string().nullable(),
    location: z.string().nullable(),
    scheduled_for: z.string(),
    all_day: z.boolean(),
    status: z.enum(['scheduled', 'confirmed', 'done', 'cancelled', 'missed']),
    is_recurring: z.boolean(),
    recurrence_rule: z.string().nullable(),
    source: z.enum(['manual', 'ai', 'system']),
    is_active: z.boolean(),
    created_at: z.string(),
  })
  .passthrough();

export type ScheduledEvent = z.infer<typeof ScheduledEventSchema>;
