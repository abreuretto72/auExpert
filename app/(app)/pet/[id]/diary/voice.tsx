/**
 * VoiceDiary — toggle-based voice entry screen.
 *
 * Flow:
 *   Mount → mic starts automatically (recording)
 *   Tap mic button → toggles recording ↔ paused
 *   When paused → transcript becomes editable TextInput
 *   [Confirmar] → fire-and-forget submitEntry → navigate back immediately
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { ChevronLeft, Check, Mic, Pause } from 'lucide-react-native';
import { colors } from '../../../../../constants/colors';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { spacing, radii } from '../../../../../constants/spacing';
import { useDiaryEntry } from '../../../../../hooks/useDiaryEntry';
import { usePet } from '../../../../../hooks/usePets';
import { useToast } from '../../../../../components/Toast';

// ── STT (optional native module) ──────────────────────────────────────────

let SpeechModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent | null = null;
try {
  const sr = require('expo-speech-recognition');
  SpeechModule = sr.ExpoSpeechRecognitionModule;
  useSpeechEvent = sr.useSpeechRecognitionEvent;
} catch {
  // expo-speech-recognition not available (Expo Go / web)
}

// ── Waveform constants ─────────────────────────────────────────────────────

const BAR_COUNT = 14;
const BAR_CONFIGS = [
  { dur: 420, max: 0.85 }, { dur: 380, max: 1.0 },  { dur: 500, max: 0.65 },
  { dur: 340, max: 0.95 }, { dur: 460, max: 0.75 },  { dur: 400, max: 1.0 },
  { dur: 520, max: 0.55 }, { dur: 360, max: 0.90 },  { dur: 480, max: 0.70 },
  { dur: 320, max: 1.0 },  { dur: 440, max: 0.80 },  { dur: 390, max: 0.65 },
  { dur: 560, max: 0.92 }, { dur: 410, max: 0.78 },
];

type MicState = 'initializing' | 'recording' | 'paused';

// ── Component ──────────────────────────────────────────────────────────────

export default function VoiceDiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { data: pet } = usePet(id!);
  const { submitEntry } = useDiaryEntry(id!);

  // ── State ─────────────────────────────────────────────────────────────────

  const [micState, setMicState] = useState<MicState>('initializing');
  const [tutorText, setTutorText] = useState('');
  const [interimText, setInterimText] = useState('');

  // ── Refs ──────────────────────────────────────────────────────────────────

  const tutorTextRef = useRef(tutorText);
  tutorTextRef.current = tutorText;
  const intentionalStopRef = useRef(false);

  // ── Waveform ──────────────────────────────────────────────────────────────

  const barAnims = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15)),
  ).current;
  const waveLoopsRef = useRef<Animated.CompositeAnimation[]>([]);
  const micPulse = useRef(new Animated.Value(1)).current;
  const micPulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startWave = useCallback(() => {
    waveLoopsRef.current.forEach((l) => l.stop());
    waveLoopsRef.current = barAnims.map((anim, i) => {
      const { dur, max } = BAR_CONFIGS[i];
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: max,  duration: dur,       useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.15, duration: dur * 0.9, useNativeDriver: true }),
        ]),
      );
      setTimeout(() => loop.start(), i * 30);
      return loop;
    });
    // Pulse mic button
    micPulseLoop.current?.stop();
    micPulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(micPulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(micPulse, { toValue: 1.0,  duration: 700, useNativeDriver: true }),
      ]),
    );
    micPulseLoop.current.start();
  }, [barAnims, micPulse]);

  const stopWave = useCallback(() => {
    waveLoopsRef.current.forEach((l) => l.stop());
    waveLoopsRef.current = [];
    micPulseLoop.current?.stop();
    micPulseLoop.current = null;
    barAnims.forEach((anim) =>
      Animated.timing(anim, { toValue: 0.15, duration: 200, useNativeDriver: true }).start(),
    );
    Animated.timing(micPulse, { toValue: 1.0, duration: 200, useNativeDriver: true }).start();
  }, [barAnims, micPulse]);

  // ── STT event plumbing ─────────────────────────────────────────────────────

  const noopHook = (_event: string, _cb: (...args: unknown[]) => void) => {};
  const useEvent = useSpeechEvent ?? noopHook;

  useEvent('result', (event: { results: { transcript: string }[]; isFinal: boolean }) => {
    const transcript = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setTutorText((prev) => (prev ? `${prev} ${transcript}`.trim() : transcript));
      setInterimText('');
    } else {
      setInterimText(transcript);
    }
  });

  useEvent('end', () => {
    if (!intentionalStopRef.current && SpeechModule) {
      // Auto-restart — keeps mic open during recording state
      SpeechModule.start({
        lang: getLocales()[0]?.languageTag ?? 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
      });
      return;
    }
    setMicState((prev) => (prev === 'recording' ? 'paused' : prev));
    setInterimText('');
    stopWave();
  });

  useEvent('error', (event: { error: string }) => {
    if (event.error === 'no-speech') return;
    intentionalStopRef.current = true;
    setMicState('paused');
    setInterimText('');
    stopWave();
    toast(t('diary.micError'), 'error');
  });

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
    setMicState('recording');
    setInterimText('');
    startWave();
    SpeechModule.start({
      lang: getLocales()[0]?.languageTag ?? 'pt-BR',
      interimResults: true,
      maxAlternatives: 1,
    });
  }, [toast, t, startWave]);

  const pauseListening = useCallback(() => {
    intentionalStopRef.current = true;
    if (SpeechModule) SpeechModule.stop();
    setMicState('paused');
    setInterimText('');
    stopWave();
  }, [stopWave]);

  // ── Toggle mic ────────────────────────────────────────────────────────────

  const handleToggleMic = useCallback(() => {
    if (micState === 'recording') {
      pauseListening();
    } else {
      startListening().catch(() => {});
    }
  }, [micState, pauseListening, startListening]);

  // ── Mount / unmount ────────────────────────────────────────────────────────

  useEffect(() => {
    startListening().catch(() => {});
    return () => {
      intentionalStopRef.current = true;
      if (SpeechModule) SpeechModule.stop();
      micPulseLoop.current?.stop();
      waveLoopsRef.current.forEach((l) => l.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Confirm handler ────────────────────────────────────────────────────────

  const handleConfirm = useCallback(() => {
    const text = tutorTextRef.current.trim();
    if (text.length < 3) {
      toast(t('diary.contentMin'), 'warning');
      return;
    }
    // Stop mic if still running
    intentionalStopRef.current = true;
    if (SpeechModule) SpeechModule.stop();
    micPulseLoop.current?.stop();
    waveLoopsRef.current.forEach((l) => l.stop());
    // Fire-and-forget — process in background
    void submitEntry({ text, photosBase64: null, inputType: 'voice' });
    // Navigate back immediately
    router.back();
  }, [router, toast, t, submitEntry]);

  // ── Back navigation ────────────────────────────────────────────────────────

  const handleBack = useCallback(async () => {
    if (tutorTextRef.current.trim().length >= 3) {
      const discard = await confirm({ text: t('diary.discardVoice'), type: 'warning' });
      if (!discard) return;
    }
    intentionalStopRef.current = true;
    if (SpeechModule) SpeechModule.stop();
    micPulseLoop.current?.stop();
    waveLoopsRef.current.forEach((l) => l.stop());
    router.back();
  }, [confirm, t, router]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const subtitleText = (() => {
    if (micState === 'initializing') return t('diary.micInitializing');
    if (micState === 'paused')       return t('diary.micPaused');
    return t('diary.listening');
  })();

  const petName = pet?.name ?? '...';
  const confirmed = tutorText.trim().length >= 3;
  const isRecording = micState === 'recording';

  // ── Fallback: STT not available (Expo Go) ─────────────────────────────────

  if (!SpeechModule) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <ChevronLeft size={rs(20)} color={colors.accent} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {t('diary.micTitle', { name: petName })}
          </Text>
        </View>
        <View style={styles.unavailableContainer}>
          <Text style={styles.unavailableTitle}>{t('diary.micUnavailableTitle')}</Text>
          <Text style={styles.unavailableBody}>{t('diary.micUnavailableBody')}</Text>
          <TouchableOpacity style={styles.unavailableBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.unavailableBtnText}>{t('diary.micUnavailableAction')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <ChevronLeft size={rs(20)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {t('diary.micTitle', { name: petName })}
        </Text>
      </View>

      {/* Status subtitle */}
      <Text style={styles.subtitle}>{subtitleText}</Text>

      {/* Waveform */}
      <View style={styles.waveformContainer}>
        {barAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              {
                transform: [{ scaleY: anim }],
                backgroundColor: isRecording ? colors.accent : colors.textGhost,
              },
            ]}
          />
        ))}
      </View>

      {/* Mic toggle button */}
      <View style={styles.micToggleRow}>
        <Animated.View style={{ transform: [{ scale: micPulse }] }}>
          <TouchableOpacity
            style={[
              styles.micToggleBtn,
              isRecording ? styles.micToggleBtnRecording : styles.micToggleBtnPaused,
            ]}
            onPress={handleToggleMic}
            activeOpacity={0.8}
          >
            {isRecording
              ? <Pause size={rs(26)} color="#fff" strokeWidth={2} />
              : <Mic  size={rs(26)} color="#fff" strokeWidth={2} />
            }
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.micToggleLabel}>
          {isRecording ? t('diary.tapToPause') : t('diary.tapToResume')}
        </Text>
      </View>

      {/* Transcript */}
      {(tutorText.length > 0 || interimText.length > 0) && (
        <View style={[styles.transcriptCard, !isRecording && styles.transcriptCardEditable]}>
          <Text style={styles.transcriptLabel}>{t('diary.transcribed')}</Text>
          {isRecording ? (
            <Text style={styles.transcriptText}>
              {tutorText}
              {interimText ? ` ${interimText}` : ''}
            </Text>
          ) : (
            <TextInput
              style={styles.transcriptInput}
              value={tutorText}
              onChangeText={setTutorText}
              multiline
              autoFocus={false}
              placeholder={t('diary.transcribedPlaceholder')}
              placeholderTextColor={colors.placeholder}
              selectionColor={colors.accent}
            />
          )}
        </View>
      )}

      {/* Placeholder hint (shown when nothing transcribed yet) */}
      {tutorText.length === 0 && interimText.length === 0 && (
        <Text style={styles.hintText}>
          {t('diary.micPlaceholder', { name: petName })}
        </Text>
      )}

      {/* Confirm button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.confirmBtn, !confirmed && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!confirmed}
          activeOpacity={0.8}
        >
          <Check size={rs(18)} color="#fff" strokeWidth={2} />
          <Text style={styles.confirmBtnText}>{t('diary.confirmEntry')}</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const BAR_HEIGHT = rs(64);
const BAR_WIDTH  = rs(4);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

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

  // Subtitle
  subtitle: {
    color: colors.textSec,
    fontSize: fs(13),
    fontFamily: 'Sora_500Medium',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: rs(spacing.md),
    marginHorizontal: rs(spacing.xl),
  },

  // Waveform
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(5),
    marginTop: rs(spacing.xl),
    marginBottom: rs(spacing.md),
    height: BAR_HEIGHT,
  },
  waveBar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: rs(3),
  },

  // Mic toggle
  micToggleRow: {
    alignItems: 'center',
    gap: rs(spacing.xs),
    marginBottom: rs(spacing.lg),
  },
  micToggleBtn: {
    width: rs(64), height: rs(64),
    borderRadius: rs(32),
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.35, shadowRadius: rs(12), elevation: 6,
  },
  micToggleBtnRecording: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
  },
  micToggleBtnPaused: {
    backgroundColor: colors.textGhost,
    shadowColor: '#000',
  },
  micToggleLabel: {
    color: colors.textDim,
    fontSize: fs(11),
    fontFamily: 'Sora_600SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Transcript card
  transcriptCard: {
    marginHorizontal: rs(spacing.md),
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1, borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  transcriptCardEditable: {
    borderColor: colors.accent,
  },
  transcriptLabel: {
    color: colors.textDim, fontSize: fs(10),
    fontFamily: 'Sora_700Bold',
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: rs(6),
  },
  transcriptText: {
    color: colors.text, fontSize: fs(15),
    fontFamily: 'Sora_400Regular', lineHeight: fs(22),
  },
  transcriptInput: {
    color: colors.text, fontSize: fs(15),
    fontFamily: 'Sora_400Regular', lineHeight: fs(22),
    minHeight: rs(60),
    textAlignVertical: 'top',
    padding: 0,
  },

  // Placeholder hint
  hintText: {
    color: colors.textDim,
    fontSize: fs(14),
    fontFamily: 'Sora_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginHorizontal: rs(spacing.xl),
    lineHeight: fs(20),
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: rs(spacing.xl),
    left: rs(spacing.md),
    right: rs(spacing.md),
  },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(spacing.xs),
    backgroundColor: colors.accent,
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3, shadowRadius: rs(12), elevation: 6,
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: {
    color: '#fff', fontSize: fs(15),
    fontFamily: 'Sora_700Bold',
  },

  // Unavailable fallback
  unavailableContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: rs(32), gap: rs(16),
  },
  unavailableTitle: {
    fontFamily: 'Sora_700Bold', fontSize: fs(20),
    color: colors.text, textAlign: 'center',
  },
  unavailableBody: {
    fontFamily: 'Sora_400Regular', fontSize: fs(14),
    color: colors.textSec, textAlign: 'center', lineHeight: fs(22),
  },
  unavailableBtn: {
    marginTop: rs(8),
    backgroundColor: colors.accent,
    borderRadius: rs(14),
    paddingHorizontal: rs(32),
    paddingVertical: rs(14),
  },
  unavailableBtnText: {
    fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff',
  },
});
