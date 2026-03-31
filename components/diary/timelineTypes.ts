/**
 * Shared types, constants, and helpers for the diary timeline.
 * Extracted from diary.tsx to be reused across DiaryTimeline,
 * TimelineCards, and the diary screen.
 */

import {
  BookOpen, Calendar, Camera, Gift, Heart, Mic,
  Pencil, Sparkles, Trophy, Video,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import type { DiaryEntry } from '../../types/database';

// ── Timeline event types ──

export type TimelineEventType =
  | 'month_summary'
  | 'diary'
  | 'milestone'
  | 'audio_analysis'
  | 'photo_analysis'
  | 'video_analysis'
  | 'capsule'
  | 'connection';

export interface TimelineEvent {
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
  isRegistrationEntry?: boolean;
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
  photos?: string[];
  capsuleMessage?: string;
  recordedDate?: string;
  unlockedDate?: string;
  friendName?: string;
  matchPct?: number;
  monthLabel?: string;
  monthSummaryText?: string;
  monthStats?: { walks: number; photos: number; vet: number; mood: string };
  // Video-specific
  videoUrl?: string | null;
  videoDuration?: number | null;
  videoAnalysis?: {
    locomotion_score: number;
    energy_score: number;
    calm_score: number;
    behavior_summary: string;
    health_observations: string[];
  } | null;
  // Pet audio-specific
  audioUrl?: string | null;
  audioDuration?: number | null;
  petAudioAnalysis?: {
    sound_type: string;
    emotional_state: string;
    intensity: 'low' | 'medium' | 'high';
    pattern_notes: string;
  } | null;
}

// ── Filters ──

export type FilterId = 'all' | 'moments' | 'ai' | 'milestones' | 'capsules';

export interface FilterTab {
  id: FilterId;
  labelKey: string;
  icon: React.ElementType;
}

export const FILTER_TABS: FilterTab[] = [
  { id: 'moments', labelKey: 'diary.filterMoments', icon: Pencil },
  { id: 'ai', labelKey: 'diary.filterAi', icon: Sparkles },
  { id: 'milestones', labelKey: 'diary.filterMilestones', icon: Trophy },
  { id: 'capsules', labelKey: 'diary.filterCapsules', icon: Gift },
];

// ── Event type visual config ──

export const EVENT_TYPE_CONFIG: Record<TimelineEventType, { color: string; icon: React.ElementType }> = {
  month_summary: { color: colors.accent, icon: Calendar },
  diary: { color: colors.accent, icon: BookOpen },
  milestone: { color: colors.gold, icon: Trophy },
  audio_analysis: { color: colors.rose, icon: Mic },
  photo_analysis: { color: colors.success, icon: Camera },
  video_analysis: { color: colors.sky, icon: Video },
  capsule: { color: colors.purple, icon: Gift },
  connection: { color: colors.petrol, icon: Heart },
};

// ── Conversion helpers ──

const ENTRY_TYPE_TO_TIMELINE: Record<string, TimelineEventType> = {
  manual: 'diary',
  photo_analysis: 'photo_analysis',
  ai_insight: 'diary',
  milestone: 'milestone',
  mood_change: 'diary',
  capsule: 'capsule',
  connection: 'connection',
};

const INPUT_TYPE_TO_TIMELINE: Record<string, TimelineEventType> = {
  video: 'video_analysis',
  photo: 'photo_analysis',
  gallery: 'photo_analysis',
  ocr_scan: 'photo_analysis',
  pet_audio: 'audio_analysis',
};

export function diaryEntryToEvent(entry: DiaryEntry & {
  input_type?: string;
  video_url?: string | null;
  video_duration?: number | null;
  video_analysis?: TimelineEvent['videoAnalysis'];
  audio_url?: string | null;
  audio_duration?: number | null;
  pet_audio_analysis?: TimelineEvent['petAudioAnalysis'];
}): TimelineEvent {
  // input_type takes precedence over entry_type for newer entries
  const inputType = entry.input_type;
  const timelineType =
    (inputType && INPUT_TYPE_TO_TIMELINE[inputType])
    ?? ENTRY_TYPE_TO_TIMELINE[entry.entry_type ?? 'manual']
    ?? 'diary';

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
    isRegistrationEntry: entry.is_registration_entry ?? false,
    photos: entry.photos ?? [],
    title: entry.entry_type !== 'manual' ? entry.content : undefined,
    detail: entry.entry_type !== 'manual' ? entry.narration ?? undefined : undefined,
    score: entry.mood_score ?? undefined,
    videoUrl: entry.video_url ?? null,
    videoDuration: entry.video_duration ?? null,
    videoAnalysis: entry.video_analysis ?? null,
    audioUrl: entry.audio_url ?? null,
    audioDuration: entry.audio_duration ?? null,
    petAudioAnalysis: entry.pet_audio_analysis ?? null,
  };
}

export function filterMatchesType(filter: FilterId, type: TimelineEventType): boolean {
  if (filter === 'all') return true;
  if (filter === 'moments') return type === 'diary' || type === 'photo_analysis';
  if (filter === 'ai') return type === 'audio_analysis' || type === 'video_analysis';
  if (filter === 'milestones') return type === 'milestone' || type === 'connection';
  if (filter === 'capsules') return type === 'capsule';
  return true;
}
