/**
 * persistPlan — records a pet health plan or insurance policy.
 *
 * Extracted verbatim from the SHARED `case 'plan':` / `case 'insurance':` arm
 * of `hooks/_diary/saveToModule.ts`. Both classifier types land here and the
 * dispatcher maps both to this persister; the only branch is on `ctx.moduleType`
 * to decide the `plan_type` value ('insurance' vs explicit/`health`).
 *
 * Funeral plans have their OWN classifier type ('funeral_plan') and their OWN
 * persister (persistFuneralPlan) — NOT routed through this one, because their
 * payload shape differs (no monthly cost optionality, has a funeral_details
 * JSON blob, also writes is_memorial on pets).
 *
 * Returns `{ linkedField: { linked_plan_id } }` when the insert succeeds.
 *
 * Behavior preserved exactly:
 *   - Skips the insert entirely when `provider` is missing — provider is the
 *     only field we treat as "identity" for a plan; without it we can't even
 *     show a meaningful card.
 *   - `plan_type` resolution:
 *       ctx.moduleType === 'insurance' → 'insurance'
 *       otherwise                      → extracted.plan_type ?? 'health'
 *   - `plan_type` then run through a whitelist. If the classifier invents a
 *     value outside the whitelist, we fall back to 'health'. Whitelist:
 *       ['health', 'insurance', 'funeral', 'assistance', 'emergency']
 *   - All cost/date fields pass through with null fallback.
 *   - `coverage_items` defaults to empty array (never null — the DB column is
 *     an array with default `{}`, passing null would break existing callers
 *     that do `.map()` without a guard).
 *   - `status` hardcoded to 'active' — lapsed plans are detected by a CRON
 *     based on `end_date`, not set at insert time.
 *   - Full `extracted` payload stored in `extracted_data` for later lens UI.
 *   - `source: 'ai'`.
 */
import { supabase } from '../../../lib/supabase';
import type { Persister } from './types';

const VALID_PLAN_TYPES = ['health', 'insurance', 'funeral', 'assistance', 'emergency'];

export const persistPlan: Persister = async (extracted, ctx) => {
  const provider = (extracted.provider as string) ?? null;
  if (!provider) return;

  const rawPlanType = ctx.moduleType === 'insurance'
    ? 'insurance'
    : (extracted.plan_type as string) ?? 'health';
  const planType = VALID_PLAN_TYPES.includes(rawPlanType) ? rawPlanType : 'health';

  const { data } = await supabase.from('pet_plans').insert({
    pet_id:         ctx.petId,
    user_id:        ctx.userId,
    diary_entry_id: ctx.diaryEntryId,
    plan_type:      planType,
    provider,
    plan_name:      (extracted.plan_name as string) ?? null,
    plan_code:      (extracted.plan_code as string) ?? null,
    monthly_cost:   extracted.monthly_cost != null ? Number(extracted.monthly_cost) : null,
    annual_cost:    extracted.annual_cost != null ? Number(extracted.annual_cost) : null,
    coverage_limit: extracted.coverage_limit != null ? Number(extracted.coverage_limit) : null,
    start_date:     (extracted.start_date as string) ?? null,
    end_date:       (extracted.end_date as string) ?? null,
    renewal_date:   (extracted.renewal_date as string) ?? null,
    coverage_items: (extracted.coverage as string[]) ?? [],
    status:         'active',
    extracted_data: extracted,
    source:         'ai',
  }).select('id').single();
  if (!data?.id) return;

  return { linkedField: { linked_plan_id: data.id } };
};
