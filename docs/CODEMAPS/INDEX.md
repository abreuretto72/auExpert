# auExpert Codemaps Index

**Last Updated:** 2026-04-04
**Scope:** MVP Phase (Diário Inteligente + Co-Tutores + Auditoria + Registros Excluídos)

---

## Overview

This directory contains comprehensive architectural documentation for the auExpert codebase. Each codemap is a living reference that reflects the actual state of the code.

**Key Principle:** Documentation is **generated from code, not theoretical**. If you find documentation that doesn't match reality, update both the code and docs together.

---

## Codemaps

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md)
**The master blueprint of the app.**

- System architecture (Telas > Hooks > Stores > API > Lib)
- Data flow (queries, mutations, state management)
- Module responsibilities (useAuth, usePets, useDiary, useHealth)
- React Query setup (cache, retry, staleTime, gcTime)
- Zustand stores (authStore, uiStore)
- Resiliency patterns (ErrorBoundary, try/catch, retry, offline)
- PDF export system
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
├── INDEX.md              (this file)
├── ARCHITECTURE.md       (system design + modules)
├── I18N.md               (translations + tone)
├── RESPONSIVENESS.md     (screen scaling)
└── (future: DATABASE.md, PERFORMANCE.md, TESTING.md)
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
