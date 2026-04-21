-- 20260422_clinical_read_rpc.sql
-- Bloco A / Fase 2 — módulo profissional.
-- Cria a RPC `get_pet_clinical_bundle(UUID)`: wrapper SECURITY DEFINER que
-- entrega o "bundle clínico" de um pet pra quem tem direito de ler
-- (tutor, co-parent ou profissional com grant `read_clinical=true`) e
-- registra o acesso em `access_audit_log` quando o caller é profissional.
--
-- Garantias desta migration:
--   1. RLS das 8 tabelas clínicas permanece INTACTA. Tutor continua lendo
--      vaccines/allergies/etc direto via REST — sem regressão.
--   2. Profissional NUNCA lê essas tabelas via REST (RLS bloqueia). Só via
--      esta RPC, que escreve em `access_audit_log` ANTES de retornar.
--   3. Tutor ou co-parent chamando a RPC short-circuita em `is_pet_owner`
--      / `is_pet_member` e NÃO geram linha de auditoria (audit é para
--      leitura de terceiro, não auto-acesso).
--   4. Sem grant read_clinical → RPC lança SQLSTATE 42501, que o PostgREST
--      traduz pra HTTP 403.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_pet_clinical_bundle(
  p_pet_id UUID
) RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id          UUID := auth.uid();
  v_professional_id  UUID;
  v_grant_id         UUID;
  v_is_owner         BOOLEAN;
  v_bundle           JSONB;
  v_counts           JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Tutor ou co-parent curto-circuitam: leitura legítima sem audit.
  v_is_owner := public.is_pet_owner(p_pet_id) OR public.is_pet_member(p_pet_id);

  IF NOT v_is_owner THEN
    -- Caller é profissional (ou externo sem acesso). Valida read_clinical.
    IF NOT public.has_pet_access(p_pet_id, 'read_clinical') THEN
      RAISE EXCEPTION 'forbidden: no read_clinical access for pet %', p_pet_id
        USING ERRCODE = '42501',
              HINT    = 'professional needs active grant with read_clinical=true';
    END IF;

    -- Resolve professional_id + grant vigente pra audit.
    SELECT pr.id, ag.id
      INTO v_professional_id, v_grant_id
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
       AND rp.permission = 'read_clinical'
       AND rp.allowed    = true
     WHERE pr.user_id   = v_user_id
       AND pr.is_active = true
     ORDER BY ag.accepted_at DESC
     LIMIT 1;

    -- Defensivo: has_pet_access já passou, mas protege race com revoke.
    IF v_professional_id IS NULL THEN
      RAISE EXCEPTION 'forbidden: grant disappeared for pet %', p_pet_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Monta bundle (SECURITY DEFINER ignora RLS).
  WITH
    vax AS (
      SELECT id, name, laboratory, batch_number,
             date_administered, next_due_date,
             dose_number, veterinarian, clinic,
             status, source, notes, created_at, updated_at
        FROM public.vaccines
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY date_administered DESC NULLS LAST, created_at DESC
    ),
    al AS (
      SELECT id, allergen, reaction, severity,
             diagnosed_date, diagnosed_by, confirmed,
             created_at, updated_at
        FROM public.allergies
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY diagnosed_date DESC NULLS LAST, created_at DESC
    ),
    cons AS (
      SELECT id, date, time, veterinarian, clinic, type,
             summary, diagnosis, prescriptions, notes,
             follow_up_at, cost, source, photo_url,
             temperature_celsius, heart_rate_bpm, respiratory_rate_rpm,
             capillary_refill_sec, mucous_color, hydration_status,
             created_at, updated_at
        FROM public.consultations
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY date DESC NULLS LAST, created_at DESC
    ),
    meds AS (
      SELECT id, name, type, frequency, start_date, end_date,
             is_continuous, dosage, active, reason, prescribed_by,
             veterinarian, source, notes, created_at, updated_at
        FROM public.medications
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY start_date DESC NULLS LAST, created_at DESC
    ),
    ex AS (
      SELECT id, name, date, status, results,
             laboratory, veterinarian, photo_url, source, notes,
             created_at, updated_at
        FROM public.exams
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY date DESC NULLS LAST, created_at DESC
    ),
    sur AS (
      SELECT id, name, date, veterinarian, clinic,
             anesthesia, status, source, notes, created_at, updated_at
        FROM public.surgeries
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY date DESC NULLS LAST, created_at DESC
    ),
    cm AS (
      SELECT id, metric_type, marker_name, value, secondary_value, unit,
             reference_min, reference_max, status, is_fever, is_abnormal,
             score, context, fasting, source, measured_at, notes,
             created_at, updated_at
        FROM public.clinical_metrics
       WHERE pet_id = p_pet_id AND is_active = true
       ORDER BY measured_at DESC NULLS LAST, created_at DESC
    ),
    de AS (
      SELECT id, entry_date, primary_type, entry_type,
             content, narration, mood_id, mood_score,
             urgency, tags, photos,
             linked_vaccine_id, linked_exam_id, linked_medication_id,
             linked_consultation_id, linked_surgery_id, linked_allergy_id,
             linked_weight_metric_id,
             created_at, updated_at
        FROM public.diary_entries
       WHERE pet_id = p_pet_id
         AND is_active = true
         AND primary_type IN (
              'consultation','vaccine','exam','medication',
              'surgery','weight','symptom','allergy'
             )
       ORDER BY entry_date DESC NULLS LAST, created_at DESC
    )
  SELECT jsonb_build_object(
    'pet_id',           p_pet_id,
    'generated_at',     NOW(),
    'vaccines',         COALESCE((SELECT jsonb_agg(to_jsonb(v.*)) FROM vax v), '[]'::jsonb),
    'allergies',        COALESCE((SELECT jsonb_agg(to_jsonb(a.*)) FROM al a), '[]'::jsonb),
    'consultations',    COALESCE((SELECT jsonb_agg(to_jsonb(c.*)) FROM cons c), '[]'::jsonb),
    'medications',      COALESCE((SELECT jsonb_agg(to_jsonb(m.*)) FROM meds m), '[]'::jsonb),
    'exams',            COALESCE((SELECT jsonb_agg(to_jsonb(e.*)) FROM ex e), '[]'::jsonb),
    'surgeries',        COALESCE((SELECT jsonb_agg(to_jsonb(s.*)) FROM sur s), '[]'::jsonb),
    'clinical_metrics', COALESCE((SELECT jsonb_agg(to_jsonb(x.*)) FROM cm x), '[]'::jsonb),
    'diary_entries',    COALESCE((SELECT jsonb_agg(to_jsonb(d.*)) FROM de d), '[]'::jsonb)
  ) INTO v_bundle;

  -- Counts resumidos pra o tutor ver no hub depois:
  -- "Dra. Carla leu 25 vacinas, 3 alergias, 7 consultas..."
  v_counts := jsonb_build_object(
    'vaccines',         jsonb_array_length(v_bundle->'vaccines'),
    'allergies',        jsonb_array_length(v_bundle->'allergies'),
    'consultations',    jsonb_array_length(v_bundle->'consultations'),
    'medications',      jsonb_array_length(v_bundle->'medications'),
    'exams',            jsonb_array_length(v_bundle->'exams'),
    'surgeries',        jsonb_array_length(v_bundle->'surgeries'),
    'clinical_metrics', jsonb_array_length(v_bundle->'clinical_metrics'),
    'diary_entries',    jsonb_array_length(v_bundle->'diary_entries')
  );

  -- Audit APENAS pra profissional. Tutor/co-parent não auditam auto-acesso.
  IF NOT v_is_owner THEN
    INSERT INTO public.access_audit_log (
      pet_id,
      actor_user_id,
      professional_id,
      access_grant_id,
      event_type,
      target_table,
      target_id,
      context,
      created_at
    ) VALUES (
      p_pet_id,
      v_user_id,
      v_professional_id,
      v_grant_id,
      'clinical_read',
      NULL,
      NULL,
      jsonb_build_object(
        'rpc',    'get_pet_clinical_bundle',
        'counts', v_counts
      ),
      NOW()
    );
  END IF;

  RETURN v_bundle;
END;
$$;

-- Trava execução: só authenticated (nunca anon). O REVOKE PUBLIC não remove
-- os grants nominais que o Supabase aplica por default no schema public, então
-- precisamos revogar anon explicitamente.
REVOKE ALL    ON FUNCTION public.get_pet_clinical_bundle(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pet_clinical_bundle(UUID) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_pet_clinical_bundle(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_pet_clinical_bundle(UUID) IS
  'Bloco A / Fase 2 (módulo profissional). Retorna bundle clínico do pet '
  'pra tutor, co-parent ou profissional com read_clinical. Escreve em '
  'access_audit_log quando o caller é profissional.';

-- Recarrega schema cache do PostgREST.
NOTIFY pgrst, 'reload schema';

COMMIT;
