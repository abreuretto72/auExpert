/**
 * /professional/agents/receituario — Agente IA #3: receituário com checagem.
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
  ChevronLeft, Sparkles, AlertTriangle, Pill, Plus, X, Shield, ShieldAlert,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { useToast } from '../../../../components/Toast';
import { useProAgent, type ReceituarioResponse } from '../../../../hooks/useProAgent';
import { SignDocumentButton } from '../../../../components/professional/SignDocumentButton';
import { AgentVoiceInput } from '../../../../components/professional/AgentVoiceInput';
import { getErrorMessage } from '../../../../utils/errorMessages';

interface ItemDraft {
  name: string;
  dose: string;
  frequency: string;
  duration: string;
}

const EMPTY_ITEM: ItemDraft = { name: '', dose: '', frequency: '', duration: '' };

export default function ReceituarioAgentScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { run, isPending } = useProAgent<
    {
      pet_id: string;
      items: Array<{ name: string; dose?: string; frequency?: string; duration?: string }>;
      clinical_indication: string;
      valid_days: number;
      language: string;
    },
    ReceituarioResponse
  >('agent-receituario');

  const [items, setItems] = useState<ItemDraft[]>([{ ...EMPTY_ITEM }]);
  const [indication, setIndication] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [result, setResult] = useState<ReceituarioResponse | null>(null);

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: keyof ItemDraft, value: string) =>
    setItems(items.map((item, i) => (i === idx ? { ...item, [key]: value } : item)));

  const handleGenerate = useCallback(async () => {
    if (!petId) {
      toast(t('agents.errors.missingPet'), 'error');
      return;
    }
    const filled = items.filter((it) => it.name.trim().length > 0);
    if (filled.length === 0) {
      toast(t('agents.receituario.addItem'), 'warning');
      return;
    }
    if (indication.trim().length < 3) {
      toast(t('agents.receituario.indication'), 'warning');
      return;
    }
    try {
      const data = await run({
        pet_id: petId,
        items: filled.map((it) => ({
          name: it.name.trim(),
          dose: it.dose.trim() || undefined,
          frequency: it.frequency.trim() || undefined,
          duration: it.duration.trim() || undefined,
        })),
        clinical_indication: indication.trim(),
        valid_days: Math.max(1, Math.min(180, parseInt(validDays, 10) || 30)),
        language: i18n.language,
      });
      setResult(data);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    }
  }, [petId, items, indication, validDays, run, toast, t, i18n.language]);

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
        <Text style={s.headerTitle}>{t('agents.receituario.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <Pill size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.receituario.heroTitle')}</Text>
          <Text style={s.heroDesc}>{t('agents.receituario.heroDesc')}</Text>
        </View>

        {!result ? (
          <>
            <Text style={s.sectionLabel}>{t('agents.receituario.items')} *</Text>
            {items.map((item, idx) => (
              <View key={idx} style={s.itemCard}>
                <View style={s.itemHeader}>
                  <Text style={s.itemNumber}>#{idx + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(idx)} hitSlop={8}>
                      <X size={rs(16)} color={colors.danger} strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={s.input}
                  value={item.name}
                  onChangeText={(v) => updateItem(idx, 'name', v)}
                  placeholder="Nome do medicamento"
                  placeholderTextColor={colors.textDim}
                />
                <View style={s.row2}>
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={item.dose}
                    onChangeText={(v) => updateItem(idx, 'dose', v)}
                    placeholder="Dose"
                    placeholderTextColor={colors.textDim}
                  />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    value={item.frequency}
                    onChangeText={(v) => updateItem(idx, 'frequency', v)}
                    placeholder="Frequência"
                    placeholderTextColor={colors.textDim}
                  />
                </View>
                <TextInput
                  style={s.input}
                  value={item.duration}
                  onChangeText={(v) => updateItem(idx, 'duration', v)}
                  placeholder="Duração (ex: 7 dias)"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            ))}

            <TouchableOpacity style={s.addBtn} onPress={addItem} activeOpacity={0.7}>
              <Plus size={rs(16)} color={colors.click} strokeWidth={2} />
              <Text style={s.addBtnTxt}>{t('agents.receituario.addItem')}</Text>
            </TouchableOpacity>

            <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>
              {t('agents.receituario.indication')} *
            </Text>
            <AgentVoiceInput
              ocrDocType="prescription"
              onText={(text, append) => setIndication((prev) => append ? `${prev} ${text}`.trim() : text)}
            />
            <TextInput
              style={[s.input, s.inputMulti]}
              value={indication}
              onChangeText={setIndication}
              placeholder="Indicação clínica"
              placeholderTextColor={colors.textDim}
              multiline
            />

            <Text style={[s.sectionLabel, { marginTop: spacing.md }]}>
              {t('agents.receituario.validDays')}
            </Text>
            <TextInput
              style={s.input}
              value={validDays}
              onChangeText={setValidDays}
              keyboardType="numeric"
              placeholderTextColor={colors.textDim}
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
            <View style={[s.typeBanner, result.prescription_type !== 'standard' && s.typeBannerWarning]}>
              {result.prescription_type !== 'standard' ? (
                <ShieldAlert size={rs(18)} color={colors.warning} strokeWidth={1.8} />
              ) : (
                <Shield size={rs(18)} color={colors.success} strokeWidth={1.8} />
              )}
              <Text
                style={[
                  s.typeBannerTxt,
                  { color: result.prescription_type !== 'standard' ? colors.warning : colors.success },
                ]}
              >
                {t(`agents.receituario.type.${result.prescription_type}`)}
              </Text>
            </View>

            {result.alerts.length > 0 && (
              <View style={s.alertsCard}>
                <View style={s.alertsHeader}>
                  <AlertTriangle size={rs(16)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={s.alertsTitle}>{t('agents.receituario.alerts')}</Text>
                </View>
                {result.alerts.map((a, i) => (
                  <Text key={i} style={s.alertItem}>• {a}</Text>
                ))}
              </View>
            )}

            <Text style={s.sectionLabel}>{t('agents.receituario.items')}</Text>
            {result.items.map((item, idx) => (
              <View key={idx} style={s.resultItemCard}>
                <Text style={s.resultItemName}>{item.name}</Text>
                {item.dose && <Text style={s.resultItemDetail}>Dose: {item.dose}</Text>}
                {item.frequency && <Text style={s.resultItemDetail}>{item.frequency}</Text>}
                {item.duration && <Text style={s.resultItemDetail}>Por {item.duration}</Text>}
                {item.route && <Text style={s.resultItemDetail}>Via: {item.route}</Text>}
                {item.notes && <Text style={s.resultItemNote}>{item.notes}</Text>}
              </View>
            ))}

            {result.observations && (
              <View style={s.obsCard}>
                <Text style={s.obsTitle}>Observações</Text>
                <Text style={s.obsText}>{result.observations}</Text>
              </View>
            )}

            <View style={{ marginTop: spacing.lg }}>
              <SignDocumentButton
                targetTable="receituarios"
                targetId={result.id}
                payload={{
                  prescription_type: result.prescription_type,
                  items: result.items,
                  observations: result.observations,
                  clinical_indication: indication.trim(),
                }}
                onSigned={() => router.back()}
              />
            </View>

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

  sectionLabel: { color: colors.text, fontSize: fs(12), fontWeight: '700', marginBottom: rs(8), letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), color: colors.text, fontSize: fs(13),
    minHeight: rs(44),
  },
  inputMulti: { minHeight: rs(72), textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: rs(8), marginVertical: rs(6) },

  itemCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), marginBottom: rs(8), gap: rs(6),
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemNumber: { color: colors.textDim, fontSize: fs(11), fontWeight: '700' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6),
    paddingVertical: rs(10), borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.click, borderStyle: 'dashed',
    marginTop: rs(4),
  },
  addBtnTxt: { color: colors.click, fontSize: fs(12), fontWeight: '700' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, paddingVertical: rs(14), borderRadius: radii.lg,
    marginVertical: spacing.md,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },

  secondaryBtn: {
    paddingVertical: rs(12), borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.click, alignItems: 'center',
  },
  secondaryBtnTxt: { color: colors.click, fontSize: fs(13), fontWeight: '700' },

  typeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.success + '15', borderRadius: radii.lg, padding: rs(12),
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.success + '30',
  },
  typeBannerWarning: {
    backgroundColor: colors.warning + '15', borderColor: colors.warning + '40',
  },
  typeBannerTxt: { fontSize: fs(13), fontWeight: '700' },

  alertsCard: {
    backgroundColor: colors.warning + '12', borderWidth: 1, borderColor: colors.warning + '40',
    borderRadius: radii.lg, padding: rs(14), marginBottom: spacing.md, gap: rs(6),
  },
  alertsHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4) },
  alertsTitle: { color: colors.warning, fontSize: fs(11), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  alertItem: { color: colors.text, fontSize: fs(12), lineHeight: fs(18), fontWeight: '600' },

  resultItemCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), marginBottom: rs(8),
  },
  resultItemName: { color: colors.text, fontSize: fs(14), fontWeight: '700' },
  resultItemDetail: { color: colors.textSec, fontSize: fs(12), marginTop: rs(2) },
  resultItemNote: { color: colors.click, fontSize: fs(11), marginTop: rs(4), fontStyle: 'italic' },

  obsCard: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, padding: rs(12), marginTop: spacing.sm,
  },
  obsTitle: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', marginBottom: rs(4), textTransform: 'uppercase' },
  obsText: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },
});
