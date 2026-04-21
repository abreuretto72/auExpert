/**
 * PetAgeSync — Runs syncPetAges once per session after login.
 *
 * Mounts as a sibling of InviteLinkHandler inside QueryClientProvider + ToastProvider
 * so it has access to both the auth store and the React Query cache.
 *
 * Guards:
 *   - isAuthenticated + userId — only runs with a real session
 *   - onlineManager.isOnline() — offline = skip silently (next session retries)
 *   - ranForUser ref — prevents duplicate runs if the effect re-fires for the same
 *     user (e.g., AppState transitions don't re-sync)
 *
 * On drift detected (updated > 0), invalidates ['pets'] so all PetHeader/cards
 * re-render with the freshly computed estimated_age_months.
 *
 * Also re-runs for a different userId if the tutor logs out and back in as someone
 * else in the same app instance (ref keyed by userId, not boolean).
 */
import { useEffect, useRef } from 'react';
import { useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { syncPetAges } from '../lib/syncPetAges';

export function PetAgeSync() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    if (ranForUser.current === userId) return;
    if (!onlineManager.isOnline()) {
      console.log('[PetAgeSync] offline — skip sync; retry next session');
      return;
    }

    ranForUser.current = userId;
    (async () => {
      const result = await syncPetAges(userId);
      if (result.updated > 0) {
        // Invalidate BOTH trees: usePets() uses ['pets'] (list) while usePet(id)
        // uses ['pet', id] (detail) — they're separate key trees, so a single
        // invalidation on 'pets' does NOT refresh an open pet-detail screen.
        qc.invalidateQueries({ queryKey: ['pets'] });
        qc.invalidateQueries({ queryKey: ['pet'] });
      }
    })();
  }, [isAuthenticated, userId, qc]);

  return null;
}
