/**
 * Animations — extracted verbatim from
 * app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same refs, same useEffect body, same useCallback body,
 * same deps arrays, same setTimeout timing.
 *
 * Owns the animation refs (barAnims, pulseAnim, pulseLoopRef, pawAnim,
 * pawLoopRef, ringAnim, ringOpacity, dotsAnim), the waveform useEffect
 * (driven by isListening), and the `showAnalyzingAndBack` callback that
 * runs paw/ring/dots loops for 2500ms before router.back().
 *
 * `pulseLoopRef` and `pawLoopRef` are internal and NOT exported — they're
 * only referenced inside the extracted code.
 */
import { useCallback, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAVE_BARS } from './types';

type UseAnimationsParams = {
  isListening: boolean;
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  draftKey: string;
  router: { back: () => void };
};

export function useAnimations({
  isListening,
  setIsAnalyzing,
  draftKey,
  router,
}: UseAnimationsParams) {
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
      void AsyncStorage.removeItem(draftKey);
      router.back();
    }, 2500);
  }, [pawAnim, ringAnim, ringOpacity, dotsAnim, draftKey, router]);

  return {
    barAnims,
    pulseAnim,
    pawAnim,
    ringAnim,
    ringOpacity,
    dotsAnim,
    showAnalyzingAndBack,
  };
}
