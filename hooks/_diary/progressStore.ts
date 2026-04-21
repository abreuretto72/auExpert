/**
 * progressStore — Zustand store for diary-entry processing progress.
 *
 * Tracks per-tempId phase progress while the background classifier runs,
 * so the "processing" card in the timeline can render a CHECKLIST (one line
 * per applicable phase) with mini progress bars:
 *
 *   ⏳ Analisando texto...              ▓▓░░▓▓░░▓▓   (indeterminate)
 *   ⏳ Analisando imagem 2/3...         ████████░░   66% (real progress)
 *   ✓  Áudio analisado                  ██████████   100%
 *   ◯  Coletando dados do documento...  ░░░░░░░░░░   0% (pending)
 *
 * Phase lifecycle:
 *   not_applicable → (phase won't run for this entry, hidden from checklist)
 *   pending        → applicable, will run but hasn't started
 *   running        → currently in progress
 *   done           → finished
 *
 * All 5 phases default to `not_applicable` — the orchestrator MUST explicitly
 * activate each applicable phase with `setPhase(tempId, phase, 'pending')`
 * (or `setPhotoTotal(tempId, count)` for photos) before they appear in the
 * checklist. This makes the checklist automatically hide inapplicable phases
 * (e.g. no document scanner → OCR line doesn't show).
 *
 * All values in the store are UI state, NOT server data. React Query owns
 * server data (per CLAUDE.md §11.3). This store is cleared once the real
 * diary entry lands in the React Query cache.
 *
 * Usage:
 *   - backgroundClassify.ts sets phases to 'pending' at start, 'running'/'done'
 *     around each routine.
 *   - DiaryCard.tsx subscribes via useEntryProgress(tempId) and passes the
 *     result to <ProcessingChecklist />.
 */

import { create } from 'zustand';

export type Phase = 'not_applicable' | 'pending' | 'running' | 'done';

export interface EntryProgress {
  text:   Phase;
  video:  Phase;
  audio:  Phase;
  ocr:    Phase;
  photos: { completed: number; total: number };
}

type PhaseKey = 'text' | 'video' | 'audio' | 'ocr';

interface ProgressState {
  byId: Record<string, EntryProgress>;
  setPhase:       (tempId: string, phase: PhaseKey, status: Phase) => void;
  setPhotoTotal:  (tempId: string, total: number) => void;
  bumpPhoto:      (tempId: string) => void;
  clear:          (tempId: string) => void;
}

const EMPTY_PROGRESS: EntryProgress = {
  text:   'not_applicable',
  video:  'not_applicable',
  audio:  'not_applicable',
  ocr:    'not_applicable',
  photos: { completed: 0, total: 0 },
};

export const useProgressStore = create<ProgressState>((set) => ({
  byId: {},

  setPhase: (tempId, phase, status) =>
    set((state) => {
      const current = state.byId[tempId] ?? EMPTY_PROGRESS;
      return {
        byId: {
          ...state.byId,
          [tempId]: { ...current, [phase]: status },
        },
      };
    }),

  setPhotoTotal: (tempId, total) =>
    set((state) => {
      const current = state.byId[tempId] ?? EMPTY_PROGRESS;
      return {
        byId: {
          ...state.byId,
          [tempId]: {
            ...current,
            photos: { completed: current.photos.completed, total },
          },
        },
      };
    }),

  bumpPhoto: (tempId) =>
    set((state) => {
      const current = state.byId[tempId] ?? EMPTY_PROGRESS;
      return {
        byId: {
          ...state.byId,
          [tempId]: {
            ...current,
            photos: {
              completed: Math.min(current.photos.completed + 1, current.photos.total),
              total: current.photos.total,
            },
          },
        },
      };
    }),

  clear: (tempId) =>
    set((state) => {
      const next = { ...state.byId };
      delete next[tempId];
      return { byId: next };
    }),
}));

// ── Derived selector: checklist ────────────────────────────────────────────────

export type ChecklistState = 'pending' | 'running' | 'done';

export interface ChecklistItem {
  /** Stable identifier used as React key. */
  phase: 'text' | 'ocr' | 'video' | 'photos' | 'audio';
  /** Lifecycle state for the progress bar + icon. */
  state: ChecklistState;
  /** i18n key for the label — always under `diary.processingPhases.*`. */
  key: string;
  /** Interpolation vars (e.g. {current, total} for photos in progress). */
  vars?: Record<string, number | string>;
  /**
   * For phases with REAL discrete progress (photos), the numeric ratio 0-1.
   * For phases with only indeterminate progress (text/ocr/video/audio),
   * this is `null` — the UI should animate a sliding gradient.
   * When state === 'done', this is always 1.
   */
  progress: number | null;
}

/**
 * Build a list of applicable phases with their lifecycle + progress.
 * Order reflects a sensible reading sequence for the checklist:
 *   text → ocr → video → photos → audio
 *
 * Returns an empty array when `p` is undefined or no phase is applicable.
 */
export function deriveChecklist(p: EntryProgress | undefined): ChecklistItem[] {
  if (!p) return [];
  const items: ChecklistItem[] = [];

  // TEXT
  if (p.text !== 'not_applicable') {
    items.push({
      phase: 'text',
      state: p.text,
      key: p.text === 'done'
        ? 'diary.processingPhases.textDone'
        : 'diary.processingPhases.text',
      progress: p.text === 'done' ? 1 : null,  // indeterminate while running
    });
  }

  // OCR
  if (p.ocr !== 'not_applicable') {
    items.push({
      phase: 'ocr',
      state: p.ocr,
      key: p.ocr === 'done'
        ? 'diary.processingPhases.ocrDone'
        : 'diary.processingPhases.ocr',
      progress: p.ocr === 'done' ? 1 : null,
    });
  }

  // VIDEO
  if (p.video !== 'not_applicable') {
    items.push({
      phase: 'video',
      state: p.video,
      key: p.video === 'done'
        ? 'diary.processingPhases.videoDone'
        : 'diary.processingPhases.video',
      progress: p.video === 'done' ? 1 : null,
    });
  }

  // PHOTOS — applicable when total > 0
  if (p.photos.total > 0) {
    const allDone = p.photos.completed >= p.photos.total;
    if (allDone) {
      items.push({
        phase: 'photos',
        state: 'done',
        key: p.photos.total === 1
          ? 'diary.processingPhases.photoSingleDone'
          : 'diary.processingPhases.photoAllDone',
        vars: p.photos.total > 1 ? { count: p.photos.total } : undefined,
        progress: 1,
      });
    } else {
      const current = Math.max(1, Math.min(p.photos.completed + 1, p.photos.total));
      items.push({
        phase: 'photos',
        state: 'running',
        key: p.photos.total === 1
          ? 'diary.processingPhases.photoSingle'
          : 'diary.processingPhases.photo',
        vars: p.photos.total > 1 ? { current, total: p.photos.total } : undefined,
        // Real discrete progress — completed so far / total
        progress: p.photos.completed / p.photos.total,
      });
    }
  }

  // AUDIO
  if (p.audio !== 'not_applicable') {
    items.push({
      phase: 'audio',
      state: p.audio,
      key: p.audio === 'done'
        ? 'diary.processingPhases.audioDone'
        : 'diary.processingPhases.audio',
      progress: p.audio === 'done' ? 1 : null,
    });
  }

  return items;
}

/**
 * Convenience hook — subscribes to the progress of a single tempId.
 *
 * Returns null when the tempId has no active progress (either cleared or
 * never started). DiaryCard uses this + deriveChecklist to render the
 * checklist inside the processing card.
 */
export function useEntryProgress(tempId: string | undefined): EntryProgress | null {
  return useProgressStore((s) => (tempId ? s.byId[tempId] ?? null : null));
}
