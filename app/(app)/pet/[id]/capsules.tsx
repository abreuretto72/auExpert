import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Hourglass, Lock, Unlock, Sparkles, Clock, Calendar, Plus,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';

type CapsuleStatus = 'all' | 'locked' | 'opened';

interface Capsule {
  id: string;
  title: string;
  author: string;
  date: string;
  status: 'locked' | 'opened';
  daysUntil?: number;
  condition?: string;
  progress?: number;
  preview?: string;
}

// Mock data is built inside the component using t() — see useMockCapsules()

export default function CapsulesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: pet, isLoading, refetch } = usePet(id!);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<CapsuleStatus>('all');

  const mockCapsules: Capsule[] = [
    { id: '1', title: t('capsules.mock1Title'), author: t('capsules.mockAuthor1'), date: '25 Dez 2023', status: 'opened', preview: t('capsules.mock1Preview') },
    { id: '2', title: t('capsules.mock2Title'), author: t('capsules.mockAuthor1'), date: '10 Jan 2024', status: 'locked', daysUntil: 45, condition: t('capsules.mock2Condition'), progress: 72 },
    { id: '3', title: t('capsules.mock3Title'), author: t('capsules.mockAuthor2'), date: '14 Fev 2024', status: 'opened', preview: t('capsules.mock3Preview') },
    { id: '4', title: t('capsules.mock4Title'), author: t('capsules.mockAuthor1'), date: '01 Mar 2024', status: 'locked', daysUntil: 180, condition: t('capsules.mock4Condition'), progress: 25 },
    { id: '5', title: t('capsules.mock5Title'), author: t('capsules.mockAuthor3'), date: '15 Mar 2024', status: 'locked', daysUntil: 12, condition: t('capsules.mock5Condition'), progress: 95 },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !pet) {
    return (
      <View style={s.container}>
        <View style={s.loadingCenter}>
          <Skeleton width={rs(200)} height={rs(24)} />
          <Skeleton width={rs(300)} height={rs(120)} style={{ marginTop: rs(16) }} />
        </View>
      </View>
    );
  }

  const opened = mockCapsules.filter((c) => c.status === 'opened');
  const locked = mockCapsules.filter((c) => c.status === 'locked');
  const filtered = filter === 'all' ? mockCapsules : filter === 'locked' ? locked : opened;

  const filters: { key: CapsuleStatus; label: string }[] = [
    { key: 'all', label: t('capsules.all') },
    { key: 'locked', label: t('capsules.locked') },
    { key: 'opened', label: t('capsules.opened') },
  ];

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.card} />}
      >
        {/* ── Stats Hero ── */}
        <View style={s.heroCard}>
          <View style={s.heroIconWrap}>
            <Hourglass size={rs(28)} color={colors.gold} strokeWidth={1.8} />
          </View>
          <Text style={s.heroLabel}>{t('capsules.created')}</Text>
          <View style={s.heroStatsRow}>
            <View style={s.heroStat}>
              <Text style={[s.heroStatVal, { color: colors.gold }]}>{mockCapsules.length}</Text>
              <Text style={s.heroStatLabel}>{t('capsules.total')}</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatVal, { color: colors.purple }]}>{locked.length}</Text>
              <Text style={s.heroStatLabel}>{t('capsules.locked')}</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={[s.heroStatVal, { color: colors.petrol }]}>{opened.length}</Text>
              <Text style={s.heroStatLabel}>{t('capsules.opened')}</Text>
            </View>
          </View>
          {locked.length > 0 && (
            <View style={s.nextUnlock}>
              <Clock size={rs(12)} color={colors.gold} strokeWidth={1.8} />
              <Text style={s.nextUnlockText}>
                {t('capsules.nextIn', { days: Math.min(...locked.map((c) => c.daysUntil ?? 999)) })}
              </Text>
            </View>
          )}
        </View>

        {/* ── Filter Tabs ── */}
        <View style={s.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[s.filterPill, filter === f.key && s.filterPillActive]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Capsules List ── */}
        {filtered.map((capsule) => {
          const isLocked = capsule.status === 'locked';
          const tintColor = isLocked ? colors.purple : colors.gold;
          return (
            <View key={capsule.id} style={s.capsuleCard}>
              <View style={s.capsuleHeader}>
                <View style={[s.capsuleIcon, { backgroundColor: tintColor + '12' }]}>
                  {isLocked
                    ? <Lock size={rs(20)} color={tintColor} strokeWidth={1.8} />
                    : <Unlock size={rs(20)} color={tintColor} strokeWidth={1.8} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.capsuleTitle}>{capsule.title}</Text>
                  <Text style={s.capsuleMeta}>{capsule.author} · {capsule.date}</Text>
                </View>
                <View style={[s.statusBadge, { backgroundColor: tintColor + '15' }]}>
                  <Text style={[s.statusText, { color: tintColor }]}>
                    {isLocked ? t('capsules.lockedBadge') : t('capsules.openedBadge')}
                  </Text>
                </View>
              </View>
              {isLocked && capsule.condition && (
                <View style={s.conditionBox}>
                  <Calendar size={rs(12)} color={colors.textDim} strokeWidth={1.8} />
                  <Text style={s.conditionText}>{capsule.condition}</Text>
                  <Text style={s.conditionDays}>{capsule.daysUntil}{t('capsules.daysShort')}</Text>
                </View>
              )}
              {isLocked && capsule.progress != null && (
                <View style={s.progressTrack}>
                  <View style={[s.progressFill, { width: `${capsule.progress}%`, backgroundColor: tintColor }]} />
                </View>
              )}
              {!isLocked && capsule.preview && (
                <Text style={s.previewText}>"{capsule.preview}"</Text>
              )}
            </View>
          );
        })}

        {/* ── AI Note ── */}
        <View style={s.aiCard}>
          <View style={s.aiHeader}>
            <Sparkles size={rs(14)} color={colors.rose} strokeWidth={1.8} />
            <Text style={s.aiLabel}>{t('capsules.aiDiary')}</Text>
          </View>
          <Text style={s.aiText}>
            {t('capsules.aiNote', { name: pet.name })}
          </Text>
          <Text style={s.aiSignature}>— {pet.name}</Text>
        </View>

        <View style={{ height: rs(20) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: rs(20) },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroCard: { backgroundColor: colors.card, borderRadius: rs(22), padding: rs(20), marginTop: rs(8), marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  heroIconWrap: { width: rs(56), height: rs(56), borderRadius: rs(18), backgroundColor: colors.gold + '12', alignItems: 'center', justifyContent: 'center', marginBottom: rs(12) },
  heroLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textGhost, letterSpacing: 2, marginBottom: rs(14) },
  heroStatsRow: { flexDirection: 'row', alignItems: 'center', gap: rs(16) },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(24) },
  heroStatLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, marginTop: rs(2) },
  heroStatDivider: { width: 1, height: rs(28), backgroundColor: colors.border },
  nextUnlock: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(14), backgroundColor: colors.gold + '10', paddingHorizontal: rs(14), paddingVertical: rs(6), borderRadius: rs(10) },
  nextUnlockText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.gold },

  filterRow: { flexDirection: 'row', gap: rs(8), marginBottom: spacing.md },
  filterPill: { flex: 1, paddingVertical: rs(10), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  filterPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.textDim },
  filterTextActive: { color: '#fff' },

  capsuleCard: { backgroundColor: colors.card, borderRadius: rs(18), padding: rs(16), marginBottom: rs(10), borderWidth: 1, borderColor: colors.border },
  capsuleHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(12) },
  capsuleIcon: { width: rs(44), height: rs(44), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  capsuleTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text },
  capsuleMeta: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },
  statusBadge: { paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: rs(8) },
  statusText: { fontFamily: 'Sora_700Bold', fontSize: fs(10) },
  conditionBox: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(12), backgroundColor: colors.bgCard, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(8) },
  conditionText: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textSec, flex: 1 },
  conditionDays: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(12), color: colors.gold },
  progressTrack: { height: rs(4), backgroundColor: colors.border, borderRadius: rs(2), marginTop: rs(10), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: rs(2) },
  previewText: { fontFamily: 'Caveat_400Regular', fontSize: fs(14), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(22), marginTop: rs(12) },

  aiCard: { backgroundColor: colors.rose + '08', borderRadius: rs(18), padding: rs(16), marginTop: rs(6), borderWidth: 1, borderColor: colors.rose + '12' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(10) },
  aiLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.rose, letterSpacing: 0.5 },
  aiText: { fontFamily: 'Caveat_400Regular', fontSize: fs(15), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(24) },
  aiSignature: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'right', marginTop: rs(8) },
});
