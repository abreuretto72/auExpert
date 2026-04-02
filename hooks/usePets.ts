import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { usePetStore } from '../stores/petStore';
import { useAuthStore } from '../stores/authStore';
import * as api from '../lib/api';
import { addToQueue } from '../lib/offlineQueue';
import type { Pet } from '../types/database';

const PETS_KEY = ['pets'] as const;

export function usePets() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { selectedPetId, selectPet } = usePetStore();

  const query = useQuery({
    queryKey: PETS_KEY,
    queryFn: api.fetchPets,
    enabled: isAuthenticated,
    refetchOnMount: 'always',
  });

  const addMutation = useMutation({
    mutationFn: async (pet: Omit<Pet, 'id' | 'created_at' | 'updated_at' | 'is_active'>) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({ type: 'createPet', payload: pet as Record<string, unknown> });
        const tempPet: Pet = {
          ...pet,
          id: `temp-${Date.now()}`,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Pet;
        return tempPet;
      }
      const result = await api.createPet(pet);
      return result;
    },
    onSuccess: (newPet) => {
      qc.setQueryData<Pet[]>(PETS_KEY, (old) =>
        old ? [newPet, ...old] : [newPet],
      );
    },
    onError: (err) => {
      console.error('[usePets] addMutation ERRO:', err instanceof Error ? err.message : err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pet> }) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({ type: 'updatePet', payload: { id, updates } });
        const current = qc.getQueryData<Pet[]>(PETS_KEY);
        const pet = current?.find((p) => p.id === id);
        return { ...pet, ...updates } as Pet;
      }
      return api.updatePet(id, updates);
    },
    onSuccess: (updatedPet) => {
      qc.setQueryData<Pet[]>(PETS_KEY, (old) =>
        old?.map((p) => (p.id === updatedPet.id ? updatedPet : p)) ?? [],
      );
      qc.invalidateQueries({ queryKey: ['pet', updatedPet.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({ type: 'deletePet', payload: { id } });
        return;
      }
      return api.deletePet(id);
    },
    onSuccess: (_, deletedId) => {
      qc.setQueryData<Pet[]>(PETS_KEY, (old) =>
        old?.filter((p) => p.id !== deletedId) ?? [],
      );
    },
  });

  const pets = query.data ?? [];
  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null;

  return {
    pets,
    selectedPet,
    selectedPetId,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    selectPet,
    addPet: addMutation.mutateAsync,
    isAdding: addMutation.isPending,
    updatePet: (id: string, updates: Partial<Pet>) =>
      updateMutation.mutateAsync({ id, updates }),
    isUpdating: updateMutation.isPending,
    deletePet: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

export function usePet(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['pet', id],
    queryFn: () => api.fetchPetById(id),
    enabled: isAuthenticated && !!id,
  });
}
