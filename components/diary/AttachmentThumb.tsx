/**
 * AttachmentThumb — single attachment thumbnail in the diary voice/text screen.
 * Shows a 72x72 preview for photo/video/audio/document.
 * Has a [×] remove button overlay.
 */
import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Play, Music2, FileText } from 'lucide-react-native';
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
        <View style={[styles.image, styles.audioContainer]}>
          <Music2 size={rs(24)} color={colors.accent} strokeWidth={1.8} />
          {!!attachment.duration && (
            <Text style={styles.audioLabel}>{formatDuration(attachment.duration)}</Text>
          )}
        </View>
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
    gap: rs(4),
    backgroundColor: colors.accentSoft,
  },
  audioLabel: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(9),
    color: colors.accent,
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
