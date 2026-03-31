# auExpert — Banco de Dados Refatorado (Conceito Diário-Cêntrico)
# Versão: 1.0
# Data: 30/03/2026
# Total: 28 tabelas core + 22 tabelas Aldeia (pós-MVP) = 50 tabelas

---

## REGRAS GLOBAIS (aplicar em TODA tabela)

```sql
-- Todo id: UUID
-- Todo created_at: TIMESTAMPTZ DEFAULT NOW()
-- Soft delete: is_deleted BOOLEAN DEFAULT FALSE (não is_active)
-- Snake_case em tudo (SQL)
-- CamelCase no TypeScript (converter com types gerados)
-- RLS ativo em TODAS as tabelas
-- Índices em toda FK e campos de filtro frequente
-- TIMESTAMPTZ (não TIMESTAMP) — sempre com timezone
-- CHECK constraints em todos os enums
-- DEFAULT em campos opcionais
```

---

## ORDEM DE CRIAÇÃO (sem erro de dependência)

```
FASE 1 — Fundação (sem FKs externas)
  01. users
  02. sessions

FASE 2 — Pets (depende de users)
  03. pets

FASE 3 — Diário (depende de users + pets) — O CORAÇÃO
  04. diary_entries
      NOTA: linked_*_id NÃO têm FK constraints aqui porque os módulos
      ainda não existem. As FKs são adicionadas via ALTER TABLE na Fase 8.

FASE 4 — Referências e Config (sem dependências pesadas — precisa existir antes dos módulos)
  05. app_config
  06. breed_references
  07. metric_references
  08. achievement_definitions

FASE 5 — Saúde/Prontuário (depende de pets + diary_entries)
  09. vaccines
  10. allergies
  11. consultations
  12. medications
  13. exams
  14. surgeries
  15. clinical_metrics
      NOTA: substitui a antiga weight_logs. Peso é metric_type='weight'.

FASE 6 — Módulos (depende de pets + diary_entries + saúde)
  16. pet_plans         ← ANTES de expenses (expenses referencia pet_plans)
  17. plan_claims
  18. expenses          ← DEPOIS de pet_plans
  19. pet_connections
  20. pet_nutrition
  21. pet_achievements  ← DEPOIS de achievement_definitions (Fase 4)
  22. pet_travels

FASE 7 — IA e Infraestrutura (depende de tudo acima)
  23. pet_embeddings
  24. rag_conversations
  25. mood_logs
  26. photo_analyses    ← Registro persistente. diary_entries.photo_analysis JSONB é snapshot rápido.
  27. media_files
  28. notification_queue

FASE 8 — ALTER TABLEs (FKs tardias em diary_entries)
  Adiciona todas as FK constraints nos linked_*_id do diary_entries
  agora que as tabelas de módulo já existem.

FASE 9 — Views Materializadas + Triggers + Functions

FASE 10 — RLS Policies

FASE 11 — Aldeia (pós-MVP, 22 tabelas — ver aldeia_db_telas_spec.md)
```

---

## FASE 1 — FUNDAÇÃO

### 01. users

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    name                VARCHAR(100) NOT NULL,
    avatar_url          TEXT,
    phone               VARCHAR(20),
    city                VARCHAR(100),
    state               VARCHAR(50),
    country             VARCHAR(50) DEFAULT 'Brasil',
    language            VARCHAR(10) DEFAULT 'pt-BR'
                        CHECK (language IN ('pt-BR','en-US','es-ES','fr-FR','de-DE','it-IT','ja-JP')),
    timezone            VARCHAR(50) DEFAULT 'America/Sao_Paulo',

    -- Gamificação
    level               INTEGER DEFAULT 1,
    xp                  INTEGER DEFAULT 0,
    xp_next_level       INTEGER DEFAULT 500,
    title               VARCHAR(50) DEFAULT 'Tutor Iniciante',

    -- Proof of Love (Aldeia pós-MVP)
    proof_of_love       VARCHAR(20) DEFAULT 'none'
                        CHECK (proof_of_love IN ('none','bronze','silver','gold','diamond')),

    -- Aldeia (pós-MVP)
    aldeia_id           UUID,
    is_avatar            BOOLEAN DEFAULT FALSE,
    avatar_persona       JSONB,

    -- Biometria
    biometric_enabled   BOOLEAN DEFAULT FALSE,

    -- Meta
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_users_email ON users(email);
```

### 02. sessions

```sql
CREATE TABLE sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token               TEXT NOT NULL,
    device_info         JSONB,              -- {platform, os, app_version, device_model}
    push_token          TEXT,               -- Token para push notifications
    expires_at          TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## FASE 2 — PETS

### 03. pets

```sql
CREATE TABLE pets (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(50) NOT NULL,
    species             VARCHAR(10) NOT NULL CHECK (species IN ('dog','cat')),
    breed               VARCHAR(80),
    breed_confidence    REAL,                -- % confiança da IA na raça
    is_mixed            BOOLEAN DEFAULT FALSE,
    mixed_breeds        TEXT[],              -- Raças misturadas (se SRD)

    -- Dados básicos
    birth_date          DATE,
    estimated_age       VARCHAR(30),         -- "~3 anos" (se IA estimou)
    sex                 VARCHAR(10) CHECK (sex IN ('male','female','unknown')),
    neutered            BOOLEAN DEFAULT FALSE,
    color               VARCHAR(50),         -- Cor da pelagem
    coat_pattern        VARCHAR(30),         -- solid, bicolor, tricolor, merle, tabby, etc
    size                VARCHAR(20) CHECK (size IN ('mini','small','medium','large','giant')),

    -- Saúde
    current_weight_kg   DECIMAL(5,2),
    ideal_weight_min    DECIMAL(5,2),
    ideal_weight_max    DECIMAL(5,2),
    health_score        INTEGER DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
    blood_type          VARCHAR(20),         -- DEA 1.1 Pos/Neg (cão) | A/B/AB (gato)
    microchip           VARCHAR(50),

    -- Identificação
    photo_url           TEXT,                -- Foto principal
    photo_source        VARCHAR(20) DEFAULT 'gallery'
                        CHECK (photo_source IN ('camera','gallery','ai_generated')),

    -- Humor atual
    current_mood        VARCHAR(20) DEFAULT 'calm'
                        CHECK (current_mood IN ('ecstatic','happy','calm','playful','tired','anxious','sad','sick')),
    mood_updated_at     TIMESTAMPTZ,

    -- Contadores (desnormalizados para performance)
    diary_count         INTEGER DEFAULT 0,
    photo_count         INTEGER DEFAULT 0,
    friends_count       INTEGER DEFAULT 0,
    achievements_count  INTEGER DEFAULT 0,
    admirations_count   INTEGER DEFAULT 0,   -- Aldeia

    -- Aldeia (pós-MVP)
    is_avatar            BOOLEAN DEFAULT FALSE,
    avatar_template_id   UUID,
    avatar_active        BOOLEAN DEFAULT FALSE,
    avatar_created_for   UUID,               -- user_id que criou o avatar
    is_deceased          BOOLEAN DEFAULT FALSE,
    deceased_at          TIMESTAMPTZ,

    -- Meta
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_pets_user ON pets(user_id);
CREATE INDEX idx_pets_species ON pets(species);
CREATE INDEX idx_pets_mood ON pets(current_mood);
```

---

## FASE 3 — DIÁRIO (O CORAÇÃO DO APP)

### 04. diary_entries

```sql
CREATE TABLE diary_entries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),

    -- ===== ENTRADA DO TUTOR =====
    input_text          TEXT,                -- O que o tutor falou/escreveu (transcrito se voz)
    input_type          VARCHAR(30) NOT NULL DEFAULT 'text'
                        CHECK (input_type IN (
                          'photo','video','voice','pet_audio','text',
                          'gallery_photo','gallery_video','gallery_audio',
                          'ocr_scan','pdf_upload',
                          'photo_voice','photo_text','video_voice',
                          'ocr_voice','gallery_voice','pet_audio_photo',
                          'multi'
                        )),

    -- ===== CLASSIFICAÇÃO IA =====
    classifications     JSONB DEFAULT '[]',  -- [{type, confidence, extracted_data, confirmed, module_record_id}]
    primary_type        VARCHAR(30) DEFAULT 'moment'
                        CHECK (primary_type IN (
                          'moment','vaccine','exam','medication','consultation',
                          'allergy','weight','surgery','symptom','food',
                          'expense','connection','travel','partner',
                          'achievement','mood','insurance','plan'
                        )),

    -- ===== NARRAÇÃO IA (sempre 3ª pessoa, nunca na voz do pet) =====
    -- Exemplo: "Hoje o Rex foi ao veterinário. A Dra. Carla aplicou a V10 e informou que está saudável."
    ai_narration        TEXT,

    -- ===== HUMOR =====
    mood                VARCHAR(20)
                        CHECK (mood IN ('ecstatic','happy','calm','playful','tired','anxious','sad','sick')),
    mood_confidence     REAL,
    mood_source         VARCHAR(20) DEFAULT 'text'
                        CHECK (mood_source IN ('text','photo','video','pet_audio','ai_pattern')),

    -- ===== URGÊNCIA (saúde) =====
    urgency             VARCHAR(10) DEFAULT 'none'
                        CHECK (urgency IN ('none','low','medium','high')),

    -- ===== MÍDIA =====
    photo_urls          TEXT[] DEFAULT '{}',
    video_url           TEXT,
    video_thumbnail     TEXT,
    video_duration      INTEGER,             -- Segundos
    audio_url           TEXT,
    audio_duration      INTEGER,             -- Segundos
    audio_type          VARCHAR(20)
                        CHECK (audio_type IN ('tutor_voice','pet_sound')),
    document_url        TEXT,
    document_type       VARCHAR(30),         -- vaccine_card, prescription, exam_result, invoice, etc
    ocr_data            JSONB,               -- {fields[], confidence_per_field}

    -- ===== ANÁLISES ESPECIALIZADAS (snapshots rápidos — registros persistentes ficam em photo_analyses/mood_logs) =====
    video_analysis      JSONB,               -- {locomotion_score, energy_score, behavior, alerts[]}
    pet_audio_analysis  JSONB,               -- {pattern, emotion, intensity, description}
    photo_analysis      JSONB,               -- {health_score, coat, eyes, posture, environment}

    -- ===== VÍNCULOS COM MÓDULOS =====
    -- NOTA: Sem FK constraints aqui. diary_entries é criada na Fase 3,
    -- antes das tabelas de módulo. FKs adicionadas via ALTER TABLE na Fase 8.
    -- Preenchidos quando o tutor confirma uma sugestão da IA.
    linked_vaccine_id        UUID,
    linked_exam_id           UUID,
    linked_medication_id     UUID,
    linked_consultation_id   UUID,
    linked_expense_id        UUID,
    linked_weight_metric_id  UUID,            -- Aponta para clinical_metrics (metric_type='weight')
    linked_allergy_id        UUID,
    linked_surgery_id        UUID,
    linked_connection_id     UUID,
    linked_nutrition_id      UUID,
    linked_travel_id         UUID,
    linked_plan_id           UUID,
    linked_achievement_id    UUID,
    linked_mood_log_id       UUID,            -- Aponta para mood_logs

    -- ===== META =====
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_diary_pet ON diary_entries(pet_id);
CREATE INDEX idx_diary_user ON diary_entries(user_id);
CREATE INDEX idx_diary_created ON diary_entries(created_at DESC);
CREATE INDEX idx_diary_type ON diary_entries(primary_type);
CREATE INDEX idx_diary_input ON diary_entries(input_type);
CREATE INDEX idx_diary_mood ON diary_entries(mood);
CREATE INDEX idx_diary_urgency ON diary_entries(urgency) WHERE urgency != 'none';
CREATE INDEX idx_diary_classifications ON diary_entries USING GIN(classifications);
CREATE INDEX idx_diary_ocr ON diary_entries USING GIN(ocr_data) WHERE ocr_data IS NOT NULL;
```

---

## FASE 4 — CONFIGURAÇÃO E REFERÊNCIAS (antes dos módulos — eles dependem daqui)

> Movidas para ANTES das tabelas de saúde e módulos porque
> `pet_achievements` referencia `achievement_definitions` e
> `clinical_metrics` usa `metric_references` para ranges.

### 05. app_config

```sql
CREATE TABLE app_config (
    key                 VARCHAR(100) PRIMARY KEY,
    value               JSONB NOT NULL,
    description         TEXT,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value, description) VALUES
  ('supported_species', '["dog","cat"]', 'Espécies aceitas no app'),
  ('max_photos_per_entry', '5', 'Máximo de fotos por entrada do diário'),
  ('max_video_seconds', '60', 'Duração máxima de vídeo em segundos'),
  ('ai_model', '"claude-sonnet-4-20250514"', 'Modelo da IA'),
  ('classification_threshold', '0.5', 'Confiança mínima para classificar'),
  ('suggestion_threshold', '0.7', 'Confiança mínima para sugerir módulo'),
  ('ocr_scan_max_fields', '20', 'Máximo de campos extraídos por OCR');
```

### 06. breed_references

```sql
CREATE TABLE breed_references (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species             VARCHAR(10) NOT NULL CHECK (species IN ('dog','cat')),
    breed_name          VARCHAR(80) NOT NULL,
    breed_name_en       VARCHAR(80),
    size                VARCHAR(20) CHECK (size IN ('mini','small','medium','large','giant')),
    weight_min_kg       DECIMAL(5,2),
    weight_max_kg       DECIMAL(5,2),
    life_expectancy_min INTEGER,
    life_expectancy_max INTEGER,
    temperament         TEXT[],
    common_health_issues TEXT[],
    grooming_needs      VARCHAR(20) CHECK (grooming_needs IN ('low','medium','high')),
    exercise_needs      VARCHAR(20) CHECK (exercise_needs IN ('low','medium','high','very_high')),
    UNIQUE(species, breed_name)
);

CREATE INDEX idx_breeds_species ON breed_references(species);
```

### 07. metric_references

```sql
CREATE TABLE metric_references (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species             VARCHAR(10) NOT NULL CHECK (species IN ('dog','cat')),
    breed               VARCHAR(80),
    size                VARCHAR(20),
    age_min_months      INTEGER,
    age_max_months      INTEGER,
    metric_type         VARCHAR(30) NOT NULL,
    reference_min       DECIMAL(10,3) NOT NULL,
    reference_max       DECIMAL(10,3) NOT NULL,
    unit                VARCHAR(20) NOT NULL,
    notes               TEXT
);

CREATE INDEX idx_metric_ref_species ON metric_references(species, metric_type);
CREATE INDEX idx_metric_ref_breed ON metric_references(breed, metric_type) WHERE breed IS NOT NULL;
```

### 08. achievement_definitions

```sql
CREATE TABLE achievement_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code                VARCHAR(50) UNIQUE NOT NULL,
    title_pt            VARCHAR(100) NOT NULL,
    title_en            VARCHAR(100),
    description_pt      TEXT,
    description_en      TEXT,
    icon                VARCHAR(50),
    color               VARCHAR(20),
    xp_reward           INTEGER DEFAULT 10,
    trigger_type        VARCHAR(30) NOT NULL
                        CHECK (trigger_type IN (
                          'diary_count','photo_count','scan_count','voice_count',
                          'vaccine_count','friend_count','travel_count','streak_days',
                          'expense_total','health_score','weight_goal','custom'
                        )),
    trigger_value       INTEGER NOT NULL,
    is_active           BOOLEAN DEFAULT TRUE
);

INSERT INTO achievement_definitions (code, title_pt, icon, color, xp_reward, trigger_type, trigger_value) VALUES
  ('first_entry', 'Primeira Memória', 'book-open', '#E8813A', 10, 'diary_count', 1),
  ('first_scan', 'Primeiro Scan', 'scan', '#2ECC71', 15, 'scan_count', 1),
  ('scanner_pro', 'Scanner Pro', 'scan', '#2ECC71', 50, 'scan_count', 50),
  ('diary_10', 'Contador de Histórias', 'book-open', '#E8813A', 25, 'diary_count', 10),
  ('diary_100', 'Memória Viva', 'book-open', '#E8813A', 100, 'diary_count', 100),
  ('diary_365', 'Um Ano de Memórias', 'book-open', '#F39C12', 250, 'diary_count', 365),
  ('photos_50', 'Fotógrafo Iniciante', 'camera', '#9B59B6', 30, 'photo_count', 50),
  ('photos_500', 'Paparazzi Pet', 'camera', '#9B59B6', 100, 'photo_count', 500),
  ('friends_5', 'Socializando', 'users', '#1B8EAD', 25, 'friend_count', 5),
  ('friends_20', 'Popular', 'users', '#1B8EAD', 75, 'friend_count', 20),
  ('vaccines_ok', 'Prontuário Completo', 'shield-check', '#2ECC71', 50, 'vaccine_count', 5),
  ('streak_7', 'Semana Perfeita', 'flame', '#E74C3C', 30, 'streak_days', 7),
  ('streak_30', 'Mês Dedicado', 'flame', '#E74C3C', 100, 'streak_days', 30),
  ('travel_1', 'Primeiro Passeio', 'map-pin', '#1B8EAD', 20, 'travel_count', 1),
  ('health_95', 'Saúde de Ferro', 'heart', '#2ECC71', 75, 'health_score', 95);
```

---

## FASE 5 — SAÚDE / PRONTUÁRIO

### 09. vaccines

```sql
CREATE TABLE vaccines (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),  -- Qual entrada do diário criou
    name                VARCHAR(100) NOT NULL,
    lab                 VARCHAR(100),
    batch               VARCHAR(50),
    dose                VARCHAR(50),
    vet_name            VARCHAR(100),
    clinic_name         VARCHAR(100),
    applied_at          DATE NOT NULL,
    next_due_at         DATE,
    status              VARCHAR(20) DEFAULT 'ok'
                        CHECK (status IN ('ok','overdue','scheduled','skipped')),
    notes               TEXT,
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai')),
    ocr_confidence      REAL,
    photo_url           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_vaccines_pet ON vaccines(pet_id);
CREATE INDEX idx_vaccines_next ON vaccines(next_due_at);
CREATE INDEX idx_vaccines_status ON vaccines(status);
```

### 10. allergies

```sql
CREATE TABLE allergies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    name                VARCHAR(100) NOT NULL,
    severity            VARCHAR(20) DEFAULT 'low'
                        CHECK (severity IN ('low','medium','high','critical')),
    reaction            TEXT,
    confirmed           BOOLEAN DEFAULT FALSE,
    detected_by         VARCHAR(20) DEFAULT 'tutor'
                        CHECK (detected_by IN ('tutor','vet','ai')),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_allergies_pet ON allergies(pet_id);
```

### 11. consultations

```sql
CREATE TABLE consultations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    date                DATE NOT NULL,
    time                TIME,
    type                VARCHAR(30) DEFAULT 'routine'
                        CHECK (type IN ('routine','emergency','specialist','surgery','follow_up','telemedicine')),
    vet_name            VARCHAR(100),
    clinic_name         VARCHAR(100),
    summary             TEXT NOT NULL,
    diagnosis           TEXT,
    prescriptions       TEXT,
    follow_up_at        DATE,
    cost                DECIMAL(10,2),
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai')),
    photo_url           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_consultations_pet ON consultations(pet_id);
CREATE INDEX idx_consultations_date ON consultations(date);
CREATE INDEX idx_consultations_followup ON consultations(follow_up_at) WHERE follow_up_at IS NOT NULL;
```

### 12. medications

```sql
CREATE TABLE medications (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    name                VARCHAR(100) NOT NULL,
    type                VARCHAR(30) DEFAULT 'other'
                        CHECK (type IN ('antiparasitic','supplement','antibiotic','anti_inflammatory',
                                       'analgesic','antifungal','vermifuge','cardiac','hormonal','other')),
    dosage              VARCHAR(50),
    frequency           VARCHAR(50),
    start_date          DATE NOT NULL,
    end_date            DATE,               -- NULL = contínuo
    active              BOOLEAN DEFAULT TRUE,
    reason              TEXT,
    prescribed_by       VARCHAR(100),
    notes               TEXT,
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_medications_pet ON medications(pet_id);
CREATE INDEX idx_medications_active ON medications(active) WHERE active = TRUE;
CREATE INDEX idx_medications_end ON medications(end_date) WHERE end_date IS NOT NULL;
```

### 13. exams

```sql
CREATE TABLE exams (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    name                VARCHAR(100) NOT NULL,
    date                DATE NOT NULL,
    status              VARCHAR(20) DEFAULT 'normal'
                        CHECK (status IN ('normal','attention','abnormal','critical','pending')),
    results             JSONB DEFAULT '[]', -- [{item, value, reference_min, reference_max, unit, ok}]
    lab_name            VARCHAR(100),
    vet_name            VARCHAR(100),
    follow_up_at        DATE,
    notes               TEXT,
    photo_url           TEXT,
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_exams_pet ON exams(pet_id);
CREATE INDEX idx_exams_date ON exams(date);
CREATE INDEX idx_exams_status ON exams(status) WHERE status != 'normal';
CREATE INDEX idx_exams_followup ON exams(follow_up_at) WHERE follow_up_at IS NOT NULL;
```

### 14. surgeries

```sql
CREATE TABLE surgeries (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    name                VARCHAR(100) NOT NULL,
    date                DATE NOT NULL,
    vet_name            VARCHAR(100),
    clinic_name         VARCHAR(100),
    anesthesia          VARCHAR(100),
    notes               TEXT,
    recovery_days       INTEGER,
    status              VARCHAR(20) DEFAULT 'recovered'
                        CHECK (status IN ('scheduled','recovering','recovered','complications')),
    cost                DECIMAL(10,2),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_surgeries_pet ON surgeries(pet_id);
```

### 15. clinical_metrics

```sql
CREATE TABLE clinical_metrics (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    exam_id             UUID REFERENCES exams(id),
    metric_type         VARCHAR(30) NOT NULL
                        CHECK (metric_type IN (
                          'weight','temperature','heart_rate','respiratory_rate',
                          'blood_glucose','alt_tgp','ast_tgo','creatinine','urea',
                          'hemoglobin','hematocrit','platelets','leukocytes',
                          'albumin','total_protein','cholesterol','triglycerides',
                          'bun','alkaline_phosphatase','bilirubin',
                          'body_condition_score','health_score','pain_score',
                          'mobility_score','mood_score','energy_score',
                          'coat_score','hydration_score','custom'
                        )),
    value               DECIMAL(10,3) NOT NULL,
    unit                VARCHAR(20),
    reference_min       DECIMAL(10,3),
    reference_max       DECIMAL(10,3),
    status              VARCHAR(20) DEFAULT 'normal'
                        CHECK (status IN ('normal','low','high','critical')),
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai_photo','ai_video','vet','lab')),
    measured_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_pet ON clinical_metrics(pet_id);
CREATE INDEX idx_metrics_type ON clinical_metrics(metric_type);
CREATE INDEX idx_metrics_date ON clinical_metrics(measured_at);
CREATE INDEX idx_metrics_pet_type_date ON clinical_metrics(pet_id, metric_type, measured_at DESC);
CREATE INDEX idx_metrics_status ON clinical_metrics(status) WHERE status != 'normal';
```

---

## FASE 6 — MÓDULOS (lentes auto-populadas pelo diário)

> Ordem importa: pet_plans vem ANTES de expenses porque expenses referencia pet_plans.

### 16. pet_plans

```sql
CREATE TABLE pet_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    plan_type           VARCHAR(20) NOT NULL
                        CHECK (plan_type IN ('health','insurance','funeral','assistance','emergency')),
    provider_name       VARCHAR(100) NOT NULL,
    plan_name           VARCHAR(100),
    monthly_cost        DECIMAL(10,2),
    coverage_limit      DECIMAL(10,2),
    start_date          DATE NOT NULL,
    end_date            DATE,
    renewal_date        DATE,
    status              VARCHAR(20) DEFAULT 'active'
                        CHECK (status IN ('active','expired','cancelled','pending')),
    coverage_details    JSONB DEFAULT '{}',
    documents           TEXT[] DEFAULT '{}',
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai_suggestion')),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_plans_pet ON pet_plans(pet_id);
CREATE INDEX idx_plans_type ON pet_plans(plan_type);
CREATE INDEX idx_plans_active ON pet_plans(status) WHERE status = 'active';
CREATE INDEX idx_plans_renewal ON pet_plans(renewal_date) WHERE renewal_date IS NOT NULL;
```

### 17. plan_claims

```sql
CREATE TABLE plan_claims (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id             UUID NOT NULL REFERENCES pet_plans(id) ON DELETE CASCADE,
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    claim_type          VARCHAR(30) NOT NULL,
    description         TEXT NOT NULL,
    amount              DECIMAL(10,2),
    reimbursed          DECIMAL(10,2),
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','denied','partial','completed')),
    date                DATE NOT NULL,
    linked_expense_id       UUID,            -- FK adicionada via ALTER TABLE após expenses existir
    linked_consultation_id  UUID REFERENCES consultations(id),
    documents           TEXT[] DEFAULT '{}',
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_claims_plan ON plan_claims(plan_id);
CREATE INDEX idx_claims_pet ON plan_claims(pet_id);
```

### 18. expenses

```sql
CREATE TABLE expenses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    amount              DECIMAL(10,2) NOT NULL,
    category            VARCHAR(30) NOT NULL
                        CHECK (category IN (
                          'health','food','hygiene','accessories','services',
                          'insurance','travel','training','housing','other'
                        )),
    subcategory         VARCHAR(50),
    description         TEXT,
    merchant_name       VARCHAR(100),
    merchant_type       VARCHAR(30),
    date                DATE NOT NULL DEFAULT CURRENT_DATE,
    photo_url           TEXT,
    source              VARCHAR(20) DEFAULT 'ocr'
                        CHECK (source IN ('ocr','voice','manual')),
    ocr_confidence      REAL,
    items               JSONB DEFAULT '[]', -- [{name, qty, unit_price}]
    -- Vínculos com outros módulos (todos já existem neste ponto)
    linked_vaccine_id        UUID REFERENCES vaccines(id),
    linked_consultation_id   UUID REFERENCES consultations(id),
    linked_medication_id     UUID REFERENCES medications(id),
    linked_surgery_id        UUID REFERENCES surgeries(id),
    linked_plan_id           UUID REFERENCES pet_plans(id),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_expenses_pet ON expenses(pet_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_month ON expenses(pet_id, date_trunc('month', date::timestamp));

-- FK tardia: plan_claims.linked_expense_id agora pode referenciar expenses
ALTER TABLE plan_claims ADD CONSTRAINT fk_claims_expense
  FOREIGN KEY (linked_expense_id) REFERENCES expenses(id);
```

### 19. pet_connections (grafo social do pet)

```sql
CREATE TABLE pet_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    friend_name         VARCHAR(50) NOT NULL,
    friend_species      VARCHAR(10) CHECK (friend_species IN ('dog','cat','other')),
    friend_breed        VARCHAR(80),
    friend_pet_id       UUID REFERENCES pets(id), -- Se o amigo também está no app
    relationship        VARCHAR(20) DEFAULT 'friend'
                        CHECK (relationship IN ('best_friend','friend','acquaintance','neutral','avoid')),
    compatibility_score INTEGER CHECK (compatibility_score BETWEEN 0 AND 100),
    interactions_count  INTEGER DEFAULT 1,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    notes               TEXT,
    detected_by         VARCHAR(20) DEFAULT 'ai'
                        CHECK (detected_by IN ('tutor','ai','aldeia')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_connections_pet ON pet_connections(pet_id);
CREATE INDEX idx_connections_friend ON pet_connections(friend_pet_id) WHERE friend_pet_id IS NOT NULL;
```

### 20. pet_nutrition

```sql
CREATE TABLE pet_nutrition (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    item_type           VARCHAR(20) NOT NULL
                        CHECK (item_type IN ('food','treat','supplement','water','diet_plan')),
    brand               VARCHAR(100),
    product_name        VARCHAR(150),
    variant             VARCHAR(100),        -- "Labrador Adult", "Filhote Frango"
    quantity            VARCHAR(50),          -- "300g/dia", "2 petiscos"
    frequency           VARCHAR(50),          -- "2x ao dia", "eventual"
    is_current          BOOLEAN DEFAULT TRUE, -- Se é a ração/dieta atual
    started_at          DATE DEFAULT CURRENT_DATE,
    ended_at            DATE,
    ingredients         JSONB,               -- Ingredientes (se extraído da embalagem)
    notes               TEXT,
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ocr','voice','ai')),
    photo_url           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_nutrition_pet ON pet_nutrition(pet_id);
CREATE INDEX idx_nutrition_current ON pet_nutrition(is_current) WHERE is_current = TRUE;
```

### 21. pet_achievements

```sql
CREATE TABLE pet_achievements (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    achievement_def_id  UUID REFERENCES achievement_definitions(id),
    title               VARCHAR(100) NOT NULL,
    description         TEXT,
    badge_icon          VARCHAR(50),         -- Nome do ícone Lucide
    badge_color         VARCHAR(20),
    xp_earned           INTEGER DEFAULT 0,
    unlocked_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_pet ON pet_achievements(pet_id);
CREATE INDEX idx_achievements_date ON pet_achievements(unlocked_at DESC);
```

### 22. pet_travels

```sql
CREATE TABLE pet_travels (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    destination         VARCHAR(150) NOT NULL,
    city                VARCHAR(100),
    state               VARCHAR(50),
    country             VARCHAR(50),
    latitude            DECIMAL(10,7),
    longitude           DECIMAL(10,7),
    start_date          DATE,
    end_date            DATE,
    transport           VARCHAR(30)
                        CHECK (transport IN ('car','plane','bus','train','boat','walk','other')),
    pet_friendly_places JSONB DEFAULT '[]', -- [{name, type, rating, notes}]
    notes               TEXT,
    photo_urls          TEXT[] DEFAULT '{}',
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','voice','ai','gps')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_travels_pet ON pet_travels(pet_id);
CREATE INDEX idx_travels_date ON pet_travels(start_date);
```

---

## FASE 7 — IA E INFRAESTRUTURA

### 23. pet_embeddings

```sql
CREATE TABLE pet_embeddings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    content_text        TEXT NOT NULL,        -- Texto que gerou o embedding
    content_type        VARCHAR(30) NOT NULL
                        CHECK (content_type IN (
                          'diary','narration','photo_analysis','vaccine',
                          'allergy','consultation','mood','achievement','connection'
                        )),
    source_table        VARCHAR(30) NOT NULL,
    source_id           UUID NOT NULL,
    embedding           VECTOR(1536) NOT NULL, -- OpenAI ada-002 ou similar
    metadata            JSONB DEFAULT '{}',
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_embeddings_pet ON pet_embeddings(pet_id);
CREATE INDEX idx_embeddings_type ON pet_embeddings(content_type);
CREATE INDEX idx_embeddings_vector ON pet_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 24. rag_conversations

```sql
CREATE TABLE rag_conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),
    query_text          TEXT NOT NULL,
    response_text       TEXT NOT NULL,
    context_embeddings  UUID[] DEFAULT '{}',  -- IDs dos embeddings usados como contexto
    model_used          VARCHAR(50) DEFAULT 'claude-sonnet-4-20250514',
    tokens_used         INTEGER,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rag_pet ON rag_conversations(pet_id);
```

### 25. mood_logs

```sql
CREATE TABLE mood_logs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    mood                VARCHAR(20) NOT NULL
                        CHECK (mood IN ('ecstatic','happy','calm','playful','tired','anxious','sad','sick')),
    score               INTEGER CHECK (score BETWEEN 0 AND 100),
    confidence          REAL,
    source              VARCHAR(20) DEFAULT 'manual'
                        CHECK (source IN ('manual','ai_photo','ai_video','ai_audio','ai_text','ai_pattern')),
    notes               TEXT,
    recorded_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_pet ON mood_logs(pet_id);
CREATE INDEX idx_mood_date ON mood_logs(recorded_at);
CREATE INDEX idx_mood_pet_date ON mood_logs(pet_id, recorded_at DESC);
```

### 26. photo_analyses

```sql
CREATE TABLE photo_analyses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    diary_entry_id      UUID REFERENCES diary_entries(id),
    photo_url           TEXT NOT NULL,
    analysis_type       VARCHAR(20) DEFAULT 'general'
                        CHECK (analysis_type IN ('general','health','breed','document','product','environment')),
    result              JSONB NOT NULL,      -- Resultado completo da IA
    health_score        INTEGER,
    mood_detected       VARCHAR(20),
    breed_detected      VARCHAR(80),
    breed_confidence    REAL,
    urgent_findings     BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photo_pet ON photo_analyses(pet_id);
CREATE INDEX idx_photo_type ON photo_analyses(analysis_type);
```

### 27. media_files

```sql
CREATE TABLE media_files (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(id),
    source_table        VARCHAR(30) NOT NULL,
    source_id           UUID NOT NULL,
    file_type           VARCHAR(20) NOT NULL
                        CHECK (file_type IN ('photo','video','audio','document','pdf')),
    original_url        TEXT NOT NULL,
    compressed_url      TEXT,
    thumbnail_url       TEXT,
    file_size_bytes     INTEGER,
    compressed_size     INTEGER,
    width               INTEGER,
    height              INTEGER,
    duration_seconds    INTEGER,
    mime_type           VARCHAR(50),
    bucket              VARCHAR(50) NOT NULL, -- Supabase Storage bucket name
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_pet ON media_files(pet_id);
CREATE INDEX idx_media_source ON media_files(source_table, source_id);
CREATE INDEX idx_media_type ON media_files(file_type);
```

### 28. notification_queue

```sql
CREATE TABLE notification_queue (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id              UUID REFERENCES pets(id),
    type                VARCHAR(30) NOT NULL
                        CHECK (type IN (
                          'vaccine_due','vaccine_overdue','medication_end',
                          'exam_follow_up','consultation_follow_up',
                          'plan_renewal','plan_expiry','claim_status',
                          'ai_insight','ai_health_alert','ai_trend_alert',
                          'achievement','diary_reminder','weekly_summary',
                          'aldeia_sos','aldeia_event','aldeia_favor'
                        )),
    title               VARCHAR(150) NOT NULL,
    body                TEXT NOT NULL,
    data                JSONB DEFAULT '{}',  -- Payload para deep link
    scheduled_at        TIMESTAMPTZ NOT NULL,
    sent_at             TIMESTAMPTZ,
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('pending','sent','failed','cancelled')),
    retry_count         INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notify_user ON notification_queue(user_id);
CREATE INDEX idx_notify_scheduled ON notification_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_notify_status ON notification_queue(status);
```

---

## FASE 8 — ALTER TABLEs (FKs tardias do diary_entries)

> diary_entries foi criada na Fase 3, antes de todas as tabelas de módulo.
> Agora que tudo existe, adicionamos as FK constraints.

```sql
-- FKs dos linked_*_id em diary_entries
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_vaccine
  FOREIGN KEY (linked_vaccine_id) REFERENCES vaccines(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_exam
  FOREIGN KEY (linked_exam_id) REFERENCES exams(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_medication
  FOREIGN KEY (linked_medication_id) REFERENCES medications(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_consultation
  FOREIGN KEY (linked_consultation_id) REFERENCES consultations(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_expense
  FOREIGN KEY (linked_expense_id) REFERENCES expenses(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_weight
  FOREIGN KEY (linked_weight_metric_id) REFERENCES clinical_metrics(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_allergy
  FOREIGN KEY (linked_allergy_id) REFERENCES allergies(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_surgery
  FOREIGN KEY (linked_surgery_id) REFERENCES surgeries(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_connection
  FOREIGN KEY (linked_connection_id) REFERENCES pet_connections(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_nutrition
  FOREIGN KEY (linked_nutrition_id) REFERENCES pet_nutrition(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_travel
  FOREIGN KEY (linked_travel_id) REFERENCES pet_travels(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_plan
  FOREIGN KEY (linked_plan_id) REFERENCES pet_plans(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_achievement
  FOREIGN KEY (linked_achievement_id) REFERENCES pet_achievements(id);
ALTER TABLE diary_entries ADD CONSTRAINT fk_diary_mood_log
  FOREIGN KEY (linked_mood_log_id) REFERENCES mood_logs(id);
```

---

## FASE 9 — VIEWS MATERIALIZADAS (performance)

```sql
-- Resumo de saúde por pet (refresh a cada hora via CRON)
CREATE MATERIALIZED VIEW pet_health_summary AS
SELECT
  p.id AS pet_id,
  p.name,
  p.health_score,
  p.current_weight_kg,
  p.current_mood,
  (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND v.status = 'overdue' AND v.is_deleted = FALSE) AS vaccines_overdue,
  (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND v.status = 'ok' AND v.is_deleted = FALSE) AS vaccines_ok,
  (SELECT COUNT(*) FROM allergies a WHERE a.pet_id = p.id AND a.is_deleted = FALSE) AS allergies_count,
  (SELECT COUNT(*) FROM medications m WHERE m.pet_id = p.id AND m.active = TRUE AND m.is_deleted = FALSE) AS active_medications,
  (SELECT MAX(date) FROM consultations c WHERE c.pet_id = p.id AND c.is_deleted = FALSE) AS last_consultation,
  (SELECT value FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight,
  (SELECT measured_at FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight_date
FROM pets p
WHERE p.is_deleted = FALSE AND p.is_avatar = FALSE;

CREATE UNIQUE INDEX idx_health_summary_pet ON pet_health_summary(pet_id);

-- Resumo de gastos por pet/mês (refresh diário)
CREATE MATERIALIZED VIEW pet_expense_summary AS
SELECT
  e.pet_id,
  date_trunc('month', e.date::timestamp) AS month,
  e.category,
  COUNT(*) AS count,
  SUM(e.amount) AS total
FROM expenses e
WHERE e.is_deleted = FALSE
GROUP BY e.pet_id, date_trunc('month', e.date::timestamp), e.category;

CREATE UNIQUE INDEX idx_expense_summary ON pet_expense_summary(pet_id, month, category);
```

---

## FASE 10 — TRIGGERS E FUNCTIONS

```sql
-- Atualizar contador de diário do pet (trigger)
CREATE OR REPLACE FUNCTION update_pet_diary_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pets SET
    diary_count = (SELECT COUNT(*) FROM diary_entries WHERE pet_id = NEW.pet_id AND is_deleted = FALSE),
    updated_at = NOW()
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_diary_count
  AFTER INSERT OR UPDATE ON diary_entries
  FOR EACH ROW EXECUTE FUNCTION update_pet_diary_count();

-- Atualizar humor do pet quando mood_log é inserido
CREATE OR REPLACE FUNCTION update_pet_mood()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pets SET
    current_mood = NEW.mood,
    mood_updated_at = NEW.recorded_at,
    updated_at = NOW()
  WHERE id = NEW.pet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pet_mood
  AFTER INSERT ON mood_logs
  FOR EACH ROW EXECUTE FUNCTION update_pet_mood();

-- Verificar e atualizar status de vacinas
CREATE OR REPLACE FUNCTION check_vaccine_status()
RETURNS void AS $$
BEGIN
  UPDATE vaccines SET status = 'overdue'
  WHERE next_due_at < CURRENT_DATE
    AND status = 'ok'
    AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql;
```

---

## FASE 11 — RLS (Row Level Security)

```sql
-- Ativar RLS em TODAS as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_nutrition ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_travels ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policy padrão: usuário vê apenas seus dados
-- (Repetir para TODAS as tabelas que tem user_id)
CREATE POLICY users_own_data ON users
  FOR ALL USING (auth.uid() = id);

CREATE POLICY pets_own_data ON pets
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY diary_own_data ON diary_entries
  FOR ALL USING (user_id = auth.uid());

-- Para tabelas que não têm user_id direto, usar JOIN com pets
CREATE POLICY vaccines_via_pet ON vaccines
  FOR ALL USING (pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid()));

-- (Mesmo padrão para allergies, consultations, medications, exams,
--  surgeries, clinical_metrics, expenses, pet_plans, plan_claims,
--  pet_connections, pet_nutrition, pet_achievements, pet_travels,
--  pet_embeddings, mood_logs, photo_analyses, media_files)
```

---

## RESUMO DO BANCO

### Contagem por fase

| Fase | Tabelas | Propósito |
|------|---------|-----------|
| 1. Fundação | 2 (01-02) | users, sessions |
| 2. Pets | 1 (03) | pets (entidade central) |
| 3. Diário | 1 (04) | diary_entries (coração do app — 14 linked_*_id) |
| 4. Config | 4 (05-08) | app_config, breed_references, metric_references, achievement_definitions |
| 5. Saúde | 7 (09-15) | vaccines, allergies, consultations, medications, exams, surgeries, clinical_metrics |
| 6. Módulos | 7 (16-22) | pet_plans, plan_claims, expenses, pet_connections, pet_nutrition, pet_achievements, pet_travels |
| 7. IA/Infra | 6 (23-28) | pet_embeddings, rag_conversations, mood_logs, photo_analyses, media_files, notification_queue |
| 8. ALTER TABLE | — | 14 FKs tardias no diary_entries + 1 FK tardia em plan_claims |
| 9. Views | 2 | pet_health_summary, pet_expense_summary |
| 10. Triggers | 3 | diary_count, pet_mood, vaccine_status |
| 11. RLS | 28 | Policy em todas as tabelas |
| **TOTAL** | **28 tabelas** | **+ 2 views + 3 triggers + 15 FKs tardias + 28 RLS policies** |

### Campos removidos vs conceito anterior

| Campo | Antes | Agora | Motivo |
|-------|-------|-------|--------|
| `narration_voice` | `'pet' \| 'narrator'` | **REMOVIDO** | Narração é SEMPRE da IA em 3ª pessoa, nunca do pet |
| `weight_logs` (tabela) | Tabela separada | **REMOVIDA** | Substituída por `clinical_metrics` com `metric_type='weight'` |

### Relação bidirecional com o conceito Diário-cêntrico

```
diary_entries (o coração)
    │
    ├── linked_vaccine_id ──────→ vaccines
    ├── linked_exam_id ─────────→ exams
    ├── linked_medication_id ───→ medications
    ├── linked_consultation_id ─→ consultations
    ├── linked_expense_id ──────→ expenses
    ├── linked_weight_metric_id → clinical_metrics (metric_type='weight')
    ├── linked_allergy_id ──────→ allergies
    ├── linked_surgery_id ──────→ surgeries
    ├── linked_connection_id ───→ pet_connections
    ├── linked_nutrition_id ────→ pet_nutrition
    ├── linked_travel_id ───────→ pet_travels
    ├── linked_plan_id ─────────→ pet_plans
    ├── linked_achievement_id ──→ pet_achievements
    └── linked_mood_log_id ─────→ mood_logs

Toda tabela de módulo tem diary_entry_id de volta:
  vaccines.diary_entry_id ──────→ diary_entries (qual entrada criou)
  expenses.diary_entry_id ──────→ diary_entries
  mood_logs.diary_entry_id ─────→ diary_entries
  ... (todas as 14 tabelas de módulo/saúde/IA)

Bidirecional: diário aponta pro módulo, módulo aponta pro diário.
O diário é o HUB central — toda informação passa por ele.
```

### Aldeia (pós-MVP — 22 tabelas adicionais)

As 22 tabelas da Aldeia estão documentadas em `aldeia_db_telas_spec.md` e NÃO estão incluídas aqui. Quando implementadas, o total será ~50 tabelas.

### Scaling estimado

```
10 tutores (beta)      → ~1.000 diary_entries → 28 tabelas bastam
100 tutores (launch)   → ~10.000 entries → views materializadas necessárias
1.000 tutores          → ~100.000 entries → particionamento de diary_entries por pet_id
10.000+ tutores        → ~1M entries → read replicas + CDN para mídia
Aldeia ativa           → +22 tabelas → total ~50
Aldeia com 10k users   → conexões entre aldeias → sharding por região
```
