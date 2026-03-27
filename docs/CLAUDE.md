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

### Alertas
- Sucesso: borda + bg `successSoft`, texto + ícone `success`
- Erro/Perigo: borda + bg `dangerSoft`, texto + ícone `danger`
- Aviso: borda + bg `warningSoft`, texto + ícone `warning`
- Info: borda + bg `petrolSoft`, texto + ícone `petrol`

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

- Narração diário: max 150 palavras, 1ª pessoa do pet, tom varia com humor
- Análise foto: JSON, NUNCA diagnosticar, comparar via RAG
- Insight semanal: max 60 palavras, específico, acionável
- Model: `claude-sonnet-4-20250514`

---

## 10. CONVENÇÕES

- Componentes: PascalCase. Hooks: useXxx. Stores: xxxStore. SQL: snake_case
- TypeScript strict, sem `any`, Zod para validação
- Functional components only, StyleSheet.create() em produção
- i18n obrigatório: todas strings em JSON, nunca hardcode
- Commits: `type(scope): message` em inglês
- **NUNCA EMOJIS** no código — sempre ícones Lucide

---

## 11. GLOSSÁRIO

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

## 12. REFERÊNCIA DE PROTÓTIPOS

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
