-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: professional_module_fase1
-- Projeto: peqpkzituzpwukzusgcq
-- Data: 2026-04-21
-- ═══════════════════════════════════════════════════════════════════════════
-- Conteúdo:
--   1. Tabelas: professionals, access_grants, role_permissions,
--      professional_signatures, access_audit_log
--   2. Índices (incluindo partial unique em access_grants)
--   3. RLS enabled em todas as 5 tabelas
--   4. Função has_pet_access(pet_id, permission) — autorização central
--   5. Policies RLS das 5 tabelas novas
--   6. Triggers updated_at reusando trg_fn_set_updated_at() existente
-- Fora do escopo desta migration:
--   • Seed de role_permissions (vem em 20260421_role_permissions_seed)
--   • Policies em tabelas clínicas existentes (fase posterior)
--   • Edge Functions e UI
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. TABELAS
-- ───────────────────────────────────────────────────────────────────────────

-- 1.1 professionals
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  professional_type TEXT NOT NULL CHECK (professional_type IN (
    'veterinarian', 'vet_tech', 'groomer', 'trainer', 'walker',
    'sitter', 'boarding', 'shop_employee', 'ong_member', 'breeder'
  )),
  country_code CHAR(2) NOT NULL,
  council_name TEXT,
  council_number TEXT,
  fiscal_id_type TEXT,
  fiscal_id_value TEXT,
  display_name TEXT NOT NULL,
  bio TEXT,
  languages TEXT[] DEFAULT ARRAY['pt-BR'],
  specialties TEXT[],
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  verification_payload JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX professionals_user_id_idx ON public.professionals(user_id) WHERE is_active = true;
CREATE INDEX professionals_type_country_idx ON public.professionals(professional_type, country_code) WHERE is_active = true;
COMMENT ON TABLE public.professionals IS
  'Perfil profissional declarativo internacional. Sem validação externa no MVP; verified_at preenchido apenas quando o Selo Verificado (feature futura) confirmar via adapter do país.';

-- 1.2 access_grants
CREATE TABLE public.access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES public.users(id),
  role TEXT NOT NULL CHECK (role IN (
    'vet_full', 'vet_read', 'vet_tech', 'groomer', 'trainer',
    'walker', 'sitter', 'boarding', 'shop_employee', 'ong_member'
  )),
  invite_token TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_reason TEXT,
  scope_notes TEXT,
  can_see_finances BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX access_grants_unique_active_idx
  ON public.access_grants(pet_id, professional_id) WHERE is_active = true;
CREATE INDEX access_grants_pet_valid_idx
  ON public.access_grants(pet_id)
  WHERE is_active = true AND accepted_at IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX access_grants_professional_valid_idx
  ON public.access_grants(professional_id)
  WHERE is_active = true AND accepted_at IS NOT NULL AND revoked_at IS NULL;
CREATE INDEX access_grants_invite_token_idx
  ON public.access_grants(invite_token) WHERE invite_token IS NOT NULL;
COMMENT ON TABLE public.access_grants IS
  'Acesso concedido pelo tutor a um profissional sobre um pet. Role determina permissões via role_permissions. Mesmo shape de pet_members para UX consistente.';

-- 1.3 role_permissions
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  permission TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role, permission),
  CHECK (permission IN (
    'read_clinical', 'write_clinical', 'sign_clinical',
    'read_diary', 'write_diary', 'read_contact',
    'request_access', 'export_data'
  ))
);
CREATE INDEX role_permissions_role_idx ON public.role_permissions(role);
COMMENT ON TABLE public.role_permissions IS
  'Matriz papel × permissão consultada por has_pet_access(). Editável via UPDATE — zero deploy.';

-- 1.4 professional_signatures
CREATE TABLE public.professional_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES public.professionals(id),
  access_grant_id UUID NOT NULL REFERENCES public.access_grants(id),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  target_table TEXT NOT NULL CHECK (target_table IN (
    'vaccines', 'allergies', 'exams', 'consultations',
    'medications', 'surgeries', 'chronic_conditions',
    'parasite_control', 'clinical_metrics', 'body_condition_scores',
    'photo_analyses', 'diary_entries'
  )),
  target_id UUID NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_snapshot JSONB NOT NULL,
  signature_version TEXT NOT NULL DEFAULT 'sha256-v1',
  signed_display_name TEXT NOT NULL,
  signed_council_name TEXT,
  signed_council_number TEXT,
  signed_as_declared BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (target_table, target_id, payload_hash)
);
CREATE INDEX professional_signatures_target_idx ON public.professional_signatures(target_table, target_id);
CREATE INDEX professional_signatures_pet_idx ON public.professional_signatures(pet_id);
COMMENT ON TABLE public.professional_signatures IS
  'Selo SHA-256 de registros clínicos. MVP: hash + snapshot (declarativo). Futuro: PKI real com X.509.';

-- 1.5 access_audit_log
CREATE TABLE public.access_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id),
  professional_id UUID REFERENCES public.professionals(id),
  access_grant_id UUID REFERENCES public.access_grants(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'grant_created', 'grant_accepted', 'grant_rejected',
    'grant_revoked', 'grant_expired',
    'clinical_read', 'clinical_write', 'clinical_sign',
    'diary_read', 'diary_write', 'export_pdf'
  )),
  target_table TEXT,
  target_id UUID,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX access_audit_log_pet_idx ON public.access_audit_log(pet_id, created_at DESC);
CREATE INDEX access_audit_log_professional_idx
  ON public.access_audit_log(professional_id, created_at DESC) WHERE professional_id IS NOT NULL;
CREATE INDEX access_audit_log_event_idx ON public.access_audit_log(event_type, created_at DESC);
COMMENT ON TABLE public.access_audit_log IS
  'Auditoria estreita de eventos de acesso profissional (complementa audit_log). Responde rapidamente "quem acessou/mexeu no prontuário do Rex?".';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. RLS ENABLE
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.professionals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_audit_log        ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. FUNÇÃO has_pet_access()
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.has_pet_access(
  p_pet_id     UUID,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public, pg_catalog'
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

COMMENT ON FUNCTION public.has_pet_access(UUID, TEXT) IS
  'Autorização central para acesso a dados do pet. Owner e membros do círculo de cuidado curto-circuitam. Profissionais resolvem via access_grants ativo+aceito+não expirado JOIN role_permissions. Permissões válidas: read_clinical, write_clinical, sign_clinical, read_diary, write_diary, read_contact, request_access, export_data.';

GRANT EXECUTE ON FUNCTION public.has_pet_access(UUID, TEXT) TO authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. RLS POLICIES
-- ───────────────────────────────────────────────────────────────────────────

-- 4.1 professionals
CREATE POLICY "professionals_select_self_or_grantor"
  ON public.professionals FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.access_grants ag
        JOIN public.pets p ON p.id = ag.pet_id
       WHERE ag.professional_id = professionals.id
         AND ag.is_active = true
         AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "professionals_insert_self"
  ON public.professionals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "professionals_update_self"
  ON public.professionals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4.2 access_grants
CREATE POLICY "access_grants_select_stakeholders"
  ON public.access_grants FOR SELECT TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR public.is_pet_member(pet_id)
    OR EXISTS (
      SELECT 1 FROM public.professionals pr
       WHERE pr.id = access_grants.professional_id
         AND pr.user_id = auth.uid()
    )
  );

CREATE POLICY "access_grants_insert_owner_only"
  ON public.access_grants FOR INSERT TO authenticated
  WITH CHECK (
    public.is_pet_owner(pet_id)
    AND granted_by = auth.uid()
  );

CREATE POLICY "access_grants_update_owner_or_target"
  ON public.access_grants FOR UPDATE TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR EXISTS (
      SELECT 1 FROM public.professionals pr
       WHERE pr.id = access_grants.professional_id
         AND pr.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_pet_owner(pet_id)
    OR EXISTS (
      SELECT 1 FROM public.professionals pr
       WHERE pr.id = access_grants.professional_id
         AND pr.user_id = auth.uid()
    )
  );

-- 4.3 role_permissions (read-only para authenticated)
CREATE POLICY "role_permissions_select_all_authenticated"
  ON public.role_permissions FOR SELECT TO authenticated
  USING (true);

-- 4.4 professional_signatures (append-only)
CREATE POLICY "professional_signatures_select_with_pet_read"
  ON public.professional_signatures FOR SELECT TO authenticated
  USING (public.has_pet_access(pet_id, 'read_clinical'));

CREATE POLICY "professional_signatures_insert_by_professional"
  ON public.professional_signatures FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.professionals pr
       WHERE pr.id = professional_signatures.professional_id
         AND pr.user_id = auth.uid()
         AND pr.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.access_grants ag
       WHERE ag.id              = professional_signatures.access_grant_id
         AND ag.professional_id = professional_signatures.professional_id
         AND ag.pet_id          = professional_signatures.pet_id
         AND ag.is_active       = true
         AND ag.accepted_at     IS NOT NULL
         AND ag.revoked_at      IS NULL
         AND (ag.expires_at IS NULL OR ag.expires_at > NOW())
    )
    AND public.has_pet_access(pet_id, 'sign_clinical')
  );

-- 4.5 access_audit_log (append-only)
CREATE POLICY "access_audit_log_select_stakeholders"
  ON public.access_audit_log FOR SELECT TO authenticated
  USING (
    public.is_pet_owner(pet_id)
    OR public.is_pet_member(pet_id)
    OR (
      professional_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.professionals pr
         WHERE pr.id = access_audit_log.professional_id
           AND pr.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "access_audit_log_insert_self_as_actor"
  ON public.access_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ───────────────────────────────────────────────────────────────────────────
-- 5. TRIGGERS updated_at (reusa trg_fn_set_updated_at() existente)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TRIGGER trg_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();

CREATE TRIGGER trg_access_grants_updated_at
  BEFORE UPDATE ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();

CREATE TRIGGER trg_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_updated_at();

-- Signatures e access_audit_log são append-only → sem trigger updated_at

COMMIT;
