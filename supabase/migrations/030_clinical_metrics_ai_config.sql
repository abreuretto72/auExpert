-- Migration 030: clinical_metrics extended schema + app_config AI keys
-- Adds new metric types, supporting columns, and AI model configuration

-- ══════════════════════════════════════
-- 1. EXTEND clinical_metrics
-- ══════════════════════════════════════

-- Add optional columns for richer clinical data
ALTER TABLE clinical_metrics
  ADD COLUMN IF NOT EXISTS marker_name      VARCHAR(50),         -- e.g. 'ALT', 'glucose', 'creatinine'
  ADD COLUMN IF NOT EXISTS secondary_value  DECIMAL(10,3),       -- e.g. diastolic for blood_pressure
  ADD COLUMN IF NOT EXISTS is_fever         BOOLEAN,             -- temperature > threshold
  ADD COLUMN IF NOT EXISTS is_abnormal      BOOLEAN,             -- outside reference range
  ADD COLUMN IF NOT EXISTS context          VARCHAR(20)
    CHECK (context IS NULL OR context IN ('fasting','post_meal','exercise','resting','random')),
  ADD COLUMN IF NOT EXISTS fasting          BOOLEAN,             -- blood glucose: was pet fasting?
  ADD COLUMN IF NOT EXISTS score            INTEGER              -- body_condition: integer 1-9 (BCS)
    CHECK (score IS NULL OR (score >= 1 AND score <= 9));

-- Drop old metric_type CHECK so we can replace it with expanded list
ALTER TABLE clinical_metrics DROP CONSTRAINT IF EXISTS clinical_metrics_metric_type_check;

ALTER TABLE clinical_metrics
  ADD CONSTRAINT clinical_metrics_metric_type_check
  CHECK (metric_type IN (
    'weight','temperature','heart_rate','respiratory_rate',
    'blood_glucose','blood_pressure','oxygen_saturation',
    'alt_tgp','ast_tgo','creatinine','urea',
    'hemoglobin','hematocrit','platelets','leukocytes',
    'albumin','total_protein','cholesterol','triglycerides',
    'bun','alkaline_phosphatase','bilirubin',
    'body_condition_score','health_score','pain_score',
    'mobility_score','mood_score','energy_score',
    'coat_score','hydration_score',
    'lab_result','custom'
  ));

-- Add reference data for new metric types
INSERT INTO metric_references (species, metric_type, reference_min, reference_max, unit, notes)
VALUES
  ('dog', 'heart_rate',         60,  140, 'bpm',    'Frequência cardíaca em repouso'),
  ('dog', 'respiratory_rate',   10,   30, 'rpm',    'Frequência respiratória em repouso'),
  ('dog', 'blood_glucose',      70,  120, 'mg/dL',  'Glicemia em jejum'),
  ('dog', 'oxygen_saturation',  95,  100, '%',      'SpO2 normal'),
  ('cat', 'heart_rate',        120,  220, 'bpm',    'Frequência cardíaca em repouso'),
  ('cat', 'respiratory_rate',   20,   40, 'rpm',    'Frequência respiratória em repouso'),
  ('cat', 'blood_glucose',      70,  120, 'mg/dL',  'Glicemia em jejum'),
  ('cat', 'oxygen_saturation',  95,  100, '%',      'SpO2 normal')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════
-- 2. INSERT app_config AI keys
-- ══════════════════════════════════════

INSERT INTO app_config (key, value, description) VALUES
  ('ai_model_classify',      '"claude-sonnet-4-20250514"', 'Modelo para classificação do diário'),
  ('ai_model_vision',        '"claude-sonnet-4-20250514"', 'Modelo para análise de foto/vídeo (vision)'),
  ('ai_model_chat',          '"claude-sonnet-4-20250514"', 'Modelo para conversas e personalidade'),
  ('ai_model_narrate',       '"claude-sonnet-4-20250514"', 'Modelo para narração do diário'),
  ('ai_model_insights',      '"claude-sonnet-4-20250514"', 'Modelo para geração de insights'),
  ('ai_model_simple',        '"claude-sonnet-4-20250514"', 'Modelo para tarefas simples (tradução, OCR parse)'),
  ('ai_timeout_ms',          '30000',                      'Timeout padrão para chamadas à API Anthropic (ms)'),
  ('ai_anthropic_version',   '"2023-06-01"',               'Versão da API Anthropic')
ON CONFLICT (key) DO NOTHING;
