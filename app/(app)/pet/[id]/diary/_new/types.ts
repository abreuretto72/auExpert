/**
 * Shared types + constants for the NewDiaryEntry screen, extracted verbatim
 * from app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same names, same values —
 * imported back into new.tsx via `import { Step, FULLSCREEN_STEPS, PREVIEW_STEPS, WAVE_BARS } from './_new/types'`.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type Step =
  | 'mic'
  | 'text'
  | 'photo_camera'         // in-app camera (avoids Android process death)
  | 'scanner'
  | 'document_scan'
  | 'video_record'
  | 'listen_record'
  | 'photo_preview'
  | 'gallery_preview'
  | 'video_preview'
  | 'audio_preview'
  | 'document_preview';

export const FULLSCREEN_STEPS: Step[] = ['photo_camera', 'scanner', 'document_scan', 'video_record', 'listen_record'];
// 'voice' was removed — voice entries use the dedicated /diary/voice screen
export const PREVIEW_STEPS: Step[] = ['photo_preview', 'gallery_preview', 'video_preview', 'audio_preview', 'document_preview'];

export const WAVE_BARS = 20;
