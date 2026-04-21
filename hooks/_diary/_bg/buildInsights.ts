/**
 * buildInsights — Generate pet_insights rows from media analyses (fire-and-forget).
 *
 * Section "7. Generate pet_insights from media analyses" extracted verbatim from
 * backgroundClassify.ts. Runs after media_analyses is built and postSavePromises
 * have settled. On success, invalidates the pet's insights query so the UI
 * refreshes. Errors are swallowed (non-critical path).
 *
 * Current insight triggers:
 *   - photo.toxicity_check.has_toxic_items with severe/moderate levels → 'saude'
 *   - video.energy_score < 30 OR locomotion_score < 40 → 'comportamento'
 */
import type { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import i18n from '../../../i18n';

export function buildInsights(opts: {
  qc: ReturnType<typeof useQueryClient>;
  petId: string;
  userId: string;
  entryId: string;
  mediaAnalysesArr: Array<Record<string, unknown>>;
}): void {
  const { qc, petId, userId, entryId, mediaAnalysesArr } = opts;

  const insightsToCreate: Array<Record<string, unknown>> = [];

  for (const media of mediaAnalysesArr) {
    // Photo: toxicity alerts
    if (media.type === 'photo' && media.analysis) {
      const toxCheck = (media.analysis as Record<string, unknown>).toxicity_check as Record<string, unknown> | undefined;
      if (toxCheck?.has_toxic_items) {
        const items = toxCheck.items as Array<{name: string; toxicity_level: string; description: string}> | undefined;
        const severeItems = (items ?? []).filter((i) => i.toxicity_level === 'severe' || i.toxicity_level === 'moderate');
        if (severeItems.length > 0) {
          insightsToCreate.push({
            pet_id: petId,
            user_id: userId,
            diary_entry_id: entryId,
            category: 'saude',
            urgency: severeItems.some((i) => i.toxicity_level === 'severe') ? 'high' : 'medium',
            title: i18n.t('insights.photoToxic.title'),
            body: severeItems.map((i) => `${i.name}: ${i.description}`).join('\n'),
            source: 'photo_analysis',
            is_active: true,
          });
        }
      }
    }
    // Video: low energy or locomotion
    if (media.type === 'video' && media.videoAnalysis) {
      const va = media.videoAnalysis as Record<string, unknown>;
      const energy = va.energy_score as number | undefined;
      const locomotion = va.locomotion_score as number | undefined;
      if ((energy != null && energy < 30) || (locomotion != null && locomotion < 40)) {
        const summary = (va.behavior_summary as string) ?? '';
        const metrics = i18n.t('insights.videoLowEnergy.bodyMetrics', {
          energy: energy ?? '?',
          locomotion: locomotion ?? '?',
        });
        insightsToCreate.push({
          pet_id: petId,
          user_id: userId,
          diary_entry_id: entryId,
          category: 'comportamento',
          urgency: 'medium',
          title: i18n.t('insights.videoLowEnergy.title'),
          body: summary ? `${summary} ${metrics}` : metrics,
          source: 'video_analysis',
          is_active: true,
        });
      }
    }
  }

  if (insightsToCreate.length > 0) {
    console.log('[S5] insights a criar:', insightsToCreate.length);
    supabase.from('pet_insights')
      .insert(insightsToCreate)
      .then(() => { qc.invalidateQueries({ queryKey: ['pets', petId, 'insights'] }); })
      .catch(() => {});
  }
}
