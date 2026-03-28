import { QueryClient, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';

// Sincronizar React Query com o estado real da rede
// Quando offline: queries ficam pausadas (nao disparam fetch)
// Quando reconecta: queries stale sao refetchadas automaticamente
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min — dados nao refetcham desnecessariamente
      gcTime: 1000 * 60 * 30,     // 30 min — cache mantido em memoria
      retry: 2,                     // 2 retries em falha de rede
      refetchOnWindowFocus: false,  // Mobile nao tem "window focus" real
      refetchOnReconnect: true,     // Refetch ao reconectar internet
    },
    mutations: {
      retry: 1,
    },
  },
});
