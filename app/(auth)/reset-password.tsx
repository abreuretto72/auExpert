import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Lock, Check, ArrowRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Input } from '../../components/ui/Input';
import PasswordMeter from '../../components/PasswordMeter';
import PetauLogo from '../../components/PetauLogo';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/errorMessages';
import * as auth from '../../lib/auth';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('A senha precisa ter pelo menos 1 letra maiuscula');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('A senha precisa ter pelo menos 1 numero');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError('A senha precisa ter pelo menos 1 caractere especial');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas nao conferem');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { error: err } = await auth.updatePassword(password);
      if (err) throw err;
      setDone(true);
      toast(t('toast.passwordReset'), 'success');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.container}>
        <View style={styles.successCenter}>
          <View style={styles.successIcon}>
            <Check size={40} color={colors.success} strokeWidth={2} />
          </View>
          <Text style={styles.successTitle}>Senha redefinida!</Text>
          <Text style={styles.successText}>
            Sua nova senha esta pronta. Agora voce pode entrar no app.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.8}
            style={styles.btnWrap}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              style={styles.btn}
            >
              <Text style={styles.btnText}>Ir para o Login</Text>
              <ArrowRight size={18} color="#fff" strokeWidth={2} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <PetauLogo size="normal" />
        </View>

        {/* Title */}
        <Text style={styles.title}>Criar nova senha</Text>
        <Text style={styles.subtitle}>
          Escolha uma senha forte para proteger sua conta.
        </Text>

        {/* New password */}
        <Input
          label="Nova senha"
          placeholder="Minimo 8 caracteres"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError('');
          }}
          type="password"
          showMic={false}
          icon={<Lock size={20} color={colors.accent} strokeWidth={1.8} />}
        />

        {password.length > 0 && <PasswordMeter password={password} />}

        {/* Confirm password */}
        <Input
          label="Confirmar nova senha"
          placeholder="Digite novamente"
          value={confirmPassword}
          onChangeText={(v) => {
            setConfirmPassword(v);
            setError('');
          }}
          type="password"
          showMic={false}
          error={error}
          icon={<Lock size={20} color={colors.accent} strokeWidth={1.8} />}
        />

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
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
                <Text style={styles.btnText}>Redefinir senha</Text>
                <ArrowRight size={18} color="#fff" strokeWidth={2} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: 24,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: colors.textSec,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  btnWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
    marginTop: spacing.md,
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
  successCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
});
