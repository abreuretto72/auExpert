-- Migration 025: Add narration_outdated flag to diary_entries
-- Set to true when the tutor edits entry content but keeps the existing
-- AI narration without regenerating it (narration may no longer match the text).

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS narration_outdated BOOLEAN DEFAULT false;

COMMENT ON COLUMN diary_entries.narration_outdated
  IS 'True when content was edited after the narration was generated, meaning the narration may no longer reflect the current text.';
