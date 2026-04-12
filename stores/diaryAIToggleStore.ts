/**
 * diaryAIToggleStore — Preferência de análise inteligente do diário.
 *
 * Estado de UI persistido em AsyncStorage. Controla se as rotinas de
 * análise IA (narração, fotos, vídeo, áudio, OCR) rodam ao gravar uma
 * entrada. Default: desligado — tutor ativa explicitamente quando quiser análise.
 *
 * NUNCA colocar lógica de fetch ou dados do servidor aqui — só estado de UI.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DiaryAIToggleState {
  /** true = analisar com IA ao gravar; false = salvar só URLs, sem análise. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

export const useDiaryAIToggleStore = create<DiaryAIToggleState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: '@auexpert/diary-ai-toggle',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
