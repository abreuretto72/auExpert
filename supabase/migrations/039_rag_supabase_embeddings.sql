-- Migration 039: Migrate pet_embeddings from OpenAI vector(1536)
-- to Supabase AI gte-small vector(384).
--
-- Destructive on the embedding column: existing vectors are incompatible
-- across dimensions and must be dropped. Since lib/rag.ts was a no-op
-- (OPENAI_API_KEY never configured), the table is empty in practice.
-- New embeddings are generated automatically as diary entries are saved.

BEGIN;

-- 1. Drop indexes that depend on the old vector(1536) column
DROP INDEX IF EXISTS pet_embeddings_embedding_idx;
DROP INDEX IF EXISTS idx_pet_embeddings_embedding;

-- 2. Drop the old match function (signature includes vector dimension)
DROP FUNCTION IF EXISTS match_pet_embeddings(uuid, vector, float, int);

-- 3. Swap the column to vector(384)
ALTER TABLE pet_embeddings DROP COLUMN IF EXISTS embedding;
ALTER TABLE pet_embeddings ADD COLUMN embedding vector(384);

-- 4. Recreate HNSW index for cosine similarity (384 dims)
CREATE INDEX pet_embeddings_embedding_idx
  ON pet_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. Recreate match_pet_embeddings for vector(384)
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
    1 - (embedding <=> p_query_embedding) AS similarity
  FROM pet_embeddings
  WHERE
    pet_id    = p_pet_id
    AND is_active = true
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

COMMIT;
