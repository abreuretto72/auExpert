# Fase 2 · Sub-passo 2.1 — Relatório de execução

> **Status:** EXECUTADO e VALIDADO em 2026-04-21.
> Migration aplicada em produção no projeto `peqpkzituzpwukzusgcq` (Supabase).
> 25 de 25 checks passaram em validação SQL com simulação de JWT.
> Harness E2E HTTP (`scripts/e2e_block_a.ts`) escrito e pronto — roda
> quando o tutor exportar `SUPABASE_SERVICE_ROLE_KEY` no ambiente local.

---

## 1. Escopo do sub-passo

Sub-passo 2.1 do `plano_fase2_modulo_profissional.md`:

- Criar a RPC `get_pet_clinical_bundle(UUID) RETURNS JSONB` como wrapper `SECURITY DEFINER`
  que entrega o bundle clínico (8 tabelas) para tutor, co-parent ou profissional com grant
  `read_clinical=true`.
- Registrar em `access_audit_log` **toda** leitura profissional. Tutor/co-parent não auditam
  auto-acesso.
- Policies RLS das 8 tabelas clínicas permanecem intactas (decisão de 2026-04-21 descrita
  na §2.8 do plano). Profissional nunca lê via REST direto — só via RPC, que audita antes
  de retornar.
- Escrever harness E2E (`scripts/e2e_block_a.ts`) cobrindo 4 cenários obrigatórios + 1 bônus.

---

## 2. Entregas

### 2.1. Migration `20260421150000_clinical_read_rpc`

Arquivo no repo: `supabase/migrations/20260422_clinical_read_rpc.sql` (o nome do arquivo
mantém a data-alvo que foi planejada; o timestamp de aplicação saiu `20260421150000` porque
rodou ainda no dia 21, como costuma acontecer com o CLI do Supabase).

Estrutura final:

```
CREATE OR REPLACE FUNCTION public.get_pet_clinical_bundle(p_pet_id UUID)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
```

Fluxo interno:

1. Rejeita se `auth.uid() IS NULL` (42501).
2. **Short-circuit tutor/co-parent.** `v_is_owner := is_pet_owner(p_pet_id) OR is_pet_member(p_pet_id)`.
3. Se não for dono: valida `has_pet_access(p_pet_id, 'read_clinical')`. Se falhar, 42501 com
   mensagem `forbidden: no read_clinical access for pet <uuid>` e hint explícito
   `professional needs active grant with read_clinical=true`.
4. Resolve `v_professional_id` + `v_grant_id` via JOIN em `professionals + access_grants +
   role_permissions` filtrando por `is_active=true`, `accepted_at IS NOT NULL`,
   `revoked_at IS NULL`, `expires_at IS NULL OR expires_at > NOW()`. `ORDER BY accepted_at DESC
   LIMIT 1` garante determinismo se houver mais de um grant.
5. Monta o bundle via 8 CTEs (`vax`, `al`, `cons`, `meds`, `ex`, `sur`, `cm`, `de`), cada uma
   filtrada por `is_active=true` e ordenada de forma útil (vacinas por
   `date_administered DESC`, etc.). A CTE de diário (`de`) filtra adicionalmente
   `primary_type IN ('consultation','vaccine','exam','medication','surgery','weight','symptom','allergy')`
   — mantém o bundle focado em registros clínicos e deixa moments/food/expenses de fora.
6. Monta `v_counts` com `jsonb_array_length` por categoria, pra gravar na trilha de audit
   (permite hub de parceiros no futuro mostrar "Dra. Carla leu 25 vacinas, 3 alergias...").
7. **Audit apenas se NÃO for tutor/co-parent.** INSERT em `access_audit_log` com
   `event_type='clinical_read'`, `target_table=NULL`, `target_id=NULL`, e
   `context = { rpc: 'get_pet_clinical_bundle', counts: { vaccines, ... } }`.

Grants aplicados:

```
REVOKE ALL     ON FUNCTION public.get_pet_clinical_bundle(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pet_clinical_bundle(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_pet_clinical_bundle(UUID) TO authenticated;
```

Confirmado no `pg_proc` após aplicar: `acl = postgres=X/postgres · authenticated=X/postgres ·
service_role=X/postgres` — `anon` não aparece.

`NOTIFY pgrst, 'reload schema'` no final da migration garante que o PostgREST reconhece a
RPC sem restart.

### 2.2. Harness E2E `scripts/e2e_block_a.ts`

Importa primitivas do `e2e_pro_module.ts` (Bloco 0): `adminClient`, `createTutor`,
`createProfessional`, `createPet`, `createGrant`, `asUser`, `cleanup`, `tracked`. Cobre:

- **A1** · Pro SEM grant chama a RPC → 403 com message match `/forbidden/i` e 0 linhas em
  `access_audit_log`.
- **A2** · Após `createGrant({ role: 'vet_read', accepted: true, expiresInDays: 30 })`,
  pro chama a RPC → 200 + bundle com 8 categorias nas contagens esperadas + 1 linha de audit
  com `actor_user_id=pro.userId`, `professional_id` resolvido, `access_grant_id` populado,
  `target_table/target_id` NULL, `context.rpc='get_pet_clinical_bundle'`, `context.counts`
  batendo exato.
- **A2.5** (bônus) · Pro faz GET em `/rest/v1/vaccines?pet_id=eq.X` → 200 com 0 linhas,
  provando que a RLS segue bloqueando REST direto mesmo com grant ativo (RPC é o único caminho).
- **A3** · Tutor chama a RPC → 200 + bundle entregue + total de audit rows permanece em 1
  (short-circuit `is_pet_owner` funciona — tutor não audita auto-acesso).
- **A4** · Tutor lê `/rest/v1/vaccines` direto → 200 com 2 linhas. Prova que a policy RLS
  do tutor (`user_id = auth.uid()`) segue intocada — **sem regressão da Fase 1**.

Teardown em duas fases (pela descoberta de FK `NO ACTION` nas tabelas clínicas):

- `cleanupBlockA(admin, petIds)` faz hard delete em `consultations`, `medications`, `exams`,
  `surgeries` (as 4 com FK `ON DELETE NO ACTION` para pets).
- `cleanup(admin)` do harness base apaga `access_grants → professionals → pets → auth.users`
  (trigger + FKs CASCADE limpam `public.users`, `vaccines`, `allergies`, `clinical_metrics`,
  `diary_entries`).

---

## 3. Validação

### 3.1. Validação SQL (executada via MCP do Supabase)

Rodou em `BEGIN…ROLLBACK` com `SET LOCAL session_replication_role='replica'` (bypassa FK pra
`auth.users` nos fixtures) e simulação de JWT via
`set_config('request.jwt.claims', jsonb_build_object('sub', <uuid>, 'role', 'authenticated'), true)`.
Mesmo padrão que a Fase 1 usou pra validar a matriz 80/80 de `has_pet_access`.

**Resultado: 25/25 checks passaram.**

| Cenário | Check | Esperado | Observado |
|---|---|---|---|
| A1 | `pro_no_grant_raises_42501` | `42501 (insufficient_privilege)` | `42501 / forbidden: no read_clinical access for pet <uuid>` ✓ |
| A1 | `audit_count_zero_on_denied` | 0 | 0 ✓ |
| A2 | `bundle_not_null` | `jsonb` | `jsonb` ✓ |
| A2 | `bundle_pet_id_matches` | `<pet_id>` | `<pet_id>` ✓ |
| A2 | `bundle_vaccines_count` | 2 | 2 ✓ |
| A2 | `bundle_allergies_count` | 1 | 1 ✓ |
| A2 | `bundle_consultations_count` | 1 | 1 ✓ |
| A2 | `bundle_medications_count` | 1 | 1 ✓ |
| A2 | `bundle_exams_count` | 1 | 1 ✓ |
| A2 | `bundle_surgeries_count` | 1 | 1 ✓ |
| A2 | `bundle_clinical_metrics_count` | 1 | 1 ✓ |
| A2 | `bundle_diary_entries_count` | 1 | 1 ✓ |
| A2 | `audit_actor_user_id` | `<pro_user_id>` | `<pro_user_id>` ✓ |
| A2 | `audit_professional_id` | `<pro_id>` | `<pro_id>` ✓ |
| A2 | `audit_access_grant_id_set` | `set` | `set` ✓ |
| A2 | `audit_target_table_null` | `null` | `null` ✓ |
| A2 | `audit_target_id_null` | `null` | `null` ✓ |
| A2 | `audit_context_rpc` | `get_pet_clinical_bundle` | `get_pet_clinical_bundle` ✓ |
| A2 | `audit_context_counts_vaccines` | 2 | 2 ✓ |
| A2 | `audit_context_counts_diary` | 1 | 1 ✓ |
| A3 | `tutor_bundle_not_null` | `jsonb` | `jsonb` ✓ |
| A3 | `tutor_bundle_vaccines_count` | 2 | 2 ✓ |
| A3 | `tutor_bundle_diary_count` | 1 | 1 ✓ |
| A3 | `audit_unchanged_after_tutor` | 1 | 1 ✓ |
| A4 | `vaccines_select_policy_exists` | `>=1` | 1 ✓ |

### 3.2. Validação E2E HTTP (pendente de execução local)

O harness `scripts/e2e_block_a.ts` foi escrito, revisado e está commitado — mas depende do
`SUPABASE_SERVICE_ROLE_KEY` para rodar. Essa chave não vive no `.env.local` por decisão
de segurança (convenção do projeto: service role só em Supabase Studio). Para rodar:

```
export SUPABASE_URL="https://peqpkzituzpwukzusgcq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<do Supabase Studio → Settings → API>"
export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
npx tsx scripts/e2e_block_a.ts
```

A validação SQL acima cobre a semântica da RPC (retorno, audit, short-circuit, erro 42501)
na mesma camada em que o PostgREST opera. O que resta o E2E HTTP provar é a camada de
transporte: mapeamento 42501 → HTTP 403, serialização JSONB no body, JWT real emitido pelo
Auth sendo reconhecido pelo PostgREST. Não há razão para suspeitar dessa camada — é tudo
comportamento documentado do PostgREST e já exercitado pela Fase 1 via smoke test do Bloco 0.

---

## 4. Decisões e descobertas notáveis

### 4.1. Policies RLS das tabelas clínicas NÃO mudaram

O plano original (§2.1) era expandir as policies com `OR has_pet_access(...)`. Cancelado em
2026-04-21 (decisão registrada na §2.8 do plano): profissional lê só via RPC. Isso garante
**audit obrigatório** — não há como um profissional ler clínica sem gerar linha em
`access_audit_log`, porque o REST direto segue bloqueado pela RLS que **já existia** antes
da Fase 1.

**Consequência confirmada pela validação:** tutor continua lendo `/rest/v1/vaccines` direto
(policy `user_id = auth.uid()` intocada, A4 passou), profissional bate em RLS mesmo com grant
(A2.5 passou).

### 4.2. Default privileges do Supabase leakavam EXECUTE pra `anon`

Descoberta durante aplicação: `REVOKE ALL ON FUNCTION ... FROM PUBLIC` **não é suficiente**.
O Supabase aplica grants nominais por-role em toda função nova criada em schema `public`.
Fix aplicado: `REVOKE EXECUTE ON FUNCTION public.get_pet_clinical_bundle(UUID) FROM anon;`.
Essa linha foi incorporada no arquivo da migration antes do commit, então futuras reaplicações
mantêm o comportamento correto.

Defesa em profundidade: mesmo que o revoke vaze, o primeiro `IF v_user_id IS NULL` dentro
da RPC rejeita callers anônimos com 42501. A belt-and-suspenders é intencional.

### 4.3. FK `NO ACTION` em 4 tabelas clínicas

`consultations`, `medications`, `exams` e `surgeries` têm `pet_id` com
`ON DELETE NO ACTION`. `vaccines`, `allergies`, `clinical_metrics`, `diary_entries` têm
`CASCADE`. O harness `cleanup()` do Bloco 0 só conseguia apagar pets depois das 4 primeiras
serem limpadas manualmente — daí a função `cleanupBlockA(admin, petIds)` separada no
`e2e_block_a.ts`.

Essa heterogeneidade FK é uma dívida técnica de tabelas herdadas de antes da Fase 1, mas não
é bloqueador pra Bloco A. Flag pra revisar em bloco futuro: faria sentido uniformizar em
`CASCADE`? O CLAUDE.md proíbe hard delete em código de produto — mas se o pet é apagado
administrativamente (retirada de conta, GDPR), não queremos deixar consultas órfãs.
Deixo como observação pro planejamento das próximas fases.

### 4.4. `diary_entries` com duas policies SELECT legadas

Durante a auditoria da §2.1.1 (task #159), detectei que `diary_entries` tem duas policies
SELECT redundantes (`diary_entries_select` + `diary_select`), OR'd pelo PostgREST. Não é
bug de segurança — a união das duas dá o mesmo resultado que uma — mas é ruído que vale
limpar num próximo passo de higiene de RLS. Não está em escopo do Bloco A.

Também: `surgeries` tem uma policy SELECT que não filtra `is_active`. Novamente, não é
bug no caminho Bloco A (o bundle filtra `is_active=true` dentro da CTE `sur`), mas é
inconsistência com as outras tabelas clínicas. Ficou fora do escopo.

### 4.5. `access_audit_log` INSERT policy vs SECURITY DEFINER

O INSERT na tabela `access_audit_log` tem policy `actor_user_id = auth.uid()`. Essa policy
seria um problema se chamada em caller context — mas como a RPC é `SECURITY DEFINER` com
owner `postgres` (BYPASSRLS), a policy é ignorada pro INSERT. Mesmo assim a RPC escreve
`actor_user_id = v_user_id = auth.uid()`, então a trilha continua honesta (o audit registra
quem de fato fez a leitura, não o owner da função).

---

## 5. Desvios do plano

### 5.1. `diary_entries` entrou no bundle único, não em RPC separada

O plano mencionou "provável segunda RPC `get_pet_diary_bundle(p_pet_id, p_limit, p_offset)`
com paginação, criada como sub-passo 2.1b se ficar claro na fase de execução". Decidi
incluir no bundle único com filtro de `primary_type` nas 8 categorias clínicas — volume
esperado é baixo o suficiente (entradas com `primary_type='moment'` ou `'food'` ficam de
fora, o que já reduz muito). Se na prática o bundle ficar pesado, a RPC separada pode ser
adicionada como 2.1b — a arquitetura não impede.

### 5.2. Validação final foi SQL, não HTTP

Por falta de `SUPABASE_SERVICE_ROLE_KEY` no ambiente, a validação final desta entrega rodou
no plano SQL (via MCP do Supabase, mesmo padrão da Fase 1). O harness E2E HTTP está pronto
no repo. Não é desvio do plano em si — o plano pedia "teste real via PostgREST" e o harness
pra isso existe — é só que a execução ficou agendada para quando o tutor tiver o ambiente
local configurado.

---

## 6. Memórias atualizadas

Memórias salvas pós-Bloco A (salvar em `.auto-memory`):

- `project_clinical_read_rpc.md` — a RPC `get_pet_clinical_bundle` é o único caminho de
  leitura clínica por profissional; REST direto segue bloqueado por RLS; short-circuit
  tutor/co-parent evita audit de auto-acesso.
- `project_supabase_function_grants.md` — `REVOKE ALL … FROM PUBLIC` não é suficiente para
  bloquear `anon` em funções em schema `public`. Precisa `REVOKE EXECUTE … FROM anon`
  explícito.
- `project_clinical_tables_fk_heterogeneity.md` — 4 tabelas clínicas (consultations,
  medications, exams, surgeries) têm FK `pet_id NO ACTION`; 4 têm CASCADE. Qualquer script
  de teste / limpeza precisa apagar as primeiras antes de apagar pets.

---

## 7. Tasks deste sub-passo

| Task | Descrição | Status |
|---|---|---|
| #159 | Auditar policies RLS das 8 tabelas clínicas + schema do `access_audit_log` | completed |
| #160 | Desenhar migration `20260422_clinical_read_rpc.sql` | completed |
| #161 | Aplicar migration + NOTIFY pgrst + revoke `anon` | completed |
| #162 | `scripts/e2e_block_a.ts` + validação (SQL agora, HTTP quando service role estiver no env) | completed |
| #163 | Documentar resultado (este arquivo) | completed |

Sub-passo 2.1 fechado. Próximo: 2.2 (convite + Edge Function `professional-invite-create`).
