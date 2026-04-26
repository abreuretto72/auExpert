/**
 * /professional/agents/prontuario — Agente IA #2: prontuário CFMV.
 *
 * Fluxo:
 *   1. Vet digita queixa principal (chief_complaint)
 *   2. Toca "Gerar com IA" → EF agent-prontuario cria draft (status='draft')
 *   3. Tela mostra preview editável de cada campo
 *   4. Vet ajusta livremente
 *   5. "Salvar como rascunho" → UPDATE em prontuarios
 *   6. "Assinar" → biometria + INSERT em professional_signatures + status='signed'
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
  ChevronLeft, Sparkles, AlertTriangle, FileText, Save,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../components/Toast';
import { useProAgent, type ProntuarioResponse } from '../../../../hooks/useProAgent';
import { SignDocumentButton } from '../../../../components/professional/SignDocumentButton';
import { AgentVoiceInput } from '../../../../components/professional/AgentVoiceInput';
import { supabase } from '../../../../lib/supabase';
import { getErrorMessage } from '../../../../utils/errorMessages';

interface ProntuarioDraft {
  history: string;
  current_medications: string;
  physical_exam_notes: string;
  diagnoses: string[];
  treatment_plan: string;
  follow_up_days: number;
  prognosis: string;
}

const EMPTY_DRAFT: ProntuarioDraft = {
  history: '', current_medications: '', physical_exam_notes: '',
  diagnoses: [], treatment_plan: '', follow_up_days: 7, prognosis: '',
};

export default function ProntuarioAgentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { run, isPending } = useProAgent<
    { pet_id: string; chief_complaint: string; language: string },
    ProntuarioResponse
  >('agent-prontuario');

  const [chiefComplaint, setChiefComplaint] = useState('');
  const [prontuarioId, setProntuarioId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProntuarioDraft>(EMPTY_DRAFT);
  const [hasResult, setHasResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!petId) {
      toast(t('agents.errors.missingPet'), 'error');
      return;
    }
    if (chiefComplaint.trim().length < 3) {
      toast(t('agents.prontuario.chiefComplaintHint'), 'warning');
      return;
    }
    try {
      const data = await run({
        pet_id: petId,
        chief_complaint: chiefComplaint.trim(),
        language: i18n.language,
      });
      setProntuarioId(data.id);
      setDraft({
        history: data.draft.history ?? '',
        current_medications: data.draft.current_medications ?? '',
        physical_exam_notes: data.draft.physical_exam_notes ?? '',
        diagnoses: data.draft.diagnoses ?? [],
        treatment_plan: data.draft.treatment_plan ?? '',
        follow_up_days: data.draft.follow_up_days ?? 7,
        prognosis: data.draft.prognosis ?? '',
      });
      setHasResult(true);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  }, [petId, chiefComplaint, run, toast, t, i18n.language]);

  const handleSave = useCallback(async () => {
    if (!prontuarioId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('prontuarios')
        .update({
          history: draft.history || null,
          current_medications: draft.current_medications || null,
          physical_exam_notes: draft.physical_exam_notes || null,
          diagnoses: draft.diagnoses.length > 0 ? draft.diagnoses : [],
          treatment_plan: draft.treatment_plan || null,
          follow_up_days: draft.follow_up_days,
          prognosis: draft.prognosis || null,
        })
        .eq('id', prontuarioId);
      if (error) throw error;
      toast(t('agents.save'), 'success');
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setSaving(false);
    }
  }, [prontuarioId, draft, toast, t]);

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
        <Text style={s.headerTitle}>{t('agents.prontuario.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <FileText size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.prontuario.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agents.prontuario.heroDesc')}</Text>
        </View>

        <Text style={s.label}>{t('agents.prontuario.chiefComplaint')} *</Text>
        {!hasResult && (
          <AgentVoiceInput
            ocrDocType="general"
            onText={(text, append) => setChiefComplaint((prev) => append ? `${prev} ${text}`.trim() : text)}
          />
        )}
        <TextInput
          style={s.input}
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          placeholder={t('agents.prontuario.chiefComplaintHint')}
          placeholderTextColor={colors.textDim}
          multiline
          editable={!hasResult}
        />

        {!hasResult ? (
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
        ) : (
          <>
            <EditableField
              label={t('agents.prontuario.history')}
              value={draft.history}
              onChange={(v) => setDraft({ ...draft, history: v })}
            />
            <EditableField
              label={t('professional.councilName')}
              value={draft.current_medications}
              onChange={(v) => setDraft({ ...draft, current_medications: v })}
            />
            <EditableField
              label={t('agents.prontuario.physicalExam')}
              value={draft.physical_exam_notes}
              onChange={(v) => setDraft({ ...draft, physical_exam_notes: v })}
            />
            <EditableField
              label={t('agents.prontuario.diagnoses')}
              value={draft.diagnoses.join('\n')}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  diagnoses: v.split('\n').map((s) => s.trim()).filter(Boolean),
                })
              }
              hint="Um diagnóstico por linha"
            />
            <EditableField
              label={t('agents.prontuario.treatmentPlan')}
              value={draft.treatment_plan}
              onChange={(v) => setDraft({ ...draft, treatment_plan: v })}
            />
            <EditableField
              label={t('agents.prontuario.followUp')}
              value={String(draft.follow_up_days)}
              onChange={(v) => {
                const n = parseInt(v.replace(/\D/g, ''), 10);
                setDraft({ ...draft, follow_up_days: isNaN(n) ? 7 : Math.min(Math.max(n, 1), 90) });
              }}
              numeric
            />
            <EditableField
              label={t('agents.prontuario.prognosis')}
              value={draft.prognosis}
              onChange={(v) => setDraft({ ...draft, prognosis: v })}
            />

            <TouchableOpacity
              style={[s.secondaryBtn, saving && s.primaryBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.click} />
              ) : (
                <>
                  <Save size={rs(18)} color={colors.click} strokeWidth={2} />
                  <Text style={s.secondaryBtnTxt}>{t('agents.save')}</Text>
                </>
              )}
            </TouchableOpacity>

            {prontuarioId && (
              <View style={{ marginTop: spacing.sm }}>
                <SignDocumentButton
                  targetTable="prontuarios"
                  targetId={prontuarioId}
                  payload={{
                    chief_complaint: chiefComplaint.trim(),
                    history: draft.history || null,
                    current_medications: draft.current_medications || null,
                    physical_exam_notes: draft.physical_exam_notes || null,
                    diagnoses: draft.diagnoses,
                    treatment_plan: draft.treatment_plan || null,
                    follow_up_days: draft.follow_up_days,
                    prognosis: draft.prognosis || null,
                  }}
                  onSigned={() => router.back()}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EditableField({
  label, value, onChange, hint, numeric,
}: {
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; numeric?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, !numeric && s.inputMulti]}
        value={value}
        onChangeText={onChange}
        multiline={!numeric}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholderTextColor={colors.textDim}
      />
      {hint && <Text style={s.fieldHint}>{hint}</Text>}
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
    minHeight: rs(48),
  },
  inputMulti: { minHeight: rs(72), textAlignVertical: 'top' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, paddingVertical: rs(14), borderRadius: radii.lg,
    marginVertical: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    paddingVertical: rs(14), borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.click,
    marginVertical: spacing.md,
  },
  secondaryBtnTxt: { color: colors.click, fontSize: fs(14), fontWeight: '700' },

  field: { marginBottom: spacing.sm },
  fieldLabel: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', marginBottom: rs(4), textTransform: 'uppercase', letterSpacing: 0.3 },
  fieldHint: { color: colors.textDim, fontSize: fs(10), marginTop: rs(4), fontStyle: 'italic' },
});
