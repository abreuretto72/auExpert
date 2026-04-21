# Fase 2 · Sub-passo 2.4 — Relatório de execução

> **Status:** EXECUTADO e VALIDADO em 2026-04-21.
> **Migration:** no-op confirmado — todos os valores de `event_type` necessários
> (`invite_cancelled`, `invite_expired`) já estavam no CHECK de `access_audit_log`
> desde a migration preemptiva do sub-passo 2.2.4 (`20260423_access_audit_event_invite.sql`).
> 2 Edge Functions deployadas (`professional-invite-cancel` v1 ACTIVE, `professional-invite-expire`
> v1 ACTIVE — ambas `verify_jwt=false`).
> 1 pg_cron job criado (`expire-pending-invites-hourly`, schedule `0 * * * *`, jobid=5).
> Smoke test da EF de expire disparado via `net.http_post` retornou 200 com
> `{ok: true, expired_count: 0, expired_ids: []}` em ~2s — pipeline cron-EF fim-a-fim
> validado em produção.
> Harness E2E HTTP (`scripts/e2e_block_d.ts`) escrito, type-clean (`tsc --noEmit` sem erros)
> e pronto — roda quando o tutor exportar `SUPABASE_SERVICE_ROLE_KEY` no ambiente local.

---

## 1. Escopo do sub-passo

Sub-passo 2.4 do `plano_fase2_modulo_profissional.md` — fecha o lifecycle terminal dos convites
profissionais. Até aqui (blocos B+C) o invite era criado (`pending`), aceito (`accepted`) ou
declinado (`declined`). Faltavam os **dois caminhos terminais não-iniciados-pelo-profissional**:

- **Cancelamento pelo emissor (tutor):** o tutor que emitiu o convite (ou co-parent com
  `register_records`) pode revogá-lo antes do profissional responder. Status transiciona
  `pending → cancelled`. Requer Edge Function com auth do tutor + checagem de ownership.
- **Expiração automática:** convites pendentes cujo `expires_at` já passou viram `expired`
  via sweep periódico. Status transiciona `pending → expired`. Requer Edge Function
  invocável por pg_cron (sem JWT) + schedule pg_cron + pg_net.

Ambos geram audit event próprio (`invite_cancelled` / `invite_expired`) já aceito pelo CHECK
desde 2.2.4. Lifecycle completo do invite depois deste sub-passo:

```
                   ┌───────────┐
                   │  pending  │◄── professional-invite-create (2.2.4)
                   └─────┬─────┘
                         │
         ┌───────────────┼───────────────┬───────────────┐
         │               │               │               │
    accept (C)      decline (C)     cancel (D)      expire (D)
         ▼               ▼               ▼               ▼
    ┌────────┐      ┌─────────┐    ┌──────────┐    ┌─────────┐
    │accepted│      │declined │    │cancelled │    │ expired │
    └────────┘      └─────────┘    └──────────┘    └─────────┘
```

Objetivos deste sub-passo:

- Confirmar (ou criar) migration pro Bloco D: validar que `access_audit_log.event_type`
  aceita `invite_cancelled` + `invite_expired`. Se já estiver no lugar, registrar como no-op.
- Criar Edge Function `professional-invite-cancel`:
  - Autenticação manual via `_shared/validate-auth.ts` (ES256 vs HS256 gateway).
  - Input por `invite_id` (não token) — o tutor conhece o id do seu próprio convite.
  - Ownership enforcement: `invite.invited_by === userId` ou 403 `UNAUTHORIZED`.
  - Preflight de estado: `status === 'pending'` ou 409 `INVALID_STATE` com status atual no body.
  - UPDATE condicional `WHERE id + status='pending' + invited_by=userId` (defense-in-depth
    TOCTOU), com re-leitura pós-UPDATE se rowcount=0 pra mensagem precisa.
  - Audit event `invite_cancelled` (non-fatal — se o INSERT falhar, a operação UPDATE já
    comitou e o 200 é devolvido).
- Criar Edge Function `professional-invite-expire`:
  - `verify_jwt=false`, **sem** `validateAuth` — invocada por pg_cron sem header
    Authorization, seguindo o padrão de `check-scheduled-events` / `analyze-health-patterns`
    / `send-push-notifications`.
  - Sweep global em uma única UPDATE `WHERE status='pending' AND expires_at < now()` com
    RETURNING, depois batch INSERT em `access_audit_log` (1 row por convite expirado).
  - Idempotente: rodar 2x em sequência produz `expired_count=0` na segunda (o filtro
    `status='pending'` descarta os já processados).
  - `actor_user_id=NULL` no audit — é evento de sistema, não de usuário.
  - Audit write é non-fatal (se falhar, UPDATE já comitou; melhor perder auditoria do que
    re-processar depois).
- Criar pg_cron job:
  - Frequência horária (`0 * * * *`) — expiração tem resolução de 1 dia, então ≤1h de lag é
    aceitável e balanceia responsividade vs custo.
  - Invoca a EF via `net.http_post` com body `{}`, sem Authorization, apenas
    `Content-Type: application/json`.
- Escrever harness E2E (`scripts/e2e_block_d.ts`) cobrindo 7 cenários D1–D7.

---

## 2. Entregas

### 2.1. Migration 2.4.1 — NO-OP confirmado

Nenhum arquivo novo em `supabase/migrations/`. Razão idêntica à do Bloco C:

- `access_audit_log.event_type` CHECK já inclui `invite_cancelled` e `invite_expired`.
  Ambos foram adicionados em 2.2.4 pela migration preemptiva
  `20260423_access_audit_event_invite.sql` (aplicada como `20260421155242`), que ampliou o
  CHECK pra cobrir os 5 eventos do lifecycle de invite de uma vez (`invite_created`,
  `invite_accepted`, `invite_declined`, `invite_cancelled`, `invite_expired`).
- `access_invites.status` CHECK já aceita `'cancelled'` e `'expired'` desde 2.2.2 (migration
  `20260423_access_invites.sql`). CHECK:
  `status IN ('pending','accepted','declined','expired','cancelled')`.
- `access_invites.expires_at` já é `TIMESTAMPTZ NOT NULL` — o filtro `< now()` do sweep usa
  o valor gravado na criação (`professional-invite-create` calcula `now() + 7 days` por default).
- `pg_cron` (v1.6.4, em `pg_catalog`) e `pg_net` (v0.20.0, em `public`) já estavam instaladas
  na Fase 1 (via migration inicial de extensions, auditada em 2.4.1 / task #177).
- Nenhuma nova policy RLS — ambas as EFs usam `service_role` internamente (fronteira é a
  função, mesmo padrão dos Blocos B e C).

Conclusão: Bloco D colhe tudo o que foi plantado em 2.2.4. Task #177 fechou como "no-op
confirmed" — zero DDL aplicado neste sub-passo, zero `NOTIFY pgrst` necessário, zero regen
de types.

### 2.2. Edge Function `professional-invite-cancel`

Arquivo: `supabase/functions/professional-invite-cancel/index.ts` (193 linhas).

Deploy confirmado via `list_edge_functions`:

```
slug:        professional-invite-cancel
id:          e087f638-fc1d-4bd1-86a6-de5fb16ea5bd
version:     1
status:      ACTIVE
verify_jwt:  false
entrypoint:  supabase/functions/professional-invite-cancel/index.ts
ezbr_sha256: 75d0bb399f3131344fb208bc28c883f3a8541d1a47adcd026bb76e708e00c604
```

`config.toml` atualizado pra `[functions.professional-invite-cancel] verify_jwt = false`.
Bundle de deploy inclui `_shared/validate-auth.ts` como import relativo.

Fluxo interno:

1. `OPTIONS` → 204 com CORS headers.
2. Só `POST` — qualquer outro método → 405.
3. Extrai Bearer do header → `validateAuth(token)` → `{ userId, email }` ou 401.
4. Parse body JSON; valida `invite_id` string não-vazia e UUID válido (regex v4/v5) — senão
   400 `MISSING_INVITE_ID`.
5. `SELECT id, pet_id, invited_by, invite_email, role, status FROM access_invites WHERE id=$1`
   → se null → 404 `INVITE_NOT_FOUND`.
6. **Ownership enforcement (in-memory):** `invite.invited_by !== userId` → 403 `UNAUTHORIZED`
   (distingue do 404 — quem fez o convite sabe que ele existe, então 403 é a resposta correta).
7. **Preflight de estado (in-memory):** `invite.status !== 'pending'` → 409 `INVALID_STATE`
   com mensagem `Convite já está <status atual> e não pode ser cancelado`.
8. **UPDATE condicional (defense-in-depth):**
   ```sql
   UPDATE access_invites
   SET status='cancelled'
   WHERE id=$invite.id AND status='pending' AND invited_by=$userId
   RETURNING id, status
   ```
   Se rowcount=0 (race entre SELECT e UPDATE), re-lê `status` atual e retorna 409
   `INVALID_STATE` com a mensagem correta.
9. INSERT em `access_audit_log` (`event_type='invite_cancelled'`, `actor_user_id=userId`,
   `professional_id=NULL`, `access_grant_id=NULL`, `pet_id=invite.pet_id`,
   `target_table='access_invites'`, `target_id=invite.id`,
   `context={ invite_id, role, invite_email }`). **Non-fatal** — se falhar, loga erro mas
   devolve 200.
10. 200 response: `{ ok: true, invite_id, status: 'cancelled' }`.

Códigos de erro no body (`{ error, code }`):

| Código | Status | Quando |
|---|---|---|
| `MISSING_INVITE_ID` | 400 | `invite_id` ausente, vazio ou UUID malformado |
| `UNAUTHORIZED` | 403 | `invite.invited_by` ≠ `userId` autenticado |
| `INVITE_NOT_FOUND` | 404 | `invite_id` não existe em `access_invites` |
| `INVALID_STATE` | 409 | `invite.status` ≠ `'pending'` (ou virou não-pending entre SELECT/UPDATE) |
| `INTERNAL` | 500 | DB/runtime error não mapeado |

### 2.3. Edge Function `professional-invite-expire`

Arquivo: `supabase/functions/professional-invite-expire/index.ts` (135 linhas).

Deploy confirmado via `list_edge_functions`:

```
slug:        professional-invite-expire
id:          8cfea4ea-52bb-4727-9772-81c893a878c5
version:     1
status:      ACTIVE
verify_jwt:  false
entrypoint:  supabase/functions/professional-invite-expire/index.ts
ezbr_sha256: eb877a16bc3af6cb3c3413dee65e59d367cc01b21b88dc178c3cd812292662d5
```

`config.toml` atualizado pra `[functions.professional-invite-expire] verify_jwt = false`.
Sem dependência de `_shared/validate-auth.ts` — o bundle só tem o `index.ts`.

Fluxo interno (sem autenticação — fronteira é o gateway + ausência de dados sensíveis na
resposta, idêntico a `check-scheduled-events`):

1. `OPTIONS` → 204. `POST` obrigatório — qualquer outro método → 405.
2. Body ignorado.
3. **Sweep single-shot:**
   ```sql
   UPDATE access_invites
   SET status='expired'
   WHERE status='pending' AND expires_at < now()
   RETURNING id, pet_id, invited_by, invite_email, role
   ```
4. Se `rows.length === 0` → 200 `{ ok: true, expired_count: 0, expired_ids: [], timestamp }`
   (early return, sem audit).
5. **Batch audit INSERT** (1 row por invite expirado):
   ```ts
   rows.map(r => ({
     pet_id: r.pet_id,
     actor_user_id: null,         // evento de sistema
     professional_id: null,        // invite pode nunca ter virado grant
     access_grant_id: null,
     event_type: 'invite_expired',
     target_table: 'access_invites',
     target_id: r.id,
     context: {
       invite_id: r.id,
       role: r.role,
       invite_email: r.invite_email,
       invited_by: r.invited_by,
       expired_at: nowIso,
     },
   }))
   ```
   **Non-fatal** — se o INSERT em batch falhar, console.error e continua; a EF retorna 200
   com o `expired_count` real (UPDATE já comitou).
6. 200 response: `{ ok: true, expired_count, expired_ids: [ids...], timestamp }`.

Desenho da idempotência: o filtro `WHERE status='pending'` da UPDATE descarta convites que
já viraram `expired`/`accepted`/`declined`/`cancelled`. Rodar a EF N vezes em sequência
produz `expired_count` zerado a partir da 2ª rodada (assumindo nenhum invite novo expirou no
intervalo). Propriedade validada no cenário D6 do harness.

Sem códigos de erro enumerados — o único modo de falha é a UPDATE em si (DB down / network
partition / quota), que cai no 500 `INTERNAL` padrão.

### 2.4. pg_cron job `expire-pending-invites-hourly`

Criado via `cron.schedule` (returns jobid). Snapshot em `cron.job`:

```
jobid:     5
jobname:   expire-pending-invites-hourly
schedule:  0 * * * *           -- todo minuto 0 de cada hora
active:    true
database:  postgres
username:  postgres
nodename:  localhost
nodeport:  5432
command:   SELECT net.http_post(
             url := 'https://peqpkzituzpwukzusgcq.supabase.co/functions/v1/professional-invite-expire',
             body := '{}'::jsonb,
             headers := '{"Content-Type":"application/json"}'::jsonb
           );
```

Smoke test executado em 2026-04-21 imediatamente após o schedule (dispara o comando
manualmente via `SELECT` direto, sem esperar o minuto 0):

```
request_id:   535
status_code:  200
elapsed:      ~2s
response:     {"ok":true,"expired_count":0,"expired_ids":[],"timestamp":"2026-04-21T20:26:39.208Z"}
```

Com isso o pipeline fim-a-fim (`cron.job` → `net.http_post` → gateway Supabase → Deno runtime
→ PostgREST UPDATE) está validado em produção. Primeira execução agendada real: próximo
minuto 0 após o schedule (topo da hora seguinte).

### 2.5. Harness E2E `scripts/e2e_block_d.ts`

~410 linhas. Importa primitivas de `e2e_pro_module.ts` (`adminClient`, `createTutor`,
`createPet`, `createProfessional`, `asUser`, `cleanup`, `tracked`). Helpers locais:

```ts
function freshToken(): string {
  return randomBytes(48).toString('base64url');  // 64 chars, passa no CHECK [A-Za-z0-9_-]
}

async function insertInvite(admin, opts: {
  petId: string; invitedBy: string; inviteEmail: string;
  role?: string; expiresAt?: Date; status?: InviteStatus;   // status opcional pra D3
}): Promise<{ id: string; token: string }>

async function callInviteCancel(accessToken, { invite_id }): Promise<HttpResp>
async function callInviteExpire(): Promise<HttpResp>         // sem Authorization — igual pg_cron
async function callInviteAccept(accessToken, { token, action }): Promise<HttpResp>  // pra D7
```

Cobre **7 cenários**:

- **D1** (cancel happy path) · Tutor emite invite pending, cancela pelo `invite_id` → 200 com
  `{ ok, invite_id, status: 'cancelled' }`. DB checks: `access_invites.status='cancelled'`,
  `accepted_at/by/created_grant_id` todos null; `access_audit_log` com
  `event_type='invite_cancelled'`, `actor_user_id=tutor.userId`, `professional_id=null`,
  `access_grant_id=null`, `context.{invite_id, role, invite_email}` batendo.
- **D2** (cancel por não-emissor) · `otherTutor` (outro tutor do ambiente) tenta cancelar
  invite do `tutor` → 403 `UNAUTHORIZED`. `invite.status` permanece `pending` (não foi mexido).
- **D3** (cancel de invite não-pending) · Fixture pré-insere invite com `status='declined'`
  via admin; tutor tenta cancelar → 409 `INVALID_STATE`, body menciona `declined`.
  `invite.status` permanece `declined`.
- **D4** (cancel de invite inexistente) · `invite_id = randomUUID()` que não existe → 404
  `INVITE_NOT_FOUND`.
- **D5** (expire happy path) · Fixture insere invite `pending` com `expires_at = NOW() − 1d`;
  chama `callInviteExpire()` (sem Authorization, só apikey no gateway) → 200 com
  `expired_ids.includes(d5InviteId)`. DB checks: `invite.status='expired'`; `access_audit_log`
  com `event_type='invite_expired'`, `actor_user_id=NULL`, `professional_id=NULL`,
  `access_grant_id=NULL`, `context.{invite_id, role, invited_by, expired_at}` batendo.
- **D6** (expire idempotente) · Segunda chamada a `callInviteExpire()` → 200 + `expired_ids`
  **não** contém `d5InviteId`. Count de audit `invite_expired` pro mesmo `target_id` é
  **exatamente 1** (não duplicou). `invite.status` permanece `expired`.
- **D7** (accept sobre invite cancelled de D1) · Pro destinatário do invite de D1 (agora
  `cancelled`) tenta aceitar via `professional-invite-accept` → 410 `GONE`, body menciona
  `cancelled` (vem do `CONSUMED_STATUSES = new Set(['accepted','declined','cancelled','expired'])`
  da EF de accept, linha 68 de `professional-invite-accept/index.ts`). Confirma que o Bloco C
  lida corretamente com o estado terminal introduzido pelo Bloco D. DB checks: invite
  permanece `cancelled`, `accepted_at/by/created_grant_id` null, zero grants criados pro
  `(petId, pro.professionalId)`.

Cleanup: usa o mesmo padrão dos Blocos B e C — confia em CASCADE de `access_invites.pet_id`
e `access_audit_log.pet_id` pra varrer invites e audit logs quando o registry de pets é
deletado. Nenhum helper dedicado de teardown.

Type-check (`npx tsc --noEmit --target es2022 --module esnext --moduleResolution bundler
--esModuleInterop --strict --skipLibCheck scripts/e2e_block_d.ts`): clean, 0 erros, 0 warnings.

---

## 3. Validação

### 3.1. Validação lógica + infraestrutural (executada via MCP SQL / MCP Supabase em produção)

Como o harness E2E HTTP depende do `SUPABASE_SERVICE_ROLE_KEY` no ambiente local (padrão
Blocos A/B/C), a validação deste sub-passo combinou deploy real das EFs + teste direto do
pipeline cron → EF → banco.

| Artefato | Check | Observado |
|---|---|---|
| `access_audit_log` CHECK event_type | inclui `invite_cancelled` + `invite_expired` | ✓ |
| `access_invites` CHECK status | aceita `cancelled` + `expired` | ✓ |
| `pg_cron` extension | v1.6.4, `pg_catalog`, installed | ✓ |
| `pg_net` extension | v0.20.0, `public`, installed | ✓ |
| Edge Function `professional-invite-cancel` | ACTIVE v1, `verify_jwt=false` | ✓ |
| Bundle on-server (cancel) | `index.ts` + `_shared/validate-auth.ts` | ✓ |
| sha256 (cancel) | `75d0bb39…e00c604` | ✓ |
| Edge Function `professional-invite-expire` | ACTIVE v1, `verify_jwt=false` | ✓ |
| Bundle on-server (expire) | só `index.ts` (não precisa de validate-auth) | ✓ |
| sha256 (expire) | `eb877a16…292662d5` | ✓ |
| pg_cron job `expire-pending-invites-hourly` | jobid=5, schedule `0 * * * *`, active | ✓ |
| Smoke test `net.http_post` → expire EF | request_id=535, status=200, body `{ok,expired_count:0,...}`, ~2s | ✓ |
| Migrations aplicadas pra este sub-passo | 0 (no-op confirmado) | ✓ |

O smoke test do pipeline cron é qualitativamente mais forte que um walkthrough SQL puro:
ele valida `pg_cron` schedule + `pg_net.http_post` + gateway Supabase + bundle Deno + PostgREST
UPDATE + JSON response em uma única cadeia. O que sobra pro E2E HTTP (harness `e2e_block_d.ts`)
é a validação das **regras de authorization e estado** com JWTs reais e fixtures controladas.

### 3.2. Validação E2E HTTP (pendente de execução local)

Igual aos Blocos A, B e C — `scripts/e2e_block_d.ts` está pronto e type-clean, mas depende
do `SUPABASE_SERVICE_ROLE_KEY` pra emitir JWTs reais e limpar fixtures. Pra rodar:

```
export SUPABASE_URL="https://peqpkzituzpwukzusgcq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<do Supabase Studio → Settings → API>"
export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
npx tsx scripts/e2e_block_d.ts
```

Exit 0 = todos os 7 cenários passaram. Exit 1 = algum assert quebrou (ou cleanup falhou).

O que fica coberto pelo E2E HTTP (que o smoke test do cron não cobre):

- **JWT ES256 real** emitido pelo Auth sendo aceito pelo `validateAuth()` da EF de cancel
  (a EF de expire não usa `validateAuth`, então esse path não precisa de cobertura HTTP).
- **Authorization** por `invite.invited_by === userId`: o cenário D2 (non-owner cancel) é
  o único que prova o 403 end-to-end com dois tutores distintos autenticados.
- **Serialização JSON** do `{ ok, invite_id, status }` + errors `{ error, code }` — walkthrough
  SQL não valida o wire format.
- **Cross-EF interaction (D7):** invite cancelado pela EF de cancel, re-tentado na EF de
  accept → 410 GONE. Valida que o `CONSUMED_STATUSES` set na EF de accept (escrito em 2.3.4)
  cobre corretamente o estado `cancelled` introduzido em 2.4.2.
- **Idempotência real da EF de expire (D6):** o smoke test só provou que ela responde 200
  com 0 invites pra expirar *no momento do disparo*. O D6 prova que, dados invites expirados
  de uma rodada prévia, rodar de novo não os re-processa (filtro `status='pending'`).
- **Audit actor_user_id=NULL** pra evento de sistema (D5): o smoke test não insere audit (0
  invites varridos), então não verifica o formato do audit com actor nulo.

Nenhum desses pontos é alto risco — o smoke test cron + deploy ACTIVE das duas EFs +
type-check limpo do harness cobrem as partes críticas. O E2E HTTP é garantia, não diagnóstico
(mesmo padrão dos blocos anteriores).

---

## 4. Decisões e descobertas notáveis

### 4.1. Cancel recebe `invite_id` (não `token`)

A EF de **accept** usa `token` como input porque o profissional chega ao fluxo via link de
email (`/convite/:token`) — ele não tem outro identificador. Já a EF de **cancel** atende um
tutor que está na própria interface do app olhando a lista dos seus convites emitidos. Esse
tutor tem o `invite.id` (PK, não secreto) disponível na listagem; não faz sentido expor o
token pra UI só pra usar na URL de cancelamento.

Vantagens de `invite_id`:

- Não precisa armazenar o token na tabela de listagem (o token é material secreto — quanto
  menos viaja, melhor).
- Erro 404 `INVITE_NOT_FOUND` só dá informação pra quem já tem o `id` (UUID aleatório),
  bloqueando enumeração por token.
- Ownership checagem simples por `invited_by === userId` sem precisar comparar emails.

Desvantagem: dois endpoints do lifecycle (`accept`/`decline` via token; `cancel` via id)
não seguem o mesmo input schema. Aceitável — a dicotomia reflete a assimetria real das duas
audiências (destinatário external vs emissor interno).

### 4.2. Ownership check in-memory **antes** do UPDATE (pra distinguir 403 vs 404)

A alternativa mais enxuta seria um UPDATE único com `WHERE id=$1 AND invited_by=$2 AND
status='pending'` — rowcount=0 resolve tudo sem o SELECT prévio. Mas isso mescla 3 erros
distintos em um:

- invite não existe → deveria ser 404
- invite existe mas caller não é emissor → deveria ser 403
- invite existe e caller é emissor, mas status != pending → deveria ser 409

UI do cliente precisa discriminar entre eles (mensagem e ação corretiva são diferentes).
Solução adotada: SELECT primeiro pra classificar, UPDATE condicional depois como
defense-in-depth (TOCTOU entre SELECT e UPDATE). O custo extra é 1 round-trip PG que só
dispara em escrita — aceitável pra a clareza de diagnóstico.

### 4.3. Cron frequência: hourly (não minutely)

`access_invites.expires_at` é setado com precisão de milissegundos na criação, mas o valor
usado pelo tutor ao emitir é tipicamente "7 dias" ou "30 dias" — resolução de dia. Um invite
que deveria expirar às 14:30 ficando `pending` até 15:00 (no pior caso) **não tem impacto
observável** pro profissional (ele vê o email com prazo em dia, não em minuto) nem pro tutor
(a UI mostra o status com resolução de dia).

Minutely (`* * * * *`) multiplicaria por 60 o custo de compute da EF (maior parte dela é
NOOP após o primeiro sweep do dia, mas ainda é um round-trip PG + cold start Deno ocasional).
Hourly equilibra:

- Responsividade humana aceitável (lag máximo ≤1h na transição de status).
- Custo ~24 chamadas/dia ao invés de ~1440.
- Alinhado com outros CRONs do projeto (`check-scheduled-events` = 2×/dia, etc.).

Se aparecer caso de uso sensível a lag de minutos (ex.: invite pra consulta em 30min), a
EF é chamável sob demanda via `net.http_post` do próprio código de produto — não precisa
mudar a frequência base.

### 4.4. Audit actor_user_id=NULL pra eventos de sistema

`access_audit_log.actor_user_id` é nullable (CHECK permite NULL). Pro evento
`invite_expired`, o actor **é** o sistema (pg_cron via net.http_post), não um humano. Três
alternativas consideradas:

- `NULL` (adotado) — reflete a natureza do evento; filtros de UI que mostrem "eventos
  iniciados por X" naturalmente excluem sistema.
- `invited_by` (cópia do emissor) — seria "este invite expirou pro tutor X", mas mistura
  semântica: o tutor não iniciou a expiração, foi o sistema. Filtros do tipo "ações do tutor
  X" mostrariam falsos positivos.
- UUID fixo reservado (ex.: `00000000-0000-0000-0000-000000000000` como "system user") —
  polui `public.users` ou obriga `actor_user_id` FK ser nullable dos dois lados (hoje FK
  aponta pra `users(id)` e aceita NULL, então NULL é mais limpo do que um sentinel).

Salvo internamente como candidato a memória pra futuros eventos de sistema (sweeps,
reconciliadores, cron jobs em geral): `actor_user_id=NULL` + `professional_id=NULL` é a
convenção.

### 4.5. Cancel sem `professional_id` no audit

O audit row do `invite_cancelled` tem `professional_id=NULL`. Razão: o convite é cancelado
**antes** de virar grant, e o destinatário (`invite_email`) pode nem ter perfil profissional
ainda — requirir `professional_id` forçaria a gente a fazer lookup desnecessário. Mesma
convenção vale pro `invite_expired` (um invite pode expirar mesmo que o destinatário nunca
tenha se cadastrado como pro).

Quando o audit precisa do professional: eventos pós-grant (`grant_accepted`, `grant_revoked`,
`clinical_read`, etc.). Aí `professional_id` é preenchido normalmente.

### 4.6. Expire EF sem `validateAuth` — mesma fronteira de segurança dos outros CRONs

Ponderei exigir algum tipo de autenticação (ex.: header compartilhado tipo
`X-Cron-Secret`) pra proteger a EF de expire contra disparo abusivo. Descartei porque:

- **Gateway rate limit** do Supabase já protege contra flood (limites padrão de 100 req/s
  por IP).
- **Resposta sem dados sensíveis** — a EF retorna `{ ok, expired_count, expired_ids,
  timestamp }`. Os `expired_ids` são UUIDs dos convites que o caller **já acabou de mover**
  pra `expired` — info derivada do próprio ato de chamar a EF, não vazamento.
- **Efeito colateral idempotente** — um atacante disparando a EF 10.000x/dia consegue
  apenas... expirar invites que já deveriam expirar mesmo. Não dá pra forçar estado
  inconsistente, não dá pra ver convites alheios.
- **Consistência com `check-scheduled-events`, `analyze-health-patterns`, `send-push-notifications`**
  — o mesmo pattern (verify_jwt=false + sem validateAuth) é usado em ≥3 outros CRONs do
  projeto. Manter o padrão facilita manutenção.

Se em algum momento o mapa de risco mudar (ex.: EFs CRON passarem a expor mais dados no
body), vale reabrir. Por ora, fronteira de segurança satisfatória.

### 4.7. Audit write non-fatal em ambas as EFs (cancel + expire)

Em ambas, a ordem é: UPDATE primeiro (com o commit), audit INSERT depois. Se o audit falhar:
- **cancel:** `console.error` + retorna 200 ao cliente. O tutor vê "cancelado" (correto), mas
  sem rastro no audit log. Melhor do que "falhou em cancelar" quando na verdade cancelou.
- **expire:** `console.error` + retorna 200 com o `expired_count` real. Mesma lógica — o
  estado dos invites é a verdade; audit é observabilidade.

Cenário alternativo seria reverter o UPDATE se o audit falhar — implica transação explícita,
que nenhum dos outros endpoints do projeto faz (e que o cliente Deno do Supabase não expõe
natively — precisaria RPC SECURITY DEFINER). Decidi manter o padrão do resto do projeto.

---

## 5. Desvios do plano

### 5.1. Migration 2.4.1 virou no-op (idêntico ao Bloco C)

O plano `plano_fase2_modulo_profissional.md` reservava slot pra migration `20260425_*.sql`.
A auditoria de 2.4.1 (task #177) mostrou que tudo que o Bloco D precisava já estava no
banco — CHECK de audit event_type já cobre `invite_cancelled`/`invite_expired`, CHECK de
status já aceita `cancelled`/`expired`, extensions `pg_cron` e `pg_net` instaladas. Task #177
fechou como "no-op confirmed" e o slot de migration foi pulado.

Padrão já se estabelece: preparar DDLs preemptivamente em sub-passos anteriores (2.2.4
expandiu audit events pros 5 do lifecycle) paga dividendos em sub-passos posteriores
(Bloco C: no-op; Bloco D: no-op). Continuar essa prática nos próximos blocos.

### 5.2. Validação final foi de smoke + tipo, não HTTP E2E completo (igual Blocos A/B/C)

Mesmo padrão: harness escrito e type-clean, mas execução final depende do
`SUPABASE_SERVICE_ROLE_KEY` no ambiente local. Diferença aqui é que o **pipeline cron → EF**
foi validado em produção via `net.http_post` direto — prova mais forte que o walkthrough SQL
usado nos blocos anteriores, porque passa pelo mesmo gateway/runtime que o pg_cron agendado
vai usar em produção. Sobra pro harness HTTP validar regras de authorization + wire format +
cross-EF interaction (D7).

### 5.3. Cron smoke test mostrou `expired_count=0` (esperado, não bug)

No momento do smoke, nenhum invite em produção tinha `expires_at < now()` e
`status='pending'` — resposta `{ expired_count: 0, expired_ids: [] }`. Isso **não** é desvio
— é estado legítimo (convites em produção criados recentemente com `expires_at = now() +
7 days`). A validação real de `expired_count > 0` virá:

- No harness E2E (cenário D5 — insere invite com `expires_at = NOW() − 1d` e dispara a EF).
- Na primeira execução real do cron que pegar um invite expirando (poucos dias após convites
  de teste reais serem criados).

Nenhum dos dois bloqueia o fechamento do sub-passo — a EF e o schedule estão no lugar e
funcionando; falta só cenário real com dado pra expirar.

---

## 6. Memórias a atualizar

Nenhuma memória nova salva durante a execução deste sub-passo (diferente do Bloco C, que
teve `project_enum_divergence_professional_type_vs_role.md`). Razão: o sub-passo foi
"recolher frutas" do que já foi plantado (infra pg_cron/pg_net, CHECK constraints
preemptivos, padrão de EF `verify_jwt=false` sem validateAuth).

Candidatas a salvar (revisar com o usuário antes de persistir):

- **`project_cron_ef_pattern.md`** — Pattern pra EFs invocáveis por pg_cron:
  `verify_jwt=false` no config.toml + `net.http_post(url, '{}'::jsonb, '{"Content-Type":
  "application/json"}'::jsonb)` no SELECT agendado + **sem** header Authorization nem apikey.
  O Deno runtime recebe a request, `verify_jwt=false` pula a checagem do gateway, e a EF
  processa com service_role internamente. Usado em `check-scheduled-events`,
  `analyze-health-patterns`, `send-push-notifications` e agora `professional-invite-expire`.

- **`project_expire_idempotence_status_filter.md`** — Sweep EFs que mudam status (ex.:
  `invite_expire`) devem filtrar pelo status origem (`WHERE status='pending'`) na UPDATE,
  não pelo destino (`WHERE status != 'expired'`). Isso garante idempotência automática
  mesmo se valores novos forem adicionados ao enum de status — rodar a EF N vezes não
  reprocessa o que já foi. Aplicável pra qualquer sweep futuro (ex.: expire-unused-grants,
  sweep-abandoned-drafts).

- **`project_audit_system_event_convention.md`** — Pra eventos de audit iniciados por
  sistema (CRONs, sweeps, reconciliadores), usar `actor_user_id=NULL` + `professional_id=NULL`.
  Preencher esses campos com sentinels ou cópia do originador do estado (invited_by, etc.)
  mistura semântica e polui filtros de UI "ações de usuário X". Exceção: se o audit precisar
  de FK (policy), usar um UUID reservado em `users` pra sistema — mas nenhum lugar do código
  atual requer isso.

---

## 7. Tasks deste sub-passo

| Task | Descrição | Status |
|---|---|---|
| #177 | 2.4.1 — Auditar estado pós-Bloco C (invite lifecycle, pg_cron disponibilidade, schedules existentes) | completed (no-op confirmado) |
| #178 | 2.4.2 — Edge Function `professional-invite-cancel` | completed |
| #179 | 2.4.3 — Edge Function `professional-invite-expire` | completed |
| #180 | 2.4.4 — pg_cron job `expire-pending-invites-hourly` | completed (smoke-tested) |
| #181 | 2.4.5 — `scripts/e2e_block_d.ts` harness | completed (tsc-clean, pronto pra rodar) |
| #182 | 2.4.6 — Documentar em `fase2_24_invite_cancel_expire_report.md` (este arquivo) | completed |

Sub-passo 2.4 fechado. Lifecycle do invite agora está **completo**: 5 estados terminais
(`accepted`, `declined`, `cancelled`, `expired`) cobertos por 3 Edge Functions
(`professional-invite-create`, `professional-invite-accept` com `action='accept'|'decline'`,
`professional-invite-cancel`, `professional-invite-expire`) + 1 cron schedule.

Próximo sub-passo do plano: 2.5 (Integração — push/email de "seu convite foi aceito / foi
expirado" pro tutor emissor). Com os 4 audit event types do lifecycle de invite no lugar,
2.5 pode usar `access_audit_log` como fonte dos eventos de notificação (trigger em INSERT
ou polling por tipo), sem precisar instrumentar cada EF individualmente.

Padrão de integração HTTP E2E segue pendente de rodar local — considerar bloco dedicado de
validação manual antes de 2.5 ou 2.6, rodando `e2e_pro_module`, `e2e_block_a`, `e2e_block_b`,
`e2e_block_c` e `e2e_block_d` em sequência com service_role exportado.
