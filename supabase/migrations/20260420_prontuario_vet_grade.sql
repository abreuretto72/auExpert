-- ============================================================================
-- 20260420_prontuario_vet_grade.sql
-- ----------------------------------------------------------------------------
-- Fase 3 do plano "prontuário vet-grade" (docs/prontuario-vet-grade-plan.md)
-- Bundle único e aditivo:
--   1. ALTER consultations : adiciona 6 sinais vitais (temp, FC, FR, TPC, mucosa, hidrat)
--   2. CREATE body_condition_scores  : BCS 1-9 (WSAVA) com histórico
--   3. CREATE parasite_control       : antipulgas / vermífugo / antiparasitário
--   4. CREATE chronic_conditions     : condições crônicas manejadas
--   5. CREATE trusted_vets           : veterinários de confiança por pet
--   6. CREATE breed_predispositions  : cache global por raça (seed + AI)
--
-- Todas as tabelas:
--   - soft delete via is_active (exceto breed_predispositions = cache global)
--   - RLS com is_pet_owner / is_pet_member / can_write_pet (padrão consultations)
--   - FK user_id → public.users(id)  (não auth.users)
-- Fim do arquivo: NOTIFY pgrst, 'reload schema'
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) ALTER consultations : sinais vitais
-- ----------------------------------------------------------------------------
ALTER TABLE public.consultations
  ADD COLUMN IF NOT EXISTS temperature_celsius   DECIMAL(3,1),
  ADD COLUMN IF NOT EXISTS heart_rate_bpm        INTEGER,
  ADD COLUMN IF NOT EXISTS respiratory_rate_rpm  INTEGER,
  ADD COLUMN IF NOT EXISTS capillary_refill_sec  DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS mucous_color          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS hydration_status      VARCHAR(20);

-- Range / enum checks (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_temperature_check') THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_temperature_check
      CHECK (temperature_celsius IS NULL OR (temperature_celsius >= 30 AND temperature_celsius <= 45));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_heart_rate_check') THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_heart_rate_check
      CHECK (heart_rate_bpm IS NULL OR (heart_rate_bpm >= 20 AND heart_rate_bpm <= 400));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_respiratory_rate_check') THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_respiratory_rate_check
      CHECK (respiratory_rate_rpm IS NULL OR (respiratory_rate_rpm >= 5 AND respiratory_rate_rpm <= 150));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_capillary_refill_check') THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_capillary_refill_check
      CHECK (capillary_refill_sec IS NULL OR (capillary_refill_sec >= 0.5 AND capillary_refill_sec <= 10));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_mucous_color_check') THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_mucous_color_check
      CHECK (mucous_color IS NULL OR mucous_color IN ('pink','pale','cyanotic','jaundiced','injected','other'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'consultations_hydration_status_check') THEN
    ALTER TABLE public.consultations
      ADD CONSTRAINT consultations_hydration_status_check
      CHECK (hydration_status IS NULL OR hydration_status IN ('normal','mild','moderate','severe'));
  END IF;
END$$;

COMMENT ON COLUMN public.consultations.temperature_celsius  IS 'Temperatura retal em graus Celsius (30.0 - 45.0)';
COMMENT ON COLUMN public.consultations.heart_rate_bpm       IS 'Frequência cardíaca em batimentos por minuto';
COMMENT ON COLUMN public.consultations.respiratory_rate_rpm IS 'Frequência respiratória em respirações por minuto';
COMMENT ON COLUMN public.consultations.capillary_refill_sec IS 'Tempo de preenchimento capilar em segundos';
COMMENT ON COLUMN public.consultations.mucous_color         IS 'Coloração das mucosas: pink|pale|cyanotic|jaundiced|injected|other';
COMMENT ON COLUMN public.consultations.hydration_status     IS 'Status de hidratação: normal|mild|moderate|severe';


-- ----------------------------------------------------------------------------
-- 2) body_condition_scores  (BCS 1-9 WSAVA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.body_condition_scores (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID        NOT NULL REFERENCES public.pets(id)  ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.users(id),
  score           SMALLINT    NOT NULL CHECK (score >= 1 AND score <= 9),
  measured_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  measured_by     VARCHAR(20) NOT NULL DEFAULT 'tutor'
                    CHECK (measured_by IN ('tutor','vet','ai_photo')),
  weight_kg       DECIMAL(5,2),
  notes           TEXT,
  source          VARCHAR(20) NOT NULL DEFAULT 'manual',
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bcs_pet_date
  ON public.body_condition_scores (pet_id, measured_at DESC)
  WHERE is_active = TRUE;

ALTER TABLE public.body_condition_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS body_condition_scores_select ON public.body_condition_scores;
CREATE POLICY body_condition_scores_select ON public.body_condition_scores
  FOR SELECT
  USING (
    (is_active = TRUE  AND (is_pet_owner(pet_id) OR is_pet_member(pet_id)))
    OR
    (is_active = FALSE AND is_pet_owner(pet_id))
  );

DROP POLICY IF EXISTS body_condition_scores_insert ON public.body_condition_scores;
CREATE POLICY body_condition_scores_insert ON public.body_condition_scores
  FOR INSERT
  WITH CHECK (can_write_pet(pet_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS body_condition_scores_update ON public.body_condition_scores;
CREATE POLICY body_condition_scores_update ON public.body_condition_scores
  FOR UPDATE
  USING (is_pet_owner(pet_id) OR (can_write_pet(pet_id) AND user_id = auth.uid()));

COMMENT ON TABLE public.body_condition_scores IS 'Histórico de Body Condition Score 1-9 (WSAVA) por pet.';


-- ----------------------------------------------------------------------------
-- 3) parasite_control
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.parasite_control (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID        NOT NULL REFERENCES public.pets(id)  ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES public.users(id),
  type              VARCHAR(20) NOT NULL
                      CHECK (type IN ('flea_tick','vermifuge','heartworm','combined','other')),
  product_name      VARCHAR(200) NOT NULL,
  dose              TEXT,
  administered_at   DATE        NOT NULL,
  next_due_date     DATE,
  administered_by   VARCHAR(20) DEFAULT 'tutor'
                      CHECK (administered_by IN ('tutor','vet','other')),
  notes             TEXT,
  source            VARCHAR(20) NOT NULL DEFAULT 'manual',
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parasite_pet_due
  ON public.parasite_control (pet_id, next_due_date)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_parasite_pet_admin
  ON public.parasite_control (pet_id, administered_at DESC)
  WHERE is_active = TRUE;

ALTER TABLE public.parasite_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parasite_control_select ON public.parasite_control;
CREATE POLICY parasite_control_select ON public.parasite_control
  FOR SELECT
  USING (
    (is_active = TRUE  AND (is_pet_owner(pet_id) OR is_pet_member(pet_id)))
    OR
    (is_active = FALSE AND is_pet_owner(pet_id))
  );

DROP POLICY IF EXISTS parasite_control_insert ON public.parasite_control;
CREATE POLICY parasite_control_insert ON public.parasite_control
  FOR INSERT
  WITH CHECK (can_write_pet(pet_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS parasite_control_update ON public.parasite_control;
CREATE POLICY parasite_control_update ON public.parasite_control
  FOR UPDATE
  USING (is_pet_owner(pet_id) OR (can_write_pet(pet_id) AND user_id = auth.uid()));

COMMENT ON TABLE public.parasite_control IS 'Antipulgas, vermífugos, antiparasitários de coração e combinados.';


-- ----------------------------------------------------------------------------
-- 4) chronic_conditions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chronic_conditions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id             UUID        NOT NULL REFERENCES public.pets(id)  ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES public.users(id),
  name               VARCHAR(200) NOT NULL,
  code               VARCHAR(50),
  diagnosed_date     DATE,
  diagnosed_by       VARCHAR(200),
  severity           VARCHAR(20)
                       CHECK (severity IS NULL OR severity IN ('mild','moderate','severe')),
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','controlled','remission','resolved')),
  treatment_summary  TEXT,
  notes              TEXT,
  source             VARCHAR(20) NOT NULL DEFAULT 'manual',
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chronic_pet
  ON public.chronic_conditions (pet_id)
  WHERE is_active = TRUE;

ALTER TABLE public.chronic_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chronic_conditions_select ON public.chronic_conditions;
CREATE POLICY chronic_conditions_select ON public.chronic_conditions
  FOR SELECT
  USING (
    (is_active = TRUE  AND (is_pet_owner(pet_id) OR is_pet_member(pet_id)))
    OR
    (is_active = FALSE AND is_pet_owner(pet_id))
  );

DROP POLICY IF EXISTS chronic_conditions_insert ON public.chronic_conditions;
CREATE POLICY chronic_conditions_insert ON public.chronic_conditions
  FOR INSERT
  WITH CHECK (can_write_pet(pet_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS chronic_conditions_update ON public.chronic_conditions;
CREATE POLICY chronic_conditions_update ON public.chronic_conditions
  FOR UPDATE
  USING (is_pet_owner(pet_id) OR (can_write_pet(pet_id) AND user_id = auth.uid()));

COMMENT ON TABLE public.chronic_conditions IS 'Condições crônicas manejadas (diabetes, cardiopatia, IRC, osteoartrite, etc.).';


-- ----------------------------------------------------------------------------
-- 5) trusted_vets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trusted_vets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      UUID        NOT NULL REFERENCES public.pets(id)  ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES public.users(id),
  name        VARCHAR(200) NOT NULL,
  specialty   VARCHAR(100),
  phone       VARCHAR(30),
  clinic      VARCHAR(200),
  address     TEXT,
  crmv        VARCHAR(30),
  email       VARCHAR(200),
  is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
  notes       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- apenas 1 vet primário ativo por pet
CREATE UNIQUE INDEX IF NOT EXISTS idx_trusted_vet_primary
  ON public.trusted_vets (pet_id)
  WHERE is_primary = TRUE AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_trusted_vets_pet
  ON public.trusted_vets (pet_id)
  WHERE is_active = TRUE;

ALTER TABLE public.trusted_vets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trusted_vets_select ON public.trusted_vets;
CREATE POLICY trusted_vets_select ON public.trusted_vets
  FOR SELECT
  USING (
    (is_active = TRUE  AND (is_pet_owner(pet_id) OR is_pet_member(pet_id)))
    OR
    (is_active = FALSE AND is_pet_owner(pet_id))
  );

DROP POLICY IF EXISTS trusted_vets_insert ON public.trusted_vets;
CREATE POLICY trusted_vets_insert ON public.trusted_vets
  FOR INSERT
  WITH CHECK (can_write_pet(pet_id) AND user_id = auth.uid());

DROP POLICY IF EXISTS trusted_vets_update ON public.trusted_vets;
CREATE POLICY trusted_vets_update ON public.trusted_vets
  FOR UPDATE
  USING (is_pet_owner(pet_id) OR (can_write_pet(pet_id) AND user_id = auth.uid()));

COMMENT ON TABLE public.trusted_vets IS 'Veterinários de confiança por pet — 1 primário + N especialistas.';


-- ----------------------------------------------------------------------------
-- 6) breed_predispositions  (CACHE GLOBAL — leitura pública)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.breed_predispositions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  species        VARCHAR(10) NOT NULL CHECK (species IN ('dog','cat')),
  breed          VARCHAR(100) NOT NULL,
  condition_key  VARCHAR(100) NOT NULL,
  condition_pt   TEXT        NOT NULL,
  condition_en   TEXT        NOT NULL,
  rationale_pt   TEXT,
  rationale_en   TEXT,
  severity       VARCHAR(20) NOT NULL DEFAULT 'monitor'
                   CHECK (severity IN ('monitor','watch','manage')),
  source         VARCHAR(20) NOT NULL DEFAULT 'seed'
                   CHECK (source IN ('seed','ai')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (species, breed, condition_key)
);

CREATE INDEX IF NOT EXISTS idx_breed_predispositions_lookup
  ON public.breed_predispositions (species, LOWER(breed));

ALTER TABLE public.breed_predispositions ENABLE ROW LEVEL SECURITY;

-- Leitura pública (autenticado ou anon não importa — é dicionário)
DROP POLICY IF EXISTS breed_predispositions_read ON public.breed_predispositions;
CREATE POLICY breed_predispositions_read ON public.breed_predispositions
  FOR SELECT
  USING (TRUE);

-- Sem policy de INSERT/UPDATE/DELETE = apenas service_role consegue gravar
-- (seeds + Edge Function de fallback por AI usam service_role)

COMMENT ON TABLE public.breed_predispositions IS
  'Dicionário global de predisposições por raça. Seed + fallback AI. Leitura pública.';


-- ----------------------------------------------------------------------------
-- Recarga do schema do PostgREST
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
