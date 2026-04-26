import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../constants/colors';
import { useNotifications } from '../../hooks/useNotifications';

export default function AppLayout() {
  // Registra o expo push token no boot. Sem isso, send-queue-notifications
  // nao tem como entregar push (medication_reminder, tci_pending_tutor, etc).
  useNotifications();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
