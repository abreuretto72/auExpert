/**
 * finalize — Tail of backgroundClassify pipeline (after media_analyses + insights).
 *
 * Extracted verbatim from backgroundClassify.ts — covers the sequence after
 * Promise.allSettled(postSavePromises):
 *   - Await all postSave promises
 *   - Fetch freshEntry from DB with 5-way FK joins (expenses, vaccines,
 *     consultations, clinical_metrics, medications)
 *   - Fire-and-forget side effects: generateEmbedding, updatePetRAG
 *   - Mark SQLite pending entry as synced
 *   - Build finalEntry (freshEntry from DB, or manual fallback construction)
 *   - cacheEntry for offline reads
 *   - qc.setQueryData optimistic update + setTimeout-5s silent refetch
 *   - 12 invalidateQueries calls (moods, lens.*, scheduled_events, vaccines,
 *     consultations, allergies, insights)
 *   - Auto-personality milestone IIFE (every 10 entries)
 *
 * The outer try/catch wrapping stays in the shell (backgroundClassify.ts) so
 * the [BG] _backgroundClassifyAndSave failed: log + updatePendingStatus(error)
 * path remains in place.
 *
 * All [S5], [S6], [S7], [PERSONALITY] console.logs preserved verbatim.
 */
import type { useQueryClient } from '@tanstack/react-query';
import type { ClassifyDiaryResponse } from '../../../lib/ai';
import { supabase } from '../../../lib/supabase';
import { generateEmbedding, updatePetRAG } from '../../../lib/rag';
import { updatePendingStatus, cacheEntry } from '../../../lib/localDb';
import i18n from '../../../i18n';

export async function finalize(opts: {
  qc: ReturnType<typeof useQueryClient>;
  petId: string;
  userId: string;
  entryId: string;
  tempId: string;
  queryKey: readonly string[];
  originalEntry: import('../../../types/database').DiaryEntry;
  text: string | null;
  inputType: string;
  uploadedPhotos: string[];
  uploadedVideoUrls: string[];
  uploadedAudioUrl: string | null;
  postSavePromises: Promise<unknown>[];
  primaryPhotoAnalysis: Record<string, unknown> | null;
  mediaAnalysesArr: Array<Record<string, unknown>>;
  classification: ClassifyDiaryResponse;
  entryData: {
    pet_id: string;
    user_id: string;
    content: string;
    input_method: import('../../../types/database').DiaryEntry['input_method'];
    mood_id: string;
    mood_score: number;
    mood_source: 'ai_suggested';
    tags: string[];
    photos: string[];
    is_special: boolean;
  };
}): Promise<void> {
  const {
    qc, petId, userId, entryId, tempId, queryKey, originalEntry, text, inputType,
    uploadedPhotos, uploadedVideoUrls, uploadedAudioUrl,
    postSavePromises, primaryPhotoAnalysis, mediaAnalysesArr, classification, entryData,
  } = opts;

  const _tFinalize = Date.now();
  console.log(`[TRACE-FINAL] begin | postSavePromises:${postSavePromises.length}`);

  const _tPostSave = Date.now();
  await Promise.allSettled(postSavePromises);
  console.log(`[TRACE-FINAL] Promise.allSettled(postSavePromises) in ${Date.now() - _tPostSave}ms`);
  console.log('[S5] postSave concluído');
  console.log('[S5] primaryPhotoAnalysis:', !!primaryPhotoAnalysis);
  console.log('[S5] primaryPhotoAnalysis.description:', (primaryPhotoAnalysis as Record<string,unknown> | null)?.description?.toString().slice(0,60));

  // Fetch the complete entry from DB with all fields and module joins.
  // All postSavePromises (narration, classifications, photo_analysis_data, video/audio) are
  // already awaited above, so the DB has the full data at this point.
  const _tFresh = Date.now();
  const { data: freshEntry, error: freshError } = await supabase
    .from('diary_entries')
    .select(`
      *,
      expenses:expenses!expenses_diary_entry_id_fkey(id, total, currency, category, notes, vendor),
      vaccines:vaccines!diary_entries_linked_vaccine_id_fkey(id, name, laboratory, veterinarian, clinic, date_administered, next_due_date, batch_number),
      consultations:consultations!diary_entries_linked_consultation_id_fkey(id, veterinarian, clinic, type, diagnosis, date),
      clinical_metrics:clinical_metrics!diary_entries_linked_weight_metric_id_fkey(id, metric_type, value, unit, measured_at),
      medications:medications!diary_entries_linked_medication_id_fkey(id, name, dosage, frequency, veterinarian)
    `)
    .eq('id', entryId)
    .single();
  console.log(`[TRACE-FINAL] freshEntry SELECT (5 joins) in ${Date.now() - _tFresh}ms | hasData:${!!freshEntry} | err:${freshError?.code ?? 'none'}`);
  console.log('[S6] freshEntry fromDB:', !!freshEntry, freshError?.message);
  console.log('[S6] freshEntry.photos:', (freshEntry as unknown as Record<string,unknown>)?.photos);
  console.log('[S6] freshEntry.photo_analysis_data:', !!(freshEntry as unknown as Record<string,unknown>)?.photo_analysis_data);
  console.log('[S6] freshEntry.narration:', !!(freshEntry as unknown as Record<string,unknown>)?.narration);
  console.log('[S6] freshEntry.video_url:', !!(freshEntry as unknown as Record<string,unknown>)?.video_url);
  console.log('[S6] freshEntry.classifications:', ((freshEntry as unknown as Record<string,unknown>)?.classifications as unknown[] | null)?.length ?? 0);
  console.log('[S6] freshEntry.media_analyses:', ((freshEntry as unknown as Record<string,unknown>)?.media_analyses as unknown[] | null)?.length ?? 'null');
  console.log('[S6] expenses:', ((freshEntry as unknown as Record<string,unknown>)?.expenses as unknown[] | null)?.length ?? 0);
  console.log('[S6] vaccines:', ((freshEntry as unknown as Record<string,unknown>)?.vaccines as unknown[] | null)?.length ?? 0);
  if (freshError) {
    console.warn('[BG] freshEntry fetch failed:', freshError.message, freshError.code);
  }

  // Best-effort side effects
  const embeddingText = classification.narration
    ? `${text ?? ''}\n\n${classification.narration}`
    : (text ?? '');
  generateEmbedding(petId, 'diary', entryId, embeddingText, 0.5, userId).catch(() => {});
  updatePetRAG(petId, userId, entryId, classification.classifications ?? []).catch(() => {});

  // Embedding RICO (texto + narração + photo/video/audio analyses + media_analyses + tags).
  // Roda em paralelo — esse cria/atualiza o registro `category='diary_full'` com importance 0.85,
  // dominando o ranking RAG sobre o `diary` mínimo (importance 0.5) acima.
  supabase.functions.invoke('reembed-diary-rich', {
    body: { diary_entry_id: entryId },
  }).catch(() => {});

  // Mark SQLite pending entry as synced
  updatePendingStatus(tempId, 'synced');

  // Build final entry: fresh DB row if available, otherwise manual construction.
  // Fallback includes all data available in memory so the card renders correctly
  // even if the DB fetch failed (e.g. timing / RLS).
  const finalEntry = (freshEntry ?? {
    ...entryData,
    id: entryId,
    narration:               classification.narration ?? null,
    entry_type:              'manual' as const,
    primary_type:            classification.primary_type ?? 'moment',
    classifications:         classification.classifications ?? [],
    input_type:              inputType,
    urgency:                 classification.urgency ?? 'none',
    mood_confidence:         classification.mood_confidence ?? null,
    is_registration_entry:   false,
    linked_photo_analysis_id: null,
    entry_date:              new Date().toISOString().split('T')[0],
    is_active:               true,
    processing_status:       'done' as const,
    created_at:              originalEntry.created_at,
    updated_at:              new Date().toISOString(),
    photos:                  uploadedPhotos,
    video_url:               uploadedVideoUrls[0] ?? null,
    audio_url:               uploadedAudioUrl,
    photo_analysis_data:     primaryPhotoAnalysis,
    video_analysis:          (classification as Record<string, unknown>).video_analysis ?? null,
    pet_audio_analysis:      (classification as Record<string, unknown>).pet_audio_analysis ?? null,
    media_analyses:          mediaAnalysesArr.length > 0 ? mediaAnalysesArr : null,
  }) as import('../../../types/database').DiaryEntry;

  // Cache locally for offline reads
  cacheEntry({
    id:               finalEntry.id,
    pet_id:           finalEntry.pet_id,
    content:          finalEntry.content,
    narration:        finalEntry.narration,
    mood_id:          finalEntry.mood_id,
    mood_score:       finalEntry.mood_score,
    input_method:     finalEntry.input_method,
    input_type:       (finalEntry as unknown as Record<string, unknown>).input_type as string | null,
    primary_type:     (finalEntry as unknown as Record<string, unknown>).primary_type as string | null,
    tags:             Array.isArray(finalEntry.tags) ? finalEntry.tags : [],
    photos:           Array.isArray(finalEntry.photos) ? finalEntry.photos : [],
    processing_status:'done',
    is_special:       finalEntry.is_special,
    created_at:       finalEntry.created_at,
    updated_at:       finalEntry.updated_at,
  });

  // Replace temp entry with the complete fresh entry from DB.
  // Do NOT invalidate diary immediately — an instant refetch could overwrite
  // the cache with a stale row if any write is still propagating. Schedule it
  // after 3 s so the card shows correct data right away.
  // ── DIAG pré-setQueryData: shape do finalEntry que vai pro cache ──
  {
    const fe = finalEntry as unknown as Record<string, unknown>;
    const cls = fe.classifications;
    const exp = fe.expenses;
    console.log('[S7-DIAG] finalEntry.id:', fe.id);
    console.log('[S7-DIAG] finalEntry.classifications | typeof:', typeof cls,
      '| isArray:', Array.isArray(cls),
      '| length:', Array.isArray(cls) ? (cls as unknown[]).length : (typeof cls === 'string' ? `STRING(${(cls as string).length})` : 'n/a'),
      '| firstChars:', typeof cls === 'string' ? (cls as string).slice(0, 80) : (Array.isArray(cls) ? JSON.stringify(cls).slice(0, 120) : 'null'));
    console.log('[S7-DIAG] finalEntry.expenses | typeof:', typeof exp,
      '| isArray:', Array.isArray(exp),
      '| length:', Array.isArray(exp) ? (exp as unknown[]).length : 'n/a',
      '| first:', Array.isArray(exp) && exp.length > 0 ? JSON.stringify(exp[0]).slice(0, 120) : 'none');
  }
  console.log('[S7] setQueryData com finalEntry | photoAnalysisData:', !!(finalEntry as unknown as Record<string,unknown>)?.photo_analysis_data);
  qc.setQueryData<import('../../../types/database').DiaryEntry[]>(queryKey as unknown as ['pets', string, 'diary'], (old) => {
    const withoutTemp = (old ?? []).filter((e) => !e.id.startsWith('temp-'));
    return [finalEntry, ...withoutTemp];
  });
  // ── DIAG pós-setQueryData: confirmar que cache contém a entry com shape correto ──
  {
    const cache = qc.getQueryData(queryKey as unknown as ['pets', string, 'diary']) as unknown[] | undefined;
    const inCache = cache?.find((e) => (e as Record<string, unknown>).id === entryId) as Record<string, unknown> | undefined;
    console.log('[S7-DIAG] cache after set | totalEntries:', cache?.length ?? 0,
      '| hasNewEntry:', !!inCache,
      '| newEntry.classifications.length:', Array.isArray(inCache?.classifications) ? (inCache!.classifications as unknown[]).length : `not-array(${typeof inCache?.classifications})`,
      '| newEntry.expenses.length:', Array.isArray(inCache?.expenses) ? (inCache!.expenses as unknown[]).length : `not-array(${typeof inCache?.expenses})`);
  }
  // Refetch silencioso após 5s — não zera cache se o banco retornar vazio
  setTimeout(() => {
    qc.fetchQuery({
      queryKey: ['pets', petId, 'diary'],
      queryFn: async () => {
        const { fetchDiaryEntries } = await import('../../../lib/api');
        const fresh = await fetchDiaryEntries(petId);
        if (fresh && fresh.length > 0) {
          return fresh;
        }
        // Banco retornou vazio (propagação lenta) — manter cache atual
        return qc.getQueryData(['pets', petId, 'diary']) ?? [];
      },
    }).catch(() => {});
  }, 5000);

  qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'expenses'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'metrics'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'achievements'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'travels'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'mood_trend'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'vaccines'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'consultations'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'allergies'] });
  qc.invalidateQueries({ queryKey: ['pets', petId, 'insights'] });

  // ── Auto personality generation every 10 entries ──────────────────────────
  // Fires silently in background — never blocks the save flow
  void (async () => {
    try {
      const allEntries = (qc.getQueryData<import('../../../types/database').DiaryEntry[]>(queryKey) ?? [])
        .filter((e) => e.is_active !== false && !e.id.startsWith('temp-'));
      const count = allEntries.length;
      if (count > 0 && count % 10 === 0) {
        console.log('[PERSONALITY] Milestone:', count, 'entradas — gerando personalidade automaticamente');
        const { generatePersonality } = await import('../../../lib/ai');
        const result = await generatePersonality(petId, i18n.language);
        if (result.personality) {
          console.log('[PERSONALITY] ✓ Personalidade gerada | length:', result.personality.length);
          qc.invalidateQueries({ queryKey: ['pet', petId] });
        } else {
          console.warn('[PERSONALITY] ⚠ Personalidade null | reason:', result.reason, '| count:', result.count);
        }
      }
    } catch (e) {
      console.warn('[PERSONALITY] Auto-generation falhou (silencioso):', String(e));
    }
  })();
}
