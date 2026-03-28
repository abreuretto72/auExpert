import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  Image,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { X, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs, fs } from '../hooks/useResponsive';
import { processQueue } from '../lib/offlineSync';
import { getQueueSize } from '../lib/offlineQueue';
import { persistQueryCache } from '../lib/offlineCache';
import { queryClient } from '../lib/queryClient';
/* eslint-disable @typescript-eslint/no-var-requires */
const pataAmarela = require('../assets/images/pata_amarela.png');
const pataVerde = require('../assets/images/pata_verde.png');

interface NetworkGuardProps {
  children: ReactNode;
}

export function NetworkGuard({ children }: NetworkGuardProps) {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [showOffline, setShowOffline] = useState(false);
  const [showOnline, setShowOnline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const hasInitialized = useRef(false);
  const startTime = useRef(Date.now());
  const offlineOpacity = useRef(new Animated.Value(0)).current;
  const offlineScale = useRef(new Animated.Value(0.8)).current;
  const onlineOpacity = useRef(new Animated.Value(0)).current;
  const onlineScale = useRef(new Animated.Value(0.8)).current;
  const onlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cacheInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persistir cache periodicamente
  useEffect(() => {
    cacheInterval.current = setInterval(() => {
      persistQueryCache(queryClient);
    }, 120_000);
    return () => {
      if (cacheInterval.current) clearInterval(cacheInterval.current);
    };
  }, []);

  // Monitorar rede
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true;
      const elapsed = Date.now() - startTime.current;

      console.log('[NetworkGuard]', {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        connected,
        elapsed: `${elapsed}ms`,
        hasInitialized: hasInitialized.current,
        currentState: isConnected,
        showOffline,
      });

      // Ignorar primeiros 5 segundos — NetInfo e instavel no startup
      if (elapsed < 5000) {
        console.log('[NetworkGuard] IGNORANDO — ainda no startup (<5s)');
        setIsConnected(connected);
        return;
      }

      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setIsConnected(connected);
        console.log('[NetworkGuard] Primeira checagem apos 5s — connected:', connected);
        return;
      }

      if (!connected && isConnected !== false) {
        console.log('[NetworkGuard] >>> FICOU OFFLINE — mostrando balao');
        setIsConnected(false);
        persistQueryCache(queryClient);
        setShowOffline(true);
        animateIn(offlineOpacity, offlineScale);
        refreshPendingCount();
      } else if (connected && isConnected === false) {
        console.log('[NetworkGuard] >>> VOLTOU ONLINE — escondendo balao');
        setIsConnected(true);
        animateOut(offlineOpacity, offlineScale, () => setShowOffline(false));
        setShowOnline(true);
        animateIn(onlineOpacity, onlineScale);
        syncPendingMutations();

        if (onlineTimer.current) clearTimeout(onlineTimer.current);
        onlineTimer.current = setTimeout(() => {
          animateOut(onlineOpacity, onlineScale, () => setShowOnline(false));
        }, 4000);
      }
    });

    refreshPendingCount();
    return () => unsubscribe();
  }, [isConnected]);

  const animateIn = (opacity: Animated.Value, scale: Animated.Value) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
    ]).start();
  };

  const animateOut = (opacity: Animated.Value, scale: Animated.Value, cb?: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.8, duration: 250, useNativeDriver: true }),
    ]).start(cb);
  };

  const refreshPendingCount = async () => {
    const count = await getQueueSize();
    setPendingCount(count);
  };

  const syncPendingMutations = async () => {
    const count = await getQueueSize();
    if (count === 0) return;
    setSyncing(true);
    const result = await processQueue();
    setSyncing(false);
    setPendingCount(result.remaining);
  };

  const handleRetry = () => {
    NetInfo.fetch().then((state) => {
      if (state.isConnected) {
        setIsConnected(true);
        animateOut(offlineOpacity, offlineScale, () => setShowOffline(false));
        setShowOnline(true);
        animateIn(onlineOpacity, onlineScale);
        syncPendingMutations();
        if (onlineTimer.current) clearTimeout(onlineTimer.current);
        onlineTimer.current = setTimeout(() => {
          animateOut(onlineOpacity, onlineScale, () => setShowOnline(false));
        }, 4000);
      }
    });
  };

  const handleDismissOffline = () => {
    animateOut(offlineOpacity, offlineScale, () => setShowOffline(false));
  };

  return (
    <View style={styles.container}>
      {children}

      {/* Balao offline */}
      {showOffline && (
        <Pressable style={styles.overlay} onPress={handleDismissOffline}>
          <Animated.View
            style={[
              styles.bubble,
              { opacity: offlineOpacity, transform: [{ scale: offlineScale }] },
            ]}
          >
            <TouchableOpacity onPress={handleDismissOffline} style={styles.closeBtn} activeOpacity={0.7}>
              <View style={styles.closeBtnCircle}>
                <X size={rs(14)} color={colors.danger} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>

            <Image source={pataAmarela} style={styles.pawImage} />

            <Text style={styles.bubbleText}>
              {pendingCount > 0
                ? t('errors.network') + '\n' + t('toast.pendingSync', {
                    count: pendingCount,
                    defaultValue: `${pendingCount} ${pendingCount === 1 ? 'alteracao salva' : 'alteracoes salvas'}. Envio quando voltar!`,
                  })
                : t('errors.network')}
            </Text>

            <TouchableOpacity onPress={handleRetry} style={styles.retryRow} activeOpacity={0.7}>
              <RefreshCw size={rs(16)} color={colors.accent} strokeWidth={2} />
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </TouchableOpacity>

            <Text style={styles.bubbleSignature}>{t('toast.petSignature')}</Text>
          </Animated.View>
        </Pressable>
      )}

      {/* Balao reconectado */}
      {showOnline && (
        <View style={styles.overlay} pointerEvents="none">
          <Animated.View
            style={[
              styles.bubble,
              { opacity: onlineOpacity, transform: [{ scale: onlineScale }] },
            ]}
          >
            <Image source={pataVerde} style={styles.pawImage} />

            <Text style={styles.bubbleText}>
              {syncing
                ? t('toast.syncing', { defaultValue: 'Sincronizando seus dados...' })
                : t('toast.reconnected', { defaultValue: 'Voltei! Conexao restabelecida.' })}
            </Text>

            <Text style={styles.bubbleSignature}>{t('toast.petSignature')}</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    backgroundColor: 'rgba(11, 18, 25, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(spacing.xl),
  },
  bubble: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.modal),
    paddingHorizontal: rs(spacing.lg),
    paddingTop: rs(spacing.xl),
    paddingBottom: rs(spacing.lg),
    alignItems: 'center',
    width: '100%',
    maxWidth: rs(300),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(16) },
    shadowOpacity: 0.5,
    shadowRadius: rs(32),
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: rs(10),
    right: rs(10),
    zIndex: 1,
  },
  closeBtnCircle: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(14),
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawImage: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    marginBottom: rs(spacing.md),
  },
  bubbleText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
    lineHeight: fs(24),
    marginBottom: rs(spacing.sm),
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingHorizontal: rs(16),
    paddingVertical: rs(10),
    marginBottom: rs(spacing.md),
  },
  retryText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.accent,
  },
  bubbleSignature: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(16),
    color: colors.textDim,
    fontStyle: 'italic',
  },
});
