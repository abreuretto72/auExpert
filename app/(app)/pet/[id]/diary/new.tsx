import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import {
  ChevronLeft, X, Mic, Camera, Type, Sparkles, Send,
  RefreshCw, Check, Star, Tag, Dog, Cat, Pencil, Trash2,
  ImageIcon, Video, Plus, Square,
} from 'lucide-react-native';
import { colors } from '../../../../../constants/colors';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { spacing } from '../../../../../constants/spacing';
import { moods, MoodId } from '../../../../../constants/moods';
import { useDiary } from '../../../../../hooks/useDiary';
import { usePet } from '../../../../../hooks/usePets';
import { useAuthStore } from '../../../../../stores/authStore';
import { useToast } from '../../../../../components/Toast';
import PawIcon from '../../../../../components/PawIcon';
import { getErrorMessage } from '../../../../../utils/errorMessages';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../../../lib/supabase';

// Speech recognition — optional (not available in Expo Go)
let SpeechModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent | null = null;
try {
  const sr = require('expo-speech-recognition');
  SpeechModule = sr.ExpoSpeechRecognitionModule;
  useSpeechEvent = sr.useSpeechRecognitionEvent;
} catch {
  // Native module unavailable (Expo Go) — mic disabled silently
}

// Mood face icons mapped to Lucide (closest match per mood)
import {
  Zap, Smile, Heart, Cloud, Moon, AlertCircle, CloudRain, Thermometer,
} from 'lucide-react-native';

const MOOD_ICONS: Record<MoodId, React.ElementType> = {
  ecstatic: Zap, happy: Smile, playful: Heart, calm: Cloud,
  tired: Moon, anxious: AlertCircle, sad: CloudRain, sick: Thermometer,
};

type Step = 'input' | 'mood' | 'processing' | 'preview' | 'done';
type InputMode = null | 'mic' | 'camera' | 'text';

const SUGGESTED_TAGS = [
  'tagPark', 'tagWalk', 'tagPlay', 'tagHome',
  'tagVet', 'tagBath', 'tagFriends', 'tagTravel',
] as const;

const PROCESSING_LINES_PT = [
  'Analisando o texto...', 'Buscando memórias do RAG...',
  'Construindo personalidade...', 'Escrevendo na voz do pet...',
  'Sugerindo tags...',
];
const PROCESSING_LINES_EN = [
  'Analyzing text...', 'Searching RAG memories...',
  'Building personality...', 'Writing in pet\'s voice...',
  'Suggesting tags...',
];

export default function NewDiaryEntryScreen() {
  const { id, edit } = useLocalSearchParams<{ id: string; edit?: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { data: pet } = usePet(id!);
  const { entries, addEntry, updateEntry, deleteEntry, isAdding, isUpdating, generateNarration, isGenerating } = useDiary(id!);

  const isEn = i18n.language?.startsWith('en');
  const petName = pet?.name ?? '...';
  const isDog = pet?.species === 'dog';
  const isEditing = !!edit;
  const editingEntry = isEditing ? entries.find((e) => e.id === edit) : null;

  const [step, setStep] = useState<Step>(isEditing ? 'mood' : 'input');
  const [inputMode, setInputMode] = useState<InputMode>(isEditing ? 'text' : null);
  const [tutorText, setTutorText] = useState(editingEntry?.content ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>((editingEntry?.mood_id as MoodId) ?? null);
  const [aiSuggestedMood, setAiSuggestedMood] = useState<MoodId | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>(editingEntry?.tags ?? []);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [isSpecial, setIsSpecial] = useState(editingEntry?.is_special ?? false);
  const [aiNarration, setAiNarration] = useState(editingEntry?.narration ?? '');
  const [aiMoodScore, setAiMoodScore] = useState(editingEntry?.mood_score ?? 0);
  const [processingLine, setProcessingLine] = useState(0);
  const isSaving = isAdding || isUpdating;

  // ── STT state ──
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);
  const tutorTextRef = useRef(tutorText);
  tutorTextRef.current = tutorText;

  // STT event handlers (no-op if module unavailable)
  const noopHook = (_event: string, _cb: (...args: unknown[]) => void) => {};
  const useEvent = useSpeechEvent ?? noopHook;

  useEvent('result', (event: { results: { transcript: string }[]; isFinal: boolean }) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setTutorText((prev) => prev ? `${prev} ${transcript}`.trim() : transcript);
      setInterimText('');
    } else {
      setInterimText(transcript);
    }
  });

  useEvent('end', () => {
    console.log('[NewDiary] STT end — tutorText:', JSON.stringify(tutorTextRef.current), 'inputMode:', inputMode);
    setIsListening(false);
    setInterimText('');
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
    // Show transcription review screen
    setTimeout(() => {
      const text = tutorTextRef.current;
      console.log('[NewDiary] STT end timeout — text:', JSON.stringify(text), 'setting inputMode to mic');
      if (text.trim().length > 0) {
        setInputMode('mic');
      }
    }, 300);
  });

  useEvent('error', (event: { error: string }) => {
    setIsListening(false);
    setInterimText('');
    pulseRef.current?.stop();
    pulseAnim.setValue(1);
    if (event.error === 'no-speech') {
      toast(t('diary.noSpeechDetected'), 'warning');
    } else {
      toast(t('diary.micError'), 'error');
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isListening && SpeechModule) {
        SpeechModule.stop();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMoodLabel = useCallback((m: typeof moods[number]) =>
    isEn ? m.label_en : m.label, [isEn]);

  // ── Handlers ──
  const handleBack = useCallback(() => {
    if (isListening && SpeechModule) { SpeechModule.stop(); setIsListening(false); return; }
    if (step === 'input' && !inputMode) { router.back(); return; }
    if (step === 'input') { setInputMode(null); return; }
    if (step === 'mood') { setStep('input'); return; }
    if (step === 'preview') { setStep('mood'); return; }
  }, [step, inputMode, router, isListening]);

  const startRecording = useCallback(async () => {
    if (!SpeechModule) {
      toast(t('diary.micUnavailable'), 'warning');
      return;
    }

    if (isListening) {
      // Stop recording
      SpeechModule.stop();
      setIsListening(false);
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
      return;
    }

    try {
      const { granted } = await SpeechModule.requestPermissionsAsync();
      if (!granted) {
        toast(t('diary.micPermission'), 'warning');
        return;
      }

      setInputMode('mic');
      setIsListening(true);
      setInterimText('');

      // Start pulse animation
      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseRef.current.start();

      SpeechModule.start({
        lang: getLocales()[0]?.languageTag ?? 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch {
      setIsListening(false);
      pulseRef.current?.stop();
      pulseAnim.setValue(1);
      toast(t('diary.micError'), 'error');
    }
  }, [isListening, toast, t, pulseAnim]);

  const handleCameraCapture = useCallback(async () => {
    try {
      // Let user choose: camera or gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
      });
      if (result.canceled || !result.assets[0]) return;

      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setInputMode('camera');
      setIsAnalyzingPhoto(true);

      // Read as base64
      const FileSystem = require('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      console.log('[NewDiary] Photo base64 size:', Math.round(base64.length / 1024), 'KB');

      // Call AI analysis
      const { data, error } = await supabase.functions.invoke('analyze-pet-photo', {
        body: {
          photo_base64: base64,
          species: pet?.species ?? 'dog',
          language: i18n.language,
        },
      });

      if (error) throw error;
      console.log('[NewDiary] Photo analysis OK — mood:', data?.mood?.primary, 'breed:', data?.breed?.name);

      // Build text from analysis
      const parts: string[] = [];
      if (data?.mood?.primary) {
        const moodLabels: Record<string, string> = {
          ecstatic: isEn ? 'euphoric' : 'eufórico',
          happy: isEn ? 'happy' : 'feliz',
          calm: isEn ? 'calm' : 'calmo',
          tired: isEn ? 'tired' : 'cansado',
          anxious: isEn ? 'anxious' : 'ansioso',
          sad: isEn ? 'sad' : 'triste',
          playful: isEn ? 'playful' : 'brincalhão',
          sick: isEn ? 'sick' : 'doente',
          alert: isEn ? 'alert' : 'alerta',
        };
        parts.push(isEn
          ? `${petName} looks ${moodLabels[data.mood.primary] ?? data.mood.primary}.`
          : `${petName} parece ${moodLabels[data.mood.primary] ?? data.mood.primary}.`);
      }
      if (data?.health?.body_condition) {
        parts.push(isEn
          ? `Body condition: ${data.health.body_condition}.`
          : `Condição corporal: ${data.health.body_condition}.`);
      }
      if (data?.environment?.location && data.environment.location !== 'unknown') {
        const locMap: Record<string, string> = {
          home_indoor: isEn ? 'at home' : 'em casa',
          home_outdoor: isEn ? 'in the yard' : 'no quintal',
          park: isEn ? 'at the park' : 'no parque',
          beach: isEn ? 'at the beach' : 'na praia',
          clinic: isEn ? 'at the vet' : 'no veterinário',
          car: isEn ? 'in the car' : 'no carro',
          street: isEn ? 'on the street' : 'na rua',
        };
        parts.push(locMap[data.environment.location] ?? '');
      }

      const generatedText = parts.filter(Boolean).join(' ');
      setTutorText(generatedText || (isEn ? `Photo of ${petName}` : `Foto de ${petName}`));

      // Auto-set mood from AI
      if (data?.mood?.primary && moods.some((m) => m.id === data.mood.primary)) {
        setSelectedMood(data.mood.primary as MoodId);
        setAiSuggestedMood(data.mood.primary as MoodId);
      }

      setIsAnalyzingPhoto(false);
      // Go directly to mood step
      setStep('mood');
      toast(t('diary.photoAnalyzed'), 'success');
    } catch (err) {
      console.error('[NewDiary] Photo analysis failed →', err);
      setIsAnalyzingPhoto(false);
      toast(t('diary.photoAnalysisFailed'), 'error');
    }
  }, [pet, petName, isEn, i18n.language, toast, t]);

  // Open camera directly (take photo → AI analyzes)
  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.4,
      });
      if (result.canceled || !result.assets[0]) return;
      // Reuse the same analysis flow
      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setInputMode('camera');
      setIsAnalyzingPhoto(true);

      const FileSystem = require('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const { data, error } = await supabase.functions.invoke('analyze-pet-photo', {
        body: { photo_base64: base64, species: pet?.species ?? 'dog', language: i18n.language },
      });
      if (error) throw error;

      const parts: string[] = [];
      if (data?.mood?.primary) {
        const moodLabels: Record<string, string> = {
          ecstatic: isEn ? 'euphoric' : 'eufórico', happy: isEn ? 'happy' : 'feliz',
          calm: isEn ? 'calm' : 'calmo', tired: isEn ? 'tired' : 'cansado',
          anxious: isEn ? 'anxious' : 'ansioso', sad: isEn ? 'sad' : 'triste',
          playful: isEn ? 'playful' : 'brincalhão', sick: isEn ? 'sick' : 'doente',
        };
        parts.push(isEn
          ? `${petName} looks ${moodLabels[data.mood.primary] ?? data.mood.primary}.`
          : `${petName} parece ${moodLabels[data.mood.primary] ?? data.mood.primary}.`);
      }
      setTutorText(parts.join(' ') || (isEn ? `Photo of ${petName}` : `Foto de ${petName}`));
      if (data?.mood?.primary && moods.some((m) => m.id === data.mood.primary)) {
        setSelectedMood(data.mood.primary as MoodId);
        setAiSuggestedMood(data.mood.primary as MoodId);
      }
      setIsAnalyzingPhoto(false);
      setStep('mood');
      toast(t('diary.photoAnalyzed'), 'success');
    } catch (err) {
      console.error('[NewDiary] Camera analysis failed →', err);
      setIsAnalyzingPhoto(false);
      toast(t('diary.photoAnalysisFailed'), 'error');
    }
  }, [pet, petName, isEn, i18n.language, toast, t]);

  // Pick image from gallery (same as handleCameraCapture but explicit name)
  const handlePickImage = handleCameraCapture;

  // Pick video — for now attach placeholder, video analysis is post-MVP
  const handlePickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.4,
      });
      if (result.canceled || !result.assets[0]) return;
      setPhotoUri(result.assets[0].uri);
      toast(t('diary.videoAttached'), 'success');
    } catch {
      toast(t('diary.videoFailed'), 'error');
    }
  }, [toast, t]);

  // Start mic from inside text mode (inline)
  const handleInlineMic = useCallback(async () => {
    if (!SpeechModule) { toast(t('diary.micUnavailable'), 'warning'); return; }
    try {
      const { granted } = await SpeechModule.requestPermissionsAsync();
      if (!granted) { toast(t('diary.micPermission'), 'warning'); return; }

      setIsListening(true);
      setInterimText('');

      pulseRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      pulseRef.current.start();

      SpeechModule.start({
        lang: getLocales()[0]?.languageTag ?? 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
      });
    } catch {
      setIsListening(false);
      toast(t('diary.micError'), 'error');
    }
  }, [toast, t, pulseAnim]);

  const handleTextMode = useCallback(() => { setInputMode('text'); }, []);

  const handleSubmitText = useCallback(() => {
    if (tutorText.trim().length >= 3) setStep('mood');
  }, [tutorText]);

  const runProcessingAnimation = useCallback((onDone: () => void) => {
    setStep('processing');
    setProcessingLine(0);
    [0, 1, 2, 3, 4].forEach((_, i) => {
      setTimeout(() => setProcessingLine(i + 1), i * 600);
    });
    setTimeout(onDone, 3200);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!selectedMood) {
      toast(t('diary.moodRequired', { name: petName }), 'warning');
      return;
    }

    const language = (isEn ? 'en-US' : 'pt-BR') as 'pt-BR' | 'en-US';
    const content = tutorText.trim();

    runProcessingAnimation(async () => {
      try {
        const result = await generateNarration({ content, moodId: selectedMood, language });
        setAiNarration(result.narration);
        if (result.mood_detected) setAiSuggestedMood(result.mood_detected as MoodId);
        const moodDef = moods.find((m) => m.id === selectedMood);
        setAiMoodScore(moodDef?.score ?? 50);
        setStep('preview');
      } catch {
        toast(t('diary.narrationFailed'), 'error');
        setStep('mood');
      }
    });
  }, [selectedMood, tutorText, petName, isEn, toast, t, generateNarration, runProcessingAnimation]);

  const handleRegenerate = useCallback(async () => {
    if (!selectedMood) return;
    const language = (isEn ? 'en-US' : 'pt-BR') as 'pt-BR' | 'en-US';
    const content = tutorText.trim();

    runProcessingAnimation(async () => {
      try {
        const result = await generateNarration({ content, moodId: selectedMood, language });
        setAiNarration(result.narration);
        setStep('preview');
      } catch {
        toast(t('diary.narrationFailed'), 'error');
        setStep('preview');
      }
    });
  }, [selectedMood, tutorText, isEn, generateNarration, runProcessingAnimation, toast, t]);

  const handlePublish = useCallback(async () => {
    if (!user?.id || !selectedMood) return;
    try {
      const allTags = [...new Set([...aiTags, ...selectedTags])];

      if (isEditing && edit) {
        await updateEntry({
          id: edit,
          content: tutorText.trim() || '(photo)',
          mood_id: selectedMood,
          mood_score: aiMoodScore || undefined,
          narration: aiNarration || null,
          tags: allTags,
          is_special: isSpecial,
        });
      } else {
        await addEntry({
          content: tutorText.trim() || '(photo)',
          input_method: (inputMode === 'camera' ? 'photo' : inputMode === 'mic' ? 'voice' : 'text') as 'voice' | 'photo' | 'text',
          mood_id: selectedMood,
          mood_score: aiMoodScore || undefined,
          mood_source: aiSuggestedMood ? 'ai_suggested' : 'manual',
          narration: aiNarration || null,
          tags: allTags,
          photos: [],
          is_special: isSpecial,
        });
      }
      setStep('done');
    } catch (error: unknown) {
      console.error('[NewDiary] handlePublish ERRO →', error instanceof Error ? error.message : error, error);
      toast(getErrorMessage(error), 'error');
    }
  }, [user, tutorText, inputMode, aiNarration, selectedMood, aiMoodScore, aiSuggestedMood, aiTags, selectedTags, isSpecial, addEntry, updateEntry, edit, isEditing, toast]);

  const handleDelete = useCallback(async () => {
    if (!edit) return;
    try {
      await deleteEntry(edit);
      toast(t('diary.deleted'), 'success');
      router.back();
    } catch {
      toast(t('diary.deleteFailed'), 'error');
    }
  }, [edit, deleteEntry, toast, t, router]);

  const handleNewEntry = useCallback(() => {
    if (isListening && SpeechModule) SpeechModule.stop();
    setIsListening(false);
    setInterimText('');
    setPhotoUri(null);
    setIsAnalyzingPhoto(false);
    setStep('input');
    setInputMode(null);
    setTutorText('');
    setSelectedMood(null);
    setAiSuggestedMood(null);
    setAiNarration('');
    setSelectedTags([]);
    setAiTags([]);
    setIsSpecial(false);
    setAiMoodScore(0);
  }, [isListening]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((tg) => tg !== tag) : [...prev, tag],
    );
  }, []);

  const moodData = moods.find((m) => m.id === selectedMood);
  const processingLines = isEn ? PROCESSING_LINES_EN : PROCESSING_LINES_PT;

  // Progress bar (3 segments for input/mood/preview)
  const progressIndex = ['input', 'mood', 'processing', 'preview', 'done'].indexOf(step);

  const PetIcon = isDog ? Dog : Cat;

  return (
    <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={S.container}>
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={handleBack} style={S.headerBtn}>
            <ChevronLeft size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={S.headerCenter}>
            <Text style={S.headerTitle}>{isEditing ? t('diary.editEntry') : t('diary.newEntry')}</Text>
            <Text style={S.headerSub}>{t('diary.diaryOf', { name: petName })}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
            <X size={rs(18)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={S.progressRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[S.progressSeg, progressIndex >= i && S.progressSegActive]} />
          ))}
        </View>

        <ScrollView style={S.flex} contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ══════ STEP: INPUT ══════ */}
          {step === 'input' && !inputMode && !isListening && (
            <View style={S.stepWrap}>
              <Text style={S.stepTitle}>{t('diary.howToTell')}</Text>
              <Text style={S.stepSub}>{t('diary.aiWillTransform', { name: petName })}</Text>

              {/* MIC — Primary CTA */}
              <TouchableOpacity style={S.voiceBtn} onPress={startRecording} activeOpacity={0.7}>
                <View style={S.voiceIconWrap}>
                  <Mic size={rs(38)} color="#fff" strokeWidth={1.5} />
                </View>
                <Text style={S.voiceBtnTitle}>{t('diary.inputVoice')}</Text>
                <Text style={S.voiceBtnSub}>{t('diary.inputVoiceDesc')}</Text>
              </TouchableOpacity>

              {/* Secondary row */}
              <View style={S.secondaryRow}>
                <TouchableOpacity style={S.secondaryBtn} onPress={handleCameraCapture} activeOpacity={0.7}>
                  <View style={[S.secIconWrap, { backgroundColor: colors.purple + '10' }]}>
                    <Camera size={rs(24)} color={colors.purple} strokeWidth={1.8} />
                  </View>
                  <Text style={S.secLabel}>{t('diary.inputPhoto')}</Text>
                  <Text style={S.secHint}>{t('diary.inputPhotoDesc')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={S.secondaryBtn} onPress={handleTextMode} activeOpacity={0.7}>
                  <View style={[S.secIconWrap, { backgroundColor: colors.petrol + '10' }]}>
                    <Type size={rs(24)} color={colors.petrol} strokeWidth={1.8} />
                  </View>
                  <Text style={S.secLabel}>{t('diary.inputText')}</Text>
                  <Text style={S.secHint}>{t('diary.inputTextDesc')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ══════ RECORDING (MIC ACTIVE) ══════ */}
          {step === 'input' && isListening && (
            <View style={S.stepWrap}>
              <View style={S.recordingWrap}>
                {/* Pulsing mic button */}
                <Animated.View style={[S.recordingPulseOuter, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity style={S.recordingMicBtn} onPress={startRecording} activeOpacity={0.8}>
                    <Square size={rs(28)} color="#fff" strokeWidth={2} fill="#fff" />
                  </TouchableOpacity>
                </Animated.View>

                <Text style={S.recordingTitle}>{t('diary.listening')}</Text>
                <Text style={S.recordingHint}>{t('diary.tapToStop')}</Text>

                {/* Live transcript preview */}
                {(interimText || tutorText) ? (
                  <View style={S.recordingTranscript}>
                    <Text style={S.recordingTranscriptText}>
                      {tutorText}{interimText ? (tutorText ? ' ' : '') + interimText : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={S.recordingTranscript}>
                    <Text style={S.recordingTranscriptPlaceholder}>{t('diary.speakNow', { name: petName })}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ══════ MIC RESULT (review transcription) ══════ */}
          {(() => { if (step === 'input' && !isListening) console.log('[NewDiary] MIC RESULT check — step:', step, 'inputMode:', inputMode, 'isListening:', isListening); return null; })()}
          {step === 'input' && inputMode === 'mic' && !isListening && (
            <View style={S.stepWrap}>
              <Text style={S.stepTitle}>{t('diary.transcribed')}</Text>
              <View style={[S.textAreaWrap, S.textAreaActive]}>
                <TextInput
                  style={S.textArea}
                  placeholder={t('diary.contentPlaceholder', { name: petName })}
                  placeholderTextColor={colors.placeholder}
                  value={tutorText}
                  onChangeText={setTutorText}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <View style={S.textBarRow}>
                  <View style={S.textBarIcons}>
                    <TouchableOpacity onPress={handleTakePhoto}>
                      <Camera size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickImage}>
                      <ImageIcon size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickVideo}>
                      <Video size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={startRecording}>
                      <Mic size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[S.charCount, tutorText.length > 1800 && { color: colors.danger }]}>
                    {tutorText.length}/2000
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[S.nextBtn, tutorText.trim().length < 3 && S.disabled]}
                onPress={handleSubmitText}
                disabled={tutorText.trim().length < 3}
                activeOpacity={0.7}
              >
                <Text style={S.nextBtnText}>{t('diary.nextMood')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════ PHOTO ANALYZING ══════ */}
          {isAnalyzingPhoto && (
            <View style={S.stepWrap}>
              <View style={S.recordingWrap}>
                <View style={S.processingIcon}>
                  <Camera size={rs(40)} color={colors.purple} strokeWidth={1.5} />
                </View>
                <Text style={S.recordingTitle}>{t('diary.photoAnalyzing')}</Text>
                <ActivityIndicator size="large" color={colors.purple} />
              </View>
            </View>
          )}

          {/* TEXT INPUT MODE */}
          {step === 'input' && inputMode === 'text' && (
            <View style={S.stepWrap}>
              <Text style={S.stepTitle}>{t('diary.contentLabel')}</Text>
              <View style={[S.textAreaWrap, tutorText.length > 0 && S.textAreaActive]}>
                <TextInput
                  style={S.textArea}
                  placeholder={t('diary.contentPlaceholder', { name: petName })}
                  placeholderTextColor={colors.placeholder}
                  value={tutorText}
                  onChangeText={setTutorText}
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <View style={S.textBarRow}>
                  <View style={S.textBarIcons}>
                    <TouchableOpacity onPress={handleTakePhoto}>
                      <Camera size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickImage}>
                      <ImageIcon size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handlePickVideo}>
                      <Video size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleInlineMic}>
                      <Mic size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[S.charCount, tutorText.length > 1800 && { color: colors.danger }]}>
                    {tutorText.length}/2000
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[S.nextBtn, tutorText.trim().length < 3 && S.disabled]}
                onPress={handleSubmitText}
                disabled={tutorText.trim().length < 3}
                activeOpacity={0.7}
              >
                <Text style={S.nextBtnText}>{t('diary.nextMood')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════ STEP: MOOD ══════ */}
          {step === 'mood' && (
            <View style={S.stepWrap}>
              <Text style={S.stepTitle}>{t('diary.moodQuestion', { name: petName })}</Text>
              {aiSuggestedMood && (
                <View style={S.aiSuggestBadge}>
                  <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
                  <Text style={S.aiSuggestText}>
                    {t('diary.aiSuggests')}: {moods.find((m) => m.id === aiSuggestedMood)?.label ?? ''}
                  </Text>
                </View>
              )}
              {!aiSuggestedMood && (
                <Text style={S.stepSub}>{t('diary.selectMood', { name: petName })}</Text>
              )}

              {/* 3x2 Mood grid */}
              <View style={S.moodGrid}>
                {moods.filter((m) => !['playful', 'sick'].includes(m.id)).map((m) => {
                  const sel = selectedMood === m.id;
                  const Icon = MOOD_ICONS[m.id];
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[S.moodCard, sel && { backgroundColor: m.color + '12', borderColor: m.color + '40' }]}
                      onPress={() => setSelectedMood(m.id)}
                      activeOpacity={0.7}
                    >
                      <Icon size={rs(sel ? 32 : 28)} color={sel ? m.color : colors.textGhost} strokeWidth={1.5} />
                      <Text style={[S.moodCardLabel, sel && { color: m.color }]}>{getMoodLabel(m)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Text preview */}
              {tutorText.length > 0 && (
                <View style={S.textPreviewCard}>
                  <View style={S.textPreviewHead}>
                    {inputMode === 'mic' ? <Mic size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                      : inputMode === 'camera' ? <Camera size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                        : <Type size={rs(14)} color={colors.accent} strokeWidth={1.8} />}
                    <Text style={S.textPreviewLabel}>
                      {inputMode === 'mic' ? t('diary.transcribed') : inputMode === 'camera' ? t('diary.fromPhoto') : t('diary.yourText')}
                    </Text>
                    <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => { setStep('input'); }}>
                      <Pencil size={rs(12)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                  <Text style={S.textPreviewContent}>{tutorText}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[S.generateBtn, !selectedMood && S.disabled]}
                onPress={handleProcess}
                disabled={!selectedMood}
                activeOpacity={0.7}
              >
                <Sparkles size={rs(16)} color={selectedMood ? '#fff' : colors.textGhost} strokeWidth={1.8} />
                <Text style={[S.generateBtnText, !selectedMood && { color: colors.textGhost }]}>
                  {t('diary.generateFor', { name: petName })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ══════ STEP: PROCESSING ══════ */}
          {step === 'processing' && (
            <View style={S.processingWrap}>
              <View style={S.processingIcon}>
                <Sparkles size={rs(40)} color={colors.purple} strokeWidth={1.5} />
              </View>
              <Text style={S.processingTitle}>{t('diary.generating')}</Text>

              {processingLines.map((line, i) => (
                <View key={i} style={[S.procLine, processingLine <= i && { opacity: 0.2 }]}>
                  {processingLine > i
                    ? <Check size={rs(14)} color={colors.success} strokeWidth={2.5} />
                    : <View style={S.procDot}>{processingLine === i && <View style={S.procDotInner} />}</View>}
                  <Text style={[S.procText, processingLine > i && { color: colors.textSec }]}>{line}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ══════ STEP: PREVIEW ══════ */}
          {step === 'preview' && (
            <View style={S.stepWrap}>
              {/* Tutor wrote */}
              {tutorText.length > 0 && (
                <View style={S.previewTutor}>
                  <View style={S.previewTutorHead}>
                    <View style={S.previewTutorIcon}>
                      <PetIcon size={rs(12)} color={colors.accent} strokeWidth={1.8} />
                    </View>
                    <Text style={S.previewTutorLabel}>{t('diary.tutorWrote')}</Text>
                    <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => setStep('input')}>
                      <Pencil size={rs(12)} color={colors.accent} strokeWidth={1.8} />
                    </TouchableOpacity>
                  </View>
                  <Text style={S.previewTutorText}>{tutorText}</Text>
                </View>
              )}

              {/* AI narration */}
              <View style={S.previewNarration}>
                <View style={S.previewNarHead}>
                  <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
                  <Text style={S.previewNarLabel}>{petName.toUpperCase()} {t('diary.narrates')}</Text>
                  <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={handleRegenerate}>
                    <RefreshCw size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                  </TouchableOpacity>
                </View>
                <Text style={S.previewNarText}>"{aiNarration}"</Text>
                <View style={S.previewNarFooter}>
                  <Text style={S.previewNarAuthor}>— {petName}</Text>
                  <PetIcon size={rs(12)} color={colors.accent} strokeWidth={1.8} />
                </View>
              </View>

              {/* Mood + Score */}
              {moodData && (
                <View style={S.moodScoreRow}>
                  <View style={[S.moodScoreCard, { backgroundColor: moodData.color + '10', borderColor: moodData.color + '15' }]}>
                    {React.createElement(MOOD_ICONS[moodData.id], { size: rs(24), color: moodData.color, strokeWidth: 1.5 })}
                    <View>
                      <Text style={[S.moodScoreName, { color: moodData.color }]}>{getMoodLabel(moodData)}</Text>
                      <Text style={S.moodScoreSub}>{t('diary.selectedMood')}</Text>
                    </View>
                  </View>
                  <View style={S.aiScoreCard}>
                    <Text style={S.aiScoreNum}>{aiMoodScore}</Text>
                    <Text style={S.aiScoreLbl}>{t('diary.aiScore')}</Text>
                  </View>
                </View>
              )}

              {/* Tags */}
              <View style={S.tagsSection}>
                <View style={S.tagsHead}>
                  <Tag size={rs(14)} color={colors.petrol} strokeWidth={1.8} />
                  <Text style={S.tagsLabel}>{t('diary.tagsLabel')}</Text>
                  <Text style={S.tagsAi}>{t('diary.aiSuggestedTags')}</Text>
                </View>
                <View style={S.tagsWrap}>
                  {[...new Set([...aiTags, ...SUGGESTED_TAGS.slice(0, 6)])].map((tag) => {
                    const isSel = selectedTags.includes(tag) || aiTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[S.tagChip, isSel && S.tagChipActive]}
                        onPress={() => toggleTag(tag)}
                        activeOpacity={0.7}
                      >
                        <Text style={[S.tagChipText, isSel && S.tagChipTextActive]}>#{t(`diary.${tag}`)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Special moment toggle */}
              <TouchableOpacity
                style={[S.specialToggle, isSpecial && S.specialToggleActive]}
                onPress={() => setIsSpecial(!isSpecial)}
                activeOpacity={0.7}
              >
                <Star size={rs(20)} color={isSpecial ? colors.gold : colors.textGhost} strokeWidth={1.8} fill={isSpecial ? colors.gold : 'none'} />
                <View style={{ flex: 1 }}>
                  <Text style={[S.specialLabel, isSpecial && { color: colors.gold }]}>{t('diary.specialMoment')}</Text>
                  <Text style={S.specialHint}>{t('diary.specialHint')}</Text>
                </View>
              </TouchableOpacity>

              {/* Action buttons */}
              <View style={S.actionRow}>
                <TouchableOpacity style={S.redoBtn} onPress={() => setStep('mood')} activeOpacity={0.7}>
                  <RefreshCw size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                  <Text style={S.redoBtnText}>{t('diary.regenerate')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.publishBtn} onPress={handlePublish} disabled={isSaving} activeOpacity={0.7}>
                  {isAdding
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Send size={rs(16)} color="#fff" strokeWidth={1.8} />}
                  <Text style={S.publishBtnText}>{t('diary.publishDiary')}</Text>
                </TouchableOpacity>
              </View>

              {/* Delete — only in edit mode */}
              {isEditing && (
                <TouchableOpacity style={S.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
                  <Trash2 size={rs(16)} color={colors.danger} strokeWidth={1.8} />
                  <Text style={S.deleteBtnText}>{t('diary.deleteEntry')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ══════ STEP: DONE ══════ */}
          {step === 'done' && (
            <View style={S.doneWrap}>
              <View style={S.doneIcon}>
                <Check size={rs(44)} color={colors.success} strokeWidth={2.5} />
              </View>
              <Text style={S.doneTitle}>{isEditing ? t('diary.updated') : t('diary.published')}</Text>
              <Text style={S.doneSub}>{t('diary.savedInDiary', { name: petName })}</Text>

              <View style={S.doneBadges}>
                {['diarySaved', 'moodRegistered', 'embeddingGenerated', 'ragUpdated'].map((key) => (
                  <View key={key} style={S.doneBadge}>
                    <Check size={rs(10)} color={colors.success} strokeWidth={2.5} />
                    <Text style={S.doneBadgeText}>{t(`diary.${key}`)}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={S.newEntryBtn} onPress={handleNewEntry} activeOpacity={0.7}>
                <Plus size={rs(14)} color={colors.accent} strokeWidth={1.8} />
                <Text style={S.newEntryText}>{t('diary.newEntry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: rs(20) },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingTop: rs(12), paddingBottom: rs(8) },
  headerBtn: { width: rs(42), height: rs(42), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },

  // Progress
  progressRow: { flexDirection: 'row', gap: rs(4), paddingHorizontal: rs(20), paddingTop: rs(12) },
  progressSeg: { flex: 1, height: rs(3), borderRadius: rs(2), backgroundColor: colors.border },
  progressSegActive: { backgroundColor: colors.accent },

  stepWrap: { paddingTop: rs(20) },
  stepTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text, marginBottom: rs(6) },
  stepSub: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim, marginBottom: rs(24) },

  // ── Input chooser ──
  voiceBtn: { alignItems: 'center', gap: rs(14), backgroundColor: colors.accent + '12', borderWidth: 2, borderColor: colors.accent + '30', borderRadius: rs(22), paddingVertical: rs(28), paddingHorizontal: rs(20), marginBottom: rs(14) },
  voiceIconWrap: { width: rs(72), height: rs(72), borderRadius: rs(24), backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  voiceBtnTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.accent },
  voiceBtnSub: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim },
  secondaryRow: { flexDirection: 'row', gap: rs(12) },
  secondaryBtn: { flex: 1, alignItems: 'center', gap: rs(10), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(18), paddingVertical: rs(22), paddingHorizontal: rs(14) },
  secIconWrap: { width: rs(48), height: rs(48), borderRadius: rs(16), alignItems: 'center', justifyContent: 'center' },
  secLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  secHint: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'center' },

  // ── Recording (STT) ──
  recordingWrap: { alignItems: 'center', paddingVertical: rs(30), gap: rs(16) },
  recordingPulseOuter: { width: rs(110), height: rs(110), borderRadius: rs(55), backgroundColor: colors.accent + '15', alignItems: 'center', justifyContent: 'center' },
  recordingMicBtn: { width: rs(80), height: rs(80), borderRadius: rs(28), backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  recordingTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.accent },
  recordingHint: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim },
  recordingTranscript: { width: '100%', backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16), borderWidth: 1, borderColor: colors.accent + '20', minHeight: rs(80) },
  recordingTranscriptText: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.text, lineHeight: fs(22) },
  recordingTranscriptPlaceholder: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textGhost, fontStyle: 'italic' },

  // ── Text input ──
  textAreaWrap: { backgroundColor: colors.card, borderRadius: rs(18), borderWidth: 1.5, borderColor: colors.border, padding: rs(16), marginBottom: rs(16), minHeight: rs(140) },
  textAreaActive: { borderColor: colors.accent + '40' },
  textArea: { fontFamily: 'Sora_400Regular', fontSize: fs(15), color: colors.text, minHeight: rs(100), lineHeight: fs(24) },
  textBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: rs(8), borderTopWidth: 1, borderTopColor: colors.border, paddingTop: rs(10) },
  textBarIcons: { flexDirection: 'row', gap: rs(14) },
  charCount: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textGhost },
  nextBtn: { backgroundColor: colors.accent, borderRadius: rs(14), paddingVertical: rs(15), alignItems: 'center' },
  nextBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },
  disabled: { opacity: 0.5 },

  // ── Mood ──
  aiSuggestBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(16) },
  aiSuggestText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.purple },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10), marginBottom: rs(20) },
  moodCard: { width: '31%', paddingVertical: rs(18), paddingHorizontal: rs(8), borderRadius: rs(18), backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', gap: rs(8) },
  moodCardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim },
  textPreviewCard: { backgroundColor: colors.card, borderRadius: rs(16), padding: rs(14), marginBottom: rs(16), borderWidth: 1, borderColor: colors.border },
  textPreviewHead: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  textPreviewLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim },
  textPreviewContent: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: fs(20) },
  generateBtn: { backgroundColor: colors.accent, borderRadius: rs(14), paddingVertical: rs(15), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8) },
  generateBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },

  // ── Processing ──
  processingWrap: { alignItems: 'center', paddingVertical: rs(40) },
  processingIcon: { width: rs(90), height: rs(90), borderRadius: rs(30), backgroundColor: colors.purple + '10', borderWidth: 2.5, borderColor: colors.purple + '25', alignItems: 'center', justifyContent: 'center', marginBottom: rs(28) },
  processingTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.purple, marginBottom: rs(24) },
  procLine: { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(10) },
  procText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textGhost },
  procDot: { width: rs(14), height: rs(14), borderRadius: rs(7), borderWidth: 2, borderColor: colors.textGhost, alignItems: 'center', justifyContent: 'center' },
  procDotInner: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: colors.purple },

  // ── Preview ──
  previewTutor: { backgroundColor: colors.card, borderRadius: rs(16), borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: rs(14), borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0 },
  previewTutorHead: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  previewTutorIcon: { width: rs(22), height: rs(22), borderRadius: rs(7), backgroundColor: colors.accent + '12', alignItems: 'center', justifyContent: 'center' },
  previewTutorLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim },
  previewTutorText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: fs(20) },

  previewNarration: { backgroundColor: colors.card, borderRadius: rs(16), borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: rs(16), marginBottom: rs(16), borderWidth: 1, borderColor: colors.purple + '15', borderTopWidth: 1, borderTopColor: colors.border },
  previewNarHead: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(10) },
  previewNarLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.purple },
  previewNarText: { fontFamily: 'Caveat_400Regular', fontSize: fs(16), color: colors.text, lineHeight: fs(30), fontStyle: 'italic' },
  previewNarFooter: { flexDirection: 'row', alignItems: 'center', gap: rs(4), marginTop: rs(10), justifyContent: 'flex-end' },
  previewNarAuthor: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost },

  moodScoreRow: { flexDirection: 'row', gap: rs(10), marginBottom: rs(16) },
  moodScoreCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: rs(10), borderRadius: rs(14), padding: rs(12), borderWidth: 1 },
  moodScoreName: { fontFamily: 'Sora_700Bold', fontSize: fs(13) },
  moodScoreSub: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, marginTop: rs(1) },
  aiScoreCard: { width: rs(80), backgroundColor: colors.card, borderRadius: rs(14), padding: rs(12), borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  aiScoreNum: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(22), color: colors.accent },
  aiScoreLbl: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  tagsSection: { marginBottom: rs(16) },
  tagsHead: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(10) },
  tagsLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim },
  tagsAi: { fontFamily: 'Sora_600SemiBold', fontSize: fs(9), color: colors.purple, marginLeft: rs(4) },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  tagChip: { paddingHorizontal: rs(12), paddingVertical: rs(5), borderRadius: rs(8), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  tagChipActive: { backgroundColor: colors.petrol + '15', borderColor: colors.petrol + '35' },
  tagChipText: { fontFamily: 'Sora_500Medium', fontSize: fs(11), color: colors.textDim },
  tagChipTextActive: { color: colors.petrol, fontFamily: 'Sora_700Bold' },

  specialToggle: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(14), padding: rs(14), marginBottom: rs(20) },
  specialToggleActive: { backgroundColor: colors.gold + '08', borderColor: colors.gold + '30' },
  specialLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.textSec },
  specialHint: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, marginTop: rs(2) },

  actionRow: { flexDirection: 'row', gap: rs(10) },
  redoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(14), paddingVertical: rs(14) },
  redoBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.textSec },
  publishBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.accent, borderRadius: rs(14), paddingVertical: rs(14) },
  publishBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), marginTop: rs(16), backgroundColor: colors.danger + '10', borderWidth: 1.5, borderColor: colors.danger + '25', borderRadius: rs(14), paddingVertical: rs(14) },
  deleteBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.danger },

  // ── Done ──
  doneWrap: { alignItems: 'center', paddingVertical: rs(50) },
  doneIcon: { width: rs(90), height: rs(90), borderRadius: rs(30), backgroundColor: colors.success + '10', borderWidth: 3, borderColor: colors.success + '30', alignItems: 'center', justifyContent: 'center', marginBottom: rs(24) },
  doneTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(22), color: colors.success, marginBottom: rs(8) },
  doneSub: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textSec, marginBottom: rs(20) },
  doneBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), justifyContent: 'center', marginBottom: rs(24) },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(4), backgroundColor: colors.success + '08', paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8) },
  doneBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.success },
  newEntryBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(8), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(14), paddingHorizontal: rs(32), paddingVertical: rs(14) },
  newEntryText: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.accent },
});
