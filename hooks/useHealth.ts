import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import * as api from '../lib/api';
import type { Vaccine } from '../types/database';

export function useVaccines(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['pets', petId, 'vaccines'],
    queryFn: () => api.fetchVaccines(petId),
    enabled: isAuthenticated && !!petId,
  });

  const addMutation = useMutation({
    mutationFn: (vaccine: Omit<Vaccine, 'id' | 'created_at' | 'is_active'>) =>
      api.createVaccine(vaccine),
    onSuccess: (newVaccine) => {
      qc.setQueryData<Vaccine[]>(['pets', petId, 'vaccines'], (old) =>
        old ? [newVaccine, ...old] : [newVaccine],
      );
    },
  });

  const vaccines = query.data ?? [];
  const overdueCount = vaccines.filter(
    (v) => v.next_due_date && new Date(v.next_due_date) < new Date(),
  ).length;
  const upcomingCount = vaccines.filter((v) => {
    if (!v.next_due_date) return false;
    const due = new Date(v.next_due_date);
    const now = new Date();
    const inWeek = new Date(now.getTime() + 7 * 86_400_000);
    return due >= now && due <= inWeek;
  }).length;

  return {
    vaccines,
    overdueCount,
    upcomingCount,
    isLoading: query.isLoading,
    refetch: query.refetch,
    addVaccine: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}

export function useAllergies(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['pets', petId, 'allergies'],
    queryFn: () => api.fetchAllergies(petId),
    enabled: isAuthenticated && !!petId,
  });

  return {
    allergies: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useMoodLogs(petId: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const query = useQuery({
    queryKey: ['pets', petId, 'moods'],
    queryFn: () => api.fetchMoodLogs(petId),
    enabled: isAuthenticated && !!petId,
  });

  return {
    moodLogs: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
