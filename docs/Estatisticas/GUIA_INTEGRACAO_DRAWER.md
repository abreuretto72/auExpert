# Integrar "Minhas Estatísticas" no Drawer — auExpert

## Resumo rápido

| Item | Status |
|---|---|
| RPC `get_user_stats` | ✅ aplicada e testada no Supabase |
| RPC `record_user_login` | ✅ aplicada |
| Índices de performance | ✅ criados |
| Arquivo de tipos | ⏳ copiar pro repo |
| Hook React Query | ⏳ copiar pro repo |
| Tela de estatísticas | ⏳ copiar pro repo |
| Helper de login | ⏳ copiar pro repo |
| Item no drawer | ⏳ adicionar manualmente |
| Chamar login tracker | ⏳ adicionar no fluxo de login |

---

## Passo 1 · Copiar os 4 arquivos pro repo

```bash
# Tipos
cp tutor_userStats.types.ts        src/types/userStats.ts

# Hook
cp tutor_useUserStats.ts           src/hooks/useUserStats.ts

# Tela
cp tutor_UserStatsScreen.tsx       app/(app)/stats.tsx

# Helper de login
cp tutor_recordUserLogin.ts        src/lib/recordUserLogin.ts
```

**Ajuste os imports** nos arquivos conforme seus aliases do `tsconfig.json`. Os arquivos usam `@/lib/supabase`, `@/types/userStats`, `@/hooks/useUserStats`.

---

## Passo 2 · Adicionar o item no drawer

Expo Router v4 usa o componente `Drawer` de `expo-router/drawer`. No arquivo que define seu drawer (provavelmente `app/(app)/_layout.tsx` ou similar), adicione a nova entrada:

### Exemplo completo do `_layout.tsx`:

```tsx
import { Drawer } from 'expo-router/drawer';
import { BarChart3, Home, Heart, Settings } from 'lucide-react-native';

export default function AppLayout() {
  return (
    <Drawer
      screenOptions={{
        drawerStyle: {
          backgroundColor: '#0D0E16',
          borderRightColor: '#2A2D3E',
          borderRightWidth: 1,
        },
        drawerActiveTintColor: '#4FA89E',
        drawerInactiveTintColor: '#A89FB5',
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '500',
        },
        headerStyle: { backgroundColor: '#0D0E16' },
        headerTintColor: '#F0EDF5',
      }}
    >
      {/* Seus itens existentes */}
      <Drawer.Screen
        name="index"
        options={{
          title: 'Início',
          drawerIcon: ({ color }) => <Home size={20} color={color} strokeWidth={1.5} />,
        }}
      />

      {/* ... outros screens ... */}

      {/* 🆕 NOVO ITEM — Minhas Estatísticas */}
      <Drawer.Screen
        name="stats"
        options={{
          title: 'Minhas Estatísticas',
          drawerIcon: ({ color }) => <BarChart3 size={20} color={color} strokeWidth={1.5} />,
        }}
      />
    </Drawer>
  );
}
```

**Importante:**
- O `name="stats"` deve bater com o nome do arquivo — `app/(app)/stats.tsx`
- Se você já tem um `_layout.tsx` com outros screens, só adiciona o `<Drawer.Screen name="stats" ... />` no meio

---

## Passo 3 · Instrumentar o login

Encontre onde você faz `supabase.auth.signInWithPassword()` no app (provavelmente `app/login.tsx`, `app/(auth)/login.tsx` ou similar). Adicione a chamada do tracker **após** o signIn bem-sucedido:

### Antes:

```tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  Alert.alert('Erro', error.message);
  return;
}

router.replace('/(app)');
```

### Depois:

```tsx
import { recordUserLogin } from '@/lib/recordUserLogin';

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  Alert.alert('Erro', error.message);
  return;
}

// 🆕 Registra o login no audit_log (best-effort, não bloqueia o fluxo)
await recordUserLogin('password');

router.replace('/(app)');
```

**Também adicione** nos outros fluxos de auth que existirem:
- Login biométrico → `recordUserLogin('biometric')`
- Login OAuth (Google/Apple) → `recordUserLogin('oauth')`
- Magic link → `recordUserLogin('magic_link')`

---

## Passo 4 · Testar

```bash
npx expo start
```

1. Abra o app
2. Faça **logout e login novamente** (pra disparar o `recordUserLogin`)
3. Abra o drawer → toque em **Minhas Estatísticas**
4. Confira:
   - Cards de IA mostrando **7 imagens, 16 vídeos, 8 áudios, 7 cardápios, 1 prontuário** (abril/2026)
   - **7 cães, 1 gato**
   - **5 co-tutores**
   - **1 dia ativo** (do login que você acabou de fazer)
   - Seletor de mês funciona pra navegar pra março/2026 etc

---

## Troubleshooting

### "Not authenticated" ao abrir a tela
Confira se o usuário está logado antes de navegar pra `/stats`. O middleware/guards do app devem garantir isso.

### Cards todos em zero
Você pode estar no mês errado. Rode no SQL Editor:
```sql
SELECT public.get_user_stats(2026, 4);
-- Substitua pelo seu user_id via JWT; no app funciona automaticamente
```

### "Dias ativos no mês" = 0 mesmo após login
O `recordUserLogin` não foi chamado ou falhou silenciosamente. Confira o console:
- Deve aparecer log se falhou: `[recordUserLogin] falhou: <mensagem>`
- Se não aparecer nada, confirme se `import { recordUserLogin }` está no fluxo de login
- Teste manual no SQL Editor:
  ```sql
  SELECT public.record_user_login('ios', '18.0', 'password');
  -- (como authenticated user)
  ```

### Error "PGRST202 could not find function"
Rode:
```sql
NOTIFY pgrst, 'reload schema';
```

---

## O que foi feito no Supabase (já aplicado)

Você não precisa rodar mais nada no banco. Pra conferência:

```sql
-- Funções criadas
SELECT proname FROM pg_proc 
 WHERE proname IN ('get_user_stats', 'record_user_login')
   AND pronamespace = 'public'::regnamespace;

-- Deve retornar 2 linhas.

-- Índices criados (10 no total)
SELECT indexname FROM pg_indexes
 WHERE schemaname = 'public'
   AND (indexname LIKE 'idx_photo_analyses_%'
     OR indexname LIKE 'idx_diary_entries_%'
     OR indexname LIKE 'idx_audit_log_%'
     OR indexname LIKE 'idx_pets_user_%'
     OR indexname LIKE 'idx_pet_members_%'
     OR indexname LIKE 'idx_access_grants_%'
     OR indexname LIKE 'idx_nutrition_cardapio_%'
     OR indexname LIKE 'idx_prontuario_cache_%')
 ORDER BY indexname;
```

---

## Evoluções possíveis

Quando fizer sentido, a gente pode adicionar:

- **Gráfico de barras** dos últimos 6 meses (Recharts ou Victory Native)
- **Comparação mês vs mês** ("+40% de fotos em abril vs março")
- **Export PDF** das estatísticas pra mostrar ao vet
- **Badges/achievements** (100 fotos registradas, 1 ano de uso, etc)
- **Notificações push** no dia 1º de cada mês com resumo do mês anterior
- **i18n** — extrair strings pros 5 idiomas do app (pt-BR, en-US, es-MX, es-AR, pt-PT)
