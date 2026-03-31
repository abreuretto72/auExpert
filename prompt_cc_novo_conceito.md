# Prompt para Claude Code — Novo Conceito Diário-Cêntrico

Copie o bloco abaixo e cole no Claude Code.

---

## PROMPT:

```
ATENÇÃO: Antes de fazer QUALQUER coisa, leia este prompt INTEIRO. Não execute nada até entender o contexto completo. Este prompt é apenas informativo — NÃO faça alterações agora.

---

## CONTEXTO: MUDANÇA DE CONCEITO DO auExpert

O auExpert está passando por uma mudança fundamental de conceito. Leia o CLAUDE.md e o Tabelas.md na raiz do projeto para entender o estado atual. Depois leia este prompt para entender PARA ONDE estamos indo.

### O que o app é HOJE:
- Login/cadastro/biometria funcionando
- Hub com cards dos pets funcionando
- Cadastro de pet funcionando
- Diário com timeline (texto, voz, foto) funcionando
- Prontuário básico (vacinas + alergias) funcionando
- Edge Functions no Supabase (11 funções) funcionando
- 13 tabelas no banco + views + triggers funcionando
- Narração do diário na voz do pet (1ª pessoa: "Fui no vet...")

### O que o app vai se tornar (NOVO CONCEITO):
O Diário deixa de ser UMA funcionalidade entre várias e passa a ser O CORAÇÃO do app. A única porta de entrada para TUDO. O tutor nunca mais navega para módulos específicos — ele fala, fotografa ou escreve no Diário, e a IA classifica e distribui automaticamente.

---

## AS 7 REGRAS DO NOVO CONCEITO

1. **Zero navegação para inserir dados.** O Diário é a porta única de entrada.
2. **Zero formulários.** A IA preenche tudo a partir de foto, voz ou texto.
3. **Zero categorização manual.** A IA classifica sozinha em 18 tipos.
4. **Módulos são lentes de consulta, não portas de entrada.** Prontuário, Nutrição, Gastos são views de dados que a IA organizou.
5. **O app sugere, nunca obriga.** Cards de sugestão que o tutor pode ignorar.
6. **Câmera é navegação.** Foto de carteirinha → sugere Prontuário. Foto de nota fiscal → sugere Gastos.
7. **Narração é da IA, nunca do pet.** SEMPRE 3ª pessoa. NUNCA "Fui no vet", SEMPRE "Hoje o Rex foi ao veterinário".

---

## MUDANÇA CRÍTICA: NARRAÇÃO

```
ANTES (voz do pet — DESCONTINUADO):
  "Fui no vet hoje. Levei uma picadinha mas fui corajoso."

AGORA (voz da IA narradora — OBRIGATÓRIO):
  "Hoje o Rex foi ao veterinário tomar vacina. Foi aplicada
   a V10 pela Dra. Carla Mendes. O pet está saudável e
   pesa 32 quilos."
```

Regras da narração:
- SEMPRE 3ª pessoa: "O Rex foi...", "A Luna comeu..."
- NUNCA 1ª pessoa: "Fui...", "Comi...", "Meu dono..."
- Factual e descritiva com dados extraídos
- Tom acolhedor mas profissional
- Máximo 150 palavras

---

## O DASHBOARD DO PET MUDA

```
ANTES (grid de módulos equivalentes):
  [Diário] [Saúde] [Fotos] [IA] [Conquistas]
  → Tutor escolhe onde ir

AGORA (Diário protagonista):
  ┌──────────────────────────────┐
  │ Rex · Labrador · 3 anos      │
  │ Humor: Feliz · Saúde: 92     │
  │                               │
  │ ┌───────────────────────────┐│
  │ │ DIÁRIO (70% da tela)      ││
  │ │ Timeline + filtros        ││
  │ │ [Tudo][Momentos][Saúde]   ││
  │ │                           ││
  │ │ "Hoje o Rex foi ao vet..." ││
  │ │                    [+ FAB]││
  │ └───────────────────────────┘│
  │                               │
  │ Lentes: [Pront][Nutri][Gasto]│
  │ (pequenos, abaixo do diário) │
  └──────────────────────────────┘
```

---

## O BOTÃO "+" MUDA

```
ANTES: Abre campo de texto para nova entrada

AGORA: Abre modal com elementos de entrada:
  ┌──────────────┐ ┌──────────┐
  │    FOTO      │ │  VÍDEO   │    ← Câmera grande
  └──────────────┘ └──────────┘
  ┌──────────┐ ┌──────────────┐
  │  FALAR   │ │   OUVIR      │    ← Voz tutor / som pet
  └──────────┘ └──────────────┘
  ┌──────────┐ ┌──────────────┐
  │ ESCREVER │ │   GALERIA    │    ← Texto / upload
  └──────────┘ └──────────────┘
  ┌──────────┐ ┌──────────────┐
  │ SCANNER  │ │  DOCUMENTO   │    ← OCR / PDF
  └──────────┘ └──────────────┘

Na Fase 1 só Foto, Falar e Escrever funcionam.
Os outros 5 mostram "Em breve".
```

---

## O FLUXO DE ENTRADA MUDA

```
ANTES:
  Tutor escreve texto → salva → narração na voz do pet

AGORA:
  Tutor fala/fotografa/escreve
    → Edge Function classify-diary-entry (1 chamada ao Claude)
    → IA classifica em 18 tipos + narra em 3ª pessoa + detecta humor
    → Cards de sugestão aparecem:
      "Vacina V10 detectada. [Registrar no Prontuário]"
      "Peso 32kg detectado. [Atualizar peso]"
    → Tutor confirma ou ignora cada sugestão
    → Entrada salva na timeline com narração + tags + humor
```

---

## A EDGE FUNCTION PRINCIPAL MUDA

```
ANTES: generate-diary-narration
  → Recebia texto, gerava narração na voz do pet
  → 1 propósito

AGORA: classify-diary-entry (NOVA — não substitui a antiga)
  → Recebe texto + foto + contexto do pet
  → 1 chamada ao Claude retorna TUDO:
    classifications, narration (3ª pessoa), mood, urgency,
    clinical_metrics, suggestions
  → A antiga generate-diary-narration CONTINUA existindo como fallback
```

---

## O BANCO DE DADOS MUDA (diary_entries)

SEM remover colunas existentes. Apenas ADD:

Novos campos:
- input_type (expandido: photo, video, voice, pet_audio, etc.)
- classifications JSONB (array de classificações da IA)
- primary_type (classificação principal: moment, vaccine, expense, etc.)
- mood_confidence, mood_source
- urgency (none, low, medium, high)
- video_url, video_thumbnail, audio_url, audio_type
- document_url, ocr_data JSONB
- video_analysis JSONB, pet_audio_analysis JSONB, photo_analysis_data JSONB
- 14 linked_*_id (vínculos com módulos: linked_vaccine_id, linked_expense_id, etc.)

Nova tabela:
- clinical_metrics (28 tipos de métrica: peso, ALT, hemoglobina, scores IA, etc.)
- app_config (configurações do app)
- metric_references (referências por raça/espécie)

---

## O QUE NÃO MUDA (PRESERVAR 100%)

- Login, cadastro, biometria → intactos
- Hub Meus Pets → layout preservado
- Cadastro de pet → intacto
- Tabelas users, pets, sessions → intactas (zero ALTER)
- Tabelas vaccines, allergies → intactas
- Tabelas photo_analyses, mood_logs, pet_embeddings, rag_conversations → intactas
- Tabela media_files, notifications_queue, audit_log → intactas
- Views existentes (vw_pet_full_profile, vw_pet_health_summary, etc.) → mantidas
- Triggers existentes (audit, updated_at, health_score, mood, happiness) → mantidos
- Functions existentes (fn_calculate_health_score, fn_search_rag, etc.) → mantidas
- RLS → mantido em todas as tabelas
- Storage buckets (pets, tutores) → mantidos
- Edge Functions existentes → mantidas (NENHUMA deletada)
- Dados antigos no diary_entries → preservados, NÃO reprocessados
- Narrações antigas (voz do pet) → continuam exibidas como estão

---

## DOCUMENTOS DE REFERÊNCIA

Os seguintes documentos contêm a especificação completa. Coloque-os na pasta docs/ do projeto:

1. **docs/specs/auexpert_novo_conceito_spec.md** (2012 linhas, 16 seções)
   Especificação completa: filosofia, 8 elementos de entrada, classificação IA (18 tipos),
   sistema de sugestão, reconhecimento por tipo de mídia, pipeline técnico,
   métricas clínicas (28 tipos), planos pet (5 tipos), estratégia de desenvolvimento.

2. **docs/specs/auexpert_database_refactored.md** (1276 linhas)
   Schema completo refatorado: 28 tabelas em 11 fases, CREATE TABLE exato,
   views materializadas, triggers, RLS, ordem de criação sem erro de dependência.

3. **docs/specs/prontuario_saude_spec.md**
   Spec consolidada de saúde: 7 tabelas SQL, dados mock, entrada AI-first.

4. **docs/specs/fase1_plano_migracao.md**
   Plano detalhado da Fase 1: 4 sprints com SQL de migração, checklists, prompts.

5. **docs/prototypes/** (referência visual APENAS — NÃO é código de produção):
   - pet_dashboard_v2_diary.jsx → Dashboard com diário protagonista
   - diary_input_selector.jsx → Modal com 8 elementos de entrada
   - diary_photo_result.jsx → Resultado de análise de foto com cards de sugestão
   - diary_voice_result.jsx → Resultado de análise de voz com itens detectados
   - diary_pet_audio_result.jsx → Análise de som do pet com padrão emocional
   - diary_video_result.jsx → Análise de vídeo com scores de locomoção
   - diary_ocr_result.jsx → Scanner OCR de nota fiscal com dados extraídos

---

## ABORDAGEM DE MIGRAÇÃO

A migração será feita em 4 sprints, uma por vez, sem atropelo:

```
Sprint 1.1 — BANCO
  ALTER TABLE diary_entries (adicionar ~20 campos novos)
  CREATE TABLE clinical_metrics, app_config, metric_references
  UPDATE dados antigos (classificar como 'moment')
  Zero remoção de colunas/tabelas

Sprint 1.2 — IA
  Nova Edge Function: classify-diary-entry
  Prompt unificado com narração 3ª pessoa
  1 chamada ao Claude retorna tudo (classificação + narração + humor)
  Edge Functions antigas mantidas como fallback

Sprint 1.3 — TELAS
  Refatorar Dashboard do pet (diário 70% da tela)
  Criar InputSelector (3 ativos + 5 "Em breve")
  Criar ClassificationCard, NarrationBubble, LensGrid
  Criar hook useDiaryEntry (hook único de entrada)

Sprint 1.4 — INTEGRAÇÃO
  Fluxo end-to-end texto/voz/foto
  Teste de regressão (dados antigos intactos)
  Performance (60 FPS, <3s por entrada)
```

---

## O QUE FAZER AGORA

NÃO altere nenhum arquivo ainda. Apenas:

1. Leia o CLAUDE.md do projeto
2. Leia o Tabelas.md do projeto
3. Liste os arquivos que EXISTEM atualmente no projeto (ls da raiz, app/, components/, hooks/, lib/, supabase/functions/)
4. Mostre a estrutura ATUAL da tabela diary_entries (colunas existentes)
5. Liste as Edge Functions que EXISTEM no Supabase
6. Confirme que entendeu o novo conceito respondendo:
   - 5 pontos sobre o que MUDA
   - 5 pontos sobre o que NÃO pode ser quebrado
   - Qualquer dúvida que tenha

Depois que confirmar, eu envio o próximo prompt com a Sprint 1.1 (migração do banco).
```
