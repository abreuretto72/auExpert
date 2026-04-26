/**
 * /professional/agents — Hub dos 7 agentes IA.
 *
 * Lista os agentes disponíveis para o profissional. Cada card navega pra
 * tela específica do agente passando petId via query string.
 *
 * Gating por plano: usePetAgentAccess(petId) retorna quais agentes o tutor
 * DONO do pet contratou. Agentes bloqueados aparecem com cadeado + label
 * "Plano superior" e nao navegam ao serem tocados.
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Stethoscope, FileText, Pill, FileCheck2, FileSignature,
  ShieldAlert, Heart, Sparkles, ChevronRight, AlertTriangle, Lock,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { usePetAgentAccess, type AgentSlug } from '../../../../hooks/usePetAgentAccess';

interface AgentDef {
  slug: AgentSlug;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  titleKey: string;
  descKey: string;
}

const AGENTS: readonly AgentDef[] = [
  { slug: 'anamnese',    icon: Stethoscope,    titleKey: 'agents.anamnese.title',    descKey: 'agents.anamnese.heroDesc' },
  { slug: 'prontuario',  icon: FileText,       titleKey: 'agents.prontuario.title',  descKey: 'agents.prontuario.heroDesc' },
  { slug: 'receituario', icon: Pill,           titleKey: 'agents.receituario.title', descKey: 'agents.receituario.heroDesc' },
  { slug: 'asa',         icon: FileCheck2,     titleKey: 'agents.asa.title',         descKey: 'agents.asa.heroDesc' },
  { slug: 'tci',         icon: FileSignature,  titleKey: 'agents.tci.title',         descKey: 'agents.tci.heroDesc' },
  { slug: 'notificacao', icon: ShieldAlert,    titleKey: 'agents.notificacao.title', descKey: 'agents.notificacao.heroDesc' },
  { slug: 'alta',        icon: Heart,          titleKey: 'agents.alta.title',        descKey: 'agents.alta.heroDesc' },
] as const;

export default function AgentsHubScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const access = usePetAgentAccess(petId);

  if (!petId) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.errorBox}>
          <AlertTriangle size={rs(28)} color={colors.warning} strokeWidth={1.6} />
          <Text style={s.errorTxt}>{t('agents.errors.missingPet')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backBtnTxt}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allBlocked = access.data &&
    !access.data.anamnese && !access.data.prontuario && !access.data.receituario &&
    !access.data.asa && !access.data.tci && !access.data.notificacao && !access.data.alta;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('agentsHub.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Sparkles size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agentsHub.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agentsHub.heroDesc')}</Text>
        </View>

        {access.isLoading && (
          <View style={s.loadingBox}><ActivityIndicator size="small" color={colors.click} /></View>
        )}

        {!access.isLoading && allBlocked && (
          <View style={s.upgradeBanner}>
            <Lock size={rs(18)} color={colors.warning} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.upgradeTitle}>{t('agentsHub.upgradeTitle')}</Text>
              <Text style={s.upgradeDesc}>{t('agentsHub.upgradeDesc')}</Text>
            </View>
          </View>
        )}

        {!access.isLoading && AGENTS.map((agent) => {
          const Icon = agent.icon;
          const allowed = access.data?.[agent.slug] ?? false;

          return (
            <TouchableOpacity
              key={agent.slug}
              style={[s.row, !allowed && s.rowBlocked]}
              activeOpacity={allowed ? 0.7 : 1}
              disabled={!allowed}
              onPress={() => allowed && router.push(`/(app)/professional/agents/${agent.slug}?petId=${petId}` as never)}
            >
              <View style={[s.rowIcon, !allowed && s.rowIconBlocked]}>
                {allowed
                  ? <Icon size={rs(20)} color={colors.click} strokeWidth={1.8} />
                  : <Lock size={rs(18)} color={colors.textDim} strokeWidth={1.8} />
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.rowTitle, !allowed && s.rowTitleBlocked]}>{t(agent.titleKey)}</Text>
                <Text style={s.rowDesc} numberOfLines={2}>
                  {allowed ? t(agent.descKey) : t('agentsHub.notInPlan')}
                </Text>
              </View>
              {allowed && <ChevronRight size={rs(18)} color={colors.click} strokeWidth={1.8} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
  scroll: { padding: spacing.md, paddingBottom: rs(40) },

  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12), padding: spacing.lg },
  errorTxt: { color: colors.text, fontSize: fs(13), textAlign: 'center' },
  backBtn: { paddingHorizontal: rs(20), paddingVertical: rs(10), borderRadius: radii.lg, backgroundColor: colors.click },
  backBtnTxt: { color: '#fff', fontSize: fs(13), fontWeight: '700' },

  heroCard: {
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing,
    borderRadius: radii.card, padding: rs(18), alignItems: 'center', gap: rs(8),
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: rs(44), height: rs(44), borderRadius: rs(22),
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { color: colors.text, fontSize: fs(15), fontWeight: '700', textAlign: 'center' },
  heroDesc: { color: colors.textSec, fontSize: fs(12), textAlign: 'center', lineHeight: fs(18) },

  loadingBox: { padding: rs(20), alignItems: 'center' },

  upgradeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: rs(10),
    backgroundColor: colors.warning + '12', borderWidth: 1, borderColor: colors.warning + '40',
    borderRadius: radii.lg, padding: rs(14), marginBottom: spacing.md,
  },
  upgradeTitle: { color: colors.warning, fontSize: fs(13), fontWeight: '700' },
  upgradeDesc: { color: colors.textSec, fontSize: fs(11), marginTop: rs(2), lineHeight: fs(16) },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10),
  },
  rowBlocked: { opacity: 0.55 },
  rowIcon: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center',
  },
  rowIconBlocked: { backgroundColor: colors.bgDeep },
  rowTitle: { color: colors.text, fontSize: fs(14), fontWeight: '700' },
  rowTitleBlocked: { color: colors.textSec },
  rowDesc: { color: colors.textDim, fontSize: fs(11), marginTop: rs(2), lineHeight: fs(16) },
});
