/**
 * useConsent — read and update a specific LGPD/GDPR consent for the current user.
 *
 * Backed by the `user_consents` table (migration 031).
 * Uses upsert on (user_id, consent_type) — safe to call multiple times.
 */
import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { addToQueue } from '../lib/offlineQueue';

export function useConsent(consentType: string) {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['consent', userId, consentType],
    queryFn: async () => {
      if (!userId) return false;
      const { data } = await supabase
        .from('user_consents')
        .select('granted, revoked_at')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .maybeSingle();
      return data ? (data.granted === true && data.revoked_at === null) : false;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (granted: boolean) => {
      if (!userId) return;

      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'upsertUserConsent',
          payload: {
            user_id: userId,
            consent_type: consentType,
            granted,
            document_version: '1.0',
          },
        });
        return;
      }

      const now = new Date().toISOString();
      const { error } = await supabase.from('user_consents').upsert(
        {
          user_id: userId,
          consent_type: consentType,
          granted,
          granted_at: granted ? now : null,
          revoked_at: granted ? null : now,
          document_version: '1.0',
        },
        { onConflict: 'user_id,consent_type' },
      );
      if (error) throw error;
    },
    onSuccess: (_data, granted) => {
      qc.setQueryData(['consent', userId, consentType], granted);
    },
  });

  return {
    granted: query.data ?? false,
    isLoading: query.isLoading,
    setConsent: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}
