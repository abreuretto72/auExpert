import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowRight,
  ChevronLeft,
  User,
  Mail,
  Lock,
  Calendar,
  Check,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { Input } from '../../components/ui/Input';
import PasswordMeter from '../../components/PasswordMeter';
import * as auth from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { recordUserLogin } from '../../lib/recordUserLogin';
import {
  formatDateInput,
  getDatePlaceholder,
  parseDateInput,
} from '../../utils/format';

// GDPR-16 locales (strict parental-consent threshold).
// Any other locale falls back to 13 (LGPD Art. 14 / COPPA / Apple baseline).
const GDPR_16_LANGS = ['de', 'fr', 'nl', 'pl', 'sv', 'fi', 'cs', 'hu', 'ro'];

function getMinAgeForLocale(locale: string): number {
  const lang = locale.toLowerCase().split('-')[0];
  return GDPR_16_LANGS.includes(lang) ? 16 : 13;
}

function calcAgeYears(isoDate: string): number {
  const birth = new Date(isoDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const minAge = getMinAgeForLocale(i18n.language);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) e.name = t('auth.errorNameRequired');
    if (!email.includes('@')) e.email = t('auth.errorInvalidEmail');

    const iso = parseDateInput(birthDate, i18n.language);
    if (!iso) {
      e.birthDate = t('auth.errorBirthDateRequired');
    } else if (calcAgeYears(iso) < minAge) {
      e.birthDate = t('auth.errorMinAge', { age: minAge });
    }

    if (password.length < 8) e.password = t('auth.errorPasswordMin');
    else if (!/[A-Z]/.test(password)) e.password = t('auth.errorPasswordUpper');
    else if (!/[0-9]/.test(password)) e.password = t('auth.errorPasswordNumber');
    else if (!/[^A-Za-z0-9]/.test(password)) e.password = t('auth.errorPasswordSpecial');
    if (password !== confirm) e.confirm = t('auth.errorPasswordMatch');

    if (!acceptedTerms) e.terms = t('auth.errorAcceptTermsRequired');

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const birthIso = parseDateInput(birthDate, i18n.language)!;
      const { data, error } = await auth.signUp(email, password, name, birthIso);
      if (error) throw error;

      // LGPD art. 7º/37 / GDPR art. 7 — persist explicit consent records.
      // User row is auto-created by trigger trg_fn_handle_new_auth_user (migration 006)
      // from auth.users.raw_user_meta_data, but birth_date isn't copied by the trigger,
      // so we update it explicitly here (RLS: users_update permits self-update).
      const userId = data.user?.id;
      if (userId && data.session) {
        const nowIso = new Date().toISOString();
        // Fire-and-log: consent/birth_date audit persistence. If these fail, the
        // raw_user_meta_data mirror (stored via signUp) still preserves the proof.
        await supabase.from('users').update({ birth_date: birthIso }).eq('id', userId);
        await supabase.from('user_consents').insert([
          {
            user_id: userId,
            consent_type: 'terms_of_service',
            granted: true,
            granted_at: nowIso,
            document_version: '1.0',
          },
          {
            user_id: userId,
            consent_type: 'privacy_policy',
            granted: true,
            granted_at: nowIso,
            document_version: '1.0',
          },
        ]);
      }

      // Signup do Supabase já cria a sessão (auto-login). Registrar como
      // primeiro login do tutor — alimenta o card "Dias ativos no mês"
      // de Minhas Estatísticas. Best-effort: não bloqueia, não lança.
      if (data.session) {
        await recordUserLogin('password');
      }

      router.replace('/(app)');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={rs(18)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('auth.registerStep1Subtitle')}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, styles.progressActive]} />
          <View style={styles.progressBar} />
        </View>

        {/* General error */}
        {errors.general && (
          <Text style={styles.generalError}>{errors.general}</Text>
        )}

        {/* Form fields */}
        <Input
          label={t('auth.fullName')}
          placeholder={t('auth.placeholderName')}
          value={name}
          onChangeText={(v) => { setName(v); clearError('name'); }}
          error={errors.name}
          icon={<User size={rs(20)} color={colors.petrol} strokeWidth={1.8} />}
        />

        <Input
          label={t('auth.email')}
          placeholder={t('auth.placeholderEmail')}
          value={email}
          onChangeText={(v) => { setEmail(v); clearError('email'); }}
          type="email"
          error={errors.email}
          icon={<Mail size={rs(20)} color={colors.petrol} strokeWidth={1.8} />}
        />

        <Input
          label={t('auth.birthDate')}
          placeholder={getDatePlaceholder(i18n.language)}
          value={birthDate}
          onChangeText={(v) => {
            setBirthDate(formatDateInput(v, i18n.language));
            clearError('birthDate');
          }}
          type="numeric"
          showMic={false}
          error={errors.birthDate}
          icon={<Calendar size={rs(20)} color={colors.petrol} strokeWidth={1.8} />}
        />

        <Input
          label={t('auth.password')}
          placeholder={t('auth.placeholderPasswordMin')}
          value={password}
          onChangeText={(v) => { setPassword(v); clearError('password'); }}
          type="password"
          showMic={false}
          error={errors.password}
          icon={<Lock size={rs(20)} color={colors.click} strokeWidth={1.8} />}
        />

        <PasswordMeter password={password} />

        <Input
          label={t('auth.confirmPassword')}
          placeholder={t('auth.placeholderConfirmPassword')}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); clearError('confirm'); }}
          type="password"
          showMic={false}
          error={errors.confirm}
          icon={<Lock size={rs(20)} color={colors.click} strokeWidth={1.8} />}
        />

        {/* Consent checkbox — LGPD art. 7º / GDPR art. 7 */}
        <TouchableOpacity
          onPress={() => {
            setAcceptedTerms((v) => !v);
            clearError('terms');
          }}
          activeOpacity={0.8}
          style={styles.consentRow}
        >
          <View
            style={[
              styles.checkbox,
              acceptedTerms && styles.checkboxChecked,
              !!errors.terms && styles.checkboxError,
            ]}
          >
            {acceptedTerms && (
              <Check size={rs(14)} color="#fff" strokeWidth={2.5} />
            )}
          </View>
          <Text style={styles.consentText}>
            {t('auth.acceptTermsPrefix')}{' '}
            <Text
              style={styles.consentLink}
              onPress={(ev) => {
                ev.stopPropagation();
                router.push('/(app)/terms');
              }}
            >
              {t('auth.readTerms')}
            </Text>{' '}
            {t('auth.acceptTermsMiddle')}{' '}
            <Text
              style={styles.consentLink}
              onPress={(ev) => {
                ev.stopPropagation();
                router.push('/(app)/privacy');
              }}
            >
              {t('auth.readPrivacy')}
            </Text>
            .
          </Text>
        </TouchableOpacity>
        {errors.terms && <Text style={styles.consentErrorText}>{errors.terms}</Text>}

        {/* Register button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading || !acceptedTerms}
          activeOpacity={0.8}
          style={[styles.btnWrap, !acceptedTerms && styles.btnDisabled]}
        >
          <View style={[styles.btn, { backgroundColor: colors.click }]}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>{t('common.next')}</Text>
                <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>{t('auth.alreadyHaveAccount')} </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginLink}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: rs(28),
    paddingBottom: rs(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingTop: rs(18),
    paddingBottom: rs(24),
  },
  backBtn: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(22),
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    marginTop: rs(3),
  },
  progressRow: {
    flexDirection: 'row',
    gap: rs(6),
    marginBottom: rs(28),
  },
  progressBar: {
    flex: 1,
    height: rs(4),
    borderRadius: rs(2),
    backgroundColor: colors.border,
  },
  progressActive: {
    backgroundColor: colors.click,
  },
  generalError: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.danger,
    textAlign: 'center',
    marginBottom: rs(spacing.md),
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(12),
    paddingVertical: rs(spacing.md),
    paddingHorizontal: rs(4),
  },
  checkbox: {
    width: rs(22),
    height: rs(22),
    borderRadius: rs(6),
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rs(2),
  },
  checkboxChecked: {
    backgroundColor: colors.click,
    borderColor: colors.click,
  },
  checkboxError: {
    borderColor: colors.danger,
  },
  consentText: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: fs(18),
  },
  consentLink: {
    fontFamily: 'Sora_700Bold',
    color: colors.click,
  },
  consentErrorText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.danger,
    marginTop: rs(-6),
    marginBottom: rs(spacing.sm),
    marginLeft: rs(34),
  },
  btnWrap: {
    borderRadius: rs(radii.xl),
    overflow: 'hidden',
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.25,
    shadowRadius: rs(30),
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    paddingVertical: rs(16),
    borderRadius: rs(radii.xl),
  },
  btnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: '#fff',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rs(16),
  },
  loginText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textGhost,
  },
  loginLink: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.click,
  },
});
