/**
 * Tests for lib/offlineQueue — AsyncStorage-backed mutation queue.
 * Uses the jest mock from __mocks__/@react-native-async-storage/async-storage.js
 * so no real storage is touched.
 */

// In-memory AsyncStorage mock — avoids window/jsdom requirement in Node env
// Variable must be prefixed with "mock" to satisfy Jest factory scope rules
const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) => { mockStore.set(key, value); return Promise.resolve(); }),
  removeItem: jest.fn((key: string) => { mockStore.delete(key); return Promise.resolve(); }),
  clear: jest.fn(() => { mockStore.clear(); return Promise.resolve(); }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {
  getQueue,
  addToQueue,
  removeFromQueue,
  updateQueueItem,
  clearQueue,
  getQueueSize,
  getFailedQueue,
  addToFailedQueue,
  clearFailedQueue,
  getFailedQueueSize,
  checkConnection,
  type QueuedMutation,
} from '../../lib/offlineQueue';

const QUEUE_KEY = '@auexpert/offline-queue';
const FAILED_KEY = '@auexpert/failed-queue';

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;

// ── helpers ──────────────────────────────────────────────────────────────────

async function seedQueue(count: number): Promise<QueuedMutation[]> {
  const entries: QueuedMutation[] = [];
  for (let i = 0; i < count; i++) {
    const entry = await addToQueue({ type: 'createPet', payload: { name: `Pet ${i}` } });
    entries.push(entry);
  }
  return entries;
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
  // Re-wire mocks after clearAllMocks (they lost their implementations)
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

// ── getQueue ──────────────────────────────────────────────────────────────────

describe('getQueue', () => {
  it('returns empty array when storage is empty', async () => {
    expect(await getQueue()).toEqual([]);
  });

  it('returns stored queue items', async () => {
    const entry = await addToQueue({ type: 'createPet', payload: { name: 'Rex' } });
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(entry.id);
  });

  it('returns empty array when storage contains invalid JSON', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, 'not-json{{');
    expect(await getQueue()).toEqual([]);
  });
});

// ── addToQueue ────────────────────────────────────────────────────────────────

describe('addToQueue', () => {
  it('returns entry with generated id, createdAt, retries=0', async () => {
    const entry = await addToQueue({ type: 'createDiaryEntry', payload: { text: 'hello' } });
    expect(entry.id).toBeTruthy();
    expect(entry.retries).toBe(0);
    expect(entry.createdAt).toBeTruthy();
    expect(new Date(entry.createdAt).getTime()).not.toBeNaN();
  });

  it('persists entry to AsyncStorage', async () => {
    await addToQueue({ type: 'createPet', payload: { name: 'Luna' } });
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    expect(JSON.parse(raw!)).toHaveLength(1);
  });

  it('appends to existing queue (FIFO order preserved)', async () => {
    const [a, b, c] = await seedQueue(3);
    const queue = await getQueue();
    expect(queue.map((m) => m.id)).toEqual([a.id, b.id, c.id]);
  });

  it('each entry gets a unique id', async () => {
    const [a, b] = await seedQueue(2);
    expect(a.id).not.toBe(b.id);
  });
});

// ── removeFromQueue ───────────────────────────────────────────────────────────

describe('removeFromQueue', () => {
  it('removes the entry with matching id', async () => {
    const [a, b] = await seedQueue(2);
    await removeFromQueue(a.id);
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(b.id);
  });

  it('is a no-op for non-existent id', async () => {
    await seedQueue(2);
    await removeFromQueue('does-not-exist');
    expect(await getQueueSize()).toBe(2);
  });

  it('results in empty queue when last item is removed', async () => {
    const [entry] = await seedQueue(1);
    await removeFromQueue(entry.id);
    expect(await getQueue()).toEqual([]);
  });
});

// ── updateQueueItem ───────────────────────────────────────────────────────────

describe('updateQueueItem', () => {
  it('updates retries for matching id', async () => {
    const [entry] = await seedQueue(1);
    await updateQueueItem(entry.id, { retries: 2 });
    const [updated] = await getQueue();
    expect(updated.retries).toBe(2);
  });

  it('does not mutate other items', async () => {
    const [a, b] = await seedQueue(2);
    await updateQueueItem(a.id, { retries: 3 });
    const queue = await getQueue();
    expect(queue.find((m) => m.id === b.id)!.retries).toBe(0);
  });

  it('is a no-op for non-existent id', async () => {
    const [entry] = await seedQueue(1);
    await updateQueueItem('ghost', { retries: 99 });
    const [unchanged] = await getQueue();
    expect(unchanged.retries).toBe(entry.retries);
  });
});

// ── clearQueue ────────────────────────────────────────────────────────────────

describe('clearQueue', () => {
  it('removes all items', async () => {
    await seedQueue(3);
    await clearQueue();
    expect(await getQueue()).toEqual([]);
  });

  it('is safe to call on an already-empty queue', async () => {
    await clearQueue();
    expect(await getQueue()).toEqual([]);
  });

  it('clears only the main queue key, not the failed queue', async () => {
    const [entry] = await seedQueue(1);
    await addToFailedQueue(entry, 'server error');
    await clearQueue();
    expect(await getFailedQueueSize()).toBe(1);
  });
});

// ── getQueueSize ──────────────────────────────────────────────────────────────

describe('getQueueSize', () => {
  it('returns 0 for empty queue', async () => {
    expect(await getQueueSize()).toBe(0);
  });

  it('returns correct count after additions', async () => {
    await seedQueue(4);
    expect(await getQueueSize()).toBe(4);
  });

  it('decrements after removal', async () => {
    const [a] = await seedQueue(3);
    await removeFromQueue(a.id);
    expect(await getQueueSize()).toBe(2);
  });
});

// ── failed queue ──────────────────────────────────────────────────────────────

describe('failed queue', () => {
  it('starts empty', async () => {
    expect(await getFailedQueue()).toEqual([]);
  });

  it('addToFailedQueue persists entry with error and failedAt', async () => {
    const [entry] = await seedQueue(1);
    await addToFailedQueue(entry, 'timeout');
    const failed = await getFailedQueue();
    expect(failed).toHaveLength(1);
    expect(failed[0].error).toBe('timeout');
    expect(failed[0].failedAt).toBeTruthy();
  });

  it('getFailedQueueSize returns correct count', async () => {
    const entries = await seedQueue(2);
    await addToFailedQueue(entries[0], 'err1');
    await addToFailedQueue(entries[1], 'err2');
    expect(await getFailedQueueSize()).toBe(2);
  });

  it('clearFailedQueue empties failed queue only', async () => {
    const [entry] = await seedQueue(1);
    await addToFailedQueue(entry, 'err');
    await clearFailedQueue();
    expect(await getFailedQueueSize()).toBe(0);
    expect(await getQueueSize()).toBe(1);
  });

  it('returns empty array when storage contains invalid JSON', async () => {
    await AsyncStorage.setItem(FAILED_KEY, '{broken');
    expect(await getFailedQueue()).toEqual([]);
  });
});

// ── checkConnection ───────────────────────────────────────────────────────────

describe('checkConnection', () => {
  it('returns true when connected and internet reachable', async () => {
    mockNetInfo.fetch.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: true,
    } as never);
    expect(await checkConnection()).toBe(true);
  });

  it('returns false when not connected', async () => {
    mockNetInfo.fetch.mockResolvedValueOnce({
      isConnected: false,
      isInternetReachable: false,
    } as never);
    expect(await checkConnection()).toBe(false);
  });

  it('returns false when connected but internet not reachable', async () => {
    mockNetInfo.fetch.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: false,
    } as never);
    expect(await checkConnection()).toBe(false);
  });

  it('returns true when isInternetReachable is null (unknown)', async () => {
    mockNetInfo.fetch.mockResolvedValueOnce({
      isConnected: true,
      isInternetReachable: null,
    } as never);
    expect(await checkConnection()).toBe(true);
  });
});
