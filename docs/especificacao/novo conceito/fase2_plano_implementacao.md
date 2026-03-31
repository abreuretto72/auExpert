# auExpert — Fase 2: Galeria + Scanner + Prontuário + Gastos
# Data: 30/03/2026
# Pré-requisito: Fase 1 concluída (diário-cêntrico com texto/voz/foto + classify-diary-entry)

---

## 1. VISÃO GERAL

A Fase 1 entregou o loop mínimo: texto/voz/foto → IA classifica → narração 3ª pessoa → timeline.
A Fase 2 ativa 2 elementos de entrada que estavam "Em breve" (Galeria e Scanner) e cria as 2 primeiras lentes funcionais (Prontuário e Gastos).

```
FASE 1 (concluída):                    FASE 2 (esta):
  ✓ Foto (câmera)                        Galeria (upload de mídia existente)
  ✓ Falar (voz do tutor)                 Scanner (OCR de documentos)
  ✓ Escrever (texto)                     Lente Prontuário completa
  ✓ classify-diary-entry                 Lente Gastos
  ✓ Narração 3ª pessoa                   Tabelas de saúde novas no banco
  ✓ Cards de sugestão                    Tabela expenses no banco
  ✓ Dashboard diário-cêntrico            Gráficos de métricas clínicas
  ✓ clinical_metrics (tabela)            Fluxo OCR end-to-end
```

---

## 2. OS 4 SPRINTS

```
Sprint 2.1 — GALERIA (upload de fotos/vídeos/áudios existentes)
Sprint 2.2 — SCANNER OCR (documentos com extração de dados)
Sprint 2.3 — PRONTUÁRIO (lente completa: vacinas + exames + consultas + métricas)
Sprint 2.4 — GASTOS (lente de controle financeiro)
```

---

## 3. SPRINT 2.1 — GALERIA

### Objetivo: Ativar o botão Galeria no InputSelector. Upload de mídia que já existe no celular.

### 3.1 Por que Galeria é prioridade #1

O tutor recebe fotos por WhatsApp o tempo todo:
- Vet manda foto do raio-X
- Amigo manda foto do pet brincando com o dele
- Tutor tirou foto ontem e esqueceu de registrar
- Pet shop manda foto do banho e tosa

Sem galeria, o tutor não consegue usar essas fotos. É a feature que mais destranca casos de uso reais.

### 3.2 O que implementar

```
CELULAR:
  1. Ativar botão "Galeria" no InputSelector (remover "Em breve")
  2. Abrir expo-image-picker com opções:
     ├── Fotos: seleção múltipla (até 5)
     ├── Vídeos: seleção única (até 60s)
     └── Filtro por tipo de mídia
  3. Permitir adicionar texto/voz JUNTO com a galeria
  4. Enviar para classify-diary-entry (mesmo fluxo da câmera)
  5. Mostrar resultado: cards de sugestão + narração
```

### 3.3 Lógica no celular

```typescript
// Dentro de InputSelector.tsx — ativar botão Galeria

import * as ImagePicker from 'expo-image-picker';

async function openGallery() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,  // foto + vídeo
    allowsMultipleSelection: true,                  // múltiplas fotos
    selectionLimit: 5,                              // max 5
    quality: 0.7,                                   // já comprime
    base64: true,                                   // para enviar à IA
  });

  if (!result.canceled) {
    const assets = result.assets;
    const isVideo = assets[0].type === 'video';

    // Determinar input_type
    const inputType = isVideo ? 'gallery_video' : 'gallery_photo';

    // Comprimir cada imagem (se foto)
    const compressed = await Promise.all(
      assets.map(a => compressImage(a.uri))
    );

    // Enviar para classify-diary-entry
    await submitEntry({
      inputType,
      photos: compressed.map(c => c.base64),
      text: additionalText || null,  // texto adicional se tutor escreveu
    });
  }
}
```

### 3.4 Mudança no classify-diary-entry

Nenhuma mudança estrutural. A Edge Function já aceita foto base64.
A única diferença é que `input_type` será `gallery_photo` ou `gallery_video` em vez de `photo`.
O prompt da IA não precisa mudar — ele já analisa qualquer imagem.

Para múltiplas fotos (até 5):
```typescript
// Enviar todas as fotos como array de images no prompt do Claude
const messages = [{
  role: 'user',
  content: [
    // Foto 1
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photos[0] } },
    // Foto 2 (se houver)
    ...(photos[1] ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photos[1] } }] : []),
    // ... até 5 fotos
    // Texto
    { type: 'text', text: userText || 'Analise estas imagens do pet.' }
  ]
}]
```

### 3.5 Tela de resultado (galeria)

Mesma tela de resultado da foto (ClassificationCard + NarrationBubble).
A única diferença visual: mostrar preview de TODAS as fotos selecionadas em carrossel.

```
┌─────────────────────────────────┐
│  ← Voltar     IA analisou       │
│                                  │
│  ┌───┐ ┌───┐ ┌───┐             │  ← Carrossel de previews
│  │ 1 │ │ 2 │ │ 3 │             │
│  └───┘ └───┘ └───┘             │
│                                  │
│  Narração IA (3ª pessoa)        │
│  Cards de classificação         │
│  [Salvar tudo] [Só diário]     │
└─────────────────────────────────┘
```

### 3.6 Checklist Sprint 2.1

```
[ ] Ativar botão Galeria no InputSelector (remover "Em breve")
[ ] Implementar expo-image-picker com seleção múltipla
[ ] Compressão de fotos antes de enviar
[ ] Enviar múltiplas fotos para classify-diary-entry
[ ] Mostrar carrossel de previews na tela de resultado
[ ] Salvar photo_urls com todas as URLs no diary_entries
[ ] input_type = 'gallery_photo' ou 'gallery_video'
[ ] Permitir adicionar texto junto (combo gallery_voice)
[ ] Testar: upload de 1 foto da galeria
[ ] Testar: upload de 5 fotos (máximo)
[ ] Testar: upload de 1 vídeo curto
[ ] Testar: galeria + texto adicional
[ ] Testar: foto de documento via galeria → OCR funciona
```

---

## 4. SPRINT 2.2 — SCANNER OCR

### Objetivo: Ativar o botão Scanner. Modo câmera otimizado para documentos com extração de dados.

### 4.1 Por que Scanner é prioridade #2

É o recurso mais "mágico" do conceito Diário-cêntrico:
- Foto de carteirinha → preenche vacina INTEIRA automaticamente
- Foto de nota fiscal → registra gasto com itens e valores
- Foto de receita → registra medicação com dose e frequência
- Foto de laudo → importa resultados de exame com métricas clínicas

Sem scanner, o tutor teria que digitar todos esses dados manualmente.

### 4.2 O que implementar

```
CELULAR:
  1. Ativar botão "Scanner" no InputSelector
  2. Abrir câmera em modo documento:
     ├── Guias visuais para enquadrar (4 cantos)
     ├── Contraste aumentado
     ├── Flash automático se ambiente escuro
     └── Preview antes de confirmar
  3. Enviar para classify-diary-entry com input_type='ocr_scan'
  4. Mostrar tela de resultado OCR com campos editáveis
  5. Tutor confirma ou corrige campos
  6. IA distribui para módulo correto

SERVIDOR (classify-diary-entry):
  1. Detectar que input_type='ocr_scan'
  2. Usar prompt OCR focado (extrai campos estruturados)
  3. Retornar ocr_data JSONB com campos + confiança
  4. Retornar classificação + módulo destino
```

### 4.3 Prompt OCR especializado

Dentro do classify-diary-entry, quando `input_type === 'ocr_scan'`, o prompt muda:

```typescript
// modules/classifier.ts — prompt especial para OCR

function buildOCRPrompt(pet) {
  return `
Você é o scanner inteligente do auExpert. Extraia TODOS os dados do documento fotografado.

Pet: ${pet.name}, ${pet.breed || 'SRD'}, ${pet.species === 'dog' ? 'cão' : 'gato'}

REGRA: Retorne APENAS JSON válido.

Identifique o tipo de documento e extraia os campos relevantes:

CARTEIRINHA DE VACINA:
  → vaccine_name, laboratory, batch, dose, date, next_due, vet_name, clinic
  → classifications: [{ type: "vaccine", confidence, extracted_data: {campos acima} }]

RECEITA VETERINÁRIA:
  → medication_name, dosage, frequency, duration, vet_name, date
  → classifications: [{ type: "medication", confidence, extracted_data: {campos} }]

LAUDO DE EXAME:
  → exam_name, date, lab_name, results: [{item, value, unit, reference_min, reference_max, status}]
  → classifications: [{ type: "exam", confidence, extracted_data: {campos} }]
  → clinical_metrics: [{type, value, unit, reference_min, reference_max, status}]

NOTA FISCAL / CUPOM / RECIBO:
  → merchant_name, merchant_type, date, total, items: [{name, qty, unit_price}], cnpj
  → classifications: [{ type: "expense", confidence, extracted_data: {campos} }]

APÓLICE DE SEGURO / PLANO:
  → provider, plan_name, type (health/insurance/funeral/assistance/emergency),
    monthly_cost, coverage_limit, start_date, end_date
  → classifications: [{ type: "plan", confidence, extracted_data: {campos} }]

BULA DE MEDICAMENTO:
  → active_ingredient, dosage_info, contraindications
  → classifications: [{ type: "medication", confidence, extracted_data: {campos} }]

ATESTADO / RELATÓRIO VETERINÁRIO:
  → date, vet_name, clinic, diagnosis, prescriptions, follow_up
  → classifications: [{ type: "consultation", confidence, extracted_data: {campos} }]

Para CADA campo extraído, inclua confiança (0.0-1.0).

Retorne:
{
  "document_type": "vaccine_card|prescription|exam_result|invoice|receipt|insurance|vet_report|medication_box|other",
  "classifications": [{ "type": "...", "confidence": 0.0-1.0, "extracted_data": {} }],
  "ocr_data": {
    "fields": [{ "key": "Nome", "value": "V10", "confidence": 0.95 }],
    "items": [{ "name": "...", "qty": 1, "unit_price": 0.00 }]
  },
  "narration": "Hoje o ${pet.name}... (3ª pessoa, factual, dados extraídos)",
  "mood": "calm",
  "mood_confidence": 0.5,
  "urgency": "none",
  "clinical_metrics": [],
  "suggestions": ["sugestão para o tutor"]
}
`
}
```

### 4.4 Tela de resultado OCR

Tela dedicada (diferente da tela de foto comum). Referência: `diary_ocr_result.jsx`.

```
┌─────────────────────────────────┐
│  ← Voltar     Scanner OCR       │
│                                  │
│  ┌───────────────────────────┐  │
│  │ [Preview do documento]     │  │  ← Foto com cantos verdes
│  │ ✓ Leitura OK              │  │
│  └───────────────────────────┘  │
│                                  │
│  DADOS EXTRAÍDOS                │
│  ┌─────────────────────────┐   │
│  │ Estabelecimento          │   │
│  │ Clínica VetBem    94%  ✏│   │  ← Editável
│  ├─────────────────────────┤   │
│  │ Valor Total              │   │
│  │ R$ 280,00         96%  ✏│   │  ← Editável
│  ├─────────────────────────┤   │
│  │ Data                     │   │
│  │ 27/03/2026        98%   │   │
│  └─────────────────────────┘   │
│                                  │
│  ITENS DA NOTA                  │
│  ┌─────────────────────────┐   │
│  │ Consulta vet    R$150   │   │
│  │ Vacina V10      R$130   │   │
│  │ Total:          R$280   │   │
│  └─────────────────────────┘   │
│                                  │
│  VÍNCULOS AUTOMÁTICOS           │
│  ✓ Vincular à consulta do Rex  │
│  ✓ Vincular à vacina V10       │
│                                  │
│  [Registrar gasto R$280]       │
│  [Só salvar no diário]          │
└─────────────────────────────────┘
```

### 4.5 Componente OCRResultScreen

```typescript
// components/diary/OCRResultScreen.tsx

export function OCRResultScreen({ result, onConfirm, onDismiss }) {
  const [editedFields, setEditedFields] = useState(result.ocr_data.fields);

  const editField = (index, newValue) => {
    const updated = [...editedFields];
    updated[index] = { ...updated[index], value: newValue };
    setEditedFields(updated);
  };

  return (
    <ScrollView>
      {/* Preview do documento com cantos */}
      <DocumentPreview photoUrl={result.photoUrl} status="ok" />

      {/* Campos extraídos — editáveis */}
      <SectionTitle>Dados extraídos</SectionTitle>
      {editedFields.map((field, i) => (
        <OCRField
          key={i}
          label={field.key}
          value={field.value}
          confidence={field.confidence}
          editable={field.editable !== false}
          onEdit={(val) => editField(i, val)}
        />
      ))}

      {/* Tabela de itens (se nota fiscal) */}
      {result.ocr_data.items?.length > 0 && (
        <>
          <SectionTitle>Itens</SectionTitle>
          <ItemsTable items={result.ocr_data.items} />
        </>
      )}

      {/* Vínculos automáticos */}
      {result.suggestions?.length > 0 && (
        <>
          <SectionTitle>Vínculos automáticos</SectionTitle>
          {result.suggestions.map((s, i) => (
            <SuggestionLink key={i} text={s} />
          ))}
        </>
      )}

      {/* Ações */}
      <ConfirmButton
        label={`Registrar ${result.classifications[0]?.type === 'expense' ? `gasto` : `no Prontuário`}`}
        onPress={() => onConfirm(editedFields)}
      />
      <DismissButton label="Só salvar no diário" onPress={onDismiss} />
    </ScrollView>
  );
}
```

### 4.6 Modo documento na câmera

```typescript
// Usar expo-camera com overlay de guias

import { Camera } from 'expo-camera';

function DocumentScanner({ onCapture }) {
  return (
    <View style={{ flex: 1 }}>
      <Camera style={{ flex: 1 }} type="back" flashMode="auto">
        {/* Overlay com 4 cantos guia */}
        <View style={styles.overlay}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
          <Text style={styles.hint}>Enquadre o documento</Text>
        </View>
      </Camera>
      <CaptureButton onPress={onCapture} />
    </View>
  );
}
```

### 4.7 Checklist Sprint 2.2

```
[ ] Ativar botão Scanner no InputSelector
[ ] Implementar modo câmera com guias de enquadramento
[ ] Flash automático em ambiente escuro
[ ] Preview antes de confirmar captura
[ ] Prompt OCR especializado no classify-diary-entry
[ ] Tela OCRResultScreen com campos editáveis
[ ] Campos editáveis (tutor pode corrigir)
[ ] Tabela de itens (se nota fiscal)
[ ] Vínculos automáticos (se IA detectou relação)
[ ] Salvar ocr_data JSONB no diary_entries
[ ] Salvar document_type no diary_entries
[ ] input_type = 'ocr_scan'
[ ] Testar: scanner de carteirinha de vacina
[ ] Testar: scanner de nota fiscal
[ ] Testar: scanner de receita veterinária
[ ] Testar: scanner de laudo de exame
[ ] Testar: edição de campo extraído (corrigir valor)
[ ] Testar: ambiente escuro (flash automático)
```

---

## 5. SPRINT 2.3 — PRONTUÁRIO (lente completa)

### Objetivo: Criar as tabelas de saúde faltantes + lente Prontuário funcional + gráficos de métricas.

### 5.1 Análise do gap no banco

```
JÁ EXISTE no Supabase:           PRECISA CRIAR:
  ✓ vaccines                       consultations
  ✓ allergies                      medications
  ✓ clinical_metrics (Fase 1)      exams
                                   surgeries
```

### 5.2 CREATE TABLE — Tabelas de saúde faltantes

```sql
-- ============================================================
-- SPRINT 2.3 — Tabelas de saúde
-- ============================================================

-- 1. consultations
CREATE TABLE IF NOT EXISTS consultations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    date            DATE NOT NULL,
    time            TIME,
    type            VARCHAR(30) DEFAULT 'routine'
                    CHECK (type IN ('routine','emergency','specialist','surgery','follow_up','telemedicine')),
    vet_name        VARCHAR(100),
    clinic_name     VARCHAR(100),
    summary         TEXT NOT NULL,
    diagnosis       TEXT,
    prescriptions   TEXT,
    follow_up_at    DATE,
    cost            DECIMAL(10,2),
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    photo_url       TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultations_pet ON consultations(pet_id);
CREATE INDEX idx_consultations_date ON consultations(date);
CREATE INDEX idx_consultations_followup ON consultations(follow_up_at) WHERE follow_up_at IS NOT NULL;

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY consultations_own ON consultations FOR ALL USING (user_id = auth.uid());

-- 2. medications
CREATE TABLE IF NOT EXISTS medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(30) DEFAULT 'other'
                    CHECK (type IN ('antiparasitic','supplement','antibiotic','anti_inflammatory',
                                   'analgesic','antifungal','vermifuge','cardiac','hormonal','other')),
    dosage          VARCHAR(50),
    frequency       VARCHAR(50),
    start_date      DATE NOT NULL,
    end_date        DATE,
    active          BOOLEAN DEFAULT TRUE,
    reason          TEXT,
    prescribed_by   VARCHAR(100),
    notes           TEXT,
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_medications_pet ON medications(pet_id);
CREATE INDEX idx_medications_active ON medications(active) WHERE active = TRUE;

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY medications_own ON medications FOR ALL USING (user_id = auth.uid());

-- 3. exams
CREATE TABLE IF NOT EXISTS exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    name            VARCHAR(100) NOT NULL,
    date            DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'normal'
                    CHECK (status IN ('normal','attention','abnormal','critical','pending')),
    results         JSONB DEFAULT '[]',
    lab_name        VARCHAR(100),
    vet_name        VARCHAR(100),
    follow_up_at    DATE,
    notes           TEXT,
    photo_url       TEXT,
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_pet ON exams(pet_id);
CREATE INDEX idx_exams_date ON exams(date);
CREATE INDEX idx_exams_status ON exams(status) WHERE status != 'normal';

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY exams_own ON exams FOR ALL USING (user_id = auth.uid());

-- 4. surgeries
CREATE TABLE IF NOT EXISTS surgeries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    name            VARCHAR(100) NOT NULL,
    date            DATE NOT NULL,
    vet_name        VARCHAR(100),
    clinic_name     VARCHAR(100),
    anesthesia      VARCHAR(100),
    notes           TEXT,
    recovery_days   INTEGER,
    status          VARCHAR(20) DEFAULT 'recovered'
                    CHECK (status IN ('scheduled','recovering','recovered','complications')),
    cost            DECIMAL(10,2),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_surgeries_pet ON surgeries(pet_id);

ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
CREATE POLICY surgeries_own ON surgeries FOR ALL USING (user_id = auth.uid());

-- 5. FKs tardias no diary_entries (agora que as tabelas existem)
ALTER TABLE diary_entries ADD CONSTRAINT IF NOT EXISTS fk_diary_consultation
  FOREIGN KEY (linked_consultation_id) REFERENCES consultations(id);
ALTER TABLE diary_entries ADD CONSTRAINT IF NOT EXISTS fk_diary_medication
  FOREIGN KEY (linked_medication_id) REFERENCES medications(id);
ALTER TABLE diary_entries ADD CONSTRAINT IF NOT EXISTS fk_diary_exam
  FOREIGN KEY (linked_exam_id) REFERENCES exams(id);
ALTER TABLE diary_entries ADD CONSTRAINT IF NOT EXISTS fk_diary_surgery
  FOREIGN KEY (linked_surgery_id) REFERENCES surgeries(id);
```

### 5.3 Fluxo: "Registrar no Prontuário"

Quando a IA classifica como saúde e o tutor confirma:

```
IA classificou: vaccine (95%)
  extracted_data: { name: "V10", lab: "Vanguard", date: "27/03/2026", vet: "Dra. Carla" }

Tutor toca [Registrar no Prontuário]:
  1. Insere na tabela vaccines com dados pré-preenchidos
  2. Atualiza diary_entries.linked_vaccine_id com o ID da vacina
  3. Se IA extraiu peso → insere em clinical_metrics
  4. Se IA extraiu métricas de exame → insere em clinical_metrics
  5. Trigger atualiza health_score do pet
  6. Se next_due_at detectado → agenda notificação push
```

### 5.4 Lente Prontuário (tela)

```
PRONTUÁRIO DO REX

┌──────────────────────────────────┐
│ Saúde: 92/100  ·  32kg  ·  3a   │
│ [Vacinas][Exames][Consultas]     │  ← Tabs
│ [Medicações][Cirurgias][Alergias]│
│ [Métricas]                       │
└──────────────────────────────────┘

Tab: Vacinas
  ┌────────────────────────────────┐
  │ ✅ V10 · 27/03/2026            │
  │    Dra. Carla · Próx: 03/2027 │
  ├────────────────────────────────┤
  │ ✅ Raiva · 15/01/2026          │
  │    Dra. Carla · Próx: 01/2027 │
  ├────────────────────────────────┤
  │ ⚠️ Gripe · VENCIDA             │
  │    Venceu em 10/02/2026       │
  │    [Agendar]                   │
  └────────────────────────────────┘

Tab: Métricas (gráficos de clinical_metrics)
  ┌────────────────────────────────┐
  │ Peso · Últimos 12 meses       │
  │ 32kg ───────────●              │
  │ 30kg ──●────────               │
  │        Jul  Out  Jan  Mar      │
  ├────────────────────────────────┤
  │ Health Score · 6 meses         │
  │ 92 ─────────────●              │
  │ 85 ●                           │
  └────────────────────────────────┘
```

### 5.5 Componente LensHealth (renderer da lente Prontuário)

```typescript
// components/lenses/HealthLensContent.tsx

export function HealthLensContent({ petId }) {
  const [tab, setTab] = useState('vaccines');

  return (
    <View>
      {/* Health score + peso + idade */}
      <HealthHeader petId={petId} />

      {/* Tabs */}
      <TabBar
        tabs={['vaccines','exams','consultations','medications','surgeries','allergies','metrics']}
        active={tab}
        onSelect={setTab}
      />

      {/* Conteúdo por tab */}
      {tab === 'vaccines' && <VaccineList petId={petId} />}
      {tab === 'exams' && <ExamList petId={petId} />}
      {tab === 'consultations' && <ConsultationList petId={petId} />}
      {tab === 'medications' && <MedicationList petId={petId} />}
      {tab === 'surgeries' && <SurgeryList petId={petId} />}
      {tab === 'allergies' && <AllergyList petId={petId} />}
      {tab === 'metrics' && <MetricsCharts petId={petId} />}
    </View>
  );
}
```

### 5.6 Gráficos de Métricas Clínicas

```typescript
// components/lenses/MetricsCharts.tsx

import { LineChart } from 'react-native-chart-kit';

export function MetricsCharts({ petId }) {
  const { data: metrics } = useQuery({
    queryKey: ['metrics', petId],
    queryFn: () => supabase
      .from('clinical_metrics')
      .select('*')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('measured_at', { ascending: true }),
    staleTime: 60 * 60 * 1000, // 1 hora
  });

  // Agrupar por metric_type
  const grouped = groupBy(metrics, 'metric_type');

  // Mostrar gráficos para cada tipo que tem dados
  return (
    <ScrollView>
      {grouped.weight && (
        <MetricChart
          title="Peso"
          data={grouped.weight}
          unit="kg"
          color={colors.petrol}
        />
      )}
      {grouped.health_score && (
        <MetricChart
          title="Score de Saúde"
          data={grouped.health_score}
          unit=""
          color={colors.success}
        />
      )}
      {/* ... demais métricas que tiverem dados */}
    </ScrollView>
  );
}
```

### 5.7 Hook useLens (genérico)

```typescript
// hooks/useLens.ts — busca dados de qualquer lente

export function useLens(petId: string, lensType: string) {
  return useQuery({
    queryKey: ['lens', lensType, petId],
    queryFn: () => fetchLensData(petId, lensType),
    staleTime: lensStaleTime[lensType] || 15 * 60 * 1000,
  });
}

const lensStaleTime = {
  health: 60 * 60 * 1000,   // 1 hora
  expenses: 15 * 60 * 1000, // 15 min
  metrics: 60 * 60 * 1000,  // 1 hora
};

async function fetchLensData(petId: string, type: string) {
  switch (type) {
    case 'health':
      const [vaccines, allergies, consultations, medications, exams, surgeries] = await Promise.all([
        supabase.from('vaccines').select('*').eq('pet_id', petId).eq('is_active', true).order('date_administered', { ascending: false }),
        supabase.from('allergies').select('*').eq('pet_id', petId).eq('is_active', true),
        supabase.from('consultations').select('*').eq('pet_id', petId).eq('is_active', true).order('date', { ascending: false }),
        supabase.from('medications').select('*').eq('pet_id', petId).eq('is_active', true),
        supabase.from('exams').select('*').eq('pet_id', petId).eq('is_active', true).order('date', { ascending: false }),
        supabase.from('surgeries').select('*').eq('pet_id', petId).eq('is_active', true),
      ]);
      return { vaccines, allergies, consultations, medications, exams, surgeries };

    case 'expenses':
      return await fetchExpenses(petId);

    default:
      return {};
  }
}
```

### 5.8 Ativar "Registrar no Prontuário" nos cards de sugestão

Na Fase 1, os ClassificationCards tinham o botão, mas só salvava no diário.
Agora o botão realmente insere na tabela correta:

```typescript
// Dentro de confirmClassification (useDiaryEntry.ts)

async function saveToModule(diaryEntryId, classification) {
  const { type, extracted_data } = classification;

  switch (type) {
    case 'vaccine':
      const { data: vaccine } = await supabase.from('vaccines').insert({
        pet_id: petId,
        user_id: userId,
        diary_entry_id: diaryEntryId,
        name: extracted_data.vaccine_name,
        lab: extracted_data.laboratory,
        batch: extracted_data.batch,
        date_administered: extracted_data.date,
        next_due_date: extracted_data.next_due,
        vet_name: extracted_data.vet_name,
        clinic: extracted_data.clinic,
        source: 'ai',
      }).select().single();

      // Atualizar linked_vaccine_id no diary_entries
      await supabase.from('diary_entries')
        .update({ linked_vaccine_id: vaccine.id })
        .eq('id', diaryEntryId);
      break;

    case 'weight':
      const { data: metric } = await supabase.from('clinical_metrics').insert({
        pet_id: petId,
        user_id: userId,
        diary_entry_id: diaryEntryId,
        metric_type: 'weight',
        value: extracted_data.value,
        unit: 'kg',
        source: 'ai',
        measured_at: new Date().toISOString(),
      }).select().single();

      await supabase.from('diary_entries')
        .update({ linked_weight_metric_id: metric.id })
        .eq('id', diaryEntryId);
      break;

    case 'consultation':
      // ... mesma lógica para consultas
      break;

    case 'medication':
      // ... mesma lógica para medicações
      break;

    case 'exam':
      // ... mesma lógica para exames
      // + extrair métricas clínicas dos resultados
      break;
  }
}
```

### 5.9 Checklist Sprint 2.3

```
[ ] CREATE TABLE consultations + RLS
[ ] CREATE TABLE medications + RLS
[ ] CREATE TABLE exams + RLS
[ ] CREATE TABLE surgeries + RLS
[ ] ALTER TABLE diary_entries ADD FKs tardias (4 constraints)
[ ] Ativar lente Prontuário no LensGrid (remover placeholder)
[ ] Criar HealthLensContent com 7 tabs
[ ] Criar VaccineList (usando dados existentes)
[ ] Criar ExamList, ConsultationList, MedicationList, SurgeryList
[ ] Criar AllergyList (usando dados existentes)
[ ] Criar MetricsCharts com gráficos de peso + health_score
[ ] Implementar saveToModule() para vaccine, weight, consultation, medication, exam
[ ] Atualizar linked_*_id no diary_entries após salvar
[ ] Hook useLens genérico
[ ] Testar: lente Prontuário abre com vacinas existentes
[ ] Testar: voz "Rex tomou V10" → card → confirma → vacina salva → aparece na lente
[ ] Testar: scanner de laudo → exame salvo → métricas extraídas → gráfico atualizado
[ ] Testar: gráfico de peso com dados de clinical_metrics
```

---

## 6. SPRINT 2.4 — GASTOS

### Objetivo: Tabela expenses + lente Gastos funcional + vínculo com notas fiscais via OCR.

### 6.1 CREATE TABLE expenses

```sql
CREATE TABLE IF NOT EXISTS expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    diary_entry_id  UUID REFERENCES diary_entries(id),
    amount          DECIMAL(10,2) NOT NULL,
    category        VARCHAR(30) NOT NULL
                    CHECK (category IN (
                      'health','food','hygiene','accessories','services',
                      'insurance','travel','training','housing','other'
                    )),
    subcategory     VARCHAR(50),
    description     TEXT,
    merchant_name   VARCHAR(100),
    merchant_type   VARCHAR(30),
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    photo_url       TEXT,
    source          VARCHAR(20) DEFAULT 'ocr'
                    CHECK (source IN ('ocr','voice','manual')),
    ocr_confidence  REAL,
    items           JSONB DEFAULT '[]',
    linked_vaccine_id       UUID REFERENCES vaccines(id),
    linked_consultation_id  UUID REFERENCES consultations(id),
    linked_medication_id    UUID REFERENCES medications(id),
    linked_surgery_id       UUID REFERENCES surgeries(id),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_pet ON expenses(pet_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY expenses_own ON expenses FOR ALL USING (user_id = auth.uid());

-- FK tardia no diary_entries
ALTER TABLE diary_entries ADD CONSTRAINT IF NOT EXISTS fk_diary_expense
  FOREIGN KEY (linked_expense_id) REFERENCES expenses(id);

-- View materializada de gastos
CREATE MATERIALIZED VIEW IF NOT EXISTS pet_expense_summary AS
SELECT
  e.pet_id,
  date_trunc('month', e.date::timestamp) AS month,
  e.category,
  COUNT(*) AS count,
  SUM(e.amount) AS total
FROM expenses e
WHERE e.is_active = TRUE
GROUP BY e.pet_id, date_trunc('month', e.date::timestamp), e.category;

CREATE UNIQUE INDEX idx_expense_summary ON pet_expense_summary(pet_id, month, category);
```

### 6.2 Lente Gastos

```
GASTOS DO REX · Março/2026

┌──────────────────────────────────┐
│ Total do mês: R$ 910,00         │
│ ████████████████████░░░░░ Saúde  │  R$ 560
│ ██████░░░░░░░░░░░░░░░░░░ Alimen │  R$ 210
│ ████░░░░░░░░░░░░░░░░░░░░ Higien │  R$ 140
└──────────────────────────────────┘

Últimos gastos:
┌────────────────────────────────┐
│ 27/03 · Clínica VetBem        │
│ R$ 280,00 · Saúde             │
│ Consulta + Vacina V10         │
│ 📷 Via scanner OCR             │
├────────────────────────────────┤
│ 25/03 · PetShop ZooMais       │
│ R$ 210,00 · Alimentação       │
│ Ração Royal Canin 15kg        │
├────────────────────────────────┤
│ 20/03 · Pet & Banho           │
│ R$ 85,00 · Higiene            │
│ Banho e tosa                  │
└────────────────────────────────┘

[◀ Fev/2026] [Mar/2026] [Abr ▶]
```

### 6.3 Componente ExpensesLensContent

```typescript
// components/lenses/ExpensesLensContent.tsx

export function ExpensesLensContent({ petId }) {
  const [month, setMonth] = useState(new Date());
  const { data } = useQuery({
    queryKey: ['expenses', petId, month.toISOString().slice(0, 7)],
    queryFn: () => fetchMonthExpenses(petId, month),
    staleTime: 15 * 60 * 1000,
  });

  return (
    <View>
      {/* Resumo do mês com barras de categoria */}
      <MonthSummary total={data?.total} byCategory={data?.byCategory} />

      {/* Navegação entre meses */}
      <MonthNavigator month={month} onChange={setMonth} />

      {/* Lista de gastos */}
      <FlatList
        data={data?.expenses}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        keyExtractor={item => item.id}
      />
    </View>
  );
}
```

### 6.4 Fluxo: Scanner → Gasto

```
Tutor toca Scanner → fotografa nota fiscal
  → classify-diary-entry com input_type='ocr_scan'
  → IA retorna: type='expense', extracted_data: {amount, items, merchant}
  → Tela OCRResultScreen com campos editáveis
  → Tutor confirma [Registrar gasto R$280]
  → saveToModule insere em expenses:
    {amount: 280, category: 'health', merchant_name: 'VetBem', items: [...]}
  → Atualiza diary_entries.linked_expense_id
  → Se IA detectou consulta/vacina na mesma nota → vincula
  → Lente Gastos atualizada automaticamente
```

### 6.5 IA sugere categoria automaticamente

```
Nota de vet/clínica/laboratório   → category: 'health'
Nota de pet shop com ração         → category: 'food'
Nota de banho e tosa / estética   → category: 'hygiene'
Nota de acessórios / brinquedos   → category: 'accessories'
Nota de hotel pet / creche         → category: 'services'
Nota de seguro / plano pet         → category: 'insurance'
Nota de passagem / hotel viagem   → category: 'travel'
Nota de adestramento / escola     → category: 'training'
```

### 6.6 Checklist Sprint 2.4

```
[ ] CREATE TABLE expenses + RLS
[ ] CREATE MATERIALIZED VIEW pet_expense_summary
[ ] ALTER TABLE diary_entries ADD FK linked_expense_id
[ ] Ativar lente Gastos no LensGrid
[ ] Criar ExpensesLensContent com resumo mensal + barras de categoria
[ ] Criar ExpenseCard com design do item
[ ] Criar MonthSummary com gráfico de barras por categoria
[ ] Criar MonthNavigator (anterior/próximo mês)
[ ] Implementar saveToModule() para expense
[ ] IA sugere categoria automaticamente
[ ] Vincular gasto com consulta/vacina quando detectado na mesma nota
[ ] Testar: scanner de nota fiscal → gasto registrado
[ ] Testar: voz "gastei 85 no banho e tosa" → gasto registrado
[ ] Testar: lente Gastos mostra resumo mensal correto
[ ] Testar: navegação entre meses
[ ] Testar: vínculos automáticos (gasto + consulta + vacina)
```

---

## 7. CRITÉRIOS DE CONCLUSÃO DA FASE 2

```
✓ Galeria funciona (upload 1-5 fotos, vídeo)
✓ Scanner funciona (OCR de documentos com campos editáveis)
✓ Lente Prontuário aberta com 7 tabs (vacinas, exames, consultas, etc.)
✓ Gráficos de métricas (peso, health score) renderizando
✓ "Registrar no Prontuário" salva na tabela correta
✓ Lente Gastos aberta com resumo mensal + barras de categoria
✓ Scanner de nota fiscal → gasto registrado
✓ Voz "gastei X" → gasto registrado
✓ Vínculos automáticos entre gasto e consulta/vacina
✓ 4 tabelas novas criadas (consultations, medications, exams, surgeries)
✓ expenses criada com view materializada
✓ Tudo da Fase 1 continua funcionando (regressão OK)
```

---

## 8. O QUE VEM DEPOIS (preview Fases 3-4)

```
Fase 3 — EXPERIÊNCIA EXPANDIDA:
  3.1 Documento (upload PDF — importação de prontuário antigo)
  3.2 Vídeo (gravação + análise de locomoção IA)
  3.3 Ouvir (som do pet — latido/miado com análise emocional)
  3.4 Nutrição (lente com ração, dieta, suplementos)
  3.5 Amigos (grafo social do pet + detecção em fotos)

Fase 4 — PLANOS + GAMIFICAÇÃO:
  4.1 Planos pet (5 tipos: saúde, seguro, funerário, assistência, emergencial)
  4.2 Conquistas (badges, XP, marcos)
  4.3 Felicidade (lente de humor ao longo do tempo)
  4.4 Viagens (lente com destinos pet-friendly)

Fase 5 — ALDEIA (rede solidária):
  5.1 Banco Aldeia (22 tabelas)
  5.2 Telas da Aldeia
  5.3 SOS, Eventos, Classificados
```
