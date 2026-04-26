import { useEffect, useRef } from 'react';
import type { EventSubscription } from 'expo-notifications';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  registerForPushNotifications,
  addNotificationListener,
  addNotificationResponseListener,
} from '../lib/notifications';
import { supabase } from '../lib/supabase';

export function useNotifications() {
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    // Pega o token do device e persiste em users.expo_push_token (best-effort).
    // Sem token registrado, send-queue-notifications nao tem como enviar push.
    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (!token) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // UPDATE silencioso — se falhar (RLS, coluna ausente), nao quebra o app
        await supabase.from('users').update({ expo_push_token: token }).eq('id', user.id);
      } catch (e) {
        console.warn('[useNotifications] register/persist token failed:', e);
      }
    })();

    notificationListener.current = addNotificationListener((_notification) => {
      // handle foreground notification
    });

    responseListener.current = addNotificationResponseListener((_response) => {
      // handle notification tap
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);
}

// ── Queue (notifications_queue) ───────────────────────────────────────────────

export type NotificationQueueType =
  | 'vaccine_reminder'
  | 'diary_reminder'
  | 'ai_insight'
  | 'welcome';

export interface NotificationQueueItem {
  id: string;
  user_id: string;
  pet_id: string | null;
  type: NotificationQueueType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  scheduled_for: string;
  sent_at: string | null;
  is_read: boolean;
  is_active: boolean;
  created_at: string;
}

/**
 * Fetches the current user's notifications queue ordered by most recent first.
 * Only `is_active = true` rows are returned (soft delete).
 */
export function useNotificationsQueue() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications_queue'],
    queryFn: async (): Promise<NotificationQueueItem[]> => {
      const { data, error } = await supabase
        .from('notifications_queue')
        .select('id, user_id, pet_id, type, title, body, data, scheduled_for, sent_at, is_read, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data ?? []) as NotificationQueueItem[];
    },
    staleTime: 30 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (count, err: unknown) => {
      const code = (err as { code?: string })?.code;
      if (code === '42P01') return false;
      return count < 2;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications_queue')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<NotificationQueueItem[]>(
        ['notifications_queue'],
        (old) => (old ?? []).map((n) => n.id === id ? { ...n, is_read: true } : n),
      );
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications_queue')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      qc.setQueryData<NotificationQueueItem[]>(
        ['notifications_queue'],
        (old) => (old ?? []).filter((n) => n.id !== id),
      );
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = (query.data ?? []).filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from('notifications_queue')
        .update({ is_read: true })
        .in('id', unreadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.setQueryData<NotificationQueueItem[]>(
        ['notifications_queue'],
        (old) => (old ?? []).map((n) => ({ ...n, is_read: true })),
      );
    },
  });

  return {
    notifications: query.data ?? [],
    isLoading:     query.isLoading,
    error:         query.error,
    refetch:       query.refetch,
    unreadCount:   (query.data ?? []).filter((n) => !n.is_read).length,
    markRead:      markReadMutation.mutateAsync,
    dismiss:       dismissMutation.mutateAsync,
    markAllRead:   markAllReadMutation.mutateAsync,
  };
}
