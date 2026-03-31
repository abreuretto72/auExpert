-- Migration 015: Pet audio fields on diary_entries
-- Adds audio recording support (barks, meows, purrs) captured via expo-av

-- ─── Audio columns on diary_entries ───────────────────────────────────────────

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS audio_url       TEXT,
  ADD COLUMN IF NOT EXISTS audio_duration  INTEGER,            -- seconds
  ADD COLUMN IF NOT EXISTS pet_audio_analysis JSONB;           -- PetAudioAnalysis JSON

-- Expected shape for pet_audio_analysis:
-- {
--   "sound_type":     "bark" | "meow" | "purr" | "whine" | "growl" | "howl" | "chirp" | "other",
--   "emotional_state": string,
--   "intensity":      "low" | "medium" | "high",
--   "pattern_notes":  string
-- }

-- ─── pet_mood_logs: optional structured emotion history ───────────────────────
-- Stores each AI-inferred emotional state over time for trend analysis and RAG context.

CREATE TABLE IF NOT EXISTS pet_mood_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  diary_entry_id  UUID REFERENCES diary_entries(id) ON DELETE SET NULL,
  source          TEXT NOT NULL CHECK (source IN ('audio', 'photo', 'video', 'manual', 'ai_insight')),
  emotional_state TEXT NOT NULL,
  intensity       TEXT CHECK (intensity IN ('low', 'medium', 'high')),
  sound_type      TEXT,           -- populated when source = 'audio'
  notes           TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pet_mood_logs_pet_id_idx      ON pet_mood_logs(pet_id);
CREATE INDEX IF NOT EXISTS pet_mood_logs_recorded_at_idx ON pet_mood_logs(pet_id, recorded_at DESC);

-- RLS: tutors can only access their own pet's logs
ALTER TABLE pet_mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tutors manage own pet mood logs"
  ON pet_mood_logs
  USING (
    pet_id IN (SELECT id FROM pets WHERE tutor_id = auth.uid())
  )
  WITH CHECK (
    pet_id IN (SELECT id FROM pets WHERE tutor_id = auth.uid())
  );
