/**
 * PhotoSubcard — rendered inside DiaryCard for photo media items.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Camera, AlertTriangle } from 'lucide-react-native';
import MediaViewerModal from '../MediaViewerModal';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import type { MediaAnalysisItem } from '../timelineTypes';
import { resolveMediaUri } from './shared';
import { styles } from './styles';

// ── PhotoSubcard ──

export function PhotoSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const uri = resolveMediaUri(media.mediaUrl);
  const desc = (media.analysis as Record<string, unknown> | undefined)?.description as string | undefined;
  const toxCheck = (media.analysis as Record<string, unknown> | undefined)?.toxicity_check as Record<string, unknown> | undefined;
  const sources = (media.analysis as Record<string, unknown> | undefined)?.sources as string[] | undefined;
  const hasToxic = toxCheck?.has_toxic_items === true;
  const toxItems = toxCheck?.items as Array<{name: string; toxicity_level: string; description: string}> | undefined;

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={styles.subcard}>
      <View style={styles.subcardHeader}>
        <Camera size={rs(12)} color={colors.success} strokeWidth={1.8} />
        <Text style={styles.subcardLabel}>{t('diary.photoAnalysis').toUpperCase()}</Text>
      </View>
      {uri && (
        <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85}>
          <Image source={{ uri }} style={styles.subcardImage} resizeMode="cover" />
        </TouchableOpacity>
      )}
      {uri && (
        <MediaViewerModal
          visible={viewerOpen}
          type="photo"
          uri={uri}
          onClose={() => setViewerOpen(false)}
        />
      )}
      {hasToxic && toxItems && toxItems.length > 0 && (
        <View style={[styles.toxicAlert, { backgroundColor: colors.danger + '12' }]}>
          <AlertTriangle size={rs(14)} color={colors.danger} strokeWidth={1.8} />
          <View style={{ flex: 1, gap: rs(2) }}>
            {toxItems.map((item, i) => (
              <Text key={i} style={[styles.toxicText, { color: colors.danger }]}>
                {item.name}: {item.description}
              </Text>
            ))}
          </View>
        </View>
      )}
      {desc && <Text style={styles.subcardBodyText}>{desc}</Text>}
      {sources && sources.length > 0 && (
        <>
          <Text style={styles.sourcesTitle}>{t('photoAnalysis.sourcesTitle')}</Text>
          <View style={styles.sourcesContainer}>
            {sources.map((src, i) => (
              <Text key={i} style={styles.sourceText}>📚 {src}</Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
