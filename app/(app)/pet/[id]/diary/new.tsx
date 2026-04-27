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
  View, Text, TextInput, TouchableOpacity, StyleSheet, Switch,
  KeyboardAvoidingView, Platform, Animated, ScrollView, Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, Mic, Check, Trash2, Camera, Video, Music2, FileText, Ear, Square, Image as ImageIcon, HelpCircle, PawPrint, X as XIcon, ShieldCheck, Stethoscope, FlaskConical, Pill, Scale, DollarSign, ThermometerSun, Utensils, AlertTriangle, Scissors, Activity, ShoppingBag, MapPin, Sparkles, ScanLine, Wifi } from 'lucide-react-native';
import { Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../../../../constants/colors';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { spacing, radii } from '../../../../../constants/spacing';
import { MEDIA_LIMITS } from '../../../../../constants/media';
import { useDiary } from '../../../../../hooks/useDiary';
import { usePet } from '../../../../../hooks/usePets';
import { AIThinkingTicker } from '../../../../../components/AIThinkingTicker';
import { AnalysisDepthInfoModal } from '../../../../../components/AnalysisDepthInfoModal';
import { ANALYSIS_DEPTH_OPTIONS, type AnalysisDepth } from '../../../../../stores/diaryAIToggleStore';
import { Info } from 'lucide-react-native';
import { useToast } from '../../../../../components/Toast';
import { useDiaryAIToggleStore } from '../../../../../stores/diaryAIToggleStore';
import { getErrorMessage } from '../../../../../utils/errorMessages';
import { useDiaryEntry } from '../../../../../hooks/useDiaryEntry';
import DocumentScanner from '../../../../../components/diary/DocumentScanner';
import PhotoCamera from '../../../../../components/diary/PhotoCamera';
import VideoRecorder from '../../../../../components/diary/VideoRecorder';
import PetAudioRecorder from '../../../../../components/diary/PetAudioRecorder';
import { AttachmentsPreview } from '../../../../../components/diary/AttachmentsPreview';
import type { Attachment } from '../../../../../components/diary/AttachmentThumb';
import {
  PhotoPreviewStep, GalleryPreviewStep, VideoPreviewStep,
  AudioPreviewStep, DocumentPreviewStep,
} from '../../../../../components/diary/CapturePreview';
import type { DocType } from '../../../../../components/diary/CapturePreview';
import { styles } from '../../../../../components/diary/new/styles';
import { DotsText } from '../../../../../components/diary/new/DotsText';
import { PainelLentes } from '../../../../../components/diary/new/PainelLentes';
import { type Step, FULLSCREEN_STEPS } from '../../../../../components/diary/new/types';
import { useSTT, SpeechModule } from '../../../../../components/diary/new/stt';
import { useAnimations } from '../../../../../components/diary/new/animations';
import { useConfirmHandlers } from '../../../../../components/diary/new/confirmHandlers';
import { useAttachmentHandlers } from '../../../../../components/diary/new/attachmentHandlers';
import { useHandleSubmitText } from '../../../../../components/diary/new/handleSubmitText';
import { useEditHandlers } from '../../../../../components/diary/new/editHandlers';

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

  // ── Draft persistence (survives Android process death during camera) ──────
  // Only active for new entries (not edits).

  const draftKey = `diary_draft_${id}`;

  // Restore draft on mount
  useEffect(() => {
    if (isEditing || !id) return;
    AsyncStorage.getItem(draftKey)
      .then((saved) => { if (saved?.trim()) setTutorText(saved); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save draft whenever text changes
  useEffect(() => {
    if (isEditing || !id) return;
    void AsyncStorage.setItem(draftKey, tutorText);
  }, [tutorText, isEditing, id, draftKey]);
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
  const [showAudioChoiceModal, setShowAudioChoiceModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpTab, setHelpTab] = useState<'uso' | 'painel'>('uso');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { depth: analysisDepth, setDepth: setAnalysisDepth, enabled: analyzeWithAI, setEnabled: setAnalyzeWithAI } = useDiaryAIToggleStore();
  const [depthInfoOpen, setDepthInfoOpen] = React.useState(false);

  const MAX_PHOTOS    = 4;
  const MAX_VIDEOS    = 1;
  const MAX_AUDIOS    = 1;
  const MAX_DOCUMENTS = 1;

  const MAX_SLOTS = 4; // global cap when skipAI mode

  function canAddAttachment(type: Attachment['type'], alreadyPending = 0): boolean {
    if (!analyzeWithAI) {
      return attachments.length + alreadyPending < MAX_SLOTS;
    }
    const limits: Record<Attachment['type'], number> = {
      photo: MAX_PHOTOS, video: MAX_VIDEOS,
      audio: MAX_AUDIOS, document: MAX_DOCUMENTS,
    };
    return attachments.filter((a) => a.type === type).length < limits[type];
  }

  function attachmentDeniedMsg(type: Attachment['type']): string {
    if (!analyzeWithAI) return t('mic.maxAttachments');
    const keys: Record<Attachment['type'], string> = {
      photo: 'mic.maxPhotos', video: 'mic.maxVideos',
      audio: 'mic.maxAudios', document: 'mic.maxDocuments',
    };
    return t(keys[type]);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Refs ─────────────────────────────────────────────────────────────────

  const tutorTextRef = useRef(tutorText);
  tutorTextRef.current = tutorText;
  const stepRef = useRef(step);
  stepRef.current = step;
  // remembers the step to return to after photo_camera closes
  const prevStepRef = useRef<Step>('mic');
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;
  const isPickerOpenRef = useRef(false);

  // ── Animations (extracted to ./_new/animations.ts) ───────────────────────

  const { pulseAnim, pawAnim, ringAnim, ringOpacity, dotsAnim, showAnalyzingAndBack } =
    useAnimations({ isListening, setIsAnalyzing, draftKey, router });

  // ── STT (extracted to ./_new/stt.ts) ─────────────────────────────────────

  const { startListening, stopListening, handleMicToggle } = useSTT({
    isListening,
    setIsListening,
    setInterimText,
    setTutorText,
    setCaptureCaption,
    stepRef,
    toast,
    t,
  });

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
      // Inline scanner — always preview before confirming, never auto-submit
      const hasExistingContent = tutorText.trim().length > 0 || attachments.length > 0;
      if (hasExistingContent) {
        // Add the scanned doc as a document attachment (base64 stored for later submission)
        setAttachments((prev) => [...prev, {
          id: `doc-scan-${Date.now()}`,
          type: 'document' as const,
          localUri: '',
          base64,
          fileName: 'scanned-document',
        }]);
        setStep('text');
      } else {
        // Show document_preview so the tutor can confirm before submitting
        setCapturedDocBase64(base64);
        setStep('document_preview');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorText, attachments]);

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

  // ── Confirm handlers (extracted to ./_new/confirmHandlers.ts) ────────────

  const {
    handleConfirmPhoto,
    handleConfirmGallery,
    handleConfirmVideo,
    handleConfirmAudio,
    handleConfirmDocument,
  } = useConfirmHandlers({
    captureCaption,
    capturedPhotoUri,
    capturedGalleryUris,
    capturedVideoUri,
    capturedVideoDuration,
    capturedAudioUri,
    capturedAudioDuration,
    docType,
    capturedDocBase64,
    petName: pet?.name ?? null,
    petBreed: pet?.breed ?? null,
    submitEntry,
    showAnalyzingAndBack,
  });

  // ── Attachment handlers (extracted to ./_new/attachmentHandlers.ts) ──────

  const {
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
  } = useAttachmentHandlers({
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
  });

  // ── Text step handlers ────────────────────────────────────────────────────

  const handleSubmitText = useHandleSubmitText({
    tutorText,
    attachments,
    analyzeWithAI,
    analysisDepth,
    submitEntry,
    router,
    toast,
    t,
  });

  // ── Edit mode + back navigation handlers (extracted to ./_new/editHandlers.ts) ──

  const { handleSaveEdit, handleDelete, handleBack } = useEditHandlers({
    edit,
    tutorText,
    step,
    draftKey,
    updateEntry,
    deleteEntry,
    stopListening,
    setStep,
    router,
    toast,
    confirm,
    t,
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* ── Full-screen capture components ───────────────── */}
      {step === 'photo_camera' && (
        <PhotoCamera onCapture={handlePhotoCameraCapture} onClose={handlePhotoCameraClose} />
      )}
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
            <ChevronLeft size={rs(20)} color={colors.click} strokeWidth={2} />
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
              <HelpCircle size={rs(20)} color={colors.click} strokeWidth={1.8} />
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
          petSex={pet?.sex}
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

      <Modal
        visible={showAudioChoiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAudioChoiceModal(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setShowAudioChoiceModal(false)}
        >
          <Pressable style={{
            backgroundColor: colors.bgCard,
            borderTopLeftRadius: rs(20),
            borderTopRightRadius: rs(20),
            paddingTop: rs(24),
            paddingHorizontal: rs(24),
            paddingBottom: rs(24) + insets.bottom,
            gap: rs(12),
          }}>
            <Text style={{
              fontFamily: 'Sora_700Bold',
              fontSize: fs(16),
              color: colors.text,
              marginBottom: rs(8),
            }}>{t('mic.audioChoiceTitle')}</Text>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: rs(12),
                backgroundColor: colors.card, borderRadius: rs(14),
                padding: rs(16), borderWidth: 1, borderColor: colors.border,
              }}
              onPress={() => {
                setShowAudioChoiceModal(false);
                setShowPetAudioModal(true);
              }}
              activeOpacity={0.7}
            >
              <Ear size={rs(24)} color={colors.rose} strokeWidth={1.8} />
              <View>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text }}>
                  {t('mic.audioChoiceRecord')}
                </Text>
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec }}>
                  {t('mic.audioChoiceRecordDesc')}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flexDirection: 'row', alignItems: 'center', gap: rs(12),
                backgroundColor: colors.card, borderRadius: rs(14),
                padding: rs(16), borderWidth: 1, borderColor: colors.border,
              }}
              onPress={() => {
                setShowAudioChoiceModal(false);
                void handleAttachAudio();
              }}
              activeOpacity={0.7}
            >
              <Music2 size={rs(24)} color={colors.warning} strokeWidth={1.8} />
              <View>
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text }}>
                  {t('mic.audioChoiceFile')}
                </Text>
                <Text style={{ fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec }}>
                  {t('mic.audioChoiceFileDesc')}
                </Text>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
        <View style={[styles.helpSheet, { paddingBottom: 0 }]}>
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

          <ScrollView
            style={styles.helpScrollArea}
            contentContainerStyle={[styles.helpScrollContent, { paddingBottom: rs(spacing.lg) + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Como usar */}
            {helpTab === 'uso' && (
              <>
                {[
                  { icon: <Mic size={rs(22)} color={colors.click} strokeWidth={1.8} />, title: t('mic.helpMic'), desc: t('mic.helpMicDesc') },
                  { icon: <Camera size={rs(22)} color={colors.click} strokeWidth={1.8} />, title: t('mic.helpFoto'), desc: t('mic.helpFotoDesc'), limit: t('mic.helpFotoLimit', { max: MEDIA_LIMITS.photo.maxSizeMB, count: MEDIA_LIMITS.photo.maxCount }) },
                  { icon: <Video size={rs(22)} color={colors.click} strokeWidth={1.8} />, title: t('mic.helpVideo'), desc: t('mic.helpVideoDesc'), limit: t('mic.helpVideoLimit', { maxSec: MEDIA_LIMITS.video.maxDurationSec, maxMB: MEDIA_LIMITS.video.maxSizeMB }) },
                  { icon: <Ear size={rs(22)} color={colors.rose} strokeWidth={1.8} />, title: t('mic.helpSom'), desc: t('mic.helpSomDesc'), limit: t('mic.helpAudioLimit', { max: MEDIA_LIMITS.audio.maxDurationSec }) },
                  { icon: <ImageIcon size={rs(22)} color={colors.click} strokeWidth={1.8} />, title: t('mic.helpGaleria'), desc: t('mic.helpGaleriaDesc') },
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

                {/* AI toggle explanation */}
                <View style={styles.helpAICard}>
                  <View style={styles.helpAIHeader}>
                    <Sparkles size={rs(16)} color={colors.ai} strokeWidth={1.8} />
                    <Text style={styles.helpAITitle}>{t('mic.helpAIToggle')}</Text>
                  </View>
                  <View style={styles.helpAIStateRow}>
                    <View style={[styles.helpAIBadge, styles.helpAIBadgeOn]}>
                      <Text style={[styles.helpAIBadgeText, { color: colors.click }]}>{t('mic.helpAIToggleOnTitle')}</Text>
                    </View>
                    <Text style={styles.helpAIStateDesc}>{t('mic.helpAIToggleOnDesc')}</Text>
                  </View>
                  <View style={styles.helpAIStateRow}>
                    <View style={[styles.helpAIBadge, styles.helpAIBadgeOff]}>
                      <Text style={[styles.helpAIBadgeText, { color: colors.textSec }]}>{t('mic.helpAIToggleOffTitle')}</Text>
                    </View>
                    <Text style={styles.helpAIStateDesc}>{t('mic.helpAIToggleOffDesc')}</Text>
                  </View>
                </View>

                {/* WiFi tip */}
                <View style={styles.helpWifiCard}>
                  <Wifi size={rs(18)} color={colors.warning} strokeWidth={1.8} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.helpWifiTitle}>{t('mic.helpWifiTitle')}</Text>
                    <Text style={styles.helpWifiDesc}>{t('mic.helpWifiDesc')}</Text>
                  </View>
                </View>
              </>
            )}

            {/* Painel de lentes */}
            {helpTab === 'painel' && <PainelLentes t={t} />}
          </ScrollView>
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
            {/* Transcription card — editable TextInput com título */}
            <View style={styles.transcriptionCard}>
              <Text style={styles.transcriptionTitle}>{t('mic.transcriptionTitle')}</Text>
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

            {/* AI analysis depth — 4 chips + Info */}
            <View style={styles.aiDepthHeaderRow}>
              <Sparkles size={rs(16)} color={analysisDepth !== 'off' ? colors.ai : colors.textDim} strokeWidth={1.8} />
              <Text style={styles.aiDepthTitle}>{t('diary.aiAnalysisTitle')}</Text>
              <TouchableOpacity onPress={() => setDepthInfoOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Info size={rs(16)} color={colors.click} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>
            <View style={styles.aiDepthChipsRow}>
              {ANALYSIS_DEPTH_OPTIONS.map((opt) => {
                const selected = analysisDepth === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.aiDepthChip,
                      selected ? styles.aiDepthChipActive : styles.aiDepthChipIdle,
                    ]}
                    onPress={() => setAnalysisDepth(opt.value as AnalysisDepth)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.aiDepthChipLabel,
                      selected ? styles.aiDepthChipLabelActive : styles.aiDepthChipLabelIdle,
                    ]}>
                      {t('diary.aiDepth_' + opt.key)}
                    </Text>
                    <Text style={[
                      styles.aiDepthChipSub,
                      selected ? styles.aiDepthChipSubActive : styles.aiDepthChipSubIdle,
                    ]}>
                      {t('diary.aiDepthShort_' + opt.key)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* AI hint — só quando depth != off */}
            {analysisDepth !== 'off' && (
              <Text style={styles.aiHint}>{t('mic.aiHint', { name: petName })}</Text>
            )}

            <AnalysisDepthInfoModal visible={depthInfoOpen} onClose={() => setDepthInfoOpen(false)} />

            {/* Attachments */}
            <AttachmentsPreview attachments={attachments} onRemove={removeAttachment} />

            {attachments.length > 0 && (
              <Text style={styles.mediaDisclaimer}>{t('diary.mediaDisclaimer')}</Text>
            )}

            {/* 4 attachment buttons: Câmera · Fotos+Vídeos · Áudio · Som do pet */}
            <View style={styles.attachRow}>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachTakePhoto} activeOpacity={0.7}>
                <Camera size={rs(18)} color={colors.click} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.attachThumb} onPress={handleAttachMedia} activeOpacity={0.7}>
                <ImageIcon size={rs(18)} color={colors.click} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addMedia')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachThumb}
                onPress={() => {
                  if (!canAddAttachment('audio')) { toast(attachmentDeniedMsg('audio'), 'warning'); return; }
                  setShowAudioChoiceModal(true);
                }}
                activeOpacity={0.7}
              >
                <Mic size={rs(18)} color={colors.click} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.addAudio')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachThumb}
                onPress={handleSelectScanner}
                activeOpacity={0.7}
              >
                <ScanLine size={rs(18)} color={colors.click} strokeWidth={1.8} />
                <Text style={styles.attachLabel}>{t('mic.scanner')}</Text>
              </TouchableOpacity>
            </View>
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
                  : <Mic size={rs(28)} color={colors.click} strokeWidth={1.8} />
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
                <Mic size={rs(18)} color={colors.click} strokeWidth={1.8} />
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
                    <Camera size={rs(18)} color={colors.click} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.takePhoto')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachMedia} activeOpacity={0.7}>
                    <ImageIcon size={rs(18)} color={colors.click} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addMedia')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.attachBtn} onPress={handleAttachAudio} activeOpacity={0.7}>
                    <Music2 size={rs(18)} color={colors.click} strokeWidth={1.8} />
                    <Text style={styles.attachLabel}>{t('mic.addAudio')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.attachBtn}
                    onPress={() => {
                      if (!canAddAttachment('audio')) { toast(attachmentDeniedMsg('audio'), 'warning'); return; }
                      setShowPetAudioModal(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ear size={rs(18)} color={colors.click} strokeWidth={1.8} />
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
              <PawPrint size={rs(48)} color={colors.click} strokeWidth={1.6} />
            </Animated.View>
          </View>
          <DotsText
            baseText={t('diary.analyzing')}
            dotsAnim={dotsAnim}
            style={styles.analyzingTitle}
          />
          <Text style={styles.analyzingSubtitle}>{t('diary.analyzingWait')}</Text>
          <Text style={styles.analyzerDisclaimer}>{t('diary.analyzerDisclaimer')}</Text>
          <AIThinkingTicker species={pet?.species ?? 'both'} />
        </View>
      )}

    </View>
  );
}
