# Prontuário de Saúde do Pet — Consolidação Completa

> Tudo que foi definido sobre saúde do pet no auExpert, reunido em um único documento.
> Fontes: CLAUDE.md v7, diary_spec_completa.md, prontuario_saude_pet.jsx, Hub v6, Dashboard do Pet, conversas de sessão.

---

## 1. DECISÃO ARQUITETURAL

**Diário e Prontuário são módulos 100% separados.**

| Módulo | Propósito | Tom | Voz |
|--------|-----------|-----|-----|
| **Diário** | Vida emocional do pet | Narrativo, afetivo | "Hoje corri no parque..." |
| **Prontuário** | Saúde clínica do pet | Objetivo, estruturado | "V10 aplicada 27/03, lote XY123" |

**A ponte:** quando algo de saúde é registrado no Prontuário, o sistema cria automaticamente uma diary_entry tipo "manual" com narração IA EMOCIONAL na voz do pet. O dado clínico fica no Prontuário, a experiência emocional fica no Diário.

---

## 2. BANCO DE DADOS — TABELAS DE SAÚDE

### 2.1 vaccines (MVP — já definida no CLAUDE.md seção 7)

```sql
CREATE TABLE vaccines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- Ex: "V10 (Polivalente)"
    lab             VARCHAR(100),                -- Ex: "Vanguard Plus"
    batch           VARCHAR(50),                 -- Ex: "A2847N"
    dose            VARCHAR(50),                 -- Ex: "3ª dose", "Reforço anual"
    vet_name        VARCHAR(100),                -- Ex: "Dra. Carla Mendes"
    clinic_name     VARCHAR(100),                -- Ex: "Clínica VetBem"
    applied_at      DATE NOT NULL,               -- Data da aplicação
    next_due_at     DATE,                        -- Próxima dose
    status          VARCHAR(20) DEFAULT 'ok'
                    CHECK (status IN ('ok','overdue','scheduled','skipped')),
    notes           TEXT,
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    ocr_confidence  REAL,                        -- % confiança se via OCR
    photo_url       TEXT,                        -- Foto da carteirinha
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_vaccines_pet ON vaccines(pet_id);
CREATE INDEX idx_vaccines_next ON vaccines(next_due_at);
```

### 2.2 allergies (MVP — já definida no CLAUDE.md seção 7)

```sql
CREATE TABLE allergies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- Ex: "Frango", "Picada de inseto"
    severity        VARCHAR(20) DEFAULT 'low'
                    CHECK (severity IN ('low','medium','high','critical')),
    reaction        TEXT,                        -- Ex: "Edema facial", "Coceira leve"
    confirmed       BOOLEAN DEFAULT FALSE,       -- true = confirmada, false = suspeita
    detected_by     VARCHAR(20) DEFAULT 'tutor'
                    CHECK (detected_by IN ('tutor','vet','ai')),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_allergies_pet ON allergies(pet_id);
```

### 2.3 consultations (pós-MVP)

```sql
CREATE TABLE consultations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    time            TIME,
    type            VARCHAR(30) DEFAULT 'routine'
                    CHECK (type IN ('routine','emergency','specialist','surgery','follow_up')),
    vet_name        VARCHAR(100),
    clinic_name     VARCHAR(100),
    summary         TEXT NOT NULL,               -- Resumo da consulta
    diagnosis       TEXT,                        -- Diagnóstico
    prescriptions   TEXT,                        -- Prescrições
    follow_up_at    DATE,                        -- Data de retorno
    cost            DECIMAL(10,2),               -- Custo (opcional)
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    photo_url       TEXT,                        -- Foto da receita/laudo
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_consultations_pet ON consultations(pet_id);
CREATE INDEX idx_consultations_date ON consultations(date);
```

### 2.4 medications (pós-MVP)

```sql
CREATE TABLE medications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- Ex: "Simparic 40mg"
    type            VARCHAR(30) DEFAULT 'other'
                    CHECK (type IN ('antiparasitic','supplement','antibiotic','anti_inflammatory','analgesic','antifungal','vermifuge','other')),
    dosage          VARCHAR(50),                 -- Ex: "1000mg"
    frequency       VARCHAR(50),                 -- Ex: "Diário", "Mensal", "2x/dia por 7 dias"
    start_date      DATE NOT NULL,
    end_date        DATE,                        -- NULL = contínuo
    active          BOOLEAN DEFAULT TRUE,
    reason          TEXT,                        -- Ex: "Ressecamento do pelo na região lombar"
    prescribed_by   VARCHAR(100),                -- Ex: "Dra. Carla Mendes"
    notes           TEXT,
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_medications_pet ON medications(pet_id);
CREATE INDEX idx_medications_active ON medications(active) WHERE active = TRUE;
```

### 2.5 exams (pós-MVP)

```sql
CREATE TABLE exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- Ex: "Hemograma Completo"
    date            DATE NOT NULL,
    status          VARCHAR(20) DEFAULT 'normal'
                    CHECK (status IN ('normal','attention','abnormal','critical','pending')),
    results         JSONB DEFAULT '[]',          -- Array de { item, value, reference, ok }
    lab_name        VARCHAR(100),
    vet_name        VARCHAR(100),
    notes           TEXT,
    photo_url       TEXT,                        -- Foto do laudo
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','ocr','voice','ai')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_exams_pet ON exams(pet_id);
CREATE INDEX idx_exams_date ON exams(date);
```

### 2.6 weight_logs (pós-MVP)

```sql
CREATE TABLE weight_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    weight_kg       DECIMAL(5,2) NOT NULL,
    measured_at     DATE NOT NULL DEFAULT CURRENT_DATE,
    source          VARCHAR(20) DEFAULT 'manual'
                    CHECK (source IN ('manual','vet','ai_estimate')),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weight_logs_pet ON weight_logs(pet_id);
CREATE INDEX idx_weight_logs_date ON weight_logs(measured_at);
```

### 2.7 surgeries (pós-MVP)

```sql
CREATE TABLE surgeries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,       -- Ex: "Castração (Orquiectomia)"
    date            DATE NOT NULL,
    vet_name        VARCHAR(100),
    clinic_name     VARCHAR(100),
    anesthesia      VARCHAR(100),                -- Ex: "Isoflurano + Propofol"
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'recovered'
                    CHECK (status IN ('scheduled','recovering','recovered','complications')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_surgeries_pet ON surgeries(pet_id);
```

### 2.8 Campos na tabela pets (relacionados a saúde)

```sql
-- Já existentes no CLAUDE.md
ALTER TABLE pets ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 50;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS current_weight_kg DECIMAL(5,2);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS sex VARCHAR(10) CHECK (sex IN ('male','female','unknown'));
ALTER TABLE pets ADD COLUMN IF NOT EXISTS neutered BOOLEAN DEFAULT FALSE;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS microchip VARCHAR(50);
ALTER TABLE pets ADD COLUMN IF NOT EXISTS blood_type VARCHAR(20);
```

---

## 3. TELA DO PRONTUÁRIO — PROTÓTIPO EXISTENTE

### Arquivo: `prontuario_saude_pet.jsx`

**ATENÇÃO:** Este protótipo usa paleta CLARA (antiga). No código real, redesenhar com design system v6 (dark navy). Mas a ESTRUTURA e DADOS são referência válida.

### 3.1 Abas (6)

| Aba | Conteúdo |
|-----|----------|
| **Geral** | Score IA (circle gauge), info do pet (grid 2x2), alergias, gráfico de peso |
| **Vacinas** | Lista com status ok/vencida, expandível com detalhes (lab, lote, vet, clínica, dose) |
| **Exames** | Lista com resultados (item, valor, referência, ok/atenção), status normal/attention |
| **Remédios** | Lista ativo/inativo, tipo, frequência, período, notas, fonte (tutor/IA) |
| **Consultas** | Timeline com tipo (check-up/emergência/especialista), vet, clínica, resumo |
| **Cirurgias** | Cards com nome, data, vet, anestesia, status recuperação, notas |

### 3.2 Dados Mock do Protótipo (usar como seed)

**Vacinas:**
| Nome | Lab | Lote | Vet | Data | Próx | Status |
|------|-----|------|-----|------|------|--------|
| V10 (Polivalente) | Vanguard Plus | A2847N | Dra. Carla Mendes | 15/01/2026 | 15/01/2027 | OK |
| Antirrábica | Defensor | R9812K | Dr. Paulo Freitas | 20/03/2025 | 20/03/2026 | VENCIDA |
| Giárdia | GiardiaVax | G4421B | Dra. Carla Mendes | 10/06/2025 | 10/12/2025 | VENCIDA |
| Gripe Canina | Bronchi-Shield | BS773M | Dra. Carla Mendes | 05/09/2025 | 05/09/2026 | OK |
| Leishmaniose | Leish-Tec | LT102X | Dr. Paulo Freitas | 01/02/2026 | 01/02/2027 | OK |

**Exames:**
| Nome | Data | Status | Resultados |
|------|------|--------|------------|
| Hemograma Completo | 12/03/2026 | Normal | Hemácias 6.8 (5.5-8.5 OK), Hemoglobina 15.2 (12-18 OK), Leucócitos 11.400 (6k-17k OK), Plaquetas 285k (200k-500k OK) |
| Bioquímico Hepático | 12/03/2026 | Atenção | ALT 92 (10-88 FORA), FA 145 (20-150 OK), Albumina 3.1 (2.6-4.0 OK) |
| Urinálise | 12/03/2026 | Normal | pH 6.5 (5.5-7.5 OK), Proteína Neg (OK), Densidade 1.035 (1.015-1.045 OK) |
| Ecocardiograma | 05/01/2026 | Normal | — |
| Raio-X Torácico | 05/01/2026 | Normal | — |

**Medicações:**
| Nome | Tipo | Freq | Início | Fim | Ativo | Notas |
|------|------|------|--------|-----|-------|-------|
| Simparic 40mg | Antiparasitário | Mensal | 01/01/2026 | Contínuo | Sim | Pulgas e carrapatos. Dar com alimento. |
| Ômega 3 (1000mg) | Suplemento | Diário | 15/03/2026 | 15/06/2026 | Sim | Recomendado pela IA — ressecamento pelo lombar. |
| Drontal Plus | Vermífugo | Trimestral | 01/03/2026 | Próx: 01/06/2026 | Sim | Vermifugação de rotina. |
| Prednisolona 20mg | Anti-inflamatório | 2x/dia 7 dias | 10/11/2025 | 17/11/2025 | Não | Reação alérgica a picada de inseto. |

**Consultas:**
| Data | Vet | Clínica | Tipo | Resumo |
|------|-----|---------|------|--------|
| 12/03/2026 | Dra. Carla | VetBem | Check-up anual | Exames sangue/urina. ALT levemente elevado — repetir 30d. Peso ideal. Pelo ressecado, suplementar ômega 3. |
| 10/11/2025 | Dr. Paulo | PetCenter Salto | Emergência | Reação alérgica severa a picada de inseto. Edema no focinho. Prednisolona 7 dias. Evolução satisfatória. |
| 05/01/2026 | Dra. Carla | VetBem | Cardiologia | Eco e raio-X normais. Sem sopros ou arritmias. |

**Cirurgias:**
| Nome | Data | Vet | Anestesia | Notas | Status |
|------|------|-----|-----------|-------|--------|
| Castração (Orquiectomia) | 15/08/2024 | Dra. Carla | Isoflurano + Propofol | Sem intercorrências. 10 dias recuperação. Pontos reabsorvíveis. | Recuperado |
| Remoção corpo estranho | 02/05/2025 | Dr. Paulo | Isoflurano | Ingestão de meia de borracha. Gastrotomia. 14 dias recuperação. | Recuperado |

**Alergias:**
| Nome | Severidade | Reação |
|------|-----------|--------|
| Picada de inseto | Alta | Edema facial |
| Frango (suspeita) | Baixa | Coceira leve |

**Peso (9 meses):**
Jul: 28kg → Ago: 29.5 → Set: 30 → Out: 31.2 → Nov: 31.8 → Dez: 32.5 → Jan: 32 → Fev: 31.5 → Mar: 32kg.
Status: Dentro do ideal para Labrador 3 anos.

### 3.3 Componentes visuais do protótipo

| Componente | Descrição |
|------------|-----------|
| CircleScore | Gauge circular SVG (tamanho, cor, label, sub). Usado pra score geral 92, vacinas 100, exames 85, peso 95. |
| WeightChart | Gráfico SVG de linhas com area fill, dots nos pontos, labels kg e mês. |
| Badge | Chip colorido (ok/vencida/atenção/alta). |
| QR Modal | QR Code do prontuário (validade 24h), botões PDF e Enviar. |
| FAB | Botão flutuante "+" para adicionar registro. |

### 3.4 Features visuais da aba Geral

- Score de Saúde IA: 4 gauges circulares (Geral 92, Vacinas 100, Exames 85, Peso 95)
- Card de alerta: "2 pontos de atenção: Antirrábica e Giárdia vencidas · ALT acima do normal"
- Info do pet: grid com Espécie, Raça, Nascimento, Idade, Sexo, Peso, Microchip, Tipo sanguíneo
- Cards de alergia: nome, reação, badge de severidade, borda esquerda colorida
- Gráfico de peso: 9 meses, linha verde com area fill

---

## 4. ENTRADA DE DADOS NO PRONTUÁRIO — AI-FIRST

Seguindo CLAUDE.md seção 1.1 (Filosofia AI-First), a entrada de dados no Prontuário segue esta hierarquia:

```
1º  CÂMERA + IA    → Foto da carteirinha de vacina → OCR extrai tudo
                   → Foto da receita → IA extrai medicação e dose
                   → Foto do laudo → IA extrai resultados de exame
2º  MICROFONE (STT) → Tutor fala "Rex tomou V10 hoje" → IA registra
                   → Tutor fala "Consultei Dra. Carla" → IA cria consulta
3º  SELEÇÃO RÁPIDA  → Chips para tipo, toggles, date picker
4º  DIGITAÇÃO       → Último recurso, apenas quando inevitável
```

### Fluxo de cadastro de vacina (exemplo)

```
Tutor abre Prontuário do Rex
    → Toca "+" (FAB)
    → Seleciona "Vacina"
    → Opção 1: FOTO (prioridade)
        → Tira foto da carteirinha
        → IA (OCR) extrai: nome, lab, lote, data, vet
        → Mostra resultado com % confiança em cada campo
        → Tutor confirma ou corrige
        → Salva na tabela vaccines
    → Opção 2: VOZ
        → Tutor fala: "Rex tomou V10 na Dra. Carla hoje"
        → IA extrai: nome=V10, vet=Dra. Carla, data=hoje
        → Mostra resultado para confirmação
    → Opção 3: MANUAL
        → Formulário com campos pré-sugeridos pela IA
```

---

## 5. INTEGRAÇÃO COM OUTROS MÓDULOS

### 5.1 Prontuário → Diário (ponte automática)

```
Registro no Prontuário:
  "V10 aplicada 27/03/2026, Dra. Carla, VetBem, lote XY123"

Edge Function cria diary_entry automática:
  type: "manual"
  ai_narration: "Hoje fui no vet. Levei uma picadinha mas fui corajoso.
                 A doutora disse que estou saudável. Ganhei biscoito na volta."

→ Dado clínico fica NO PRONTUÁRIO
→ Experiência emocional fica NO DIÁRIO
→ Ambos geram embedding no RAG
```

### 5.2 Análise de Foto IA → Prontuário

```
Tutor tira foto do pet
  → IA detecta: "ressecamento no pelo lombar"
  → Atualiza health_score do pet
  → Pode sugerir: "Quer registrar isso no prontuário?"
  → Se sim: cria consulta ou observação no Prontuário
```

### 5.3 Hub → Prontuário

```
Hub mostra alerta: "Rex tem 2 vacinas vencidas"
  → Clique no alerta → vai direto para aba Vacinas do Prontuário
  → Badge no card do pet: seringa vermelha + count
```

### 5.4 Dashboard do Pet → Prontuário

```
Dashboard mostra card "Prontuário" com:
  - Ícone: shieldCheck (verde se tudo em dia, vermelho se vencida)
  - Sub: "Vacinas e alergias"
  - Badge: "2" vermelho (vacinas vencidas)
  → Clique abre tela do Prontuário
```

### 5.5 Aldeia SOS → Prontuário (pós-MVP)

```
SOS médico ativado
  → Prontuário gera "proxy" automático com dados essenciais:
    - Alergias conhecidas
    - Medicações em uso
    - Tipo sanguíneo
    - Vacinas recentes
  → Compartilha com quem está ajudando (JSONB no aldeia_sos)
  → Dados sensíveis são ocultados automaticamente
```

---

## 6. EDGE FUNCTIONS RELACIONADAS À SAÚDE

| Edge Function | O que faz | Quando roda |
|---------------|-----------|-------------|
| `check-vaccine-status` | Verifica vacinas próximas de vencer ou vencidas, envia push | CRON diário 08:00 |
| `process-health-ocr` | Recebe foto de carteirinha/receita/laudo, extrai dados via IA | Ao cadastrar via foto |
| `generate-health-narration` | Cria narração emocional para o diário quando algo de saúde é registrado | Após insert em vaccines/allergies/consultations |
| `calculate-health-score` | Recalcula health_score do pet baseado em vacinas, exames, peso, alergias | Após qualquer mudança de saúde |
| `generate-sos-proxy` | Gera JSONB resumido do prontuário para emergência SOS | Quando SOS médico é ativado (pós-MVP) |

---

## 7. NOTIFICAÇÕES DE SAÚDE

| Tipo | Quando | Mensagem exemplo |
|------|--------|------------------|
| Vacina vencida | No dia do vencimento | "A Antirrábica do Rex venceu hoje. Agende na vet!" |
| Vacina próxima | 7 dias antes | "A Giárdia do Rex vence em 7 dias" |
| Medicação termina | 3 dias antes do end_date | "O Ômega 3 do Rex termina em 3 dias. Renovar?" |
| Retorno agendado | 1 dia antes do follow_up_at | "Rex tem retorno amanhã na VetBem" |
| Peso anormal | Quando IA detecta fora do ideal | "Rex está 2kg acima do ideal para Labrador" |
| Exame pendente | Quando follow_up de exame chega | "Repetir ALT do Rex (resultado anterior: 92 U/L)" |

---

## 8. GERAÇÃO DE PDF DO PRONTUÁRIO

Usando `expo-print` + `expo-sharing` (funciona no Expo Go):

```typescript
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const generateProntuarioPDF = async (pet, vaccines, allergies, exams, medications) => {
  const html = `
    <html><body style="font-family: sans-serif; padding: 40px;">
      <h1 style="color: #E8813A;">auExpert</h1>
      <h2>Prontuário de Saúde — ${pet.name}</h2>
      <p><b>Raça:</b> ${pet.breed} · <b>Idade:</b> ${pet.age} · <b>Peso:</b> ${pet.weight}kg</p>
      <p><b>Microchip:</b> ${pet.microchip} · <b>Sangue:</b> ${pet.blood_type}</p>
      
      <h3>Alergias</h3>
      ${allergies.map(a => `<p>⚠️ ${a.name} (${a.severity}) — ${a.reaction}</p>`).join('')}
      
      <h3>Vacinas</h3>
      <table border="1" cellpadding="8" style="border-collapse: collapse; width: 100%;">
        <tr style="background: #1B8EAD; color: white;">
          <th>Vacina</th><th>Data</th><th>Próxima</th><th>Status</th>
        </tr>
        ${vaccines.map(v => `<tr><td>${v.name}</td><td>${v.applied_at}</td><td>${v.next_due_at}</td><td>${v.status}</td></tr>`).join('')}
      </table>
      
      <h3>Medicações em Uso</h3>
      ${medications.filter(m => m.active).map(m => `<p>💊 ${m.name} — ${m.frequency} (desde ${m.start_date})</p>`).join('')}
      
      <p style="color: gray; margin-top: 40px;">Gerado por auExpert em ${new Date().toLocaleDateString()}</p>
    </body></html>
  `;
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri);
};
```

---

## 9. QR CODE DO PRONTUÁRIO

O protótipo inclui QR Code que permite compartilhar o prontuário com veterinários:
- Validade: 24h (segurança)
- Conteúdo: link temporário para versão read-only do prontuário
- Ações: baixar PDF ou enviar via share nativo
- Dados incluídos: vacinas, alergias, medicações ativas, peso, tipo sanguíneo
- Dados excluídos: fotos pessoais, diário, dados financeiros

---

## 10. HEALTH SCORE — CÁLCULO DA IA

O `health_score` (0-100) do pet é calculado pela Edge Function `calculate-health-score` com pesos:

| Fator | Peso | Como calcula |
|-------|------|--------------|
| Vacinas em dia | 30% | % de vacinas não vencidas |
| Peso ideal | 20% | Proximidade ao peso ideal para raça/idade |
| Exames recentes | 15% | Tem exames nos últimos 6 meses? Resultados normais? |
| Alergias controladas | 10% | Alergias com medicação/controle ativo |
| Consultas regulares | 10% | Última consulta < 12 meses |
| Análise visual IA | 15% | Score da última análise de foto |

Exemplo Rex: Vacinas 60% (2 vencidas de 5) × 30 = 18, Peso 100% × 20 = 20, Exames 85% × 15 = 12.75, Alergias 100% × 10 = 10, Consultas 100% × 10 = 10, Visual 95% × 15 = 14.25. Total: ~85. Com ajuste IA: 92.

---

## 11. RESUMO DE IMPLEMENTAÇÃO

### MVP (Sprint atual)
- Tabelas: `vaccines` + `allergies` (já no CLAUDE.md)
- Tela: Prontuário básico com abas Geral + Vacinas + Alergias
- Entrada: AI-first (foto carteirinha, voz, manual)
- Alerta: vacinas vencidas no Hub + push notification
- PDF: carteirinha de vacinação + compartilhar

### Pós-MVP (Sprints futuras)
- Tabelas: `consultations`, `medications`, `exams`, `weight_logs`, `surgeries`
- Tela: Prontuário completo com 6 abas
- QR Code compartilhável
- Health score calculado por IA
- Integração SOS com proxy do prontuário
- Gráfico de peso com tendência
- OCR avançado de laudos e receitas
