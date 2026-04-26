# auExpert Architecture Codemap

**Last Updated:** 2026-04-26
**Status:** MVP Phase — Diário Inteligente + Co-Tutores + OCR + Audio/Video Analysis + Nutrition Module + Prontuário Vet-Grade + Health Modals Input-First + Invite System + iOS Font Fixes + AI Chat PDF Export + Partnerships + Professional Module (Fase 1: Acesso + Invites + Fase 2: 7 AI Agents) + Component Refactoring (Diary, Health) + Agenda Actions + Pet Deletion + TCI Digital Signing + Reminders Management + Breed Intelligence Elite (8 EFs) + Pet Documents + Professional Credential Scanning

---

## Overview

auExpert é um app mobile AI-first para tutores de cães e gatos. A arquitetura prioriza:

1. **IA PRIMEIRO** — câmera + voz (STT) resolvem mais que formulários
2. **Resiliência** — app funciona offline com React Query cache + fila de mutações
3. **i18n** — ZERO strings hardcoded, 100% das mensagens em `i18n/{pt-BR,en-US}.json`
4. **Responsividade** — NUNCA pixels fixos, sempre `rs()`, `fs()`, `wp()`, `hp()`
5. **Hierarquia clara** — Telas > Hooks > Stores/API > Lib > Supabase

---

## Camadas da Arquitetura

```
┌──────────────────────────────────────────────────────────┐
│ TELAS (app/)                                             │
│ Apenas layout + composição de componentes                │
│ NUNCA importa lib/ diretamente — sempre via hooks        │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ HOOKS (hooks/)                                           │
│ "Cola" entre UI e dados — React Query + Zustand         │
│ useAuth, usePets, useDiary, useHealth, useNotifications,│
│ usePetMembers, useDeletedRecords                        │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ STORES (stores/) + API (lib/api.ts)                     │
│ Zustand (UI state) + React Query (server state)          │
│ authStore, uiStore / pets, diary, vaccines, allergies   │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ LIB (lib/)                                               │
│ Integrações externas sem estado                          │
│ supabase, ai, rag, notifications, storage, responsive    │
└──────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│ CONSTANTS + TYPES + UTILS                                │
│ Design tokens, interfaces, helpers puros                 │
└──────────────────────────────────────────────────────────┘
```

**Regra de importação (direção única, NUNCA inversa):**
- Telas → Hooks → Stores/API → Lib → Constants/Types/Utils
- `lib/` NUNCA importa `hooks/` ou `stores/`
- `components/ui/` NUNCA importa `stores/` ou `hooks/`
- `utils/` NUNCA importa nada do projeto

---

## Fluxo de Dados

### Leitura (Query)

```
[Tela] → usePet(id)
  ├─ useQuery("pets", api.fetchPet)  [React Query]
  ├─ cache (5 min stale)
  ├─ retry automático (2x)
  └─ fallback offline (AsyncStorage)
```

### Escrita (Mutation)

```
[Tela] → usePets().addPet(data)
  ├─ validação Zod
  ├─ offline? → fila (AsyncStorage) → optimistic update cache
  ├─ online? → API call → atualiza cache
  ├─ erro? → toast humano (i18n)
  └─ sucesso? → refetch automático
```

### Estado Transiente (UI)

```
[Tela] → useAuthStore((s) => s.setLanguage)  [Zustand]
  ├─ síncrono, sem rede
  └─ persiste em AsyncStorage
```

---

## Módulos Chave

### Autenticação (`hooks/useAuth.ts`)

**Exports:**
- `useAuth()` — user, session, loading, error, login, logout, biometric, resetPassword
- `useAuthStore((s) => s.*)` — user, isAuthenticated, tokens

**Fluxo:**
```
1. Login (email + senha) → Supabase Auth
2. Biometria (Face ID / Fingerprint) → restaura session do SecureStore
3. Reset Password → edge function `send-reset-email` → deep link → nova senha
```

**Dependências:**
- `lib/supabase.ts` — cliente Supabase
- `lib/errorMessages.ts` — mensagens humanas
- `i18n/{pt-BR,en-US}.json` — `auth.*` keys

---

### Pets (`hooks/usePets.ts` + `lib/api.ts`)

**Queries:**
- `usePet(id)` — pet único com cache
- `usePets()` — lista todos os pets do tutor

**Mutations:**
- `addPet(data)` — cria novo pet (camera + raça/idade/peso)
- `updatePet(id, data)` — edita dados do pet
- `deletePet(id)` — soft delete

**Cache invalidation:**
```
// React Query query keys
queryKeys.pets.all      → todos os pets
queryKeys.pets.detail(id) → pet específico
queryKeys.pets.diary(petId) → diário do pet
```

**Fluxo offline:**
- Adicionar pet offline → salva local + fila
- Reconecta → `offlineSync.ts` processa fila → API call
- Erro na fila → toast "Tentaremos novamente"

---

### Diário (`hooks/useDiary.ts` + `lib/api.ts`)

**Queries:**
- `useDiary(petId)` — entries com paginação
- `useDiaryEntry(entryId)` — entry única
- `useDeletedRecords(petId)` — entries deletadas (soft delete), visíveis apenas para owner/co_parent

**Mutations:**
- `addEntry(petId, data)` — nova entrada com IA classification
  - Salva texto/foto/audio → classifica com IA → gera embedding → processa módulos em background
  - Componente: `app/(app)/pet/[id]/diary/new.tsx` (entrada unificada com mic + 4 botões anexo)
  - Edge function: `classify-diary-entry` (primary) → `analyze-pet-photo` (foto mode)
- `updateEntry(entryId, data)` — edita texto + reclassifica
- `deleteEntry(entryId)` — soft delete com audit trail (deleted_by, deleted_at)
- `restoreEntry(entryId)` — restore de entry deletada (apenas owner/co_parent)

**Input attachments (diary/new.tsx — 2026-04-07):**

Tela unificada com FAB laranja (mic) que abre a tela de nova entrada:

```
INTERFACE — 4 botões de anexo:
┌──────────────────────────────────────┐
│ [Waveform animado] Mic pulsante     │
│ [Campo transcrição] Editável pausado │
│ 4 Botões:                            │
│ ┌─────────┬────────┬─────────┬────────┐
│ │  Foto   │ Vídeo  │ Áudio   │Scanner │
│ │ Camera  │ Video  │ (modal) │ Scan   │
│ └─────────┴────────┴─────────┴────────┘
│ [Thumbnails dos anexos com × remover]
│ ⏸ Pausar  [Gravar no Diário]      │
└──────────────────────────────────────┘
```

**Audio button unification (2026-04-07):**
- Unified "Áudio" + "Som" into single "Áudio" button
- Tap opens bottom-sheet `showAudioChoiceModal` with:
  1. "Gravar agora" (Ear icon, rose) → `PetAudioModal` (record pet sounds)
  2. "Escolher arquivo" (Music2 icon, gold) → file picker for audio attachment
- i18n keys: `mic.audioChoiceTitle`, `mic.audioChoiceRecord`, `mic.audioChoiceRecordDesc`, `mic.audioChoiceFile`, `mic.audioChoiceFileDesc`

**Scanner button (2026-04-07):**
- New "Scanner" button (ScanLine icon, success green)
- Opens `DocumentScanner.tsx` in document capture mode
- Two-stage compression (quality 0.5 + manipulate resize 1280px width)
- Submits as `input_type='ocr_scan'` to classify-diary-entry

**IA Classification & Module Extraction:**
```typescript
// hooks/useDiaryEntry.ts
// Fluxo:
// 1. classifyDiaryEntry() retorna { classifications, narration, humor, tags }
// 2. Para cada classificação: saveToModule() insere em tabela apropriada
//    (vaccines, consultations, medications, expenses, etc.)
// 3. createFutureEvent() agenda appointments detectados
// 4. generateEmbedding() cria vetor RAG para memória do pet
// 5. updatePetRAG() indexa a entrada
```

**Photo & Video Analysis Pipeline (2026-04-10):**
```typescript
// hooks/useDiaryEntry.ts
// PHOTO UPLOAD (line ~905-930):
// 1. ImageManipulator.manipulateAsync() — resize, compress WebP
// 2. uploadMedia() → armazena no Supabase Storage
// 3. _photoAnalysis() inicia background analysis

// VIDEO UPLOAD (line ~945-1000):
// 1. Para cada vídeo: expo-video-thumbnails.getThumbnailAsync()
// 2. Thumbnail gerado no frame 1000ms, quality 0.3 (leve)
// 3. uploadMedia() → vídeo + thumbnail como arquivos separados
// 4. videoThumbUrls[] acompanha índice posicional com vídeos array
// 5. Salva em media_analyses: { type: 'video', mediaUrl, thumbnailUrl, ... }

// AI CLASSIFICATION (line ~1040-1100):
// 1. classifyDiaryEntry() — passa skipAI flag
// 2. Se skipAI=false: invoke classify-diary-entry edge function
//    - Magic bytes MIME detection (detectar áudio via magic bytes)
//    - model_audio separado de model_vision (Gemini para nativo audio/video)
//    - OCR pipeline (texto extraído de documentos/fotos)
//    - Photo analysis: { identification, health, mood, environment, alerts }
//    - Narration: 1ª pessoa do pet, 3ª pessoa semântica
// 3. Salva em photo_analyses table
// 4. photoResultsRaw: []→map() mantém índice posicional com fotos array

// BACKGROUND PROCESSING (line ~1120-1200):
// 1. async _backgroundAnalyzePhotos()
// 2. Para cada vídeo: gera thumbnail no frame 1s (again, para redundância)
// 3. uploadMedia() → thumbnail para Storage
// 4. Atualiza media_analyses com resultados
```

**DiaryModuleCard — buildModuleValue()**
```typescript
// components/diary/DiaryModuleCard.tsx
// Mapeia extracted_data + moduleRow para resumo visual
// Estratégia: tenta moduleRow (DB) primeiro, fallback para extracted_data (IA)
// 
// Casos especiais:
// - weight: fallback chain: d.current_weight (adicionar após refactor)
// - symptom: pode ser array — join com ', '
// - consultation/return_visit: adiciona 'provider' à fallback chain
```

**Narração IA:**
```typescript
// Edge function: supabase/functions/generate-diary-narration/index.ts
Request: { text, petName, breed, humor, language, topMemories }
Response: { narration: "Eca! Que dia legal..." }  // 1ª pessoa do pet
```

**i18n keys:**
- `diary.*` — entrada, narração, filtros, help, módulos
- `diary.help{Voice,Photo,Scanner,Document,Video,Gallery,Listen,Text}`
- `diary.module_{vaccine,consultation,weight,expense,symptom,travel,connection}`

---

### Saúde (`hooks/useHealth.ts` + `lib/api.ts`)

**Queries:**
- `useVaccines(petId)` — vacinas com status (em dia / vencida / próxima)
- `useAllergies(petId)` — alergias registradas
- `useMoodLogs(petId)` — histórico de humores

**Estrutura:**
- Tabela `vaccines` — nome, data, próxima dose, status
- Tabela `allergies` — nome, tipo (alimento/ambiental/contato), reação, notificar
- Tabela `mood_logs` — humor do dia, entrada diário vinculada

**Notificações:**
- 7 dias antes de vencimento → push
- 1 dia antes → push
- No dia → push

---

## Component Refactoring — 2026-04-23

### Diary New Entry — Moved to Component Layer

**Old structure:** `app/(app)/pet/[id]/diary/_new/` (screen-level directory)
**New structure:** `components/diary/new/` (reusable component library)

**Files in `components/diary/new/`:**
```
components/diary/new/
├── animations.ts              — Reanimated + Lottie animation configs
├── attachmentHandlers.ts      — Camera, Video, Audio, DocumentScanner handlers
├── compressPhoto.ts          — WebP compression utility
├── confirmHandlers.ts        — Publication flow (saving, toast, navigation)
├── editHandlers.ts           — Text field edit + STT continuation
├── handleSubmitText.ts       — Main submission logic with offline queue
├── stt.ts                    — Speech-to-text utilities (expo-speech-recognition)
├── types.ts                  — TypeScript interfaces for diary state
├── styles.ts                 — StyleSheet.create() for components
├── DotsText.tsx              — Progress indicator component (loading dots)
├── PainelLentes.tsx          — Lens panel UI component (20 lentes preview)
```

**Benefits of moving to components/:**
1. **Code reuse:** Diary logic can be imported in other screens (co-parent view, professional view)
2. **Testability:** Utilities are pure functions, easier to mock and test
3. **Maintainability:** Clear separation of concerns (handlers, styles, types, animations)
4. **Performance:** Component-level code splitting, lazy loading of attachmentHandlers

**Integration point:**
- Screen file: `app/(app)/pet/[id]/diary.tsx` (entry point)
- Imports: `import { NewEntryFlow } from '../../../components/diary/new'`
- No logic change in `useDiaryEntry()` hook — still responsible for mutations

**Key exports from `components/diary/new/`:**
- `handleSubmitText()` — async, returns optimistic UI state + triggers background IA
- `attachmentHandlers: { photoHandler, videoHandler, audioHandler, documentHandler }`
- `animationConfigs` — Reanimated + Lottie specs
- Styles + Types exported for consumer components

---

### Health Module — Moved to Component Layer

**Old structure:** `app/(app)/pet/[id]/_health/` (screen-level directory)
**New structure:** `components/health/` (reusable health UI components)

**Files in `components/health/`:**
```
components/health/
├── BloodTypeInfoModal.tsx    — Modal showing blood type reference (dogs, cats)
├── components/               — Subcomponents (tabs, cards, modals)
│   ├── VaccineTabContent.tsx
│   ├── AllergiesTabContent.tsx
│   ├── MedicationTabContent.tsx
│   ├── ConsultationTabContent.tsx
│   ├── SurgeryTabContent.tsx
│   └── ExamTabContent.tsx
├── tabs/                     — Tab-specific logic
│   ├── useVaccineTab.ts     — useQuery + useMutation for vaccines
│   ├── useAllergyTab.ts     — Allergies management
│   ├── useMedicationTab.ts  — Medications
│   └── (others...)
└── styles.ts                — StyleSheet.create() for all health UI
```

**Benefits:**
1. **Decoupling:** Health tabs can be rendered anywhere (prontuário, professional view, co-parent view)
2. **Composability:** Each tab is a standalone component + hook
3. **Reusability:** BloodTypeInfoModal can pop up in any screen
4. **Cleaner routing:** Main health screen is lightweight, delegates to tab components

**Integration point:**
- Screen file: `app/(app)/pet/[id]/health.tsx` (tab navigator)
- Uses: `useVaccineTab()`, `useAllergyTab()`, etc. from `components/health/tabs/`
- Renders: `<VaccineTabContent />`, `<AllergiesTabContent />`, etc.

**Mutations still delegated to hooks:**
- `useHealth()` → coordinator hook
- Tab-specific hooks in `components/health/tabs/` → individual mutations

---

## Agenda Actions System — 2026-04-23

### New Hook: `hooks/useAgendaActions.ts`

**Purpose:** Centralize scheduled_events mutations with automatic notification scheduling

**Mutations available:**
```typescript
const {
  confirm,           // Change status to 'confirmed' + schedule reminders
  markDone,          // Change status to 'done' + cancel reminders
  cancel,            // Soft delete (is_active = false) + cancel reminders
  reschedule,        // Update scheduled_for + re-schedule reminders
  silenceReminders,  // Silence notifications for this event
} = useAgendaActions(petId, petName);
```

**Flow example:**
```typescript
// User taps [Confirm] button on vaccine event
await confirm.mutateAsync({
  id: 'evt-123',
  title: 'Vacina Raiva',
  scheduled_for: '2026-04-30T10:00:00Z',
  all_day: false,
  sub: 'Veterinária Saúde',
});
// → updateScheduledEvent(id, { status: 'confirmed' })
// → scheduleAgendaReminders(event, petName)  [background]
// → invalidateQueries(['pets', petId, 'lens', 'agenda'])
```

**Integration with `components/lenses/AgendaLensContent.tsx`:**
- Day detail panel renders action buttons: Confirm, Reschedule, Cancel, Silence
- Buttons call `confirm.mutate()`, `reschedule.mutate()`, etc.
- Mutation loading state: button becomes disabled + spinner
- Error: toast via `getErrorMessage()`
- Success: automatic UI refresh via React Query cache invalidation

**i18n keys (NEW):**
```
agenda.actionConfirm     "Confirmar"
agenda.actionReschedule  "Reagendar"
agenda.actionCancel      "Cancelar"
agenda.actionSilence     "Silenciar lembretes"
```

**Notification reminders (via `lib/notifications.ts`):**
- `scheduleAgendaReminders()` — schedules 3 push notifications:
  - 24h before: `agenda_24h_title` + `agenda_24h_body`
  - 1h before: `agenda_1h_title` + `agenda_1h_body`
  - At time: `agenda_now_title` + `agenda_now_body`
  - All-day events: `agenda_allday_title` + `agenda_allday_body` at 08:00
- `silenceEventReminders(eventId)` — marks event as silenced in AsyncStorage, prevents push
- `unsilenceEvent(eventId)` — restores reminder scheduling (called on reschedule)

---

### Agenda Lens Improvements — 2026-04-23

**File:** `components/lenses/AgendaLensContent.tsx` (30KB)

**New features:**
1. **Calendar dots** — Colored circles below each day indicating event count/priority
   - Red dot: vaccine, exam, surgery, symptom (high priority)
   - Yellow dot: medication, allergy, consultation (medium)
   - Blue dot: expense, plan, mood, weight (low)
   - Multiple dots: max 3 shown, fourth+ collapsed into "+N"

2. **Month navigation** — Chevron left/right buttons
   - Displays current month + year
   - Clicking changes displayed month
   - Selected day resets when month changes (UX consideration)

3. **Day detail panel** — Scrollable list below calendar
   - Always visible (not modal)
   - Shows all events for selected day
   - Sorted by scheduled_for time (all-day events first)
   - Inline action buttons: Confirm, Reschedule, Cancel, Silence

4. **Action buttons per event:**
   - Status badge: scheduled / confirmed / done / cancelled
   - Confirm button: enabled only if status = scheduled
   - Reschedule button: opens DateTimePicker (new date/time + all_day toggle)
   - Cancel button: soft delete with confirm() dialog
   - Silence button: prevents all reminders for this event (not stored in DB, local AsyncStorage)

5. **Safe area fix** — SafeAreaView padding-bottom prevents overlap with bottom nav
   - Bottom padding: `useSafeBottom()` from `hooks/useResponsive.ts`

**i18n keys (Calendar):**
```
agenda.wd_sun, .wd_mon, .wd_tue, etc.  — Weekday abbreviations (S, M, T, W, T, F, S)
agenda.title                            — "Agenda" (lens title)
agenda.noEvents                         — "Sem eventos para este mês"
agenda.selectDay                        — "Selecione um dia para ver eventos"
```

**Related hooks:**
- `useLensAgenda(petId)` — Query for month data + colors
- `useLensAgendaDay(petId, date)` — Query for single day detail
- `useAgendaActions(petId, petName)` — Mutations (confirm, reschedule, cancel, silence)

---

### Pet Deletion Edge Function — 2026-04-22

**File:** `supabase/functions/delete-pet/index.ts`

**Triggered by:**
- `lib/api.ts:deletePet(petId)` → calls this function with Bearer token

**Behavior:**
```
Input: POST /delete-pet
  Authorization: Bearer {user_token}
  Body: { pet_id: "uuid" }

Processing:
  1. Validate Bearer token via auth.getUser(token)
  2. Verify pet belongs to authenticated user (pet.user_id = auth.uid)
  3. Soft-delete cascade (is_active = false) on 18 related tables:
     diary_entries, mood_logs, photo_analyses, vaccines, allergies,
     pet_embeddings, scheduled_events, pet_insights, clinical_metrics,
     expenses, medications, consultations, surgeries, exams,
     nutrition_records, pet_connections, pet_plans, achievements, travels
  4. Soft-delete the pet itself
  5. Return success + pet_name

Output:
  Success (200):
    { success: true, pet_name: "Mana" }
  
  Errors:
    401: Missing/invalid Bearer token
    400: pet_id not provided
    404: Pet not found or access denied
    500: Cascade update failed
```

**Error handling:**
- Table-level errors logged but non-fatal
  - Reason: Some tables may not exist, or don't have `is_active` column
  - Example: If `surgeries` table is missing, still soft-delete other tables
  - Console warning: `[delete-pet] surgeries update skipped: column "is_active" does not exist`
- Always attempts to soft-delete the pet itself
- Returns success if pet is deleted, even if some table errors occurred

**Related code:**
- `lib/api.ts:deletePet(petId)` — Client-side call
  ```typescript
  const response = await fetch('/delete-pet', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pet_id: petId }),
  });
  ```
- `app/(app)/pet/[id]/settings.tsx` — Danger zone button calls this
  - Requires confirm() dialog before triggering
  - Toast: `toast.petDeleted` (success) or error message

**Testing:**
```bash
# After deploying function, test via:
curl -X POST http://localhost:54321/functions/v1/delete-pet \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"pet_id": "test-uuid"}'
```

---

### Nutrição (`hooks/useNutricao.ts` + Edge Functions + PDF)

**Status:** NEW (2026-04-18) — Completo com 14 telas + PDF export

**Queries:**
- `useNutricao(petId)` — dados agregados nutrição (fast, no AI)
  - Modalidade atual (ração / natural / mix)
  - Rações ativas + histórico
  - Alimentos naturais + histórico
  - Restrições + alérgenos
  - Suplementos
- `useCardapio(petId)` — cardápio semanal IA-gerado (cache 3 dias)

**Mutations:**
- `setModalidade(petId, modalidade)` — ativa nova modalidade de alimentação
- `registerFoodChange(petId, foodType, foodData)` — registra mudança de ração/natural
- `addRestriction(petId, productName, notes)` — adiciona alérgeno/restrição
- `addSupplement(petId, supplementData)` — adiciona suplemento
- `evaluateNutrition(petId)` — IA avalia qualidade, calcula score, retorna recomendações

**Edge Functions:**
- `get-nutricao` — aggregates from 4 tables (racao, racao_natural, restricoes, suplementos)
- `generate-cardapio` — Claude gera cardápio semanal via IA based on pet profile
- `evaluate-nutrition` — analyzes current nutrition vs ideal, retorna { score, pros, cons, recommendation }

**Telas (14):**
```
app/(app)/pet/[id]/nutrition.tsx           — Hub com 6 abas
  ├─ nutrition/racao.tsx                   — Ração comercial atual
  ├─ nutrition/so-racao.tsx                — Só ração (no natural)
  ├─ nutrition/racao-natural.tsx           — Alimentos naturais
  ├─ nutrition/so-natural.tsx              — Só natural (no racao)
  ├─ nutrition/cardapio.tsx                — Cardápio semanal IA
  ├─ nutrition/cardapio-detail.tsx         — Detalhes receita dia
  ├─ nutrition/cardapio-history.tsx        — Histórico cardápios
  ├─ nutrition/cardapio-pdf.tsx            — PDF export
  ├─ nutrition/restricoes.tsx              — Alergias + restrições
  ├─ nutrition/dicas.tsx                   — IA dicas personalizadas
  ├─ nutrition/historico.tsx               — Timeline mudanças alimentares
  ├─ nutrition/modalidade.tsx              — Seletor modalidade
  ├─ nutrition/trocar.tsx                  — Wizard trocar ração
  └─ nutrition/receita.tsx                 — Editor receita natural
```

**i18n keys:**
- `nutrition.*` — labels, placeholders, hints, IA evaluation messages
- `toast.modalidadeChanged`, `toast.racaoUpdated`, `toast.cardapioGenerated`

**Database tables (NEW):**
- `nutricao_racao` — marca, modelo, proteína%, gordura%, calorias/kg, preço_kg
- `nutricao_racao_natural` — componentes naturais (carne, cereal, legume, frutas, etc.)
- `nutricao_restricoes` — alérgenos + sensibilidades
- `nutricao_suplementos` — vitaminas, ômega, probióticos, etc.
- `nutricao_avaliacoes_cache` — cache avaliação IA (TTL 7 dias)
- `cardapio_semanal` — refeições IA 7 dias (TTL 3 dias)

---

### Prontuário (`hooks/useProntuario.ts` + PDF + QR Code)

**Status:** NEW (2026-04-18) — Completo com dados agregados + PDF export + QR code

**Queries:**
- `useProntuario(petId)` — dados agregados saúde (vacinas + exames + cirurgias + medicações + consultas)

**Mutations:**
- Não há mutations (dados agregados de outras tabelas)

**Telas (3):**
```
app/(app)/pet/[id]/prontuario.tsx          — Visualizador prontuário
app/(app)/pet/[id]/prontuario-pdf.tsx      — PDF export
app/(app)/pet/[id]/prontuario-qr.tsx       — QR code compartilhável
```

**PDF Export (`lib/prontuarioPdf.ts`):**
- Header com foto do pet, nome, microchip, data de emissão
- Seções: Vacinas, Exames, Cirurgias, Medicações, Alergias, Histórico Consultas
- Footer com rodapé "Multiverso Digital © 2026 — auExpert"
- Usa `expo-print` para preview + compartilhamento

**i18n keys:**
- `prontuario.*` — labels, seções, disclaimers
- `toast.prontuarioCopied`, `toast.qrCodeGenerated`

---

### Health Modals — Input-First UX (2026-04-18 update)

**Status:** REFACTORED — Step 0 (Input) antes de 3-step wizard

**Modais afetados:**
- `AddVaccineModal.tsx`
- `AddExamModal.tsx`
- `AddConsultationModal.tsx` (com time field HH:MM)
- `AddMedicationModal.tsx`

**Novo padrão de 3 passos:**
```
STEP 0 (Input) — Seletor rápido + sugestão IA
├─ Chips pré-preenchidas com histórico (ex: vacinas anteriores)
├─ Campo texto com autocomplete
├─ Validação real-time

STEP 1 (Detalhes) — Campos específicos por tipo
├─ Data (datepicker)
├─ Dosagem / Dose
├─ Observações

STEP 2 (Revisão + Salvar)
├─ Resumo dados
├─ Botão salvar
```

**Componentes de Input:**
- `Input.tsx` — STT + ícone mic sempre laranja
- `MedicationAutocomplete` — dropdown com histórico medicações
- `VaccineAutocomplete` — dropdown com vacinas padrão por raça

**i18n keys:**
- `modals.addVaccine`, `modals.addExam`, `modals.addConsultation`, `modals.addMedication`
- `consultTime` — novo field "Hora da consulta (HH:MM)"
- `addedBy` — "Adicionado por {name}"

---

## Estado (Zustand Stores)

### `authStore` — Autenticação + Sessão

```typescript
interface AuthState {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  tokens: { access: string; refresh: string } | null
  language: 'pt-BR' | 'en-US'

  setUser: (user: User) => void
  setLanguage: (lang: 'pt-BR' | 'en-US') => void
  logout: () => void
  hydrate: () => Promise<void>  // Restaura do SecureStore
}
```

**Persistência:** SecureStore (criptografado)

---

### `uiStore` — Estado da Interface

```typescript
interface UIState {
  drawerOpen: boolean
  selectedPetId: string | null
  showAddPetModal: boolean
  pdfModalVisible: boolean

  setDrawerOpen: (open: boolean) => void
  setSelectedPetId: (id: string | null) => void
  toggleAddPetModal: () => void
  setPdfModalVisible: (visible: boolean) => void
}
```

**Persistência:** AsyncStorage (opcional)

---

## Responsividade

**Base design:** iPhone 14 (390px largura)

**Funções de `lib/responsive.ts`:**

```typescript
import { rs, fs, wp, hp } from '../lib/responsive';

// Responsive Size — para dimensões
<View style={{ width: rs(100), padding: rs(16), borderRadius: rs(12) }} />

// Font Size — com limites de acessibilidade
<Text style={{ fontSize: fs(14) }} />

// Width/Height Percentage
<View style={{ width: wp(80), height: hp(50) }} />
```

**Layout helpers:**
- `useContentWidth()` — largura máxima de conteúdo com padding
- `useCalendarCellWidth()` — células de calendário
- `useSafeBottom()` — safe area bottom (home indicator)
- `useFontScale()` — escala de fonte por tamanho de tela

---

## i18n — Sistema de Traduções

**Arquivos:**
- `i18n/pt-BR.json` — ~1400 chaves em português
- `i18n/en-US.json` — ~1400 chaves em inglês

**Estrutura de chaves:**
```
common.*        — Genéricas (Salvar, Cancelar, Voltar, placeholderDate)
auth.*          — Login, cadastro, reset, biometria
pets.*          — Listagem, dados, espécies, vacinas
addPet.*        — Modal adicionar pet, placeholders
diary.*         — Entrada, narração, filtros, help
health.*        — Prontuário, vacinas, alergias
members.*       — Co-tutores, convites, papéis, deep link aceite
settings.*      — Configurações
notifications.* — Push, lembretes
toast.*         — Mensagens de balão (voz do pet)
errors.*        — Mapa erros técnicos → humanos
```

**Uso obrigatório:**
```typescript
// ERRADO — PROIBIDO
<Text>Adicionar pet</Text>

// CERTO — OBRIGATÓRIO
<Text>{t('pets.addNew')}</Text>
```

**Tom das mensagens:**
- "Opa, caí da rede! Verifica o Wi-Fi e tenta de novo?"
- "Xi, algo deu errado. Tenta de novo?"
- "Sem espaço aqui! Libera um cantinho no celular?"

---

## Resiliência

### ErrorBoundary

```typescript
// components/ErrorBoundary.tsx (class component)
// Captura crashes de render em toda a app
// Mostra tela amigável com "Tentar novamente"
// Usa i18n.t() direto (sem hooks em class component)
```

### Try/Catch

```typescript
// Toda função async tem try/catch
try {
  const result = await api.fetchData();
} catch (err) {
  toast(getErrorMessage(err), 'error');  // Mensagem humana via i18n
}
```

### React Query Retry

```typescript
// lib/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,              // 2 retries automáticos
      staleTime: 5 * 60 * 1000,  // 5 min
      gcTime: 30 * 60 * 1000,    // 30 min
    },
  },
});
```

### Offline-First

```
┌─────────────────────────────────┐
│ Cache persistente (AsyncStorage)│  ← Restaura ao abrir app
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│ React Query (memória)           │  ← staleTime 5min, gcTime 30min
└─────────────────────────────────┘
           ↓
┌─────────────────────────────────┐
│ Fila de mutações offline        │  ← processQueue() ao reconectar
└─────────────────────────────────┘
```

---

## PDF Export System

**Master template:** `lib/pdf.ts`

**Template obrigatório:**
```
┌─────────────────────────────────────────────────┐
│ [Logo auExpert]  Título do Relatório    Data/Hora│
│                  Subtítulo                      │
├─────────────────────────────────────────────────┤
│                   CORPO HTML                    │
│                 (cada relatório define)          │
├─────────────────────────────────────────────────┤
│  Multiverso Digital © 2026 — auExpert          │
└─────────────────────────────────────────────────┘
```

**Relatórios implementados (2026-04-19):**

| Relatório | Arquivo | Tela | Tamanho | Status |
|-----------|---------|------|---------|--------|
| Diário | `lib/diaryPdf.ts` | `diary.tsx` | 146 lines | ✅ NEW |
| IA Chat | `lib/iaChatPdf.ts` | `ia-pdf.tsx` | 80 lines | ✅ NEW |
| Prontuário | `lib/prontuarioPdf.ts` | `prontuario-pdf.tsx` | — | ✅ Existing |
| Cardápio | `lib/nutritioPdf.ts` | `nutrition/cardapio-pdf.tsx` | — | ✅ Existing |
| Perfil do pet | — | (inline em diary.tsx) | — | ❌ Pending |
| Carteirinha (QR) | — | (inline em id/index.tsx) | — | ❌ Pending |

**Padrão de tela PDF Preview (2026-04-19):**

Todas as telas `*-pdf.tsx` seguem o mesmo padrão:
```
┌─────────────────────────────────────────┐
│  ←  Título do Relatório                 │
├─────────────────────────────────────────┤
│                                         │
│         ┌─────────────────┐             │
│         │   [ícone PDF]   │             │
│         └─────────────────┘             │
│         "Relatório pronto!"             │
│         "Pronto para imprimir..."       │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [↓] Imprimir ou salvar PDF      │    │  ← previewPdf()
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ [↗] Compartilhar arquivo        │    │  ← sharePdf()
│  └─────────────────────────────────┘    │
│                                         │
│    Gerado por IA · auExpert · ...       │
└─────────────────────────────────────────┘
```

**Uso:**
```typescript
import { previewPdf } from '../lib/pdf';

await previewPdf({
  title: t('diary.pdfTitle'),
  subtitle: 'Jan 2026',
  bodyHtml: '<h1>Conteúdo</h1>',
  language: i18n.language,
});
```

**Header buttons (conditional):**
- Diário: Always show FileText button (exports full diary)
- IA Chat: Show FileText button when `activeTab === 'ia'` (exports chat history)
- Other tabs: No PDF button

**Implementation Details:**

**Diary PDF (`lib/diaryPdf.ts` — 146 lines):**
- Builds HTML with all diary entries
- Includes pet name, creation date, narration
- Formats entries chronologically
- Exports via `app/(app)/pet/[id]/diary.tsx` → header button

**IA Chat PDF (`lib/iaChatPdf.ts` — 80 lines):**
- Builds HTML with message history
- Q&A format with timestamps
- Pet context and conversation summary
- Exports via `app/(app)/pet/[id]/ia-pdf.tsx` → dedicated screen

**Diary Timeline Header (`components/diary/DiaryTimeline.tsx`):**
- Added PDF icon to header
- Only visible when viewing diary tab
- Navigates to diary view (implicit PDF export)

---

## Notificações Push

**Arquivo:** `lib/notifications.ts`

**Tipos:**
- `vaccine_reminder` — 7d, 1d, no dia da vacina
- `diary_reminder` — 19h (lembrar tutor de registrar)
- `ai_insight` — análise semanal de atividade
- `welcome` — primeira entrada no app

**Scheduling:**
```typescript
import { scheduleNotificationAsync, AndroidNotificationPriority } from 'expo-notifications';

// Agendar para amanhã às 19h
await scheduleNotificationAsync({
  content: {
    title: t('notifications.diaryReminder'),
    body: `${petName} espera por você!`,
    data: { petId },
  },
  trigger: {
    hour: 19,
    minute: 0,
    repeats: true,  // Todos os dias
  },
});
```

---

## Banco de Dados (Supabase)

**13 tabelas MVP:**
1. `users` — tutores, autenticação, perfil
2. `pets` — cães/gatos, dados, avatar
3. `diary_entries` — entradas do diário
4. `mood_logs` — humor diário
5. `photo_analyses` — análises IA de foto
6. `vaccines` — vacinas, datas
7. `allergies` — alergias registradas
8. `pet_embeddings` — vetores RAG (pgvector)
9. `rag_conversations` — auditoria de contexto RAG
10. `notifications_queue` — fila de push
11. `media_files` — referências de fotos (bucket)
12. `sessions` — cache de sessão
13. `health_checks` — histórico de saúde

**RLS:** Todos os acessos filtrados por `auth.uid()`

**Storage buckets:**
- `pets/` — avatares e fotos do diário (WebP, 3 tamanhos)
- `backups/` — PDFs e exports (futuro)

---

## Co-Tutores — Sistema de Delegação

**Tela:** `app/(app)/pet/[id]/coparents.tsx`
**Hooks:** `hooks/usePetMembers.ts`
**Modal:** `components/InviteModal.tsx`

### Papéis disponíveis

| Role | Acesso | Email obrigatório |
|------|--------|-------------------|
| `co_parent` | Completo (editar, excluir, convidar) | Sim |
| `caregiver` | Leitura + diário | Não |
| `viewer` | Somente leitura | Não |

### Fluxo de convite

```
Tutor abre CoparentsScreen
  → [Adicionar tutor] → InviteSheet (modal)
  → Seleciona papel → preenche email (obrigatório se co_parent)
  → [Gerar link] → inviteMember() chamado
      → Verifica: email obrigatório para co_parent
      → Verifica: max 10 convites pendentes
      → Gera token via generateToken() (Math.random, sem crypto)
      → Expiry: expires_days se informado, senão 48h padrão
      → Busca pet.name + session.full_name em paralelo
      → INSERT em pet_members
      → Retorna URL com query params:
          https://multiversodigital.com.br/auexpert/invite/{token}
          ?from=NomeDoTutor&pet=NomeDoPet&role=co_parent
  → Share nativo do SO (Share.share) com mensagem i18n
```

### Aceitar convite (deep link)

`InviteLinkHandler` + `InviteModal` — componentes renderizados no `_layout.tsx`:

```typescript
// Fluxo 2024 (direto):
// Detecta: /invite/{TOKEN} na URL
// → InviteModal aparece pedindo confirmação (tutor, pet, role)
// → [Aceitar] → UPDATE pet_members SET user_id, accepted_at, invite_token=null
// → toast success + invalidate ['pets'] + router.push('/')
// → [Recusar] → UPDATE pet_members SET is_active=false (soft delete)

// Fallback TestFlight/instalação direta:
// Se o link foi aberto ANTES de qualquer login, o token é salvo localmente
// Após login, _layout.tsx consulta pet_members BY email como fallback
// Se houver convites pendentes, InviteModal aparece mesmo sem deep link ativo
```

**Deep link config em `app.json`:**
- Android: `intentFilters` com `autoVerify: true` para `multiversodigital.com.br/auexpert/invite` + subdomain `invite.auexpert.multiversodigital.com.br`
- iOS: `associatedDomains: ["applinks:multiversodigital.com.br", "applinks:invite.auexpert.multiversodigital.com.br"]`
- ⚠️ Requer novo EAS build

**Detecção de fresh install (`lib/firstRun.ts`):**
- iOS instala via TestFlight → Keychain pode conter sessão fantasma de instalação anterior
- Ao primeiro run, detecta estado stale e força logout + limpeza de Keychain
- Previne loops de sessão expirada

### `hooks/usePetMembers.ts`

```typescript
// usePetMembers(petId) → { 
//   members, activeMembers, pendingMembers, 
//   inviteMember, removeMember, restoreInvite 
// }

// useMyPetRole(petId) → { 
//   role, isOwner, 
//   canInviteCoParent, canInviteCaregiver, canInviteViewer,
//   canRemoveCoParent, canRemoveCaregiver, canRemoveViewer,
//   canEdit, canDelete, canManageMembers, canSeeFinances 
// }

function generateToken(): string  // crypto-free, compatível React Native
```

### `components/InviteModal.tsx`

Modal centralizado (ToastProvider) que exibe:
- Nome do pet + ícone (Dog/Cat com cor accent)
- Nome do invitante (registeredByUser.full_name)
- Rol em badge com cor semântica (co_parent → laranja, caregiver → azul, viewer → cinza)
- [Aceitar] botão primário (accent)
- [Recusar] botão secundário (cinza)

Recusa executa soft delete: `UPDATE pet_members SET is_active=false`.

### PetCard — Caixas de acesso rápido

`components/PetCard.tsx` tem 3 caixas clicáveis na linha central:
- **Vacinas** → `onPressVaccine` → `/pet/{id}/health`
- **Diário** → `onPressDiary` → `/pet/{id}` 
- **Agenda** → `onPressAgenda` → `/pet/{id}?initialTab=agenda`

E botão **Tutores** no rodapé → `onPressMembers` → `/pet/{id}/coparents`

---

## Audit Trail

All record tables (`diary_entries`, `vaccines`, `consultations`, `medications`, `clinical_metrics`, `expenses`, `allergies`, `pet_members`) carry:

| Column | Type | Filled by |
|--------|------|-----------|
| `registered_by` | UUID → users | Trigger `set_audit_fields()` on INSERT |
| `updated_by` | UUID → users | Trigger on INSERT + UPDATE |
| `updated_at` | TIMESTAMPTZ | Trigger on INSERT + UPDATE |

**Trigger:** `set_audit_fields()` — SECURITY DEFINER BEFORE INSERT OR UPDATE — calls `auth.uid()` safely.

**DiaryCard display (`components/diary/TimelineCards.tsx` — 2026-04-10):**
```
Por você · 3 abr          ← registeredBy === currentUserId → "você"
Editado por Ana · 4 abr   ← only shown when updatedBy ≠ registeredBy
```
- Font: Sora 400, 10px, `textGhost`
- Data for display comes from `TimelineEvent.registeredByUser`, `updatedByUser` fields
- `diaryEntryToEvent()` in `timelineTypes.ts` maps the DB join columns to these fields

**Video thumbnails in timeline (2026-04-10):**
- `VideoSubcard` renders `thumbnailUrl` from `media_analyses`
- Thumbnail generated at upload time via `expo-video-thumbnails` (frame @1000ms, quality 0.3)
- Falls back gracefully if thumbnail upload fails (video still displays)
- Integration with new `MediaViewerModal` for full-screen media viewing

**MediaViewerModal (`components/diary/MediaViewerModal.tsx` — NEW):**
- Full-screen photo/video viewer triggered by tapping media in timeline
- Supports pinch-zoom for photos, native video controls for videos
- Handles multiple photos in carousel view
- Integrated into TimelineCards rendering via `onMediaPress` callback

**DIARY_MODULE_SELECT in `lib/api.ts`:**
```typescript
registered_by_user:registered_by(full_name, email),
updated_by_user:updated_by(full_name, email),
```

---

## AI Analysis Pipeline — Photo + Text Classification

### Photo Analysis Flow (Vision)

**Entry point:** `hooks/useDiaryEntry.ts` → `_photoAnalysis()`

```
1. User captures photo/video
   ↓
2. Extract video frame 1 as thumbnail (videoThumbnailUrl — NOT tutor's photo)
   ↓
3. Base64 encode photo/frame
   ↓
4. Fetch bgSession token (background invocation auth)
   ↓
5. invoke('analyze-pet-photo') with:
   - photo_base64: string
   - species: 'dog' | 'cat'
   - language: i18n.language (pt-BR, en-US, etc.)
   - media_type: 'image/jpeg' | 'image/png' | 'image/webp'
   ↓
6. Edge Function returns:
   {
     identification: { breed, size, age, weight, sex, coat },
     health: { body_condition_score, skin_coat[], eyes[], ears[], mouth_teeth[], posture[] },
     mood: { primary, confidence, signals[] },
     environment: { location, accessories[], other_animals, visible_risks[] },
     alerts: [{ message, severity, category }],
     description: "string — REQUIRED, never null",
     toxicity_check: { has_toxic_items, items[] },
     // backward compat
     breed: { name, confidence },
     estimated_weight_kg: number,
     estimated_age_months: number
   }
   ↓
7. Save to photo_analyses table
   ↓
8. photoResultsRaw: use .map() (not .filter()) to preserve positional indices
   - photoResultsRaw[i] aligns with photos[i]
   ↓
9. [DIAG] diagnostic logs for debugging
```

**Key details:**
- **Video thumbnail extraction:** First frame of video used as photo input, not the tutor's profile pic
- **Species parameter:** CRITICAL — app passes species for IA context ("analyze as dog" vs "analyze as cat")
- **Language parameter:** Resposta sempre no idioma do dispositivo
- **bgAuthHeader:** Background invocations fetch `bgSession` token to prevent 401 JWT errors
- **photoResultsRaw array:** Must use `.map()` not `.filter()` to maintain index alignment with photos
- **[DIAG] logging:** Helps debug analyses that fail or give unexpected results

### Text Classification Flow (Diary Entry)

**Entry point:** `hooks/useDiaryEntry.ts` → `savePending()`

**Three input types with different pipelines:**

```
INPUT TYPE: text / voice / photo → buildMessages()
  └─ Max 2 photos (gallery default, video=1, ocr_scan=1)
  └─ Sends all: text + photo(s) in multimodal request
  └─ Claude analyzes context + visual content together

INPUT TYPE: ocr_scan → buildOCRMessages()
  └─ Dedicated OCR path (document scanner only)
  └─ Max 1 photo (first frame only)
  └─ Sends only: image + instruction "extract veterinary health records"
  └─ Zero text prompt (focuses on document structure)
  └─ Results go to structured fields: vaccine.name, vaccine.date, etc.
```

**Flow:**

```
1. User submits diary text/voice/photo/scanner
   ↓
2. Branching in classify-diary-entry:
   
   if input_type === 'ocr_scan':
     → buildOCRMessages(photo_base64)  [dedicated OCR path]
   else:
     → buildMessages(text, photos[])   [general multimodal path]
   ↓
3. Claude returns:
   - classifications[]: { type, confidence, extracted_data }
   - narration: "1ª pessoa do pet"
   - inferred_humor: string
   - tags: string[]
   ↓
4. For each classification: saveToModule()
   - type='vaccine' → INSERT vaccines
   - type='consultation' → INSERT consultations
   - type='medication' → INSERT medications
   - type='weight' → INSERT clinical_metrics
   - type='expense' → INSERT expenses
   - type='symptom' → store in diary_entry.symptoms_detected JSON
   ↓
5. createFutureEvent() if appointment detected
   ↓
6. generateEmbedding() + updatePetRAG()
```

### OCR Scanner Pipeline

**Component:** `components/diary/DocumentScanner.tsx`

**Flow:**

```
1. User taps "Scanner" button (ScanLine icon, success green)
   ↓
2. DocumentScanner opens camera in document mode
   ↓
3. User captures document (carteira vacina, receita, exame)
   ↓
4. Two-stage compression:
   a) Immediate: quality 0.5 (aggressive)
   b) Post-capture: manipulateAsync resize to 1280px width, compress 0.7, format JPEG
   ↓
5. Falls back to original base64 if compressed fails
   ↓
6. Sends to classify-diary-entry with input_type='ocr_scan'
   ↓
7. buildOCRMessages() → Claude Vision OCR
   ↓
8. Returns structured data (vaccine.name, vaccine.date, vaccine.next_dose, etc.)
   ↓
9. saveToModule() inserts into appropriate table
```

**Compression details:**
- Stage 1: `quality: 0.5` (aggressive lossy)
- Stage 2: `ImageManipulator.manipulateAsync` with `resize (1280px width)`, `compress 0.7`, `format JPEG`
- Fallback: If compressed result has no base64, use original `photo.base64`
- Purpose: Keep file size small for network + Claude API while preserving OCR-relevant text clarity

### Photo Limits per Input Type

| Input Type | Max Photos | Strategy | Usage |
|-----------|-----------|----------|-------|
| `ocr_scan` | 1 | First frame only | Document scanning (vaccine carteira, receipts) |
| `video` | 1 | First frame as thumbnail | Video entries — extract 1 frame, analyze as static |
| `gallery` (default) | 2 | Up to 2 photos | Text + photo entries, photo diary entries |

**Previous behavior:** Unlimited photos → causes UI load issues + API token bloat
**Current behavior:** Enforced slice(0,N) per type → faster, cheaper, better UX

### Module Extraction & Display

**Types:** vaccine, consultation, medication, weight, exam, expense, symptom, food, travel, connection, clinical_metric, surgery, allergy, plan

**buildModuleValue() strategy:**
- Tries moduleRow first (DB values — source of truth)
- Falls back to extracted_data (IA suggested values)
- Handles arrays (symptom → join with ', ')
- Special fields:
  - `weight`: checks `m.current_weight` in fallback chain
  - `symptom`: handles both string and array of strings
  - `consultation`/`return_visit`: adds 'provider' to fallback keys

**DiaryCard display:**
- Shows summary line per module
- Edit icon (✏️) inline
- Delete icon (🗑️) only in edit screen, never on timeline
- Expandable to full editor per module type

---

## Deleted Records History

Soft deletes are audited and browseable by owner and co_parent.

### Audit columns (7 tables)

All tables with `is_active` now also carry:

| Column | Type | Filled by |
|--------|------|-----------|
| `deleted_by` | UUID → users | Trigger `set_delete_audit()` when `is_active` TRUE→FALSE |
| `deleted_at` | TIMESTAMPTZ | Same trigger |
| `delete_reason` | TEXT | Optional, set manually |

Trigger also **clears** `deleted_by`/`deleted_at` when `is_active` FALSE→TRUE (restore).

### RLS visibility

- Active records (`is_active=true`): visible to all pet members
- Deleted records (`is_active=false`): visible only to `is_pet_owner()` OR `pet_members.role = 'co_parent'`

### Hook — `hooks/useDeletedRecords.ts`

```typescript
function useDeletedRecords(petId: string) {
  // Queries diary_entries WHERE is_active=false AND deleted_at IS NOT NULL
  // Joins: deleted_by_user, registered_by_user
  // Returns: { deletedEntries, isLoading, refetch, restoreEntry, isRestoring }
}
```

`restoreEntry(entryId)` — sets `is_active=true`, removes from deleted cache, invalidates active diary.

### Screen — `app/(app)/pet/[id]/deleted-records.tsx`

- Shows deleted diary entries with content preview + audit rows
- `Restaurar` button (RotateCcw, accent) per entry
- Empty state, skeleton loading, pull-to-refresh
- Header Trash2 button (danger red) in `app/(app)/pet/[id]/index.tsx` — **only visible to owner + co_parent** (`canSeeDeleted = myRole.isOwner || myRole.role === 'co_parent'`)

---

## JWT Authentication Architecture (2026-04-11)

### Problem: ES256 vs HS256 Mismatch

**Root Cause:** Supabase uses ES256 (asymmetric) for JWT signing, but the gateway's `verify_jwt` option uses the legacy HS256 secret. This causes valid ES256 tokens to be rejected with `"Invalid JWT"` errors.

**Symptom:** Edge Functions receive `401 Unauthorized` from background invocations (e.g., classification in background session).

**Solution:** Disable gateway JWT validation via `supabase/config.toml` and enforce auth inside each function.

### Configuration: `supabase/config.toml`

```toml
# classify-diary-entry: bypass gateway JWT validation
# Reason: project uses ES256 (asymmetric) JWT signing; the gateway's verify_jwt
# uses the legacy HS256 secret and rejects valid ES256 tokens with "Invalid JWT".
# Auth is enforced inside the function via validateAuth() + supabase.auth.getUser()
# which correctly validates ES256 tokens via the Auth server.
[functions.classify-diary-entry]
verify_jwt = false

# analyze-pet-photo: same ES256/HS256 mismatch issue as above
[functions.analyze-pet-photo]
verify_jwt = false

# generate-embedding: same ES256/HS256 mismatch — auth enforced via SERVICE_ROLE internally
[functions.generate-embedding]
verify_jwt = false

# search-rag: same ES256/HS256 mismatch — auth enforced via validateAuth() internally
[functions.search-rag]
verify_jwt = false
```

### Internal Auth Enforcement: `validateAuth()` Pattern

**File:** `supabase/functions/classify-diary-entry/modules/auth.ts`

```typescript
/**
 * Validates JWT by checking Supabase Auth server directly.
 * Handles both ES256 (asymmetric) tokens correctly.
 */
export async function validateAuth(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;  // No token
  }

  const token = authHeader.substring(7);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // getUser() validates the token against Auth server
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('[validateAuth] rejected:', error?.message);
    return null;
  }

  return user;
}
```

**Usage in Edge Functions:**

```typescript
// supabase/functions/classify-diary-entry/index.ts
Deno.serve(async (req: Request) => {
  // 1. Authenticate — required
  const user = await validateAuth(req);
  if (!user) {
    return errorResponse('Unauthorized', 401);
  }

  // 2. Process request with user context
  // ...
});
```

### Background Invocation (with ES256 token)

**File:** `lib/ai.ts`

When calling Edge Functions from background sessions (e.g., classification after diary entry save):

```typescript
// Extract ES256 token from session
const session = await supabase.auth.getSession();
const token = session.data.session?.access_token;

if (!token) {
  throw new Error('No session token available');
}

// Invoke function with explicit Authorization header
const { data, error } = await supabase.functions.invoke(
  'classify-diary-entry',
  {
    headers: {
      'Authorization': `Bearer ${token}`,  // ES256 token passed to function
    },
    body: { /* ... */ },
  }
);

// Detailed error logging for debugging
if (error) {
  const ctx = (error as Record<string, unknown>).context as Response | undefined;
  console.log('[AI-ERR] status HTTP:', ctx?.status);
  console.log('[AI-ERR] url:', ctx?.url);
  try {
    const errBody = await ctx?.json?.();
    console.log('[AI-ERR] body:', JSON.stringify(errBody));
  } catch {
    console.log('[AI-ERR] body parse failed');
  }
}
```

### Key Takeaway

- **Gateway verification disabled** (`verify_jwt = false`) to avoid HS256 validation
- **Function-level validation** via `validateAuth()` ensures ES256 tokens are checked correctly
- **Session tokens passed explicitly** in `Authorization: Bearer {token}` header
- **Detailed HTTP error logging** helps diagnose future auth issues

---

## Edge Functions (Supabase)

**Deno serverless functions:**

| Função | Input | Output | Uso |
|--------|-------|--------|-----|
| `analyze-pet-photo` | { photo_base64, species, language, media_type } | { identification, health, mood, environment, alerts, toxicity_check, description } | Diário (foto mode) — Vision analysis |
| `classify-diary-entry` | { text?, photo_base64?, input_type, petId, language } | { classifications[], narration, humor, tags, moments } | Diário — IA classification (text/photo/OCR) |
| `generate-diary-narration` | { text, petName, breed, humor, language, topMemories } | { narration } | Fallback narração adicional |
| `bridge-health-to-diary` | { event_type, petId } | { diary_entry } | Saúde → Diário automático |
| `ocr-document` | { document_base64, language } | { extracted_text, structured_data } | Carteira vacina (deprecated — use classify-diary-entry) |
| `send-reset-email` | { email } | { status } | Auth reset password |
| `generate-personality` | { diaryEntries[], petId } | { personality_traits } | Pet profile |
| `translate-strings` | { text, language } | { translated_text } | i18n dinâmica |

### classify-diary-entry Enhancements (2026-04-07)

**MAX_TOKENS:** 1500 → 8192 (richer AI responses, room for 5+ photo analyses)

**Input branching:**
```typescript
if (input.input_type === 'ocr_scan') {
  messages = buildOCRMessages(input.photo_base64);  // OCR-specific path
} else {
  messages = buildMessages(input.text, input.photo_base64_array);  // General path
}
```

**buildOCRMessages(photo_base64?):**
- Dedicated path for document scanning
- Sends only image + instruction "extract veterinary health records"
- Zero text prompt (focuses on document OCR)
- Returns structured extraction (vaccine names, dates, lot numbers, etc.)

**buildMessages(text, photos[]):**
- General multimodal path for text + photos
- Sends text + sliced photos based on input_type:
  - `ocr_scan`: slice(0,1) → uses buildOCRMessages instead
  - `video`: slice(0,1) → one frame
  - `gallery`: slice(0,2) → up to two photos
- Maintains backward compatibility for text-only entries

### OCR Document Fallback Pattern (2026-04-11)

**Problem:** When diary entry contains a scanned document + photos/video, the pipeline runs two classify calls:
1. Main call (photos/video/text)
2. Secondary OCR call (document only)

When OCR classify returned 502 (timeout), the document was completely skipped from `media_analyses` table.

**Solution:** Save document to database with empty OCR fields as fallback when OCR fails.

**File:** `hooks/useDiaryEntry.ts` (line ~1571)

```typescript
// BEFORE (❌ would skip document on OCR failure)
if (docMediaUrl && docOcrSource) {
  // Save document only if OCR analysis succeeded
  saveMediaAnalysis({ url: docMediaUrl, ocr: docOcrSource });
}

// AFTER (✅ save document even if OCR fails)
if (docMediaUrl) {
  // Save document regardless of OCR status
  saveMediaAnalysis({ 
    url: docMediaUrl, 
    ocr_text: docOcrSource?.extracted_text ?? null,
    ocr_json: docOcrSource?.structured_data ?? null,
    analysis_status: docOcrError ? 'pending' : 'completed',
  });
}
```

**Fallback UI Strategy:**

- If `ocr_text` is null but document exists: show thumbnail with "OCR pending" badge
- Tutor can manually add OCR text or retry analysis
- Document is never lost due to timeout

---

**analyze-pet-photo Enhancements (2026-04-06):**
- **Content-aware:** Detecta se é pet direto, feces, plants, wounds, food, objects, environment
- **Obrigatório `description`:** Nunca null — resumo clínico apropriado ao conteúdo
- **Toxicity check:** Lista itens tóxicos com level (mild/moderate/severe)
- **Feces identification:** Color/consistency guide (yellow→rapid transit, black→bleeding, etc.)
- **Species parameter:** Passado do app (`species: 'dog'|'cat'`) para IA usar contexto correto
- **Language:** Responde sempre no idioma do tutor (`language: i18n.language`)
- **Gateway JWT bypass:** See JWT Authentication Architecture (2026-04-11) — `verify_jwt = false` in config.toml
- **Auth enforced internally:** validateAuth() + supabase.auth.getUser() check ES256 tokens correctly

---

## AI Model Configuration Pattern

**Problem:** Different content types require different Claude models.
- Text/photo classification: any capable model (e.g., `claude-sonnet-4-20250514`)
- Audio content blocks: ONLY models 4.5+ (e.g., `claude-sonnet-4-6`)
- Older models silently reject audio blocks with no error

**Solution:** Model separation via configurable `app_config` table.

### Configuration Layer (`supabase/functions/classify-diary-entry/modules/classifier.ts`)

```typescript
interface AIConfig {
  model_classify:    string;  // Text classification (default: claude-sonnet-4-6)
  model_vision:      string;  // Photo analysis (default: claude-sonnet-4-6)
  model_chat:        string;  // Chat/insights (default: claude-sonnet-4-6)
  model_narrate:     string;  // Pet narration (default: claude-sonnet-4-6)
  model_insights:    string;  // Weekly summaries (default: claude-sonnet-4-6)
  model_simple:      string;  // Simple tasks (default: claude-sonnet-4-6)
  model_audio:       string;  // AUDIO ONLY — must support audio input (default: claude-sonnet-4-6)
  timeout_ms:        number;
  anthropic_version: string;
}
```

**Database storage:** `app_config` table with keys:
```sql
ai_model_classify    → text
ai_model_vision      → text
ai_model_chat        → text
ai_model_narrate     → text
ai_model_insights    → text
ai_model_simple      → text
ai_model_audio       → text  -- NEW: audio support
ai_timeout_ms        → text
ai_anthropic_version → text
```

**Fetching:** 5-minute cache with fallback to defaults:
```typescript
async function getAIConfig(): Promise<AIConfig> {
  // Check cache
  if (_cachedAIConfig && now < _aiConfigExpiry) return _cachedAIConfig;
  
  // Fetch from DB
  const { data } = await client.from('app_config')
    .select('key, value')
    .in('key', ['ai_model_classify', 'ai_model_audio', ...]);
  
  // Map to AIConfig, fallback to defaults
  // Cache for 5 minutes (configurable)
  return cachedConfig;
}
```

### Model Override Pattern (`callClaude` function)

```typescript
async function callClaude(
  systemPrompt: string,
  messages: object[],
  cfg: AIConfig,
  modelOverride?: string,  // ← NEW: allows per-call model override
): Promise<ContentBlock[]> {
  const model = modelOverride ?? cfg.model_classify;  // Default to classify model
  
  // Call Claude API with specified model
  return await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': cfg.anthropic_version,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    }),
  });
}
```

### Audio Analysis Path

When classifying audio content:

```typescript
// Fetch audio from Storage
const audioData = await fetchAudioAsBase64(audioUrl);  // Returns { base64, mediaType }

// Get AI config with audio-capable model
const cfg = await getAIConfig();
const audioModel = cfg.model_audio;  // e.g., 'claude-sonnet-4-6'

// Build message with audio content block
const messages = [{
  role: 'user',
  content: [
    { type: 'text', text: 'Analyze this pet sound:' },
    {
      type: 'audio',
      media_type: audioData.mediaType,  // Detected from magic bytes
      data: audioData.base64,
    },
  ],
}];

// Call Claude with audio model override
const response = await callClaude(
  systemPrompt,
  messages,
  cfg,
  audioModel,  // ← Override default model_classify with model_audio
);
```

### Magic Bytes MIME Detection

Problem: Supabase Storage reports all `.mp4` files as `video/mp4`, breaking Claude API audio content blocks.

Solution: Detect actual format from first 8 bytes:

```typescript
function detectAudioMimeFromBytes(bytes: Uint8Array): string {
  // MP3: ID3 tag (0x49 0x44 0x33) or MPEG sync (0xFF 0xEx)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return 'audio/mp3';
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return 'audio/mp3';
  
  // WAV: RIFF header (0x52 0x49 0x46 0x46)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46)
    return 'audio/wav';
  
  // OGG: OggS header (0x4F 0x67 0x67 0x53)
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53)
    return 'audio/ogg';
  
  // FLAC: fLaC header (0x66 0x4C 0x61 0x43)
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43)
    return 'audio/flac';
  
  // WebM: EBML header (0x1A 0x45 0xDF 0xA3)
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3)
    return 'audio/webm';
  
  // MP4/M4A: ftyp at offset 4 (0x66 0x74 0x79 0x70)
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70)
    return 'audio/mp4';
  
  // Default
  return 'audio/mp4';
}

// Usage in fetchAudioAsBase64
const bytes = new Uint8Array(buffer);
const mediaType = detectAudioMimeFromBytes(bytes);  // ← Detect from magic bytes
const base64 = btoa(String.fromCharCode(...bytes));
return { base64, mediaType };
```

### Client-side Audio Format Restriction (`app/(app)/pet/[id]/diary/new.tsx`)

DocumentPicker audio filter restricted to Anthropic-supported formats:

```typescript
const result = await DocumentPicker.getDocumentAsync({
  type: [
    'audio/mpeg',   // MP3
    'audio/mp3',    // MP3 (alias)
    'audio/mp4',    // M4A / AAC
    'audio/aac',    // AAC
    'audio/x-m4a',  // M4A (iOS)
    'audio/wav',    // WAV
    'audio/wave',   // WAV (alias)
    'audio/ogg',    // OGG
    'audio/flac',   // FLAC
    'audio/webm',   // WebM audio
  ],
  multiple: false,
  copyToCacheDirectory: false,
});
```

This ensures users can only select formats that Claude API actually supports, preventing errors.

### Benefits

1. **No redeploy needed** — Change model via single DB UPDATE
2. **Model-agnostic code** — Easy to swap to new models as they're released
3. **Fallback safety** — Defaults embedded in code, DB failures don't break the app
4. **Audit trail** — Which model was used for which classification visible in DB
5. **A/B testing** — Can route different users to different models
6. **Per-content-type models** — Audio uses audio-capable model, text uses efficient model

---

## Dependências Principais

```json
{
  "expo": "^55.0.0",
  "expo-router": "^4.0.0",
  "react-native": "^0.76.0",
  "react": "^19.0.0",
  "react-query": "^5.51.0",
  "zustand": "^4.5.0",
  "react-i18next": "^14.0.0",
  "lucide-react-native": "^0.300.0",
  "@supabase/supabase-js": "^2.43.0",
  "zod": "^3.22.0",
  "expo-local-authentication": "^14.0.0",
  "expo-camera": "^14.0.0",
  "expo-image-picker": "^15.0.0",
  "expo-speech-recognition": "^3.4.0",
  "expo-video-thumbnails": "^7.0.0",
  "expo-image-manipulator": "^12.0.0",
  "@react-native-community/netinfo": "^11.0.0"
}
```

## IA Tab — Insights + Chat (2026-04-19 refactor)

**Status:** NEW — Complete redesign of "Assistente" tab to "Minha IA" with unified AI chat interface

**Tab Location:** `app/(app)/pet/[id]/index.tsx` → `activeTab === 'ia'` → `<IATab />`

**Components:**
- `components/pet/IATab.tsx` — Main component with dual views
- Chat interface (primary): message history + input field with STT
- Previous content: insights summary, filterable insight cards (hidden behind chat)

**Chat Features:**
- Input field with mandatory STT (mic icon always visible + orange)
- Send button (Paper Plane icon)
- Full message history with timestamps
- Background session integration (fire-and-forget processing)

**Flow:**
```
User taps IATab → Chat interface loads
  ↓
User taps mic → STT captures speech
  ↓
Text appears in input field (editable)
  ↓
User taps Send → message saved to chat history
  ↓
usePetAssistant() hooks AI processing in background
  ↓
Response appears in chat when ready
```

**STT Configuration (2026-04-19 fix):**
- Removed `continuous: true` (caused mic to stay on after first phrase)
- Removed `iosCategory` with `categoryOptions: []`
- Removed `androidIntentOptions`
- Uses minimal config: `{ lang, interimResults: true, maxAlternatives: 1 }`
- Pattern matches `voice.tsx` which works reliably

**Removed Features:**
- Static suggestion chips (SUGGESTIONS_KEYS, handleSuggestion)
- AVAudioSessionCategory import
- SpeechCategory variable

**i18n keys:**
- `ia.chatTitle` — "Minha IA"
- `ia.inputPlaceholder` — "Pergunte algo..."
- `ia.sending` — "Enviando..."
- `ia.noMessages` — "Comece uma conversa com a IA do seu pet"

**PDF Export:**
- New button in header (when `activeTab === 'ia'`): FileText icon (orange)
- Navigates to: `/(app)/pet/[id]/ia-pdf`
- Exports full chat history as PDF with pet name, date, footer

**Related Screens:**
- `app/(app)/pet/[id]/ia-pdf.tsx` — NEW: PDF preview screen
- `lib/iaChatPdf.ts` — NEW: PDF generation logic

---

## AI Chat PDF Export (2026-04-19 NEW)

**Screens:**
- `app/(app)/pet/[id]/ia-pdf.tsx` — PDF preview screen (184 lines)
- `lib/iaChatPdf.ts` — PDF generation (80 lines)

**Template:**
```
┌─────────────────────────────────────────────────┐
│ [Logo auExpert]  Conversa com a IA de Mana Data/Hora│
│                  Histórico de perguntas e respostas   │
├─────────────────────────────────────────────────┤
│                    CHAT HTML                    │
│   Q: "Como melhorar a saúde do Mana?"         │
│   A: "Baseado no histórico, recomendo..."     │
├─────────────────────────────────────────────────┤
│  Multiverso Digital © 2026 — auExpert          │
└─────────────────────────────────────────────────┘
```

**i18n keys:**
- `ia.pdfTitle` — "Conversa com a IA"
- `ia.pdfSubtitle` — "Histórico de perguntas e respostas"
- `ia.exportChat` — "Exportar conversa"

---

## Partnerships System (2026-04-19 NEW)

**Status:** Placeholder screen for future partner integrations

**Screen:** `app/(app)/partnerships.tsx`
- Simple welcome screen
- Prepare for partner network (vets, pet shops, groomers, walkers, hotels, trainers, ONGs)
- Button in bottom nav (Handshake icon) removed from PetCard, now link in hub

**PetCard Changes:**
- Removed entire XP/gamification system (Proof of Love, badges)
- Replaced with simple Partnership link
- First stat box now AI Chat shortcut (navigates to `/pet/{id}?initialTab=ia`)
- Stat boxes redesigned with solid accent backgrounds + white icons

**i18n keys:**
- `partnerships.title` — "Parcerias"
- `partnerships.subtitle` — "Conecte com profissionais e ONGs"
- `partnerships.comingSoon` — "Em breve..."

**TutorCard Changes:**
- Removed entire XP/gamification system
- Replaced with Partnership icon
- Navigates to `/partnerships`

---

## Atualizações Recentes (2026-04-19)

### AI Chat Redesign (2026-04-19)
**Renaming:** "Assistente" tab → "Minha IA" (better brand alignment)
**Interface:** Full conversation view with STT input
**Changes:**
- Chat history shows all messages with timestamps
- Input field with mandatory microphone (orange icon)
- Send button (Paper Plane) triggers AI response
- Fixed STT hang by removing `continuous: true`
- Uses minimal speech config matching working patterns in `voice.tsx`

**Removed:**
- Static suggestion chips
- iOS audio session category overrides
- Android intent options

**PDF Export:**
- New header button when `activeTab === 'ia'`
- Exports chat history as PDF
- Uses standard template with chat transcript

### Partnerships System Placeholder (2026-04-19)
**New Screen:** `app/(app)/partnerships.tsx`
**Purpose:** Prepare for future partner network
**Integration:**
- TutorCard Handshake button navigates here
- PetCard removed XP/gamification
- Button in bottom nav (future expansion)

**Removed from UI:**
- Proof of Love score
- XP badges
- Gamification cards
- Level progression

---

### iOS Font Fixes
**Problema:** TextInput com `fontFamily` excessivo causava crashes em iOS
**Solução:** Removidos `fontFamily` hardcoded de:
- `components/ui/Input.tsx` — TextInput limpo (deixa sistema escolher)
- `components/diary/CapturePreview.tsx`
- `components/pet/IATab.tsx`
- `components/diary/voice.tsx`
- `components/diary/DiaryModuleCard.tsx`
- `app/(app)/pet/[id]/diary/[entryId]/edit.tsx`
- `components/diary/TimelineCards.tsx` — narração sem Caveat hardcoded
- `components/diary/DiaryNarration.tsx` — sem fontFamily
- `components/diary/NarrationBubble.tsx` — sem fontFamily

**Padrão correto:** Usar `fontFamily` apenas via `StyleSheet` quando absolutamente necessário
**Lição:** iOS pode ser finicky com fonts; deixar sistema gerenciar é mais seguro.

### STT Improvements
**Mudança em Input.tsx line 92:**
```typescript
// ANTES
SpeechModule.start({
  lang: getLocales()[0]?.languageTag ?? 'pt-BR',
  interimResults: false,  // ❌ Não mostrava transcription em tempo real
  maxAlternatives: 1,
});

// DEPOIS
SpeechModule.start({
  lang: getLocales()[0]?.languageTag ?? 'pt-BR',
  interimResults: true,   // ✅ Agora mostra texto sendo digitado
  maxAlternatives: 1,
});
```
**Impacto:** Usuário vê transcription parcial enquanto fala, melhor feedback

### Invite System & Co-Tutores (2026-04-03 implementation)

**Nova tabela:** `pet_invites` — convites para co-tutores
```sql
CREATE TABLE pet_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by_id UUID REFERENCES users(id),
  status 'pending' | 'accepted' | 'rejected' DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);
```

**Edge Function:** `invite-web`
- Gera deep link: `auexpert://invite?token={jwt}&pet_id={id}&email={email}`
- Envia email com link
- Ao abrir: redireciona para tela de aceitar
- Auto-accept no login se email matcheia

**RLS:** Permitir tutor criar invite para seu pet; auto-aceitar em auth callback

---

## Professional Module — Fase 1 (2026-04-21 New)

### Visão Geral

O módulo profissional permite que veterinários, vet techs, grooming, treinadores e outros profissionais tenham acesso à dados clínicos de pets específicos de forma controlada pelo tutor.

**Pilares:**
1. **Tutor controla tudo** — convites por pet, pode revogar acesso a qualquer momento
2. **Role-based access** — 10 tipos de role (vet_full, vet_read, vet_tech, etc.) com permissions granulares
3. **Audit trail completo** — `access_audit_log` registra toda ação (create, accept, read, revoke, expire)
4. **JWT auth** — Edge Functions usam ES256/HS256 para validar tokens de profissionais
5. **Soft delete** — `is_active` = false, nunca deleta dados

### Tabelas Novas

| Tabela | Propósito | Chave Primária | RLS |
|--------|-----------|----------------|-----|
| `professionals` | Perfil profissional declarativo | `id` (UUID) | Sim |
| `access_grants` | Acesso de profissional a pet específico | `id` (UUID) | Sim |
| `role_permissions` | Matrix: role × permission → allowed/denied | `id` (UUID) | Sim |
| `professional_signatures` | Assinatura digital em PDFs clínicos | `id` (UUID) | Sim |
| `access_audit_log` | Log de toda ação (read, create, revoke, expire) | `id` (UUID) | Sim |

**Índices importantes:**
```sql
-- access_grants
UNIQUE (pet_id, professional_id) WHERE is_active = true
INDEX (pet_id) WHERE is_active AND accepted_at IS NOT NULL
INDEX (professional_id) WHERE is_active AND accepted_at IS NOT NULL
INDEX (invite_token) WHERE invite_token IS NOT NULL

-- professionals
INDEX (user_id) WHERE is_active = true
INDEX (professional_type, country_code) WHERE is_active = true
```

### Fluxo de Acesso (Invite → Accept → Access)

```
1. TUTOR — Abre /partnerships
   ├─ Toca em PetCard → "Compartilhar Acesso"
   └─ Seleciona profissional via email + escolhe role
       ↓
2. INVITE SENT — Edge Function cria access_grant
   ├─ invite_token gerado (JWT random)
   ├─ Email enviado via Resend: "Dr. João te convidou pra acessar a saúde do Rex"
   ├─ Deep link: auexpert://invite?token={jwt}&pet_id={id}
   └─ audit_log: CREATE, granted_by={tutor_id}, role={selecionado}
       ↓
3. PROFISSIONAL — Clica no link (web ou app)
   ├─ Deep link abre /invite/[token]
   ├─ Valida JWT: token_id == invite_token && expires_at > NOW
   ├─ Se logado com email matching: auto-accept
   ├─ Se não logado: redireciona pra login
   └─ Toca "Aceitar Acesso"
       ↓
4. ACCEPT FLOW — Edge Function professional-invite-accept
   ├─ UPDATE access_grants SET accepted_at = NOW WHERE invite_token = token
   ├─ INSERT user_device_grant (para rastrear qual device aceitou)
   ├─ audit_log: ACCEPT, accepted_by={prof_id}
   └─ Redireciona pra /pro/pet/[id] (clinical view)
       ↓
5. PROFISSIONAL AGORA VÊ — /pro/pet/[id]
   ├─ Tabs: Geral (resumo), Saúde (vacinas, exames), Prevenção, Sinais, Raça, Emergência
   ├─ Tudo em modo LEITURA (PatientCard.tsx)
   ├─ Pode exportar prontuário PDF (com sua assinatura digital)
   ├─ Auditado: cada read, each export → access_audit_log
       ↓
6. REVOGAÇÃO — Tutor volta em /partnerships
   ├─ Toca "❌ Remover" no profissional
   ├─ UPDATE access_grants SET is_active = false
   ├─ audit_log: REVOKE, revoked_by={tutor_id}, revoked_reason="{motivo}"
   └─ Prof perde acesso imediatamente
```

### Screens Profissionais

#### `/pro/index` — Meus Pacientes (landing)
**Quem vê:**
- User autenticado COM `professionals.is_active = true`
- Sem linha em professionals → redireciona pra `/pro/onboarding`

**O que mostra:**
- Header: logo auExpert + "Olá, {display_name}"
- Lista de pacientes via `useMyPatients()` (RPC `get_my_patients`)
- PatientCards: pet_id, name, species, breed, last_access_time
- Tap → navega pra `/pro/pet/[id]`
- Pull-to-refresh, skeleton loading, offline banner

#### `/pro/onboarding` — Criar Perfil Profissional
**Fluxo:**
1. Preenche `professional_type` (picker: Vet, Vet Tech, Groomer, Trainer, Walker, Sitter, etc.)
2. País (country_code)
3. Nome para exibição
4. (Opcional) Conselho profissional (council_name, council_number) — p/ Vets no Brasil = CRMV
5. (Opcional) Especialidades (Text array: ["cirurgia", "oftalmologia"])
6. Salva → INSERT professionals, audit_log: CREATE

#### `/pro/pet/[id]` — Clinical View Profissional (Read-Only)
**Tabs:**
1. **Geral** — Nome, espécie, raça, sexo, peso, idade, alergias críticas, tipo sanguíneo
2. **Saúde** — Vacinas (status, datas), exames (upload, resultado), medicações (ativas)
3. **Prevenção** — Calendário (próximos eventos), parasitas (tipos, controle)
4. **Sinais** — Últimas entradas clínicas (peso, vitais, comportamento)
5. **Raça** — Predisposições genéticas, drug interactions, exam abnormalities
6. **Emergência** — Contatos de vets confiáveis, alergias críticas, procedures em cascata

**Componente:** `PatientCard.tsx` — renderiza dados clínicos em cards READ-ONLY
- NUNCA permite edição
- Mostra audit_timestamp de cada campo
- Botão "Exportar Prontuário PDF" → gera com assinatura digital do prof
- Logout automático após 5 min inatividade

#### `/invite/[token]` — Accept Invite (Web + Deep Link)
**Fluxo:**
1. Valida JWT (`invite_token` == hash, `expires_at` > NOW)
2. Mostra: "Dr. João te convidou pra acessar a saúde do Rex"
   - Pet name, species
   - Tutor name
   - Role (ex: "Acesso completo")
3. Botão "Aceitar Acesso"
   - Se não logado → redireciona pra login
   - Se logado → auto-accept via `professional-invite-accept`
4. Após accept → navega pra `/pro/pet/[id]`

#### `/partnerships` — Tutor Side (Share Access)
**Quem vê:** Tutores logados
**O que mostra:**
- Lista de profissionais com acesso a cada pet
- PetCards com dropdown de profissionais ativos + expiration dates
- Botão [+] para adicionar novo profissional
  - Modal: email do profissional, role picker, notas opcionais
  - Gera invite_token, envia email, salva em access_grants
- Botão [❌] para revogar acesso (soft delete)
  - Pede confirmação, registra revoked_reason

**i18n:**
```json
{
  "partnerships": {
    "title": "Parcerias",
    "tabPartners": "Profissionais ({{count}})",
    "addPartner": "Adicionar profissional",
    "inviteEmail": "E-mail do profissional",
    "selectRole": "Qual o acesso?",
    "notes": "Notas (opcional)",
    "sendInvite": "Enviar convite",
    "revokeConfirm": "Remover {{name}} do acesso ao {{petName}}?",
    "revoked": "{{name}} não tem mais acesso ao {{petName}}"
  },
  "roles": {
    "vet_full": "Vet — acesso completo",
    "vet_read": "Vet — somente leitura",
    "vet_tech": "Auxiliar veterinário",
    "groomer": "Grooming",
    "trainer": "Treinador",
    "walker": "Passeador",
    "sitter": "Pet sitter",
    "boarding": "Hospedagem",
    "shop_employee": "Funcionário loja",
    "ong_member": "Membro ONG"
  }
}
```

### Edge Functions

#### `professional-invite-create`
**Trigger:** POST `/api/invite/professional`
**Payload:**
```json
{
  "pet_id": "uuid",
  "professional_email": "string",
  "role": "vet_full | vet_read | ...",
  "notes": "string (optional)"
}
```
**Steps:**
1. Valida auth (tutor logado, owner de pet)
2. Procura profissional por email
3. INSERT access_grants (invite_token, invite_sent_at, is_active=true)
4. INSERT access_audit_log (event: CREATE, by: tutor_id)
5. Gera JWT com `invite_token` + `pet_id` + `expires_at = 7 dias`
6. Envia email via Resend com deep link
7. Retorna { success, grant_id, expires_at }

#### `professional-invite-accept`
**Trigger:** POST `/api/invite/accept`
**Payload:**
```json
{
  "token": "jwt",
  "pet_id": "uuid"
}
```
**Steps:**
1. Valida JWT
2. UPDATE access_grants SET accepted_at = NOW WHERE invite_token = hash(token)
3. INSERT access_audit_log (event: ACCEPT, by: prof_id)
4. INSERT user_device_grant (prof_id, pet_id, device_info)
5. Retorna { success, pet_id, role }

#### `professional-invite-expire`
**Trigger:** CRON job diário (08:00)
**Steps:**
1. UPDATE access_grants SET is_active = false WHERE expires_at < NOW AND is_active = true
2. INSERT access_audit_log (event: EXPIRE, by: 'system')
3. Opcional: notifica prof via email "Seu acesso expirou"

#### `professional-invite-cancel`
**Trigger:** POST `/api/invite/cancel`
**Payload:**
```json
{
  "grant_id": "uuid"
}
```
**Steps:**
1. Valida auth (tutor logado, owner de pet)
2. UPDATE access_grants SET is_active = false WHERE id = grant_id
3. INSERT access_audit_log (event: REVOKE, by: tutor_id, reason: "Revoked by tutor")
4. Retorna { success }

### RLS & Autorização

**Função central:**
```sql
CREATE OR REPLACE FUNCTION has_pet_access(
  pet_id UUID,
  permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID := auth.uid();
  is_owner BOOLEAN;
  user_role TEXT;
BEGIN
  -- 1. É dono do pet?
  SELECT EXISTS(SELECT 1 FROM pets WHERE id = pet_id AND user_id = current_user_id)
  INTO is_owner;
  IF is_owner THEN RETURN true; END IF;
  
  -- 2. É profissional com grant válido?
  SELECT role INTO user_role FROM access_grants
  WHERE pet_id = pet_id 
    AND professional_id IN (
      SELECT id FROM professionals WHERE user_id = current_user_id
    )
    AND is_active = true
    AND accepted_at IS NOT NULL
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW)
  LIMIT 1;
  
  IF user_role IS NULL THEN RETURN false; END IF;
  
  -- 3. Role tem permissão?
  SELECT allowed INTO STRICT allowed
  FROM role_permissions
  WHERE role = user_role AND permission = permission;
  
  RETURN allowed;
END;
$$ LANGUAGE plpgsql STABLE;
```

**Policies:**
```sql
-- professionals
CREATE POLICY "own profile" ON professionals
  USING (user_id = auth.uid());

-- access_grants
CREATE POLICY "tutor can create/revoke" ON access_grants
  USING (granted_by = auth.uid())
  WITH CHECK (granted_by = auth.uid());

CREATE POLICY "prof can read own" ON access_grants
  USING (
    professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
  );

-- access_audit_log (append-only)
CREATE POLICY "readonly" ON access_audit_log
  FOR SELECT USING (
    pet_id IN (SELECT id FROM pets WHERE user_id = auth.uid())
    OR professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
  );
```

### Hooks

#### `useProfessional()`
**Returns:** `{ professional, isLoading, error }`
```typescript
// Busca professionals.* do user logado
// Cache 10 min (raro muda)
// Guard: /pro/ redireciona pra onboarding se null
```

#### `useMyPatients()`
**Returns:** `{ patients, isLoading, isFetching, error, refetch }`
```typescript
// RPC: get_my_patients()
// Retorna lista de access_grants aceitos + validos
// Com pet_id, pet_name, species, breed, last_access_time
// Cache 2 min, refetch on reconnect
```

#### `useProClinicalBundle(pet_id)`
**Returns:** `{ health, vaccines, exams, medications, isLoading }`
```typescript
// Agrupa dados clínicos do pet para prof
// Filtrado por has_pet_access('read_health')
// Cache 5 min (dados clínicos mudam pouco)
```

#### `useProDiaryBundle(pet_id)`
**Returns:** `{ diary_entries, analytics, mood_trends, isLoading }`
```typescript
// Agrupa entradas clínicas (peso, vitais, comportamento)
// Filtrado por has_pet_access('read_diary_clinical')
// Cache 5 min, refetch on manual refresh
```

#### `useTutorPartnerships(pet_id?)`
**Returns:** `{ partnerships, addPartnership, revokePartnership, isPending }`
```typescript
// Tutor side: lista professionals com acesso a seus pets
// Se pet_id: filtra pra um pet específico
// Mutations: create, revoke (soft delete)
```

### Validação & Security

**RLS Enforcement:**
- ALL queries em professionals, access_grants, etc. passam por RLS
- Edge Functions NUNCA contornam RLS (usam service role apenas pra inserts de audit)
- Profissionais só veem dados que têm grant válido

**Token Security:**
```typescript
// Inside professional-invite-create:
const jwt = sign({
  invite_token: hash(crypto.randomUUID()),
  pet_id,
  aud: 'professional',
  iss: 'auexpert',
  exp: now + 7*24*60*60,
}, process.env.JWT_SECRET, { algorithm: 'HS256' });

// Inside professional-invite-accept:
const { invite_token, pet_id } = verify(token, process.env.JWT_SECRET);
// Hash matching ensures token not replayed
```

**Audit Trail:**
- Todo CREATE, ACCEPT, READ (opt-in), REVOKE, EXPIRE → access_audit_log
- Timestamp, event_type, actor_id, actor_type (tutor|prof|system), grant_id, reason (se apply)
- Nunca deletado (append-only table)

---

## TCI (Termo de Consentimento Informado) Digital Signing (NEW 2026-04-26)

### Visão Geral

Sistema de assinatura digital de TCIs entre tutores e profissionais veterinários. Tutor recebe push notification, abre `/tci-sign?id={tciId}`, revisa procedimento/riscos/alternativas, e assina com biometria.

### Fluxo

```
1. Profissional cria TCI (via professional/agents/tci.tsx)
   ↓
2. Trigger no banco enfileira push: type='tci_pending_tutor', route='/tci-sign?id={tciId}'
   ↓
3. Tutor recebe push → toca → `/tci-sign?id=...` abre
   ↓
4. Tutor lê procedure_type, description, risks_described, alternatives_described
   ↓
5. Tutor toca [Assinar com Biometria]
   ↓
6. expo-local-authentication.authenticateAsync() → biometria confirmada
   ↓
7. Call RPC tutor_sign_tci(p_tci_id) → UPDATE termos_consentimento SET tutor_signed_at=NOW()
   ↓
8. Trigger enfileira push pro profissional: type='tci_tutor_signed'
   ↓
9. UI mostra "Assinado em {timestamp}" (read-only estado)
```

### Telas

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| **Pending List** | `app/(app)/pending-signatures.tsx` | Listar TCIs pendentes/assinados/todos, filtrar, tap → `/tci-sign?id=...` |
| **Review & Sign** | `app/(app)/tci-sign.tsx` | Mostrar TCI completo, biometric confirm, call RPC, show success |

### Hooks

**`useProSignature()` (NEW)**
```typescript
export function useProSignature(tciId: string) {
  return {
    tci: TciDoc | null,              // Fetched via useQuery
    isLoading: boolean,
    sign: async () => {              // Call RPC tutor_sign_tci
      const ok = await biometricConfirm();
      if (ok) await supabase.rpc('tutor_sign_tci', { p_tci_id: tciId });
    },
    isSigning: boolean,
  };
}
```

### Database Tables

**`termos_consentimento` (existing, used in Professional Fase 1):**
```sql
id UUID PRIMARY KEY
pet_id UUID REFERENCES pets(id)
procedure_type VARCHAR              -- "Castração", "Ultrassom", etc.
procedure_description TEXT
risks_described TEXT
alternatives_described TEXT
tutor_user_id UUID REFERENCES users(id)
professional_user_id UUID REFERENCES users(id)
tutor_signed_at TIMESTAMPTZ
professional_signed_at TIMESTAMPTZ
status VARCHAR ('pending' | 'tutor_signed' | 'fully_signed' | 'cancelled')
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
is_active BOOLEAN DEFAULT true
```

### i18n Keys

```
agents.tci.tutor.title                        "Revisar Consentimento"
agents.tci.tutor.reviewBeforeSigning          "Revise as informações antes de assinar"
agents.tci.tutor.reviewDesc                   "Leia todos os detalhes do procedimento"
agents.tci.tutor.procedureLabel               "Procedimento"
agents.tci.tutor.risksLabel                   "Riscos"
agents.tci.tutor.alternativesLabel            "Alternativas"
agents.tci.tutor.signWithBio                  "Assinar com Biometria"
agents.tci.tutor.biometricFailed              "Biometria não confirmada. Tente de novo."
agents.tci.tutor.signed                       "Consentimento assinado com sucesso."
agents.tci.tutor.alreadySigned                "Já assinado"
agents.tci.tutor.signedAt                     "Assinado em {date}"
agents.tci.tutor.notFound                     "TCI não encontrado"
agents.tci.tutor.noTciSelected                "Nenhum TCI selecionado"

pendingSignatures.title                       "Termos de Consentimento"
pendingSignatures.filter.pending               "Pendentes"
pendingSignatures.filter.signed                "Assinados"
pendingSignatures.filter.all                   "Todos"
pendingSignatures.pending                      "Pendente"
pendingSignatures.signed                       "Assinado"
pendingSignatures.createdAt                    "Criado em {date}"
pendingSignatures.empty.pending.title          "Nenhum TCI pendente"
pendingSignatures.empty.pending.desc           "Você não tem termos pendentes de assinatura"
pendingSignatures.empty.signed.title           "Nenhum TCI assinado"
pendingSignatures.empty.signed.desc            "Você ainda não assinou nenhum termo"
pendingSignatures.empty.all.title              "Nenhum TCI"
pendingSignatures.empty.all.desc               "Nenhum termo de consentimento encontrado"
```

---

## Reminders Management (NEW 2026-04-26)

### Visão Geral

Central hub para gerenciar todos os lembretes do tutor (remédios, acompanhamentos, TCIs pendentes, vacinas). Integrado com `notifications_queue` table.

### Tela

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| **Reminders List** | `app/(app)/reminders.tsx` | Listar reminders não-lidos, ordenar por scheduled_for, mark as read, tap → navigate to resource |

### Tipos de Reminders

| Tipo | Ícone | Ação ao Tap |
|------|-------|-----------|
| `medication_reminder` | Pill | Navigate to `/pet/[id]/health` |
| `vaccine_reminder` | Syringe | Navigate to `/pet/[id]/health` |
| `followup_reminder` | Calendar | Navigate based on `data.route` |
| `tci_pending_tutor` | FileSignature | Navigate to `/tci-sign?id={data.tci_id}` |

### Database Table

**`notifications_queue` (existing):**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id)
pet_id UUID REFERENCES pets(id) (nullable)
type VARCHAR ('medication_reminder' | 'vaccine_reminder' | 'followup_reminder' | 'tci_pending_tutor' | ...)
title VARCHAR
body TEXT
scheduled_for TIMESTAMPTZ
is_read BOOLEAN DEFAULT false
is_active BOOLEAN DEFAULT true
data JSONB                           -- { route?: string, tci_id?: string, ... }
created_at TIMESTAMPTZ DEFAULT NOW()
```

### i18n Keys

```
reminders.title                       "Lembretes"
reminders.emptyTitle                  "Nenhum lembrete"
reminders.emptyDesc                   "Você está em dia com tudo"
```

---

## Breed Intelligence Elite (NEW 2026-04-26)

### Visão Geral

Feed personalizado por raça com conteúdo editorial, posts de tutores, e recomendações IA. Feature elite-gated (requer `feature_breed_intelligence = true` em subscription_plans).

### Fluxo

```
1. Tutor seleciona pet com raça X (ex: Chihuahua)
   ↓
2. App fetches breed-feed EF com pet_id
   ↓
3. Servidor busca raça/espécie do pet, retorna posts ordenados:
   urgency DESC → ai_relevance_score DESC → published_at DESC
   ↓
4. Tutor scrolls (infinite query com cursor pagination)
   ↓
5. Tutor toca post → `/pet/[id]/breed-intelligence/[postId]` → view details + comments
   ↓
6. Tutor pode:
   - Criar post (STT input)
   - Comentar em post (STT input)
   - React (like/heart)
   - Traduzir post (breed-translate-post EF)
```

### Telas

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| **Breed Feed** | `app/(app)/pet/[id]/breed-intelligence/index.tsx` | Infinite scroll feed, filter by post_type, elite gating (403 → paywall) |
| **Post Detail** | `app/(app)/pet/[id]/breed-intelligence/[postId].tsx` | Show post + comments, create comment, reactions |

### Hooks

**`useBreedIntelligence()` (NEW)**
```typescript
export function useBreedIntelligence(petId: string) {
  return {
    // Feed
    feed: useInfiniteQuery({
      queryKey: ['breed-feed', petId],
      queryFn: ({ pageParam }) => 
        supabase.functions.invoke('breed-feed', {
          body: { pet_id: petId, cursor: pageParam }
        }),
    }),
    
    // Create post (STT input, media pre-uploaded)
    createPost: useMutation(async (input) => 
      supabase.functions.invoke('breed-post-create', { body: input })
    ),
    
    // Create comment
    createComment: useMutation(async (input) =>
      supabase.functions.invoke('breed-comment-create', { body: input })
    ),
    
    // React (like/heart) — direct upsert, no EF
    react: useMutation(async ({ postId, type }) =>
      supabase.from('breed_post_reactions')
        .upsert({ post_id: postId, user_id, reaction_type: type })
    ),
  };
}
```

### Edge Functions (See EDGE_FUNCTIONS.md § Breed Intelligence)

- `breed-feed` — Fetch feed (elite-gated)
- `breed-post-create` — Create post
- `breed-comment-create` — Add comment
- `breed-translate-post` — Translate to user's language
- `breed-editorial-generate` — Admin: generate editorial content

### Database Tables

**`breed_feed_posts` (new):**
```sql
id UUID PRIMARY KEY
pet_id UUID REFERENCES pets(id) (nullable, null for editorial)
created_by UUID REFERENCES users(id)
post_type VARCHAR ('editorial' | 'tutor' | 'recommendation')
source VARCHAR (nullable, URL if external)
title VARCHAR (nullable)
body TEXT
ai_caption TEXT (required — summary by IA)
ai_tags TEXT[] (detected topics)
urgency VARCHAR ('none' | 'low' | 'medium' | 'high' | 'critical')
ai_relevance_score DECIMAL (0-1, for pet breed matching)
media_urls TEXT[] (URLs to images/videos in Storage)
media_thumbnails TEXT[]
target_breeds TEXT[] (which breeds this applies to)
target_species VARCHAR ('dog' | 'cat' | 'all')
published_at TIMESTAMPTZ
is_active BOOLEAN DEFAULT true
```

**`breed_post_reactions` (new):**
```sql
id UUID PRIMARY KEY
post_id UUID REFERENCES breed_feed_posts(id)
user_id UUID REFERENCES users(id)
reaction_type VARCHAR ('like' | 'heart' | 'helpful' | 'concerns')
created_at TIMESTAMPTZ
UNIQUE (post_id, user_id, reaction_type)
```

**`breed_post_comments` (new):**
```sql
id UUID PRIMARY KEY
post_id UUID REFERENCES breed_feed_posts(id)
created_by UUID REFERENCES users(id)
body TEXT
media_urls TEXT[] (optional)
published_at TIMESTAMPTZ
is_active BOOLEAN DEFAULT true
```

### Elite Gating

Breed-feed EF returns 403 if:
```sql
NOT (SELECT feature_breed_intelligence FROM subscription_plans WHERE user_id = auth.uid)
```

UI also checks via `subscription_plans` query to hide entry point (Breed tab) before user clicks.

### i18n Keys

```
breed.feedTitle                       "Inteligência de Raça"
breed.feedDesc                        "Conteúdo personalizado para sua raça"
breed.filterAll                       "Todos"
breed.filterEditorial                 "Editorial"
breed.filterTutor                     "Tutores"
breed.filterRecommendation            "Recomendado"
breed.postCreatePlaceholder           "Compartilhe uma experiência com sua {breed}..."
breed.commentPlaceholder              "Escreva um comentário..."
breed.urgencyCritical                 "Crítico"
breed.urgencyHigh                     "Alto"
breed.urgencyMedium                   "Médio"
breed.urgencyLow                       "Baixo"
breed.reactionLike                    "Útil"
breed.reactionHeart                   "Amei"
breed.reactionConcerns                "Preocupa"
```

---

## Pet Documents (NEW 2026-04-26)

### Visão Geral

Central repository de todos os documentos do pet (carteira de vacina, exames, receitas, TCIs, carteira de identidade). Download, share, view metadata.

### Tela

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| **Documents List** | `app/(app)/pet/[id]/documents.tsx` | Aggregate view of documents from multiple tables, download, share, scan new |

### Document Types

| Tipo | Tabela | Campos |
|------|--------|--------|
| Carteira Vacina | `vaccines` | name, date, lote, vet_name |
| Exame | `exams` | exam_type, date, result, vet_name |
| Receita | `medications` | medication_name, dosage, frequency, issued_date |
| TCI | `termos_consentimento` | procedure_type, tutor_signed_at, professional_signed_at |
| Identidade | Gerado PDF | microchip, photo, tutor contact |
| Consulta | `consultations` | consultation_type, date, vet_name, notes |

### PDF Export

**`lib/petDocumentsPdf.ts` (new)**
```typescript
export async function generatePetDocumentsPDF(petId: string): Promise<string> {
  // Aggregate documents from all sources
  // Generate multi-page PDF with cover + all documents
  // Return base64 for sharing
}
```

### Scan New Document

**`components/DocumentScanner.tsx` (new)**
```typescript
// Camera → capture photo of document
// Invoke ocr-document EF (or classify-diary-entry with input_type='ocr_scan')
// Parse structured data
// Show form for manual correction
// Save to appropriate table
```

### i18n Keys

```
documents.title                       "Documentos"
documents.emptyTitle                  "Nenhum documento"
documents.emptyDesc                   "Carregue seus primeiros documentos"
documents.scanNew                     "Escanear Novo"
documents.downloadAll                 "Baixar Todos"
documents.shareAll                    "Compartilhar"
documents.dateAdded                   "Adicionado em {date}"
```

---

## Professional Module — Fase 2: AI Agents (NEW 2026-04-26)

### Visão Geral

7 AI agents que ajudam profissionais a gerar documentos clínicos (TCI, anamnese, prontuário, receituario, alta, ASA, notificações). Cada agent:
- Receives pet clinical context (RAG-enriched)
- Generates draft document via IA
- Professional reviews + edits
- Saves + e-signature

### Agents

| Agent | Arquivo | Entrada | Saída | Exemplo |
|-------|---------|---------|-------|---------|
| **TCI** | `professional/agents/tci.tsx` | Procedimento desc | TCI completo | Castração, Ultrassom, Biópsia |
| **Anamnese** | `professional/agents/anamnese.tsx` | Pet history | Anamnese estruturada | Histórico de queixa, sinais clínicos |
| **Prontuário** | `professional/agents/prontuario.tsx` | Exame físico notes | Prontuário estruturado | Exame cardiopulmonar, abdômen, neurológico |
| **Receituario** | `professional/agents/receituario.tsx` | Diagnóstico + medicações | Receita formatada | Doses, frequência, duração |
| **Alta** | `professional/agents/alta.tsx` | Tratamento summary | Documento de alta | Repouso, medicações, acompanhamento |
| **ASA** | `professional/agents/asa.tsx` | Medical history | ASA score (I-V) | Avaliação de risco anestésico |
| **Notificação** | `professional/agents/notificacao.tsx` | Pet clinical status | Alert/reminder | Vacinação atrasada, acompanhamento pendente |

### Telas

| Tela | Arquivo | Responsabilidade |
|------|---------|-----------------|
| **Agents Index** | `professional/agents/index.tsx` | Grid of 7 agents, tap → agent detail |
| **Agent Detail** | `professional/agents/{agent}.tsx` | Form with STT input, IA draft generation, review + edit, save + sign |

### Hooks

**`useProAgent(agentType: 'tci' | 'anamnese' | ...) (NEW)`**
```typescript
export function useProAgent(agentType: string, petId: string) {
  return {
    // Draft generation
    generate: useMutation(async (input) =>
      supabase.functions.invoke(`pro-agent-${agentType}`, { body: { pet_id: petId, ...input } })
    ),
    isDrafting: boolean,
    
    // Save + sign
    save: useMutation(async (content) =>
      supabase.rpc(`professional_save_${agentType}`, { p_pet_id: petId, p_content: content })
    ),
    isSaving: boolean,
    
    // Get clinical context (RAG)
    context: PetClinicalContext,
    isLoadingContext: boolean,
  };
}
```

### Edge Functions (7 new)

Each agent-specific EF:
1. Validates professional has pet access (via `has_pet_access()`)
2. Fetches clinical context (pet profile + RAG top K memories)
3. Calls Claude with agent-specific prompt
4. Returns draft (not saved until professional confirms)

Example: `pro-agent-tci` (hypothetical naming):
```typescript
Input:
{
  pet_id: string;
  procedure_type: string;         // "Castração"
  procedure_description: string;  // Details from professional
}

Output:
{
  draft: {
    procedure_type: string;
    procedure_description: string;
    risks_described: string;       // Generated by IA
    alternatives_described: string; // Generated by IA
  }
}
```

### Professional Registration

**`professional/register.tsx` (new)**
```
1. Scan credential via camera (expo-camera)
2. Call scan-professional-document EF → extract metadata
3. Show form pre-filled with: full_name, council_number, specialties, valid_until
4. Professional can edit/correct
5. Save to professionals table
6. Accept T&C + submit for verification
```

### Database Tables

**`professionals` (existing from Fase 1):**
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES users(id) UNIQUE
display_name VARCHAR
council_name VARCHAR (CRMV, CRP, etc.)
council_number VARCHAR
council_uf VARCHAR
country VARCHAR
specialties TEXT[]
valid_until DATE
verification_status VARCHAR ('pending' | 'verified' | 'rejected')
verified_at TIMESTAMPTZ
credential_document_url VARCHAR (Storage path)
is_active BOOLEAN DEFAULT true
```

**`professional_documents` (new, for saved agent outputs):**
```sql
id UUID PRIMARY KEY
professional_id UUID REFERENCES professionals(id)
pet_id UUID REFERENCES pets(id)
agent_type VARCHAR ('tci' | 'anamnese' | 'prontuario' | 'receituario' | 'alta' | 'asa' | 'notificacao')
title VARCHAR
content TEXT (markdown or structured)
is_signed BOOLEAN DEFAULT false
signed_at TIMESTAMPTZ (nullable)
signature_data JSONB (e-signature metadata)
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
is_active BOOLEAN DEFAULT true
```

### i18n Keys

```
professional.title                    "Profissional"
professional.registerTitle            "Registro Profissional"
professional.scanCredential           "Escanear Credencial"
professional.fullName                 "Nome Completo"
professional.councilNumber            "Número do Conselho"
professional.specialties              "Especialidades"
professional.validUntil               "Válido Até"

agents.index.title                    "Assistentes de Documentação"
agents.index.desc                     "IA-powered document generation"
agents.tci.label                      "TCI"
agents.tci.desc                       "Termo de Consentimento Informado"
agents.anamnese.label                 "Anamnese"
agents.anamnese.desc                  "História Clínica"
agents.prontuario.label               "Prontuário"
agents.prontuario.desc                "Registro Clínico"
agents.receituario.label              "Receituário"
agents.receituario.desc               "Prescrição"
agents.alta.label                     "Alta"
agents.alta.desc                      "Documento de Alta"
agents.asa.label                      "ASA"
agents.asa.desc                       "Score de Risco Anestésico"
agents.notificacao.label              "Notificação"
agents.notificacao.desc               "Alertas e Lembretes"

agents.generating                     "Gerando rascunho..."
agents.draft                          "Rascunho"
agents.saveAndSign                    "Salvar e Assinar"
agents.editDraft                      "Editar Rascunho"
```

---

## Professional Document Scanning (NEW 2026-04-26)

### Visão Geral

Helper Edge Function `scan-professional-document` para OCR de credenciais profissionais (carteira de conselho, diploma). Usado na tela de registro e na app-side medical document scanning.

**Decisão arquitetural:** Separado de `analyze-pet-photo` (protected file, motor central). Segue CLAUDE.md: "criar arquivo SEPARADO que reuse o protegido — não mexer no original".

### Features

- Claude Vision (model chain: opus-4-7 → opus-4-6 → sonnet-4-6)
- Extracts: document_type, full_name, council_name, council_number, council_uf, specialties, valid_until, institution, confidence
- Self-contained (não importa de `_shared`)
- Inline telemetria (minimal logging)

### Usage

**Professional Registration:**
```typescript
const photo_base64 = await captureCredentialPhoto();
const result = await supabase.functions.invoke('scan-professional-document', {
  body: { photo_base64, language: i18n.language }
});
// Pre-fill form with result.full_name, result.council_number, etc.
```

---

## Checklist de Conformidade

- [x] **i18n:** Zero strings hardcoded
- [x] **Responsividade:** NUNCA pixels fixos, sempre `rs()/fs()`
- [x] **Hooks:** Todos ANTES de early returns
- [x] **ErrorBoundary:** Global + por seção crítica
- [x] **Try/catch:** Toda operação async
- [x] **React Query:** Cache automático + retry
- [x] **Offline:** Fila + cache persistente
- [x] **Optional chaining:** Todos dados remotos (`?.`)
- [x] **Mensagens:** Tom de voz do pet (empático, nunca técnico)
- [x] **Validação:** Zod nas bordas (entrada de API)
- [x] **Ícones:** Lucide (nunca emojis)

---

**Related Docs:**
- [CLAUDE.md](../CLAUDE.md) — Especificação completa
- [README.md](../../README.md) — Status e setup
- [Tabelas.md](../Tabelas.md) — Schema detalhado
