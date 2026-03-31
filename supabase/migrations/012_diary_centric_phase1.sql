-- ============================================================
-- Migration 012: Diary-Centric Phase 1 (Sprint 1.1)
-- REGRA: NÃO remover colunas existentes. Apenas ADICIONAR.
-- Dados antigos continuam funcionando. Campos novos nullable/default.
-- ============================================================

-- ══════════════════════════════════════
-- 1. ALTER TABLE diary_entries — novos campos
-- ══════════════════════════════════════

-- 1a. input_type expandido (o antigo input_method continua existindo)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS input_type VARCHAR(30) DEFAULT 'text';

-- 1b. Sistema de classificação IA
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS classifications JSONB DEFAULT '[]';
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS primary_type VARCHAR(30) DEFAULT 'moment';

-- 1c. Humor expandido
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS mood_confidence REAL;
-- mood_source já existe mas com CHECK diferente — não alterar

-- 1d. Urgência (saúde)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS urgency VARCHAR(10) DEFAULT 'none';

-- 1e. Mídia expandida
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_thumbnail TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_duration INTEGER;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS audio_type VARCHAR(20);
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS document_type VARCHAR(30);
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS ocr_data JSONB;

-- 1f. Análises especializadas
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_analysis JSONB;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS pet_audio_analysis JSONB;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS photo_analysis_data JSONB;

-- 1g. Vínculos com módulos (todos nullable)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_vaccine_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_exam_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_medication_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_consultation_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_expense_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_weight_metric_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_allergy_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_surgery_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_connection_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_nutrition_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_travel_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_plan_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_achievement_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_mood_log_id UUID;

-- ══════════════════════════════════════
-- 2. INDEXES para novos campos
-- ══════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_diary_primary_type ON diary_entries(primary_type);
CREATE INDEX IF NOT EXISTS idx_diary_input_type ON diary_entries(input_type);
CREATE INDEX IF NOT EXISTS idx_diary_urgency ON diary_entries(urgency) WHERE urgency != 'none';
CREATE INDEX IF NOT EXISTS idx_diary_classifications ON diary_entries USING GIN(classifications);

-- ══════════════════════════════════════
-- 3. MIGRAR DADOS EXISTENTES
-- ══════════════════════════════════════

-- Copiar input_method para input_type
UPDATE diary_entries
SET input_type = COALESCE(input_method, 'text')
WHERE input_type IS NULL OR input_type = 'text';

-- Classificar entradas antigas como 'moment'
UPDATE diary_entries
SET primary_type = 'moment',
    classifications = '[]'::jsonb
WHERE primary_type IS NULL;

-- Entradas de vacina antigas
UPDATE diary_entries
SET primary_type = 'vaccine'
WHERE entry_type = 'vaccine' AND primary_type = 'moment';

-- Entradas de alergia antigas
UPDATE diary_entries
SET primary_type = 'allergy'
WHERE entry_type = 'allergy' AND primary_type = 'moment';

-- Entradas de análise de foto antigas
UPDATE diary_entries
SET input_type = 'photo'
WHERE entry_type = 'photo_analysis' AND input_type = 'text';

-- ══════════════════════════════════════
-- 4. CREATE TABLE clinical_metrics
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS clinical_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    exam_id         UUID,
    metric_type     VARCHAR(30) NOT NULL
                    CHECK (metric_type IN (
                      'weight','temperature','heart_rate','respiratory_rate',
                      'blood_glucose','alt_tgp','ast_tgo','creatinine','urea',
                      'hemoglobin','hematocrit','platelets','leukocytes',
                      'albumin','total_protein','cholesterol','triglycerides',
                      'bun','alkaline_phosphatase','bilirubin',
                      'body_condition_score','health_score','pain_score',
                      'mobility_score','mood_score','energy_score',
                      'coat_score','hydration_score','custom'
                    )),
    value           DECIMAL(10,3) NOT NULL,
    unit            VARCHAR(20),
    reference_min   DECIMAL(10,3),
    reference_max   DECIMAL(10,3),
    status          VARCHAR(20) DEFAULT 'normal'
                    CHECK (status IN ('normal','low','high','critical')),
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai_photo','ai_video','vet','lab')),
    measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_pet ON clinical_metrics(pet_id);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON clinical_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_pet_type_date ON clinical_metrics(pet_id, metric_type, measured_at DESC);

ALTER TABLE clinical_metrics ENABLE ROW LEVEL SECURITY;

-- RLS: only own data
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_metrics' AND policyname = 'metrics_own_data') THEN
    CREATE POLICY metrics_own_data ON clinical_metrics FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ══════════════════════════════════════
-- 5. CREATE TABLE app_config
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS app_config (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value, description) VALUES
  ('classification_threshold', '"0.5"', 'Confiança mínima para classificar'),
  ('suggestion_threshold', '"0.7"', 'Confiança mínima para sugerir módulo'),
  ('max_photos_per_entry', '5', 'Máximo de fotos por entrada'),
  ('max_video_seconds', '60', 'Duração máxima de vídeo em segundos'),
  ('narration_style', '"third_person"', 'Estilo de narração: third_person ou first_person'),
  ('narration_max_words', '150', 'Máximo de palavras na narração')
ON CONFLICT (key) DO NOTHING;

-- ══════════════════════════════════════
-- 6. CREATE TABLE metric_references
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS metric_references (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species         VARCHAR(10) NOT NULL CHECK (species IN ('dog','cat')),
    breed           VARCHAR(80),
    size            VARCHAR(20),
    age_min_months  INTEGER,
    age_max_months  INTEGER,
    metric_type     VARCHAR(30) NOT NULL,
    reference_min   DECIMAL(10,3) NOT NULL,
    reference_max   DECIMAL(10,3) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    notes           TEXT
);

CREATE INDEX IF NOT EXISTS idx_metric_ref ON metric_references(species, metric_type);

-- Seed: referências básicas de peso por porte
INSERT INTO metric_references (species, size, metric_type, reference_min, reference_max, unit, notes) VALUES
  ('dog', 'small',  'weight', 2, 10, 'kg', 'Cães pequenos: Poodle, Shih Tzu, Maltês'),
  ('dog', 'medium', 'weight', 10, 25, 'kg', 'Cães médios: Beagle, Cocker, Bulldog'),
  ('dog', 'large',  'weight', 25, 45, 'kg', 'Cães grandes: Labrador, Golden, Pastor'),
  ('cat', NULL,     'weight', 3, 6, 'kg', 'Gatos adultos (média)'),
  ('dog', NULL,     'temperature', 38.0, 39.2, '°C', 'Temperatura corporal normal'),
  ('cat', NULL,     'temperature', 38.0, 39.5, '°C', 'Temperatura corporal normal'),
  ('dog', NULL,     'heart_rate', 60, 140, 'bpm', 'Frequência cardíaca em repouso'),
  ('cat', NULL,     'heart_rate', 120, 220, 'bpm', 'Frequência cardíaca em repouso')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════
-- 7. CREATE VIEW vw_pet_health_summary_v2
-- ══════════════════════════════════════

CREATE OR REPLACE VIEW vw_pet_health_summary_v2 AS
SELECT
  p.id AS pet_id,
  p.name,
  p.health_score,
  p.current_mood,
  p.weight_kg AS current_weight,
  (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND v.next_due_date < CURRENT_DATE AND v.is_active = TRUE) AS vaccines_overdue,
  (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND (v.next_due_date IS NULL OR v.next_due_date >= CURRENT_DATE) AND v.is_active = TRUE) AS vaccines_ok,
  (SELECT COUNT(*) FROM allergies a WHERE a.pet_id = p.id AND a.is_active = TRUE) AS allergies_count,
  (SELECT cm.value FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' AND cm.is_active = TRUE ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight,
  (SELECT cm.measured_at FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' AND cm.is_active = TRUE ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight_date,
  (SELECT COUNT(*) FROM diary_entries d WHERE d.pet_id = p.id AND d.is_active = TRUE) AS diary_count,
  (SELECT COUNT(*) FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.is_active = TRUE) AS metrics_count
FROM pets p
WHERE p.is_active = TRUE;
