# Fase 2 do módulo profissional — plano de implementação

> **Status:** RASCUNHO PARA REVISÃO. Nada aqui foi executado.
> Fase 1 (infra pura) foi aplicada em 2026-04-21 via migration
> `20260421_professional_module_fase1.sql` + fix `20260421_fix_has_pet_access_search_path.sql`
> e validada por teste E2E (80/80 asserções da matriz `has_pet_access`).
>
> Este documento propõe o escopo e os sub-passos da **Fase 2**. Depende de aprovação
> do tutor antes de qualquer passo começar a ser executado.

---

## 1. O que a Fase 1 entregou (baseline)

Infraestrutura pura, só banco:

- **Tabelas:** `professionals`, `access_grants`, `role_permissions`, `professional_signatures`, `access_audit_log`, `pet_members` (pré-existente, herdada).
- **Função de autorização central:** `public.has_pet_access(p_pet_id uuid, p_permission text) RETURNS boolean` — short-circuit para `is_pet_owner` e `is_pet_member`, fallback por `professionals → access_grants → role_permissions`.
- **RLS ativo** em todas as 5 tabelas novas, com policies básicas.
- **Seed do `role_permissions`** (matriz role × permission).

O que **NÃO** foi tocado na Fase 1, e portanto precisa ser tratado na Fase 2 ou posterior:

- **Nenhuma policy RLS em tabelas clínicas existentes** (`vaccines`, `allergies`, `consultations`, `medications`, `exams`, `surgeries`, `clinical_metrics`, `diary_entries`) usa `has_pet_access` ainda — hoje o fallback RLS é o `user_id = auth.uid()` clássico. Profissionais com grant ativo **ainda não conseguem ler nada** via PostgREST, mesmo com a função funcionando em SQL puro.
- **Nenhuma Edge Function** foi criada para convite/aceite.
- **Nenhuma tela** do lado do tutor (convidar profissional, listar grants, revogar) nem do lado do profissional (onboarding, lista de pacientes, visualizar pet).
- **Nenhum fluxo i18n** para as strings do módulo.
- **`pet_members.user_id` FK inconsistente** — aponta pra `auth.users` em vez de `public.users` (documentado em memória como dívida técnica).

---

## 1.1. Pontos de entrada na UI (decidido 2026-04-21)

Para o tutor não ter que aprender nenhuma navegação nova, o módulo profissional reusa pontos de entrada que **já existem** no app:

- **Tutor-side — Hub de Parceiros:** ícone `Handshake` (Lucide) já presente no `components/TutorCard.tsx`, no card do tutor do Hub principal. Hoje navega pra `app/(app)/partnerships.tsx` (placeholder "coming soon"). Na Fase 2, essa tela passa a ser o Hub de Parceiros (ver 2.7) — lista grants ativos + invites pendentes, botão "Convidar profissional", tap no grant abre detalhe com revogar + log de acessos.
- **Tutor-side — dentro do pet:** tela `app/(app)/pet/[id]/professionals.tsx` (a criar) oferece a mesma visão filtrada pelo pet atual. Acessada via menu do pet ou atalho do Hub de Parceiros.
- **Profissional-side — rota nova:** `/pro/*` (a criar). Usuário comum (tutor) nunca vê essas rotas a não ser que tenha perfil em `public.professionals`. Ponto de entrada: link do convite (`/invite/{token}` → onboarding → `/pro`) ou, pra quem já é profissional, um segundo ícone que vai aparecer no mesmo `TutorCard` condicionalmente (por exemplo, o ícone de Parceiros ganha badge ou um segundo ícone `Stethoscope` aparece ao lado — decisão de UX a fechar em 2.5).

**Não-objetivos:** não criar tela/tab/drawer novo no Hub só pro módulo profissional. Toda entrada é contextual.

---

## 2. Objetivo da Fase 2 (escopo proposto)

Transformar a infra da Fase 1 em um **fluxo profissional end-to-end utilizável**, com:

1. Tutor consegue convidar um profissional para um pet (email + role + validade).
2. Profissional consegue aceitar o convite, se cadastrar como `professional` e passar a ver o pet.
3. Profissional consegue **ler clínica** via PostgREST (não apenas via SQL puro) — ou seja, policies RLS das tabelas clínicas passam a consultar `has_pet_access`.
4. Tutor consegue **revogar** um grant a qualquer momento, com efeito imediato na visibilidade do profissional.
5. Todo acesso gera trilha em `access_audit_log`.
6. Todas as strings visíveis estão em i18n (pt-BR / en-US / es-MX / es-AR / pt-PT).

**Fora do escopo da Fase 2** (vai pra Fase 3+):

- **Escrita clínica** pelo profissional (criar consultation, prescrever medication, registrar exam). A Fase 2 é **leitura-only** pro profissional, exceto `write_notes` se cabível.
- Selo Verificado / integração com CRMV real (hoje `verified_at` fica null — cadastro é declarativo).
- Transferência de tutela (`tutor_owner → tutor_owner`), co-parentalidade formal.
- Onboarding rich do profissional (upload de diploma, carteira do conselho, etc.).
- Notificações push para profissionais (só email na Fase 2).

---

## 3. Sub-passos propostos

### 2.1 — RPC wrapper `get_pet_clinical_bundle` + policies clínicas intocadas

**Descrição.** Decisão de 2026-04-21 (ver 2.8): leitura clínica do profissional passa **via RPC wrapper**, não via REST direto. Consequência: as policies RLS das tabelas clínicas **não mudam** na Fase 2 — ficam `user_id = auth.uid()` igual hoje. O profissional fica **bloqueado** de ler `/rest/v1/vaccines` etc. diretamente, e isso é desejável (garante trilha de audit obrigatória).

O sub-passo 2.1 original (expandir policies com `OR has_pet_access(...)`) fica **cancelado**. No lugar, este sub-passo cria o RPC wrapper que:

```sql
CREATE FUNCTION public.get_pet_clinical_bundle(p_pet_id UUID)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
DECLARE
  v_has_access BOOLEAN;
  v_bundle JSONB;
BEGIN
  -- 1. Autorização (reusa has_pet_access da Fase 1)
  v_has_access := public.has_pet_access(p_pet_id, 'read_clinical');
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- 2. Log ANTES de retornar dados (garantia de audit trail)
  INSERT INTO public.access_audit_log (
    pet_id, professional_id, actor_user_id, action, created_at
  ) VALUES (
    p_pet_id,
    (SELECT id FROM public.professionals WHERE user_id = auth.uid() LIMIT 1),
    auth.uid(),
    'clinical_bundle_read',
    NOW()
  );

  -- 3. Monta bundle
  SELECT jsonb_build_object(
    'vaccines',      (SELECT COALESCE(jsonb_agg(row_to_json(v)), '[]'::jsonb) FROM public.vaccines v WHERE v.pet_id = p_pet_id AND v.is_active = true),
    'allergies',     (SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb) FROM public.allergies a WHERE a.pet_id = p_pet_id AND a.is_active = true),
    'consultations', (SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM public.consultations c WHERE c.pet_id = p_pet_id AND c.is_active = true),
    'medications',   (SELECT COALESCE(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM public.medications m WHERE m.pet_id = p_pet_id AND m.is_active = true),
    'exams',         (SELECT COALESCE(jsonb_agg(row_to_json(e)), '[]'::jsonb) FROM public.exams e WHERE e.pet_id = p_pet_id AND e.is_active = true),
    'surgeries',     (SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb) FROM public.surgeries s WHERE s.pet_id = p_pet_id AND s.is_active = true),
    'clinical_metrics', (SELECT COALESCE(jsonb_agg(row_to_json(cm)), '[]'::jsonb) FROM public.clinical_metrics cm WHERE cm.pet_id = p_pet_id AND cm.is_active = true)
  ) INTO v_bundle;

  RETURN v_bundle;
END;
$$;
```

Observação: `diary_entries` é leitura clínica mas tem volume alto e conceito distinto — provável segunda RPC `get_pet_diary_bundle(p_pet_id, p_limit, p_offset)` com paginação, criada como sub-passo 2.1b se ficar claro na fase de execução.

**Critérios de aceitação:**

- `has_pet_access` continua com `SECURITY DEFINER` e `search_path` travado (não regredir o fix de 2026-04-21).
- RPC retorna `42501` se profissional não tem acesso (e **não escreve no audit log** nesse caso — só loga leituras bem-sucedidas).
- Cada chamada gera exatamente uma linha em `access_audit_log`.
- Teste E2E via PostgREST: JWT do profissional chama `/rest/v1/rpc/get_pet_clinical_bundle?p_pet_id=...` → retorna bundle se role tem `read_clinical=true`, retorna 403 caso contrário.
- Teste de regressão: tutor ainda consegue ler `/rest/v1/vaccines?pet_id=eq.{id}` via REST direto (policies `user_id = auth.uid()` intocadas).

**Tasks:**

1. Auditar policies atuais das tabelas clínicas e salvar snapshot (ninguém é alterado — só confirma que estão como esperado).
2. Migration `20260422_clinical_read_rpc.sql` com `get_pet_clinical_bundle` (e possivelmente `get_pet_diary_bundle`).
3. Colunas necessárias em `access_audit_log` (`actor_user_id`, `metadata`, etc.) — auditar o que existe e complementar se faltar.
4. Bloco de teste `BEGIN…DO…ROLLBACK` com seed (tutor + profissional + grant + role_permissions) + assert via `set_config('request.jwt.claims', ...)` + `SELECT get_pet_clinical_bundle(...)`.
5. Teste real via PostgREST (ver 2.10 — critério de done deste bloco).
6. Documentar resultado em `fase2_21_rpc_report.md`.

---

### 2.2 — Convite: schema + Edge Function `professional-invite-create`

**Descrição.** Tutor convida um profissional pelo email. O app:
1. Gera um `invite_token` único (64 chars url-safe).
2. Cria linha em `access_grants` com `accepted_at=NULL`, `revoked_at=NULL`, `is_active=true`, `expires_at` configurável (padrão 30 dias).
3. Envia email com link `https://auexpert.app/invite/{token}`.

**Decisão tomada (2026-04-21): `access_invites` separada, não estender `access_grants`.**

Motivo: grant = "profissional tem acesso agora"; invite = "tutor convidou, aguardando resposta". Misturar os dois força policies e `has_pet_access` a filtrar `accepted_at IS NOT NULL` em todos os paths e obriga revisitar a matriz RLS já validada na Fase 1. Preço de separar: uma migration extra + JOIN bobo na tela "Convites pendentes" do profissional. Trade-off fácil.

No aceite (2.4), a Edge Function:
1. Cria linha em `access_grants`.
2. Atualiza `access_invites.created_grant_id + status='accepted'`.
3. Invite fica preservado como trilha de auditoria.

**Schema proposto:**

```sql
CREATE TABLE public.access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES public.users(id),
  invite_email TEXT NOT NULL,                 -- pode não existir ainda como user
  role TEXT NOT NULL,                         -- FK lógica pra role_permissions.role
  token TEXT UNIQUE NOT NULL,                 -- 64 chars url-safe, ≥256 bits
  expires_at TIMESTAMPTZ NOT NULL,            -- default NOW() + 7 days
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.users(id),
  created_grant_id UUID REFERENCES public.access_grants(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX access_invites_token_idx ON public.access_invites(token) WHERE status = 'pending';
CREATE INDEX access_invites_pet_status_idx ON public.access_invites(pet_id, status);
CREATE INDEX access_invites_email_status_idx ON public.access_invites(invite_email, status);
```

RLS:
- `SELECT` pro tutor: `invited_by = auth.uid()`.
- `SELECT` pro convidado (se já logado): `invite_email = (SELECT email FROM public.users WHERE id = auth.uid())` **E** `status = 'pending'`.
- `INSERT` pro tutor: `invited_by = auth.uid()` + `EXISTS (SELECT 1 FROM pets WHERE id = pet_id AND user_id = auth.uid())`.
- `UPDATE` só via Edge Function (service-role) — nenhum cliente modifica direto.

**Critérios de aceitação:**

- Nenhuma mudança em tabelas da Fase 1.
- Edge Function assinada, com rate limit (tutor não pode gerar >20 invites/hora).
- Email em template i18n (usa `language` do tutor).
- Token tem entropia suficiente (≥256 bits) e expira em 7 dias por padrão (reenvia gera novo, invalida anterior).

**Tasks:**

1. Migration `20260423_access_invites.sql`.
2. Edge Function `supabase/functions/professional-invite-create/`.
3. Integração SendGrid / Resend / Supabase SMTP (reusa infra existente, se houver).
4. Teste E2E: tutor com JWT → chama função → linha criada → email enviado (mock).
5. Log em `access_audit_log` com `action='invite_created'`.

---

### 2.3 — Onboarding do profissional (criação de `professionals`)

**Descrição.** Antes de aceitar qualquer convite, o profissional precisa ter um perfil em `professionals`. Fluxo:

1. Profissional clica link do convite, faz login/cadastro normal no auExpert (reusa auth do tutor).
2. Primeira vez: tela de onboarding profissional pergunta `professional_type`, `country_code`, `council_name`/`council_number` (opcional — declarativo), `display_name`, `specialties`, `bio`, `languages`.
3. Cria linha em `professionals` (`user_id = auth.uid()`).
4. Só depois prossegue pro aceite.

**Critérios de aceitação:**

- Tela de onboarding em i18n completo.
- Validação: `professional_type` obrigatório; se `veterinarian`, `country_code` obrigatório (futuro: `council_number` obrigatório por país — hoje declarativo).
- Soft-guard: tutor e profissional podem ser o mesmo `user_id` (caso raro, tutor-vet), mas nunca pode criar grant onde `ag.granted_by = pr.user_id`.

**Tasks:**

1. Tela `app/(app)/pro/onboarding.tsx`.
2. Hook `useCreateProfessional()`.
3. Validação Zod dos campos.
4. i18n keys em `onboarding.pro.*`.
5. Teste: criar profissional, verificar `is_pet_owner`/`is_pet_member` continuam funcionando pra ele como tutor de pets próprios.

---

### 2.4 — Aceite do convite: Edge Function `professional-invite-accept`

**Descrição.** Profissional logado clica no link, tela mostra:
- Quem convidou (nome do tutor)
- Qual pet (nome, foto, espécie)
- Qual role (com descrição user-facing)
- Validade
- [Aceitar] [Recusar]

Ao aceitar:
1. Valida token (não expirado, status=pending).
2. Cria linha em `access_grants` com dados do invite + `accepted_at = NOW()`.
3. Marca invite como `accepted`.
4. Log em `access_audit_log` `action='grant_accepted'`.

**Critérios de aceitação:**

- Token consumível uma vez só.
- Se profissional recusar, invite vira `cancelled`, grant nunca é criado.
- Se profissional ainda não tem perfil em `professionals`, redireciona pro onboarding (2.3) antes do aceite.
- Conflict handling: se já existe grant ativo pro mesmo (pet, professional, role), convite falha com erro claro.

**Tasks:**

1. Edge Function `supabase/functions/professional-invite-accept/`.
2. Tela `app/(app)/invite/[token].tsx`.
3. i18n das descrições de role (user-friendly, não só `'read_clinical'`).
4. Teste E2E: invite → aceite → grant ativo → `has_pet_access` retorna `true`.

---

### 2.5 — Tela "Meus Pacientes" (profissional)

**Descrição.** Dashboard do profissional logado. Lista grants ativos agrupados por pet:

- Foto + nome do pet
- Nome do tutor
- Role (com badge colorida por tipo)
- `granted_at` / `expires_at`
- Tap → tela de visualização do pet (2.6)

**Critérios de aceitação:**

- Query: `professionals (user_id = auth.uid()) → access_grants (is_active, accepted_at NOT NULL, revoked_at IS NULL, expires_at IS NULL OR > NOW()) → pets`.
- Pull-to-refresh.
- Estado vazio em i18n ("Você ainda não tem pacientes").
- RLS: profissional só vê próprios grants (policy já existe na Fase 1 — validar).

**Tasks:**

1. Tela `app/(app)/pro/index.tsx`.
2. Hook `useMyPatients()`.
3. Componente `PatientCard`.
4. i18n em `pro.patients.*`.

---

### 2.6 — Visualização do pet pelo profissional (filtrada por role)

**Descrição.** Profissional abre um pet e vê **apenas o que sua role permite**. Três níveis visíveis na Fase 2:

- `view_basic` — foto, nome, espécie, raça, idade, tutor.
- `read_clinical` — tudo do view_basic + vacinas, alergias, consultations, medications, exams, surgeries, clinical_metrics, weight history.
- `read_diary` — tudo do read_clinical + diary_entries (narração + humor).

Escrita segue **desabilitada** na Fase 2 pro profissional (botões ocultos / disabled).

**Consequência da decisão híbrida de audit (ver 2.1 + 2.8):**

- Dados de `view_basic` → via REST normal (policies permitem porque pet básico é público dentro do grant).
- Dados de `read_clinical` → **obrigatoriamente** via RPC `get_pet_clinical_bundle(pet_id)`. Uma chamada única retorna o bundle todo; nenhum fetch individual em `/rest/v1/vaccines` etc. no app do profissional.
- Dados de `read_diary` → via RPC `get_pet_diary_bundle(pet_id, limit, offset)` (paginada).

Isso garante que toda leitura sensível gera log em `access_audit_log` e evita N+1 requests.

**Critérios de aceitação:**

- Módulos clínicos consomem bundle único do RPC (não N queries separadas).
- Loading states e empty states corretos.
- **Nenhum dado vaza** se role for downgraded no meio da sessão (RPC revalida `has_pet_access` em cada chamada — sem cache indevido).
- Toda renderização de dado clínico foi precedida por um INSERT no audit log.

**Tasks:**

1. Hook `useProClinicalBundle(petId)` — React Query chamando `rpc('get_pet_clinical_bundle', { p_pet_id })`.
2. Hook `useProDiaryBundle(petId, limit, offset)` — paginada.
3. Tela `app/(app)/pro/pet/[id].tsx` reusando componentes do tutor quando possível (refatorar componentes para aceitarem `data: PetClinicalBundle` em vez de puxarem via hook próprio — isso também ajuda o tutor a ter view offline).
4. Badge persistente no header: "Você está visualizando como profissional".
5. Teste E2E: grant com `read_clinical`=true mas `read_diary`=false → bundle clínico retorna, diary RPC retorna 403.

---

### 2.7 — Gestão de grants pelo tutor (Hub de Parceiros)

**Descrição.** **Ponto de entrada do módulo profissional (tutor-side):** ícone `Handshake` que já existe no `components/TutorCard.tsx` (no Hub principal, card do tutor) e hoje navega pra `app/(app)/partnerships.tsx` (placeholder "coming soon"). Esta tela passa a ser o Hub de Parceiros do tutor.

Estrutura proposta do Hub:

- **Aba "Meus parceiros":** lista global de grants ativos agrupada por pet (nome/foto do pet, profissional, especialidade, role, expira em).
- **Aba "Convites pendentes":** invites criados pelo tutor que ainda não foram aceitos/expirados.
- **Botão flutuante "Convidar":** leva pro fluxo 2.2 (modal ou tela de convite com seleção de pet + role + email).
- Tap num grant → detalhe com botão **Revogar** (`confirm()` do Toast) e **Ver log de acessos** (filtrado por pet + profissional).

A visão por-pet continua existindo dentro de cada tela de pet (`app/(app)/pet/[id]/professionals.tsx` — sub-passo preservado), mas o Hub geral é a porta de entrada principal.

**Critérios de aceitação:**

- Revogar = `UPDATE access_grants SET revoked_at = NOW(), is_active = false` (soft revoke — audit trail preservado).
- Invalidação do `has_pet_access` imediata (não depende de cache).
- Notificação push pro profissional informando revogação.

**Tasks:**

1. Reescrever `app/(app)/partnerships.tsx` (hoje placeholder) como o Hub de Parceiros com 2 abas.
2. Tela per-pet `app/(app)/pet/[id]/professionals.tsx` (idêntica ao Hub, porém pré-filtrada pelo pet).
3. Hook `useMyGrants()` (agrupa por pet) + `useMyInvites()` + `usePetProfessionals(petId)`.
4. Componente `ProfessionalRow` com badge de role.
5. `confirm()` antes de revogar.
6. RPC `revoke_grant(grant_id)` (SECURITY DEFINER, valida `granted_by = auth.uid()`, atualiza `revoked_at + is_active=false`, escreve no audit log).
7. i18n em `partnerships.*` e `pet.professionals.*`.

---

### 2.8 — Audit log: logging híbrido + tela do tutor

**Descrição.** Toda leitura/ação relevante do profissional gera linha em `access_audit_log`:

- `professional_id`, `pet_id`, `action`, `metadata` (JSONB opcional), `created_at`.
- Tutor vê log filtrado por pet.
- Profissional vê próprio log read-only (transparência mútua).

**Decisão tomada (2026-04-21): logging híbrido.**

1. **Cliente-side (RPC `log_access`)** — eventos de UI triviais e não-críticos:
   - `pet_viewed` (abriu tela do pet)
   - `patients_list_viewed` (abriu Meus Pacientes)
   - `tab_clinical_opened`, `tab_diary_opened`, etc.
   - Trade-off: baixo risco, custo zero, pode ter leak se cliente crashar antes do log — mas é log informativo, não prova legal.

2. **Server-side (RPC wrapper obrigatório)** — **leitura de dados clínicos sensíveis**:
   - RPC `get_pet_clinical_bundle(pet_id UUID)` SECURITY DEFINER que:
     (a) checa `has_pet_access(pet_id, 'read_clinical')`;
     (b) escreve em `access_audit_log` com `action='clinical_bundle_read'`;
     (c) retorna o bundle (vacinas + alergias + consultas + medicações + exames + cirurgias + métricas clínicas + diário clínico).
   - **Policy RLS das tabelas clínicas fica fechada pra profissional via REST direto** — só tutor (`user_id = auth.uid()`) consegue ler via `/rest/v1/vaccines` etc.
   - Isso força toda leitura clínica do profissional a passar pelo wrapper, garantindo log obrigatório.

Consequência: **o item 2.1 muda.** A proposta original era `USING (user_id = auth.uid() OR has_pet_access(...))`. Com a decisão híbrida, fica **só** `user_id = auth.uid()` — `has_pet_access` não entra na policy RLS das clínicas, entra **dentro do RPC wrapper**. Ver 2.1 atualizado.

**Critérios de aceitação:**

- RPC `log_access(p_pet_id UUID, p_action TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)` com auth check (`auth.uid()` é profissional com algum grant ativo no pet).
- RPC `get_pet_clinical_bundle(p_pet_id UUID)` escreve em audit log **antes** de retornar qualquer row.
- Retenção: 12 meses (job `pg_cron` semanal apaga `created_at < NOW() - INTERVAL '12 months'` em chunks).
- LGPD: tutor pode exportar log do próprio pet em PDF (skill `pdf`).
- Profissional nunca consegue `UPDATE`/`DELETE` no audit log (policy só `INSERT` via SECURITY DEFINER + `SELECT` read-only).

**Tasks:**

1. RPC `log_access` + RPC `get_pet_clinical_bundle` em migration `20260425_audit_rpcs.sql`.
2. Hook `useAuditLog(petId)` consumindo `access_audit_log` via REST (policy: tutor do pet OU profissional dono da linha).
3. Tela `app/(app)/pet/[id]/audit.tsx` — read-only pro tutor.
4. Tela `app/(app)/pro/audit.tsx` — read-only pro profissional (próprio log).
5. Export PDF via skill `pdf` (reusa padrão do app).
6. Cron job de limpeza (retenção 12m).

---

### 2.9 — i18n completo

**Descrição.** Toda string nova vai pros 5 locales: pt-BR, en-US, es-MX, es-AR, pt-PT. Zero hardcoded.

**Critérios de aceitação:**

- Zero `<Text>` / `toast()` / `confirm()` / `placeholder` com string literal.
- Chaves agrupadas em `pro.*`, `invite.*`, `pet.professionals.*`.
- Descrições de role traduzidas pra linguagem tutor (não técnica): `read_clinical` → "Pode ler o histórico clínico".
- Email template de convite no idioma do tutor.

**Tasks:**

1. Varrer código novo da Fase 2 com grep de strings literais.
2. Extrair pra `i18n/{locale}.json`.
3. Revisar tom (voz do pet? voz neutra? decidir — profissional é audiência diferente do tutor; provável voz neutra formal pro profissional).

---

### 2.10 — Infraestrutura de testes E2E via PostgREST (harness, não sub-passo final)

**Descrição.** Fase 1 foi validada com SQL puro (`has_pet_access` chamada direta). Fase 2 exige validação via **PostgREST real** — porque RLS e `SECURITY DEFINER` aplicam em contexto HTTP, não em contexto SQL com `set_config`.

Em vez de um sub-passo monolítico no final, o 2.10 vira o **harness** de testes reutilizado como critério de done de cada bloco (A, B, C, D — ver seção 5). O harness é construído **antes** do Bloco A começar, e cada bloco subsequente adiciona casos de teste próprios a ele.

**Conteúdo do harness** (implementado em 2026-04-21 — `scripts/e2e_pro_module.ts` + `scripts/e2e_pro_module.README.md`):

- Script `scripts/e2e_pro_module.ts` em **Node + TypeScript + `@supabase/supabase-js`** (rodado via `npx tsx`). Decisão: manter a convenção já estabelecida em `scripts/` (`check-i18n-keys.ts` usa tsx) em vez do Deno originalmente proposto, evitando fragmentação de tooling. Edge Functions continuam em Deno — o harness é infra de teste, não runtime de produção.
- Helpers exportados:
  - `createTutor(admin)`, `createPet(admin, tutorUserId, opts?)`, `createProfessional(admin, opts?)`.
  - `createGrant(admin, { petId, professionalId, grantedByUserId, role, ... })`, `revokeGrant(admin, grantId)`.
  - JWT real obtido via `auth.admin.createUser` → `signInWithPassword` (sem assinar manualmente — simpler + robusto a mudanças de `SUPABASE_JWT_SECRET`).
  - `asUser(accessToken, path, init?)` — fetch cru pra PostgREST, pra asserts de status HTTP específicos (403 vs 401 etc.).
  - `cleanup(admin)` — teardown idempotente; hard delete dos fixtures (exceção documentada à regra de soft delete — fixtures de teste nunca guardam dados reais).
- **Smoke test** dentro do próprio arquivo valida 9 passos: cria tutor+pet+pro, tutor lê via REST, não-dono é bloqueado pela RLS, `has_pet_access` retorna false→true após grant `vet_read`, fetch cru retorna 200. Roda com `npx tsx scripts/e2e_pro_module.ts` (requer `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`).
- Uso em CI (GitHub Actions): cada PR relevante dispara o harness contra uma branch Supabase.

**Critérios de aceitação:**

- Harness funcional antes do Bloco A começar.
- Cada bloco A/B/C/D adiciona seu conjunto de testes ao harness e só é marcado **done** quando todos passam.
- Tempo total de execução no CI < 60s.

---

## 4. Dívida técnica conhecida a resolver (ou registrar) durante Fase 2

- **`pet_members.user_id` FK aponta pra `auth.users`** (não `public.users`) — inconsistência pré-fase1. Decidir: unificar agora (migration segura porque IDs coincidem) ou deixar registrado.
- **`access_audit_log` não foi usado ainda** — Fase 1 só criou a tabela. Fase 2 é quem de fato começa a escrever nela.
- **`professional_signatures` não foi usado ainda** — Fase 1 criou a tabela pensando em assinatura digital de receita/laudo. Fase 2 não vai usar (só leitura). Documentar que fica inerte até Fase 3.

---

## 5. Ordem de execução (decidida 2026-04-21)

Sequencial A → B, com C e D em paralelo após B. Cada bloco tem **critério de done via harness PostgREST (2.10)** embutido — não é etapa separada no final.

**Bloco 0 — Harness (pré-requisito de tudo).**
  2.10 (infra de testes E2E pronta). Sem harness, blocos A-D não começam.

**Bloco A — Desbloqueio de leitura via RPC.**
  2.1 (RPC `get_pet_clinical_bundle` + decisão de NÃO expandir policies RLS clínicas).
  **Done quando:** harness comprova que JWT de profissional com role `read_clinical=true` recebe bundle via RPC, sem role recebe 403, tutor continua lendo REST direto normalmente, e cada chamada bem-sucedida escreve 1 linha em `access_audit_log`.

**Bloco B — Fluxo de convite.**
  2.2 (tabela `access_invites` + Edge Function create) → 2.3 (onboarding `professionals`) → 2.4 (Edge Function accept).
  **Done quando:** harness executa fluxo completo — tutor cria invite, profissional aceita, grant ativo, `has_pet_access` retorna `true`, audit log tem `invite_created` + `grant_accepted`.

**Bloco C — UI do profissional** (paralelizável com D após B).
  2.5 (Meus Pacientes) → 2.6 (visualização do pet via RPC) → 2.9 (i18n aplicado ao final).
  **Done quando:** smoke test manual no device cobre: abrir app com JWT de profissional → Meus Pacientes carrega → tap no pet → bundle clínico renderiza → badge "visualizando como profissional" presente.

**Bloco D — UI do tutor + audit** (paralelizável com C após B).
  2.7 (Hub de Parceiros rescrevendo `partnerships.tsx`) → 2.8 (audit log + RPCs de leitura do log) → 2.9 (i18n aplicado ao final).
  **Done quando:** smoke test manual cobre: tutor abre Hub via ícone Handshake → vê grants ativos e invites → cria invite → revoga grant → log de acessos rende­rizado + exportável em PDF.

**Notas operacionais:**

- Cada bloco termina com (a) migrations aplicadas + reverted-testable, (b) harness passando para os casos do bloco, (c) memory note salva se surgir dívida técnica ou decisão não-óbvia.
- Entre Bloco B e início de C/D em paralelo: ponto de gate pro tutor decidir se executa C e D concorrentemente ou ainda sequenciais (C antes de D faz sentido se quiser ter a visão do profissional validada antes de mexer no Hub do tutor).
- 2.9 (i18n) roda **dentro** de C e D — não é sub-passo separado. Critério: grep final procurando strings literais nas telas novas antes de fechar o bloco.

---

## 6. Critérios de conclusão da Fase 2

```
✓ Profissional consegue aceitar convite, se cadastrar e aparecer em "Meus Pacientes"
✓ Profissional consegue ler pet via PostgREST (todos os módulos permitidos pela role)
✓ Tutor consegue convidar + revogar
✓ Revogação tem efeito imediato
✓ Cada ação relevante gera linha em access_audit_log
✓ Tudo em i18n nos 5 locales
✓ Teste E2E via PostgREST passa no CI
✓ Zero regressão nos fluxos do tutor (diário, prontuário, gastos continuam funcionando)
✓ Todas as 8 policies RLS clínicas expandidas sem remover as existentes de tutor
```

---

## 7. O que a Fase 3 fica devendo (preview)

- Escrita clínica pelo profissional (`write_notes`, `full_clinical_write`).
- Assinatura digital de receita/laudo (`professional_signatures`).
- Selo Verificado (integração CRMV / conselhos internacionais).
- Co-parentalidade formal entre tutores.
- Notificações push pra profissional (não só email).
- Transferência de tutela.
