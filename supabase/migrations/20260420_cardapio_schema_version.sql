-- Migration: add schema_version to nutrition_cardapio_cache
-- Allows safe invalidation of stale cache when JSON format changes (no table drop needed).

ALTER TABLE public.nutrition_cardapio_cache
  ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.nutrition_cardapio_cache.schema_version IS
  'Version of the JSON shape stored in data. Bump CARDAPIO_SCHEMA_VERSION in the Edge Function when shape changes. Caches with a different version are ignored and regenerated.';

-- Reload schema so PostgREST recognises the new column immediately
NOTIFY pgrst, 'reload schema';
