/**
 * Tests for timelineTypes — pure functions and constants.
 * Sprint 1.4: validates diary entry conversion and filter logic.
 */

import {
  diaryEntryToEvent,
  filterMatchesType,
  FILTER_TABS,
  EVENT_TYPE_CONFIG,
} from '../../components/diary/timelineTypes';
import type { DiaryEntry } from '../../types/database';

// ── Factory ──

function makeDiaryEntry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 'entry-1',
    pet_id: 'pet-1',
    user_id: 'user-1',
    content: 'Rex brincou no parque',
    input_method: 'text',
    narration: 'Hoje o Rex brincou no parque com muita alegria.',
    mood_id: 'happy',
    mood_score: 85,
    mood_source: 'manual',
    entry_type: 'manual',
    tags: ['parque', 'brincadeira'],
    photos: [],
    is_special: false,
    linked_photo_analysis_id: null,
    entry_date: '2026-03-30',
    is_active: true,
    created_at: '2026-03-30T14:00:00Z',
    updated_at: '2026-03-30T14:00:00Z',
    ...overrides,
  };
}

// ── diaryEntryToEvent ──

describe('diaryEntryToEvent', () => {
  it('converts a manual diary entry to timeline event', () => {
    const entry = makeDiaryEntry();
    const event = diaryEntryToEvent(entry);

    expect(event.id).toBe('entry-1');
    expect(event.type).toBe('diary');
    expect(event.date).toBe('2026-03-30T14:00:00Z');
    expect(event.sortDate).toBe(new Date('2026-03-30T14:00:00Z').getTime());
    expect(event.moodId).toBe('happy');
    expect(event.content).toBe('Rex brincou no parque');
    expect(event.narration).toBe('Hoje o Rex brincou no parque com muita alegria.');
    expect(event.tags).toEqual(['parque', 'brincadeira']);
    expect(event.isSpecial).toBe(false);
    expect(event.photos).toEqual([]);
  });

  it('converts a photo_analysis entry correctly', () => {
    const entry = makeDiaryEntry({
      entry_type: 'photo_analysis',
      content: 'Rex no sofá',
      narration: 'Análise visual do Rex.',
    });
    const event = diaryEntryToEvent(entry);

    expect(event.type).toBe('photo_analysis');
    expect(event.title).toBe('Rex no sofá');
    expect(event.detail).toBe('Análise visual do Rex.');
  });

  it('converts a milestone entry', () => {
    const entry = makeDiaryEntry({ entry_type: 'milestone' });
    const event = diaryEntryToEvent(entry);
    expect(event.type).toBe('milestone');
  });

  it('converts a capsule entry', () => {
    const entry = makeDiaryEntry({ entry_type: 'capsule' as DiaryEntry['entry_type'] });
    const event = diaryEntryToEvent(entry);
    expect(event.type).toBe('capsule');
  });

  it('converts a connection entry', () => {
    const entry = makeDiaryEntry({ entry_type: 'connection' as DiaryEntry['entry_type'] });
    const event = diaryEntryToEvent(entry);
    expect(event.type).toBe('connection');
  });

  it('handles null/undefined fields safely', () => {
    const entry = makeDiaryEntry({
      mood_id: undefined as unknown as string,
      narration: null,
      tags: undefined as unknown as string[],
      photos: undefined as unknown as string[],
      is_special: undefined as unknown as boolean,
      mood_score: null,
    });
    const event = diaryEntryToEvent(entry);

    expect(event.moodId).toBeUndefined();
    expect(event.narration).toBeNull();
    expect(event.tags).toEqual([]);
    expect(event.photos).toEqual([]);
    expect(event.isSpecial).toBe(false);
    expect(event.score).toBeUndefined();
  });

  it('defaults unknown entry_type to diary', () => {
    const entry = makeDiaryEntry({ entry_type: 'unknown_type' as DiaryEntry['entry_type'] });
    const event = diaryEntryToEvent(entry);
    expect(event.type).toBe('diary');
  });

  it('marks special entries', () => {
    const entry = makeDiaryEntry({ is_special: true });
    const event = diaryEntryToEvent(entry);
    expect(event.isSpecial).toBe(true);
  });

  it('includes photos', () => {
    const entry = makeDiaryEntry({ photos: ['photo1.webp', 'photo2.webp'] });
    const event = diaryEntryToEvent(entry);
    expect(event.photos).toEqual(['photo1.webp', 'photo2.webp']);
  });
});

// ── filterMatchesType ──

describe('filterMatchesType', () => {
  it('all filter matches everything', () => {
    expect(filterMatchesType('all', 'diary')).toBe(true);
    expect(filterMatchesType('all', 'milestone')).toBe(true);
    expect(filterMatchesType('all', 'capsule')).toBe(true);
    expect(filterMatchesType('all', 'audio_analysis')).toBe(true);
    expect(filterMatchesType('all', 'month_summary')).toBe(true);
  });

  it('moments filter matches diary and photo_analysis', () => {
    expect(filterMatchesType('moments', 'diary')).toBe(true);
    expect(filterMatchesType('moments', 'photo_analysis')).toBe(true);
    expect(filterMatchesType('moments', 'milestone')).toBe(false);
    expect(filterMatchesType('moments', 'capsule')).toBe(false);
    expect(filterMatchesType('moments', 'audio_analysis')).toBe(false);
  });

  it('ai filter matches audio and video analysis', () => {
    expect(filterMatchesType('ai', 'audio_analysis')).toBe(true);
    expect(filterMatchesType('ai', 'video_analysis')).toBe(true);
    expect(filterMatchesType('ai', 'diary')).toBe(false);
    expect(filterMatchesType('ai', 'milestone')).toBe(false);
  });

  it('milestones filter matches milestone and connection', () => {
    expect(filterMatchesType('milestones', 'milestone')).toBe(true);
    expect(filterMatchesType('milestones', 'connection')).toBe(true);
    expect(filterMatchesType('milestones', 'diary')).toBe(false);
  });

  it('capsules filter matches only capsule', () => {
    expect(filterMatchesType('capsules', 'capsule')).toBe(true);
    expect(filterMatchesType('capsules', 'diary')).toBe(false);
    expect(filterMatchesType('capsules', 'milestone')).toBe(false);
  });
});

// ── Constants ──

describe('FILTER_TABS', () => {
  it('has 4 filter tabs', () => {
    expect(FILTER_TABS).toHaveLength(4);
  });

  it('each tab has id, labelKey, and icon', () => {
    FILTER_TABS.forEach((tab) => {
      expect(tab.id).toBeDefined();
      expect(tab.labelKey).toMatch(/^diary\./);
      expect(tab.icon).toBeDefined();
    });
  });
});

describe('EVENT_TYPE_CONFIG', () => {
  const expectedTypes = [
    'month_summary', 'diary', 'milestone', 'audio_analysis',
    'photo_analysis', 'video_analysis', 'capsule', 'connection',
  ];

  it('has config for all event types', () => {
    expectedTypes.forEach((type) => {
      expect(EVENT_TYPE_CONFIG[type as keyof typeof EVENT_TYPE_CONFIG]).toBeDefined();
    });
  });

  it('each config has color and icon', () => {
    Object.values(EVENT_TYPE_CONFIG).forEach((config) => {
      expect(config.color).toMatch(/^#/);
      expect(config.icon).toBeDefined();
    });
  });
});

// ── Regression: old entries still work (Sprint 1.4 Fluxo 4) ──

describe('regression: old diary entries', () => {
  it('entry without entry_type defaults to diary', () => {
    const entry = makeDiaryEntry({ entry_type: undefined as unknown as DiaryEntry['entry_type'] });
    const event = diaryEntryToEvent(entry);
    expect(event.type).toBe('diary');
  });

  it('vaccine entry_type maps to diary (no vaccine timeline type)', () => {
    const entry = makeDiaryEntry({ entry_type: 'vaccine' as DiaryEntry['entry_type'] });
    const event = diaryEntryToEvent(entry);
    // vaccine is not in the ENTRY_TYPE_TO_TIMELINE map, defaults to 'diary'
    expect(event.type).toBe('diary');
  });

  it('old entries with narration keep their narration', () => {
    const entry = makeDiaryEntry({
      narration: 'Fui brincar no parque e comi uma maçã!',
    });
    const event = diaryEntryToEvent(entry);
    expect(event.narration).toBe('Fui brincar no parque e comi uma maçã!');
  });

  it('entries without new fields still convert', () => {
    const oldEntry: DiaryEntry = {
      id: 'old-1',
      pet_id: 'pet-1',
      user_id: 'user-1',
      content: 'Passeio no parque',
      input_method: 'text',
      narration: null,
      mood_id: 'calm',
      mood_score: null,
      mood_source: 'manual',
      entry_type: 'manual',
      tags: [],
      photos: [],
      is_special: false,
      linked_photo_analysis_id: null,
      entry_date: '2026-01-15',
      is_active: true,
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
    };
    const event = diaryEntryToEvent(oldEntry);
    expect(event.type).toBe('diary');
    expect(event.content).toBe('Passeio no parque');
    expect(event.narration).toBeNull();
    expect(event.tags).toEqual([]);
  });
});
