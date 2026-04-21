/**
 * petTabStore — Remembers the last active tab (`diario | painel | agenda | ia`)
 * for each pet on the `/pet/[id]` screen.
 *
 * Why this exists:
 *   When the user taps a lens card in the "Painel" tab, we `router.push()` to
 *   a lens screen like `/pet/[id]/health`. Pressing back from the lens pops
 *   the stack back to `/pet/[id]`. Under normal React Navigation behavior, the
 *   PetScreen state should be preserved — but on some platforms / memory
 *   conditions the screen is remounted, and `useState` re-initializes to the
 *   default `'diario'` tab (because the `initialTab` URL param is not set on
 *   back-pops).
 *
 *   This store persists the last tab in memory (keyed by petId) so the
 *   PetScreen can restore the right tab on any remount — the user never loses
 *   their "Painel" context after visiting a lens.
 *
 * Scope: in-memory only. No AsyncStorage — the context is only meaningful
 * within a single app session and should reset on cold start.
 */
import { create } from 'zustand';

export type PetTabKey = 'diario' | 'painel' | 'agenda' | 'ia';

interface PetTabState {
  /** Last active tab per petId — e.g. { "abc-123": "painel" } */
  lastTabByPet: Record<string, PetTabKey>;
  setLastTab: (petId: string, tab: PetTabKey) => void;
  getLastTab: (petId: string) => PetTabKey | undefined;
  clear: (petId?: string) => void;
}

export const usePetTabStore = create<PetTabState>((set, get) => ({
  lastTabByPet: {},

  setLastTab: (petId, tab) =>
    set((state) => {
      if (state.lastTabByPet[petId] === tab) return state; // no-op, prevent re-render
      return { lastTabByPet: { ...state.lastTabByPet, [petId]: tab } };
    }),

  getLastTab: (petId) => get().lastTabByPet[petId],

  clear: (petId) =>
    set((state) => {
      if (!petId) return { lastTabByPet: {} };
      const next = { ...state.lastTabByPet };
      delete next[petId];
      return { lastTabByPet: next };
    }),
}));
