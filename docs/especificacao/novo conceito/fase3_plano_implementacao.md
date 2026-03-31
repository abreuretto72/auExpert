# auExpert — Fase 3: Documento + Vídeo + Som + Nutrição + Amigos
# Data: 31/03/2026
# Pré-requisito: Fase 2 concluída (Galeria + Scanner + Prontuário + Gastos)

---

## 1. VISÃO GERAL

A Fase 2 ativou Galeria e Scanner e entregou as lentes Prontuário e Gastos.
A Fase 3 ativa os 3 elementos de entrada restantes (Documento, Vídeo, Ouvir) e cria as lentes Nutrição e Amigos.

```
FASE 2 (concluída):                      FASE 3 (esta):
  ✓ Galeria (fotos/vídeos existentes)      Documento (upload PDF)
  ✓ Scanner OCR (documentos)              Vídeo (gravação + análise IA)
  ✓ Lente Prontuário completa             Ouvir (som do pet + análise emocional)
  ✓ Lente Gastos                          Lente Nutrição
  ✓ expenses + consultations + exams      Lente Amigos
  ✓ Tabelas de saúde (vacinas, meds)      Tabelas nutrition_records + pet_connections
```

---

## 2. OS 5 SPRINTS

```
Sprint 3.1 — DOCUMENTO (upload PDF — importação de prontuário antigo)
Sprint 3.2 — VÍDEO (gravação + análise de locomoção IA)
Sprint 3.3 — OUVIR (som do pet — latido/miado com análise emocional)
Sprint 3.4 — NUTRIÇÃO (lente com ração, dieta, suplementos)
Sprint 3.5 — AMIGOS (grafo social do pet + detecção em fotos)
```

---

## 3. SPRINT 3.1 — DOCUMENTO

### Objetivo: Ativar o botão Documento no InputSelector. Upload de PDF para importar prontuários antigos e laudos.

### 3.1 Por que Documento é prioridade #1

O tutor acumula anos de prontuários em PDF:
- Vet manda laudo em PDF por e-mail
- Clínica entrega prontuário completo em PDF
- Tutor tem PDF de vacinas de outro pet
- Seguradora exige histórico médico em PDF

Sem upload de PDF, esse histórico nunca entra no app. É a feature que resolve o "passado" do pet.

### 3.2 O que implementar

```
CELULAR:
  1. Ativar botão "Documento" no InputSelector (remover "Em breve")
  2. Abrir expo-document-picker para selecionar PDF
  3. Converter PDF para imagens (uma por página, max 10 páginas)
  4. Mostrar preview das páginas antes de enviar
  5. Enviar para classify-diary-entry com input_type='pdf_upload'
  6. Mostrar tela de resultado com campos extraídos por página
  7. Tutor confirma página a página o que salvar

SERVIDOR (classify-diary-entry):
  1. Detectar input_type='pdf_upload'
  2. Processar cada página como imagem (Vision API)
  3. Extrair todos os dados estruturados encontrados
  4. Retornar array de classificações por página
  5. Gerar narração consolidada da importação
```

### 3.3 Lógica no celular

```typescript
// Dentro de InputSelector.tsx — ativar botão Documento

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

async function openDocumentPicker() {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
  });

  if (!result.canceled) {
    const file = result.assets[0];

    // Verificar tamanho (máximo 20MB)
    if (file.size > 20 * 1024 * 1024) {
      showAlert('PDF muito grande. Máximo 20MB.');
      return;
    }

    // Ler como base64
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Mostrar loading com feedback
    showProcessing('Analisando documento...');

    // Enviar para classify-diary-entry
    await submitEntry({
      inputType: 'pdf_upload',
      documentBase64: base64,
      documentType: 'pdf',
      text: additionalText || null,
    });
  }
}
```

### 3.4 Mudança no classify-diary-entry

Adicionar módulo `modules/pdf.ts` que converte PDF para imagens antes do Vision:

```typescript
// modules/pdf.ts — processar PDF

export async function processPDF(base64Pdf: string): Promise<string[]> {
  // Usar Deno/WASM para renderizar páginas do PDF como imagens
  // Retorna array de base64 images (uma por página, max 10)
  // Limita a 10 páginas para controlar custo de IA

  // Alternativa simples: enviar PDF direto como document no prompt Claude
  // Claude suporta application/pdf nativo no content block
  return [{
    type: 'document',
    source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf }
  }];
}
```

Prompt OCR para PDF (adicionar ao `modules/classifier.ts`):

```typescript
function buildPDFPrompt(pet) {
  return `
Você é o importador inteligente de prontuários do auExpert.
Analise este documento PDF de histórico médico veterinário.

Pet: ${pet.name}, ${pet.breed || 'SRD'}, ${pet.species === 'dog' ? 'cão' : 'gato'}

REGRA: Retorne APENAS JSON válido.

Extraia TUDO que encontrar no documento. Para cada item encontrado, crie uma entrada separada:

VACINAS: { type: "vaccine", extracted_data: { vaccine_name, date, next_due, batch, vet_name } }
CONSULTAS: { type: "consultation", extracted_data: { date, vet_name, reason, diagnosis, notes } }
EXAMES: { type: "exam", extracted_data: { exam_name, date, results: [{item,value,unit,ref_min,ref_max}] } }
MEDICAÇÕES: { type: "medication", extracted_data: { name, dosage, frequency, start_date, end_date } }
PESO/MÉTRICAS: { type: "weight", extracted_data: { value, unit, date } }
CIRURGIAS: { type: "surgery", extracted_data: { name, date, vet_name, notes } }
ALERGIAS: { type: "allergy", extracted_data: { allergen, reaction, severity, date } }

Retorne:
{
  "document_summary": "resumo do documento em 2 linhas",
  "date_range": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" },
  "classifications": [ array de todas as entradas encontradas ],
  "primary_type": "consultation",
  "narration": "narração em 3ª pessoa descrevendo o histórico importado",
  "import_count": { "vaccines": N, "consultations": N, "exams": N, "medications": N }
}
`;
}
```

### 3.5 Tela de resultado (importação PDF)

```
┌─────────────────────────────────┐
│  ← Voltar     Histórico importado│
│                                  │
│  📄 prontuario_rex_2024.pdf     │
│  Período: Jan/2024 – Dez/2024  │
│                                  │
│  IA encontrou:                  │
│  💉 3 vacinas  🩺 5 consultas   │
│  🧪 2 exames   💊 1 medicação   │
│                                  │
│  [Narração IA em 3ª pessoa]     │
│                                  │
│  ┌──────────────────────────┐   │
│  │ ✓ 💉 V10 · Jan/2024      │   │
│  │ ✓ 🩺 Consulta · Mar/2024 │   │
│  │ ✓ 🧪 Hemograma · Jun/24  │   │
│  │ ✓ 💉 Antirrábica · Set/24│   │
│  └──────────────────────────┘   │
│                                  │
│  [Importar tudo] [Selecionar]   │
└─────────────────────────────────┘
```

### 3.6 Banco de dados

Nenhuma tabela nova necessária. Os campos `document_url`, `document_type` e `ocr_data`
já foram adicionados ao `diary_entries` na Sprint 1.1.

A importação em lote salva múltiplas entradas no diário com uma diary_entry "pai" de
`input_type='pdf_upload'` e N diary_entries filhas com `primary_type` individual.

```sql
-- Adicionar campo opcional de referência à entrada pai (importação em lote)
ALTER TABLE diary_entries ADD COLUMN IF NOT EXISTS parent_entry_id UUID
  REFERENCES diary_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_diary_parent ON diary_entries(parent_entry_id)
  WHERE parent_entry_id IS NOT NULL;
```

### 3.7 Checklist Sprint 3.1

```
[ ] Ativar botão Documento no InputSelector (remover "Em breve")
[ ] Implementar expo-document-picker para PDF
[ ] Validação de tamanho máximo (20MB)
[ ] Enviar PDF como document block para classify-diary-entry
[ ] Adicionar modules/pdf.ts na Edge Function
[ ] Prompt OCR especializado para documentos históricos
[ ] Tela PDFImportScreen com lista de itens encontrados
[ ] Seleção individual de itens para importar
[ ] Botão "Importar tudo"
[ ] ALTER TABLE diary_entries ADD parent_entry_id
[ ] Salvar entrada pai (pdf_upload) + entradas filhas
[ ] Narração consolidada da importação
[ ] Testar: PDF de 1 página com 1 vacina
[ ] Testar: PDF de 10 páginas com histórico completo
[ ] Testar: PDF sem dados reconhecíveis (graceful fallback)
[ ] Testar: PDF acima de 20MB → mensagem de erro
[ ] Testar: itens importados aparecem no Prontuário
```

---

## 4. SPRINT 3.2 — VÍDEO

### Objetivo: Ativar o botão Vídeo no InputSelector. Gravação com câmera + análise de locomoção por IA.

### 4.1 Por que Vídeo é crítico para saúde

O vídeo do pet em movimento revela o que foto não mostra:
- Pet mancando → suspeita de lesão ortopédica
- Pet tremendo → suspeita neurológica ou hipoglicemia
- Pet coçando repetidamente → suspeita de alergia ou parasita
- Pet brincando feliz → registro de momento com análise de humor
- Pet se alimentando → confirma apetite normal

Um vídeo de 10 segundos substitui descrição textual imprecisa do tutor.

### 4.2 O que implementar

```
CELULAR:
  1. Ativar botão "Vídeo" no InputSelector (remover "Em breve")
  2. Abrir câmera em modo vídeo (expo-camera ou expo-av):
     ├── Limite: 60 segundos
     ├── Contador regressivo visível
     ├── Botão de parar antes do limite
     └── Preview antes de confirmar
  3. Comprimir vídeo antes de upload (expo-av ou ffmpeg-kit)
  4. Gerar thumbnail do frame mais representativo
  5. Enviar para classify-diary-entry com input_type='video'
  6. Mostrar resultado com análise de locomoção + narração

SERVIDOR:
  1. Receber vídeo base64 ou URL do Storage
  2. Extrair frames-chave (a cada 2s)
  3. Analisar frames com Vision API
  4. Detectar padrões de locomoção, humor e saúde visual
  5. Retornar video_analysis JSONB + classificação + narração
```

### 4.3 Lógica no celular

```typescript
// Dentro de InputSelector.tsx — modo vídeo

import { Camera, CameraType } from 'expo-camera';
import * as VideoThumbnails from 'expo-video-thumbnails';

async function recordVideo() {
  if (!cameraRef.current) return;

  // Iniciar gravação
  const videoData = await cameraRef.current.recordAsync({
    maxDuration: 60,          // 60 segundos máximo
    quality: Camera.Constants.VideoQuality['720p'],
    mute: false,              // gravar áudio junto
  });

  // Parar gravação
  cameraRef.current.stopRecording();

  // Gerar thumbnail
  const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
    videoData.uri, { time: 1000 }
  );

  // Comprimir e converter para base64
  const compressed = await compressVideo(videoData.uri);
  const base64 = await uriToBase64(compressed.uri);

  // Enviar para classify-diary-entry
  await submitEntry({
    inputType: 'video',
    videoBase64: base64,
    videoDuration: compressed.duration,
    videoThumbnail: thumbnailUri,
    text: additionalText || null,
  });
}
```

### 4.4 Prompt de análise de vídeo

Dentro do `classify-diary-entry`, quando `input_type === 'video'`:

```typescript
// modules/classifier.ts — prompt especializado para vídeo

function buildVideoPrompt(pet) {
  return `
Você é um especialista em saúde e comportamento animal do auExpert.
Analise este vídeo do pet e descreva o que observou.

Pet: ${pet.name}, ${pet.breed || 'SRD'}, ${pet.species === 'dog' ? 'cão' : 'gato'}

REGRA: Retorne APENAS JSON válido.

ANALISE:
1. LOCOMOÇÃO: O pet está mancando? Tem dificuldade para se mover? Movimento assimétrico?
2. COMPORTAMENTO: Está brincando, descansando, se coçando, tremendo, latindo/miando?
3. HUMOR: Ansioso, feliz, agitado, letárgico, curioso, com medo?
4. APARÊNCIA: Pelo, olhos, postura, peso visual
5. URGÊNCIA: Existe sinal de alerta médico no vídeo?

Retorne:
{
  "primary_type": "moment" | "symptom" | "consultation",
  "classifications": [{
    "type": "moment" | "symptom" | "mood",
    "confidence": 0.0-1.0,
    "extracted_data": {
      "behavior_detected": "brincando" | "mancando" | "se_cocando" | ...,
      "locomotion_normal": true | false,
      "locomotion_issues": "descrição se houver",
      "mood": "happy" | "anxious" | "calm" | "fearful" | "excited",
      "health_flags": ["lista de alertas visuais"],
      "duration_seconds": N
    }
  }],
  "urgency": "none" | "low" | "medium" | "high",
  "video_analysis": {
    "locomotion_score": 0-10,
    "behavior_summary": "resumo do comportamento",
    "health_observations": ["obs1", "obs2"],
    "mood": "happy",
    "mood_confidence": 0.0-1.0
  },
  "narration": "narração em 3ª pessoa descrevendo o vídeo",
  "mood": "happy"
}
`;
}
```

### 4.5 Armazenamento do vídeo

```
FLUXO DE UPLOAD:
  1. Celular grava → comprime para H264/720p (~5-10MB para 60s)
  2. Upload para Supabase Storage: pet-media/{pet_id}/videos/{uuid}.mp4
  3. Thumbnail salvo: pet-media/{pet_id}/thumbnails/{uuid}.jpg
  4. diary_entries.video_url = URL do vídeo
  5. diary_entries.video_thumbnail = URL do thumbnail
  6. diary_entries.video_duration = duração em segundos
  7. diary_entries.video_analysis = JSONB com análise

POLÍTICA DE RETENÇÃO:
  - Vídeos ficam no Storage indefinidamente
  - Tutor pode deletar manualmente
  - Soft delete: is_active = false (nunca deletar do banco)
```

### 4.6 Card de vídeo na timeline

```
┌─────────────────────────────────┐
│  Hoje 15:22                     │
│  🎥 [THUMBNAIL DO VÍDEO]       │  ← Tocável para reproduzir
│     ▶ 0:23 · Câmera             │
│                                  │
│  "O Rex foi filmado brincando   │
│   no quintal. Locomoção normal, │
│   humor feliz (93%). Movimento  │
│   ágil e sem sinais de dor."    │
│                                  │
│  [Momento] [Feliz 93%]          │
└─────────────────────────────────┘

--- ALERTA DE URGÊNCIA (se detectado):

┌─────────────────────────────────┐
│  Hoje 09:10                     │
│  🎥 [THUMBNAIL]  ⚠️ ALERTA      │
│     ▶ 0:15 · Câmera             │
│                                  │
│  "O Rex foi filmado apresentando│
│   dificuldade de locomoção no   │
│   membro posterior direito.     │
│   Recomenda-se avaliação vet."  │
│                                  │
│  [Sintoma] [🔴 Urgente]        │
│  [Agendar consulta]             │
└─────────────────────────────────┘
```

### 4.7 Checklist Sprint 3.2

```
[ ] Ativar botão Vídeo no InputSelector (remover "Em breve")
[ ] Implementar gravação com expo-camera (limite 60s, contador)
[ ] Preview do vídeo antes de confirmar
[ ] Compressão do vídeo antes de upload
[ ] Geração de thumbnail com expo-video-thumbnails
[ ] Upload para Supabase Storage (pet-media/videos/)
[ ] Enviar vídeo para classify-diary-entry
[ ] Prompt de análise de vídeo (locomoção + humor + saúde)
[ ] Card de vídeo na timeline com thumbnail clicável
[ ] Player de vídeo inline na timeline
[ ] Alerta visual quando urgency != 'none'
[ ] Testar: gravar vídeo de 10 segundos
[ ] Testar: gravar vídeo de 60 segundos (máximo)
[ ] Testar: vídeo de pet mancando → urgência detectada
[ ] Testar: vídeo de pet brincando → humor feliz
[ ] Testar: thumbnail aparece na timeline
[ ] Testar: análise de locomoção salva em video_analysis
```

---

## 5. SPRINT 3.3 — OUVIR (SOM DO PET)

### Objetivo: Ativar o botão Ouvir no InputSelector. Gravação de latido/miado com análise emocional por IA.

### 5.1 Por que Som do Pet é único

A voz do pet é o canal de comunicação mais direto:
- Latido de ansiedade vs latido de alerta vs latido de brincadeira
- Miado de fome vs miado de dor vs miado de atenção
- Ronronar = indicador de bem-estar
- Padrão de frequência e ritmo revela estado emocional

Com análise acumulada ao longo do tempo, a IA detecta mudanças de padrão que indicam problemas de saúde antes do tutor perceber.

### 5.2 O que implementar

```
CELULAR:
  1. Ativar botão "Ouvir" no InputSelector (remover "Em breve")
  2. Interface de gravação de áudio:
     ├── Visualizador de forma de onda em tempo real
     ├── Indicador de nível de áudio
     ├── Limite: 30 segundos
     ├── Botão de parar manual
     └── Preview antes de confirmar
  3. Converter para formato otimizado (opus/aac, bitrate reduzido)
  4. Enviar para classify-diary-entry com input_type='pet_audio'
  5. Mostrar análise emocional com histórico de padrões

SERVIDOR:
  1. Receber áudio base64
  2. Transcrição via STT (mesmo módulo, mas prompt diferente)
  3. Análise de padrão emocional via prompt especializado
  4. Comparar com histórico do pet (RAG)
  5. Retornar pet_audio_analysis JSONB + tendências
```

### 5.3 Interface de gravação de som do pet

```
┌─────────────────────────────────┐
│  ← Voltar    Gravando o Rex     │
│                                  │
│  Deixe o Rex perto do celular   │
│  e capture o som dele           │
│                                  │
│  ┌──────────────────────────┐   │
│  │ ▓▓▒▒░░▓▓▓▒░░▓▓▓▓▒▒░░   │   │  ← Waveform
│  └──────────────────────────┘   │
│                                  │
│  ● GRAVANDO  0:08 / 0:30        │
│                                  │
│  [⏹ Parar]                     │
│                                  │
│  Dica: Grave pelo menos 5s      │
│  para análise mais precisa      │
└─────────────────────────────────┘
```

### 5.4 Prompt de análise de som do pet

```typescript
// modules/stt.ts — prompt especializado para audio do pet

function buildPetAudioPrompt(pet, audioTranscription) {
  return `
Você é um especialista em comportamento animal e análise de vocalização do auExpert.
Analise este áudio capturado do pet.

Pet: ${pet.name}, ${pet.species === 'dog' ? 'cão' : 'gato'}, ${pet.breed || 'SRD'}
Transcrição do áudio: "${audioTranscription || 'áudio sem fala humana detectada'}"

REGRA: Retorne APENAS JSON válido.

Se for latido (cão), classifique:
  anxiety: frequência alta, intervalos curtos, tom agudo
  alert: latido grave, sustentado, rítmico
  play: latido curto, agudo, variado
  fear: latido com whimper, intermitente
  pain: ganido, vocalize alto e agudo

Se for miado (gato), classifique:
  hunger: miado curto, repetitivo
  attention: miado prolongado, modulado
  pain: miado agudo, sustentado
  content: ronronar ou vocalização suave
  stress: miado urgente, agitado

Retorne:
{
  "primary_type": "mood",
  "classifications": [{
    "type": "mood",
    "confidence": 0.0-1.0,
    "extracted_data": {
      "sound_type": "bark" | "meow" | "purr" | "whine" | "growl" | "other",
      "emotional_state": "anxiety" | "alert" | "play" | "fear" | "pain" | "hunger" | "content" | "stress",
      "intensity": "low" | "medium" | "high",
      "duration_seconds": N,
      "pattern_notes": "descrição do padrão"
    }
  }],
  "mood": "anxious" | "happy" | "fearful" | "calm" | "excited",
  "urgency": "none" | "low" | "medium" | "high",
  "pet_audio_analysis": {
    "emotional_state": "anxiety",
    "intensity": "high",
    "sound_type": "bark",
    "pattern_notes": "latidos em série, intervalos de 1-2s, tom agudo"
  },
  "narration": "narração em 3ª pessoa descrevendo o áudio e estado emocional"
}
`;
}
```

### 5.5 Banco de dados: tabela pet_mood_logs

Histórico emocional do pet para detectar tendências ao longo do tempo:

```sql
CREATE TABLE IF NOT EXISTS pet_mood_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    mood            VARCHAR(20) NOT NULL
                    CHECK (mood IN (
                      'happy','calm','excited','anxious',
                      'fearful','sad','aggressive','pain','unknown'
                    )),
    mood_score      INTEGER CHECK (mood_score BETWEEN 0 AND 100),
    source          VARCHAR(20) DEFAULT 'pet_audio'
                    CHECK (source IN ('pet_audio','photo','video','text','ai_pattern')),
    sound_type      VARCHAR(20),
    emotional_state VARCHAR(30),
    intensity       VARCHAR(10) CHECK (intensity IN ('low','medium','high')),
    notes           TEXT,
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_pet ON pet_mood_logs(pet_id);
CREATE INDEX idx_mood_pet_date ON pet_mood_logs(pet_id, logged_at DESC);
CREATE INDEX idx_mood_source ON pet_mood_logs(source);

ALTER TABLE pet_mood_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY mood_logs_own ON pet_mood_logs
  FOR ALL USING (user_id = auth.uid());
```

### 5.6 Card de som do pet na timeline

```
┌─────────────────────────────────┐
│  Hoje 22:14                     │
│  🎵 Som do Rex · 0:12           │
│  ▓▓▒▒▓▓▓▒░▓▓▒▒ [▶ Ouvir]      │  ← Waveform + botão play
│                                  │
│  "Foi gravado um áudio de 12    │
│   segundos do Rex. A análise    │
│   identificou padrão de latido  │
│   de ansiedade: frequência alta,│
│   intervalos curtos, tom agudo. │
│   É o 4º registro de ansiedade  │
│   nas últimas 2 semanas."       │
│                                  │
│  [Ansioso 88%] [⚠️ Padrão]     │
│  [Ver histórico emocional]      │
└─────────────────────────────────┘
```

### 5.7 Checklist Sprint 3.3

```
[ ] Ativar botão Ouvir no InputSelector (remover "Em breve")
[ ] Interface de gravação com visualizador de waveform
[ ] Limite de 30 segundos com contador
[ ] Compressão de áudio (opus/aac bitrate reduzido)
[ ] Upload para Supabase Storage (pet-media/audio/)
[ ] Enviar áudio para classify-diary-entry com input_type='pet_audio'
[ ] CREATE TABLE pet_mood_logs + RLS
[ ] Prompt de análise emocional por som
[ ] Salvar análise em diary_entries.pet_audio_analysis
[ ] Salvar em pet_mood_logs para histórico
[ ] Waveform player na timeline
[ ] Badge de padrão quando 3+ registros do mesmo estado em 7 dias
[ ] Testar: gravação de 5 segundos de latido
[ ] Testar: gravação de 30 segundos (máximo)
[ ] Testar: análise retorna emotional_state correto
[ ] Testar: 4º registro de ansiedade → padrão detectado na narração
[ ] Testar: áudio salvo no Storage e URL no diary_entry
```

---

## 6. SPRINT 3.4 — NUTRIÇÃO

### Objetivo: Criar tabela nutrition_records e ativar lente Nutrição com ração, dieta, suplementos e histórico.

### 6.1 CREATE TABLE nutrition_records

```sql
CREATE TABLE IF NOT EXISTS nutrition_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    record_type     VARCHAR(20) NOT NULL
                    CHECK (record_type IN (
                      'food','treat','supplement','water','diet_change',
                      'portion','restriction','intolerance'
                    )),
    product_name    VARCHAR(150),
    brand           VARCHAR(100),
    category        VARCHAR(30)
                    CHECK (category IN (
                      'dry_food','wet_food','raw','homemade','treat',
                      'supplement','medication_food','prescription'
                    )),
    portion_grams   DECIMAL(8,2),
    daily_portions  INTEGER DEFAULT 1,
    calories_kcal   DECIMAL(8,2),
    is_current      BOOLEAN DEFAULT FALSE,  -- ração atual do pet
    notes           TEXT,
    started_at      DATE,
    ended_at        DATE,
    source          VARCHAR(20) DEFAULT 'text'
                    CHECK (source IN ('text','voice','ocr','photo','manual')),
    extracted_data  JSONB,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nutrition_pet ON nutrition_records(pet_id);
CREATE INDEX idx_nutrition_current ON nutrition_records(pet_id, is_current)
  WHERE is_current = TRUE;
CREATE INDEX idx_nutrition_type ON nutrition_records(record_type);

ALTER TABLE nutrition_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutrition_own ON nutrition_records
  FOR ALL USING (user_id = auth.uid());

-- Ao registrar nova ração como current, desmarcar a anterior
CREATE OR REPLACE FUNCTION set_current_food()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE AND NEW.record_type = 'food' THEN
    UPDATE nutrition_records
    SET is_current = FALSE, ended_at = CURRENT_DATE
    WHERE pet_id = NEW.pet_id
      AND record_type = 'food'
      AND is_current = TRUE
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_current_food
  BEFORE INSERT OR UPDATE ON nutrition_records
  FOR EACH ROW EXECUTE FUNCTION set_current_food();
```

### 6.2 Lente Nutrição

```
NUTRIÇÃO DO REX

┌──────────────────────────────────┐
│ 🥘 Ração atual                  │
│ Royal Canin Medium Adult 15kg   │
│ 320g/dia · 2x ao dia · ~1.120 kcal│
│ Desde: 12/01/2026               │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 💊 Suplementos ativos (2)       │
│ • Ômega 3 · 1 cápsula/dia       │
│ • Probiótico · 2x/semana        │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🍖 Petiscos (últimos 30 dias)   │
│ 8 registros · estimativa 320kcal│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🚫 Intolerâncias                │
│ • Frango (coceira confirmada)   │
│ • Milho (flatulência)           │
└──────────────────────────────────┘

Histórico de rações:
  Jan/2026 – atual: Royal Canin Medium
  Jun/2025 – Jan/2026: Pedigree Adult
  Jan/2025 – Jun/2025: Whiskas (gato)
```

### 6.3 Componente NutritionLensContent

```typescript
// components/lenses/NutritionLensContent.tsx

export function NutritionLensContent({ petId }) {
  const { data } = useQuery({
    queryKey: ['nutrition', petId],
    queryFn: () => fetchNutritionData(petId),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <ScrollView>
      {/* Ração atual */}
      <CurrentFoodCard food={data?.currentFood} />

      {/* Suplementos ativos */}
      <SupplementsList supplements={data?.activeSupplements} />

      {/* Petiscos recentes */}
      <TreatsSummary treats={data?.recentTreats} />

      {/* Intolerâncias */}
      <IntolerancesList intolerances={data?.intolerances} />

      {/* Histórico de mudanças */}
      <FoodHistoryTimeline history={data?.foodHistory} />
    </ScrollView>
  );
}
```

### 6.4 Classificação de entradas como Nutrição

Exemplos de entradas que a IA classifica como `food`:

```
"Mudei a ração do Rex para Royal Canin"
  → primary_type: 'food'
  → extracted_data: { product_name: 'Royal Canin', record_type: 'food', is_current: true }

"Dei um petisco de frango pro Rex"
  → primary_type: 'food'
  → extracted_data: { record_type: 'treat', category: 'treat', notes: 'frango' }

"Rex está tomando ômega 3, 1 cápsula por dia"
  → primary_type: 'food'
  → extracted_data: { record_type: 'supplement', product_name: 'ômega 3', daily_portions: 1 }

Foto da embalagem de ração:
  → OCR extrai: marca, linha, peso, calorias
  → extracted_data: { product_name, brand, calories_kcal, portion_grams }
```

### 6.5 saveToModule() para nutrição

```typescript
// Dentro de classify-diary-entry/modules/save.ts

async function saveNutritionRecord(diaryEntryId, petId, userId, extracted) {
  const { data, error } = await supabase
    .from('nutrition_records')
    .insert({
      pet_id: petId,
      user_id: userId,
      diary_entry_id: diaryEntryId,
      record_type: extracted.record_type || 'food',
      product_name: extracted.product_name,
      brand: extracted.brand,
      category: extracted.category,
      portion_grams: extracted.portion_grams,
      daily_portions: extracted.daily_portions,
      calories_kcal: extracted.calories_kcal,
      is_current: extracted.is_current || false,
      notes: extracted.notes,
      started_at: extracted.started_at || new Date().toISOString().slice(0, 10),
      source: extracted.source || 'voice',
      extracted_data: extracted,
    })
    .select()
    .single();

  return data;
}
```

### 6.6 Checklist Sprint 3.4

```
[ ] CREATE TABLE nutrition_records + RLS + trigger set_current_food
[ ] Adicionar classificação 'food' no prompt da classify-diary-entry
[ ] saveToModule() para nutrition_records
[ ] Ativar lente Nutrição no LensGrid
[ ] Criar NutritionLensContent com 5 seções
[ ] Criar CurrentFoodCard (ração atual com destaque)
[ ] Criar SupplementsList (suplementos ativos)
[ ] Criar TreatsSummary (resumo de petiscos 30 dias)
[ ] Criar IntolerancesList (intolerâncias registradas)
[ ] Criar FoodHistoryTimeline (histórico de rações)
[ ] Hook useLens com lensType='nutrition'
[ ] Testar: voz "mudei a ração para Royal Canin" → salva como current
[ ] Testar: trigger troca is_current da ração anterior para FALSE
[ ] Testar: foto de embalagem → OCR extrai marca e calorias
[ ] Testar: "dei petisco de frango" → treat registrado
[ ] Testar: lente Nutrição exibe ração atual corretamente
[ ] Testar: intolerância registrada aparece na lista
```

---

## 7. SPRINT 3.5 — AMIGOS

### Objetivo: Criar tabela pet_connections e ativar lente Amigos com grafo social do pet.

### 7.1 CREATE TABLE pet_connections

```sql
CREATE TABLE IF NOT EXISTS pet_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    friend_name     VARCHAR(100) NOT NULL,   -- nome do pet amigo
    friend_species  VARCHAR(20)
                    CHECK (friend_species IN ('dog','cat','bird','rabbit','other','unknown')),
    friend_breed    VARCHAR(100),
    friend_owner    VARCHAR(100),            -- nome do dono (opcional)
    friend_pet_id   UUID REFERENCES pets(id),  -- se o amigo também está no app
    connection_type VARCHAR(20) DEFAULT 'friend'
                    CHECK (connection_type IN (
                      'friend','playmate','neighbor','relative',
                      'rival','caretaker_pet','unknown'
                    )),
    first_met_at    DATE,
    last_seen_at    DATE,
    meet_count      INTEGER DEFAULT 1,
    photo_url       TEXT,                    -- foto do encontro
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connections_pet ON pet_connections(pet_id);
CREATE INDEX idx_connections_name ON pet_connections(pet_id, friend_name);
CREATE INDEX idx_connections_last_seen ON pet_connections(pet_id, last_seen_at DESC);

ALTER TABLE pet_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY connections_own ON pet_connections
  FOR ALL USING (user_id = auth.uid());

-- Ao registrar novo encontro com amigo existente, incrementar meet_count
CREATE OR REPLACE FUNCTION update_friend_meet_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se já existe esse amigo para esse pet
  IF EXISTS (
    SELECT 1 FROM pet_connections
    WHERE pet_id = NEW.pet_id
      AND LOWER(friend_name) = LOWER(NEW.friend_name)
      AND is_active = TRUE
      AND id != NEW.id
  ) THEN
    -- Incrementa o contador e atualiza last_seen no registro existente
    UPDATE pet_connections
    SET meet_count = meet_count + 1,
        last_seen_at = COALESCE(NEW.first_met_at, CURRENT_DATE)
    WHERE pet_id = NEW.pet_id
      AND LOWER(friend_name) = LOWER(NEW.friend_name)
      AND is_active = TRUE;

    -- Não inserir registro duplicado — sinaliza para cancelar insert
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_friend_meet_count
  BEFORE INSERT ON pet_connections
  FOR EACH ROW EXECUTE FUNCTION update_friend_meet_count();
```

### 7.2 Lente Amigos

```
AMIGOS DO REX · 5 amigos

┌──────────────────────────────────┐
│ 🐕 Thor · Golden Retriever      │
│ Dono: Carlos · 8 encontros      │
│ Último: 28/03/2026              │
│ "Amigo do parque"               │
├──────────────────────────────────┤
│ 🐕 Luna · Poodle                │
│ Dono: Ana · 3 encontros         │
│ Último: 15/03/2026              │
│ "Vizinha do condomínio"         │
├──────────────────────────────────┤
│ 🐈 Mimi · Gato SRD              │
│ Dona: Clara · 2 encontros       │
│ Último: 02/03/2026              │
├──────────────────────────────────┤
│ 🐕 Bob · Labrador               │
│ 1 encontro · 22/02/2026         │
└──────────────────────────────────┘

[Ver no mapa] [Amigos do app]
```

### 7.3 Detecção automática de amigo em foto/vídeo/voz

A IA detecta menções a outros pets nas entradas do diário:

```
"Rex brincou com o Thor no parque hoje"
  → primary_type: 'moment'
  → classifications inclui: { type: 'connection', extracted_data: { friend_name: 'Thor', location: 'parque' } }

Foto de dois cachorros brincando:
  → Vision detecta múltiplos pets
  → Sugere: "Identificamos outro pet na foto. É um amigo do Rex?"
  → Tutor confirma nome → salva em pet_connections

"Nossos vizinhos trouxeram a Luna lá em casa"
  → extracted_data: { friend_name: 'Luna', connection_type: 'neighbor' }
```

### 7.4 saveToModule() para conexões

```typescript
async function savePetConnection(diaryEntryId, petId, userId, extracted) {
  const { data } = await supabase
    .from('pet_connections')
    .insert({
      pet_id: petId,
      user_id: userId,
      diary_entry_id: diaryEntryId,
      friend_name: extracted.friend_name,
      friend_species: extracted.friend_species || 'unknown',
      friend_breed: extracted.friend_breed,
      friend_owner: extracted.friend_owner,
      connection_type: extracted.connection_type || 'friend',
      first_met_at: extracted.date || new Date().toISOString().slice(0, 10),
      last_seen_at: extracted.date || new Date().toISOString().slice(0, 10),
      notes: extracted.notes,
    })
    .select()
    .single();
  // Trigger trata duplicatas automaticamente

  return data;
}
```

### 7.5 Componente FriendsLensContent

```typescript
// components/lenses/FriendsLensContent.tsx

export function FriendsLensContent({ petId }) {
  const { data } = useQuery({
    queryKey: ['friends', petId],
    queryFn: () => fetchFriends(petId),
    staleTime: 30 * 60 * 1000,
  });

  return (
    <View>
      {/* Contador de amigos */}
      <FriendsSummary count={data?.total} />

      {/* Lista de amigos ordenada por último encontro */}
      <FlatList
        data={data?.connections}
        renderItem={({ item }) => <FriendCard connection={item} />}
        keyExtractor={item => item.id}
      />
    </View>
  );
}
```

### 7.6 Checklist Sprint 3.5

```
[ ] CREATE TABLE pet_connections + RLS + trigger trg_friend_meet_count
[ ] Adicionar classificação 'connection' no prompt da classify-diary-entry
[ ] Detecção de nomes de pets em texto/voz
[ ] Detecção de múltiplos pets em fotos/vídeos
[ ] saveToModule() para pet_connections
[ ] Card de sugestão: "Salvar Thor como amigo do Rex?"
[ ] Ativar lente Amigos no LensGrid
[ ] Criar FriendsLensContent com lista ordenada
[ ] Criar FriendCard com foto, nome, dono, encontros e última data
[ ] Hook useLens com lensType='friends'
[ ] Testar: voz "Rex brincou com o Thor" → Thor salvo como amigo
[ ] Testar: segundo encontro com Thor → meet_count incrementado (trigger)
[ ] Testar: foto de dois pets → sugestão de registrar amigo
[ ] Testar: lente Amigos mostra lista com meet_count correto
[ ] Testar: amigos ordenados por last_seen_at DESC
```

---

## 8. CRITÉRIOS DE CONCLUSÃO DA FASE 3

```
✓ Documento funciona (upload PDF, extração em lote, importação de histórico)
✓ Vídeo funciona (gravação 60s, análise de locomoção, alertas de urgência)
✓ Ouvir funciona (gravação 30s, análise emocional, padrões ao longo do tempo)
✓ Lente Nutrição ativa com ração atual, suplementos, petiscos e intolerâncias
✓ Lente Amigos ativa com grafo social e contagem de encontros
✓ 3 tabelas novas: nutrition_records, pet_connections, pet_mood_logs
✓ 1 campo novo em diary_entries: parent_entry_id
✓ Todos os 8 elementos do InputSelector funcionais (zero "Em breve")
✓ Vídeos e áudios armazenados no Storage com players inline
✓ Histórico emocional acumulado em pet_mood_logs
✓ Tudo da Fase 1 e Fase 2 continua funcionando (regressão OK)
```

---

## 9. BANCO DE DADOS — RESUMO DA FASE 3

```sql
-- NOVAS TABELAS (3):
--   pet_mood_logs          → histórico emocional (Sprint 3.3)
--   nutrition_records      → alimentação e suplementos (Sprint 3.4)
--   pet_connections        → grafo social do pet (Sprint 3.5)

-- ALTERAÇÃO EM TABELA EXISTENTE (1):
--   diary_entries.parent_entry_id UUID  → referência à entrada pai (Sprint 3.1)

-- TRIGGERS NOVOS (2):
--   trg_set_current_food   → desativa ração anterior ao registrar nova
--   trg_friend_meet_count  → incrementa contador ao re-encontrar amigo

-- REGRAS INVARIÁVEIS (mesmas da Fase 2):
--   Toda tabela nova: RLS ativo + policy user_id = auth.uid()
--   Toda tabela nova: user_id UUID NOT NULL REFERENCES users(id)
--   Soft delete com is_active (nunca DELETE físico)
--   Narração SEMPRE em 3ª pessoa
--   Zero regressão na Fase 1 e Fase 2
```

---

## 10. ORDEM DE EXECUÇÃO RECOMENDADA

```
Sprint 3.1 primeiro — Documento (maior valor percebido pelo tutor, sem nova tabela)
Sprint 3.2 segundo  — Vídeo (diferencial de saúde, análise de locomoção)
Sprint 3.3 terceiro — Ouvir (completa os 8 elementos de entrada)
Sprint 3.4 quarto   — Nutrição (lente de alto uso diário)
Sprint 3.5 quinto   — Amigos (social graph, menor urgência)
```

---

## 11. O QUE VEM DEPOIS (preview Fases 4-5)

```
Fase 4 — PLANOS + GAMIFICAÇÃO:
  4.1 Planos pet (5 tipos: saúde, seguro, funerário, assistência, emergencial)
  4.2 Conquistas (badges, XP, marcos)
  4.3 Felicidade (lente de humor ao longo do tempo com gráfico)
  4.4 Viagens (lente com destinos pet-friendly)

Fase 5 — ALDEIA (rede solidária):
  5.1 Banco Aldeia (22 tabelas)
  5.2 Telas da Aldeia
  5.3 SOS, Eventos, Classificados
```
