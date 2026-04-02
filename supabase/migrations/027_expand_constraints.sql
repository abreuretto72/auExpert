-- Migration 027: Expand CHECK constraints for new classifier types
-- 1. scheduled_events.event_type: add boarding, pet_sitter, dog_walker
-- 2. expenses.category: add formal CHECK with full category list

-- ── scheduled_events: add missing event_type values ──────────────────────────

ALTER TABLE scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_event_type_check;

ALTER TABLE scheduled_events
  ADD CONSTRAINT scheduled_events_event_type_check
  CHECK (event_type IN (
    'consultation', 'return_visit', 'exam', 'surgery',
    'physiotherapy', 'vaccine', 'travel_vaccine',
    'medication_dose', 'medication_series',
    'deworming', 'antiparasitic',
    'grooming', 'nail_trim', 'dental_cleaning', 'microchip',
    'boarding', 'pet_sitter', 'dog_walker',
    'plan_renewal', 'insurance_renewal', 'plan_payment',
    'training', 'behaviorist', 'socialization',
    'travel_checklist', 'custom'
  ));

-- ── expenses: add category CHECK with full category list ─────────────────────
-- Note: existing rows have free-text category values; migration sets the
-- constraint going forward. Values already in use are all covered below.

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'saude',
    'alimentacao',
    'higiene',
    'hospedagem',
    'cuidados',
    'treinamento',
    'acessorios',
    'tecnologia',
    'plano',
    'funerario',
    'emergencia',
    'lazer',
    'documentacao',
    'esporte',
    'memorial',
    'logistica',
    'digital',
    'outros',
    -- legacy values from migration 013 (kept for backwards compat)
    'vet', 'pharmacy', 'food', 'grooming', 'exam', 'other'
  ));
