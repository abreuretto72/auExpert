/**
 * useBackfillRAG — runs the RAG backfill edge function once per pet per install.
 *
 * PROBLEM
 * -------
 * RAG started indexing embeddings AFTER pets already existed in the DB. Every
 * vaccine, allergy, consultation, medication, exam, surgery, expense, clinical
 * metric, food record and diary entry that predates `generateEmbedding()` has
 * NO row in `pet_embeddings` — so the assistant answers as if the pet has no
 * history. This is audit bug #2.
 *
 * WHAT THIS DOES
 * --------------
 * For each pet the current user owns, invokes the `backfill-pet-rag` edge
 * function exactly once per install. The edge function is itself idempotent
 * (skips rows already indexed by `(pet_id, category, content_id)`), but we
 * also persist a per-pet AsyncStorage flag so we don't even make the call
 * after a successful run — saves a round trip.
 *
 * Flag key: `backfill:done:v1:<pet_id>`
 * Version bump (`v1` → `v2`) forces a re-run if builders or importance
 * tables change.
 *
 * RULES
 * -----
 * - Fire-and-forget. NEVER blocks UI, NEVER shows toasts, NEVER throws.
 * - One pet at a time to avoid CPU spikes on the edge runtime (gte-small
 *   embeds are CPU-bound).
 * - Requires an active session (Authorization header); skips if offline.
 * - Silent on failure — a failed attempt will simply re-run on next app
 *   launch, which is the desired behavior.
 */

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const FLAG_VERSION = 'v1';
const flagKey = (petId: string) => `backfill:done:${FLAG_VERSION}:${petId}`;

type MinimalPet = { id: string; is_active?: boolean };

async function backfillOne(petId: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('backfill-pet-rag', {
      body: { pet_id: petId },
    });
    if (error) {
      console.warn('[backfill-rag] function error for pet', petId, error.message);
      return;
    }
    // Only mark as done on confirmed success from the edge function.
    // The shape returned is { pet_id, existing, to_insert, inserted, failed, ... }.
    if (data && typeof data === 'object' && 'pet_id' in data) {
      await AsyncStorage.setItem(flagKey(petId), new Date().toISOString());
      const d = data as Record<string, unknown>;
      console.log(
        `[backfill-rag] pet ${petId}: existing=${d.existing} inserted=${d.inserted} failed=${d.failed}`,
      );
    }
  } catch (err) {
    // Network errors, edge function down, timeouts — all swallowed.
    // We'll try again on next app launch.
    console.warn('[backfill-rag] threw for pet', petId, err);
  }
}

async function maybeBackfill(petId: string): Promise<void> {
  const already = await AsyncStorage.getItem(flagKey(petId));
  if (already) return;
  await backfillOne(petId);
}

/**
 * Kicks off a serial backfill sweep across `pets`. Returns nothing; runs in
 * the background. Safe to call on every hub render — a ref guards against
 * concurrent runs within the same session.
 */
export function useBackfillRAG(pets: readonly MinimalPet[] | undefined) {
  const runningRef = useRef(false);
  const petIdsSig = pets?.map((p) => p.id).sort().join(',') ?? '';

  useEffect(() => {
    if (!pets || pets.length === 0) return;
    if (runningRef.current) return;
    if (!onlineManager.isOnline()) return;

    runningRef.current = true;

    (async () => {
      try {
        for (const pet of pets) {
          if (!pet.id) continue;
          if (pet.is_active === false) continue;
          await maybeBackfill(pet.id);
        }
      } finally {
        runningRef.current = false;
      }
    })();
    // Rerun when the set of pet ids changes (new pet added, pet deleted).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petIdsSig]);
}
