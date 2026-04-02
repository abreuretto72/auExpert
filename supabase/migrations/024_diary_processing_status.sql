-- Migration 024: processing_status on diary_entries
-- Tracks optimistic entries being processed in the background.
-- Values: 'processing' (AI running), 'done' (default), 'error' (AI failed).
-- In the app, temp entries are cache-only during processing; this column
-- persists the status for entries where the save succeeded but post-processing
-- (narration update, module saves) may still be running.

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) NOT NULL DEFAULT 'done'
  CHECK (processing_status IN ('processing', 'done', 'error'));

-- Partial index for quick lookup of non-done entries (rare in practice)
CREATE INDEX IF NOT EXISTS idx_diary_processing_status
  ON diary_entries (pet_id, processing_status)
  WHERE processing_status != 'done';
