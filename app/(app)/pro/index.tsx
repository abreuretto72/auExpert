/**
 * /pro/index — "Meus Pacientes" (landing do módulo profissional).
 *
 * Quem vê essa tela:
 *   - User autenticado COM linha em `professionals` (is_active = true).
 *   - Sem profissional ativo → redireciona pra /pro/onboarding (guard abaixo).
 *
 * O que mostra:
 *   - Header: logo + "Olá, {display_name}" + refresh icon.
 *   - Lista de pacientes via `useMyPatients()` (RPC `get_my_patients`).
 *   - Empty state quando não há grants ativos (ainda não aceitou convite ou todos expiraram).
 *   - Offline banner quando sem rede (serve do cache do RQ).
 *   - Pull-to-refresh.
 *   - Tap no card → navega pra /pro/pet/[id] (implementado em 2.5.4).
 *
 * Sem FAB de "adicionar paciente" — o fluxo é sempre iniciado pelo tutor via convite.
 */
import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RefreshCw, WifiOff, Users, UserPlus } from 'lucide-react-native';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import AuExpertLogo from '../../../components/AuExpertLogo';
import PatientCard from '../../../components/PatientCard';
import { useMyProfessional } from '../../../hooks/useProfessional';
import { useMyPatients, type MyPatient } from '../../../hooks/useMyPatients';
import { useNetwork } from '../../../hooks/useNetwork';

// ── Skeleton placeholder ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonAvatar} />
        <View style={{ flex: 1, marginLeft: rs(12) }}>
          <View style={[styles.skeletonLine, { width: '60%', height: rs(14) }]} />
          <View style={[styles.skeletonLine, { width: '40%', height: rs(10), marginTop: rs(8) }]} />
          <View style={[styles.skeletonLine, { width: '70%', height: rs(10), marginTop: rs(6) }]} />
        </View>
      </View>
    </View>
  );
}

// ── Empty + error states ────────────────────────────────────────────────────

function EmptyState() {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconWrap}>
        <UserPlus size={rs(40)} color={colors.click} strokeWidth={1.6} />
      </View>
      <Text style={styles.emptyTitle}>{t('pro.patients.emptyTitle')}</Text>
      <Text style={styles.emptyText}>{t('pro.patients.emptyText')}</Text>
    </View>
  );
}

function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <View style={styles.offlineBanner}>
      <WifiOff size={rs(14)} color={colors.warning} strokeWidth={2} />
      <Text style={styles.offlineText}>{t('pro.patients.offline')}</Text>
    </View>
  );
}

// ── Tela ─────────────────────────────────────────────────────────────────────

export default function ProPatientsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetwork();
  const { professional, isLoading: profLoading } = useMyProfessional();
  const { patients, isLoading, isFetching, error, refetch } = useMyPatients();

  // Guard: sem profissional → onboarding. Após profLoading=false.
  React.useEffect(() => {
    if (!profLoading && !professional) {
      router.replace('/pro/onboarding' as never);
    }
  }, [profLoading, professional, router]);

  const handlePressPatient = useCallback((p: MyPatient) => {
    router.push({
      pathname: '/pro/pet/[id]',
      params: { id: p.pet_id, grantId: p.grant_id },
    } as never);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: MyPatient }) => (
    <PatientCard
      patient={item}
      onPress={() => handlePressPatient(item)}
    />
  ), [handlePressPatient]);

  const keyExtractor = useCallback((item: MyPatient) => item.grant_id, []);

  // Loading inicial (sem cache ainda)
  const showSkeleton = isLoading && patients.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AuExpertLogo size="small" />

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => refetch()}
          disabled={isFetching}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          {isFetching ? (
            <ActivityIndicator size={rs(16)} color={colors.click} />
          ) : (
            <RefreshCw size={rs(18)} color={colors.click} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>

      {/* Title block */}
      <View style={styles.titleBlock}>
        <View style={styles.titleRow}>
          <Users size={rs(22)} color={colors.click} strokeWidth={1.8} />
          <Text style={styles.title}>{t('pro.patients.title')}</Text>
        </View>
        {professional?.display_name ? (
          <Text style={styles.subtitle}>
            {t('pro.patients.greeting', { name: professional.display_name })}
          </Text>
        ) : null}
        {!showSkeleton && !error ? (
          <Text style={styles.count}>
            {t('pro.patients.count', { count: patients.length })}
          </Text>
        ) : null}
      </View>

      {!isOnline ? <OfflineBanner /> : null}

      {/* Content */}
      {showSkeleton ? (
        <View style={styles.listPadding}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('pro.patients.errorGeneric')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => refetch()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={patients}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && patients.length > 0}
              onRefresh={refetch}
              tintColor={colors.click}
              colors={[colors.click]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.sm),
    paddingBottom: rs(spacing.md),
  },
  refreshBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: colors.click + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.md),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(24),
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    marginTop: rs(4),
  },
  count: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(6),
    letterSpacing: rs(0.3),
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginHorizontal: rs(spacing.md),
    marginBottom: rs(spacing.sm),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderRadius: rs(radii.md),
    backgroundColor: colors.warning + '1F',
    borderWidth: rs(1),
    borderColor: colors.warning + '40',
  },
  offlineText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.warning,
    flex: 1,
  },
  listPadding: {
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.xxl),
    flexGrow: 1,
  },
  // Skeleton
  skeletonCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: rs(1),
    borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    backgroundColor: colors.bgCard,
  },
  skeletonLine: {
    backgroundColor: colors.bgCard,
    borderRadius: rs(6),
  },
  // Empty
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(spacing.xxl),
    paddingHorizontal: rs(spacing.lg),
  },
  emptyIconWrap: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(24),
    backgroundColor: colors.click + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.md),
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
    textAlign: 'center',
    marginBottom: rs(8),
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: rs(19),
  },
  // Error
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(spacing.xxl),
    paddingHorizontal: rs(spacing.lg),
  },
  errorText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(14),
    color: colors.danger,
    textAlign: 'center',
    marginBottom: rs(spacing.md),
  },
  retryBtn: {
    paddingHorizontal: rs(spacing.lg),
    paddingVertical: rs(spacing.sm),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.click,
  },
  retryText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: '#FFFFFF',
  },
});
