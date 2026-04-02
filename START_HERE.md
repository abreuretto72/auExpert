# START HERE — auExpert Documentation Guide

**Lost? Confused? Don't know where to start?** You're in the right place.

---

## Quick Navigation (Pick Your Scenario)

### 👤 I'm a new developer joining the project
1. Read: [docs/CODEMAPS/INDEX.md](./docs/CODEMAPS/INDEX.md) (5 min overview)
2. Skim: [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) (bookmark this!)
3. Deep dive: [docs/CODEMAPS/ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md)
4. Setup: [README.md](./README.md#setup)

**Total time:** 30 minutes to understand the system

---

### 🚀 I need to add a new feature
1. Start: [docs/CODEMAPS/INDEX.md](./docs/CODEMAPS/INDEX.md) § Development Workflow
2. Plan: Which module? What data? What strings?
3. Reference: [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)
4. Build: Use patterns from [docs/CODEMAPS/ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md)
5. Verify: Run pre-commit checklist

**Total time:** Varies, but documentation shows exact patterns to follow

---

### 🐛 I'm reviewing code (pull request)
1. Quick check: [docs/QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) § Checklist Before Commit
2. Verify:
   - [ ] ZERO hardcoded strings (use i18n)
   - [ ] ZERO hardcoded pixels (use rs/fs)
   - [ ] Error handling with i18n messages
   - [ ] Safe area insets on bottom nav/modals
   - [ ] Responsive tested on SE + iPad
3. Deep dive: Link to relevant codemap if needed

**Total time:** 5 minutes for experienced reviewers

---

### 🎨 Layout looks broken on some devices
→ Read: [docs/CODEMAPS/RESPONSIVENESS.md](./docs/CODEMAPS/RESPONSIVENESS.md) § Common Mistakes

**Common problems:**
- Hardcoded pixels → Use `rs()` instead
- Using `Dimensions.get()` → Use `useWindowDimensions()` instead
- Missing safe area insets → Add `useSafeAreaInsets()` to bottom nav
- Not testing on small/large devices → Test on SE (320px) and iPad (744px)

---

### 🌍 I need to add strings or fix translations
→ Read: [docs/CODEMAPS/I18N.md](./docs/CODEMAPS/I18N.md)

**Key rule:** ZERO hardcoded strings. Everything is a i18n key.

**How to add a string:**
1. Find the right key category (common.*, auth.*, pets.*, etc)
2. Add to `i18n/pt-BR.json`
3. Add to `i18n/en-US.json` (same structure)
4. Use in component: `t('your.new.key')`

---

### ⚙️ I need to understand the system architecture
→ Read: [docs/CODEMAPS/ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md)

**Layers:**
```
Telas (screens) ↓
  Hooks (data) ↓
    Stores (UI state) / API (fetch) ↓
      Lib (integrations) ↓
        Constants / Types / Utils
```

**Pattern:** Telas import Hooks, never lib directly.

---

### 🏆 What are the critical rules?
→ Read: [START_HERE.md](./START_HERE.md) § Rules (you are here!)

---

## Critical Rules (Remember These!)

### Rule 1: NEVER Hardcode Strings
Every string visible to users MUST be in `i18n/{pt-BR,en-US}.json`

```typescript
// ❌ WRONG
<Text>Adicionar pet</Text>

// ✅ RIGHT
<Text>{t('pets.addNew')}</Text>
```

**Why?** Multi-language support. Consistency. Maintainability.

---

### Rule 2: NEVER Hardcode Pixels
Every dimension MUST use responsive functions.

```typescript
// ❌ WRONG
style={{ padding: 16, height: 56, fontSize: 14 }}

// ✅ RIGHT
import { rs, fs } from '../hooks/useResponsive';
style={{ padding: rs(16), height: rs(56), fontSize: fs(14) }}
```

**Why?** App scales from iPhone SE (320px) to iPad (744px). Fixed pixels break on different devices.

---

### Rule 3: Hooks BEFORE Early Returns
All React hooks must be declared before any early return.

```typescript
// ❌ WRONG — Causes "Rendered more hooks" crash
if (isLoading) return <Skeleton />;
const handleSave = useCallback(() => { ... });

// ✅ RIGHT
const handleSave = useCallback(() => { ... });
if (isLoading) return <Skeleton />;
```

**Why?** React hook rules. Breaking this = crash on certain renders.

---

### Rule 4: Layered Architecture
Imports flow downward only. Never upward.

```typescript
// ✅ OK: Screen imports hook
import { usePets } from '../hooks/usePets';

// ✅ OK: Hook imports api
import * as api from '../lib/api';

// ❌ WRONG: lib imports hook
import { usePets } from '../hooks/usePets';  // lib never does this!
```

**Why?** Clean dependency flow. Reusable modules. Testable code.

---

### Rule 5: User-Friendly Error Messages
Technical errors MUST be mapped to human messages.

```typescript
// ❌ WRONG
toast('Network timeout on POST /api/pets');

// ✅ RIGHT
import { getErrorMessage } from '../utils/errorMessages';
toast(getErrorMessage(error), 'error');
// Output: "Opa, caí da rede! Verifica o Wi-Fi e tenta de novo?"
```

**Why?** Users aren't developers. Be empathetic. Use pet's voice.

---

## File Locations Quick Map

| What | Where |
|---|---|
| **Screens** | `app/(app)/` or `app/(auth)/` |
| **UI Components** | `components/` |
| **Data Hooks** | `hooks/use*.ts` |
| **Pure Functions** | `lib/api.ts` |
| **External Integrations** | `lib/{supabase,auth,storage}.ts` |
| **Design Tokens** | `constants/{colors,spacing,fonts,moods,breeds}.ts` |
| **Translations** | `i18n/{pt-BR,en-US}.json` |
| **Type Definitions** | `types/{database,api}.ts` |
| **Error Mapping** | `utils/errorMessages.ts` |
| **Format Helpers** | `utils/format.ts` |
| **Tests** | `__tests__/` |
| **Mocks** | `__mocks__/` |

---

## Device Scales (Know These!)

| Device | Width | Scale | Notes |
|---|---|---|---|
| **iPhone SE** | 320px | 0.82x | Smallest — test here! |
| **iPhone 14** | 390px | 1.0x | Base design |
| **iPhone Pro** | 428px | 1.10x | Larger |
| **iPad Mini** | 744px | 1.91x | Largest — test here! |

**All dimensions scale automatically with `rs()`. Test on smallest (SE) and largest (iPad)!**

---

## Responsive Functions Cheat Sheet

| Function | Use | Example |
|---|---|---|
| `rs(24)` | Size, padding, margin, radius, icons | `height: rs(56)`, `<Icon size={rs(24)} />` |
| `fs(14)` | Font size only | `fontSize: fs(14)` |
| `wp(50)` | Width percentage | `width: wp(50)` (50% of screen) |
| `hp(80)` | Height percentage | `height: hp(80)` (80% of screen) |

**Import:**
```typescript
import { rs, fs, wp, hp } from '../hooks/useResponsive';
```

---

## Pre-Commit Checklist

Before you `git push`, verify:

- [ ] **No hardcoded strings** — All UI text uses `t('key')`
- [ ] **No hardcoded pixels** — All sizes use `rs()`, `fs()`, `wp()`, `hp()`
- [ ] **Hooks before returns** — All hooks declared before early returns
- [ ] **Error handling** — try/catch on async, toast with i18n message
- [ ] **Responsive tested** — Works on SE (320px) and iPad (744px)
- [ ] **Skeleton loading** — Long operations show skeleton, never blank screen
- [ ] **Optional chaining** — Remote data uses `?.` operator
- [ ] **No console.log** — Debug code removed before commit
- [ ] **i18n keys exist** — Verified in BOTH pt-BR.json AND en-US.json
- [ ] **No emojis** — Use Lucide icons, not emojis

---

## i18n Keys by Category

```
common.*          Salvar, Cancelar, Voltar, loading, error, placeholderDate
auth.*            Login, email, password, errors, biometric, reset
pets.*            Meus Pets, dog, cat, breed, age, weight
addPet.*          New pet, photo, name, sex, birthDate
diary.*           New entry, narration, filters, help (8 modes)
health.*          Vaccines, allergies, health, prontuário
settings.*        Language, notifications, logout
notifications.*   Reminders, push
toast.*           Success/error messages (pet's voice!)
errors.*          Technical → human error mapping
```

---

## Documentation Files (What Each Does)

| File | Purpose | Length | When to Read |
|---|---|---|---|
| [START_HERE.md](./START_HERE.md) | This file — navigation | Short | Whenever you're lost |
| [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) | One-page patterns | 1 page | Daily development |
| [CODEMAPS/INDEX.md](./docs/CODEMAPS/INDEX.md) | Navigation hub | 5 pages | Planning features |
| [CODEMAPS/ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md) | System design | 10 pages | Understanding flow |
| [CODEMAPS/I18N.md](./docs/CODEMAPS/I18N.md) | Translations guide | 12 pages | Adding strings |
| [CODEMAPS/RESPONSIVENESS.md](./docs/CODEMAPS/RESPONSIVENESS.md) | Screen scaling | 13 pages | Debugging layout |
| [README.md](./README.md) | Setup + status | 6 pages | First time setup |
| [CLAUDE.md](./CLAUDE.md) | Full specification | 77 pages | Deep understanding |

**Total documentation:** 2,200+ lines of actionable patterns

---

## Common Questions

**Q: Where do I add a new string?**
→ [CODEMAPS/I18N.md](./docs/CODEMAPS/I18N.md) § Usage in Components

**Q: Why does layout break on iPad?**
→ [CODEMAPS/RESPONSIVENESS.md](./docs/CODEMAPS/RESPONSIVENESS.md) § Common Mistakes

**Q: How do I add a new feature?**
→ [CODEMAPS/INDEX.md](./docs/CODEMAPS/INDEX.md) § Quick Reference § Add a New Screen

**Q: What's the architecture?**
→ [CODEMAPS/ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md) § Layers

**Q: What are the rules?**
→ [START_HERE.md](./START_HERE.md) § Critical Rules (this page)

**Q: I need quick patterns**
→ [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)

**Q: Something is unclear**
→ [DOCUMENTATION_UPDATE_SUMMARY.md](./DOCUMENTATION_UPDATE_SUMMARY.md)

---

## Worst Mistakes (Avoid These!)

### ❌ Mistake #1: Hardcoding a string
```typescript
toast('Pet added successfully!');  // WRONG!
```

→ Use: `toast(t('toast.petCreated'), 'success')`

### ❌ Mistake #2: Hardcoding a pixel value
```typescript
<View style={{ padding: 16, height: 56 }}>  // WRONG!
```

→ Use: `<View style={{ padding: rs(16), height: rs(56) }}>`

### ❌ Mistake #3: Hook after early return
```typescript
if (isLoading) return <Skeleton />;
const handleSave = useCallback(...);  // WRONG! Crashes!
```

→ Use: Move hook BEFORE the return statement

### ❌ Mistake #4: Using Dimensions.get()
```typescript
const width = Dimensions.get('window').width;  // Not reactive!
```

→ Use: `const { width } = useWindowDimensions();`

### ❌ Mistake #5: Swallowing errors silently
```typescript
try {
  await api.fetchData();
} catch (err) {
  // Silent failure. User never knows!
}
```

→ Use: `toast(getErrorMessage(err), 'error');`

---

## Need More Help?

| Topic | Read This |
|---|---|
| Architecture | [CODEMAPS/ARCHITECTURE.md](./docs/CODEMAPS/ARCHITECTURE.md) |
| i18n / Strings | [CODEMAPS/I18N.md](./docs/CODEMAPS/I18N.md) |
| Layout / Sizes | [CODEMAPS/RESPONSIVENESS.md](./docs/CODEMAPS/RESPONSIVENESS.md) |
| Patterns | [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md) |
| Setup | [README.md](./README.md#setup) |
| Everything | [CLAUDE.md](./CLAUDE.md) (77KB spec) |

---

## Print These

1. **[QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)** — One page, print and laminate
2. **[START_HERE.md](./START_HERE.md)** — This file, bookmark it

---

## Remember

✅ **Zero hardcoded strings.** Zero hardcoded pixels. Hooks before returns.
✅ **Test on SE (320px) and iPad (744px).**
✅ **Error messages are for humans, not developers.**
✅ **Read the relevant codemap before you code.**
✅ **Keep documentation synchronized with code.**

---

**Last Updated:** 2026-03-31
**Next Step:** Pick a scenario above and jump in!

Ready? 🚀

Choose your path:
- **[For New Devs](./docs/CODEMAPS/INDEX.md)**
- **[For Code Review](./docs/QUICK_REFERENCE.md#checklist-before-commit)**
- **[For Features](./docs/CODEMAPS/ARCHITECTURE.md)**
- **[For Layout Issues](./docs/CODEMAPS/RESPONSIVENESS.md)**
