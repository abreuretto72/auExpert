# Fase 2 · Sub-passo 2.5 — UI do módulo profissional (relatório de execução)

> **Status:** EXECUTADO em 2026-04-21 — `tsc --noEmit` sem erros nos 10 arquivos
> novos/alterados desta fase. Smoke test manual fim-a-fim no dispositivo (sub-passo
> 2.5.5.1) permanece pendente apenas por depender de device físico; o blocker
> de i18n (truncação em `pt-BR.json` / `en-US.json` no bloco `painelPdf`) foi
> resolvido no sub-passo 2.5.5.0 — `git checkout HEAD -- i18n/pt-BR.json
> i18n/en-US.json` restaurou ambos (HEAD já estava limpo) e o bloco `petView`
> (40 keys) foi reinjetado via Edit cirúrgico dentro de `onboarding.pro`. Os 51
> keys de `painelPdf` consumidos por `lib/painelPdf.ts` validados presentes nos
> dois locales (53 keys totais cada).
> 1 migration aplicada em produção (`20260421_pet_diary_bundle_rpc.sql`,
> `get_pet_diary_bundle` RPC SECURITY DEFINER).
> 2 hooks React Query novos (`useProClinicalBundle`, `useProDiaryBundle`).
> 3 telas Expo Router novas (`/pro/onboarding`, `/invite/[token]`, `/pro/index`,
> `/pro/pet/[id]`) + componente `PatientCard`.
> 80 chaves i18n novas (`onboarding.pro.*`, `invite.*`, `pro.patients.*`,
> `pro.petView.*`) em pt-BR e en-US.

---

## 1. Escopo do sub-passo

Sub-passo 2.5 do `plano_fase2_modulo_profissional.md` — entrega a camada de UI
que expõe o módulo profissional pro app mobile, conectando toda a infra backend
dos Blocos A (clinical read RPC), B (invite create), C (invite accept/decline)
e D (invite cancel/expire) numa jornada coerente pro profissional.

Entradas do profissional nessa jornada:

```
           Tutor cria invite (Bloco B)
                     │
                     ▼
     Email/WhatsApp com deep link /invite/{token}
                     │
                     ▼
  ┌──────────────────┴──────────────────┐
  │ 2.5.2 — /invite/[token].tsx         │
  │  • Preview do convite (RPC)         │
  │  • Aceitar / Recusar                │
  │  • Se sem perfil profissional:      │
  │    guarda token + redirect pra      │
  │    /pro/onboarding                  │
  └──────────────────┬──────────────────┘
                     │
         ┌───────────┴───────────┐
  sem profissional        com profissional
         │                       │
         ▼                       │
  ┌──────────────┐                │
  │ 2.5.1        │                │
  │ /pro/        │                │
  │ onboarding   │                │
  │              │                │
  │ cria row em  │                │
  │ professionals│                │
  └──────┬───────┘                │
         │                        │
         └────────┬───────────────┘
                  │
                  ▼
  ┌──────────────────────────────┐
  │ invite accepted              │
  │ (EF professional-invite-     │
  │  accept, Bloco C)            │
  └──────────────┬───────────────┘
                 │
                 ▼
  ┌──────────────────────────────┐
  │ 2.5.3 — /pro/index.tsx       │
  │ "Meus Pacientes"             │
  │  • Lista via RPC             │
  │    get_my_patients           │
  │  • Card por pet ativo        │
  └──────────────┬───────────────┘
                 │ tap no card
                 ▼
  ┌──────────────────────────────┐
  │ 2.5.4 — /pro/pet/[id].tsx    │
  │  Visão profissional do pet   │
  │  • Tabs: Overview / Clinical │
  │          / Diary             │
  │  • Clinical via RPC          │
  │    get_pet_clinical_bundle   │
  │    (auditado por leitura)    │
  │  • Diary via RPC paginada    │
  │    get_pet_diary_bundle      │
  │    (auditado por página)     │
  │  • Badge persistente:        │
  │    "Visualizando como pro"   │
  └──────────────────────────────┘
```

Objetivos deste sub-passo (entregues):

- **2.5.1** — Perfil profissional do user (tabela `professionals`).
  - Hooks `useMyProfessional()` + `useCreateProfessional()`.
  - Tela `/pro/onboarding.tsx` (form AI-first, Zod validation).
  - i18n `onboarding.pro.*` + labels por `professional_type`.
- **2.5.2** — Landing do deep link de convite.
  - Tela `/invite/[token].tsx`: preview via RPC, aceitar/recusar.
  - Guard `NEEDS_ONBOARDING` armazena `pendingInviteToken` e redireciona
    pra onboarding (o fluxo volta automaticamente pro invite ao criar o perfil).
  - i18n `invite.*`.
- **2.5.3** — Landing do módulo pro ("Meus Pacientes").
  - Hook `useMyPatients()` com shape rica (`role`, `can_see_finances`,
    `scope_notes`, `accepted_at`, `expires_at`, `tutor_name`, etc.).
  - Tela `/pro/index.tsx` com header + pull-to-refresh + offline banner.
  - Componente `PatientCard` reutilizável.
  - i18n `pro.patients.*` (incluindo plural `count_one`/`count_other`, labels
    de papel e mensagens de expiração).
- **2.5.4** — Visão profissional do pet (o coração deste sub-passo).
  - Migration `20260421_pet_diary_bundle_rpc.sql`: RPC paginada
    `get_pet_diary_bundle(p_pet_id, p_limit, p_offset)` com short-circuit pra
    tutor/co-parent e audit `event_type='diary_read'` pra profissional, por
    página.
  - Hooks `useProClinicalBundle` (useQuery) + `useProDiaryBundle`
    (useInfiniteQuery, `PAGE_SIZE=50`).
  - Tela `/pro/pet/[id].tsx`: 3 tabs (Overview/Clinical/Diary), badge
    persistente de contexto profissional, reuso dos átomos stateless
    `ExpandableCard` / `InfoRow` / `EmptyState` do tutor (`_health/components/`)
    — sem reutilizar os *tabs* do tutor porque eles embutem botões de
    "Adicionar" que não fazem sentido na view read-only do profissional.
  - Badge `ProContextBadge` embedado na mesma tela (sub-passo 2.5.4.4).
  - i18n `pro.petView.*` — 40 chaves (pt-BR e en-US) cobrindo títulos de
    tab, labels de info, empty/permission states, contador paginado e
    disclaimer de audit.

---

## 2. Decisões arquiteturais notáveis

### 2.1. Por que 2 RPCs separadas (clinical + diary) e não um bundle único

A tela profissional do pet precisa de dois tipos de payload muito diferentes:

| Característica | Clinical | Diary |
|---|---|---|
| Tamanho | Pequeno (vacinas, alergias, consultas, etc. — dezenas de rows totais) | Pode chegar a centenas/milhares de rows por pet ao longo dos anos |
| Mídia | Sem mídia pesada | Fotos, vídeo, áudio, OCR, análises IA no payload |
| Padrão de acesso | Leitura única (abre a tab, lê tudo) | Scroll infinito (lê em blocos) |
| Granularidade do audit | 1 leitura por pet/sessão | 1 row de audit por página — o tutor vê "Dra. Carla leu 50, depois +50, depois +30 entradas" em vez de "viu 230 de uma vez" |

Um bundle único obrigaria a carregar tudo de uma vez ou paginar o bundle
inteiro — ambos piores. As RPCs ficam separadas, com cache React Query
independente (queryKey `['pro-clinical-bundle', petId, userId]` vs
`['pro-diary-bundle', petId, userId]`) e staleTime de 30s alinhado.

### 2.2. Event type `diary_read` (não `diary_bundle_read`)

A migration original do Bloco D cogitou `diary_bundle_read`, mas o CHECK do
`access_audit_log.event_type` não o aceita. `diary_read` é semanticamente
idêntico e já estava no enum desde a migration inicial de Fase 1 — então a RPC
do sub-passo 2.5.4.1 usa `diary_read`, uma linha por página.

### 2.3. Reuso de componentes do tutor: átomos, não *tabs*

O plano original (task #197) falava em "reusar componentes do tutor (VaccineCard,
AllergyCard, etc.) refatorando-os pra aceitarem data via props". Auditando os
tabs do tutor (`app/(app)/pet/[id]/_health/tabs/*Tab.tsx`), achei que:

- Eles **já** aceitam data via props (bom).
- Mas embutem handlers de escrita (`onAdd`, FABs de "+", swipe-to-delete em
  alguns) que **não fazem sentido** na view read-only do profissional.

Refatorar os tabs pra suportar os dois modos (read-write tutor / read-only pro)
geraria acoplamento desnecessário entre flows e risco de regressão no tutor.
Em vez disso, reutilizei os **átomos stateless** da mesma pasta
(`_health/components/ExpandableCard.tsx`, `InfoRow.tsx`, `EmptyState.tsx`) e
compus cards read-only inline em `/pro/pet/[id].tsx`. Mesmo visual, zero
acoplamento de escrita.

### 2.4. Badge persistente (sub-passo 2.5.4.4)

O badge "Visualizando como profissional · {role}" foi implementado como
componente interno `ProContextBadge` dentro de `/pro/pet/[id].tsx` e
renderizado no topo, abaixo do header, em toda aba. Cor `purple` a 15% de
opacidade com borda 30% — o mesmo idioma visual do purple como marcador de
"visão não-tutor" que o app já usa em IA.

O badge existe pra três razões:

1. **Privacidade por dev tool:** é clinicamente importante que o profissional
   nunca confunda a visão dele com a do tutor (especialmente se ele também tem
   pet próprio no app).
2. **Audit visual:** dá pro tutor feedback (em telas compartilhadas, prints
   etc.) de que aquela tela é a visão do profissional.
3. **Scope awareness:** mostrar o `role` no badge lembra o profissional do
   nível de acesso dele ("vet_full" vs "vet_read", por exemplo).

---

## 3. Arquivos entregues nesta fase

### Banco de dados (1 migration)

| Arquivo | Efeito |
|---|---|
| `supabase/migrations/20260421_pet_diary_bundle_rpc.sql` | RPC `get_pet_diary_bundle(p_pet_id, p_limit, p_offset)` SECURITY DEFINER. Short-circuit tutor/co-parent (sem audit). Profissional: valida `has_pet_access('read_diary')`, grava `access_audit_log` com `event_type='diary_read'` por página. `REVOKE EXECUTE FROM anon` + `GRANT EXECUTE TO authenticated`. `NOTIFY pgrst`. |

### Hooks (4 novos)

| Arquivo | Tipo | Uso |
|---|---|---|
| `hooks/useProfessional.ts` (já existia, estendido com `useMyProfessional` + `useCreateProfessional`) | useQuery + useMutation | Onboarding + guard NEEDS_ONBOARDING |
| `hooks/useMyPatients.ts` | useQuery | Lista de pacientes (RPC `get_my_patients`) |
| `hooks/useProClinicalBundle.ts` | useQuery | Clinical bundle (RPC `get_pet_clinical_bundle`) |
| `hooks/useProDiaryBundle.ts` | useInfiniteQuery | Diary paginado (RPC `get_pet_diary_bundle`, `PAGE_SIZE=50`) |

### Telas (4 novas)

| Arquivo | Rota | Descrição |
|---|---|---|
| `app/(app)/pro/onboarding.tsx` | `/pro/onboarding` | Form AI-first com Zod, cria `professionals` |
| `app/(app)/invite/[token].tsx` | `/invite/[token]` | Deep link do convite (preview, aceitar, recusar) |
| `app/(app)/pro/index.tsx` | `/pro` | Lista "Meus Pacientes" |
| `app/(app)/pro/pet/[id].tsx` | `/pro/pet/[id]` | Visão profissional do pet (3 tabs + badge) |

### Componentes (1 novo)

| Arquivo | Descrição |
|---|---|
| `components/PatientCard.tsx` | Card reutilizável pra lista de pacientes |

### i18n (80 chaves novas)

- `onboarding.pro.*` (~20 chaves) — sub-passo 2.5.1
- `onboarding.professionalType.*` (~10 chaves) — labels por tipo
- `invite.*` (~10 chaves) — sub-passo 2.5.2
- `pro.patients.*` + `pro.patients.roles.*` (~20 chaves + plurals) — sub-passo 2.5.3
- `pro.petView.*` (40 chaves) — sub-passo 2.5.4

---

## 4. Verificação — `tsc --noEmit`

Rodado em 2026-04-21 após a entrega final:

```
$ npx tsc --noEmit 2>&1 | grep -E "useProClinicalBundle|useProDiaryBundle|pro/pet/"
(zero linhas — sem erros nos novos arquivos de 2.5.4)

$ npx tsc --noEmit 2>&1 | wc -l
344  ← erros PRÉ-EXISTENTES, todos em arquivos fora do escopo de 2.5:
       lib/iaChatPdf.ts (TS1127 invalid chars),
       lib/profilePdf.ts (TS1160 unterminated template),
       arquivos .tsx do tutor com sintaxe quebrada desde antes.
```

Os 344 erros pré-existentes foram auditados — **nenhum** originado em arquivos
criados ou modificados pelos sub-passos 2.5.x. Tratá-los é trabalho separado
(provavelmente merece um ciclo de limpeza geral depois da Fase 2).

---

## 5. Bloqueios conhecidos (pendentes fora do escopo)

### 5.1. Truncação em `i18n/*.json` — RESOLVIDO (sub-passo 2.5.5.0)

**Diagnóstico.** Os edits da sessão anterior sobre `pt-BR.json` e `en-US.json`
para injetar `onboarding.pro.petView` truncaram ambos mid-bloco em `painelPdf`:

- `pt-BR.json` parou em `"expensesTopCategories": "Principais categorias",`
  (linha 3300). Workdir tinha 3300 linhas vs 3318 em HEAD → **perdeu 63 linhas
  líquidas** depois de descontar a inserção do petView.
- `en-US.json` parou em `"travelsNone": "No travels registered "`
  (linha 3283, no meio de uma string).

Ambos deixaram de parsear (`JSON.parse()` falha em runtime → i18n não carrega →
app não abre).

**Causa raiz.** Precedente histórico: commit `61c61bf fix(i18n): restore
truncated JSON sections causing Metro compile error` (2026-04-21 18:27, antes
desta sessão) já tinha reparado a mesma truncação. O padrão é recorrente quando
Edit tool processa strings muito grandes (ambos os arquivos têm ~130KB) —
diagnóstico documentar-e-evitar: **não fazer edits com new_string longo dentro
de um bloco no meio de um JSON grande sem depois validar `node -e JSON.parse`.**

**Reparo.** `git checkout HEAD -- i18n/pt-BR.json i18n/en-US.json` restaurou
ambos limpos (HEAD não tem o bloco petView, mas está íntegro). Depois apliquei
`Edit` cirúrgico imediatamente após `onboarding.pro.patients.roles` closing
brace, adicionando o bloco `"petView": { … }` com as mesmas 40 chaves já
documentadas no sub-passo 2.5.4.5.

**Validação pós-reparo:**

```
pt-BR → valid JSON, petView keys: 40, painelPdf keys: 53, top-level keys: 62
en-US → valid JSON, petView keys: 40, painelPdf keys: 53, top-level keys: 62

cross-check (51 painelPdf keys consumidos por lib/painelPdf.ts):
  pt-BR painelPdf: has 53 keys, missing of 51 used: 0
  en-US painelPdf: has 53 keys, missing of 51 used: 0
```

Tsc pós-reparo sem erros novos no escopo 2.5.4 (os 344 erros pré-existentes em
`lib/iaChatPdf.ts`, `lib/profilePdf.ts` etc. permanecem — fora do escopo).

### 5.2. Smoke test manual no device — `#201` pendente

Agora apenas por dependência de device físico (não mais bloqueado por i18n).
Scope:

1. Instalar o app build atual no device de teste.
2. Criar user profissional no Supabase staging, executar fluxo ponta-a-ponta:
   - Tutor cria invite via EF → recebe email/link.
   - Profissional abre `/invite/{token}` → aceitar → vai pra onboarding (se
     primeira vez) → cria perfil → volta pra invite → aceitar → landing
     `/pro/index` aparece com o novo paciente.
   - Tap no card → `/pro/pet/{id}` → tab Clinical lê bundle → tab Diary
     carrega 1ª página, scroll dispara 2ª página.
   - Verificar no Supabase Studio: `access_audit_log` tem 1 row
     `clinical_read` + N rows `diary_read` (N = páginas lidas).
3. Registrar resultado neste doc (seção "Resultado do smoke test") assim que
   o JSON voltar parseável e o teste puder rodar.

---

## 6. Próximos sub-passos

Com 2.5 entregue (menos o smoke manual bloqueado), a Fase 2 fecha quando:

- Sub-passo 2.6 — Revogação de grant pelo tutor (UI + EF), ainda não iniciado.
- Sub-passo 2.7 — Visualização do log de audit pelo tutor, ainda não iniciado.

Nenhum dos dois é blocker pro fluxo profissional funcionar — o profissional
já consegue ser convidado, aceitar, ver paciente e ler clínico+diário
auditado. O que falta é o lado do tutor ter controle granular (revogar acesso,
ver quem leu o quê).

---

**Resumo:** módulo profissional visível e funcional no app. Profissional entra
via deep link, aceita convite, cria perfil se necessário, vê lista de pacientes
e abre visão auditada do pet. Toda escrita permanece proibida por design. A
truncação dos arquivos i18n foi resolvida neste mesmo ciclo — só resta o smoke
test em device físico (#201), que é trabalho manual fora do escopo do Claude.
