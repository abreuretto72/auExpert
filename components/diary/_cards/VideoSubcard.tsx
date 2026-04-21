/**
 * VideoSubcard — rendered inside DiaryCard for video media items.
 * Includes the private SubcardScore helper (only used here).
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Video, Play, Lightbulb } from 'lucide-react-native';
import MediaViewerModal from '../MediaViewerModal';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import type { MediaAnalysisItem } from '../timelineTypes';
import { resolveMediaUri } from './shared';
import { styles } from './styles';

// ── VideoSubcard ──

export function VideoSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const thumbUri = resolveMediaUri(media.thumbnailUrl);
  const videoUri = resolveMediaUri(media.mediaUrl);
  const desc = (media.analysis as Record<string, unknown> | undefined)?.description as string | undefined;
  const va = media.videoAnalysis;
  const hasAIData = !!(desc || va?.behavior_summary);

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={[styles.subcard, { borderColor: colors.sky + '30' }]}>
      <View style={styles.subcardHeader}>
        <Video size={rs(12)} color={colors.sky} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.sky }]}>
          {(hasAIData ? t('diary.videoAnalysis') : t('diary.video')).toUpperCase()}
        </Text>
      </View>
      {(thumbUri || videoUri) && (
        <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85} style={styles.videoThumbWrap}>
          {thumbUri
            ? <Image source={{ uri: thumbUri }} style={styles.subcardImage} resizeMode="cover" />
            : <View style={[styles.subcardImage, { backgroundColor: colors.bgDeep }]} />}
          <View style={styles.videoThumbPlayOverlay}>
            <View style={styles.videoThumbPlayBtn}>
              <Play size={rs(22)} color="#fff" fill="#fff" strokeWidth={0} />
            </View>
          </View>
        </TouchableOpacity>
      )}
      {videoUri && (
        <MediaViewerModal
          visible={viewerOpen}
          type="video"
          uri={videoUri}
          thumbnailUri={thumbUri}
          openInPlayerLabel={t('diary.openInPlayer')}
          onClose={() => setViewerOpen(false)}
        />
      )}
      {desc && <Text style={styles.subcardBodyText}>{desc}</Text>}
      {va?.behavior_summary && <Text style={styles.subcardBodyText}>{va.behavior_summary}</Text>}
      {(() => {
        const videoSources = (media.analysis as Record<string, unknown> | undefined)?.sources as string[] | undefined;
        return videoSources && videoSources.length > 0 ? (
          <>
            <Text style={styles.sourcesTitle}>{t('photoAnalysis.sourcesTitle')}</Text>
            <View style={styles.sourcesContainer}>
              {videoSources.map((src, i) => (
                <Text key={i} style={styles.sourceText}>📚 {src}</Text>
              ))}
            </View>
          </>
        ) : null;
      })()}
      {va && (va.energy_score != null || va.calm_score != null || va.locomotion_score != null) && (
        <View style={styles.subcardScores}>
          {va.energy_score != null && <SubcardScore label={t('diary.energy')} value={va.energy_score} color={colors.gold} />}
          {va.calm_score != null && <SubcardScore label={t('diary.calm')} value={va.calm_score} color={colors.success} />}
          {va.locomotion_score != null && <SubcardScore label={t('diary.locomotion')} value={va.locomotion_score} color={colors.sky} />}
        </View>
      )}
      {va?.health_observations && va.health_observations.length > 0 && (
        <View style={{ paddingHorizontal: rs(10), paddingBottom: rs(8), gap: rs(4) }}>
          {va.health_observations.map((obs, i) => (
            <View key={i} style={styles.observationRow}>
              <Lightbulb size={rs(12)} color={colors.gold} strokeWidth={1.8} />
              <Text style={styles.observationText}>{obs}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── SubcardScore (used by VideoSubcard) ──

function SubcardScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.subcardScoreItem}>
      <Text style={[styles.subcardScoreValue, { color }]}>{value}</Text>
      <Text style={styles.subcardScoreLabel}>{label}</Text>
    </View>
  );
}
