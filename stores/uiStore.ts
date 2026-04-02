import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIState {
  drawerOpen: boolean;
  language: 'pt-BR' | 'en-US';
  toggleDrawer: () => void;
  setLanguage: (lang: 'pt-BR' | 'en-US') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      drawerOpen: false,
      language: 'pt-BR',

      toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: '@auexpert/ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
      }),
    },
  ),
);
