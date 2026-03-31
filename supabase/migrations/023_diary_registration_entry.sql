-- Migration 023: is_registration_entry flag on diary_entries
-- Marks the first diary entry auto-created when a pet is registered with a photo.
-- Inserted by handleAddPetSubmit in the app, never by the tutor directly.
-- These entries are protected: soft-delete only, no edit/delete UI buttons.

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS is_registration_entry BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for quick lookup (e.g. showing the registration entry at the top)
CREATE INDEX IF NOT EXISTS idx_diary_registration
  ON diary_entries (pet_id, is_registration_entry)
  WHERE is_registration_entry = TRUE;
