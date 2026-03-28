# PetauLife+

**Uma inteligencia unica para o seu pet**

App mobile AI-first para tutores de caes e gatos. Diario inteligente com narracao na voz do pet, analise de fotos por IA, prontuario de saude e notificacoes automaticas.

---

## Status do Desenvolvimento

### Concluido

#### Arquitetura & Infraestrutura
- **Arquitetura em camadas** documentada no CLAUDE.md (secao 11) — Telas > Hooks > Stores > API > Lib
- **React Query** como gestor de dados do servidor (staleTime 5min, gcTime 30min, retry 2)
- **Zustand** apenas para estado de UI (drawer, selectedPetId, idioma)
- **QueryClient centralizado** em `lib/queryClient.ts` com defaults otimizados
- **API layer** em `lib/api.ts` — funcoes puras de fetch separadas do estado (pets, diary, vaccines, allergies, moods)
- **Regras de resiliencia** documentadas no CLAUDE.md (secao 12) — app imune a falhas

#### Autenticacao
- **Login com email/senha** via Supabase Auth
- **Biometria** (impressao digital + Face ID) via `expo-local-authentication` — detecta hardware disponivel, restaura sessao salva no SecureStore
- **Cadastro** com validacao de senha (8+ chars, maiuscula, numero, especial)
- **Esqueci minha senha** — fluxo completo:
  - Email branded com template HTML do PetauLife+ (voz do pet: "Oi humano! Sou eu, seu pet")
  - SMTP customizado via `mail.multiversodigital.com.br`
  - Pagina intermediaria de redirect em `multiversodigital.com.br/petaulife/auth-callback.html`
  - Deep link `petaulife://reset-password` para abrir o app
  - Tela de redefinicao de senha com validacao + PasswordMeter
  - Tela de sucesso com botao "Ir para o Login"
- **Mensagens de erro humanas** — nunca mostra erro tecnico ao tutor (`utils/errorMessages.ts`)
- **i18n** em todas as mensagens de erro (PT-BR + EN-US)

#### Tela Principal (Hub Meus Pets)
- **Header** com logo PetauLife+, botao menu (drawer) e sino de notificacoes
- **Welcome section** com nome do tutor (dados reais do Supabase)
- **Pet count banner** com icones dos pets (Dog/Cat coloridos)
- **Alerta de vacinas** atrasadas (condicional)
- **FlatList** com PetCards (performance otimizada, React.memo, useCallback)
- **Pull-to-refresh** com RefreshControl
- **Skeleton loading** durante carregamento (nunca tela vazia)
- **Estado vazio** — ilustracao Dog+Cat, texto motivacional, botao CTA
- **Ambient glow** — gradiente laranja sutil no topo
- **Navegacao real** para perfil do pet via `router.push('/pet/${id}')`

#### Drawer Menu
- **Animacao slide** com Animated.View (300ms, translateX)
- **Logo PetauLife+ small** no topo
- **Perfil do tutor** com avatar gradiente, nome e email
- **Mini pet cards** com avatar colorido, nome e raca (clicaveis)
- **Menu items** com icones semanticos, sublabels e badges (Em breve, Auto)
- **Zona de perigo** com icone vermelho (Trash2)
- **Logout funcional** via authStore + redirect para login
- **Navegacao real** para settings, help, perfil do pet
- **Versao do app** no footer (JetBrains Mono)

#### PetCard
- **React.memo** para evitar re-renders em FlatList
- **Glow effect** no avatar com cor do pet
- **Shadow dinamica** colorida (laranja para cao, roxo para gato)
- **Stats row** — saude (3 niveis de cor), diario, fotos
- **Mood badge** com cor dinamica do humor
- **Tags** — idade (formatAge), peso (formatWeight), especie
- **Vaccine bar** — status visual (verde/vermelho)
- **Last activity** com formatRelativeDate

#### Modal Add Pet
- **Bottom sheet animado** com spring animation
- **Step 0** — selecao de especie (cao/gato) com cards grandes
- **Step 1** — camera/foto com banner IA + opcao de pular
- **Step 2** — nome do pet com input + mic STT + preview card
- **Botao submit** com gradiente da cor do pet
- **KeyboardAvoidingView** para iOS
- **Conectado** com `usePets().addPet` + toast de sucesso/erro

#### Sistema de Componentes
- **ErrorBoundary** global — captura crashes, mostra tela amigavel com "Tentar novamente"
- **ToastProvider** — 4 variantes (success, error, warning, info) com animacao
- **Skeleton** — componente base + PetCardSkeleton + HubSkeleton
- **Input** — label, icone, mic STT (exceto senha), erro, focus glow
- **Button** — primary (gradiente), secondary, danger, loading state
- **PetauLogo** — 3 tamanhos (large, normal, small), proporcional

#### Utilities
- `utils/format.ts` — formatDate, formatRelativeDate, formatWeight, formatAge, truncateText, getHealthLevel
- `utils/errorMessages.ts` — getErrorMessage() mapeia erros tecnicos para mensagens humanas via i18n

#### Email Templates
- `docs/email-templates/reset-password.html` — template Supabase (variavel `{{ .ConfirmationURL }}`)
- `docs/email-templates/auth-callback.html` — pagina intermediaria de redirect

#### Edge Functions (Supabase)
- `send-reset-email` — gerador de link + envio SMTP (fallback para built-in)
- `auth-callback` — pagina de redirect para deep link

#### Configuracoes
- **SMTP customizado** no Supabase Auth (mail.multiversodigital.com.br:465)
- **Email template** de reset configurado no Supabase Dashboard
- **URL Configuration** — Site URL + Redirect URLs para deep link
- **DMARC** recomendado para evitar spam
- **Secrets** SMTP configurados no Supabase

### Pendente (MVP)
- Tela do Pet (`pet/[id]/index.tsx`) — perfil completo
- Diario (`pet/[id]/diary.tsx` + `diary/new.tsx`) — timeline + nova entrada com narracao IA
- Prontuario de saude (`pet/[id]/health.tsx`) — vacinas, alergias, health score
- Analise de foto IA (`pet/[id]/photo-analysis.tsx`) — camera + IA identifica raca/humor/saude
- Integracao camera no Add Pet — foto + analise IA
- Settings e Help screens
- Notificacoes push
- Build de producao (EAS Build)

---

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK 55 (React Native + TypeScript) |
| Navegacao | Expo Router v4 |
| Estado | Zustand (UI) + React Query (servidor) |
| Cache | React Query — staleTime 5min, gcTime 30min |
| i18n | react-i18next (PT-BR / EN-US) |
| Icones | Lucide React Native |
| Backend | Supabase (PostgreSQL + pgvector + Auth + Storage + Edge Functions) |
| IA | Claude API claude-sonnet-4-20250514 |
| Push | Expo Notifications |
| Biometria | Expo LocalAuthentication |
| Camera | Expo Camera |
| Validacao | Zod |

## Arquitetura

```
Telas (app/)  →  Hooks  →  Stores (Zustand) / API  →  Lib  →  Supabase
                    ↕
              React Query (cache + fetch)
```

**Regra:** Telas nunca importam `lib/` diretamente — sempre via hooks.

## Filosofia AI-First

1. IA analisa primeiro, tutor confirma depois
2. Microfone (STT) sempre disponivel
3. Camera resolve mais que formularios
4. Digitacao e ultimo recurso

## Resiliencia

- ErrorBoundary global + por secao
- try/catch em toda operacao async
- React Query retry + error states
- Toast para feedback de acoes
- Skeleton loading (nunca tela vazia)
- Mensagens de erro humanas (nunca tecnicas)
- Optional chaining + fallbacks em todo dado remoto

## Setup

```bash
# Instalar dependencias
npm install --legacy-peer-deps

# Configurar variaveis de ambiente
cp .env.local.example .env.local
# Editar .env.local com suas chaves Supabase

# Desenvolvimento
npx expo start

# Build Android (APK)
eas login
eas build --platform android --profile preview
```

## Estrutura

```
app/              Expo Router (auth + app screens)
components/       UI primitivos + feature components + ErrorBoundary + Toast + Skeleton
  ui/             Input, Button, Card, Badge, Alert, Modal
constants/        Design tokens (colors, fonts, spacing, shadows, moods, breeds)
hooks/            useAuth, usePets, useNotifications
stores/           Zustand (authStore, petStore, uiStore)
lib/              supabase, auth, api, ai, rag, storage, notifications, queryClient
i18n/             PT-BR e EN-US (incluindo mensagens de erro)
types/            TypeScript interfaces (database + AI)
utils/            format, errorMessages
supabase/         Migrations (8), Edge Functions (10), seed
docs/             Prototipos (25), email templates
```

## Banco de Dados

13 tabelas | 30 RLS policies | 25 indexes | 6 functions | 10 triggers | 5 views | 2 storage buckets

## Design System

- **Tema:** Dark premium (azul petroleo #0F1923 + laranja #E8813A)
- **Tipografia:** Sora (UI) + JetBrains Mono (dados) + Caveat (narracao IA)
- **Icones:** Lucide React Native (nunca emojis)
- **Cores semanticas:** accent (acao), petrol (info), purple (IA), success (saude), danger (erro)

## Licenca

Privado - Todos os direitos reservados.
