/**
 * NewDiaryEntry — AI-first diary entry screen.
 *
 * Universal pattern for all entry types:
 *   selector → capture → preview → [Confirmar] → router.back()
 *   Entry appears immediately in diary with processing_status='processing'.
 *   AI classification runs in background — no blocking wait.
 *
 * No ClassificationCards, no confidence %, no blocking wait screens.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Animated, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { ChevronLeft, Mic, Check, Trash2, Camera, Video, Music2, FileText, Ear, Square, Image as ImageIcon, HelpCircle, X as XIcon } from 'lucide-react-native';
import { Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../../../../constants/colors';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { spacing, radii } from '../../../../../constants/spacing';
import { useDiary } from '../../../../../hooks/useDiary';
import { usePet } from '../../../../../hooks/usePets';
import { useToast } from '../../../../../components/Toast';
import { getErrorMessage } from '../../../../../utils/errorMessages';
import { useDiaryEntry } from '../../../../../hooks/useDiaryEntry';
import { Audio } from 'expo-audio';
import DocumentScanner from '../../../../../components/diary/DocumentScanner';
import VideoRecorder from '../../../../../components/diary/VideoRecorder';
import PetAudioRecorder from '../../../../../components/diary/PetAudioRecorder';
import { AttachmentsPreview } from '../../../../../components/diary/AttachmentsPreview';
import type { Attachment } from '../../../../../components/diary/AttachmentThumb';
import {
  PhotoPreviewStep, GalleryPreviewStep, VideoPreviewStep,
  AudioPreviewStep, DocumentPreviewStep,
} from '../../../../../components/diary/CapturePreview';
import type { DocType } from '../../../../../components/diary/CapturePreview';

// ── STT (optional native module) ──────────────────────────────────────────

let SpeechModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent | null = null;
try {
  const sr = require('expo-speech-recognition');
  SpeechModule = sr.ExpoSpeechRecognitionModule;
  useSpeechEvent = sr.useSpeechRecognitionEvent;
  console.log('[STT] expo-speech-recognition loaded, SpeechModule:', !!SpeechModule);
} catch (e) {
  console.warn('[STT] expo-speech-recognition load failed:', e);
}

// ── Types ──────────────────────────────────────────────────────────────────

type Step =
  | 'mic'
  | 'text'
  | 'scanner'
  | 'document_scan'
  | 'video_record'
  | 'listen_record'
  | 'photo_preview'
  | 'gallery_preview'
  | 'video_preview'
  | 'audio_preview'
  | 'document_preview';

const FULLSCREEN_STEPS: Step[] = ['scanner', 'document_scan', 'video_record', 'listen_record'];
// 'voice' was removed — voice entries use the dedicated /diary/voice screen
const PREVIEW_STEPS: Step[] = ['photo_preview', 'gallery_preview', 'video_preview', 'audio_preview', 'document_preview'];

const WAVE_BARS = 20;

// ── Component ──────────────────────────────────────────────────────────────

export default function NewDiaryEntryScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { data: pet } = usePet(id!);
  const { entries, updateEntry, deleteEntry, isUpdating } = useDiary(id!);
  const { submitEntry } = useDiaryEntry(id!);

  const isEditing = !!edit;
  const editingEntry = isEditing ? entries.find((e) => e.id === edit) : null;
  const petName = pet?.name ?? '...';

  // ── State ────────────────────────────────────────────────────────────────

  const [step, setStep] = useState<Step>(isEditing ? 'text' : 'mic');
  const [tutorText, setTutorText] = useState(editingEntry?.content ?? '');
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');

  // Capture state (shared across preview steps)
  const [captureCaption, setCaptureCaption] = useState('');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedPhotoBase64, setCapturedPhotoBase64] = useState<string | null>(null);
  const [capturedGalleryUris, setCapturedGalleryUris] = useState<string[]>([]);
  const [capturedGalleryBase64s, setCapturedGalleryBase64s] = useState<string[]>([]);
  const [capturedVideoUri, setCapturedVideoUri] = useState<string | null>(null);
  const [capturedVideoDuration, setCapturedVideoDuration] = useState(0);
  const [capturedAudioUri, setCapturedAudioUri] = useState<string | null>(null);
  const [capturedAudioDuration, setCapturedAudioDuration] = useState(0);
  const [capturedDocBase64, setCapturedDocBase64] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocType>('other');

  // Text/voice step — multi-attachments (photos, video, pet audio, documents)
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showPetAudioModal, setShowPetAudioModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const MAX_PHOTOS    = 5;
  const MAX_VIDEOS    = 1;
  const MAX_AUDIOS    = 1;
  const MAX_DOCUMENTS = 3;

  function canAddAttachment(type: Attachment['type']): boolean {
    const limits: Record<Attachment['type'], number> = {
      photo: MAX_PHOTOS, video: MAX_VIDEOS,
      audio: MAX_AUDIOS, document: MAX_DOCUMENTS,
    };
    return attachments.filter((a) => a.type === type).length < limits[type];
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Refs ─────────────────────────────────────────────────────────────────

  const tutorTextRef = useRef(tutorText);
  tutorTextRef.current = tutorText;
  const stepRef = useRef(step);
  stepRef.current = step;
  const intentionalStopRef = useRef(false);
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  // Waveform animated bars (driven by isListening state)
  const barAnims = useRef(
    Array.from({ length: WAVE_BARS }, () => new Animated.Value(0.15)),
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // ── STT event handlers ───────────────────────────────────────────────────

  const noopHook = (_event: string, _cb: (event: never) => void) => {};
  const useEvent = useSpeechEvent ?? noopHook;

  useEvent('result', (event: { results: { transcript: string }[]; isFinal: boolean }) => {
    const transcript = event.results[0]?.transcript ?? '';
    const isPreview = PREVIEW_STEPS.includes(stepRef.current);
    if (event.isFinal) {
      if (isPreview) {
        setCaptureCaption((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript));
      } else {
        setTutorText((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript));
      }
      setInterimText('');
    } else {
      setInterimText(transcript);
    }
  });

  useEvent('end', () => {
    if (!intentionalStopRef.current && SpeechModule) {
      SpeechModule.start({
        lang: getLocales()[0]?.languageTag ?? 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
      });
      return;
    }
    setIsListening(false);
    setInterimText('');
  });

  useEvent('error', (event: { error: string }) => {
    if (event.error === 'no-speech') return;
    setInterimText('');
    // Fatal only: mic cannot recover, must stop
    const fatalErrors = ['permission', 'not-allowed', 'service-not-available'];
    if (fatalErrors.includes(event.error)) {
      intentionalStopRef.current = true;
      setIsListening(false);
      toast(t('diary.micError'), 'error');
      return;
    }
    // Non-fatal (audio interruption, recognizer_busy, network, etc.):
    // intentionalStopRef stays false → 'end' will fire next and restart automatically
  });

  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      if (SpeechModule) SpeechModule.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Waveform animation (driven by isListening) ───────────────────────────

  useEffect(() => {
    if (!isListening) {
      barAnims.forEach((anim) => {
        Animated.timing(anim, { toValue: 0.15, duration: 400, useNativeDriver: true }).start();
      });
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
      return;
    }

    const animateBars = () => {
      barAnims.forEach((anim, i) => {
        const phase = Math.sin((Date.now() / 200) + i * 0.4) * 0.25;
        const target = Math.max(0.1, Math.min(1, 0.4 + phase + (Math.random() * 0.3)));
        Animated.timing(anim, { toValue: target, duration: 200, useNativeDriver: true }).start();
      });
    };
    animateBars();
    const intervalId = setInterval(animateBars, 200);

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current.start();

    return () => {
      clearInterval(intervalId);
      pulseLoopRef.current?.stop();
      pulseAnim.setValue(1);
    };
  }, [isListening, barAnims, pulseAnim]);

  // ── STT helpers ──────────────────────────────────────────────────────────

  const startListening = useCallback(async () => {
    if (!SpeechModule) {
      toast(t('diary.micUnavailable'), 'warning');
      return;
    }
    const { granted } = await SpeechModule.requestPermissionsAsync();
    if (!granted) {
      toast(t('diary.micPermission'), 'warning');
      return;
    }
    intentionalStopRef.current = false;
    setIsListening(true);
    setInterimText('');
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (_e) { /* ignorar — não crítico */ }
    SpeechModule.start({
      lang: getLocales()[0]?.languageTag ?? 'pt-BR',
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 10000,
        EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 0,
      },
    });
  }, [toast, t]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    if (SpeechModule && isListening) SpeechModule.stop();
    setIsListening(false);
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    }).catch(() => { /* ignorar */ });
  }, [isListening]);

  const handleMicToggle = useCallback(async () => {
    if (isListening) stopListening();
    else await startListening();
  }, [isListening, stopListening, startListening]);

  // ── Input selector handlers ───────────────────────────────────────────────

  const handleSelectPhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      const FileSystem = require('expo-file-system/legacy');
      const base64: string = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      setCapturedPhotoUri(uri);
      setCapturedPhotoBase64(base64);
      setCaptureCaption('');
      setStep('photo_preview');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [toast, t]);

  const handleSelectGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.galleryPermission'), 'warning'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5,
        quality: 0.5,
        orderedSelection: true,
      });
      if (result.canceled || result.assets.length === 0) return;
      const uris = result.assets.map((a) => a.uri);
      const FileSystem = require('expo-file-system/legacy');
      const base64Array: string[] = await Promise.all(
        uris.map((uri) => FileSystem.readAsStringAsync(uri, { encoding: 'base64' })),
      );
      setCapturedGalleryUris(uris);
      setCapturedGalleryBase64s(base64Array);
      setCaptureCaption('');
      setStep('gallery_preview');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [toast, t]);

  const handleSelectScanner = useCallback(() => setStep('scanner'), []);

  const handleSelectDocument = useCallback(() => {
    setCapturedDocBase64(null);
    setDocType('other');
    setStep('document_scan');
  }, []);

  const handleSelectVideo = useCallback(() => setStep('video_record'), []);
  const handleSelectListen = useCallback(() => setStep('listen_record'), []);

  const handleSelectVoice = useCallback(() => {
    if (!SpeechModule) {
      toast(t('diary.micUnavailableDevBuild'), 'warning');
      return;
    }
    // Replace so that ← from voice screen goes to diary, not back to selector
    router.replace(`/pet/${id}/diary/voice` as never);
  }, [router, id, toast, t]);

  const handleSelectText = useCallback(() => {
    setTutorText('');
    setStep('text');
  }, []);

  // ── Scanner / capture callbacks (from full-screen components) ─────────────

  const handleScannerCapture = useCallback((base64: string) => {
    if (stepRef.current === 'document_scan') {
      // Document flow → show type selector before confirming
      setCapturedDocBase64(base64);
      setStep('document_preview');
    } else {
      // Quick OCR scan → submit immediately
      void submitEntry({ text: null, photosBase64: [base64], inputType: 'ocr_scan' });
      router.back();
    }
  }, [submitEntry, router]);

  const handleVideoCapture = useCallback(async (uri: string, durationSeconds: number) => {
    setCapturedVideoUri(uri);
    setCapturedVideoDuration(durationSeconds);
    setCaptureCaption('');
    setStep('video_preview');
  }, []);

  const handleAudioCapture = useCallback(async (uri: string, durationSeconds: number) => {
    setCapturedAudioUri(uri);
    setCapturedAudioDuration(durationSeconds);
    setCaptureCaption('');
    setStep('audio_preview');
  }, []);

  // ── Confirm handlers (from preview steps) ────────────────────────────────

  const handleConfirmPhoto = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: [capturedPhotoBase64!],
      inputType: 'photo',
      mediaUris: [capturedPhotoUri!],
    });
    router.back();
  }, [captureCaption, capturedPhotoBase64, capturedPhotoUri, submitEntry, router]);

  const handleConfirmGallery = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: capturedGalleryBase64s,
      inputType: 'gallery',
      mediaUris: capturedGalleryUris,
    });
    router.back();
  }, [captureCaption, capturedGalleryBase64s, capturedGalleryUris, submitEntry, router]);

  const handleConfirmVideo = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: null,
      inputType: 'video',
      mediaUris: [capturedVideoUri!],
      videoDuration: capturedVideoDuration,
    });
    router.back();
  }, [captureCaption, capturedVideoUri, capturedVideoDuration, submitEntry, router]);

  const handleConfirmAudio = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: null,
      inputType: 'pet_audio',
      mediaUris: [capturedAudioUri!],
      audioDuration: capturedAudioDuration,
    });
    router.back();
  }, [captureCaption, capturedAudioUri, capturedAudioDuration, submitEntry, router]);

  const handleConfirmDocument = useCallback(() => {
    // Pass docType as text so the classifier has explicit context
    void submitEntry({
      text: docType !== 'other' ? docType : null,
      photosBase64: [capturedDocBase64!],
      inputType: 'ocr_scan',
    });
    router.back();
  }, [docType, capturedDocBase64, submitEntry, router]);

  // ── Attachment handlers (text/voice step) ───────────────────────────────

  const handleAttachPhoto = useCallback(async () => {
    if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); return; }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.galleryPermission'), 'warning'); return; }
      const remaining = MAX_PHOTOS - attachments.filter((a) => a.type === 'photo').length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
      });
      if (result.canceled || result.assets.length === 0) return;
      const FileSystem = require('expo-file-system/legacy');
      const newPhotos: Attachment[] = await Promise.all(
        result.assets.map(async (asset) => {
          const base64: string = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
          return {
            id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'photo' as const,
            localUri:     asset.uri,
            thumbnailUri: asset.uri,
            mimeType:     asset.mimeType ?? 'image/jpeg',
            base64,
          };
        }),
      );
      setAttachments((prev) => [...prev, ...newPhotos]);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [attachments, canAddAttachment, toast, t]);

  const handleAttachTakePhoto = useCallback(async () => {
    if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled || !result.assets[0]) return;
      const FileSystem = require('expo-file-system/legacy');
      const base64: string = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });
      setAttachments((prev) => [...prev, {
        id:           `photo-${Date.now()}`,
        type:         'photo' as const,
        localUri:     result.assets[0].uri,
        thumbnailUri: result.assets[0].uri,
        mimeType:     'image/jpeg',
        base64,
      }]);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { if (wasListening) await startListening(); }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  // ── Galeria unificada — fotos, vídeos e documentos num único picker ──────

  const handleAttachGallery = useCallback(async () => {
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const FileSystem = require('expo-file-system/legacy');
      const newAttachments: Attachment[] = [];

      for (const asset of result.assets) {
        const mime = asset.mimeType ?? '';
        if (mime.startsWith('image/')) {
          if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); continue; }
          const base64: string = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' });
          newAttachments.push({
            id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'photo',
            localUri:     asset.uri,
            thumbnailUri: asset.uri,
            mimeType:     mime,
            fileName:     asset.name,
            base64,
          });
        } else if (mime.startsWith('video/')) {
          if (!canAddAttachment('video')) { toast(t('mic.maxVideos'), 'warning'); continue; }
          newAttachments.push({
            id:       `video-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:     'video',
            localUri: asset.uri,
            mimeType: mime,
            fileName: asset.name,
            fileSize: asset.size,
          });
        } else {
          if (!canAddAttachment('document')) { toast(t('mic.maxDocuments'), 'warning'); continue; }
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

      if (newAttachments.length > 0) setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { if (wasListening) await startListening(); }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const handleAttachVideo = useCallback(async () => {
    if (!canAddAttachment('video')) { toast(t('mic.maxVideos'), 'warning'); return; }
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
      setAttachments((prev) => [...prev, {
        id:       `video-${Date.now()}`,
        type:     'video' as const,
        localUri: result.assets[0].uri,
        duration: result.assets[0].duration ?? undefined,
        mimeType: 'video/mp4',
      }]);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { if (wasListening) await startListening(); }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const handleAttachDocument = useCallback(async () => {
    if (!canAddAttachment('document')) { toast(t('mic.maxDocuments'), 'warning'); return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setAttachments((prev) => [...prev, {
        id:       `doc-${Date.now()}`,
        type:     'document' as const,
        localUri: asset.uri,
        fileName: asset.name,
        fileSize: asset.size,
        mimeType: asset.mimeType ?? 'application/octet-stream',
      }]);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally { if (wasListening) await startListening(); }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const onPetAudioCaptured = useCallback(async (uri: string, duration: number) => {
    setAttachments((prev) => [...prev, {
      id:       `audio-${Date.now()}`,
      type:     'audio' as const,
      localUri: uri,
      duration,
      mimeType: 'audio/m4a',
    }]);
    setShowPetAudioModal(false);
  }, []);

  // ── Text step handlers ────────────────────────────────────────────────────

  const handleSubmitText = useCallback(() => {
    const text = tutorText.trim();
    const hasContent = text.length >= 3 || attachments.length > 0;
    if (!hasContent) {
      toast(t('diary.contentMin'), 'warning');
      return;
    }
    const photoAttachments = attachments.filter((a) => a.type === 'photo');
    const photosBase64 = photoAttachments.length > 0
      ? photoAttachments.map((a) => a.base64!).filter(Boolean)
      : null;
    const mediaUris = attachments.map((a) => a.localUri);
    const inputType = photoAttachments.length > 0 ? 'gallery' : 'text';
    void submitEntry({ text: text || null, photosBase64, inputType, mediaUris });
    router.back();
  }, [tutorText, attachments, toast, t, submitEntry, router]);

  // ── Edit mode handlers ────────────────────────────────────────────────────

  const handleSaveEdit = useCallback(async () => {
    if (!edit) return;
    const text = tutorText.trim();
    if (text.length < 3) {
      toast(t('diary.contentMin'), 'warning');
      return;
    }
    try {
      await updateEntry({ id: edit, content: text });
      toast(t('diary.updated'), 'success');
      router.back();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [edit, tutorText, updateEntry, toast, t, router]);

  const handleDelete = useCallback(async () => {
    if (!edit) return;
    const yes = await confirm({ text: t('diary.deleteConfirmDiary'), type: 'warning' });
    if (!yes) return;
    try {
      await deleteEntry(edit);
      toast(t('diary.deleted'), 'success');
      router.back();
    } catch {
      toast(t('diary.deleteFailed'), 'error');
    }
  }, [edit, deleteEntry, confirm, toast, t, router]);

  // ── Back navigation ───────────────────────────────────────────────────────

  const handleBack = useCallback(async () => {
    if (PREVIEW_STEPS.includes(step)) {
      const discard = await confirm({ text: t('diary.discardCapture'), type: 'warning' });
      if (!discard) return;
    }
    stopListening();
    if (step !== 'mic') {
      setStep('mic');
    } else {
      router.back();
    }
  }, [step, confirm, t, stopListening, router]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Full-screen capture components ───────────────── */}
      {(step === 'scanner' || step === 'document_scan') && (
        <DocumentScanner onCapture={handleScannerCapture} onClose={handleBack} />
      )}
      {step === 'video_record' && (
        <VideoRecorder onCapture={handleVideoCapture} onClose={handleBack} />
      )}
      {step === 'listen_record' && (
        <PetAudioRecorder petName={petName} onCapture={handleAudioCapture} onClose={handleBack} />
      )}

      {/* ── Header (all non-fullscreen steps) ────────────── */}
      {!FULLSCREEN_STEPS.includes(step) && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <ChevronLeft size={rs(20)} color={colors.accent} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isEditing ? t('diary.editEntry') : t('diary.newEntry')}
          </Text>
          {isEditing ? (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={rs(18)} color={colors.danger} strokeWidth={1.8} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.helpBtn} onPress={() => setShowHelp(true)} activeOpacity={0.7}>
              <HelpCircle size={rs(20)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Preview steps ─────────────────────────────────── */}
      {step === 'photo_preview' && capturedPhotoUri && (
        <PhotoPreviewStep
          photoUri={capturedPhotoUri}
          caption={captureCaption}
          onCaptionChange={setCaptureCaption}
          isListening={isListening}
          onMicToggle={handleMicToggle}
          onConfirm={handleConfirmPhoto}
        />
      )}
      {step === 'gallery_preview' && capturedGalleryUris.length > 0 && (
        <GalleryPreviewStep
          uris={capturedGalleryUris}
          caption={captureCaption}
          onCaptionChange={setCaptureCaption}
          isListening={isListening}
          onMicToggle={handleMicToggle}
          onConfirm={handleConfirmGallery}
          petName={petName}
        />
      )}
      {step === 'video_preview' && capturedVideoUri && (
        <VideoPreviewStep
          durationSeconds={capturedVideoDuration}
          caption={captureCaption}
          onCaptionChange={setCaptureCaption}
          isListening={isListening}
          onMicToggle={handleMicToggle}
          onConfirm={handleConfirmVideo}
        />
      )}
      {step === 'audio_preview' && capturedAudioUri && (
        <AudioPreviewStep
          durationSeconds={capturedAudioDuration}
          petName={petName}
          context={captureCaption}
          onContextChange={setCaptureCaption}
          isListening={isListening}
          onMicToggle={handleMicToggle}
          onConfirm={handleConfirmAudio}
        />
      )}
      {step === 'document_preview' && capturedDocBase64 !== null && (
        <DocumentPreviewStep
          docBase64={capturedDocBase64}
          docType={docType}
          onDocTypeChange={setDocType}
          onConfirm={handleConfirmDocument}
        />
      )}

      {/* ── Pet audio modal (from attachment button) ────── */}
      {showPetAudioModal && (
        <PetAudioRecorder
          petName={petName}
          onCapture={onPetAudioCaptured}
          onClose={() => setShowPetAudioModal(false)}
        />
      )}

      {/* ── Help modal ───────────────────────────────────── */}
      <Modal visible={showHelp} transparent animationType="slide" onRequestClose={() => setShowHelp(false)}>
        <TouchableOpacity style={styles.helpBackdrop} activeOpacity={1} onPress={() => setShowHelp(false)} />
        <View style={[styles.helpSheet, { paddingBottom: rs(spacing.lg) + insets.bottom }]}>
          <View style={styles.helpHandle} />
          <View style={styles.helpHeader}>
            <Text style={styles.helpTitle}>{t('mic.helpTitle')}</Text>
            <TouchableOpacity onPress={() => setShowHelp(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <XIcon size={rs(20)} color={colors.textSec} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {[
            { icon: <Mic size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpMic'), desc: t('mic.helpMicDesc') },
            { icon: <Camera size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpFoto'), desc: t('mic.helpFotoDesc') },
            { icon: <Video size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpVideo'), desc: t('mic.helpVideoDesc') },
            { icon: <Ear size={rs(22)} color={colors.rose} strokeWidth={1.8} />, title: t('mic.helpSom'), desc: t('mic.helpSomDesc') },
            { icon: <ImageIcon size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpGaleria'), desc: t('mic.helpGaleriaDesc') },
          ].map((item, idx) => (
            <View key={idx} style={styles.helpItem}>
              <View style={styles.helpItemIcon}>{item.icon}</View>
              <View style={styles.helpItemText}>
                <Text style={styles.helpItemTitle}>{item.title}</Text>
                <Text style={styles.helpItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Modal>

      {/* ── Mic / Unified entry step ──────────────────────── */}
      {step === 'mic' && !isEditing && (
        <>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.micContent, { paddingBottom: rs(120) + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Waveform card */}
            <View style={styles.waveCard}>
              <View style={styles.waveRow}>
                {barAnims.map((anim, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        transform: [{ scaleY: anim }],
                        opacity: anim.interpolate({ inputRange: [0.1, 1], outputRange: [0.3, 1] }),
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Transcription card — editable TextInput */}
            <View style={styles.transcriptionCard}>
              <TextInput
                style={styles.transcriptionInput}
                value={tutorText}
                onChangeText={setTutorText}
                placeholder={t('mic.placeholder', { name: petName })}
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={2000}
              />
              {interimText.length > 0 && (
                <Text style={styles.interimText}>{interimText}</Text>
              )}
            </View>

            {/* Attachments */}
            <AttachmentsPreview attachments={attachments} onRemove={removeAttachment} />

            {/* 4 attachment buttons: Foto · Vídeo · Som · Galeria */}
            <View style={styles.attachRow}>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachTakePhoto} activeOpacity={0.7}>
                <Camera size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachVideo} activeOpacity={0.7}>
                <Video size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addVideo')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachThumb}
                onPress={() => {
                  if (!canAddAttachment('audio')) { toast(t('mic.maxAudios'), 'warning'); return; }
                  setShowPetAudioModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ear size={rs(18)} color={colors.rose} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addPetAudio')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachGallery} activeOpacity={0.7}>
                <ImageIcon size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addPhoto')}</Text>
              </TouchableOpacity>
            </View>

            {/* AI hint */}
            <Text style={styles.aiHint}>{t('mic.aiHint', { name: petName })}</Text>
          </ScrollView>

          {/* Bottom bar: mic toggle + record button */}
          <View style={[styles.micBottomBar, { paddingBottom: rs(spacing.md) + insets.bottom }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.micBtn, isListening && styles.micBtnActive]}
                onPress={handleMicToggle}
                activeOpacity={0.8}
              >
                {isListening
                  ? <Square size={rs(24)} color="#fff" strokeWidth={2} fill="#fff" />
                  : <Mic size={rs(28)} color={colors.accent} strokeWidth={1.8} />
                }
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={[
                styles.recordBtn,
                (tutorText.trim().length < 3 && attachments.length === 0) && styles.recordBtnDisabled,
              ]}
              onPress={handleSubmitText}
              disabled={tutorText.trim().length < 3 && attachments.length === 0}
              activeOpacity={0.8}
            >
              <Check size={rs(16)} color="#fff" strokeWidth={2} />
              <Text style={styles.recordBtnText}>{t('mic.recordInDiary')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── Text step ─────────────────────────────────────── */}
      {step === 'text' && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.textContainer}>
            <Text style={styles.textLabel}>{t('diary.whatHappened')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                value={tutorText}
                onChangeText={setTutorText}
                placeholder={t('diary.contentPlaceholder')}
                placeholderTextColor={colors.placeholder}
                multiline
                autoFocus={!isEditing}
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.inlineMic, isListening && styles.inlineMicActive]}
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.7}
              >
                <Mic size={rs(18)} color={colors.accent} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
            {interimText.length > 0 && (
              <Text style={styles.interimText}>{interimText}</Text>
            )}

            {/* Attachments preview + buttons (hidden in edit mode) */}
            {!isEditing && (
              <>
                <AttachmentsPreview attachments={attachments} onRemove={removeAttachment} />
                <View style={styles.attachRow}>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachPhoto} activeOpacity={0.7}>
                    <Camera size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addPhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachTakePhoto} activeOpacity={0.7}>
                    <Camera size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachVideo} activeOpacity={0.7}>
                    <Video size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addVideo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.attachBtn}
                    onPress={() => {
                      if (!canAddAttachment('audio')) { toast(t('mic.maxAudios'), 'warning'); return; }
                      setShowPetAudioModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Music2 size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addPetAudio')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachDocument} activeOpacity={0.7}>
                    <FileText size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addDocument')}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {isEditing ? (
              <TouchableOpacity
                style={[styles.primaryBtn, isUpdating && styles.primaryBtnDisabled]}
                onPress={handleSaveEdit}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                <Check size={rs(18)} color="#fff" strokeWidth={2} />
                <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, (tutorText.trim().length < 3 && attachments.length === 0) && styles.primaryBtnDisabled]}
                onPress={handleSubmitText}
                disabled={tutorText.trim().length < 3 && attachments.length === 0}
                activeOpacity={0.8}
              >
                <Check size={rs(18)} color="#fff" strokeWidth={2} />
                <Text style={styles.primaryBtnText}>{t('diary.confirmEntry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.lg),
    paddingBottom: rs(spacing.sm),
    gap: rs(spacing.sm),
  },
  backBtn: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, color: colors.text,
    fontSize: fs(17), fontFamily: 'Sora_700Bold',
  },
  deleteBtn: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBtn: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.accentGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(11,18,25,0.6)',
  },
  helpSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(radii.modal),
    borderTopRightRadius: rs(radii.modal),
    padding: rs(spacing.lg),
    gap: rs(spacing.md),
  },
  helpHandle: {
    width: rs(40), height: rs(5),
    borderRadius: rs(3),
    backgroundColor: colors.textGhost,
    alignSelf: 'center',
    marginBottom: rs(spacing.sm),
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(spacing.sm),
  },
  helpTitle: {
    color: colors.text,
    fontSize: fs(17),
    fontFamily: 'Sora_700Bold',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(spacing.md),
  },
  helpItemIcon: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  helpItemText: {
    flex: 1,
    gap: rs(4),
  },
  helpItemTitle: {
    color: colors.text,
    fontSize: fs(14),
    fontFamily: 'Sora_600SemiBold',
  },
  helpItemDesc: {
    color: colors.textSec,
    fontSize: fs(13),
    fontFamily: 'Sora_400Regular',
    lineHeight: fs(13) * 1.5,
  },

  // Text step
  textContainer: {
    flex: 1, padding: rs(spacing.md), gap: rs(spacing.md),
  },
  textLabel: {
    color: colors.textSec, fontSize: fs(13),
    fontFamily: 'Sora_600SemiBold', letterSpacing: 0.4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1.5, borderColor: colors.border,
    padding: rs(spacing.md),
    maxHeight: rs(300),
  },
  textInput: {
    flex: 1, color: colors.text,
    fontSize: fs(15), fontFamily: 'Sora_400Regular',
    lineHeight: fs(22), textAlignVertical: 'top',
  },
  inlineMic: {
    alignSelf: 'flex-end',
    width: rs(36), height: rs(36),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.accentGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  inlineMicActive: { backgroundColor: colors.accentMed },
  interimText: {
    color: colors.textDim, fontSize: fs(13),
    fontFamily: 'Sora_400Regular',
    fontStyle: 'italic', marginHorizontal: rs(4),
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(spacing.xs),
    backgroundColor: colors.accent,
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3, shadowRadius: rs(12), elevation: 6,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  attachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(spacing.xs),
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(8),
    paddingHorizontal: rs(12),
  },
  attachLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
  },
  primaryBtnText: {
    color: '#fff', fontSize: fs(15),
    fontFamily: 'Sora_700Bold',
  },

  // Mic / unified entry step
  micContent: {
    padding: rs(spacing.md),
    gap: rs(spacing.md),
  },
  waveCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.xxl),
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: rs(20),
    paddingHorizontal: rs(16),
    justifyContent: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: rs(52),
  },
  waveBar: {
    width: rs(4),
    height: rs(40),
    borderRadius: rs(3),
    backgroundColor: colors.accent,
  },
  transcriptionCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: rs(100),
    padding: rs(spacing.md),
  },
  transcriptionInput: {
    color: colors.text,
    fontSize: fs(15),
    fontFamily: 'Sora_400Regular',
    lineHeight: fs(22),
    textAlignVertical: 'top',
    minHeight: rs(80),
  },
  attachThumb: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(12),
  },
  aiHint: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.accent,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: rs(16),
  },
  micBottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.sm),
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  micBtn: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDark,
  },
  recordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(spacing.xs),
    backgroundColor: colors.accent,
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(12),
    elevation: 6,
  },
  recordBtnDisabled: { opacity: 0.4 },
  recordBtnText: {
    color: '#fff',
    fontSize: fs(15),
    fontFamily: 'Sora_700Bold',
  },
});
