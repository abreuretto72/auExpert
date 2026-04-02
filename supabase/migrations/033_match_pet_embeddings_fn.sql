-- match_pet_embeddings: vector similarity search for a pet's RAG context
-- Uses pgvector cosine distance (<=>).
-- Returns top-K embeddings above the similarity threshold.

CREATE OR REPLACE FUNCTION match_pet_embeddings(
  p_pet_id           UUID,
  p_query_embedding  vector(1536),
  p_match_threshold  float  DEFAULT 0.5,
  p_match_count      int    DEFAULT 5
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
    AND 1 - (embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;
