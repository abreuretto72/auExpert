# auExpert Architecture Codemap

**Last Updated:** 2026-04-04
**Status:** MVP Phase — Diário Inteligente + Co-Tutores

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

**Mutations:**
- `addEntry(petId, data)` — nova entrada com narração IA
  - Salva texto/foto/audio → gera embedding → fetch Claude para narração
  - Componente: `components/diary/InputSelector.tsx` (8 modos entrada)
  - Edge function: `generate-diary-narration`
- `updateEntry(entryId, data)` — edita texto + renarrativiza
- `deleteEntry(entryId)` — soft delete

**Narração IA:**
```typescript
// Edge function: supabase/functions/generate-diary-narration/index.ts
Request: { text, petName, breed, humor, language, topMemories }
Response: { narration: "Eca! Que dia legal..." }  // Máx 50 palavras, voz do pet
```

**i18n keys:**
- `diary.*` — entrada, narração, filtros, help
- `diary.help{Voice,Photo,Scanner,Document,Video,Gallery,Listen,Text}`

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
| `generate-diary-narration` | texto + pet + humor + memórias | narração IA (50 palavras) | Diário |
| `analyze-pet-photo` | foto base64 + pet | raça, humor, saúde | Diário (foto mode) |
| `bridge-health-to-diary` | vacina/alergia + pet | entrada diário automática | Saúde → Diário |
| `ocr-document` | documento PDF/foto | texto extraído | Carteira vacina |
| `send-reset-email` | email | link reset | Auth reset password |
| `classify-diary-entry` | entrada | tags, momento especial | Diário |
| `generate-personality` | histórico | traços de personalidade | Pet profile |
| `translate-strings` | texto + idioma | tradução | i18n dinâmica |

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
