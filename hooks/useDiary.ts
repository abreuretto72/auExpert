import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import * as api from '../lib/api';
import { addToQueue } from '../lib/offlineQueue';
import type { DiaryEntry } from '../types/database';

export function useDiary(petId: string) {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryKey = ['pets', petId, 'diary'] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => api.fetchDiaryEntries(petId),
    enabled: isAuthenticated && !!petId,
  });

  const addMutation = useMutation({
    mutationFn: async (entry: Omit<DiaryEntry, 'id' | 'created_at' | 'is_active'>) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({ type: 'createDiaryEntry', payload: entry as Record<string, unknown> });
        return {
          ...entry,
          id: `temp-${Date.now()}`,
          is_active: true,
          created_at: new Date().toISOString(),
        } as DiaryEntry;
      }
      return api.createDiaryEntry(entry);
    },
    onSuccess: (newEntry) => {
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
        old ? [newEntry, ...old] : [newEntry],
      );
    },
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    addEntry: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
