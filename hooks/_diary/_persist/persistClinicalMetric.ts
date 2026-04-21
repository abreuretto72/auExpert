/**
 * persistClinicalMetric — inserts a single clinical_metrics row and fires
 * checkMetricAlert when the value crosses a clinically significant threshold.
 *
 * Extracted verbatim from the `case 'clinical_metric'` arm of
 * `hooks/_diary/saveToModule.ts`.
 *
 * Unlike persistExam (which bulk-inserts metrics from a results array and
 * does NOT call checkMetricAlert per row), this persister handles a single
 * metric provided directly by the classifier — typically from free-text like
 * "febre 40.2 hoje" or "glicemia 280 em jejum".
 *
 * Behavior preserved exactly:
 *   - Early return when `metric_type` is missing OR `value` is null/undefined
 *     (Number(null) would be 0, which is a valid reading — so we check before
 *     the coercion, not after).
 *   - Base row always has: pet_id, user_id, diary_entry_id, metric_type, value,
 *     unit (nullable), source='ai', measured_at=NOW.
 *   - Optional enrichment columns are written ONLY when present on extracted:
 *       secondary_value (number), marker_name (string), is_fever (bool),
 *       is_abnormal (bool), context (string), fasting (bool), score (number).
 *     The original intentionally uses `!= null` guards for numerics/booleans
 *     and truthy checks for strings — preserved exactly.
 *   - `status` is derived: 'high' when is_abnormal truthy, else 'normal'.
 *   - After insert, checkMetricAlert is fired-and-forgotten with the flags
 *     coerced to explicit Booleans and secondary to Number|null.
 *   - No linkedField — clinical_metric entries don't back-link to diary_entries.
 */
import { supabase } from '../../../lib/supabase';
import { checkMetricAlert } from './checkMetricAlert';
import type { Persister } from './types';

export const persistClinicalMetric: Persister = async (extracted, ctx) => {
  const metricType = (extracted.metric_type as string) ?? null;
  const metricValue = extracted.value != null ? Number(extracted.value) : null;
  if (!metricType || metricValue == null) return;

  const metricRow: Record<string, unknown> = {
    pet_id:         ctx.petId,
    user_id:        ctx.userId,
    diary_entry_id: ctx.diaryEntryId,
    metric_type:    metricType,
    value:          metricValue,
    unit:           (extracted.unit as string) ?? null,
    source:         'ai',
    measured_at:    new Date().toISOString(),
  };

  // Optional enrichment columns
  if (extracted.secondary_value != null) metricRow.secondary_value = Number(extracted.secondary_value);
  if (extracted.marker_name)     metricRow.marker_name    = extracted.marker_name as string;
  if (extracted.is_fever != null) metricRow.is_fever      = Boolean(extracted.is_fever);
  if (extracted.is_abnormal != null) metricRow.is_abnormal = Boolean(extracted.is_abnormal);
  if (extracted.context)         metricRow.context        = extracted.context as string;
  if (extracted.fasting != null) metricRow.fasting        = Boolean(extracted.fasting);
  if (extracted.score != null)   metricRow.score          = Number(extracted.score);

  // Derive status from is_abnormal flag
  metricRow.status = extracted.is_abnormal ? 'high' : 'normal';

  const { data: metricData, error: metricErr } = await supabase.from('clinical_metrics').insert(metricRow).select('id').single();
  console.log('[MOD] métrica salva:', metricType, metricData?.id?.slice(-8), '| erro:', metricErr?.message);

  // Generate pet_insights for clinically significant values
  checkMetricAlert(ctx.petId, ctx.userId, metricType, metricValue, {
    isFever:    Boolean(extracted.is_fever),
    isAbnormal: Boolean(extracted.is_abnormal),
    markerName: (extracted.marker_name as string) ?? null,
    secondary:  extracted.secondary_value != null ? Number(extracted.secondary_value) : null,
  }).catch(() => {});
};
