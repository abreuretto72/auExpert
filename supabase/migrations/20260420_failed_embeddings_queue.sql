-- Migration: failed_embeddings queue
--
-- PROBLEM
-- -------
-- lib/rag.ts generateEmbedding() wraps generate-embedding edge function calls
-- in fire-and-forget try/catch. If the edge function times out, returns 5xx,
-- or the network drops, the call silently fails and the fact never reaches
-- the pet's RAG. The assistant then answers as if that consultation/vaccine/
-- allergy never happened.
--
-- FIX
-- ---
-- Persist every permanently-failed embedding attempt (after in-memory retries
-- are exhausted) to this table. A background retry CRON or client-side hook
-- can later drain the queue when the edge function comes back.
--
-- Rows here are NEVER surfaced to the user — this is an operational queue.

BEGIN;

CREATE TABLE IF NOT EXISTS failed_embeddings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id         UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  diary_entry_id UUID REFERENCES diary_entries(id) ON DELETE SET NULL,
  category       TEXT NOT NULL,
  content_text   TEXT NOT NULL,
  importance     FLOAT NOT NULL DEFAULT 0.5,
  attempt_count  INT  NOT NULL DEFAULT 1,
  last_error     TEXT,
  -- status: 'pending' = awaiting retry, 'dead' = too many attempts,
  -- 'resolved' = eventually succeeded (kept as audit trail).
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'dead', 'resolved')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ
);

-- Retry worker scans pending rows oldest-first, scoped to a pet.
CREATE INDEX IF NOT EXISTS idx_failed_embeddings_pending
  ON failed_embeddings (pet_id, last_attempt_at)
  WHERE status = 'pending';

-- RLS — same model as pet_embeddings (access gated by pet ownership via pets.user_id).
ALTER TABLE failed_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY failed_embeddings_select ON failed_embeddings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = failed_embeddings.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY failed_embeddings_insert ON failed_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = failed_embeddings.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY failed_embeddings_update ON failed_embeddings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = failed_embeddings.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY failed_embeddings_delete ON failed_embeddings
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = failed_embeddings.pet_id AND pets.user_id = auth.uid())
  );

COMMIT;
