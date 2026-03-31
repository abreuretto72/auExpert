-- Migration 021: Scheduled Events (Agenda)
-- Future appointments, reminders and recurring events for a pet.
-- Depends on: 002_core_tables.sql (pets)

-- ── scheduled_events ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduled_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diary_entry_id   UUID        REFERENCES diary_entries(id) ON DELETE SET NULL,

  event_type       VARCHAR(30) NOT NULL DEFAULT 'custom'
                     CHECK (event_type IN (
                       'consultation', 'return_visit', 'exam', 'surgery',
                       'physiotherapy', 'vaccine', 'travel_vaccine',
                       'medication_dose', 'medication_series',
                       'deworming', 'antiparasitic',
                       'grooming', 'nail_trim', 'dental_cleaning', 'microchip',
                       'plan_renewal', 'insurance_renewal', 'plan_payment',
                       'training', 'behaviorist', 'socialization',
                       'travel_checklist', 'custom'
                     )),

  title            TEXT        NOT NULL,
  description      TEXT,
  professional     TEXT,       -- vet / groomer / trainer name
  location         TEXT,       -- clinic / petshop name

  scheduled_for    TIMESTAMPTZ NOT NULL,
  all_day          BOOLEAN     NOT NULL DEFAULT FALSE,

  status           VARCHAR(15) NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled', 'confirmed', 'done', 'cancelled', 'missed')),

  is_recurring     BOOLEAN     NOT NULL DEFAULT FALSE,
  recurrence_rule  VARCHAR(20)
                     CHECK (recurrence_rule IN (
                       'daily', 'weekly', 'biweekly', 'monthly',
                       'quarterly', 'biannual', 'annual', NULL
                     )),

  source           VARCHAR(10) NOT NULL DEFAULT 'manual'
                     CHECK (source IN ('manual', 'ai', 'system')),

  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_scheduled_events_pet_id   ON scheduled_events(pet_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_date     ON scheduled_events(pet_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_status   ON scheduled_events(pet_id, status);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_events_own ON scheduled_events
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
