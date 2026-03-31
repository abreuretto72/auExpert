-- Migration 022: pet_insights table
-- Stores AI-generated insights (alerts, trends, suggestions) per pet.
-- Inserted by CRONs (check-scheduled-events, refresh-health-views),
-- never by the tutor directly.

CREATE TABLE IF NOT EXISTS pet_insights (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  type        VARCHAR(20) NOT NULL
              CHECK (type IN ('alert', 'trend', 'suggestion')),
  urgency     VARCHAR(10) NOT NULL DEFAULT 'low'
              CHECK (urgency IN ('high', 'medium', 'low')),
  title       VARCHAR(150) NOT NULL,
  body        TEXT NOT NULL,
  source      VARCHAR(30),
  read_at     TIMESTAMPTZ,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE pet_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY insights_own ON pet_insights
  FOR ALL
  USING (user_id = auth.uid());

-- Index: primary access pattern is pet_id + active + urgency sort
CREATE INDEX IF NOT EXISTS idx_insights_pet
  ON pet_insights (pet_id, created_at DESC)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_insights_pet_urgency
  ON pet_insights (pet_id, urgency, created_at DESC)
  WHERE is_active = TRUE;
