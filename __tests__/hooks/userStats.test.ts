/**
 * Tests for hooks/useUserStats helpers (getCurrentYearMonth, getLastNMonths).
 *
 * Pure functions — no rede, no Supabase, no React. Mockamos `lib/supabase`
 * pra evitar `createClient` rodar no import top-level com env vazia em test
 * environment.
 */

// Mockear o supabase ANTES do import do useUserStats — top-level createClient
// no lib/supabase.ts explode com "supabaseUrl is required" em jest-expo/node.
jest.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import { getCurrentYearMonth, getLastNMonths } from '../../hooks/useUserStats';

describe('getCurrentYearMonth', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns year and month (1-12) of current device date', () => {
    jest.setSystemTime(new Date('2026-04-24T15:30:00Z'));
    expect(getCurrentYearMonth()).toEqual({ year: 2026, month: 4 });
  });

  it('handles January correctly (month=1, not 0)', () => {
    jest.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    expect(getCurrentYearMonth()).toEqual({ year: 2026, month: 1 });
  });

  it('handles December correctly (month=12)', () => {
    jest.setSystemTime(new Date('2026-12-31T23:59:59Z'));
    expect(getCurrentYearMonth()).toEqual({ year: 2026, month: 12 });
  });
});

describe('getLastNMonths', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-24T15:30:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns N months including the current one as first item', () => {
    const result = getLastNMonths(3, 'pt-BR');
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(expect.objectContaining({ year: 2026, month: 4 }));
    expect(result[1]).toEqual(expect.objectContaining({ year: 2026, month: 3 }));
    expect(result[2]).toEqual(expect.objectContaining({ year: 2026, month: 2 }));
  });

  it('crosses year boundary correctly (Feb 2026 backwards into Dec 2025)', () => {
    jest.setSystemTime(new Date('2026-02-15T12:00:00Z'));
    const result = getLastNMonths(3, 'pt-BR');
    expect(result[0]).toEqual(expect.objectContaining({ year: 2026, month: 2 }));
    expect(result[1]).toEqual(expect.objectContaining({ year: 2026, month: 1 }));
    expect(result[2]).toEqual(expect.objectContaining({ year: 2025, month: 12 }));
  });

  it('produces capitalized labels for pt-BR (uppercase first letter)', () => {
    const result = getLastNMonths(2, 'pt-BR');
    expect(result[0].label[0]).toBe(result[0].label[0].toUpperCase());
    expect(result[0].label).toMatch(/2026/);
  });

  it('respects English locale labels', () => {
    const result = getLastNMonths(1, 'en-US');
    expect(result[0].label).toMatch(/2026/);
    expect(result[0].label[0]).toBe(result[0].label[0].toUpperCase());
  });

  it('default n=12 returns 12 entries', () => {
    // ts-expect-error — passing undefined intentionally to test the default
    const result = getLastNMonths(undefined as unknown as number, 'pt-BR');
    expect(result).toHaveLength(12);
  });

  it('handles n=1 (only current month)', () => {
    const result = getLastNMonths(1, 'pt-BR');
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2026);
    expect(result[0].month).toBe(4);
  });
});
