-- Migration 013: expenses table
-- Tracks pet-care expenses extracted from receipts/invoices via OCR
-- or entered manually. Linked to diary_entries via linked_expense_id.

-- ── expenses ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diary_entry_id  UUID REFERENCES diary_entries(id) ON DELETE SET NULL,

  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor          TEXT,                          -- Clinic name, pharmacy, etc.
  category        TEXT NOT NULL DEFAULT 'other', -- vet | pharmacy | food | grooming | exam | other
  total           DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'BRL',
  items           JSONB NOT NULL DEFAULT '[]',   -- [{desc,qty,unit_price,total}]
  notes           TEXT,
  source          TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai')),

  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_pet_id   ON expenses(pet_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id  ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

-- ── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY expenses_select ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY expenses_insert ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY expenses_update ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY expenses_delete ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ── updated_at trigger ────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
