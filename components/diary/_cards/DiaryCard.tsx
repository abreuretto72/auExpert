/**
 * DiaryCard — rendered for diary timeline items.
 * Handles pending/processing/error states and the full diary render
 * (header, tutor attribution, mood, narration, media subcards,
 * classifications/lenses, tags, audit section).
 * Extracted verbatim from TimelineCards.tsx.
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  AlertCircle, EyeOff, LayoutGrid, PawPrint, Pencil,
  RefreshCw, Star, User, WifiOff,
} from 'lucide-react-native';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import i18n from '../../../i18n';
import { useAuthStore } from '../../../stores/authStore';
import { DiaryModuleCard } from '../DiaryModuleCard';
import DiaryNarration from '../DiaryNarration';
import { PhotoSubcard } from './PhotoSubcard';
import { VideoSubcard } from './VideoSubcard';
import { AudioSubcard } from './AudioSubcard';
import { OCRSubcard } from './OCRSubcard';
import { ProcessingChecklist } from './ProcessingChecklist';
import {
  type DiaryCardProps,
  HIT,
  cas,
  resolveModuleRow,
} from './shared';
import { styles } from './styles';

// ── DiaryCard ──

export const DiaryCard = React.memo(({ event, petName, t, getMoodData, onEdit, onRetry, onDelete, isOwner, onAdminDeactivate }: DiaryCardProps) => {
  const currentUser = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id;
  const isCreator = !!currentUserId && event.registeredBy === currentUserId;
  console.log('[CARD]', event.id.slice(-8), '| fotos:', event.photos?.length ?? 0, '| narration:', !!event.narration, '| photoAnalysis:', !!event.photoAnalysisData, '| videoUrl:', !!event.videoUrl, '| classif:', event.classifications?.length ?? 0, '| modules:', !!event.modules);
  console.log('[CARD-MEDIA]', event.id?.slice(0,8),
    'mediaAnalyses:', event.mediaAnalyses?.length ?? 0,
    'types:', event.mediaAnalyses?.map((m: any) => m.type).join(',') ?? 'none',
    'ocrFields:', event.mediaAnalyses?.find((m: any) => m.type === 'document')?.ocrData?.fields?.length ?? 0
  );
  const moodData = getMoodData(event.moodId);
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  // Tutor attribution — prefer the joined user row; fall back to current user
  // profile when the DB join returns null (e.g. registered_by was null on older
  // entries created before the column was backfilled).
  const tutorName =
    event.registeredByUser?.full_name
    ?? event.registeredByUser?.email?.split('@')[0]
    ?? (isCreator
      ? (currentUser?.full_name ?? currentUser?.email?.split('@')[0] ?? t('diary.registeredByYou'))
      : t('diary.registeredByUnknown'));

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
  //
  // Live checklist: one row per APPLICABLE phase (text/ocr/video/photos/audio)
  // with its current lifecycle + mini progress bar. Subscribes to the
  // per-tempId progressStore via ProcessingChecklist. Falls back to a neutral
  // spinner line when no phase is active yet (very first ms of background run).
  if (event.processingStatus === 'processing') {
    return (
      <View style={[styles.cardBase, styles.processingCard]}>
        <ProcessingChecklist
          tempId={event.id}
          inputType={event.inputType}
          content={event.content}
          t={t}
        />
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
          {!!tutorName && (
            <View style={styles.tutorAttribution}>
              <User size={rs(10)} color={colors.petrol} strokeWidth={1.8} />
              <Text style={styles.tutorAttributionText}>
                {t('diary.byTutor', { name: tutorName })}
              </Text>
            </View>
          )}
        </View>
        {!event.isRegistrationEntry && (isCreator || (!isCreator && isOwner && onAdminDeactivate)) && (
          <View style={styles.diaryCardActions}>
            {isCreator ? (
              <TouchableOpacity onPress={() => onEdit(event.id)} hitSlop={HIT}>
                <Pencil size={rs(16)} color={colors.accent} strokeWidth={1.8} />
              </TouchableOpacity>
            ) : (
              // Admin (owner) deactivating another tutor's diary entry
              <TouchableOpacity onPress={() => onAdminDeactivate!(event.id)} style={cas.trashBtn} hitSlop={HIT}>
                <EyeOff size={rs(15)} color={colors.danger} strokeWidth={1.8} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {moodData && (
        <View style={styles.moodBadge}>
          <View style={[styles.moodDot, { backgroundColor: moodData.color }]} />
          <Text style={[styles.moodLabel, { color: moodData.color }]}>{moodData.label}</Text>
        </View>
      )}

      {event.narration ? (
        <View style={styles.narrationWrapper}>
          <DiaryNarration
            entryId={event.id}
            narration={event.narration}
            petName={petName}
          />
        </View>
      ) : event.content && event.content !== '(media)' ? (
        <Text style={styles.tutorContent}>{event.content}</Text>
      ) : null}

      {/* Media subcards — one per attachment */}
      {event.mediaAnalyses && event.mediaAnalyses.length > 0 ? (
        <View style={styles.mediaSubcardsContainer}>
          {event.mediaAnalyses.map((media, idx) => {
            // Enriched diagnostic log — previously only showed `analysis` / `desc`,
            // which are ALWAYS `null`/`none` for video in streaming mode (the per-frame
            // photo analysis is intentionally skipped). The real video content lives
            // in `media.videoAnalysis` (behavior_summary + scores). Same for audio
            // (`media.petAudioAnalysis`). Expand per-type so we can tell whether the
            // typed payload actually reached the card.
            const va = media.videoAnalysis as { behavior_summary?: string; energy_score?: number; calm_score?: number; locomotion_score?: number; health_observations?: unknown[] } | null | undefined;
            const pa = media.petAudioAnalysis as { sound_type?: string; emotional_state?: string } | null | undefined;
            console.log('[SUBCARD]', 'type:', media.type,
              'mediaUrl:', !!media.mediaUrl,
              'ocrFields:', media.ocrData?.fields?.length ?? 0,
              'analysis:', !!media.analysis,
              'desc:', (media.analysis?.description as string)?.slice(0, 50) ?? 'none',
              ...(media.type === 'video'
                ? [
                    '| videoAnalysis:', !!va,
                    'behavior:', (va?.behavior_summary ?? 'none').slice(0, 50),
                    'scores:', `e=${va?.energy_score ?? '-'} c=${va?.calm_score ?? '-'} l=${va?.locomotion_score ?? '-'}`,
                    'obs:', va?.health_observations?.length ?? 0,
                  ]
                : media.type === 'audio'
                ? ['| petAudioAnalysis:', !!pa, 'sound:', pa?.sound_type ?? 'none', 'emotion:', pa?.emotional_state ?? 'none']
                : [])
            );
            if (media.type === 'photo') return <PhotoSubcard key={idx} media={media} t={t} />;
            if (media.type === 'video') return <VideoSubcard key={idx} media={media} t={t} />;
            if (media.type === 'audio') return <AudioSubcard key={idx} media={media} t={t} />;
            if (media.type === 'document') {
              // Skip OCR subcard when doc type is "other" and no fields were extracted
              // (e.g. user submitted a photo of their pet instead of a document)
              const ocrDocType = (media.ocrData as Record<string, unknown>)?.document_type as string | undefined;
              const ocrFieldCount = (media.ocrData?.fields?.length ?? 0);
              if (ocrDocType === 'other' && ocrFieldCount === 0) return null;
              return (
                <OCRSubcard
                  key={idx}
                  media={media}
                  t={t}
                  entryId={event.id}
                  mediaIndex={idx}
                  allMediaAnalyses={event.mediaAnalyses!}
                />
              );
            }
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
                // Prefer the local optimistic thumbnail (M4); fall back to the
                // first uploaded photo for legacy entries that used photos[0]
                // as the video poster.
                thumbnailUrl: event.videoThumbUrl ?? event.photos?.[0] ?? null,
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
