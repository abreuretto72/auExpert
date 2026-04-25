-- Migration: 20260425_ai_invocations_table
--
-- Cria a tabela `ai_invocations` que armazena 1 linha por chamada de Edge
-- Function de IA. Necessária pelas RPCs administrativas:
--   - get_admin_overview      (custo do mes, latencia, taxa sucesso, trend 6m)
--   - get_admin_users_list    (consumo IA por usuario)
--   - get_admin_ai_breakdown  (breakdown por funcao/modelo + erros)
--
-- Sem essa tabela, todas as paginas /, /ai-costs e /errors do admin-dashboard
-- mostram zeros. Esquema desenhado a partir das colunas que as 3 RPCs
-- consultam — ver docs/Estatisticas/migration_admin_dashboard.sql.
--
-- Populacao da tabela: cada Edge Function deve chamar
-- `recordAiInvocation()` (helper em supabase/functions/_shared/) ao final
-- da sua execucao, no caminho de sucesso E no de erro. Best-effort, nunca
-- bloqueia a resposta.

CREATE TABLE IF NOT EXISTS public.ai_invocations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quem chamou (nullable: chamadas sistemicas sem user logado)
  user_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  pet_id                UUID REFERENCES public.pets(id)  ON DELETE SET NULL,

  -- Qual EF foi chamada (analyze-pet-photo, classify-diary-entry, ...)
  function_name         TEXT NOT NULL,

  -- Modelo IA usado (claude-opus-4-7, gemini-2.5-flash, ...)
  model_used            TEXT,

  -- Performance
  tokens_in             INTEGER,
  tokens_out            INTEGER,
  latency_ms            INTEGER,
  cost_estimated_usd    NUMERIC(12,4),

  -- Status e tratamento de erro
  status                TEXT NOT NULL DEFAULT 'success'
                        CHECK (status IN ('success', 'error', 'timeout', 'rate_limited')),
  error_category        TEXT
                        CHECK (error_category IS NULL OR error_category IN (
                          'timeout', 'network', 'api_error', 'invalid_response',
                          'quota_exceeded', 'safety_filter', 'auth_error',
                          'validation_error', 'unknown'
                        )),
  error_message         TEXT,             -- mensagem tecnica (stack, body cru)
  user_message          TEXT,             -- mensagem amigavel mostrada ao tutor

  -- Metadados extras (request_id, payload shape, depth, etc.) — opcional
  payload               JSONB,

  -- Auditoria padrao do projeto
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───── Indices ─────────────────────────────────────────────────────────────

-- get_admin_overview: SUM(cost) WHERE created_at >= start AND < end
-- get_admin_users_list: SUM(cost) WHERE user_id = X AND created_at >= start
-- get_admin_ai_breakdown: GROUP BY function_name / model_used WHERE created_at IN range
CREATE INDEX IF NOT EXISTS ai_invocations_created_at_idx
  ON public.ai_invocations(created_at DESC);

CREATE INDEX IF NOT EXISTS ai_invocations_user_created_idx
  ON public.ai_invocations(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_invocations_function_created_idx
  ON public.ai_invocations(function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_invocations_model_created_idx
  ON public.ai_invocations(model_used, created_at DESC)
  WHERE model_used IS NOT NULL;

-- get_admin_ai_breakdown.recent_errors: WHERE status IN ('error','timeout') ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS ai_invocations_errors_idx
  ON public.ai_invocations(created_at DESC)
  WHERE status IN ('error', 'timeout');

-- get_admin_ai_breakdown.errors_by_category: WHERE status IN (...) GROUP BY error_category
CREATE INDEX IF NOT EXISTS ai_invocations_error_category_idx
  ON public.ai_invocations(error_category, created_at DESC)
  WHERE error_category IS NOT NULL;

-- ───── RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.ai_invocations ENABLE ROW LEVEL SECURITY;

-- SELECT: admin ve tudo, usuario ve apenas as proprias chamadas
DROP POLICY IF EXISTS ai_invocations_select_admin ON public.ai_invocations;
CREATE POLICY ai_invocations_select_admin ON public.ai_invocations
  FOR SELECT
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- INSERT: somente service_role (Edge Functions usam service_role key).
-- Cliente nao escreve nessa tabela — passa pela EF.
-- service_role bypassa RLS por default; nenhuma policy explicita necessaria.
-- (Comentario: nao criamos policy INSERT pra authenticated — protege contra
-- inflacao maliciosa de metricas.)

-- UPDATE/DELETE: ninguem. Soft-delete via is_active=false executado por
-- service_role apenas.

-- ───── Comentarios ─────────────────────────────────────────────────────────

COMMENT ON TABLE  public.ai_invocations IS
  'Log de cada chamada de Edge Function de IA. Populado pelo helper recordAiInvocation() chamado dentro das EFs. Consumido pelas RPCs admin (get_admin_overview, get_admin_users_list, get_admin_ai_breakdown).';

COMMENT ON COLUMN public.ai_invocations.function_name IS
  'Nome da Edge Function: analyze-pet-photo, ocr-document, generate-cardapio, generate-prontuario, classify-diary-entry, generate-diary-narration, generate-embedding, pet-assistant, generate-ai-insight, evaluate-nutrition, generate-personality.';

COMMENT ON COLUMN public.ai_invocations.cost_estimated_usd IS
  'Custo USD estimado da chamada. Calculado pela EF baseado em tokens_in*price_in + tokens_out*price_out, ou em preco fixo por chamada para Gemini (sem token billing exposed).';

COMMENT ON COLUMN public.ai_invocations.user_message IS
  'Mensagem amigavel mostrada ao tutor em caso de erro (ex: "Algo nao saiu como esperado"). Diferente de error_message (mensagem tecnica).';

NOTIFY pgrst, 'reload schema';
