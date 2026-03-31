-- Migration 017: pet_connections table (social graph of the pet)
-- Stores friendships and encounters detected from diary entries

CREATE TABLE IF NOT EXISTS pet_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id) ON DELETE SET NULL,
    friend_name     VARCHAR(100) NOT NULL,
    friend_species  VARCHAR(20) DEFAULT 'unknown'
                    CHECK (friend_species IN ('dog','cat','bird','rabbit','other','unknown')),
    friend_breed    VARCHAR(100),
    friend_owner    VARCHAR(100),
    friend_pet_id   UUID REFERENCES pets(id) ON DELETE SET NULL,  -- if friend is also in app
    connection_type VARCHAR(20) DEFAULT 'friend'
                    CHECK (connection_type IN (
                      'friend','playmate','neighbor','relative',
                      'rival','caretaker_pet','unknown'
                    )),
    first_met_at    DATE,
    last_seen_at    DATE,
    meet_count      INTEGER DEFAULT 1,
    photo_url       TEXT,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connections_pet       ON pet_connections(pet_id);
CREATE INDEX IF NOT EXISTS idx_connections_name      ON pet_connections(pet_id, friend_name);
CREATE INDEX IF NOT EXISTS idx_connections_last_seen ON pet_connections(pet_id, last_seen_at DESC);

-- RLS
ALTER TABLE pet_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY connections_own ON pet_connections
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: on re-encounter with known friend, increment meet_count instead of inserting duplicate
CREATE OR REPLACE FUNCTION update_friend_meet_count()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pet_connections
    WHERE pet_id       = NEW.pet_id
      AND LOWER(friend_name) = LOWER(NEW.friend_name)
      AND is_active    = TRUE
      AND id          != NEW.id
  ) THEN
    UPDATE pet_connections
    SET meet_count   = meet_count + 1,
        last_seen_at = COALESCE(NEW.first_met_at, CURRENT_DATE)
    WHERE pet_id     = NEW.pet_id
      AND LOWER(friend_name) = LOWER(NEW.friend_name)
      AND is_active  = TRUE;
    RETURN NULL;  -- cancel the duplicate insert
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_friend_meet_count
  BEFORE INSERT ON pet_connections
  FOR EACH ROW EXECUTE FUNCTION update_friend_meet_count();
