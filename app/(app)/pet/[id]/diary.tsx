import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trophy,
  Gift,
  Dog,
  Cat,
  Calendar,
  Heart,
  ChevronDown,
  ChevronUp,
  Star,
  Mic,
  Camera,
  Video,
  Lock,
  Lightbulb,
} from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { rs, fs } from '../../../../hooks/useResponsive';
import { moods } from '../../../../constants/moods';
import { useDiary } from '../../../../hooks/useDiary';
import { usePet } from '../../../../hooks/usePets';
import PawIcon from '../../../../components/PawIcon';
import { useToast } from '../../../../components/Toast';
import type { DiaryEntry } from '../../../../types/database';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

type TimelineEventType =
  | 'month_summary'
  | 'diary'
  | 'milestone'
  | 'audio_analysis'
  | 'photo_analysis'
  | 'video_analysis'
  | 'capsule'
  | 'connection';

interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: string;
  sortDate: number;
  title?: string;
  detail?: string;
  moodId?: string;
  content?: string;
  narration?: string | null;
  isSpecial?: boolean;
  tags?: string[];
  severity?: 'low' | 'medium' | 'high';
  source?: string;
  emotion?: string;
  aiTip?: string;
  score?: number;
  scores?: { locomotion: number; energy: number; calm: number };
  badgeName?: string;
  locked?: boolean;
  condition?: string;
  capsuleMessage?: string;
  recordedDate?: string;
  unlockedDate?: string;
  friendName?: string;
  matchPct?: number;
  monthLabel?: string;
  monthSummaryText?: string;
  monthStats?: { walks: number; photos: number; vet: number; mood: string };
}

type FilterId = 'all' | 'moments' | 'ai' | 'milestones' | 'capsules';

interface FilterTab {
  id: FilterId;
  labelKey: string;
  icon: React.ElementType;
}

// ══════════════════════════════════════
// EVENT TYPE CONFIGURATION
// ══════════════════════════════════════

const EVENT_TYPE_CONFIG: Record<TimelineEventType, { color: string; icon: React.ElementType }> = {
  month_summary: { color: colors.accent, icon: Calendar },
  diary: { color: colors.accent, icon: BookOpen },
  milestone: { color: colors.gold, icon: Trophy },
  audio_analysis: { color: colors.rose, icon: Mic },
  photo_analysis: { color: colors.success, icon: Camera },
  video_analysis: { color: colors.sky, icon: Video },
  capsule: { color: colors.purple, icon: Gift },
  connection: { color: colors.petrol, icon: Heart },
};

const FILTER_TABS: FilterTab[] = [
  { id: 'moments', labelKey: 'diary.filterMoments', icon: Pencil },
  { id: 'ai', labelKey: 'diary.filterAi', icon: Sparkles },
  { id: 'milestones', labelKey: 'diary.filterMilestones', icon: Trophy },
  { id: 'capsules', labelKey: 'diary.filterCapsules', icon: Gift },
];

// ══════════════════════════════════════
// HAPPINESS CHART DATA
// ══════════════════════════════════════

// Chart will use real mood_logs data when available
const CHART_MAX = 100;
const CHART_HEIGHT = 140;

// ══════════════════════════════════════
// SKELETON
// ══════════════════════════════════════

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonDot} />
      <View style={styles.skeletonContent}>
        <View style={[styles.skeletonLine, { width: '40%' }]} />
        <View style={[styles.skeletonLine, { width: '60%', marginTop: rs(8) }]} />
        <View style={[styles.skeletonLine, { width: '90%', marginTop: rs(8) }]} />
        <View style={[styles.skeletonLine, { width: '75%', marginTop: rs(8) }]} />
      </View>
    </View>
  );
}

function SkeletonLoading() {
  return (
    <View style={styles.skeletonContainer}>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
}

// ══════════════════════════════════════
// CARD COMPONENTS
// ══════════════════════════════════════

const MonthSummaryCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => {
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
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{stats.walks}</Text>
            <Text style={styles.monthStatLabel}>{t('diary.walks')}</Text>
          </View>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{stats.photos}</Text>
            <Text style={styles.monthStatLabel}>{t('diary.photos')}</Text>
          </View>
          <View style={styles.monthStat}>
            <Text style={styles.monthStatValue}>{stats.vet}</Text>
            <Text style={styles.monthStatLabel}>{t('diary.vet')}</Text>
          </View>
          <View style={styles.monthStat}>
            <Text style={[styles.monthStatValue, { color: colors.success }]}>{stats.mood}</Text>
            <Text style={styles.monthStatLabel}>{t('diary.moodLabel')}</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const DiaryCard = React.memo(({ event, petName, t, getMoodData, onEdit }: {
  event: TimelineEvent;
  petName: string;
  t: (k: string, opts?: Record<string, string>) => string;
  getMoodData: (id: string | null | undefined) => { label: string; color: string } | null;
  onEdit: (id: string) => void;
}) => {
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

      <View style={styles.entryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryDate}>{dateStr}</Text>
          <Text style={styles.entryTime}>{timeStr}</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(event.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Pencil size={rs(16)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
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

      {event.narration ? (
        <View style={styles.narrationSection}>
          <View style={styles.narrationHeader}>
            <PawIcon size={rs(16)} color={colors.accent} />
            <Text style={styles.narrationTitle}>
              {t('diary.petNarrates', { name: petName })}
            </Text>
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

const HealthCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => {
  const severityColor = event.severity === 'high'
    ? colors.danger
    : event.severity === 'medium'
      ? colors.warning
      : colors.success;

  const severityLabel = event.severity === 'high'
    ? t('diary.severityHigh')
    : event.severity === 'medium'
      ? t('diary.severityMedium')
      : t('diary.severityLow');

  const sourceLabel = event.source === 'vet'
    ? t('diary.sourceVet')
    : event.source === 'ai_photo'
      ? t('diary.sourceAiPhoto')
      : event.source === 'ai_audio'
        ? t('diary.sourceAiAudio')
        : t('diary.sourceTutor');

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

const AudioAnalysisCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Mic size={rs(16)} color={colors.rose} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.rose }]}>{t('diary.audioAnalysis')}</Text>
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
    {event.emotion && (
      <View style={[styles.infoBox, { backgroundColor: colors.rose + '12' }]}>
        <Text style={[styles.infoBoxLabel, { color: colors.rose }]}>{t('diary.emotionDetected')}</Text>
        <Text style={[styles.infoBoxValue, { color: colors.rose }]}>{event.emotion}</Text>
      </View>
    )}
    {event.aiTip && (
      <View style={[styles.infoBox, { backgroundColor: colors.success + '12' }]}>
        <View style={styles.tipRow}>
          <Lightbulb size={rs(14)} color={colors.success} strokeWidth={1.8} />
          <Text style={[styles.infoBoxLabel, { color: colors.success }]}>{t('diary.aiTip')}</Text>
        </View>
        <Text style={[styles.infoBoxValue, { color: colors.textSec }]}>{event.aiTip}</Text>
      </View>
    )}
  </View>
));

const PhotoAnalysisCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => (
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

const VideoAnalysisCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Video size={rs(16)} color={colors.sky} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.sky }]}>{t('diary.videoAnalysis')}</Text>
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
    {event.scores && (
      <View style={styles.scoresRow}>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreItemValue, { color: colors.sky }]}>{event.scores.locomotion}</Text>
          <Text style={styles.scoreItemLabel}>{t('diary.locomotion')}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreItemValue, { color: colors.accent }]}>{event.scores.energy}</Text>
          <Text style={styles.scoreItemLabel}>{t('diary.energy')}</Text>
        </View>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreItemValue, { color: colors.petrol }]}>{event.scores.calm}</Text>
          <Text style={styles.scoreItemLabel}>{t('diary.calm')}</Text>
        </View>
      </View>
    )}
  </View>
));

const MilestoneCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => (
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

const CapsuleCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => (
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
      <Text style={styles.capsuleCondition}>
        {t('diary.capsuleCondition')}: {event.condition}
      </Text>
    )}
    {!event.locked && event.capsuleMessage && (
      <Text style={styles.capsuleMessage}>{event.capsuleMessage}</Text>
    )}
    {!event.locked && (
      <View style={styles.capsuleDates}>
        {event.recordedDate && (
          <Text style={styles.capsuleDateText}>
            {t('diary.capsuleRecorded')} {event.recordedDate}
          </Text>
        )}
        {event.unlockedDate && (
          <Text style={styles.capsuleDateText}>
            {t('diary.capsuleUnlocked')} {event.unlockedDate}
          </Text>
        )}
      </View>
    )}
  </View>
));

const ConnectionCard = React.memo(({ event, t }: { event: TimelineEvent; t: (k: string) => string }) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Heart size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.petrol }]}>{t('diary.connectionLabel')}</Text>
    </View>
    <Text style={styles.cardTitle}>
      {t('diary.newFriend')}: {event.friendName}
    </Text>
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

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

const ENTRY_TYPE_TO_TIMELINE: Record<string, TimelineEventType> = {
  manual: 'diary',
  photo_analysis: 'photo_analysis',
  ai_insight: 'diary',
  milestone: 'milestone',
  mood_change: 'diary',
  capsule: 'capsule',
  connection: 'connection',
};

function diaryEntryToEvent(entry: DiaryEntry): TimelineEvent {
  const timelineType = ENTRY_TYPE_TO_TIMELINE[entry.entry_type ?? 'manual'] ?? 'diary';
  return {
    id: entry.id,
    type: timelineType,
    date: entry.created_at,
    sortDate: new Date(entry.created_at).getTime(),
    moodId: entry.mood_id ?? undefined,
    content: entry.content,
    narration: entry.narration,
    tags: entry.tags ?? [],
    isSpecial: entry.is_special ?? false,
    title: entry.entry_type !== 'manual' ? entry.content : undefined,
    detail: entry.entry_type !== 'manual' ? entry.narration ?? undefined : undefined,
    score: entry.mood_score ?? undefined,
  };
}

function filterMatchesType(filter: FilterId, type: TimelineEventType): boolean {
  if (filter === 'all') return true;
  if (filter === 'moments') return type === 'diary' || type === 'photo_analysis';
  if (filter === 'ai') return type === 'audio_analysis' || type === 'video_analysis';
  if (filter === 'milestones') return type === 'milestone' || type === 'connection';
  if (filter === 'capsules') return type === 'capsule';
  return true;
}

// ══════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════

export default function DiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<FilterId>('moments');
  const [chartOpen, setChartOpen] = useState(false);

  const { data: pet } = usePet(id!);
  const { entries, isLoading, refetch } = useDiary(id!);
  const { toast } = useToast();

  const petName = pet?.name ?? '...';
  const species = pet?.species;
  const petColor = species === 'cat' ? colors.purple : colors.accent;
  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  const getMoodData = useCallback(
    (moodId: string | null | undefined) => {
      if (!moodId) return null;
      const mood = moods.find((m) => m.id === moodId);
      if (!mood) return null;
      return { label: isEnglish ? mood.label_en : mood.label, color: mood.color };
    },
    [isEnglish],
  );

  const timelineEvents = useMemo(() => {
    const diaryEvents = entries.map(diaryEntryToEvent);
    diaryEvents.sort((a, b) => b.sortDate - a.sortDate);
    return diaryEvents;
  }, [entries]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === 'moments') return timelineEvents;
    return timelineEvents.filter((e) => filterMatchesType(activeFilter, e.type));
  }, [timelineEvents, activeFilter]);

  const totalMemories = timelineEvents.length;

  const handleNewEntry = useCallback(() => {
    router.push(`/pet/${id}/diary/new`);
  }, [router, id]);

  const handleEditEntry = useCallback((entryId: string) => {
    router.push(`/pet/${id}/diary/new?edit=${entryId}` as never);
  }, [router, id]);



  const renderEvent = useCallback(
    ({ item, index }: { item: TimelineEvent; index: number }) => {
      const config = EVENT_TYPE_CONFIG[item.type];
      const isLast = index === filteredEvents.length - 1;

      let cardContent: React.ReactNode = null;
      switch (item.type) {
        case 'month_summary':
          cardContent = <MonthSummaryCard event={item} t={t} />;
          break;
        case 'diary':
          cardContent = <DiaryCard event={item} petName={petName} t={t} getMoodData={getMoodData} onEdit={handleEditEntry} />;
          break;
        case 'health':
          cardContent = <HealthCard event={item} t={t} />;
          break;
        case 'audio_analysis':
          cardContent = <AudioAnalysisCard event={item} t={t} />;
          break;
        case 'photo_analysis':
          cardContent = <PhotoAnalysisCard event={item} t={t} />;
          break;
        case 'video_analysis':
          cardContent = <VideoAnalysisCard event={item} t={t} />;
          break;
        case 'milestone':
          cardContent = <MilestoneCard event={item} t={t} />;
          break;
        case 'capsule':
          cardContent = <CapsuleCard event={item} t={t} />;
          break;
        case 'connection':
          cardContent = <ConnectionCard event={item} t={t} />;
          break;
        default:
          break;
      }

      return (
        <View style={styles.entryRow}>
          {/* Timeline line */}
          {!isLast && <View style={styles.timelineLine} />}

          {/* Timeline dot */}
          <View
            style={[
              styles.timelineDot,
              { backgroundColor: config.color },
            ]}
          />

          {/* Card */}
          <View style={styles.entryCardWrapper}>
            {cardContent}
          </View>
        </View>
      );
    },
    [filteredEvents.length, petName, t, getMoodData],
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Header Info */}
        <View style={styles.headerInfo}>
          <View style={[styles.headerIconWrap, { borderColor: petColor + '25' }]}>
            {pet?.avatar_url
              ? <Image source={{ uri: pet.avatar_url }} style={styles.headerAvatar} />
              : species === 'cat'
                ? <Cat size={rs(24)} color={colors.purple} strokeWidth={1.8} />
                : <Dog size={rs(24)} color={colors.accent} strokeWidth={1.8} />}
          </View>
          <View style={styles.headerTexts}>
            <Text style={styles.headerCount}>
              <Text style={styles.headerCountMono}>{totalMemories}</Text>
              {' '}{t('diary.memories')}
            </Text>
            <Text style={styles.headerSince}>
              {pet?.created_at
                ? `${t('diary.since')} ${new Date(pet.created_at).toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })}`
                : ''}
            </Text>
          </View>
        </View>

        {/* AI Personality Card */}
        <View style={styles.personalityCard}>
          <View style={styles.personalityIcon}>
            <Sparkles size={rs(18)} color={colors.accent} strokeWidth={1.8} />
          </View>
          <View style={styles.personalityContent}>
            <Text style={styles.personalityLabel}>
              {t('diary.aiPersonality')}
            </Text>
            <Text style={styles.personalityText}>
              {pet?.ai_personality ??
                t('diary.defaultPersonality')}
            </Text>
          </View>
        </View>

        {/* Happiness Chart — hidden until real mood_logs data is available */}

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.id;
            const IconComp = tab.icon;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveFilter(tab.id)}
                activeOpacity={0.7}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                ]}
              >
                <IconComp
                  size={rs(14)}
                  color={isActive ? '#fff' : colors.textDim}
                  strokeWidth={1.8}
                />
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {t(tab.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Entry count */}
        {filteredEvents.length > 0 && (
          <Text style={styles.entryCount}>
            {filteredEvents.length} {t('diary.entries')}
          </Text>
        )}
      </View>
    ),
    [pet, species, activeFilter, filteredEvents.length, totalMemories, chartOpen, t],
  );

  const renderFooter = useCallback(() => {
    if (filteredEvents.length === 0) return null;
    return (
      <View style={styles.footerContainer}>
        <PawIcon size={rs(20)} color={colors.accent} />
        <Text style={styles.footerText}>
          {t('diary.storyContinues', { name: petName })}
        </Text>
      </View>
    );
  }, [filteredEvents.length, petName, t]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <BookOpen size={rs(48)} color={colors.textGhost} strokeWidth={1.4} />
        <Text style={styles.emptyTitle}>{t('diary.emptyTitle')}</Text>
        <Text style={styles.emptySub}>
          {t('diary.emptySub', { name: petName })}
        </Text>
      </View>
    );
  }, [isLoading, petName, t]);

  const keyExtractor = useCallback((item: TimelineEvent) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <SkeletonLoading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredEvents}
        keyExtractor={keyExtractor}
        renderItem={renderEvent}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleNewEntry} activeOpacity={0.8}>
        <Pencil size={rs(22)} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: rs(100),
  },

  // Header Info
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: rs(16),
    marginTop: rs(16),
    gap: rs(12),
  },
  headerIconWrap: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(16),
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: rs(14),
  },
  headerTexts: {
    flex: 1,
  },
  headerCount: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
  },
  headerCountMono: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(18),
    color: colors.accent,
  },
  headerSince: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(2),
  },

  // AI Personality Card
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent + '08',
    borderWidth: 1,
    borderColor: colors.accent + '15',
    borderRadius: rs(18),
    marginHorizontal: rs(16),
    marginTop: rs(16),
    padding: rs(14),
    gap: rs(12),
  },
  personalityIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityContent: {
    flex: 1,
  },
  personalityLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.accent,
    letterSpacing: 1.5,
    marginBottom: rs(4),
  },
  personalityText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: fs(18),
  },

  // Happiness Chart Toggle
  chartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: rs(16),
    marginTop: rs(16),
    padding: rs(12),
    backgroundColor: colors.card,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
    gap: rs(8),
  },
  chartToggleText: {
    flex: 1,
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
  },

  // Happiness Chart
  chartCard: {
    marginHorizontal: rs(16),
    marginTop: rs(8),
    backgroundColor: colors.card,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(16),
  },
  chartContainer: {
    height: rs(CHART_HEIGHT + 30),
    position: 'relative',
  },
  chartGuideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  chartColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: rs(CHART_HEIGHT),
    paddingBottom: rs(24),
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  chartCircle: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartScore: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: '#fff',
  },
  chartMonthLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(6),
  },
  chartCaption: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    textAlign: 'center',
    marginTop: rs(12),
    lineHeight: fs(16),
  },

  // Filters
  filterScroll: {
    marginTop: rs(16),
  },
  filterRow: {
    paddingHorizontal: rs(16),
    gap: rs(8),
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(20),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  filterTextActive: {
    color: '#fff',
  },

  // Entry count
  entryCount: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginHorizontal: rs(16),
    marginTop: rs(14),
    marginBottom: rs(4),
  },

  // Timeline entries
  entryRow: {
    flexDirection: 'row',
    marginLeft: rs(28),
    marginRight: rs(16),
    marginTop: rs(16),
  },
  timelineLine: {
    position: 'absolute',
    left: rs(5),
    top: rs(16),
    bottom: rs(-16),
    width: 2,
    backgroundColor: colors.accent + '15',
  },
  timelineDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    marginTop: rs(18),
    marginRight: rs(12),
    zIndex: 1,
  },
  entryCardWrapper: {
    flex: 1,
  },

  // Card base
  cardBase: {
    backgroundColor: colors.card,
    borderRadius: rs(22),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(16),
  },

  // Month Summary
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(8),
  },
  monthTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.accent,
  },
  monthSummaryLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 1.5,
    marginBottom: rs(6),
  },
  monthStatsRow: {
    flexDirection: 'row',
    marginTop: rs(12),
    gap: rs(8),
  },
  monthStat: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(8),
    alignItems: 'center',
  },
  monthStatValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(14),
    color: colors.accent,
  },
  monthStatLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(9),
    color: colors.textDim,
    marginTop: rs(2),
  },

  // Diary Card
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rs(8),
  },
  entryDate: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  entryTime: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  specialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: colors.gold + '15',
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    marginBottom: rs(10),
    alignSelf: 'flex-start',
  },
  specialText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.gold,
    letterSpacing: 0.5,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(12),
  },
  moodDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  moodLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
  },
  tutorSection: {
    backgroundColor: colors.bgCard,
    borderLeftWidth: 3,
    borderLeftColor: colors.textGhost,
    borderRadius: rs(10),
    padding: rs(12),
    marginBottom: rs(10),
  },
  tutorLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 1,
    marginBottom: rs(6),
  },
  tutorContent: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: fs(20),
  },
  narrationSection: {
    backgroundColor: colors.accent + '08',
    borderWidth: 1,
    borderColor: colors.accent + '12',
    borderRadius: rs(12),
    padding: rs(12),
  },
  narrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(8),
  },
  narrationTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.accent,
    flex: 1,
  },
  narrationText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textSec,
    lineHeight: rs(27),
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
    marginTop: rs(10),
  },
  tagChip: {
    backgroundColor: colors.bgCard,
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  tagText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
  },

  // Generic Card Elements
  cardIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(8),
  },
  cardTypeLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 1,
    flex: 1,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
    marginBottom: rs(4),
  },
  cardDetail: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: fs(18),
  },

  // Health Card
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(8),
  },
  severityText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    letterSpacing: 0.5,
  },
  sourceBadge: {
    marginTop: rs(8),
    backgroundColor: colors.bgCard,
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
  },

  // Info boxes (audio/photo)
  infoBox: {
    borderRadius: rs(10),
    padding: rs(10),
    marginTop: rs(8),
  },
  infoBoxLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    letterSpacing: 0.5,
    marginBottom: rs(4),
  },
  infoBoxValue: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    lineHeight: fs(18),
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(4),
  },

  // Score box (photo analysis)
  scoreBox: {
    marginTop: rs(10),
    backgroundColor: colors.bgCard,
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 0.5,
    marginBottom: rs(4),
  },
  scoreValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(28),
  },

  // Video scores row
  scoresRow: {
    flexDirection: 'row',
    marginTop: rs(10),
    gap: rs(8),
  },
  scoreItem: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(10),
    alignItems: 'center',
  },
  scoreItemValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(18),
  },
  scoreItemLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(9),
    color: colors.textDim,
    marginTop: rs(2),
  },

  // Milestone Card
  milestoneCard: {
    alignItems: 'center',
    paddingVertical: rs(20),
  },
  milestoneTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.gold,
    textAlign: 'center',
    marginTop: rs(10),
  },
  milestoneDetail: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    textAlign: 'center',
    marginTop: rs(4),
    lineHeight: fs(18),
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: colors.gold + '15',
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    marginTop: rs(10),
  },
  badgeChipText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.gold,
  },

  // Capsule Card
  capsuleCondition: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.textDim,
    marginTop: rs(4),
  },
  capsuleMessage: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(16),
    color: colors.textSec,
    fontStyle: 'italic',
    lineHeight: rs(28),
    marginTop: rs(8),
  },
  capsuleDates: {
    marginTop: rs(8),
    gap: rs(4),
  },
  capsuleDateText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(60),
    paddingHorizontal: rs(32),
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.textSec,
    marginTop: rs(16),
  },
  emptySub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textDim,
    textAlign: 'center',
    marginTop: rs(8),
    lineHeight: fs(20),
  },

  // Footer
  footerContainer: {
    alignItems: 'center',
    paddingVertical: rs(24),
    gap: rs(10),
  },
  footerText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textDim,
    fontStyle: 'italic',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: rs(24),
    right: rs(20),
    width: rs(56),
    height: rs(56),
    borderRadius: rs(18),
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.35,
    shadowRadius: rs(16),
  },

  // Skeleton
  skeletonContainer: {
    paddingHorizontal: rs(16),
    paddingTop: rs(16),
    gap: rs(16),
  },
  skeletonCard: {
    flexDirection: 'row',
    marginLeft: rs(12),
  },
  skeletonDot: {
    width: rs(12),
    height: rs(12),
    borderRadius: rs(6),
    backgroundColor: colors.border,
    marginTop: rs(18),
    marginRight: rs(12),
  },
  skeletonContent: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: rs(22),
    padding: rs(16),
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonLine: {
    height: rs(10),
    borderRadius: rs(5),
    backgroundColor: colors.border,
  },
});
