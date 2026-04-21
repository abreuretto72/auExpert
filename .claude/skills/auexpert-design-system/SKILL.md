---
name: auexpert-design-system
description: Sistema de design completo do auExpert — paleta de cores, tipografia com fontes do sistema, hierarquia de botões (5 tipos), catálogo de ícones Lucide, logotipo, espaçamento e sombras. Use SEMPRE que o trabalho envolver UI visual, StyleSheet, escolha de cor, fonte, ícone, botão, layout de tela, identidade visual, mockup, componente de UI do auExpert, ou qualquer decisão estética. Também obrigatório quando o usuário mencionar "cor", "botão", "ícone", "logo", "fonte", "tipografia", "design", "visual", "tema dark", "laranja", "azul petróleo", "StyleSheet" — mesmo sem pedir explicitamente por design system.
---

# auExpert Design System

Tema: **dark premium** — fundo azul petróleo escuro, acentos em laranja vibrante. Sofisticado, tecnológico, acolhedor. Alto contraste, espaçamento generoso.

## Princípio de equilíbrio de cores (crítico)

Cada cor tem um papel. Se tudo aparece em todo lugar, nada comunica nada.

- **Laranja `accent`** = AÇÃO. Botões primários, links clicáveis, CTAs, o "+". Exagero dilui.
- **Azul petróleo `petrol`** = BASE informativa. Ícones decorativos de dados, email, globo, info. Ancora o app.
- **Roxo `purple`** = EMOÇÃO + IA. Análises, gatos, biometria facial, inteligência.
- **Verde `success`** = APENAS sucesso/saúde. Checks, vacinas em dia, health score alto. Nunca como brand.
- **Vermelho `danger`** = APENAS perigo. Erros, vacinas vencidas, lixeira, zona de perigo. Nunca decorativo.

## Paleta (`constants/colors.ts`)

```typescript
export const colors = {
  // Backgrounds
  bg:           '#0F1923',  bgCard:     '#162231',  bgDeep:    '#0B1219',
  card:         '#1A2B3D',  cardHover:  '#1E3145',  cardGlow:  '#1F3448',
  glow:         '#2A4A6B',

  // Brand primary — laranja
  accent:       '#E8813A',  accentLight: '#F09A56', accentDark: '#CC6E2E',
  accentGlow:   '#E8813A15',accentSoft:  '#E8813A08',accentMed: '#E8813A25',

  // Brand secondary — azul petróleo
  petrol:       '#1B8EAD',  petrolLight: '#22A8CC', petrolDark: '#15748F',
  petrolGlow:   '#1B8EAD15',petrolSoft:  '#1B8EAD08',

  // Semânticas
  success:      '#2ECC71',  successSoft: '#2ECC7112',
  danger:       '#E74C3C',  dangerSoft:  '#E74C3C12',
  warning:      '#F1C40F',  warningSoft: '#F1C40F12',
  purple:       '#9B59B6',  purpleSoft:  '#9B59B612',
  gold:         '#F39C12',  goldSoft:    '#F39C1212',
  rose:         '#E84393',  roseSoft:    '#E8439312',
  sky:          '#3498DB',  skySoft:     '#3498DB12',
  lime:         '#A8D948',  limeSoft:    '#A8D94812',

  // Texto
  text:         '#E8EDF2',  textSec:    '#8FA3B8',  textDim:   '#5E7A94',
  textGhost:    '#2E4254',  placeholder: '#5E7A94',

  // Estrutura
  border:       '#1E3248',  borderLight: '#243A50',
} as const;
```

## Sombras

```typescript
export const shadows = {
  sm:      '0 2px 12px rgba(0, 0, 0, 0.25)',        // cards padrão
  md:      '0 8px 30px rgba(0, 0, 0, 0.30)',        // cards elevados
  lg:      '0 16px 50px rgba(0, 0, 0, 0.40)',       // modais, drawers
  accent:  '0 8px 30px rgba(232, 129, 58, 0.25)',   // botões laranja
  petrol:  '0 6px 20px rgba(27, 142, 173, 0.20)',   // botões azul petróleo
  danger:  '0 6px 20px rgba(231, 76, 60, 0.20)',    // botões de perigo
};
```

## Espaçamento e raios

```typescript
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 };

export const radii = {
  sm: 8,    // badges, chips pequenos
  md: 10,   // chips de raça, tags
  lg: 12,   // inputs, botões menores, itens de menu
  xl: 14,   // botões principais
  xxl: 18,  // cards de stats
  card: 22, // cards de pet, cards grandes
  modal: 26,// bottom sheets
  phone: 44,// device frame (protótipo)
};
```

## Tipografia — legibilidade máxima

**Apenas fonte do sistema (SF Pro iOS / Roboto Android). Zero fontes customizadas.**

Motivo: tutor inclui idosos, deficientes visuais, pessoas em emergência com o pet. Fonte "esteticamente diferente" que é 5% menos legível é inaceitável. Fontes do sistema são otimizadas pela Apple/Google pra UI mobile.

```typescript
// constants/fonts.ts
import { Platform } from 'react-native';

export const fonts = {
  system: Platform.select({
    ios: 'System',      // renderiza SF Pro
    android: 'Roboto',
    default: 'System',
  }),
};
// Para números tabulares: <Text style={{ fontVariant: ['tabular-nums'] }}>
```

**Regras invioláveis:**

1. Zero `fontFamily` customizado (Sora, Caveat, JetBrains Mono, Inter, Poppins…)
2. Zero `fontStyle: 'italic'` em narração ou texto corrido
3. Zero cursiva / handwriting
4. Sistema escolhe fonte — padrão `{ fontSize, fontWeight }` sem `fontFamily`
5. Nunca `allowFontScaling={false}` — quebra acessibilidade Dynamic Type
6. Mínimo 14px em corpo, 12px em label, 11px nunca

**Hierarquia:**

| Elemento | Tamanho | Peso | Cor | Obs |
|---|---|---|---|---|
| Título tela (h1) | 22-28px | 700 | `text` | — |
| Nome pet em cards | 22px | 700 | `text` | — |
| Subtítulo (h2) | 16-18px | 700 | `text` | — |
| Corpo | 14-16px | 400-500 | `text` | mín 14px |
| Labels/captions | 12-13px | 600-700 | `textSec` | letter-spacing 0.3-0.5 |
| Section headers | 12-13px | 700 | `textDim` | letter-spacing 1.5-1.8 |
| Scores numéricos | 16-22px | 700 | `text` | `tabular-nums` |
| Dados/timestamps | 12-13px | 500 | `textDim` | `tabular-nums` |
| Narração do pet | 16px | 400 | `text` | regular, SEM itálico |
| Botões | 14-16px | 700 | branco ou `accent` | — |

**Narração do pet** — diferenciação visual sem cursiva: container com `backgroundColor: colors.accentSoft` + `borderLeftWidth: 3` + `borderLeftColor: colors.accent`. O contraste vem do container, não da fonte.

## Hierarquia de botões — 5 tipos

**Nem todo botão é laranja.** Hierarquia visual existe pra o tutor entender em 1s qual é a ação principal.

| Tipo | Fundo | Texto | Uso |
|---|---|---|---|
| **Primário** | `accent` | branco `#FFFFFF` | Salvar, Confirmar, Gerar, Registrar, Continuar |
| **Secundário** | `card` + borda `border` | `textSec` | Cancelar, Voltar, Pular |
| **Destrutivo** | `danger` | branco | Deletar, Excluir, Remover, Encerrar |
| **Biométrico** | gradiente `card → bgCard` com glow | `textSec` | Digital (laranja), Face ID (roxo) |
| **Link textual** | sem fundo | `accent` | "Ver todos", "Saiba mais", "Editar" inline |

**Invioláveis:**

- Primário SEMPRE `accent` + texto branco. Sem exceção.
- Destrutivo SEMPRE `danger` + texto branco. Convenção universal.
- Secundário NUNCA usa laranja.
- Cada tela tem APENAS 1 botão primário. Se tem 2, repensar hierarquia.
- Ícones dentro de botão primário são BRANCOS — nunca laranja (fundem no fundo).
- `confirm()` do Toast: "Confirmar" é laranja, "Cancelar" é cinza.

## Ícones — Lucide React Native

**Proibido emoji em qualquer lugar do código.** Emojis variam entre plataformas, não escalam, parecem amadores.

```bash
npx expo install lucide-react-native react-native-svg
```

```typescript
import { Dog, Cat, Heart, Camera, Bell } from 'lucide-react-native';
<Dog size={24} color={colors.accent} strokeWidth={1.8} />
```

**Regras de cor dos ícones — INVIOLÁVEIS:**

1. **Todo ícone clicável é laranja (`accent`).** Botões de ação, links, toggles, seletores, mic, editar, compartilhar, etc. Se o tutor pode tocar, é laranja.
2. **ÚNICA EXCEÇÃO: `Trash2` é sempre `danger` (vermelho).** Em qualquer contexto. Sinaliza perigo e irreversibilidade.
3. **Ícones decorativos (indicadores, status) usam cor semântica.** Nunca laranja. Ex: `ShieldCheck` verde para "saúde ok", `Mail` petrol para ícone de email em label, `Sparkles` roxo para indicador de IA.

**Catálogo mínimo:**

| Contexto | Ícone | Cor | Clicável |
|---|---|---|---|
| Cão | `Dog` | `accent` | Sim |
| Gato | `Cat` | `accent` | Sim |
| Saúde (indicador) | `ShieldCheck` | `success` | Não |
| Vacina (indicador) | `Syringe` | `danger`/`success` | Não |
| Diário | `BookOpen` | `accent` | Sim |
| Humor | `SmilePlus` | `accent` | Sim |
| Análise IA (indicador) | `ScanEye` | `purple` | Não |
| Foto / câmera | `Camera` | `accent` | Sim |
| Notificação | `Bell` | `accent` | Sim |
| Alerta (indicador) | `AlertCircle` | `danger` | Não |
| Configurações | `Settings` | `accent` | Sim |
| Sair | `LogOut` | `accent` | Sim |
| Adicionar | `Plus` | `accent` | Sim |
| Voltar | `ChevronLeft` | `accent` | Sim |
| Avançar (em botão) | `ArrowRight` | branco | Sim |
| Check (indicador) | `Check` | `success` | Não |
| Fechar | `X` | `accent` | Sim |
| Editar | `Pencil` | `accent` | Sim |
| **Lixeira / Excluir** | **`Trash2`** | **`danger` (SEMPRE)** | Sim |
| Biometria digital | `Fingerprint` | `accent` | Sim |
| Face ID | `ScanFace` | `accent` | Sim |
| Estrela / Coroa (indicador) | `Star` / `Crown` | `gold` | Não |
| Localização | `MapPin` | `accent` | Sim |
| Email (indicador) | `Mail` | `petrol` | Não |
| IA / Sparkle (indicador) | `Sparkles` | `purple` | Não |
| Microfone (STT) | `Mic` | `accent` SEMPRE | Sim (exceto senha) |

Para ícone decorativo fora dessa lista, escolher cor semântica conforme o papel; se for clicável novo, usar `accent`.

## Cores por contexto (rápido)

| Contexto | Cor | Uso |
|---|---|---|
| Ação principal (CTA) | `accent` | botões primários, "+", links |
| Dados/info | `petrol` | links secundários, badges info |
| Sucesso/saúde | `success` | vacinas em dia, checks |
| Erro/perigo | `danger` | erros, lixeira, vacinas vencidas |
| IA/análises | `purple` | análise foto, narração, RAG, gatos |
| Cães (destaque de card) | `accent` | — |
| Gamificação | `gold` | XP, conquistas, estrelas |
| Legado/memorial | `rose` | cápsulas, testamento |
| Viagens | `sky` | roteiros, mapas |
| Nutrição | `lime` | cardápio, alimentos |

## Regra de cores hardcoded — INVIOLÁVEL

Nenhuma cor escrita direto em componente. Tudo de `constants/colors.ts`.

```typescript
// ⛔ PROIBIDO
{ backgroundColor: '#E8813A' }
{ color: '#FFFFFF' }  // exceção: texto de botão primário OK
<Icon color="#E8813A" />

// ✅ OBRIGATÓRIO
import { colors } from '../constants/colors';
{ backgroundColor: colors.accent }
<Icon color={colors.accent} />
```

Checklist antes de commit:

```bash
grep -rn --include="*.tsx" --exclude="colors.ts" "#[0-9A-Fa-f]\{3,8\}" src/
# Se retornar algo → mover para colors.ts
```

## Logotipo e ícone do app

Duas peças distintas, nunca misturar:

**A) Ícone do app** — `assets/images/icon_app_ok.png`
- Cachorrinho estilizado azul petróleo + laranja, balão de "au", fundo mint/teal
- Uso: Play Store, App Store, ícone no celular, notificações push, favicon web
- NÃO usar dentro das telas

**B) Logotipo** — `assets/images/logotipotrans.png` (PNG transparente)
- Cachorro cartoon + balão "au" + texto "Expert" em laranja bold
- Uso: telas internas, login, headers, drawer, documentos
- 3 tamanhos oficiais:

| Tamanho | Onde | Largura | Altura |
|---|---|---|---|
| `large` | login, onboarding, splash | `rs(260)` | `rs(80)` |
| `normal` | header do hub, telas internas | `rs(180)` | `rs(55)` |
| `small` | drawer, footer, badges | `rs(130)` | `rs(40)` |

**Regras:**

- SEMPRE usar componente `AuExpertLogo` — nunca referenciar a imagem direto
- SEMPRE `resizeMode="contain"` — nunca esticar ou distorcer
- Nunca adicionar sombra, borda ou efeito ao logotipo
- Nunca reconstruir em código (SVG/texto) — usar o PNG oficial

```typescript
<AuExpertLogo size="large" />   // login
<AuExpertLogo size="normal" />  // hub header
<AuExpertLogo size="small" />   // drawer, footer
```

**Tagline** (apenas tela de login, abaixo do logo large):
- "Uma inteligência única para o seu pet"
- Cor `rgba(232, 237, 242, 0.75)`, sistema weight 500, 14px, letterSpacing 0.5
- margin-top 18px
