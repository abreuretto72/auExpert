/**
 * AudioAnalysisCard — rendered for audio-analysis timeline items.
 * Includes the private INTENSITY_COLOR const (only used here).
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Mic, Music2, Play, Lightbulb } from 'lucide-react-native';
import MediaViewerModal from '../MediaViewerModal';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import i18n from '../../../i18n';
import { type CardProps, CardActions, resolveMediaUri } from './shared';
import { styles } from './styles';

// ── AudioAnalysisCard ──

const INTENSITY_COLOR: Record<string, string> = {
  low: '#2ECC71',
  medium: '#F1C40F',
  high: '#E74C3C',
};

export const AudioAnalysisCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => {
  const pa = event.petAudioAnalysis;
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const intensityColor = pa?.intensity ? (INTENSITY_COLOR[pa.intensity] ?? colors.rose) : colors.rose;

  const audioUri = resolveMediaUri(event.audioUrl);
  const audioFileName = event.audioUrl?.split('/').pop() ?? t('diary.audioFile');

  const [playerOpen, setPlayerOpen] = useState(false);

  return (
    <View style={styles.cardBase}>
      <View style={styles.cardIconRow}>
        <Mic size={rs(16)} color={colors.rose} strokeWidth={1.8} />
        <Text style={[styles.cardTypeLabel, { color: colors.rose }]}>{t('diary.audioAnalysis')}</Text>
        {event.audioDuration != null && (
          <View style={[styles.severityBadge, { backgroundColor: colors.rose + '20' }]}>
            <Text style={[styles.severityText, { color: colors.rose }]}>
              {formatDuration(event.audioDuration)}
            </Text>
          </View>
        )}
        <CardActions event={event} onDelete={onDelete} isOwner={isOwner} onAdminDeactivate={onAdminDeactivate} />
      </View>

      <Text style={styles.entryDate}>{dateStr}</Text>
      <Text style={styles.entryTime}>{timeStr}</Text>

      {audioUri && (
        <>
          <TouchableOpacity
            style={styles.audioBanner}
            onPress={() => setPlayerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.audioIconCircle}>
              <Music2 size={rs(22)} color={colors.rose} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.audioFileName} numberOfLines={1}>{audioFileName}</Text>
              {event.audioDuration != null && (
                <Text style={styles.audioFileMeta}>{formatDuration(event.audioDuration)}</Text>
              )}
            </View>
            <Play size={rs(18)} color={colors.rose} fill={colors.rose} strokeWidth={0} style={{ marginRight: rs(4) }} />
          </TouchableOpacity>
          <MediaViewerModal
            visible={playerOpen}
            type="audio"
            uri={audioUri}
            fileName={audioFileName}
            onClose={() => setPlayerOpen(false)}
          />
        </>
      )}

      {event.narration && (
        <View style={styles.narrationSection}>
          <Text style={styles.narrationText}>{event.narration}</Text>
        </View>
      )}

      {pa && (
        <>
          <View style={[styles.infoBox, { backgroundColor: colors.rose + '12', marginTop: rs(10) }]}>
            <Text style={[styles.infoBoxLabel, { color: colors.rose }]}>
              {t('listen.soundType')}: {t(`listen.sound_${pa.sound_type}`, { defaultValue: pa.sound_type })}
            </Text>
            <Text style={[styles.infoBoxValue, { color: colors.text }]}>
              {t(`listen.emotion_${pa.emotional_state}`, { defaultValue: pa.emotional_state })}
            </Text>
          </View>

          {pa.intensity && (
            <View style={[styles.severityBadge, { backgroundColor: intensityColor + '20', alignSelf: 'flex-start', marginTop: rs(8) }]}>
              <Text style={[styles.severityText, { color: intensityColor }]}>
                {t(`listen.intensity_${pa.intensity}`, { defaultValue: pa.intensity })}
              </Text>
            </View>
          )}

          {pa.pattern_notes ? (
            <View style={styles.observationRow}>
              <Lightbulb size={rs(12)} color={colors.warning} strokeWidth={1.8} />
              <Text style={styles.observationText}>{pa.pattern_notes}</Text>
            </View>
          ) : null}
        </>
      )}

      {event.tags && event.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});
