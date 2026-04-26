/**
 * /pending-signatures — Lista de TCIs do tutor (com filtro pendentes/assinados/todos).
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, FileSignature, ChevronRight, Inbox, Check, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useReportQueryError } from '../../hooks/useReportQueryError';

type Filter = 'pending' | 'signed' | 'all';

interface Tci {
  id: string; pet_id: string;
  procedure_type: string; created_at: string;
  pet_name: string | null;
  tutor_signed_at: string | null;
  professional_signed_at: string | null;
  status: string;
}

export default function PendingSignaturesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [filter, setFilter] = useState<Filter>('pending');

  const query = useQuery<Tci[]>({
    queryKey: ['my-tcis', userId, filter],
    queryFn: async () => {
      if (!userId) return [];
      let q = supabase
        .from('termos_consentimento')
        .select('id, pet_id, procedure_type, created_at, tutor_signed_at, professional_signed_at, status, pets!termos_consentimento_pet_id_fkey(name)')
        .eq('tutor_user_id', userId)
        .order('created_at', { ascending: false });
      if (filter === 'pending') q = q.is('tutor_signed_at', null);
      else if (filter === 'signed') q = q.not('tutor_signed_at', 'is', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id, pet_id: r.pet_id, procedure_type: r.procedure_type,
        created_at: r.created_at, pet_name: r.pets?.name ?? null,
        tutor_signed_at: r.tutor_signed_at, professional_signed_at: r.professional_signed_at, status: r.status,
      }));
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });

  useReportQueryError(query, { section: 'pending-signatures', queryKey: 'my-tcis', route: '/pending-signatures' });

  const handlePress = useCallback((id: string) => {
    router.push(`/tci-sign?id=${id}` as never);
  }, [router]);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('pendingSignatures.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(['pending', 'signed', 'all'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f} onPress={() => setFilter(f)} activeOpacity={0.7}
            style={[s.filterBtn, filter === f && s.filterBtnActive]}
          >
            <Text style={[s.filterTxt, filter === f && s.filterTxtActive]}>
              {t(`pendingSignatures.filter.${f}`)}
            </Text>
          </TouchableOpacity>
        ))}
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
              <Text style={s.emptyTitle}>{t(`pendingSignatures.empty.${filter}.title`)}</Text>
              <Text style={s.emptyDesc}>{t(`pendingSignatures.empty.${filter}.desc`)}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const tutorSigned = !!item.tutor_signed_at;
            return (
              <TouchableOpacity style={s.row} onPress={() => handlePress(item.id)} activeOpacity={0.7}>
                <View style={s.rowIcon}>
                  <FileSignature size={rs(20)} color={colors.click} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.rowTitle} numberOfLines={1}>{item.procedure_type}</Text>
                    {tutorSigned ? (
                      <View style={s.signedBadge}>
                        <Check size={rs(10)} color={colors.success} strokeWidth={2.5} />
                        <Text style={s.signedTxt}>{t('pendingSignatures.signed')}</Text>
                      </View>
                    ) : (
                      <View style={s.pendingBadge}>
                        <Clock size={rs(10)} color={colors.warning} strokeWidth={2} />
                        <Text style={s.pendingTxt}>{t('pendingSignatures.pending')}</Text>
                      </View>
                    )}
                  </View>
                  {item.pet_name && (<Text style={s.rowPet}>{item.pet_name}</Text>)}
                  <Text style={s.rowDate}>
                    {t('pendingSignatures.createdAt', { date: new Date(item.created_at).toLocaleDateString() })}
                  </Text>
                </View>
                <ChevronRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
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
  filterRow: { flexDirection: 'row', gap: rs(6), padding: spacing.md, paddingBottom: 0 },
  filterBtn: { flex: 1, paddingVertical: rs(8), borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  filterBtnActive: { backgroundColor: colors.clickSoft, borderColor: colors.click },
  filterTxt: { color: colors.textSec, fontSize: fs(12), fontWeight: '600' },
  filterTxtActive: { color: colors.click },
  list: { padding: spacing.md, paddingBottom: rs(40) },
  emptyContainer: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  emptyBox: { alignItems: 'center', gap: rs(10) },
  emptyIcon: { width: rs(56), height: rs(56), borderRadius: rs(28), backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center', marginBottom: rs(8) },
  emptyTitle: { color: colors.text, fontSize: fs(15), fontWeight: '700', textAlign: 'center' },
  emptyDesc: { color: colors.textSec, fontSize: fs(12), textAlign: 'center', lineHeight: fs(18), paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10) },
  rowIcon: { width: rs(40), height: rs(40), borderRadius: rs(20), backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: rs(8) },
  rowTitle: { color: colors.text, fontSize: fs(14), fontWeight: '700', flex: 1 },
  rowPet: { color: colors.click, fontSize: fs(11), marginTop: rs(2), fontWeight: '600' },
  rowDate: { color: colors.textDim, fontSize: fs(11), marginTop: rs(2) },
  signedBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(3), paddingHorizontal: rs(6), paddingVertical: rs(2), backgroundColor: colors.success + '15', borderRadius: rs(4) },
  signedTxt: { color: colors.success, fontSize: fs(9), fontWeight: '700' },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(3), paddingHorizontal: rs(6), paddingVertical: rs(2), backgroundColor: colors.warning + '15', borderRadius: rs(4) },
  pendingTxt: { color: colors.warning, fontSize: fs(9), fontWeight: '700' },
});
