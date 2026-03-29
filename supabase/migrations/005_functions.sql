-- Migration 005: Functions
-- auExpert MVP

-- ══════════════════════════════════════
-- fn_search_rag: Busca semântica via pgvector
-- Retorna embeddings mais similares para um pet
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_search_rag(
  p_pet_id UUID,
  p_query_embedding VECTOR(1536),
  p_limit INTEGER DEFAULT 5,
  p_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content_type VARCHAR(20),
  content_id UUID,
  content_text TEXT,
  metadata JSONB,
  importance DECIMAL,
  similarity FLOAT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.content_type,
    pe.content_id,
    pe.content_text,
    pe.metadata,
    pe.importance,
    1 - (pe.embedding <=> p_query_embedding) AS similarity
  FROM pet_embeddings pe
  WHERE pe.pet_id = p_pet_id
    AND pe.is_active = true
    AND (p_content_type IS NULL OR pe.content_type = p_content_type)
  ORDER BY pe.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION fn_search_rag IS 'Busca semântica por cosine similarity no RAG do pet';

-- ══════════════════════════════════════
-- fn_calculate_health_score: Score de saúde 0-100
-- Fatores: vacinas em dia, alergias controladas, peso, exames
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_calculate_health_score(p_pet_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER := 70; -- base score
  v_total_vaccines INTEGER;
  v_overdue_vaccines INTEGER;
  v_severe_allergies INTEGER;
  v_has_weight BOOLEAN;
BEGIN
  -- Fator vacinas: -10 por vacina atrasada, max -30
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'overdue')
  INTO v_total_vaccines, v_overdue_vaccines
  FROM vaccines
  WHERE pet_id = p_pet_id AND is_active = true;

  IF v_total_vaccines > 0 THEN
    v_score := v_score + 15; -- bonus por ter vacinas registradas
    v_score := v_score - LEAST(v_overdue_vaccines * 10, 30);
  END IF;

  -- Fator alergias severas: -5 por alergia severa não confirmada
  SELECT COUNT(*)
  INTO v_severe_allergies
  FROM allergies
  WHERE pet_id = p_pet_id
    AND is_active = true
    AND severity = 'severe'
    AND confirmed = false;

  v_score := v_score - (v_severe_allergies * 5);

  -- Fator peso registrado: +5
  SELECT EXISTS(
    SELECT 1 FROM pets WHERE id = p_pet_id AND weight_kg IS NOT NULL
  ) INTO v_has_weight;

  IF v_has_weight THEN
    v_score := v_score + 5;
  END IF;

  -- Fator diário recente (ativo nos últimos 7 dias): +10
  IF EXISTS (
    SELECT 1 FROM diary_entries
    WHERE pet_id = p_pet_id AND is_active = true
      AND created_at > NOW() - INTERVAL '7 days'
  ) THEN
    v_score := v_score + 10;
  END IF;

  RETURN GREATEST(0, LEAST(100, v_score));
END;
$$;

COMMENT ON FUNCTION fn_calculate_health_score IS 'Calcula score de saúde 0-100 baseado em vacinas, alergias, peso e atividade';

-- ══════════════════════════════════════
-- fn_calculate_happiness: Score de felicidade 0-100
-- Baseado em mood_logs recentes com peso por recência
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_calculate_happiness(
  p_pet_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_avg_score DECIMAL;
BEGIN
  SELECT AVG(score)
  INTO v_avg_score
  FROM mood_logs
  WHERE pet_id = p_pet_id
    AND is_active = true
    AND created_at > NOW() - (p_days || ' days')::INTERVAL;

  IF v_avg_score IS NULL THEN
    RETURN 50; -- neutro se sem dados
  END IF;

  RETURN ROUND(v_avg_score)::INTEGER;
END;
$$;

COMMENT ON FUNCTION fn_calculate_happiness IS 'Calcula score de felicidade baseado em mood_logs recentes';

-- ══════════════════════════════════════
-- fn_get_pet_rag_context: Monta contexto RAG para chamada de IA
-- Retorna texto com dados mais relevantes do pet
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_get_pet_rag_context(
  p_pet_id UUID,
  p_query_embedding VECTOR(1536),
  p_max_tokens INTEGER DEFAULT 2000
)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_context TEXT := '';
  v_pet RECORD;
  v_entry RECORD;
  v_char_limit INTEGER;
BEGIN
  -- ~4 chars per token (estimativa)
  v_char_limit := p_max_tokens * 4;

  -- Dados básicos do pet
  SELECT name, species, breed, weight_kg,
         EXTRACT(YEAR FROM AGE(COALESCE(birth_date, NOW()))) AS age_years,
         current_mood, health_score
  INTO v_pet
  FROM pets WHERE id = p_pet_id;

  v_context := format(
    'Pet: %s, %s, %s, %s kg, ~%s anos, humor: %s, saúde: %s/100.' || chr(10),
    v_pet.name, v_pet.species,
    COALESCE(v_pet.breed, 'SRD'),
    COALESCE(v_pet.weight_kg::TEXT, '?'),
    COALESCE(v_pet.age_years::TEXT, '?'),
    COALESCE(v_pet.current_mood, '?'),
    COALESCE(v_pet.health_score::TEXT, '?')
  );

  -- Alergias
  FOR v_entry IN
    SELECT allergen, severity FROM allergies
    WHERE pet_id = p_pet_id AND is_active = true
  LOOP
    v_context := v_context || format('Alergia: %s (%s).' || chr(10), v_entry.allergen, v_entry.severity);
  END LOOP;

  -- Embeddings mais relevantes
  FOR v_entry IN
    SELECT content_text, content_type, importance
    FROM fn_search_rag(p_pet_id, p_query_embedding, 10)
    ORDER BY similarity DESC, importance DESC
  LOOP
    EXIT WHEN char_length(v_context) > v_char_limit;
    v_context := v_context || format('[%s] %s' || chr(10), v_entry.content_type, v_entry.content_text);
  END LOOP;

  RETURN LEFT(v_context, v_char_limit);
END;
$$;

COMMENT ON FUNCTION fn_get_pet_rag_context IS 'Monta contexto RAG completo para chamada de IA com limite de tokens';

-- ══════════════════════════════════════
-- fn_update_vaccine_statuses: Atualiza status das vacinas
-- Chamada por CRON diário
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_update_vaccine_statuses()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  -- Marca como overdue vacinas com next_due_date no passado
  WITH updated AS (
    UPDATE vaccines
    SET status = 'overdue'
    WHERE is_active = true
      AND status != 'overdue'
      AND next_due_date IS NOT NULL
      AND next_due_date < CURRENT_DATE
    RETURNING id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  -- Marca como upcoming vacinas com due date nos próximos 7 dias
  UPDATE vaccines
  SET status = 'upcoming'
  WHERE is_active = true
    AND status = 'up_to_date'
    AND next_due_date IS NOT NULL
    AND next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

  RETURN v_updated;
END;
$$;

COMMENT ON FUNCTION fn_update_vaccine_statuses IS 'Atualiza status de vacinas — chamada por CRON diário 08:00';

-- ══════════════════════════════════════
-- fn_create_vaccine_reminders: Cria notificações de vacinas
-- Chamada por CRON diário após fn_update_vaccine_statuses
-- ══════════════════════════════════════
CREATE OR REPLACE FUNCTION fn_create_vaccine_reminders()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_created INTEGER := 0;
  v_vaccine RECORD;
BEGIN
  -- Lembrete 7 dias antes
  FOR v_vaccine IN
    SELECT v.id, v.name, v.next_due_date, p.name AS pet_name, p.user_id
    FROM vaccines v
    JOIN pets p ON p.id = v.pet_id
    WHERE v.is_active = true
      AND v.next_due_date = CURRENT_DATE + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications_queue nq
        WHERE nq.data->>'vaccine_id' = v.id::TEXT
          AND nq.type = 'vaccine_reminder'
          AND nq.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    INSERT INTO notifications_queue (user_id, pet_id, type, title, body, data, scheduled_for)
    SELECT v_vaccine.user_id, (SELECT pet_id FROM vaccines WHERE id = v_vaccine.id),
      'vaccine_reminder',
      format('Vacina em 7 dias: %s', v_vaccine.name),
      format('%s precisa tomar %s em %s', v_vaccine.pet_name, v_vaccine.name,
             to_char(v_vaccine.next_due_date, 'DD/MM/YYYY')),
      jsonb_build_object('vaccine_id', v_vaccine.id),
      NOW();
    v_created := v_created + 1;
  END LOOP;

  -- Lembrete 1 dia antes
  FOR v_vaccine IN
    SELECT v.id, v.name, v.next_due_date, p.name AS pet_name, p.user_id
    FROM vaccines v
    JOIN pets p ON p.id = v.pet_id
    WHERE v.is_active = true
      AND v.next_due_date = CURRENT_DATE + INTERVAL '1 day'
      AND NOT EXISTS (
        SELECT 1 FROM notifications_queue nq
        WHERE nq.data->>'vaccine_id' = v.id::TEXT
          AND nq.type = 'vaccine_reminder'
          AND nq.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    INSERT INTO notifications_queue (user_id, pet_id, type, title, body, data, scheduled_for)
    SELECT v_vaccine.user_id, (SELECT pet_id FROM vaccines WHERE id = v_vaccine.id),
      'vaccine_reminder',
      format('AMANHÃ: Vacina %s', v_vaccine.name),
      format('%s precisa tomar %s amanhã!', v_vaccine.pet_name, v_vaccine.name),
      jsonb_build_object('vaccine_id', v_vaccine.id, 'urgency', 'high'),
      NOW();
    v_created := v_created + 1;
  END LOOP;

  RETURN v_created;
END;
$$;

COMMENT ON FUNCTION fn_create_vaccine_reminders IS 'Cria notificações push para vacinas 7d e 1d antes';
