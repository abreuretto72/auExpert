# auExpert Quick Reference Card

**Keep this bookmarked.** Print it. Laminate it. Tattoo it.

---

## Rule #1: NEVER Hardcode

### NEVER Hardcode Pixels
```typescript
// ❌ NEVER
style={{ padding: 16, height: 56, fontSize: 14 }}

// ✅ ALWAYS
import { rs, fs } from '../hooks/useResponsive';
style={{ padding: rs(16), height: rs(56), fontSize: fs(14) }}
```

### NEVER Hardcode Strings
```typescript
// ❌ NEVER
<Text>Adicionar pet</Text>

// ✅ ALWAYS
const { t } = useTranslation();
<Text>{t('pets.addNew')}</Text>
```

---

## Responsive Functions

| Function | Use For | Example |
|---|---|---|
| `rs(24)` | Size, padding, margin, radius, icons | `padding: rs(16)`, `<Icon size={rs(24)} />` |
| `fs(14)` | Font size only | `fontSize: fs(14)` |
| `wp(50)` | Width percentage | `width: wp(50)` (50% of screen) |
| `hp(80)` | Height percentage | `height: hp(80)` (80% of screen) |

**Import:**
```typescript
import { rs, fs, wp, hp } from '../hooks/useResponsive';
```

---

## i18n Keys by Category

```
common.*          Salvar, Cancelar, Voltar, loading, error
auth.*            Login, email, password, errors, biometric
pets.*            Meus Pets, cão, gato, raça, idade, peso
addPet.*          Novo pet, foto, nome, sexo, data nascimento
diary.*           Nova entrada, narração, filtros, help
health.*          Vacinas, alergias, saúde, prontuário
settings.*        Idioma, notificações, sair
notifications.*   Lembretes, push
toast.*           Mensagens sucesso/erro (voz do pet)
errors.*          Mapa técnico → humano
```

---

## Common Patterns

### Fetch Data (Query)

```typescript
import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';

export function usePets() {
  return useQuery({
    queryKey: ['pets'],
    queryFn: api.fetchPets,
  });
}

// In component
const { data: pets = [], isLoading, error } = usePets();
```

### Mutate Data (Write)

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';

export function usePets() {
  const qc = useQueryClient();

  const addMutation = useMutation({
    mutationFn: api.createPet,
    onSuccess: (newPet) => {
      // Optimistic: update cache immediately
      qc.setQueryData(['pets'], (old) => [...(old ?? []), newPet]);
    },
  });

  return { addPet: addMutation.mutateAsync, isAdding: addMutation.isPending };
}

// In component
const { addPet, isAdding } = usePets();
await addPet({ name: 'Mana', breed: 'Shiba' });
```

### Handle Errors

```typescript
import { getErrorMessage } from '../utils/errorMessages';
import { useToast } from '../components/Toast';

try {
  await api.fetchPets();
} catch (err) {
  const { toast } = useToast();
  toast(getErrorMessage(err), 'error');  // Already i18n mapped
}
```

### Safe Area Insets

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rs } from '../hooks/useResponsive';

export default function FooterNav() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingBottom: insets.bottom, height: rs(60) + insets.bottom }}>
      {/* Home indicator clearance automatic */}
    </View>
  );
}
```

---

## Architecture Layers

```
┌─ Telas (app/) ──────────────────────────────┐
│ Layout + composition only. Import hooks.     │
│ Never import lib/ directly.                  │
├─────────────────────────────────────────────┤
│ ↓                                            │
├─ Hooks (hooks/) ────────────────────────────┤
│ Data fetching (useQuery, useMutation)       │
│ State management (Zustand)                   │
├─────────────────────────────────────────────┤
│ ↓                                            │
├─ API (lib/api.ts) ──────────────────────────┤
│ Pure fetch functions, no state               │
├─────────────────────────────────────────────┤
│ ↓                                            │
├─ Lib (lib/) ────────────────────────────────┤
│ Supabase, auth, storage, etc                 │
├─────────────────────────────────────────────┤
│ ↓                                            │
├─ Constants + Types + Utils ─────────────────┤
│ Design tokens, interfaces, helpers           │
└─────────────────────────────────────────────┘

RULE: Imports only flow downward. Never upward.
```

---

## File Locations

| What | Where |
|---|---|
| New screen | `app/(app)/yourscreen.tsx` |
| New hook | `hooks/useYourHook.ts` |
| New component | `components/YourComponent.tsx` |
| UI primitives | `components/ui/Button.tsx`, `Input.tsx`, etc |
| Colors | `constants/colors.ts` |
| Spacing/radii | `constants/spacing.ts` |
| Fonts | `constants/fonts.ts` |
| Moods/breeds | `constants/moods.ts`, `breeds.ts` |
| Translations | `i18n/pt-BR.json`, `i18n/en-US.json` |
| Types | `types/database.ts`, `api.ts` |
| Errors | `utils/errorMessages.ts` |
| Format helpers | `utils/format.ts` |

---

## Checklist Before Commit

- [ ] **ZERO hardcoded strings** — All UI text is `t('key')`
- [ ] **ZERO hardcoded pixels** — All sizes use `rs()`, `fs()`, `wp()`, `hp()`
- [ ] **Hooks before returns** — All hooks declared before any early return
- [ ] **Error handling** — try/catch on all async, toast with i18n error
- [ ] **Responsive tested** — Works on SE (320px) and iPad (744px)
- [ ] **Skeleton loading** — Long-running operations show skeleton
- [ ] **Optional chaining** — Remote data uses `?.` operator
- [ ] **No console.log** — Only in development, not production
- [ ] **i18n keys exist** — Verified in pt-BR.json AND en-US.json
- [ ] **No emojis in code** — Use Lucide icons only

---

## Emergency Debugging

### "Rendered more hooks than during the previous render"
**Cause:** Hook declared after early return
**Fix:** Move hook before `if (isLoading) return null`

### "Undefined value x.y.z"
**Cause:** Accessing property on undefined/null
**Fix:** Use optional chaining: `x?.y?.z ?? fallback`

### "Layout looks weird on iPad"
**Cause:** Hardcoded pixels or `Dimensions.get()` (not reactive)
**Fix:** Use `rs()` for all sizes, `useWindowDimensions()` for screen width

### "String missing for key 'auth.errorEmail'"
**Cause:** i18n key used in code but not in JSON
**Fix:** Add to both `i18n/pt-BR.json` AND `i18n/en-US.json`

### "Can't read property 'name' of undefined"
**Cause:** Missing null check on API response
**Fix:** Validate response with Zod, use optional chaining in component

---

## Zustand Store Pattern

```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-store',
      storage: AsyncStorage,
    }
  )
);

// Usage in component
const user = useAuthStore((s) => s.user);
const setUser = useAuthStore((s) => s.setUser);
```

**Rule:** Zustand is for **UI state ONLY** (drawer open, selected pet, language). Server data goes in React Query.

---

## React Query Pattern

```typescript
// Query (read)
const query = useQuery({
  queryKey: ['pets'],
  queryFn: async () => api.fetchPets(),
  staleTime: 5 * 60 * 1000,  // 5 min
  gcTime: 30 * 60 * 1000,    // 30 min
  retry: 2,
  refetchOnWindowFocus: false,  // mobile doesn't have "window focus"
});

// Mutation (write)
const mutation = useMutation({
  mutationFn: (petData) => api.createPet(petData),
  onSuccess: (newPet) => {
    // Update cache optimistically
    qc.setQueryData(['pets'], (old) => [...(old ?? []), newPet]);
    // Refetch to verify
    qc.invalidateQueries({ queryKey: ['pets'] });
  },
  onError: (error) => {
    toast(getErrorMessage(error), 'error');
  },
});

// Usage
const { data, isLoading, error } = query;
const { mutate, isPending } = mutation;
```

---

## TypeScript Types Cheat Sheet

```typescript
// Function return type
async function fetchPets(): Promise<Pet[]> { }

// Component props
interface PetCardProps {
  pet: Pet;
  onPress?: (id: string) => void;
}

function PetCard({ pet, onPress }: PetCardProps) { }

// API response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Hook return type
function useMyHook(): {
  data: MyData | null;
  isLoading: boolean;
  error: Error | null;
} { }
```

---

## Common i18n Keys

```
common.save              → "Salvar"
common.cancel           → "Cancelar"
common.loading          → "Carregando..."

auth.email              → "E-mail"
auth.password           → "Senha"
auth.errorInvalidEmail  → "E-mail inválido"

pets.myPets             → "Meus Pets"
pets.addNew             → "Adicionar pet"
pets.dog                → "Cão"
pets.cat                → "Gato"

diary.newEntry          → "Nova entrada"
diary.helpVoice         → "Conte uma história..."

toast.petCreated        → "{{name}} chegou! Bem-vindo!"
toast.loginFirst        → "Preciso que você entre na conta primeiro."

errors.network          → "Opa, caí da rede! Verifica o Wi-Fi..."
errors.generic          → "Xi, algo deu errado. Tenta de novo?"
```

---

## Device Scales

| Device | Width | Scale | Notes |
|---|---|---|---|
| iPhone SE | 320px | 0.82x | Smallest, test here! |
| iPhone 14 | 390px | 1.0x | Base design |
| iPhone Pro | 428px | 1.10x | Larger |
| iPad Mini | 744px | 1.91x | Largest, test here! |

**All dimensions scale automatically with `rs()`. No hardcoding!**

---

## Links

| Document | Purpose |
|---|---|
| [CLAUDE.md](../CLAUDE.md) | Full specification (77KB) |
| [README.md](../../README.md) | Setup + status |
| [ARCHITECTURE.md](./CODEMAPS/ARCHITECTURE.md) | System design |
| [I18N.md](./CODEMAPS/I18N.md) | Translations guide |
| [RESPONSIVENESS.md](./CODEMAPS/RESPONSIVENESS.md) | Scaling guide |
| [CODEMAPS/INDEX.md](./CODEMAPS/INDEX.md) | Navigation |

---

## Keyboard Shortcuts (macOS/Windows)

| Action | Mac | Windows |
|---|---|---|
| Search files | Cmd+P | Ctrl+P |
| Find in file | Cmd+F | Ctrl+F |
| Replace | Cmd+H | Ctrl+H |
| Format code | Shift+Opt+F | Shift+Alt+F |
| Go to definition | Cmd+Click | Ctrl+Click |
| Peek definition | Opt+F12 | Alt+F12 |
| Terminal | Ctrl+` | Ctrl+` |

---

**Last updated:** 2026-03-31
**Print this. Read this. Live this.**
