# e2e_pro_module — harness de testes E2E do módulo profissional

> Valida o módulo profissional (Fase 2 em diante) contra **PostgREST real**, não
> só SQL puro. A Fase 1 foi validada com `DO` blocks usando
> `set_config('request.jwt.claims', …)`. Isso não cobre o caminho que o app
> usa no dispositivo: RLS em contexto HTTP com JWT emitido pelo Supabase Auth.
> Este harness fecha essa lacuna.

## Quando usar

- **Critério de done de cada bloco da Fase 2 (A, B, C, D).** Cada bloco adiciona
  seus cenários à suíte e só é marcado fechado quando o harness passa.
- **Antes de qualquer migration** que mexa em RLS, `SECURITY DEFINER` ou rotas
  de Edge Function — rode pelo menos o smoke test para confirmar que o baseline
  ainda está íntegro.
- **Em CI** (GitHub Actions) contra uma branch do Supabase, quando esse pipeline
  for montado.

## O que ele faz hoje (smoke test)

Sem nenhum código da Fase 2 implementado ainda, o harness já prova:

1. Cria um tutor (auth + `public.users` via trigger `trg_on_auth_user_created`).
2. Cria um pet pro tutor.
3. Tutor lê o próprio pet via REST com JWT real — RLS permite.
4. Outro tutor qualquer é bloqueado pela RLS ao tentar ler o mesmo pet.
5. Cria um profissional (auth + `public.professionals`).
6. Sem grant, `has_pet_access(pet, 'read_clinical')` retorna `false` pro pro.
7. Depois de criar um `access_grant` role `vet_read`, a mesma RPC retorna `true`.
8. O helper `asUser` bate em `/rest/v1/pets` direto via fetch e recebe 200.
9. Limpa tudo no final (hard delete dos fixtures).

## Variáveis de ambiente (todas obrigatórias)

```
SUPABASE_URL                    # ex: https://peqpkzituzpwukzusgcq.supabase.co
SUPABASE_SERVICE_ROLE_KEY       # admin — bypassa RLS, usado só pro setup/teardown
SUPABASE_ANON_KEY               # mesma que EXPO_PUBLIC_SUPABASE_ANON_KEY
```

Fallbacks aceitos:
- `SUPABASE_URL` → `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

O **service role key** só fica no painel do Supabase Studio
(*Settings → API → `service_role` secret*). Nunca commitar e nunca expor
pro cliente. No `.env.local` do projeto fica fora do que o Expo expõe
(não prefixado com `EXPO_PUBLIC_`).

## Como rodar localmente

```bash
# 1) exporta as três variáveis (ou coloca num .env.test e faz source)
export SUPABASE_URL="https://peqpkzituzpwukzusgcq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."       # do Supabase Studio
export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"

# 2) roda o harness (tsx baixa on-demand na primeira vez)
npx tsx scripts/e2e_pro_module.ts
```

Saída esperada (tempo típico 5–10s):

```
[e2e] step 1: create tutor
       ok — userId=5a3f2c9b… email=e2e-tutor-f1e2d3c4@e2e.auexpert.test
[e2e] step 2: create pet owned by tutor (via service role)
       ok — petId=1b4e8a7d…
…
[e2e] step 9: cleanup
       ok — all fixtures removed
[e2e] OK (6.2s)
```

Se algum passo falhar, o harness chama `cleanup()` mesmo assim. Se o próprio
cleanup falhar, procura por `[e2e] manual cleanup` no console — vai listar os
`userIds` que sobraram; apaga eles à mão em Auth → Users no Studio.

## Primitivas exportadas (para blocos A/B/C/D)

O arquivo exporta funções puras pra serem compostas em suítes de teste
específicas de cada bloco (`scripts/e2e_block_a.ts`, etc., quando a hora
chegar). O ideal é **não** empilhar mais casos dentro do `smokeTest()` do
arquivo principal — cada bloco tem seu próprio arquivo que importa as
primitivas.

| Função | Retorna | Notas |
|---|---|---|
| `adminClient()` | `SupabaseClient` | Bypassa RLS — só pra setup/teardown. |
| `userClient(accessToken)` | `SupabaseClient` | Client com Bearer — respeita RLS. |
| `createTutor(admin)` | `TestUser` | Cria auth user + trigger cria `public.users`. |
| `createProfessional(admin, opts?)` | `TestProfessional` | Cria tudo acima + linha em `public.professionals`. |
| `createPet(admin, tutorUserId, opts?)` | `{ petId, name, species }` | Insere via service role (não depende da RLS do tutor). |
| `createGrant(admin, { petId, professionalId, grantedByUserId, role, expiresInDays?, accepted? })` | `string` (grantId) | `accepted` default `true`. |
| `revokeGrant(admin, grantId)` | `void` | Soft revoke — espelha comportamento de produção. |
| `asUser(accessToken, path, init?)` | `Response` | Fetch cru pra PostgREST. Use quando precisar de status HTTP preciso. |
| `cleanup(admin)` | `void` | Deleta tudo registrado. Idempotente. |
| `tracked()` | `Registry` | Snapshot read-only dos IDs criados. Debug. |

## Garantias e invariantes

- **Colisão impossível com dados reais.** Emails são `e2e-{role}-{uuid}@e2e.auexpert.test`.
  O domínio `.test` é IANA-reservado e nunca vai bater num tutor ou profissional real.
- **Hard delete é intencional.** O harness usa `DELETE` (não `is_active=false`)
  pros fixtures de teste. CLAUDE.md proíbe hard delete em código de produto,
  não em infra de teste — as linhas criadas aqui nunca guardam dados de tutor real.
- **Ordem de teardown.** `access_grants` → `professionals` → `pets` → `auth.users`
  (cascata apaga `public.users` e filhos via trigger + FKs).
- **Registry resetado a cada `cleanup()`.** Seguro chamar múltiplas vezes no mesmo processo.

## O que acontece por baixo dos panos em `createTutor`

1. `supabase.auth.admin.createUser({ email_confirm: true, user_metadata: { full_name, language } })`.
2. O trigger `trg_on_auth_user_created` (já existente em produção) insere
   automaticamente em `public.users` copiando `full_name` e `language` do
   `raw_user_meta_data`, e também empurra um `notifications_queue` "welcome".
3. O harness faz `signInWithPassword` com a mesma senha que criou pro user
   e guarda o `access_token` — esse é o JWT que o `tutor.client` usa em
   todo request pra PostgREST dali pra frente.

Se no futuro a Fase 2 for mudar esse trigger, o teste do passo 1 vai
pegar imediatamente (o `userClient` não conseguiria ler o próprio pet
porque a policy RLS usa `auth.uid()` e não a presença de `public.users`).

## Onde extender quando cada bloco chegar

### Bloco A — `get_pet_clinical_bundle` e audit log

Crie `scripts/e2e_block_a.ts` que importa as primitivas:

```ts
import { adminClient, createTutor, createProfessional, createPet, createGrant, cleanup, asUser } from './e2e_pro_module';

// Cenários obrigatórios:
// - Pro com grant read_clinical=true: RPC retorna bundle + 1 linha em access_audit_log
// - Pro sem grant: RPC retorna 403 + ZERO linhas em access_audit_log
// - Tutor sem precisar de grant: RPC retorna bundle (short-circuit is_pet_owner)
// - Regressão: tutor ainda lê /rest/v1/vaccines direto (policy user_id = auth.uid() intacta)
```

### Bloco B — invite + accept

```ts
// Cenários obrigatórios:
// - Tutor chama Edge Function professional-invite-create → linha em access_invites
// - Profissional (já cadastrado) chama accept → linha em access_grants + invite.status=accepted
// - Accept com token expirado/cancelado → 400
// - Accept com grant duplicado → erro claro
```

### Bloco C — UI profissional

Harness cobre API; a UI entra em smoke test manual no device.

### Bloco D — Hub de Parceiros + audit

Testa a RPC `revoke_grant` + leitura do `access_audit_log` pelo tutor.

## Limitações conhecidas

- **Não bate em Edge Function localmente.** O harness acredita na Edge Function
  (chama via `/rest/v1/rpc/...` ou `supabase.functions.invoke`) — não sobe um
  Deno local. Bloco B vai precisar das Edge Functions já deployadas.
- **Não é determinístico de verdade em concorrência.** Se dois harnesses
  rodarem no mesmo banco ao mesmo tempo e um explodir antes do cleanup, pode
  sobrar lixo. O uso de UUIDs nos emails evita conflito entre runs, mas o
  `access_audit_log` pode acumular. Bloco D vai adicionar um cron de limpeza.
- **Rate limit do Auth.** `auth.admin.createUser` tem rate limit — criar 50+
  users em paralelo em um teste vai começar a falhar. Se isso virar problema,
  serializar ou usar um pool de usuários pré-criados.

## Histórico de decisões ligadas ao harness

- **2026-04-21** — Criado como Bloco 0 do plano Fase 2. Plano pedia Deno (match
  com Edge Functions runtime), mas a convenção do `scripts/` já era Node + tsx
  (`check-i18n-keys.ts`, `test_classify.js`). Optou-se por manter a convenção
  pra não fragmentar tooling.
- **2026-04-21** — Smoke test inclui o caso "non-owner bloqueado pela RLS"
  como sentinela: se alguém acidentalmente relaxar a policy de `pets`, esse
  passo explode antes que o erro chegue em produção.
