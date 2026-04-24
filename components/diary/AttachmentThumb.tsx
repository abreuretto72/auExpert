/**
 * AttachmentThumb — single attachment thumbnail in the diary voice/text screen.
 * Shows a 72x72 preview for photo/video/audio/document.
 * Audio thumbnails have inline play/pause via expo-audio.
 * Has a [×] remove button overlay.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { X, Play, Pause, Music2, FileText } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii } from '../../constants/spacing';

export interface Attachment {
  id: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  localUri: string;
  thumbnailUri?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
  mimeType?: string;
  base64?: string; // for photos sent to AI
}

interface AttachmentThumbProps {
  attachment: Attachment;
  onRemove: () => void;
}

// ── Audio thumbnail with inline play/pause ──

function AudioThumb({ localUri, duration }: { localUri: string; duration?: number }) {
  const player = useAudioPlayer({ uri: localUri });
  const status = useAudioPlayerStatus(player);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const isPlaying = status.playing ?? false;
  const totalSec = status.duration ?? duration ?? 0;
  const currentSec = status.currentTime ?? 0;
  const progress = totalSec > 0 ? currentSec / totalSec : 0;

  // Pulse animation while playing
  useEffect(() => {
    if (isPlaying) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    }
  }, [isPlaying, pulseAnim]);

  // Reset to start when finished
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const handlePress = useCallback(() => {
    try {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    } catch (err) {
      console.warn('[AudioThumb] playback error:', String(err));
    }
  }, [isPlaying, player]);

  const displayTime = isPlaying
    ? formatDuration(currentSec)
    : duration
      ? formatDuration(duration)
      : '—';

  return (
    <TouchableOpacity
      style={[styles.image, styles.audioContainer]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Music2 size={rs(22)} color={isPlaying ? colors.clickLight : colors.click} strokeWidth={1.8} />
      </Animated.View>

      {/* Play/pause overlay badge */}
      <View style={styles.audioPlayBadge}>
        {isPlaying
          ? <Pause size={rs(8)} color={colors.click} strokeWidth={2.5} fill={colors.click} />
          : <Play size={rs(8)} color={colors.click} strokeWidth={2.5} fill={colors.click} />
        }
      </View>

      {/* Duration / progress */}
      <Text style={styles.audioLabel}>{displayTime}</Text>

      {/* Progress bar */}
      {isPlaying && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Main component ──

export function AttachmentThumb({ attachment, onRemove }: AttachmentThumbProps) {
  return (
    <View style={styles.container}>
      {attachment.type === 'photo' && (
        <Image
          source={{ uri: attachment.localUri }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {attachment.type === 'video' && (
        <View style={styles.videoContainer}>
          {attachment.thumbnailUri ? (
            <Image source={{ uri: attachment.thumbnailUri }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.placeholder]} />
          )}
          <View style={styles.playOverlay}>
            <Play size={rs(14)} color="#fff" fill="#fff" />
          </View>
          {!!attachment.duration && (
            <Text style={styles.duration}>{formatDuration(attachment.duration)}</Text>
          )}
        </View>
      )}

      {attachment.type === 'audio' && (
        <AudioThumb localUri={attachment.localUri} duration={attachment.duration} />
      )}

      {attachment.type === 'document' && (
        <View style={[styles.image, styles.docContainer]}>
          <FileText size={rs(22)} color={colors.petrol} strokeWidth={1.8} />
          <Text numberOfLines={2} style={styles.docLabel}>
            {attachment.fileName ?? 'doc'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.8}
      >
        <X size={rs(10)} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const THUMB = rs(72);

const styles = StyleSheet.create({
  container: {
    width: THUMB,
    height: THUMB,
    borderRadius: rs(radii.md),
    overflow: 'hidden',
    marginRight: rs(8),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: THUMB,
    height: THUMB,
  },
  placeholder: {
    backgroundColor: colors.bgCard,
  },
  videoContainer: {
    width: THUMB,
    height: THUMB,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  duration: {
    position: 'absolute',
    bottom: rs(4),
    right: rs(4),
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(9),
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: rs(3),
    paddingHorizontal: rs(3),
  },
  audioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(2),
    backgroundColor: colors.clickSoft,
  },
  audioPlayBadge: {
    position: 'absolute',
    top: rs(6),
    right: rs(6),
    width: rs(14),
    height: rs(14),
    borderRadius: rs(7),
    backgroundColor: colors.clickSoft,
    borderWidth: 1,
    borderColor: `${colors.click}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(9),
    color: colors.click,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: rs(3),
    backgroundColor: `${colors.click}30`,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.click,
  },
  docContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(6),
    gap: rs(4),
    backgroundColor: colors.petrolSoft,
  },
  docLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(8),
    color: colors.petrol,
    textAlign: 'center',
    lineHeight: fs(10),
  },
  removeBtn: {
    position: 'absolute',
    top: rs(4),
    right: rs(4),
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
