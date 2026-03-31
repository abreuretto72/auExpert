-- Migration: 014_diary_parent_entry
-- Adds parent_entry_id to support batch PDF imports (one parent + N child entries)

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS parent_entry_id UUID
    REFERENCES diary_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_diary_parent
  ON diary_entries(parent_entry_id)
  WHERE parent_entry_id IS NOT NULL;

COMMENT ON COLUMN diary_entries.parent_entry_id IS
  'For batch imports (e.g. PDF upload): references the parent pdf_upload diary entry';
