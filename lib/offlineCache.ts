import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';

const CACHE_KEY = '@petaulife/react-query-cache';

/**
 * Persiste o cache do React Query no AsyncStorage.
 * Ao abrir o app, os dados da ultima sessao sao restaurados
 * — o tutor ve os dados imediatamente, mesmo sem internet.
 */
export async function persistQueryCache(queryClient: QueryClient) {
  const cache = queryClient.getQueryCache().getAll();
  const serializable = cache
    .filter((query) => query.state.status === 'success' && query.state.data)
    .map((query) => ({
      queryKey: query.queryKey,
      data: query.state.data,
      dataUpdatedAt: query.state.dataUpdatedAt,
    }));

  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(serializable));
  } catch {
    // Storage cheio ou erro — silencioso, nao critico
  }
}

export async function restoreQueryCache(queryClient: QueryClient) {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;

    const entries = JSON.parse(raw) as Array<{
      queryKey: unknown[];
      data: unknown;
      dataUpdatedAt: number;
    }>;

    for (const entry of entries) {
      queryClient.setQueryData(entry.queryKey, entry.data, {
        updatedAt: entry.dataUpdatedAt,
      });
    }
  } catch {
    // Cache corrompido — limpar e seguir
    await AsyncStorage.removeItem(CACHE_KEY);
  }
}

export async function clearQueryCache() {
  await AsyncStorage.removeItem(CACHE_KEY);
}
