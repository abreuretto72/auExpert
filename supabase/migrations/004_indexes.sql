-- Migration 004: Indexes
-- auExpert MVP

-- ══════════════════════════════════════
-- USERS
-- ══════════════════════════════════════
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_cpf ON users (cpf) WHERE cpf IS NOT NULL;

-- ══════════════════════════════════════
-- SESSIONS
-- ══════════════════════════════════════
CREATE INDEX idx_sessions_user ON sessions (user_id, is_active);
CREATE INDEX idx_sessions_expires ON sessions (expires_at) WHERE is_active = true;

-- ══════════════════════════════════════
-- PETS
-- ══════════════════════════════════════
CREATE INDEX idx_pets_user ON pets (user_id) WHERE is_active = true;
CREATE INDEX idx_pets_species ON pets (user_id, species) WHERE is_active = true;
CREATE INDEX idx_pets_microchip ON pets (microchip_id) WHERE microchip_id IS NOT NULL;
CREATE INDEX idx_pets_memorial ON pets (user_id) WHERE is_memorial = true;

-- ══════════════════════════════════════
-- DIARY_ENTRIES
-- ══════════════════════════════════════
CREATE INDEX idx_diary_pet_date ON diary_entries (pet_id, entry_date DESC)
  WHERE is_active = true;
CREATE INDEX idx_diary_user ON diary_entries (user_id, created_at DESC)
  WHERE is_active = true;

-- ══════════════════════════════════════
-- MOOD_LOGS
-- ══════════════════════════════════════
CREATE INDEX idx_mood_pet_timeline ON mood_logs (pet_id, created_at DESC)
  WHERE is_active = true;

-- ══════════════════════════════════════
-- PHOTO_ANALYSES
-- ══════════════════════════════════════
CREATE INDEX idx_photo_pet ON photo_analyses (pet_id, created_at DESC)
  WHERE is_active = true;
CREATE INDEX idx_photo_type ON photo_analyses (pet_id, analysis_type)
  WHERE is_active = true;

-- ══════════════════════════════════════
-- VACCINES
-- ══════════════════════════════════════
CREATE INDEX idx_vaccines_pet ON vaccines (pet_id, date_administered DESC)
  WHERE is_active = true;
CREATE INDEX idx_vaccines_due ON vaccines (pet_id, next_due_date)
  WHERE is_active = true AND next_due_date IS NOT NULL;
CREATE INDEX idx_vaccines_status ON vaccines (status)
  WHERE is_active = true AND status IN ('overdue', 'upcoming');

-- ══════════════════════════════════════
-- ALLERGIES
-- ══════════════════════════════════════
CREATE INDEX idx_allergies_pet ON allergies (pet_id) WHERE is_active = true;

-- ══════════════════════════════════════
-- PET_EMBEDDINGS (pgvector)
-- ══════════════════════════════════════
CREATE INDEX idx_embeddings_pet_type ON pet_embeddings (pet_id, content_type)
  WHERE is_active = true;

-- IVFFlat index for cosine similarity search
-- NOTE: Requires at least some data before creation.
-- Run after seeding: CREATE INDEX idx_embeddings_vector ON pet_embeddings
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ══════════════════════════════════════
-- RAG_CONVERSATIONS
-- ══════════════════════════════════════
CREATE INDEX idx_rag_pet ON rag_conversations (pet_id, created_at DESC)
  WHERE is_active = true;

-- ══════════════════════════════════════
-- NOTIFICATIONS_QUEUE
-- ══════════════════════════════════════
CREATE INDEX idx_notif_user_unread ON notifications_queue (user_id, created_at DESC)
  WHERE is_read = false AND is_active = true;
CREATE INDEX idx_notif_scheduled ON notifications_queue (scheduled_for)
  WHERE sent_at IS NULL AND is_active = true;

-- ══════════════════════════════════════
-- MEDIA_FILES
-- ══════════════════════════════════════
CREATE INDEX idx_media_user ON media_files (user_id) WHERE is_active = true;
CREATE INDEX idx_media_pet ON media_files (pet_id) WHERE is_active = true AND pet_id IS NOT NULL;

-- ══════════════════════════════════════
-- AUDIT_LOG
-- ══════════════════════════════════════
CREATE INDEX idx_audit_user_action ON audit_log (user_id, action, created_at DESC);
CREATE INDEX idx_audit_table ON audit_log (table_name, created_at DESC);
