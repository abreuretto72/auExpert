-- Migration 026: Update fn_get_diary_timeline to return classifications, primary_type and input_type
-- These columns were added in migration 012 but the function was created in 009 and never updated.
-- Without this fix, diary cards never receive their AI classification data.

CREATE OR REPLACE FUNCTION fn_get_diary_timeline(
  p_pet_id UUID,
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20,
  p_entry_type VARCHAR(20) DEFAULT NULL,
  p_mood VARCHAR(20) DEFAULT NULL,
  p_only_special BOOLEAN DEFAULT false,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  input_method VARCHAR(10),
  input_type VARCHAR(30),
  narration TEXT,
  mood_id VARCHAR(20),
  mood_score INTEGER,
  mood_confidence FLOAT,
  entry_type VARCHAR(20),
  primary_type VARCHAR(30),
  classifications JSONB,
  urgency VARCHAR(10),
  tags JSONB,
  is_special BOOLEAN,
  photos JSONB,
  processing_status VARCHAR(20),
  entry_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  photo_count INTEGER,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_per_page;

  RETURN QUERY
  SELECT
    de.id,
    de.content,
    de.input_method,
    COALESCE(de.input_type, 'text')::VARCHAR(30) AS input_type,
    de.narration,
    de.mood_id,
    de.mood_score,
    COALESCE(de.mood_confidence, 0.5)::FLOAT AS mood_confidence,
    de.entry_type,
    COALESCE(de.primary_type, 'moment')::VARCHAR(30) AS primary_type,
    COALESCE(de.classifications, '[]'::jsonb) AS classifications,
    COALESCE(de.urgency, 'none')::VARCHAR(10) AS urgency,
    de.tags,
    de.is_special,
    de.photos,
    COALESCE(de.processing_status, 'done')::VARCHAR(20) AS processing_status,
    de.entry_date,
    de.created_at,
    de.updated_at,
    jsonb_array_length(COALESCE(de.photos, '[]'::jsonb))::INTEGER AS photo_count,
    COUNT(*) OVER()::BIGINT AS total_count
  FROM diary_entries de
  WHERE de.pet_id = p_pet_id
    AND de.is_active = true
    AND (p_entry_type IS NULL OR de.entry_type = p_entry_type)
    AND (p_mood IS NULL OR de.mood_id = p_mood)
    AND (p_only_special = false OR de.is_special = true)
    AND (p_date_from IS NULL OR de.entry_date >= p_date_from)
    AND (p_date_to IS NULL OR de.entry_date <= p_date_to)
  ORDER BY de.entry_date DESC, de.created_at DESC
  LIMIT p_per_page
  OFFSET v_offset;
END;
$$;
