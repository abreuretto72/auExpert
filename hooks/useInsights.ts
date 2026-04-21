/**
 * useInsights — React Query hook for pet_insights table.
 *
 * Returns AI-generated insights ordered: high → medium → low urgency,
 * then by created_at DESC. Limited to 20 active records.
 *
 * Inserted by CRONs (check-scheduled-events, refresh-health-views)
 * when they detect alerts or trends — never by the tutor directly.
 */
import { useMutation, useQuery, useQueryClient, onlineManager } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { addToQueue } from '../lib/offlineQueue';

// ── Types ─────────────────────────────────────────────────────────────────────

export type InsightType     = 'alert' | 'trend' | 'suggestion';
export type InsightUrgency  = 'high' | 'medium' | 'low';

export interface PetInsight {
  id: string;
  pet_id: string;
  user_id: string;
  type: InsightType;
  urgency: InsightUrgency;
  category: string | null;
  title: string;
  body: string;
  source: string | null;
  action_label: string | null;
  read_at: string | null;
  is_active: boolean;
  created_at: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInsights(petId: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['pets', petId, 'insights'],
    queryFn: async (): Promise<PetInsight[]> => {
      const { data, error } = await supabase
        .from('pet_insights')
        .select('id, pet_id, user_id, type, urgency, category, title, body, source, action_label, read_at, is_active, created_at')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        // Table may not exist yet — return empty gracefully
        if (error.code === '42P01') return [];
        throw error;
      }

      const rows = (data ?? []) as PetInsight[];
      console.log('[IA] insights petId:', petId.slice(-8), '| total:', rows.length);

      // Client-side sort: high → medium → low
      const urgencyOrder: Record<InsightUrgency, number> = { high: 1, medium: 2, low: 3 };
      return rows.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    },
    staleTime: 10 * 1000, // 10s durante debug
    gcTime:    30 * 60 * 1000,
    retry: (count, err: unknown) => {
      // Don't retry if table doesn't exist (migration pending)
      const code = (err as { code?: string })?.code;
      if (code === '42P01') return false;
      return count < 2;
    },
  });

  // Mark insight as read
  const markReadMutation = useMutation({
    mutationFn: async (insightId: string) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'markInsightRead',
          payload: { id: insightId, pet_id: petId },
        });
        return;
      }

      const { error } = await supabase
        .from('pet_insights')
        .update({ read_at: new Date().toISOString() })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: (_data, insightId) => {
      qc.setQueryData<PetInsight[]>(
        ['pets', petId, 'insights'],
        (old) => (old ?? []).map((i) =>
          i.id === insightId ? { ...i, read_at: new Date().toISOString() } : i,
        ),
      );
    },
  });

  // Dismiss insight (soft delete)
  const dismissMutation = useMutation({
    mutationFn: async (insightId: string) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'dismissInsight',
          payload: { id: insightId, pet_id: petId },
        });
        return;
      }

      const { error } = await supabase
        .from('pet_insights')
        .update({ is_active: false })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: (_data, insightId) => {
      qc.setQueryData<PetInsight[]>(
        ['pets', petId, 'insights'],
        (old) => (old ?? []).filter((i) => i.id !== insightId),
      );
    },
  });

  return {
    insights:     query.data ?? [],
    isLoading:    query.isLoading,
    error:        query.error,
    refetch:      query.refetch,
    unreadCount:  (query.data ?? []).filter((i) => !i.read_at).length,
    markRead:     markReadMutation.mutateAsync,
    dismiss:      dismissMutation.mutateAsync,
  };
}
