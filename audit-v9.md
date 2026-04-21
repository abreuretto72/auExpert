# Auditoria de Conformidade Visual — v9

**Data:** 2026-04-19
**Escopo:** Verificação do código-fonte contra CLAUDE.md v9 (§2.8 hierarquia de botões, §2.9 proibição de cores hardcoded, §3 cores dos ícones, §4 padrões visuais de UI, §17 arquivos protegidos)
**Status:** Step 1 — AUDITORIA APENAS (nenhuma modificação aplicada)

---

## Resumo Executivo

| Pilar | Arquivos | Ocorrências | Severidade |
|---|---|---|---|
| A. Cores hardcoded (hex `#...`) | 78 | 241 | Alta |
| A. Cores rgba/rgb hardcoded | 29 | ~60 | Média |
| B. Botões ad-hoc fora do canônico `<Button>` | 70+ | 186+ | Alta (dívida estrutural) |
| B. Botões com background hex hardcoded | 7 | 11 | Alta |
| C. Ícones decorativos em `accent` (contra §3) | 8 | 10+ | Média |
| C. Ícones clicáveis em cor não-accent | 5 | 6 | Baixa |
| D. Arquivos protegidos com violações | 2 | 14 (relatório) | N/A (§17) |

**Conclusão:** A regra §2.9 (cores hardcoded) está amplamente violada. A adoção do componente canônico `<Button>` é de ~1% (2 arquivos dos ~70 que contêm botões de ação). §3 (cores de ícones) tem violações pontuais, mas previsíveis. §4 está respeitado nos padrões críticos (Toast X vermelho, prefixo `Lock` em senha, microfone em laranja).

---

## Seção A — Cores Hardcoded (§2.9)

> Regra §2.9: NENHUMA cor pode estar escrita diretamente em componentes. Tudo vem de `constants/colors.ts`. Exceção aceitável: `#FFFFFF` / `#fff` / `#FFF` em texto de botão primário (universal).

### A.1 Arquivos com maior concentração de hex hardcoded (top 15)

| Arquivo | Ocorrências | Observação |
|---|---|---|
| `components/InputSelector.tsx` | 17 | Paleta própria de cores `#7D3C98`, `#C0396B`, `#95A5A6`, `#8E44AD`, `#27AE60`, `#D68910`, `#1F77BD` — 7 cores não mapeadas |
| `components/diary/DiaryModuleCard.tsx` | 12 | `#1D9E75`, `#3B6D11`, `#534AB7`, `#E24B4A`, `#BA7517`, `#E1F5EE`, `#E6F1FB` — lentes com cores próprias não mapeadas |
| `app/(app)/pet/[id]/_components/IATab.tsx` | 9 | `#FCEBEB`, `#A32D2D`, `#633806`, `#FAEEDA`, `#085041` — badges de status |
| `components/diary/DocumentScanner.tsx` | 9 | **PROTEGIDO §17 — ver Seção D** |
| `components/diary/PhotoCamera.tsx` | 9 | Tons de cinza e overlays de câmera |
| `components/PdfExportModal.tsx` | 8 | `#95A5A6`, `#8E44AD`, `#27AE60`, `#D68910` — cores de categorias |
| `components/diary/VideoRecorder.tsx` | 6 | Overlays de gravação |
| `app/(auth)/voice.tsx` | 6 | Incluindo `#000` (fundo preto puro) |
| `components/AddPetModal.tsx` | 5 | Inclui `#000`, `#7D3C98` |
| `components/AgendaLensContent.tsx` | 5 | `#0F6E56`, `#185FA5` |
| `app/(app)/pet/[id]/diary/new.tsx` | 4 | **PROTEGIDO §17 — ver Seção D** |
| `components/DrawerMenu.tsx` | 3 | Inclui `#000` |
| `components/NetworkGuard.tsx` | 2 | Inclui `#000` |
| `components/Toast.tsx` | 2 | `#000` (sombra backdrop) |
| `components/ui/Button.tsx` | 1 | **Violação no próprio componente canônico — ver A.3** |

**Totais gerais:** 241 ocorrências de hex em 78 arquivos `.tsx`; 22 ocorrências de `#000`/`#000000` em 13 arquivos.

### A.2 Cores não-mapeadas encontradas (precisam decisão em Step 2)

Estas cores não existem em `constants/colors.ts` — precisam ser aproximadas, adicionadas como tokens novos, ou substituídas por cor existente:

| Hex | Possível equivalente | Onde aparece |
|---|---|---|
| `#C0392B` | — (danger dark) | `components/ui/Button.tsx:59` (gradiente danger) |
| `#7D3C98` | `purple` #9B59B6 (aproximado) | InputSelector, AddPetModal |
| `#8E44AD` | `purple` #9B59B6 (aproximado) | PdfExportModal, InputSelector |
| `#27AE60` | `success` #2ECC71 (aproximado) | PdfExportModal, InputSelector |
| `#D68910` | `gold` #F39C12 (aproximado) | PdfExportModal, InputSelector |
| `#1F77BD` | `sky` #3498DB ou `petrol` (aproximado) | InputSelector |
| `#95A5A6` | `textSec` #8FA3B8 (aproximado) | PdfExportModal, InputSelector |
| `#1D9E75`, `#0F6E56`, `#085041` | variantes de `success` | DiaryModuleCard, AgendaLensContent, IATab |
| `#3B6D11` | variante verde escura | DiaryModuleCard |
| `#534AB7` | variante roxo | DiaryModuleCard |
| `#E24B4A`, `#A32D2D` | variantes de `danger` | DiaryModuleCard, IATab |
| `#BA7517`, `#633806` | variantes marrom/dourado escuro | DiaryModuleCard, IATab |
| `#E1F5EE`, `#E6F1FB`, `#FCEBEB`, `#FAEEDA` | tons pastel (soft bg) | DiaryModuleCard, IATab |
| `#185FA5` | variante azul | AgendaLensContent |
| `#C0396B` | `rose` #E84393 (aproximado) | InputSelector |
| `#000`, `#000000` | — | **Proibido pela §2.9** ("`#000000` NUNCA — o app é dark") |

### A.3 Violação no componente canônico `<Button>`

**Arquivo:** `components/ui/Button.tsx:57-60`

```tsx
const gradientColors = isDanger
  ? [colors.danger, '#C0392B'] as const         // ← HARDCODED
  : [colors.accent, colors.accentDark] as const;
```

O gradiente do botão destrutivo usa `'#C0392B'` diretamente em vez de um token. Violação estrutural porque o próprio componente canônico — fonte de verdade para §2.8 — viola §2.9.

### A.4 rgba / rgb hardcoded

29 arquivos contêm chamadas `rgba(...)` ou `rgb(...)` diretas. Concentração em overlays de modais, sombras e backdrops. Lista completa será detalhada em `plan-v9.md` (CAT2).

### A.5 Exceções aceitáveis identificadas (não são violações)

- `#FFFFFF` / `#fff` / `#FFF` em texto de botão primário: **127 ocorrências — aceitável per §2.9** ("branco puro é OK").
- `rgba(232, 237, 242, 0.75)` na tagline do login: **aceitável per §1** (especificação literal do CLAUDE.md).
- `rgba(0, 0, 0, ...)` em `shadowColor`: aceitável dentro de StyleSheet de sombra (mas poderia ser melhorado com token `shadowColor`).

---

## Seção B — Botões Fora da Hierarquia (§2.8)

> Regra §2.8: 5 tipos canônicos (primário, secundário, destrutivo, biométrico, link). Cada tela deve ter apenas 1 primário. Botão primário = accent + texto branco; destrutivo = danger + branco; secundário nunca usa laranja.

### B.1 Adoção do componente canônico `<Button>`

**Apenas 2 arquivos** importam e usam `<Button>` de `components/ui/Button.tsx`:
- `components/ErrorBoundary.tsx`
- `components/SectionErrorBoundary.tsx`

**Adoção efetiva ≈ 1%** considerando os 70+ arquivos que implementam botões ad-hoc via `TouchableOpacity` + `StyleSheet`.

### B.2 Cobertura do componente canônico vs §2.8

O `<Button>` atual suporta apenas 3 variantes: `'primary' | 'secondary' | 'danger'`. **Falta** suporte a:
- **Biométrico** (§2.8: gradiente `card → bgCard` com glow laranja ou roxo, padding generoso, ícone 36px strokeWidth 1.4)
- **Link textual** (§2.8: sem fundo, cor `accent`)

Observação: em hoje, `app/(auth)/login.tsx` e `register.tsx` implementam os botões biométricos com `TouchableOpacity` + `LinearGradient` diretamente — por ausência de variante no canônico, isso não é strictamente violação, mas é dívida técnica.

### B.3 Botões ad-hoc com background hardcoded hex (CAT2 — requer análise)

11 ocorrências em 7 arquivos com `backgroundColor: '#...'` direto:

| Arquivo | Linha(s) | Cor | Provável tipo |
|---|---|---|---|
| `components/InputSelector.tsx` | múltiplas | `#7D3C98`, `#27AE60`, etc. | Botões coloridos ad-hoc |
| `components/diary/DiaryModuleCard.tsx` | múltiplas | `#1D9E75`, `#534AB7`, etc. | Cards de lente |
| `app/(auth)/voice.tsx` | 457 | `#000` | Fundo de waveform |
| `components/PdfExportModal.tsx` | múltiplas | `#95A5A6`, etc. | Chips de categoria |
| `components/AddPetModal.tsx` | 788 | `#000` | Backdrop overlay |
| `components/NetworkGuard.tsx` | 244 | `#000` | Backdrop |
| `components/ui/Card.tsx` | 36 | `#000` | Shadow |

### B.4 Botões ad-hoc com `backgroundColor: colors.accent` (principais)

**120 ocorrências em ~70 arquivos.** Todos são candidatos a migração para `<Button variant="primary">`. Lista completa a compor em `plan-v9.md` — destaques:

- `components/AddPetModal.tsx` (múltiplos botões primários no wizard)
- `components/ui/DrawerMenu.tsx`, `components/ui/ConfirmModal.tsx`
- `app/(app)/pet/[id]/index.tsx`, `diary.tsx`, `nutrition.tsx`, `health.tsx`
- Telas de auth: `login.tsx`, `register.tsx`, `forgot-password.tsx`, `reset-password.tsx`
- Modais de saúde: `AddVaccineModal`, `AddAllergyModal`, `AddConsultationModal`, `AddMedicationModal`
- Preview PDFs: `*-pdf.tsx` (6 arquivos)

### B.5 Botões ad-hoc com `backgroundColor: colors.danger` (principais)

**31 ocorrências em 19 arquivos.** Candidatos a `<Button variant="danger">`. Destaques:
- Botões de excluir pet / excluir entrada
- Botões "Encerrar sessão" no settings
- Zona de perigo em várias telas

### B.6 Links textuais em `color: colors.accent` (sem background)

**72 ocorrências em 52 arquivos** — representam o tipo "link textual" de §2.8. Não são violações, mas representam um padrão que poderia virar uma variante `<Button variant="link">`.

### B.7 Múltiplos botões primários na mesma tela (requer inspeção humana)

Arquivos com 3+ ocorrências de `backgroundColor: colors.accent` na mesma tela (candidatos a revisão de hierarquia §2.8):

- `app/(auth)/register.tsx` — 4
- `app/(app)/pet/[id]/diary.tsx` — 3
- `app/(app)/pet/[id]/nutrition.tsx` — 3+
- `components/AddPetModal.tsx` — 3+ (wizard multi-step — pode ser legítimo)
- `components/diary/DiaryModuleCard.tsx` — 3+ (um por lente, escala com variedade)

Cada caso precisa decisão individual (CAT3) — se há realmente 2+ ações primárias concorrendo pelo foco do tutor.

---

## Seção C — Ícones com Cor Errada (§3, §4)

> Regra §3: ícone **clicável** = `accent` (laranja); `Trash2` = SEMPRE `danger`; ícone **decorativo** NUNCA é `accent`. Regra §4: ícone prefixo de input segue cor semântica — `petrol` para email/nome/cidade, `accent` para senha.

### C.1 Ícones decorativos usando `accent` (violações confirmadas)

| Arquivo | Linha | Ícone | Cor atual | Cor correta | Racional |
|---|---|---|---|---|---|
| `components/lenses/FriendsLensContent.tsx` | 160 | `Sparkles` | `accent` | `purple` | §3: Sparkles é indicador IA, decorativo |
| `app/(app)/pet/[id]/nutrition.tsx` | 332 | `Sparkles` | `accent` | `purple` | §3: decorativo IA |
| `app/(app)/pet/[id]/nutrition/trocar.tsx` | 600 | `Sparkles` | `accent` | `purple` | §3: decorativo IA |
| `app/(app)/pet/[id]/index.tsx` | 259 | `ShieldCheck` | `accent` | `success` | §3: ShieldCheck é indicador de saúde, decorativo |
| `components/AddVaccineModal.tsx` | 335 | `Syringe` | `accent` | `success`/`danger` conforme status | §3: Syringe é indicador de status |
| `app/(app)/pet/[id]/_health/tabs/GeneralTab.tsx` | 82 | `Info` | `accent` | `petrol` | §3: Info é decorativo de dados |

### C.2 Ícones clicáveis usando cor não-accent (violações de §3.1)

| Arquivo | Linha | Ícone | Cor atual | Cor correta | Racional |
|---|---|---|---|---|---|
| `app/(app)/pet/[id]/id-card-pdf.tsx` | 160 | `Share2` | `petrol` | `accent` | §3: clicável → accent |
| `app/(app)/pet/[id]/ia-pdf.tsx` | 119 | `Share2` | `petrol` | `accent` | §3: clicável → accent |
| `app/(app)/pet/[id]/diary-pdf.tsx` | 171 | `Share2` | `petrol` | `accent` | §3: clicável → accent |

### C.3 Ícones `Trash2` (§3.2 — sempre `danger`)

14 ocorrências totais. **12 corretas** (`danger`). 2 casos defensíveis:
- `app/(app)/settings/deleted-records.tsx:92,175` — `Trash2` com `textGhost` em lista de registros já deletados (decorativo indicando "já está na lixeira"). Não é botão de excluir — pode-se argumentar que é decorativo. **Classificar como ambíguo (Seção E).**

### C.4 Casos que parecem violação mas são CORRETOS (§4)

Estes são **intencionais por spec** e NÃO devem ser alterados:

| Arquivo | Linha | Caso | Por que é correto |
|---|---|---|---|
| `app/(auth)/login.tsx` | 178 | `<Lock color={colors.accent}>` prefixo campo senha | §4: prefixo do campo senha é `accent` |
| `app/(auth)/register.tsx` | 224, 237 | `<Lock accent>` prefixo senha/confirmação | §4: idem |
| `app/(auth)/reset-password.tsx` | 132, 149 | `<Lock accent>` prefixo senha | §4: idem |
| `components/Toast.tsx` | X de fechar | `color={colors.danger}` | §4: "X vermelho (fechar)" está na spec literal |

### C.5 Ícones em campos de input (§4 — verificação)

Grep de `prefixIcon` + `petrol` / `accent` confirma conformidade da regra §4:
- Email, nome, cidade, globo, telefone → `petrol` ✓
- Senha (Lock) → `accent` ✓
- Microfone (Mic) → `accent` em todos os campos (exceto senha onde é ocultado) ✓

Nenhuma violação de §4 encontrada nos prefixos de input.

---

## Seção D — Arquivos Protegidos Tocados (§17) — RELATÓRIO APENAS

> Regra §17: NUNCA modificar sem autorização explícita. Estes arquivos têm violações detectadas, mas **nada deve ser alterado neles**. Se comportamento visual novo for necessário, criar arquivos separados.

### D.1 `app/(app)/pet/[id]/diary/new.tsx` (PROTEGIDO)

**Violações detectadas (somente relatório):**
- 4 ocorrências de hex hardcoded
- 10 importações de ícones Lucide (auditoria de cores de ícone aplicável mas não corrigível)

**Ação:** ZERO modificações permitidas. Reportado aqui apenas para completude da auditoria.

### D.2 `components/diary/DocumentScanner.tsx` (PROTEGIDO)

**Violações detectadas (somente relatório):**
- 9 ocorrências de hex hardcoded (tons de cinza, overlays de captura, bordas de frame)
- 1 importação de ícone Lucide

**Ação:** ZERO modificações permitidas. Reportado aqui apenas para completude da auditoria.

### D.3 Arquivos protegidos sem violações detectadas

- `supabase/functions/classify-diary-entry/**` — não varrido (fora do escopo visual)
- `supabase/functions/analyze-pet-photo/**` — não varrido (fora do escopo visual)
- `hooks/useDiaryEntry.ts` — não contém JSX/StyleSheet (hook puro, fora do escopo visual)

---

## Seção E — Casos Ambíguos / Candidatos a CAT3

Casos onde a decisão não é mecânica e precisa julgamento humano antes de virar fix.

### E.1 Ícones `Shield` / `ShieldAlert` em contexto misto

| Arquivo | Linha | Ícone | Cor atual | Ambiguidade |
|---|---|---|---|---|
| `components/DrawerMenu.tsx` | 141 | `Shield` | `accent` | Item de menu clicável (accent ok) OU indicador decorativo do item? |
| `app/(app)/settings.tsx` | 197 | `Shield` | `accent` | Idem — ao lado de label de privacidade |
| `app/(app)/pet/[id]/nutrition.tsx` | 330 | `ShieldAlert` | `accent` | Dentro de botão `ActionBtn` — se é ícone DE botão, accent ok; se decorativo ao lado, não |

**Decisão necessária:** o "ícone ao lado do label" em menus conta como clicável (toda a linha é pressable) ou decorativo (só sinaliza)? A §3 atual não cobre explicitamente esse caso.

### E.2 Ícones `X` de fechar em modais

Muitos modais usam `<X color={colors.textSec}>` ou `textDim`/`textGhost` em vez de `accent`. Isso é convenção de UX (X de fechar modal costuma ser cinza discreto) mas **viola §3.1 strictamente**.

Arquivos afetados (amostra): `AddVaccineModal`, `AddAllergyModal`, `AddMedicationModal`, `AddConsultationModal`, `PdfExportModal`, vários outros modais de saúde.

**Decisão necessária:** abrir exceção documentada para "X de fechar modal" (seguir convenção universal) OU corrigir para `accent` (seguir §3 literal).

> Nota: o Toast.tsx usa X **vermelho** e isso é correto por §4. Modais de saúde usam X cinza — está fora da spec literal.

### E.3 `CheckSquare` em estados de checkbox

| Arquivo | Linha | Caso |
|---|---|---|
| `components/diary/PDFImportScreen.tsx` | 81 | `<CheckSquare color={colors.accent}>` em checkbox state |

Checkbox marcada é "clicável ou indicador de estado"? Precedente em Material Design: cor ativa indica estado, não clique. §3 não cobre.

### E.4 `Trash2` em lista de registros já deletados

`app/(app)/settings/deleted-records.tsx:92,175` — ícone em lista de itens já na lixeira. Função decorativa ("este item está deletado") não ação. §3.2 diz "Trash2 é sempre danger" — pode-se argumentar que decorativo aqui também deveria ser `danger` (vermelho = perigo/excluído).

### E.5 Cor do gradiente danger (`#C0392B`) no Button.tsx

Três caminhos possíveis:
1. Adicionar token `dangerDark: '#C0392B'` em `colors.ts` (pede aprovação)
2. Substituir pelo próprio `danger` (gradiente deixa de ser gradiente visual)
3. Calcular via color math em runtime (fora do estilo do projeto)

**Decisão necessária** em `plan-v9.md`.

### E.6 Migração em massa para `<Button>` canônico

Mover 120+ ocorrências de `TouchableOpacity + backgroundColor: colors.accent` para `<Button variant="primary">` é CAT3 por:
- Alto risco de regressão visual (paddings, gaps, ícones internos variam)
- Muitas telas têm botões "quase primário" com pequenos ajustes (largura 100% vs auto, ícone à esquerda vs direita, altura customizada) que o canônico atual não suporta

**Decisão necessária:** estender o `<Button>` canônico (adicionar props) OU manter ad-hoc em casos específicos OU fazer migração gradual arquivo-por-arquivo.

### E.7 Cores das lentes do diário (`DiaryModuleCard.tsx`)

As 20 lentes usam cores próprias não-mapeadas (`#1D9E75` nutrição, `#534AB7` comportamento, etc.). Há duas interpretações:

1. **Violação §2.9:** todas essas cores precisam virar tokens (`lensNutrition`, `lensBehavior`, …) em `colors.ts`
2. **Exceção de design:** cores de lente são uma paleta paralela, específica, e justificada para distinguir cartões visualmente

**Decisão necessária:** confirmar abordagem antes de categorizar como CAT1/CAT2.

### E.8 Cores em `InputSelector.tsx` e `PdfExportModal.tsx`

Ambos têm paletas próprias de categorias (`#7D3C98` roxo, `#27AE60` verde, `#D68910` dourado, etc.). Mesma questão que E.7 — são tokens semânticos que deveriam entrar em `colors.ts` ou devem ser substituídos pelas cores existentes aproximadas?

---

## Notas Metodológicas

1. Nenhum arquivo foi modificado nesta auditoria. Apenas leitura e grep.
2. Arquivos protegidos §17 foram escaneados para reportagem mas nada neles entra em CAT1/CAT2/CAT3.
3. Contagens agregadas vêm de grep sobre todo `./` exceto `node_modules`, `.expo`, `dist`, `build`, `.git`.
4. Ocorrências `#fff`/`#ffffff`/`#FFFFFF` em texto de botão primário foram excluídas da contagem de violações (aceitáveis por §2.9).
5. Arquivos `docs/prototypes/*.jsx` foram excluídos (são referência visual, não produção).

---

## Próximo Passo

**Step 2:** Compor `plan-v9.md` categorizando cada violação em:
- **CAT1** (aplicar automaticamente — alto grau de confiança, zero ambiguidade)
- **CAT2** (aplicar um-a-um — média confiança, precisa revisão visual após)
- **CAT3** (decisão humana antes de qualquer fix)

**PAUSA obrigatória** após `plan-v9.md` para aprovação humana antes de aplicar qualquer mudança.
