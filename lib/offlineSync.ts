import { getQueue, removeFromQueue, updateQueueItem, addToFailedQueue, getFailedQueue, clearFailedQueue, addToQueue } from './offlineQueue';
import type { QueuedMutation } from './offlineQueue';
import * as api from './api';
import { queryClient } from './queryClient';

const MAX_RETRIES = 3;

export type SyncResult = {
  synced: number;
  failed: number;
  remaining: number;
  failedItems: Array<{ type: string; error: string }>;
};

/**
 * Processa a fila de mutacoes offline.
 * Chamado automaticamente quando a conexao e restabelecida.
 * Cada mutacao e executada na ordem (FIFO), com retry limitado.
 */
export async function processQueue(): Promise<SyncResult> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, remaining: 0, failedItems: [] };

  let synced = 0;
  let failed = 0;
  const failedItems: SyncResult['failedItems'] = [];
  const affectedPetIds = new Set<string>();

  for (const mutation of queue) {
    try {
      await executeMutation(mutation);
      await removeFromQueue(mutation.id);
      synced++;

      // Track affected pet for cache invalidation
      const petId = (mutation.payload.pet_id ?? mutation.payload.petId) as string | undefined;
      if (petId) affectedPetIds.add(petId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[offlineSync] Mutation failed:', mutation.type, errorMsg);

      if (mutation.retries >= MAX_RETRIES) {
        // Move to failed queue for manual retry later
        await addToFailedQueue(mutation, errorMsg);
        await removeFromQueue(mutation.id);
        failed++;
        failedItems.push({ type: mutation.type, error: errorMsg });
      } else {
        await updateQueueItem(mutation.id, { retries: mutation.retries + 1 });
      }
    }
  }

  // Invalidate all affected caches
  if (synced > 0) {
    await queryClient.invalidateQueries({ queryKey: ['pets'] });
    // Global consent cache (user-scoped, not pet-scoped)
    await queryClient.invalidateQueries({ queryKey: ['consent'] });

    for (const petId of affectedPetIds) {
      await queryClient.invalidateQueries({ queryKey: ['pet', petId] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'diary'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'vaccines'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'exams'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'medications'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'consultations'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'surgeries'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'allergies'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'scheduled_events'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'insights'] });
      await queryClient.invalidateQueries({ queryKey: ['pets', petId, 'deleted', 'diary'] });
      await queryClient.invalidateQueries({ queryKey: ['nutricao', petId] });
      await queryClient.invalidateQueries({ queryKey: ['cardapio', petId] });
      await queryClient.invalidateQueries({ queryKey: ['cardapio-history', petId] });
    }
  }

  const remaining = (await getQueue()).length;
  return { synced, failed, remaining, failedItems };
}

async function executeMutation(mutation: QueuedMutation): Promise<void> {
  const { type, payload } = mutation;

  switch (type) {
    // ── Pets ──
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

    // ── Diary ──
    case 'createDiaryEntry':
      await api.createDiaryEntry(payload as unknown as Parameters<typeof api.createDiaryEntry>[0]);
      break;

    case 'updateDiaryEntry': {
      const { id: entryId, ...updates } = payload as { id: string } & Record<string, unknown>;
      await api.updateDiaryEntry(entryId, updates);
      break;
    }

    case 'deleteDiaryEntry':
      await api.deleteDiaryEntry(payload.id as string);
      break;

    case 'restoreDiaryEntry':
      await api.restoreDiaryEntry(payload.id as string);
      break;

    // ── Mood ──
    case 'createMoodLog':
      await api.createMoodLog(payload as Parameters<typeof api.createMoodLog>[0]);
      break;

    // ── Health ──
    case 'createVaccine':
      await api.createVaccine(payload as Parameters<typeof api.createVaccine>[0]);
      break;

    case 'createExam':
      await api.createExam(payload as Record<string, unknown>);
      break;

    case 'createMedication':
      await api.createMedication(payload as Record<string, unknown>);
      break;

    case 'createConsultation':
      await api.createConsultation(payload as Record<string, unknown>);
      break;

    case 'createSurgery':
      await api.createSurgery(payload as Record<string, unknown>);
      break;

    case 'createAllergy':
      await api.createAllergy(payload as Parameters<typeof api.createAllergy>[0]);
      break;

    // ── Scheduled Events ──
    case 'createScheduledEvent':
      await api.createScheduledEvent(payload);
      break;

    case 'updateScheduledEvent': {
      const { id: evId, ...updates } = payload as { id: string } & Record<string, unknown>;
      await api.updateScheduledEvent(evId, updates);
      break;
    }

    // ── Nutrition ──
    case 'upsertNutritionProfile':
      await api.upsertNutritionProfile(
        payload as Parameters<typeof api.upsertNutritionProfile>[0],
      );
      break;

    case 'createNutritionRecord':
      await api.createNutritionRecord(payload);
      break;

    case 'deleteNutritionRecord': {
      const { id: recId, petId: recPetId } = payload as { id: string; petId: string };
      await api.deleteNutritionRecord(recId, recPetId);
      break;
    }

    // ── Consent (user-scoped) ──
    case 'upsertUserConsent':
      await api.upsertUserConsent(
        payload as Parameters<typeof api.upsertUserConsent>[0],
      );
      break;

    // ── Insights ──
    case 'markInsightRead':
      await api.markInsightRead(payload.id as string);
      break;

    case 'dismissInsight':
      await api.dismissInsight(payload.id as string);
      break;

    default:
      console.warn('[offlineSync] Unknown mutation type:', type);
  }
}

/**
 * Move all failed mutations back to the main queue with retries reset.
 * Call this when the tutor taps "Retry failed" manually.
 */
export async function retryFailed(): Promise<number> {
  const failed = await getFailedQueue();
  if (failed.length === 0) return 0;

  for (const item of failed) {
    await addToQueue({ type: item.type, payload: item.payload });
  }
  await clearFailedQueue();

  // Process immediately
  const result = await processQueue();
  return result.synced;
}
