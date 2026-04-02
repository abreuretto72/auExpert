/**
 * Tests for lib/achievements — XP level table and catalog evaluate functions.
 * All tested functions are pure (no Supabase calls).
 * checkAndAwardAchievements() is intentionally excluded — it requires a DB connection.
 */

// Supabase is imported at module level in achievements.ts — mock it so the module loads
jest.mock('../../lib/supabase', () => ({ supabase: {} }));

import {
  xpForLevel,
  xpForNextLevel,
  ACHIEVEMENT_CATALOG,
  type PetStats,
} from '../../lib/achievements';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Baseline stats — all zeros/false. Override per test. */
function makeStats(overrides: Partial<PetStats> = {}): PetStats {
  return {
    diary_count: 0,
    photo_count: 0,
    voice_count: 0,
    video_count: 0,
    pdf_count: 0,
    ocr_count: 0,
    friends_count: 0,
    max_friend_meets: 0,
    expense_count: 0,
    invoice_ocr_count: 0,
    vaccine_count: 0,
    exam_count: 0,
    weight_count: 0,
    travel_count: 0,
    streak: 0,
    diary_age_months: 0,
    xp_total: 0,
    level: 1,
    plan_roi: 0,
    used_text: false,
    used_voice: false,
    used_photo: false,
    used_video: false,
    used_gallery: false,
    used_scanner: false,
    used_document: false,
    used_listen: false,
    ...overrides,
  };
}

function findAchievement(key: string) {
  const a = ACHIEVEMENT_CATALOG.find((a) => a.key === key);
  if (!a) throw new Error(`Achievement not found: ${key}`);
  return a;
}

// ── xpForLevel ────────────────────────────────────────────────────────────────

describe('xpForLevel', () => {
  it('level 1 requires 0 XP', () => expect(xpForLevel(1)).toBe(0));
  it('level 2 requires 80 XP', () => expect(xpForLevel(2)).toBe(80));
  it('level 5 requires 700 XP', () => expect(xpForLevel(5)).toBe(700));
  it('level 10 requires 5000 XP', () => expect(xpForLevel(10)).toBe(5000));
  it('level beyond table clamps to last threshold (5000)', () => {
    expect(xpForLevel(99)).toBe(5000);
  });
  it('never returns negative', () => {
    expect(xpForLevel(0)).toBeGreaterThanOrEqual(0);
  });
});

// ── xpForNextLevel ────────────────────────────────────────────────────────────

describe('xpForNextLevel', () => {
  it('next after level 1 is 80', () => expect(xpForNextLevel(1)).toBe(80));
  it('next after level 9 is 5000', () => expect(xpForNextLevel(9)).toBe(5000));
  it('clamps to 5000 for levels beyond table', () => {
    expect(xpForNextLevel(99)).toBe(5000);
  });
  it('xpForNextLevel(n) > xpForLevel(n) for all valid levels 1-9', () => {
    for (let n = 1; n <= 9; n++) {
      expect(xpForNextLevel(n)).toBeGreaterThan(xpForLevel(n));
    }
  });
});

// ── catalog sanity ────────────────────────────────────────────────────────────

describe('ACHIEVEMENT_CATALOG', () => {
  it('has at least 20 achievements', () => {
    expect(ACHIEVEMENT_CATALOG.length).toBeGreaterThanOrEqual(20);
  });

  it('every achievement has unique key', () => {
    const keys = ACHIEVEMENT_CATALOG.map((a) => a.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('every achievement has positive xp', () => {
    ACHIEVEMENT_CATALOG.forEach((a) => {
      expect(a.xp).toBeGreaterThan(0);
    });
  });

  it('every achievement has an evaluate function', () => {
    ACHIEVEMENT_CATALOG.forEach((a) => {
      expect(typeof a.evaluate).toBe('function');
    });
  });
});

// ── evaluate — diary achievements ─────────────────────────────────────────────

describe('evaluate — diary', () => {
  it('first_entry: true when diary_count >= 1', () => {
    const a = findAchievement('first_entry');
    expect(a.evaluate(makeStats({ diary_count: 0 }))).toBe(false);
    expect(a.evaluate(makeStats({ diary_count: 1 }))).toBe(true);
    expect(a.evaluate(makeStats({ diary_count: 99 }))).toBe(true);
  });

  it('diary_10: true when diary_count >= 10', () => {
    const a = findAchievement('diary_10');
    expect(a.evaluate(makeStats({ diary_count: 9 }))).toBe(false);
    expect(a.evaluate(makeStats({ diary_count: 10 }))).toBe(true);
  });

  it('diary_50: true when diary_count >= 50', () => {
    const a = findAchievement('diary_50');
    expect(a.evaluate(makeStats({ diary_count: 49 }))).toBe(false);
    expect(a.evaluate(makeStats({ diary_count: 50 }))).toBe(true);
  });

  it('diary_100: true when diary_count >= 100', () => {
    const a = findAchievement('diary_100');
    expect(a.evaluate(makeStats({ diary_count: 100 }))).toBe(true);
  });

  it('diary_365: requires 365 entries', () => {
    const a = findAchievement('diary_365');
    expect(a.evaluate(makeStats({ diary_count: 364 }))).toBe(false);
    expect(a.evaluate(makeStats({ diary_count: 365 }))).toBe(true);
  });

  it('first_photo: true when photo_count >= 1', () => {
    const a = findAchievement('first_photo');
    expect(a.evaluate(makeStats({ photo_count: 0 }))).toBe(false);
    expect(a.evaluate(makeStats({ photo_count: 1 }))).toBe(true);
  });

  it('photo_50: counts photo_count + ocr_count combined', () => {
    const a = findAchievement('photo_50');
    expect(a.evaluate(makeStats({ photo_count: 30, ocr_count: 19 }))).toBe(false);
    expect(a.evaluate(makeStats({ photo_count: 30, ocr_count: 20 }))).toBe(true);
  });

  it('first_voice: true when voice_count >= 1', () => {
    const a = findAchievement('first_voice');
    expect(a.evaluate(makeStats({ voice_count: 1 }))).toBe(true);
  });

  it('first_video: true when video_count >= 1', () => {
    const a = findAchievement('first_video');
    expect(a.evaluate(makeStats({ video_count: 1 }))).toBe(true);
  });

  it('all_input_types: requires ALL 8 input type flags', () => {
    const a = findAchievement('all_input_types');
    // Missing just one flag → false
    expect(a.evaluate(makeStats({
      used_text: true, used_voice: true, used_photo: true, used_video: true,
      used_gallery: true, used_scanner: true, used_document: true, used_listen: false,
    }))).toBe(false);
    // All set → true
    expect(a.evaluate(makeStats({
      used_text: true, used_voice: true, used_photo: true, used_video: true,
      used_gallery: true, used_scanner: true, used_document: true, used_listen: true,
    }))).toBe(true);
  });

  it('streak_7: true when streak >= 7', () => {
    const a = findAchievement('streak_7');
    expect(a.evaluate(makeStats({ streak: 6 }))).toBe(false);
    expect(a.evaluate(makeStats({ streak: 7 }))).toBe(true);
  });

  it('streak_30: requires 30 consecutive days', () => {
    const a = findAchievement('streak_30');
    expect(a.evaluate(makeStats({ streak: 29 }))).toBe(false);
    expect(a.evaluate(makeStats({ streak: 30 }))).toBe(true);
  });
});

// ── evaluate — health achievements ────────────────────────────────────────────

describe('evaluate — health', () => {
  it('first_vaccine_scan: requires ocr_count >= 1 AND vaccine_count >= 1', () => {
    const a = findAchievement('first_vaccine_scan');
    expect(a.evaluate(makeStats({ ocr_count: 1, vaccine_count: 0 }))).toBe(false);
    expect(a.evaluate(makeStats({ ocr_count: 0, vaccine_count: 1 }))).toBe(false);
    expect(a.evaluate(makeStats({ ocr_count: 1, vaccine_count: 1 }))).toBe(true);
  });

  it('first_exam_import: true when exam_count >= 1', () => {
    const a = findAchievement('first_exam_import');
    expect(a.evaluate(makeStats({ exam_count: 0 }))).toBe(false);
    expect(a.evaluate(makeStats({ exam_count: 1 }))).toBe(true);
  });

  it('first_weight: true when weight_count >= 1', () => {
    const a = findAchievement('first_weight');
    expect(a.evaluate(makeStats({ weight_count: 1 }))).toBe(true);
  });
});

// ── translationCache — normalizeLanguage (pure) ───────────────────────────────

jest.mock('../../lib/supabase', () => ({ supabase: {} }));

import { normalizeLanguage } from '../../lib/translationCache';

describe('normalizeLanguage', () => {
  it('keeps pt-BR as is', () => expect(normalizeLanguage('pt-BR')).toBe('pt-BR'));
  it('keeps pt as pt-BR', () => expect(normalizeLanguage('pt')).toBe('pt-BR'));
  it('strips region from en-US → en', () => expect(normalizeLanguage('en-US')).toBe('en'));
  it('strips region from es-MX → es', () => expect(normalizeLanguage('es-MX')).toBe('es'));
  it('strips region from fr-FR → fr', () => expect(normalizeLanguage('fr-FR')).toBe('fr'));
  it('returns base code for ja-JP → ja', () => expect(normalizeLanguage('ja-JP')).toBe('ja'));
  it('passes through bare codes unchanged', () => expect(normalizeLanguage('de')).toBe('de'));
});
