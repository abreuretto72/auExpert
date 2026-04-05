-- Migration 035 — pet_conversations + expand pet_embeddings content_type

-- Expand content_type CHECK constraint to support additional RAG categories
ALTER TABLE pet_embeddings
  DROP CONSTRAINT IF EXISTS pet_embeddings_content_type_check;

ALTER TABLE pet_embeddings
  ADD CONSTRAINT pet_embeddings_content_type_check
  CHECK (content_type IN ('diary', 'photo', 'vaccine', 'mood', 'allergy', 'consultation', 'medication', 'profile'));

-- Create pet_conversations for AI assistant chat history
CREATE TABLE IF NOT EXISTS pet_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES auth.users(id),
  user_message      TEXT NOT NULL,
  assistant_message TEXT NOT NULL,
  tokens_used       INTEGER DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pet_conversations_pet
  ON pet_conversations(pet_id, created_at DESC);

ALTER TABLE pet_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_owner" ON pet_conversations
  FOR ALL USING (
    pet_id IN (
      SELECT id FROM pets WHERE user_id = auth.uid()
      UNION
      SELECT pet_id FROM pet_members WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );
