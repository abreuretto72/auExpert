/**
 * /pro/onboarding — Tela de criação do perfil profissional.
 *
 * Entrada:
 *   - Deep-link de invite quando o user logado não tem linha em `professionals`
 *     (guard NEEDS_ONBOARDING em /invite/[token].tsx).
 *   - Link direto do hub de parceiros (futuro — Bloco D).
 *
 * Saída:
 *   - Após sucesso: router.replace(returnTo || '/pro')
 *
 * Campos:
 *   - professional_type (obrigatório, 10 opções — chips seletor único)
 *   - country_code (obrigatório, 2 chars, uppercase)
 *   - display_name (obrigatório, mic STT)
 *   - council_name (opcional — "CRMV", "OAB", etc.)
 *   - council_number (opcional — declarativo, sem verificação)
 *   - fiscal_id_type (opcional — "CPF", "CNPJ", "NIF"...)
 *   - fiscal_id_value (opcional)
 *   - specialties (opcional — tags adicionáveis)
 *   - bio (opcional, multiline, mic STT)
 *
 * Validação: Zod inline (schema local — não polui lib/schemas.ts que cobre
 * entidades do domínio tutor). Mensagens de erro via i18n.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, X, Briefcase } from 'lucide-react-native';
import { z } from 'zod';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/Toast';
import {
  useMyProfessional,
  useCreateProfessional,
  type CreateProfessionalInput,
} from '../../../hooks/useProfessional';
import type { ProfessionalType } from '../../../types/database';
import { getErrorMessage } from '../../../utils/errorMessages';

// ── Schema Zod ────────────────────────────────────────────────────────────────

const PROFESSIONAL_TYPES: readonly ProfessionalType[] = [
  'veterinarian', 'vet_tech', 'groomer', 'trainer', 'walker',
  'sitter', 'boarding', 'shop_employee', 'ong_member', 'breeder',
] as const;

const onboardingSchema = z.object({
  professional_type: z.enum([
    'veterinarian', 'vet_tech', 'groomer', 'trainer', 'walker',
    'sitter', 'boarding', 'shop_employee', 'ong_member', 'breeder',
  ] as const),
  country_code: z.string().length(2).regex(/^[A-Z]{2}$/),
  display_name: z.string().min(2).max(120),
  council_name: z.string().max(40).optional().nullable(),
  council_number: z.string().max(40).optional().nullable(),
  fiscal_id_type: z.string().max(20).optional().nullable(),
  fiscal_id_value: z.string().max(40).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  specialties: z.array(z.string().min(1).max(40)).max(10).optional().nullable(),
});

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function ProOnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const { professional, isLoading: isLoadingProfile } = useMyProfessional();
  const { createProfessional, isCreating } = useCreateProfessional();

  // Se já tem perfil, redireciona — nunca deixa duplicar
  React.useEffect(() => {
    if (!isLoadingProfile && professional) {
      router.replace('/pro' as never);
    }
  }, [isLoadingProfile, professional, router]);

  const [professionalType, setProfessionalType] = useState<ProfessionalType | ''>('');
  const [countryCode, setCountryCode] = useState<string>(
    // default: país do locale do dispositivo quando possível (ex.: pt-BR → BR)
    (i18n.language.split('-')[1] ?? 'BR').toUpperCase(),
  );
  const [displayName, setDisplayName] = useState('');
  const [councilName, setCouncilName] = useState('');
  const [councilNumber, setCouncilNumber] = useState('');
  const [fiscalIdType, setFiscalIdType] = useState('');
  const [fiscalIdValue, setFiscalIdValue] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyDraft, setSpecialtyDraft] = useState('');

  const addSpecialty = useCallback(() => {
    const trimmed = specialtyDraft.trim();
    if (!trimmed) return;
    if (specialties.includes(trimmed)) { setSpecialtyDraft(''); return; }
    if (specialties.length >= 10) {
      toast(t('onboarding.pro.specialtiesMax'), 'warning');
      return;
    }
    setSpecialties((prev) => [...prev, trimmed]);
    setSpecialtyDraft('');
  }, [specialtyDraft, specialties, toast, t]);

  const removeSpecialty = useCallback((s: string) => {
    setSpecialties((prev) => prev.filter((x) => x !== s));
  }, []);

  const canSubmit = useMemo(
    () => !!professionalType && countryCode.length === 2 && displayName.trim().length >= 2,
    [professionalType, countryCode, displayName],
  );

  const handleSubmit = useCallback(async () => {
    if (isCreating) return;

    const candidate: CreateProfessionalInput = {
      professional_type: professionalType as ProfessionalType,
      country_code: countryCode.toUpperCase(),
      display_name: displayName.trim(),
      council_name: councilName.trim() || null,
      council_number: councilNumber.trim() || null,
      fiscal_id_type: fiscalIdType.trim() || null,
      fiscal_id_value: fiscalIdValue.trim() || null,
      bio: bio.trim() || null,
      specialties: specialties.length ? specialties : null,
    };

    const parsed = onboardingSchema.safeParse(candidate);
    if (!parsed.success) {
      toast(t('onboarding.pro.validationError'), 'error');
      return;
    }

    try {
      await createProfessional(candidate);
      toast(t('onboarding.pro.created'), 'success');
      const target = (returnTo && typeof returnTo === 'string') ? returnTo : '/pro';
      router.replace(target as never);
    } catch (err) {
      const msg = err instanceof Error && err.message === 'offline_onboarding'
        ? t('onboarding.pro.offline')
        : getErrorMessage(err);
      toast(msg, 'error');
    }
  }, [
    isCreating, professionalType, countryCode, displayName, councilName, councilNumber,
    fiscalIdType, fiscalIdValue, bio, specialties, createProfessional, toast, t,
    returnTo, router,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('onboarding.pro.title')}</Text>
          <View style={{ width: rs(26) }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Briefcase size={rs(28)} color={colors.click} strokeWidth={1.6} />
            </View>
            <Text style={styles.subtitle}>{t('onboarding.pro.subtitle')}</Text>
          </View>

          {/* Tipo profissional */}
          <Text style={styles.sectionLabel}>
            {t('onboarding.pro.typeLabel')} <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.chipRow}>
            {PROFESSIONAL_TYPES.map((type) => {
              const selected = professionalType === type;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setProfessionalType(type)}
                  activeOpacity={0.8}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {t(`onboarding.pro.type.${type}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* País */}
          <View style={styles.field}>
            <Input
              label={t('onboarding.pro.countryLabel')}
              placeholder={t('onboarding.pro.countryPlaceholder')}
              value={countryCode}
              onChangeText={(v) => setCountryCode(v.toUpperCase().slice(0, 2))}
              showMic={false}
            />
          </View>

          {/* Display name (com mic) */}
          <View style={styles.field}>
            <Input
              label={t('onboarding.pro.displayNameLabel')}
              placeholder={t('onboarding.pro.displayNamePlaceholder')}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          {/* Declaração de conselho (opcional) */}
          <Text style={styles.sectionLabel}>{t('onboarding.pro.councilLabel')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.pro.councilHint')}</Text>
          <View style={styles.row2}>
            <View style={[styles.field, styles.rowItem]}>
              <Input
                label={t('onboarding.pro.councilName')}
                placeholder={t('onboarding.pro.councilNamePlaceholder')}
                value={councilName}
                onChangeText={setCouncilName}
                showMic={false}
              />
            </View>
            <View style={[styles.field, styles.rowItem]}>
              <Input
                label={t('onboarding.pro.councilNumber')}
                placeholder={t('onboarding.pro.councilNumberPlaceholder')}
                value={councilNumber}
                onChangeText={setCouncilNumber}
                showMic={false}
              />
            </View>
          </View>

          {/* Documento fiscal (opcional) */}
          <Text style={styles.sectionLabel}>{t('onboarding.pro.fiscalLabel')}</Text>
          <Text style={styles.sectionHint}>{t('onboarding.pro.fiscalHint')}</Text>
          <View style={styles.row2}>
            <View style={[styles.field, styles.rowItem]}>
              <Input
                label={t('onboarding.pro.fiscalType')}
                placeholder={t('onboarding.pro.fiscalTypePlaceholder')}
                value={fiscalIdType}
                onChangeText={setFiscalIdType}
                showMic={false}
              />
            </View>
            <View style={[styles.field, styles.rowItem]}>
              <Input
                label={t('onboarding.pro.fiscalValue')}
                placeholder={t('onboarding.pro.fiscalValuePlaceholder')}
                value={fiscalIdValue}
                onChangeText={setFiscalIdValue}
                showMic={false}
              />
            </View>
          </View>

          {/* Especialidades */}
          <Text style={styles.sectionLabel}>{t('onboarding.pro.specialtiesLabel')}</Text>
          <View style={styles.specialtyRow}>
            <View style={styles.specialtyInputWrap}>
              <Input
                placeholder={t('onboarding.pro.specialtiesPlaceholder')}
                value={specialtyDraft}
                onChangeText={setSpecialtyDraft}
              />
            </View>
            <TouchableOpacity
              onPress={addSpecialty}
              activeOpacity={0.7}
              style={styles.specialtyAddBtn}
            >
              <Plus size={rs(18)} color={colors.click} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {specialties.length > 0 && (
            <View style={styles.chipRow}>
              {specialties.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => removeSpecialty(s)}
                  activeOpacity={0.7}
                  style={styles.tagChip}
                >
                  <Text style={styles.tagChipText}>{s}</Text>
                  <X size={rs(12)} color={colors.click} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Bio (multiline + mic) */}
          <View style={styles.field}>
            <Input
              label={t('onboarding.pro.bioLabel')}
              placeholder={t('onboarding.pro.bioPlaceholder')}
              value={bio}
              onChangeText={setBio}
              multiline
            />
          </View>

          {/* Submit */}
          <View style={styles.submitWrap}>
            <Button
              label={t('onboarding.pro.submit')}
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={isCreating}
            />
            <Text style={styles.disclaimer}>{t('onboarding.pro.disclaimer')}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.bg },
  flex:    { flex: 1 },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
  scroll:  { padding: spacing.md, paddingBottom: rs(40) },
  hero:    { alignItems: 'center', marginBottom: spacing.lg },
  heroIcon: {
    width: rs(60), height: rs(60), borderRadius: rs(30),
    backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm, borderWidth: 1.5, borderColor: colors.clickRing,
  },
  subtitle: { color: colors.textSec, fontSize: fs(13), textAlign: 'center', lineHeight: fs(19) },
  sectionLabel: {
    color: colors.text, fontSize: fs(13), fontWeight: '700',
    marginTop: spacing.md, marginBottom: spacing.xs, letterSpacing: 0.3,
  },
  sectionHint: {
    color: colors.textDim, fontSize: fs(11), marginBottom: spacing.sm, lineHeight: fs(16),
  },
  required: { color: colors.click },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8), marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: rs(12), paddingVertical: rs(8),
    borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.clickSoft, borderColor: colors.click },
  chipText: { color: colors.textSec, fontSize: fs(12), fontWeight: '600' },
  chipTextSelected: { color: colors.click },
  field: { marginBottom: spacing.sm },
  row2: { flexDirection: 'row', gap: rs(10) },
  rowItem: { flex: 1 },
  specialtyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: rs(8), marginBottom: spacing.sm },
  specialtyInputWrap: { flex: 1 },
  specialtyAddBtn: {
    width: rs(52), height: rs(52), borderRadius: radii.lg,
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    paddingHorizontal: rs(10), paddingVertical: rs(6),
    borderRadius: radii.sm, backgroundColor: colors.clickSoft,
    borderWidth: 1, borderColor: colors.clickRing,
  },
  tagChipText: { color: colors.click, fontSize: fs(12), fontWeight: '700' },
  submitWrap: { marginTop: spacing.lg },
  disclaimer: {
    color: colors.textDim, fontSize: fs(11), textAlign: 'center',
    marginTop: spacing.sm, lineHeight: fs(16),
  },
});
