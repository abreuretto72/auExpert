-- ═══════════════════════════════════════════════════════════════════════════
-- APLICADA em 2026-04-21 via mcp__supabase__apply_migration
-- Fix: search_path quebrado em has_pet_access + hardening em is_pet_owner/is_pet_member
-- Projeto: peqpkzituzpwukzusgcq
-- Depende de: 20260421_professional_module_fase1.sql (fase1 core já aplicada)
-- Validada por: teste E2E 1.8 (80/80 asserções da matriz has_pet_access) — PASS
-- ═══════════════════════════════════════════════════════════════════════════
-- Contexto do bug (descoberto no teste end-to-end 1.8):
--
--   A migration de 1.3 definiu has_pet_access com:
--       SET search_path TO 'public, pg_catalog'
--                           ^^^^^^^^^^^^^^^^^^^^
--                           string única entre aspas simples
--
--   O Postgres armazenou isso em pg_proc.proconfig como:
--       search_path="public, pg_catalog"
--                    ^^^^^^^^^^^^^^^^^^^^
--                    identificador único quoted (com a vírgula DENTRO do nome)
--
--   Resultado: quando has_pet_access é executada e passa do short-circuit
--   (i.e., quando auth.uid() existe E não é owner/member), o search_path
--   efetivo vira um único schema literalmente chamado "public, pg_catalog"
--   (que não existe). Aí is_pet_owner/is_pet_member não conseguem resolver
--   'pets' / 'pet_members' → ERROR 42P01 em produção.
--
--   Nenhuma outra função do projeto tem esse padrão quebrado (auditado via
--   pg_proc.proconfig em public/auth/storage/extensions).
--
-- O fix:
--   1. has_pet_access — recriar com SET search_path = public, pg_catalog
--      (lista de identificadores, sem aspas em volta de tudo).
--   2. is_pet_owner + is_pet_member — adicionar o MESMO SET search_path
--      como defense-in-depth. Hoje elas funcionam quando chamadas direto
--      (herdam search_path da sessão), mas não deveriam depender do caller.
--      Adicional: qualificar 'public.pets' e 'public.pet_members' no corpo.
--
-- Idempotência: CREATE OR REPLACE em tudo. Sem DROP. Sem efeito colateral
-- sobre policies, grants ou dependências (mesmas assinaturas, mesmos retornos).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────
-- 1/3  has_pet_access — corrigir search_path quebrado
-- ───────────────────────────────────────────────────────────────────────
-- Corpo IDÊNTICO ao atual — só o SET search_path muda (sem aspas na lista).
CREATE OR REPLACE FUNCTION public.has_pet_access(p_pet_id uuid, p_permission text)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_allowed BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_pet_owner(p_pet_id) THEN
    RETURN true;
  END IF;

  IF public.is_pet_member(p_pet_id) THEN
    RETURN true;
  END IF;

  SELECT COALESCE(rp.allowed, false)
    INTO v_allowed
    FROM public.professionals pr
    JOIN public.access_grants ag
      ON ag.professional_id = pr.id
     AND ag.pet_id          = p_pet_id
     AND ag.is_active       = true
     AND ag.accepted_at     IS NOT NULL
     AND ag.revoked_at      IS NULL
     AND (ag.expires_at IS NULL OR ag.expires_at > NOW())
    JOIN public.role_permissions rp
      ON rp.role       = ag.role
     AND rp.permission = p_permission
   WHERE pr.user_id   = v_user_id
     AND pr.is_active = true
   LIMIT 1;

  RETURN COALESCE(v_allowed, false);
END;
$function$;

COMMENT ON FUNCTION public.has_pet_access(uuid, text) IS
  'Autorização central do módulo profissional. Short-circuits para tutor (is_pet_owner) e assistente (is_pet_member); fallback checa professionals→access_grants→role_permissions. Corrigido em 2026-04-21: search_path quoted quebrado → lista de identificadores.';

-- ───────────────────────────────────────────────────────────────────────
-- 2/3  is_pet_owner — hardening (SET search_path + qualificação public.)
-- ───────────────────────────────────────────────────────────────────────
-- Antes: sem proconfig, sem schema qualification. Funcionava por sorte.
-- Depois: search_path travado + FROM public.pets explícito.
CREATE OR REPLACE FUNCTION public.is_pet_owner(p_pet_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.pets
    WHERE id = p_pet_id
      AND user_id = auth.uid()
      AND is_active = TRUE
  );
$function$;

-- ───────────────────────────────────────────────────────────────────────
-- 3/3  is_pet_member — mesmo hardening
-- ───────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_pet_member(p_pet_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.pet_members
    WHERE pet_id = p_pet_id
      AND user_id = auth.uid()
      AND is_active = TRUE
      AND accepted_at IS NOT NULL
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$function$;

-- PostgREST pode cachear definição antiga de functions — invalidar.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Verificação pós-aplicação (rodar manualmente, não fazem parte da migration):
--
--   -- 1. Confirmar proconfig corrigido nas 3 funções
--   SELECT p.proname, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public'
--     AND p.proname IN ('has_pet_access', 'is_pet_owner', 'is_pet_member');
--   -- esperado: todos com ["search_path=public, pg_catalog"]  (sem aspas na lista)
--
--   -- 2. Smoke test: has_pet_access executa sem 42P01 no caminho completo
--   SELECT set_config('request.jwt.claims',
--                     json_build_object('sub', gen_random_uuid()::text)::text,
--                     false);
--   SELECT public.has_pet_access(gen_random_uuid(), 'read_clinical');
--   -- esperado: false (pet/prof fake), sem erro 42P01
--
--   -- 3. Rodar o bloco completo de 1.8 (BEGIN…DO…ROLLBACK) e conferir
--   --    que a matriz retorna 30/30 passes.
-- ═══════════════════════════════════════════════════════════════════════════
