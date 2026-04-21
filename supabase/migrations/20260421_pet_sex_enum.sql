-- Migration: normalize pets.sex column to consistent values
-- Adds 'unknown' as valid value, widens column, recreates dependent view

-- 0. Drop dependent view temporarily
DROP VIEW IF EXISTS vw_pet_full_profile;

-- 1. Widen column from VARCHAR(6) to VARCHAR(10) to fit 'unknown'
ALTER TABLE public.pets
  ALTER COLUMN sex TYPE VARCHAR(10);

-- 2. Normalize existing stale values before constraint change
UPDATE public.pets SET sex = 'male'    WHERE sex IN ('M', 'm', 'Male', 'macho');
UPDATE public.pets SET sex = 'female'  WHERE sex IN ('F', 'f', 'Female', 'fêmea', 'femea');
UPDATE public.pets SET sex = 'unknown' WHERE sex IS NULL OR sex NOT IN ('male', 'female');

-- 3. Drop old CHECK constraint
ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_sex_check;

-- 4. New CHECK + DEFAULT + NOT NULL
ALTER TABLE public.pets
  ADD CONSTRAINT pets_sex_check
    CHECK (sex IN ('male', 'female', 'unknown')),
  ALTER COLUMN sex SET DEFAULT 'unknown',
  ALTER COLUMN sex SET NOT NULL;

-- 5. Recreate vw_pet_full_profile (dropped in step 0)
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
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('allergen', a.allergen, 'severity', a.severity))
     FROM allergies a WHERE a.pet_id = p.id AND a.is_active = true),
    '[]'::jsonb
  ) AS allergies,
  COALESCE(
    (SELECT jsonb_agg(jsonb_build_object('name', v.name, 'date', v.date_administered,
      'next_due', v.next_due_date, 'status', v.status) ORDER BY v.date_administered DESC)
     FROM vaccines v WHERE v.pet_id = p.id AND v.is_active = true),
    '[]'::jsonb
  ) AS vaccines
FROM pets p
JOIN users u ON u.id = p.user_id
WHERE p.is_active = true;

COMMENT ON VIEW vw_pet_full_profile IS 'Perfil completo do pet para QR Code e compartilhamento';

-- 6. Reload PostgREST
NOTIFY pgrst, 'reload schema';
