import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { checkConnection } from '../lib/offlineQueue';

/**
 * Hook para verificar estado da rede em qualquer componente.
 *
 * Uso:
 * const { isOnline, checkBeforeAction } = useNetwork();
 *
 * // Verificar antes de acao critica:
 * const ok = await checkBeforeAction();
 * if (!ok) return; // toast ja foi mostrado pelo NetworkGuard
 */
export function useNetwork() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  const checkBeforeAction = useCallback(async (): Promise<boolean> => {
    const connected = await checkConnection();
    setIsOnline(connected);
    return connected;
  }, []);

  return { isOnline, checkBeforeAction };
}
