-- ═══════════════════════════════════════════════════════════════════════════
-- auExpert · Migration: admin dashboard
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Esta migration:
--   1. Adiciona o valor 'admin' aceito na coluna users.role
--   2. Promove o email aberu@multiversodigital.com.br a admin
--   3. Cria função helper is_admin()
--   4. Cria 3 RPCs para o dashboard:
--      - get_admin_overview()      → KPIs globais
--      - get_admin_users_list()    → lista de usuários paginada
--      - get_admin_ai_breakdown()  → breakdown por função/modelo
-- ═══════════════════════════════════════════════════════════════════════════

-- ───── 1. Promover usuário a admin ─────────────────────────────────────────
-- (O valor 'admin' em users.role é uma string livre — não há check constraint)

UPDATE public.users
   SET role = 'admin'
 WHERE email = 'aberu@multiversodigital.com.br';

-- ───── 2. Função helper is_admin() ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE id = auth.uid()
       AND role = 'admin'
       AND is_active = true
  );
$$;

REVOKE ALL    ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS
  'Retorna true se o usuário autenticado tem role admin.';


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC 1: get_admin_overview(period_year, period_month)
-- ═══════════════════════════════════════════════════════════════════════════
-- Retorna KPIs globais do sistema no mês solicitado.

CREATE OR REPLACE FUNCTION public.get_admin_overview(
  p_year  integer DEFAULT EXTRACT(year  FROM now())::integer,
  p_month integer DEFAULT EXTRACT(month FROM now())::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end   timestamptz;
  v_result       jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin role required'
      USING ERRCODE = '42501';
  END IF;

  v_period_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_period_end   := v_period_start + interval '1 month';

  v_result := jsonb_build_object(
    'period', jsonb_build_object(
      'year',  p_year,
      'month', p_month,
      'label', to_char(v_period_start, 'TMMonth YYYY'),
      'start', v_period_start,
      'end',   v_period_end
    ),

    -- Contadores globais (não dependem do período)
    'totals', jsonb_build_object(
      'users_total',  COALESCE((SELECT count(*) FROM public.users WHERE is_active = true), 0),
      'pets_total',   COALESCE((SELECT count(*) FROM public.pets  WHERE is_active = true AND is_memorial = false), 0),
      'pets_dogs',    COALESCE((SELECT count(*) FROM public.pets  WHERE is_active = true AND is_memorial = false AND species = 'dog'), 0),
      'pets_cats',    COALESCE((SELECT count(*) FROM public.pets  WHERE is_active = true AND is_memorial = false AND species = 'cat'), 0)
    ),

    -- Usuários ativos no período (logaram ao menos 1 vez)
    'active_users', jsonb_build_object(
      'this_month', COALESCE((
        SELECT count(DISTINCT user_id) FROM public.audit_log
         WHERE action IN ('login','LOGIN','sign_in','session_start')
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0)
    ),

    -- Uso de IA no período
    'ai_usage_this_month', jsonb_build_object(
      'images',     COALESCE((SELECT count(*) FROM public.photo_analyses
                               WHERE is_active = true
                                 AND created_at >= v_period_start AND created_at < v_period_end), 0),
      'videos',     COALESCE((SELECT count(*) FROM public.diary_entries
                               WHERE is_active = true AND video_url IS NOT NULL
                                 AND created_at >= v_period_start AND created_at < v_period_end), 0),
      'audios',     COALESCE((SELECT count(*) FROM public.diary_entries
                               WHERE is_active = true AND audio_url IS NOT NULL
                                 AND created_at >= v_period_start AND created_at < v_period_end), 0),
      'scanners',   COALESCE((SELECT count(*) FROM public.diary_entries
                               WHERE is_active = true AND ocr_data IS NOT NULL
                                 AND created_at >= v_period_start AND created_at < v_period_end), 0),
      'cardapios',  COALESCE((SELECT count(*) FROM public.nutrition_cardapio_history
                               WHERE is_active = true
                                 AND generated_at >= v_period_start AND generated_at < v_period_end), 0),
      'prontuarios',COALESCE((SELECT count(*) FROM public.prontuario_cache
                               WHERE is_active = true
                                 AND generated_at >= v_period_start AND generated_at < v_period_end), 0)
    ),

    -- Custo e performance (da tabela ai_invocations, se existir)
    'cost', jsonb_build_object(
      'this_month_usd', COALESCE((
        SELECT sum(cost_estimated_usd)::numeric(12,4) FROM public.ai_invocations
         WHERE created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      'invocations',    COALESCE((
        SELECT count(*) FROM public.ai_invocations
         WHERE created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      'by_model',       COALESCE((
        SELECT jsonb_object_agg(model_used, amount)
        FROM (
          SELECT model_used, sum(cost_estimated_usd)::numeric(12,4) AS amount
            FROM public.ai_invocations
           WHERE model_used IS NOT NULL
             AND cost_estimated_usd IS NOT NULL
             AND created_at >= v_period_start AND created_at < v_period_end
           GROUP BY model_used
        ) t
      ), '{}'::jsonb)
    ),

    'performance', jsonb_build_object(
      'avg_latency_ms', COALESCE((
        SELECT avg(latency_ms)::integer FROM public.ai_invocations
         WHERE latency_ms IS NOT NULL
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0),
      'success_rate', COALESCE((
        SELECT ROUND(
          (count(*) FILTER (WHERE status = 'success'))::numeric
          / NULLIF(count(*), 0)
        , 4)
        FROM public.ai_invocations
        WHERE created_at >= v_period_start AND created_at < v_period_end
      ), 1.0),
      'errors_total', COALESCE((
        SELECT count(*) FROM public.ai_invocations
         WHERE status IN ('error','timeout')
           AND created_at >= v_period_start AND created_at < v_period_end
      ), 0)
    ),

    -- Evolução dos últimos 6 meses (pra gráfico)
    'trend_6m', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          to_char(date_trunc('month', created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') AS month,
          count(*)::int AS invocations,
          COALESCE(sum(cost_estimated_usd), 0)::numeric(12,4) AS cost_usd
        FROM public.ai_invocations
        WHERE created_at >= (v_period_end - interval '6 months')
          AND created_at <  v_period_end
        GROUP BY month
        ORDER BY month
      ) t
    ), '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

REVOKE ALL    ON FUNCTION public.get_admin_overview(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_overview(int,int) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC 2: get_admin_users_list(search, page, per_page)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_admin_users_list(
  p_search   text    DEFAULT NULL,
  p_page     integer DEFAULT 1,
  p_per_page integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
  v_total  integer;
  v_items  jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  p_per_page := LEAST(GREATEST(p_per_page, 1), 100);
  p_page     := GREATEST(p_page, 1);
  v_offset   := (p_page - 1) * p_per_page;

  SELECT count(*) INTO v_total
    FROM public.users u
   WHERE u.is_active = true
     AND (p_search IS NULL
          OR u.email     ILIKE '%' || p_search || '%'
          OR u.full_name ILIKE '%' || p_search || '%');

  SELECT jsonb_agg(row_to_json(t)) INTO v_items
  FROM (
    SELECT
      u.id,
      u.email,
      u.full_name,
      u.role,
      u.city,
      u.state,
      u.created_at,
      u.language,
      (SELECT count(*)::int FROM public.pets WHERE user_id = u.id AND is_active = true) AS pets_count,
      (SELECT count(*)::int FROM public.ai_invocations
        WHERE user_id = u.id
          AND created_at >= date_trunc('month', now())) AS ai_invocations_this_month,
      (SELECT COALESCE(sum(cost_estimated_usd), 0)::numeric(12,4) FROM public.ai_invocations
        WHERE user_id = u.id
          AND cost_estimated_usd IS NOT NULL
          AND created_at >= date_trunc('month', now())) AS cost_this_month_usd,
      (SELECT max(created_at) FROM public.audit_log
        WHERE user_id = u.id
          AND action IN ('login','LOGIN','sign_in','session_start')) AS last_login_at
    FROM public.users u
    WHERE u.is_active = true
      AND (p_search IS NULL
           OR u.email     ILIKE '%' || p_search || '%'
           OR u.full_name ILIKE '%' || p_search || '%')
    ORDER BY u.created_at DESC
    LIMIT p_per_page OFFSET v_offset
  ) t;

  RETURN jsonb_build_object(
    'items',    COALESCE(v_items, '[]'::jsonb),
    'total',    v_total,
    'page',     p_page,
    'per_page', p_per_page,
    'pages',    CEIL(v_total::numeric / p_per_page)
  );
END;
$$;

REVOKE ALL    ON FUNCTION public.get_admin_users_list(text,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users_list(text,int,int) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- RPC 3: get_admin_ai_breakdown(year, month)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_admin_ai_breakdown(
  p_year  integer DEFAULT EXTRACT(year  FROM now())::integer,
  p_month integer DEFAULT EXTRACT(month FROM now())::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end   timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  v_period_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_period_end   := v_period_start + interval '1 month';

  RETURN jsonb_build_object(
    'by_function', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          function_name,
          count(*)::int                                         AS total,
          count(*) FILTER (WHERE status = 'success')::int        AS success,
          count(*) FILTER (WHERE status IN ('error','timeout'))::int AS errors,
          ROUND((count(*) FILTER (WHERE status = 'success'))::numeric
                / NULLIF(count(*), 0), 4)                        AS success_rate,
          COALESCE(sum(cost_estimated_usd), 0)::numeric(12,4)    AS cost_usd,
          COALESCE(avg(latency_ms)::integer, 0)                  AS avg_latency_ms
        FROM public.ai_invocations
        WHERE created_at >= v_period_start AND created_at < v_period_end
        GROUP BY function_name
        ORDER BY total DESC
      ) t
    ), '[]'::jsonb),

    'by_model', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          model_used,
          count(*)::int                                          AS total,
          COALESCE(sum(tokens_in), 0)::bigint                    AS tokens_in,
          COALESCE(sum(tokens_out), 0)::bigint                   AS tokens_out,
          COALESCE(sum(cost_estimated_usd), 0)::numeric(12,4)    AS cost_usd,
          COALESCE(avg(latency_ms)::integer, 0)                  AS avg_latency_ms
        FROM public.ai_invocations
        WHERE model_used IS NOT NULL
          AND created_at >= v_period_start AND created_at < v_period_end
        GROUP BY model_used
        ORDER BY cost_usd DESC
      ) t
    ), '[]'::jsonb),

    'errors_by_category', COALESCE((
      SELECT jsonb_object_agg(error_category, cnt)
      FROM (
        SELECT error_category, count(*)::int AS cnt
          FROM public.ai_invocations
         WHERE status IN ('error','timeout')
           AND error_category IS NOT NULL
           AND created_at >= v_period_start AND created_at < v_period_end
         GROUP BY error_category
      ) t
    ), '{}'::jsonb),

    'recent_errors', COALESCE((
      SELECT jsonb_agg(row_to_json(t))
      FROM (
        SELECT
          ai.id,
          ai.function_name,
          ai.error_category,
          ai.error_message,
          ai.user_message,
          ai.model_used,
          ai.latency_ms,
          ai.created_at,
          u.email AS user_email
        FROM public.ai_invocations ai
        LEFT JOIN public.users u ON u.id = ai.user_id
        WHERE ai.status IN ('error','timeout')
          AND ai.created_at >= v_period_start AND ai.created_at < v_period_end
        ORDER BY ai.created_at DESC
        LIMIT 50
      ) t
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL    ON FUNCTION public.get_admin_ai_breakdown(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_breakdown(int,int) TO authenticated;


-- Recarrega schema do PostgREST
NOTIFY pgrst, 'reload schema';
