/**
 * Attachment handlers (text/voice step) — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same bodies, same console.log/console.warn
 * messages, same ordering, same deps arrays, same Platform.OS android
 * sleep(2000), same base64 read patterns, same wasListening stop/start
 * dance, same isPickerOpenRef guard.
 *
 * Exposes `useAttachmentHandlers(params)` — custom hook that returns the
 * 9 useCallback handlers + onPetAudioCaptured.
 */
import { useCallback, type MutableRefObject } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { Attachment } from '../../../../../../components/diary/AttachmentThumb';
import { MEDIA_LIMITS } from '../../../../../../constants/media';
import { getErrorMessage } from '../../../../../../utils/errorMessages';
import { compressPhoto } from './compressPhoto';
import type { Step } from './types';

type UseAttachmentHandlersParams = {
  attachments: Attachment[];
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>;
  setStep: React.Dispatch<React.SetStateAction<Step>>;
  setShowPetAudioModal: React.Dispatch<React.SetStateAction<boolean>>;
  isPickerOpenRef: MutableRefObject<boolean>;
  isListeningRef: MutableRefObject<boolean>;
  stepRef: MutableRefObject<Step>;
  prevStepRef: MutableRefObject<Step>;
  canAddAttachment: (type: Attachment['type'], alreadyPending?: number) => boolean;
  attachmentDeniedMsg: (type: Attachment['type']) => string;
  analyzeWithAI: boolean;
  MAX_SLOTS: number;
  MAX_PHOTOS: number;
  stopListening: () => void;
  startListening: () => Promise<void>;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export function useAttachmentHandlers({
  attachments,
  setAttachments,
  setStep,
  setShowPetAudioModal,
  isPickerOpenRef,
  isListeningRef,
  stepRef,
  prevStepRef,
  canAddAttachment,
  attachmentDeniedMsg,
  analyzeWithAI,
  MAX_SLOTS,
  MAX_PHOTOS,
  stopListening,
  startListening,
  toast,
  t,
}: UseAttachmentHandlersParams) {
  const handleAttachPhoto = useCallback(async () => {
    console.log('[ATTACH] handleAttachPhoto iniciado');
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    console.log('[ATTACH] abrindo picker...');
    isPickerOpenRef.current = true;
    if (!canAddAttachment('photo')) { toast(attachmentDeniedMsg('photo'), 'warning'); isPickerOpenRef.current = false; return; }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.galleryPermission'), 'warning'); return; }
      const remaining = !analyzeWithAI
        ? Math.max(1, MAX_SLOTS - attachments.length)
        : MAX_PHOTOS - attachments.filter((a) => a.type === 'photo').length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return;
      result.assets.forEach((a, i) => {
        console.log(`[ATTACH] photo selecionada[${i}] | uri:`, a.uri?.slice(-30), '| size original:', a.fileSize);
      });
      const newPhotos: Attachment[] = [];
      for (const asset of result.assets) {
        const compressed = await compressPhoto(asset.uri);
        console.log(`[ATTACH] photo comprimida | size:`, compressed.size);
        if (compressed.size && compressed.size > MEDIA_LIMITS.photo.maxSizeBytes) {
          toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
          continue;
        }
        newPhotos.push({
          id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type:         'photo' as const,
          localUri:     compressed.uri,
          thumbnailUri: compressed.uri,
          mimeType:     asset.mimeType ?? 'image/jpeg',
          fileSize:     compressed.size,
          // base64 not stored here — read lazily in handleSubmitText
        });
      }
      setAttachments((prev) => [...prev, ...newPhotos]);
      console.log('[ATTACH] fotos adicionadas | total:', attachments.length + newPhotos.length);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      if (Platform.OS === 'android') { await new Promise(r => setTimeout(r, 2000)); }
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — liberando guard');
    }
  }, [attachments, canAddAttachment, toast, t]);

  // ── In-app camera (replaces launchCameraAsync to prevent Android process death) ──
  // launchCameraAsync launches an external Activity; Android kills the Expo JS
  // process to free memory, causing a full app restart and losing all state.
  // PhotoCamera uses CameraView directly inside the app — no process death risk.

  const handleAttachTakePhoto = useCallback(() => {
    console.log('[ATTACH] handleAttachTakePhoto → abrindo PhotoCamera in-app | step:', stepRef.current);
    if (!canAddAttachment('photo')) {
      toast(attachmentDeniedMsg('photo'), 'warning');
      return;
    }
    prevStepRef.current = stepRef.current;
    console.log('[ATTACH] prevStep salvo:', prevStepRef.current);
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    setStep('photo_camera');
  }, [canAddAttachment, attachmentDeniedMsg, stopListening, toast]);

  // Receives compressed URI from PhotoCamera after shutter or gallery pick
  const handlePhotoCameraCapture = useCallback((uri: string) => {
    console.log('[ATTACH] handlePhotoCameraCapture | uri suffix:', uri?.slice(-40));
    setStep(prevStepRef.current);
    console.log('[ATTACH] step restaurado para:', prevStepRef.current);
    setAttachments((prev) => {
      const next = [...prev, {
        id:           `photo-${Date.now()}`,
        type:         'photo' as const,
        localUri:     uri,
        thumbnailUri: uri,
        mimeType:     'image/jpeg',
      }];
      console.log('[ATTACH] foto adicionada via PhotoCamera | total:', next.length);
      return next;
    });
  }, []);

  // User pressed back in PhotoCamera without capturing
  const handlePhotoCameraClose = useCallback(() => {
    console.log('[ATTACH] handlePhotoCameraClose | restaurando step:', prevStepRef.current);
    setStep(prevStepRef.current);
  }, []);

  // ── Galeria unificada — fotos, vídeos e documentos num único picker ──────

  const handleAttachGallery = useCallback(async () => {
    console.log('[ATTACH] handleAttachGallery iniciado');
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    console.log('[ATTACH] abrindo picker...');
    isPickerOpenRef.current = true;
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.length) return;
      console.log('[ATTACH] galeria selecionada | assets:', result.assets.length);
      result.assets.forEach((a, i) => {
        console.log(`[ATTACH] asset[${i}]: type=${a.mimeType} size=${a.size} name=${a.name}`);
      });

      const newAttachments: Attachment[] = [];

      for (const asset of result.assets) {
        const mime = asset.mimeType ?? '';
        if (mime.startsWith('image/')) {
          if (!canAddAttachment('photo', newAttachments.length)) { toast(attachmentDeniedMsg('photo'), 'warning'); continue; }
          const compressed = await compressPhoto(asset.uri);
          if (compressed.size && compressed.size > MEDIA_LIMITS.photo.maxSizeBytes) {
            toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
            continue;
          }
          newAttachments.push({
            id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'photo',
            localUri:     compressed.uri,
            thumbnailUri: compressed.uri,
            mimeType:     mime,
            fileName:     asset.name,
            fileSize:     compressed.size,
            // base64 not stored here — read lazily in handleSubmitText
          });
        } else if (mime.startsWith('video/')) {
          if (!canAddAttachment('video', newAttachments.length)) { toast(attachmentDeniedMsg('video'), 'warning'); continue; }
          newAttachments.push({
            id:       `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:     'video',
            localUri: asset.uri,
            mimeType: mime,
            fileName: asset.name,
            fileSize: asset.size,
          });
        } else if (mime.startsWith('audio/')) {
          if (!canAddAttachment('audio', newAttachments.length)) { toast(attachmentDeniedMsg('audio'), 'warning'); continue; }
          if (asset.size && asset.size > MEDIA_LIMITS.audio.maxSizeBytes) {
            toast(t('diary.audioTooLarge', { max: MEDIA_LIMITS.audio.maxSizeMB }), 'warning');
            continue;
          }
          newAttachments.push({
            id:       `audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:     'audio',
            localUri: asset.uri,
            mimeType: mime,
            fileName: asset.name,
            fileSize: asset.size,
          });
        } else {
          if (!canAddAttachment('document', newAttachments.length)) { toast(attachmentDeniedMsg('document'), 'warning'); continue; }
          newAttachments.push({
            id:       `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:     'document',
            localUri: asset.uri,
            mimeType: mime || 'application/octet-stream',
            fileName: asset.name,
            fileSize: asset.size,
          });
        }
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
        console.log('[ATTACH] galeria adicionada | total:', attachments.length + newAttachments.length);
      }
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      if (Platform.OS === 'android') { await new Promise(r => setTimeout(r, 2000)); }
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — liberando guard');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const handleAttachVideo = useCallback(async () => {
    console.log('[ATTACH] handleAttachVideo iniciado');
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    console.log('[ATTACH] abrindo picker...');
    isPickerOpenRef.current = true;
    if (!canAddAttachment('video')) { toast(attachmentDeniedMsg('video'), 'warning'); isPickerOpenRef.current = false; return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.galleryPermission'), 'warning'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 60,
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      console.log('[ATTACH] video selecionado | uri:', asset.uri?.slice(-30), '| size:', asset.fileSize, '| duration:', asset.duration);
      if (asset.duration != null && asset.duration > MEDIA_LIMITS.video.maxDurationSec * 1000) {
        toast(t('diary.videoTooLong', { max: MEDIA_LIMITS.video.maxDurationSec }), 'warning');
        return;
      }
      if (asset.fileSize != null && asset.fileSize > MEDIA_LIMITS.video.maxSizeBytes) {
        toast(t('diary.videoTooLarge', { max: MEDIA_LIMITS.video.maxSizeMB }), 'warning');
        return;
      }
      setAttachments((prev) => [...prev, {
        id:       `video-${Date.now()}`,
        type:     'video' as const,
        localUri: asset.uri,
        duration: asset.duration ?? undefined,
        mimeType: 'video/mp4',
      }]);
      console.log('[ATTACH] video adicionado | total:', attachments.length + 1);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      if (Platform.OS === 'android') { await new Promise(r => setTimeout(r, 2000)); }
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — liberando guard');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const handleAttachDocument = useCallback(async () => {
    console.log('[ATTACH] handleAttachDocument iniciado');
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    console.log('[ATTACH] abrindo picker...');
    isPickerOpenRef.current = true;
    if (!canAddAttachment('document')) { toast(attachmentDeniedMsg('document'), 'warning'); isPickerOpenRef.current = false; return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
        copyToCacheDirectory: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (asset.size != null && asset.size > MEDIA_LIMITS.document.maxSizeBytes) {
        toast(t('diary.documentTooLarge', { max: MEDIA_LIMITS.document.maxSizeMB }), 'warning');
        return;
      }
      setAttachments((prev) => [...prev, {
        id:       `doc-${Date.now()}`,
        type:     'document' as const,
        localUri: asset.uri,
        fileName: asset.name,
        fileSize: asset.size,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      }]);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      if (Platform.OS === 'android') { await new Promise(r => setTimeout(r, 2000)); }
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — liberando guard');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  // ── Fotos + vídeos — ImagePicker (roda dentro da Activity do app, sem crash) ─
  const handleAttachMedia = useCallback(async () => {
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    isPickerOpenRef.current = true;
    console.log('[ATTACH] abrindo ImagePicker (fotos+vídeos)...');

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.galleryPermission'), 'warning'); return; }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
        videoMaxDuration: MEDIA_LIMITS.video.maxDurationSec,
        selectionLimit: !analyzeWithAI ? Math.max(1, MAX_SLOTS - attachments.length) : 10,
        orderedSelection: true,
      });

      if (result.canceled || !result.assets?.length) return;

      console.log('[ATTACH] ImagePicker selecionados:', result.assets.length);

      const newAttachments: Attachment[] = [];
      for (const asset of result.assets) {
        if (asset.type === 'image') {
          if (!canAddAttachment('photo', newAttachments.length)) { toast(attachmentDeniedMsg('photo'), 'warning'); continue; }
          const compressed = await compressPhoto(asset.uri);
          if (compressed.size && compressed.size > MEDIA_LIMITS.photo.maxSizeBytes) {
            toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
            continue;
          }
          newAttachments.push({
            id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'photo',
            localUri:     compressed.uri,
            thumbnailUri: compressed.uri,
            mimeType:     'image/jpeg',
            fileSize:     compressed.size,
          });
        } else if (asset.type === 'video') {
          if (!canAddAttachment('video', newAttachments.length)) { toast(attachmentDeniedMsg('video'), 'warning'); continue; }
          if (asset.fileSize && asset.fileSize > MEDIA_LIMITS.video.maxSizeBytes) {
            toast(t('diary.videoTooLarge', { max: MEDIA_LIMITS.video.maxSizeMB }), 'warning');
            continue;
          }
          newAttachments.push({
            id:           `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'video',
            localUri:     asset.uri,
            thumbnailUri: asset.uri,
            mimeType:     'video/mp4',
            duration:     asset.duration ? asset.duration / 1000 : undefined,
            fileSize:     asset.fileSize,
          });
        }
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
        console.log('[ATTACH] total após seleção:', attachments.length + newAttachments.length);
      }

    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — guard liberado');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  // ── Áudio de arquivo — DocumentPicker (uma única vez) ──────────────────────
  const handleAttachAudio = useCallback(async () => {
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    isPickerOpenRef.current = true;
    console.log('[ATTACH] abrindo DocumentPicker (áudio)...');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'audio/mpeg',   // MP3
          'audio/mp3',    // MP3 (alias)
          'audio/mp4',    // M4A / AAC
          'audio/aac',    // AAC
          'audio/x-m4a',  // M4A (iOS)
          'audio/wav',    // WAV
          'audio/wave',   // WAV (alias)
          'audio/ogg',    // OGG
          'audio/flac',   // FLAC
          'audio/webm',   // WebM audio
        ],
        multiple: false,
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets?.length) {
        console.log('[AUDIO-PICK] cancelado ou sem assets');
        return;
      }

      const asset = result.assets[0];
      console.log('[AUDIO-PICK] asset selecionado:', {
        name: asset.name,
        uri: asset.uri?.slice(-60),
        mimeType: asset.mimeType,
        size: asset.size,
        isContentUri: asset.uri?.startsWith('content://'),
      });

      if (!canAddAttachment('audio')) { toast(attachmentDeniedMsg('audio'), 'warning'); return; }
      if (asset.size && asset.size > MEDIA_LIMITS.audio.maxSizeBytes) {
        console.warn('[AUDIO-PICK] arquivo muito grande:', asset.size, '>', MEDIA_LIMITS.audio.maxSizeBytes);
        toast(t('diary.audioTooLarge', { max: MEDIA_LIMITS.audio.maxSizeMB }), 'warning');
        return;
      }

      setAttachments((prev) => [...prev, {
        id:       `audio-${Date.now()}`,
        type:     'audio',
        localUri: asset.uri,
        mimeType: asset.mimeType ?? 'audio/mpeg',
        fileName: asset.name,
        fileSize: asset.size,
      }]);
      console.log('[AUDIO-PICK] ✅ áudio anexado:', asset.name, '| uri scheme:', asset.uri?.split('://')[0]);

    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — guard liberado');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const onPetAudioCaptured = useCallback(async (uri: string, duration: number) => {
    console.log('[AUDIO-REC] capturado via PetAudioRecorder:', {
      uri: uri?.slice(-60),
      duration,
      isContentUri: uri?.startsWith('content://'),
      isFileUri: uri?.startsWith('file://'),
    });
    setAttachments((prev) => [...prev, {
      id:       `audio-${Date.now()}`,
      type:     'audio' as const,
      localUri: uri,
      duration,
      mimeType: 'audio/m4a',
    }]);
    setShowPetAudioModal(false);
  }, []);

  return {
    handleAttachPhoto,
    handleAttachTakePhoto,
    handlePhotoCameraCapture,
    handlePhotoCameraClose,
    handleAttachGallery,
    handleAttachVideo,
    handleAttachDocument,
    handleAttachMedia,
    handleAttachAudio,
    onPetAudioCaptured,
  };
}
