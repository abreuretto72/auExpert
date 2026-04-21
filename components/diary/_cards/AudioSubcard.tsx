/**
 * AudioSubcard — rendered inside DiaryCard for audio media items.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Mic, Music2, Play } from 'lucide-react-native';
import MediaViewerModal from '../MediaViewerModal';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import type { MediaAnalysisItem } from '../timelineTypes';
import { resolveMediaUri } from './shared';
import { styles } from './styles';

// ── AudioSubcard ──

export function AudioSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const pa = media.petAudioAnalysis;
  const fileName = media.fileName ?? t('diary.audioFile');
  const audioUri = resolveMediaUri(media.mediaUrl);

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={[styles.subcard, { borderColor: colors.rose + '30' }]}>
      <View style={styles.subcardHeader}>
        <Mic size={rs(12)} color={colors.rose} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.rose }]}>{t('diary.audioAnalysis').toUpperCase()}</Text>
      </View>
      <TouchableOpacity
        onPress={() => audioUri && setViewerOpen(true)}
        activeOpacity={audioUri ? 0.75 : 1}
        style={styles.audioFileRow}
      >
        <Music2 size={rs(20)} color={colors.rose} strokeWidth={1.6} />
        <Text style={styles.audioFileName} numberOfLines={1}>{fileName}</Text>
        {audioUri && <Play size={rs(16)} color={colors.rose} fill={colors.rose} strokeWidth={0} />}
      </TouchableOpacity>
      {audioUri && (
        <MediaViewerModal
          visible={viewerOpen}
          type="audio"
          uri={audioUri}
          fileName={fileName}
          onClose={() => setViewerOpen(false)}
        />
      )}
      {pa && (
        <>
          <Text style={styles.subcardBodyText}>
            {t('listen.soundType')}: {pa.sound_type}{'  ·  '}{pa.intensity}
          </Text>
          {pa.pattern_notes ? <Text style={styles.subcardBodyText}>{pa.pattern_notes}</Text> : null}
        </>
      )}
    </View>
  );
}
