# AuExpert

**Uma inteligência única para o seu pet**

App mobile AI-first para tutores de cães e gatos. Diário inteligente com narração na voz do pet, análise de fotos por IA, prontuário de saúde e notificações automáticas.

**📖 Documentação:** Leia os [Codemaps](./docs/CODEMAPS/INDEX.md) para entender a arquitetura, i18n e responsividade.

---
# auExpert — Atualização Design System (v9)

Dois arquivos atualizados/gerados nesta entrega:

## 1. `CLAUDE.md` (v9 atualizado)

**Substitui o CLAUDE.md atual da raiz do projeto.**

Mudanças aplicadas:
- Versão bumped: v8 → v9 (data atualizada)
- Adicionada **seção 2.8** — Hierarquia de Botões (tabela dos 5 tipos + regras invioláveis)
- Adicionada **seção 2.9** — Proibição absoluta de cores hardcoded
- **Seção 3 reforçada** — ícones decorativos NUNCA são laranja
- Adicionada **seção 16** — Padrões técnicos de performance (compressão imagem, Promise.all, structured outputs, cache em memória, escolha de modelo, logs de timing, schema versioning)
- Adicionada **seção 17** — Arquivos protegidos (não modificar)
- Atualizadas as regras invioláveis do topo: adicionadas ⛔ 8 (cores hardcoded) e ⛔ 9 (arquivos protegidos)

**Paleta não mudou.** Continua `#E8813A` como accent — as regras apenas ficaram mais explícitas e abrangentes.

## 2. `claude-code-prompt-v2.md` (prompt revisado)

**Substitui o prompt anterior.**

Mudou de objetivo: antes era "redefinir paleta pra #FB923C". Agora é **auditoria e correção** — encontrar código que não segue as regras já estabelecidas no CLAUDE.md v9.

O novo prompt:
- Lê o CLAUDE.md como fonte de verdade (não redefine nada)
- Roda auditoria completa (cores hardcoded, hierarquia de botões, ícones)
- Categoriza desvios em 3 níveis de confiança
- Pausa pra aprovação humana antes de aplicar
- Respeita arquivos protegidos (seção 17)
- Valida com TypeScript, ESLint e WCAG ao final

## Como usar

### Passo 1 — Substituir CLAUDE.md

```bash
# Fazer backup do atual (boa prática)
cp CLAUDE.md CLAUDE.md.v8.backup

# Substituir pelo novo
cp /caminho/para/CLAUDE.md ./CLAUDE.md
```

### Passo 2 — Rodar o prompt no Claude Code

Dentro do projeto auExpert:

```bash
# Opção segura — com Ultraplan
claude
/ultraplan
# (cola o conteúdo do claude-code-prompt-v2.md)
```

Ou direto no terminal:

```bash
claude
# (cola o conteúdo do claude-code-prompt-v2.md)
```

### Passo 3 — Revisar relatórios

Claude Code vai gerar:
- `audit-v9.md` — auditoria (leia antes de autorizar correções)
- `plan-v9.md` — plano categorizado (aprove ou ajuste)
- `compliance-v9.md` — relatório final após aplicação

### Passo 4 — Validar em device real

Depois das correções aplicadas, abrir o app em dispositivo real e verificar:
- 4-5 telas principais (home, novo diário, troca de ração, cardápio, settings)
- Botões primários estão laranja com texto branco
- Botões secundários mantêm outline/cinza
- Lixeira continua vermelha
- Ícones decorativos não viraram laranja por engano

## Rollback

Se algo der errado:

```bash
# Restaurar CLAUDE.md antigo
cp CLAUDE.md.v8.backup CLAUDE.md

# Reverter correções aplicadas
git diff --name-only HEAD  # ver o que mudou
git checkout -- <arquivos>  # reverter
```

---

## Próximas rotinas de performance pendentes

Do backlog que conversamos:
- [ ] Análise de áudio/vídeo (Gemini) — otimizar compressão e paralelização
- [ ] OCR de documentos vet — aplicar `compressImageForAI` no scanner
- [ ] Avaliação nutricional (evaluate-nutrition) — revisar se vale Haiku 4.5
- [ ] Foto do diário (`diary/new.tsx`) — aplicar compressão (respeitando que é arquivo protegido — precisaria autorização)

## Status do Desenvolvimento

### Concluido (2026-04-10)

#### Photo & Video Analysis Pipeline — Complete Media Handling
- **Video thumbnail generation** — `expo-video-thumbnails.getThumbnailAsync()` generates frame at 1000ms, quality 0.3
- **Thumbnail handling** — Per-video thumbnails stored as separate files in Supabase Storage
- **Dual-path processing** — Both AI and skip-AI paths generate thumbnails (redundancy)
- **Media upload refactoring** — `ImageManipulator.manipulateAsync()` for photos (resize, compress WebP)
- **MediaViewerModal component** — Full-screen photo/video viewer with pinch-zoom and carousel support
- **TimelineCards integration** — Videos display thumbnails in timeline, tap opens MediaViewerModal
- **Index alignment bug fix** — `videoThumbUrls[]` array maintains positional alignment with videos
- **Edit screen support** — Existing media attachments now display in `diary/[entryId]/edit.tsx`
- **Related files:** `hooks/useDiaryEntry.ts` (lines 905-1200), `components/diary/{TimelineCards,MediaViewerModal}.tsx`, `lib/storage.ts`

### Concluido (2026-04-09)

#### Audio Analysis — Model Separation Pattern
- **`model_audio` separation** — New field in `AIConfig` for audio content blocks
- **Why separate?** Older models like `claude-sonnet-4-20250514` don't support audio input; newer models (4.5+) do
- **Configuration** — `ai_model_audio` added to `app_config` table in Supabase, configurable per environment without redeploy
- **Default model** — `claude-sonnet-4-6` (supports audio, vision, text equally)
- **Implementation** — `callClaude` now accepts `modelOverride` param; audio classification uses `cfg.model_audio` instead of `cfg.model_classify`
- **Magic bytes MIME detection** — `detectAudioMimeFromBytes()` reads first 8 bytes to identify actual format (MP3, WAV, OGG, FLAC, WebM, MP4)
  - Fixes issue where Supabase Storage reports all `.mp4` files as `video/mp4`, causing Claude API to reject them
  - Detects: MP3 (ID3 tag or MPEG sync), WAV (RIFF header), OGG (OggS), FLAC (fLaC), WebM (EBML), MP4 (ftyp box)
- **DocumentPicker audio filter** — Changed from wildcard `'audio/*'` to explicit array of 10 Anthropic-supported MIME types (MP3, M4A/AAC, WAV, OGG, FLAC, WebM)
- **OCR improvements** — Enhanced prompts for Brazilian NF-e invoices, handwritten field extraction, output size constraints
- **Related files:** `classifier.ts`, `new.tsx` (DocumentPicker), `useDiaryEntry.ts`, i18n keys

### Concluido (2026-04-03)

#### Co-Tutores — Sistema de Delegação
- **`hooks/usePetMembers.ts`** — `usePetMembers` + `useMyPetRole` + `inviteMember` client-side (sem Edge Function)
- **`app/(app)/pet/[id]/coparents.tsx`** — tela completa: membros ativos, pendentes, remoção e convite
- **Convite por link** — URL `https://multiversodigital.com.br/auexpert/invite/{token}?from=...&pet=...&role=...`
- **Token seguro** — `generateToken()` via `Math.random()` (compatível React Native, sem `crypto`)
- **Expiração** — 48h padrão; 1d co_parent / 7d caregiver / 30d viewer quando definido pelo tutor
- **Email obrigatório** para co_parent (acesso completo); opcional para caregiver/viewer com aviso de segurança
- **Máximo 10 convites pendentes** por pet (guard no hook)
- **Share nativo do SO** (`Share.share`) — funciona em qualquer país e app
- **Deep link aceite** — `InviteLinkHandler` em `_layout.tsx` detecta `/invite/{token}`, aceita no banco e navega para Hub
- **`app.json`** — Android `intentFilters` + iOS `associatedDomains` para `multiversodigital.com.br` (requer rebuild)
- **14 chaves i18n** adicionadas em `members.*` (PT-BR + EN-US)

#### PetCard — Acesso Rápido por Pet
- **3 caixas clicáveis** no card: Vacinas → `/health`, Diário → `/pet/{id}`, Agenda → `?initialTab=agenda`
- **Botão Tutores** no rodapé → `/pet/{id}/coparents`
- **Botão Users** no header da tela do pet → `coparents`
- **`initialTab` param** — hub passa aba inicial para `pet/[id]/index.tsx` via `useLocalSearchParams`

#### Autenticação — Fix Race Condition
- **`_layout.tsx`** — `onAuthStateChange` listener sincroniza `authStore` na sessão real (sem race com `useAuth`)
- **Diagnóstico** — logs temporários identificaram conflito entre `useAuth.ts` e handler do layout

### Concluido (anterior)

#### i18n — Todas as Strings Migradas (REGRA OBRIGATÓRIA)
- **Eliminação de hardcodes** — 100% das strings visíveis ao tutor migradas para `i18n/{pt-BR,en-US}.json`
- **Arquivos atualizados:** `app/(auth)/{login,register,forgot-password,reset-password}.tsx`, `components/{ErrorBoundary,AddPetModal,diary/PdfExportModal}.tsx`
- **Chaves adicionadas:** `auth.*`, `errors.{unexpectedTitle,unexpectedBody}`, `addPet.placeholderWeight`, `common.placeholderDate`, `diary.{helpModalTitle,helpModalSub,helpPanelNote}`, `diary.help{Voice,Photo,Scanner,Document,Video,Gallery,Listen,Text}`
- **ErrorBoundary class component** — usa `i18n.t()` diretamente sem hooks (suporta crash recovery)
- **Toast messages** — tom de voz do pet em PT-BR e EN-US (empático, nunca técnico)

#### Hooks React — Regra OBRIGATÓRIA
- **Hooks declarados ANTES de early returns** — fix em `app/(app)/pet/[id]/index.tsx` — `handleOpenPdf` movido antes da verificação `if (isLoading || !pet)`
- **Responsividade em hooks:** `useResponsive.ts` com `rs()`, `fs()`, `wp()`, `hp()` — NUNCA pixels fixos
- **Layout helpers:** `useContentWidth`, `useCalendarCellWidth`, `useGridColumnWidth`, `useSafeBottom`, `useFontScale` em `lib/responsive.ts`

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
  - Email branded com template HTML do AuExpert (voz do pet: "Oi humano! Sou eu, seu pet")
  - SMTP customizado via `mail.multiversodigital.com.br`
  - Pagina intermediaria de redirect em `multiversodigital.com.br/auexpert/auth-callback.html`
  - Deep link `auexpert://reset-password` para abrir o app
  - Tela de redefinicao de senha com validacao + PasswordMeter
  - Tela de sucesso com botao "Ir para o Login"
- **Mensagens de erro humanas** — nunca mostra erro tecnico ao tutor (`utils/errorMessages.ts` + i18n `errors.*`)
- **i18n** em todas as mensagens de erro (PT-BR + EN-US)

#### Tela Principal (Hub Meus Pets)
- **Header** com logo AuExpert, botao menu (drawer) e sino de notificacoes
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
- **Logo AuExpert small** no topo
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
- **Step 2** — campos obrigatorios: sexo (♂/♀ chips), nome, data nascimento (formato locale-aware)
- **Idade auto-calculada** a partir da data de nascimento
- **Simbolo ♂/♀** ao lado do nome do pet em todos os cards e headers
- **Formato de data** adapta ao idioma (dd/mm/yyyy, mm/dd/yyyy, yyyy/mm/dd)
- **Botao submit** com gradiente da cor do pet
- **KeyboardAvoidingView** para iOS
- **Conectado** com `usePets().addPet` + toast de sucesso/erro

#### Sistema de Componentes
- **ErrorBoundary** global — captura crashes, mostra tela amigavel com "Tentar novamente" (usa i18n, suporta class components)
- **ToastProvider** — 4 variantes (success, error, warning, info) com animacao + pata colorida
- **Skeleton** — componente base + PetCardSkeleton + HubSkeleton + responsivo
- **Input** — label, icone, mic STT (exceto senha), erro, focus glow, todas as props com `rs()`
- **Button** — primary (gradiente), secondary, danger, loading state
- **AuExpertLogo** — 3 tamanhos (large, normal, small), proporcional
- **PetBottomNav** — fixed tab navigation com safe area insets (home indicator clearance no iPhone)
- **DrawerMenu** — animado com Animated.View, usa `useWindowDimensions` (reativo), não `Dimensions.get()`
- **InputSelector** — modal com 8 métodos entrada, help modal, cards grandes para voz/foto

#### Diario Inteligente
- **Separacao Diario vs Prontuario** — diario = vida emocional, prontuario = saude clinica
- **8 modos de entrada** (InputSelector): Voz (STT), Foto (Camera), Galeria, Video, Scanner (OCR), Documento, Ausculta (audio recording), Digitar
- **Componente InputSelector reescrito** — cards grandes para Voz + Foto (hierarquia visual), HelpModal com 8 modos explicados, rodapé com safe area
- **Barra de midia** em todos os modos: camera, galeria, video, microfone, scanner, documento, gravador
- **STT nativo** via `expo-speech-recognition` (development build)
- **Narracao IA** na voz do pet (Claude claude-sonnet-4-20250514, max 50 palavras, genero gramatical correto)
- **Filtros**: Momentos, IA, Marcos, Capsulas (sem filtro Saude — dados clinicos ficam no Prontuario)
- **Ponte Prontuario→Diario**: vacinas/alergias geram entrada emocional automatica via IA
- **Edge Functions**: `generate-diary-narration`, `bridge-health-to-diary`
- **i18n keys**: `diary.{helpModalTitle,helpModalSub,helpPanelNote,helpVoice,helpPhoto,helpScanner,helpDocument,helpVideo,helpGallery,helpListen,helpText}`

#### Utilities
- `utils/format.ts` — formatDate, formatRelativeDate, formatWeight, formatAge, truncateText, getHealthLevel, locale-aware date input (parseDateInput, formatDateInput, getDatePlaceholder)
- `utils/errorMessages.ts` — getErrorMessage() mapeia erros tecnicos para mensagens humanas via i18n

#### Email Templates
- `docs/email-templates/reset-password.html` — template Supabase (variavel `{{ .ConfirmationURL }}`)
- `docs/email-templates/auth-callback.html` — pagina intermediaria de redirect

#### Edge Functions (Supabase)
- `send-reset-email` — gerador de link + envio SMTP (fallback para built-in)
- `analyze-pet-photo` — analise visual completa via Claude Vision (raca, humor, saude, ambiente)
- `generate-diary-narration` — narracao IA na voz do pet (1a pessoa, genero correto, max 50 palavras)
- `bridge-health-to-diary` — ponte prontuario→diario (vacina/alergia gera entrada emocional)
- `ocr-document` — OCR de documentos veterinarios
- `translate-strings` — traducao dinamica de strings via IA

#### Configuracoes
- **SMTP customizado** no Supabase Auth (mail.multiversodigital.com.br:465)
- **Email template** de reset configurado no Supabase Dashboard
- **URL Configuration** — Site URL + Redirect URLs para deep link
- **DMARC** recomendado para evitar spam
- **Secrets** SMTP configurados no Supabase

#### Icones de Mensagem
- **5 icones customizados** para toast/confirm: sucesso, erro, aviso, info, confirmacao
- Arquivos PNG em `assets/images/m_*_icon.png`

#### Splash Screen
- Logotipo AuExpert sobre fundo `#0F1923` (azul petroleo)
- Sem retangulo cinza — imagem PNG transparente

### Mudanças Recentes (Session 2026-03-31)

#### i18n Migration — Eliminação de Hardcodes
- **Escopo:** 30+ chaves i18n adicionadas a `i18n/{pt-BR,en-US}.json`
- **Arquivos atualizados:**
  - `app/(auth)/{login,register,forgot-password,reset-password}.tsx` — todos os `t()` calls
  - `components/ErrorBoundary.tsx` — classe component usa `i18n.t()` direto (sem hooks)
  - `components/AddPetModal.tsx` — labels, placeholders, validações
  - `components/diary/PdfExportModal.tsx` — títulos relatório
  - `components/diary/InputSelector.tsx` — 8 modos entrada + help modal
- **Garantia:** ZERO strings hardcoded visíveis ao tutor em PT-BR ou EN-US

#### React Hooks Best Practices
- **Bug fix:** `app/(app)/pet/[id]/index.tsx` — hook `handleOpenPdf` movido ANTES early return `if (isLoading || !pet)`
- **Problema:** Hooks declarados após early return causam "Rendered more hooks than during the previous render"
- **Solução:** Reordenar todos os hooks ANTES de qualquer return condicional
- **Impacto:** Elimina crash ao carregar tela do pet em estado de loading

#### Responsiveness System
- **Base:** iPhone 14 (390px) — tudo escala proporcionalmente
- **Arquivo:** `lib/responsive.ts` com helpers: `useContentWidth`, `useCalendarCellWidth`, `useGridColumnWidth`, `useSafeBottom`, `useFontScale`
- **Uso obrigatório:** `rs()` para dimensões, `fs()` para fontes, `wp()`/`hp()` para percentuais
- **Arquivos atualizados:**
  - `components/layout/PetBottomNav.tsx` — safe area insets (home indicator clearance)
  - `components/DrawerMenu.tsx` — `useWindowDimensions` (reativo) em vez de `Dimensions.get()`
  - `app/(app)/pet/[id]/index.tsx` — verificação `edges={['bottom']}` duplicada removida

#### InputSelector Rewrite
- **Componente:** `components/diary/InputSelector.tsx` — modal com 8 modos entrada
- **Layout novo:** Cards grandes para Voz + Foto (prioridade visual), Help modal com explicações
- **i18n keys:** `diary.help{Voice,Photo,Scanner,Document,Video,Gallery,Listen,Text}`
- **Safe area:** Footer com safe bottom inset (iPhone home indicator)

### Pendente (MVP)
- Notificacoes push (vaccine reminders, diary reminders)
- Build de producao (EAS Build para lojas)

---

## Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK 55 (React Native + TypeScript) |
| Navegacao | Expo Router v4 |
| Estado | Zustand (UI) + React Query (servidor) |
| Cache | React Query — staleTime 5min, gcTime 30min |
| i18n | react-i18next (PT-BR / EN-US) |
| Icones | Lucide React Native (nunca emojis) |
| Backend | Supabase (PostgreSQL + pgvector + Auth + Storage + Edge Functions) |
| IA | Claude API claude-sonnet-4-20250514 |
| Push | Expo Notifications |
| Biometria | Expo LocalAuthentication |
| Camera | Expo Camera |
| Validacao | Zod |
| Responsividade | hooks/useResponsive.ts (rs, fs, wp, hp) |
| PDF Export | expo-print + expo-sharing |
| Redes sociais | @react-native-community/netinfo |

## Limites de Mídia

O app aceita os seguintes tipos de mídia na entrada do diário, com os limites abaixo:

| Tipo | Tamanho máximo | Quantidade por entrada | Duração máxima | Formatos aceitos |
|------|---------------|----------------------|----------------|---|
| Foto | 5 MB | 5 fotos | — | JPEG, PNG, WebP |
| Vídeo | 50 MB | 1 vídeo | 60 segundos | MP4, MOV, WebM |
| Áudio (latidos/sons) | 5 MB | 1 gravação | 30 segundos | MP3, M4A, AAC, WAV, OGG, FLAC, WebM, MP4 |
| Scanner / Documento | 10 MB | 1 arquivo | até 20 páginas | PDF, JPEG, PNG |

**Como funciona cada tipo:**

- **Foto** — a IA analisa saúde visual, humor pela expressão/postura, ambiente e toxicidade. Até 5 fotos por entrada. Se nenhum animal aparecer na imagem, a análise informa isso.
- **Vídeo** — a IA analisa locomoção, energia e comportamento a partir dos frames. Máximo 60 segundos para garantir qualidade de análise e velocidade de upload.
- **Áudio** — gravação de sons do pet (latidos, ronrons, choros). A IA identifica o tipo de som, estado emocional, intensidade e padrão. Máximo 30 segundos. Suporta 7 formatos via Claude API (veja tabela acima). Os formatos são detectados via magic bytes, não por extensão de arquivo.
- **Scanner / Documento** — captura de documentos como carteira de vacina, receita veterinária, rótulo de ração, notas fiscais. A IA extrai campos automaticamente via OCR e estrutura os dados. O documento escaneado aparece no card com os campos extraídos.

Os limites são validados no momento da seleção — se o arquivo ultrapassar o limite, um aviso é exibido antes do envio.

Os limites estão centralizados em `constants/media.ts`.

### Nota sobre formatos de áudio

Os 7 formatos de áudio (MP3, M4A/AAC, WAV, OGG, FLAC, WebM, MP4) são automaticamente detectados via análise de magic bytes no primeiro 8 bytes do arquivo, independentemente da extensão ou do header HTTP Content-Type. Isso evita problemas onde o Supabase Storage reporta todos os arquivos `.mp4` como `video/mp4`.

## Arquitetura

```
Telas (app/)  →  Hooks  →  Stores (Zustand) / API  →  Lib  →  Supabase
                    ↕
              React Query (cache + fetch)
```

**Regra:** Telas nunca importam `lib/` diretamente — sempre via hooks.

### Responsividade — OBRIGATÓRIA

**NUNCA hardcode pixels.** Todas as dimensões devem usar funções responsivas de `hooks/useResponsive.ts`:

```typescript
import { rs, fs, wp, hp } from '../hooks/useResponsive';

// rs(size)  — Responsive Size — padding, margin, borderRadius, width, height, gap, icon size
// fs(size)  — Font Size — com limites de acessibilidade
// wp(pct)   — Width Percentage — larguras baseadas em % da tela
// hp(pct)   — Height Percentage — alturas baseadas em % da tela
```

Design base: iPhone 14 (390px). Tudo escala proporcionalmente.

| Dispositivo | Largura | Escala |
|---|---|---|
| iPhone SE / Android compacto | 320px | 0.82x |
| iPhone 14 / maioria | 390px | 1.0x (base) |
| iPhone Pro Max | 428px | 1.10x |
| iPad Mini | 744px | 1.91x |

**Exceções (NÃO precisam de rs/fs):**
- `flex: 1`, `'100%'` — valores de flex/percentuais
- `borderWidth: 1` — bordas finas (1-2px)
- Cores, opacidade

### i18n — OBRIGATÓRIA

**Nenhuma string visível ao tutor pode estar hardcoded.** Toda string é chave i18n.

Estrutura de chaves:
```
common.*      — Salvar, Cancelar, Voltar, placeholderDate
auth.*        — Login, cadastro, reset, biometria
pets.*        — Listagem, dados, espécies, vacinas
addPet.*      — Modal adicionar pet
diary.*       — Entrada, narração, filtros, help
health.*      — Prontuário, vacinas, alergias
settings.*    — Configurações
toast.*       — Mensagens de balão (voz do pet)
errors.*      — Mensagens técnicas → humanas (i18n)
```

Tom das mensagens: **voz do pet** — empático, nunca técnico. Exemplos:
- "Opa, caí da rede! Verifica o Wi-Fi e tenta de novo?"
- "Xi, algo deu errado. Tenta de novo?"
- "Sem espaço aqui! Libera um cantinho no celular?"

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
  (auth)/         Login, register, forgot-password, reset-password
  (app)/          Hub, settings, help
  pet/[id]/       Dashboard, diary, health, edit, achievements, etc.

components/       UI primitivos + feature components
  ui/             Input, Button, Card, Badge, Alert, Modal, Skeleton
  ErrorBoundary   Class component com i18n recovery
  Toast           Balão centralizado com patinha colorida + ToastProvider
  AuExpertLogo    3 tamanhos: large, normal, small
  NetworkGuard    Monitora conexão, banner offline/online
  diary/          DiaryTimeline, PdfExportModal, InputSelector
  layout/         PetHeader, PetBottomNav, DrawerMenu
  pet/            LentesTab, IATab, PetCard
  lenses/         AgendaLensContent

constants/        Design tokens
  colors.ts       Dark theme (azul petróleo + laranja)
  spacing.ts      Responsive spacing + radii
  shadows.ts      Shadows com cores semânticas
  fonts.ts        Sora, JetBrains Mono, Caveat
  moods.ts        8 humores com cores + labels i18n
  breeds.ts       Raças por espécie

hooks/            React Hooks + React Query
  useResponsive.ts  rs(), fs(), wp(), hp() responsivos
  useAuth.ts        Auth state + biometria
  usePets.ts        CRUD pets + cache
  useDiary.ts       Diary entries + mutations
  useHealth.ts      Vaccines, allergies, moods
  useNotifications  Push + scheduling

stores/           Zustand (estado de UI APENAS)
  authStore.ts    User, session, tokens
  uiStore.ts      Drawer open, selectedPet, language

lib/              Integrações externas
  supabase.ts     Client Supabase + RLS
  api.ts          Funções fetch puras (pets, diary, vaccines, etc)
  responsive.ts   Layout helpers (useContentWidth, etc)
  queryClient.ts  React Query setup (staleTime, retry, etc)
  ai.ts           Claude API calls
  rag.ts          Busca vetorial de memórias
  notifications.ts Expo Push Notifications + scheduling
  errorMessages.ts Mapa erros técnicos → humanos
  offline*.ts     Cache persistente + fila de mutações

i18n/             Internacionalização (PT-BR + EN-US)
  pt-BR.json      ~1400 chaves em português
  en-US.json      ~1400 chaves em inglês
  (Estrutura: common, auth, pets, addPet, diary, health, errors, toast, etc)

types/            TypeScript interfaces
  database.ts     User, Pet, DiaryEntry, Vaccine, etc (gerados do Supabase)
  api.ts          API responses, payloads

utils/            Funções helper puras
  format.ts       formatDate, formatAge, formatWeight, formatRelativeDate
  errorMessages.ts getErrorMessage(error) → chave i18n + mensagem humana

supabase/         Banco de dados
  migrations/     13 migrations (usuarios, pets, diario, vacinas, alergias, saude, etc)
  functions/      Edge Functions Deno (narração IA, análise foto, OCR, etc)
  seed.sql        Dados iniciais

docs/             Documentação + protótipos
  CLAUDE.md       Spec completa (identidade, design, regras, prompts, banco de dados)
  Tabelas.md      Schema detalhado
  prototypes/     JSX de referência de tela (25+ arquivos)
  email-templates HTML templates para Supabase Auth
  especificacao/  Specs da Aldeia, prontuário, novas features
```

## Banco de Dados

13 tabelas | 30 RLS policies | 25 indexes | 6 functions | 10 triggers | 5 views | 2 storage buckets

## Design System

- **Tema:** Dark premium (azul petroleo #0F1923 + laranja #E8813A)
- **Tipografia:** Sora (UI) + JetBrains Mono (dados) + Caveat (narracao IA)
- **Icones:** Lucide React Native (nunca emojis)
- **Cores semanticas:** accent (acao), petrol (info), purple (IA), success (saude), danger (erro)

#Compatibilidade
Android: qualquer celular com Android 7.0 (Nougat) ou superior — lançado a partir de 2016.
iPhone: qualquer modelo a partir do iPhone 6s com iOS 15.1 ou superior.

## Licenca

Privado - Todos os direitos reservados.


Para gerar IOS:
eas build --platform ios --profile production
eas submit --platform ios --latest --profile production
