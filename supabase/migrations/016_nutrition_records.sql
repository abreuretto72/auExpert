-- Migration 016: nutrition_records table
-- Stores all AI-classified food/supplement/treat/intolerance entries per pet

CREATE TABLE IF NOT EXISTS nutrition_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id) ON DELETE SET NULL,
    record_type     VARCHAR(20) NOT NULL
                    CHECK (record_type IN (
                      'food','treat','supplement','water','diet_change',
                      'portion','restriction','intolerance'
                    )),
    product_name    VARCHAR(150),
    brand           VARCHAR(100),
    category        VARCHAR(30)
                    CHECK (category IN (
                      'dry_food','wet_food','raw','homemade','treat',
                      'supplement','medication_food','prescription'
                    )),
    portion_grams   DECIMAL(8,2),
    daily_portions  INTEGER DEFAULT 1,
    calories_kcal   DECIMAL(8,2),
    is_current      BOOLEAN DEFAULT FALSE,   -- marks the active food/supplement
    notes           TEXT,
    started_at      DATE,
    ended_at        DATE,
    source          VARCHAR(20) DEFAULT 'text'
                    CHECK (source IN ('text','voice','ocr','photo','manual')),
    extracted_data  JSONB,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nutrition_pet         ON nutrition_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_current     ON nutrition_records(pet_id, is_current)
  WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_nutrition_type        ON nutrition_records(pet_id, record_type);
CREATE INDEX IF NOT EXISTS idx_nutrition_active      ON nutrition_records(pet_id, is_active)
  WHERE is_active = TRUE;

-- RLS
ALTER TABLE nutrition_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY nutrition_own ON nutrition_records
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger: when inserting a new current food, unmark the previous one
CREATE OR REPLACE FUNCTION set_current_food()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE AND NEW.record_type = 'food' THEN
    UPDATE nutrition_records
    SET is_current = FALSE,
        ended_at   = CURRENT_DATE
    WHERE pet_id       = NEW.pet_id
      AND record_type  = 'food'
      AND is_current   = TRUE
      AND id          != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_current_food
  BEFORE INSERT OR UPDATE ON nutrition_records
  FOR EACH ROW EXECUTE FUNCTION set_current_food();
