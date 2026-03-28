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
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft, User, Mail, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Input } from '../../components/ui/Input';
import PasswordMeter from '../../components/PasswordMeter';
import * as auth from '../../lib/auth';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Obrigatório';
    if (!email.includes('@')) e.email = 'Email inválido';
    if (password.length < 8) e.password = 'Mínimo 8 caracteres';
    else if (!/[A-Z]/.test(password)) e.password = 'Precisa de maiúscula';
    else if (!/[0-9]/.test(password)) e.password = 'Precisa de número';
    else if (!/[^A-Za-z0-9]/.test(password)) e.password = 'Precisa de caractere especial';
    if (password !== confirm) e.confirm = 'Senhas não coincidem';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await auth.signUp(email, password, name);
      if (error) throw error;
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
            <ChevronLeft size={18} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('auth.createAccount')}</Text>
            <Text style={styles.subtitle}>Passo 1 de 2 — Dados pessoais</Text>
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
          placeholder="Ana Martins"
          value={name}
          onChangeText={(v) => { setName(v); clearError('name'); }}
          error={errors.name}
          icon={<User size={20} color={colors.petrol} strokeWidth={1.8} />}
        />

        <Input
          label={t('auth.email')}
          placeholder="ana@email.com"
          value={email}
          onChangeText={(v) => { setEmail(v); clearError('email'); }}
          type="email"
          error={errors.email}
          icon={<Mail size={20} color={colors.petrol} strokeWidth={1.8} />}
        />

        <Input
          label={t('auth.password')}
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChangeText={(v) => { setPassword(v); clearError('password'); }}
          type="password"
          showMic={false}
          error={errors.password}
          icon={<Lock size={20} color={colors.accent} strokeWidth={1.8} />}
        />

        <PasswordMeter password={password} />

        <Input
          label={t('auth.confirmPassword')}
          placeholder="Repita a senha"
          value={confirm}
          onChangeText={(v) => { setConfirm(v); clearError('confirm'); }}
          type="password"
          showMic={false}
          error={errors.confirm}
          icon={<Lock size={20} color={colors.accent} strokeWidth={1.8} />}
        />

        {/* Register button */}
        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.btnWrap}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            style={styles.btn}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>{t('common.next')}</Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2} />
              </>
            )}
          </LinearGradient>
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
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 18,
    paddingBottom: 24,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
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
    fontSize: 22,
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: colors.textDim,
    marginTop: 3,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  progressActive: {
    backgroundColor: colors.accent,
  },
  generalError: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  btnWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: radii.xl,
  },
  btnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: '#fff',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: colors.textGhost,
  },
  loginLink: {
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    color: colors.accent,
  },
});
