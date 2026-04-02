import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const QUEUE_KEY = '@auexpert/offline-queue';
const FAILED_KEY = '@auexpert/failed-queue';

export interface QueuedMutation {
  id: string;
  type:
    | 'createPet' | 'updatePet' | 'deletePet'
    | 'createDiaryEntry' | 'updateDiaryEntry' | 'deleteDiaryEntry'
    | 'createMoodLog'
    | 'createVaccine' | 'createExam' | 'createMedication'
    | 'createConsultation' | 'createSurgery' | 'createAllergy'
    | 'createScheduledEvent' | 'updateScheduledEvent';
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
}

/**
 * Fila de mutacoes offline.
 * Quando o tutor faz uma acao sem internet (adicionar pet, salvar diario),
 * a operacao e salva localmente e sincronizada quando a conexao voltar.
 */

export async function getQueue(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToQueue(mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'retries'>) {
  const queue = await getQueue();
  const entry: QueuedMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return entry;
}

export async function removeFromQueue(id: string) {
  const queue = await getQueue();
  const filtered = queue.filter((m) => m.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function updateQueueItem(id: string, updates: Partial<QueuedMutation>) {
  const queue = await getQueue();
  const updated = queue.map((m) =>
    m.id === id ? { ...m, ...updates } : m,
  );
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

/**
 * Verifica se tem conexao boa antes de operacao critica.
 * Retorna true se online, false se offline.
 */
export async function checkConnection(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable !== false);
}

// ── Failed queue (mutations that exceeded MAX_RETRIES) ──

export interface FailedMutation extends QueuedMutation {
  error: string;
  failedAt: string;
}

export async function getFailedQueue(): Promise<FailedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(FAILED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addToFailedQueue(mutation: QueuedMutation, error: string) {
  const queue = await getFailedQueue();
  const entry: FailedMutation = { ...mutation, error, failedAt: new Date().toISOString() };
  queue.push(entry);
  await AsyncStorage.setItem(FAILED_KEY, JSON.stringify(queue));
}

export async function clearFailedQueue() {
  await AsyncStorage.removeItem(FAILED_KEY);
}

export async function getFailedQueueSize(): Promise<number> {
  const queue = await getFailedQueue();
  return queue.length;
}
