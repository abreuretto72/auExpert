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
import { ArrowRight, ChevronLeft, Mail, Send } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Input } from '../../components/ui/Input';
import { Alert } from '../../components/ui/Alert';
import { getErrorMessage } from '../../utils/errorMessages';
import * as auth from '../../lib/auth';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.includes('@')) {
      setError('Informe um e-mail valido');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: err } = await auth.resetPassword(email);
      if (err) throw err;
      setSent(true);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={18} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
            <Text style={styles.subtitle}>
              Enviaremos um link para redefinir sua senha
            </Text>
          </View>
        </View>

        {sent ? (
          <View style={styles.successSection}>
            <View style={styles.sentIconWrap}>
              <Send size={32} color={colors.accent} strokeWidth={1.5} />
            </View>
            <Text style={styles.sentTitle}>E-mail enviado!</Text>
            <Text style={styles.sentText}>
              Enviamos um link para{' '}
              <Text style={styles.sentEmail}>{email}</Text>.{'\n'}
              Abra o e-mail e clique em "Criar nova senha".
            </Text>
            <Alert
              variant="info"
              message="Nao recebeu? Verifique a pasta de spam ou lixo eletronico."
            />
            <TouchableOpacity
              onPress={() => { setSent(false); }}
              style={styles.resendBtn}
            >
              <Text style={styles.resendText}>Enviar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backToLogin}
            >
              <Text style={styles.backToLoginText}>
                Voltar para o Login
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Input
              label={t('auth.email')}
              placeholder="seu@email.com"
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              type="email"
              error={error}
              icon={<Mail size={20} color={colors.petrol} strokeWidth={1.8} />}
            />

            <TouchableOpacity
              onPress={handleReset}
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
                    <Text style={styles.btnText}>
                      {t('auth.sendResetLink')}
                    </Text>
                    <ArrowRight size={18} color="#fff" strokeWidth={2} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.cancelRow}
            >
              <Text style={styles.cancelText}>{t('common.back')}</Text>
            </TouchableOpacity>
          </>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 18,
    paddingBottom: 32,
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
  successSection: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  sentIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sentTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: colors.text,
  },
  sentText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: 22,
  },
  sentEmail: {
    fontFamily: 'Sora_700Bold',
    color: colors.text,
  },
  resendBtn: {
    marginTop: spacing.sm,
  },
  resendText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: colors.petrol,
    textDecorationLine: 'underline',
  },
  backToLogin: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  backToLoginText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: colors.accent,
  },
  btnWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
    marginTop: spacing.sm,
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
  cancelRow: {
    alignSelf: 'center',
    marginTop: 20,
  },
  cancelText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: colors.textDim,
  },
});
