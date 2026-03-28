import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ArrowRight, Fingerprint, ScanFace, Mail, Lock } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Input } from '../../components/ui/Input';
import PetauLogo from '../../components/PetauLogo';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/errorMessages';

export default function LoginScreen() {
  console.log('[LoginScreen] Renderizando...');
  const { t } = useTranslation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<number[]>([]);
  const [hasBiometric, setHasBiometric] = useState(false);
  const login = useAuthStore((s) => s.login);
  const biometricLogin = useAuthStore((s) => s.biometricLogin);
  const hasBioCredentials = useAuthStore((s) => s.hasBioCredentials);

  const autoTriggeredRef = useRef(false);
  const [bioReady, setBioReady] = useState(false);

  // Detectar biometria disponível e credenciais salvas
  useEffect(() => {
    (async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          setHasBiometric(true);
          const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
          setBiometricTypes(types);
        }
      } catch {
        // Dispositivo sem suporte — silencioso
      }
      await useAuthStore.getState().checkBioCredentials();
      setBioReady(true);
    })();
  }, []);

  const hasFingerprint = biometricTypes.includes(
    LocalAuthentication.AuthenticationType.FINGERPRINT,
  );
  const hasFaceId = biometricTypes.includes(
    LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
  );

  const handleLogin = async () => {
    if (!email.includes('@')) {
      setError('Informe um e-mail valido');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(app)');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = useCallback(async (_type: 'finger' | 'face') => {
    if (!hasBiometric) {
      toast(t('toast.noBiometric'), 'warning');
      return;
    }

    // Verificar se tem credenciais salvas (login anterior)
    if (!hasBioCredentials) {
      toast(t('toast.loginFirst'), 'info');
      return;
    }

    setBioLoading(true);
    try {
      // Solicitar autenticacao biometrica REAL (sem fallback para PIN)
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('auth.biometricPrompt', 'Entrar no PetauLife+'),
        cancelLabel: t('common.cancel', 'Cancelar'),
        disableDeviceFallback: true,
      });

      if (result.success) {
        // Biometria OK — restaurar sessao via refresh token salvo
        await biometricLogin();
        toast(t('toast.biometricSuccess'), 'success');
        router.replace('/(app)');
      } else if (result.error === 'user_cancel') {
        // Cancelou — nada a fazer
      } else {
        toast(t('toast.biometricFail'), 'error');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'NO_BIO_CREDENTIALS') {
        toast(t('toast.loginFirst'), 'info');
      } else if (msg === 'SESSION_EXPIRED') {
        toast(t('toast.sessionExpired'), 'info');
      } else {
        toast(t('toast.biometricFail'), 'error');
      }
    } finally {
      setBioLoading(false);
    }
  }, [hasBiometric, hasBioCredentials, biometricLogin, toast, t]);

  // Biometria automática: se já logou antes, dispara sem precisar tocar em nada
  useEffect(() => {
    if (!bioReady || autoTriggeredRef.current) return;
    const { hasBioCredentials: hasCreds } = useAuthStore.getState();
    if (hasCreds && hasBiometric) {
      autoTriggeredRef.current = true;
      setTimeout(() => handleBiometric('finger'), 400);
    }
  }, [bioReady, hasBiometric, handleBiometric]);

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
        {/* Ambient glow */}
        <View style={styles.ambientGlow} />

        {/* Logo + Tagline */}
        <View style={styles.logoSection}>
          <PetauLogo size="large" />
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label={t('auth.email')}
            placeholder="seu@email.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            type="email"
            icon={<Mail size={20} color={colors.petrol} strokeWidth={1.8} />}
          />

          <Input
            label={t('auth.password')}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            type="password"
            showMic={false}
            error={error}
            icon={<Lock size={20} color={colors.accent} strokeWidth={1.8} />}
          />

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgotBtn}
          >
            <Text style={styles.forgotText}>{t('auth.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            style={styles.loginBtnWrap}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>{t('auth.enterButton')}</Text>
                  <ArrowRight size={18} color="#fff" strokeWidth={2} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Biometric buttons — with glow (v5) */}
          {(hasFingerprint || hasFaceId) && (
            <View style={styles.bioRow}>
              {/* Fingerprint */}
              {hasFingerprint && (
                <TouchableOpacity
                  onPress={() => handleBiometric('finger')}
                  activeOpacity={0.7}
                  disabled={bioLoading}
                  style={[styles.bioBtn, styles.bioBtnFinger, bioLoading && styles.bioBtnDisabled]}
                >
                  <View style={[styles.bioOrb, { backgroundColor: colors.accentGlow }]} />
                  {bioLoading ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <Fingerprint size={36} color={colors.accent} strokeWidth={1.4} />
                  )}
                  <Text style={styles.bioLabel}>{t('auth.biometricFinger')}</Text>
                </TouchableOpacity>
              )}

              {/* Face ID */}
              {hasFaceId && (
                <TouchableOpacity
                  onPress={() => handleBiometric('face')}
                  activeOpacity={0.7}
                  disabled={bioLoading}
                  style={[styles.bioBtn, styles.bioBtnFace, bioLoading && styles.bioBtnDisabled]}
                >
                  <View style={[styles.bioOrb, { backgroundColor: colors.purpleSoft }]} />
                  {bioLoading ? (
                    <ActivityIndicator size="small" color={colors.purple} />
                  ) : (
                    <ScanFace size={36} color={colors.purple} strokeWidth={1.4} />
                  )}
                  <Text style={styles.bioLabel}>{t('auth.biometricFace')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Fallback: sem biometria no dispositivo */}
          {!hasFingerprint && !hasFaceId && hasBiometric === false && (
            <View style={styles.bioRow}>
              <TouchableOpacity
                onPress={() => handleBiometric('finger')}
                activeOpacity={0.7}
                style={[styles.bioBtn, styles.bioBtnFinger]}
              >
                <View style={[styles.bioOrb, { backgroundColor: colors.accentGlow }]} />
                <Fingerprint size={36} color={colors.accent} strokeWidth={1.4} />
                <Text style={styles.bioLabel}>{t('auth.biometricFinger')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleBiometric('face')}
                activeOpacity={0.7}
                style={[styles.bioBtn, styles.bioBtnFace]}
              >
                <View style={[styles.bioOrb, { backgroundColor: colors.purpleSoft }]} />
                <ScanFace size={36} color={colors.purple} strokeWidth={1.4} />
                <Text style={styles.bioLabel}>{t('auth.biometricFace')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t('auth.newHere')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>{t('auth.createAccount')}</Text>
            </TouchableOpacity>
          </View>
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
  ambientGlow: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: colors.accentSoft,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 36,
  },
  tagline: {
    fontFamily: 'Sora_500Medium',
    fontSize: 14,
    color: 'rgba(232, 237, 242, 0.75)',
    letterSpacing: 0.5,
    marginTop: 18,
  },
  form: {
    flex: 1,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 28,
  },
  forgotText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: colors.accent,
    letterSpacing: 0.2,
  },
  loginBtnWrap: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: radii.xl,
  },
  loginBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: '#fff',
    letterSpacing: 0.3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: colors.textGhost,
  },
  bioRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 36,
  },
  bioBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 22,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bioBtnFinger: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 129, 58, 0.3)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  },
  bioBtnFace: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: 'rgba(155, 89, 182, 0.3)',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 3,
  },
  bioBtnDisabled: {
    opacity: 0.6,
  },
  bioOrb: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  bioLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 11,
    color: colors.textSec,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: colors.textDim,
  },
  registerLink: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: colors.accent,
  },
});
