/**
 * useSyncQueue — processes SQLite pending_entries when internet returns.
 *
 * Separate from the AsyncStorage offlineQueue (which handles CRUD mutations).
 * This queue is specifically for diary entries that need AI classification.
 *
 * Trigger: internet reconnects → waits 2 s for stability → processes.
 * Interval: every 30 s while online (catches items that failed silently).
 * Max retries: 3 per entry.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import { useAuthStore } from '../stores/authStore';
import {
  getPendingEntries,
  updatePendingStatus,
} from '../lib/localDb';
import { classifyDiaryEntry } from '../lib/ai';
import * as api from '../lib/api';
import { generateEmbedding } from '../lib/rag';
import i18n from '../i18n';

const MAX_ATTEMPTS = 3;
let isSyncing = false;

export function useSyncQueue() {
  const { isOnline } = useNetworkStatus();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const processQueue = useCallback(async () => {
    if (isSyncing || !isOnline || !user?.id) return;
    isSyncing = true;

    try {
      const pending = getPendingEntries();
      if (pending.length === 0) return;

      for (const entry of pending) {
        if (entry.attempts >= MAX_ATTEMPTS) continue;

        try {
          updatePendingStatus(entry.id, 'processing');

          // Classify via AI (text + optional photos)
          const classification = await classifyDiaryEntry(
            entry.pet_id,
            entry.input_text,
            entry.photos_base64,
            entry.input_type,
            i18n.language,
          );

          const inputMethod =
            ['photo', 'gallery', 'ocr_scan'].includes(entry.input_type) ? 'photo' as const
            : entry.input_type === 'voice' ? 'voice' as const
            : 'text' as const;

          // Save diary entry to Supabase
          const entryId = await api.createDiaryEntry({
            pet_id: entry.pet_id,
            user_id: user.id,
            content: entry.input_text ?? '(media)',
            input_method: inputMethod,
            mood_id: classification.mood ?? 'calm',
            mood_score: Math.round((classification.mood_confidence ?? 0.5) * 100),
            mood_source: 'ai_suggested' as const,
            tags: classification.tags_suggested ?? [],
            photos: entry.local_media_uris ?? [],
            is_special: false,
          });

          if (classification.narration) {
            await api.updateDiaryNarration(
              entryId,
              classification.narration,
              Math.round((classification.mood_confidence ?? 0.5) * 100),
              classification.tags_suggested,
            );
          }

          // Generate embedding (best-effort)
          const embeddingText = classification.narration
            ? `${entry.input_text ?? ''}\n\n${classification.narration}`
            : (entry.input_text ?? '');
          generateEmbedding(entry.pet_id, 'diary', entryId, embeddingText, 0.5, user.id).catch(() => {});

          updatePendingStatus(entry.id, 'synced');

          // Replace temp entry in cache with real entry
          qc.setQueryData<{ id: string; processing_status?: string }[]>(
            ['pets', entry.pet_id, 'diary'],
            (old) => old?.filter((e) => e.id !== entry.id) ?? [],
          );
          qc.invalidateQueries({ queryKey: ['pets', entry.pet_id, 'diary'] });

        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          updatePendingStatus(entry.id, 'error', msg);
        }
      }
    } finally {
      isSyncing = false;
    }
  }, [isOnline, user, qc]);

  // Trigger when internet comes back — wait 2 s for stability
  useEffect(() => {
    if (isOnline) {
      syncTimerRef.current = setTimeout(processQueue, 2000);
    }
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [isOnline, processQueue]);

  // Process every 30 s while online
  useEffect(() => {
    if (!isOnline) return;
    intervalRef.current = setInterval(processQueue, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, processQueue]);

  return { processQueue, isOnline };
}
