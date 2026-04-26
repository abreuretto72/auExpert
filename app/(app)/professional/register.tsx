/**
 * /professional/register — Cadastro do profissional com scanner OCR.
 *
 * Versão evolução do antigo /pro/onboarding (que continua funcionando para
 * o fluxo legado de invite). Esta tela:
 *   - Foca em onboarding direto pelo profissional (sem invite prévio)
 *   - Inclui scanner de carteira do conselho via EF scan-professional-document
 *   - Faz upload de foto de perfil opcional
 *   - Tem termo de responsabilidade obrigatório (declarativo, não verifica)
 *
 * Decisão arquitetural (2026-04-25): tela SEPARADA de pro/onboarding pra evitar
 * regressão no fluxo de invite (usado no Bloco D). Quando ambas convergirem,
 * pro/onboarding pode ser removido.
 *
 * Fluxo:
 *   1. Tutor toca "Escanear" → câmera abre
 *   2. Foto vai para EF scan-professional-document
 *   3. Campos preenchidos automaticamente (nome, conselho, número, etc.)
 *   4. Tutor revisa, ajusta, completa campos opcionais
 *   5. Aceita termo de responsabilidade (obrigatório)
 *   6. Submit → INSERT em professionals + UPDATE users.role='professional'
 *   7. Redirect para /(app)/professional/dashboard
 *
 * Schema da tabela professionals já contém os campos opcionais:
 *   council_uf, phone, clinic_name, clinic_address, website, profile_photo_url,
 *   is_declared, declared_at — nenhuma migration necessária.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, FileText, Camera, AlertTriangle, Check, X,
  ScanLine, Image as ImageIcon, Sparkles,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Select, type SelectOption } from '../../../components/ui/Select';
import { useToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import { withTimeout } from '../../../lib/withTimeout';
import { useAuthStore } from '../../../stores/authStore';
import { useMyProfessional } from '../../../hooks/useProfessional';
import { getErrorMessage } from '../../../utils/errorMessages';
import type { ProfessionalType } from '../../../types/database';

// Tipos profissionais — devem casar com CHECK constraint da tabela professionals.
// Labels via i18n (chave onboarding.pro.type.* já existe no pt-BR/en-US).
const PROFESSIONAL_TYPES: readonly ProfessionalType[] = [
  // Saúde
  'veterinarian', 'vet_tech', 'nutritionist', 'zootechnist',
  'breeder', 'ong_member',
  // Operacionais
  'groomer', 'trainer', 'walker', 'sitter', 'boarding',
  'shop_employee', 'transport',
  // Criativos / administrativos
  'pet_photographer', 'pet_designer', 'vet_dispatcher',
  'adoption_consultant', 'show_judge', 'sport_instructor',
] as const;

// Especialidades sugeridas — chips selecionáveis. Tutor pode adicionar livre.
const SUGGESTED_SPECIALTIES = [
  'Clínica Geral', 'Dermatologia', 'Cardiologia', 'Oncologia',
  'Ortopedia', 'Oftalmologia', 'Nutrição', 'Comportamento',
  'Odontologia', 'Acupuntura', 'Homeopatia', 'Anestesiologia',
];

// Países comuns — picker. Default = locale do device.
const COUNTRY_OPTIONS: SelectOption[] = [
  { value: 'BR', label: 'Brasil' },
  { value: 'PT', label: 'Portugal' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'GB', label: 'Reino Unido' },
  { value: 'ES', label: 'Espanha' },
  { value: 'MX', label: 'México' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CA', label: 'Canadá' },
  { value: 'FR', label: 'França' },
  { value: 'DE', label: 'Alemanha' },
  { value: 'IT', label: 'Itália' },
  { value: 'JP', label: 'Japão' },
  { value: 'CN', label: 'China' },
  { value: 'AU', label: 'Austrália' },
  { value: 'OTHER', label: 'Outro' },
];

interface ScanResult {
  document_type: string;
  full_name: string | null;
  council_name: string | null;
  council_number: string | null;
  council_uf: string | null;
  country: string | null;
  specialties: string[];
  valid_until: string | null;
  institution: string | null;
  confidence: number;
}

export default function ProfessionalRegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();
  const { professional, isLoading } = useMyProfessional();

  // Se já tem perfil profissional ativo, vai direto pro dashboard
  React.useEffect(() => {
    if (!isLoading && professional) {
      router.replace('/(app)/professional/dashboard' as never);
    }
  }, [isLoading, professional, router]);

  // Form state
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [professionalType, setProfessionalType] = useState<ProfessionalType | ''>('');
  const [countryCode, setCountryCode] = useState<string>(
    (i18n.language.split('-')[1] ?? 'BR').toUpperCase(),
  );
  const [councilName, setCouncilName] = useState('');
  const [councilNumber, setCouncilNumber] = useState('');
  const [councilUf, setCouncilUf] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [termoAccepted, setTermoAccepted] = useState(false);

  // ── Scanner de documento ────────────────────────────────────────────────────
  const handleScanDocument = useCallback(async () => {
    if (scanning) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      toast(t('toast.cameraPermission'), 'warning');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setScanning(true);
    try {
      const FileSystem = require('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'base64' });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('scan-professional-document', {
          body: { photo_base64: base64, language: i18n.language },
        }),
        90_000,
        'scan-professional-document',
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const scan = data as ScanResult;

      // Preenche campos automaticamente — só sobrescreve se vier valor real
      if (scan.full_name) setDisplayName(scan.full_name);
      if (scan.council_name) setCouncilName(scan.council_name);
      if (scan.council_number) setCouncilNumber(scan.council_number);
      if (scan.council_uf) setCouncilUf(scan.council_uf);
      if (scan.country) {
        // Tenta mapear nome do país pra ISO code; se não casar, mantém atual
        const map: Record<string, string> = {
          'brazil': 'BR', 'brasil': 'BR',
          'portugal': 'PT',
          'united states': 'US', 'usa': 'US',
          'united kingdom': 'GB', 'uk': 'GB',
          'spain': 'ES', 'españa': 'ES',
          'mexico': 'MX', 'méxico': 'MX',
          'argentina': 'AR',
          'canada': 'CA', 'canadá': 'CA',
          'france': 'FR', 'frança': 'FR',
          'germany': 'DE', 'alemanha': 'DE',
          'italy': 'IT', 'itália': 'IT',
        };
        const code = map[scan.country.toLowerCase()];
        if (code) setCountryCode(code);
      }
      if (scan.specialties?.length) {
        setSpecialties((prev) => {
          const merged = new Set([...prev, ...scan.specialties]);
          return Array.from(merged).slice(0, 12);
        });
      }
      if (scan.institution && !bio) {
        setBio(scan.institution);
      }

      toast(t('professional.scanSuccess'), 'success');
    } catch (err) {
      console.error('[professional/register] scan failed:', err);
      toast(t('professional.scanError'), 'error');
    } finally {
      setScanning(false);
    }
  }, [scanning, toast, t, i18n.language, bio]);

  // ── Foto de perfil ──────────────────────────────────────────────────────────
  const handlePickProfilePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast(t('toast.galleryPermission'), 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]) {
      setProfilePhotoUri(result.assets[0].uri);
    }
  }, [toast, t]);

  // ── Especialidades — toggle de chip ─────────────────────────────────────────
  const toggleSpecialty = useCallback((s: string) => {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }, []);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const canSubmit = useMemo(() => (
    !!userId &&
    !!professionalType &&
    !!countryCode &&
    displayName.trim().length >= 2 &&
    termoAccepted &&
    !submitting
  ), [userId, professionalType, countryCode, displayName, termoAccepted, submitting]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !userId || !professionalType) return;
    setSubmitting(true);
    try {
      // 1. Upload da foto de perfil (se selecionada)
      let profilePhotoUrl: string | null = null;
      if (profilePhotoUri) {
        try {
          const FileSystem = require('expo-file-system/legacy');
          const base64 = await FileSystem.readAsStringAsync(profilePhotoUri, { encoding: 'base64' });
          const binaryStr = atob(base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
          const fileName = `${userId}/professional/${Date.now()}_avatar.jpg`;
          const { data: upData, error: upErr } = await withTimeout(
            supabase.storage.from('avatars').upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true }),
            30_000,
            'storage.upload:avatars',
          );
          if (!upErr && upData?.path) {
            profilePhotoUrl = supabase.storage.from('avatars').getPublicUrl(upData.path).data.publicUrl;
          }
        } catch (e) {
          // Upload falhou — segue sem foto, não bloqueia cadastro
          console.warn('[professional/register] profile photo upload failed:', e);
        }
      }

      // 2. Insert em professionals
      const { error: insErr } = await supabase
        .from('professionals')
        .insert({
          user_id: userId,
          display_name: displayName.trim(),
          professional_type: professionalType,
          country_code: countryCode.toUpperCase().slice(0, 2),
          council_name: councilName.trim() || null,
          council_number: councilNumber.trim() || null,
          council_uf: councilUf.trim() || null,
          phone: phone.trim() || null,
          clinic_name: clinicName.trim() || null,
          clinic_address: clinicAddress.trim() || null,
          website: website.trim() || null,
          bio: bio.trim() || null,
          specialties: specialties.length > 0 ? specialties : null,
          languages: [i18n.language ?? 'pt-BR'],
          profile_photo_url: profilePhotoUrl,
          is_declared: true,
          declared_at: new Date().toISOString(),
          is_active: true,
        });

      if (insErr) throw insErr;

      // 3. Atualiza role do usuário
      const { error: roleErr } = await supabase
        .from('users')
        .update({ role: 'professional' })
        .eq('id', userId);

      if (roleErr) {
        // Cadastro foi feito, mas role não atualizou — log e segue. Tutor pode
        // re-tentar a partir do dashboard que detecta o problema.
        console.warn('[professional/register] role update failed:', roleErr);
      }

      // Invalida caches dependentes do perfil profissional + role.
      // useMyProfessional → o card no /profile re-renderiza como "ativo".
      // RPCs gated por is_tutor_role / professionals → re-fetch ao reabrir telas.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['my-professional', userId] }),
        qc.invalidateQueries({ queryKey: ['my-patients'] }),
      ]);

      toast(t('professional.registered'), 'success');
      router.replace('/(app)/professional/dashboard' as never);
    } catch (err) {
      console.error('[professional/register] submit failed:', err);
      toast(getErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit, userId, professionalType, countryCode, displayName,
    councilName, councilNumber, councilUf, phone, clinicName, clinicAddress,
    website, bio, specialties, profilePhotoUri, i18n.language, toast, t, router, qc,
  ]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const typeOptions: SelectOption<ProfessionalType>[] = useMemo(
    () => PROFESSIONAL_TYPES.map((value) => ({
      value,
      label: t(`onboarding.pro.type.${value}`),
    })),
    [t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('professional.registerTitle')}</Text>
          <View style={{ width: rs(26) }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>{t('professional.registerSub')}</Text>

          {/* Scanner Banner */}
          <View style={styles.scannerBanner}>
            <View style={styles.scannerIcon}>
              <ScanLine size={rs(22)} color={colors.click} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scannerTitle}>{t('professional.scanDoc')}</Text>
              <Text style={styles.scannerSub}>{t('professional.scanDocHint')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.scanBtn, scanning && styles.scanBtnLoading]}
              onPress={handleScanDocument}
              disabled={scanning}
              activeOpacity={0.8}
            >
              {scanning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Camera size={rs(16)} color="#fff" strokeWidth={2} />
                  <Text style={styles.scanBtnText}>{t('professional.scan')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Foto de perfil — opcional */}
          <Text style={styles.sectionLabel}>{t('professional.profilePhoto')}</Text>
          <TouchableOpacity
            style={styles.photoPicker}
            onPress={handlePickProfilePhoto}
            activeOpacity={0.7}
          >
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <ImageIcon size={rs(28)} color={colors.click} strokeWidth={1.5} />
                <Text style={styles.photoPlaceholderText}>{t('professional.pickPhoto')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Dados obrigatórios */}
          <Text style={styles.sectionLabel}>
            {t('professional.requiredData')} <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.field}>
            <Input
              label={t('professional.displayName')}
              placeholder={t('professional.displayNamePlaceholder')}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('professional.professionalType')}</Text>
            <Select<ProfessionalType>
              value={professionalType}
              options={typeOptions}
              onChange={setProfessionalType}
              placeholder={t('professional.selectType')}
              sheetTitle={t('professional.professionalType')}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('professional.country')}</Text>
            <Select
              value={countryCode}
              options={COUNTRY_OPTIONS}
              onChange={setCountryCode}
              placeholder={t('professional.selectCountry')}
              sheetTitle={t('professional.country')}
            />
          </View>

          {/* Conselho — opcional */}
          <Text style={styles.sectionLabel}>{t('professional.councilSection')}</Text>
          <Text style={styles.sectionHint}>{t('professional.councilHint')}</Text>

          <View style={styles.field}>
            <Input
              label={t('professional.councilName')}
              placeholder={t('professional.councilNameHint')}
              value={councilName}
              onChangeText={setCouncilName}
              showMic={false}
            />
          </View>

          <View style={styles.row2}>
            <View style={[styles.field, styles.rowItem]}>
              <Input
                label={t('professional.councilNumber')}
                placeholder="12345"
                value={councilNumber}
                onChangeText={setCouncilNumber}
                showMic={false}
              />
            </View>
            <View style={[styles.field, styles.rowItem]}>
              <Input
                label={t('professional.councilUf')}
                placeholder="SP"
                value={councilUf}
                onChangeText={(v) => setCouncilUf(v.toUpperCase().slice(0, 4))}
                showMic={false}
              />
            </View>
          </View>

          {/* Especialidades */}
          <Text style={styles.sectionLabel}>{t('professional.specialties')}</Text>
          <View style={styles.chipRow}>
            {SUGGESTED_SPECIALTIES.map((s) => {
              const selected = specialties.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSpecialty(s)}
                  activeOpacity={0.8}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  {selected && <Check size={rs(12)} color={colors.click} strokeWidth={2.5} />}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Contato + clínica */}
          <Text style={styles.sectionLabel}>{t('professional.contactSection')}</Text>

          <View style={styles.field}>
            <Input
              label={t('professional.phone')}
              placeholder="+55 11 99999-9999"
              value={phone}
              onChangeText={setPhone}
              showMic={false}
            />
          </View>

          <View style={styles.field}>
            <Input
              label={t('professional.clinicName')}
              placeholder={t('professional.clinicNamePlaceholder')}
              value={clinicName}
              onChangeText={setClinicName}
            />
          </View>

          <View style={styles.field}>
            <Input
              label={t('professional.clinicAddress')}
              placeholder={t('professional.clinicAddressPlaceholder')}
              value={clinicAddress}
              onChangeText={setClinicAddress}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Input
              label={t('professional.website')}
              placeholder="https://"
              value={website}
              onChangeText={setWebsite}
              showMic={false}
            />
          </View>

          <View style={styles.field}>
            <Input
              label={t('professional.bio')}
              placeholder={t('professional.bioHint')}
              value={bio}
              onChangeText={(v) => setBio(v.slice(0, 300))}
              multiline
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>

          {/* Termo de Responsabilidade — OBRIGATÓRIO */}
          <View style={styles.termoContainer}>
            <View style={styles.termoHeader}>
              <AlertTriangle size={rs(18)} color={colors.gold} strokeWidth={1.8} />
              <Text style={styles.termoTitle}>{t('professional.termoTitle')}</Text>
            </View>
            <Text style={styles.termoText}>{t('professional.termoBody')}</Text>

            <TouchableOpacity
              style={styles.termoCheck}
              onPress={() => setTermoAccepted(!termoAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termoAccepted && styles.checkboxActive]}>
                {termoAccepted && <Check size={rs(12)} color="#fff" strokeWidth={2.5} />}
              </View>
              <Text style={styles.checkboxLabel}>
                {t('professional.termoAccept')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Submit */}
          <View style={styles.submitWrap}>
            <Button
              label={t('professional.createAccount')}
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
            />
            {!termoAccepted && (
              <Text style={styles.termoRequired}>
                {t('professional.termoRequired')}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
  scroll: { padding: spacing.md, paddingBottom: rs(40) },
  subtitle: {
    color: colors.textSec, fontSize: fs(13), textAlign: 'center',
    lineHeight: fs(19), marginBottom: spacing.lg,
  },

  // Scanner banner
  scannerBanner: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing,
    borderRadius: radii.lg, padding: rs(14), marginBottom: spacing.lg,
  },
  scannerIcon: {
    width: rs(40), height: rs(40), borderRadius: rs(20),
    backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center',
  },
  scannerTitle: { color: colors.text, fontSize: fs(13), fontWeight: '700' },
  scannerSub: { color: colors.textDim, fontSize: fs(11), marginTop: rs(2), lineHeight: fs(15) },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    backgroundColor: colors.click, paddingHorizontal: rs(14), paddingVertical: rs(10),
    borderRadius: radii.md, minWidth: rs(90), justifyContent: 'center',
  },
  scanBtnLoading: { opacity: 0.7 },
  scanBtnText: { color: '#fff', fontSize: fs(12), fontWeight: '700' },

  // Foto de perfil
  photoPicker: {
    alignSelf: 'center', marginBottom: spacing.md,
  },
  photoPreview: {
    width: rs(96), height: rs(96), borderRadius: rs(48),
    borderWidth: 2.5, borderColor: colors.click + '40',
  },
  photoPlaceholder: {
    width: rs(96), height: rs(96), borderRadius: rs(48),
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    gap: rs(4),
  },
  photoPlaceholderText: { color: colors.textDim, fontSize: fs(10), fontWeight: '600' },

  // Section labels
  sectionLabel: {
    color: colors.text, fontSize: fs(13), fontWeight: '700',
    marginTop: spacing.md, marginBottom: spacing.xs, letterSpacing: 0.3,
  },
  sectionHint: {
    color: colors.textDim, fontSize: fs(11), marginBottom: spacing.sm, lineHeight: fs(16),
  },
  required: { color: colors.click },

  // Fields
  field: { marginBottom: spacing.sm },
  fieldLabel: {
    color: colors.textSec, fontSize: fs(11), fontWeight: '600',
    marginBottom: rs(6), letterSpacing: 0.3,
  },
  row2: { flexDirection: 'row', gap: rs(10) },
  rowItem: { flex: 1 },
  charCount: {
    color: colors.textDim, fontSize: fs(10), textAlign: 'right',
    marginTop: rs(4), fontWeight: '500',
  },

  // Chips de especialidade
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8), marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: rs(4),
    paddingHorizontal: rs(12), paddingVertical: rs(8),
    borderRadius: radii.md, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.clickSoft, borderColor: colors.click },
  chipText: { color: colors.textSec, fontSize: fs(12), fontWeight: '600' },
  chipTextSelected: { color: colors.click },

  // Termo
  termoContainer: {
    backgroundColor: colors.gold + '12', borderWidth: 1, borderColor: colors.gold + '40',
    borderRadius: radii.lg, padding: rs(16), gap: rs(10), marginTop: spacing.lg,
  },
  termoHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  termoTitle: { color: colors.gold, fontSize: fs(13), fontWeight: '700', letterSpacing: 0.3 },
  termoText: {
    color: colors.text, fontSize: fs(12), lineHeight: fs(18),
  },
  termoCheck: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10), marginTop: rs(4) },
  checkbox: {
    width: rs(20), height: rs(20), borderWidth: 1.5, borderColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginTop: rs(2),
  },
  checkboxActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkboxLabel: {
    flex: 1, color: colors.text, fontSize: fs(12), fontWeight: '600', lineHeight: fs(17),
  },

  // Submit
  submitWrap: { marginTop: spacing.lg },
  termoRequired: {
    color: colors.gold, fontSize: fs(11), textAlign: 'center',
    marginTop: spacing.sm, fontWeight: '600',
  },
});
