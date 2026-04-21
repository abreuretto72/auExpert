# Fase 2 · Sub-passo 2.3 — Relatório de execução

> **Status:** EXECUTADO e VALIDADO em 2026-04-21.
> **Migration:** no-op confirmado — o CHECK de `access_audit_log.event_type` já cobria
> `grant_accepted` (herdado da Fase 1) + `invite_accepted` / `invite_declined` (adicionados
> preemptivamente em 2.2.4 via `20260423_access_audit_event_invite.sql`).
> Edge Function `professional-invite-accept` deployada (v1, ACTIVE, `verify_jwt=false`).
> Validação SQL: lógica do EF conferida via walkthrough de 6 cenários (C1–C6) em produção.
> Harness E2E HTTP (`scripts/e2e_block_c.ts`) escrito, type-clean (`tsc --noEmit` sem erros)
> e pronto — roda quando o tutor exportar `SUPABASE_SERVICE_ROLE_KEY` no ambiente local.

---

## 1. Escopo do sub-passo

Sub-passo 2.3 do `plano_fase2_modulo_profissional.md`:

- Confirmar (ou criar) migration pra Bloco C: garantir que `access_audit_log.event_type`
  aceita `invite_accepted` / `invite_declined` (lifecycle do invite) **e** `grant_accepted`
  (lifecycle do grant). Se tudo já estiver no lugar, registrar como no-op e pular DDL.
- Criar Edge Function `professional-invite-accept`:
  - Autenticação manual via `_shared/validate-auth.ts` (mesma razão do `professional-invite-create`:
    ES256 vs HS256 gateway).
  - Ação parametrizada: `action='accept' | 'decline'` no body — uma única EF, duas saídas.
  - Authorization por identidade: `invite.invite_email` precisa bater com o email do usuário
    autenticado (case-insensitive). Qualquer desvio → 403 `WRONG_RECIPIENT`.
  - Preflight de estado: `status='pending'` + `expires_at > now()` ou → 410 GONE (engloba
    convites já consumidos, declinados, cancelados ou expirados; mensagem i18n-friendly no
    body).
  - `action='accept'`:
    - Exigir perfil profissional ativo em `public.professionals` pro email autenticado
      (senão → 403 `NEEDS_ONBOARDING`, tutor é orientado a completar onboarding).
    - Preflight de duplicidade: se já existe `access_grant` ativo em `(pet_id,
      professional_id)` → 409 `DUPLICATE_ACTIVE_GRANT` (devolve `grant_id` do ativo).
    - Ordem de operações cirúrgica por causa do CHECK `access_invites_accepted_consistency`:
      (1) INSERT em `access_grants`, (2) UPDATE no `access_invites` com `status='accepted' +
      accepted_at/by + created_grant_id` (condicional em `status='pending'` pra detectar
      corrida), (3) rollback manual (DELETE) do grant pré-inserido se o UPDATE pegou 0 linhas
      → 409 `RACE`, (4) INSERT em `access_audit_log` com `event_type='grant_accepted'`.
    - Body 200: `{ ok, grant_id, pet_id, role, granted_at, invite_id }`.
  - `action='decline'`:
    - Não exige perfil profissional (um usuário pode declinar antes mesmo de virar profissional).
    - UPDATE simples: `status='declined'` (sem `accepted_at/by`/`created_grant_id`, CHECK
      só exige esses quando status='accepted').
    - INSERT em `access_audit_log` com `event_type='invite_declined'`.
    - Body 200: `{ ok, invite_id, status: 'declined' }`.
- Escrever harness E2E (`scripts/e2e_block_c.ts`) cobrindo 6 cenários C1–C6.

---

## 2. Entregas

### 2.1. Migration 2.3.2/2.3.3 — NO-OP confirmado

Nenhum arquivo novo em `supabase/migrations/`. Razão:

- `access_audit_log.event_type` CHECK já inclui os 16 valores necessários (confirmado via
  `pg_get_constraintdef` em 2026-04-21):

  ```
  grant_created, grant_accepted, grant_rejected, grant_revoked, grant_expired,
  clinical_read, clinical_write, clinical_sign, diary_read, diary_write, export_pdf,
  invite_created, invite_accepted, invite_declined, invite_cancelled, invite_expired
  ```

  - `grant_*` (5 eventos) já existiam desde a Fase 1 (Bloco 0) quando a tabela foi criada.
  - `invite_*` (5 eventos) foram adicionados em 2.2.4 pela migration
    `20260423_access_audit_event_invite.sql` (aplicada como `20260421155242`),
    **preemptivamente** pra não precisar `ALTER TABLE` quando o Bloco C executasse.
  - `clinical_*`, `diary_*`, `export_*` já estavam no lote inicial.

- `access_invites` schema já suporta o fluxo de aceite sem alteração: `status`, `accepted_at`,
  `accepted_by`, `created_grant_id`, `expires_at` já estão no lugar. O CHECK
  `access_invites_accepted_consistency` foi escrito em 2.2.2 pensando no Bloco C
  (guarantia: status='accepted' ⇒ `accepted_at + accepted_by + created_grant_id ≠ NULL`).

- `access_grants` (tabela da Fase 1) não precisou alteração. UNIQUE PARTIAL INDEX
  `access_grants_unique_active_idx (pet_id, professional_id) WHERE is_active=true` já protege
  contra duplicidade no momento do INSERT — o preflight 409 na EF é pra mensagem amigável,
  mas o índice também cobre se chegarem duas requests concorrentes e apenas uma passar no
  INSERT.

- `notifications_queue`: Bloco C **não** emite push/email no happy path do aceite
  (fica pra 2.4 quando integrar "tutor foi notificado que o pro aceitou" como notificação).
  Por isso também sem mudança aqui.

Conclusão: o Bloco C colhe o que foi plantado em 2.2.4. Tasks #172 e #173 fecharam como
"no-op confirmed" — zero DDL aplicado, zero `NOTIFY pgrst` necessário, zero regen de types.

### 2.2. Edge Function `professional-invite-accept`

Arquivo: `supabase/functions/professional-invite-accept/index.ts` (346 linhas).

Deploy confirmado via `list_edge_functions`:

```
slug:        professional-invite-accept
id:          c5486f9b-f942-42b3-962d-37a82cd2b999
version:     1
status:      ACTIVE
verify_jwt:  false
entrypoint:  supabase/functions/professional-invite-accept/index.ts
ezbr_sha256: 6ec606414dd931d2dcdfc708ff0b88a190d8bb421c6a87859262f235eed3d230
```

Bundle de deploy inclui `_shared/validate-auth.ts` como import relativo (checado via
`get_edge_function`). `config.toml` atualizado pra `[functions.professional-invite-accept]
verify_jwt = false`.

Fluxo interno — `action='accept'`:

1. `OPTIONS` → 204 com CORS headers.
2. Só `POST` — qualquer outro método → 405.
3. Extrai Bearer do header → `validateAuth(token)` → `{ userId, email }` ou 401.
4. Valida payload: `token` string não-vazia (senão 400 `MISSING_TOKEN`), `action ∈
   ['accept','decline']` (senão 400 `INVALID_ACTION`).
5. `SELECT * FROM access_invites WHERE token=$1 LIMIT 1` → se null → 404 `INVITE_NOT_FOUND`.
6. Authorization: `invite.invite_email.toLowerCase() !== email.toLowerCase()` → 403
   `WRONG_RECIPIENT`.
7. Preflight de estado: `invite.status !== 'pending' || invite.expires_at < now()` → 410
   `GONE` (body distingue `status: <atual>` pra UI dar mensagem específica).
8. Preflight de perfil: `SELECT id, is_active FROM professionals WHERE user_id=$1 AND
   is_active=true LIMIT 1` → se null → 403 `NEEDS_ONBOARDING`.
9. Preflight de duplicidade: `SELECT id FROM access_grants WHERE pet_id=$invite.pet_id AND
   professional_id=$pro.id AND is_active=true LIMIT 1` → se existe → 409
   `DUPLICATE_ACTIVE_GRANT` (body inclui `grant_id` do ativo pra UI redirecionar).
10. **INSERT `access_grants`** com `granted_by=invite.invited_by`, `invite_token=invite.token`,
    `role=invite.role`, `is_active=true`. Retorna `grant_id + granted_at`.
11. **UPDATE `access_invites`** condicional em `status='pending'`:
    ```sql
    UPDATE access_invites
    SET status='accepted', accepted_at=now(), accepted_by=$userId,
        created_grant_id=$grant_id, updated_at=now()
    WHERE id=$invite.id AND status='pending'
    RETURNING id;
    ```
    Se rowcount=0 → **rollback** (DELETE do grant recém-criado) + 409 `RACE` (outro requester
    venceu a corrida entre o SELECT inicial e o UPDATE).
12. INSERT em `access_audit_log` (`event_type='grant_accepted'`, `actor_user_id=caller`,
    `professional_id=pro.id`, `pet_id=invite.pet_id`, `target_table='access_grants'`,
    `target_id=grant_id`, `access_grant_id=grant_id`, `context={ invite_id, role,
    invited_by }`).
13. 200 response: `{ ok: true, grant_id, pet_id, role, granted_at, invite_id }`.

Fluxo interno — `action='decline'`:

1–7. Idêntico ao accept (OPTIONS / method / auth / payload / SELECT invite / WRONG_RECIPIENT
/ GONE).
8. **UPDATE** condicional: `UPDATE access_invites SET status='declined', updated_at=now()
   WHERE id=$invite.id AND status='pending' RETURNING id`. Rowcount=0 → 409 `RACE`
   (mesmíssima semântica do accept).
9. INSERT em `access_audit_log` (`event_type='invite_declined'`, `actor_user_id=caller`,
   `pet_id=invite.pet_id`, `target_table='access_invites'`, `target_id=invite.id`,
   `access_grant_id=null`, `context={ invite_id, invited_by }`).
10. 200 response: `{ ok: true, invite_id, status: 'declined' }`.

Todas as escritas usam `service_role` (bypassa RLS). Seguindo o mesmo padrão do Bloco B,
`access_invites` e `access_grants` não têm policy UPDATE/INSERT aberta pra `authenticated` —
a fronteira de segurança está **no handler** via `validateAuth()` + checagem de
`invite.invite_email === email`.

Códigos de erro padronizados no body (`{ error, code }`):

| Código | Status | Quando |
|---|---|---|
| `MISSING_TOKEN` | 400 | `token` ausente/vazio no payload |
| `INVALID_ACTION` | 400 | `action` != accept/decline |
| `WRONG_RECIPIENT` | 403 | email autenticado ≠ `invite.invite_email` |
| `NEEDS_ONBOARDING` | 403 | (accept) usuário sem linha ativa em `professionals` |
| `INVITE_NOT_FOUND` | 404 | token não existe |
| `DUPLICATE_ACTIVE_GRANT` | 409 | (accept) grant ativo já existe em `(pet, pro)` |
| `RACE` | 409 | UPDATE condicional não pegou linha (outro requester venceu) |
| `GONE` | 410 | status != 'pending' ou `expires_at < now()` |
| `INTERNAL` | 500 | DB/runtime error não mapeado |

### 2.3. Harness E2E `scripts/e2e_block_c.ts`

505 linhas. Importa primitivas de `e2e_pro_module.ts` (`adminClient`, `createTutor`,
`createPet`, `createProfessional`, `asUser`, `cleanup`, `tracked`). Helpers locais:

```ts
function freshToken(): string {
  return randomBytes(48).toString('base64url');  // 64 chars, passa no CHECK [A-Za-z0-9_-]
}

async function insertInvite(admin, opts: {
  petId: string; invitedBy: string; inviteEmail: string;
  role?: string; expiresAt?: Date;
}): Promise<{ id: string; token: string }>

async function callInviteAccept(accessToken, payload: {
  token: string; action: 'accept' | 'decline'
}): Promise<{ status: number; body: unknown }>
```

Cobre **6 cenários**:

- **C1** (accept happy path) · Invite pending válido (role `vet_read`), pro tem perfil ativo
  → 200 com `{ ok, grant_id, pet_id, role: 'vet_read', granted_at, invite_id }`. Valida no DB:
  `access_invites` com `status='accepted'`, `accepted_at ≠ null`, `accepted_by=pro.userId`,
  `created_grant_id=<grant_id retornado>`; 1 row em `access_grants` com `(pet_id,
  professional_id)` corretos, `granted_by=tutor.userId`, `is_active=true`,
  `invite_token=<token do invite>`; 1 row em `access_audit_log` com
  `event_type='grant_accepted'`, `target_table='access_grants'`, `target_id=grant_id`,
  `context.{invite_id, role, invited_by}` batendo.
- **C2** (decline happy path) · Invite pending em pet separado, caller é o pro → 200 com
  `{ ok, invite_id, status: 'declined' }`. Snapshot de `count(access_grants)` antes/depois
  comprova 0 novos grants criados; `access_audit_log` com `event_type='invite_declined'`,
  `target_table='access_invites'`, `access_grant_id IS NULL`.
- **C3** (expired) · Invite pending com `expires_at` no passado (−1 dia), pro chama accept →
  410 GONE + `{ error, code: 'GONE' }`. DB inalterado.
- **C4** (already consumed) · Depois de C1, pro tenta aceitar **o mesmo token** de novo →
  410 GONE (agora por `status='accepted' ≠ 'pending'`). Prova que a EF detecta tanto expiração
  quanto consumo pelo mesmo caminho (status != 'pending').
- **C5** (duplicate active grant) · Novo invite com role diferente (`vet_full`) pro mesmo
  `(pet, pro)` de C1 (grant ativo remanescente). Pro aceita → 409 `DUPLICATE_ACTIVE_GRANT` +
  body inclui `grant_id` do grant ativo (o de C1). `access_invites` permanece pending (não
  consumido).
- **C6** (needs onboarding) · Invite pending pro email do tutor "órfão" (`createTutor` cria
  auth user + `public.users` mas **não** insere em `professionals` — perfeito pro cenário).
  Tutor órfão autentica e tenta aceitar → 403 `NEEDS_ONBOARDING`. DB inalterado.

Cleanup: confia em CASCADE das tabelas registradas. `access_invites.pet_id` e
`access_grants.pet_id`/`professional_id` são todos `ON DELETE CASCADE`, então
`cleanup(admin)` do Bloco 0 (que deleta `pets` + `professionals` + `auth.users`) varre
invites, grants e audit_logs automaticamente. Nenhum helper dedicado de teardown — igual
Bloco B (contraste com Bloco A, que precisou de `cleanupBlockA` pras 4 tabelas clínicas NO
ACTION).

Type-check (`npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext
--esModuleInterop --strict --skipLibCheck scripts/e2e_block_c.ts scripts/e2e_pro_module.ts`):
clean, 0 erros, 0 warnings.

---

## 3. Validação

### 3.1. Validação lógica (executada via MCP SQL walkthrough em produção)

Como o harness E2E HTTP depende do `SUPABASE_SERVICE_ROLE_KEY` no ambiente local (padrão
Bloco A/B), em 2.3.4 rodei um walkthrough direto no banco que simula cada cenário inserindo
fixtures + executando as mesmas queries que a EF faz, depois conferindo o estado pós.
Resultado consolidado (6 scripts SQL, 1 por cenário):

| Cenário | Assert principal | Observado |
|---|---|---|
| **C1 accept** | `invites.status='accepted' + audit grant_accepted row exists + active_grants_for_pair=1 + invite.created_grant_id=grant.id` | ✓ |
| **C2 decline** | `invites.status='declined' + audit invite_declined row exists + grants_created_from_decline=0` | ✓ |
| **C3 expired** | `invite.status='pending' + expires_at < now()` → EF retorna 410 per logic | ✓ |
| **C4 consumed** | Depois do C1, `invite.status='accepted' (≠ pending)` → EF retorna 410 per logic | ✓ |
| **C5 duplicate precheck** | Novo invite (pet,pro) de C1 com `existing_active_grant_found=true` → EF retorna 409 per logic | ✓ |
| **C6 needs onboarding** | Email do invite bate com tutor órfão + tutor órfão não tem perfil ativo em `professionals` → EF retorna 403 per logic | ✓ |
| **C6b wrong recipient (extra)** | Email autenticado ≠ `invite.invite_email` → EF retorna 403 per logic | ✓ |

Todos os artefatos conferidos em produção:

| Artefato | Check | Observado |
|---|---|---|
| `access_audit_log` CHECK event_type | inclui `grant_accepted`, `invite_accepted`, `invite_declined`, `invite_cancelled`, `invite_expired` | ✓ |
| `access_invites` CHECK accepted_consistency | status='accepted' ⇒ `accepted_at + accepted_by + created_grant_id ≠ NULL` | ✓ |
| `access_grants` UNIQUE partial index | `(pet_id, professional_id) WHERE is_active=true` | ✓ |
| `access_grants` FK pet_id | ON DELETE CASCADE | ✓ |
| `access_grants` FK professional_id | ON DELETE CASCADE | ✓ |
| Edge Function | `professional-invite-accept` ACTIVE v1 com `verify_jwt=false` | ✓ |
| Bundle on-server | `index.ts` + `_shared/validate-auth.ts` presentes | ✓ |
| sha256 | `6ec606414dd931d2dcdfc708ff0b88a190d8bb421c6a87859262f235eed3d230` | ✓ |
| Migrations aplicadas pra este sub-passo | 0 (no-op confirmado) | ✓ |

### 3.2. Validação E2E HTTP (pendente de execução local)

Igual aos Blocos A e B — `scripts/e2e_block_c.ts` está pronto e type-clean, mas depende do
`SUPABASE_SERVICE_ROLE_KEY` pra emitir JWTs reais e limpar fixtures. Pra rodar:

```
export SUPABASE_URL="https://peqpkzituzpwukzusgcq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<do Supabase Studio → Settings → API>"
export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
npx tsx scripts/e2e_block_c.ts
```

Exit 0 = todos os 6 cenários passaram. Exit 1 = algum assert quebrou (ou cleanup falhou,
que é logado separadamente).

O que fica coberto pelo E2E HTTP (que o walkthrough SQL não cobre):

- JWT ES256 real emitido pelo Auth sendo aceito por `validateAuth()` no Deno
- Serialização JSON do `{ ok, grant_id, ... }` e dos erros `{ error, code }` no body
- Propagação `service_role → access_grants INSERT` + `access_invites UPDATE` atomicamente
  (não é transação real — é grant-first + UPDATE condicional + rollback manual; o HTTP end-
  to-end valida que o rollback do grant funciona se o UPDATE perder a corrida)
- Timing real da detecção de corrida (C4 é o teste mais próximo disso — re-accept da mesma
  row fica preso no UPDATE condicional WHERE status='pending')
- Correção do body em 409 DUPLICATE (o `grant_id` devolvido precisa ser o do grant ativo, não
  o que a EF tentou criar e reverteu — fácil de errar na refactor)

Nenhum desses pontos é alto risco: `validate-auth.ts` já está em uso em 9 Edge Functions
(contando a 2.2.4), o pattern grant-first + UPDATE condicional é bem-estabelecido e o
walkthrough SQL já provou que as queries individuais estão corretas. O harness HTTP é
garantia, não diagnóstico.

---

## 4. Decisões e descobertas notáveis

### 4.1. Uma única EF com `action` parametrizado (accept + decline)

Ponderei duas EFs separadas (`professional-invite-accept` + `professional-invite-decline`) vs
uma única com `action` no body. Escolhi única porque:

- ~80% da lógica é compartilhada (auth, preflight de `WRONG_RECIPIENT` e `GONE`, lookup do
  invite). Duas EFs duplicariam 90 linhas cada.
- Do lado do cliente, a tela de aceite/declínio é a mesma (um modal com 2 botões). Um único
  endpoint simplifica o fetch wrapper.
- O preflight de perfil ativo (`NEEDS_ONBOARDING`) só vale pra `accept` — num refator futuro,
  se ramificar demais, dividir é barato.

Desvantagem: o verb `POST /professional-invite-accept` ficou "mentiroso" pra `action=decline`.
Aceitável — o path é o nome da EF, não da ação lógica.

### 4.2. Grant-first ordering por causa do CHECK `accepted_consistency`

O CHECK `access_invites_accepted_consistency` obriga que `status='accepted' ⇒ accepted_at +
accepted_by + created_grant_id ≠ NULL`. Isso força a ordem:

1. INSERT `access_grants` primeiro (pra obter o `grant_id`)
2. UPDATE `access_invites` com `created_grant_id=grant_id` + demais campos

Se invertêssemos (UPDATE do invite primeiro com um placeholder), o CHECK estouraria. Se
tentássemos INSERT do grant + UPDATE do invite dentro de uma transação do postgres-js, o
client do Supabase Deno não expõe `BEGIN/COMMIT` direto — teria que usar RPC com SECURITY
DEFINER. O grant-first + UPDATE condicional + rollback manual é a forma mais simples que
ainda é segura sob corrida.

### 4.3. Mitigação de corrida: UPDATE condicional em `status='pending'` + rollback do grant

Cenário de corrida: 2 requests chegam no mesmo invite quase simultaneamente (antes que
qualquer UPDATE tenha commitado). Ambas passam no preflight (`status='pending'`), ambas
tentam INSERT do grant. O UNIQUE PARTIAL INDEX bloqueia o segundo INSERT → uma request
completa, a outra falha com `23505` e a EF retorna 409 `DUPLICATE_ACTIVE_GRANT`.

Cenário mais sutil: 2 requests pra invites **diferentes** apontando pro mesmo
`(pet, professional)`. Primeira chega, INSERT grant ok, UPDATE invite1 ok. Segunda chega
depois: preflight pega invite2.status='pending' ainda (ok), INSERT grant ok (nada impede
no banco — invite2.id é diferente, grant.pet_id/professional_id é o mesmo só se o caller for
o mesmo pro). Aí a segunda EF faz UPDATE em invite2, rowcount=1, mas o `DUPLICATE` do
preflight de C5 pega antes. Cobertura OK.

Cenário mais incômodo: 2 requests pro **mesmo invite** chegando ao mesmo tempo. Ambas passam
preflight, ambas INSERT grant → **uma** passa (o UNIQUE partial bloqueia a outra no `(pet,
pro)`). Aí a que passou faz UPDATE condicional, rowcount=1, retorna 200. A que não passou
captura exception no INSERT grant e retorna 409 `DUPLICATE_ACTIVE_GRANT` (porque agora o
grant existe).

Cenário limite (o que o `RACE` 409 protege): primeira request faz INSERT grant ok, mas
crasha antes do UPDATE (OOM, timeout na rede); segunda request entra, passa preflight, mas o
grant da primeira já existe → 409 `DUPLICATE_ACTIVE_GRANT`. Fim de papo: a primeira request
deixou um grant órfão sem invite marcado como accepted. O UPDATE condicional + rollback
não protege esse caso específico — precisaria de transação real ou RPC SECURITY DEFINER.
Aceitável pro MVP: operador pode auditar grants órfãos (grant.is_active=true mas nenhum
invite com created_grant_id apontando pra ele) e reconciliar manualmente, ou um cron de
consistência no futuro.

### 4.4. `NEEDS_ONBOARDING` é decisão de produto, não técnica

Poderia-se permitir aceitar o invite antes de ter perfil profissional, e forçar o onboarding
pós-aceite. Decidi bloquear upfront porque:

- O invite contém `role` (ex: `vet_full`) que só faz sentido se o tutor vai enxergar o pro
  como veterinário — i.e., com registro no CRMV. Se o profissional aceitar primeiro e
  completar o perfil depois, há uma janela em que o tutor vê um "grant ativo para um perfil
  vazio".
- UX: o modal do convite pode detectar `NEEDS_ONBOARDING` e mostrar "Complete seu cadastro
  profissional pra aceitar este convite → [Começar]" em vez de 2 botões genéricos.

Revisitar em 2.5 se friction for alta na prática.

### 4.5. Enum divergence `professional_type` vs `role` (gotcha de fixture)

Ao escrever fixtures do C6, descobri que `professionals.professional_type` e
`access_invites.role` têm **enums diferentes** apesar da sobreposição semântica:

- `professional_type`: `veterinarian`, `vet_tech`, `groomer`, `trainer`, ...
- `role`: `vet` (short form), `vet_tech`, `groomer`, ...

Um `INSERT INTO professionals (professional_type) VALUES ('vet')` estoura CHECK constraint
violation — `professional_type` exige `veterinarian`, não `vet`. Salvo como memória
`project_enum_divergence_professional_type_vs_role.md`. Na prática pro Bloco C: o helper
`createProfessional(admin, { professionalType: 'veterinarian' })` passa a forma correta e
nenhuma fixture do harness bate na constraint.

Pra mapear no EF futuro que relacione os dois (ex.: "dado `invite.role='vet'`, busque
perfis `professional_type='veterinarian'`"), vai precisar um map explícito — o resto dos
valores é 1:1.

### 4.6. Harness cleanup 100% via CASCADE (mesmo padrão do Bloco B)

`access_invites.pet_id → pets ON DELETE CASCADE`, `access_grants.pet_id → pets ON DELETE
CASCADE`, `access_grants.professional_id → professionals ON DELETE CASCADE`,
`access_audit_log.pet_id → pets ON DELETE CASCADE`. Então `cleanup(admin)` do harness base
varre tudo só deletando pets + professionals + auth.users. Nenhum `cleanupBlockC` dedicado.

Observação importante: grants criados pela EF em C1 **não** passam pelo registry
`tracked.grantIds` do harness (a EF usa service_role internamente, fora do scope do harness).
Mas como `access_grants.pet_id CASCADE`, eles desaparecem no teardown via os pets do
registry. Testado via SQL walkthrough: um DELETE em `pets` em produção apagou 1 grant
"fantasma" junto.

---

## 5. Desvios do plano

### 5.1. Migration 2.3.2/2.3.3 virou no-op

O plano original em `plano_fase2_modulo_profissional.md` alocava slot pra migration
`20260424_*.sql`. Na execução, a auditoria de 2.3.1 (task #171) mostrou que tudo que o
Bloco C precisava já estava no banco (CHECK de audit event_type, CHECK
accepted_consistency, UNIQUE partial no access_grants). Fechei #172 e #173 como "no-op
confirmado" e pulei a criação do arquivo `.sql`. Zero impacto no fluxo — se um dia precisar
adicionar algo no futuro (ex: evento `grant_revoked_by_pro`), é migration nova.

### 5.2. Validação final foi de lógica (SQL walkthrough) + tipo, não HTTP E2E (igual Blocos A e B)

Mesmo padrão que fechou os Blocos A e B: harness escrito, mas execução final depende do
`SUPABASE_SERVICE_ROLE_KEY` no ambiente local. Não é bloqueador pra marcar o sub-passo como
fechado — o walkthrough SQL valida a lógica dos 6 cenários **com queries idênticas às da
EF**, em produção, com os dados reais conferidos. O que resta é a camada HTTP (fetch + JWT +
JSON serialization) que é código bem-estabelecido.

### 5.3. `RACE` 409 não gera rollback de audit_log

Desvio consciente: se a corrida dispara (UPDATE rowcount=0), a EF faz DELETE do grant
pré-inserido e retorna 409 imediatamente, **sem** inserir nada em `access_audit_log`. Ou
seja: a tentativa derrotada não deixa rastro de auditoria. Alternativa seria inserir
`event_type='grant_race_lost'` ou similar pra auditoria completa — decidi não fazer porque
(a) `access_audit_log.event_type` CHECK não tem esse valor (e preferi não expandir) e (b)
a métrica de "quantas corridas deu" é melhor coletada via logs do Deno do que via tabela
relacional. Revisitar se observabilidade for prioridade em 2.5+.

---

## 6. Memórias a atualizar

Salvas já nesta sessão (uma nova):

- **`project_enum_divergence_professional_type_vs_role.md`** — `professionals.professional_type`
  e `access_invites.role` são enums CHECK-constrained independentes com alfabetos divergentes
  (`veterinarian` vs `vet`). Fixtures que usam `'vet'` pra `professional_type` estouram CHECK.
  Qualquer EF futuro que mapeie role↔professional_type precisa map explícito.

Candidatas adicionais (a revisar com o usuário antes de salvar):

- **`project_invite_accept_grant_first_ordering.md`** — Ordem obrigatória: INSERT
  `access_grants` PRIMEIRO (pra obter `grant_id`), só depois UPDATE `access_invites` com
  `created_grant_id`. Motivo: CHECK `access_invites_accepted_consistency` exige
  `created_grant_id ≠ NULL` quando `status='accepted'`. Invert = CHECK violation. Qualquer
  refator dessa EF precisa preservar a ordem.
- **`project_invite_accept_race_mitigation.md`** — Mitigação de corrida: UPDATE condicional
  em `status='pending'` + rollback manual (DELETE do grant) se rowcount=0. Escolhido em vez
  de transação/RPC SECURITY DEFINER pela simplicidade. Limitação: crash entre INSERT e UPDATE
  deixa grant órfão (is_active=true sem invite.created_grant_id apontando). Se observabilidade
  virar prioridade, migrar pra RPC transacional.

---

## 7. Tasks deste sub-passo

| Task | Descrição | Status |
|---|---|---|
| #171 | 2.3.1 — Auditar estado pós-Bloco B (access_grants, audit event types, professionals) | completed |
| #172 | 2.3.2 — Desenhar migration (ou confirmar "no-op") pro Bloco C | completed (no-op) |
| #173 | 2.3.3 — Aplicar migration 20260424 + NOTIFY pgrst + regen types (se houver) | completed (no-op) |
| #174 | 2.3.4 — Edge Function `professional-invite-accept` (accept + decline) | completed |
| #175 | 2.3.5 — `scripts/e2e_block_c.ts`: 6 cenários (accept/decline/expired/used/duplicate/no-profile) | completed |
| #176 | 2.3.6 — Documentar em `fase2_23_invite_accept_report.md` (este arquivo) | completed |

Sub-passo 2.3 fechado. Próximo: 2.4 (cancelamento pelo tutor + expiração automática via
cron — `invite_cancelled` / `invite_expired` já estão no CHECK de audit event_type desde
2.2.4, então não precisará migration de expansão). Padrão de integração HTTP E2E segue
pendente de rodar local — enfileirar no próximo bloco dedicado de validação manual.
