/**
 * /professional/agents/asa — Agente IA #4: Atestado de Saude Animal.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Sparkles, AlertTriangle, ShieldCheck, Bug, Plane, FileCheck2,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../components/Toast';
import { useProAgent, type AsaResponse } from '../../../../hooks/useProAgent';
import { SignDocumentButton } from '../../../../components/professional/SignDocumentButton';
import { AgentVoiceInput } from '../../../../components/professional/AgentVoiceInput';
import { getErrorMessage } from '../../../../utils/errorMessages';

export default function AsaAgentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { run, isPending } = useProAgent<
    { pet_id: string; purpose: string; destination?: string; transport_company?: string; language: string },
    AsaResponse
  >('agent-asa');

  const [purpose, setPurpose] = useState('');
  const [destination, setDestination] = useState('');
  const [transport, setTransport] = useState('');
  const [result, setResult] = useState<AsaResponse | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!petId) {
      toast(t('agents.errors.missingPet'), 'error');
      return;
    }
    if (purpose.trim().length < 3) {
      toast(t('agents.asa.purposeHint'), 'warning');
      return;
    }
    try {
      const data = await run({
        pet_id: petId,
        purpose: purpose.trim(),
        destination: destination.trim() || undefined,
        transport_company: transport.trim() || undefined,
        language: i18n.language,
      });
      setResult(data);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  }, [petId, purpose, destination, transport, run, toast, t, i18n.language]);

  if (!petId) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.errorBox}>
          <AlertTriangle size={rs(28)} color={colors.warning} strokeWidth={1.6} />
          <Text style={s.errorTxt}>{t('agents.errors.missingPet')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('agents.asa.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <FileCheck2 size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.asa.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agents.asa.heroDesc')}</Text>
        </View>

        {!result ? (
          <>
            <Text style={s.label}>{t('agents.asa.purpose')} *</Text>
            <AgentVoiceInput
              ocrDocType="vaccine"
              onText={(text, append) => setPurpose((prev) => append ? `${prev} ${text}`.trim() : text)}
            />
            <TextInput
              style={s.input} value={purpose} onChangeText={setPurpose}
              placeholder={t('agents.asa.purposeHint')} placeholderTextColor={colors.textDim}
            />
            <Text style={[s.label, { marginTop: spacing.sm }]}>{t('agents.asa.destination')}</Text>
            <TextInput
              style={s.input} value={destination} onChangeText={setDestination}
              placeholder="São Paulo, BR" placeholderTextColor={colors.textDim}
            />
            <Text style={[s.label, { marginTop: spacing.sm }]}>{t('agents.asa.transport')}</Text>
            <TextInput
              style={s.input} value={transport} onChangeText={setTransport}
              placeholder="Latam Cargo / próprio" placeholderTextColor={colors.textDim}
            />

            <TouchableOpacity
              style={[s.primaryBtn, isPending && s.primaryBtnDisabled]}
              onPress={handleGenerate}
              disabled={isPending}
              activeOpacity={0.85}
            >
              {isPending ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.primaryBtnTxt}>{t('agents.generating')}</Text>
                </>
              ) : (
                <>
                  <Sparkles size={rs(18)} color="#fff" strokeWidth={2} />
                  <Text style={s.primaryBtnTxt}>{t('agents.generate')}</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View
              style={[
                s.banner,
                result.fit_for_travel ? s.bannerSuccess : s.bannerWarning,
              ]}
            >
              <Plane
                size={rs(18)}
                color={result.fit_for_travel ? colors.success : colors.warning}
                strokeWidth={1.8}
              />
              <Text
                style={[
                  s.bannerTxt,
                  { color: result.fit_for_travel ? colors.success : colors.warning },
                ]}
              >
                {result.fit_for_travel ? t('agents.asa.fitForTravel') : t('agents.asa.alerts')}
              </Text>
            </View>

            <View style={s.row2}>
              <CheckPill icon={ShieldCheck} label={t('agents.asa.vaccinesUpToDate')} ok={result.vaccines_up_to_date} />
              <CheckPill icon={Bug} label={t('agents.asa.parasiteOk')} ok={result.parasite_control_ok} />
            </View>

            {result.clinical_findings && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('agents.asa.clinicalFindings')}</Text>
                <Text style={s.cardBody}>{result.clinical_findings}</Text>
              </View>
            )}

            {result.observations && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Observações</Text>
                <Text style={s.cardBody}>{result.observations}</Text>
              </View>
            )}

            {result.alerts.length > 0 && (
              <View style={s.alertsCard}>
                <View style={s.alertsHeader}>
                  <AlertTriangle size={rs(16)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={s.alertsTitle}>{t('agents.asa.alerts')}</Text>
                </View>
                {result.alerts.map((a, i) => (
                  <Text key={i} style={s.alertItem}>• {a}</Text>
                ))}
              </View>
            )}

            {result.fit_for_travel && (
              <View style={{ marginTop: spacing.lg }}>
                <SignDocumentButton
                  targetTable="atestados_saude"
                  targetId={result.id}
                  payload={{
                    purpose: purpose.trim(),
                    destination: destination.trim() || null,
                    transport_company: transport.trim() || null,
                    vaccines_up_to_date: result.vaccines_up_to_date,
                    parasite_control_ok: result.parasite_control_ok,
                    fit_for_travel: result.fit_for_travel,
                    clinical_findings: result.clinical_findings,
                    observations: result.observations,
                  }}
                  onSigned={() => router.back()}
                />
              </View>
            )}

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: spacing.sm }]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={s.secondaryBtnTxt}>{t('common.back')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckPill({
  icon: Icon, label, ok,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  ok: boolean;
}) {
  return (
    <View style={[s.pill, ok ? s.pillOk : s.pillBad]}>
      <Icon size={rs(16)} color={ok ? colors.success : colors.danger} strokeWidth={1.8} />
      <Text style={[s.pillLabel, { color: ok ? colors.success : colors.danger }]}>{label}</Text>
    </View>
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

  label: { color: colors.text, fontSize: fs(12), fontWeight: '700', marginBottom: rs(6), letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), color: colors.text, fontSize: fs(13),
    minHeight: rs(44),
  },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, paddingVertical: rs(14), borderRadius: radii.lg,
    marginTop: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: rs(12), borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.click, alignItems: 'center',
  },
  secondaryBtnTxt: { color: colors.click, fontSize: fs(13), fontWeight: '700' },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    borderRadius: radii.lg, padding: rs(12),
    marginBottom: spacing.md, borderWidth: 1,
  },
  bannerSuccess: { backgroundColor: colors.success + '15', borderColor: colors.success + '40' },
  bannerWarning: { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' },
  bannerTxt: { fontSize: fs(13), fontWeight: '700' },

  row2: { flexDirection: 'row', gap: rs(10), marginBottom: spacing.md },
  pill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: rs(6),
    borderRadius: radii.lg, padding: rs(10), borderWidth: 1,
  },
  pillOk: { backgroundColor: colors.success + '12', borderColor: colors.success + '30' },
  pillBad: { backgroundColor: colors.danger + '12', borderColor: colors.danger + '30' },
  pillLabel: { fontSize: fs(11), fontWeight: '700' },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10),
  },
  cardTitle: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', marginBottom: rs(6), textTransform: 'uppercase' },
  cardBody: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },

  alertsCard: {
    backgroundColor: colors.warning + '12', borderWidth: 1, borderColor: colors.warning + '40',
    borderRadius: radii.lg, padding: rs(14), gap: rs(6),
  },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4) },
  alertsTitle: { color: colors.warning, fontSize: fs(11), fontWeight: '700', textTransform: 'uppercase' },
  alertItem: { color: colors.text, fontSize: fs(12), lineHeight: fs(18), fontWeight: '600' },
});
