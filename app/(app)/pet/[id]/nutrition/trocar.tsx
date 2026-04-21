/**
 * nutrition/trocar.tsx — Tela 5: Trocar ração (AI-first)
 *
 * Fluxo:
 *   1. Tutor fala (STT) ou fotografa embalagem (câmera)
 *   2. Transcrição aparece em campo editável
 *   3. "Extrair dados com IA" chama classify-diary-entry
 *   4. Card de confirmação com produto / marca / fase / porção
 *   5. Tutor confirma → registrarRacao
 *
 * REGRAS: NÃO modificar useDiaryEntry, diary/new.tsx, DocumentScanner,
 *         classify-diary-entry, analyze-pet-photo.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Switch, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { compressImageForAI } from '../../../../../lib/imageCompression';
import { getLocales } from 'expo-localization';
import {
  ChevronLeft, Mic, MicOff, Camera, Images,
  CheckCircle, AlertTriangle, Sparkles, Trash2, ChevronRight,
} from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { usePet } from '../../../../../hooks/usePets';
import { useToast } from '../../../../../components/Toast';
import { supabase } from '../../../../../lib/supabase';

// ── STT (optional native module) ───────────────────────────────────────────

let SpeechModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent | null = null;
try {
  const sr = require('expo-speech-recognition');
  SpeechModule = sr.ExpoSpeechRecognitionModule;
  useSpeechEvent = sr.useSpeechRecognitionEvent;
} catch (_e) { /* STT unavailable on this platform */ }

// ── Types ──────────────────────────────────────────────────────────────────

type LifeStage = 'puppy' | 'adult' | 'senior';

interface ExtractedData {
  product_name: string;
  brand: string;
  life_stage: LifeStage;
  daily_portion: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const WAVE_COUNT = 8;

// ── Component ──────────────────────────────────────────────────────────────

export default function TrocarRacaoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { registrarRacao, isRegistrandoRacao } = useNutricao(petId ?? '');
  const { data: pet } = usePet(petId ?? '');
  const { toast } = useToast();

  // ── Refs ─────────────────────────────────────────────────────────────────
  const intentionalStopRef = useRef(false);
  const barAnims = useRef(
    Array.from({ length: WAVE_COUNT }, () => new Animated.Value(0.2)),
  ).current;

  // ── State ─────────────────────────────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [transcription, setTranscription] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isCapturingImage, setIsCapturingImage] = useState(false);
  const [gradualTransition, setGradualTransition] = useState(true);
  // scan flow: null = not started, 'front' = front captured, 'processing' = running OCR
  const [scanStep, setScanStep] = useState<null | 'front' | 'processing'>(null);
  const frontBase64Ref = useRef<string | null>(null);
  // which input source initiated the current scan ('camera' | 'gallery')
  const scanSourceRef = useRef<'camera' | 'gallery' | null>(null);

  // ── STT event handlers ────────────────────────────────────────────────────

  const noopHook = (_event: string, _cb: (e: never) => void) => {};
  const useEvent = useSpeechEvent ?? noopHook;

  useEvent('result', (event: { results: { transcript: string }[]; isFinal: boolean }) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setTranscription((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript));
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
    const fatalErrors = ['permission', 'not-allowed', 'service-not-available'];
    if (fatalErrors.includes(event.error)) {
      intentionalStopRef.current = true;
      setIsListening(false);
      toast(t('diary.micError'), 'error');
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalStopRef.current = true;
      if (SpeechModule) SpeechModule.stop();
    };
  }, []);

  // ── Waveform animation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isListening) {
      barAnims.forEach((anim) =>
        Animated.timing(anim, { toValue: 0.2, duration: 300, useNativeDriver: true }).start(),
      );
      return;
    }
    const animateBars = () => {
      barAnims.forEach((anim, i) => {
        const target = 0.15 + Math.random() * 0.85;
        Animated.timing(anim, {
          toValue: target,
          duration: 130 + i * 15,
          useNativeDriver: true,
        }).start();
      });
    };
    animateBars();
    const intervalId = setInterval(animateBars, 140);
    return () => clearInterval(intervalId);
  }, [isListening, barAnims]);

  // ── STT helpers ───────────────────────────────────────────────────────────

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
    SpeechModule.start({
      lang: getLocales()[0]?.languageTag ?? 'pt-BR',
      interimResults: true,
      maxAlternatives: 1,
    });
  }, [toast, t]);

  const stopListening = useCallback(() => {
    intentionalStopRef.current = true;
    if (SpeechModule) SpeechModule.stop();
    setIsListening(false);
    setInterimText('');
  }, []);

  const handleMicToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      setTranscription('');
      setExtractedData(null);
      await startListening();
    }
  }, [isListening, stopListening, startListening]);

  // ── Life stage detection (must be before camera handler) ─────────────────

  const detectLifeStage = useCallback((text: string): LifeStage => {
    const lower = text.toLowerCase();
    if (lower.match(/filhote|puppy|junior|kitten/)) return 'puppy';
    if (lower.match(/senior|idoso|mature/)) return 'senior';
    return 'adult';
  }, []);

  const petLifeStage: LifeStage = (() => {
    const months = pet?.estimated_age_months ?? 0;
    if (months < 12) return 'puppy';
    if (months > 84) return 'senior';
    return 'adult';
  })();

  // ── AI extraction (must be before camera handler) ─────────────────────────

  const extractFromText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        classifications?: { type: string; extracted_data?: Record<string, string> }[];
      }>('classify-diary-entry', {
        body: {
          pet_id: petId,
          text,
          input_type: 'text',
          language: getLocales()[0]?.languageTag ?? 'pt-BR',
        },
      });
      if (error) throw error;
      const foodCls = data?.classifications?.find((c) => c.type === 'food');
      const d = foodCls?.extracted_data ?? {};
      setExtractedData({
        product_name: d.product_name ?? text.trim(),
        brand: d.brand_name ?? d.brand ?? '',
        life_stage: detectLifeStage(`${JSON.stringify(d)} ${text}`),
        daily_portion: d.daily_portion ?? d.portion_grams ?? '',
      });
    } catch {
      toast(t('errors.generic'), 'error');
    } finally {
      setIsExtracting(false);
    }
  }, [petId, detectLifeStage, toast, t]);

  // ── Camera / OCR — frente + verso ────────────────────────────────────────

  const captureImage = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast(t('toast.cameraPermission'), 'warning');
      return null;
    }
    const t_capture = Date.now();
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]?.uri) return null;
    console.log('[TrocarRacao] capture ok ms:', Date.now() - t_capture);
    const compressed = await compressImageForAI(result.assets[0].uri);
    return compressed.base64;
  }, [toast, t]);

  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast(t('toast.galleryPermission'), 'warning');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]?.uri) return null;
    const compressed = await compressImageForAI(result.assets[0].uri);
    return compressed.base64;
  }, [toast, t]);

  const runOcr = useCallback(async (frontB64: string, backB64?: string) => {
    setIsCapturingImage(true);
    setExtractedData(null);
    setTranscription('');
    const frontKB = Math.round(frontB64.length * 0.75 / 1024);
    const backKB = backB64 ? Math.round(backB64.length * 0.75 / 1024) : 0;
    const t_ocr = Date.now();
    try {
      const imagesText = backB64
        ? 'Frente e verso da embalagem de ração. Extraia produto, marca, fase de vida, porção diária e calorias.'
        : 'Frente da embalagem de ração. Extraia produto, marca, fase de vida e porção.';
      console.log('[TrocarRacao] OCR → START sides:', backB64 ? 'front+back' : 'front only',
        '| payload KB:', frontKB + backKB, `(front:${frontKB}, back:${backKB})`);
      const photos = backB64 ? [frontB64, backB64] : undefined;
      const { data, error } = await supabase.functions.invoke<{
        classifications?: { type: string; extracted_data?: Record<string, string> }[];
        description?: string;
      }>('classify-diary-entry', {
        body: {
          pet_id: petId,
          text: imagesText,
          input_type: 'photo',
          language: getLocales()[0]?.languageTag ?? 'pt-BR',
          photo_base64: backB64 ? undefined : frontB64,
          photos_base64: photos,
        },
      });
      console.log('[TrocarRacao] OCR ← done ms:', Date.now() - t_ocr,
        '| error:', error?.message ?? null,
        '| classifications:', JSON.stringify(data?.classifications?.map((c) => ({ type: c.type, keys: Object.keys(c.extracted_data ?? {}) }))),
        '| description:', data?.description?.slice(0, 100));
      if (error) throw error;

      const foodCls = data?.classifications?.find((c) => c.type === 'food');
      if (foodCls?.extracted_data?.product_name) {
        const d = foodCls.extracted_data;
        console.log('[TrocarRacao] OCR direct extract:', JSON.stringify(d));
        const rawText = [d.product_name, d.brand_name ?? d.brand].filter(Boolean).join(' ');
        setTranscription(rawText);
        setExtractedData({
          product_name: d.product_name,
          brand: d.brand_name ?? d.brand ?? '',
          life_stage: detectLifeStage(`${JSON.stringify(d)} ${rawText}`),
          daily_portion: d.daily_portion ?? d.portion_grams ?? '',
        });
      } else if (data?.description) {
        console.log('[TrocarRacao] OCR fallback to description, auto-extracting');
        setTranscription(data.description);
        await extractFromText(data.description);
      } else {
        toast(t('nutrition.trocarOcrNoText'), 'info');
      }
    } catch (e: unknown) {
      console.log('[TrocarRacao] OCR error:', e instanceof Error ? e.message : String(e));
      toast(t('errors.generic'), 'error');
    } finally {
      setIsCapturingImage(false);
      setScanStep(null);
      frontBase64Ref.current = null;
    }
  }, [petId, toast, t, detectLifeStage, extractFromText]);

  const handleCameraPress = useCallback(async () => {
    if (isListening) stopListening();

    if (scanStep === null) {
      const t_front = Date.now();
      const b64 = await captureImage();
      if (!b64) return;
      frontBase64Ref.current = b64;
      scanSourceRef.current = 'camera';
      setScanStep('front');
      console.log('[TrocarRacao] front captured+compressed ms:', Date.now() - t_front);
    } else if (scanStep === 'front' && scanSourceRef.current === 'camera') {
      const t_back = Date.now();
      const b64Back = await captureImage();
      console.log('[TrocarRacao] back captured+compressed ms:', Date.now() - t_back, 'hasBack:', !!b64Back);
      setScanStep('processing');
      await runOcr(frontBase64Ref.current!, b64Back ?? undefined);
    }
  }, [isListening, stopListening, scanStep, captureImage, runOcr]);

  const handleGalleryPress = useCallback(async () => {
    if (isListening) stopListening();

    if (scanStep === null) {
      const t_front = Date.now();
      const b64 = await pickFromGallery();
      if (!b64) return;
      frontBase64Ref.current = b64;
      scanSourceRef.current = 'gallery';
      setScanStep('front');
      console.log('[TrocarRacao] front gallery+compressed ms:', Date.now() - t_front);
    } else if (scanStep === 'front' && scanSourceRef.current === 'gallery') {
      const t_back = Date.now();
      const b64Back = await pickFromGallery();
      console.log('[TrocarRacao] back gallery+compressed ms:', Date.now() - t_back, 'hasBack:', !!b64Back);
      setScanStep('processing');
      await runOcr(frontBase64Ref.current!, b64Back ?? undefined);
    }
  }, [isListening, stopListening, scanStep, pickFromGallery, runOcr]);

  const handleScanReset = useCallback(() => {
    setScanStep(null);
    frontBase64Ref.current = null;
    scanSourceRef.current = null;
    setExtractedData(null);
    setTranscription('');
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    console.log('[TrocarRacao] handleSave START — extractedData:', JSON.stringify(extractedData), 'petId:', petId);
    if (!extractedData?.product_name) {
      console.warn('[TrocarRacao] handleSave ABORT — no product_name');
      return;
    }
    const payload = {
      product_name: extractedData.product_name,
      brand: extractedData.brand || undefined,
      portion_grams: extractedData.daily_portion
        ? parseFloat(extractedData.daily_portion)
        : undefined,
      notes: gradualTransition ? t('nutrition.trocarGradualNote') : undefined,
      source: 'ocr' as const,
    };
    console.log('[TrocarRacao] handleSave payload:', JSON.stringify(payload));
    try {
      await registrarRacao(payload);
      console.log('[TrocarRacao] handleSave SUCCESS');
      toast(t('nutrition.trocarSuccess'), 'success');
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[TrocarRacao] handleSave ERROR:', msg, err);
      toast(t('errors.generic'), 'error');
    }
  }, [extractedData, petId, gradualTransition, registrarRacao, toast, t, router]);

  // ── Derived values ────────────────────────────────────────────────────────

  const displayText = isListening && interimText
    ? (transcription ? `${transcription} ${interimText}` : interimText)
    : transcription;

  const lifeStageMatch = extractedData
    ? extractedData.life_stage === petLifeStage
    : null;

  const canExtract = transcription.trim().length > 0
    && !isListening && !isExtracting && !extractedData;

  const canSave = !!extractedData?.product_name && !isRegistrandoRacao;

  const lifeStageLabel: Record<LifeStage, string> = {
    puppy: t('nutrition.trocarLifeStagePuppy'),
    adult: t('nutrition.trocarLifeStageAdult'),
    senior: t('nutrition.trocarLifeStageSenior'),
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.trocarTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Instruction */}
        <View style={s.instructionCard}>
          <Text style={s.instructionTitle}>{t('nutrition.trocarHowTitle')}</Text>
          <Text style={s.instructionText}>{t('nutrition.trocarHowDesc')}</Text>
        </View>

        {/* Input buttons — Mic + Camera */}
        <View style={s.inputButtons}>
          <TouchableOpacity
            style={[s.inputBtn, isListening && s.inputBtnMicActive]}
            onPress={handleMicToggle}
            activeOpacity={0.8}
          >
            <View style={[s.inputBtnIcon, { backgroundColor: isListening ? colors.dangerSoft : colors.accentSoft }]}>
              {isListening
                ? <MicOff size={rs(24)} color={colors.danger} strokeWidth={2} />
                : <Mic size={rs(24)} color={colors.accent} strokeWidth={2} />}
            </View>
            <Text style={s.inputBtnLabel}>
              {isListening ? t('nutrition.trocarMicStop') : t('nutrition.trocarMicLabel')}
            </Text>
            <Text style={s.inputBtnSub}>
              {isListening ? t('nutrition.trocarMicListening') : t('nutrition.trocarMicSub')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.inputBtn,
              scanStep === 'front' && scanSourceRef.current === 'camera' && s.inputBtnCamActive,
            ]}
            onPress={handleCameraPress}
            disabled={isCapturingImage || scanStep === 'processing' || (scanStep === 'front' && scanSourceRef.current === 'gallery')}
            activeOpacity={0.8}
          >
            <View style={[s.inputBtnIcon, {
              backgroundColor: scanStep === 'front' && scanSourceRef.current === 'camera'
                ? colors.limeSoft : colors.accentSoft,
            }]}>
              {(isCapturingImage && scanSourceRef.current === 'camera') || (scanStep === 'processing' && scanSourceRef.current === 'camera')
                ? <ActivityIndicator size="small" color={colors.accent} />
                : <Camera size={rs(24)} color={scanStep === 'front' && scanSourceRef.current === 'camera' ? colors.lime : colors.accent} strokeWidth={2} />}
            </View>
            <Text style={s.inputBtnLabel}>
              {scanStep === 'front' && scanSourceRef.current === 'camera' ? t('nutrition.trocarScanBack') : t('nutrition.trocarScanLabel')}
            </Text>
            <Text style={s.inputBtnSub}>
              {scanStep === 'front' && scanSourceRef.current === 'camera' ? t('nutrition.trocarScanBackSub') : t('nutrition.trocarScanSub')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gallery button — frente e verso da galeria */}
        <TouchableOpacity
          style={[s.galleryBtn,
            scanStep === 'front' && scanSourceRef.current === 'gallery' && s.galleryBtnActive,
            (scanStep === 'processing' || (scanStep === 'front' && scanSourceRef.current === 'camera')) && s.galleryBtnDisabled,
          ]}
          onPress={handleGalleryPress}
          disabled={isCapturingImage || scanStep === 'processing' || (scanStep === 'front' && scanSourceRef.current === 'camera')}
          activeOpacity={0.8}
        >
          <View style={[s.galleryBtnIcon, {
            backgroundColor: scanStep === 'front' && scanSourceRef.current === 'gallery'
              ? colors.limeSoft : colors.accentSoft,
          }]}>
            {(scanStep === 'processing' && scanSourceRef.current === 'gallery')
              ? <ActivityIndicator size="small" color={colors.accent} />
              : <Images size={rs(22)} color={scanStep === 'front' && scanSourceRef.current === 'gallery' ? colors.lime : colors.accent} strokeWidth={2} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.galleryBtnLabel}>
              {scanStep === 'front' && scanSourceRef.current === 'gallery'
                ? t('nutrition.trocarGalleryBackLabel')
                : t('nutrition.trocarGalleryLabel')}
            </Text>
            <Text style={s.galleryBtnSub}>
              {scanStep === 'front' && scanSourceRef.current === 'gallery'
                ? t('nutrition.trocarGalleryBackSub')
                : t('nutrition.trocarGalleryFrontSub')}
            </Text>
          </View>
          <ChevronRight size={rs(14)} color={colors.textDim} />
        </TouchableOpacity>

        {/* Scan progress indicator */}
        {scanStep === 'front' && (
          <View style={s.scanStepCard}>
            <View style={s.scanDot} />
            <View style={[s.scanDot, { backgroundColor: colors.border }]} />
            <Text style={s.scanStepText}>
              {scanSourceRef.current === 'gallery'
                ? t('nutrition.trocarScanStepBackGallery')
                : t('nutrition.trocarScanStepBack')}
            </Text>
            <TouchableOpacity onPress={handleScanReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Trash2 size={rs(14)} color={colors.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* Waveform */}
        {isListening && (
          <View style={s.wavesCard}>
            <View style={s.waves}>
              {barAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[s.waveBar, { transform: [{ scaleY: anim }] }]}
                />
              ))}
            </View>
            <Text style={s.wavesText}>{t('nutrition.trocarWavesText')}</Text>
          </View>
        )}

        {/* Text input — always visible */}
        <View style={s.transcriptionCard}>
          <Text style={s.transcriptionLabel}>
            {isListening
              ? t('nutrition.trocarTranscribing')
              : displayText.length > 0
                ? t('nutrition.trocarTranscriptionLabel')
                : t('nutrition.trocarInputLabel')}
          </Text>
          <TextInput
            style={s.transcriptionInput}
            value={displayText}
            onChangeText={(text) => {
              if (!isListening) {
                setTranscription(text);
                setExtractedData(null);
              }
            }}
            multiline
            placeholder={t('nutrition.trocarInputPlaceholder')}
            placeholderTextColor={colors.placeholder}
            editable={!isListening}
          />
          {canExtract && (
            <TouchableOpacity
              style={s.extractBtn}
              onPress={() => extractFromText(transcription)}
              activeOpacity={0.8}
            >
              <Sparkles size={rs(14)} color={colors.accent} strokeWidth={1.8} />
              <Text style={s.extractBtnText}>{t('nutrition.trocarExtractBtn')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Extracting loader */}
        {isExtracting && (
          <View style={s.loadingCard}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={s.loadingText}>{t('nutrition.trocarExtracting')}</Text>
          </View>
        )}

        {/* Extracted data card */}
        {extractedData && (
          <View style={s.extractedCard}>
            <View style={s.extractedHeader}>
              <CheckCircle size={rs(14)} color={colors.success} strokeWidth={2} />
              <Text style={[s.extractedTitle, { flex: 1 }]}>{t('nutrition.trocarExtractedTitle')}</Text>
              <TouchableOpacity
                onPress={() => { setExtractedData(null); setTranscription(''); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={rs(16)} color={colors.danger} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {lifeStageMatch === false && (
              <View style={s.mismatchAlert}>
                <AlertTriangle size={rs(12)} color={colors.danger} strokeWidth={2} />
                <Text style={s.mismatchText}>
                  {t('nutrition.trocarMismatchText', {
                    lifeStage: lifeStageLabel[extractedData.life_stage],
                    name: pet?.name ?? '...',
                    petStage: lifeStageLabel[petLifeStage],
                  })}
                </Text>
              </View>
            )}

            {lifeStageMatch === true && (
              <View style={s.okAlert}>
                <CheckCircle size={rs(12)} color={colors.success} strokeWidth={2} />
                <Text style={s.okText}>
                  {t('nutrition.trocarAdequateText', { name: pet?.name ?? '...' })}
                </Text>
              </View>
            )}

            <View style={s.fieldsGrid}>
              <View style={s.fieldItem}>
                <Text style={s.fieldLabel}>{t('nutrition.trocarFieldProduct')}</Text>
                <Text style={s.fieldValue} numberOfLines={2}>{extractedData.product_name || '—'}</Text>
              </View>
              <View style={s.fieldItem}>
                <Text style={s.fieldLabel}>{t('nutrition.trocarFieldBrand')}</Text>
                <Text style={s.fieldValue} numberOfLines={2}>{extractedData.brand || '—'}</Text>
              </View>
              <View style={s.fieldItem}>
                <Text style={s.fieldLabel}>{t('nutrition.trocarFieldLifeStage')}</Text>
                <Text style={[
                  s.fieldValue,
                  lifeStageMatch === false && { color: colors.danger },
                ]}>
                  {lifeStageLabel[extractedData.life_stage]}
                </Text>
              </View>
              <View style={s.fieldItem}>
                <Text style={s.fieldLabel}>{t('nutrition.trocarFieldPortion')}</Text>
                <Text style={s.fieldValue}>{extractedData.daily_portion || '—'}</Text>
              </View>
            </View>

            <Text style={s.aiDisclaimer}>{t('common.aiVetDisclaimer')}</Text>
          </View>
        )}

        {/* Gradual transition toggle */}
        {extractedData && (
          <View style={s.toggleCard}>
            <View style={s.toggleCol}>
              <Text style={s.toggleTitle}>{t('nutrition.trocarGradualTitle')}</Text>
              <Text style={s.toggleSub}>{t('nutrition.trocarGradualSub')}</Text>
            </View>
            <Switch
              value={gradualTransition}
              onValueChange={setGradualTransition}
              trackColor={{ false: colors.border, true: colors.lime + '80' }}
              thumbColor={gradualTransition ? colors.lime : colors.textDim}
            />
          </View>
        )}

        {/* Save button */}
        {extractedData && (
          <TouchableOpacity
            style={[s.saveBtn, !canSave && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
          >
            {isRegistrandoRacao
              ? <ActivityIndicator size="small" color="#fff" />
              : <CheckCircle size={rs(18)} color="#fff" strokeWidth={2} />}
            <Text style={s.saveBtnText}>{t('nutrition.trocarConfirmBtn')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text },
  scroll: { flex: 1 },
  content: { padding: rs(16), gap: rs(12), paddingBottom: rs(40) },

  instructionCard: {
    backgroundColor: colors.card, borderRadius: rs(14),
    borderWidth: 1, borderColor: colors.border, padding: rs(14), gap: rs(4),
  },
  instructionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.text },
  instructionText: {
    fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: rs(18),
  },

  inputButtons: { flexDirection: 'row', gap: rs(10) },
  inputBtn: {
    flex: 1, backgroundColor: colors.card, borderRadius: rs(16),
    borderWidth: 1, borderColor: colors.border,
    padding: rs(16), alignItems: 'center', gap: rs(6),
  },
  inputBtnMicActive: { borderColor: colors.danger, borderWidth: 1.5 },
  inputBtnCamActive: { borderColor: colors.accent, borderWidth: 1.5 },
  inputBtnIcon: {
    width: rs(52), height: rs(52), borderRadius: rs(26),
    alignItems: 'center', justifyContent: 'center',
  },
  inputBtnLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  inputBtnSub: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim },

  galleryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.card, borderRadius: rs(14),
    borderWidth: 1, borderColor: colors.border, padding: rs(14),
  },
  galleryBtnActive: { borderColor: colors.lime, borderWidth: 1.5 },
  galleryBtnDisabled: { opacity: 0.4 },
  galleryBtnIcon: {
    width: rs(44), height: rs(44), borderRadius: rs(22),
    alignItems: 'center', justifyContent: 'center',
  },
  galleryBtnLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  galleryBtnSub: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, marginTop: rs(1) },

  scanStepCard: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.limeSoft, borderRadius: rs(12),
    borderWidth: 1, borderColor: colors.lime + '40', padding: rs(12),
  },
  scanDot: {
    width: rs(8), height: rs(8), borderRadius: rs(4),
    backgroundColor: colors.lime,
  },
  scanStepText: { flex: 1, fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.lime },
  wavesCard: {
    backgroundColor: colors.card, borderRadius: rs(12),
    borderWidth: 1, borderColor: colors.accent + '40',
    padding: rs(14), alignItems: 'center', gap: rs(10),
  },
  waves: { flexDirection: 'row', alignItems: 'center', gap: rs(4), height: rs(32) },
  waveBar: {
    width: rs(4), height: rs(28), backgroundColor: colors.accent,
    borderRadius: rs(2),
  },
  wavesText: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textSec },

  transcriptionCard: {
    backgroundColor: colors.card, borderRadius: rs(14),
    borderWidth: 1, borderColor: colors.border, padding: rs(12), gap: rs(8),
  },
  transcriptionLabel: {
    fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.5,
  },
  transcriptionInput: {
    backgroundColor: colors.bgCard, borderRadius: rs(10),
    borderWidth: 1, borderColor: colors.borderLight,
    padding: rs(12), fontFamily: 'Sora_400Regular',
    fontSize: fs(14), color: colors.text,
    minHeight: rs(70), textAlignVertical: 'top',
  },
  extractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6),
    backgroundColor: colors.accentSoft, borderRadius: rs(10),
    paddingVertical: rs(10), borderWidth: 1, borderColor: colors.accent + '40',
  },
  extractBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.accent },

  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: rs(10),
    backgroundColor: colors.card, borderRadius: rs(12),
    borderWidth: 1, borderColor: colors.border, padding: rs(14),
  },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec },

  extractedCard: {
    backgroundColor: colors.card, borderRadius: rs(14),
    borderWidth: 1, borderColor: colors.success + '40', padding: rs(14), gap: rs(10),
  },
  extractedHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  extractedTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.success },

  mismatchAlert: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(8),
    backgroundColor: colors.dangerSoft, borderRadius: rs(10),
    borderWidth: 1, borderColor: colors.danger + '30', padding: rs(10),
  },
  mismatchText: {
    fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.danger,
    flex: 1, lineHeight: rs(17),
  },
  okAlert: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.successSoft, borderRadius: rs(10),
    borderWidth: 1, borderColor: colors.success + '30', padding: rs(10),
  },
  okText: { fontFamily: 'Sora_500Medium', fontSize: fs(11), color: colors.success },

  aiDisclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim,
    textAlign: 'center', marginTop: rs(12), fontStyle: 'italic',
  },

  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  fieldItem: {
    width: '47%', backgroundColor: colors.bgCard, borderRadius: rs(10),
    borderWidth: 1, borderColor: colors.border, padding: rs(10), gap: rs(3),
  },
  fieldLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim },
  fieldValue: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.text },

  toggleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: rs(14),
    borderWidth: 1, borderColor: colors.border, padding: rs(14), gap: rs(12),
  },
  toggleCol: { flex: 1 },
  toggleTitle: { fontFamily: 'Sora_500Medium', fontSize: fs(13), color: colors.text },
  toggleSub: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textSec },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.lime, borderRadius: rs(14), padding: rs(16),
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },
});