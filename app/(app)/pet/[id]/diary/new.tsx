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
import { ChevronLeft, Mic, Check, Trash2, Camera, Video, Music2, FileText, Ear, Square, Image as ImageIcon, HelpCircle, PawPrint, X as XIcon, ShieldCheck, Stethoscope, FlaskConical, Pill, Scale, DollarSign, ThermometerSun, Utensils, AlertTriangle, Scissors, Activity, ShoppingBag, MapPin, Sparkles } from 'lucide-react-native';
import { Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../../../../constants/colors';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { spacing, radii } from '../../../../../constants/spacing';
import { MEDIA_LIMITS } from '../../../../../constants/media';
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

// ── DotsText — animated trailing dots for the overlay title ──────────────────

function DotsText({
  baseText,
  dotsAnim,
  style,
}: {
  baseText: string;
  dotsAnim: Animated.Value;
  style?: object;
}) {
  const [dots, setDots] = React.useState('');

  React.useEffect(() => {
    const id = dotsAnim.addListener(({ value }) => {
      setDots('.'.repeat(Math.round(value)));
    });
    return () => dotsAnim.removeListener(id);
  }, [dotsAnim]);

  return <Text style={style}>{baseText}{dots}</Text>;
}

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
  // base64 no longer stored in state — read lazily at confirm/submit time to avoid OOM
  const [capturedGalleryUris, setCapturedGalleryUris] = useState<string[]>([]);
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
  const [helpTab, setHelpTab] = useState<'uso' | 'painel'>('uso');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
  const isPickerOpenRef = useRef(false);

  // Waveform animated bars (driven by isListening state)
  const barAnims = useRef(
    Array.from({ length: WAVE_BARS }, () => new Animated.Value(0.15)),
  ).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const pawAnim    = useRef(new Animated.Value(1)).current;
  const pawLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const ringAnim    = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const dotsAnim    = useRef(new Animated.Value(0)).current;

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
      // No base64 read here — deferred to handleConfirmPhoto to avoid OOM
      setCapturedPhotoUri(uri);
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
      // No base64 read here — deferred to handleConfirmGallery to avoid OOM
      setCapturedGalleryUris(uris);
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
      showAnalyzingAndBack();
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

  // ── Analyzing overlay (shown 2s after Gravar no Diário) ─────────────────

  const showAnalyzingAndBack = useCallback(() => {
    setIsAnalyzing(true);

    // Pata — pulso suave, never shrinks below 1.0
    const pawLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pawAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pawAnim, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
      ]),
    );

    // Anel externo — ripple: expands and fades
    ringAnim.setValue(0.8);
    ringOpacity.setValue(0.6);
    const ringLoop = Animated.loop(
      Animated.parallel([
        Animated.timing(ringAnim,    { toValue: 1.6, duration: 1400, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0,   duration: 1400, useNativeDriver: true }),
      ]),
    );

    // Dots — 0 → 1 → 2 → 3 → 0 (not native driver — drives JS state)
    const dotsLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 2, duration: 400, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 3, duration: 400, useNativeDriver: false }),
        Animated.timing(dotsAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]),
    );

    pawLoopRef.current = pawLoop;
    pawLoop.start();
    ringLoop.start();
    dotsLoop.start();

    setTimeout(() => {
      pawLoop.stop();
      ringLoop.stop();
      dotsLoop.stop();
      pawAnim.setValue(1);
      router.back();
    }, 2500);
  }, [pawAnim, ringAnim, ringOpacity, dotsAnim, router]);

  // ── Confirm handlers (from preview steps) ────────────────────────────────

  const handleConfirmPhoto = useCallback(async () => {
    showAnalyzingAndBack();
    let b64: string | null = null;
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      b64 = await readAsStringAsync(capturedPhotoUri!, { encoding: EncodingType.Base64 });
    } catch (e) {
      console.warn('[handleConfirmPhoto] base64 read failed:', e);
    }
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: b64 ? [b64] : null,
      inputType: 'photo',
      mediaUris: [capturedPhotoUri!],
    });
  }, [captureCaption, capturedPhotoUri, submitEntry, showAnalyzingAndBack]);

  const handleConfirmGallery = useCallback(async () => {
    showAnalyzingAndBack();
    let galleryBase64: string[] | null = null;
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      const results: string[] = [];
      for (const uri of capturedGalleryUris) {
        const b64 = await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
        if (b64) results.push(b64);
      }
      galleryBase64 = results.length > 0 ? results : null;
    } catch (e) {
      console.warn('[handleConfirmGallery] base64 read failed:', e);
    }
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: galleryBase64,
      inputType: 'gallery',
      mediaUris: capturedGalleryUris,
    });
  }, [captureCaption, capturedGalleryUris, submitEntry, showAnalyzingAndBack]);

  const handleConfirmVideo = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: null,
      inputType: 'video',
      mediaUris: [capturedVideoUri!],
      videoDuration: capturedVideoDuration,
    });
    showAnalyzingAndBack();
  }, [captureCaption, capturedVideoUri, capturedVideoDuration, submitEntry, showAnalyzingAndBack]);

  const handleConfirmAudio = useCallback(() => {
    void submitEntry({
      text: captureCaption.trim() || null,
      photosBase64: null,
      inputType: 'pet_audio',
      mediaUris: [capturedAudioUri!],
      audioDuration: capturedAudioDuration,
    });
    showAnalyzingAndBack();
  }, [captureCaption, capturedAudioUri, capturedAudioDuration, submitEntry, showAnalyzingAndBack]);

  const handleConfirmDocument = useCallback(() => {
    // Pass docType as text so the classifier has explicit context
    void submitEntry({
      text: docType !== 'other' ? docType : null,
      photosBase64: [capturedDocBase64!],
      inputType: 'ocr_scan',
    });
    showAnalyzingAndBack();
  }, [docType, capturedDocBase64, submitEntry, showAnalyzingAndBack]);

  // ── Attachment handlers (text/voice step) ───────────────────────────────

  const handleAttachPhoto = useCallback(async () => {
    console.log('[ATTACH] handleAttachPhoto iniciado');
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    console.log('[ATTACH] abrindo picker...');
    isPickerOpenRef.current = true;
    if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); isPickerOpenRef.current = false; return; }
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
      result.assets.forEach((a, i) => {
        console.log(`[ATTACH] photo selecionada[${i}] | uri:`, a.uri?.slice(-30), '| size:', a.fileSize);
      });
      const newPhotos: Attachment[] = result.assets
        .filter((asset) => {
          if (asset.fileSize && asset.fileSize > MEDIA_LIMITS.photo.maxSizeBytes) {
            toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
            return false;
          }
          return true;
        })
        .map((asset) => ({
          id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type:         'photo' as const,
          localUri:     asset.uri,
          thumbnailUri: asset.uri,
          mimeType:     asset.mimeType ?? 'image/jpeg',
          fileSize:     asset.fileSize,
          // base64 not stored here — read lazily in handleSubmitText
        }));
      setAttachments((prev) => [...prev, ...newPhotos]);
      console.log('[ATTACH] photo adicionada | total attachments:', attachments.length + newPhotos.length);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      if (Platform.OS === 'android') { await new Promise(r => setTimeout(r, 2000)); }
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — liberando guard');
    }
  }, [attachments, canAddAttachment, toast, t]);

  const handleAttachTakePhoto = useCallback(async () => {
    console.log('[ATTACH] handleAttachTakePhoto iniciado');
    if (isPickerOpenRef.current) { console.log('[ATTACH] picker já aberto — ignorando'); return; }
    console.log('[ATTACH] abrindo picker...');
    isPickerOpenRef.current = true;
    if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); isPickerOpenRef.current = false; return; }
    const wasListening = isListeningRef.current;
    if (wasListening) stopListening();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      console.log('[ATTACH] foto câmera | uri:', asset.uri?.slice(-30), '| size:', asset.fileSize);
      if (asset.fileSize && asset.fileSize > MEDIA_LIMITS.photo.maxSizeBytes) {
        toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
        return;
      }
      setAttachments((prev) => [...prev, {
        id:           `photo-${Date.now()}`,
        type:         'photo' as const,
        localUri:     asset.uri,
        thumbnailUri: asset.uri,
        mimeType:     'image/jpeg',
        fileSize:     asset.fileSize,
        // base64 not stored here — read lazily in handleSubmitText
      }]);
      console.log('[ATTACH] foto câmera adicionada | total:', attachments.length + 1);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      if (Platform.OS === 'android') { await new Promise(r => setTimeout(r, 2000)); }
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — liberando guard');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

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
          if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); continue; }
          if (asset.size && asset.size > MEDIA_LIMITS.photo.maxSizeBytes) {
            toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
            continue;
          }
          newAttachments.push({
            id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'photo',
            localUri:     asset.uri,
            thumbnailUri: asset.uri,
            mimeType:     mime,
            fileName:     asset.name,
            fileSize:     asset.size,
            // base64 not stored here — read lazily in handleSubmitText
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
    if (!canAddAttachment('video')) { toast(t('mic.maxVideos'), 'warning'); isPickerOpenRef.current = false; return; }
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
    if (!canAddAttachment('document')) { toast(t('mic.maxDocuments'), 'warning'); isPickerOpenRef.current = false; return; }
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
        selectionLimit: 10,
        orderedSelection: true,
      });

      if (result.canceled || !result.assets?.length) return;

      console.log('[ATTACH] ImagePicker selecionados:', result.assets.length);

      const newAttachments: Attachment[] = [];
      for (const asset of result.assets) {
        if (asset.type === 'image') {
          if (!canAddAttachment('photo')) { toast(t('mic.maxPhotos'), 'warning'); continue; }
          if (asset.fileSize && asset.fileSize > MEDIA_LIMITS.photo.maxSizeBytes) {
            toast(t('diary.photoTooLarge', { max: MEDIA_LIMITS.photo.maxSizeMB }), 'warning');
            continue;
          }
          newAttachments.push({
            id:           `photo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type:         'photo',
            localUri:     asset.uri,
            thumbnailUri: asset.uri,
            mimeType:     'image/jpeg',
            fileSize:     asset.fileSize,
          });
        } else if (asset.type === 'video') {
          if (!canAddAttachment('video')) { toast(t('mic.maxVideos'), 'warning'); continue; }
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
        type: 'audio/*',
        multiple: false,
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      if (!canAddAttachment('audio')) { toast(t('mic.maxAudios'), 'warning'); return; }
      if (asset.size && asset.size > MEDIA_LIMITS.audio.maxSizeBytes) {
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
      console.log('[ATTACH] áudio adicionado:', asset.name);

    } catch (err) { toast(getErrorMessage(err), 'error'); }
    finally {
      isPickerOpenRef.current = false;
      console.log('[ATTACH] picker fechado — guard liberado');
      if (wasListening) await startListening();
    }
  }, [attachments, canAddAttachment, stopListening, startListening, toast, t]);

  const onPetAudioCaptured = useCallback(async (uri: string, duration: number) => {
    console.log('[ATTACH] audio adicionado | uri:', uri?.slice(-30), '| duration:', duration);
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

  const handleSubmitText = useCallback(async () => {
    console.log('[SUBMIT] handleSubmitText chamado');
    console.log('[SUBMIT] attachments:', attachments.length);
    attachments.forEach((a, i) => {
      console.log(`[SUBMIT] attachment[${i}]: type=${a.type} uri=${a.localUri?.slice(-30)} size=${a.fileSize}`);
    });

    const text = tutorText.trim();

    const hasContent = text.length >= 3 || attachments.length > 0;
    if (!hasContent) {
      toast(t('diary.contentMin'), 'warning');
      return;
    }

    const photoAttachments = attachments.filter((a) => a.type === 'photo');
    const videoAttachments = attachments.filter((a) => a.type === 'video');
    const audioAttachments = attachments.filter((a) => a.type === 'audio');
    const docAttachments   = attachments.filter((a) => a.type === 'document');

    // Determine inputType for classify:
    // fotos + vídeo → 'gallery' (prompt clínico vê fotos; hasVideo garante extração de frames)
    // só vídeo      → 'video'   (prompt de comportamento)
    let inputType = 'text';
    if (videoAttachments.length > 0 && photoAttachments.length > 0) {
      inputType = 'gallery';  // classify usa prompt clínico das fotos
    } else if (videoAttachments.length > 0) {
      inputType = 'video';
    } else if (audioAttachments.length > 0) {
      inputType = 'pet_audio';
    } else if (photoAttachments.length > 0) {
      inputType = 'gallery';
    } else if (docAttachments.length > 0) {
      inputType = 'ocr_scan';
    }
    const hasVideo = videoAttachments.length > 0;

    // Log BEFORE base64 read so we know if crash is during read or before
    console.log('[S1] handleSubmitText iniciado');
    console.log('[S1] inputType:', inputType);
    console.log('[S1] photoAttachments:', photoAttachments.length);
    console.log('[S1] videoAttachments:', videoAttachments.length);
    console.log('[S1] audioAttachments:', audioAttachments.length);

    // Read base64 only at submit time — sequentially + compressed to avoid OOM with 10 media
    // Max 3 photos for AI analysis — remaining photos (4-10) are upload-only (no AI)
    const photosForAI     = photoAttachments.slice(0, 3);
    const photosOnlyUpload = photoAttachments.slice(3);
    let photosBase64: string[] | null = null;
    if (photosForAI.length > 0) {
      console.log('[S1] iniciando leitura de base64 (', photosForAI.length, 'fotos para IA,', photosOnlyUpload.length, 'só upload)...');
      try {
        const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
        const ImageManipulator = require('expo-image-manipulator');
        const results: string[] = [];
        for (const photo of photosForAI) {
          console.log('[S1] comprimindo foto:', photo.localUri.slice(-30));
          const compressed = await ImageManipulator.manipulateAsync(
            photo.localUri,
            [{ resize: { width: 800 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
          );
          console.log('[S1] lendo base64 comprimida:', compressed.uri.slice(-30));
          const b64 = await readAsStringAsync(compressed.uri, { encoding: EncodingType.Base64 });
          console.log('[S1] base64 lido:', Math.round(b64.length * 0.75 / 1024), 'KB');
          if (b64) results.push(b64);
        }
        photosBase64 = results.length > 0 ? results : null;
      } catch (e) {
        console.warn('[S1] base64 read failed:', e);
        photosBase64 = null;
      }
    }

    // All attachment URIs: photos first, then video/audio (order matters for BG upload logic)
    const mediaUris = [
      ...photoAttachments.map((a) => a.localUri),
      ...videoAttachments.map((a) => a.localUri),
      ...audioAttachments.map((a) => a.localUri),
    ].filter((uri): uri is string => !!uri);

    const videoDuration = videoAttachments[0]?.duration
      ? Math.round(videoAttachments[0].duration) : undefined;
    const audioDuration = audioAttachments[0]?.duration
      ? Math.round(audioAttachments[0].duration) : undefined;

    console.log('[S1] submitEntry chamado | photosBase64:', photosBase64?.length ?? 0, '| mediaUris:', mediaUris.length, mediaUris);
    void submitEntry({
      text: text || null,
      photosBase64,
      inputType,
      mediaUris,
      videoDuration,
      audioDuration,
      hasVideo,
    });
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

          {/* Tab toggle */}
          <View style={styles.helpTabRow}>
            <TouchableOpacity
              style={[styles.helpTabBtn, helpTab === 'uso' && styles.helpTabBtnActive]}
              onPress={() => setHelpTab('uso')}
              activeOpacity={0.7}
            >
              <Text style={[styles.helpTabText, helpTab === 'uso' && styles.helpTabTextActive]}>
                {t('mic.helpTabUso')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.helpTabBtn, helpTab === 'painel' && styles.helpTabBtnActive]}
              onPress={() => setHelpTab('painel')}
              activeOpacity={0.7}
            >
              <Text style={[styles.helpTabText, helpTab === 'painel' && styles.helpTabTextActive]}>
                {t('mic.helpTabPainel')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Como usar */}
          {helpTab === 'uso' && (
            <>
              {[
                { icon: <Mic size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpMic'), desc: t('mic.helpMicDesc') },
                { icon: <Camera size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpFoto'), desc: t('mic.helpFotoDesc'), limit: t('mic.helpFotoLimit', { max: MEDIA_LIMITS.photo.maxSizeMB, count: MEDIA_LIMITS.photo.maxCount }) },
                { icon: <Video size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpVideo'), desc: t('mic.helpVideoDesc'), limit: t('mic.helpVideoLimit', { maxSec: MEDIA_LIMITS.video.maxDurationSec, maxMB: MEDIA_LIMITS.video.maxSizeMB }) },
                { icon: <Ear size={rs(22)} color={colors.rose} strokeWidth={1.8} />, title: t('mic.helpSom'), desc: t('mic.helpSomDesc'), limit: t('mic.helpAudioLimit', { max: MEDIA_LIMITS.audio.maxDurationSec }) },
                { icon: <ImageIcon size={rs(22)} color={colors.accent} strokeWidth={1.8} />, title: t('mic.helpGaleria'), desc: t('mic.helpGaleriaDesc') },
              ].map((item, idx) => (
                <View key={idx} style={styles.helpItem}>
                  <View style={styles.helpItemIcon}>{item.icon}</View>
                  <View style={styles.helpItemText}>
                    <Text style={styles.helpItemTitle}>{item.title}</Text>
                    <Text style={styles.helpItemDesc}>{item.desc}</Text>
                    {'limit' in item && item.limit ? <Text style={styles.helpItemLimit}>{item.limit}</Text> : null}
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Painel de lentes */}
          {helpTab === 'painel' && <PainelLentes t={t} />}
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

            {attachments.length > 0 && (
              <Text style={styles.mediaDisclaimer}>{t('diary.mediaDisclaimer')}</Text>
            )}

            {/* 4 attachment buttons: Câmera · Fotos+Vídeos · Áudio · Som do pet */}
            <View style={styles.attachRow}>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachTakePhoto} activeOpacity={0.7}>
                <Camera size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachMedia} activeOpacity={0.7}>
                <ImageIcon size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addMedia')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachAudio} activeOpacity={0.7}>
                <Music2 size={rs(18)} color={colors.gold} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addAudio')}</Text>
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
              onPress={() => { console.log('[BTN] Gravar no Diário pressionado'); void handleSubmitText(); }}
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

                {attachments.length > 0 && (
                  <Text style={styles.mediaDisclaimer}>{t('diary.mediaDisclaimer')}</Text>
                )}

                <View style={styles.attachRow}>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachTakePhoto} activeOpacity={0.7}>
                    <Camera size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachMedia} activeOpacity={0.7}>
                    <ImageIcon size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addMedia')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachAudio} activeOpacity={0.7}>
                    <Music2 size={rs(18)} color={colors.gold} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addAudio')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.attachBtn}
                    onPress={() => {
                      if (!canAddAttachment('audio')) { toast(t('mic.maxAudios'), 'warning'); return; }
                      setShowPetAudioModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ear size={rs(18)} color={colors.rose} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addPetAudio')}</Text>
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
                onPress={() => { console.log('[BTN] Gravar no Diário pressionado'); void handleSubmitText(); }}
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

      {/* ── Analyzing overlay (shown 2.5s after Gravar no Diário) ── */}
      {isAnalyzing && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCenter}>
            {/* Ripple ring */}
            <Animated.View style={[
              styles.analyzingRing,
              { transform: [{ scale: ringAnim }], opacity: ringOpacity },
            ]} />
            {/* Paw container */}
            <Animated.View style={[
              styles.analyzingPawContainer,
              { transform: [{ scale: pawAnim }] },
            ]}>
              <PawPrint size={rs(48)} color={colors.accent} strokeWidth={1.6} />
            </Animated.View>
          </View>
          <DotsText
            baseText={t('diary.analyzing')}
            dotsAnim={dotsAnim}
            style={styles.analyzingTitle}
          />
          <Text style={styles.analyzingSubtitle}>{t('diary.analyzingWait')}</Text>
          <Text style={styles.analyzerDisclaimer}>{t('diary.analyzerDisclaimer')}</Text>
        </View>
      )}

    </View>
  );
}

// ── PainelLentes ───────────────────────────────────────────────────────────

function PainelLentes({ t }: { t: (k: string, opts?: Record<string, unknown>) => string }) {
  const LENTES = [
    { icon: <ShieldCheck   size={rs(14)} color={colors.success} strokeWidth={1.8} />, color: colors.success, labelKey: 'mic.lenteVacina',      descKey: 'mic.lenteVacinaDesc' },
    { icon: <Stethoscope   size={rs(14)} color={colors.petrol}  strokeWidth={1.8} />, color: colors.petrol,  labelKey: 'mic.lenteConsulta',     descKey: 'mic.lenteConsultaDesc' },
    { icon: <FlaskConical  size={rs(14)} color={colors.sky}     strokeWidth={1.8} />, color: colors.sky,     labelKey: 'mic.lenteExame',        descKey: 'mic.lenteExameDesc' },
    { icon: <Pill          size={rs(14)} color={colors.purple}  strokeWidth={1.8} />, color: colors.purple,  labelKey: 'mic.lenteMedicamento',  descKey: 'mic.lenteMedicamentoDesc' },
    { icon: <Scale         size={rs(14)} color={colors.accent}  strokeWidth={1.8} />, color: colors.accent,  labelKey: 'mic.lentePeso',         descKey: 'mic.lentePesoDesc' },
    { icon: <DollarSign    size={rs(14)} color={colors.warning} strokeWidth={1.8} />, color: colors.warning, labelKey: 'mic.lenteGasto',        descKey: 'mic.lenteGastoDesc' },
    { icon: <ThermometerSun size={rs(14)} color={colors.danger} strokeWidth={1.8} />, color: colors.danger,  labelKey: 'mic.lenteSintoma',      descKey: 'mic.lenteSintomaDesc' },
    { icon: <Utensils      size={rs(14)} color={colors.success} strokeWidth={1.8} />, color: colors.success, labelKey: 'mic.lenteAlimentacao',  descKey: 'mic.lenteAlimentacaoDesc' },
    { icon: <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={1.8} />, color: colors.warning, labelKey: 'mic.lenteAlergia',      descKey: 'mic.lenteAlergiaDesc' },
    { icon: <Scissors      size={rs(14)} color={colors.petrol}  strokeWidth={1.8} />, color: colors.petrol,  labelKey: 'mic.lenteCirurgia',     descKey: 'mic.lenteCirurgiaDesc' },
    { icon: <Activity      size={rs(14)} color={colors.rose}    strokeWidth={1.8} />, color: colors.rose,    labelKey: 'mic.lenteMetrica',      descKey: 'mic.lenteMetricaDesc' },
    { icon: <ShoppingBag   size={rs(14)} color={colors.accent}  strokeWidth={1.8} />, color: colors.accent,  labelKey: 'mic.lenteCompra',       descKey: 'mic.lenteCompraDesc' },
    { icon: <MapPin        size={rs(14)} color={colors.sky}     strokeWidth={1.8} />, color: colors.sky,     labelKey: 'mic.lenteViagem',       descKey: 'mic.lenteViagemDesc' },
    { icon: <PawPrint      size={rs(14)} color={colors.accent}  strokeWidth={1.8} />, color: colors.accent,  labelKey: 'mic.lenteConexao',      descKey: 'mic.lenteConexaoDesc' },
    { icon: <Sparkles      size={rs(14)} color={colors.gold}    strokeWidth={1.8} />, color: colors.gold,    labelKey: 'mic.lenteMomento',      descKey: 'mic.lenteMomentoDesc' },
  ];

  return (
    <View style={painelStyles.container}>
      <Text style={painelStyles.subtitle}>{t('mic.painelSubtitle')}</Text>
      {LENTES.map((lente, idx) => (
        <View key={idx} style={painelStyles.item}>
          <View style={[painelStyles.iconBox, { backgroundColor: lente.color + '18' }]}>
            {lente.icon}
          </View>
          <View style={painelStyles.textCol}>
            <Text style={[painelStyles.label, { color: lente.color }]}>
              {t(lente.labelKey).toUpperCase()}
            </Text>
            <Text style={painelStyles.desc}>{t(lente.descKey)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const painelStyles = StyleSheet.create({
  container: { gap: rs(8) },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginBottom: rs(4),
    lineHeight: fs(18),
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingVertical: rs(6),
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '50',
  },
  iconBox: {
    width: rs(28), height: rs(28),
    borderRadius: rs(8),
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: { flex: 1, gap: rs(2) },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    letterSpacing: 0.5,
  },
  desc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    lineHeight: fs(16),
  },
});

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
  helpItemLimit: {
    color: colors.textDim,
    fontSize: fs(11),
    fontFamily: 'Sora_400Regular',
    marginTop: rs(2),
  },
  helpTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: rs(10),
    padding: rs(3),
    marginBottom: rs(16),
  },
  helpTabBtn: {
    flex: 1,
    paddingVertical: rs(7),
    borderRadius: rs(8),
    alignItems: 'center',
  },
  helpTabBtnActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: rs(4),
    elevation: 2,
  },
  helpTabText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  helpTabTextActive: {
    color: colors.text,
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

  // Analyzing overlay
  analyzingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,18,25,0.92)',
    alignItems: 'center', justifyContent: 'center',
    gap: rs(20), zIndex: 999,
  },
  analyzingCenter: {
    width: rs(140), height: rs(140),
    alignItems: 'center', justifyContent: 'center',
  },
  analyzingRing: {
    position: 'absolute',
    width: rs(140), height: rs(140),
    borderRadius: rs(70),
    borderWidth: 2, borderColor: colors.accent,
  },
  analyzingPawContainer: {
    width: rs(96), height: rs(96),
    borderRadius: rs(48),
    backgroundColor: colors.accentGlow,
    borderWidth: 1.5, borderColor: colors.accent + '40',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: rs(20),
    elevation: 8,
  },
  analyzingTitle: {
    fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text,
    letterSpacing: 0.5,
  },
  analyzingSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec,
    textAlign: 'center', maxWidth: rs(260), lineHeight: fs(20),
  },
  analyzerDisclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textGhost,
    textAlign: 'center', paddingHorizontal: rs(24), marginTop: rs(8),
  },
  mediaDisclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: '#FFFFFF',
    textAlign: 'center', paddingHorizontal: rs(20), paddingVertical: rs(4),
    fontStyle: 'italic',
  },
  mediaHint: {
    fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textGhost,
    textAlign: 'center', marginTop: rs(2),
  },

});
