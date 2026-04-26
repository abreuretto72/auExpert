/**
 * /professional/agents/tci — Agente IA #5: Termo de Consentimento Informado.
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
  ChevronLeft, Sparkles, AlertTriangle, FileSignature, Clock,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../components/Toast';
import { useProAgent, type TciResponse } from '../../../../hooks/useProAgent';
import { SignDocumentButton } from '../../../../components/professional/SignDocumentButton';
import { AgentVoiceInput } from '../../../../components/professional/AgentVoiceInput';
import { getErrorMessage } from '../../../../utils/errorMessages';

export default function TciAgentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { run, isPending } = useProAgent<
    { pet_id: string; procedure_type: string; procedure_description: string; language: string },
    TciResponse
  >('agent-tci');

  const [procedureType, setProcedureType] = useState('');
  const [procedureDescription, setProcedureDescription] = useState('');
  const [result, setResult] = useState<TciResponse | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!petId) { toast(t('agents.errors.missingPet'), 'error'); return; }
    if (procedureType.trim().length < 2) {
      toast(t('agents.tci.procedureType'), 'warning'); return;
    }
    if (procedureDescription.trim().length < 5) {
      toast(t('agents.tci.procedureDescription'), 'warning'); return;
    }
    try {
      const data = await run({
        pet_id: petId,
        procedure_type: procedureType.trim(),
        procedure_description: procedureDescription.trim(),
        language: i18n.language,
      });
      setResult(data);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  }, [petId, procedureType, procedureDescription, run, toast, t, i18n.language]);

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
        <Text style={s.headerTitle}>{t('agents.tci.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <FileSignature size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.tci.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agents.tci.heroDesc')}</Text>
        </View>

        {!result ? (
          <>
            <Text style={s.label}>{t('agents.tci.procedureType')} *</Text>
            <TextInput
              style={s.input} value={procedureType} onChangeText={setProcedureType}
              placeholder="Ex: Castração, Cirurgia ortopédica..."
              placeholderTextColor={colors.textDim}
            />
            <Text style={[s.label, { marginTop: spacing.sm }]}>
              {t('agents.tci.procedureDescription')} *
            </Text>
            <AgentVoiceInput
              ocrDocType="general"
              showCamera={false}
              onText={(text, append) => setProcedureDescription((prev) => append ? `${prev} ${text}`.trim() : text)}
            />
            <TextInput
              style={[s.input, s.inputMulti]} value={procedureDescription} onChangeText={setProcedureDescription}
              placeholder="Descrição detalhada do procedimento que será realizado..."
              placeholderTextColor={colors.textDim} multiline
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
            <View style={s.pendingBanner}>
              <Clock size={rs(18)} color={colors.warning} strokeWidth={1.8} />
              <Text style={s.pendingTxt}>{t('agents.tci.tutorSignaturePending')}</Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>{t('agents.tci.procedureType')}</Text>
              <Text style={s.cardBody}>{result.procedure_type}</Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>{t('agents.tci.procedureDescription')}</Text>
              <Text style={s.cardBody}>{result.procedure_description}</Text>
            </View>

            {result.risks_described && (
              <View style={[s.card, s.cardWarning]}>
                <View style={s.cardHeader}>
                  <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={[s.cardTitle, { color: colors.warning }]}>
                    {t('agents.tci.risks')}
                  </Text>
                </View>
                <Text style={s.cardBody}>{result.risks_described}</Text>
              </View>
            )}

            {result.alternatives_described && (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t('agents.tci.alternatives')}</Text>
                <Text style={s.cardBody}>{result.alternatives_described}</Text>
              </View>
            )}

            <View style={{ marginTop: spacing.lg }}>
              <SignDocumentButton
                targetTable="termos_consentimento"
                targetId={result.id}
                payload={{
                  procedure_type: result.procedure_type,
                  procedure_description: result.procedure_description,
                  risks_described: result.risks_described,
                  alternatives_described: result.alternatives_described,
                }}
                label="Assinar como profissional"
                onSigned={() => router.back()}
              />
            </View>

            <TouchableOpacity
              style={[s.secondaryBtn, { marginTop: spacing.sm }]}
              onPress={() => router.back()} activeOpacity={0.7}
            >
              <Text style={s.secondaryBtnTxt}>{t('common.back')}</Text>
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

  label: { color: colors.text, fontSize: fs(12), fontWeight: '700', marginBottom: rs(6), letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), color: colors.text, fontSize: fs(13),
    minHeight: rs(44),
  },
  inputMulti: { minHeight: rs(96), textAlignVertical: 'top' },

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

  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.warning + '12', borderRadius: radii.lg, padding: rs(12),
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.warning + '40',
  },
  pendingTxt: { color: colors.warning, fontSize: fs(12), fontWeight: '700' },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10),
  },
  cardWarning: { backgroundColor: colors.warning + '08', borderColor: colors.warning + '30' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(6) },
  cardTitle: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', marginBottom: rs(6), textTransform: 'uppercase' },
  cardBody: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },
});
