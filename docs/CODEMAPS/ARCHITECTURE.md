# auExpert Architecture Codemap

**Last Updated:** 2026-04-06
**Status:** MVP Phase — Diário Inteligente + Co-Tutores + Photo Analysis Enhancements

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
  - Componente: `components/diary/InputSelector.tsx` (8 modos entrada)
  - Edge function: `classify-diary-entry` (primary) → `analyze-pet-photo` (foto mode)
- `updateEntry(entryId, data)` — edita texto + reclassifica
- `deleteEntry(entryId)` — soft delete com audit trail (deleted_by, deleted_at)
- `restoreEntry(entryId)` — restore de entry deletada (apenas owner/co_parent)

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

**Photo Analysis Pipeline:**
```typescript
// hooks/useDiaryEntry.ts → _photoAnalysis()
// 1. Extrai videoThumbnailUrl do vídeo (frame 1) — NOT o tutor's photo
// 2. Base64 encode foto
// 3. Busca bgSession token (para background invoke)
// 4. Chama analyze-pet-photo com: { photo_base64, species, language, media_type }
// 5. Retorna: { identification, health, mood, environment, alerts, toxicity_check, description }
// 6. Salva em photo_analyses table
// 7. photoResultsRaw: []→map() mantém índice posicional com fotos array
// [DIAG] logs para debugging análise
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

**DiaryCard display (`components/diary/TimelineCards.tsx`):**
```
Por você · 3 abr          ← registeredBy === currentUserId → "você"
Editado por Ana · 4 abr   ← only shown when updatedBy ≠ registeredBy
```
- Font: Sora 400, 10px, `textGhost`
- Data for display comes from `TimelineEvent.registeredByUser`, `updatedByUser` fields
- `diaryEntryToEvent()` in `timelineTypes.ts` maps the DB join columns to these fields

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

```
1. User submits diary text/voice (STT transcrived)
   ↓
2. classify-diary-entry Edge Function returns:
   - classifications[]: { type, confidence, extracted_data }
   - narration: "1ª pessoa do pet"
   - inferred_humor: string
   - tags: string[]
   ↓
3. For each classification: saveToModule()
   - type='vaccine' → INSERT vaccines
   - type='consultation' → INSERT consultations
   - type='medication' → INSERT medications
   - type='weight' → INSERT clinical_metrics
   - type='expense' → INSERT expenses
   - type='symptom' → store in diary_entry.symptoms_detected JSON
   ↓
4. createFutureEvent() if appointment detected
   ↓
5. generateEmbedding() + updatePetRAG()
```

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

## Edge Functions (Supabase)

**Deno serverless functions:**

| Função | Input | Output | Uso |
|--------|-------|--------|-----|
| `analyze-pet-photo` | { photo_base64, species, language, media_type } | { identification, health, mood, environment, alerts, toxicity_check, description } | Diário (foto mode) — Vision analysis |
| `classify-diary-entry` | { text, petId, language } | { classifications[], narration, humor, tags, moments } | Diário — IA classification |
| `generate-diary-narration` | { text, petName, breed, humor, language, topMemories } | { narration } | Fallback narração adicional |
| `bridge-health-to-diary` | { event_type, petId } | { diary_entry } | Saúde → Diário automático |
| `ocr-document` | { document_base64, language } | { extracted_text, structured_data } | Carteira vacina |
| `send-reset-email` | { email } | { status } | Auth reset password |
| `generate-personality` | { diaryEntries[], petId } | { personality_traits } | Pet profile |
| `translate-strings` | { text, language } | { translated_text } | i18n dinâmica |

**analyze-pet-photo Enhancements (2026-04-06):**
- **Content-aware:** Detecta se é pet direto, feces, plants, wounds, food, objects, environment
- **Obrigatório `description`:** Nunca null — resumo clínico apropriado ao conteúdo
- **Toxicity check:** Lista itens tóxicos com level (mild/moderate/severe)
- **Feces identification:** Color/consistency guide (yellow→rapid transit, black→bleeding, etc.)
- **Species parameter:** Passado do app (`species: 'dog'|'cat'`) para IA usar contexto correto
- **Language:** Responde sempre no idioma do tutor (`language: i18n.language`)
- **Removed `--no-verify-jwt`:** Gateway já verifica, function recebe request autenticada
- **JWT header:** App passa `bgAuthHeader` em background invocations (previne 401)

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
