/**
 * VideoAnalysisCard — rendered for video-analysis timeline items.
 * Includes the private ScoreBadge helper (only used here).
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Video, Play, Camera, Lightbulb } from 'lucide-react-native';
import MediaViewerModal from '../MediaViewerModal';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import i18n from '../../../i18n';
import { type CardProps, CardActions, resolveMediaUri } from './shared';
import { styles } from './styles';

// ── ScoreBadge (used by VideoAnalysisCard) ──

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.scoreBadgeItem}>
      <Text style={[styles.scoreBadgeValue, { color }]}>{value}</Text>
      <Text style={styles.scoreBadgeLabel}>{label}</Text>
    </View>
  );
}

// ── VideoAnalysisCard ──

export const VideoAnalysisCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => {
  const va = event.videoAnalysis;
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // First frame: stored as photos[0] (uploaded), falling back to nothing
  const framePhoto = event.photos?.[0];
  const frameUri = resolveMediaUri(framePhoto ?? null);
  const videoUri = resolveMediaUri(event.videoUrl);

  const photoDesc = event.photoAnalysisData?.description as string | undefined;
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={styles.videoCard}>
      {/* Header row */}
      <View style={styles.videoCardHeader}>
        <Video size={rs(14)} color={colors.sky} strokeWidth={1.8} />
        <Text style={styles.videoCardLabel}>{t('diary.videoAnalysis').toUpperCase()}</Text>
        {event.videoDuration != null && (
          <View style={[styles.severityBadge, { backgroundColor: colors.sky + '20' }]}>
            <Text style={[styles.severityText, { color: colors.sky }]}>
              {formatDuration(event.videoDuration)}
            </Text>
          </View>
        )}
        {event.severity && event.severity !== 'low' && (
          <View style={[styles.severityBadge, { backgroundColor: (event.severity === 'high' ? colors.danger : colors.warning) + '20' }]}>
            <Text style={[styles.severityText, { color: event.severity === 'high' ? colors.danger : colors.warning }]}>
              {t(`diary.urgency_${event.severity}`)}
            </Text>
          </View>
        )}
        <CardActions event={event} onDelete={onDelete} isOwner={isOwner} onAdminDeactivate={onAdminDeactivate} />
      </View>

      <Text style={[styles.entryDate, { paddingHorizontal: rs(12) }]}>{dateStr}</Text>
      <Text style={[styles.entryTime, { paddingHorizontal: rs(12), marginBottom: rs(8) }]}>{timeStr}</Text>

      {/* Frame image (uploaded as photos[0]) — tap to open video in player */}
      {frameUri && (
        <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85} style={styles.videoThumbWrap}>
          <Image source={{ uri: frameUri }} style={styles.videoCardFrame} resizeMode="cover" />
          {(videoUri || frameUri) && (
            <View style={styles.videoThumbPlayOverlay}>
              <View style={styles.videoThumbPlayBtn}>
                <Play size={rs(22)} color="#fff" fill="#fff" strokeWidth={0} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}
      {(videoUri || frameUri) && (
        <MediaViewerModal
          visible={viewerOpen}
          type="video"
          uri={videoUri ?? frameUri!}
          thumbnailUri={frameUri}
          openInPlayerLabel={t('diary.openInPlayer')}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Frame description from analyze-pet-photo */}
      {photoDesc && (
        <View style={styles.videoCardFrameDesc}>
          <Camera size={rs(12)} color={colors.success} strokeWidth={1.8} />
          <Text style={styles.videoCardFrameDescText}>{photoDesc}</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: rs(12), paddingBottom: rs(4) }}>
        {/* Behavior summary */}
        {va?.behavior_summary && (
          <Text style={styles.videoCardBehavior}>{va.behavior_summary}</Text>
        )}

        {/* Scores row */}
        {va && (va.energy_score != null || va.calm_score != null || va.locomotion_score != null) && (
          <View style={styles.videoCardScores}>
            {va.energy_score != null && (
              <ScoreBadge label={t('diary.energy')} value={va.energy_score} color={colors.gold} />
            )}
            {va.calm_score != null && (
              <ScoreBadge label={t('diary.calm')} value={va.calm_score} color={colors.success} />
            )}
            {va.locomotion_score != null && (
              <ScoreBadge label={t('diary.locomotion')} value={va.locomotion_score} color={colors.sky} />
            )}
          </View>
        )}

        {/* Health observations */}
        {va?.health_observations && va.health_observations.length > 0 && (
          <View style={[styles.observationsContainer, { marginTop: rs(8) }]}>
            {va.health_observations.map((obs, i) => (
              <View key={i} style={styles.observationRow}>
                <Lightbulb size={rs(12)} color={colors.warning} strokeWidth={1.8} />
                <Text style={styles.observationText}>{obs}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Narration */}
      {event.narration && (
        <View style={styles.videoCardNarration}>
          <Text style={styles.narrationText}>{event.narration}</Text>
        </View>
      )}

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <View style={[styles.tagsRow, { paddingHorizontal: rs(12), paddingBottom: rs(12) }]}>
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
