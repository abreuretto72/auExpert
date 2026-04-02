/**
 * PetAudioRecorder — full-screen audio recording for pet sounds.
 *
 * Records up to 30 seconds of pet audio (barks, meows, purrs).
 * Shows animated waveform bars driven by real-time metering.
 * Requires expo-av: npx expo install expo-av
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { Ear, Square, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

// ── expo-av optional load ──────────────────────────────────────────────────

type AudioModule = typeof import('expo-av');
let AvModule: AudioModule | null = null;
try {
  AvModule = require('expo-av');
} catch {
  // expo-av not installed — recorder will show unavailable state
}

const MAX_DURATION = 30; // seconds
const WAVEFORM_BARS = 24;

interface PetAudioRecorderProps {
  petName: string;
  onCapture: (audioUri: string, durationSeconds: number) => Promise<void>;
  onClose: () => void;
}

// ── Waveform bar — individual bar driven by Animated.Value ─────────────────

const WaveformBar = React.memo(({ anim }: { anim: Animated.Value }) => (
  <Animated.View
    style={[
      s.waveBar,
      {
        transform: [{ scaleY: anim }],
        opacity: anim.interpolate({ inputRange: [0.1, 1], outputRange: [0.3, 1] }),
      },
    ]}
  />
));

// ── Main component ─────────────────────────────────────────────────────────

export default function PetAudioRecorder({ petName, onCapture, onClose }: PetAudioRecorderProps) {
  const { t } = useTranslation();

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isAvailable] = useState(() => AvModule !== null);

  const recordingRef = useRef<InstanceType<AudioModule['Audio']['Recording']> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const meteringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animated bars for waveform
  const barAnims = useRef(
    Array.from({ length: WAVEFORM_BARS }, () => new Animated.Value(0.15)),
  ).current;

  // Pulse animation for REC dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ── Permission check ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAvailable) {
      setHasPermission(false);
      return;
    }
    AvModule!.Audio.requestPermissionsAsync().then(({ granted }) => {
      setHasPermission(granted);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
      pulseLoop.current?.stop();
      stopRecordingCleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecordingCleanup = useCallback(async () => {
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {
        // best-effort
      }
      recordingRef.current = null;
    }
  }, []);

  // ── Waveform animation ────────────────────────────────────────────────────

  const animateWaveform = useCallback((level: number) => {
    // level: 0.0 to 1.0 representing audio amplitude
    barAnims.forEach((anim, i) => {
      const phase = Math.sin((Date.now() / 200 + i * 0.5)) * 0.3;
      const target = Math.max(0.1, Math.min(1, level + phase + (Math.random() * 0.2)));
      Animated.timing(anim, {
        toValue: target,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  }, [barAnims]);

  const resetWaveform = useCallback(() => {
    barAnims.forEach((anim) => {
      Animated.timing(anim, { toValue: 0.15, duration: 300, useNativeDriver: true }).start();
    });
  }, [barAnims]);

  // ── Recording controls ────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (!AvModule || isRecording) return;

    try {
      await AvModule.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await AvModule.Audio.Recording.createAsync(
        {
          ...AvModule.Audio.RecordingOptionsPresets.LOW_QUALITY,
          isMeteringEnabled: true,
          android: {
            ...AvModule.Audio.RecordingOptionsPresets.LOW_QUALITY.android,
            extension: '.m4a',
            outputFormat: AvModule.Audio.AndroidOutputFormat.MPEG_4,
            audioEncoder: AvModule.Audio.AndroidAudioEncoder.AAC,
            sampleRate: 22050,
            numberOfChannels: 1,
            bitRate: 32000,
          },
          ios: {
            ...AvModule.Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
            extension: '.m4a',
            outputFormat: AvModule.Audio.IOSOutputFormat.MPEG4AAC,
            audioQuality: AvModule.Audio.IOSAudioQuality.LOW,
            sampleRate: 22050,
            numberOfChannels: 1,
            bitRate: 32000,
          },
        },
      );

      recordingRef.current = recording;
      setIsRecording(true);
      setElapsed(0);
      startTimeRef.current = Date.now();

      // Pulse animation
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();

      // Timer interval
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(secs);
        if (secs >= MAX_DURATION) {
          handleStop();
        }
      }, 500);

      // Metering interval for waveform
      meteringIntervalRef.current = setInterval(async () => {
        if (!recordingRef.current) return;
        try {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording && status.metering != null) {
            // metering is in dBFS (-160 to 0), normalize to 0-1
            const normalized = Math.max(0, (status.metering + 60) / 60);
            animateWaveform(normalized);
          }
        } catch {
          // ignore metering errors
        }
      }, 150);

    } catch {
      setIsRecording(false);
    }
  }, [isRecording, pulseAnim, animateWaveform]);

  const handleStop = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (meteringIntervalRef.current) clearInterval(meteringIntervalRef.current);
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    resetWaveform();

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setIsRecording(false);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) return;

      setIsProcessing(true);
      await onCapture(uri, duration);
    } catch {
      setIsProcessing(false);
    }
  }, [pulseAnim, resetWaveform, onCapture]);

  const remaining = MAX_DURATION - elapsed;
  const progressPct = elapsed / MAX_DURATION;

  // ── States ────────────────────────────────────────────────────────────────

  if (!isAvailable) {
    return (
      <View style={s.permissionsScreen}>
        <Ear size={rs(48)} color={colors.rose} strokeWidth={1.5} />
        <Text style={s.permTitle}>{t('listen.unavailableTitle')}</Text>
        <Text style={s.permDesc}>{t('listen.unavailableDesc')}</Text>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={rs(20)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={s.fullCenter}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={s.permissionsScreen}>
        <Ear size={rs(48)} color={colors.rose} strokeWidth={1.5} />
        <Text style={s.permTitle}>{t('listen.permissionsTitle')}</Text>
        <Text style={s.permDesc}>{t('listen.permissionsDesc')}</Text>
        <TouchableOpacity
          style={s.permBtn}
          onPress={() => AvModule!.Audio.requestPermissionsAsync().then(({ granted }) => setHasPermission(granted))}
          activeOpacity={0.8}
        >
          <Text style={s.permBtnText}>{t('listen.grantPermissions')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={rs(20)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  if (isProcessing) {
    return (
      <View style={s.fullCenter}>
        <ActivityIndicator color={colors.rose} size="large" />
        <Text style={s.processingText}>{t('listen.processing')}</Text>
      </View>
    );
  }

  // ── Main recorder UI ──────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose} disabled={isRecording}>
          <X size={rs(20)} color={isRecording ? colors.textGhost : colors.accent} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('listen.title', { name: petName })}</Text>
        <View style={s.headerSpacer} />
      </View>

      {/* Hint */}
      <Text style={s.hint}>{t('listen.hint', { name: petName })}</Text>

      {/* Waveform */}
      <View style={s.waveformContainer}>
        <View style={s.waveformRow}>
          {barAnims.map((anim, i) => (
            <WaveformBar key={i} anim={anim} />
          ))}
        </View>
      </View>

      {/* Timer & Status */}
      <View style={s.statusContainer}>
        {isRecording ? (
          <>
            {/* Progress bar */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progressPct * 100}%` as `${number}%` }]} />
            </View>

            <View style={s.timerRow}>
              <Animated.View style={[s.recDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={s.recLabel}>{t('diary.recLabel')}</Text>
              <Text style={s.timerText}>
                {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                {' / '}
                {String(Math.floor(MAX_DURATION / 60)).padStart(2, '0')}:{String(MAX_DURATION % 60).padStart(2, '0')}
              </Text>
              <View style={[s.remainBadge, remaining <= 10 && s.remainBadgeDanger]}>
                <Text style={[s.remainText, remaining <= 10 && { color: colors.danger }]}>
                  -{remaining}s
                </Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={s.idleHint}>{t('listen.tapToRecord')}</Text>
        )}
      </View>

      {/* Tip */}
      {!isRecording && (
        <Text style={s.tip}>{t('listen.tip')}</Text>
      )}

      {/* Record / Stop button */}
      <View style={s.bottomBar}>
        {isRecording ? (
          <TouchableOpacity style={s.stopBtn} onPress={handleStop} activeOpacity={0.8}>
            <Square size={rs(28)} color="#fff" strokeWidth={2} fill="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.recordBtn} onPress={handleStart} activeOpacity={0.8}>
            <Ear size={rs(32)} color={colors.rose} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
        <Text style={s.bottomHint}>
          {isRecording ? t('listen.tapToStop') : t('listen.tapToStart')}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  fullCenter: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: rs(16) },
  processingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(15), color: colors.textSec },

  // Permissions
  permissionsScreen: {
    flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    padding: rs(32), gap: rs(16),
  },
  permTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text, textAlign: 'center' },
  permDesc: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textSec, textAlign: 'center', lineHeight: fs(22) },
  permBtn: {
    backgroundColor: colors.rose, borderRadius: rs(14), paddingHorizontal: rs(32), paddingVertical: rs(14), marginTop: rs(8),
  },
  permBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingTop: rs(52), paddingBottom: rs(16),
  },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text },
  headerSpacer: { width: rs(36) },
  closeBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(18),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Hint
  hint: {
    fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textSec,
    textAlign: 'center', paddingHorizontal: rs(32), lineHeight: fs(22),
    marginBottom: rs(40),
  },

  // Waveform
  waveformContainer: {
    marginHorizontal: rs(20),
    backgroundColor: colors.card,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(20),
    height: rs(100),
    justifyContent: 'center',
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: rs(60),
  },
  waveBar: {
    width: rs(5),
    height: rs(48),
    borderRadius: rs(3),
    backgroundColor: colors.rose,
  },

  // Status
  statusContainer: {
    marginHorizontal: rs(20),
    marginTop: rs(24),
    gap: rs(8),
  },
  progressTrack: {
    height: rs(3), backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: rs(2), overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.rose, borderRadius: rs(2),
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  recDot: { width: rs(10), height: rs(10), borderRadius: rs(5), backgroundColor: colors.rose },
  recLabel: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(11), color: colors.rose, letterSpacing: 1 },
  timerText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(13), color: colors.text, flex: 1 },
  remainBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: rs(6),
    paddingHorizontal: rs(8), paddingVertical: rs(2),
  },
  remainBadgeDanger: { backgroundColor: colors.dangerSoft },
  remainText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(11), color: colors.textSec },
  idleHint: { fontFamily: 'Sora_500Medium', fontSize: fs(14), color: colors.textDim, textAlign: 'center' },

  // Tip
  tip: {
    fontFamily: 'Caveat_400Regular', fontSize: fs(15), color: colors.rose,
    textAlign: 'center', paddingHorizontal: rs(32), fontStyle: 'italic',
    marginTop: rs(16),
  },

  // Bottom
  bottomBar: {
    position: 'absolute', bottom: rs(60), left: 0, right: 0,
    alignItems: 'center', gap: rs(12),
  },
  recordBtn: {
    width: rs(80), height: rs(80), borderRadius: rs(40),
    backgroundColor: colors.roseSoft,
    borderWidth: rs(3), borderColor: colors.rose + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  stopBtn: {
    width: rs(72), height: rs(72), borderRadius: rs(36),
    backgroundColor: colors.rose, alignItems: 'center', justifyContent: 'center',
    borderWidth: rs(4), borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomHint: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.textSec },
});
