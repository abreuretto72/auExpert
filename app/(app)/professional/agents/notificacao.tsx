/**
 * /professional/agents/notificacao — Agente IA #6: Notificação sanitária.
 *
 * Vet digita doença suspeita → IA decide se é notifiable + canal + ficha.
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
  ChevronLeft, Sparkles, AlertTriangle, ShieldAlert, CheckCircle, Building2,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../components/Toast';
import { useProAgent, type NotificacaoResponse } from '../../../../hooks/useProAgent';
import { AgentVoiceInput } from '../../../../components/professional/AgentVoiceInput';
import { getErrorMessage } from '../../../../utils/errorMessages';

export default function NotificacaoAgentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { run, isPending } = useProAgent<
    { pet_id: string; disease_name: string; language: string },
    NotificacaoResponse
  >('agent-notificacao');

  const [diseaseName, setDiseaseName] = useState('');
  const [result, setResult] = useState<NotificacaoResponse | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!petId) { toast(t('agents.errors.missingPet'), 'error'); return; }
    if (diseaseName.trim().length < 3) {
      toast(t('agents.notificacao.diseaseName'), 'warning'); return;
    }
    try {
      const data = await run({
        pet_id: petId,
        disease_name: diseaseName.trim(),
        language: i18n.language,
      });
      setResult(data);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  }, [petId, diseaseName, run, toast, t, i18n.language]);

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
        <Text style={s.headerTitle}>{t('agents.notificacao.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <ShieldAlert size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.notificacao.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agents.notificacao.heroDesc')}</Text>
        </View>

        {!result ? (
          <>
            <Text style={s.label}>{t('agents.notificacao.diseaseName')} *</Text>
            <AgentVoiceInput
              ocrDocType="general"
              showCamera={false}
              onText={(text, append) => setDiseaseName((prev) => append ? `${prev} ${text}`.trim() : text)}
            />
            <TextInput
              style={s.input} value={diseaseName} onChangeText={setDiseaseName}
              placeholder="Ex: Raiva, Leishmaniose Visceral, Brucelose..."
              placeholderTextColor={colors.textDim}
            />
            <TouchableOpacity
              style={[s.primaryBtn, isPending && s.primaryBtnDisabled]}
              onPress={handleGenerate} disabled={isPending} activeOpacity={0.85}
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
            {/* Banner */}
            <View
              style={[
                s.banner,
                result.is_notifiable ? s.bannerWarning : s.bannerSuccess,
              ]}
            >
              {result.is_notifiable ? (
                <ShieldAlert size={rs(20)} color={colors.warning} strokeWidth={1.8} />
              ) : (
                <CheckCircle size={rs(20)} color={colors.success} strokeWidth={1.8} />
              )}
              <Text
                style={[
                  s.bannerTxt,
                  { color: result.is_notifiable ? colors.warning : colors.success },
                ]}
              >
                {result.is_notifiable
                  ? t('agents.notificacao.isNotifiable')
                  : t('agents.notificacao.notNotifiable')}
              </Text>
            </View>

            {result.is_notifiable && (
              <>
                {/* Suspeita + CID */}
                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Text style={s.metaLabel}>{t('agents.notificacao.suspicionLevel')}</Text>
                    <Text style={s.metaValue}>
                      {t(`agents.notificacao.suspicion.${result.suspicion_level}`)}
                    </Text>
                  </View>
                  {result.cid_code && (
                    <View style={s.metaItem}>
                      <Text style={s.metaLabel}>{t('agents.notificacao.cidCode')}</Text>
                      <Text style={s.metaValue}>{result.cid_code}</Text>
                    </View>
                  )}
                </View>

                {/* Agência */}
                {result.notified_agency && (
                  <View style={s.agencyCard}>
                    <View style={s.agencyHeader}>
                      <Building2 size={rs(16)} color={colors.click} strokeWidth={1.8} />
                      <Text style={s.agencyTitle}>{t('agents.notificacao.agency')}</Text>
                    </View>
                    <Text style={s.agencyValue}>{result.notified_agency}</Text>
                  </View>
                )}

                {/* Observações */}
                {result.observations && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Detalhes</Text>
                    <Text style={s.cardBody}>{result.observations}</Text>
                  </View>
                )}

                {/* Próximos passos */}
                {result.next_steps.length > 0 && (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>{t('agents.notificacao.nextSteps')}</Text>
                    {result.next_steps.map((step, i) => (
                      <Text key={i} style={s.stepItem}>{i + 1}. {step}</Text>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Alertas (mesmo se não-notifiable) */}
            {result.alerts.length > 0 && (
              <View style={s.alertsCard}>
                <View style={s.alertsHeader}>
                  <AlertTriangle size={rs(16)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={s.alertsTitle}>{t('agents.notificacao.alerts')}</Text>
                </View>
                {result.alerts.map((a, i) => (
                  <Text key={i} style={s.alertItem}>• {a}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: spacing.lg }]}
              onPress={() => router.back()} activeOpacity={0.7}
            >
              <Text style={s.secondaryBtnTxt}>OK</Text>
            </TouchableOpacity>
          </>
        )}
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

  label: { color: colors.text, fontSize: fs(12), fontWeight: '700', marginBottom: rs(6) },
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
    flexDirection: 'row', alignItems: 'center', gap: rs(10),
    borderRadius: radii.lg, padding: rs(14),
    marginBottom: spacing.md, borderWidth: 1,
  },
  bannerSuccess: { backgroundColor: colors.success + '15', borderColor: colors.success + '40' },
  bannerWarning: { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' },
  bannerTxt: { fontSize: fs(13), fontWeight: '700', flex: 1 },

  metaRow: { flexDirection: 'row', gap: rs(10), marginBottom: spacing.md },
  metaItem: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12),
  },
  metaLabel: { color: colors.textDim, fontSize: fs(10), fontWeight: '700', textTransform: 'uppercase', marginBottom: rs(4) },
  metaValue: { color: colors.text, fontSize: fs(13), fontWeight: '700', textTransform: 'capitalize' },

  agencyCard: {
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing,
    borderRadius: radii.lg, padding: rs(14), marginBottom: spacing.md,
  },
  agencyHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  agencyTitle: { color: colors.click, fontSize: fs(11), fontWeight: '700', textTransform: 'uppercase' },
  agencyValue: { color: colors.text, fontSize: fs(13), fontWeight: '600' },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10),
  },
  cardTitle: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', marginBottom: rs(8), textTransform: 'uppercase' },
  cardBody: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },
  stepItem: { color: colors.text, fontSize: fs(12), lineHeight: fs(18), marginBottom: rs(4) },

  alertsCard: {
    backgroundColor: colors.warning + '12', borderWidth: 1, borderColor: colors.warning + '40',
    borderRadius: radii.lg, padding: rs(14), gap: rs(6), marginTop: rs(10),
  },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4) },
  alertsTitle: { color: colors.warning, fontSize: fs(11), fontWeight: '700', textTransform: 'uppercase' },
  alertItem: { color: colors.text, fontSize: fs(12), lineHeight: fs(18), fontWeight: '600' },
});
