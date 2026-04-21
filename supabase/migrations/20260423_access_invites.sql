-- ═══════════════════════════════════════════════════════════════════════════
-- DRAFT · Migration: access_invites (Fase 2 · Bloco B · sub-passo 2.2.2)
-- Projeto: peqpkzituzpwukzusgcq
-- Data alvo: 2026-04-23 (nome final: 20260423_access_invites.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- CONTEXTO
--   Fase 2 separa convite pendente (access_invites) do acesso ativo (access_grants).
--   O plano §2.2 decidiu NÃO estender access_grants: um grant só existe DEPOIS
--   que o profissional aceita o convite. As colunas legadas invite_token /
--   invite_sent_at em access_grants ficam inertes (fósseis pré-Fase 2).
--
-- ESCOPO DESTA MIGRATION
--   1. Tabela public.access_invites
--   2. Índices (1 parcial UNIQUE em token pending + 2 de busca)
--   3. RLS enabled + 2 policies SELECT (tutor/member + profissional)
--   4. Trigger updated_at reusando trg_fn_set_updated_at()
--   5. COMMENT pragmático em tabela + colunas sensíveis
--   6. NOTIFY pgrst, 'reload schema' ao fim
--
-- FORA DO ESCOPO (virá em subpassos posteriores)
--   • Edge Function professional-invite-create (2.2.4)
--   • professional-invite-accept / -decline / -cancel (Bloco C)
--   • Enfileiramento de email em notifications_queue (2.2.5, stub)
--   • Seed / backfill (não se aplica: tabela nova)
--
-- SEGURANÇA
--   • Todas as escritas vão via Edge Function com service_role (bypassa RLS).
--   • authenticated NÃO tem INSERT/UPDATE/DELETE policy — bloqueado por default.
--   • SELECT é o único caminho de leitura direta para o cliente.
--   • Token de 256 bits é gerado e persistido apenas pela Edge Function.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. TABELA
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE public.access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Alvo
  pet_id        UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,

  -- Autor
  invited_by    UUID NOT NULL REFERENCES public.users(id),

  -- Destinatário (ainda pode não existir como user)
  invite_email  TEXT NOT NULL CHECK (
    invite_email = lower(invite_email) AND
    invite_email ~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$'
  ),

  -- Papel que será aplicado no grant criado na aceitação
  role TEXT NOT NULL CHECK (role IN (
    'vet_full', 'vet_read', 'vet_tech', 'groomer', 'trainer',
    'walker', 'sitter', 'boarding', 'shop_employee', 'ong_member'
  )),

  -- Permissões herdadas pro grant
  can_see_finances BOOLEAN NOT NULL DEFAULT false,
  scope_notes      TEXT,

  -- Token de convite (256-bit URL-safe, gerado pela Edge Function)
  -- Formato esperado: base64url de 48 bytes = 64 chars [A-Za-z0-9_-]
  token TEXT NOT NULL UNIQUE CHECK (
    char_length(token) BETWEEN 43 AND 128 AND
    token ~ '^[A-Za-z0-9_-]+$'
  ),

  -- Prazo: Edge Function valida que é FUTURO na criação
  expires_at TIMESTAMPTZ NOT NULL,

  -- Ciclo de vida
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'accepted', 'declined', 'expired', 'cancelled'
  )),
  accepted_at       TIMESTAMPTZ,
  accepted_by       UUID REFERENCES public.users(id),
  created_grant_id  UUID REFERENCES public.access_grants(id),

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Coerência de estado ↔ timestamps
  CONSTRAINT access_invites_accepted_consistency CHECK (
    (status = 'accepted'  AND accepted_at IS NOT NULL AND accepted_by IS NOT NULL AND created_grant_id IS NOT NULL)
    OR
    (status <> 'accepted' AND (accepted_at IS NULL OR status = 'accepted'))
  )
);

COMMENT ON TABLE public.access_invites IS
  'Convite pendente enviado pelo tutor/co-parent para um profissional. Vira linha em access_grants apenas quando status="accepted". Separada de access_grants por decisão do plano §2.2 (grant = acesso ativo; invite = intenção pendente).';

COMMENT ON COLUMN public.access_invites.invite_email IS
  'Sempre armazenado em lowercase. Edge Function normaliza antes do INSERT. Usado pela policy do profissional com auth.jwt()->>''email''.';

COMMENT ON COLUMN public.access_invites.token IS
  '256-bit URL-safe. Gerado via crypto.getRandomValues(Uint8Array(48)) + base64url na Edge Function. Nunca logar em server logs; nunca retornar em listagens — apenas no retorno da criação.';

COMMENT ON COLUMN public.access_invites.status IS
  'pending (default) · accepted (virou grant) · declined · expired (varrer via CRON) · cancelled (tutor/owner cancelou antes de aceitar).';

COMMENT ON COLUMN public.access_invites.created_grant_id IS
  'Set apenas quando status=accepted. Referência fraca (ON DELETE SET NULL implícito ao omitir). Permite rastrear grant criado a partir deste convite.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ───────────────────────────────────────────────────────────────────────────

-- Busca do convite pela URL (deep-link) — cobre caminho crítico do fluxo
-- Partial garante que tokens de convites já consumidos não poluem o índice
CREATE UNIQUE INDEX access_invites_token_pending_idx
  ON public.access_invites(token)
  WHERE status = 'pending';

-- Listagem de convites por pet (tela do tutor)
CREATE INDEX access_invites_pet_status_idx
  ON public.access_invites(pet_id, status);

-- Listagem de convites pendentes para um email (caixa de entrada do profissional)
CREATE INDEX access_invites_email_status_idx
  ON public.access_invites(invite_email, status)
  WHERE status = 'pending';

-- ───────────────────────────────────────────────────────────────────────────
-- 3. RLS
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.access_invites ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT — tutor dono ou co-tutor ativo do pet vê todos os convites do pet
CREATE POLICY access_invites_tutor_select ON public.access_invites
  FOR SELECT
  TO authenticated
  USING (
    public.is_pet_owner(pet_id) OR public.is_pet_member(pet_id)
  );

-- 3.2 SELECT — profissional destinatário vê APENAS convites pendentes pro email dele
-- Usa auth.jwt()->>'email' (sempre presente no JWT do Supabase Auth)
CREATE POLICY access_invites_professional_select ON public.access_invites
  FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    AND invite_email = lower(auth.jwt()->>'email')
  );

-- NOTA: sem policies INSERT/UPDATE/DELETE para authenticated.
-- Todo o ciclo de vida (criar, aceitar, recusar, cancelar, expirar) vai via
-- Edge Function com service_role (bypassa RLS). Essa é a fronteira de segurança.

-- ───────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER updated_at
-- ───────────────────────────────────────────────────────────────────────────

CREATE TRIGGER access_invites_set_updated_at
  BEFORE UPDATE ON public.access_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. PostgREST schema reload
-- ───────────────────────────────────────────────────────────────────────────

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO PÓS-APPLY (rodar em scripts/e2e_block_b.ts — sub-passo 2.2.6)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- a) Tabela existe com RLS ativo:
--    SELECT relrowsecurity FROM pg_class
--    WHERE relname = 'access_invites' AND relnamespace = 'public'::regnamespace;
--    -- espera: t
--
-- b) Policies criadas:
--    SELECT polname FROM pg_policy
--    WHERE polrelid = 'public.access_invites'::regclass
--    ORDER BY polname;
--    -- espera: access_invites_professional_select, access_invites_tutor_select
--
-- c) Índices:
--    SELECT indexname FROM pg_indexes
--    WHERE schemaname='public' AND tablename='access_invites'
--    ORDER BY indexname;
--    -- espera: 4 linhas (pk + 3 custom)
--
-- d) Trigger:
--    SELECT tgname FROM pg_trigger
--    WHERE tgrelid = 'public.access_invites'::regclass AND NOT tgisinternal;
--    -- espera: access_invites_set_updated_at
-- ═══════════════════════════════════════════════════════════════════════════
