/**
 * persistWeight — records a weight measurement as a clinical metric and keeps
 * the cached `pets.weight_kg` value in sync.
 *
 * Extracted verbatim from the `case 'weight'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Returns `{ linkedField: { linked_weight_metric_id } }` when the insert
 * succeeds. This is the ONE persister that needs `qc` — invalidating the
 * cached queries is part of the original contract because the hub card and
 * nutrition lens both read `weight_kg` directly from the pets row.
 *
 * Behavior preserved exactly:
 *   - Value priority: `extracted.value` → `extracted.weight`.
 *   - PT-BR decimal normalisation: "3,5" → 3.5. This is here (not in the
 *     classifier) because different classifier prompts emit the value as
 *     string or number depending on the model version.
 *   - Skips entirely when the resolved value is null or NaN.
 *   - `metric_type` hardcoded to 'weight', `status` hardcoded to 'normal' —
 *     clinical-significance checks (overweight/underweight alerts) happen in
 *     a CRON, not here.
 *   - `unit` defaults to 'kg'.
 *   - `measured_at` uses `new Date().toISOString()` (the insertion moment),
 *     NOT `extracted.date` — the column represents when the reading was
 *     captured into the system, not the human-facing date of the event.
 *   - After a successful insert, updates the pets row with the new weight
 *     (only when `is_active`) and invalidates FIVE query keys:
 *       ['pets'], ['pet', petId], ['pets', petId, 'clinical_metrics'],
 *       ['pets', petId, 'lens', 'metrics'], ['nutricao', petId].
 *     The five-way invalidation is intentional — each key feeds a different
 *     screen and stale weight on any of them was how this became a bug before.
 *   - The pets update is guarded by `!wErr` — if the metric insert failed we
 *     don't touch the cached pet row.
 *   - `source: 'ai'`.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

export const persistWeight: Persister = async (extracted, ctx) => {
  const rawWeight = extracted.value ?? extracted.weight;
  // Normalize PT-BR decimal notation: "3,5" → 3.5
  const weightVal = typeof rawWeight === 'string'
    ? parseFloat((rawWeight as string).replace(',', '.'))
    : rawWeight != null ? Number(rawWeight) : null;
  if (weightVal == null || isNaN(weightVal)) return;

  const numericWeight = weightVal;
  const { data, error: wErr } = await supabase.from('clinical_metrics').insert({
    pet_id:        ctx.petId,
    user_id:       ctx.userId,
    diary_entry_id:ctx.diaryEntryId,
    metric_type:   'weight',
    value:         numericWeight,
    unit:          (extracted.unit as string) ?? 'kg',
    status:        'normal',
    source:        'ai',
    measured_at:   new Date().toISOString(),
  }).select('id').single();
  console.log('[MOD] métrica salva: weight', data?.id?.slice(-8), '| erro:', wErr?.message);
  if (!data?.id) return;

  // Sync current weight to pets table to keep cached value up to date
  if (!wErr) {
    await supabase
      .from('pets')
      .update({ weight_kg: numericWeight })
      .eq('id', ctx.petId)
      .eq('is_active', true);
    ctx.qc?.invalidateQueries({ queryKey: ['pets'] });
    ctx.qc?.invalidateQueries({ queryKey: ['pet', ctx.petId] });
    ctx.qc?.invalidateQueries({ queryKey: ['pets', ctx.petId, 'clinical_metrics'] });
    ctx.qc?.invalidateQueries({ queryKey: ['pets', ctx.petId, 'lens', 'metrics'] });
    ctx.qc?.invalidateQueries({ queryKey: ['nutricao', ctx.petId] });
  }

  return { linkedField: { linked_weight_metric_id: data.id } };
};
