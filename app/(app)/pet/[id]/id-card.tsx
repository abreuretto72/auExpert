import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Dog, Cat, QrCode, Share2, FileText, Printer, Wifi,
  Scan, ShieldCheck, CreditCard,
} from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { useAuthStore } from '../../../../stores/authStore';
import { Skeleton } from '../../../../components/Skeleton';

interface QuickAction {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  color: string;
}

interface QrType {
  id: string;
  titleKey: string;
  subtitleKey: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'share', labelKey: 'idCard.share', icon: Share2, color: colors.click },
  { id: 'pdf', labelKey: 'idCard.downloadPdf', icon: FileText, color: colors.warning },
  { id: 'print', labelKey: 'idCard.print', icon: Printer, color: colors.purple },
  { id: 'nfc', labelKey: 'idCard.nfc', icon: Wifi, color: colors.petrol },
];

const QR_TYPES: QrType[] = [
  { id: 'full', titleKey: 'idCard.qrFull', subtitleKey: 'idCard.qrFullDesc', color: colors.success },
  { id: 'lost', titleKey: 'idCard.qrLost', subtitleKey: 'idCard.qrLostDesc', color: colors.danger },
  { id: 'emergency', titleKey: 'idCard.qrEmergency', subtitleKey: 'idCard.qrEmergencyDesc', color: '#F1C40F' },
  { id: 'daycare', titleKey: 'idCard.qrDaycare', subtitleKey: 'idCard.qrDaycareDesc', color: colors.petrol },
];

function IdCardSkeleton() {
  return (
    <View style={s.skeletonWrap}>
      <Skeleton width="100%" height={rs(220)} radius={rs(22)} />
      <Skeleton width="100%" height={rs(180)} radius={rs(18)} style={{ marginTop: rs(16) }} />
      <View style={s.actionGrid}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="48%" height={rs(80)} radius={rs(14)} />
        ))}
      </View>
    </View>
  );
}

function QrPlaceholderGrid() {
  const rows = 5;
  const cols = 5;
  return (
    <View style={s.qrGrid}>
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={s.qrRow}>
          {Array.from({ length: cols }).map((_, c) => (
            <View
              key={c}
              style={[
                s.qrCell,
                { backgroundColor: (r + c) % 3 === 0 ? colors.text : colors.bgCard },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function IdCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: pet, isLoading, refetch } = usePet(id!);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const handleQuickAction = useCallback((actionId: string) => {
    if (actionId === 'pdf') {
      router.push(`/pet/${id}/id-card-pdf` as never);
    }
    // 'share', 'print', 'nfc' — not yet implemented (Task #31 scope is PDF only)
  }, [router, id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const petColor = pet?.species === 'cat' ? colors.purple : colors.click;
  const PetIcon = pet?.species === 'cat' ? Cat : Dog;
  const idNumber = pet?.microchip_id ?? 'PL-2024-00381';

  if (isLoading) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <IdCardSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.click} />
      }
    >
      {/* Section 1: Digital ID Card */}
      <View style={[s.idCard, { borderLeftColor: petColor }]}>
        <View style={s.idCardHeader}>
          <View style={[s.idIconWrap, { backgroundColor: petColor + '18' }]}>
            <PetIcon size={rs(32)} color={petColor} strokeWidth={1.8} />
          </View>
          <View style={s.idBadge}>
            <ShieldCheck size={rs(12)} color={colors.success} strokeWidth={2} />
            <Text style={s.idBadgeText}>{t('idCard.verified')}</Text>
          </View>
        </View>

        <Text style={s.idPetName}>{pet?.name ?? '---'}</Text>
        <Text style={s.idBreed}>
          {pet?.breed ?? t('health.unknown')} · {pet?.estimated_age_months != null ? `${Math.floor(pet.estimated_age_months / 12)}a` : '---'} · {pet?.sex === 'female' ? t('health.female') : t('health.male')}
        </Text>

        <View style={s.idDivider} />

        <View style={s.idInfoRow}>
          <View style={s.idInfoCol}>
            <Text style={s.idInfoLabel}>{t('idCard.tutorLabel')}</Text>
            <Text style={s.idInfoValue}>{user?.full_name ?? user?.email ?? '—'}</Text>
          </View>
          <View style={s.idInfoCol}>
            <Text style={s.idInfoLabel}>{t('idCard.idNumber')}</Text>
            <Text style={s.idInfoValueMono}>{idNumber}</Text>
          </View>
        </View>
      </View>

      {/* Section 2: QR Code Placeholder */}
      <View style={s.qrCard}>
        <QrCode size={rs(48)} color={colors.click} strokeWidth={1.8} />
        <View style={s.qrPlaceholder}>
          <QrPlaceholderGrid />
        </View>
        <Text style={s.qrHint}>{t('idCard.scanHint')}</Text>
      </View>

      {/* Section 3: Quick Actions */}
      <View style={s.actionGrid}>
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <TouchableOpacity
              key={action.id}
              style={[s.actionCard, { borderColor: action.color + '25' }]}
              activeOpacity={0.7}
              onPress={() => handleQuickAction(action.id)}
            >
              <View style={[s.actionIconWrap, { backgroundColor: action.color + '15' }]}>
                <Icon size={rs(22)} color={action.color} strokeWidth={1.8} />
              </View>
              <Text style={s.actionLabel}>{t(action.labelKey)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section 4: Microchip Details */}
      <View style={s.chipCard}>
        <View style={s.chipHeader}>
          <Scan size={rs(20)} color={colors.petrol} strokeWidth={1.8} />
          <Text style={s.chipTitle}>{t('idCard.microchipTitle')}</Text>
        </View>
        <View style={s.chipGrid}>
          <View style={s.chipItem}>
            <Text style={s.chipLabel}>{t('idCard.chipNumber')}</Text>
            <Text style={s.chipValue}>{pet?.microchip_id ?? '---'}</Text>
          </View>
          <View style={s.chipItem}>
            <Text style={s.chipLabel}>{t('idCard.chipStandard')}</Text>
            <Text style={s.chipValue}>ISO 11784</Text>
          </View>
          <View style={s.chipItem}>
            <Text style={s.chipLabel}>{t('idCard.chipImplanted')}</Text>
            <Text style={s.chipValue}>—</Text>
          </View>
          <View style={s.chipItem}>
            <Text style={s.chipLabel}>{t('idCard.chipRegisteredBy')}</Text>
            <Text style={s.chipValue}>—</Text>
          </View>
        </View>
      </View>

      {/* Section 5: QR Types */}
      <Text style={s.sectionTitle}>{t('idCard.qrTypesTitle')}</Text>
      {QR_TYPES.map((qr) => (
        <View key={qr.id} style={s.qrTypeCard}>
          <View style={[s.qrTypeDot, { backgroundColor: qr.color }]} />
          <View style={s.qrTypeText}>
            <Text style={s.qrTypeTitle}>{t(qr.titleKey)}</Text>
            <Text style={s.qrTypeSub}>{t(qr.subtitleKey)}</Text>
          </View>
        </View>
      ))}

      <View style={{ height: rs(32) }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: rs(16),
  },
  skeletonWrap: {
    gap: rs(16),
  },

  /* ID Card */
  idCard: {
    backgroundColor: colors.bgCard,
    borderRadius: rs(22),
    padding: rs(20),
    borderLeftWidth: rs(4),
    marginBottom: rs(16),
  },
  idCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(12),
  },
  idIconWrap: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: rs(8),
    gap: rs(4),
  },
  idBadgeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.success,
    letterSpacing: 0.3,
  },
  idPetName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(24),
    color: colors.text,
    marginBottom: rs(2),
  },
  idBreed: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    marginBottom: rs(14),
  },
  idDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: rs(14),
  },
  idInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  idInfoCol: {
    flex: 1,
  },
  idInfoLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  idInfoValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
  },
  idInfoValueMono: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(12),
    color: colors.text,
  },

  /* QR Card */
  qrCard: {
    backgroundColor: colors.card,
    borderRadius: rs(18),
    padding: rs(20),
    alignItems: 'center',
    marginBottom: rs(16),
    gap: rs(12),
  },
  qrPlaceholder: {
    width: rs(120),
    height: rs(120),
    borderRadius: rs(8),
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    padding: rs(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrGrid: {
    gap: rs(3),
  },
  qrRow: {
    flexDirection: 'row',
    gap: rs(3),
  },
  qrCell: {
    width: rs(16),
    height: rs(16),
    borderRadius: rs(2),
  },
  qrHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    textAlign: 'center',
  },

  /* Quick Actions */
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: rs(10),
    marginBottom: rs(16),
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    alignItems: 'center',
    borderWidth: 1,
    gap: rs(8),
  },
  actionIconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.text,
  },

  /* Microchip Details */
  chipCard: {
    backgroundColor: colors.card,
    borderRadius: rs(18),
    padding: rs(18),
    marginBottom: rs(20),
  },
  chipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(14),
  },
  chipTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(12),
  },
  chipItem: {
    width: '46%',
  },
  chipLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  chipValue: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },

  /* Section Title */
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: rs(10),
  },

  /* QR Types */
  qrTypeCard: {
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rs(8),
  },
  qrTypeDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rs(5),
  },
  qrTypeText: {
    flex: 1,
  },
  qrTypeTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
  },
  qrTypeSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    marginTop: rs(2),
  },
});
