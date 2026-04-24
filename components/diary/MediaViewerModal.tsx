/**
 * MediaViewerModal — full-screen viewer for photo, video, audio, and document media.
 *
 * • photo / document : full-screen Image (pinch-to-zoom on iOS via ScrollView)
 * • video            : full-screen thumbnail + Play button → Linking to system player
 * • audio            : in-app player using expo-audio (auto-plays on open)
 */

import React, { useCallback, useEffect } from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity,
  StyleSheet, Dimensions, Linking, Platform, ScrollView,
} from 'react-native';
import { ExternalLink, Music2, Pause, Play, X } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii } from '../../constants/spacing';

const { width: W, height: H } = Dimensions.get('window');

// ── Types ────────────────────────────────────────────────────────────────────

export type MediaViewerType = 'photo' | 'video' | 'audio' | 'document';

export interface MediaViewerProps {
  visible: boolean;
  type: MediaViewerType;
  /** Public URL of the media to show/play. */
  uri: string;
  /** Video-only: thumbnail to show while the user decides to open in player. */
  thumbnailUri?: string | null;
  /** Audio-only: filename displayed in the player. */
  fileName?: string | null;
  /** i18n hint for "open in player" (video). */
  openInPlayerLabel?: string;
  onClose: () => void;
}

// ── AudioPlayerSheet ─────────────────────────────────────────────────────────
// Separate component so hooks run at the correct React level.
// Mounts only when the modal is visible and type === 'audio'.

function AudioPlayerSheet({ uri, fileName }: { uri: string; fileName: string }) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status.playing ?? false;
  const duration  = status.duration   ?? 0;
  const current   = status.currentTime ?? 0;
  const progress  = duration > 0 ? Math.min(current / duration, 1) : 0;

  // Reset to beginning when track ends
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  // Auto-play on mount; pause on unmount
  useEffect(() => {
    const timer = setTimeout(() => {
      try { player.play(); } catch { /* noop */ }
    }, 250);
    return () => {
      clearTimeout(timer);
      try { player.pause(); } catch { /* noop */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmt = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const toggle = useCallback(() => {
    try {
      if (isPlaying) player.pause();
      else           player.play();
    } catch { /* noop */ }
  }, [isPlaying, player]);

  return (
    <View style={ap.sheet}>
      <Music2 size={rs(52)} color={colors.rose} strokeWidth={1.4} style={ap.musicIcon} />

      <Text style={ap.fileName} numberOfLines={2}>{fileName}</Text>

      {/* Play / Pause */}
      <TouchableOpacity style={ap.playBtn} onPress={toggle} activeOpacity={0.8}>
        {isPlaying
          ? <Pause size={rs(34)} color="#fff" fill="#fff" strokeWidth={0} />
          : <Play  size={rs(34)} color="#fff" fill="#fff" strokeWidth={0} />}
      </TouchableOpacity>

      {/* Times */}
      <View style={ap.timeRow}>
        <Text style={ap.timeText}>{fmt(current)}</Text>
        <Text style={ap.timeText}>{duration > 0 ? fmt(duration) : '--:--'}</Text>
      </View>

      {/* Progress track */}
      <View style={ap.track}>
        <View style={[ap.fill, { width: `${Math.round(progress * 100)}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function MediaViewerModal({
  visible, type, uri, thumbnailUri, fileName, openInPlayerLabel, onClose,
}: MediaViewerProps) {

  const openInSystem = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) {
        await Linking.openURL(uri);
      }
    } catch (e) {
      console.warn('[MediaViewer] Linking.openURL failed:', String(e));
    }
  }, [uri]);

  const isPhotoType = type === 'photo' || type === 'document';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>

        {/* ── Close button ── */}
        <TouchableOpacity
          style={s.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        >
          <X size={rs(18)} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>

        {/* ── PHOTO / DOCUMENT — full-screen with zoom on iOS ── */}
        {isPhotoType && !!uri && (
          <ScrollView
            style={s.fillFlex}
            contentContainerStyle={s.centerContent}
            maximumZoomScale={Platform.OS === 'ios' ? 4 : 1}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
            scrollEventThrottle={16}
          >
            <Image
              source={{ uri }}
              style={s.fullImage}
              resizeMode="contain"
            />
          </ScrollView>
        )}

        {/* ── VIDEO — thumbnail + play-in-system-player ── */}
        {type === 'video' && (
          <View style={s.videoContainer}>
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={s.fullImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[s.fullImage, s.videoPlaceholder]} />
            )}

            {/* Centred play button */}
            <TouchableOpacity
              style={s.videoPlayOverlay}
              onPress={openInSystem}
              activeOpacity={0.85}
            >
              <View style={s.videoPlayBtn}>
                <ExternalLink size={rs(26)} color="#fff" strokeWidth={2} />
              </View>
              {openInPlayerLabel ? (
                <Text style={s.videoHint}>{openInPlayerLabel}</Text>
              ) : null}
            </TouchableOpacity>
          </View>
        )}

        {/* ── AUDIO — in-app player, mounted only when visible ── */}
        {type === 'audio' && visible && !!uri && (
          <AudioPlayerSheet
            uri={uri}
            fileName={fileName ?? 'audio'}
          />
        )}

      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.93)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillFlex: {
    flex: 1,
    width: W,
  },
  centerContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: W,
    height: H,
  },
  closeBtn: {
    position: 'absolute',
    top: rs(52),
    right: rs(16),
    zIndex: 20,
    width: rs(38),
    height: rs(38),
    borderRadius: rs(19),
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Video
  videoContainer: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    backgroundColor: colors.bgDeep,
  },
  videoPlayOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  videoPlayBtn: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(40),
    backgroundColor: `${colors.click}CC`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  videoHint: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: rs(4),
  },
});

// Audio player styles
const ap = StyleSheet.create({
  sheet: {
    width: W * 0.85,
    backgroundColor: colors.bgCard,
    borderRadius: rs(radii.modal),
    padding: rs(28),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.rose}35`,
  },
  musicIcon: {
    marginBottom: rs(16),
  },
  fileName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
    marginBottom: rs(28),
    paddingHorizontal: rs(8),
  },
  playBtn: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: colors.click,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(24),
    // Shadow
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: rs(8),
  },
  timeText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(12),
    color: colors.textSec,
  },
  track: {
    width: '100%',
    height: rs(4),
    backgroundColor: colors.border,
    borderRadius: rs(2),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.click,
    borderRadius: rs(2),
  },
});
