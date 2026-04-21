/**
 * ProcessingChecklist — per-phase processing status shown inside DiaryCard
 * while `event.processingStatus === 'processing'`.
 *
 * Subscribes to `useProgressStore` by tempId and renders one row per APPLICABLE
 * phase (text / ocr / video / photos / audio) — inapplicable phases are hidden
 * by `deriveChecklist`, so the list auto-shrinks to match what's actually
 * running for this entry.
 *
 * Each row has three columns:
 *   [ icon ]  label (i18n'd)               [ mini progress bar ]
 *
 *   ◯  Coletando dados do documento...     ░░░░░░░░░░░░░░   (pending)
 *   ⚙  Analisando imagem 2/3...           ████████░░░░░░   66%  (discrete)
 *   ⚙  Analisando texto...                ▒▒▓▓▓▓▒▒░░░░░░   (indeterminate)
 *   ✓  Áudio analisado                    ██████████████   100%
 *
 * - Discrete progress (photos): bar fills `completed / total`.
 * - Indeterminate (text/ocr/video/audio): small sliding bar animates through
 *   the track since these routines are HTTP black boxes with no intermediate
 *   progress signal.
 *
 * If no phases are active yet (pipeline just started and hasn't called any
 * `setPhase(..., 'pending')` yet), renders a neutral fallback with the legacy
 * single-line spinner so the card is never empty.
 *
 * `t` is threaded from the parent DiaryCard via props to avoid re-instantiating
 * `useTranslation` per row and to keep the i18n instance consistent with the
 * rest of the card.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, Animated, Easing, StyleSheet } from 'react-native';
import type { TFunction } from 'i18next';
import { Circle, Check, Loader } from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs, fs } from '../../../hooks/useResponsive';
import {
  useEntryProgress,
  deriveChecklist,
  type ChecklistItem,
} from '../../../hooks/_diary/progressStore';

interface Props {
  tempId: string;
  inputType?: string;
  content?: string;
  t: TFunction;
}

export const ProcessingChecklist = React.memo(({ tempId, inputType, content, t }: Props) => {
  const progress = useEntryProgress(tempId);
  const items = deriveChecklist(progress ?? undefined);

  // Fallback: pipeline hasn't registered any phase yet (first ~ms of background run)
  if (items.length === 0) {
    const fallbackMsg =
      inputType === 'photo' || inputType === 'gallery' || inputType === 'ocr_scan'
        ? t('diary.processingPhoto')
        : inputType === 'video'
        ? t('diary.processingVideo')
        : inputType === 'pet_audio'
        ? t('diary.processingAudio')
        : t('diary.processingEntry');
    return (
      <View>
        <View style={s.fallbackRow}>
          <ActivityIndicator size="small" color={colors.purple} />
          <Text style={s.fallbackText}>{fallbackMsg}</Text>
        </View>
        {!!content && content !== '(media)' && (
          <Text style={s.content} numberOfLines={2}>{content}</Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={s.list}>
        {items.map((item) => (
          <ChecklistRow key={item.phase} item={item} t={t} />
        ))}
      </View>
      {!!content && content !== '(media)' && (
        <Text style={s.content} numberOfLines={2}>{content}</Text>
      )}
    </View>
  );
});

// ── Row ────────────────────────────────────────────────────────────────────────

const ChecklistRow = React.memo(({ item, t }: { item: ChecklistItem; t: TFunction }) => {
  const iconSize = rs(14);

  const icon =
    item.state === 'done' ? (
      <Check size={iconSize} color={colors.success} strokeWidth={2.4} />
    ) : item.state === 'running' ? (
      <SpinningLoader size={iconSize} />
    ) : (
      <Circle size={iconSize} color={colors.textGhost} strokeWidth={1.8} />
    );

  const bar =
    item.state === 'done' ? (
      <DoneBar />
    ) : item.state === 'running' ? (
      item.progress === null ? (
        <IndeterminateBar />
      ) : (
        <DiscreteBar ratio={item.progress} />
      )
    ) : (
      <PendingBar />
    );

  const labelColor =
    item.state === 'done'
      ? colors.textSec
      : item.state === 'running'
      ? colors.purple
      : colors.textDim;

  return (
    <View style={s.row}>
      <View style={s.iconWrap}>{icon}</View>
      <Text style={[s.label, { color: labelColor }]} numberOfLines={1}>
        {t(item.key, (item.vars ?? {}) as Record<string, unknown>)}
      </Text>
      <View style={s.barWrap}>{bar}</View>
    </View>
  );
});

// ── Spinning icon for running state ────────────────────────────────────────────

const SpinningLoader = ({ size }: { size: number }) => {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [rot]);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Loader size={size} color={colors.purple} strokeWidth={2} />
    </Animated.View>
  );
};

// ── Progress bars ──────────────────────────────────────────────────────────────

const PendingBar = () => <View style={s.barTrack} />;

const DoneBar = () => (
  <View style={s.barTrack}>
    <View style={[s.barFill, { width: '100%', backgroundColor: colors.success }]} />
  </View>
);

const DiscreteBar = ({ ratio }: { ratio: number }) => {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${pct}%` }]} />
    </View>
  );
};

const IndeterminateBar = () => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  // Sweep a short pill across the track. The pill is translateX-based so we
  // can use the native driver. Track width is fixed by styles; pill is ~30%
  // of that width, translated between left edge and right edge of the track.
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAR_PILL_WIDTH, BAR_WIDTH],
  });

  return (
    <View style={s.barTrack}>
      <Animated.View
        style={[s.barIndeterminate, { transform: [{ translateX }] }]}
      />
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const BAR_WIDTH = rs(64);
const BAR_PILL_WIDTH = rs(22);

const s = StyleSheet.create({
  list: { gap: rs(7), marginTop: rs(2), marginBottom: rs(2) },

  row: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },

  iconWrap: { width: rs(16), alignItems: 'center', justifyContent: 'center' },

  label: { fontFamily: 'Sora_500Medium', fontSize: fs(12), flex: 1 },

  barWrap: { width: BAR_WIDTH },

  barTrack: {
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.border,
    overflow: 'hidden',
    width: '100%',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.purple,
    borderRadius: rs(2),
  },
  barIndeterminate: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: BAR_PILL_WIDTH,
    backgroundColor: colors.purple,
    opacity: 0.85,
    borderRadius: rs(2),
  },

  // Fallback (no phases active yet)
  fallbackRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  fallbackText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.purple },

  content: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: fs(18),
    marginTop: rs(6),
  },
});
