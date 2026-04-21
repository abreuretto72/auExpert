---
name: auexpert-architecture
description: Arquitetura em camadas do auExpert — regras de organização (telas → hooks → stores/api → lib → constants), direção única de importação, separação clara de estado (React Query para server data, Zustand para UI state, useState para forms, SecureStore para credenciais), template obrigatório de hook, regras de performance (FlatList, memo, useCallback, skeleton), padrão de escalabilidade (colocação por feature, query keys, componentes compostos). Use SEMPRE que o trabalho envolver organizar pastas, criar/editar hook, escolher onde colocar estado novo, decidir entre React Query e Zustand, lidar com re-renders, organizar listas, escalar código. Também quando o usuário mencionar "arquitetura", "hook", "Zustand", "React Query", "estado global", "estrutura de pasta", "onde coloco", "performance", "re-render", "FlatList", "memo". Complementa auexpert-resilience quando envolver error handling em camadas.
---

# auExpert — Arquitetura em Camadas

## Princípio fundamental

> **Cada arquivo tem uma única razão para mudar. Cada camada tem uma única responsabilidade.**

O app vai escalar — de 12 tabelas MVP para 59+ (37 core + 22 Aldeia), de 2 telas para 30+, de 1 tutor para milhões. Toda decisão DEVE considerar esse crescimento. "Funciona hoje mas não escala" é débito técnico — evitar desde o início.

## Arquitetura em camadas (obrigatória)

```
┌────────────────────────────────────────────────────────┐
│  TELAS (app/)                                          │
│  Apenas layout, navegação, composição de componentes   │
│  NUNCA importa lib/ diretamente — sempre via hooks     │
├────────────────────────────────────────────────────────┤
│  COMPONENTES (components/)                             │
│  ui/      = genéricos reutilizáveis (Input, Button...) │
│  feature/ = específicos (PetCard, DiaryEntry)          │
│  NUNCA lógica de negócio em components/ui/             │
├────────────────────────────────────────────────────────┤
│  HOOKS (hooks/)                                        │
│  "Cola" entre UI e dados                               │
│  Encapsulam React Query + Zustand + efeitos            │
│  Telas SEMPRE consomem dados via hooks                 │
├────────────────────────────────────────────────────────┤
│  STORES (stores/) — Zustand                            │
│  APENAS estado de UI (drawer, selectedPetId, lang)     │
│  NUNCA dados do servidor — isso é React Query          │
├────────────────────────────────────────────────────────┤
│  API (lib/api.ts)                                      │
│  Funções puras de fetch — sem estado, sem side effects │
│  Único ponto de contato com Supabase para queries      │
├────────────────────────────────────────────────────────┤
│  LIB (lib/)                                            │
│  Integrações externas: supabase, auth, ai, storage     │
├────────────────────────────────────────────────────────┤
│  CONSTANTS + TYPES + UTILS                             │
│  Design tokens, interfaces, helpers puros              │
└────────────────────────────────────────────────────────┘
```

### Direção de importação — ÚNICA DIREÇÃO

```
Telas → Hooks → Stores / API → Lib → Constants/Types/Utils
```

**Proibido:**

- `lib/` importar `hooks/` ou `stores/`
- `hooks/` importar `app/` (telas)
- `components/ui/` importar `stores/` ou `hooks/`
- `utils/` importar qualquer coisa do projeto — apenas libs externas

## Gestão de estado — separação clara

| O que | Onde | Por quê |
|---|---|---|
| Dados do servidor (pets, diário, vacinas) | **React Query** | Cache automático, staleTime, retry, refetch, optimistic updates |
| Estado de UI (drawer, idioma, pet selecionado) | **Zustand** | Leve, síncrono, sem overhead de rede |
| Estado de formulário (campos, validação) | **useState local** | Efêmero, morre com o componente |
| Credenciais / tokens | **Expo SecureStore** | Seguro, persistente, criptografado |

### React Query — defaults globais

```typescript
// lib/queryClient.ts
{
  staleTime: 5 * 60 * 1000,    // 5 min — evita refetches desnecessários
  gcTime: 30 * 60 * 1000,      // 30 min — cache em memória
  retry: 2,                     // 2 retries em falha de rede
  refetchOnWindowFocus: false,  // mobile não tem "window focus"
  refetchOnReconnect: true,     // refetch ao reconectar
}
```

### Zustand — regras

- Stores pequenos e focados — 1 store por domínio de UI
- NUNCA colocar `fetchPets()` ou chamada async de servidor dentro do store
- Selectors granulares: `useAuthStore((s) => s.isAuthenticated)` — nunca `useAuthStore()` destructurando tudo

## Template de hook — OBRIGATÓRIO

Todo acesso a dados do servidor segue este padrão:

```typescript
// hooks/useXxx.ts
export function useXxx() {
  const qc = useQueryClient();

  // QUERY — busca dados (cache + refetch automático)
  const query = useQuery({
    queryKey: ['xxx'],
    queryFn: api.fetchXxx,
    enabled: /* condição */,
  });

  // MUTATIONS — alteram dados (optimistic update no cache)
  const addMutation = useMutation({
    mutationFn: api.createXxx,
    onSuccess: (newItem) => {
      qc.setQueryData(['xxx'], (old) => [...(old ?? []), newItem]);
    },
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addItem: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
```

## Performance — regras obrigatórias

| Regra | Aplicação |
|---|---|
| **FlatList > ScrollView** | SEMPRE para listas dinâmicas (pets, diário, vacinas) |
| **React.memo** | Em componentes de lista (PetCard, DiaryEntry) |
| **useCallback** | Em `renderItem` e handlers passados como prop para listas |
| **Skeleton loading** | TODA tela que busca dados — NUNCA tela branca/vazia |
| **RefreshControl** | TODA tela com dados do servidor — pull-to-refresh |
| **Imagens otimizadas** | WebP, 3 tamanhos (thumb/medium/full), loading progressivo |
| **Lazy loading** | Expo Router faz por padrão — não quebrar com imports dinâmicos manuais |
| **Selectors granulares** | Zustand: `useStore(s => s.x)`, não destruturar store inteiro |

## Escalabilidade — quando o projeto crescer

### 1. Colocação por feature (quando uma tela tem 3+ componentes exclusivos)

```
app/(app)/pet/[id]/
├── diary.tsx
├── _components/           # Prefixo _ = Expo Router ignora
│   ├── DiaryTimeline.tsx
│   └── DiaryEntryCard.tsx
└── _hooks/
    └── useDiaryEntries.ts
```

### 2. Query keys organizadas — factory pattern (ultrapassou 10 queries)

```typescript
// lib/queryKeys.ts
export const queryKeys = {
  pets: {
    all: ['pets'] as const,
    detail: (id: string) => ['pet', id] as const,
    diary: (petId: string) => ['pets', petId, 'diary'] as const,
    vaccines: (petId: string) => ['pets', petId, 'vaccines'] as const,
  },
};
```

### 3. Componentes compostos (quando um componente tem 5+ props de config)

```typescript
// Em vez de <PetCard showHealth showMood showDiary variant="compact" />
<PetCard.Root pet={pet}>
  <PetCard.Header />
  <PetCard.Stats />
  <PetCard.Actions />
</PetCard.Root>
```

### 4. Code splitting por rota

Expo Router faz automaticamente. NUNCA importar componentes pesados (gráficos, mapas, câmera) no bundle principal.

### 5. API layer por domínio (quando `lib/api.ts` ultrapassar 300 linhas)

```
lib/api/
├── pets.ts
├── diary.ts
├── vaccines.ts
├── health.ts
└── index.ts    # re-exporta tudo
```

## Estrutura de pastas do projeto

```
auExpert/
├── CLAUDE.md
├── app/                         # Expo Router
│   ├── (auth)/                  # login, register, forgot-password
│   └── (app)/                   # hub, pet/[id]/*, settings, help
├── components/
│   ├── ui/                      # Button, Input, Card, Badge, Modal...
│   └── [feature components]     # AuExpertLogo, PetCard, DiaryEntry...
├── lib/
│   ├── supabase.ts  ai.ts  rag.ts  storage.ts  notifications.ts  auth.ts
│   └── queryClient.ts
├── hooks/
├── stores/                      # Zustand (UI state apenas)
├── i18n/
│   ├── index.ts
│   ├── pt-BR.json  en-US.json  es-MX.json  es-AR.json  pt-PT.json
├── types/
├── constants/
│   ├── colors.ts  shadows.ts  fonts.ts  spacing.ts
│   ├── breeds.ts  moods.ts
├── utils/
├── supabase/
│   ├── migrations/  functions/  seed.sql
└── assets/images/
```
