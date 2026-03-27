# Prompt para Claude Code — Inicialização do Projeto PetauLife+

Copie o texto abaixo e cole no Claude Code no VS Code.

---

## PROMPT:

```
Leia o arquivo CLAUDE.md na raiz deste projeto. Ele é a fonte de verdade com todas as diretrizes de design, arquitetura, regras de negócio e convenções.

Preciso que você inicialize o projeto PetauLife+ seguindo EXATAMENTE as especificações do CLAUDE.md. Execute os passos abaixo na ordem:

## PASSO 1 — Criar projeto Expo

Inicialize um projeto Expo com TypeScript na pasta atual:

npx create-expo-app@latest . --template blank-typescript

Se a pasta já tiver arquivos (como CLAUDE.md e docs/), faça o init de forma que preserve os arquivos existentes.

## PASSO 2 — Instalar dependências

Instale TODAS as dependências do tech stack definido no CLAUDE.md:

# Navegação
npx expo install expo-router react-native-screens react-native-safe-area-context

# Estado e cache
npm install zustand @tanstack/react-query

# i18n
npm install react-i18next i18next

# Ícones (OBRIGATÓRIO — zero emojis no app)
npx expo install lucide-react-native react-native-svg

# Supabase
npm install @supabase/supabase-js

# Biometria, câmera, notificações
npx expo install expo-local-authentication expo-camera expo-notifications expo-image-picker

# Validação
npm install zod

# Fontes
npx expo install expo-font @expo-google-fonts/sora @expo-google-fonts/caveat @expo-google-fonts/jetbrains-mono

# Armazenamento local seguro
npx expo install expo-secure-store

# Splash e status bar
npx expo install expo-splash-screen expo-status-bar

## PASSO 3 — Criar estrutura de pastas

Crie TODAS as pastas e arquivos base definidos na seção 5 do CLAUDE.md. Especificamente:

### Pastas (criar se não existirem):
- app/(auth)/
- app/(app)/pet/[id]/diary/
- components/ui/
- lib/
- hooks/
- stores/
- i18n/
- types/
- constants/
- utils/
- supabase/migrations/
- supabase/functions/generate-diary-narration/
- supabase/functions/analyze-pet-photo/
- supabase/functions/generate-embedding/
- supabase/functions/search-rag/
- supabase/functions/compress-media/
- supabase/functions/check-vaccine-status/
- supabase/functions/generate-ai-insight/
- supabase/functions/send-push-notifications/
- assets/images/
- assets/fonts/

### NÃO sobrescrever:
- CLAUDE.md (já existe)
- docs/prototypes/ (já existe com 25+ arquivos .jsx)

## PASSO 4 — Criar arquivos de design tokens

Extraia as definições EXATAS do CLAUDE.md seções 2.2 a 2.5 e crie:

### constants/colors.ts
Exportar o objeto `colors` completo com TODAS as cores (backgrounds, brand, accent, petrol, semânticas, texto, estrutura) exatamente como definido na seção 2.2.

### constants/shadows.ts
Exportar o objeto `shadows` com sm, md, lg, accent, petrol, danger.

### constants/fonts.ts
Exportar o objeto `fonts` com display, body, mono, handwriting (Sora, JetBrains Mono, Caveat).

### constants/spacing.ts
Exportar os objetos `spacing` e `radii`.

### constants/moods.ts
Exportar a lista de moods do pet:
ecstatic, happy, calm, tired, anxious, sad, playful, sick
Cada um com: id, label (pt-BR), label_en (en-US), color (da paleta), score (0-100).

### constants/breeds.ts
Exportar listas de raças de cães e gatos mais comuns no Brasil.
Cada raça com: id, name_pt, name_en, species ('dog'|'cat'), size ('small'|'medium'|'large').

## PASSO 5 — Criar componente do Logo oficial

Crie components/PetauLogo.tsx seguindo EXATAMENTE a seção 2.6 do CLAUDE.md:
- Aceita prop size: 'large' | 'normal' | 'small'
- Calcula proporcionalmente via multiplicador s (1.35, 1.0, 0.7)
- Ícone pata branca sobre gradiente accent→accentDark
- Texto: "Pet" text + "au" petrol + "Life" text + "+" accent
- Font: Sora 700
- Exportar como default

Crie components/PawIcon.tsx:
- SVG customizado da pata (ellipse + 4 circles)
- Props: size, color
- Exportar como default

## PASSO 6 — Criar componentes base de UI

Crie os componentes em components/ui/ seguindo os padrões visuais da seção 4 do CLAUDE.md:

### components/ui/Button.tsx
- Variantes: primary (gradiente accent), secondary (card + border), danger (gradiente danger)
- Props: label, onPress, variant, icon, disabled, loading
- Ícone branco dentro de botão primário
- Sombra accent no primário
- Radius 14

### components/ui/Input.tsx
- Background card, borda 1.5px border, radius 14, height 56
- Focus: borda accent + ring accentMed
- Props: label, placeholder, icon, value, onChangeText, error, type ('text'|'password'|'email'), showMic (default true)
- Ícone prefix colorido (prop iconColor)
- Ícone mic SEMPRE laranja — EXCETO quando showMic=false (campos de senha)
- Ícone eye toggle para password
- Placeholder cor #5E7A94

### components/ui/Card.tsx
- Background card, borda 1px border, radius 22
- Props: children, style, onPress

### components/ui/Badge.tsx
- Background cor + "12", texto cor pura
- Props: label, color, icon

### components/ui/Modal.tsx
- Bottom sheet com backdrop blur
- Background bgCard, radius topo 26
- Handle bar centralizada
- Props: visible, onClose, title, children

### components/ui/Alert.tsx
- Variantes: success, danger, warning, info
- Props: variant, message, icon

## PASSO 7 — Configurar i18n

### i18n/index.ts
Configurar react-i18next com:
- Idioma padrão: 'pt-BR'
- Fallback: 'en-US'
- Interpolação sem escape

### i18n/pt-BR.json
Criar com estrutura inicial:
{
  "common": { "save", "cancel", "back", "next", "delete", "edit", "close", "loading", "error", "success", "confirm" },
  "auth": { "login", "register", "email", "password", "confirmPassword", "forgotPassword", "createAccount", "enterButton", "biometricFinger", "biometricFace", "newHere" },
  "pets": { "myPets", "addNew", "dog", "cat", "onlyDogsAndCats", "vaccinesOverdue", "allUpToDate", "healthScore", "diary", "photos" },
  "tagline": "Uma inteligência única para o seu pet"
}

### i18n/en-US.json
Criar tradução inglesa completa das mesmas chaves.

## PASSO 8 — Configurar types base

### types/database.ts
Criar interfaces TypeScript para as 12 tabelas do MVP definidas na seção 7 do CLAUDE.md:
User, Session, Pet, DiaryEntry, MoodLog, PhotoAnalysis, Vaccine, Allergy, PetEmbedding, RagConversation, NotificationQueue, MediaFile

A interface Pet DEVE ter: species com type 'dog' | 'cat' (apenas estes).

### types/index.ts
Re-exportar todos os types.

### types/ai.ts
Tipos para respostas da IA: DiaryNarrationResponse, PhotoAnalysisResponse, AIInsightResponse.

## PASSO 9 — Configurar Supabase client

### lib/supabase.ts
Configurar cliente Supabase lendo SUPABASE_URL e SUPABASE_ANON_KEY de variáveis de ambiente.
Usar expo-secure-store para armazenar sessão.

### .env.local (criar template)
EXPO_PUBLIC_SUPABASE_URL=sua_url_aqui
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
EXPO_PUBLIC_ANTHROPIC_API_KEY=nunca_no_client

## PASSO 10 — Configurar Expo Router

### app/_layout.tsx
Root layout com:
- Carregamento das fontes (Sora, JetBrains Mono, Caveat)
- Splash screen enquanto fontes carregam
- Provider do React Query
- Provider do i18n
- StatusBar light (fundo escuro)

### app/(auth)/_layout.tsx
Layout para telas de auth (sem menu, sem tabs)

### app/(app)/_layout.tsx
Layout para telas autenticadas (com drawer ou tabs futuro)

## PASSO 11 — Criar stores Zustand

### stores/authStore.ts
- user, session, isAuthenticated, isLoading
- login(), logout(), checkSession()

### stores/petStore.ts
- pets[], selectedPetId, isLoading
- fetchPets(), addPet(), updatePet()

### stores/uiStore.ts
- drawerOpen, theme, language
- toggleDrawer(), setTheme(), setLanguage()

## PASSO 12 — Criar hooks base

### hooks/useAuth.ts — wrapper do authStore + Supabase Auth
### hooks/usePets.ts — wrapper do petStore + React Query
### hooks/useNotifications.ts — setup Expo Notifications

## PASSO 13 — Criar arquivo .gitignore

Incluir: node_modules, .env.local, .expo, dist, *.jks, *.p8, *.p12, *.key, *.mobileprovision, *.orig.*, web-build/

## PASSO 14 — Configurar app.json

Atualizar com:
- name: "PetauLife+"
- slug: "petaulife-plus"
- scheme: "petaulife"
- version: "1.0.0"
- orientation: "portrait"
- icon/splash configurados
- plugins: expo-router, expo-camera, expo-local-authentication, expo-notifications
- android.package: "com.petaulife.app"
- ios.bundleIdentifier: "com.petaulife.app"

## PASSO 15 — Verificação final

Após criar tudo:
1. Rode `npx expo start` para verificar que compila sem erros
2. Liste a estrutura de pastas final
3. Reporte quantos arquivos foram criados
4. Indique os próximos passos (Sprint 1: tela de login)

IMPORTANTE:
- Leia o CLAUDE.md ANTES de começar — ele tem TODAS as cores, fontes, regras
- Zero emojis em todo o código — usar lucide-react-native
- Todo ícone clicável em laranja (#E8813A), EXCETO lixeira que é vermelho (#E74C3C)
- Todo campo de texto com mic laranja, EXCETO campos de senha
- TypeScript strict, sem `any`
- Todas as strings de UI nos arquivos i18n, nunca hardcode
```
