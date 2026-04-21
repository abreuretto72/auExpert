-- Migration: normalize pets.sex column to consistent values
-- Adds 'unknown' as valid value and sets DEFAULT

-- 1. Normalize existing stale values before constraint change
UPDATE public.pets SET sex = 'male'    WHERE sex IN ('M', 'm', 'Male', 'macho');
UPDATE public.pets SET sex = 'female'  WHERE sex IN ('F', 'f', 'Female', 'fêmea', 'femea');
UPDATE public.pets SET sex = 'unknown' WHERE sex IS NULL OR sex NOT IN ('male', 'female');

-- 2. Drop old CHECK constraint (name may vary — drop by table scan)
ALTER TABLE public.pets
  DROP CONSTRAINT IF EXISTS pets_sex_check;

-- 3. Add new CHECK constraint including 'unknown'
ALTER TABLE public.pets
  ADD CONSTRAINT pets_sex_check
    CHECK (sex IN ('male', 'female', 'unknown'));

-- 4. Set default and NOT NULL
ALTER TABLE public.pets
  ALTER COLUMN sex SET DEFAULT 'unknown',
  ALTER COLUMN sex SET NOT NULL;

-- 5. Reload PostgREST
NOTIFY pgrst, 'reload schema';
