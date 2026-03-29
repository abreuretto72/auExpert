-- Migration 007: Views
-- auExpert MVP

-- ══════════════════════════════════════
-- 1. vw_pet_health_summary
-- Visão consolidada de saúde do pet
-- ══════════════════════════════════════
CREATE OR REPLACE VIEW vw_pet_health_summary AS
SELECT
  p.id AS pet_id,
  p.name,
  p.species,
  p.breed,
  p.weight_kg,
  p.health_score,
  p.happiness_score,
  p.current_mood,
  -- Vacinas
  COUNT(DISTINCT v.id) FILTER (WHERE v.is_active) AS total_vaccines,
  COUNT(DISTINCT v.id) FILTER (WHERE v.is_active AND v.status = 'up_to_date') AS vaccines_up_to_date,
  COUNT(DISTINCT v.id) FILTER (WHERE v.is_active AND v.status = 'overdue') AS vaccines_overdue,
  COUNT(DISTINCT v.id) FILTER (WHERE v.is_active AND v.status = 'upcoming') AS vaccines_upcoming,
  -- Alergias
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_active) AS total_allergies,
  COUNT(DISTINCT a.id) FILTER (WHERE a.is_active AND a.severity = 'severe') AS severe_allergies,
  -- Última atividade
  MAX(de.created_at) AS last_diary_entry,
  MAX(pa.created_at) AS last_photo_analysis,
  -- Owner
  p.user_id
FROM pets p
LEFT JOIN vaccines v ON v.pet_id = p.id
LEFT JOIN allergies a ON a.pet_id = p.id
LEFT JOIN diary_entries de ON de.pet_id = p.id AND de.is_active = true
LEFT JOIN photo_analyses pa ON pa.pet_id = p.id AND pa.is_active = true
WHERE p.is_active = true
GROUP BY p.id;

COMMENT ON VIEW vw_pet_health_summary IS 'Resumo de saúde consolidado por pet';

-- ══════════════════════════════════════
-- 2. vw_vaccine_alerts
-- Vacinas atrasadas ou próximas (30 dias)
-- ══════════════════════════════════════
CREATE OR REPLACE VIEW vw_vaccine_alerts AS
SELECT
  v.id AS vaccine_id,
  v.pet_id,
  p.name AS pet_name,
  p.species,
  p.user_id,
  v.name AS vaccine_name,
  v.date_administered,
  v.next_due_date,
  v.status,
  v.veterinarian,
  v.clinic,
  CASE
    WHEN v.next_due_date < CURRENT_DATE THEN
      CURRENT_DATE - v.next_due_date
    ELSE 0
  END AS days_overdue,
  CASE
    WHEN v.next_due_date >= CURRENT_DATE THEN
      v.next_due_date - CURRENT_DATE
    ELSE 0
  END AS days_until_due
FROM vaccines v
JOIN pets p ON p.id = v.pet_id
WHERE v.is_active = true
  AND p.is_active = true
  AND v.next_due_date IS NOT NULL
  AND v.next_due_date <= CURRENT_DATE + INTERVAL '30 days'
ORDER BY v.next_due_date ASC;

COMMENT ON VIEW vw_vaccine_alerts IS 'Vacinas atrasadas ou com vencimento nos próximos 30 dias';

-- ══════════════════════════════════════
-- 3. vw_pet_happiness_timeline
-- Timeline de felicidade do pet
-- ══════════════════════════════════════
CREATE OR REPLACE VIEW vw_pet_happiness_timeline AS
SELECT
  ml.pet_id,
  p.name AS pet_name,
  p.user_id,
  ml.mood_id,
  ml.score,
  ml.source,
  ml.notes,
  ml.created_at,
  DATE_TRUNC('day', ml.created_at) AS log_date
FROM mood_logs ml
JOIN pets p ON p.id = ml.pet_id
WHERE ml.is_active = true
  AND p.is_active = true
ORDER BY ml.created_at DESC;

COMMENT ON VIEW vw_pet_happiness_timeline IS 'Timeline de humor do pet para gráfico de felicidade';

-- ══════════════════════════════════════
-- 4. vw_rag_context_by_pet
-- Embeddings mais recentes e importantes por pet
-- ══════════════════════════════════════
CREATE OR REPLACE VIEW vw_rag_context_by_pet AS
SELECT
  pe.pet_id,
  p.name AS pet_name,
  p.user_id,
  pe.content_type,
  pe.content_text,
  pe.importance,
  pe.metadata,
  pe.created_at,
  ROW_NUMBER() OVER (
    PARTITION BY pe.pet_id, pe.content_type
    ORDER BY pe.importance DESC, pe.created_at DESC
  ) AS rank_in_type
FROM pet_embeddings pe
JOIN pets p ON p.id = pe.pet_id
WHERE pe.is_active = true
  AND p.is_active = true;

COMMENT ON VIEW vw_rag_context_by_pet IS 'Embeddings RAG ranqueados por importância e recência por pet';

-- ══════════════════════════════════════
-- 5. vw_pet_full_profile
-- Perfil completo para QR Code / compartilhamento
-- ══════════════════════════════════════
CREATE OR REPLACE VIEW vw_pet_full_profile AS
SELECT
  p.id AS pet_id,
  p.name,
  p.species,
  p.breed,
  p.birth_date,
  p.sex,
  p.is_neutered,
  p.weight_kg,
  p.size,
  p.color,
  p.microchip_id,
  p.blood_type,
  p.avatar_url,
  p.health_score,
  p.happiness_score,
  p.current_mood,
  p.ai_personality,
  p.user_id,
  u.full_name AS tutor_name,
  u.phone AS tutor_phone,
  -- Alergias como array
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'allergen', a.allergen,
      'severity', a.severity
    ))
    FROM allergies a WHERE a.pet_id = p.id AND a.is_active = true),
    '[]'::jsonb
  ) AS allergies,
  -- Vacinas recentes como array
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object(
      'name', v.name,
      'date', v.date_administered,
      'next_due', v.next_due_date,
      'status', v.status
    ) ORDER BY v.date_administered DESC)
    FROM vaccines v WHERE v.pet_id = p.id AND v.is_active = true),
    '[]'::jsonb
  ) AS vaccines
FROM pets p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true;

COMMENT ON VIEW vw_pet_full_profile IS 'Perfil completo do pet para QR Code e compartilhamento';
