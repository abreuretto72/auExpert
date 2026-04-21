-- Migration: importance-weighted ranking in match_pet_embeddings
--
-- PROBLEM
-- -------
-- The existing RPC (migration 033 → rewritten in migration 039 for vector(384))
-- returns top-K by raw cosine similarity only. The `pet_embeddings.importance`
-- column is stored on INSERT (allergy 0.95, vaccine 0.9, medication 0.85,
-- consultation/symptom 0.8, exam 0.75, weight 0.7, food 0.6, moment 0.5,
-- expense 0.4 per CLAUDE.md §13.3) but is NEVER READ at retrieval time.
--
-- This means a mood note from 8 months ago can outrank a confirmed allergy
-- when both happen to match the query embedding similarly — the assistant
-- then answers questions about allergies without surfacing the allergy fact.
--
-- FIX
-- ---
-- Rank by (raw_cosine_similarity * importance). Keep the threshold filter
-- applied to the RAW similarity so that low-importance-but-highly-relevant
-- rows are still eligible, but a high-importance row with the same raw
-- similarity will win the ORDER BY tiebreaker.
--
-- The returned `similarity` column becomes the weighted score (what the
-- ranking is based on). This is what the calling code in lib/rag.ts and the
-- search-rag edge function should use to decide which results to show.
--
-- INDEX
-- -----
-- ORDER BY is no longer on raw `embedding <=> query` so HNSW can't be used
-- for the sort. Acceptable tradeoff: the WHERE clause filters to a single
-- pet (typically <1000 embeddings per pet), so a post-filter sort is cheap.
-- HNSW still accelerates the inner nearest-neighbor lookup if the planner
-- chooses to use it; otherwise sequential scan on per-pet rows is fine.

BEGIN;

DROP FUNCTION IF EXISTS match_pet_embeddings(uuid, vector, float, int);

CREATE OR REPLACE FUNCTION match_pet_embeddings(
  p_pet_id           UUID,
  p_query_embedding  vector(384),
  p_match_threshold  float DEFAULT 0.5,
  p_match_count      int   DEFAULT 5
)
RETURNS TABLE (
  id              UUID,
  content_text    TEXT,
  category        TEXT,
  importance      float,
  diary_entry_id  UUID,
  created_at      TIMESTAMPTZ,
  similarity      float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content_text,
    category,
    importance,
    diary_entry_id,
    created_at,
    -- Weighted score: raw cosine similarity (0..1) × importance (0..1)
    -- This is what the ORDER BY below ranks on, and what the caller sees.
    (1 - (embedding <=> p_query_embedding)) * COALESCE(importance, 0.5) AS similarity
  FROM pet_embeddings
  WHERE
    pet_id = p_pet_id
    AND is_active = true
    AND embedding IS NOT NULL
    -- Threshold applies to RAW similarity so importance can't drag
    -- irrelevant rows in, only re-rank relevant ones.
    AND (1 - (embedding <=> p_query_embedding)) > p_match_threshold
  ORDER BY (1 - (embedding <=> p_query_embedding)) * COALESCE(importance, 0.5) DESC
  LIMIT p_match_count;
$$;

COMMIT;
