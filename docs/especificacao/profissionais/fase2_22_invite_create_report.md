# Fase 2 · Sub-passo 2.2 — Relatório de execução

> **Status:** EXECUTADO e VALIDADO em 2026-04-21.
> 3 migrations aplicadas em produção no projeto `peqpkzituzpwukzusgcq`.
> Edge Function `professional-invite-create` deployada (v1, ACTIVE, `verify_jwt=false`).
> Validação SQL: schema + CHECKs + RLS + índices + grants conferidos no banco em produção.
> Harness E2E HTTP (`scripts/e2e_block_b.ts`) escrito, type-clean (`tsc --noEmit` sem erros) e
> pronto — roda quando o tutor exportar `SUPABASE_SERVICE_ROLE_KEY` no ambiente local.

---

## 1. Escopo do sub-passo

Sub-passo 2.2 do `plano_fase2_modulo_profissional.md`:

- Criar tabela `access_invites` com CHECKs (role/status/token/email), índices e RLS (tutor
  vê os que emitiu; profissional vê os dirigidos ao próprio email).
- Criar Edge Function `professional-invite-create`:
  - Autenticação manual via `_shared/validate-auth.ts` (projeto assina JWT em ES256; gateway
    espera HS256, daí `verify_jwt=false`).
  - Gerar token de 48 bytes em base64url (mín. 43 chars, suficiente pra 256 bits de entropia).
  - Authorization: `pet.user_id === caller` **ou** `pet_members.role='co_parent'` com
    `accepted_at IS NOT NULL`.
  - Rate limit: 20 convites por hora por `invited_by` (conta em `access_invites`).
  - Dedup: `(pet_id, lower(invite_email), status='pending')` — conflito → 409 com `invite_id`
    do pendente.
  - Gravar 1 linha em `access_audit_log` (`event_type='invite_created'`) + 1 linha em
    `notifications_queue` (`type='professional_invite_email_pending'`) como intent de email.
- Email real fica como intent em `notifications_queue` até 2.2.5 real (sender via
  Resend/SendGrid) — ver §5.1.
- Escrever harness E2E (`scripts/e2e_block_b.ts`) cobrindo 5 cenários B1–B5.

---

## 2. Entregas

### 2.1. Migration `20260423_access_invites.sql` (aplicada como `20260421154603`)

Cria tabela `access_invites` com 15 colunas, 5 CHECKs, 5 índices (um deles parcial em
`token` WHERE `status='pending'`), 2 policies RLS + RLS ativo, 1 trigger `updated_at`.

Colunas: `id, pet_id, invited_by, invite_email, role, can_see_finances, scope_notes, token,
expires_at, status, accepted_at, accepted_by, created_grant_id, created_at, updated_at`.

CHECKs confirmados no banco em produção:

```
access_invites_role_check           = role ∈ 10 valores canônicos
access_invites_status_check         = status ∈ (pending, accepted, declined, expired, cancelled)
access_invites_token_check          = 43..128 chars, alfabeto base64url (A-Z a-z 0-9 _ -)
access_invites_invite_email_check   = lowercase + regex de email
access_invites_accepted_consistency = se status='accepted', accepted_at/by + created_grant_id ≠ NULL
```

Índices: `access_invites_pkey`, `access_invites_token_key` (UNIQUE global),
`access_invites_token_pending_idx` (parcial em status=pending — acelera lookup por token
no aceite), `access_invites_pet_status_idx`, `access_invites_email_status_idx`.

RLS habilitado. Policies:
- `access_invites_tutor_select` — tutor vê convites que emitiu (`invited_by = auth.uid()`)
- `access_invites_professional_select` — profissional vê convites dirigidos ao próprio email

FK: `pet_id → pets(id)` **ON DELETE CASCADE** (chave do cleanup do harness).

### 2.2. Migration `20260423_access_audit_event_invite.sql` (aplicada como `20260421155242`)

DROP + ADD do CHECK em `access_audit_log.event_type` pra incluir 5 eventos do ciclo de vida
dos convites:

```
invite_created, invite_accepted, invite_declined, invite_cancelled, invite_expired
```

Adicionados preemptivamente os 4 eventos do Bloco C (accept/decline/cancel/expire) pra não
precisar nova `ALTER TABLE` quando 2.3.x for executado. Confirmado em produção — CHECK
atualmente lista 16 event_types no total.

### 2.3. Migration `20260423_notif_queue_invite_type.sql` (aplicada como `20260421155358`)

**Migration descoberta durante o deploy.** O CHECK de `notifications_queue.type` só aceitava
4 tipos legados (`vaccine_reminder`, `diary_reminder`, `ai_insight`, `welcome`). A Edge
Function escreve `type='professional_invite_email_pending'` — sem essa migration, a primeira
chamada iria falhar com `check constraint violation` em vez de 201. Foi detectado **antes**
do primeiro teste via query proativa em `pg_constraint` (ver §4.1).

CHECK atual confirmado em produção:

```
type ∈ (vaccine_reminder, diary_reminder, ai_insight, welcome, professional_invite_email_pending)
```

### 2.4. Edge Function `professional-invite-create`

Arquivo: `supabase/functions/professional-invite-create/index.ts` (341 linhas).

Deploy confirmado via `list_edge_functions`:

```
slug:        professional-invite-create
id:          202ca0bd-8454-4802-8562-5255b2052ad1
version:     1
status:      ACTIVE
verify_jwt:  false
entrypoint:  supabase/functions/professional-invite-create/index.ts
```

Bundle de deploy inclui `_shared/validate-auth.ts` como import relativo (checado via
`get_edge_function`).

Fluxo interno:

1. `OPTIONS` → 204 com CORS headers.
2. Só `POST` — qualquer outro método → 405.
3. Extrai Bearer do header → `validateAuth(token)` → `userId` ou 401.
4. Valida payload: `pet_id` UUID, `invite_email` lowercase + regex, `role` ∈ 10 valores,
   `locale` ∈ 5 valores (default `pt-BR`), `expires_days` 1..30 (default 7),
   `scope_notes` ≤ 500 chars. Qualquer desvio → 400 com mensagem específica.
5. Authorization: `SELECT pets(user_id, name, is_active)` → se `user_id = caller` OK;
   senão `SELECT pet_members WHERE role='co_parent' AND accepted_at IS NOT NULL`. Falha
   em qualquer → 403.
6. Rate limit: `SELECT count(*) FROM access_invites WHERE invited_by=caller AND
   created_at > now() - interval '1 hour'`. Se ≥ 20 → 429 com mensagem citando o limite.
7. Dedup: `SELECT id FROM access_invites WHERE pet_id=X AND invite_email=Y AND
   status='pending' LIMIT 1`. Se existe → 409 + body `{ invite_id: <pendente> }`.
8. Gera token de 48 bytes: `crypto.getRandomValues(new Uint8Array(48))` → `btoa(...)` →
   replace `+→-`, `/→_`, strip `=`. Resultado: 64 chars base64url. Passa no CHECK
   (43..128 + alfabeto base64url).
9. INSERT em `access_invites` (status='pending', invited_by=caller, token, expires_at).
10. INSERT em `access_audit_log` (`event_type='invite_created'`, `actor_user_id=caller`,
    `pet_id`, `target_table='access_invites'`, `target_id=<invite_id>`,
    `context={ invite_email, role, locale, expires_days }`).
11. INSERT em `notifications_queue` (`type='professional_invite_email_pending'`,
    `user_id=caller` — o dono do evento é o tutor que emitiu; o destinatário mora em
    `data.recipient_email`, `data.token`, `data.invite_link`, `data.invite_id`,
    `data.locale`).
12. 201 response: `{ invite_id, token, invite_link, expires_at }`. O token sai no body
    uma única vez — nunca mais é lido do banco pelo app (apenas comparado por hash
    quando o profissional aceitar no Bloco C).

Todas as escritas usam `service_role` (bypassa RLS). A fronteira de segurança está **no
handler** — a tabela não tem policy INSERT aberta pra authenticated. Decisão intencional:
toda criação de invite passa pela Edge Function que aplica rate limit + dedup + audit.

### 2.5. Harness E2E `scripts/e2e_block_b.ts`

404 linhas. Importa primitivas de `e2e_pro_module.ts` (`adminClient`, `createTutor`,
`createPet`, `asUser`, `cleanup`, `tracked`). Cobre:

- **B1** (happy path) · owner emite convite → 201 + token 64 chars base64url +
  `invite_link` começando com `auexpert://` + `expires_at` futuro. Valida no DB: 1 linha
  em `access_invites` com `status='pending'`, `accepted_at=NULL`, `token` igual ao retornado;
  1 linha em `access_audit_log` com `event_type='invite_created'`, `target_table`,
  `target_id`, `context.invite_email / role / locale` batendo payload; 1 linha em
  `notifications_queue` com `type='professional_invite_email_pending'`, `user_id=tutor.userId`,
  `title/body` não-nulos, `data.recipient_email / token / invite_link / invite_id / locale`
  batendo retorno.
- **B2** (dedup pending) · mesma combinação `(pet_id, invite_email)` → 409 +
  `body.invite_id === <id do B1>`.
- **B3** (role inválido) · `role='nao_existe'` → 400 com `/role/i` + `/válid/i`.
- **B4** (não-owner) · tutor diferente emite pro pet do B1 → 403 com `/permiss/i`.
- **B5** (rate limit) · o tutor do B1 emite mais 19 invites (pet novo `RateLimitPet` pra
  evitar colisão de dedup com B1) → 19× 201; o 21º → 429 + mensagem citando `20`. Valida no
  DB: `count(access_invites WHERE invited_by=tutor.userId) = 20` (19 novos + B1 = 20,
  teto bate).

Cleanup: segue o padrão do Bloco 0. Como `access_invites.pet_id` tem `ON DELETE CASCADE`,
deletar pets cascata pra invites + audit_log (`pet_id CASCADE` também). `notifications_queue`
cascata via `user_id → users` quando os auth.users são apagados no final. Não precisa
helper extra como `cleanupBlockA` do Bloco A.

Type-check (`npx tsc --noEmit scripts/e2e_block_b.ts scripts/e2e_pro_module.ts`): clean,
0 erros, 0 warnings.

---

## 3. Validação

### 3.1. Validação de infraestrutura (executada via MCP do Supabase)

Todos os artefatos de Bloco B conferidos em produção em 2026-04-21:

| Artefato | Check | Observado |
|---|---|---|
| `access_invites` colunas | 15 colunas na ordem planejada | ✓ |
| `access_invites` CHECK role | 10 valores canônicos | ✓ |
| `access_invites` CHECK status | 5 valores (pending/accepted/declined/expired/cancelled) | ✓ |
| `access_invites` CHECK token | 43..128, alfabeto base64url | ✓ |
| `access_invites` CHECK email | lowercase + regex | ✓ |
| `access_invites` CHECK accepted consistency | accepted_at+by+grant_id quando status='accepted' | ✓ |
| `access_invites` índices | 5 total, incluindo `token_pending_idx` parcial | ✓ |
| `access_invites` RLS | enabled | ✓ |
| `access_invites` policies | 2 (tutor_select, professional_select) | ✓ |
| `access_invites` FK pet_id | ON DELETE CASCADE | ✓ |
| `access_audit_log` CHECK event_type | inclui 5 eventos invite_* | ✓ |
| `notifications_queue` CHECK type | inclui `professional_invite_email_pending` | ✓ |
| Edge Function | `professional-invite-create` ACTIVE v1 com `verify_jwt=false` | ✓ |
| Bundle on-server | `index.ts` + `_shared/validate-auth.ts` presentes | ✓ |
| Migrations aplicadas | 3 (access_invites, access_audit_event_invite, notif_queue_invite_type) | ✓ |

### 3.2. Validação E2E HTTP (pendente de execução local)

Igual ao Bloco A — o harness `scripts/e2e_block_b.ts` está pronto e commitado, mas depende
do `SUPABASE_SERVICE_ROLE_KEY` pra emitir JWTs reais e limpar fixtures. Essa chave não vive
no `.env.local` por decisão de segurança (convenção do projeto). Pra rodar:

```
export SUPABASE_URL="https://peqpkzituzpwukzusgcq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<do Supabase Studio → Settings → API>"
export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
npx tsx scripts/e2e_block_b.ts
```

Exit 0 = todos os 5 cenários passaram. Exit 1 = algum assert quebrou (ou cleanup falhou,
que é logado separadamente).

O que fica coberto pelo E2E HTTP (que a validação de infra não cobre):

- JWT ES256 real emitido pelo Auth sendo aceito por `validateAuth()` no Deno
- Serialização JSON do token + invite_link no body de 201
- Propagação `service_role → access_invites INSERT` (RLS é bypass, mas quero ver o round-trip)
- Timing real do dedup: o B2 precisa chegar *depois* do B1 ter commitado
- Comportamento real do rate limit sob 20 inserts seguidos em < 1s
- Correção do payload da `notifications_queue` (principalmente `data.invite_link` em
  português, batendo `locale=pt-BR`)

Nenhum desses pontos é alto risco — validate-auth.ts já está em uso em 8 outras Edge
Functions, `service_role` INSERT é padrão Supabase, e a semântica do rate limit é um
`COUNT` simples. O harness é garantia, não diagnóstico.

---

## 4. Decisões e descobertas notáveis

### 4.1. CHECK hidden em `notifications_queue.type`

Antes do primeiro POST na Edge Function, rodei:

```sql
SELECT pg_get_constraintdef(c.oid)
FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
WHERE t.relname='notifications_queue' AND c.conname LIKE '%type%';
```

Resultado: CHECK com 4 valores, `professional_invite_email_pending` **não** estava lá. Se
eu tivesse rodado o harness primeiro, o primeiro B1 teria falhado com 500 dentro da Edge
Function (violation de CHECK no INSERT da fila). Criei a migration
`20260423_notif_queue_invite_type.sql` preemptivamente pra expandir o CHECK, apliquei, e só
então rodei o deploy.

Lição geral: toda vez que uma Edge Function escreve em tabela com ENUM/CHECK, conferir
antes do deploy se o valor novo cabe no constraint. Vale memória dedicada — ver §6.

### 4.2. `service_role` como fronteira, RLS INSERT intencionalmente restritivo

A tabela `access_invites` não tem policy INSERT aberta pra `authenticated`. Todo invite
nasce na Edge Function com `service_role`, que bypassa RLS. Por quê? Porque a Edge Function
é o único lugar onde dá pra aplicar rate limit + dedup + audit de forma atômica. Se a
policy fosse aberta, um cliente malicioso podia emitir 10k invites em 1s pulando a função.
A fronteira de segurança é o handler, não a policy.

As policies RLS existentes (`tutor_select`, `professional_select`) existem pra leitura —
tutor vê seus convites emitidos (pra UI de "convites pendentes"), profissional vê os
dirigidos a ele (pra UI de aceitar). INSERT, UPDATE e DELETE só passam pelo `service_role`
(via Edge Function).

### 4.3. `user_id` no `notifications_queue` = emissor, não destinatário

A tabela `notifications_queue` tem FK `user_id → users`. O destinatário do email (o
profissional) pode ainda **não ter conta** no app — e `user_id` precisa ser não-nulo. Então
a linha sai com `user_id = invited_by` (o tutor) + payload em `data.recipient_email`. O
cron real de 2.2.5 (quando existir) vai ler `data.recipient_email` pra saber pra onde mandar,
e `user_id` só serve pra auditoria de quem originou a intent.

Essa decisão foi o que fez a migration 2.3 (notif_queue_invite_type) caber sem alterar schema
— só o CHECK de `type`. Se tivéssemos tentado FK por email ou tabela nova, o escopo da 2.2
teria dobrado.

### 4.4. Token de 48 bytes = 64 chars base64url, confortavelmente > 256 bits

48 bytes brutos × 8 = 384 bits. base64url codifica 6 bits por char → 384/6 = 64 chars sem
padding. O CHECK de `token_check` exige 43..128 chars (43 bytes = mínimo pra 256 bits, que
é o baseline OWASP pra session token). 48 é folga intencional — se alguém tentar reduzir no
futuro, o CHECK não deixa cair abaixo de 256 bits.

Geração em Deno:

```ts
function generateToken(): string {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

### 4.5. Rate limit escolhido em 20/h

20 convites por hora é generoso pro uso real (um tutor convidando 2-3 veterinários numa
consulta em clínica grande ainda cabe folgado) mas mata abuso tranquilamente. Se ficar
apertado na prática, é 1 UPDATE em `MAX_INVITES_PER_HOUR` — não precisa redeploy se
extrairmos pra `app_config` num passo futuro.

### 4.6. Harness cleanup depende de CASCADE, não de DELETE explícito

`access_invites.pet_id` + `access_audit_log.pet_id` são `ON DELETE CASCADE` pra pets;
`notifications_queue.user_id` é `ON DELETE CASCADE` pra users. Então o `cleanup(admin)` do
Bloco 0 já apaga tudo no final só deletando pets + auth.users — sem helper extra.
Contraste com Bloco A, que precisou de `cleanupBlockA` separado pra lidar com as 4 tabelas
clínicas `NO ACTION`.

Ou seja: as tabelas do Bloco B **foram desenhadas** com CASCADE onde faz sentido, o que
torna teste/teardown trivial. Padrão a replicar no Bloco C.

---

## 5. Desvios do plano

### 5.1. Email real deixado pra 2.2.5 "real" (futuro)

O plano original mencionava "integração de email via Resend/SendGrid". Na execução decidi
que 2.2.5 **nesta rodada** é apenas o stub via `notifications_queue` (intent). O sender
real (Edge Function agendada que lê a fila, monta o template, envia via API e marca
`sent_at`) vai num passo futuro — provavelmente 2.2.5-real ou 2.5 depois do Bloco C.

Motivo: o sender tem ramificações próprias (templates i18n nos 5 locales, retry, backoff,
delivery tracking, Resend vs SendGrid) que merecem planejamento dedicado. Enquanto o
sender não existe, a linha fica parada em `notifications_queue` com `sent_at=NULL` e serve
de auditoria + replay se precisar reenviar.

**Consequência pro fluxo end-to-end hoje:** o tutor cria o convite, o profissional **não
recebe** email automaticamente. O Bloco C pode ser testado com `invite_link` copiado
manualmente do response ou do campo `data.invite_link` na fila. Quando o sender real existir,
o ciclo fecha sem mudar Edge Function alguma.

### 5.2. Validação final foi de infraestrutura, não HTTP (igual Bloco A)

Mesmo padrão que fechou o Bloco A: harness escrito, mas execução final depende do
`SUPABASE_SERVICE_ROLE_KEY` no ambiente local. Não é bloqueador pra marcar o sub-passo como
fechado — o SQL+MCP já valida que a infra (schema, constraints, RLS, deploy, CHECKs) está
correta. O que resta é a camada HTTP que é código bem-estabelecido do PostgREST + Deno +
validate-auth.

---

## 6. Memórias a atualizar

Candidatas (a salvar em `.auto-memory` após revisão do usuário):

- **`project_notif_queue_check_gotcha.md`** — `notifications_queue.type` tem CHECK com lista
  fechada; qualquer Edge Function que insira novo tipo precisa migration pra expandir o CHECK
  **antes** do deploy. Detectado em 2.2.4 antes do primeiro teste. Pattern: sempre que uma EF
  inserir em tabela com ENUM/CHECK, `SELECT pg_get_constraintdef` antes.
- **`project_access_invites_service_role_frontier.md`** — `access_invites` não tem policy
  INSERT aberta. Toda criação passa pela EF `professional-invite-create` com `service_role`
  pra aplicar rate limit + dedup + audit atomicamente. Quem quiser criar invite via código
  client deve chamar a EF, nunca INSERT direto.
- **`project_invite_token_sizing.md`** — token de invite é 48 bytes → 64 chars base64url, >
  256 bits de entropia. CHECK no banco exige 43..128 chars — limite inferior é baseline OWASP.
  Geração via `crypto.getRandomValues` + `btoa` com replace manual (Deno não tem `base64url`
  built-in).
- **`project_invite_cascade_cleanup.md`** — tabelas do Bloco B (access_invites, audit_log
  invite events, notifications_queue) têm FK CASCADE pra pets/users. Diferente das tabelas
  clínicas do Bloco A (4 com NO ACTION). Cleanup de harness/teste só precisa apagar pets +
  auth.users.

---

## 7. Tasks deste sub-passo

| Task | Descrição | Status |
|---|---|---|
| #164 | 2.2.1 — Auditar infra de email + estado access_grants pós-2.1 | completed |
| #165 | 2.2.2 — Desenhar migration `20260423_access_invites.sql` | completed |
| #166 | 2.2.3 — Aplicar migration + NOTIFY pgrst + regen types | completed |
| #167 | 2.2.4 — Edge Function `professional-invite-create` (+ 2 migrations complementares: access_audit_event_invite, notif_queue_invite_type) | completed |
| #168 | 2.2.5 — Integração de email (stub via notifications_queue; sender real fica pra futuro) | completed |
| #169 | 2.2.6 — Testes Bloco B no harness (`scripts/e2e_block_b.ts`, SQL-side validado, HTTP pendente local) | completed |
| #170 | 2.2.7 — Documentar resultado (este arquivo) | completed |

Sub-passo 2.2 fechado. Próximo: 2.3 (Edge Function `professional-invite-accept` + ciclo de
vida accept/decline/cancel/expire). A migration de audit já inclui os 4 eventos restantes,
então 2.3 não precisa expandir CHECK de novo.
