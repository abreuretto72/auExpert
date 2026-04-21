import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, ChevronLeft, Mail, Send } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
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
      setError(t('auth.errorInvalidEmail'));
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ChevronLeft size={rs(18)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('auth.resetPassword')}</Text>
            <Text style={styles.subtitle}>
              {t('auth.forgotSubtitle')}
            </Text>
          </View>
        </View>

        {sent ? (
          <View style={styles.successSection}>
            <View style={styles.sentIconWrap}>
              <Send size={rs(32)} color={colors.accent} strokeWidth={1.5} />
            </View>
            <Text style={styles.sentTitle}>{t('auth.emailSentTitle')}</Text>
            <Text style={styles.sentText}>
              {t('auth.emailSentPrefix')}{' '}
              <Text style={styles.sentEmail}>{email}</Text>.{'\n'}
              {t('auth.emailSentBody')}
            </Text>
            <Alert
              variant="info"
              message={t('auth.emailSentHint')}
            />
            <TouchableOpacity
              onPress={() => { setSent(false); }}
              style={styles.resendBtn}
            >
              <Text style={styles.resendText}>{t('auth.resendEmail')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backToLogin}
            >
              <Text style={styles.backToLoginText}>
                {t('auth.backToLogin')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Input
              label={t('auth.email')}
              placeholder={t('auth.placeholderEmail')}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              type="email"
              error={error}
              icon={<Mail size={rs(20)} color={colors.petrol} strokeWidth={1.8} />}
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
                    <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
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
    backgroundColor: colors.bg,
    paddingHorizontal: rs(28),
    paddingBottom: rs(40),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(14),
    paddingTop: rs(18),
    paddingBottom: rs(32),
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
  successSection: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  sentIconWrap: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.sm),
  },
  sentTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(22),
    color: colors.text,
  },
  sentText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: rs(22),
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
    fontSize: fs(13),
    color: colors.petrol,
    textDecorationLine: 'underline',
  },
  backToLogin: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  backToLoginText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.accent,
  },
  btnWrap: {
    borderRadius: rs(radii.xl),
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.25,
    shadowRadius: rs(30),
    elevation: 6,
    marginTop: rs(spacing.sm),
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
  cancelRow: {
    alignSelf: 'center',
    marginTop: rs(20),
  },
  cancelText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textDim,
  },
});
