# auExpert Architecture Codemap

**Last Updated:** 2026-04-11
**Status:** MVP Phase — Diário Inteligente + Co-Tutores + OCR + Audio/Video Analysis + Model Separation + Video Thumbnails + JWT ES256 Fix

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

## PDF Export (`lib/pdf.ts`)

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

**Relatórios implementados:**
- Diário completo (todas as entradas + narração)
- Prontuário de saúde (vacinas, alergias, exames)
- Análise de foto IA
- Perfil do pet
- Carteirinha (QR code)

**Uso:**
```typescript
import { previewPdf } from '../lib/pdf';

await previewPdf({
  title: 'Diário de Mana',
  subtitle: 'Jan 2026',
  bodyHtml: '<h1>Conteúdo</h1>',
  language: i18n.language,
});
```

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
