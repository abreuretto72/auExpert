// expo-notifications: remote push was removed from Expo Go in SDK 53.
// The side-effect module DevicePushTokenAutoRegistration.fx.js throws
// synchronously during import in Expo Go, crashing the entire import chain.
// Fix: use a conditional require so the module is never loaded in Expo Go.
import type * as NotificationsType from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// Lazily loaded — null in Expo Go, full module in dev/prod builds
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Notifications: typeof NotificationsType | null = IS_EXPO_GO
  ? null
  : (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const N = require('expo-notifications') as typeof NotificationsType;
        N.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
        return N;
      } catch {
        return null;
      }
    })();

// ── Android channels ──────────────────────────────────────────────────────────

export async function ensureNotificationChannels() {
  if (!Notifications || Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'AuExpert',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync('agenda', {
    name: 'Agenda',
    description: 'Lembretes de eventos agendados para seu pet',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    sound: 'default',
  });
}

// ── Push token registration ───────────────────────────────────────────────────

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  await ensureNotificationChannels();

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function addNotificationListener(
  handler: (notification: NotificationsType.Notification) => void,
) {
  return Notifications?.addNotificationReceivedListener(handler) ?? null;
}

export function addNotificationResponseListener(
  handler: (response: NotificationsType.NotificationResponse) => void,
) {
  return Notifications?.addNotificationResponseReceivedListener(handler) ?? null;
}

// ── Agenda local notifications ────────────────────────────────────────────────

const AGENDA_NOTIF_KEY = '@auexpert/agenda-notif-ids';

interface AgendaEvent {
  id: string;
  title: string;
  /** ISO 8601 timestamp */
  scheduled_for: string;
  all_day: boolean;
  /** Optional context line (professional, location) */
  sub?: string;
}

interface StoredEventNotifs {
  [eventId: string]: string[]; // notification IDs
}

async function getStoredNotifIds(): Promise<StoredEventNotifs> {
  try {
    const raw = await AsyncStorage.getItem(AGENDA_NOTIF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setStoredNotifIds(map: StoredEventNotifs): Promise<void> {
  await AsyncStorage.setItem(AGENDA_NOTIF_KEY, JSON.stringify(map));
}

/**
 * Schedules up to 3 local push reminders for a single scheduled_event:
 *   • 24 h before  (if event is > 24 h away)
 *   • 1 h before   (if event is > 1 h away)
 *   • At event time / morning of the day for all-day events
 *
 * @param event   The scheduled_event row (id, title, scheduled_for, all_day)
 * @param petName Used in notification body for a warm, personalised message
 */
export async function scheduleAgendaReminders(
  event: AgendaEvent,
  petName: string,
): Promise<void> {
  if (!Notifications) return;

  // Cancel any existing reminders for this event before rescheduling
  await cancelAgendaReminders(event.id);

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  const eventDate = new Date(event.scheduled_for);
  const now = Date.now();
  const msUntilEvent = eventDate.getTime() - now;

  // Don't schedule reminders for past events
  if (msUntilEvent <= 0) return;

  const scheduledIds: string[] = [];
  const sub = event.sub ?? '';

  // ── Helper to schedule one trigger ──────────────────────────────────────────
  const schedule = async (
    triggerDate: Date,
    titleSuffix: string,
    body: string,
  ): Promise<void> => {
    if (!Notifications || triggerDate.getTime() <= now) return;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `${petName} — ${titleSuffix}`,
          body,
          data: { eventId: event.id },
          ...(Platform.OS === 'android' && { channelId: 'agenda' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
      scheduledIds.push(id);
    } catch {
      // Non-critical — notification scheduling can fail silently
    }
  };

  if (event.all_day) {
    // All-day events: morning reminder at 08:00 on the day of the event
    const morning = new Date(eventDate);
    morning.setHours(8, 0, 0, 0);
    await schedule(
      morning,
      'Hoje!',
      event.title + (sub ? ` — ${sub}` : ''),
    );
  } else {
    // Timed events: 24 h + 1 h + at time
    const ms24h = 24 * 60 * 60 * 1000;
    const ms1h  =      60 * 60 * 1000;

    if (msUntilEvent > ms24h) {
      const t24 = new Date(eventDate.getTime() - ms24h);
      await schedule(
        t24,
        'Amanhã',
        `${event.title} às ${eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${sub ? ` — ${sub}` : ''}`,
      );
    }

    if (msUntilEvent > ms1h) {
      const t1h = new Date(eventDate.getTime() - ms1h);
      await schedule(
        t1h,
        'Em 1 hora',
        event.title + (sub ? ` — ${sub}` : ''),
      );
    }

    // At event time
    await schedule(
      eventDate,
      'Agora!',
      event.title + (sub ? ` — ${sub}` : ''),
    );
  }

  // Persist IDs so we can cancel later
  if (scheduledIds.length > 0) {
    const stored = await getStoredNotifIds();
    stored[event.id] = scheduledIds;
    await setStoredNotifIds(stored);
  }
}

/**
 * Cancels all local notifications associated with a specific scheduled_event.
 */
export async function cancelAgendaReminders(eventId: string): Promise<void> {
  if (!Notifications) return;
  try {
    const stored = await getStoredNotifIds();
    const ids = stored[eventId] ?? [];
    await Promise.all(ids.map((id) => Notifications!.cancelScheduledNotificationAsync(id).catch(() => {})));
    const { [eventId]: _, ...rest } = stored;
    await setStoredNotifIds(rest);
  } catch {
    // Non-critical
  }
}

/**
 * Cancels ALL agenda notifications across all events.
 * Called e.g. on logout.
 */
export async function cancelAllAgendaNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    const stored = await getStoredNotifIds();
    const allIds = Object.values(stored).flat();
    await Promise.all(allIds.map((id) => Notifications!.cancelScheduledNotificationAsync(id).catch(() => {})));
    await AsyncStorage.removeItem(AGENDA_NOTIF_KEY);
  } catch {
    // Non-critical
  }
}

/**
 * Bulk-syncs local notifications against all upcoming events for a pet.
 * Call this on app startup and whenever the agenda cache is refreshed.
 *
 * @param upcomingEvents Array of scheduled_events with status 'scheduled' | 'confirmed'
 * @param petName        Pet name for notification personalisation
 */
export async function syncAgendaNotifications(
  upcomingEvents: Array<AgendaEvent & { status: string }>,
  petName: string,
): Promise<void> {
  const active = upcomingEvents.filter(
    (e) => e.status === 'scheduled' || e.status === 'confirmed',
  );

  // Get currently stored event IDs
  const stored = await getStoredNotifIds();
  const storedIds = new Set(Object.keys(stored));
  const activeIds = new Set(active.map((e) => e.id));

  // Cancel notifications for events no longer active
  for (const id of storedIds) {
    if (!activeIds.has(id)) {
      await cancelAgendaReminders(id);
    }
  }

  // Schedule for all active upcoming events
  for (const event of active) {
    await scheduleAgendaReminders(event, petName);
  }
}
