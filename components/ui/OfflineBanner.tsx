/**
 * OfflineBanner — inline 32 px status bar for offline/syncing state.
 *
 * Unlike NetworkGuard (which shows a full balloon on connection change),
 * this is a persistent, non-intrusive strip that lives below the header.
 * It only renders when there is something to communicate.
 *
 * States:
 *   offline + pendentes → amber strip with count
 *   offline sem pendentes → amber strip "modo offline"
 *   online + sincronizando → petrol strip "sincronizando..."
 *   online + tudo ok → null (hidden)
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WifiOff, RefreshCw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getPendingCount } from '../../lib/localDb';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

interface OfflineBannerProps {
  /** petId to filter pending count — omit for global count */
  petId?: string;
  /** Called when the pending count changes (e.g. to show a badge) */
  onPendingChange?: (count: number) => void;
}

export function OfflineBanner({ petId, onPendingChange }: OfflineBannerProps) {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  // Refresh count on mount and every 5 s
  useEffect(() => {
    const refresh = () => {
      const count = getPendingCount(petId);
      setPendingCount(count);
      onPendingChange?.(count);
    };

    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [petId, onPendingChange]);

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.bannerOffline]}>
        <WifiOff size={rs(12)} color={colors.warning} strokeWidth={2} />
        <Text style={[styles.text, styles.textOffline]} numberOfLines={1}>
          {pendingCount > 0
            ? t('offline.pendingEntries', { count: pendingCount })
            : t('offline.noConnection')}
        </Text>
      </View>
    );
  }

  // Online but still syncing pending items
  return (
    <View style={[styles.banner, styles.bannerSyncing]}>
      <RefreshCw size={rs(12)} color={colors.petrol} strokeWidth={2} />
      <Text style={[styles.text, styles.textSyncing]} numberOfLines={1}>
        {t('offline.syncing', { count: pendingCount })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: rs(32),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    paddingHorizontal: rs(16),
  },
  bannerOffline: {
    backgroundColor: colors.warningSoft,
  },
  bannerSyncing: {
    backgroundColor: colors.petrolSoft,
  },
  text: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    letterSpacing: 0.2,
  },
  textOffline: {
    color: colors.warning,
  },
  textSyncing: {
    color: colors.petrol,
  },
});
