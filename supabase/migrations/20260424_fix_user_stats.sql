-- Migration: 20260424_fix_user_stats
--
-- Corrige 9 bugs de contagem na RPC public.get_user_stats(p_year, p_month).
-- Bugs descobertos via auditoria do schema vs body retornado por
-- pg_get_functiondef em 2026-04-24.
--
-- Resumo das correcoes (numeradas conforme bug list em STATS_IMPLEMENTATION.md):
--
--   #4  scanners            : filtro por `ocr_data IS NOT NULL` trocado por
--                             `input_type='ocr_scan' OR media_analyses contem
--                             item type='document'`. O app nao popula o campo
--                             top-level `diary_entries.ocr_data` ha varias
--                             refatoracoes; o OCR vive em `media_analyses` JSONB.
--
--   #8  people.tutors       : `role='tutor'` nao existe no schema (CHECK em
--                             pet_members.role aceita apenas
--                             'owner','co_parent','caregiver','viewer').
--                             Trocado por `role='owner'`.
--
--   #11 people.visitors     : `role='visitor'` nao existe no schema. Trocado
--                             por `role='viewer'`.
--
--   #9  people.co_parents   : COUNT(*) inflava pelo numero de pets onde a mesma
--   #10 people.caregivers     pessoa tem vinculo. Agora deduplica por
--   #11 people.visitors       COALESCE(user_id::text, lower(email)) ANTES de
--   #8  people.tutors         agregar — 1 pessoa = 1 contagem, independente de
--   #12 people.total          quantos pets ela acessa.
--
--   #13 professionals.by_type      : COUNT(*) em access_grants infla pela mesma
--   #14 professionals.total          razao (1 grant por par pet+profissional).
--                                    Trocado por COUNT(DISTINCT professional_id).
--
--   #15 professionals.pending_invites : Mesma inflacao em access_invites
--                                       (1 convite por pet+email). Trocado por
--                                       COUNT(DISTINCT lower(invite_email)).
--
-- Sem mudanca: images, videos, audios, cardapios, prontuarios, pets.*,
-- activity.logins_days_count (ja tinha DISTINCT date), activity.last_login_at.
--
-- Cliente nao precisa de mudanca — types e tela continuam iguais. Apenas
-- numeros corrigidos.

CREATE OR REPLACE FUNCTION public.get_user_stats(
  p_year  integer DEFAULT (EXTRACT(year  FROM now()))::integer,
  p_month integer DEFAULT (EXTRACT(month FROM now()))::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id      uuid := auth.uid();
  v_period_start timestamptz;
  v_period_end   timestamptz;
  v_user_pets    uuid[];
  v_month_label  text;
  v_result       jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF p_year < 2020 OR p_year > 2100 THEN
    RAISE EXCEPTION 'Invalid year: %', p_year;
  END IF;
  IF p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'Invalid month: %', p_month;
  END IF;

  v_period_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_period_end   := v_period_start + interval '1 month';

  v_month_label := CASE p_month
    WHEN  1 THEN 'Janeiro'   WHEN  2 THEN 'Fevereiro'
    WHEN  3 THEN 'Março'     WHEN  4 THEN 'Abril'
    WHEN  5 THEN 'Maio'      WHEN  6 THEN 'Junho'
    WHEN  7 THEN 'Julho'     WHEN  8 THEN 'Agosto'
    WHEN  9 THEN 'Setembro'  WHEN 10 THEN 'Outubro'
    WHEN 11 THEN 'Novembro'  WHEN 12 THEN 'Dezembro'
  END || ' ' || p_year::text;

  -- Pets que o usuario possui ou e membro aceito
  SELECT array_agg(DISTINCT pet_id) INTO v_user_pets
  FROM (
    SELECT id AS pet_id FROM public.pets
     WHERE user_id = v_user_id AND is_active = true
    UNION
    SELECT pet_id FROM public.pet_members
     WHERE user_id = v_user_id AND is_active = true AND accepted_at IS NOT NULL
  ) p;

  v_user_pets := COALESCE(v_user_pets, ARRAY[]::uuid[]);

  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'year',  p_year,
      'month', p_month,
      'label', v_month_label,
      'start', v_period_start,
      'end',   v_period_end
    ),
    'ai_usage', jsonb_build_object(
      'images', COALESCE((
        SELECT count(*) FROM public.photo_analyses
         WHERE user_id = v_user_id AND is_active = true
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      'videos', COALESCE((
        SELECT count(*) FROM public.diary_entries
         WHERE user_id = v_user_id AND video_url IS NOT NULL AND is_active = true
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      'audios', COALESCE((
        SELECT count(*) FROM public.diary_entries
         WHERE user_id = v_user_id AND audio_url IS NOT NULL AND is_active = true
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      -- FIX #4 (scanners): app NAO popula `diary_entries.ocr_data` (top-level).
      -- O OCR vai pra `media_analyses` JSONB com item type='document', e/ou a
      -- entry e marcada com `input_type='ocr_scan'`. Aceita os dois caminhos.
      'scanners', COALESCE((
        SELECT count(*) FROM public.diary_entries
         WHERE user_id = v_user_id AND is_active = true
           AND created_at >= v_period_start AND created_at < v_period_end
           AND (
             input_type = 'ocr_scan'
             OR EXISTS (
               SELECT 1
               FROM jsonb_array_elements(COALESCE(media_analyses, '[]'::jsonb)) AS m
               WHERE m->>'type' = 'document'
             )
           )
      ), 0),
      'cardapios', COALESCE((
        SELECT count(*) FROM public.nutrition_cardapio_history
         WHERE user_id = v_user_id AND is_active = true
           AND generated_at >= v_period_start AND generated_at < v_period_end
      ), 0),
      'prontuarios', COALESCE((
        SELECT count(*) FROM public.prontuario_cache
         WHERE user_id = v_user_id AND is_active = true
           AND generated_at >= v_period_start AND generated_at < v_period_end
      ), 0)
    ),
    'pets', (
      SELECT jsonb_build_object(
        'dogs',  COALESCE(SUM(CASE WHEN species = 'dog' THEN 1 ELSE 0 END), 0),
        'cats',  COALESCE(SUM(CASE WHEN species = 'cat' THEN 1 ELSE 0 END), 0),
        'total', COALESCE(COUNT(*), 0)
      )
      FROM public.pets
      WHERE user_id = v_user_id AND is_active = true AND is_memorial = false
    ),
    -- FIXES #8, #9, #10, #11, #12 (people)
    --
    -- Antes: SUM(CASE WHEN role='X') sobre pet_members. Por linha. Inflava
    -- pelo numero de pets que a mesma pessoa tem acesso.
    --
    -- Depois: dedupla pessoas via DISTINCT em (role, person_key) onde person_key
    -- usa user_id quando existe (membro com conta), senao lower(email)
    -- (membro convidado por email so). Soma sobre o conjunto deduplicado.
    --
    -- Tambem corrige roles inexistentes: schema usa 'owner'/'viewer', nao
    -- 'tutor'/'visitor'.
    'people', (
      WITH distinct_members AS (
        SELECT DISTINCT
          role,
          COALESCE(user_id::text, lower(email)) AS person_key
        FROM public.pet_members
        WHERE pet_id = ANY(v_user_pets)
          AND is_active = true
          AND accepted_at IS NOT NULL
          AND COALESCE(user_id::text, lower(email)) IS NOT NULL
      )
      SELECT jsonb_build_object(
        'tutors',     COALESCE(SUM(CASE WHEN role = 'owner'     THEN 1 ELSE 0 END), 0),
        'co_parents', COALESCE(SUM(CASE WHEN role = 'co_parent' THEN 1 ELSE 0 END), 0),
        'caregivers', COALESCE(SUM(CASE WHEN role = 'caregiver' THEN 1 ELSE 0 END), 0),
        'visitors',   COALESCE(SUM(CASE WHEN role = 'viewer'    THEN 1 ELSE 0 END), 0),
        'total',      COALESCE(COUNT(*), 0)
      )
      FROM distinct_members
    ),
    -- FIXES #13, #14, #15 (professionals)
    --
    -- access_grants tem 1 linha por (pet, profissional) — a mesma vet em 5 pets
    -- gera 5 grants. COUNT(DISTINCT professional_id) consolida em 1 vet.
    --
    -- access_invites idem (1 linha por pet+email). DISTINCT lower(invite_email).
    'professionals', jsonb_build_object(
      'by_type', COALESCE((
        SELECT jsonb_object_agg(professional_type, cnt)
        FROM (
          SELECT pr.professional_type,
                 COUNT(DISTINCT pr.id)::int AS cnt
            FROM public.access_grants ag
            JOIN public.professionals pr ON pr.id = ag.professional_id
           WHERE ag.granted_by = v_user_id
             AND ag.is_active = true
             AND ag.revoked_at IS NULL
           GROUP BY pr.professional_type
        ) t
      ), '{}'::jsonb),
      'total', COALESCE((
        SELECT COUNT(DISTINCT professional_id) FROM public.access_grants
         WHERE granted_by = v_user_id
           AND is_active = true
           AND revoked_at IS NULL
      ), 0),
      'pending_invites', COALESCE((
        SELECT COUNT(DISTINCT lower(invite_email)) FROM public.access_invites
         WHERE invited_by = v_user_id
           AND status = 'pending'
           AND expires_at > now()
      ), 0)
    ),
    'activity', jsonb_build_object(
      -- Ja estava correto: DISTINCT (created_at AT TZ)::date
      'logins_days_count', COALESCE((
        SELECT count(DISTINCT (created_at AT TIME ZONE 'America/Sao_Paulo')::date)
          FROM public.audit_log
         WHERE user_id = v_user_id
           AND action IN ('login', 'LOGIN', 'sign_in', 'session_start')
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      'last_login_at', (
        SELECT MAX(created_at) FROM public.audit_log
         WHERE user_id = v_user_id
           AND action IN ('login', 'LOGIN', 'sign_in', 'session_start')
      )
    )
  );

  RETURN v_result;
END;
$function$;

-- Hot reload do PostgREST pra que /rest/v1/rpc/get_user_stats use a nova versao
-- imediatamente (alguns ambientes mantem cache de 60s sem este sinal).
NOTIFY pgrst, 'reload schema';

COMMENT ON FUNCTION public.get_user_stats(integer, integer) IS
  'Estatisticas mensais do tutor autenticado. Versao 2 (2026-04-24): 9 bugs de contagem corrigidos. Ver migration 20260424_fix_user_stats.sql para detalhes.';
