/**
 * Tests for lib/translationCache — async i18n cache with version invalidation.
 * AsyncStorage and supabase.functions are mocked; normalizeLanguage is pure and
 * tested in achievements.test.ts alongside other pure lib exports.
 */

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStore.set(key, value); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { mockStore.delete(key); return Promise.resolve(); }),
  clear: jest.fn(() => { mockStore.clear(); return Promise.resolve(); }),
}));

const mockInvoke = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCachedTranslation,
  setCachedTranslation,
  getTranslation,
} from '../../lib/translationCache';

const CACHE_PREFIX = 'auexpert_i18n_';
const CACHE_VERSION_KEY = 'auexpert_i18n_version';
const CURRENT_VERSION = '1';

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockStore.clear();
  jest.resetAllMocks();
  // Re-wire after resetAllMocks
  (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
    Promise.resolve(mockStore.get(key) ?? null));
  (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
    mockStore.set(key, value); return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
    mockStore.delete(key); return Promise.resolve();
  });
  (AsyncStorage.clear as jest.Mock).mockImplementation(() => { mockStore.clear(); return Promise.resolve(); });
});

// ── getCachedTranslation ──────────────────────────────────────────────────────

describe('getCachedTranslation', () => {
  it('returns null when cache is empty', async () => {
    expect(await getCachedTranslation('en')).toBeNull();
  });

  it('returns null when version does not match', async () => {
    mockStore.set(CACHE_VERSION_KEY, '0'); // old version
    mockStore.set(CACHE_PREFIX + 'en', JSON.stringify({ key: 'value' }));

    expect(await getCachedTranslation('en')).toBeNull();
  });

  it('returns null when version matches but entry is missing', async () => {
    mockStore.set(CACHE_VERSION_KEY, CURRENT_VERSION);
    // No entry for 'fr'

    expect(await getCachedTranslation('fr')).toBeNull();
  });

  it('returns translations when version matches and entry exists', async () => {
    const translations = { common: { cancel: 'Cancel' } };
    mockStore.set(CACHE_VERSION_KEY, CURRENT_VERSION);
    mockStore.set(CACHE_PREFIX + 'en', JSON.stringify(translations));

    const result = await getCachedTranslation('en');
    expect(result).toEqual(translations);
  });

  it('returns null when storage contains invalid JSON', async () => {
    mockStore.set(CACHE_VERSION_KEY, CURRENT_VERSION);
    mockStore.set(CACHE_PREFIX + 'en', '{broken-json');

    expect(await getCachedTranslation('en')).toBeNull();
  });
});

// ── setCachedTranslation ──────────────────────────────────────────────────────

describe('setCachedTranslation', () => {
  it('writes translations and version to AsyncStorage', async () => {
    const translations = { common: { save: 'Salvar' } };
    await setCachedTranslation('es', translations);

    const stored = JSON.parse(mockStore.get(CACHE_PREFIX + 'es')!);
    expect(stored).toEqual(translations);
    expect(mockStore.get(CACHE_VERSION_KEY)).toBe(CURRENT_VERSION);
  });

  it('overwrites an existing cache entry', async () => {
    await setCachedTranslation('es', { old: true });
    await setCachedTranslation('es', { new: true });

    const stored = JSON.parse(mockStore.get(CACHE_PREFIX + 'es')!);
    expect(stored).toEqual({ new: true });
  });

  it('does not throw when AsyncStorage.setItem fails', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('storage full'));
    await expect(setCachedTranslation('es', {})).resolves.toBeUndefined();
  });
});

// ── getTranslation ────────────────────────────────────────────────────────────

describe('getTranslation', () => {
  it('returns cached value without calling the Edge Function', async () => {
    const translations = { key: 'value' };
    mockStore.set(CACHE_VERSION_KEY, CURRENT_VERSION);
    mockStore.set(CACHE_PREFIX + 'es', JSON.stringify(translations));

    const result = await getTranslation('es');

    expect(result).toEqual(translations);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('calls Edge Function when cache misses', async () => {
    const translations = { common: { cancel: 'Cancelar' } };
    mockInvoke.mockResolvedValue({ data: { translations }, error: null });

    const result = await getTranslation('es');

    expect(mockInvoke).toHaveBeenCalledWith('translate-strings', expect.objectContaining({
      body: expect.objectContaining({ targetLanguage: 'es' }),
    }));
    expect(result).toEqual(translations);
  });

  it('saves fetched translations to cache so next call is served from cache', async () => {
    const translations = { key: 'val' };
    mockInvoke.mockResolvedValue({ data: { translations }, error: null });

    await getTranslation('fr');

    // Reset invoke mock — next call should NOT invoke
    jest.resetAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(mockStore.get(key) ?? null));

    const result = await getTranslation('fr');
    expect(result).toEqual(translations);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('returns null when Edge Function returns an error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'timeout' } });

    const result = await getTranslation('ar');

    expect(result).toBeNull();
  });

  it('returns null when Edge Function returns no translations', async () => {
    mockInvoke.mockResolvedValue({ data: { translations: null }, error: null });

    const result = await getTranslation('ar');

    expect(result).toBeNull();
  });

  it('returns null when invoke throws', async () => {
    mockInvoke.mockRejectedValue(new Error('network'));

    const result = await getTranslation('zh');

    expect(result).toBeNull();
  });
});
