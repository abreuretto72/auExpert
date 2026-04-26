/**
 * components/professional/AgentsTabEmbed.tsx
 *
 * Versão embed do hub de agentes pra renderizar dentro da aba AGENTES da
 * ficha do paciente (visão do vet). Diferencas vs /professional/agents/index:
 *   - Sem header proprio (vai dentro de uma aba)
 *   - Sem hero card grande (a ficha ja tem o header do pet)
 *   - Mesma logica de gating Elite via usePetAgentAccess
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Stethoscope, FileText, Pill, FileCheck2, FileSignature,
  ShieldAlert, Heart, ChevronRight, Lock,
} from 'lucide-react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { usePetAgentAccess, type AgentSlug } from '../../hooks/usePetAgentAccess';

interface AgentDef {
  slug: AgentSlug;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  titleKey: string;
  descKey: string;
}

const AGENTS: readonly AgentDef[] = [
  { slug: 'anamnese',    icon: Stethoscope,   titleKey: 'agents.anamnese.title',    descKey: 'agents.anamnese.heroDesc' },
  { slug: 'prontuario',  icon: FileText,      titleKey: 'agents.prontuario.title',  descKey: 'agents.prontuario.heroDesc' },
  { slug: 'receituario', icon: Pill,          titleKey: 'agents.receituario.title', descKey: 'agents.receituario.heroDesc' },
  { slug: 'asa',         icon: FileCheck2,    titleKey: 'agents.asa.title',         descKey: 'agents.asa.heroDesc' },
  { slug: 'tci',         icon: FileSignature, titleKey: 'agents.tci.title',         descKey: 'agents.tci.heroDesc' },
  { slug: 'notificacao', icon: ShieldAlert,   titleKey: 'agents.notificacao.title', descKey: 'agents.notificacao.heroDesc' },
  { slug: 'alta',        icon: Heart,         titleKey: 'agents.alta.title',        descKey: 'agents.alta.heroDesc' },
] as const;

interface Props {
  petId: string;
}

export function AgentsTabEmbed({ petId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const access = usePetAgentAccess(petId);

  const allBlocked = access.data &&
    !access.data.anamnese && !access.data.prontuario && !access.data.receituario &&
    !access.data.asa && !access.data.tci && !access.data.notificacao && !access.data.alta;

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
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
  );
}

const s = StyleSheet.create({
  scroll: { padding: spacing.md, paddingBottom: rs(40) },
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
