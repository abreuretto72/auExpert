/**
 * checkMetricAlert — generates a `pet_insights` row when a clinical_metric
 * value crosses a clinically significant threshold (fever, hypoglycemia,
 * hyperglycemia, low SpO2, hypertension, abnormal lab marker, or generic
 * is_abnormal flag).
 *
 * Extracted verbatim from `hooks/_diary/saveToModule.ts` so persistClinical-
 * Metric and persistExam (which also writes clinical_metrics rows) can call
 * it without pulling in the full saveToModule module.
 *
 * Behavior preserved exactly:
 *   - Dedup window: no duplicate insight for the same
 *     `source = clinical_{metricType}_{petId}` within the last 24h.
 *   - Silent when no threshold is crossed (early return when `title` is null).
 *   - Urgency tiers match the original switch arms (temperature ≥ 40.5 = high,
 *     hypo/hyper glucose = high, SpO2 < 90 = high, lab = medium, default = low).
 *   - Action route always points at the pet's health screen.
 */
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export async function checkMetricAlert(
  petId: string,
  userId: string,
  metricType: string,
  value: number,
  opts: { isFever: boolean; isAbnormal: boolean; markerName: string | null; secondary: number | null },
): Promise<void> {
  let title: string | null = null;
  let body: string | null = null;
  let urgency = 'medium';

  switch (metricType) {
    case 'temperature':
      if (opts.isFever) {
        title = i18n.t('ai.alert.feverTitle', { value });
        body  = i18n.t('ai.alert.feverBody', { value });
        urgency = value >= 40.5 ? 'high' : 'medium';
      }
      break;
    case 'blood_glucose':
      if (value < 60) {
        title = i18n.t('ai.alert.hypoTitle', { value });
        body  = i18n.t('ai.alert.hypoBody', { value });
        urgency = 'high';
      } else if (value > 200) {
        title = i18n.t('ai.alert.hyperTitle', { value });
        body  = i18n.t('ai.alert.hyperBody', { value });
        urgency = 'high';
      }
      break;
    case 'oxygen_saturation':
      if (value < 95) {
        title = i18n.t('ai.alert.spo2Title', { value });
        body  = i18n.t('ai.alert.spo2Body', { value });
        urgency = value < 90 ? 'high' : 'medium';
      }
      break;
    case 'blood_pressure':
      if (value > 160) {
        title = i18n.t('ai.alert.bpTitle', { value });
        body  = i18n.t('ai.alert.bpBody', { value });
        urgency = 'medium';
      }
      break;
    case 'lab_result':
      if (opts.isAbnormal && opts.markerName) {
        title = i18n.t('ai.alert.labTitle', { marker: opts.markerName, value });
        body  = i18n.t('ai.alert.labBody', { marker: opts.markerName });
        urgency = 'medium';
      }
      break;
    default:
      if (opts.isAbnormal) {
        title = i18n.t('ai.alert.metricTitle', { type: metricType });
        body  = i18n.t('ai.alert.metricBody', { value });
        urgency = 'low';
      }
  }

  if (!title) return;

  // Dedup: check if a similar insight was already inserted in the last 24h
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const source = `clinical_${metricType}_${petId}`;
  const { count } = await supabase
    .from('pet_insights')
    .select('id', { count: 'exact', head: true })
    .eq('pet_id', petId)
    .eq('source', source)
    .gte('created_at', since);
  if ((count ?? 0) > 0) return;

  await supabase.from('pet_insights').insert({
    pet_id:       petId,
    user_id:      userId,
    type:         'alert',
    urgency,
    title,
    body,
    action_route: `/pet/${petId}/health`,
    action_label: i18n.t('ai.alert.actionLabel'),
    source,
    is_active:    true,
  });
}
