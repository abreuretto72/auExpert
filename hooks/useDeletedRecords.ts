/**
 * useDeletedRecords — fetches soft-deleted records for a pet.
 * Only diary_entries are surfaced for now; other tables can be added.
 *
 * RLS ensures only owner / co_parent can see is_active=false rows.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeletedEntry {
  id: string;
  content: string | null;
  entry_date: string | null;
  created_at: string;
  deleted_at: string | null;
  delete_reason: string | null;
  entry_type: string | null;
  deleted_by_user: { full_name: string | null; email: string | null } | null;
  registered_by_user: { full_name: string | null; email: string | null } | null;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useDeletedRecords(petId: string) {
  const qc = useQueryClient();

  const { data: deletedEntries = [], isLoading, error, refetch } = useQuery({
    queryKey: ['pets', petId, 'deleted', 'diary'],
    queryFn: async (): Promise<DeletedEntry[]> => {
      const { data, error: queryError } = await supabase
        .from('diary_entries')
        .select(`
          id,
          content,
          entry_date,
          created_at,
          deleted_at,
          delete_reason,
          entry_type,
          deleted_by_user:deleted_by(full_name, email),
          registered_by_user:registered_by(full_name, email)
        `)
        .eq('pet_id', petId)
        .eq('is_active', false)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (queryError) throw queryError;
      return (data as unknown as DeletedEntry[]) ?? [];
    },
    enabled: !!petId,
  });

  const restoreEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error: restoreError } = await supabase
        .from('diary_entries')
        .update({ is_active: true })
        .eq('id', entryId);
      if (restoreError) throw restoreError;
    },
    onSuccess: (_, entryId) => {
      // Remove from deleted list
      qc.setQueryData<DeletedEntry[]>(
        ['pets', petId, 'deleted', 'diary'],
        (old) => (old ?? []).filter((e) => e.id !== entryId),
      );
      // Invalidate active diary so restored entry appears
      qc.invalidateQueries({ queryKey: ['pets', petId, 'diary'] });
    },
  });

  return {
    deletedEntries,
    isLoading,
    error,
    refetch,
    restoreEntry: restoreEntry.mutateAsync,
    isRestoring: restoreEntry.isPending,
  };
}
