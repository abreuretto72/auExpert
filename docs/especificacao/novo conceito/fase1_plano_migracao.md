# auExpert — Fase 1: Migração para Conceito Diário-Cêntrico
# Data: 30/03/2026
# Objetivo: Transformar o diário existente no coração do app

---

## 1. ANÁLISE DO GAP (o que existe vs o que precisa)

### 1.1 O que já funciona (PRESERVAR)

| Componente | Estado | Ação |
|-----------|--------|------|
| Login + cadastro + biometria | Funcionando | Preservar 100% |
| Hub com cards dos pets | Funcionando | Refatorar layout (diário protagonista) |
| Cadastro de pet | Funcionando | Preservar, melhorar depois |
| Diário com timeline | Funcionando (texto básico) | REFATORAR (coração da Fase 1) |
| Auth Supabase | Configurado | Preservar |
| RLS em todas as tabelas | Ativo | Preservar, expandir |
| 13 tabelas no Supabase | Criadas | Migrar diary_entries, adicionar tabelas |
| 5 Views | Funcionando | Preservar, adicionar novas |
| 7 Triggers | Funcionando | Preservar, atualizar |
| 11 Edge Functions | Deploy feito | Refatorar narração |
| Storage Buckets | Configurados | Preservar |

### 1.2 O que precisa mudar na Fase 1

| Mudança | Prioridade | Complexidade |
|---------|-----------|-------------|
| diary_entries: adicionar campos novos (ALTER TABLE) | CRÍTICA | Média |
| Narração IA: de voz do pet para 3ª pessoa narradora | CRÍTICA | Baixa |
| Dashboard do pet: diário como protagonista | ALTA | Média |
| Input selector: 8 elementos de entrada | ALTA | Média |
| Sistema de classificação IA básico | ALTA | Alta |
| Sugestão de módulos (cards) | MÉDIA | Média |
| clinical_metrics (tabela nova) | MÉDIA | Baixa |
| expenses (tabela nova) | BAIXA (Fase 2) | Baixa |
| pet_plans (tabela nova) | BAIXA (Fase 2) | Baixa |

### 1.3 O que NÃO entra na Fase 1

- Aldeia (rede solidária)
- Planos pet (5 tipos)
- Viagens
- Conquistas/gamificação
- Co-parentalidade
- Perfil do tutor completo
- Offline-first
- Scanner OCR avançado
- Análise de vídeo
- Análise de som do pet

---

## 2. FASE 1 — DIVIDIDA EM 4 SPRINTS

```
Sprint 1.1 — BANCO DE DADOS (migração)
Sprint 1.2 — NARRAÇÃO + CLASSIFICAÇÃO IA (Edge Functions)
Sprint 1.3 — TELAS (Dashboard Diário-cêntrico + Input)
Sprint 1.4 — INTEGRAÇÃO (tudo conectado + teste)
```

---

## 3. SPRINT 1.1 — BANCO DE DADOS

### Objetivo: migrar diary_entries e criar tabelas essenciais sem quebrar o que funciona.

### 3.1 ALTER TABLE diary_entries (migração não-destrutiva)

Adicionar campos novos SEM remover ou renomear os existentes.
Dados antigos continuam funcionando. Campos novos são todos nullable ou têm default.

```sql
-- ============================================================
-- SPRINT 1.1 — Migration: diary_entries para conceito Diário-cêntrico
-- REGRA: NÃO remover colunas existentes. Apenas ADICIONAR.
-- ============================================================

-- 1. Novo campo input_type expandido (o antigo input_method continua existindo)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS input_type VARCHAR(30) DEFAULT 'text'
  CHECK (input_type IN (
    'photo','video','voice','pet_audio','text',
    'gallery_photo','gallery_video','gallery_audio',
    'ocr_scan','pdf_upload',
    'photo_voice','photo_text','video_voice',
    'ocr_voice','gallery_voice','pet_audio_photo','multi'
  ));

-- 2. Migrar dados do campo antigo para o novo
UPDATE diary_entries SET input_type = input_method WHERE input_type = 'text';
-- (input_method antigo tinha: 'voice', 'photo', 'text' — todos válidos no novo enum)

-- 3. Sistema de classificação IA
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS classifications JSONB DEFAULT '[]';
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS primary_type VARCHAR(30) DEFAULT 'moment'
  CHECK (primary_type IN (
    'moment','vaccine','exam','medication','consultation',
    'allergy','weight','surgery','symptom','food',
    'expense','connection','travel','partner',
    'achievement','mood','insurance','plan'
  ));

-- 4. Narração IA (campo narration já existe — manter)
-- O campo "narration" existente continua. Não precisa de novo campo.
-- A mudança é no CONTEÚDO (3ª pessoa), não na estrutura.

-- 5. Humor expandido
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS mood_confidence REAL;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS mood_source VARCHAR(20) DEFAULT 'text'
  CHECK (mood_source IN ('text','photo','video','pet_audio','ai_pattern'));

-- 6. Urgência (saúde)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS urgency VARCHAR(10) DEFAULT 'none'
  CHECK (urgency IN ('none','low','medium','high'));

-- 7. Mídia expandida (fotos antigo = JSONB com URLs, manter)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_thumbnail TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_duration INTEGER;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS audio_type VARCHAR(20)
  CHECK (audio_type IN ('tutor_voice','pet_sound'));
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS document_type VARCHAR(30);
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS ocr_data JSONB;

-- 8. Análises especializadas
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS video_analysis JSONB;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS pet_audio_analysis JSONB;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS photo_analysis_data JSONB;

-- 9. Vínculos com módulos (todos nullable — preenchidos quando tutor confirma)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_vaccine_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_exam_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_medication_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_consultation_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_expense_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_weight_metric_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_allergy_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_surgery_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_connection_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_nutrition_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_travel_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_plan_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_achievement_id UUID;
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS linked_mood_log_id UUID;

-- 10. Novos índices
CREATE INDEX IF NOT EXISTS idx_diary_primary_type ON diary_entries(primary_type);
CREATE INDEX IF NOT EXISTS idx_diary_input_type ON diary_entries(input_type);
CREATE INDEX IF NOT EXISTS idx_diary_urgency ON diary_entries(urgency) WHERE urgency != 'none';
CREATE INDEX IF NOT EXISTS idx_diary_classifications ON diary_entries USING GIN(classifications);
```

### 3.2 Nova tabela: clinical_metrics (essencial para gráficos)

```sql
CREATE TABLE IF NOT EXISTS clinical_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    exam_id         UUID,
    metric_type     VARCHAR(30) NOT NULL
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
    value           DECIMAL(10,3) NOT NULL,
    unit            VARCHAR(20),
    reference_min   DECIMAL(10,3),
    reference_max   DECIMAL(10,3),
    status          VARCHAR(20) DEFAULT 'normal'
                    CHECK (status IN ('normal','low','high','critical')),
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai_photo','ai_video','vet','lab')),
    measured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_pet ON clinical_metrics(pet_id);
CREATE INDEX idx_metrics_type ON clinical_metrics(metric_type);
CREATE INDEX idx_metrics_pet_type_date ON clinical_metrics(pet_id, metric_type, measured_at DESC);

-- RLS
ALTER TABLE clinical_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY metrics_own_data ON clinical_metrics
  FOR ALL USING (user_id = auth.uid());
```

### 3.3 Novas tabelas de referência

```sql
-- Configuração do app
CREATE TABLE IF NOT EXISTS app_config (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_config (key, value, description) VALUES
  ('classification_threshold', '0.5', 'Confiança mínima para classificar'),
  ('suggestion_threshold', '0.7', 'Confiança mínima para sugerir módulo'),
  ('max_photos_per_entry', '5', 'Máximo de fotos por entrada'),
  ('max_video_seconds', '60', 'Duração máxima de vídeo')
ON CONFLICT (key) DO NOTHING;

-- Referências de métricas por raça/espécie
CREATE TABLE IF NOT EXISTS metric_references (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species         VARCHAR(10) NOT NULL CHECK (species IN ('dog','cat')),
    breed           VARCHAR(80),
    size            VARCHAR(20),
    age_min_months  INTEGER,
    age_max_months  INTEGER,
    metric_type     VARCHAR(30) NOT NULL,
    reference_min   DECIMAL(10,3) NOT NULL,
    reference_max   DECIMAL(10,3) NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    notes           TEXT
);

CREATE INDEX idx_metric_ref ON metric_references(species, metric_type);
```

### 3.4 Nova view materializada

```sql
-- Atualiza a view de saúde existente para incluir clinical_metrics
CREATE OR REPLACE VIEW vw_pet_health_summary_v2 AS
SELECT
  p.id AS pet_id,
  p.name,
  p.health_score,
  p.current_mood,
  p.weight_kg AS current_weight,
  (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND v.status = 'overdue' AND v.is_active = TRUE) AS vaccines_overdue,
  (SELECT COUNT(*) FROM vaccines v WHERE v.pet_id = p.id AND v.status = 'up_to_date' AND v.is_active = TRUE) AS vaccines_ok,
  (SELECT COUNT(*) FROM allergies a WHERE a.pet_id = p.id AND a.is_active = TRUE) AS allergies_count,
  (SELECT value FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' AND cm.is_active = TRUE ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight,
  (SELECT measured_at FROM clinical_metrics cm WHERE cm.pet_id = p.id AND cm.metric_type = 'weight' AND cm.is_active = TRUE ORDER BY cm.measured_at DESC LIMIT 1) AS last_weight_date,
  (SELECT COUNT(*) FROM diary_entries d WHERE d.pet_id = p.id AND d.is_active = TRUE) AS diary_count
FROM pets p
WHERE p.is_active = TRUE AND p.is_memorial = FALSE;
```

### 3.5 Migração de dados existentes

```sql
-- Classificar entradas antigas como 'moment' (eram todas manuais)
UPDATE diary_entries
SET primary_type = 'moment',
    classifications = '[]'::jsonb,
    input_type = COALESCE(input_method, 'text')
WHERE primary_type IS NULL OR classifications IS NULL;

-- Entradas de vacina antigas
UPDATE diary_entries
SET primary_type = 'vaccine'
WHERE entry_type = 'vaccine';

-- Entradas de alergia antigas
UPDATE diary_entries
SET primary_type = 'allergy'
WHERE entry_type = 'allergy';

-- Entradas de análise de foto antigas
UPDATE diary_entries
SET primary_type = 'moment',
    input_type = 'photo'
WHERE entry_type = 'photo_analysis';
```

### 3.6 O que NÃO mexer no banco (Sprint 1.1)

- Tabelas users, pets, sessions → intactas
- Tabelas vaccines, allergies → intactas (FK diary_entry_id adicionada depois)
- Views existentes → mantidas (a nova é _v2)
- Triggers existentes → mantidos
- RLS existente → mantido
- audit_log → mantido

### 3.7 Checklist Sprint 1.1

```
[ ] ALTER TABLE diary_entries (15 ALTER ADDs)
[ ] UPDATE dados antigos (4 updates de migração)
[ ] CREATE TABLE clinical_metrics
[ ] CREATE TABLE app_config + seeds
[ ] CREATE TABLE metric_references
[ ] CREATE VIEW vw_pet_health_summary_v2
[ ] CREATE INDEX (3 novos índices)
[ ] RLS em clinical_metrics
[ ] Testar: entradas antigas continuam aparecendo na timeline
[ ] Testar: nova entrada com campos novos salva corretamente
[ ] Testar: views existentes continuam funcionando
```

---

## 4. SPRINT 1.2 — NARRAÇÃO + CLASSIFICAÇÃO IA

### Objetivo: Edge Function classify-diary-entry unificada, narração em 3ª pessoa.

### 4.1 Refatorar Edge Function: generate-diary-narration → classify-diary-entry

A Edge Function antiga `generate-diary-narration` apenas gerava narração na voz do pet.
A nova `classify-diary-entry` faz TUDO em 1 chamada:

```
ANTES (generate-diary-narration):
  Input: pet_name, content, mood
  Output: narration (voz do pet, 1ª pessoa)

DEPOIS (classify-diary-entry):
  Input: pet_id, text, photo_base64?, pet_context
  Output: {
    classifications: [{type, confidence, extracted_data}],
    narration: "Hoje o Rex foi ao...",   ← 3ª pessoa SEMPRE
    mood: "happy",
    mood_confidence: 0.87,
    urgency: "none",
    clinical_metrics: [{type, value, unit, status}],
    suggestions: ["texto da sugestão"]
  }
```

### 4.2 Estrutura da Edge Function

```typescript
// supabase/functions/classify-diary-entry/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Módulos reutilizáveis
import { validateAuth } from './modules/auth.ts'
import { classifyEntry } from './modules/classifier.ts'
import { saveEntry } from './modules/save.ts'
import { generateEmbedding } from './modules/rag.ts'

serve(async (req) => {
  // 1. Auth
  const user = await validateAuth(req)

  // 2. Parse input
  const { pet_id, text, photo_base64, input_type } = await req.json()

  // 3. Buscar contexto do pet (nome, raça, idade, memórias recentes)
  const petContext = await getPetContext(pet_id)

  // 4. Classificar com 1 chamada ao Claude
  const result = await classifyEntry({
    text,
    photo_base64,
    input_type,
    petContext,
  })

  // 5. Retornar resultado (celular mostra cards de sugestão)
  return new Response(JSON.stringify(result))
})
```

### 4.3 Módulo classifier.ts (o prompt unificado)

```typescript
// supabase/functions/classify-diary-entry/modules/classifier.ts

export async function classifyEntry({ text, photo_base64, input_type, petContext }) {
  const messages = []

  // Se tem foto, enviar como imagem
  if (photo_base64) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: photo_base64 }
        },
        { type: 'text', text: text || 'Analise esta imagem.' }
      ]
    })
  } else {
    messages.push({ role: 'user', content: text })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: buildSystemPrompt(petContext),
      messages,
    })
  })

  const data = await response.json()
  const jsonText = data.content[0].text
  return JSON.parse(jsonText)
}

function buildSystemPrompt(pet) {
  return `
Você é o classificador do auExpert, um app de diário de pets.

Analise a entrada do tutor e retorne APENAS JSON válido (sem markdown, sem backticks).

Pet: ${pet.name}, ${pet.breed || 'SRD'}, ${pet.species === 'dog' ? 'cão' : 'gato'}, ${pet.age || 'idade desconhecida'}, peso: ${pet.weight_kg || '?'}kg
Memórias recentes: ${pet.recentMemories || 'nenhuma'}

REGRAS DE NARRAÇÃO:
- SEMPRE em 3ª pessoa ("O ${pet.name} foi...", "Hoje o ${pet.name}...")
- NUNCA em 1ª pessoa ("Fui...", "Comi...", "Meu dono...")
- Descritiva, factual, tom acolhedor mas profissional
- Mencionar dados extraídos (nomes, valores, datas)
- Máximo 150 palavras

Retorne:
{
  "classifications": [{ "type": "...", "confidence": 0.0-1.0, "extracted_data": {} }],
  "narration": "Hoje o ${pet.name}...",
  "mood": "ecstatic|happy|calm|playful|tired|anxious|sad|sick",
  "mood_confidence": 0.0-1.0,
  "urgency": "none|low|medium|high",
  "clinical_metrics": [{ "type": "weight|temperature|...", "value": 0, "unit": "kg", "status": "normal|low|high" }],
  "suggestions": ["texto curto da sugestão para o tutor"]
}

Tipos de classificação:
moment (momento casual), vaccine (vacina), exam (exame), medication (remédio),
consultation (consulta vet), allergy (alergia), weight (peso), surgery (cirurgia),
symptom (sintoma de saúde), food (alimentação), expense (gasto/nota fiscal),
connection (outro pet/amigo), travel (viagem), achievement (conquista/marco),
mood (humor), insurance (seguro), plan (plano pet).

Se a foto for documento (nota, carteirinha, receita, laudo), extraia todos os dados em extracted_data.
Se a foto for do pet, analise saúde visual e humor.
Se não houver foto, classifique apenas pelo texto.
`
}
```

### 4.4 Manter Edge Function antiga funcionando

NÃO remover `generate-diary-narration`. Manter como fallback.
A nova `classify-diary-entry` é adicionada ao lado.

```
Edge Functions após Sprint 1.2:
  classify-diary-entry          ← NOVA (classificação + narração 3ª pessoa)
  generate-diary-narration      ← ANTIGA (mantida como fallback)
  analyze-pet-photo             ← EXISTENTE (mantida)
  generate-embedding            ← EXISTENTE (mantida)
  search-rag                    ← EXISTENTE (mantida)
  check-vaccine-status          ← EXISTENTE (mantida)
  compress-media                ← EXISTENTE (mantida)
  send-push-notifications       ← EXISTENTE (mantida)
  ... demais existentes mantidas
```

### 4.5 Checklist Sprint 1.2

```
[ ] Criar classify-diary-entry/index.ts
[ ] Criar classify-diary-entry/modules/auth.ts
[ ] Criar classify-diary-entry/modules/classifier.ts (prompt 3ª pessoa)
[ ] Criar classify-diary-entry/modules/save.ts
[ ] Criar classify-diary-entry/modules/rag.ts (busca contexto)
[ ] Deploy: supabase functions deploy classify-diary-entry
[ ] Testar: enviar texto simples → receber classificação + narração
[ ] Testar: enviar texto + foto → receber OCR + classificação
[ ] Testar: narração SEMPRE em 3ª pessoa (nunca "Fui...", "Meu dono...")
[ ] Testar: classificação múltipla ("fui no vet + tomou V10 + pesou 32kg")
[ ] Testar: urgência detectada ("Rex tá com diarreia há 2 dias")
[ ] Verificar: Edge Functions antigas continuam funcionando
```

---

## 5. SPRINT 1.3 — TELAS (refatoração visual)

### Objetivo: Dashboard com diário protagonista + input selector com pelo menos texto/voz/foto.

### 5.1 Refatorar: Dashboard do Pet

```
ANTES (grid de módulos):
  ┌──────────────────────────┐
  │ Header do pet             │
  │ [Diário][Saúde][IA][...]  │ ← Grid de módulos iguais
  └──────────────────────────┘

DEPOIS (diário protagonista):
  ┌──────────────────────────┐
  │ Header do pet + stats     │
  │ ┌──────────────────────┐ │
  │ │ DIÁRIO (70% da tela) │ │ ← Protagonista
  │ │ Timeline + filtros   │ │
  │ │ [+] FAB câmera       │ │
  │ └──────────────────────┘ │
  │ Lentes: [Pront][Nutri]..│ │ ← Pequenos, abaixo
  └──────────────────────────┘
```

Arquivos a criar/refatorar:

```
REFATORAR:
  app/(app)/pet/[id]/index.tsx     → Dashboard v2 (diário protagonista)
  components/DiaryEntry.tsx         → Adicionar classificação, narração 3ª pessoa

CRIAR:
  components/diary/DiaryTimeline.tsx     → FlatList otimizada
  components/diary/InputSelector.tsx     → Modal com elementos de entrada
  components/diary/ClassificationCard.tsx → Card de sugestão IA
  components/diary/NarrationBubble.tsx   → Balão de narração da IA
  components/lenses/LensGrid.tsx         → Grid de lentes no dashboard
```

### 5.2 Input Selector — versão Fase 1

Na Fase 1, NÃO implementar os 8 elementos. Começar com 3 + placeholder para os outros:

```
FASE 1 (funcional):
  [Foto]     → Câmera + envio para classify-diary-entry
  [Falar]    → Microfone + STT + envio para classify-diary-entry
  [Escrever] → Texto livre + envio para classify-diary-entry

FASE 1 (placeholder — visual existe mas mostra "Em breve"):
  [Vídeo]      → "Em breve"
  [Ouvir]      → "Em breve"
  [Galeria]    → "Em breve"
  [Scanner]    → "Em breve"
  [Documento]  → "Em breve"
```

### 5.3 Fluxo de entrada na Fase 1

```
Tutor toca "+" → InputSelector abre
  → Escolhe Foto/Falar/Escrever
  → Envia para classify-diary-entry
  → Recebe resultado da IA
  → Mostra ClassificationCards
    → Cada classificação com CTA:
      [Registrar no Prontuário] (se vacina/exame/peso)
      [Só salvar no diário]
  → Tutor confirma → salva
  → Timeline atualizada com narração IA (3ª pessoa)
```

### 5.4 Refatorar DiaryEntry (card da timeline)

```
ANTES:
  ┌────────────────────────┐
  │ 14:00 · Manual         │
  │ "Texto do tutor"       │
  │ Narração: "Fui no..."  │ ← Voz do pet
  └────────────────────────┘

DEPOIS:
  ┌────────────────────────┐
  │ 14:00 · 😊 Feliz       │
  │                        │
  │ "Hoje o Rex foi ao     │
  │  veterinário..."       │ ← Narração IA 3ª pessoa
  │                        │
  │ 🏷️ Saúde · Vacina      │ ← Tags da classificação
  │ ✓ Prontuário           │ ← Módulo alimentado
  └────────────────────────┘
```

### 5.5 Hook: useDiaryEntry (o hook único)

```typescript
// hooks/useDiaryEntry.ts

export function useDiaryEntry(petId: string) {
  const queryClient = useQueryClient()

  // Buscar timeline
  const timeline = useQuery({
    queryKey: ['diary', petId],
    queryFn: () => fetchDiaryEntries(petId),
    staleTime: 5 * 60 * 1000, // 5 min
  })

  // Enviar entrada
  const submit = useMutation({
    mutationFn: async ({ text, photoBase64, inputType }) => {
      // 1. Optimistic update (aparece na timeline imediatamente)
      const tempEntry = createOptimisticEntry(text, inputType)
      queryClient.setQueryData(['diary', petId], old => ({
        ...old,
        entries: [tempEntry, ...(old?.entries || [])]
      }))

      // 2. Chamar classify-diary-entry
      const result = await supabase.functions.invoke('classify-diary-entry', {
        body: { pet_id: petId, text, photo_base64: photoBase64, input_type: inputType }
      })

      return result.data
    },
    onSuccess: (result) => {
      // 3. Atualizar com dados reais da IA
      queryClient.setQueryData(['diary', petId], old => ({
        ...old,
        entries: old.entries.map(e =>
          e.isOptimistic ? { ...e, ...result, isOptimistic: false } : e
        )
      }))
    }
  })

  // Confirmar classificação (registrar em módulo)
  const confirmClassification = useMutation({
    mutationFn: async ({ diaryEntryId, classification }) => {
      return await supabase.functions.invoke('save-classified-entry', {
        body: { diary_entry_id: diaryEntryId, classification }
      })
    }
  })

  return { timeline, submit, confirmClassification }
}
```

### 5.6 Checklist Sprint 1.3

```
[ ] Refatorar Dashboard pet/[id]/index.tsx (diário protagonista)
[ ] Criar DiaryTimeline.tsx (FlatList otimizada)
[ ] Criar InputSelector.tsx (3 ativos + 5 placeholder)
[ ] Criar ClassificationCard.tsx (card de sugestão IA)
[ ] Criar NarrationBubble.tsx (balão 3ª pessoa)
[ ] Criar LensGrid.tsx (grid de lentes embaixo)
[ ] Criar useDiaryEntry.ts (hook único)
[ ] Refatorar DiaryEntry.tsx (classificação + narração nova)
[ ] Testar: tela abre sem erro
[ ] Testar: entrada por texto funciona end-to-end
[ ] Testar: entrada por voz funciona (STT + classificação)
[ ] Testar: entrada por foto funciona (Vision + classificação)
[ ] Testar: optimistic update (entrada aparece imediato)
[ ] Testar: narração aparece em 2-3s
[ ] Testar: scroll da timeline suave (60 FPS)
```

---

## 6. SPRINT 1.4 — INTEGRAÇÃO + TESTES

### Objetivo: tudo conectado, fluxo completo funcionando, zero regressão.

### 6.1 Fluxo completo para testar

```
FLUXO 1 — Texto simples:
  Hub → Rex → Diário → "+" → Escrever → "Rex brincou no parque"
  → IA classifica: moment (95%) + mood: happy (87%)
  → Narração: "Hoje o Rex brincou no parque. Segundo o tutor, foi um passeio animado."
  → Aparece na timeline com tag "Momento" e humor "Feliz"

FLUXO 2 — Voz com múltiplos itens:
  Hub → Rex → Diário → "+" → Falar → "Voltei do vet, Rex tomou V10, pesou 32kg"
  → IA classifica: consultation (90%) + vaccine (92%) + weight (88%)
  → 3 cards de sugestão aparecem
  → Tutor confirma todos
  → Vacina salva, peso salvo em clinical_metrics, consulta anotada
  → Narração: "Hoje o Rex foi ao veterinário. Foi aplicada a vacina V10 e o peso registrado foi de 32 quilos."

FLUXO 3 — Foto:
  Hub → Rex → Diário → "+" → Foto → tira foto do Rex no sofá
  → IA analisa: moment + mood: calm + saúde visual OK
  → Narração: "O Rex foi fotografado descansando no sofá. Aparência saudável, pelo brilhoso, humor calmo."

FLUXO 4 — Regressão (entradas antigas):
  → Entradas antigas continuam aparecendo na timeline
  → Narração antiga (voz do pet) continua exibida (não reprocessar)
  → Novas entradas usam narração 3ª pessoa
```

### 6.2 Compatibilidade com dados antigos

```
REGRA: Entradas antigas NÃO são reprocessadas.

diary_entries existentes:
  → narration (campo antigo) → continua exibido como está
  → classifications = '[]' → sem tags de classificação
  → primary_type = 'moment' → classificado genericamente
  → input_type = valor migrado de input_method

Novas entradas:
  → narration = narração 3ª pessoa da IA
  → classifications = [{type, confidence, extracted_data}]
  → primary_type = classificação principal
  → input_type = novo formato expandido
```

### 6.3 Checklist Sprint 1.4

```
[ ] Teste end-to-end: Fluxo 1 (texto simples)
[ ] Teste end-to-end: Fluxo 2 (voz com múltiplos itens)
[ ] Teste end-to-end: Fluxo 3 (foto do pet)
[ ] Teste end-to-end: Fluxo 4 (regressão — dados antigos)
[ ] Performance: timeline scroll 60 FPS com 50+ entradas
[ ] Performance: entrada salva em < 3s
[ ] Performance: narração aparece em < 3s
[ ] Offline: app abre com dados cacheados
[ ] Edge case: sem internet → mostra placeholder "Sem conexão"
[ ] Edge case: IA falha → salva entrada sem classificação
[ ] Edge case: foto muito grande → comprime antes de enviar
[ ] Login existente continua funcionando
[ ] Hub existente continua funcionando
[ ] Cadastro de pet continua funcionando
[ ] Vacinas existentes continuam aparecendo
```

---

## 7. ORDEM DE EXECUÇÃO (Claude Code)

### Prompt Sprint 1.1 (Banco)

```
Leia CLAUDE.md e o arquivo de migração abaixo.
Execute as migrations SQL no Supabase na ordem indicada.
NÃO remova colunas existentes. Apenas ADD.
Teste que entradas antigas continuam funcionando.
```

### Prompt Sprint 1.2 (IA)

```
Leia CLAUDE.md. Crie a Edge Function classify-diary-entry
seguindo a estrutura de modules/ descrita.
O prompt da IA DEVE gerar narração em 3ª pessoa.
NUNCA "Fui...", "Meu dono..." — SEMPRE "O Rex foi...", "Hoje o Rex..."
Deploy e teste com 3 exemplos.
```

### Prompt Sprint 1.3 (Telas)

```
Leia CLAUDE.md e os protótipos em docs/prototypes/:
  - pet_dashboard_v2_diary.jsx (referência visual do Dashboard)
  - diary_input_selector.jsx (referência visual do Input Selector)
  - diary_photo_result.jsx (referência visual do resultado de foto)
  - diary_voice_result.jsx (referência visual do resultado de voz)

Refatore o Dashboard do pet para o conceito Diário-cêntrico.
O diário deve ser protagonista (70% da tela).
Crie os componentes listados.
Use o hook useDiaryEntry.ts para tudo.
```

### Prompt Sprint 1.4 (Integração)

```
Teste todos os fluxos descritos no checklist da Sprint 1.4.
Verifique que nada do que funcionava antes quebrou.
Liste qualquer bug encontrado.
```

---

## 8. CRITÉRIOS DE CONCLUSÃO DA FASE 1

A Fase 1 está CONCLUÍDA quando:

```
✓ Tutor abre o app → vê Hub com pets (como antes)
✓ Toca no pet → vê Dashboard com DIÁRIO como protagonista (NOVO)
✓ Toca "+" → vê Input Selector com Foto/Falar/Escrever (NOVO)
✓ Envia texto → IA classifica e narra em 3ª pessoa (NOVO)
✓ Envia voz → STT + IA classifica e narra (NOVO)
✓ Envia foto → Vision + IA classifica e narra (NOVO)
✓ Cards de sugestão aparecem (NOVO)
✓ Tutor confirma → vacina/peso/etc registrado no módulo correto (NOVO)
✓ Timeline mostra entradas com narração, tags e humor (NOVO)
✓ Entradas antigas continuam visíveis (PRESERVADO)
✓ Login/cadastro/biometria funcionam (PRESERVADO)
✓ Lentes aparecem embaixo do diário (visual, ainda sem dados novos)
✓ clinical_metrics salva peso quando tutor confirma
✓ Scroll 60 FPS
✓ Entrada salva < 3 segundos
```

---

## 9. O QUE VEM DEPOIS (Fase 2 — preview)

```
Fase 2.1 — Scanner OCR (fotos de documentos)
Fase 2.2 — Gastos (tabela expenses + lente)
Fase 2.3 — Galeria (upload de mídia existente)
Fase 2.4 — Lente Prontuário completa (vacinas + exames + consultas)
Fase 2.5 — Vídeo (gravação + análise de locomoção)
Fase 2.6 — Som do pet (gravação + análise de padrão)
```
