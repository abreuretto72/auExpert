/**
 * /professional/dashboard — Dashboard inicial do profissional após cadastro.
 *
 * Estado atual: PLACEHOLDER. A landing real do profissional segue sendo
 * /pro/index ("Meus Pacientes"), que lista os grants ativos via RPC
 * `get_my_patients`.
 *
 * Este arquivo existe como destino do redirect pós-cadastro
 * (router.replace('/(app)/professional/dashboard')) e oferece um caminho
 * único e estável pra tela inicial. Quando ele crescer (estatísticas, agenda,
 * convites pendentes), passa a ser a landing oficial e /pro/index pode virar
 * sub-rota "/professional/patients".
 *
 * Por enquanto: cartão de boas-vindas + 2 atalhos pros 2 fluxos relevantes.
 */
import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Sparkles, Users, UserCircle2, ChevronRight,
} from 'lucide-react-native';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import { useMyProfessional } from '../../../hooks/useProfessional';

export default function ProfessionalDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { professional, isLoading } = useMyProfessional();

  // Sem perfil ativo → manda pra tela de cadastro
  React.useEffect(() => {
    if (!isLoading && !professional) {
      router.replace('/(app)/professional/register' as never);
    }
  }, [isLoading, professional, router]);

  const goToPatients = useCallback(() => {
    router.push('/pro' as never);
  }, [router]);

  const goToHub = useCallback(() => {
    router.replace('/' as never);
  }, [router]);

  if (isLoading || !professional) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.click} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToHub} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('professional.dashboardTitle')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Sparkles size={rs(24)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={styles.welcomeTitle}>
            {t('professional.welcomeTitle', { name: professional.display_name })}
          </Text>
          <Text style={styles.welcomeText}>
            {t('professional.welcomeText')}
          </Text>
        </View>

        {/* Profile summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('professional.professionalType')}</Text>
            <Text style={styles.summaryValue}>
              {t(`onboarding.pro.type.${professional.professional_type}`)}
            </Text>
          </View>
          {professional.council_name && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('professional.councilName')}</Text>
              <Text style={styles.summaryValue}>
                {professional.council_name}
                {professional.council_number ? ` ${professional.council_number}` : ''}
              </Text>
            </View>
          )}
          {professional.specialties && professional.specialties.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('professional.specialties')}</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {professional.specialties.slice(0, 3).join(', ')}
                {professional.specialties.length > 3 ? '…' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Atalhos */}
        <Text style={styles.sectionLabel}>{t('professional.actions')}</Text>

        <TouchableOpacity style={styles.actionRow} onPress={goToPatients} activeOpacity={0.7}>
          <View style={styles.actionIcon}>
            <Users size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{t('professional.patientsAction')}</Text>
            <Text style={styles.actionSub}>{t('professional.patientsActionSub')}</Text>
          </View>
          <ChevronRight size={rs(20)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} onPress={goToHub} activeOpacity={0.7}>
          <View style={styles.actionIcon}>
            <UserCircle2 size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{t('professional.backToHub')}</Text>
            <Text style={styles.actionSub}>{t('professional.backToHubSub')}</Text>
          </View>
          <ChevronRight size={rs(20)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
  scroll: { padding: spacing.md, paddingBottom: rs(40) },

  welcomeCard: {
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing,
    borderRadius: radii.card, padding: rs(20), alignItems: 'center', gap: rs(8),
    marginBottom: spacing.md,
  },
  welcomeIcon: {
    width: rs(48), height: rs(48), borderRadius: rs(24),
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
    marginBottom: rs(4),
  },
  welcomeTitle: {
    color: colors.text, fontSize: fs(16), fontWeight: '700', textAlign: 'center',
  },
  welcomeText: {
    color: colors.textSec, fontSize: fs(12), textAlign: 'center', lineHeight: fs(18),
  },

  summaryCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), gap: rs(10), marginBottom: spacing.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: rs(12) },
  summaryLabel: { color: colors.textDim, fontSize: fs(11), fontWeight: '600', flexShrink: 0 },
  summaryValue: { color: colors.text, fontSize: fs(12), fontWeight: '600', flex: 1, textAlign: 'right' },

  sectionLabel: {
    color: colors.text, fontSize: fs(13), fontWeight: '700',
    marginTop: spacing.sm, marginBottom: spacing.xs, letterSpacing: 0.3,
  },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10),
  },
  actionIcon: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
  actionSub: { color: colors.textDim, fontSize: fs(11), marginTop: rs(2), lineHeight: fs(15) },
});
