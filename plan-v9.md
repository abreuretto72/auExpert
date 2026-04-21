# Plano de Conformidade Visual — v9

**Data:** 2026-04-19
**Base:** `audit-v9.md` (Step 1)
**Status:** Step 2 — PLANO APENAS. **PAUSA OBRIGATÓRIA PARA APROVAÇÃO HUMANA ANTES DE QUALQUER MODIFICAÇÃO.**
**Arquivos protegidos §17:** NUNCA tocados, nem em nenhuma categoria.

---

## Categorias

- **CAT1** — Auto-aplicável. Alta confiança, zero ambiguidade, zero risco visual. Pode ser aplicado em lote após aprovação geral.
- **CAT2** — Um-a-um. Confiança média. Cada mudança é localmente óbvia mas pede revisão visual (diff ou screenshot) após aplicar. Aprovação por grupo.
- **CAT3** — Decisão humana. Requer escolha arquitetural/UX antes de virar task. Plano só lista perguntas e opções — nenhum fix é proposto ainda.

---

## CAT1 — Auto-aplicável (6 fixes pontuais)

Todas as mudanças são trocas 1-para-1 de prop `color` em JSX. Zero impacto em layout. Zero risco de regressão visual.

### CAT1-A — Ícones decorativos `Sparkles` de accent → purple (§3)

Sparkles é indicador de IA/análise — decorativo — §3 exige `purple`.

| # | Arquivo | Linha | Antes | Depois |
|---|---|---|---|---|
| 1 | `components/lenses/FriendsLensContent.tsx` | 160 | `color={colors.accent}` | `color={colors.purple}` |
| 2 | `app/(app)/pet/[id]/nutrition.tsx` | 332 | `color={colors.accent}` | `color={colors.purple}` |
| 3 | `app/(app)/pet/[id]/nutrition/trocar.tsx` | 600 | `color={colors.accent}` | `color={colors.purple}` |

### CAT1-B — Ícone decorativo `ShieldCheck` de accent → success (§3)

ShieldCheck é indicador de saúde/proteção — decorativo — §3 exige `success`.

| # | Arquivo | Linha | Antes | Depois |
|---|---|---|---|---|
| 4 | `app/(app)/pet/[id]/index.tsx` | 259 | `color={colors.accent}` | `color={colors.success}` |

### CAT1-C — Ícone decorativo `Info` de accent → petrol (§3)

Info é indicador de dados — decorativo — §3 exige `petrol`.

| # | Arquivo | Linha | Antes | Depois |
|---|---|---|---|---|
| 5 | `app/(app)/pet/[id]/_health/tabs/GeneralTab.tsx` | 82 | `color={colors.accent}` | `color={colors.petrol}` |

### CAT1-D — Ícones clicáveis `Share2` de petrol → accent (§3.1)

Share2 é botão clicável — §3.1 exige `accent`.

| # | Arquivo | Linha | Antes | Depois |
|---|---|---|---|---|
| 6 | `app/(app)/pet/[id]/id-card-pdf.tsx` | 160 | `color={colors.petrol}` | `color={colors.accent}` |
| 7 | `app/(app)/pet/[id]/ia-pdf.tsx` | 119 | `color={colors.petrol}` | `color={colors.accent}` |
| 8 | `app/(app)/pet/[id]/diary-pdf.tsx` | 171 | `color={colors.petrol}` | `color={colors.accent}` |

**Total CAT1:** 8 mudanças em 7 arquivos. Cada mudança é 1 linha. Tempo estimado: 5 minutos. Teste: `npx tsc --noEmit` + inspeção visual rápida das 7 telas.

---

## CAT2 — Um-a-um com revisão visual (grupos)

Cada grupo requer aprovação antes de ser aplicado. Aplicar um grupo de cada vez, verificar visualmente, commitar.

### CAT2-A — `#000` puro em backdrops/shadows (13 arquivos, 22 ocorrências)

**Regra §2.9:** `#000000` NUNCA — o app é dark.

**Proposta de substituição:**
- `backgroundColor: '#000'` em backdrop/overlay → `colors.bgDeep` (#0B1219, praticamente preto mas é token)
- `shadowColor: '#000'` → manter como `colors.bgDeep` OU adicionar token `shadowBase: '#000000'` em colors.ts (CAT3 decision — ver pergunta P1 abaixo)

**Arquivos afetados (22 ocorrências, 13 arquivos):**

| Arquivo | Ocorrências | Contexto |
|---|---|---|
| `app/(auth)/voice.tsx` | 1 | Fundo de waveform |
| `components/AddPetModal.tsx` | 1 | Backdrop do modal |
| `components/DrawerMenu.tsx` | 1 | Backdrop do drawer |
| `components/NetworkGuard.tsx` | 1 | Backdrop |
| `components/Toast.tsx` | 1 | Backdrop |
| `components/diary/VideoRecorder.tsx` | 1 | Overlay de gravação |
| `components/ui/Card.tsx` | 1 | Shadow |
| `components/ui/Button.tsx` | 0 | (usa `colors.accent` já) |
| ...outros 5 arquivos com shadows/overlays | ~15 | vários |

**Risco:** `colors.bgDeep` (#0B1219) não é idêntico a `#000` — backdrops ficam 5% mais claros. Testar visualmente em 1 tela primeiro (ex: DrawerMenu) antes de aplicar em lote.

### CAT2-B — Botões ad-hoc com `backgroundColor: '#...'` hex (11 ocorrências, 7 arquivos)

Substituir por token ou adicionar token novo conforme cor:

| Arquivo | Hex | Substituição proposta | Notas |
|---|---|---|---|
| `components/InputSelector.tsx` (7 cores) | `#7D3C98`, `#8E44AD`, `#27AE60`, `#D68910`, `#1F77BD`, `#95A5A6`, `#C0396B` | depende de CAT3-P3 | Ver pergunta P3 |
| `components/diary/DiaryModuleCard.tsx` (7 cores) | `#1D9E75`, `#3B6D11`, `#534AB7`, etc. | depende de CAT3-P4 | Ver pergunta P4 |
| `components/PdfExportModal.tsx` (4 cores) | `#95A5A6`, `#8E44AD`, `#27AE60`, `#D68910` | depende de CAT3-P3 | Ver pergunta P3 |

**Bloqueado:** esperar decisão CAT3-P3 e CAT3-P4 antes de aplicar.

### CAT2-C — Violação no componente canônico `<Button>` (1 ocorrência)

`components/ui/Button.tsx:59` — `'#C0392B'` no gradiente danger.

**Bloqueado:** esperar decisão CAT3-P2. Três caminhos possíveis lá. Não aplicar até definição.

### CAT2-D — Ícone `Syringe` em AddVaccineModal (1 ocorrência)

`components/AddVaccineModal.tsx:335` — `Syringe` decorativo usando `accent`.

**Proposta:**
```tsx
// Antes
<Syringe color={colors.accent} />

// Depois — depende do status da vacina mostrada
<Syringe color={isOverdue ? colors.danger : colors.success} />
```

**Risco:** precisa confirmar que o estado `isOverdue` está disponível no escopo do componente. Ler arquivo antes de aplicar.

### CAT2-E — rgba/rgb hardcoded fora de exceções aceitáveis (29 arquivos, ~60 ocorrências)

**Plano:** listar cada ocorrência com seu contexto (backdrop, shadow, overlay, focus ring, border com opacidade, etc.), mapear para token existente com opacidade aplicada em StyleSheet, ou adicionar token novo se necessário.

**Bloqueado:** esperar P1 (decisão sobre shadowBase / overlay tokens).

**Total CAT2:** bloqueado até respostas CAT3. Estimativa quando desbloqueado: ~2-4 horas de trabalho incremental com verificação visual por grupo.

---

## CAT3 — Perguntas para decisão humana

Nenhum fix é proposto nesta seção — apenas as perguntas e opções. As respostas orientam CAT1/CAT2 e destravam trabalho bloqueado.

### P1 — Sombras e backdrops precisam de token próprio?

**Contexto:** `#000` puro aparece em 22 lugares, majoritariamente como `shadowColor` e `backgroundColor` de backdrops. `colors.bgDeep` é a cor mais escura que temos (#0B1219).

**Opções:**
1. **Adicionar 1 token:** `shadow: '#000000'` em `colors.ts` — aceita preto puro mas tokenizado. Rápido.
2. **Adicionar 2 tokens:** `shadow: '#000000'` + `overlay: 'rgba(0,0,0,0.6)'` — cobre backdrop e sombra com intenção explícita.
3. **Reusar `bgDeep` para tudo:** backdrops e sombras usam `bgDeep`. Unificado mas sombras ficam ~5% mais claras.

**Recomendação do auditor:** opção 2. Sombras precisam de preto puro; backdrop com alpha explícito é mais correto.

### P2 — Gradiente danger no `<Button>` canônico

**Contexto:** `components/ui/Button.tsx:59` usa `'#C0392B'` direto. O gradiente é `[colors.danger, '#C0392B']`.

**Opções:**
1. **Adicionar `dangerDark: '#C0392B'`** em colors.ts (analogia perfeita com `accentDark: '#CC6E2E'`).
2. **Substituir gradiente por cor sólida** `colors.danger` — perde o efeito de gradiente mas elimina hardcode.
3. **Gradiente via alpha:** `[colors.danger, colors.danger + 'CC']` — aproximação, pode ficar sutil demais.

**Recomendação do auditor:** opção 1. Consistente com `accentDark` já existente.

### P3 — Cores categóricas (InputSelector, PdfExportModal)

**Contexto:** 7+ cores hardcoded (roxo, verde, dourado, azul, rosa, cinza) usadas como identificadores visuais de categorias de input ou exportação.

**Opções:**
1. **Mapear para tokens existentes aproximados:**
   - `#7D3C98`, `#8E44AD` → `purple` (#9B59B6)
   - `#27AE60` → `success` (#2ECC71)
   - `#D68910` → `gold` (#F39C12)
   - `#1F77BD` → `sky` (#3498DB)
   - `#95A5A6` → `textSec` (#8FA3B8)
   - `#C0396B` → `rose` (#E84393)
   
   Risco: mudança visual perceptível (cores aproximadas, não idênticas).

2. **Adicionar tokens próprios:** `categoryPurple`, `categoryGreen`, etc. — preserva cores originais mas polui `colors.ts`.

3. **Eliminar diferenciação por cor:** usar 1 cor neutra + ícone/label para distinguir. Reduz paleta mas pode perder affordance visual.

**Recomendação do auditor:** opção 1 se design concordar com pequeno ajuste visual; opção 2 se cores originais forem intencionais e distintas.

### P4 — Cores das 20 lentes do diário

**Contexto:** `DiaryModuleCard.tsx` tem ~7 cores próprias que identificam lentes (nutrição, comportamento, saúde, agenda, etc.). São cores de marcação, não de ação.

**Opções:**
1. **Adicionar tokens semânticos** (`lensNutrition`, `lensBehavior`, `lensHealth`, …) em `colors.ts`. Preserva design, polui paleta.
2. **Mapear para paleta existente** (`lime` para nutrição, `purple` para comportamento, `success` para saúde, `sky` para agenda, etc.). Menos cores novas, alinha lentes ao sistema.
3. **Criar arquivo separado** `constants/lensColors.ts` com a paleta das lentes, importado só em DiaryModuleCard. Isola a exceção.

**Recomendação do auditor:** opção 3. Lentes têm semântica própria que não se encaixa nas cores principais, mas isolar em arquivo evita poluir `colors.ts`.

### P5 — X de fechar em modais (convenção UX vs §3)

**Contexto:** dezenas de modais (`AddVaccineModal`, `AddAllergyModal`, `PdfExportModal`, etc.) usam `<X color={colors.textSec}>` ou `textDim` para o botão de fechar. Isso é convenção UX universal (X cinza discreto) mas viola §3.1 literal ("clicável = accent").

**Opções:**
1. **Abrir exceção documentada em CLAUDE.md:** adicionar §3 nota "X de fechar modal usa `textSec` — convenção de UX, atenua ação secundária". Não altera código.
2. **Corrigir para `accent`:** aplica §3 literalmente. Risco: chama atenção excessiva para o X em detrimento da ação principal do modal.
3. **Adotar Toast.tsx como padrão:** X vermelho (`danger`) em todos os modais. Consistência interna do app.

**Recomendação do auditor:** opção 1. Convenção UX tem bons motivos. Documentar a exceção.

### P6 — CheckSquare em state de checkbox

**Contexto:** `components/diary/PDFImportScreen.tsx:81` — `<CheckSquare color={colors.accent}>` quando checkbox está marcada.

**Opções:**
1. **Manter `accent`:** checkbox marcada é estado ativo, merece destaque. Análogo a Material Design.
2. **Trocar para `success`:** estado "OK/confirmado" usa verde.
3. **Documentar como exceção:** checkbox state é híbrido clicável/indicador, aceita ambos.

**Recomendação do auditor:** opção 3. Documentar exceção — a linha inteira é clicável e a cor sinaliza estado.

### P7 — Trash2 em lista de registros já deletados

**Contexto:** `app/(app)/settings/deleted-records.tsx:92,175` — `Trash2` com `textGhost`. Não é ação de deletar, é indicador visual.

**Opções:**
1. **Corrigir para `danger`:** §3.2 literal ("Trash2 é SEMPRE danger"). Lista fica com muito vermelho.
2. **Manter `textGhost`:** semântica "já descartado, não é acionável". Viola §3.2 literal.
3. **Trocar ícone:** usar `Archive` ou `FileX` em vez de `Trash2` para registros já deletados. Remove o conflito.

**Recomendação do auditor:** opção 3. Resolve o conflito sem abrir exceção.

### P8 — Múltiplos botões primários na mesma tela (B.7 do audit)

**Contexto:** algumas telas têm 3-4 ocorrências de `backgroundColor: colors.accent` em botões. §2.8 diz "apenas 1 botão primário por tela".

**Arquivos candidatos a revisão:**
- `app/(auth)/register.tsx` (4)
- `app/(app)/pet/[id]/diary.tsx` (3)
- `app/(app)/pet/[id]/nutrition.tsx` (3+)

**Ação proposta:** revisão tela-a-tela. Nem toda ocorrência de `colors.accent` em background é necessariamente um "botão primário" concorrente — FABs, pills, chips, toggles também usam accent. Inspeção humana antes de qualquer fix.

**Status:** abrir como sub-tasks individuais em CAT3 após aprovação geral.

### P9 — Estender `<Button>` canônico para §2.8 completo

**Contexto:** o canônico cobre apenas 3 das 5 variantes de §2.8. Falta `biometric` e `link`.

**Opções:**
1. **Estender agora:** adicionar `'biometric-finger' | 'biometric-face' | 'link'` ao union de `ButtonVariant`. Trabalho adicional de ~2h mas destrava migração em massa.
2. **Deixar como está:** biométrico e link continuam ad-hoc por serem estilisticamente específicos.
3. **Criar componentes irmãos:** `<BiometricButton>` e `<LinkButton>` em vez de sobrecarregar `<Button>`.

**Recomendação do auditor:** opção 3. Biometric e link são visualmente distintos o suficiente para merecerem componentes próprios. `<Button>` fica focado em primário/secundário/danger.

### P10 — Migração em massa TouchableOpacity → `<Button>` (120+ ocorrências)

**Contexto:** adoção do canônico é ~1%. 120+ ocorrências de botões ad-hoc com `backgroundColor: colors.accent`.

**Opções:**
1. **Migração gradual ao longo de sprints:** um arquivo por vez, com PR dedicado. Baixo risco, progresso lento.
2. **Migração em lote arquivo-por-arquivo com aprovação:** CAT3 dividido em sub-tasks, cada uma um arquivo.
3. **Aceitar ad-hoc como padrão:** revisar §2.8 para permitir construção ad-hoc desde que siga regras de cor/texto. Reduz dívida percebida mas mantém 120 pontos onde violação pode surgir.
4. **Bloquear via lint rule:** ESLint custom que detecta `TouchableOpacity` com `backgroundColor: colors.accent` e sugere migração. Previne crescimento sem forçar refactor imediato.

**Recomendação do auditor:** opção 1 + opção 4 em paralelo. Migração gradual começando por auth screens (4 arquivos de alto impacto), com lint rule prevenindo nova dívida.

---

## Ordem proposta de execução (após aprovações)

1. **Aplicar CAT1** (8 mudanças, ~5min, baixíssimo risco). Commit atômico: `fix(visual): icon colors per §3 (CAT1)`.
2. **Aguardar respostas P1-P10.**
3. **Atualizar `colors.ts`** com novos tokens aprovados (conforme P1, P2, possivelmente P3/P4). Commit atômico: `chore(colors): add tokens per plan-v9 (CAT3 decisions)`.
4. **Aplicar CAT2 em sub-grupos**, um commit por grupo, com verificação visual entre grupos:
   - CAT2-C (Button.tsx gradient) → commit `fix(button): tokenize danger gradient`
   - CAT2-D (AddVaccineModal Syringe) → commit `fix(vaccine-modal): syringe color reflects status`
   - CAT2-A (`#000` → tokens) → commit `fix(visual): replace #000 with tokens`
   - CAT2-B (botões hex hardcoded) → commits por arquivo: InputSelector, PdfExportModal, DiaryModuleCard
   - CAT2-E (rgba hardcoded) → commits por contexto: shadows, overlays, focus rings, borders
5. **Resolver P8-P10** como tracks separadas de refactor (não bloqueiam conformidade §2.9).
6. **Step 4 (compliance-v9.md)**: re-executar grep, `npx tsc --noEmit`, verificar WCAG AA dos novos tokens, assinar conformidade v9.

---

## PARADA OBRIGATÓRIA

**Este plano requer aprovação antes de qualquer modificação de código.**

**Aguardando respostas para:**
- Aprovar ou ajustar CAT1 (8 fixes pontuais de cor de ícone)
- Respostas P1 a P7 (desbloqueiam CAT2)
- Direcionamento sobre P8 a P10 (trabalho estendido pós-MVP)

Após aprovação, proceder em ordem proposta. Nenhum arquivo protegido §17 será tocado em nenhuma hipótese.
