# CLAUDE.md — PetauLife+ Project Rules (v5 — Definitivo)
# Última atualização: 27/03/2026

> Fonte de verdade para o Claude Code. Toda decisão segue estas diretrizes.

---

## 1. IDENTIDADE DO PROJETO

### Nome
- **PetauLife+** — grafado EXATAMENTE assim, sempre
- P e L maiúsculos, "au" minúsculo, "+" no final em cor accent (laranja)
- O "+" é caractere de texto em cor accent — SEM badge, SEM caixa
- Em código: `petaulife-plus` (kebab) ou `PetauLifePlus` (Pascal)

### Tagline
- PT-BR: **"Uma inteligência única para o seu pet"**
- EN-US: **"A unique intelligence for your pet"**
- Cor: `rgba(232, 237, 242, 0.75)` — branco a 75% opacidade (legível sem competir com logo)
- Font: Sora 500, 14px, letter-spacing 0.5

### Fase Atual: MVP "Diário Inteligente"
Login/cadastro + biometria, pets (cães/gatos), Hub Meus Pets, diário com narração IA,
análise de foto IA, RAG básico por pet, prontuário (vacinas + alergias), notificações push.

---

## 1.1 FILOSOFIA AI-FIRST — REGRA FUNDAMENTAL

### Princípio: A IA trabalha ANTES do tutor digitar

O app se chama "Uma inteligência única para o seu pet". Isso não é slogan — é diretriz
de produto. Toda tela, todo formulário, todo fluxo DEVE priorizar:

1. **IA analisa primeiro** → tutor confirma ou corrige depois
2. **Microfone (STT) sempre disponível** → digitação é último recurso
3. **Câmera resolve mais que formulários** → uma foto vale mais que 10 campos

### Hierarquia de entrada de dados (seguir esta ordem SEMPRE):

```
1º  CÂMERA + IA    → Foto/vídeo → IA extrai dados automaticamente
2º  MICROFONE (STT) → Tutor fala → app transcreve e IA interpreta
3º  SELEÇÃO RÁPIDA  → Chips, toggles, sliders — 1 toque
4º  DIGITAÇÃO       → Último recurso, apenas quando inevitável
```

### Aplicação prática por funcionalidade:

| Funcionalidade | ERRADO (manual) | CERTO (AI-first) |
|---|---|---|
| Cadastro de pet | Tutor digita raça, peso, idade | Tutor tira foto → IA identifica raça, estima peso/idade/porte |
| Diário | Tutor digita tudo | Tutor fala no mic → STT transcreve → IA narra na voz do pet |
| Vacinas | Tutor digita nome, data, lote | Tutor fotografa carteira de vacina → OCR extrai tudo |
| Prontuário | Tutor preenche formulário | Tutor fotografa receita/exame → OCR + IA estrutura os dados |
| Alergias | Tutor digita nome e reação | IA sugere com base no histórico + tutor confirma via voz |
| Humor do pet | Tutor seleciona mood manualmente | Tutor tira foto → IA infere humor pela expressão/postura |
| Perfil do tutor | Tutor digita cidade, país | GPS detecta automaticamente → tutor confirma |

### Regras para todo campo de texto:

- **Ícone de microfone (STT) obrigatório** em TODOS os campos de texto, SEMPRE em laranja
- **EXCEÇÃO ÚNICA:** campos de senha NÃO têm microfone (segurança)
- O mic deve estar sempre visível e acessível com 1 toque
- Ao ativar o mic: feedback visual imediato (animação pulsante laranja)
- Ao terminar STT: texto aparece no campo, tutor pode editar se necessário

### Regras para formulários:

- Se um dado PODE ser inferido por IA (foto, OCR, GPS, histórico), NÃO pedir ao tutor
- Se a IA inferiu um dado, mostrar como "sugerido pela IA" com badge roxo + % confiança
- Tutor sempre pode editar/corrigir qualquer dado inferido
- Campos de "ajuste" pós-IA devem ser opcionais e colapsáveis
- Placeholder dos campos deve indicar o que a IA estimou: "IA estimou ~30 kg"

### Regras para câmera/foto:

- Sempre que possível, resolver com 1 foto em vez de N campos
- Mostrar animação de análise com progresso (linhas aparecendo uma a uma)
- Resultado da IA deve ser visual (cards com ícone + valor + % confiança)
- Sempre incluir disclaimer: "Análise feita por IA. Confirme ou edite."
- Botão "Nova foto" sempre disponível para refazer a análise

### Impacto no UX:

- Menos campos = menos atrito = mais cadastros completados
- IA impressiona desde o primeiro uso = percepção de valor imediata
- STT acessível = inclusão (idosos, deficientes visuais, preguiçosos)
- O app "entende" o pet = reforça a tagline "Uma inteligência única"

---

## 2. DESIGN SYSTEM — Identidade Visual Definitiva

### 2.1 Filosofia Visual
- **Tema:** Dark premium — fundo azul petróleo escuro, acentos em laranja vibrante
- **Clima:** Sofisticado, tecnológico e acolhedor. A escuridão transmite profundidade e confiança; o laranja traz calor e energia
- **Leitura:** Alto contraste texto claro sobre fundo escuro. Nunca cansar os olhos — espaçamento generoso, hierarquia tipográfica clara
- **Coerência:** TODAS as telas usam a mesma paleta base. Sem variação de tema entre telas

**Estratégia de equilíbrio de cores (CRÍTICO — não exagerar em nenhuma):**
- **Laranja (`accent`)** = AÇÃO. Botões, links clicáveis, CTAs, o "+". Se exagerar, perde impacto
- **Azul petróleo (`petrol`)** = BASE informativa. Ícones decorativos de dados, email, globo, info. A cor que ancora o app
- **Roxo (`purple`)** = EMOÇÃO + IA. Análises, gatos, biometria facial, funcionalidades inteligentes
- **Verde (`success`)** = APENAS sucesso/saúde. Checks, vacinas em dia, health score alto. Nunca como cor de brand
- **Vermelho (`danger`)** = APENAS perigo. Erros, vacinas vencidas, lixeira, zona de perigo. Nunca decorativo

Cada cor tem seu papel. Se todas aparecem em tudo, nenhuma comunica nada.

### 2.2 Paleta de Cores

```typescript
// constants/colors.ts

export const colors = {
  // ══════════════════════════════════════
  // BACKGROUNDS — Base de todas as telas
  // ══════════════════════════════════════
  bg:           '#0F1923',  // Background principal — azul petróleo escuro
  bgCard:       '#162231',  // Cards, drawers, elementos elevados
  bgDeep:       '#0B1219',  // Áreas recuadas, modais backdrop
  card:         '#1A2B3D',  // Cards interativos, inputs
  cardHover:    '#1E3145',  // Cards em hover/press
  cardGlow:     '#1F3448',  // Cards com destaque
  glow:         '#2A4A6B',  // Elementos com brilho sutil

  // ══════════════════════════════════════
  // BRAND PRIMARY — Laranja Vibrante
  // Cor principal de ação, CTAs, destaques
  // ══════════════════════════════════════
  accent:       '#E8813A',  // Laranja principal — botões, links, o "+"
  accentLight:  '#F09A56',  // Hover, destaques leves
  accentDark:   '#CC6E2E',  // Pressionado, gradiente escuro
  accentGlow:   '#E8813A15', // Background sutil atrás de elementos accent
  accentSoft:   '#E8813A08', // Ultra-sutil
  accentMed:    '#E8813A25', // Ring de focus em inputs

  // ══════════════════════════════════════
  // BRAND SECONDARY — Azul Petróleo
  // Informação, dados, elementos secundários
  // ══════════════════════════════════════
  petrol:       '#1B8EAD',  // Azul petróleo vibrante — info, links secundários
  petrolLight:  '#22A8CC',  // Hover
  petrolDark:   '#15748F',  // Pressionado
  petrolGlow:   '#1B8EAD15',
  petrolSoft:   '#1B8EAD08',

  // ══════════════════════════════════════
  // SEMÂNTICAS — Cada funcionalidade tem cor
  // ══════════════════════════════════════
  success:      '#2ECC71',  // Sucesso, saúde OK, vacinas em dia
  successSoft:  '#2ECC7112',
  danger:       '#E74C3C',  // Erro, alerta crítico, vacinas vencidas
  dangerSoft:   '#E74C3C12',
  warning:      '#F1C40F',  // Aviso moderado, atenção
  warningSoft:  '#F1C40F12',
  purple:       '#9B59B6',  // IA, análises, gatos, tecnologia
  purpleSoft:   '#9B59B612',
  gold:         '#F39C12',  // Conquistas, gamificação, estrelas
  goldSoft:     '#F39C1212',
  rose:         '#E84393',  // Legado, memorial, emoção
  roseSoft:     '#E8439312',
  sky:          '#3498DB',  // Viagens, informação secundária
  skySoft:      '#3498DB12',
  lime:         '#A8D948',  // Nutrição (usado com moderação)
  limeSoft:     '#A8D94812',

  // ══════════════════════════════════════
  // TEXTO — Hierarquia sobre fundo escuro
  // ══════════════════════════════════════
  text:         '#E8EDF2',  // Títulos, texto principal (alto contraste)
  textSec:      '#8FA3B8',  // Texto secundário, descrições
  textDim:      '#5E7A94',  // Labels, captions, hints
  textGhost:    '#2E4254',  // Desabilitado, dividers textuais
  placeholder:  '#5E7A94',  // Placeholder de inputs (= textDim, visível)

  // ══════════════════════════════════════
  // ESTRUTURA
  // ══════════════════════════════════════
  border:       '#1E3248',  // Bordas padrão
  borderLight:  '#243A50',  // Bordas internas sutis
} as const;
```

### 2.3 Sombras

```typescript
export const shadows = {
  sm:      '0 2px 12px rgba(0, 0, 0, 0.25)',     // Cards padrão
  md:      '0 8px 30px rgba(0, 0, 0, 0.30)',     // Cards elevados
  lg:      '0 16px 50px rgba(0, 0, 0, 0.40)',    // Modais, drawers
  accent:  '0 8px 30px rgba(232, 129, 58, 0.25)', // Botões laranja (glow quente)
  petrol:  '0 6px 20px rgba(27, 142, 173, 0.20)', // Botões azul petróleo
  danger:  '0 6px 20px rgba(231, 76, 60, 0.20)',  // Botões de perigo
};
```

### 2.4 Tipografia

```typescript
export const fonts = {
  display:     "'Sora', -apple-system, sans-serif",        // TUDO: títulos, corpo, labels
  body:        "'Sora', -apple-system, sans-serif",        // Mesmo que display (coerência)
  mono:        "'JetBrains Mono', monospace",              // Scores, dados, timestamps, IDs
  handwriting: "'Caveat', cursive",                        // APENAS narração do pet no diário
};
```

**Hierarquia tipográfica:**
| Elemento | Tamanho | Peso | Font |
|---|---|---|---|
| Título de tela (h1) | 22-28px | 700 | Sora |
| Nome do pet em cards | 22px | 700 | Sora |
| Subtítulo (h2) | 16-18px | 700 | Sora |
| Corpo de texto | 13-15px | 400-500 | Sora |
| Labels/Captions | 11-12px | 600-700 | Sora, letter-spacing 0.3-0.5 |
| Section headers | 11px | 700 | Sora, letter-spacing 1.5-1.8 |
| Scores numéricos | 16-22px | 700-800 | JetBrains Mono |
| Dados/timestamps | 10-12px | 500 | JetBrains Mono |
| Narração do pet (IA) | 15-16px | 400 | Caveat, italic, lineHeight 1.9 |
| Botões | 14-16px | 700 | Sora |

**Google Fonts:**
```
Sora:wght@300;400;500;600;700;800
Caveat:wght@400;600;700
JetBrains+Mono:wght@400;500;600;700
```

### 2.5 Espaçamento e Raios

```typescript
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 };

export const radii = {
  sm:    8,   // Badges, chips pequenos
  md:    10,  // Chips de raça, tags
  lg:    12,  // Inputs, botões menores, itens de menu
  xl:    14,  // Botões principais
  xxl:   18,  // Cards de stats
  card:  22,  // Cards de pet, cards grandes
  modal: 26,  // Bottom sheets
  phone: 44,  // Device frame (protótipo)
};
```

### 2.6 Logo — OFICIAL E DEFINITIVO

O logo da tela de login v5 (`petaulife_login_v5.jsx`) é o **logo oficial do app**.
Toda tela que exibir o logo DEVE usar exatamente este visual, variando APENAS o tamanho
e mantendo a proporcionalidade entre ícone, texto e espaçamento.

**Composição (da esquerda para a direita):**
1. **Ícone pata:** quadrado arredondado (radius proporcional) com gradiente `accent (#E8813A) → accentDark (#CC6E2E)`, sombra `0 6px 24px accent30`. Pata branca SVG centralizada.
2. **Gap:** espaçamento proporcional entre ícone e texto.
3. **Texto:** "Pet" em `text` (#E8EDF2) + "au" em `petrol` (#1B8EAD) + "Life" em `text` (#E8EDF2) + "+" em `accent` (#E8813A). Font Sora 700, letter-spacing -0.8 proporcional.

**3 tamanhos oficiais (escala proporcional via multiplicador `s`):**

| Tamanho | Onde usar | `s` | Ícone | Radius | Pata SVG | Font | Gap |
|---------|----------|-----|-------|--------|----------|------|-----|
| **large** | Tela de login, onboarding, splash | 1.35 | 68px | 22px | 38px | 35px | 16px |
| **normal** | Header do hub, telas internas | 1.0 | 42px | 14px | 22px | 23px | 10px |
| **small** | Drawer menu, footer, badges | 0.7 | 29px | 10px | 15px | 16px | 7px |

**Regras obrigatórias:**
- O logo é SEMPRE horizontal (ícone + texto lado a lado) — nunca empilhado
- O "+" é SEMPRE caractere de texto em `accent` — nunca dentro de badge ou caixa
- O "au" é SEMPRE em `petrol` — nunca na mesma cor do resto
- O gradiente do ícone é SEMPRE `accent → accentDark` — nunca flat, nunca outra cor
- A pata é SEMPRE branca (#fff) — nunca colorida
- Proporções são SEMPRE mantidas — nunca esticar, achatar ou distorcer
- Em fundo escuro (`bg` #0F1923): logo padrão como descrito
- Em fundo claro (se houver): mesmas cores (o contraste já funciona)

**Implementação (componente reutilizável):**
```typescript
// components/PetauLogo.tsx
// Aceita prop size: 'large' | 'normal' | 'small'
// Calcula TUDO proporcionalmente via multiplicador s
// large = 1.35, normal = 1.0, small = 0.7

const PetauLogo = ({ size = 'normal' }) => {
  const s = size === 'large' ? 1.35 : size === 'small' ? 0.7 : 1;
  // ícone: 50*s x 50*s, radius 16*s
  // pata SVG: 28*s
  // sombra: 0 6px 24px accent30
  // texto: fontSize 26*s, weight 700, letterSpacing -0.8
  // gap entre ícone e texto: 12*s
};
```

**Tagline (apenas na tela de login, abaixo do logo large):**
- Texto: "Uma inteligência única para o seu pet"
- Cor: `rgba(232, 237, 242, 0.75)` (branco 75%)
- Font: Sora 500, 14px, letterSpacing 0.5
- Margin-top: 18px

### 2.7 Cores por Contexto

| Contexto | Cor | Hex | Uso |
|---|---|---|---|
| Ação principal (CTAs) | accent | #E8813A | Botões primários, links, "+" |
| Informação / Dados | petrol | #1B8EAD | Links secundários, badges info |
| Saúde OK / Sucesso | success | #2ECC71 | Vacinas em dia, checks |
| Erro / Perigo | danger | #E74C3C | Vacinas vencidas, erros |
| Aviso / Atenção | warning | #F1C40F | Alertas moderados |
| IA / Análises | purple | #9B59B6 | Análise foto, narração, RAG |
| Gatos | purple | #9B59B6 | Destaque de cards de gatos |
| Cães | accent | #E8813A | Destaque de cards de cães |
| Gamificação | gold | #F39C12 | XP, conquistas, estrelas |
| Legado / Memorial | rose | #E84393 | Cápsulas, testamento |
| Viagens | sky | #3498DB | Roteiros, mapas |
| Nutrição | lime | #A8D948 | Cardápio, alimentos |
| Comunidade/Social | petrol | #1B8EAD | Feed, aldeia, SOS |
| Notificação badge | danger | #E74C3C | Contador no sino |
| Diário | accent | #E8813A | Entradas, timeline |

---

## 3. ÍCONES — REGRA OBRIGATÓRIA

### NUNCA USAR EMOJIS NO APP
- Emojis (😊🐕🐱💉🏆 etc.) são PROIBIDOS em todo o código de produção
- Emojis não são profissionais, não escalam bem, e variam entre plataformas
- Use SEMPRE ícones de biblioteca especializada

### Biblioteca de Ícones: Lucide React Native
```bash
npx expo install lucide-react-native react-native-svg
```

**Por que Lucide:**
- Moderna, consistente, 1400+ ícones
- Customizável: cor, tamanho, strokeWidth
- Lightweight, tree-shakeable
- Suporta React Native nativamente
- Visual clean e geométrico que combina com Sora

**Como usar:**
```typescript
import { Dog, Cat, Heart, Shield, Camera, Bell, Zap } from 'lucide-react-native';

// Exemplo
<Dog size={24} color={colors.accent} strokeWidth={1.8} />
<Cat size={24} color={colors.purple} strokeWidth={1.8} />
```

**Ícones padrão do PetauLife+:**
| Contexto | Ícone Lucide | Cor | Clicável? |
|---|---|---|---|
| Cão | `Dog` | accent (laranja) | Sim |
| Gato | `Cat` | accent (laranja) | Sim |
| Saúde (indicador) | `ShieldCheck` | success (decorativo) | Não |
| Vacina (indicador) | `Syringe` | danger/success (status) | Não |
| Diário | `BookOpen` | accent (laranja) | Sim |
| Humor | `SmilePlus` | accent (laranja) | Sim |
| Análise IA (indicador) | `ScanEye` | purple (decorativo) | Não |
| Foto | `Camera` | accent (laranja) | Sim |
| Notificação | `Bell` | accent (laranja) | Sim |
| Alerta (indicador) | `AlertCircle` | danger (decorativo) | Não |
| Configurações | `Settings` | accent (laranja) | Sim |
| Ajuda | `HelpCircle` | accent (laranja) | Sim |
| Sair | `LogOut` | accent (laranja) | Sim |
| Menu | `Menu` | accent (laranja) | Sim |
| Adicionar | `Plus` | accent (laranja) | Sim |
| Voltar | `ChevronLeft` | accent (laranja) | Sim |
| Avançar | `ArrowRight` | branco (dentro de botão) | Sim |
| Check (indicador) | `Check` | success (decorativo) | Não |
| Fechar | `X` | accent (laranja) | Sim |
| Editar | `Pencil` | accent (laranja) | Sim |
| **Lixeira / Excluir** | **`Trash2`** | **danger (VERMELHO)** | **Sim** |
| Biometria digital | `Fingerprint` | accent (laranja) | Sim |
| Face ID | `ScanFace` | accent (laranja) | Sim |
| Pata (logo) | Custom SVG | branco (no logo) | — |
| Estrela (indicador) | `Star` | gold (decorativo) | Não |
| Coroa (indicador) | `Crown` | gold (decorativo) | Não |
| Localização | `MapPin` | accent (laranja) | Sim |
| Relógio (indicador) | `Clock` | textDim (decorativo) | Não |
| Calendário | `Calendar` | accent (laranja) | Sim |
| Download | `Download` | accent (laranja) | Sim |
| Compartilhar | `Share2` | accent (laranja) | Sim |
| Busca | `Search` | accent (laranja) | Sim |
| Filtro | `SlidersHorizontal` | accent (laranja) | Sim |
| Gráfico (indicador) | `TrendingUp` | success (decorativo) | Não |
| Lock (indicador) | `Lock` | textDim (decorativo) | Não |
| Unlock | `Unlock` | accent (laranja) | Sim |
| Email (indicador) | `Mail` | petrol (decorativo) | Não |
| Telefone | `Phone` | accent (laranja) | Sim |
| Globo/Idioma | `Globe` | accent (laranja) | Sim |
| IA/Sparkle (indicador) | `Sparkles` | purple (decorativo) | Não |
| Coração | `Heart` | accent (laranja) | Sim |
| Escudo (indicador) | `Shield` | success (decorativo) | Não |
| Microfone (STT) | `Mic` | accent (laranja) SEMPRE | Sim (exceto campo senha) |

**REGRA DE CORES DOS ÍCONES — OBRIGATÓRIA:**

1. **Todo ícone CLICÁVEL é LARANJA (`accent` #E8813A)** — sem exceção
   - Botões de ação, links, toggles, seletores, filtros, mic, editar, compartilhar, etc.
   - Se o usuário pode tocar/clicar nele, ele é laranja
   
2. **ÚNICA EXCEÇÃO: ícone de lixeira é SEMPRE VERMELHO (`danger` #E74C3C)**
   - `Trash2` é sempre `danger` em qualquer contexto
   - Botão de excluir, remover, apagar — sempre vermelho
   - Isso sinaliza perigo e irreversibilidade

3. **Ícones decorativos/informativos (NÃO clicáveis)** usam cor semântica:
   - Status de saúde: `success` (verde) ou `danger` (vermelho)
   - Indicador de IA: `purple`
   - Dados/info: `petrol`
   - Timestamps/labels: `textDim`

**Resumo visual:**
| Estado do ícone | Cor | Hex |
|---|---|---|
| Clicável (qualquer ação) | `accent` (laranja) | #E8813A |
| Lixeira / Excluir / Remover | `danger` (vermelho) | #E74C3C |
| Decorativo — sucesso | `success` (verde) | #2ECC71 |
| Decorativo — IA | `purple` (roxo) | #9B59B6 |
| Decorativo — info | `petrol` (azul) | #1B8EAD |
| Decorativo — neutro | `textDim` | #5E7A94 |
| Dentro de botão primário | branco | #FFFFFF |

**Outras regras:**
- strokeWidth padrão: 1.8 (elegante e leve)
- strokeWidth em ênfase: 2.0 (botões, checks)
- Tamanhos: 14px (inline), 18-20px (padrão), 24px (destaque), 28-32px (biometria)
- Em cards de pet: ícone `Dog` ou `Cat` no lugar de emojis de animais
- Todo campo de texto tem ícone de microfone (speech-to-text) SEMPRE em laranja, **EXCETO campos de senha** (`showMic=false`)

### Ícone de Pata (Logo)
O ícone de pata do logo é um **SVG customizado** (não vem do Lucide):
```typescript
// components/PawIcon.tsx
const PawIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Ellipse cx="12" cy="17" rx="4.5" ry="4" />
    <Circle cx="7" cy="10.5" r="2.2" />
    <Circle cx="17" cy="10.5" r="2.2" />
    <Circle cx="9.5" cy="6.5" r="1.8" />
    <Circle cx="14.5" cy="6.5" r="1.8" />
  </Svg>
);
```

---

## 4. PADRÕES VISUAIS DE UI

### Tela padrão
- Background: SEMPRE `bg` (#0F1923) — sem exceção entre telas
- Ambient glow: radial gradient sutil de `accent` ou `petrol` no topo (8% opacidade)
- Notch/status bar: fundo `bg` com gradiente para transparente

### Inputs
- Background: `card` (#1A2B3D)
- Borda: 1.5px `border`
- Height: 56px
- Radius: 14
- Focus: borda `accent` + box-shadow `0 0 0 3px accentMed`
- Placeholder: `#5E7A94` (visível mas não compete com texto digitado)
- Texto digitado: `text` (#E8EDF2)
- Ícone prefix esquerdo: cor semântica do campo (petrol para email/nome/cidade, accent para senha)
- Ícone de microfone (STT): SEMPRE laranja (`accent`), presente em TODOS os campos de texto **EXCETO campos de senha** (prop `showMic=false` em senha)
- Ícone eye toggle (senha): `textDim`, substitui o mic no campo de senha
- Ao ativar mic: animação `micPulse` (scale 1→1.1, opacity 1→0.7), background `accentGlow`
- Erro: borda `danger`, texto de erro em `danger` 11px abaixo do campo

### Botões primários
- Background: gradiente `accent → accentDark`
- Texto: branco, Sora 700
- Sombra: `shadowAccent`
- Ícone: branco, strokeWidth 2.0
- Radius: 14

### Botões secundários
- Background: `card`
- Borda: 1.5px `border`
- Texto: `textSec`
- Radius: 12

### Botões biométricos (premium com glow)
- Background: gradiente vertical `card → bgCard`
- Borda: 1.5px com cor do ícone a 30% (laranja para digital, roxo para face)
- Box-shadow: `0 4px 20px {cor}10` + `inset 0 1px 0 {cor}08`
- Orbe radial: gradiente `{cor}12 → transparent` centrado atrás do ícone (60x60px)
- Ícones: 36px, strokeWidth 1.4 (mais fino = mais premium)
- Padding: 22px vertical (generoso)
- Radius: 18
- Label: Sora 600, 11px, `textSec`
- Impressão Digital: ícone + glow em `accent` (laranja)
- Reconhecimento Facial: ícone + glow em `purple` (roxo)

### Cards de Pet
- Background: `card` (#1A2B3D)
- Borda: 1px `border`
- Radius: 22
- Avatar: ícone `Dog`/`Cat` do Lucide (tamanho 36, cor `accent`/`purple`) sobre fundo `bgCard`
- Borda do avatar: 2.5px com cor do pet (accent para cão, purple para gato) a 25% opacidade
- Glow sutil: box-shadow com cor do pet a 10% opacidade
- Stats: fundo `bgCard`, borda `border`, valores em JetBrains Mono coloridos

### Cards genéricos
- Background: `card`
- Borda: 1px `border`
- Radius: 18-22

### Modais (Bottom Sheet)
- Background: `bgCard`
- Radius topo: 26
- Backdrop: rgba(0,0,0,0.6) + blur 10px
- Handle bar: 40x5, `textGhost`, radius 3

### Drawer Menu
- Background: `bgCard`
- Radius direito: 28
- Perfil no topo com gradiente `accent → accentDark` no avatar
- Itens com ícone em cor semântica, label em `text`, sublabel em `textDim`

### Badges / Tags
- Background: cor semântica + "12" (ex: `accent12`)
- Texto: cor semântica pura
- Font: Sora 700, 10-11px
- Radius: 8

### Comunicacao com o Tutor — BALAO CENTRALIZADO (REGRA OBRIGATORIA)

> **TODA comunicacao com o tutor DEVE ser feita via balao centralizado na tela.**
> NUNCA usar `Alert.alert()`, NUNCA usar banners no topo, NUNCA usar snackbars.
> O balao e o UNICO canal de comunicacao visual entre o app e o tutor.

**Componente:** `components/Toast.tsx` — metodos `toast()` e `confirm()`
**Icone:** `components/ToastPaw.tsx` — patinha branca sobre fundo colorido

**4 tipos de patinha (varia APENAS a cor do fundo):**

| Tipo | Cor do fundo | Hex | Quando usar |
|------|-------------|-----|-------------|
| **success** | Verde | `#2ECC71` | Acao concluida, pet cadastrado, senha alterada |
| **error** | Vermelho | `#E74C3C` | Falha, erro de API, biometria falhou |
| **warning** | Amarelo | `#F1C40F` | Atencao, permissao negada, sem internet |
| **info** | Rosa | `#E84393` | Informacao, dica, sessao expirada |

A patinha e SEMPRE branca (#FFFFFF) sobre o fundo colorido arredondado (radius 16).

**Arquivos PNG das patinhas (128x128px):**

| Arquivo | Cor do fundo | Tipo | Require |
|---------|-------------|------|---------|
| `assets/images/pata_verde.png` | Verde #2ECC71 | success | `require('../assets/images/pata_verde.png')` |
| `assets/images/pata_vermelha.png` | Vermelho #E74C3C | error | `require('../assets/images/pata_vermelha.png')` |
| `assets/images/pata_amarela.png` | Amarelo #F1C40F | warning | `require('../assets/images/pata_amarela.png')` |
| `assets/images/pata_rosa.png` | Rosa #E84393 | info | `require('../assets/images/pata_rosa.png')` |

As patinhas sao carregadas via `Image` + `require()` (PNG), NAO via SVG dinamico.
Tamanho no balao: 56x56px com borderRadius 16.

**Estrutura do balao:**
```
┌──────────────────────────┐
│                     [X]  │  ← X vermelho (fechar)
│                          │
│      ┌────────────┐      │
│      │  🐾 branca │      │  ← Patinha branca sobre fundo colorido
│      └────────────┘      │
│                          │
│   Mensagem na voz do     │  ← Sora 500, 15px, center
│   pet, simples e leve    │
│                          │
│  [Cancelar] [Confirmar]  │  ← So aparece no confirm()
│                          │
│       — seu pet          │  ← Caveat 400, italic
└──────────────────────────┘
```

**Dois metodos:**

1. **`toast(texto, tipo)`** — mensagem simples
   - Patinha + texto + assinatura
   - X para fechar + some em 4s + toque no backdrop fecha
   - Uso: `toast(t('toast.petCreated', { name }), 'success')`

2. **`confirm({ text, tipo })`** — pergunta com sim/nao
   - Patinha + texto + 2 botoes (Cancelar cinza com X, Confirmar laranja com Check)
   - Retorna `Promise<boolean>` — true se sim, false se nao
   - NAO some sozinho — espera resposta
   - Backdrop NAO fecha
   - Uso: `const yes = await confirm({ text: t('settings.logoutConfirm'), type: 'warning' })`

**Regras:**
- NUNCA usar `Alert.alert()` do React Native — sempre `confirm()` do Toast
- NUNCA mostrar mensagens no topo da tela — sempre balao centralizado
- Todas as mensagens em i18n (chaves `toast.*` e `errors.*`)
- Tom das mensagens: voz do pet, leve, carinhoso — nunca tecnico
- Backdrop escuro `rgba(11, 18, 25, 0.6)` — foco total no balao

### Progress bars
- Track: `border`
- Fill: gradiente `accent → accentLight`
- Altura: 3-5px, radius 2-3

---

## 5. ESTRUTURA DO PROJETO

```
E:\@projetos_claude\PetauLife+\
├── CLAUDE.md                    # Este arquivo
├── docs/
│   └── prototypes/              # JSX de referência visual (NÃO produção)
│       └── *.jsx                # 25 protótipos de tela
├── app/                         # Expo Router
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx
│   ├── (app)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Hub Meus Pets
│   │   ├── pet/[id]/
│   │   │   ├── index.tsx
│   │   │   ├── diary.tsx
│   │   │   ├── diary/new.tsx
│   │   │   ├── health.tsx
│   │   │   └── photo-analysis.tsx
│   │   ├── settings.tsx
│   │   └── help.tsx
│   └── _layout.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Modal.tsx
│   │   ├── Alert.tsx
│   │   └── ...
│   ├── PetauLogo.tsx
│   ├── PawIcon.tsx              # SVG customizado da pata
│   ├── PetCard.tsx
│   ├── DiaryEntry.tsx
│   ├── MoodSelector.tsx
│   ├── PhotoAnalysisResult.tsx
│   ├── VaccineCard.tsx
│   └── BiometricScan.tsx
├── lib/
│   ├── supabase.ts
│   ├── ai.ts
│   ├── rag.ts
│   ├── storage.ts
│   ├── notifications.ts
│   └── auth.ts
├── hooks/
├── stores/
├── i18n/
│   ├── index.ts
│   ├── pt-BR.json
│   └── en-US.json
├── types/
├── constants/
│   ├── colors.ts                # Seção 2.2
│   ├── shadows.ts               # Seção 2.3
│   ├── fonts.ts                 # Seção 2.4
│   ├── spacing.ts               # Seção 2.5
│   ├── breeds.ts
│   └── moods.ts
├── utils/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
└── assets/
```

---

## 6. TECH STACK

| Camada | Tecnologia |
|--------|-----------|
| Framework | Expo SDK 52+ (React Native + TypeScript) |
| Navegação | Expo Router v4 |
| Estado | Zustand 4.x |
| Cache | React Query (TanStack) 5.x |
| i18n | react-i18next 14.x |
| Ícones | **lucide-react-native** + react-native-svg |
| Backend | Supabase (PostgreSQL 15+ / pgvector 0.7+ / Auth / Storage / Edge Functions) |
| IA | Claude API claude-sonnet-4-20250514 |
| Compressão | Sharp 0.33+ |
| Push | Expo Notifications |
| Biometria | Expo LocalAuthentication |
| Câmera | Expo Camera |

---

## 7. BANCO DE DADOS (MVP — 12 tabelas)

- Todo `id`: `UUID DEFAULT gen_random_uuid()`
- Toda tabela: `created_at TIMESTAMPTZ DEFAULT NOW()`
- Soft delete: `is_active BOOLEAN DEFAULT true`
- RLS ativo em TODAS as tabelas
- `CHECK (species IN ('dog', 'cat'))`

Tabelas: users, sessions, pets, diary_entries, mood_logs, photo_analyses,
vaccines, allergies, pet_embeddings (VECTOR 1536), rag_conversations,
notifications_queue, media_files

---

## 8. REGRAS DE NEGÓCIO

- Senha: min 8 chars, 1 maiúscula, 1 número, 1 especial. Lock após 5 falhas (15min)
- Pets: APENAS dog/cat. Sem limite por tutor. Microchip UNIQUE
- Diário: 3-2000 chars, max 5 fotos, mood obrigatório, narração IA <5s
- Análise foto: max 12MB, NUNCA diagnosticar, confidence <0.5 = disclaimer
- RAG: isolado por pet_id, importance (vaccine=0.9, photo=0.8, diary=0.5, mood=0.3)
- Vacinas: CRON diário 08:00, push 7d/1d antes
- Storage: pet-photos (WebP 80%, 3 tamanhos), avatars (WebP 75%, 400px)
- Push: vaccine_reminder, diary_reminder (19h), ai_insight, welcome
- MVP: apenas tutor_owner (sem assistentes)

---

## 9. PROMPTS DE IA

### 9.1 Regra de Idioma — OBRIGATÓRIA

> **TODA resposta da IA DEVE vir no idioma do dispositivo do usuário. SEMPRE.**

O idioma é detectado via `expo-localization` (`getLocales()[0].languageTag`) e enviado
no parâmetro `language` de toda chamada a Edge Functions que usam IA.

- A IA responde diretamente no idioma do dispositivo — SEM tradução intermediária
- Se o dispositivo está em chinês → a IA retorna em chinês
- Se está em árabe → retorna em árabe
- Se está em português → retorna em português
- Isso vale para: narração do diário, análise de foto, insights, tradução de strings, qualquer output de IA
- O parâmetro `language` NUNCA deve ser fixo (`'pt-BR'` ou `'en-US'`) — deve usar `i18n.language`
- As Edge Functions recebem o `language` e passam para o prompt do Claude como `Respond in {idioma}`

### 9.2 Regras Gerais

- Narração diário: max 150 palavras, 1ª pessoa do pet, tom varia com humor
- Análise foto: JSON completo (identificação, saúde, humor, ambiente), NUNCA diagnosticar, comparar via RAG
- Insight semanal: max 60 palavras, específico, acionável
- Model: `claude-sonnet-4-20250514`

---

## 10. CONVENÇÕES

- Componentes: PascalCase. Hooks: useXxx. Stores: xxxStore. SQL: snake_case
- TypeScript strict, sem `any`, Zod para validação
- Functional components only, StyleSheet.create() em produção
- Commits: `type(scope): message` em inglês
- **NUNCA EMOJIS** no código — sempre ícones Lucide

### 10.1 PROIBIÇÃO ABSOLUTA: PIXELS FIXOS — DESIGN RESPONSIVO OBRIGATÓRIO

> **NENHUM valor de pixel pode estar hardcoded no StyleSheet. NENHUM. ZERO. JAMAIS.**

O app opera em dispositivos de **tamanhos muito diferentes** — de um iPhone SE (320px) a um
tablet Android (600px+). Um botão com `height: 56` fica enorme num SE e pequeno num tablet.
Pixels fixos quebram a experiência em qualquer tela que não seja a do desenvolvedor.

**TODA dimensão DEVE usar as funções responsivas de `hooks/useResponsive.ts`:**

```typescript
import { rs, fs, wp, hp } from '../hooks/useResponsive';

// rs(size) — Responsive Size — para padding, margin, borderRadius, width, height, gap
// fs(size) — Font Size — para fontSize (com limites de acessibilidade)
// wp(pct)  — Width Percentage — para larguras baseadas em % da tela
// hp(pct)  — Height Percentage — para alturas baseadas em % da tela
```

**Base de design:** iPhone 14 (390px largura). Tudo escala proporcionalmente.

| Dispositivo | Largura | Escala |
|-------------|---------|--------|
| iPhone SE / Android compacto | 320px | 0.82x |
| iPhone 14 / maioria Androids | 390px | 1.0x (base) |
| iPhone Pro Max | 428px | 1.10x |
| iPad Mini | 744px | 1.91x |

**ERRADO (proibido):**
```typescript
{ height: 56, fontSize: 16, padding: 20, borderRadius: 14 }
```

**CERTO (obrigatório):**
```typescript
{ height: rs(56), fontSize: fs(16), padding: rs(20), borderRadius: rs(14) }
```

**Exceções (NÃO precisam de rs/fs):**
- `flex: 1`, `flex: 2` — valores de flex
- `'100%'` — percentuais de string
- `borderWidth: 1` ou `1.5` — bordas finas (1-2px não escalam)
- Cores, opacidade
- `spacing.*` e `radii.*` de `constants/spacing.ts` — já são responsivos internamente

**Checklist antes de cada commit:**
1. Buscar no StyleSheet por números > 2 que NÃO estejam dentro de `rs()` ou `fs()`
2. Se encontrar → envolver com a função correta
3. Ícones Lucide: `size={rs(20)}` em vez de `size={20}`

---

### 10.2 PROIBIÇÃO ABSOLUTA: STRINGS HARDCODED — REGRA INVIOLÁVEL

> **NENHUMA string visível ao tutor pode estar hardcoded no código. NENHUMA. ZERO. JAMAIS.**

Esta regra existe porque o app opera em **múltiplos idiomas** (PT-BR, EN-US e futuramente outros).
Uma string hardcoded em português quebra a experiência de um tutor que usa o app em inglês.
Violar esta regra é violar a confiança do usuário.

**TODA string que o tutor vê DEVE estar em `i18n/pt-BR.json` e `i18n/en-US.json`.**

Isso inclui:
- Títulos de tela, labels, placeholders
- Mensagens de toast (sucesso, erro, aviso, info)
- Mensagens de erro (via `utils/errorMessages.ts` + chaves i18n)
- Textos de botões, links, badges
- Textos de estados vazios, loading, disclaimers
- Nomes de seções (MEUS PETS, ACOES RAPIDAS, etc.)
- Qualquer texto que aparece na UI — SEM EXCEÇÃO

**Como fazer:**
```typescript
// ERRADO — PROIBIDO — NUNCA FAZER
toast('Pet cadastrado com sucesso!', 'success');
<Text>Vacinas atrasadas</Text>

// CERTO — OBRIGATÓRIO — SEMPRE FAZER
toast(t('toast.petCreated', { name: data.name }), 'success');
<Text>{t('pets.vaccinesOverdue')}</Text>
```

**Checklist antes de cada commit:**
1. Buscar no código por strings entre aspas dentro de `toast(`, `<Text>`, `label=`, `placeholder=`
2. Se encontrar texto em português ou inglês direto no código → MOVER para i18n
3. Se for mensagem de erro → usar `getErrorMessage()` que já usa i18n
4. Se for mensagem de toast → usar chave `toast.*` do i18n

**Estrutura das chaves i18n:**
```
common.*     → palavras genéricas (Salvar, Cancelar, Voltar)
auth.*       → tela de login/cadastro/reset
pets.*       → listagem e dados de pets
addPet.*     → modal de adicionar pet
diary.*      → diário
health.*     → saúde, vacinas, alergias
ai.*         → análises de IA
settings.*   → configurações
toast.*      → mensagens de balão (voz do pet)
errors.*     → mensagens de erro (voz do pet)
```

**Tom das mensagens (voz do pet):**
- Toast e erros DEVEM ser escritos como se fosse o pet falando com o tutor
- Tom leve, carinhoso, bem-humorado — nunca técnico, nunca frio
- Exemplos: "Eba!", "Xi!", "Opa!", "Calma, humano!", "Te reconheci!"
- Assinatura: "— seu pet" (PT-BR) / "— your pet" (EN-US)

---

## 11. ARQUITETURA & ESTRATÉGIA DE DESENVOLVIMENTO

### 11.1 Princípio Fundamental
> **Cada arquivo tem uma única razão para mudar. Cada camada tem uma única responsabilidade.**

O app VAI escalar — de 12 tabelas MVP para 37+ tabelas, de 2 telas para 25+, de 1 tutor para
milhões. Toda decisão de código DEVE considerar esse crescimento. Código que "funciona hoje"
mas não escala é débito técnico — evitar desde o início.

### 11.2 Arquitetura em Camadas (OBRIGATÓRIA)

```
┌─────────────────────────────────────────────────────┐
│  TELAS (app/)                                       │
│  Apenas layout, navegação e composição de componentes│
│  NUNCA importa lib/ diretamente — sempre via hooks  │
├─────────────────────────────────────────────────────┤
│  COMPONENTES (components/)                          │
│  ui/ = genéricos reutilizáveis (Input, Button, Card)│
│  feature/ = específicos (PetCard, DiaryEntry)       │
│  NUNCA lógica de negócio em components/ui/          │
├─────────────────────────────────────────────────────┤
│  HOOKS (hooks/)                                     │
│  "Cola" entre UI e dados                            │
│  Encapsulam React Query + Zustand + efeitos         │
│  Telas SEMPRE consomem dados via hooks              │
├─────────────────────────────────────────────────────┤
│  STORES (stores/) — Zustand                         │
│  APENAS estado de UI (drawer, selectedPetId, lang)  │
│  NUNCA dados do servidor — isso é React Query       │
├─────────────────────────────────────────────────────┤
│  API (lib/api.ts)                                   │
│  Funções puras de fetch — sem estado, sem side effects│
│  Único ponto de contato com Supabase para queries   │
├─────────────────────────────────────────────────────┤
│  LIB (lib/)                                         │
│  Integrações externas: supabase, auth, ai, storage  │
├─────────────────────────────────────────────────────┤
│  CONSTANTS + TYPES + UTILS                          │
│  Design tokens, interfaces, helpers puros           │
└─────────────────────────────────────────────────────┘
```

**Regra de importação (direção única — de cima para baixo, NUNCA o inverso):**
```
Telas → Hooks → Stores / API → Lib → Constants/Types/Utils
```
- `lib/` NUNCA importa `hooks/` ou `stores/`
- `hooks/` NUNCA importa `app/` (telas)
- `components/ui/` NUNCA importa `stores/` ou `hooks/`
- `utils/` NUNCA importa nada do projeto — apenas libs externas

### 11.3 Gestão de Estado — Separação Clara

| O que | Onde | Por que |
|-------|------|---------|
| Dados do servidor (pets, diário, vacinas) | **React Query** | Cache automático, staleTime, retry, refetch, optimistic updates |
| Estado de UI (drawer aberto, idioma, pet selecionado) | **Zustand** | Leve, síncrono, sem overhead de rede |
| Estado de formulário (campos, validação) | **useState local** | Efêmero, morre com o componente |
| Credenciais/tokens | **Expo SecureStore** | Seguro, persistente, criptografado |

**Regras React Query:**
```typescript
// lib/queryClient.ts — defaults globais
{
  staleTime: 5 * 60 * 1000,    // 5 min — evita refetches desnecessários
  gcTime: 30 * 60 * 1000,      // 30 min — cache em memória
  retry: 2,                     // 2 retries em falha de rede
  refetchOnWindowFocus: false,  // Mobile não tem "window focus"
  refetchOnReconnect: true,     // Refetch ao reconectar internet
}
```

**Regras Zustand:**
- Stores devem ser **pequenos e focados** — 1 store por domínio de UI
- NUNCA colocar `fetchPets()` ou qualquer chamada async de servidor dentro de um store
- Usar selectors granulares: `useAuthStore((s) => s.isAuthenticated)` — não `useAuthStore()`

### 11.4 Padrão de Hook (template obrigatório)

Todo acesso a dados do servidor DEVE seguir este padrão:
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

### 11.5 Performance — Regras Obrigatórias

| Regra | Aplicação |
|-------|-----------|
| **FlatList > ScrollView** | SEMPRE que renderizar lista de itens dinâmicos (pets, diário, vacinas) |
| **React.memo** | Em componentes de lista (PetCard, DiaryEntry) que re-renderizam em FlatList |
| **useCallback** | Em `renderItem` e handlers passados como prop para listas |
| **Skeleton loading** | TODA tela que busca dados DEVE mostrar skeleton, NUNCA tela branca/vazia |
| **RefreshControl** | TODA tela com dados do servidor DEVE ter pull-to-refresh |
| **Imagens otimizadas** | WebP, 3 tamanhos (thumb/medium/full), carregamento progressivo |
| **Lazy loading** | Expo Router faz por padrão — não quebrar com imports dinâmicos manuais |
| **Evitar re-renders** | Zustand selectors granulares, não desestruturar store inteiro |

### 11.6 Escalabilidade — Regras para Crescimento

**Quando o projeto crescer além do MVP, seguir:**

1. **Colocação por feature** — quando uma tela tiver 3+ componentes exclusivos:
```
app/(app)/pet/[id]/
├── diary.tsx
├── _components/           # Prefixo _ = Expo Router ignora
│   ├── DiaryTimeline.tsx
│   └── DiaryEntryCard.tsx
└── _hooks/
    └── useDiaryEntries.ts
```

2. **Query keys organizadas** — usar factory pattern quando ultrapassar 10 queries:
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

3. **Componentes compostos** — quando um componente tiver 5+ props de configuração:
```typescript
// Ao invés de <PetCard showHealth showMood showDiary variant="compact" />
// Usar composição:
<PetCard.Root pet={pet}>
  <PetCard.Header />
  <PetCard.Stats />
  <PetCard.Actions />
</PetCard.Root>
```

4. **Code splitting por rota** — Expo Router faz automaticamente. NUNCA importar
   componentes pesados (gráficos, mapas, câmera) no bundle principal.

5. **API layer por domínio** — quando `lib/api.ts` ultrapassar 300 linhas, dividir:
```
lib/api/
├── pets.ts
├── diary.ts
├── vaccines.ts
├── health.ts
└── index.ts    # re-exporta tudo
```

---

## 12. RESILIÊNCIA — APP IMUNE A FALHAS

### 12.1 Filosofia: O App NUNCA Pode Quebrar na Mão do Tutor

> **O tutor é uma pessoa que ama seu pet e quer cuidar dele. Ele NÃO é programador.
> Se o app travar, congelar, fechar ou mostrar um erro técnico, perdemos a confiança
> dessa pessoa para sempre. O app DEVE ser à prova de balas.**

### 12.2 Camadas de Proteção (TODAS obrigatórias)

```
┌─────────────────────────────────────────┐
│  1. ErrorBoundary global (root layout)  │  ← Captura crashes de render
│  2. ErrorBoundary por seção             │  ← Isola falhas por área
│  3. try/catch em toda operação async    │  ← Captura erros de rede/API
│  4. React Query retry + error states    │  ← Retry automático + fallback
│  5. Toast para feedback de ações        │  ← Tutor sempre sabe o que aconteceu
│  6. Fallback UI em todo loading         │  ← Skeleton, NUNCA tela vazia
│  7. Validação Zod nas bordas            │  ← Dados inválidos não passam
└─────────────────────────────────────────┘
```

### 12.3 Mensagens de Erro — REGRA CRÍTICA

> **NUNCA mostrar mensagens técnicas ao tutor. NUNCA.**

O tutor não sabe o que é "Error 500", "Network timeout", "null reference",
"PostgreSQL constraint violation" ou "JWT expired". Essas mensagens causam
medo, frustração e abandono do app.

**Toda mensagem de erro DEVE ser:**
- Escrita em linguagem simples, como se falasse com um amigo
- Curta (1-2 frases no máximo)
- Orientada à ação (o que o tutor pode fazer)
- Empática (nunca culpar o tutor)

**Tabela de tradução de erros (OBRIGATÓRIA):**

| Erro técnico | Mensagem para o tutor (PT-BR) | Mensagem para o tutor (EN-US) |
|---|---|---|
| Network error / timeout | "Sem conexão. Verifique sua internet e tente de novo." | "No connection. Check your internet and try again." |
| 500 / Server error | "Nossos servidores estão descansando. Tente de novo em alguns minutos." | "Our servers are resting. Try again in a few minutes." |
| 401 / 403 / JWT expired | "Sua sessão expirou. Faça login novamente." | "Your session expired. Please log in again." |
| 404 / Not found | "Não encontramos o que você procura. Tente atualizar a tela." | "We couldn't find what you're looking for. Try refreshing." |
| 409 / Conflict (duplicate) | "Esse registro já existe. Verifique os dados e tente de novo." | "This record already exists. Check the data and try again." |
| 422 / Validation error | "Alguns dados precisam de ajuste. Verifique os campos marcados." | "Some data needs adjustment. Check the marked fields." |
| Crash / render error | "Algo deu errado. Tente novamente." | "Something went wrong. Try again." |
| Upload failed | "Não conseguimos enviar a foto. Tente com uma imagem menor." | "We couldn't upload the photo. Try a smaller image." |
| AI analysis failed | "A análise não funcionou desta vez. Tente tirar outra foto." | "The analysis didn't work this time. Try taking another photo." |
| Biometric failed | "Não reconhecemos você. Tente de novo ou use sua senha." | "We didn't recognize you. Try again or use your password." |
| Storage full | "Sem espaço para salvar. Libere espaço no dispositivo." | "No space to save. Free up space on your device." |
| Rate limited | "Muitas tentativas. Aguarde um momento e tente de novo." | "Too many attempts. Wait a moment and try again." |

**Implementação obrigatória:**
```typescript
// utils/errorMessages.ts
// Toda chamada de API DEVE passar pelo mapeamento antes de exibir ao tutor
// NUNCA fazer: toast(error.message) — isso vaza erro técnico
// SEMPRE fazer: toast(getErrorMessage(error)) — isso traduz para humano
```

**Regras adicionais de mensagens:**
- Erros de validação de formulário: destacar o campo com borda `danger` + texto explicativo ABAIXO do campo (ex: "A senha precisa ter pelo menos 8 caracteres")
- NUNCA usar palavras como: "erro", "falha", "inválido", "exceção", "código", "servidor" sozinhas — sempre contextualizar
- Preferir tom positivo: "Verifique sua internet" em vez de "Erro de rede"
- Em caso de dúvida, usar: "Algo deu errado. Tente de novo." — simples e universal
- Todas as mensagens DEVEM estar no i18n (pt-BR.json / en-US.json), NUNCA hardcoded

### 12.4 Regras Anti-Crash (seguir SEMPRE)

**NUNCA:**
- Acessar propriedade de `null`/`undefined` sem optional chaining (`?.`)
- Renderizar dado do servidor sem fallback (`data?.name ?? '—'`)
- Deixar Promise sem `.catch()` ou sem try/catch
- Usar `JSON.parse()` sem try/catch
- Confiar que a API sempre retorna o formato esperado — validar com Zod
- Deixar uma tela sem ErrorBoundary
- Mostrar tela completamente vazia durante loading (usar Skeleton)
- Mostrar spinner infinito sem timeout — após 15s, exibir mensagem + botão retry

**SEMPRE:**
- Optional chaining em todo acesso a dados remotos: `pet?.name`, `user?.email`
- Fallback em todo valor que pode ser null: `score ?? 0`, `name ?? '—'`
- ErrorBoundary no root layout E em cada seção crítica (diário, saúde, análise IA)
- try/catch em toda função async que interage com API/Storage/Camera
- Loading skeleton em toda tela que busca dados
- Pull-to-refresh (RefreshControl) em toda lista
- Timeout em toda requisição — não deixar o tutor esperando para sempre
- Validar dados na entrada (formulários) E na saída (respostas da API)
- Logar erros técnicos no console (dev) e futuramente em serviço externo (prod)
- Testar fluxos offline: o app DEVE funcionar graciosamente sem internet

### 12.5 Monitoramento de Conexao (NetworkGuard)

> **O tutor NUNCA deve ser surpreendido por um erro de rede.**
> O app monitora a conexao em tempo real e avisa de forma elegante.

**Componente:** `components/NetworkGuard.tsx`
**Biblioteca:** `@react-native-community/netinfo`

**Comportamento:**
1. **Ficou offline** → banner animado aparece no topo:
   - Icone WifiOff amarelo (warning)
   - "Sem conexao" + "O app continua funcionando com os dados salvos"
   - Botao retry para verificar manualmente
   - O banner PERMANECE visivel ate reconectar
2. **Reconectou** → banner verde aparece:
   - Icone Wifi verde (success)
   - "Conexao restabelecida!"
   - Auto-desaparece em 3s
3. **React Query integrado** → `onlineManager.setEventListener` sincroniza:
   - Offline: queries pausam (nao disparam fetch, usam cache)
   - Online: queries stale refetcham automaticamente

**Regras:**
- NUNCA mostrar "Network Error" ou mensagem tecnica
- O banner nao bloqueia a tela — o tutor continua navegando com dados em cache
- O botao retry e discreto (nao invasivo)
- A transicao offline→online e suave (spring animation)
- Toda tela continua funcional com dados ja carregados (React Query gcTime 30min)

### 12.6 Hierarquia de Providers no Root Layout

A ordem dos providers no `app/_layout.tsx` é CRÍTICA e DEVE ser mantida:
```typescript
<ErrorBoundary>              {/* 1. Captura TUDO — última linha de defesa */}
  <QueryClientProvider>      {/* 2. Cache + fetch — precisa estar alto */}
    <ToastProvider>          {/* 3. Feedback — disponível em toda a app */}
      <NetworkGuard>         {/* 4. Monitora rede — banner sobre tudo */}
        <Stack />           {/* 5. Navegação — as telas em si */}
        <StatusBar />
      </NetworkGuard>
    </ToastProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

---

## 12.7 Estrategia Offline-First — App Funciona Sem Internet

> **O app NAO pode parar de funcionar quando o tutor perde a internet.**
> Ele continua funcionando com dados salvos e sincroniza quando a conexao voltar.

### Arquitetura Offline

```
┌──────────────────────────────────────────────────────┐
│  1. CACHE PERSISTENTE (AsyncStorage)                 │
│     React Query cache salvo a cada 2min + ao sair   │
│     Ao abrir o app: cache restaurado instantaneamente│
├──────────────────────────────────────────────────────┤
│  2. REACT QUERY (memoria)                            │
│     staleTime 5min / gcTime 30min / retry 2          │
│     onlineManager sincroniza com NetInfo              │
│     Offline: queries pausam, usam cache               │
│     Online: queries stale refetcham automaticamente   │
├──────────────────────────────────────────────────────┤
│  3. FILA DE MUTACOES (AsyncStorage)                  │
│     Operacoes de escrita salvas localmente            │
│     Sincronizadas automaticamente ao reconectar       │
│     Max 3 retries por operacao                        │
├──────────────────────────────────────────────────────┤
│  4. NETWORK GUARD (UI)                               │
│     Banner offline/online com animacao                │
│     Contador de operacoes pendentes                   │
│     Indicador de sincronizacao                        │
└──────────────────────────────────────────────────────┘
```

### Classificacao de Operacoes

| Operacao | Offline? | Estrategia |
|----------|----------|------------|
| **Ver lista de pets** | SIM | Cache persistente (AsyncStorage + React Query) |
| **Ver perfil do pet** | SIM | Cache persistente |
| **Ver diario** | SIM | Cache persistente |
| **Ver vacinas/alergias** | SIM | Cache persistente |
| **Adicionar pet** | SIM | Fila offline → pet temporario local → sync ao reconectar |
| **Editar pet** | SIM | Fila offline → atualiza cache local → sync ao reconectar |
| **Excluir pet** | SIM | Fila offline → remove do cache local → sync ao reconectar |
| **Nova entrada diario** | SIM | Fila offline → salva local → sync ao reconectar |
| **Login/cadastro** | NAO | Requer internet — mostra mensagem amigavel |
| **Reset de senha** | NAO | Requer internet — mostra mensagem amigavel |
| **Analise foto IA** | NAO | Requer internet — mostra "Sem conexao. Tente quando tiver internet." |
| **Narracao IA** | NAO | Requer internet — entrada salva sem narracao, IA narra ao reconectar |

### Regras de Implementacao

**TODA mutacao (escrita) DEVE:**
1. Verificar `onlineManager.isOnline()` antes de chamar a API
2. Se offline: salvar na fila via `addToQueue()` + atualizar cache local (optimistic)
3. Se online: chamar a API normalmente

**TODA query (leitura) DEVE:**
1. Usar React Query (cache automatico)
2. Dados servidos do cache quando offline
3. Refetch automatico quando reconectar

**O NetworkGuard DEVE:**
1. Mostrar banner offline com contagem de operacoes pendentes
2. Ao reconectar: executar `processQueue()` automaticamente
3. Mostrar "Sincronizando dados..." durante o sync
4. Mostrar "Tudo sincronizado!" ao finalizar

### Arquivos do Sistema Offline

| Arquivo | Responsabilidade |
|---------|-----------------|
| `lib/offlineCache.ts` | Persistir/restaurar cache React Query no AsyncStorage |
| `lib/offlineQueue.ts` | Fila de mutacoes pendentes (CRUD no AsyncStorage) |
| `lib/offlineSync.ts` | Processar fila — executar mutacoes pendentes na API |
| `hooks/useNetwork.ts` | Hook para verificar conexao em qualquer componente |
| `components/NetworkGuard.tsx` | UI de monitoramento + sync automatico |

---

## 13. GLOSSÁRIO

| Termo | Significado |
|-------|-------------|
| Tutor | Dono do pet (usar "tutor" no UI, não "usuário") |
| Pet | Cão ou gato (apenas estes) |
| RAG | Retrieval-Augmented Generation — memória vetorial por pet |
| Narração | Texto gerado pela IA na voz do pet |
| Mood | Humor: ecstatic, happy, calm, tired, anxious, sad, playful, sick |
| Health Score | 0-100 calculado pela IA |
| Aldeia | Comunidade local (pós-MVP) |
| Pet-Credits | Moeda solidária (pós-MVP) |
| Proof of Love | Score de cuidado ativo (pós-MVP) |
| Bucket | Pasta no Supabase Storage |
| Edge Function | Função serverless Supabase (Deno) |
| RLS | Row Level Security — PostgreSQL |

---

## 14. REFERÊNCIA DE PROTÓTIPOS

Todos em `docs/prototypes/`. São referência de **layout e dados**, NÃO de cores.
A paleta deste CLAUDE.md (laranja + azul petróleo, dark) prevalece SEMPRE.
Os protótipos antigos usam emojis — no código real, substituir por ícones Lucide.

### Protótipos com identidade v5 (DEFINITIVA):
| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `petaulife_login_v5.jsx` | Login + Biometria + Cadastro completo | ✅ v5 definitivo |
| `petaulife_hub_v4.jsx` | Hub Meus Pets + Drawer Menu + Add Pet | ✅ v4 zero emojis |

### Especificação técnica:
| Arquivo | Conteúdo |
|---------|----------|
| `mvp_spec_petaulife.jsx` | 12 tabelas, 5 sprints, 88 tarefas, prompts IA, stack |
| `database_schema_petaulife.jsx` | Schema interativo 27 tabelas |
| `erd_completo_petaulife.jsx` | ERD 37 tabelas com views/triggers/functions |
| `pets_table_master.jsx` | Tabela pets: 95 campos, 33 filhas |
| `tutor_table_master.jsx` | Tabela users: ~170 campos, medalhas |
| `rede_solidaria_schema.jsx` | Rede solidária: 26 tabelas (pós-MVP) |
| `media_translation_arch.jsx` | Buckets, compressão, tradução |

### Protótipos de tela (layout de referência, paleta v1 — usar cores deste CLAUDE.md):
| Arquivo | Conteúdo |
|---------|----------|
| `pet_ai_screens.jsx` | Análises IA (foto, vídeo, áudio, OCR) |
| `rede_solidaria_pets.jsx` | Feed, mapa, SOS, Credits, playdates |
| `prontuario_saude_pet.jsx` | Vacinas, exames, remédios, consultas |
| `diario_vida_pet.jsx` | Diário/timeline com narração IA |
| `co_parentalidade_pet.jsx` | Rede de cuidadores, agenda |
| `grafico_felicidade_pet.jsx` | Curva emocional, heatmap |
| `capsula_tempo_pet.jsx` | Cápsulas do tempo |
| `testamento_emocional_pet.jsx` | Testamento e sucessão |
| `conquistas_pet.jsx` | 30 emblemas, XP, níveis |
| `qr_carteirinha_pet.jsx` | QR Code, carteirinha digital |
| `viagens_pet.jsx` | Roteiros, registros pet-friendly |
| `planos_seguros_pet.jsx` | Saúde, funerário, bem-estar |
| `nutricao_pet.jsx` | Cardápio, alimentos, receitas |

### Protótipos descartados (histórico de evolução visual):
| Arquivo | Conteúdo | Por que descartado |
|---------|----------|--------------------|
| `petaulife_mvp_sprint1.jsx` | Login + Hub v1 | Paleta laranja terroso, sem personalidade |
| `petaulife_v2_identity.jsx` | Login + Hub v2 | Teal vibrante em fundo claro, genérico |
| `petaulife_v3_dark.jsx` | Login + Hub v3 | Verde esmeralda, não combina com brand |
| `petaulife_login_v4.jsx` | Login v4 | Mic em campo de senha, biometria sem glow |
| `login_auth_pet.jsx` | Auth screens v1 | Paleta antiga, emojis |
| `meus_pets_hub.jsx` | Hub v1 | Paleta antiga, emojis |
