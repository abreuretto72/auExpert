# Auditoria i18n — Strings Hardcoded

> Relatório gerado em **2026-04-19**. Escopo: `app/`, `components/`, `hooks/`, `lib/`, `utils/` (171 arquivos TS/TSX). Exclui `docs/prototypes/`, `supabase/`, testes, scripts.
>
> Objetivo: identificar todo texto visível ao tutor que não passa por `t(...)` do react-i18next. Regra base: **CLAUDE.md §10.2 — zero strings hardcoded**.

---

## Resumo executivo

| Severidade | Ocorrências | Arquivos |
|---|---|---|
| **CRITICAL** | 2 | 1 |
| **HIGH** | 2 | 2 |
| **MEDIUM** | 32 | 1 |
| **LOW** | 6 | 3 |
| **Dead code** | 1 | 1 |
| **TOTAL** | 43 | 6 |

**Boas notícias:**
- Zero uso de `Alert.alert()` (regra inviolável do projeto).
- Zero `toast(...)` com literais — todos passam por `t('toast.*')`.
- Pipeline de erros (`utils/errorMessages.ts`) 100% i18n-clean.
- Componentes genéricos (`components/ui/*`), onboarding, login, hub, settings, drawer, ErrorBoundary — todos 100% limpos.

**Risco principal:** o maior vetor de vazamento de PT-BR para usuários em outros idiomas é `lib/achievements.ts` (fallbacks `defaultValue`) e os 2 títulos de *insights* que são **gravados em português no banco** (`pet_insights.title`) e ficam permanentemente em PT-BR mesmo para um usuário EN-US.

---

## CRITICAL

### `hooks/_diary/backgroundClassify.ts` — títulos de insights gravados em PT-BR no banco

**Por que é crítico:** esses títulos entram na tabela `pet_insights.title` e são renderizados diretamente em `components/pet/IATab.tsx:169` como `{insight.title}`. Ou seja: uma conta criada em português gera insights em português; se o tutor depois muda o idioma do celular, os insights antigos continuam em PT-BR para sempre. É um vazamento persistente, não apenas visual.

| Arquivo:linha | Literal |
|---|---|
| `hooks/_diary/backgroundClassify.ts:994` | `title: 'Planta/objeto tóxico detectado na foto'` |
| `hooks/_diary/backgroundClassify.ts:1014` | `title: 'Baixa energia ou dificuldade de locomoção detectada'` |

Mesmo problema também no `body` dessas duas entradas (linhas 995 e 1015, que concatenam `"Energia: X/100. Locomoção: Y/100."`).

**Correção recomendada:** gerar o título via `i18n.t('insights.photoToxic.title')` e `i18n.t('insights.videoLowEnergy.title')` no momento de salvar, usando o idioma do tutor. Como a Edge Function de classify já recebe o `language`, o ideal é o próprio classifier retornar o título traduzido — não o cliente hardcodar.

---

## HIGH

### 1. `app/(app)/pet/[id]/prontuario.tsx:237` — label "Microchip:" visível

```tsx
<Text style={s.microchip}>Microchip: {prontuario.microchip}</Text>
```

**Correção:** `<Text>{t('prontuario.microchip', { value: prontuario.microchip })}</Text>` com a chave `prontuario.microchip = "Microchip: {{value}}"` (PT-BR) e `"Microchip: {{value}}"` (EN-US — coincidência acertada, mas precisa da chave pra outros idiomas).

### 2. `app/(app)/pet/[id]/nutrition/racao.tsx:98` — label "kcal/dia"

```tsx
<StatBox label="kcal/dia" value={String(food.calories_kcal)} />
```

**Correção:** `label={t('nutrition.caloriesPerDay')}`.

---

## MEDIUM

### `lib/achievements.ts` — 32 fallbacks em PT-BR no catálogo de conquistas

Cada conquista tem a forma:
```ts
{
  key: 'first_entry',
  titleKey: 'achievements.catalog.first_entry.title',
  title: 'Primeiro Registro',               // ← fallback hardcoded PT-BR
  descKey: 'achievements.catalog.first_entry.desc',
  desc: 'Criou a primeira entrada no diário', // ← fallback hardcoded PT-BR
  ...
}
```

O consumidor é `components/lenses/AchievementsLensContent.tsx:100`:
```ts
const displayTitle = t(achievement.titleKey, { defaultValue: achievement.title });
```

**Por que é MEDIUM e não HIGH:** quando a chave i18n existe, ela vence — o fallback só aparece em caso de falha de tradução. Mas isso é uma rede de proteção frágil: basta esquecer uma chave em `en-US.json` e o tutor anglófono vê "Primeiro Registro".

**Impacto:** 16 conquistas × 2 strings (title + desc) = **32 fallbacks PT-BR**. Linhas aproximadas no arquivo: 71, 72, 77, 78, 83, 84, 89, 90, 95, 96, 101, 102, 107, 108, 113, 114, 119, 120, 125, 126, 131, 132, 137, 138, 151, 152, 159, 160, 165, 166, 171, 172, 177, 178, 185, 186, 197, 198, 203, 204, 211, 212, 217, 218, 223, 224, 229, 230, 237, 238, 249, 250, 263, 264, 271, 272.

**Correção recomendada (duas opções):**
- **A (preferida):** remover o `title`/`desc` hardcoded, deixar só `titleKey`/`descKey`, e garantir via teste automatizado que toda chave existe nos dois JSONs.
- **B (conservadora):** manter fallback mas trocar por chave neutra em inglês (`'First entry'`) — ainda vaza, mas vaza em inglês que é menos ruim que PT-BR para um usuário chinês.

---

## LOW

### Placeholders de formulário com texto PT-BR

| Arquivo:linha | Literal | Contexto |
|---|---|---|
| `app/(app)/pet/[id]/edit.tsx:340` | `placeholder="kg"` | campo de peso do pet |
| `app/(app)/pet/[id]/nutrition/racao.tsx:121` | `placeholder="4.5"` | exemplo numérico em calculadora |
| `app/(app)/pet/[id]/coparents.tsx:282` | `placeholder="email@exemplo.com"` | exemplo de email em convite de co-tutor |
| `components/diary/TimelineCards.tsx:598` | `placeholder="qtd"` | abreviação PT de "quantidade" em OCR |
| `components/diary/TimelineCards.tsx:606` | `placeholder="0,00"` | formato de moeda BR (vírgula decimal) |
| `components/diary/TimelineCards.tsx:641` | `placeholder="—"` | separador visual genérico |

**Por que LOW:** são dicas discretas; a maioria é quase universal (`kg`, `0,00`, `—`) ou é um exemplo técnico (`email@exemplo.com`). Ainda assim, vão para i18n se quisermos tradução estrita.

---

## Dead code

### `App.tsx` — arquivo órfão do Expo boilerplate

```tsx
<Text>Open up App.tsx to start working on your app!</Text>
```

**Por que reportar:** o projeto usa Expo Router (entry point em `app/_layout.tsx`), então `App.tsx` na raiz **nunca é renderizado**. É sobra do scaffolding inicial. Recomendação: **deletar o arquivo**.

---

## Arquivos auditados e confirmados 100% i18n-clean

- `app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`
- `app/(app)/index.tsx` (Hub), `settings.tsx`, `help.tsx`
- `components/AddPetModal.tsx`, `DrawerMenu.tsx`, `AuExpertLogo.tsx`, `PetCard.tsx`, `Toast.tsx`, `ErrorBoundary.tsx`, `NetworkGuard.tsx`
- `components/ui/*` (todos — Input, Button, Card, Badge, Modal, etc.)
- `components/diary/` (exceto `TimelineCards.tsx` com placeholders LOW)
- `hooks/*` (exceto `_diary/backgroundClassify.ts` com os 2 CRITICAL)
- `utils/errorMessages.ts` (pipeline de tradução de erros — 100% i18n)
- `lib/` (exceto `achievements.ts` MEDIUM)

---

## Plano de correção sugerido

1. **Sprint 1 (CRITICAL + HIGH — ~1h):** 4 correções mecânicas
   - `backgroundClassify.ts` 994, 1014 → mover para Edge Function e retornar título/corpo já traduzidos, OU usar `i18n.t(...)` no cliente antes de salvar
   - `prontuario.tsx:237` → `t('prontuario.microchip', { value })`
   - `racao.tsx:98` → `t('nutrition.caloriesPerDay')`
   - Acrescentar chaves em `pt-BR.json` e `en-US.json`

2. **Sprint 2 (MEDIUM — ~2h):** `lib/achievements.ts`
   - Opção A: remover fallbacks, adicionar teste `scripts/check-i18n-keys.ts` que percorre `ACHIEVEMENT_CATALOG` e valida que `titleKey`/`descKey` existem nos dois JSONs. Falha no CI se faltar.

3. **Sprint 3 (LOW — ~30min):** 6 placeholders
   - Substituir por `t('...')` conforme severidade de negócio.
   - Pode ser feito em um único commit.

4. **Housekeeping:** deletar `App.tsx` órfão (1 linha de git).

---

## Observações

- O compliance geral do codebase é **muito alto** (~99% dos arquivos limpos). A dívida restante é pontual e mecânica.
- O maior risco sistêmico (não visto nesta auditoria mas vale monitorar) é a tabela `pet_insights` guardando títulos em um único idioma — vale discutir se o esquema deveria ter `title_i18n_key` + `title_params` em vez de `title` texto livre, para permitir re-renderização em qualquer idioma.
- Recomendo adicionar um lint rule (ESLint custom ou pre-commit grep) que falha em strings literais em `<Text>`, `placeholder=`, `toast(` e `Alert.alert(`. Evita regressões.
