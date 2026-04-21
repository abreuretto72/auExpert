/**
 * notifications.tsx — Tela de notificações do tutor.
 *
 * Lista os registros ativos de notifications_queue para o usuário atual,
 * ordenados por created_at DESC. Permite:
 *   - marcar como lida ao tocar no card
 *   - dispensar (soft delete) via botão
 *   - marcar todas como lidas via header action
 *   - navegar para o pet relacionado quando pet_id presente
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Bell, BellOff, Syringe, BookOpen, Sparkles, Heart,
  CheckCheck, Trash2,
} from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import {
  useNotificationsQueue,
  type NotificationQueueItem,
  type NotificationQueueType,
} from '../../hooks/useNotifications';
import { useToast } from '../../components/Toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMin = Math.max(0, Math.floor((now - then) / 60_000));
  if (diffMin < 1) return t('notifications.timeJustNow');
  if (diffMin < 60) return t('notifications.timeMinutesAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('notifications.timeHoursAgo', { count: diffH });
  const diffD = Math.floor(diffH / 24);
  return t('notifications.timeDaysAgo', { count: diffD });
}

const TYPE_META: Record<NotificationQueueType, {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  color: string;
  labelKey: string;
}> = {
  vaccine_reminder: { Icon: Syringe,   color: colors.danger,  labelKey: 'notifications.typeVaccineReminder' },
  diary_reminder:   { Icon: BookOpen,  color: colors.accent,  labelKey: 'notifications.typeDiaryReminder' },
  ai_insight:       { Icon: Sparkles,  color: colors.purple,  labelKey: 'notifications.typeAiInsight' },
  welcome:          { Icon: Heart,     color: colors.rose,    labelKey: 'notifications.typeWelcome' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const {
    notifications, isLoading, refetch, unreadCount,
    markRead, dismiss, markAllRead,
  } = useNotificationsQueue();

  const onPressItem = useCallback(async (item: NotificationQueueItem) => {
    if (!item.is_read) {
      try { await markRead(item.id); } catch { /* silent */ }
    }
    if (item.pet_id) {
      router.push(`/pet/${item.pet_id}` as never);
    }
  }, [markRead, router]);

  const onDismiss = useCallback(async (item: NotificationQueueItem) => {
    try {
      await dismiss(item.id);
    } catch {
      toast(t('errors.generic'), 'error');
    }
  }, [dismiss, toast, t]);

  const onMarkAllRead = useCallback(async () => {
    try {
      await markAllRead();
    } catch {
      toast(t('errors.generic'), 'error');
    }
  }, [markAllRead, toast, t]);

  const renderItem = useCallback(({ item }: { item: NotificationQueueItem }) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.diary_reminder;
    const Icon = meta.Icon;
    return (
      <TouchableOpacity
        style={[s.card, !item.is_read && s.cardUnread]}
        onPress={() => onPressItem(item)}
        activeOpacity={0.8}
      >
        <View style={[s.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Icon size={rs(20)} color={meta.color} strokeWidth={1.8} />
        </View>
        <View style={s.cardBody}>
          <View style={s.cardHeaderRow}>
            <Text style={s.typeLabel} numberOfLines={1}>{t(meta.labelKey)}</Text>
            {!item.is_read && <View style={[s.unreadDot, { backgroundColor: colors.accent }]} />}
          </View>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.body} numberOfLines={3}>{item.body}</Text>
          <Text style={s.time}>{formatRelativeTime(item.created_at, t)}</Text>
        </View>
        <TouchableOpacity
          style={s.dismissBtn}
          onPress={() => onDismiss(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Trash2 size={rs(16)} color={colors.danger} strokeWidth={1.8} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }, [onPressItem, onDismiss, t]);

  const keyExtractor = useCallback((item: NotificationQueueItem) => item.id, []);

  const renderEmpty = () => (
    <View style={s.emptyWrap}>
      <View style={s.emptyIconWrap}>
        <BellOff size={rs(36)} color={colors.textGhost} strokeWidth={1.4} />
      </View>
      <Text style={s.emptyTitle}>{t('notifications.emptyTitle')}</Text>
      <Text style={s.emptyHint}>{t('notifications.emptyHint')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.headerBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <View style={s.headerTitleWrap}>
          <Text style={s.headerTitle}>{t('notifications.screenTitle')}</Text>
          {unreadCount > 0 && (
            <Text style={s.headerSubtitle}>
              {t('notifications.unreadBadge', { count: unreadCount })}
            </Text>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity
            onPress={onMarkAllRead}
            style={s.headerBtn}
            activeOpacity={0.7}
          >
            <CheckCheck size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        ) : (
          <View style={s.headerBtn} />
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            s.listContent,
            notifications.length === 0 && s.listContentEmpty,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(spacing.sm),
    gap: rs(spacing.sm),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  headerSubtitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.accent,
    marginTop: rs(2),
  },

  // List
  listContent: {
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    paddingBottom: rs(spacing.xl),
    gap: rs(spacing.sm),
  },
  listContentEmpty: { flexGrow: 1 },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(spacing.sm),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.xxl),
    padding: rs(spacing.md),
  },
  cardUnread: {
    borderColor: colors.accent + '45',
    backgroundColor: colors.cardGlow,
  },
  iconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(radii.lg),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: rs(4) },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.xs),
  },
  typeLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  unreadDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  body: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: fs(18),
  },
  time: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(10),
    color: colors.textGhost,
    marginTop: rs(4),
  },
  dismissBtn: {
    width: rs(32),
    height: rs(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(radii.sm),
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(spacing.xl),
    gap: rs(spacing.md),
  },
  emptyIconWrap: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textDim,
    lineHeight: fs(20),
    textAlign: 'center',
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
