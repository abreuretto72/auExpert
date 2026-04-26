# auExpert Codemaps Index

**Last Updated:** 2026-04-26
**Scope:** MVP Phase (+ Nutrition Module + Prontuário Vet-Grade + Health Modals Input-First + Invite System + iOS Font Fixes + STT Improvements + AI Chat Redesign + PDF Exports + Partnerships + Professional Module Fase 1 + Diary & Health Component Refactor + Agenda Actions + Pet Deletion + Breed Intelligence Elite + TCI Signing Flow + Reminders & Pending Signatures + Professional Agents Dashboard + Pet Documents + Professional Document Scanning)

---

## Overview

This directory contains comprehensive architectural documentation for the auExpert codebase. Each codemap is a living reference that reflects the actual state of the code.

**Key Principle:** Documentation is **generated from code, not theoretical**. If you find documentation that doesn't match reality, update both the code and docs together.

---

## Latest Changes (2026-04-26)

### New Screens & Modules

**TCI (Termo de Consentimento Informado) Digital Signing:**
- `app/(app)/pending-signatures.tsx` — List of TCIs awaiting tutor signature (pending/signed/all filters)
- `app/(app)/tci-sign.tsx` — Full TCI review + biometric signature (expo-local-authentication)
- **Features:** Procedimento type, description, risks, alternatives, tutor signature timestamp
- **Integration:** Triggered via push notification with tci_id parameter
- **Related Hook:** `useProSignature()` — manage TCI signature state
- **RPC:** `tutor_sign_tci(p_tci_id)` — atomically update tutor_signed_at + trigger professional notification

**Reminders Management Screen:**
- `app/(app)/reminders.tsx` — Central hub for all reminders (medication_reminder, followup_reminder, tci_pending_tutor, vaccine_reminder)
- **Features:** Filter by status (read/unread), icon mapping per type, tap to navigate to related resource, mark as read
- **Data Source:** `notifications_queue` table (is_active=true, is_read=false)
- **Related Hook:** `useNotifications()` — fetch + mark as read mutations

**Breed Intelligence (Elite Feature):**
- `app/(app)/pet/[id]/breed-intelligence/index.tsx` — Infinite scroll feed of breed-specific posts (editorial/tutor/recommendation)
- `app/(app)/pet/[id]/breed-intelligence/[postId].tsx` — Detailed post view + comments
- **Features:** Filter by post type, urgency-based ordering, elite gating (403 if not Elite), STT input for posts/comments
- **Related Hook:** `useBreedIntelligence()` — useInfiniteQuery (breed-feed), createPost, createComment, react mutations
- **Related Edge Functions:** `breed-feed`, `breed-post-create`, `breed-comment-create`, `breed-translate-post`, `breed-editorial-generate`

**Pet Documents Screen:**
- `app/(app)/pet/[id]/documents.tsx` — Aggregate view of all pet documents (carteira vacina, exames, receitas, TCIs)
- **Features:** Download PDFs, share, view metadata, scan new document via camera
- **Related Hook:** `usePetDocuments()` — fetch documents from multiple tables

**Professional Dashboard & Agents:**
- `app/(app)/professional/dashboard.tsx` — Professional view of patients (read-only clinical view vs tutor view)
- `app/(app)/professional/agents/index.tsx` — Index/overview of 7 AI agents
- `app/(app)/professional/agents/tci.tsx` — TCI creation agent (AI generates TCI from procedure description)
- `app/(app)/professional/agents/anamnese.tsx` — Anamnese (patient history) agent
- `app/(app)/professional/agents/prontuario.tsx` — Clinical record agent
- `app/(app)/professional/agents/receituario.tsx` — Prescription agent
- `app/(app)/professional/agents/alta.tsx` — Discharge/conclusion agent
- `app/(app)/professional/agents/asa.tsx` — ASA (anesthetic risk) score agent
- `app/(app)/professional/agents/notificacao.tsx` — Notification/alert agent
- **Features:** AI-assisted document generation, STT input, clinical context from RAG, professional e-signature
- **Related Hooks:** `useProAgent()`, `useProfessionalCapabilities()` — manage agent state + permissions
- **Related Edge Functions:** `scan-professional-document` (OCR credentials), 7 agent-specific EFs

**Professional Registration:**
- `app/(app)/professional/register.tsx` — Onboarding flow for professionals (scan credentials, verify council, accept T&C)

### New Edge Functions (2026-04-26)

**Professional-Grade:**
- `scan-professional-document` — OCR of council credentials (self-contained, separate from analyze-pet-photo)
- `reembed-diary-rich` — Regenerate embeddings with enriched context
- `reembed-pet-multi` — Batch re-embed all diary entries for a pet (admin function)
- `send-invite-email` — Send professional/tutor invite links via email

**Breed Intelligence (8 functions):**
- `breed-feed` — Personalized breed-specific content feed (elite-gated)
- `breed-post-create` — Create post in breed feed
- `breed-comment-create` — Add comment to breed post
- `breed-translate-post` — Translate post to tutor's language
- `breed-editorial-generate` — Generate editorial AI content (admin CRON)

### New Hooks (2026-04-26)

- `useBreedIntelligence()` — Feed + post/comment creation + reactions
- `useProAgent()` — Manage AI agent state (TCI, anamnese, prontuário, receituario, alta, ASA, notificação)
- `useProSignature()` — TCI signature state + biometric confirmation
- `usePetAgentAccess()` — Check if professional has pet access + permissions
- `useProfessionalCapabilities()` — Available agents + capabilities based on role/subscription

### i18n Additions (2026-04-26)

- `pendingSignatures.*` — Filter labels, empty states, status badges
- `reminders.*` — Title, empty states, reminder type labels
- `agents.tci.tutor.*` — TCI signing flow (review, biometric, confirmation)
- `breed.*` — Feed titles, post creation, comment prompts
- `professional.*` — Dashboard, agent names, role labels

---

## Previous Changes (2026-04-23)

### Component Architecture Refactoring
- **Diary New Entry:** Moved from `app/(app)/pet/[id]/diary/_new/` to `components/diary/new/`
  - **New structure:** `components/diary/new/` with 11 utility modules (attachmentHandlers, confirmHandlers, editHandlers, handleSubmitText, stt, animations, compressPhoto, types, styles, DotsText, PainelLentes)
  - Decouples diary logic from routing layer, enables code reuse and easier testing
  
- **Health Module:** Moved from `app/(app)/pet/[id]/_health/` to `components/health/`
  - **New structure:** `components/health/` with `BloodTypeInfoModal.tsx`, `components/` and `tabs/` subdirectories
  - Centralizes health UI logic for reuse across screens

### Agenda Actions System — New Hook (`hooks/useAgendaActions.ts`)
- **Mutations:** `confirm`, `markDone`, `cancel`, `reschedule`, `silenceReminders`
- **Auto-invalidation:** Updates React Query cache for `['pets', petId, 'lens', 'agenda']`
- **Notification integration:** Calls `scheduleAgendaReminders()`, `cancelAgendaReminders()`, `silenceEventReminders()`, `unsilenceEvent()`
- **Usage:** `const { confirm, reschedule, silenceReminders } = useAgendaActions(petId, petName)`

### Agenda Lens Improvements (`components/lenses/AgendaLensContent.tsx`)
- **Calendar dots:** Colored dots per day showing event priorities (vaccine, exam, medication, etc.)
- **Month navigation:** Chevron left/right to browse months
- **Day detail panel:** Scrollable list of events for selected day (always visible below calendar)
- **Action buttons:** Confirm, reschedule, cancel, silence reminders inline on each event
- **Safe area:** Fixed SafeAreaView padding to prevent bottom nav overlap
- **i18n keys:** New `agenda.actionConfirm`, `agenda.actionReschedule`, `agenda.actionCancel`, `agenda.actionSilence`

### Pet Deletion Edge Function (2026-04-22)
- **New function:** `supabase/functions/delete-pet/`
- **Behavior:** Soft-delete cascade across 18 related tables (diary_entries, vaccines, expenses, etc.)
- **Auth:** Bearer token validation via `auth.getUser(token)`
- **Logging:** Success/error logs with petName, userId, affected tables
- **Error handling:** Non-fatal table-level errors (some tables may not have `is_active` column)
- **Related code:** `lib/api.ts:deletePet()` calls this function

### i18n Additions (2026-04-23)
- **Agenda keys** (pt-BR, en-US): Action labels, reminder notifications, weekday abbreviations
- **Notification reminders:** `agenda_24h_title`, `agenda_1h_title`, `agenda_now_title`, `agenda_allday_title`
- **Lens labels:** `agenda.actionConfirm`, `agenda.actionReschedule`, `agenda.actionCancel`, `agenda.actionSilence`
- See [I18N.md § Agenda Keys](./I18N.md#agenda-keys-2026-04-23) for complete list

---

## Previous Changes (2026-04-21)

### Professional Module — Fase 1 (Core Infrastructure)
- **New Tables:** `professionals`, `access_grants`, `role_permissions`, `professional_signatures`, `access_audit_log`
- **New Screens:** `/pro/index` (Meus Pacientes), `/pro/onboarding`, `/pro/pet/[id]` (clinical view), `/invite/[token]` (accept invite), `/partnerships` (tutor side)
- **New Hooks:** `useProfessional()`, `useMyPatients()`, `useProClinicalBundle()`, `useProDiaryBundle()`, `useTutorPartnerships()`
- **New Component:** `PatientCard.tsx` (read-only clinical view)
- **New Edge Functions:** `professional-invite-{create,accept,cancel,expire}` + `accept-pet-invite`, `invite-pet-member`, `invite-web`
- **New i18n Keys:** `pro.*` (20+ keys), `roles.*` (10 AccessRole labels), `partnerships.*` (56 keys)
- **RLS & Auth:** Centralized `has_pet_access(pet_id, permission)` function, ES256/HS256 JWT validation in Edge Functions
- See [ARCHITECTURE.md § Professional Module](./ARCHITECTURE.md#professional-module-fase-1-2026-04-21-new) for complete architecture
- See [screens-catalog.md § Professional Module](#professional-module-fase-1) for UI breakdown

---

## Previous Changes (2026-04-20)

### Prontuário Vet-Grade PDF System
- **Redesigned `lib/prontuarioPdf.ts`** — 7-section report with colored cover + clinical B&W body
- **6-tab prontuário screen** — Geral, Saúde, Prevenção, Sinais, Raça, Emergência
- **Cover page:** Pet photo, identity pills, vaccine status, tutor contact info
- **Clinical body (pages 2-7):** AI summary + alerts, vitals, vaccines + active meds, allergies + chronic + surgeries, BCS (WSAVA 1-9) + parasite control + preventive calendar, body-system review + breed predispositions + drug interactions + exam abnormal flags, emergency card + trusted vets
- **New i18n keys:** ~81 keys per language for tabs, BCS scale, parasite types, chronic records, body systems, breed predispositions, drug interactions, exam flags, preventive calendar
- See [screens-catalog.md § Prontuário](../screens-catalog.md#appapppetidprontuariotsx) for tab breakdown

---

## Previous Changes (2026-04-19)

### AI Chat Redesign
- "Assistente" tab renamed to "Minha IA"
- Full conversation interface with STT input
- Fixed microphone hang (removed `continuous: true`)
- PDF export for chat history
- See [ARCHITECTURE.md § IA Tab](./ARCHITECTURE.md#IA-tab--insights--chat-2026-04-19-refactor)

### PDF Export Expansion
- **Diário PDF:** Full diary export with all entries + narration
- **IA Chat PDF:** Conversation history export
- New *-pdf.tsx screen pattern for all exports
- See [ARCHITECTURE.md § PDF Export System](./ARCHITECTURE.md#pdf-export-system)

### Partnerships System
- Placeholder screen for future partner network
- TutorCard now links to `/partnerships` (Handshake icon)
- Removed XP/gamification system
- See [ARCHITECTURE.md § Partnerships System](./ARCHITECTURE.md#partnerships-system-2026-04-19-new)

### PetCard Redesign
- First stat box is now AI Chat shortcut
- Stat boxes use solid accent background + white icons
- Cleaner, more action-oriented layout

---

## Codemaps

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md)
**The master blueprint of the app.**

- System architecture (Telas > Hooks > Stores > API > Lib)
- Data flow (queries, mutations, state management)
- Module responsibilities (useAuth, usePets, useDiary, useHealth, usePetAssistant, useInsights)
- React Query setup (cache, retry, staleTime, gcTime)
- Zustand stores (authStore, uiStore)
- Resiliency patterns (ErrorBoundary, try/catch, retry, offline)
- **AI Chat system** (2026-04-19) — IATab with STT + conversation history
- **PDF export system** — Master template + 4 report types (diary, IA chat, prontuário, cardápio)
- **Partnerships** (2026-04-19) — Placeholder for future partner network
- Push notifications
- Database schema (13 tables MVP)
- Edge Functions (Deno serverless)

**When to read:**
- Understanding overall system design
- How data flows through the app
- Which files are responsible for what
- When to add a new feature
- When debugging cross-module issues

---

### 2. [I18N.md](./I18N.md)
**Complete internationalization system.**

- i18n file structure and setup
- Key hierarchy (common.*, auth.*, pets.*, diary.*, etc.)
- All ~1400 keys documented with examples
- Usage in function + class components
- Tone of voice guide (pet's perspective)
- Error message mappings (technical → human)
- How to add a new language
- Validation scripts

**When to read:**
- Adding a new string to the UI
- Translating messages to other languages
- Understanding tone/voice guidelines
- Fixing hardcoded strings (should be i18n keys)

**Key Rule:** ZERO strings hardcoded. **ZERO.** Everything is a key.

---

### 3. [RESPONSIVENESS.md](./RESPONSIVENESS.md)
**Responsive design system for all screen sizes.**

- Design base (iPhone 14 @ 390px)
- Scale factors for all devices (0.82x to 1.91x)
- Four responsive functions: `rs()`, `fs()`, `wp()`, `hp()`
- Layout helpers: useContentWidth, useCalendarCellWidth, useSafeBottom, etc.
- Real-world examples (cards, navigation, grids, inputs)
- Common mistakes and how to avoid them
- Safe area insets for notches/home indicators
- Debugging responsive values

**When to read:**
- Adding new screens or components
- Fixing layout on small/large devices
- Understanding responsive scaling
- Debugging "looks fine on my phone, broken on iPad" issues

**Key Rule:** NEVER hardcode pixels. **NEVER.** Always use `rs()`.

---

### 4. [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) — NEW (2026-04-11)
**Serverless function architecture and JWT authentication.**

- Core functions: classify-diary-entry, analyze-pet-photo, generate-embedding, search-rag
- ES256/HS256 JWT authentication pattern
- validateAuth() internal enforcement via config.toml
- Error handling, logging conventions, performance tuning
- Background invocation with Bearer token
- Detailed logging for debugging auth issues

**When to read:**
- Calling Edge Functions from mobile app
- Debugging "Unauthorized 401" errors
- Understanding AI pipeline (classification, photo analysis)
- Adding new serverless function
- Configuring JWT validation

**Key Pattern:** `verify_jwt = false` in config.toml + `validateAuth()` in function code.

---

## Quick Reference

### Add a New String (UI)

1. Read: [I18N.md § Struktur de Chaves](./I18N.md#estrutura-de-chaves)
2. Add key to `i18n/pt-BR.json` and `i18n/en-US.json`
3. Use in component: `const { t } = useTranslation(); <Text>{t('myKey')}</Text>`
4. Verify: run `scripts/validate-i18n.js` (TBD)

---

### Add a New Screen

1. Read: [ARCHITECTURE.md § Camadas](./ARCHITECTURE.md#camadas-da-arquitetura)
2. Create file in `app/`
3. Use `useXxx()` hooks to fetch data (never `lib/` directly)
4. Use responsive functions: `rs()`, `fs()`, `wp()`, `hp()`
5. Use i18n keys: `t('myKey')`
6. Wrap with ErrorBoundary (already in root layout)

---

### Debug Layout Issues

1. Read: [RESPONSIVENESS.md § Common Mistakes](./RESPONSIVENESS.md#common-mistakes)
2. Check: All dimensions use `rs()`, `fs()`, `wp()`, `hp()`
3. Check: Safe area insets on bottom nav / modals
4. Test: iPhone SE (320px) + iPad (744px)
5. Use: Debug console to log responsive values

---

### Add a New Data Fetch (Query)

1. Read: [ARCHITECTURE.md § Fluxo de Dados](./ARCHITECTURE.md#fluxo-de-dados)
2. Add fetch function to `lib/api.ts`
3. Create hook in `hooks/useXxx.ts` with `useQuery`
4. Add query key to structured keys (TBD)
5. Use in component: `const { data, isLoading } = useXxx()`
6. Handle loading with Skeleton, error with toast

---

### Add a New Data Mutation (Write)

1. Read: [ARCHITECTURE.md § Fluxo de Dados](./ARCHITECTURE.md#fluxo-de-dados)
2. Add API call to `lib/api.ts`
3. Create hook in `hooks/useXxx.ts` with `useMutation`
4. Implement optimistic update (update cache immediately)
5. Use in component: `const { mutateAsync, isPending } = useXxx(); await mutateAsync(data)`
6. Handle error with getErrorMessage() → i18n toast

---

## File Organization

```
docs/CODEMAPS/
├── INDEX.md              (this file — navigation hub)
├── ARCHITECTURE.md       (system design + modules + JWT auth)
├── EDGE_FUNCTIONS.md     (serverless functions + auth patterns)
├── I18N.md               (translations + tone)
├── RESPONSIVENESS.md     (screen scaling)
└── (future: DATABASE.md, PERFORMANCE.md, TESTING.md, OFFLINE.md, SECURITY.md)
```

---

## Key Files to Know

### Core
- `app/` — Screens (Expo Router)
- `components/` — UI components
- `hooks/` — Data hooks (useAuth, usePets, useDiary, etc.)
- `stores/` — Zustand (UI state only)
- `lib/api.ts` — Pure fetch functions
- `lib/queryClient.ts` — React Query setup

### Configuration
- `i18n/{pt-BR,en-US}.json` — Translations (~1400 keys)
- `constants/colors.ts` — Design tokens (dark theme)
- `constants/spacing.ts` — Responsive spacing + radii
- `types/database.ts` — TypeScript interfaces (from Supabase)

### Database
- `supabase/migrations/` — SQL migrations (13 tables)
- `supabase/functions/` — Edge Functions (Deno)

---

## Development Workflow

### 1. Plan
- [ ] Read relevant codemaps
- [ ] Sketch component/hook structure
- [ ] Plan i18n keys needed
- [ ] Plan responsive breakpoints

### 2. Build
- [ ] Add i18n keys first
- [ ] Use `rs()` for all dimensions
- [ ] Use `t()` for all strings
- [ ] Handle loading with Skeleton
- [ ] Handle errors with try/catch + toast

### 3. Test
- [ ] Run on iPhone SE (smallest)
- [ ] Run on iPad (largest)
- [ ] Test landscape orientation
- [ ] Verify no console errors
- [ ] Verify i18n keys exist

### 4. Document
- [ ] Update relevant codemap if structure changed
- [ ] Add JSDoc to exported functions
- [ ] Update README.md if major change

---

## Principles

### Single Source of Truth
Documentation is **generated from code**. Don't write docs independently.
- If code changes → update docs
- If docs are wrong → fix code

### Freshness Timestamps
All codemaps have a "Last Updated" date. Keep it current.

### Concrete Examples
Every concept has 2+ code examples. Theory only when needed.

### Action-Oriented
Docs answer: "What file do I edit?" and "What's the exact pattern?"

### Link Everything
Related docs are cross-referenced. No doc stands alone.

---

## Contributing to Codemaps

### When to Update

- **Architecture changes:** New module, new layer, new pattern
- **i18n additions:** New keys, new language, tone changes
- **Responsive changes:** New breakpoints, new helpers, new pattern
- **Database schema:** New tables, migrations, RLS changes

### How to Update

1. Read the relevant codemap
2. Update the code
3. Update the codemap to reflect new state
4. Update the "Last Updated" date
5. Cross-reference other docs if needed

### Template for New Codemaps

```markdown
# auExpert [TOPIC] Codemap

**Last Updated:** YYYY-MM-DD
**Status:** [Draft/Review/Complete]

---

## Overview

[What is this about? Who needs to know?]

---

## [Section 1]

[Content]

---

## [Section 2]

[Content]

---

## Checklist

- [ ] Item 1
- [ ] Item 2

---

**Related Docs:**
- [Link](./LINK.md) — Description
```

---

## Codemaps Roadmap (Future)

- [ ] **DATABASE.md** — Schema, relationships, RLS, indexes
- [ ] **PERFORMANCE.md** — React Query optimization, FlatList, memoization
- [ ] **TESTING.md** — Unit tests, integration tests, E2E (Playwright)
- [ ] **OFFLINE.md** — Cache persistence, mutation queue, sync strategy
- [ ] **SECURITY.md** — Auth, secrets, validation, RLS
- [ ] **DEPLOYMENT.md** — EAS Build, GitHub Actions, rollout strategy

---

## Quick Links

- **Source Code:** `https://github.com/abreuretto72/auExpert`
- **Main Spec:** [CLAUDE.md](../CLAUDE.md)
- **Setup Guide:** [README.md](../../README.md)
- **Status Board:** [Tabelas.md](../Tabelas.md)

---

**Maintained by:** Development team
**Questions?** Check the relevant codemap, then CLAUDE.md section by section.
