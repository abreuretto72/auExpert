-- Migration 020: Pet Travels
-- Travel records extracted from diary entries by AI classifier.
-- Depends on: 012_diary_centric_phase1.sql (diary_entries)

-- ── pet_travels ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pet_travels (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diary_entry_id   UUID        REFERENCES diary_entries(id) ON DELETE SET NULL,

  destination      TEXT        NOT NULL,
  country          VARCHAR(2)  NOT NULL DEFAULT 'BR',
  region           TEXT,

  travel_type      VARCHAR(20) NOT NULL DEFAULT 'road_trip'
                     CHECK (travel_type IN (
                       'road_trip', 'flight', 'local',
                       'international', 'camping', 'other'
                     )),
  status           VARCHAR(10) NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('planned', 'active', 'completed')),

  start_date       DATE,
  end_date         DATE,
  distance_km      NUMERIC(7,1),

  notes            TEXT,
  photos           TEXT[]      NOT NULL DEFAULT '{}',
  tags             TEXT[]      NOT NULL DEFAULT '{}',

  extracted_data   JSONB       NOT NULL DEFAULT '{}',
  source           VARCHAR(10) NOT NULL DEFAULT 'ai'
                     CHECK (source IN ('ai', 'manual')),

  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── diary_entries — link column ────────────────────────────────────────────────

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS linked_travel_id UUID REFERENCES pet_travels(id) ON DELETE SET NULL;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pet_travels_pet_id    ON pet_travels(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_travels_status    ON pet_travels(pet_id, status);
CREATE INDEX IF NOT EXISTS idx_pet_travels_date      ON pet_travels(pet_id, start_date DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE pet_travels ENABLE ROW LEVEL SECURITY;

CREATE POLICY pet_travels_own ON pet_travels
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
