/**
 * /professional/agents/anamnese — Agente IA #1: briefing pré-consulta.
 *
 * Tela TEMPLATE pros 7 agentes. Padrão:
 *   1. Recebe pet_id via query string
 *   2. Botão "Gerar com IA" → chama EF agent-anamnese
 *   3. Exibe preview do briefing gerado
 *   4. Vet revisa (somente leitura nesta tela — anamnese não é assinada)
 *   5. Volta pro dashboard
 *
 * As outras 6 telas (prontuario, receituario, tci, asa, notificacao, alta)
 * vão clonar este padrão. Diferença: as que persistem em tabela têm botão
 * "Editar" + "Assinar e Salvar" no final; anamnese é só consulta.
 *
 * Permissão: só profissional ativo com access_grant. A EF valida; aqui só
 * tomamos cuidado de redirecionar se faltar pet_id.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Sparkles, AlertTriangle, ArrowRight,
  Stethoscope, Pill, ShieldCheck, MessageSquare, TrendingUp, Activity,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../components/Toast';
import { useProAgent, type AnamneseResponse } from '../../../../hooks/useProAgent';
import { getErrorMessage } from '../../../../utils/errorMessages';

export default function AnamneseAgentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { run, isPending } = useProAgent<{ pet_id: string; language: string }, AnamneseResponse>('agent-anamnese');
  const [result, setResult] = useState<AnamneseResponse | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!petId) {
      toast(t('agents.errors.missingPet'), 'error');
      return;
    }
    try {
      const data = await run({ pet_id: petId, language: i18n.language });
      setResult(data);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  }, [petId, run, toast, t, i18n.language]);

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

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('agents.anamnese.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Sparkles size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.anamnese.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agents.anamnese.heroDesc')}</Text>
        </View>

        {!result && (
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
        )}

        {result && (
          <>
            {/* Pet summary */}
            <Section icon={Stethoscope} title={t('agents.anamnese.petSummary')}>
              <Text style={s.bodyText}>{result.pet_summary ?? t('agents.empty')}</Text>
            </Section>

            {/* Vacinas status + tendência peso */}
            <View style={s.row2}>
              <StatusPill
                icon={ShieldCheck}
                label={t('agents.anamnese.vaccinesStatus')}
                value={result.vaccines_status}
                tone={result.vaccines_status === 'em dia' ? 'success' : 'warning'}
              />
              <StatusPill
                icon={TrendingUp}
                label={t('agents.anamnese.weightTrend')}
                value={result.weight_trend}
                tone={result.weight_trend === 'estavel' ? 'success' : 'info'}
              />
            </View>

            {/* Alerts */}
            {result.alerts.length > 0 && (
              <Section icon={AlertTriangle} title={t('agents.anamnese.alerts')} tone="warning">
                {result.alerts.map((alert, i) => (
                  <Text key={i} style={s.alertItem}>• {alert}</Text>
                ))}
              </Section>
            )}

            {/* Sintomas recentes */}
            {result.recent_symptoms.length > 0 && (
              <Section icon={Activity} title={t('agents.anamnese.recentSymptoms')}>
                {result.recent_symptoms.map((sym, i) => (
                  <Text key={i} style={s.bullet}>• {sym}</Text>
                ))}
              </Section>
            )}

            {/* Medicações em uso */}
            {result.current_medications.length > 0 && (
              <Section icon={Pill} title={t('agents.anamnese.currentMeds')}>
                {result.current_medications.map((m, i) => (
                  <View key={i} style={s.medRow}>
                    <Text style={s.medName}>{m.name}</Text>
                    <Text style={s.medDetail}>
                      {m.frequency}{m.reason ? ` · ${m.reason}` : ''}
                    </Text>
                  </View>
                ))}
              </Section>
            )}

            {/* Consultas recentes */}
            {result.recent_consultations.length > 0 && (
              <Section icon={Stethoscope} title={t('agents.anamnese.recentConsultations')}>
                {result.recent_consultations.map((c, i) => (
                  <View key={i} style={s.consultRow}>
                    <Text style={s.consultDate}>{c.date} · {c.type}</Text>
                    <Text style={s.consultSummary}>{c.summary}</Text>
                    {c.diagnosis && (
                      <Text style={s.consultDiagnosis}>
                        {t('agents.anamnese.diagnosis')}: {c.diagnosis}
                      </Text>
                    )}
                  </View>
                ))}
              </Section>
            )}

            {/* Perguntas sugeridas */}
            {result.suggested_questions.length > 0 && (
              <Section icon={MessageSquare} title={t('agents.anamnese.suggestedQuestions')} tone="click">
                {result.suggested_questions.map((q, i) => (
                  <Text key={i} style={s.questionItem}>{i + 1}. {q}</Text>
                ))}
              </Section>
            )}

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: spacing.lg }]}
              onPress={handleGenerate}
              disabled={isPending}
              activeOpacity={0.7}
            >
              <Text style={s.secondaryBtnTxt}>{t('agents.regenerate')}</Text>
              <ArrowRight size={rs(16)} color={colors.click} strokeWidth={2} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Componentes auxiliares ──────────────────────────────────────────────────

function Section({
  icon: Icon, title, tone = 'neutral', children,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  tone?: 'neutral' | 'warning' | 'success' | 'click';
  children: React.ReactNode;
}) {
  const toneColor =
    tone === 'warning' ? colors.warning :
    tone === 'success' ? colors.success :
    tone === 'click' ? colors.click :
    colors.textSec;
  return (
    <View style={[s.section, tone === 'warning' && s.sectionWarning]}>
      <View style={s.sectionHeader}>
        <Icon size={rs(16)} color={toneColor} strokeWidth={1.8} />
        <Text style={[s.sectionTitle, { color: toneColor }]}>{title}</Text>
      </View>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function StatusPill({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'info';
}) {
  const toneColor = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.click;
  return (
    <View style={s.pill}>
      <View style={s.pillHeader}>
        <Icon size={rs(14)} color={toneColor} strokeWidth={1.8} />
        <Text style={s.pillLabel}>{label}</Text>
      </View>
      <Text style={[s.pillValue, { color: toneColor }]}>{value}</Text>
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
  backBtn: {
    paddingHorizontal: rs(20), paddingVertical: rs(10), borderRadius: radii.lg,
    backgroundColor: colors.click,
  },
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

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, paddingVertical: rs(14), borderRadius: radii.lg,
    marginBottom: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    paddingVertical: rs(12), borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.click,
  },
  secondaryBtnTxt: { color: colors.click, fontSize: fs(13), fontWeight: '700' },

  // Section
  section: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10),
  },
  sectionWarning: { borderColor: colors.warning + '40', backgroundColor: colors.warning + '10' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(8) },
  sectionTitle: { fontSize: fs(11), fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionBody: { gap: rs(6) },

  bodyText: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },
  bullet: { color: colors.text, fontSize: fs(12), lineHeight: fs(18) },
  alertItem: { color: colors.warning, fontSize: fs(12), lineHeight: fs(18), fontWeight: '600' },
  questionItem: { color: colors.text, fontSize: fs(12), lineHeight: fs(18) },

  // Pills
  row2: { flexDirection: 'row', gap: rs(10), marginBottom: rs(10) },
  pill: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), gap: rs(4),
  },
  pillHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  pillLabel: { color: colors.textDim, fontSize: fs(10), fontWeight: '600', textTransform: 'uppercase' },
  pillValue: { fontSize: fs(13), fontWeight: '700', textTransform: 'capitalize' },

  // Med rows
  medRow: { paddingVertical: rs(4) },
  medName: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
  medDetail: { color: colors.textDim, fontSize: fs(11), marginTop: rs(2) },

  // Consult rows
  consultRow: { paddingVertical: rs(6), borderBottomWidth: 1, borderBottomColor: colors.border },
  consultDate: { color: colors.textDim, fontSize: fs(10), fontWeight: '600' },
  consultSummary: { color: colors.text, fontSize: fs(12), marginTop: rs(2), lineHeight: fs(17) },
  consultDiagnosis: { color: colors.click, fontSize: fs(11), marginTop: rs(2), fontWeight: '600' },
});
