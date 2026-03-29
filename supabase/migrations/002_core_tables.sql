-- Migration 002: Core MVP Tables (12 tables)
-- auExpert MVP — "Diário Inteligente"

-- ══════════════════════════════════════
-- 1. USERS
-- ══════════════════════════════════════
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  full_name     VARCHAR(150) NOT NULL,
  avatar_url    TEXT,
  phone         VARCHAR(20),
  cpf           VARCHAR(14) UNIQUE,
  birth_date    DATE,
  country       VARCHAR(3) DEFAULT 'BRA',
  city          VARCHAR(100),
  state         VARCHAR(2),
  language      VARCHAR(5) NOT NULL DEFAULT 'pt-BR',
  timezone      VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  role          VARCHAR(20) NOT NULL DEFAULT 'tutor_owner'
                CHECK (role IN ('tutor_owner', 'assistant')),
  owner_id      UUID REFERENCES users(id),
  biometric_enabled BOOLEAN NOT NULL DEFAULT false,
  biometric_type    VARCHAR(20) CHECK (biometric_type IN ('fingerprint', 'face_id')),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Tutores e assistentes do auExpert';

-- ══════════════════════════════════════
-- 2. SESSIONS
-- ══════════════════════════════════════
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_name   VARCHAR(100),
  device_type   VARCHAR(20) CHECK (device_type IN ('android', 'ios', 'web')),
  platform      VARCHAR(20),
  ip_address    INET,
  auth_method   VARCHAR(20) CHECK (auth_method IN ('email', 'biometric', 'social')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL
);

COMMENT ON TABLE sessions IS 'Sessões ativas dos usuários';

-- ══════════════════════════════════════
-- 3. PETS
-- ══════════════════════════════════════
CREATE TABLE pets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  species       VARCHAR(3) NOT NULL CHECK (species IN ('dog', 'cat')),
  breed         VARCHAR(100),
  birth_date    DATE,
  estimated_age_months INTEGER,
  sex           VARCHAR(6) CHECK (sex IN ('male', 'female')),
  is_neutered   BOOLEAN,
  weight_kg     DECIMAL(5,2),
  size          VARCHAR(6) CHECK (size IN ('small', 'medium', 'large')),
  color         VARCHAR(50),
  microchip_id  VARCHAR(20) UNIQUE,
  blood_type    VARCHAR(20),
  avatar_url    TEXT,
  personality_tags JSONB DEFAULT '[]'::jsonb,
  ai_personality   TEXT,
  health_score     INTEGER DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
  happiness_score  INTEGER DEFAULT 0 CHECK (happiness_score BETWEEN 0 AND 100),
  current_mood     VARCHAR(20),
  is_memorial      BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pets IS 'Pets cadastrados — apenas cães e gatos';

-- ══════════════════════════════════════
-- 4. DIARY_ENTRIES
-- ══════════════════════════════════════
CREATE TABLE diary_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 3 AND 2000),
  narration     TEXT,
  mood_id       VARCHAR(20) NOT NULL,
  tags          JSONB DEFAULT '[]'::jsonb,
  photos        JSONB DEFAULT '[]'::jsonb,
  is_special    BOOLEAN NOT NULL DEFAULT false,
  entry_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE diary_entries IS 'Entradas do diário com narração IA na voz do pet';

-- ══════════════════════════════════════
-- 5. MOOD_LOGS
-- ══════════════════════════════════════
CREATE TABLE mood_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  mood_id       VARCHAR(20) NOT NULL,
  score         INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  source        VARCHAR(20) NOT NULL DEFAULT 'manual'
                CHECK (source IN ('manual', 'ai_photo', 'ai_diary')),
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mood_logs IS 'Registro de humor do pet — manual ou inferido pela IA';

-- ══════════════════════════════════════
-- 6. PHOTO_ANALYSES
-- ══════════════════════════════════════
CREATE TABLE photo_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  photo_url       TEXT NOT NULL,
  analysis_type   VARCHAR(10) NOT NULL DEFAULT 'general'
                  CHECK (analysis_type IN ('breed', 'mood', 'health', 'general')),
  findings        JSONB NOT NULL DEFAULT '{}'::jsonb,
  health_score    INTEGER CHECK (health_score BETWEEN 0 AND 100),
  confidence      DECIMAL(3,2) NOT NULL DEFAULT 0.00
                  CHECK (confidence BETWEEN 0 AND 1),
  ai_diary_entry  TEXT,
  raw_ai_response JSONB,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE photo_analyses IS 'Análises de foto por IA — nunca diagnostica, apenas observa';

-- ══════════════════════════════════════
-- 7. VACCINES
-- ══════════════════════════════════════
CREATE TABLE vaccines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  name              VARCHAR(100) NOT NULL,
  laboratory        VARCHAR(100),
  batch_number      VARCHAR(50),
  date_administered DATE NOT NULL,
  next_due_date     DATE,
  dose_number       VARCHAR(20),
  veterinarian      VARCHAR(150),
  clinic            VARCHAR(150),
  status            VARCHAR(10) NOT NULL DEFAULT 'up_to_date'
                    CHECK (status IN ('up_to_date', 'overdue', 'upcoming')),
  source            VARCHAR(15) NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual', 'ocr', 'vet_import')),
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vaccines IS 'Carteira de vacinação do pet';

-- ══════════════════════════════════════
-- 8. ALLERGIES
-- ══════════════════════════════════════
CREATE TABLE allergies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  allergen        VARCHAR(150) NOT NULL,
  reaction        TEXT,
  severity        VARCHAR(8) NOT NULL DEFAULT 'mild'
                  CHECK (severity IN ('mild', 'moderate', 'severe')),
  diagnosed_date  DATE,
  diagnosed_by    VARCHAR(150),
  confirmed       BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE allergies IS 'Alergias conhecidas do pet';

-- ══════════════════════════════════════
-- 9. PET_EMBEDDINGS (RAG)
-- ══════════════════════════════════════
CREATE TABLE pet_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  content_type  VARCHAR(20) NOT NULL
                CHECK (content_type IN ('diary', 'photo', 'vaccine', 'mood', 'allergy')),
  content_id    UUID NOT NULL,
  embedding     VECTOR(1536) NOT NULL,
  content_text  TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}'::jsonb,
  importance    DECIMAL(2,1) NOT NULL DEFAULT 0.5
                CHECK (importance BETWEEN 0 AND 1),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE pet_embeddings IS 'Embeddings vetoriais para RAG — memória do pet';

-- ══════════════════════════════════════
-- 10. RAG_CONVERSATIONS
-- ══════════════════════════════════════
CREATE TABLE rag_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id        UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id),
  query         TEXT NOT NULL,
  response      TEXT NOT NULL,
  context_ids   JSONB DEFAULT '[]'::jsonb,
  response_type VARCHAR(20) DEFAULT 'chat'
                CHECK (response_type IN ('chat', 'narration', 'insight', 'analysis')),
  tokens_used   INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rag_conversations IS 'Histórico de conversas com IA por pet';

-- ══════════════════════════════════════
-- 11. NOTIFICATIONS_QUEUE
-- ══════════════════════════════════════
CREATE TABLE notifications_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id        UUID REFERENCES pets(id) ON DELETE SET NULL,
  type          VARCHAR(20) NOT NULL
                CHECK (type IN ('vaccine_reminder', 'diary_reminder', 'ai_insight', 'welcome')),
  title         VARCHAR(200) NOT NULL,
  body          TEXT NOT NULL,
  data          JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at       TIMESTAMPTZ,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications_queue IS 'Fila de notificações push';

-- ══════════════════════════════════════
-- 12. MEDIA_FILES
-- ══════════════════════════════════════
CREATE TABLE media_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id        UUID REFERENCES pets(id) ON DELETE SET NULL,
  bucket        VARCHAR(50) NOT NULL,
  path          TEXT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(50) NOT NULL,
  size_bytes    BIGINT NOT NULL,
  width         INTEGER,
  height        INTEGER,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE media_files IS 'Registro de arquivos de mídia no Storage';

-- ══════════════════════════════════════
-- 13. AUDIT_LOG (suporte)
-- ══════════════════════════════════════
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  action        VARCHAR(20) NOT NULL,
  table_name    VARCHAR(50) NOT NULL,
  record_id     UUID,
  changes       JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Log de auditoria LGPD — todas as operações';
