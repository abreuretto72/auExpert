/**
 * useNetworkStatus — lightweight NetInfo wrapper.
 *
 * Returns { isOnline } boolean.
 * Ignores the first 5 s of startup (NetInfo is unstable on cold boot)
 * matching the same logic used in NetworkGuard.
 */
import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Read initial state
    NetInfo.fetch().then((state) => {
      const elapsed = Date.now() - startTime.current;
      if (elapsed >= 5000) {
        setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
      }
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const elapsed = Date.now() - startTime.current;
      if (elapsed < 5000) return; // ignore startup noise
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, []);

  return { isOnline };
}
