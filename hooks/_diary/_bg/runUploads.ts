/**
 * runUploads — Parallel media uploads + side-promises (Tier A of backgroundClassify).
 *
 * Kicks off three concurrent groups of work that do NOT depend on each other:
 *   (a) refreshPromise — supabase.auth.refreshSession() so JWT is fresh before AI calls
 *   (b) frameExtractionPromise — local video frame extraction + thumbnail upload
 *   (c) Promise.allSettled of 4 uploads (photos, videos, audio, document)
 *
 * Returns the upload results plus the (a)+(b) promises un-awaited so the caller
 * can collect them later in parallel with the AI orchestration.
 *
 * Verbatim extraction from backgroundClassify.ts — preserves all console.logs,
 * all error handling, all behavior.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../../lib/supabase';

export async function runUploads(opts: {
  userId: string;
  petId: string;
  photos: string[];
  photosBase64: string[] | null;
  inputType: string;
  mediaUris: string[] | undefined;
  hasVideo: boolean | undefined;
  docBase64: string | undefined;
  audioOriginalName: string | undefined;
  skipAI: boolean | undefined;
}) {
  const { userId, petId, photos, photosBase64, inputType, mediaUris, audioOriginalName } = opts;

  // Upload all media types in parallel before classify so URLs are ready
  let uploadedPhotos: string[] = photos;
  let uploadedVideoUrls: string[] = [];
  let videoThumbUrls: (string | null)[] = [];
  let uploadedAudioUrl: string | null = null;
  let uploadedDocUrl: string | null = null;

  const { uploadPetMedia, getPublicUrl } = await import('../../../lib/storage');

  // ── M2: Kick off tasks that DON'T depend on uploaded URLs in parallel ─────
  // These three run concurrently with the uploads Promise.allSettled below:
  //   (a) refreshSession() — ~200ms network to auth endpoint
  //   (b) video frame extraction + thumbnail upload — ~500ms local CPU + short upload
  //   (c) uploads (photos/videos/audio/doc) — ~1-3s network to Storage
  // Wall-time saving: ~400-700ms when video + AI are present.
  //
  // IMPORTANT: These promises NEVER throw — failures degrade gracefully so
  // the outer Promise.allSettled + awaits remain safe.

  // (a) Refresh the Supabase JWT in parallel with uploads so the auth header
  // is ready by the time the AI orchestration begins.
  const refreshPromise = supabase.auth.refreshSession().catch((err) => {
    console.warn('[M2] refreshSession threw:', String(err));
    return { data: { session: null } as any, error: err as any };
  });

  // (b) Extract video frames + upload thumbnail IN PARALLEL with uploads.
  // Frame extraction uses the local video URI (no upload needed), and the
  // thumbnail upload is a small file — together they finish before the main
  // video upload typically completes. Skipped entirely in skipAI path.
  const frameExtractionPromise: Promise<{ frames: string[]; thumbUrl: string | null }> = (() => {
    if (opts.skipAI) return Promise.resolve({ frames: [], thumbUrl: null });
    const needsFrames = (inputType === 'video' || opts.hasVideo) && (mediaUris?.length ?? 0) > 0;
    if (!needsFrames) return Promise.resolve({ frames: [], thumbUrl: null });

    const ph = photosBase64?.length ?? 0;
    const videoUriLocal = (mediaUris ?? []).slice(ph)[0]
      ?? mediaUris?.find((u) => /\.(mp4|mov|webm|m4v|avi)$/i.test(u ?? ''))
      ?? null;
    if (!videoUriLocal) return Promise.resolve({ frames: [], thumbUrl: null });

    return (async () => {
      try {
        const [{ extractVideoFrames }, VideoThumbnails] = await Promise.all([
          import('../../../lib/videoAnalysis'),
          import('expo-video-thumbnails'),
        ]);
        // Limit to 1 frame when photos are also present to avoid OOM with mixed media
        const maxFrames = ph > 0 ? 1 : 3;
        const frames = await extractVideoFrames(videoUriLocal, maxFrames);
        console.log('[S3] frames extraídos do vídeo:', frames.length, '(maxFrames:', maxFrames, ')');

        // Upload first frame as thumbnail for video card display (always, regardless of photos)
        let thumbUrl: string | null = null;
        if (frames.length > 0) {
          try {
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(videoUriLocal, { time: 1000, quality: 0.3 });
            const thumbPath = await uploadPetMedia(userId, petId, thumbUri, 'photo');
            thumbUrl = getPublicUrl('pet-photos', thumbPath);
            console.log('[S3] frame thumbnail upado:', thumbUrl?.slice(0, 60));
          } catch (e) {
            console.warn('[BG] frame thumbnail upload failed:', String(e));
          }
        }
        return { frames, thumbUrl };
      } catch (e) {
        console.warn('[BG] frame extraction failed:', String(e));
        return { frames: [], thumbUrl: null };
      }
    })();
  })();

  // Photos: first N URIs that are not video or audio
  // AI path: N = photosBase64.length (explicit count)
  // skip-AI path: infer from URI extension (docs excluded — they come via docBase64, not mediaUris)
  // Android content:// URIs have no extension — treat them as non-photo only when inputType is video/audio
  const nonMediaRe = /\.(mp4|mov|webm|m4v|avi|m4a|aac|mp3|wav|ogg)$/i;
  const isVideoOrAudioEntry = inputType === 'video' || inputType === 'pet_audio';
  const photoCount = photosBase64?.length
    ?? (isVideoOrAudioEntry
      ? 0  // video/audio-only: no photo URIs in mediaUris (avoid miscounting content:// video as photo)
      : (mediaUris ?? []).filter((u) => !nonMediaRe.test(u ?? '')).length);
  const photoUris = photoCount > 0 ? (mediaUris ?? []).slice(0, photoCount) : [];
  // Video/audio: the URI right after the photos (if any)
  const mediaUri = (mediaUris ?? []).slice(photoCount)[0] ?? undefined;

  await Promise.allSettled([
    // 1. Photos — compress + upload whenever photoUris exist
    //    (no longer gated on photosBase64 — skip-AI path has no base64 but still needs upload)
    (async () => {
      if (photoUris.length === 0) return;
      try {
        const ImageManipulator = require('expo-image-manipulator');
        const paths = await Promise.all(
          photoUris.map(async (uri) => {
            try {
              const comp = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1200 } }],
                { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG },
              );
              return uploadPetMedia(userId, petId, comp.uri, 'photo');
            } catch {
              return uploadPetMedia(userId, petId, uri, 'photo');
            }
          }),
        );
        uploadedPhotos = paths.map((p) => getPublicUrl('pet-photos', p));
      } catch (e) {
        console.warn('[BG] photo upload failed:', String(e));
      }
    })(),

    // 2. Videos — upload all video URIs + generate thumbnails (may be multiple)
    (async () => {
      // Match by extension OR by Android content:// URI when inputType is video
      const videoUris = (mediaUris ?? []).filter((u) =>
        /\.(mp4|mov|webm|m4v|avi)$/i.test(u ?? '') ||
        (isVideoOrAudioEntry && inputType === 'video' && (u?.startsWith('content://') ?? false))
      );
      if (videoUris.length === 0) return;
      try {
        const VideoThumbnails = await import('expo-video-thumbnails');
        const results = await Promise.all(
          videoUris.map(async (u) => {
            const videoPath = await uploadPetMedia(userId, petId, u, 'video');
            const videoUrl = getPublicUrl('pet-photos', videoPath);
            let thumbUrl: string | null = null;
            try {
              const { uri: thumbLocalUri } = await VideoThumbnails.getThumbnailAsync(u, { time: 1000, quality: 0.3 });
              const thumbPath = await uploadPetMedia(userId, petId, thumbLocalUri, 'photo');
              thumbUrl = getPublicUrl('pet-photos', thumbPath);
            } catch {
              // thumbnail optional — video still works without it
            }
            return { videoUrl, thumbUrl };
          }),
        );
        uploadedVideoUrls = results.map((r) => r.videoUrl);
        videoThumbUrls = results.map((r) => r.thumbUrl);
      } catch (e) {
        console.warn('[BG] video upload failed:', String(e));
      }
    })(),

    // 3. Audio — primary: mediaUri (after photos); fallback: scan by extension or content:// audio
    (async () => {
      const isAudioUri = (u: string | undefined) =>
        /\.(m4a|aac|mp3|wav|ogg)$/i.test(u ?? '') ||
        (u?.startsWith('content://') && /audio/i.test(u));
      const aUri = inputType === 'pet_audio'
        ? (mediaUri ?? mediaUris?.[0])
        : mediaUris?.find(isAudioUri);
      console.log('[AUDIO-UP] inputType:', inputType);
      console.log('[AUDIO-UP] mediaUri (slot após fotos):', mediaUri?.slice(-60) ?? 'undefined');
      console.log('[AUDIO-UP] mediaUris completo:', JSON.stringify(mediaUris?.map(u => u?.slice(-50))));
      console.log('[AUDIO-UP] aUri resolvido:', aUri?.slice(-60) ?? 'NULL — upload será pulado');
      if (!aUri) {
        console.warn('[AUDIO-UP] ⚠️ nenhum URI de áudio encontrado — upload pulado');
        return;
      }
      console.log('[AUDIO-UP] scheme:', aUri.split('://')[0], '| isContent:', aUri.startsWith('content://'));
      const t0 = Date.now();
      try {
        // content:// URIs from Android DocumentPicker must be copied to a temp file first
        let uploadUri = aUri;
        if (aUri.startsWith('content://')) {
          const ext = audioOriginalName?.split('.').pop() ?? 'm4a';
          const tmpPath = `${FileSystem.cacheDirectory}audio_up_${Date.now()}.${ext}`;
          await FileSystem.copyAsync({ from: aUri, to: tmpPath });
          uploadUri = tmpPath;
          console.log('[AUDIO-UP] content:// copiado para tmp:', tmpPath.slice(-50));
        }
        const path = await uploadPetMedia(userId, petId, uploadUri, 'video', audioOriginalName ?? undefined); // audio stored in video bucket — originalName preserves extension
        uploadedAudioUrl = getPublicUrl('pet-photos', path);
        console.log('[AUDIO-UP] ✅ upload OK em', Date.now() - t0, 'ms | path:', path);
        console.log('[AUDIO-UP] publicUrl:', uploadedAudioUrl?.slice(0, 80));
      } catch (e) {
        console.warn('[AUDIO-UP] ❌ upload falhou em', Date.now() - t0, 'ms:', String(e));
      }
    })(),

    // 4. Scanned document — write base64 to tmp file, compress, then upload to storage
    // Skip for ocr_scan entries: the doc image is already uploaded via the OCR path above.
    // AI already used the original base64 — compress here for Storage only.
    (async () => {
      if (!opts.docBase64) return;
      if (inputType === 'ocr_scan') return;
      try {
        const ext = opts.docBase64.startsWith('/9j/') ? 'jpg' : 'png';
        const tmpUri = `${FileSystem.cacheDirectory}doc_attach_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(tmpUri, opts.docBase64, { encoding: 'base64' as any });
        const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
        const compressed = await manipulateAsync(
          tmpUri,
          [{ resize: { width: 1400 } }],
          { compress: 0.8, format: SaveFormat.JPEG, base64: false },
        );
        const docPath = await uploadPetMedia(userId, petId, compressed.uri, 'photo');
        uploadedDocUrl = getPublicUrl('pet-photos', docPath);
        console.log('[DOC-ATTACH] doc upado (comprimido):', uploadedDocUrl?.slice(0, 60));
      } catch (e) {
        console.warn('[DOC-ATTACH] upload falhou:', String(e));
      }
    })(),
  ]);

  console.log('[S2] uploadedPhotos:', uploadedPhotos?.length, uploadedPhotos?.[0]?.slice(0,60));
  console.log('[S2] uploadedVideoUrls:', uploadedVideoUrls.length, uploadedVideoUrls[0]?.slice(0,60));
  console.log('[S2] uploadedAudioUrl:', uploadedAudioUrl?.slice(0,60));

  return {
    uploadedPhotos,
    uploadedVideoUrls,
    videoThumbUrls,
    uploadedAudioUrl,
    uploadedDocUrl,
    refreshPromise,
    frameExtractionPromise,
  };
}
