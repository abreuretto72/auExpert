/**
 * Timeline card components for the diary.
 * Each card renders a different event type (diary, health, milestone, etc.).
 * All cards are memoized for FlatList performance.
 */

import React from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Camera, Calendar, Gift, Heart, Lightbulb, Lock,
  Mic, PawPrint, Pencil, ShieldCheck, Sparkles, Star, Trophy, Video,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { getPublicUrl } from '../../lib/storage';
import PawIcon from '../PawIcon';
import type { TimelineEvent } from './timelineTypes';

// ── Shared types ──

interface CardProps {
  event: TimelineEvent;
  t: (k: string, opts?: Record<string, string>) => string;
}

interface DiaryCardProps extends CardProps {
  petName: string;
  getMoodData: (id: string | null | undefined) => { label: string; color: string } | null;
  onEdit: (id: string) => void;
}

// ── MonthSummaryCard ──

export const MonthSummaryCard = React.memo(({ event, t }: CardProps) => {
  const stats = event.monthStats;
  return (
    <View style={styles.cardBase}>
      <View style={styles.monthHeader}>
        <Calendar size={rs(16)} color={colors.accent} strokeWidth={1.8} />
        <Text style={styles.monthTitle}>{event.monthLabel}</Text>
      </View>
      <Text style={styles.monthSummaryLabel}>{t('diary.monthSummary')}</Text>
      <Text style={styles.cardDetail}>{event.monthSummaryText}</Text>
      {stats && (
        <View style={styles.monthStatsRow}>
          {[
            { value: stats.walks, label: t('diary.walks') },
            { value: stats.photos, label: t('diary.photos') },
            { value: stats.vet, label: t('diary.vet') },
            { value: stats.mood, label: t('diary.moodLabel'), color: colors.success },
          ].map((s) => (
            <View key={s.label} style={styles.monthStat}>
              <Text style={[styles.monthStatValue, s.color ? { color: s.color } : undefined]}>{s.value}</Text>
              <Text style={styles.monthStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── DiaryCard ──

export const DiaryCard = React.memo(({ event, petName, t, getMoodData, onEdit }: DiaryCardProps) => {
  const moodData = getMoodData(event.moodId);
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.cardBase}>
      {event.isSpecial && (
        <View style={styles.specialHeader}>
          <Star size={rs(14)} color={colors.gold} strokeWidth={1.8} />
          <Text style={styles.specialText}>{t('diary.specialMoment')}</Text>
        </View>
      )}

      {event.isRegistrationEntry && (
        <View style={styles.registrationBadge}>
          <PawPrint size={rs(12)} color={colors.accent} strokeWidth={2} />
          <Text style={styles.registrationText}>{t('diary.registrationEntry')}</Text>
        </View>
      )}

      <View style={styles.entryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryDate}>{dateStr}</Text>
          <Text style={styles.entryTime}>{timeStr}</Text>
        </View>
        {!event.isRegistrationEntry && (
          <TouchableOpacity onPress={() => onEdit(event.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Pencil size={rs(16)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        )}
      </View>

      {moodData && (
        <View style={styles.moodBadge}>
          <View style={[styles.moodDot, { backgroundColor: moodData.color }]} />
          <Text style={[styles.moodLabel, { color: moodData.color }]}>{moodData.label}</Text>
        </View>
      )}

      {event.content && (
        <View style={styles.tutorSection}>
          <Text style={styles.tutorLabel}>{t('diary.tutorWrote')}</Text>
          <Text style={styles.tutorContent}>{event.content}</Text>
        </View>
      )}

      {event.photos && event.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow} contentContainerStyle={styles.photosRowContent}>
          {event.photos.map((path, idx) => {
            const isVideo = path.endsWith('.mp4') || path.endsWith('.mov') || path.endsWith('.webm');
            const uri = getPublicUrl('pet-photos', path);
            return isVideo ? (
              <View key={`${path}-${idx}`} style={styles.videoThumb}>
                <Video size={rs(24)} color={colors.sky} strokeWidth={1.5} />
                <Text style={styles.videoLabel}>{t('diary.video')}</Text>
              </View>
            ) : (
              <Image key={`${path}-${idx}`} source={{ uri }} style={styles.photoThumb} />
            );
          })}
        </ScrollView>
      )}

      {event.narration ? (
        <View style={styles.narrationSection}>
          <View style={styles.narrationHeader}>
            <PawIcon size={rs(16)} color={colors.accent} />
            <Text style={styles.narrationTitle}>{t('diary.petNarrates', { name: petName })}</Text>
            <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
          </View>
          <Text style={styles.narrationText}>{event.narration}</Text>
        </View>
      ) : null}

      {event.tags && event.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t(`diary.${tag}`, { defaultValue: tag })}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── HealthCard ──

export const HealthCard = React.memo(({ event, t }: CardProps) => {
  const severityColor = event.severity === 'high' ? colors.danger
    : event.severity === 'medium' ? colors.warning : colors.success;
  const severityLabel = event.severity === 'high' ? t('diary.severityHigh')
    : event.severity === 'medium' ? t('diary.severityMedium') : t('diary.severityLow');
  const sourceLabel = event.source === 'vet' ? t('diary.sourceVet')
    : event.source === 'ai_photo' ? t('diary.sourceAiPhoto')
      : event.source === 'ai_audio' ? t('diary.sourceAiAudio') : t('diary.sourceTutor');

  return (
    <View style={[styles.cardBase, { borderLeftWidth: 3, borderLeftColor: severityColor }]}>
      <View style={styles.cardIconRow}>
        <ShieldCheck size={rs(16)} color={colors.success} strokeWidth={1.8} />
        <Text style={styles.cardTypeLabel}>{t('diary.healthEvent')}</Text>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>{severityLabel}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{event.title}</Text>
      <Text style={styles.cardDetail}>{event.detail}</Text>
      <View style={styles.sourceBadge}>
        <Text style={styles.sourceText}>{sourceLabel}</Text>
      </View>
    </View>
  );
});

// ── AudioAnalysisCard ──

const INTENSITY_COLOR: Record<string, string> = {
  low: '#2ECC71',
  medium: '#F1C40F',
  high: '#E74C3C',
};

export const AudioAnalysisCard = React.memo(({ event, t }: CardProps) => {
  const pa = event.petAudioAnalysis;
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const intensityColor = pa?.intensity ? (INTENSITY_COLOR[pa.intensity] ?? colors.rose) : colors.rose;

  return (
    <View style={styles.cardBase}>
      <View style={styles.cardIconRow}>
        <Mic size={rs(16)} color={colors.rose} strokeWidth={1.8} />
        <Text style={[styles.cardTypeLabel, { color: colors.rose }]}>{t('diary.audioAnalysis')}</Text>
        {event.audioDuration != null && (
          <View style={[styles.severityBadge, { backgroundColor: colors.rose + '20', marginLeft: 'auto' }]}>
            <Text style={[styles.severityText, { color: colors.rose }]}>
              {formatDuration(event.audioDuration)}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.entryDate}>{dateStr}</Text>
      <Text style={[styles.entryTime, { marginBottom: rs(8) }]}>{timeStr}</Text>

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

// ── PhotoAnalysisCard ──

export const PhotoAnalysisCard = React.memo(({ event, t }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Camera size={rs(16)} color={colors.success} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.success }]}>{t('diary.photoAnalysis')}</Text>
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
    {event.score != null && (
      <View style={styles.scoreBox}>
        <Text style={styles.scoreLabel}>{t('diary.healthScore')}</Text>
        <Text style={[styles.scoreValue, {
          color: event.score >= 80 ? colors.success : event.score >= 60 ? colors.warning : colors.danger,
        }]}>{event.score}</Text>
      </View>
    )}
  </View>
));

// ── VideoAnalysisCard ──

export const VideoAnalysisCard = React.memo(({ event, t }: CardProps) => {
  const va = event.videoAnalysis;
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <View style={styles.cardBase}>
      <View style={styles.cardIconRow}>
        <Video size={rs(16)} color={colors.sky} strokeWidth={1.8} />
        <Text style={[styles.cardTypeLabel, { color: colors.sky }]}>{t('diary.videoAnalysis')}</Text>
        {event.videoDuration != null && (
          <View style={[styles.severityBadge, { backgroundColor: colors.sky + '20', marginLeft: 'auto' }]}>
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
      </View>

      <Text style={styles.entryDate}>{dateStr}</Text>
      <Text style={[styles.entryTime, { marginBottom: rs(8) }]}>{timeStr}</Text>

      {event.content && (
        <View style={styles.tutorSection}>
          <Text style={styles.tutorLabel}>{t('diary.tutorWrote')}</Text>
          <Text style={styles.tutorContent}>{event.content}</Text>
        </View>
      )}

      {event.narration && (
        <View style={styles.narrationSection}>
          <Text style={styles.narrationText}>{event.narration}</Text>
        </View>
      )}

      {va && (va.locomotion_score > 0 || va.energy_score > 0 || va.calm_score > 0) && (
        <View style={styles.scoresRow}>
          {[
            { value: va.locomotion_score, label: t('diary.locomotion'), color: colors.sky },
            { value: va.energy_score, label: t('diary.energy'), color: colors.accent },
            { value: va.calm_score, label: t('diary.calm'), color: colors.petrol },
          ].map((s) => (
            <View key={s.label} style={styles.scoreItem}>
              <Text style={[styles.scoreItemValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.scoreItemLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {va?.health_observations && va.health_observations.length > 0 && (
        <View style={styles.observationsContainer}>
          {va.health_observations.map((obs, i) => (
            <View key={i} style={styles.observationRow}>
              <Lightbulb size={rs(12)} color={colors.warning} strokeWidth={1.8} />
              <Text style={styles.observationText}>{obs}</Text>
            </View>
          ))}
        </View>
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

// ── MilestoneCard ──

export const MilestoneCard = React.memo(({ event, t }: CardProps) => (
  <View style={[styles.cardBase, styles.milestoneCard]}>
    <Trophy size={rs(28)} color={colors.gold} strokeWidth={1.8} />
    <Text style={styles.milestoneTitle}>{event.title}</Text>
    <Text style={styles.milestoneDetail}>{event.detail}</Text>
    {event.badgeName && (
      <View style={styles.badgeChip}>
        <Star size={rs(12)} color={colors.gold} strokeWidth={1.8} />
        <Text style={styles.badgeChipText}>{event.badgeName}</Text>
      </View>
    )}
  </View>
));

// ── CapsuleCard ──

export const CapsuleCard = React.memo(({ event, t }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      {event.locked
        ? <Lock size={rs(16)} color={colors.purple} strokeWidth={1.8} />
        : <Gift size={rs(16)} color={colors.purple} strokeWidth={1.8} />}
      <Text style={[styles.cardTypeLabel, { color: colors.purple }]}>{t('diary.capsuleLabel')}</Text>
      {event.locked && (
        <View style={[styles.severityBadge, { backgroundColor: colors.purple + '20' }]}>
          <Lock size={rs(10)} color={colors.purple} strokeWidth={2} />
          <Text style={[styles.severityText, { color: colors.purple, marginLeft: rs(4) }]}>
            {t('diary.capsuleLocked')}
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    {event.locked && event.condition && (
      <Text style={styles.capsuleCondition}>{t('diary.capsuleCondition')}: {event.condition}</Text>
    )}
    {!event.locked && event.capsuleMessage && (
      <Text style={styles.capsuleMessage}>{event.capsuleMessage}</Text>
    )}
    {!event.locked && (
      <View style={styles.capsuleDates}>
        {event.recordedDate && (
          <Text style={styles.capsuleDateText}>{t('diary.capsuleRecorded')} {event.recordedDate}</Text>
        )}
        {event.unlockedDate && (
          <Text style={styles.capsuleDateText}>{t('diary.capsuleUnlocked')} {event.unlockedDate}</Text>
        )}
      </View>
    )}
  </View>
));

// ── ConnectionCard ──

export const ConnectionCard = React.memo(({ event, t }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Heart size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.petrol }]}>{t('diary.connectionLabel')}</Text>
    </View>
    <Text style={styles.cardTitle}>{t('diary.newFriend')}: {event.friendName}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
    {event.matchPct != null && (
      <View style={[styles.severityBadge, { backgroundColor: colors.petrol + '20', alignSelf: 'flex-start', marginTop: rs(8) }]}>
        <Text style={[styles.severityText, { color: colors.petrol }]}>
          {t('diary.matchPercent', { pct: String(event.matchPct) })}
        </Text>
      </View>
    )}
  </View>
));

// ── Styles ──

const styles = StyleSheet.create({
  cardBase: { backgroundColor: colors.card, borderRadius: rs(22), borderWidth: 1, borderColor: colors.border, padding: rs(16) },

  // Month summary
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(8) },
  monthTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.accent },
  monthSummaryLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1.5, marginBottom: rs(6) },
  monthStatsRow: { flexDirection: 'row', marginTop: rs(12), gap: rs(8) },
  monthStat: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(8), alignItems: 'center' },
  monthStatValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(14), color: colors.accent },
  monthStatLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Diary card
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: rs(8) },
  entryDate: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  entryTime: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(11), color: colors.textDim },
  specialHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.gold + '15', paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(8), marginBottom: rs(10), alignSelf: 'flex-start' },
  specialText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.gold, letterSpacing: 0.5 },
  registrationBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.accentGlow, paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(8), marginBottom: rs(10), alignSelf: 'flex-start' },
  registrationText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.accent, letterSpacing: 0.5 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(12) },
  moodDot: { width: rs(8), height: rs(8), borderRadius: rs(4) },
  moodLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11) },
  tutorSection: { backgroundColor: colors.bgCard, borderLeftWidth: 3, borderLeftColor: colors.textGhost, borderRadius: rs(10), padding: rs(12), marginBottom: rs(10) },
  tutorLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, marginBottom: rs(6) },
  tutorContent: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: fs(20) },
  photosRow: { marginBottom: rs(10) },
  photosRowContent: { flexDirection: 'row', gap: rs(8) },
  photoThumb: { width: rs(80), height: rs(80), borderRadius: rs(10), borderWidth: 1, borderColor: colors.border },
  videoThumb: { width: rs(80), height: rs(80), borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.sky + '12', alignItems: 'center', justifyContent: 'center', gap: rs(4) },
  videoLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(9), color: colors.sky },
  narrationSection: { backgroundColor: colors.accent + '08', borderWidth: 1, borderColor: colors.accent + '12', borderRadius: rs(12), padding: rs(12) },
  narrationHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  narrationTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.accent, flex: 1 },
  narrationText: { fontFamily: 'Caveat_400Regular', fontSize: fs(15), color: colors.textSec, lineHeight: rs(27), fontStyle: 'italic' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: rs(10) },
  tagChip: { backgroundColor: colors.bgCard, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  tagText: { fontFamily: 'Sora_500Medium', fontSize: fs(10), color: colors.textDim },

  // Generic card elements
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  cardTypeLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, flex: 1, textTransform: 'uppercase' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text, marginBottom: rs(4) },
  cardDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18) },

  // Health card
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
  severityText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), letterSpacing: 0.5 },
  sourceBadge: { marginTop: rs(8), backgroundColor: colors.bgCard, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4), alignSelf: 'flex-start' },
  sourceText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim },

  // Info boxes
  infoBox: { borderRadius: rs(10), padding: rs(10), marginTop: rs(8) },
  infoBoxLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), letterSpacing: 0.5, marginBottom: rs(4) },
  infoBoxValue: { fontFamily: 'Sora_500Medium', fontSize: fs(12), lineHeight: fs(18) },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(4) },

  // Score boxes
  scoreBox: { marginTop: rs(10), backgroundColor: colors.bgCard, borderRadius: rs(12), borderWidth: 1, borderColor: colors.border, padding: rs(12), alignItems: 'center' },
  scoreLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.5, marginBottom: rs(4) },
  scoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(28) },
  scoresRow: { flexDirection: 'row', marginTop: rs(10), gap: rs(8) },
  scoreItem: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(10), alignItems: 'center' },
  scoreItemValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(18) },
  scoreItemLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Milestone
  milestoneCard: { alignItems: 'center', paddingVertical: rs(20) },
  milestoneTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.gold, textAlign: 'center', marginTop: rs(10) },
  milestoneDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, textAlign: 'center', marginTop: rs(4), lineHeight: fs(18) },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.gold + '15', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8), marginTop: rs(10) },
  badgeChipText: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.gold },

  // Video health observations
  observationsContainer: { marginTop: rs(8), gap: rs(6) },
  observationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6) },
  observationText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, flex: 1, lineHeight: fs(18) },

  // Capsule
  capsuleCondition: { fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.textDim, marginTop: rs(4) },
  capsuleMessage: { fontFamily: 'Caveat_400Regular', fontSize: fs(16), color: colors.textSec, fontStyle: 'italic', lineHeight: rs(28), marginTop: rs(8) },
  capsuleDates: { marginTop: rs(8), gap: rs(4) },
  capsuleDateText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textDim },
});
