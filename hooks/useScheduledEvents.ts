/**
 * useScheduledEvents — CRUD hook for the `scheduled_events` table.
 *
 * Every mutation that touches the scheduled status also syncs local
 * push notifications via lib/notifications.ts so the tutor is always
 * reminded before upcoming events.
 *
 * Offline: writes are queued via lib/offlineQueue.ts and synced on reconnect.
 * Notifications are scheduled optimistically (no internet needed for local notifs).
 */

import { useMutation, useQuery, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { addToQueue } from '../lib/offlineQueue';
import {
  scheduleAgendaReminders,
  cancelAgendaReminders,
  syncAgendaNotifications,
} from '../lib/notifications';

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventStatus = 'scheduled' | 'confirmed' | 'done' | 'cancelled' | 'missed';
export type RecurrenceRule =
  | 'daily' | 'weekly' | 'biweekly' | 'monthly'
  | 'quarterly' | 'biannual' | 'annual' | null;

export interface ScheduledEvent {
  id: string;
  pet_id: string;
  user_id: string;
  diary_entry_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  professional: string | null;
  location: string | null;
  scheduled_for: string;
  all_day: boolean;
  status: EventStatus;
  is_recurring: boolean;
  recurrence_rule: RecurrenceRule;
  source: 'manual' | 'ai' | 'system';
  is_active: boolean;
  created_at: string;
}

export interface CreateEventInput {
  event_type: string;
  title: string;
  description?: string | null;
  professional?: string | null;
  location?: string | null;
  scheduled_for: string;  // ISO 8601
  all_day?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
  source?: 'manual' | 'ai' | 'system';
  diary_entry_id?: string | null;
}

export interface UpdateEventInput {
  event_type?: string;
  title?: string;
  description?: string | null;
  professional?: string | null;
  location?: string | null;
  scheduled_for?: string;
  all_day?: boolean;
  status?: EventStatus;
  is_recurring?: boolean;
  recurrence_rule?: RecurrenceRule;
}

// ── Query key factory ──────────────────────────────────────────────────────────

const eventKeys = {
  all:      (petId: string)              => ['pets', petId, 'scheduled_events'] as const,
  upcoming: (petId: string)              => ['pets', petId, 'scheduled_events', 'upcoming'] as const,
  month:    (petId: string, y: number, m: number) =>
                                           ['pets', petId, 'scheduled_events', y, m] as const,
};

// ── Helper: build notification sub-line from event ────────────────────────────

function buildNotifSub(event: Pick<ScheduledEvent, 'professional' | 'location'>): string {
  return [event.professional, event.location].filter(Boolean).join(' · ');
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchUpcomingEvents(petId: string): Promise<ScheduledEvent[]> {
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .eq('pet_id', petId)
    .eq('is_active', true)
    .in('status', ['scheduled', 'confirmed'])
    .gte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as ScheduledEvent[];
}

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useScheduledEvents(petId: string, petName: string) {
  const qc    = useQueryClient();
  const user  = useAuthStore((s) => s.user);

  // ── Upcoming events query ──────────────────────────────────────────────────
  const upcomingQuery = useQuery({
    queryKey: eventKeys.upcoming(petId),
    queryFn:  async () => {
      const events = await fetchUpcomingEvents(petId);
      // Sync local notifications any time we refresh upcoming events
      syncAgendaNotifications(events, petName).catch(() => {});
      return events;
    },
    staleTime: 5 * 60 * 1000,   // 5 min — agenda changes infrequently
    gcTime:    30 * 60 * 1000,  // keep in memory 30 min (offline reads)
    retry: 2,
  });

  // ── Create event ───────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (input: CreateEventInput): Promise<ScheduledEvent> => {
      const payload = {
        pet_id:         petId,
        user_id:        user!.id,
        event_type:     input.event_type,
        title:          input.title,
        description:    input.description ?? null,
        professional:   input.professional ?? null,
        location:       input.location ?? null,
        scheduled_for:  input.scheduled_for,
        all_day:        input.all_day ?? false,
        status:         'scheduled' as EventStatus,
        is_recurring:   input.is_recurring ?? false,
        recurrence_rule: input.recurrence_rule ?? null,
        source:         input.source ?? 'manual',
        diary_entry_id: input.diary_entry_id ?? null,
        is_active:      true,
      };

      let event: ScheduledEvent;

      if (!onlineManager.isOnline()) {
        // Queue for later sync
        await addToQueue({ type: 'createScheduledEvent', payload });
        // Optimistic local object
        event = {
          ...payload,
          id:         `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
        } as ScheduledEvent;
      } else {
        const { data, error } = await supabase
          .from('scheduled_events')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        event = data as ScheduledEvent;
      }

      // Schedule local notifications immediately (works offline too)
      await scheduleAgendaReminders(
        {
          id:            event.id,
          title:         event.title,
          scheduled_for: event.scheduled_for,
          all_day:       event.all_day,
          sub:           buildNotifSub(event),
        },
        petName,
      );

      return event;
    },
    onSuccess: (newEvent) => {
      // Optimistic cache insert
      qc.setQueryData<ScheduledEvent[]>(
        eventKeys.upcoming(petId),
        (old) => {
          const list = old ?? [];
          return [...list, newEvent].sort(
            (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
          );
        },
      );
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    },
  });

  // ── Update event ───────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateEventInput }) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({ type: 'updateScheduledEvent', payload: { id, ...updates } });
        return { id, ...updates } as Partial<ScheduledEvent>;
      }

      const { data, error } = await supabase
        .from('scheduled_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      const updated = data as ScheduledEvent;

      // Reschedule notifications if date/status changed
      const keepStatuses: EventStatus[] = ['scheduled', 'confirmed'];
      if (keepStatuses.includes(updated.status)) {
        await scheduleAgendaReminders(
          {
            id:            updated.id,
            title:         updated.title,
            scheduled_for: updated.scheduled_for,
            all_day:       updated.all_day,
            sub:           buildNotifSub(updated),
          },
          petName,
        );
      } else {
        await cancelAgendaReminders(id);
      }

      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.upcoming(petId) });
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    },
  });

  // ── Mark done ──────────────────────────────────────────────────────────────
  const markDoneMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await cancelAgendaReminders(eventId);

      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'updateScheduledEvent',
          payload: { id: eventId, status: 'done' },
        });
        return;
      }

      const { error } = await supabase
        .from('scheduled_events')
        .update({ status: 'done' })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      qc.setQueryData<ScheduledEvent[]>(
        eventKeys.upcoming(petId),
        (old) => (old ?? []).filter((e) => e.id !== eventId),
      );
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    },
  });

  // ── Mark cancelled ─────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await cancelAgendaReminders(eventId);

      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'updateScheduledEvent',
          payload: { id: eventId, status: 'cancelled' },
        });
        return;
      }

      const { error } = await supabase
        .from('scheduled_events')
        .update({ status: 'cancelled' })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      qc.setQueryData<ScheduledEvent[]>(
        eventKeys.upcoming(petId),
        (old) => (old ?? []).filter((e) => e.id !== eventId),
      );
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    },
  });

  // ── Delete (soft) ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await cancelAgendaReminders(eventId);

      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'updateScheduledEvent',
          payload: { id: eventId, is_active: false },
        });
        return;
      }

      const { error } = await supabase
        .from('scheduled_events')
        .update({ is_active: false })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: (_, eventId) => {
      qc.setQueryData<ScheduledEvent[]>(
        eventKeys.upcoming(petId),
        (old) => (old ?? []).filter((e) => e.id !== eventId),
      );
      qc.invalidateQueries({ queryKey: ['pets', petId, 'lens', 'agenda'] });
    },
  });

  return {
    // Data
    upcoming:         upcomingQuery.data ?? [],
    isLoading:        upcomingQuery.isLoading,
    error:            upcomingQuery.error,
    refetch:          upcomingQuery.refetch,

    // Mutations
    createEvent:      createMutation.mutateAsync,
    isCreating:       createMutation.isPending,

    updateEvent:      (id: string, updates: UpdateEventInput) =>
                        updateMutation.mutateAsync({ id, updates }),
    isUpdating:       updateMutation.isPending,

    markDone:         markDoneMutation.mutateAsync,
    isMarkingDone:    markDoneMutation.isPending,

    cancelEvent:      cancelMutation.mutateAsync,
    isCancelling:     cancelMutation.isPending,

    deleteEvent:      deleteMutation.mutateAsync,
    isDeleting:       deleteMutation.isPending,
  };
}
