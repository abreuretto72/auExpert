import { useEffect, useRef } from 'react';
import type { EventSubscription } from 'expo-notifications';
import {
  registerForPushNotifications,
  addNotificationListener,
  addNotificationResponseListener,
} from '../lib/notifications';

export function useNotifications() {
  const notificationListener = useRef<EventSubscription | null>(null);
  const responseListener = useRef<EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

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
