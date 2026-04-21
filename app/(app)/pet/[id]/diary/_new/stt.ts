/**
 * STT (speech-to-text) — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same module-loader, same event handlers,
 * same startListening/stopListening/handleMicToggle logic, same deps arrays.
 *
 * Exposes:
 *   - `SpeechModule` (nullable) — so callers can null-check availability
 *     (e.g. handleSelectVoice warns when the native module is absent).
 *   - `useSTT(params)` — custom hook wiring the three event handlers,
 *     cleanup effect, and the three useCallbacks. Owns `intentionalStopRef`
 *     since it's referenced only from STT code.
 */
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { setAudioModeAsync } from 'expo-audio';
import { getLocales } from 'expo-localization';
import { PREVIEW_STEPS, type Step } from './types';

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

export { SpeechModule };

// ── useSTT hook ───────────────────────────────────────────────────────────

type UseSTTParams = {
  isListening: boolean;
  setIsListening: React.Dispatch<React.SetStateAction<boolean>>;
  setInterimText: React.Dispatch<React.SetStateAction<string>>;
  setTutorText: React.Dispatch<React.SetStateAction<string>>;
  setCaptureCaption: React.Dispatch<React.SetStateAction<string>>;
  stepRef: MutableRefObject<Step>;
  toast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string) => string;
};

export function useSTT({
  isListening,
  setIsListening,
  setInterimText,
  setTutorText,
  setCaptureCaption,
  stepRef,
  toast,
  t,
}: UseSTTParams) {
  const intentionalStopRef = useRef(false);

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
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
        shouldPlayInBackground: false,
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
    // Guard: setAudioModeAsync can be undefined on certain emulators/devices (expo-audio v55)
    try {
      if (typeof setAudioModeAsync === 'function') {
        setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: false,
          interruptionMode: 'duckOthers',
          shouldRouteThroughEarpiece: false,
          shouldPlayInBackground: false,
        }).catch(() => { /* ignorar */ });
      }
    } catch { /* ignorar — setAudioModeAsync indisponível no dispositivo */ }
  }, [isListening]);

  const handleMicToggle = useCallback(async () => {
    if (isListening) stopListening();
    else await startListening();
  }, [isListening, stopListening, startListening]);

  return { startListening, stopListening, handleMicToggle };
}
