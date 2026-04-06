/**
 * Timeline card components for the diary.
 * Each card renders a different event type (diary, health, milestone, etc.).
 * All cards are memoized for FlatList performance.
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import {
  AlertCircle, AlertTriangle, Camera, Calendar, FileText, Gift, Heart, LayoutGrid,
  Lightbulb, Lock, Mic, Music2, PawPrint, Pencil, RefreshCw, ShieldCheck, Star,
  Trophy, Video, WifiOff,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import i18n from '../../i18n';
import { getPublicUrl } from '../../lib/storage';
import { useAuthStore } from '../../stores/authStore';
import type { TimelineEvent, MediaAnalysisItem } from './timelineTypes';
import { DiaryModuleCard, type ModuleRow } from './DiaryModuleCard';
import DiaryNarration from './DiaryNarration';

// ── Shared types ──

interface CardProps {
  event: TimelineEvent;
  t: (k: string, opts?: Record<string, string>) => string;
}

interface DiaryCardProps extends CardProps {
  petName: string;
  getMoodData: (id: string | null | undefined) => { label: string; color: string } | null;
  onEdit: (id: string) => void;
  onRetry?: (id: string) => void;
}

// ── Helper: match classification type → module row ──

const MODULE_TYPE_TO_KEY: Record<string, keyof NonNullable<TimelineEvent['modules']>> = {
  vaccine:       'vaccines',
  consultation:  'consultations',
  return_visit:  'consultations',
  expense:       'expenses',
  weight:        'clinical_metrics',
  medication:    'medications',
};

function resolveModuleRow(
  type: string,
  index: number,
  modules: TimelineEvent['modules'],
): ModuleRow | undefined {
  if (!modules) return undefined;
  const key = MODULE_TYPE_TO_KEY[type];
  if (!key) return undefined;
  const arr = modules[key] as ModuleRow[] | undefined;
  if (!arr || arr.length === 0) return undefined;
  // Match by index within same type (most entries have only 1 per type)
  const sameTypeIndex = index; // caller already filtered by type confidence
  return arr[sameTypeIndex] ?? arr[0];
}

// ── PhotoSubcard ──

function PhotoSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const uri = media.mediaUrl?.startsWith('http')
    ? media.mediaUrl
    : media.mediaUrl ? getPublicUrl('pet-photos', media.mediaUrl) : null;
  const desc = (media.analysis as Record<string, unknown> | undefined)?.description as string | undefined;
  const toxCheck = (media.analysis as Record<string, unknown> | undefined)?.toxicity_check as Record<string, unknown> | undefined;
  const hasToxic = toxCheck?.has_toxic_items === true;
  const toxItems = toxCheck?.items as Array<{name: string; toxicity_level: string; description: string}> | undefined;

  return (
    <View style={styles.subcard}>
      <View style={styles.subcardHeader}>
        <Camera size={rs(12)} color={colors.success} strokeWidth={1.8} />
        <Text style={styles.subcardLabel}>{t('diary.photoAnalysis').toUpperCase()}</Text>
      </View>
      {uri && <Image source={{ uri }} style={styles.subcardImage} resizeMode="cover" />}
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
    </View>
  );
}

// ── VideoSubcard ──

function VideoSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const thumbUri = media.thumbnailUrl
    ? (media.thumbnailUrl.startsWith('http') ? media.thumbnailUrl : getPublicUrl('pet-photos', media.thumbnailUrl))
    : null;
  const desc = (media.analysis as Record<string, unknown> | undefined)?.description as string | undefined;
  const va = media.videoAnalysis;

  return (
    <View style={[styles.subcard, { borderColor: colors.sky + '30' }]}>
      <View style={styles.subcardHeader}>
        <Video size={rs(12)} color={colors.sky} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.sky }]}>{t('diary.videoAnalysis').toUpperCase()}</Text>
      </View>
      {thumbUri && <Image source={{ uri: thumbUri }} style={styles.subcardImage} resizeMode="cover" />}
      {desc && <Text style={styles.subcardBodyText}>{desc}</Text>}
      {va?.behavior_summary && <Text style={styles.subcardBodyText}>{va.behavior_summary}</Text>}
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

// ── AudioSubcard ──

function AudioSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const pa = media.petAudioAnalysis;
  const fileName = media.fileName ?? t('diary.audioFile');

  return (
    <View style={[styles.subcard, { borderColor: colors.rose + '30' }]}>
      <View style={styles.subcardHeader}>
        <Mic size={rs(12)} color={colors.rose} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.rose }]}>{t('diary.audioAnalysis').toUpperCase()}</Text>
      </View>
      <View style={styles.audioFileRow}>
        <Music2 size={rs(20)} color={colors.rose} strokeWidth={1.6} />
        <Text style={styles.audioFileName} numberOfLines={1}>{fileName}</Text>
      </View>
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

// ── OCRSubcard ──

function OCRSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const uri = media.mediaUrl?.startsWith('http')
    ? media.mediaUrl
    : media.mediaUrl ? getPublicUrl('pet-photos', media.mediaUrl) : null;
  const fields = media.ocrData?.fields ?? [];

  return (
    <View style={[styles.subcard, { borderColor: colors.purple + '30' }]}>
      <View style={styles.subcardHeader}>
        <FileText size={rs(12)} color={colors.purple} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.purple }]}>{t('diary.ocrAnalysis').toUpperCase()}</Text>
      </View>
      {uri && <Image source={{ uri }} style={styles.subcardImage} resizeMode="cover" />}
      {fields.slice(0, 5).map((field, i) => (
        <View key={i} style={styles.ocrField}>
          <Text style={styles.ocrKey}>{field.key}</Text>
          <Text style={styles.ocrValue}>{field.value}</Text>
        </View>
      ))}
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

export const DiaryCard = React.memo(({ event, petName, t, getMoodData, onEdit, onRetry }: DiaryCardProps) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  console.log('[CARD]', event.id.slice(-8), '| fotos:', event.photos?.length ?? 0, '| narration:', !!event.narration, '| photoAnalysis:', !!event.photoAnalysisData, '| videoUrl:', !!event.videoUrl, '| classif:', event.classifications?.length ?? 0, '| modules:', !!event.modules);
  const moodData = getMoodData(event.moodId);
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  // ── Pending state (saved offline, waiting for sync) ───────────────────────
  if (event.processingStatus === 'pending') {
    return (
      <View style={[styles.cardBase, styles.pendingCard]}>
        <View style={styles.pendingRow}>
          <WifiOff size={rs(14)} color={colors.warning} strokeWidth={1.8} />
          <Text style={styles.pendingText}>{t('diary.pendingSync')}</Text>
        </View>
        {!!event.content && event.content !== '(media)' && (
          <Text style={styles.processingContent} numberOfLines={2}>{event.content}</Text>
        )}
      </View>
    );
  }

  // ── Processing state ──────────────────────────────────────────────────────
  if (event.processingStatus === 'processing') {
    const processingMsg =
      event.inputType === 'photo' || event.inputType === 'gallery' || event.inputType === 'ocr_scan'
        ? t('diary.processingPhoto')
        : event.inputType === 'video'
        ? t('diary.processingVideo')
        : event.inputType === 'pet_audio'
        ? t('diary.processingAudio')
        : t('diary.processingEntry');

    return (
      <View style={[styles.cardBase, styles.processingCard]}>
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color={colors.purple} />
          <Text style={styles.processingText}>{processingMsg}</Text>
        </View>
        {!!event.content && event.content !== '(media)' && (
          <Text style={styles.processingContent} numberOfLines={2}>{event.content}</Text>
        )}
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (event.processingStatus === 'error') {
    return (
      <View style={[styles.cardBase, styles.errorCard]}>
        <View style={styles.errorRow}>
          <AlertCircle size={rs(16)} color={colors.danger} strokeWidth={1.8} />
          <Text style={styles.errorText}>{t('diary.processingError')}</Text>
        </View>
        {!!event.content && event.content !== '(media)' && (
          <Text style={styles.errorContent} numberOfLines={3}>{event.content}</Text>
        )}
        {onRetry && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => onRetry(event.id)}
            activeOpacity={0.7}
          >
            <RefreshCw size={rs(14)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.retryText}>{t('diary.retryEntry')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

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

      {/* Original tutor text hidden — narration only shown */}

      {event.narration ? (
        <View style={styles.narrationWrapper}>
          <DiaryNarration
            entryId={event.id}
            narration={event.narration}
            petName={petName}
          />
        </View>
      ) : null}

      {/* Media subcards — one per attachment */}
      {event.mediaAnalyses && event.mediaAnalyses.length > 0 ? (
        <View style={styles.mediaSubcardsContainer}>
          {event.mediaAnalyses.map((media, idx) => {
            if (media.type === 'photo') return <PhotoSubcard key={idx} media={media} t={t} />;
            if (media.type === 'video') return <VideoSubcard key={idx} media={media} t={t} />;
            if (media.type === 'audio') return <AudioSubcard key={idx} media={media} t={t} />;
            if (media.type === 'document') return <OCRSubcard key={idx} media={media} t={t} />;
            return null;
          })}
        </View>
      ) : (
        /* Fallback for legacy entries without media_analyses */
        <>
          {event.photos && event.photos.length > 0 && (
            <PhotoSubcard
              media={{
                type: 'photo',
                mediaUrl: event.photos[0],
                analysis: event.photoAnalysisData ?? null,
              }}
              t={t}
            />
          )}
          {event.videoUrl && (
            <VideoSubcard
              media={{
                type: 'video',
                mediaUrl: event.videoUrl,
                thumbnailUrl: event.photos?.[0] ?? null,
                videoAnalysis: event.videoAnalysis,
                analysis: event.photoAnalysisData ?? null,
              }}
              t={t}
            />
          )}
          {event.audioUrl && (
            <AudioSubcard
              media={{
                type: 'audio',
                mediaUrl: event.audioUrl,
                petAudioAnalysis: event.petAudioAnalysis,
                analysis: null,
              }}
              t={t}
            />
          )}
        </>
      )}

      {/* Lenses subcard — AI-classified health/finance data */}
      {event.classifications && event.classifications.filter((c) => c.confidence >= 0.5).length > 0 && (
        <View style={styles.subcard}>
          <View style={styles.subcardHeader}>
            <LayoutGrid size={rs(12)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.subcardLabel}>{t('diary.registered').toUpperCase()}</Text>
          </View>
          <View style={styles.moduleList}>
            {event.classifications
              .filter((c) => c.confidence >= 0.5)
              .map((cls, idx) => {
                const moduleRow = resolveModuleRow(cls.type, idx, event.modules);
                return (
                  <DiaryModuleCard
                    key={`${cls.type}-${idx}`}
                    classification={cls}
                    moduleRow={moduleRow}
                    t={t}
                  />
                );
              })}
          </View>
        </View>
      )}

      {event.tags && event.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t(`diary.${tag}`, { defaultValue: tag })}</Text>
            </View>
          ))}
        </View>
      )}

      {event.registeredBy && (
        <View style={styles.auditSection}>
          <Text style={styles.auditText}>
            {t('diary.registeredBy', {
              name: event.registeredBy === currentUserId
                ? t('diary.registeredByYou')
                : (event.registeredByUser?.full_name
                  ?? event.registeredByUser?.email?.split('@')[0]
                  ?? t('diary.registeredByUnknown')),
              date: new Date(event.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
            })}
          </Text>
          {!!event.updatedBy && event.updatedBy !== event.registeredBy && !!event.updatedAt && (
            <Text style={styles.auditText}>
              {t('diary.editedBy', {
                name: event.updatedBy === currentUserId
                  ? t('diary.registeredByYou')
                  : (event.updatedByUser?.full_name
                    ?? event.updatedByUser?.email?.split('@')[0]
                    ?? t('diary.anotherTutor')),
                date: new Date(event.updatedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
              })}
            </Text>
          )}
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
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

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
  </View>
));

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

export const VideoAnalysisCard = React.memo(({ event, t }: CardProps) => {
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
  const frameUri = framePhoto
    ? (framePhoto.startsWith('http') ? framePhoto : getPublicUrl('pet-photos', framePhoto))
    : null;

  const photoDesc = event.photoAnalysisData?.description as string | undefined;

  return (
    <View style={styles.videoCard}>
      {/* Header row */}
      <View style={styles.videoCardHeader}>
        <Video size={rs(14)} color={colors.sky} strokeWidth={1.8} />
        <Text style={styles.videoCardLabel}>{t('diary.videoAnalysis').toUpperCase()}</Text>
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

      <Text style={[styles.entryDate, { paddingHorizontal: rs(12) }]}>{dateStr}</Text>
      <Text style={[styles.entryTime, { paddingHorizontal: rs(12), marginBottom: rs(8) }]}>{timeStr}</Text>

      {/* Frame image (uploaded as photos[0]) */}
      {frameUri && (
        <Image source={{ uri: frameUri }} style={styles.videoCardFrame} resizeMode="cover" />
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
  narrationSection: { backgroundColor: colors.accent + '08', borderWidth: 1, borderColor: colors.accent + '12', borderRadius: rs(12), padding: rs(12) },
  narrationHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  narrationTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.accent, flex: 1 },
  narrationText: { fontFamily: 'Caveat_400Regular', fontSize: fs(15), color: colors.textSec, lineHeight: rs(27), fontStyle: 'italic' },
  narrationWrapper: { marginTop: rs(10) },
  moduleList: { gap: rs(6), padding: rs(4) },
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

  // VideoAnalysisCard
  videoCard: { backgroundColor: colors.card, borderRadius: rs(16), borderWidth: 1, borderColor: colors.sky + '30', overflow: 'hidden' },
  videoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), padding: rs(12), paddingBottom: rs(4) },
  videoCardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.sky, letterSpacing: 1.2, flex: 1 },
  videoCardFrame: { width: '100%', height: rs(180) },
  videoCardFrameDesc: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6), padding: rs(10), backgroundColor: colors.success + '08' },
  videoCardFrameDescText: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(18) },
  videoCardBehavior: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.text, lineHeight: fs(20), marginTop: rs(10) },
  videoCardScores: { flexDirection: 'row', marginTop: rs(10), gap: rs(8) },
  videoCardNarration: { borderTopWidth: 1, borderTopColor: colors.border, padding: rs(12) },

  // ScoreBadge
  scoreBadgeItem: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(8), alignItems: 'center' },
  scoreBadgeValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(18) },
  scoreBadgeLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Video health observations
  observationsContainer: { marginTop: rs(8), gap: rs(6) },
  observationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6) },
  observationText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, flex: 1, lineHeight: fs(18) },

  // Capsule
  capsuleCondition: { fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.textDim, marginTop: rs(4) },
  capsuleMessage: { fontFamily: 'Caveat_400Regular', fontSize: fs(16), color: colors.textSec, fontStyle: 'italic', lineHeight: rs(28), marginTop: rs(8) },
  capsuleDates: { marginTop: rs(8), gap: rs(4) },
  capsuleDateText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textDim },

  // Pending / processing / error states
  pendingCard: { borderLeftWidth: rs(3), borderLeftColor: colors.warning },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  pendingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.warning },
  processingCard: { borderLeftWidth: rs(3), borderLeftColor: colors.purple },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  processingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.purple },
  processingContent: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, fontStyle: 'italic', lineHeight: fs(18) },
  errorCard: { borderLeftWidth: rs(3), borderLeftColor: colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  errorText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.danger },
  errorContent: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18), marginBottom: rs(10) },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), alignSelf: 'flex-start', paddingVertical: rs(6), paddingHorizontal: rs(12), backgroundColor: colors.accentGlow, borderRadius: rs(8) },
  retryText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.accent },

  // Media attachment thumbnails (video/audio in DiaryCard)

  // Audit
  auditSection: { marginTop: rs(8), gap: rs(2) },
  auditText: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost, lineHeight: fs(15) },

  // Subcards (media: photo/video/audio/document + lenses)
  mediaSubcardsContainer: { gap: rs(4), marginTop: rs(10) },
  subcard: { borderRadius: rs(12), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, overflow: 'hidden', marginTop: rs(8) },
  subcardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), paddingHorizontal: rs(12), paddingVertical: rs(8) },
  subcardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.success, letterSpacing: 1.2 },
  subcardImage: { width: '100%', height: rs(180) },
  subcardBodyText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(18), padding: rs(10), paddingTop: rs(4) },
  toxicAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6), padding: rs(10) },
  toxicText: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(12), lineHeight: fs(18) },
  subcardScores: { flexDirection: 'row', paddingHorizontal: rs(10), paddingBottom: rs(8) },
  subcardScoreItem: { flex: 1, alignItems: 'center' },
  subcardScoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16) },
  subcardScoreLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim },
  audioFileRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10), padding: rs(12), paddingTop: rs(4) },
  audioFileName: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  ocrField: { flexDirection: 'row', paddingHorizontal: rs(12), paddingVertical: rs(3), gap: rs(8) },
  ocrKey: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, minWidth: rs(80) },
  ocrValue: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.text },
});
