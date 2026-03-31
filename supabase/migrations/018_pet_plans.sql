-- Migration 018: Pet Plans (Planos & Seguros)
-- Tracks health insurance, petcare plans, funeral plans, assistance plans, emergency funds.
-- Data enters via diary AI classification (type = 'plan' or 'insurance').
-- Depends on: 012_diary_centric_phase1.sql (diary_entries), 013+ (expenses, consultations, exams, surgeries)

-- ── pet_plans ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pet_plans (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id             UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diary_entry_id     UUID        REFERENCES diary_entries(id) ON DELETE SET NULL,

  -- Plan identity
  plan_type          TEXT        NOT NULL CHECK (plan_type IN (
                                   'health',       -- plano de saúde pet
                                   'insurance',    -- seguro de vida / funeral
                                   'funeral',      -- plano funeral específico
                                   'assistance',   -- assistência 24h, SOS
                                   'emergency'     -- fundo de emergência / cartão pet
                                 )),
  provider           TEXT        NOT NULL,         -- "Petz Saúde", "Seres Vivos", etc.
  plan_name          TEXT,                         -- "Plano Ouro", "Seguro Total"
  plan_code          TEXT,                         -- número da apólice / contrato

  -- Financial
  monthly_cost       NUMERIC(10, 2),               -- mensalidade
  annual_cost        NUMERIC(10, 2),               -- anuidade (se pago de uma vez)
  coverage_limit     NUMERIC(12, 2),               -- limite máximo de cobertura
  currency           TEXT        NOT NULL DEFAULT 'BRL',

  -- Coverage details (free-form JSON)
  coverage_items     JSONB       DEFAULT '[]',     -- ["cirurgias", "internação", "exames"]
  exclusions         JSONB       DEFAULT '[]',     -- ["doenças preexistentes"]

  -- Dates
  start_date         DATE,
  end_date           DATE,                         -- NULL = sem vencimento / renovação automática
  renewal_date       DATE,                         -- próxima renovação
  last_notified_at   TIMESTAMPTZ,                  -- última notificação de vencimento

  -- Status
  is_active          BOOLEAN     NOT NULL DEFAULT TRUE,
  status             TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),

  -- AI extraction metadata
  extracted_data     JSONB,
  source             TEXT        NOT NULL DEFAULT 'ai'
                                   CHECK (source IN ('ai', 'manual', 'ocr')),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── plan_claims ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS plan_claims (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id               UUID        NOT NULL REFERENCES pet_plans(id) ON DELETE CASCADE,
  pet_id                UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Linked records
  linked_expense_id      UUID        REFERENCES expenses(id) ON DELETE SET NULL,
  linked_consultation_id UUID        REFERENCES consultations(id) ON DELETE SET NULL,
  linked_exam_id         UUID        REFERENCES exams(id) ON DELETE SET NULL,
  linked_surgery_id      UUID        REFERENCES surgeries(id) ON DELETE SET NULL,

  -- Claim details
  claim_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  description           TEXT,
  amount_spent          NUMERIC(10, 2),
  amount_reimbursed     NUMERIC(10, 2),
  status                TEXT        NOT NULL DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'approved', 'rejected', 'partial')),
  notes                 TEXT,

  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pet_plans_pet_id       ON pet_plans(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_plans_status       ON pet_plans(status) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pet_plans_renewal_date ON pet_plans(renewal_date) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_plan_claims_plan_id    ON plan_claims(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_claims_pet_id     ON plan_claims(pet_id);

-- ── Updated-at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_pet_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pet_plans_updated_at
  BEFORE UPDATE ON pet_plans
  FOR EACH ROW EXECUTE FUNCTION update_pet_plans_updated_at();

-- ── pet_plans_summary — materialized view ────────────────────────────────────
-- Aggregates per-pet plan stats for the lens summary card.

CREATE MATERIALIZED VIEW IF NOT EXISTS pet_plans_summary AS
SELECT
  pet_id,
  COUNT(*) FILTER (WHERE status = 'active' AND is_active = TRUE)              AS active_count,
  COALESCE(SUM(monthly_cost) FILTER (WHERE status = 'active' AND is_active = TRUE), 0)
                                                                               AS total_monthly_cost,
  COALESCE(SUM(pc.amount_reimbursed), 0)                                      AS total_reimbursed,
  MIN(renewal_date) FILTER (WHERE status = 'active' AND is_active = TRUE
                                   AND renewal_date >= CURRENT_DATE)           AS next_renewal_date,
  MAX(created_at)                                                              AS last_updated
FROM pet_plans pp
LEFT JOIN plan_claims pc ON pc.plan_id = pp.id AND pc.is_active = TRUE
GROUP BY pet_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pet_plans_summary_pet_id
  ON pet_plans_summary(pet_id);

-- Refresh function (called by CRON)
CREATE OR REPLACE FUNCTION refresh_pet_plans_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY pet_plans_summary;
END;
$$ LANGUAGE plpgsql;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE pet_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_claims  ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_own ON pet_plans
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY claims_own ON plan_claims
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Plan renewal notification helper ────────────────────────────────────────
-- Returns plans that are renewing in exactly N days (for CRON job integration).

CREATE OR REPLACE FUNCTION get_plans_renewing_in(days_ahead INTEGER)
RETURNS TABLE (
  plan_id      UUID,
  pet_id       UUID,
  user_id      UUID,
  provider     TEXT,
  plan_name    TEXT,
  renewal_date DATE,
  days_until   INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pp.id,
    pp.pet_id,
    pp.user_id,
    pp.provider,
    pp.plan_name,
    pp.renewal_date,
    (pp.renewal_date - CURRENT_DATE)::INTEGER AS days_until
  FROM pet_plans pp
  WHERE pp.is_active = TRUE
    AND pp.status = 'active'
    AND pp.renewal_date IS NOT NULL
    AND (pp.renewal_date - CURRENT_DATE) = days_ahead
    AND (pp.last_notified_at IS NULL
         OR pp.last_notified_at < NOW() - INTERVAL '6 days');
END;
$$ LANGUAGE plpgsql;

-- ── diary_entries: add linked_plan_id column ─────────────────────────────────

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS linked_plan_id UUID REFERENCES pet_plans(id) ON DELETE SET NULL;

-- ── Initial materialized view population ─────────────────────────────────────

REFRESH MATERIALIZED VIEW pet_plans_summary;
