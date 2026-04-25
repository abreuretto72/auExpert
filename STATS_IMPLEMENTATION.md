# Tela "Minhas Estatísticas" — implementação

**Status:** código pronto no working tree. Aguardando commit + push + teste no device.

**Sessão:** 2026-04-24 (noite). Implementado conforme spec em `PROMPT_CLAUDE_CODE_TUTOR_STATS (1).md` que veio anexa, com adaptações para a arquitetura real do auExpert (descritas abaixo).

**Update durante a sessão:** após implementação inicial com strings pt-BR hardcoded conforme a spec autorizou, **migrei pra i18n completo** (pt-BR + en-US) num segundo passo. CLAUDE.md regra inviolável #1 (proibição de strings hardcoded) agora é respeitada. Detalhes na seção "Migração i18n" abaixo.

---

## TL;DR — comandos pra rodar de manhã

```powershell
cd E:\aa_projetos_claude\auExpert

# (1) Limpar lixo de bundle MCP da sessão anterior, se ainda existir
del .tmp_deploy_bundle.json -ErrorAction SilentlyContinue
del .tmp_chunk_0.json, .tmp_chunk_1.json, .tmp_chunk_2.json, .tmp_chunk_3.json -ErrorAction SilentlyContinue

# (2) Reparar git index se ainda estiver corrompido (sintoma:
#     "fatal: unknown index entry format 0xc9480000" em git status)
del .git\index
git reset

# (3) Stage + verificar
git add .
git status --short

# (4) Commit (granular ou único)
git commit -m "feat: add Minhas Estatísticas screen with login tracking + i18n

- types/userStats.ts: shape do JSONB de get_user_stats RPC + map de chaves i18n
- hooks/useUserStats.ts: React Query consumindo a RPC + helpers
- lib/recordUserLogin.ts: helper best-effort que chama record_user_login RPC
- app/(app)/stats.tsx: tela completa com useTranslation
- components/DrawerMenu.tsx: nova entrada 'Minhas Estatísticas' (i18n)
- stores/authStore.ts: instrumentar login (password) + biometricLogin (biometric)
- app/(auth)/register.tsx: registrar primeiro login após signup com sessao
- i18n/pt-BR.json + en-US.json: bloco stats.* (36 chaves) + menu.stats/statsDesc"

# (5) Push
git push origin main

# (6) Tag de rollback (caso queira testar a 'rotina X' depois e voltar)
git tag pre-stats-v1
git push origin pre-stats-v1

# (7) Subir o app
npx expo start
```

**Rollback se algo der errado:**

```powershell
cd E:\aa_projetos_claude\auExpert
git reset --hard pre-rotina-X    # ← tag criada antes desta noite (commit e12d7ce)
```

`pre-rotina-X` é o commit anterior a esta sessão (já no GitHub via push direto seu).

---

## Migration de correção da RPC (CRÍTICO — apply antes de testar)

`supabase/migrations/20260424_fix_user_stats.sql` (10 KB, 245 linhas)

Corrige **9 bugs de contagem** na RPC `get_user_stats` que vieram à tona quando você testou: scanner mostrava 0 mesmo com scans, co-tutores mostrava 5 sendo 1 só (Anita em 5 pets), etc.

| # | Bug | Fix |
|---|---|---|
| 4 | `scanners` filtrava `ocr_data IS NOT NULL` (campo nunca populado) | Filtro: `input_type='ocr_scan'` OU item `type='document'` em `media_analyses` |
| 8 | `tutors` usava `role='tutor'` (não existe no schema) | Trocado por `role='owner'` |
| 9-12 | `co_parents`, `caregivers`, `visitors`, `total` contavam linhas em `pet_members` (1 linha por par pet+pessoa) | DISTINCT por `COALESCE(user_id, lower(email))` antes de agregar |
| 11 | `visitors` usava `role='visitor'` (não existe) | Trocado por `role='viewer'` |
| 13-14 | `professionals.by_type/total` contavam linhas em `access_grants` | `COUNT(DISTINCT professional_id)` |
| 15 | `pending_invites` contava linhas em `access_invites` | `COUNT(DISTINCT lower(invite_email))` |

**Como aplicar:**

```powershell
# Opção A: via Supabase CLI
cd E:\aa_projetos_claude\auExpert
supabase db push --project-ref peqpkzituzpwukzusgcq

# Opção B: copiar/colar no SQL Editor do Supabase Studio
# (cole o conteúdo de supabase/migrations/20260424_fix_user_stats.sql)
```

A migration termina com `NOTIFY pgrst, 'reload schema'` — PostgREST atualiza imediatamente, sem esperar cache de 60s. Pull-to-refresh na tela depois e os números corretos aparecem.

**Cliente NÃO precisa mudar.** Types e tela continuam iguais — só backend foi corrigido.

---

## Arquivos criados (5 novos)

| Arquivo | Linhas | Propósito |
|---|---|---|
| `types/userStats.ts` | 80 | Tipos do retorno da RPC `get_user_stats` + map de labels de `professional_type` |
| `hooks/useUserStats.ts` | 65 | Hook React Query. Cache 5 min stale / 15 min gc. Helpers `getCurrentYearMonth()` e `getLastNMonths(n, language)` |
| `lib/recordUserLogin.ts` | 40 | Helper best-effort que chama RPC `record_user_login(platform, device, auth_method)`. Nunca lança |
| `app/(app)/stats.tsx` | 425 | Tela completa com header customizado, seletor de mês (12 últimos), 5 seções de cards, pull-to-refresh |
| `__tests__/hooks/userStats.test.ts` | 84 | 9 testes unitários cobrindo `getCurrentYearMonth` (3 cenários: ano normal, jan, dez) e `getLastNMonths` (6 cenários: tamanhos, cruzamento de ano, capitalização pt-BR/en-US, default n=12). Mocka `lib/supabase` no top pra `createClient` não explodir em ambiente de test |

**Imports:** todos relativos (sem alias `@/` — o `tsconfig.json` do projeto não declara `paths`).

---

## Arquivos modificados (3)

### `components/DrawerMenu.tsx`

- Adicionado import `BarChart3` no bloco de imports do `lucide-react-native`
- Adicionada uma entrada nova no array `menuItems`, **logo após `Preferências`**, antes de `Privacidade`:

```tsx
{
  icon: <BarChart3 size={rs(20)} color={colors.click} strokeWidth={1.8} />,
  label: 'Minhas Estatísticas',
  sublabel: 'Resumo do mês: pets, IA, atividade',
  route: '/stats',
},
```

Outras entradas, ordem, animação, profile section, danger zone e logout **não foram tocadas**.

### `stores/authStore.ts`

- Adicionado `import { recordUserLogin } from '../lib/recordUserLogin';`
- Em `login(email, password)`: chamada `await recordUserLogin('password');` logo APÓS persistir credenciais no SecureStore e ANTES do `set({...})` final
- Em `biometricLogin()`: chamada `await recordUserLogin('biometric');` logo APÓS o re-login bem-sucedido com credenciais salvas e ANTES do `set({...})` final

`logout`, `checkSession`, `checkBioCredentials` **não foram tocadas** — refresh automático e restoração de sessão NÃO contam como login explícito (regra do helper).

### `app/(auth)/register.tsx`

- Adicionado import `import { recordUserLogin } from '../../lib/recordUserLogin';`
- Após `auth.signUp(...)` retornar com `data.session` (Supabase faz auto-login no signup), antes do `router.replace('/(app)')`, chamada `await recordUserLogin('password');` quando há sessão

Esse fluxo NÃO passa pelo `authStore.login()` — o cadastro chama `auth.signUp` direto e tem `set` próprio implícito via Supabase. Sem essa chamada, o tutor recém-cadastrado teria "Dias ativos no mês = 0" na primeira sessão.

### Pontos de auth que NÃO foram instrumentados (intencional)

| Local | Motivo |
|---|---|
| `app/_layout.tsx:351` (`setSession`) | Reset de senha — é fluxo de recovery, não login do tutor |
| `app/(app)/danger-zone.tsx:69` (`signInWithPassword`) | Re-autenticação para confirmar exclusão de pet — tutor JÁ está logado |
| `auth.signIn` em `lib/auth.ts` | Wrapper puro do supabase. Quem chama (`authStore.login` e `biometricLogin`) é que registra |
| `authStore.checkSession` | Restoração silenciosa ao abrir app — não é login explícito |

---

## Adaptações do spec original

A spec assumia drawer do `expo-router/drawer`, mas o auExpert usa **drawer customizado** (`components/DrawerMenu.tsx`). Adaptações:

1. **Tela** ficou em `app/(app)/stats.tsx` (em vez de `app/(drawer)/stats.tsx` que a spec sugeria).
2. **Drawer** usa array de `menuItems` em React, não `<Drawer.Screen>` do expo-router. Adicionei o item nesse array.
3. **Header da tela** ficou customizado (botão voltar `ChevronLeft` + título + spacer) em vez do header do drawer, porque o drawer não tem header do expo-router.
4. **Cores hardcoded da spec** (#0D0E16, #161826, #8F7FA8, #4FA89E) foram substituídas por tokens de `constants/colors.ts`:
   - `colors.bg` = `#0D0E16` (idêntico)
   - `colors.card` = `#1A1D2E` (próximo, padrão atual do app)
   - `colors.click` = `#8F7FA8` (ametista — idêntico)
   - `colors.ai` = `#4FA89E` (jade — idêntico)
   - `colors.text`, `colors.textSec`, `colors.textDim`, `colors.border` — todos do design system Elite

Visual **igual** ao spec, só usando tokens consistentes com o resto do app.

---

## Migração i18n (concluída)

A spec autorizava strings hardcoded ("i18n vem em outra etapa"), mas migrei na mesma sessão pra respeitar a regra inviolável #1 do CLAUDE.md. **Estado final: zero strings hardcoded nas telas.**

### Chaves adicionadas (38 por idioma)

**`menu.*`** (2 chaves):
- `menu.stats` — Drawer label
- `menu.statsDesc` — Drawer sublabel

**`stats.*`** (36 chaves):

| Categoria | Keys |
|---|---|
| Layout | `title`, `errorTitle` |
| Sections | `sectionAiUsage`, `sectionPets`, `sectionPeople`, `sectionProfessionals`, `sectionActivity` |
| AI usage | `aiImages`, `aiVideos`, `aiAudios`, `aiScanners`, `aiCardapios`, `aiProntuarios` |
| Pets | `petsDogs`, `petsCats` |
| People | `peopleCoParents`, `peopleCaregivers`, `peopleVisitors`, `peopleTotal` |
| Professionals | `professionalsEmpty`, `professionalsPending`, `professionalsPendingHint` |
| Activity | `activityDaysActive`, `activityNoLogin`, `activityLastLogin` (com placeholder `{{date}}`) |
| Professional types | `profType_vet`, `profType_groomer`, `profType_trainer`, `profType_walker`, `profType_sitter`, `profType_nutritionist`, `profType_physio`, `profType_dentist`, `profType_behaviorist`, `profType_daycare`, `profType_hotel` |

### Arquivos atualizados pela migração

- `i18n/pt-BR.json`: +38 chaves (2584 → 2622 leaves)
- `i18n/en-US.json`: +38 chaves (2578 → 2616 leaves)
- `app/(app)/stats.tsx`: usa `useTranslation()` e `t('stats.*')` em todas as labels
- `components/DrawerMenu.tsx`: drawer item agora usa `t('menu.stats')` / `t('menu.statsDesc')`
- `types/userStats.ts`: `PROFESSIONAL_TYPE_LABELS` foi REMOVIDO; agora exporta `PROFESSIONAL_TYPE_I18N_KEY` (mapeia `professional_type` → chave i18n `stats.profType_*`)

### Locales secundários (não cobertos)

`es-MX.json`, `es-AR.json`, `pt-PT.json` **não existem no working tree** (devem estar em outro branch ou pendentes). Quando aparecerem, precisam receber as mesmas 38 chaves. Como migração: rode o mesmo Python script de adicionamento usado neste passo (em `STATS_IMPLEMENTATION.md` na seção "Incidente de truncamento" há um exemplo de padrão), mudando apenas as traduções.

---

## Validação manual após `npx expo start`

- [ ] App carrega sem `Cannot find module` no console
- [ ] Faça **logout e login** com `abreu@multiversodigital.com.br`
- [ ] No console: nenhum `[recordUserLogin] falhou:` — silêncio é sucesso
- [ ] Abra o drawer (toque no avatar/menu) → "Minhas Estatísticas" aparece **logo abaixo de Preferências**, com ícone `BarChart3` ametista
- [ ] Toque → tela carrega com spinner jade, depois mostra cards
- [ ] **Números esperados pra abril/2026 do user `abreu`:** 7 cães, 1 gato, 5 co-tutores, 7 imagens, 16 vídeos, 8 áudios, 7 cardápios, 1 prontuário
- [ ] Card **"Dias ativos no mês"** mostra **≥ 1** (do login que você acabou de fazer)
- [ ] Toque no seletor de mês → muda pra março/2026 → dados recarregam
- [ ] Pull-to-refresh funciona (puxa pra baixo no topo da scroll)
- [ ] Visual segue paleta Elite: dark `#0D0E16` fundo, ametista nos labels de seção, jade nos números de IA, cards `#1A1D2E`

### Troubleshooting

| Sintoma | Causa | Fix |
|---|---|---|
| `Cannot find module '../../hooks/useUserStats'` | Arquivo não foi salvo em `hooks/` | Conferir que `hooks/useUserStats.ts` existe |
| `PGRST202 could not find function get_user_stats` | Cache PostgREST defasado | No painel Supabase: `NOTIFY pgrst, 'reload schema'` |
| Cards todos com 0 | User logado não é o `abreu`, ou está vendo mês sem atividade | Trocar mês no seletor; conferir `auth.uid()` |
| "Dias ativos no mês" continua 0 após login | Login não foi instrumentado, ou RPC falhou silenciosamente | Procurar `[recordUserLogin]` no log do Metro |
| Tela leva pra 404 ao tocar no menu | Rota não bate | Conferir `route: '/stats'` no DrawerMenu vs arquivo `app/(app)/stats.tsx` |
| Cores fora do padrão | Token errado no `colors.ts` | Diff `constants/colors.ts` vs `pre-rotina-X` |
| Erro `paths` no tsconfig | Alias `@/` foi usado por engano | Confirmar que **todos** os imports são relativos (`../../` etc.) |

---

## Memória do estado atual (2026-04-24, 23h-ish)

- **Último commit (no GitHub):** `e12d7ce` — fix do classify-diary-entry (FAST suffix Gemini) + AudioSubcard fallback + 38 chaves i18n restauradas. Esse é o ponto seguro. Tag implícita do usuário: o doc anterior pediu pra criar `pre-rotina-X` antes de começar a "rotina X" (esta tarefa de stats).
- **Não-commitado no working tree** (esta sessão):
  - `components/diary/DiaryModuleCard.tsx` — guard `!summary && !canEdit`
  - `components/diary/timelineTypes.ts` — fallback richTypes + log `[E2T]`
  - `components/diary/_cards/DiaryCard.tsx` — log `[CARD-DETAIL]`
  - `hooks/_diary/_bg/finalize.ts` — log `[S7-DIAG]`
  - **+ os 6 arquivos desta tarefa (stats):** types, hook, helper, screen, drawer, authStore
  - 4 arquivos `.tmp_*.json` no root (lixo do bundle MCP — apagar)
- **Edge Functions:** sem mudanças nesta noite. A v83 do `classify-diary-entry` (com fix Gemini) está no ar.
- **Backend (RPCs `get_user_stats` e `record_user_login`):** spec garante que estão prontos no Supabase. Não confirmei daqui — sandbox sem rede pra Supabase.

---

## Incidente de truncamento (resolvido)

Durante a edição, o **Edit tool truncou silenciosamente os 3 arquivos modificados**:

- `components/DrawerMenu.tsx` cortou após linha 450 (no meio de `padding...`)
- `stores/authStore.ts` cortou após linha 118 (no meio de `set({`)
- `app/(auth)/register.tsx` cortou após linha 432 (no meio de `'hid` sem fechar)

Sintoma idêntico ao incidente do `i18n/*.json` documentado mais cedo na sessão. Detectado via `tsc --noEmit` → todos retornaram `error TS1005: '}' expected` em linhas próximas ao último statement.

**Recovery:** rodei script Python (`bash → python3`) que:

1. Pegou o conteúdo do HEAD via `git show HEAD:path` para os 3 arquivos
2. Aplicou as edições sobre a base íntegra usando `str.replace(old, new, 1)`
3. Gravou via `open(path, 'w').write(...)` em vez do Edit tool
4. Validou tail (DrawerMenu 469 linhas terminando em `export default`, authStore 131 linhas terminando em `}));` , register 471 linhas terminando em `});`)
5. Re-rodou tsc → zero erros nos arquivos.

Os arquivos no working tree estão **íntegros** agora. **Não precisa fazer nada** — só rode os comandos do TL;DR. Se quiser confirmar: `tsc --noEmit --skipLibCheck` e procure pelos arquivos acima — não devem aparecer.

**Ocorrências adicionais na mesma sessão:**

- 2 dos JSONs i18n (`pt-BR.json`, `en-US.json`) chegaram a estar quebrados em working tree de sessões anteriores. Restaurei do HEAD (íntegro) + adicionei as 38 chaves stats via Python `dict.setdefault`.
- Edit pequeno em `stats.tsx` (1 linha mudando `Object.entries(by_type)` → `Object.entries(by_type ?? {})`) **truncou o arquivo no fim** — perdeu o `});` do `StyleSheet.create`. Recovery via Python re-escrevendo o arquivo inteiro (425 linhas).

**Total de incidentes de truncamento nesta sessão: 4.** Todos recuperados via Python. Memória `feedback_edit_tool_null_padding_json.md` atualizada com 3º + 4º incidentes e mitigação proativa: usar `bash python3 → open().write()` em vez de Edit pra arquivos com >100 linhas, especialmente perto do fim.

---

## Notas técnicas

### Por que strings hardcoded em vez de i18n

A spec da tarefa foi explícita: `i18n vem em outra etapa`. Como esta sessão foi noturna autônoma, usei o caminho menor risco: hardcoded em pt-BR, dívida técnica documentada nesta seção. Mover pra i18n depois é mecânico e baixo risco.

### Por que `radii.lg`/`spacing.md` em vez de números literais

Coerência com o resto do app. CLAUDE.md regra inviolável #10.1 proíbe pixels fixos — tudo precisa passar por `rs()`/`fs()`. Os tokens de `constants/spacing.ts` já passam internamente por `rs()`, mas o resto do app aplica `rs(spacing.X)` por convenção. Segui o mesmo padrão. Isso é consistente, mesmo que o `rs` aplicado duas vezes pareça redundante (efeito é só amplificar a escala em telas extremas).

### Por que `colors.click` em ícones de ação e `colors.ai` em valores de IA

Convenção visual Elite: ametista (`click`) marca clicabilidade/ação; jade (`ai`) marca saída de IA. A tela mistura os dois deliberadamente:

- Ícones do header, seções, voltar, e o cabeçalho do seletor de mês: `click` (ametista)
- Números do **uso de IA** (Imagens, Vídeos, Áudios, Scanners, Cardápios, Prontuários): `ai` (jade) — destaque
- Números de **pets, pessoas, profissionais**: `ai` (jade) também, **exceto** o subtotal por sub-categoria (`co_parents`, `caregivers`, etc.) que vai em ametista pra hierarquizar visualmente o "Total" em destaque jade
- Atividade ("Dias ativos no mês"): jade — é uma métrica derivada da IA do app

### Por que cache 5 min stale / 15 min gc

Estatísticas mensais não precisam ser tempo real — refrescar a cada 5 min é suficiente. O `gc` em 15 min mantém os dados em memória pro tutor abrir e fechar a tela rapidamente sem refetch. Pull-to-refresh força refetch imediato pra quem quer ver atualizado.

---

## Próximos passos sugeridos (não fiz nesta sessão)

1. **Migrar pra i18n** (chaves listadas acima) — mecânico, ~30 min
2. **Adicionar locales es-MX, es-AR, pt-PT** — segue a régua dos outros locales (memória `project_i18n_elite_voice_migration`)
3. **Drill-down**: tocar em cada card abrir tela detalhada (ex: tocar em "Imagens analisadas" → lista de fotos do mês)
4. **Comparativo mês anterior**: setinha verde/vermelha indicando crescimento/decrescimento vs mês anterior
5. **Gráfico de linha** dos 6 últimos meses pra cada métrica de IA — recharts ou react-native-svg-charts
6. **Export PDF** do relatório mensal — usar skill `pdf` do projeto + `lib/pdf.ts`
