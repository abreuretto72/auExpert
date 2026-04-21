/**
 * syncPetAges — Recompute `pets.estimated_age_months` from `birth_date`.
 *
 * Problem this solves:
 *   `estimated_age_months` is written ONCE at pet create (AddPetModal) / edit (edit.tsx)
 *   via `calcAgeMonths(birth_date)` and never refreshed. A pet born 1 year ago keeps
 *   showing "1 year" forever unless the tutor manually re-edits. The column is read
 *   by 14+ places including multiple Edge Functions (cardapio, pet-assistant,
 *   diary-narration, personality, prontuario, health-patterns, etc.), so stale age
 *   contaminates UI AND AI prompts.
 *
 * Contract (agreed with user 2026-04-20):
 *   (A) Keep the column as source of truth — no display refactor.
 *   (B) Sync once per app session after login, BEFORE UI queries fire.
 *   (C) Only sync pets with birth_date != NULL. Pets with only estimated_age_months
 *       (AI photo guess / tutor estimate, no known birth) are left alone.
 *   (D) Only sync pets where user_id = userId (primary owner). Co-parents see whatever
 *       the primary owner's last sync produced.
 *   (E) Only UPDATE rows with drift (stored !== computed) — avoids pointless writes.
 *   (F) Offline-safe: caller gates on onlineManager.isOnline(). This fn does NOT check.
 *   (G) Error-safe: never throws; returns counters + error on failure so app startup
 *       continues normally.
 */
import { supabase } from './supabase';
import { calcAgeMonths } from '../utils/format';

export interface SyncPetAgesResult {
  checked: number;  // total pets examined
  updated: number;  // rows actually UPDATEd
  skipped: number;  // already fresh (no drift)
  error?: unknown;
}

export async function syncPetAges(userId: string): Promise<SyncPetAgesResult> {
  try {
    const { data: pets, error: selErr } = await supabase
      .from('pets')
      .select('id, birth_date, estimated_age_months')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('birth_date', 'is', null);

    if (selErr) {
      console.warn('[syncPetAges] SELECT falhou:', selErr.message);
      return { checked: 0, updated: 0, skipped: 0, error: selErr };
    }

    if (!pets || pets.length === 0) {
      console.log('[syncPetAges] nenhum pet com birth_date — nada a sincronizar');
      return { checked: 0, updated: 0, skipped: 0 };
    }

    let updated = 0;
    let skipped = 0;

    for (const pet of pets as Array<{ id: string; birth_date: string | null; estimated_age_months: number | null }>) {
      if (!pet.birth_date) { skipped++; continue; } // belt-and-suspenders after .not() filter

      const fresh = calcAgeMonths(pet.birth_date);
      if (pet.estimated_age_months === fresh) { skipped++; continue; }

      const { error: updErr } = await supabase
        .from('pets')
        .update({ estimated_age_months: fresh })
        .eq('id', pet.id);

      if (updErr) {
        console.warn('[syncPetAges] UPDATE falhou pet', pet.id.slice(-6), ':', updErr.message);
        continue;
      }
      updated++;
    }

    console.log('[syncPetAges] checked:', pets.length, '| updated:', updated, '| skipped:', skipped);
    return { checked: pets.length, updated, skipped };
  } catch (e) {
    console.warn('[syncPetAges] erro inesperado:', e);
    return { checked: 0, updated: 0, skipped: 0, error: e };
  }
}
