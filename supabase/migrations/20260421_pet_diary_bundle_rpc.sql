-- 20260421_pet_diary_bundle_rpc.sql
--
-- Fase 2 · Bloco D · passo 2.5.4.1
-- RPC `public.get_pet_diary_bundle(p_pet_id uuid, p_limit int, p_offset int)`.
-- Leitura paginada do diário por profissional autenticado — espelha o padrão de
-- `get_pet_clinical_bundle` (Bloco A), mas pra permissão `read_diary`.
--
-- Por que uma RPC SECURITY DEFINER (e não PostgREST direto em `diary_entries`):
--   A policy `diary_entries_select` (e a policy-pai `pets_select`) só autoriza
--   `auth.uid() = user_id OR _auth_user_is_pet_member(id)`. Profissional NÃO é
--   pet_member — a relação dele é via `access_grants`. Sem uma função DEFINER,
--   qualquer SELECT direto retorna zero linhas silenciosamente.
--
-- Contrato:
--   1. Exige `auth.uid()` (senão RAISE 42501).
--   2. Short-circuit pra tutor/co-parent (is_pet_owner / is_pet_member) — SEM
--      audit. Eles já têm contexto natural e poluíriam o log.
--   3. Caso contrário, valida `has_pet_access(p_pet_id, 'read_diary')`. Se false
--      → RAISE 42501. Se true → lookup do (professional_id, grant_id) ativo que
--      deu origem ao acesso (precisa de `read_diary=true` em role_permissions).
--   4. Lê `diary_entries` com paginação (limit 1..200, offset 0+). Inclui todos
--      os campos ricos (áudio/vídeo/foto/OCR/análises IA) — a tela profissional
--      (2.5.4) reusará os mesmos componentes de card do tutor.
--   5. Calcula `total` separadamente (COUNT) pra paginação correta na UI.
--   6. Se for profissional, INSERT em `access_audit_log` com event_type
--      'diary_read' (o único valor do CHECK compatível — `diary_bundle_read`
--      mencionado no enunciado quebraria o constraint; `diary_read` é
--      semanticamente idêntico e já aceito).
--   7. Retorna jsonb: { pet_id, generated_at, total, limit, offset, entries }.
--
-- Hardening:
--   REVOKE EXECUTE FROM anon (Supabase dá grant nominal por default no schema
--   public; sem revoke explícito, um anon poderia *chamar* a RPC e cair no
--   auth.uid() IS NULL → 42501, mas melhor bloquear antes).
--
-- NOTIFY pgrst no final pra PostgREST registrar a nova função RPC.

CREATE OR REPLACE FUNCTION public.get_pet_diary_bundle(
  p_pet_id UUID,
  p_limit  INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_user_id         UUID := auth.uid();
  v_professional_id UUID;
  v_grant_id        UUID;
  v_is_owner        BOOLEAN;
  v_bundle          JSONB;
  v_total           INT;
  v_limit           INT := GREATEST(1, LEAST(COALESCE(p_limit, 50), 200));
  v_offset          INT := GREATEST(0, COALESCE(p_offset, 0));
BEGIN
  -- 1. Autenticação obrigatória ---------------------------------------------
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'forbidden: authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Short-circuit tutor/co-parent (sem audit) ----------------------------
  v_is_owner := public.is_pet_owner(p_pet_id) OR public.is_pet_member(p_pet_id);

  IF NOT v_is_owner THEN
    -- 3. Profissional → precisa do grant ativo com read_diary=true ---------
    IF NOT public.has_pet_access(p_pet_id, 'read_diary') THEN
      RAISE EXCEPTION 'forbidden: no read_diary access for pet %', p_pet_id
        USING ERRCODE = '42501',
              HINT    = 'professional needs active grant with read_diary=true';
    END IF;

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
       AND rp.permission = 'read_diary'
       AND rp.allowed    = true
     WHERE pr.user_id   = v_user_id
       AND pr.is_active = true
     ORDER BY ag.accepted_at DESC
     LIMIT 1;

    IF v_professional_id IS NULL THEN
      -- has_pet_access disse que sim mas o grant sumiu entre as duas queries
      -- (race condition com revoke/expire). Reforçar o 42501.
      RAISE EXCEPTION 'forbidden: grant disappeared for pet %', p_pet_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- 4. Total (antes de paginação) -------------------------------------------
  SELECT COUNT(*) INTO v_total
    FROM public.diary_entries
   WHERE pet_id = p_pet_id AND is_active = true;

  -- 5. Página -- ORDER BY entry_date, depois created_at (timeline estável) --
  WITH de AS (
    SELECT id, entry_date, primary_type, entry_type,
           content, narration,
           mood_id, mood_score, mood_confidence, mood_source,
           urgency, tags, photos,
           video_url, video_thumbnail, video_duration, video_analysis,
           audio_url, audio_duration, audio_type, pet_audio_analysis,
           document_url, document_type, ocr_data,
           photo_analysis_data, media_analyses, classifications,
           is_special, is_registration_entry, narration_outdated,
           input_method, input_type, processing_status,
           linked_vaccine_id, linked_exam_id, linked_medication_id,
           linked_consultation_id, linked_surgery_id, linked_allergy_id,
           linked_weight_metric_id, linked_expense_id, linked_nutrition_id,
           linked_travel_id, linked_plan_id, linked_achievement_id,
           linked_mood_log_id, linked_connection_id, linked_photo_analysis_id,
           created_at, updated_at
      FROM public.diary_entries
     WHERE pet_id = p_pet_id AND is_active = true
     ORDER BY COALESCE(entry_date::timestamp, created_at) DESC,
              created_at DESC
     LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
    'pet_id',       p_pet_id,
    'generated_at', NOW(),
    'total',        v_total,
    'limit',        v_limit,
    'offset',       v_offset,
    'entries',      COALESCE((SELECT jsonb_agg(to_jsonb(d.*)) FROM de d), '[]'::jsonb)
  ) INTO v_bundle;

  -- 6. Audit apenas pra profissional ----------------------------------------
  IF NOT v_is_owner THEN
    INSERT INTO public.access_audit_log (
      pet_id, actor_user_id, professional_id, access_grant_id,
      event_type, target_table, target_id, context, created_at
    ) VALUES (
      p_pet_id, v_user_id, v_professional_id, v_grant_id,
      'diary_read', 'diary_entries', NULL,
      jsonb_build_object(
        'rpc',      'get_pet_diary_bundle',
        'returned', jsonb_array_length(v_bundle->'entries'),
        'total',    v_total,
        'limit',    v_limit,
        'offset',   v_offset
      ),
      NOW()
    );
  END IF;

  RETURN v_bundle;
END;
$function$;

-- 7. Hardening: bloquear anon (Supabase concede EXECUTE nominal por default) -
REVOKE ALL     ON FUNCTION public.get_pet_diary_bundle(UUID, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_pet_diary_bundle(UUID, INT, INT) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_pet_diary_bundle(UUID, INT, INT) TO authenticated;

-- 8. PostgREST precisa recarregar pra ver a função como RPC -----------------
NOTIFY pgrst, 'reload schema';
