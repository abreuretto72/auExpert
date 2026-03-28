import { getQueue, removeFromQueue, updateQueueItem } from './offlineQueue';
import type { QueuedMutation } from './offlineQueue';
import * as api from './api';
import { queryClient } from './queryClient';

const MAX_RETRIES = 3;

type SyncResult = {
  synced: number;
  failed: number;
  remaining: number;
};

/**
 * Processa a fila de mutacoes offline.
 * Chamado automaticamente quando a conexao e restabelecida.
 * Cada mutacao e executada na ordem, com retry limitado.
 */
export async function processQueue(): Promise<SyncResult> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0 };

  let synced = 0;
  let failed = 0;

  for (const mutation of queue) {
    try {
      await executeMutation(mutation);
      await removeFromQueue(mutation.id);
      synced++;
    } catch {
      if (mutation.retries >= MAX_RETRIES) {
        // Desiste apos MAX_RETRIES — remove da fila
        await removeFromQueue(mutation.id);
        failed++;
      } else {
        await updateQueueItem(mutation.id, { retries: mutation.retries + 1 });
      }
    }
  }

  // Invalidar caches relevantes para refletir dados sincronizados
  if (synced > 0) {
    await queryClient.invalidateQueries({ queryKey: ['pets'] });
  }

  const remaining = (await getQueue()).length;
  return { synced, failed, remaining };
}

async function executeMutation(mutation: QueuedMutation): Promise<void> {
  const { type, payload } = mutation;

  switch (type) {
    case 'createPet':
      await api.createPet(payload as Parameters<typeof api.createPet>[0]);
      break;

    case 'updatePet': {
      const { id, updates } = payload as { id: string; updates: Record<string, unknown> };
      await api.updatePet(id, updates);
      break;
    }

    case 'deletePet':
      await api.deletePet(payload.id as string);
      break;

    case 'createDiaryEntry':
      await api.createDiaryEntry(payload as Parameters<typeof api.createDiaryEntry>[0]);
      break;

    default:
      throw new Error(`Tipo de mutacao desconhecido: ${type}`);
  }
}
