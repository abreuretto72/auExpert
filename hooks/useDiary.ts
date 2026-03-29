import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import * as api from '../lib/api';
import { generateDiaryNarration } from '../lib/ai';
import { generateEmbedding } from '../lib/rag';
import { addToQueue } from '../lib/offlineQueue';
import type { DiaryEntry } from '../types/database';

export interface AddEntryParams {
  content: string;
  input_method: 'voice' | 'photo' | 'text';
  mood_id: string;
  mood_score?: number | null;
  mood_source?: 'manual' | 'ai_suggested';
  entry_type?: DiaryEntry['entry_type'];
  tags?: string[];
  is_special?: boolean;
  photos?: string[];
  narration?: string | null;
  linked_photo_analysis_id?: string | null;
}

export function useDiary(petId: string) {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const queryKey = ['pets', petId, 'diary'] as const;

  // ── Fetch entries ──
  const query = useQuery({
    queryKey,
    queryFn: () => api.fetchDiaryEntries(petId),
    enabled: isAuthenticated && !!petId,
  });

  // ── Create entry (uses DB function: atomic entry + mood_log) ──
  const addMutation = useMutation({
    mutationFn: async (params: AddEntryParams) => {
      if (!onlineManager.isOnline()) {
        const payload = {
          pet_id: petId,
          user_id: user!.id,
          ...params,
        };
        await addToQueue({ type: 'createDiaryEntry', payload: payload as unknown as Record<string, unknown> });
        return {
          id: `temp-${Date.now()}`,
          pet_id: petId,
          user_id: user!.id,
          content: params.content,
          input_method: params.input_method,
          narration: params.narration ?? null,
          mood_id: params.mood_id,
          mood_score: params.mood_score ?? null,
          mood_source: params.mood_source ?? 'manual',
          entry_type: params.entry_type ?? 'manual',
          tags: params.tags ?? [],
          photos: params.photos ?? [],
          is_special: params.is_special ?? false,
          linked_photo_analysis_id: params.linked_photo_analysis_id ?? null,
          entry_date: new Date().toISOString().split('T')[0],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as DiaryEntry;
      }

      // Create entry via DB function (also creates mood_log)
      console.log('[useDiary] addEntry — creating entry, content_len:', params.content.length, 'mood:', params.mood_id, 'hasNarration:', !!params.narration);
      const entryId = await api.createDiaryEntry({
        pet_id: petId,
        user_id: user!.id,
        content: params.content,
        input_method: params.input_method,
        mood_id: params.mood_id,
        mood_score: params.mood_score,
        mood_source: params.mood_source,
        entry_type: params.entry_type,
        tags: params.tags,
        is_special: params.is_special,
        photos: params.photos,
        linked_photo_analysis_id: params.linked_photo_analysis_id,
      });

      console.log('[useDiary] addEntry — entryId:', entryId);
      // If narration was generated, update it
      if (params.narration) {
        console.log('[useDiary] addEntry — saving narration, length:', params.narration.length);
        await api.updateDiaryNarration(entryId, params.narration, params.mood_score, params.tags);
        console.log('[useDiary] addEntry — narration saved OK');
      }

      // Generate RAG embedding for this pet's memory (non-blocking)
      const embeddingText = params.narration
        ? `${params.content}\n\n${params.narration}`
        : params.content;
      const importance = params.entry_type === 'vaccine' || params.entry_type === 'allergy' ? 0.9
        : params.entry_type === 'photo_analysis' ? 0.8
        : 0.5;
      generateEmbedding(petId, 'diary', entryId, embeddingText, importance).catch(() => {
        // Embedding generation is best-effort — don't block the save
      });

      // Return constructed entry for optimistic cache update
      return {
        id: entryId,
        pet_id: petId,
        user_id: user!.id,
        content: params.content,
        input_method: params.input_method,
        narration: params.narration ?? null,
        mood_id: params.mood_id,
        mood_score: params.mood_score ?? null,
        mood_source: params.mood_source ?? 'manual',
        entry_type: params.entry_type ?? 'manual',
        tags: params.tags ?? [],
        photos: params.photos ?? [],
        is_special: params.is_special ?? false,
        linked_photo_analysis_id: params.linked_photo_analysis_id ?? null,
        entry_date: new Date().toISOString().split('T')[0],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as DiaryEntry;
    },
    onSuccess: (newEntry) => {
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
        old ? [newEntry, ...old] : [newEntry],
      );
      // Invalidate mood logs since a new one was created by DB function
      qc.invalidateQueries({ queryKey: ['pets', petId, 'moods'] });
    },
  });

  // ── Update entry ──
  const updateMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      content?: string;
      narration?: string | null;
      mood_id?: string;
      mood_score?: number | null;
      tags?: string[];
      photos?: string[];
      is_special?: boolean;
    }) => {
      const { id, ...updates } = params;
      return api.updateDiaryEntry(id, updates);
    },
    onSuccess: (updated) => {
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
        old?.map((e) => (e.id === updated.id ? updated : e)) ?? [],
      );
    },
  });

  // ── Soft-delete entry ──
  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => api.deleteDiaryEntry(entryId),
    onSuccess: (_data, entryId) => {
      qc.setQueryData<DiaryEntry[]>(queryKey, (old) =>
        old?.filter((e) => e.id !== entryId) ?? [],
      );
    },
  });

  // ── Generate AI narration ──
  const narrationMutation = useMutation({
    mutationFn: async (params: { content: string; moodId: string; language: 'pt-BR' | 'en-US' }) => {
      return generateDiaryNarration(petId, params.content, params.moodId, params.language);
    },
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,

    addEntry: addMutation.mutateAsync,
    isAdding: addMutation.isPending,

    updateEntry: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteEntry: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,

    generateNarration: narrationMutation.mutateAsync,
    isGenerating: narrationMutation.isPending,
  };
}
