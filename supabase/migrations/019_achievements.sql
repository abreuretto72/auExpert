-- Migration 019: Achievements (Conquistas + XP + Nível)
-- Unlocked automatically by client after each diary save, based on pet stats.
-- Depends on: 012_diary_centric_phase1.sql (diary_entries)

-- ── Pet XP and Level columns ──────────────────────────────────────────────────

ALTER TABLE pets
  ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level    INTEGER NOT NULL DEFAULT 1;

-- ── achievements ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS achievements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id           UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diary_entry_id   UUID        REFERENCES diary_entries(id) ON DELETE SET NULL,

  achievement_key  VARCHAR(50) NOT NULL,       -- unique identifier, e.g. 'diary_10'
  title            TEXT        NOT NULL,       -- localized title (fallback stored in DB)
  description      TEXT        NOT NULL,       -- localized description (fallback)
  category         VARCHAR(20) NOT NULL
                     CHECK (category IN (
                       'diary', 'health', 'social',
                       'financial', 'travel', 'milestone', 'special'
                     )),
  xp_reward        INTEGER     NOT NULL DEFAULT 10,
  rarity           VARCHAR(10) NOT NULL DEFAULT 'common'
                     CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  icon_name        VARCHAR(50),               -- Lucide icon name

  unlocked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each achievement unlocks at most once per pet
  UNIQUE (pet_id, achievement_key)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_achievements_pet_id    ON achievements(pet_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category  ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_unlocked  ON achievements(pet_id, unlocked_at DESC);

-- ── XP trigger — increment pet XP + recalculate level on new achievement ─────

CREATE OR REPLACE FUNCTION increment_pet_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pets
  SET
    xp_total = xp_total + NEW.xp_reward,
    level = CASE
      WHEN (xp_total + NEW.xp_reward) >= 5000 THEN 10
      WHEN (xp_total + NEW.xp_reward) >= 3000 THEN 9
      WHEN (xp_total + NEW.xp_reward) >= 2000 THEN 8
      WHEN (xp_total + NEW.xp_reward) >= 1500 THEN 7
      WHEN (xp_total + NEW.xp_reward) >= 1000 THEN 6
      WHEN (xp_total + NEW.xp_reward) >= 700  THEN 5
      WHEN (xp_total + NEW.xp_reward) >= 400  THEN 4
      WHEN (xp_total + NEW.xp_reward) >= 200  THEN 3
      WHEN (xp_total + NEW.xp_reward) >= 80   THEN 2
      ELSE 1
    END
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_xp
  AFTER INSERT ON achievements
  FOR EACH ROW EXECUTE FUNCTION increment_pet_xp();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY achievements_own ON achievements
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
