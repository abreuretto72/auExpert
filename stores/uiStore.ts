import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIState {
  drawerOpen: boolean;
  language: 'pt-BR' | 'en-US';
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  toggleDrawer: () => void;
  setLanguage: (lang: 'pt-BR' | 'en-US') => void;
  setNotificationsEnabled: (val: boolean) => void;
  setBiometricEnabled: (val: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      drawerOpen: false,
      language: 'pt-BR',
      notificationsEnabled: true,
      biometricEnabled: true,

      toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
      setLanguage: (language) => set({ language }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setBiometricEnabled: (biometricEnabled) => set({ biometricEnabled }),
    }),
    {
      name: '@auexpert/ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        notificationsEnabled: state.notificationsEnabled,
        biometricEnabled: state.biometricEnabled,
      }),
    },
  ),
);
