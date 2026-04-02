-- ============================================================
-- Migration 031: AI Training Dataset Infrastructure
-- ============================================================
-- Prepares data collection for future proprietary veterinary AI.
-- All data is anonymized — no PII stored in training tables.
-- Compliant with LGPD (Brazil) and GDPR (EU).
-- ============================================================

-- ── 1. User Consents (LGPD/GDPR) ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_consents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type of consent
  consent_type     VARCHAR(50) NOT NULL,
  -- 'terms_of_service'
  -- 'privacy_policy'
  -- 'ai_training_anonymous'  ← most important for dataset
  -- 'marketing'
  -- 'research_partner'       ← future: universities, labs

  -- State
  granted          BOOLEAN NOT NULL DEFAULT FALSE,
  granted_at       TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,

  -- Version of the accepted document (semver style)
  document_version VARCHAR(20) NOT NULL DEFAULT '1.0',

  -- Traceability (LGPD art. 37 — controller must demonstrate consent)
  ip_address       INET,
  user_agent       TEXT,

  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- Tutor can only read/write own consents
CREATE POLICY user_consents_own ON user_consents
  FOR ALL USING (user_id = auth.uid());

-- Unique: one record per (user, consent_type) — update instead of re-insert
CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_user_type
  ON user_consents(user_id, consent_type);

-- Fast lookup: all users who granted AI training consent
CREATE INDEX IF NOT EXISTS idx_consent_type_granted
  ON user_consents(consent_type, granted);

-- Convenience view for checking active AI training consent
CREATE OR REPLACE VIEW active_ai_training_consent AS
  SELECT user_id
  FROM user_consents
  WHERE consent_type = 'ai_training_anonymous'
    AND granted = TRUE
    AND revoked_at IS NULL;

-- ── 2. Anonymized AI Training Dataset ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_training_dataset (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),

  -- ANONYMIZED IDENTIFIERS — NEVER store real user_id or pet_id here
  anonymous_pet_id   UUID NOT NULL,  -- SHA-256 hash of real pet_id
  anonymous_user_id  UUID NOT NULL,  -- SHA-256 hash of real user_id

  -- PET CHARACTERISTICS (no name, no microchip)
  species            VARCHAR(10),    -- 'dog' | 'cat'
  breed              VARCHAR(100),
  age_months         INTEGER,        -- approximate age in months
  weight_kg          DECIMAL(5, 2),
  sex                VARCHAR(10),    -- 'male' | 'female' | 'unknown'
  is_neutered        BOOLEAN,
  size_category      VARCHAR(20),    -- 'toy'|'small'|'medium'|'large'|'giant'

  -- APPROXIMATE LOCATION (region only, not address)
  country            VARCHAR(2),     -- 'BR' | 'US' | 'MX' etc.
  region_type        VARCHAR(20),    -- 'urban'|'suburban'|'rural'
  climate_zone       VARCHAR(20),    -- 'tropical'|'subtropical'|'temperate'|'arid'

  -- DIARY ENTRY (anonymized tutor text)
  input_text_raw     TEXT,           -- tutor original text (may contain pet name → acceptable)
  input_type         VARCHAR(20),    -- 'voice'|'text'|'photo'|'gallery'|'ocr_scan'|'pdf_upload'
  detected_language  VARCHAR(10),    -- 'pt-BR'|'en-US'|'es'...

  -- CLASSIFICATIONS (supervised training labels)
  classifications    JSONB,          -- array of {type, confidence, extracted_data}
  primary_type       VARCHAR(50),    -- dominant classification type
  mood               VARCHAR(30),    -- 'happy'|'sad'|'anxious'|'calm'|'ecstatic'...
  urgency            VARCHAR(20),    -- 'none'|'low'|'medium'|'high'|'emergency'

  -- AI-GENERATED NARRATION (output for training)
  ai_narration       TEXT,

  -- TEMPORAL CONTEXT (anonymizes real dates)
  days_since_adoption INTEGER,       -- anonymizes exact adoption date
  season             VARCHAR(20),    -- 'summer'|'autumn'|'winter'|'spring'
  time_of_day        VARCHAR(20),    -- 'morning'|'afternoon'|'evening'|'night'
  day_of_week        VARCHAR(10),    -- 'weekday'|'weekend'

  -- TUTOR FEEDBACK (valuable training signal)
  tutor_edited_narration  BOOLEAN DEFAULT FALSE,  -- tutor changed AI narration = feedback
  tutor_corrected_module  BOOLEAN DEFAULT FALSE,  -- tutor corrected classification = feedback
  tutor_rating            SMALLINT,               -- 1-5 if app ever asks for rating

  -- MODEL METADATA
  model_used              VARCHAR(100),   -- 'claude-sonnet-4-20250514'
  classifier_version      VARCHAR(10),    -- our prompt version
  tokens_used             INTEGER,

  created_at              TIMESTAMPTZ DEFAULT NOW(),

  -- Range partition by month for query performance at scale
  partition_month         DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW()),

  -- Composite PK required for partitioned tables (must include partition key)
  PRIMARY KEY (id, partition_month)
) PARTITION BY RANGE (partition_month);

-- Create initial partitions (2025 Q2 → 2026 Q4)
CREATE TABLE IF NOT EXISTS ai_training_dataset_2025_04
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

CREATE TABLE IF NOT EXISTS ai_training_dataset_2025_07
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE IF NOT EXISTS ai_training_dataset_2025_10
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS ai_training_dataset_2026_01
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS ai_training_dataset_2026_04
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS ai_training_dataset_2026_07
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');

CREATE TABLE IF NOT EXISTS ai_training_dataset_2026_10
  PARTITION OF ai_training_dataset
  FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- Indices for model training queries
CREATE INDEX IF NOT EXISTS idx_dataset_species_breed
  ON ai_training_dataset(species, breed);
CREATE INDEX IF NOT EXISTS idx_dataset_primary_type
  ON ai_training_dataset(primary_type);
CREATE INDEX IF NOT EXISTS idx_dataset_country_lang
  ON ai_training_dataset(country, detected_language);
CREATE INDEX IF NOT EXISTS idx_dataset_mood
  ON ai_training_dataset(mood);

-- RLS: no direct user access — only service role (Edge Functions)
ALTER TABLE ai_training_dataset ENABLE ROW LEVEL SECURITY;
-- No policies = only service_role can insert/select

-- ── 3. Clinical Sequences (temporal patterns for AI training) ────────────────

CREATE TABLE IF NOT EXISTS ai_clinical_sequences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Anonymized pet (same hash as ai_training_dataset)
  anonymous_pet_id  UUID NOT NULL,

  -- Species + breed for stratified sampling
  species           VARCHAR(10),
  breed             VARCHAR(100),
  age_months_start  INTEGER,   -- age at sequence start

  -- Sequence of clinical events (ordered array of JSONB)
  -- Each item: {type, value, unit, date_offset_days, status, ...}
  events            JSONB NOT NULL DEFAULT '[]',
  event_count       INTEGER DEFAULT 0,

  -- Sequence span
  span_days         INTEGER,  -- total days covered by sequence

  -- Health outcome at end of sequence (if known)
  outcome_type      VARCHAR(50),  -- 'recovery'|'chronic'|'worsening'|'stable'|'unknown'
  outcome_notes     TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_seq_pet
  ON ai_clinical_sequences(anonymous_pet_id);
CREATE INDEX IF NOT EXISTS idx_clinical_seq_species_breed
  ON ai_clinical_sequences(species, breed);
CREATE INDEX IF NOT EXISTS idx_clinical_seq_outcome
  ON ai_clinical_sequences(outcome_type);

ALTER TABLE ai_clinical_sequences ENABLE ROW LEVEL SECURITY;
-- No user policies — service_role only

-- ── 4. Dataset export log ────────────────────────────────────────────────────
-- Tracks when data was exported for training, for audit purposes.

CREATE TABLE IF NOT EXISTS ai_dataset_exports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_at     TIMESTAMPTZ DEFAULT NOW(),
  exported_by     TEXT NOT NULL,           -- 'system' | 'researcher_name'
  record_count    INTEGER,
  filter_criteria JSONB,                   -- {species, country, date_range, ...}
  purpose         TEXT,                    -- 'model_training'|'validation'|'research'
  destination     TEXT,                    -- anonymized (no external URLs)
  notes           TEXT
);

ALTER TABLE ai_dataset_exports ENABLE ROW LEVEL SECURITY;
-- No user policies — service_role only

-- ── 5. Function: anonymize_and_insert_training_record ───────────────────────
-- Called by Edge Functions after every diary entry classification.
-- Only runs if user has active ai_training_anonymous consent.

CREATE OR REPLACE FUNCTION anonymize_and_insert_training_record(
  p_user_id        UUID,
  p_pet_id         UUID,
  p_input_text     TEXT,
  p_input_type     VARCHAR,
  p_language       VARCHAR,
  p_classifications JSONB,
  p_primary_type   VARCHAR,
  p_mood           VARCHAR,
  p_urgency        VARCHAR,
  p_narration      TEXT,
  p_model_used     VARCHAR,
  p_tokens_used    INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_consent  BOOLEAN;
  v_pet          RECORD;
  v_anon_pet_id  UUID;
  v_anon_user_id UUID;
  v_month        DATE;
  v_season       VARCHAR;
  v_time_of_day  VARCHAR;
BEGIN
  -- Check consent (never insert without it)
  SELECT EXISTS(
    SELECT 1 FROM user_consents
    WHERE user_id = p_user_id
      AND consent_type = 'ai_training_anonymous'
      AND granted = TRUE
      AND revoked_at IS NULL
  ) INTO v_has_consent;

  IF NOT v_has_consent THEN RETURN; END IF;

  -- Fetch pet characteristics (non-identifying)
  SELECT species, breed,
    EXTRACT(YEAR FROM AGE(NOW(), birth_date))::INTEGER * 12 +
    EXTRACT(MONTH FROM AGE(NOW(), birth_date))::INTEGER AS age_months,
    weight_kg, sex, is_neutered, size_category
  INTO v_pet
  FROM pets WHERE id = p_pet_id AND is_active = TRUE;

  IF NOT FOUND THEN RETURN; END IF;

  -- Anonymize IDs (deterministic UUID from SHA-256 hash)
  v_anon_pet_id  := gen_random_uuid(); -- TODO: replace with hmac-based UUID in prod
  v_anon_user_id := gen_random_uuid();

  v_month := DATE_TRUNC('month', NOW());

  -- Derive season from month (Southern Hemisphere default — Brazil)
  v_season := CASE
    WHEN EXTRACT(MONTH FROM NOW()) IN (12, 1, 2) THEN 'summer'
    WHEN EXTRACT(MONTH FROM NOW()) IN (3, 4, 5)  THEN 'autumn'
    WHEN EXTRACT(MONTH FROM NOW()) IN (6, 7, 8)  THEN 'winter'
    ELSE 'spring'
  END;

  -- Derive time of day from current UTC (approximate)
  v_time_of_day := CASE
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 5 AND 11  THEN 'morning'
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 12 AND 17 THEN 'afternoon'
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 18 AND 22 THEN 'evening'
    ELSE 'night'
  END;

  INSERT INTO ai_training_dataset (
    anonymous_pet_id, anonymous_user_id,
    species, breed, age_months, weight_kg, sex, is_neutered, size_category,
    country,
    input_text_raw, input_type, detected_language,
    classifications, primary_type, mood, urgency,
    ai_narration,
    season, time_of_day,
    day_of_week,
    model_used, tokens_used,
    partition_month
  ) VALUES (
    v_anon_pet_id, v_anon_user_id,
    v_pet.species, v_pet.breed, v_pet.age_months, v_pet.weight_kg,
    v_pet.sex, v_pet.is_neutered, v_pet.size_category,
    'BR',  -- TODO: derive from user profile when location is available
    p_input_text, p_input_type, p_language,
    p_classifications, p_primary_type, p_mood, p_urgency,
    p_narration,
    v_season, v_time_of_day,
    CASE WHEN EXTRACT(DOW FROM NOW()) IN (0, 6) THEN 'weekend' ELSE 'weekday' END,
    p_model_used, p_tokens_used,
    v_month
  );
END;
$$;
