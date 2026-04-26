/**
 * /reminders — Lembretes do tutor (notifications_queue).
 *
 * Lista todos lembretes ativos (medication_reminder, followup_reminder,
 * tci_pending_tutor, vaccine_reminder) do tutor autenticado, ordenados por
 * scheduled_for ASC. Botao "Concluido" marca is_read=true.
 */
import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Bell, Pill, FileSignature, Syringe, Calendar,
  Check, Inbox,
} from 'lucide-react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useReportQueryError } from '../../hooks/useReportQueryError';

interface Reminder {
  id: string; pet_id: string | null; type: string;
  title: string; body: string;
  scheduled_for: string; is_read: boolean;
  data: Record<string, unknown> | null;
}

const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  medication_reminder: Pill,
  followup_reminder: Calendar,
  tci_pending_tutor: FileSignature,
  vaccine_reminder: Syringe,
  default: Bell,
};

export default function RemindersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  const query = useQuery<Reminder[]>({
    queryKey: ['my-reminders', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('notifications_queue')
        .select('id, pet_id, type, title, body, scheduled_for, is_read, data')
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('is_read', false)
        .order('scheduled_for', { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  useReportQueryError(query, { section: 'reminders', queryKey: 'my-reminders', route: '/reminders' });

  const markRead = useCallback(async (id: string) => {
    await supabase.from('notifications_queue').update({ is_read: true }).eq('id', id);
    qc.invalidateQueries({ queryKey: ['my-reminders', userId] });
  }, [qc, userId]);

  const onTap = useCallback((r: Reminder) => {
    const route = (r.data as { route?: string } | null)?.route;
    const tciId = (r.data as { tci_id?: string } | null)?.tci_id;
    if (r.type === 'tci_pending_tutor' && tciId) {
      router.push(`/tci-sign?id=${tciId}` as never);
    } else if (route) {
      router.push(route as never);
    }
  }, [router]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('reminders.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      {query.isLoading ? (
        <View style={s.loadingBox}><ActivityIndicator size="large" color={colors.click} /></View>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={(query.data?.length ?? 0) === 0 ? s.emptyContainer : s.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.click} />}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <View style={s.emptyIcon}><Inbox size={rs(28)} color={colors.click} strokeWidth={1.6} /></View>
              <Text style={s.emptyTitle}>{t('reminders.emptyTitle')}</Text>
              <Text style={s.emptyDesc}>{t('reminders.emptyDesc')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const Icon = ICONS[item.type] ?? ICONS.default;
            const dt = new Date(item.scheduled_for);
            const isPast = dt < new Date();
            return (
              <TouchableOpacity style={s.row} onPress={() => onTap(item)} activeOpacity={0.7}>
                <View style={s.rowIcon}>
                  <Icon size={rs(20)} color={colors.click} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.rowBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={[s.rowDate, isPast && s.rowDatePast]}>
                    {dt.toLocaleString()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => markRead(item.id)} style={s.checkBtn} hitSlop={8}>
                  <Check size={rs(18)} color={colors.success} strokeWidth={2} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: rs(40) },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  emptyBox: { alignItems: 'center', gap: rs(10) },
  emptyIcon: { width: rs(56), height: rs(56), borderRadius: rs(28), backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center', marginBottom: rs(8) },
  emptyTitle: { color: colors.text, fontSize: fs(15), fontWeight: '700', textAlign: 'center' },
  emptyDesc: { color: colors.textSec, fontSize: fs(12), textAlign: 'center', lineHeight: fs(18), paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10) },
  rowIcon: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
  rowBody: { color: colors.textSec, fontSize: fs(11), marginTop: rs(2), lineHeight: fs(15) },
  rowDate: { color: colors.textDim, fontSize: fs(10), marginTop: rs(4), fontWeight: '500' },
  rowDatePast: { color: colors.warning },
  checkBtn: { padding: rs(8), backgroundColor: colors.success + '15', borderRadius: rs(20) },
});
