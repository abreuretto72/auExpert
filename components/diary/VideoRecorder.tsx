/**
 * VideoRecorder — full-screen video recording component.
 *
 * Uses expo-camera CameraView.
 * Limits to 60 seconds. Shows countdown + waveform dots animation.
 * On stop: returns the local video URI for upload.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { X, Video, Square, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

const MAX_DURATION = 60;

interface VideoRecorderProps {
  onCapture: (videoUri: string, durationSeconds: number) => Promise<void>;
  onClose: () => void;
}

export default function VideoRecorder({ onCapture, onClose }: VideoRecorderProps) {
  const { t } = useTranslation();
  const cameraRef = useRef<CameraView>(null);

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isProcessing, setIsProcessing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Pulsing animation for the rec dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      pulseLoop.current?.stop();
    };
  }, []);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const handleStart = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    setElapsed(0);
    startTimeRef.current = Date.now();
    startPulse();

    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      if (secs >= MAX_DURATION) {
        cameraRef.current?.stopRecording();
      }
    }, 500);

    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (timerRef.current) clearInterval(timerRef.current);
      stopPulse();
      setIsRecording(false);
      setIsProcessing(true);
      await onCapture(result.uri, duration);
    } catch {
      if (timerRef.current) clearInterval(timerRef.current);
      stopPulse();
      setIsRecording(false);
      setIsProcessing(false);
    }
  }, [isRecording, startPulse, stopPulse, onCapture]);

  const handleStop = useCallback(() => {
    cameraRef.current?.stopRecording();
  }, []);

  const remaining = MAX_DURATION - elapsed;
  const progressPct = elapsed / MAX_DURATION;

  // ── Permissions ──────────────────────────────────────────────────────────

  if (!camPermission || !micPermission) {
    return (
      <View style={s.fullCenter}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!camPermission.granted || !micPermission.granted) {
    return (
      <View style={s.permissionsScreen}>
        <Video size={rs(48)} color={colors.sky} strokeWidth={1.5} />
        <Text style={s.permTitle}>{t('video.permissionsTitle')}</Text>
        <Text style={s.permDesc}>{t('video.permissionsDesc')}</Text>
        <TouchableOpacity
          style={s.permBtn}
          onPress={async () => {
            if (!camPermission.granted) await requestCamPermission();
            if (!micPermission.granted) await requestMicPermission();
          }}
          activeOpacity={0.8}
        >
          <Text style={s.permBtnText}>{t('video.grantPermissions')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <X size={rs(20)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Processing overlay ─────────────────────────────────────────────────

  if (isProcessing) {
    return (
      <View style={s.fullCenter}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={s.processingText}>{t('video.processing')}</Text>
      </View>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────

  return (
    <View style={s.container}>
      <CameraView
        ref={cameraRef}
        style={s.camera}
        facing={facing}
        mode="video"
      />

      {/* Overlay */}
      <View style={s.overlay}>
        {/* Top bar */}
        <View style={s.topBar}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} disabled={isRecording}>
            <X size={rs(20)} color={isRecording ? colors.textGhost : colors.accent} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={s.petHint}>{t('video.recordingHint')}</Text>
          <TouchableOpacity
            style={s.flipBtn}
            onPress={() => setFacing((f) => f === 'back' ? 'front' : 'back')}
            disabled={isRecording}
          >
            <RotateCcw size={rs(20)} color={isRecording ? colors.textGhost : colors.text} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Timer */}
        {isRecording && (
          <View style={s.timerContainer}>
            {/* Progress bar */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progressPct * 100}%` as `${number}%` }]} />
            </View>

            <View style={s.timerRow}>
              {/* Rec dot */}
              <Animated.View style={[s.recDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={s.recLabel}>REC</Text>
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
          </View>
        )}

        {/* Record / Stop button */}
        <View style={s.bottomBar}>
          {isRecording ? (
            <TouchableOpacity style={s.stopBtn} onPress={handleStop} activeOpacity={0.8}>
              <Square size={rs(28)} color="#fff" strokeWidth={2} fill="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.recordBtn} onPress={handleStart} activeOpacity={0.8}>
              <View style={s.recordBtnInner} />
            </TouchableOpacity>
          )}
          <Text style={s.bottomHint}>
            {isRecording ? t('video.tapToStop') : t('video.tapToRecord')}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
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
    backgroundColor: colors.accent, borderRadius: rs(14), paddingHorizontal: rs(32), paddingVertical: rs(14), marginTop: rs(8),
  },
  permBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  // Top
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingTop: rs(52), paddingBottom: rs(12),
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  closeBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(18),
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  flipBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(18),
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  petHint: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: 'rgba(255,255,255,0.85)' },

  // Timer
  timerContainer: {
    paddingHorizontal: rs(16), gap: rs(8),
    backgroundColor: 'rgba(0,0,0,0.35)', paddingVertical: rs(10),
  },
  progressTrack: {
    height: rs(3), backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: rs(2), overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.danger, borderRadius: rs(2),
  },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  recDot: { width: rs(10), height: rs(10), borderRadius: rs(5), backgroundColor: colors.danger },
  recLabel: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(11), color: colors.danger, letterSpacing: 1 },
  timerText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(13), color: '#fff', flex: 1 },
  remainBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: rs(6),
    paddingHorizontal: rs(8), paddingVertical: rs(2),
  },
  remainBadgeDanger: { backgroundColor: colors.dangerSoft },
  remainText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(11), color: '#fff' },

  // Bottom
  bottomBar: {
    alignItems: 'center', paddingBottom: rs(48), gap: rs(12),
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  recordBtn: {
    width: rs(72), height: rs(72), borderRadius: rs(36),
    backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: rs(4), borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  recordBtnInner: {
    width: rs(52), height: rs(52), borderRadius: rs(26), backgroundColor: colors.danger,
  },
  stopBtn: {
    width: rs(72), height: rs(72), borderRadius: rs(36),
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    borderWidth: rs(4), borderColor: 'rgba(255,255,255,0.3)',
  },
  bottomHint: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: 'rgba(255,255,255,0.7)' },
});
