/**
 * backgroundClassifyAndSave — Pipeline completo de classificação + persistência.
 *
 * Extraído de `hooks/useDiaryEntry.ts` para isolar a orquestração de IA
 * (uploads, RAG, classify, narração, lentes, embedding, achievements).
 *
 * Esta função é executada em fire-and-forget a partir de submitEntry e
 * retryEntry. Nunca lança — falhas são capturadas no try/catch externo e
 * marcam a entry como 'error' no SQLite + cache do React Query.
 *
 * ORQUESTRAÇÃO (revertida de FASE 4 streaming — plan-reverter-streaming):
 *   Todas as 5 rotinas de mídia (text, photos, video, audio, ocr) rodam em
 *   Promise.all ANTES de criar a entry no banco. O card "processando" fica
 *   na timeline (tempId) enquanto as rotinas executam; um checklist
 *   (progressStore) mostra ao tutor o status de cada fase em tempo real.
 *   Só depois que TODAS settleram é que createDiaryEntry + updateDiaryNarration
 *   rodam e a entry real substitui o tempId na timeline — com narração,
 *   classifications, photo_analysis_data, video_analysis, pet_audio_analysis
 *   e media_analyses todos preenchidos de uma vez.
 *
 *   Progressão visual no card "processando":
 *     ◯  pending  → fase aplicável, ainda não começou
 *     ⏳ running → fase em execução (barra indeterminada ou X/Y para fotos)
 *     ✓  done    → fase concluída (barra 100%)
 *
 *   O progressStore é limpo (clear(tempId)) quando finalize concluir ou o
 *   catch de erro disparar — em ambos os casos o card deixa de ser
 *   "processando" e a timeline exibe a entry real ou o estado de erro.
 */
import type { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { updatePendingStatus } from '../../lib/localDb';
import { supabase } from '../../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import i18n from '../../i18n';
import { AI_FLAGS_ALL_ON } from './types';
import type {
  AIAnalysisFlags,
  TextClassificationOutcome,
  PhotoAnalysesOutcome,
  VideoClassificationOutcome,
  AudioClassificationOutcome,
  OCRClassificationOutcome,
} from './types';
import {
  runTextClassification,
  runPhotoAnalyses,
  runVideoClassification,
  runAudioClassification,
  runOCRClassification,
} from './mediaRoutines';
import { saveToModule } from './saveToModule';
import { runUploads } from './_bg/runUploads';
import { skipAIPath } from './_bg/skipAIPath';
import { buildMediaAnalyses } from './_bg/buildMediaAnalyses';
import { buildInsights } from './_bg/buildInsights';
import { finalize } from './_bg/finalize';
import { useProgressStore } from './progressStore';

// ── Background helpers (used by submitEntry + retryEntry) ────────────────────

export async function backgroundClassifyAndSave(opts: {
  qc: ReturnType<typeof useQueryClient>;
  petId: string;
  userId: string;
  queryKey: readonly string[];
  tempId: string;
  originalEntry: import('../../types/database').DiaryEntry;
  text: string | null;
  photosBase64: string[] | null;
  inputType: string;
  photos: string[];
  species?: string;
  petName?: string;
  petBreed?: string;
  mediaUris?: string[];   // all attachment URIs (photos first, then video/audio)
  videoDuration?: number;
  audioDuration?: number;
  audioOriginalName?: string;
  additionalContext?: string;
  hasVideo?: boolean;
  docBase64?: string;     // inline base64 of a scanned document (upload + OCR in parallel with main classify)
  skipAI?: boolean;       // skip AI pipeline — upload media + save entry with manual defaults
  /** Per-routine AI analysis flags. When absent, defaults to all-enabled (backward compat). */
  aiFlags?: AIAnalysisFlags;
  /** Toast function from useToast() — passed from the hook so background fn can show notifications. */
  toast?: (text: string, type?: string) => void;
}): Promise<void> {
  const { qc, petId, userId, queryKey, tempId, originalEntry, text, photosBase64, inputType, photos, mediaUris, videoDuration, audioDuration, audioOriginalName, additionalContext } = opts;

  // ── TIMING instrumentation ────────────────────────────────────────────────
  // `t` stores cumulative checkpoints so a final [TRACE] summary can print
  // the wall time of each phase. All values in ms (Date.now()).
  const tStart = Date.now();
  const t: Record<string, number> = { start: tStart };
  const lap = (label: string) => { const now = Date.now(); t[label] = now; console.log(`[TRACE] ${label} at +${now - tStart}ms`); return now; };

  // Mark as processing immediately so useSyncQueue doesn't pick it up and create a duplicate
  updatePendingStatus(tempId, 'processing');

  // Upload all media types in parallel before classify so URLs are ready.
  // Extracted to _bg/runUploads.ts — bundles photos/videos/audio/document uploads
  // + refreshSession + video frame extraction into one helper.
  const _tUploadStart = Date.now();
  const uploads = await runUploads({
    userId,
    petId,
    photos,
    photosBase64,
    inputType,
    mediaUris,
    hasVideo: opts.hasVideo,
    docBase64: opts.docBase64,
    audioOriginalName,
    skipAI: opts.skipAI,
  });
  let uploadedPhotos = uploads.uploadedPhotos;
  const { uploadedVideoUrls, videoThumbUrls, uploadedAudioUrl, uploadedDocUrl, refreshPromise, frameExtractionPromise } = uploads;
  console.log(`[TRACE] uploads done in ${Date.now() - _tUploadStart}ms (photos:${uploadedPhotos.length} videos:${uploadedVideoUrls.length} audio:${uploadedAudioUrl ? 1 : 0} doc:${uploadedDocUrl ? 1 : 0})`);
  lap('uploads');

  // Storage helpers reused below (ocr_scan path still uploads within the shell).
  const { uploadPetMedia, getPublicUrl } = await import('../../lib/storage');

  // ── Skip AI path — just save entry + media, no classification ────────────────
  // Extracted to _bg/skipAIPath.ts — runs to completion even on errors (marks
  // entry as 'error' in cache rather than throwing).
  if (opts.skipAI) {
    await skipAIPath({
      qc, petId, userId, queryKey, tempId, originalEntry, text, inputType,
      uploadedPhotos, uploadedVideoUrls, videoThumbUrls, uploadedAudioUrl,
      videoDuration, audioDuration, audioOriginalName, mediaUris,
    });
    return;
  }

  try {
    // ── Await frame extraction kicked off in parallel with uploads ──────────
    // extractVideoFrames + thumbnail upload ran concurrently with the uploads
    // block above. At this point we just collect their results.
    const _tFrames = Date.now();
    const { frames: videoFramesBase64, thumbUrl: videoThumbnailUrl } = await frameExtractionPromise;
    console.log(`[TRACE] frame extraction settled in ${Date.now() - _tFrames}ms (frames:${videoFramesBase64.length} thumb:${videoThumbnailUrl ? 'yes' : 'no'})`);
    lap('frames');
    // If no tutor photos, also store the extracted thumbnail as uploadedPhotos
    // so DB photo field is populated. This check MUST happen here (after uploads
    // finished) because uploadedPhotos might have been filled by the photo
    // upload task in parallel.
    if (videoThumbnailUrl && uploadedPhotos.length === 0) {
      uploadedPhotos = [videoThumbnailUrl];
    }

    // ── Build analysis frames (photos prioritizados; vídeo contribui 1 frame) ─
    let analysisFrames: string[];
    if (photosBase64 && photosBase64.length > 0 && videoFramesBase64.length > 0) {
      analysisFrames = [...photosBase64.slice(0, 2), ...videoFramesBase64.slice(0, 1)];
    } else if (photosBase64 && photosBase64.length > 0) {
      analysisFrames = photosBase64;
    } else if (videoFramesBase64.length > 0) {
      analysisFrames = videoFramesBase64;
    } else {
      analysisFrames = [];
    }
    const analysisFramesCapped = analysisFrames.slice(0, 3);
    const hasVisualInput = analysisFramesCapped.length > 0;

    // Append additionalContext (e.g. "other pet") to text for classify
    const textForClassify = additionalContext
      ? `${text ?? ''}\n\n[CONTEXT: ${additionalContext}]`.trim()
      : text;

    // refreshSession() was kicked off in parallel with uploads — collect it here.
    // It forces a network call to exchange the refresh token for a new access
    // token — guarantees the JWT is fresh and not stale from SecureStore.
    // (getSession() reads SecureStore which can race with autoRefresh writes.)
    const _tRefresh = Date.now();
    const { data: refreshData, error: refreshError } = await refreshPromise;
    console.log(`[TRACE] refreshSession settled in ${Date.now() - _tRefresh}ms`);
    lap('refresh');
    const bgToken = refreshError || !refreshData.session
      ? (await supabase.auth.getSession()).data.session?.access_token   // fallback
      : refreshData.session.access_token;
    const bgAuthHeader: Record<string, string> = bgToken
      ? { Authorization: `Bearer ${bgToken}` }
      : {};
    console.log('[DIAG] refreshSession error:', refreshError?.message ?? 'none');
    console.log('[DIAG] bgToken present:', !!bgToken);
    console.log('[DIAG] bgToken prefix:', bgToken?.slice(0, 20) ?? 'NONE');
    console.log('[DIAG] bgAuthHeader keys:', Object.keys(bgAuthHeader).join(','));

    console.log('[S3-PRE] textForClassify length:', (textForClassify ?? '').length);
    console.log('[S3-PRE] textForClassify FULL:', textForClassify ?? '');
    console.log('[S3-PRE] analysisFramesCapped:', analysisFramesCapped.length, 'frames');
    if (inputType === 'ocr_scan') {
      const ocrBase64Size = (analysisFramesCapped[0]?.length ?? 0);
      console.log('[OCR] base64 size KB:', Math.round(ocrBase64Size / 1024 * 0.75));
    }
    // Upload OCR scanner photo to Storage so it appears in the diary card
    // AI already used the original base64 — compress here for Storage only
    if (inputType === 'ocr_scan' && analysisFramesCapped[0]) {
      try {
        const ocrBase64 = analysisFramesCapped[0];
        const ext = ocrBase64.startsWith('/9j/') ? 'jpg' : 'png';
        const tmpUri = `${FileSystem.cacheDirectory}ocr_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(tmpUri, ocrBase64, { encoding: 'base64' as any });
        const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
        const compressed = await manipulateAsync(
          tmpUri,
          [{ resize: { width: 1400 } }],
          { compress: 0.8, format: SaveFormat.JPEG, base64: false },
        );
        const ocrPath = await uploadPetMedia(userId, petId, compressed.uri, 'photo');
        const ocrUrl = getPublicUrl('pet-photos', ocrPath);
        uploadedPhotos = [ocrUrl];
        console.log('[OCR] foto upada (comprimida):', ocrUrl?.slice(0, 60));
      } catch (e) {
        console.warn('[OCR] upload foto falhou:', String(e));
      }
    }
    console.log('[S3-PRE] photosBase64:', photosBase64?.length ?? 0, 'fotos');
    console.log('[S3-PRE] inputType enviado ao classify:', inputType);
    console.log('[S3-PRE] uploadedAudioUrl presente:', !!uploadedAudioUrl, uploadedAudioUrl?.slice(0, 60) ?? 'null');
    console.log('[S3-PRE] audioDuration:', audioDuration ?? 'null');
    if (inputType === 'pet_audio') {
      console.log('[AUDIO-CLASSIFY] ▶ classify PRIMÁRIO pet_audio iniciando');
      console.log('[AUDIO-CLASSIFY] textForClassify len:', (textForClassify ?? '').length);
      console.log('[AUDIO-CLASSIFY] photosBase64 para classify:', analysisFramesCapped.length > 0 ? analysisFramesCapped.length : (photosBase64?.length ?? 0));
    }

    // ── Resolve AI analysis flags ─────────────────────────────────────────────
    // opts.aiFlags → explicit per-routine control (from AI toggle in the UI)
    // absent → all enabled (backward compat for PDF import, retry, offline sync)
    // opts.skipAI handled separately above (fast-path before try block)
    const aiFlags = opts.aiFlags ?? AI_FLAGS_ALL_ON;

    const _classifyStart = Date.now();
    console.log('[ORCH] aiFlags:', JSON.stringify(aiFlags));
    console.log('[ORCH] hasVisualInput:', hasVisualInput, '| audioUrl:', !!uploadedAudioUrl, '| docBase64:', !!opts.docBase64, '| videoUrl:', !!uploadedVideoUrls[0]);

    // O DocumentScanner já entrega o base64 preparado (2400px @ 0.92 JPEG), bem
    // abaixo do limite de ~5 MB da Claude Vision. Resize adicional aqui só
    // adicionaria ~300ms de I/O de disco e arriscaria degradar texto fino do OCR.
    const docBase64ForAI = opts.docBase64;

    // ── Decide quais rotinas são aplicáveis para ESTA entry ──────────────────
    // Usado para (a) ativar o checklist no progressStore ANTES do Promise.all,
    // (b) decidir entre runXxx() e Promise.resolve({status:'skipped'}) no map abaixo.
    const willRunText   = aiFlags.narrateText  && (!!textForClassify?.trim() || (hasVisualInput && !uploadedVideoUrls[0] && !uploadedAudioUrl));
    const willRunPhotos = aiFlags.analyzePhotos && analysisFramesCapped.length > 0 && (photosBase64?.length ?? 0) > 0;
    const willRunVideo  = aiFlags.analyzeVideo  && uploadedVideoUrls.length > 0;
    const willRunAudio  = aiFlags.analyzeAudio  && !!uploadedAudioUrl;
    const willRunOCR    = aiFlags.analyzeOCR    && !!docBase64ForAI;

    // ── Activate progress checklist ─────────────────────────────────────────
    // Cada fase aplicável começa em 'pending' e vira 'running' assim que a
    // Promise dispara (marcação via then-wrapper abaixo). Fotos têm barra
    // discreta: setPhotoTotal(tempId, tutorPhotoCount) + bumpPhoto(idx) por
    // frame settled (idx < tutorPhotoCount).
    const progressApi = useProgressStore.getState();
    if (willRunText)  progressApi.setPhase(tempId, 'text',  'pending');
    if (willRunOCR)   progressApi.setPhase(tempId, 'ocr',   'pending');
    if (willRunVideo) progressApi.setPhase(tempId, 'video', 'pending');
    if (willRunAudio) progressApi.setPhase(tempId, 'audio', 'pending');
    if (willRunPhotos) {
      const tutorPhotoCountForProgress = photosBase64?.length ?? 0;
      progressApi.setPhotoTotal(tempId, tutorPhotoCountForProgress);
    }

    // Helper que envolve uma rotina async, marcando seu estado no progressStore.
    // O Promise retornado nunca rejeita (as rotinas já convertem erros em outcome).
    const trackPhase = async <T>(
      phase: 'text' | 'ocr' | 'video' | 'audio',
      applicable: boolean,
      fn: () => Promise<T>,
      skippedOutcome: T,
    ): Promise<T> => {
      if (!applicable) return skippedOutcome;
      useProgressStore.getState().setPhase(tempId, phase, 'running');
      try {
        const out = await fn();
        return out;
      } finally {
        useProgressStore.getState().setPhase(tempId, phase, 'done');
      }
    };

    // ── Promise.all de TODAS as 5 rotinas de mídia ──────────────────────────
    // Nenhuma lança exceção — cada uma retorna RoutineOutcome<T>.
    // O card "processando" permanece na timeline até TODAS settleram, então a
    // entry real é criada com todos os dados preenchidos de uma vez.
    const authHeader = Object.keys(bgAuthHeader).length > 0 ? bgAuthHeader : {};
    const tutorPhotoCount = photosBase64?.length ?? 0;

    const [textOutcome, photosOutcome, videoOutcome, audioOutcome, ocrOutcome] = await Promise.all([
      // A: Text narration + classification (mood, tags, urgency).
      //    Quando text está presente → classifyTextOnly.
      //    Quando apenas fotos estão presentes → classifyPhotoGallery (narração a partir de visão).
      //    Entries de vídeo-only / áudio-only: narração virá do routine correspondente abaixo.
      trackPhase<TextClassificationOutcome>(
        'text',
        willRunText,
        () => runTextClassification({
          petId,
          text: textForClassify ?? null,
          photosBase64: !textForClassify?.trim() ? analysisFramesCapped : undefined,
          language: i18n.language,
          authHeader,
        }),
        { status: 'skipped', reason: aiFlags.narrateText ? 'no_input' : 'toggle_off' },
      ),

      // B: Photo analyses (per-frame via analyze-pet-photo Edge Function).
      //    Progress bar real: bumpPhoto(idx) disparado APENAS para idx < tutorPhotoCount
      //    (frames de vídeo não contam na barra "Analisando imagem X/Y").
      willRunPhotos
        ? (async (): Promise<PhotoAnalysesOutcome> => {
            // (a fase 'photos' não usa setPhase — usa setPhotoTotal + bumpPhoto)
            try {
              return await runPhotoAnalyses({
                framesBase64:    analysisFramesCapped,
                tutorPhotoCount,
                species:         opts.species ?? 'dog',
                petName:         opts.petName ?? null,
                petBreed:        opts.petBreed ?? null,
                language:        i18n.language,
                authHeader,
                onFrameComplete: (idx) => {
                  // Só conta fotos do tutor — frames de vídeo são invisíveis para o tutor.
                  if (idx < tutorPhotoCount) {
                    useProgressStore.getState().bumpPhoto(tempId);
                  }
                },
              });
            } catch {
              // runPhotoAnalyses já converte erros em outcome; defensivo apenas.
              return { status: 'error', error: new Error('runPhotoAnalyses threw') };
            }
          })()
        : Promise.resolve<PhotoAnalysesOutcome>(
            { status: 'skipped', reason: aiFlags.analyzePhotos ? 'no_input' : 'toggle_off' }
          ),

      // C: Video classification (Gemini nativo via classify-diary-entry).
      trackPhase<VideoClassificationOutcome>(
        'video',
        willRunVideo,
        () => runVideoClassification({
          petId,
          videoUrl:             uploadedVideoUrls[0],
          text:                 textForClassify ?? null,
          thumbnailFrameBase64: videoFramesBase64[0] ?? null,
          language:             i18n.language,
          authHeader,
        }),
        { status: 'skipped', reason: aiFlags.analyzeVideo ? 'no_input' : 'toggle_off' },
      ),

      // D: Audio classification (Gemini nativo via classify-diary-entry).
      trackPhase<AudioClassificationOutcome>(
        'audio',
        willRunAudio,
        () => runAudioClassification({
          petId,
          audioUrl:        uploadedAudioUrl!,
          text:            textForClassify ?? null,
          durationSeconds: audioDuration ?? null,
          language:        i18n.language,
          authHeader,
        }),
        { status: 'skipped', reason: aiFlags.analyzeAudio ? 'no_input' : 'toggle_off' },
      ),

      // E: OCR document extraction (fields, document_type, items).
      //    NOTE: document ALWAYS gets saved to diary — este outcome só controla se
      //    campos OCR são populados (o bundle do doc é sempre pushado para media_analyses).
      trackPhase<OCRClassificationOutcome>(
        'ocr',
        willRunOCR,
        () => runOCRClassification({
          petId,
          docBase64: docBase64ForAI!,
          language:  i18n.language,
          authHeader,
        }),
        { status: 'skipped', reason: aiFlags.analyzeOCR ? 'no_input' : 'toggle_off' },
      ),
    ]);

    const _classifyEnd = Date.now();
    console.log('[ORCH] duration ms (5 routines blocking):', _classifyEnd - _classifyStart);
    console.log('[ORCH] text:', textOutcome.status, '| photos:', photosOutcome.status, '| video:', videoOutcome.status, '| audio:', audioOutcome.status, '| ocr:', ocrOutcome.status);
    console.log(`[TRACE] Promise.all (5 routines) settled in ${_classifyEnd - _classifyStart}ms`);
    lap('classify');

    // ── Extract values from outcomes ─────────────────────────────────────────
    const textValue  = textOutcome.status  === 'ok' ? textOutcome.value  : null;
    const videoValue = videoOutcome.status === 'ok' ? videoOutcome.value : null;
    const audioValue = audioOutcome.status === 'ok' ? audioOutcome.value : null;
    const ocrValue   = ocrOutcome.status   === 'ok' ? ocrOutcome.value   : null;
    const photoResults = photosOutcome.status === 'ok' ? photosOutcome.value : null;

    // ── Build primary classification (prioridade: text > video > audio > stub) ─
    // text é a fonte normal; para entries video-only / audio-only, a narração
    // vem do Edge Function correspondente que também retorna mood/tags/etc.
    const stubClassification: import('../../lib/ai').ClassifyDiaryResponse = {
      classifications: [],
      primary_type:    'moment',
      narration:       null as unknown as string,
      mood:            'calm',
      mood_confidence: 0.5,
      urgency:         'none',
      clinical_metrics: [],
      suggestions:     [],
      tags_suggested:  [],
      language:        i18n.language,
      tokens_used:     0,
    };
    const primaryBase: import('../../lib/ai').ClassifyDiaryResponse =
      textValue ?? videoValue ?? audioValue ?? stubClassification;

    // Merge media-specific fields (video_analysis / pet_audio_analysis) into the
    // primary classification so finalize's fallback construction has everything.
    // These fields aren't in ClassifyDiaryResponse's strict shape — access via cast.
    const classification: import('../../lib/ai').ClassifyDiaryResponse = {
      ...primaryBase,
      // Narração: text tem prioridade; fallback para video/audio para entries sem texto.
      narration: (textValue?.narration
        ?? videoValue?.narration
        ?? audioValue?.narration
        ?? (primaryBase.narration as string | null)) as unknown as string,
    };
    (classification as Record<string, unknown>).video_analysis =
      (videoValue as Record<string, unknown> | null)?.video_analysis ?? null;
    (classification as Record<string, unknown>).pet_audio_analysis =
      (audioValue as Record<string, unknown> | null)?.pet_audio_analysis ?? null;

    // ── Derive primary photo analysis (first successful frame of tutor photos) ─
    // photoResults contém uma entrada por frame (fotos + frames de vídeo).
    // Para photo_analysis_data / linked_photo_analysis_id queremos apenas as
    // fotos do tutor (slice inicial); frames de vídeo informam apenas media_analyses.
    const photoResultsTutor: Array<Record<string, unknown> | null> = photoResults
      ? photoResults.slice(0, tutorPhotoCount > 0 ? tutorPhotoCount : photoResults.length)
      : [];
    const primaryPhotoAnalysis =
      photoResultsTutor.find((r): r is Record<string, unknown> => r != null) ?? null;

    // ── Log outcomes ─────────────────────────────────────────────────────────
    console.log('[S3] classify OK | narration:', !!classification.narration, '| usou fotos:', (photosBase64?.length ?? 0) > 0, '| frames:', videoFramesBase64.length);
    console.log('[S3] primary_type:', classification.primary_type);
    console.log('[S3] mood:', classification.mood, '| urgency:', classification.urgency);
    console.log('[S3] tokens_used:', classification.tokens_used);
    console.log('[S3] narration preview:', (classification.narration ?? '').slice(0, 100));
    console.log('[S3] classifications RAW:', JSON.stringify(classification.classifications));
    console.log('[S3] classifications:', classification.classifications?.map((c: {type: string}) => c.type));
    console.log('[S3] tags_suggested:', JSON.stringify(classification.tags_suggested));
    console.log('[S3] primaryPhotoAnalysis present:', !!primaryPhotoAnalysis);
    console.log('[S3] video_analysis present:', !!(classification as Record<string, unknown>).video_analysis);
    console.log('[S3] pet_audio_analysis present:', !!(classification as Record<string, unknown>).pet_audio_analysis);
    console.log('[S3] extracted_data:', JSON.stringify(
      classification.classifications
        ?.filter((c: {type: string}) => ['symptom','consultation','weight'].includes(c.type))
        ?.map((c: {type: string; extracted_data: Record<string,unknown>}) => ({
          type: c.type,
          data: c.extracted_data,
        }))
    ));

    // ── Partial-success toast (all 5 routines considered) ────────────────────
    {
      const outcomes = [textOutcome, photosOutcome, videoOutcome, audioOutcome, ocrOutcome];
      const attempted = outcomes.filter((o) => o.status !== 'skipped').length;
      const failed = outcomes.filter((o) => o.status === 'timeout' || o.status === 'error').length;
      if (attempted > 0 && failed > 0 && typeof opts.toast === 'function') {
        if (failed < attempted) {
          opts.toast(i18n.t('diary.aiRoutines.partialSuccess'), 'warning');
        } else {
          opts.toast(i18n.t('errors.aiRoutineFailed'), 'error');
        }
      }
    }

    // DB constraint: voice | text | gallery | video | audio | ocr_scan | pdf | pet_audio
    // NOTE: 'photo' is NOT a valid DB value — map to 'gallery'
    const inputMethod: import('../../types/database').DiaryEntry['input_method'] =
      inputType === 'ocr_scan' ? 'ocr_scan'
      : inputType === 'pdf' ? 'pdf'
      : ['photo', 'gallery'].includes(inputType) ? 'gallery'
      : inputType === 'voice' ? 'voice'
      : inputType === 'video' ? 'video'
      : inputType === 'audio' ? 'audio'
      : inputType === 'pet_audio' ? 'pet_audio'
      : 'text';

    const entryData = {
      pet_id: petId,
      user_id: userId,
      content: text ?? '(media)',
      input_method: inputMethod,
      mood_id: classification.mood,
      mood_score: Math.round((classification.mood_confidence ?? 0.5) * 100),
      mood_source: 'ai_suggested' as const,
      tags: classification.tags_suggested ?? [],
      photos: uploadedPhotos,
      is_special: false,
    };

    const _tCreate = Date.now();
    const entryId = await api.createDiaryEntry(entryData);
    console.log('[S4] entryId:', entryId?.slice(-8));
    console.log(`[TRACE] createDiaryEntry in ${Date.now() - _tCreate}ms`);
    lap('createEntry');

    if (classification.narration) {
      const _tNar = Date.now();
      await api.updateDiaryNarration(
        entryId,
        classification.narration,
        Math.round((classification.mood_confidence ?? 0.5) * 100),
        classification.tags_suggested,
      );
      console.log(`[TRACE] updateDiaryNarration in ${Date.now() - _tNar}ms — card publicado com narração em +${Date.now() - tStart}ms`);
      lap('narrationPersisted');
    } else {
      console.log(`[TRACE] no narration — card publicado sem narração em +${Date.now() - tStart}ms`);
    }

    // ── Post-creation updates (awaited by finalize via postSavePromises) ─────
    const postSavePromises: Promise<unknown>[] = [];

    // 1. Extra classification fields + typed JSONB columns (single UPDATE).
    //    Para ocr_scan: usar classificações do OCR (extracted_data corretos).
    //    Text classifier vê apenas texto mínimo e pode inferir tipos errados.
    const ocrClsArr = inputType === 'ocr_scan' && ocrValue?.classifications?.length
      ? (ocrValue.classifications as import('../../lib/ai').ClassificationResult[])
      : null;
    const extraFields: Record<string, unknown> = {
      input_type:         inputType,
      primary_type:       ocrClsArr ? (ocrValue!.primary_type ?? classification.primary_type) : classification.primary_type,
      classifications:    ocrClsArr ?? classification.classifications,
      mood_confidence:    classification.mood_confidence,
      urgency:            classification.urgency,
      photo_analysis_data: primaryPhotoAnalysis,
      video_analysis:     (classification as Record<string, unknown>).video_analysis ?? null,
      pet_audio_analysis: (classification as Record<string, unknown>).pet_audio_analysis ?? null,
    };

    postSavePromises.push(
      supabase.from('diary_entries').update(extraFields).eq('id', entryId).then(() => undefined).catch(() => {}),
    );

    // 2. Video URL + duration persistence (separate UPDATE — video_url is outside extraFields).
    if (uploadedVideoUrls.length > 0) {
      postSavePromises.push(
        supabase.from('diary_entries').update({
          video_url:      uploadedVideoUrls[0],
          video_duration: videoDuration ?? null,
        }).eq('id', entryId).then(() => undefined).catch(() => {}),
      );
    }

    // 3. Audio URL + duration persistence.
    if (uploadedAudioUrl) {
      postSavePromises.push(
        supabase.from('diary_entries').update({
          audio_url:      uploadedAudioUrl,
          audio_duration: audioDuration ?? null,
        }).eq('id', entryId).then(() => undefined).catch(() => {}),
      );
    }

    // 4. Photo analyses rows INSERT + linked_photo_analysis_id (chained).
    //    Only runs when we have successful per-photo analyses for tutor photos.
    const photoResultsTutorNonNull = photoResultsTutor.filter((r): r is Record<string, unknown> => r != null);
    if (photoResultsTutorNonNull.length > 0 && uploadedPhotos.length > 0) {
      postSavePromises.push(
        (async () => {
          try {
            const rows = photoResultsTutorNonNull.map((data, idx) => ({
              pet_id:          petId,
              user_id:         userId,
              photo_url:       uploadedPhotos[idx] ?? uploadedPhotos[0] ?? '',
              analysis_result: data,
              confidence:      typeof (data as Record<string, unknown>).confidence === 'number'
                ? ((data as Record<string, unknown>).confidence as number)
                : 0.8,
              analysis_type:   'general' as const,
            }));
            const { data: inserted } = await supabase
              .from('photo_analyses')
              .insert(rows)
              .select('id');
            if (inserted?.[0]?.id) {
              await supabase.from('diary_entries')
                .update({ linked_photo_analysis_id: inserted[0].id })
                .eq('id', entryId);
            }
          } catch (e) {
            console.warn('[PHOTO-PERSIST] insert failed:', String(e));
          }
        })(),
      );
    }

    // 5. Module saves (vaccines, consultations, etc.) + linked_*_id writes back.
    //    Para ocr_scan: usar classifications derivadas do OCR (extracted_data corretos).
    const classificationForModules: import('../../lib/ai').ClassifyDiaryResponse = ocrClsArr
      ? { ...classification, classifications: ocrClsArr }
      : classification;
    postSavePromises.push(
      saveToModule(petId, userId, entryId, classificationForModules, qc).catch((err) => {
        console.warn('[LENTES] saveToModule falhou (non-critical):', err);
      }),
    );

    // 6. Build media_analyses array (photos, videos, audio, document) + queue its UPDATE.
    //    buildMediaAnalyses muta mediaAnalysesArr + postSavePromises in place.
    //    Precisa receber photoAnalysisResults no formato PromiseSettledResult[] legado.
    const mediaAnalysesArr: Array<Record<string, unknown>> = [];
    const photoAnalysisResultsAsSettled: PromiseSettledResult<Record<string, unknown> | null>[] | null =
      photoResults
        ? photoResults.map((v) => ({ status: 'fulfilled' as const, value: v }))
        : null;

    buildMediaAnalyses({
      mediaAnalysesArr,
      postSavePromises,
      entryId,
      photoAnalysisResults: photoAnalysisResultsAsSettled,
      photosBase64,
      uploadedPhotos,
      uploadedVideoUrls,
      videoThumbnailUrl,
      uploadedAudioUrl,
      uploadedDocUrl,
      audioOriginalName,
      mediaUris,
      ocrClassification: (ocrValue as unknown as Record<string, unknown> | null),
      classification,
      inputType,
    });

    // 7. Pet insights (toxicity, low energy/locomotion) — fire-and-forget single call.
    buildInsights({ qc, petId, userId, entryId, mediaAnalysesArr });

    // ── [TRACE] Summary of blocking phases (pre-finalize) ────────────────────
    const _rel = (k: string) => t[k] != null ? `+${t[k] - tStart}ms` : '—';
    console.log('[TRACE] ═══ blocking phases summary ═══');
    console.log(`[TRACE]   uploads             ${_rel('uploads')}`);
    console.log(`[TRACE]   frames              ${_rel('frames')}`);
    console.log(`[TRACE]   refresh             ${_rel('refresh')}`);
    console.log(`[TRACE]   classify (5 par.)   ${_rel('classify')}`);
    console.log(`[TRACE]   createEntry         ${_rel('createEntry')}`);
    console.log(`[TRACE]   narrationPersisted  ${_rel('narrationPersisted')}`);
    console.log(`[TRACE]   ── elapsed to finalize: ${Date.now() - tStart}ms`);

    // ── Finalize: await postSave, fetch freshEntry, side effects, cache,
    //    setQueryData, invalidations, personality milestone ──────────────────
    const _tFin = Date.now();
    try {
      await finalize({
        qc, petId, userId, entryId, tempId, queryKey, originalEntry, text, inputType,
        uploadedPhotos, uploadedVideoUrls, uploadedAudioUrl,
        postSavePromises,
        primaryPhotoAnalysis,
        mediaAnalysesArr,
        classification,
        entryData,
      });
      console.log(`[TRACE] finalize in ${Date.now() - _tFin}ms | TOTAL pipeline: ${Date.now() - tStart}ms`);
    } finally {
      // Limpa o progressStore — o card "processando" já foi substituído pela
      // entry real na timeline, ou permanecerá em erro via updatePendingStatus.
      useProgressStore.getState().clear(tempId);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[BG] _backgroundClassifyAndSave failed:', msg);
    // Keep SQLite pending entry so useSyncQueue can retry when online
    updatePendingStatus(tempId, 'error', msg);

    qc.setQueryData<import('../../types/database').DiaryEntry[]>(queryKey as unknown as ['pets', string, 'diary'], (old) =>
      (old ?? []).map((e) => e.id === tempId ? { ...e, processing_status: 'error' as const } : e),
    );

    // Limpa o progressStore — o card fica em erro e não precisa mais do checklist.
    useProgressStore.getState().clear(tempId);
  }
}
