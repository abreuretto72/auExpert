/**
 * persistFuneralPlan — records a funeral/cremation plan.
 *
 * Extracted verbatim from the `case 'funeral_plan'` arm of
 * `hooks/_diary/saveToModule.ts`. NOT routed through persistPlan because the
 * funeral arm also writes to `expenses` with a different cost-source rule
 * (monthly_cost OR total_cost) and always under category 'funerario'.
 *
 * Returns `{ linkedField: { linked_plan_id } }` when the pet_plans insert
 * succeeds — same column as regular plans, so the diary entry shows a single
 * plan-card lens regardless of flavour.
 *
 * Behavior preserved exactly:
 *   - provider passes through (even when null) — unlike persistPlan we do NOT
 *     skip-on-missing-provider here, because a funeral "plan" mentioned by the
 *     tutor without a provider name still deserves a card (memorial context).
 *   - plan_type hardcoded to 'funeral'.
 *   - coverage_items defaults to empty array.
 *   - status hardcoded to 'active'.
 *   - Full `extracted` payload stored in `extracted_data`.
 *   - Expense insertion:
 *       cost priority: `monthly_cost` → `total_cost`
 *       When present: insert expenses row with
 *         date = ctx.today  (funeral plans have no natural event date)
 *         category = 'funerario'
 *         description = `plan_name` → i18n `ai.expense.funeralPlan`
 *         currency hardcoded to 'BRL'
 *   - `source: 'ai'`.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';
import type { Persister } from './types';

export const persistFuneralPlan: Persister = async (extracted, ctx) => {
  const funeralProvider = (extracted.provider as string) ?? null;
  const { data: funeralPlan } = await supabase.from('pet_plans').insert({
    pet_id:         ctx.petId,
    user_id:        ctx.userId,
    diary_entry_id: ctx.diaryEntryId,
    plan_type:      'funeral',
    provider:       funeralProvider,
    plan_name:      (extracted.plan_name as string) ?? null,
    plan_code:      (extracted.plan_code as string) ?? null,
    monthly_cost:   extracted.monthly_cost != null ? Number(extracted.monthly_cost) : null,
    coverage_items: (extracted.coverage as string[]) ?? [],
    status:         'active',
    extracted_data: extracted,
    source:         'ai',
  }).select('id').single();

  const funeralCost = extracted.monthly_cost != null
    ? Number(extracted.monthly_cost)
    : extracted.total_cost != null ? Number(extracted.total_cost) : null;
  if (funeralCost) {
    await supabase.from('expenses').insert({
      pet_id:        ctx.petId,
      user_id:       ctx.userId,
      diary_entry_id:ctx.diaryEntryId,
      date:          ctx.today,
      vendor:        funeralProvider,
      category:      'funerario',
      total:         funeralCost,
      currency:      'BRL',
      description:   (extracted.plan_name as string) ?? i18n.t('ai.expense.funeralPlan'),
      source:        'ai',
    });
  }

  if (!funeralPlan?.id) return;
  return { linkedField: { linked_plan_id: funeralPlan.id } };
};
