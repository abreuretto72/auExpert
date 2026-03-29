-- Migration 003: Row Level Security Policies
-- auExpert MVP

-- Enable RLS on ALL tables
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets               ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analyses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_embeddings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════
-- USERS — tutor vê/edita apenas seu perfil
-- ══════════════════════════════════════
CREATE POLICY users_select ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY users_update ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ══════════════════════════════════════
-- SESSIONS — tutor vê apenas suas sessões
-- ══════════════════════════════════════
CREATE POLICY sessions_select ON sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sessions_insert ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_delete ON sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- PETS — tutor vê/cria/edita apenas seus pets
-- ══════════════════════════════════════
CREATE POLICY pets_select ON pets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY pets_insert ON pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY pets_update ON pets
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY pets_delete ON pets
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- DIARY_ENTRIES — tutor acessa diário dos seus pets
-- ══════════════════════════════════════
CREATE POLICY diary_select ON diary_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY diary_insert ON diary_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY diary_update ON diary_entries
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY diary_delete ON diary_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- MOOD_LOGS — tutor acessa moods dos seus pets
-- ══════════════════════════════════════
CREATE POLICY mood_select ON mood_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY mood_insert ON mood_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════
-- PHOTO_ANALYSES — tutor acessa análises dos seus pets
-- ══════════════════════════════════════
CREATE POLICY photo_select ON photo_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY photo_insert ON photo_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════
-- VACCINES — tutor gerencia vacinas dos seus pets
-- ══════════════════════════════════════
CREATE POLICY vaccines_select ON vaccines
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY vaccines_insert ON vaccines
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY vaccines_update ON vaccines
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY vaccines_delete ON vaccines
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- ALLERGIES — tutor gerencia alergias dos seus pets
-- ══════════════════════════════════════
CREATE POLICY allergies_select ON allergies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY allergies_insert ON allergies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY allergies_update ON allergies
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY allergies_delete ON allergies
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- PET_EMBEDDINGS — isolado por pet (via pet ownership)
-- ══════════════════════════════════════
CREATE POLICY embeddings_select ON pet_embeddings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_embeddings.pet_id AND pets.user_id = auth.uid())
  );

CREATE POLICY embeddings_insert ON pet_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_embeddings.pet_id AND pets.user_id = auth.uid())
  );

-- ══════════════════════════════════════
-- RAG_CONVERSATIONS — tutor acessa conversas dos seus pets
-- ══════════════════════════════════════
CREATE POLICY rag_select ON rag_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY rag_insert ON rag_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════
-- NOTIFICATIONS_QUEUE — tutor vê suas notificações
-- ══════════════════════════════════════
CREATE POLICY notif_select ON notifications_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notif_update ON notifications_queue
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ══════════════════════════════════════
-- MEDIA_FILES — tutor acessa seus arquivos
-- ══════════════════════════════════════
CREATE POLICY media_select ON media_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY media_insert ON media_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY media_delete ON media_files
  FOR DELETE USING (auth.uid() = user_id);

-- ══════════════════════════════════════
-- AUDIT_LOG — somente leitura, apenas próprio
-- ══════════════════════════════════════
CREATE POLICY audit_select ON audit_log
  FOR SELECT USING (auth.uid() = user_id);
