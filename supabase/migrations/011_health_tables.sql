-- Migration 011: Health Tables
-- Creates exams, medications, consultations, surgeries tables
-- auExpert Prontuário de Saúde

-- ══════════════════════════════════════
-- 1. EXAMS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS exams (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(100) NOT NULL,
  date          DATE NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'normal'
                CHECK (status IN ('normal','attention','abnormal','critical','pending')),
  results       JSONB DEFAULT '[]'::jsonb,
  laboratory    VARCHAR(100),
  veterinarian  VARCHAR(100),
  notes         TEXT,
  photo_url     TEXT,
  source        VARCHAR(20) DEFAULT 'manual'
                CHECK (source IN ('manual','ocr','voice','ai')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exams IS 'Exames laboratoriais e de imagem do pet';

CREATE INDEX IF NOT EXISTS idx_exams_pet ON exams(pet_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(pet_id, date DESC);

-- ══════════════════════════════════════
-- 2. MEDICATIONS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS medications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(100) NOT NULL,
  type          VARCHAR(30) NOT NULL DEFAULT 'other'
                CHECK (type IN ('antiparasitic','supplement','antibiotic','anti_inflammatory','analgesic','antifungal','vermifuge','other')),
  dosage        VARCHAR(50),
  frequency     VARCHAR(50) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE,
  active        BOOLEAN NOT NULL DEFAULT true,
  reason        TEXT,
  prescribed_by VARCHAR(100),
  notes         TEXT,
  source        VARCHAR(20) DEFAULT 'manual'
                CHECK (source IN ('manual','ocr','voice','ai')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE medications IS 'Medicamentos e suplementos em uso pelo pet';

CREATE INDEX IF NOT EXISTS idx_medications_pet ON medications(pet_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(pet_id, active) WHERE active = true;

-- ══════════════════════════════════════
-- 3. CONSULTATIONS
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS consultations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  date          DATE NOT NULL,
  time          TIME,
  type          VARCHAR(30) NOT NULL DEFAULT 'routine'
                CHECK (type IN ('routine','emergency','specialist','surgery','follow_up')),
  veterinarian  VARCHAR(100) NOT NULL,
  clinic        VARCHAR(100),
  summary       TEXT NOT NULL,
  diagnosis     TEXT,
  prescriptions TEXT,
  follow_up_at  DATE,
  cost          DECIMAL(10,2),
  source        VARCHAR(20) DEFAULT 'manual'
                CHECK (source IN ('manual','ocr','voice','ai')),
  photo_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE consultations IS 'Consultas veterinárias do pet';

CREATE INDEX IF NOT EXISTS idx_consultations_pet ON consultations(pet_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(pet_id, date DESC);

-- ══════════════════════════════════════
-- 4. SURGERIES
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS surgeries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  name          VARCHAR(100) NOT NULL,
  date          DATE NOT NULL,
  veterinarian  VARCHAR(100),
  clinic        VARCHAR(100),
  anesthesia    VARCHAR(100),
  status        VARCHAR(20) NOT NULL DEFAULT 'recovered'
                CHECK (status IN ('scheduled','recovering','recovered','complications')),
  notes         TEXT,
  source        VARCHAR(20) DEFAULT 'manual'
                CHECK (source IN ('manual','ocr','voice','ai')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE surgeries IS 'Cirurgias realizadas no pet';

CREATE INDEX IF NOT EXISTS idx_surgeries_pet ON surgeries(pet_id);

-- ══════════════════════════════════════
-- 5. RLS POLICIES
-- ══════════════════════════════════════

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;

-- Exams
CREATE POLICY exams_select ON exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY exams_insert ON exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY exams_update ON exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY exams_delete ON exams FOR DELETE USING (auth.uid() = user_id);

-- Medications
CREATE POLICY medications_select ON medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY medications_insert ON medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY medications_update ON medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY medications_delete ON medications FOR DELETE USING (auth.uid() = user_id);

-- Consultations
CREATE POLICY consultations_select ON consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY consultations_insert ON consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY consultations_update ON consultations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY consultations_delete ON consultations FOR DELETE USING (auth.uid() = user_id);

-- Surgeries
CREATE POLICY surgeries_select ON surgeries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY surgeries_insert ON surgeries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY surgeries_update ON surgeries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY surgeries_delete ON surgeries FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- 6. TRIGGERS: auto-update updated_at
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION trg_fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_exams_updated_at
  BEFORE UPDATE ON exams FOR EACH ROW
  EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trigger_medications_updated_at
  BEFORE UPDATE ON medications FOR EACH ROW
  EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trigger_consultations_updated_at
  BEFORE UPDATE ON consultations FOR EACH ROW
  EXECUTE FUNCTION trg_fn_set_updated_at();

CREATE TRIGGER trigger_surgeries_updated_at
  BEFORE UPDATE ON surgeries FOR EACH ROW
  EXECUTE FUNCTION trg_fn_set_updated_at();
