# Plano — Enriquecer Prontuário para Padrão Vet-Grade

**Task:** #111
**Data:** 2026-04-20
**Autor:** Claude (revisão obrigatória antes de codar)
**Status:** proposta — aguarda aprovação do Belisario

> Este plano NÃO é código. É diagnóstico + proposta. Nada será implementado antes da aprovação ponto a ponto. Qualquer coluna/tabela que não exista hoje é marcada como NOVA e só entra em fase posterior.

---

## 1. Diagnóstico — o que temos hoje

### 1.1 Fontes de dados já disponíveis no banco

| Tabela | Colunas relevantes HOJE não surfaceadas no prontuário |
|---|---|
| `pets` | `birth_date`, `sex`, `size`, `color`, `blood_type` |
| `vaccines` | `laboratory`, `dose_number`, `clinic`, `notes` |
| `medications` | `type`, `reason`, `prescribed_by`, `notes` |
| `consultations` | `type` (routine/emergency/specialist/surgery/follow_up), `time`, `prescriptions`, `follow_up_at`, `cost` |
| `exams` | `status` (normal/attention/abnormal/critical/pending), `results` JSONB, `notes` |
| `allergies` | `diagnosed_date`, `diagnosed_by`, `confirmed` |
| `surgeries` | **tabela inteira ignorada** — existe em `011_health_tables.sql` |

### 1.2 O que o prontuário mostra hoje (resumido)

Baseado em `prontuario.tsx` (538 linhas) + `generate-prontuario/index.ts` + `useProntuario.ts`:

- Identidade: nome, idade textual, peso (kg), castrado (bool), microchip, tutor
- Badge status: vacinas (current/partial/overdue/none), meds ativas (contagem), alergias (contagem)
- Alertas IA: até 3 itens (critical/warning/info) com `message` + `action`
- Resumo IA para tutor (`ai_summary`) e para vet (`ai_summary_vet`) — 2-3 frases cada
- Lista de vacinas (flat, sem protocolo)
- Medicações ativas (filtro por `end_date` futura)
- Alergias (flat)
- Condições crônicas (array de strings derivado da IA — não persistido como tabela)
- Última consulta (1 registro)
- Distribuição de humor (contagem diary), humor dominante
- QR emergencial via `emergency_token`

### 1.3 Lacunas contra padrão vet-grade

Um prontuário vet-grade mínimo (referência: ficha clínica AVMA/AAHA e modelo do CRMV) traz:

1. **Sinalmento completo** — espécie, raça, sexo, data de nascimento (idade calculada), cor, padrão de pelagem, peso atual + histórico, BCS (Body Condition Score 1-9), tipo sanguíneo, microchip, fotografia atual
2. **Queixa principal + anamnese estruturada** — o motivo da última consulta + histórico coletado
3. **Exame físico sistêmico** — sinais vitais (T, FC, FR, TPC, mucosas), escore corporal, escore dental, hidratação, por sistema (cardiorrespiratório, GI, urinário, neurológico, musculoesquelético, pele, olhos/ouvidos)
4. **Protocolo vacinal** — core vs non-core por espécie, status de compliance (não só "próxima dose")
5. **Controle parasitário** — último antipulgas/antiparasitário tópico, último vermífugo, próxima aplicação
6. **Histórico cirúrgico** — tabela `surgeries` já existe, precisa aparecer
7. **Medicações** — com `type`, `reason`, `prescribed_by`, interações flagged, posologia completa
8. **Alergias confirmadas** — com `diagnosed_date`, `diagnosed_by`, `confirmed=true` badge
9. **Exames complementares** — resultados com valores de referência, flags de anormal, timeline
10. **Diagnósticos crônicos** — persistidos (não só string da IA), com ICD-10-Vet ou equivalente
11. **Predisposições raciais** — ex.: displasia coxofemoral em Border Collie, BOAS em braquicéfalos — geradas pela IA a partir de `pets.breed`
12. **Nutrição** — ração atual, kcal/dia, trocas, observações (já existe no módulo nutrição — linkar)
13. **Curva de peso** — gráfico, não só snapshot
14. **Próximas ações preventivas** — calendário consolidado (vacina + vermífugo + dental + anual)
15. **Cartão de emergência destacado** — alergias graves + blood_type + condições crônicas + meds ativos com dose — tudo no topo, legível em 5 segundos
16. **Tutor / contato de emergência** — nome, telefone, email, endereço (com consentimento)

Dessas 16, temos dados para **1, 6 parcial, 7 parcial, 8 parcial, 9 parcial, 12 (externo), 15 parcial, 16 parcial**. Faltam **2, 3, 4 (só flat), 5, 10 (só string), 11, 13, 14 parcial**.

---

## 2. Estratégia de rollout (5 fases)

Fazer tudo num único PR quebraria o app e ficaria impossível revisar. Divido em **5 fases sequenciais**, cada uma autocontida, cada uma aprovada antes da próxima.

```
Fase 1 — Surfaçar o que já existe (sem schema new, só código)
Fase 2 — Prompt IA enriquecido + campos derivados
Fase 3 — Schema new: BCS, sinais vitais, parasitário, preventive calendar
Fase 4 — UI vet-grade (tabs + gráfico de peso + cartão emergência + ilustrações PDF)
Fase 5 — PDF vet-grade (template A4 profissional, pronto para imprimir)
```

### Fase 1 — Surfaçar o que já existe (só código, baixo risco)

**Mudanças em `generate-prontuario/index.ts`:**
- Adicionar ao `prontuarioData` os campos já existentes mas ignorados hoje:
  - `pet.birth_date`, `pet.sex`, `pet.size`, `pet.color`, `pet.blood_type`
  - Em `vaccines.map`: `laboratory`, `dose_number`, `clinic`, `notes`
  - Em `medications.map`: `type`, `reason`, `prescribed_by`, `notes`
  - Em `consultations.map`: `type`, `time`, `prescriptions`, `follow_up_at`, `cost`
  - Em `allergies.map`: `diagnosed_date`, `diagnosed_by`, `confirmed`
- **Adicionar fetch de `surgeries`** na mesma Promise.all
- Montar `exam_abnormal_count` (contagem de `exams.status IN ('attention','abnormal','critical')`)
- Continuar sem mudar schema do cache (o JSONB `data` aceita campos novos)

**Mudanças em `hooks/useProntuario.ts`:**
- Estender interfaces `ProntuarioVaccine`, `ProntuarioMedication`, `ProntuarioAllergy`, `ProntuarioConsultation` com os campos acima
- Adicionar `ProntuarioSurgery` e `Prontuario.surgeries: ProntuarioSurgery[]`
- Adicionar `Prontuario.sex`, `birth_date`, `size`, `color`, `blood_type`

**Mudanças em `prontuario.tsx`:**
- Expandir o card de identidade (adicionar linhas: sexo, data nasc, cor, porte, tipo sanguíneo — quando `!== null`)
- Na seção de vacinas: mostrar laboratório + dose quando presentes
- Na seção de medicações: mostrar tipo (com chip colorido por `type`) + motivo + quem prescreveu
- Adicionar seção "Cirurgias" quando `surgeries.length > 0` (abaixo de chronic_conditions)
- Adicionar i18n keys necessárias (sem hardcode — seguir §10.2)

**Protegido:** `prontuario.tsx` não está na lista de protected files do CLAUDE.md (§11), mas a edição é aditiva — nada removido.

**Entregas Fase 1:** 1 migration zero, ~250 linhas de código modificado, 15-20 chaves i18n novas.

### Fase 2 — Prompt IA enriquecido + campos derivados

**Mudanças só em `generate-prontuario/index.ts` (prompt + parsing):**

Enriquecer o PROMPT para o Claude gerar:

```json
{
  "ai_summary": "...",
  "ai_summary_vet": "...",
  "alerts": [...],
  "vaccines_status": "...",
  "chronic_conditions": [...],
  "usual_vet": "...",
  "weight_trend": "...",
  "last_exam_date": "...",
  "last_consultation_date": "...",

  // NOVOS CAMPOS (Fase 2)
  "breed_predispositions": [
    { "condition": "displasia coxofemoral", "rationale": "Border Collies de grande porte têm risco aumentado", "severity": "monitor" }
  ],
  "drug_interactions": [
    { "drugs": ["AINE X", "AINE Y"], "warning": "combinação contraindicada — risco gastrointestinal" }
  ],
  "preventive_calendar": [
    { "type": "vaccine", "label": "V10 reforço", "due_date": "2026-06-15", "status": "upcoming" },
    { "type": "deworming", "label": "Vermífugo", "due_date": "2026-05-01", "status": "overdue" },
    { "type": "dental", "label": "Avaliação odontológica anual", "due_date": "2026-07-10", "status": "upcoming" },
    { "type": "annual_check", "label": "Check-up anual", "due_date": "2026-08-20", "status": "scheduled" }
  ],
  "body_systems_review": [
    { "system": "cardiovascular", "status": "normal", "notes": "..." },
    { "system": "respiratory", "status": "attention", "notes": "..." },
    { "system": "gastrointestinal", "status": "normal", "notes": "..." }
    // ...7-8 sistemas
  ],
  "exam_abnormal_flags": [
    { "exam_name": "Hemograma", "parameter": "Hematócrito", "value": "32", "reference": "37-55", "flag": "low" }
  ],
  "emergency_card": {
    "critical_allergies": [...],
    "active_meds_with_dose": [...],
    "chronic_conditions_flagged": [...],
    "blood_type": "...",
    "contact": { "tutor_name": "...", "phone": "...", "vet_name": "...", "vet_phone": "..." }
  }
}
```

**Contratos claros pro Claude:**
- Só gerar `breed_predispositions` se `pet.breed != 'unknown'`
- Só gerar `drug_interactions` se `medications.length >= 2`
- `preventive_calendar` mescla vacinas reais (com `next_due_date`) + inferências da IA (deworming/dental/anual — baseadas em idade e espécie)
- `body_systems_review` baseado em consultas recentes + diary + exames — se sem dados, retornar `status: 'unknown'`
- `exam_abnormal_flags` lê `exams.results` JSONB para achar valores fora da faixa

**Onde o parsing do JSON precisa ficar robusto:**
- Igualar robustez ao que já existe (fallback substring + defaults vazios)
- Validar `body_systems_review[].system` contra enum fixo
- Validar `preventive_calendar[].type` contra enum fixo

**Entregas Fase 2:** zero migration. Prompt cresce ~50 linhas. Parsing cresce ~40 linhas. Types crescem ~80 linhas.

### Fase 3 — Schema new (BCS, sinais vitais, parasitário)

**Só entra se Fase 1 + 2 estiverem estáveis em produção.**

#### 3.1 Nova tabela `vital_signs` (opcional — talvez melhor criar campos em `consultations`)

Opção A: nova tabela `vital_signs` — ligada a `consultations` ou avulsa
Opção B: adicionar colunas em `consultations`: `temperature_celsius`, `heart_rate_bpm`, `respiratory_rate_rpm`, `capillary_refill_sec`, `mucous_color`, `hydration_status`

**Proposta:** **opção B** — é o local natural (sinais vitais são parte do exame físico de uma consulta). Evita JOIN extra.

Migration:
```sql
ALTER TABLE consultations
  ADD COLUMN temperature_celsius DECIMAL(3,1),
  ADD COLUMN heart_rate_bpm INTEGER,
  ADD COLUMN respiratory_rate_rpm INTEGER,
  ADD COLUMN capillary_refill_sec DECIMAL(2,1),
  ADD COLUMN mucous_color VARCHAR(20) CHECK (mucous_color IN ('pink','pale','cyanotic','icteric','brick_red','unknown') OR mucous_color IS NULL),
  ADD COLUMN hydration_status VARCHAR(20) CHECK (hydration_status IN ('normal','mild_dehydration','moderate_dehydration','severe_dehydration','unknown') OR hydration_status IS NULL);
```

#### 3.2 Nova tabela `body_condition_scores`

Timeline de BCS ao longo do tempo (1-9 WSAVA):
```sql
CREATE TABLE body_condition_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 9),
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  measured_by VARCHAR(20) CHECK (measured_by IN ('tutor','vet','ai_photo')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.3 Nova tabela `parasite_control`

Antipulgas, vermífugos — separados de `medications` porque têm ciclo de aplicação próprio:
```sql
CREATE TABLE parasite_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('flea_tick','vermifuge','heartworm','combined')),
  product_name VARCHAR(100) NOT NULL,
  administered_at DATE NOT NULL,
  next_due_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.4 Tabela `chronic_conditions` (persistida — hoje só string)

```sql
CREATE TABLE chronic_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20),  -- ICD-10-Vet ou referência
  diagnosed_date DATE,
  diagnosed_by VARCHAR(100),
  severity VARCHAR(20) CHECK (severity IN ('mild','moderate','severe')),
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Isso permite rastrear diabetes, hipotireoidismo, artrite, etc. com data e severidade, ao invés de só uma string no cache.

**Entregas Fase 3:** 1 migration, RLS para 3 tabelas novas, NOTIFY pgrst, types TS, hooks (`useBCS`, `useParasiteControl`, `useChronicConditions`).

### Fase 4 — UI vet-grade (tabs + gráfico + cartão)

Reestruturar `prontuario.tsx` de 538 linhas para algo navegável:

**Layout novo:**
```
┌ Header com back + PDF + regenerate
│
├ [CARTÃO DE EMERGÊNCIA]         ← destaque no topo
│   - Alergias graves (badge danger)
│   - Meds ativas com dose
│   - Condições crônicas
│   - Tipo sanguíneo
│   - Contato vet + tutor
│
├ [TABS horizontais]
│   1. Resumo       (AI summary + alertas + status badges)
│   2. Identidade   (todos os dados do pet + foto + BCS + peso gráfico)
│   3. Vacinação    (lista + calendário preventivo + status protocolo)
│   4. Medicações   (ativas + passadas + parasitário)
│   5. Clínica      (consultas timeline + sinais vitais + cirurgias + exames)
│   6. Diagnósticos (alergias + condições crônicas + predisposições)
│
└ [AÇÕES]
    - Ver carteirinha QR
    - Gerenciar registros
    - Exportar PDF
```

**Decisões:**
- Gráfico de peso em `react-native-svg` direto (sem nova dep) ou `victory-native` (se já estiver no projeto — confirmar)
- Ilustração de BCS: SVG inline com 9 silhuetas laterais do pet (dog/cat)
- Tabs: reaproveitar padrão do `PetBottomNav` se fizer sentido, ou tabs horizontais scrollable
- Cartão de emergência: fundo `dangerSoft` com borda `danger` — impossível ignorar

**Protegido:** `prontuario.tsx` não está em lista protegida, podemos reestruturar. Mas dividir em componentes menores por responsabilidade (seguir §11.2 — arquitetura em camadas):
```
components/prontuario/
  EmergencyCard.tsx
  IdentityCard.tsx
  WeightChart.tsx
  BCSChart.tsx
  VaccineProtocol.tsx
  PreventiveCalendar.tsx
  VitalSignsTable.tsx
  BodySystemsReview.tsx
  ClinicalTimeline.tsx
```

**Entregas Fase 4:** ~9 componentes novos em `components/prontuario/`, `prontuario.tsx` vira shell com tabs, ~60 chaves i18n novas.

### Fase 5 — PDF vet-grade

Hoje há `prontuario-pdf.tsx` (task #105) mas gera o básico. Fase 5:

**Template vet-grade:**
- Página 1 — capa com logo auExpert + nome do pet + foto + dados identidade + QR emergencial
- Página 2 — cartão de emergência (destaque) + sinalmento + BCS chart
- Página 3 — protocolo vacinal (tabela) + calendário preventivo
- Página 4 — medicações atuais + parasitário + alergias + condições crônicas
- Página 5 — timeline clínica (consultas + cirurgias + exames) com sinais vitais
- Página 6 — gráfico de peso + nutrição (link com módulo nutrição) + distribuição humor
- Página 7 — predisposições raciais + recomendações IA + contato vet/tutor
- Rodapé: "Multiverso Digital © 2026 — auExpert" + paginação

Template A4 HTML → expo-print (lib/pdf.ts já existe — estender).

**Ilustrações no PDF:**
- Silhueta do pet (dog/cat) com zonas anatômicas marcadas
- BCS chart (9 silhuetas)
- Weight curve (SVG inline)
- Vaccine timeline (tabela)

**Entregas Fase 5:** `lib/prontuarioPdf.ts`, `prontuario-pdf.tsx` atualizado, assets SVG (silhuetas dog/cat body + BCS), ~30 chaves i18n PDF.

---

## 3. Impacto por regra do CLAUDE.md

| Regra | Como respeitar |
|---|---|
| §Inviolable 1 (i18n) | Toda string nova vai para `i18n/pt-BR.json` + `i18n/en-US.json`. Zero hardcode. |
| §Inviolable 2 (Alert.alert proibido) | Usar `toast()` / `confirm()` para feedback. |
| §Inviolable 3 (emojis proibidos) | Só Lucide: `Heart`, `Activity`, `Stethoscope`, `Thermometer`, `Syringe`, `Scale`, `Bone`, `ShieldAlert`, `Pill`, `Scissors`. |
| §Inviolable 4 (soft delete) | Todas as novas tabelas com `is_active BOOLEAN DEFAULT true`. |
| §Inviolable 6 (nomes reais) | Antes de cada query nova: `SELECT column_name FROM information_schema.columns WHERE table_name=...` para confirmar schema. |
| §Inviolable 7 (AI model via config) | `getAIConfig(supabase)` — já usado em `generate-prontuario`. |
| §Inviolable 8 (cores) | Só `constants/colors.ts`. Cartão emergência = `danger`/`dangerSoft`. |
| §Inviolable 9 (protected files) | Nenhum arquivo protegido (classify-diary-entry, analyze-pet-photo, useDiaryEntry, diary/new, DocumentScanner) é tocado. |
| §Inviolable 10 (fontes) | Só Sora / JetBrains Mono. Sem italic em corpo. |
| §10.1 (pixels responsivos) | Todo novo styling com `rs()`/`fs()`. |
| §10.2 (strings i18n) | Toda nova label via `t('prontuario.xxx')`. |
| §Database workflow | RLS ativo em `body_condition_scores`, `parasite_control`, `chronic_conditions`. `NOTIFY pgrst, 'reload schema'` após migration. |
| §RAG (§Inviolable) | Nenhum dado deste prontuário vaza entre pets — tudo filtrado por `pet_id`. |
| §12 (resilience) | ErrorBoundary por tab. Skeleton em cada tab. Sem crash quando campo NULL. |
| §9.1 (idioma IA) | Prompt segue passando `language` do `i18n.language` — já está correto. |

---

## 4. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| PostgREST reconhecer FKs novas | `NOTIFY pgrst, 'reload schema'` após cada migration. Testar com curl antes de deploy front. |
| Claude gerar JSON mal-formado com prompt grande | Já há fallback substring + defaults vazios. Adicionar validação Zod opcional server-side. |
| Cache prontuário JSON quebrar ao adicionar campos | Campos novos são opcionais (`?:`) — cache antigo continua lendo OK, só não vai ter os novos. TTL 24h resolve em 1 dia. |
| Tempo de geração crescer (mais dados, prompt maior) | Medir antes/depois. Se passar 15s, cache se torna mais importante. |
| Cartão de emergência expor dados sensíveis no QR | QR aponta pra URL pública com `emergency_token` — já implementado. Nada muda. Mas revisar RLS da view emergencial. |
| Gráfico de peso precisa de histórico — hoje só temos snapshot `pet.weight_kg` | Extrair de `weight_metrics` do diary (classifier já extrai `weight_kg` em `diary_entries.classifications` e há `weight_metrics` em `diary-centric`). Confirmar tabela antes de codar. |
| PDF longo (7 páginas) pode ficar pesado no mobile | expo-print gera em nativo, aceita bem páginas longas. Testar com pet de muito histórico. |

---

## 5. Ordem de execução sugerida

1. **Aprovação deste plano** (Belisario)
2. **Fase 1** — PR pequeno, fácil de revisar, valor imediato (dados que já existem aparecem)
3. Validar Fase 1 em produção ≥ 2 dias
4. **Fase 2** — prompt IA enriquecido — zero migration, reversível
5. Validar Fase 2 ≥ 2 dias
6. **Fase 3** — migration (body_condition_scores, parasite_control, chronic_conditions, vital_signs em consultations)
7. **Fase 4** — UI vet-grade (dividir `prontuario.tsx` em componentes)
8. **Fase 5** — PDF vet-grade

Cada fase: abrir Task na lista, marcar in_progress, commitar, marcar completed.

---

## 6. Perguntas para o Belisario antes de codar

1. **Concordo com as 5 fases?** Se quiser começar por outra ordem (ex.: PDF primeiro), dizer.
2. **Fase 3 inclui 3 tabelas novas + ALTER em `consultations`.** OK aprovar essa estrutura agora ou prefere ver cada tabela individual depois?
3. **BCS via foto IA** — prefere já planejar um módulo "tire foto do pet, IA estima BCS 1-9"? Ou BCS manual-only por enquanto?
4. **Cartão de emergência — contato do vet** — hoje não temos tabela `trusted_vets`. Incluir como Fase 3.5 ou deixar texto livre?
5. **Gráfico de peso** — OK extrair de `diary_entries.classifications` (onde classifier já coloca `weight_kg`)? Se preferir tabela dedicada `weight_history`, fazer parte da Fase 3.
6. **Template PDF vet-grade** — manter cor `accent` + logo auExpert, ou prefere preto-e-branco "clínico" para impressão?
7. **Predisposições raciais** — Claude gera a cada regenerate ou persistir em tabela `breed_predispositions` cacheada por raça?

### 6.1 Decisões tomadas (2026-04-20 — autorizadas pelo Belisario)

1. **Ordem das fases mantida** → Fase 3 → 4 → 5 (sem inverter).
2. **Bundle único de migration** (`20260420_prontuario_vet_grade.sql`): todas as mudanças são aditivas e independentes, PostgREST só precisa de um único `NOTIFY pgrst, 'reload schema'` ao final.
3. **BCS manual agora + slider 1-9 + 9 silhuetas WSAVA.** A captura por foto via IA (`measured_by = 'ai_photo'`) fica como Fase 3.5 — coluna já prevista no schema.
4. **`trusted_vets` criada nesta Fase 3** (1 primário + N especialistas via `UNIQUE INDEX … WHERE is_primary AND is_active`) — vai alimentar o cartão de emergência.
5. **Histórico de peso extraído de `diary_entries.classifications`** (zero migration extra). Uma tabela `weight_history` dedicada só entra se dados em JSONB mostrarem gargalo.
6. **PDF híbrido** — cabeçalho/capa coloridos (logo + `accent`) + corpo em preto-e-branco com acentos `danger` apenas para alertas críticos (vacina vencida, alergia grave, interação severa).
7. **`breed_predispositions` persistida como cache global** (chave `species + breed + condition_key`, leitura pública). Seed inicial com top-20 cães + top-10 gatos. Fallback de IA (`source='ai'`) quando a raça não está no seed — grava no banco para próxima consulta.

### 6.2 Execução Fase 3 (aplicada em 2026-04-20)

- **Migration:** `supabase/migrations/20260420_prontuario_vet_grade.sql` — `apply_migration` OK.
- **Alterações em `consultations`:** +6 colunas de sinais vitais (`temperature_celsius`, `heart_rate_bpm`, `respiratory_rate_rpm`, `capillary_refill_sec`, `mucous_color`, `hydration_status`) com CHECKs de range e enum.
- **Novas tabelas criadas:** `body_condition_scores`, `parasite_control`, `chronic_conditions`, `trusted_vets`, `breed_predispositions`.
- **RLS:** todas as tabelas per-pet usam o padrão `is_pet_owner / is_pet_member / can_write_pet`. `breed_predispositions` é leitura pública + escrita só via service_role.
- **TypeScript:** `types/database.ts` estendido com 5 interfaces novas + 6 campos opcionais em `Consultation`. `tsc --noEmit` limpo (apenas 3 erros pré-existentes em `.jsx` de protótipo, sem relação).

### 6.3 Execução Fase 3c — Seed `breed_predispositions` (aplicada em 2026-04-20)

- **Migration seed:** `supabase/migrations/20260420_breed_predispositions_seed.sql` — `apply_migration` OK.
- **Cobertura:** 20 raças de cães + 10 raças de gatos, 3-5 condições por raça, bilíngue (pt/en) com `rationale` curto.
- **Contagem real no banco:**
  - `dog`: 20 raças → 82 condições
  - `cat`: 10 raças → 39 condições
  - **Total: 121 linhas, todas `source='seed'`**
- **Distribuição de severidade:** `manage`=32 · `watch`=53 · `monitor`=36.
- **Idempotência:** `ON CONFLICT (species, breed, condition_key) DO NOTHING` — re-rodar o seed é seguro.
- **Consulta pela Edge Function (Fase 3d):** deve normalizar raça via `LOWER(breed)` + tabela de aliases (ex.: `"french bulldog"` → `"Buldogue Francês"`). Se não houver match, cai no fallback Claude e grava a nova linha com `source='ai'` para cachear.
- **Próximos passos:** Fase 3d — rewire do prompt em `generate-prontuario` para consultar esta tabela em vez de delegar 100% à IA.

---

## 7. Entregas finais (quando todas as fases concluírem)

- Prontuário com 6 tabs organizadas
- Cartão de emergência destacado, legível em 5s
- Gráfico de peso + BCS chart + ilustrações anatômicas
- Calendário preventivo (vacinas + parasitário + dental + anual)
- PDF vet-grade 7 páginas, imprimível, pronto pra levar na consulta
- 4 tabelas novas: `body_condition_scores`, `parasite_control`, `chronic_conditions` + colunas em `consultations`
- ~3 hooks novos (`useBCS`, `useParasiteControl`, `useChronicConditions`)
- ~9 componentes em `components/prontuario/`
- ~100 chaves i18n novas sob `prontuario.*` (PT-BR + EN-US)
- Prompt IA que gera: breed predispositions, drug interactions, preventive calendar, body systems review, exam flags, emergency card

---

**Aguardando aprovação para começar pela Fase 1.**
