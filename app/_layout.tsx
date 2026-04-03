import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useFonts, Sora_300Light, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { Caveat_400Regular, Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { colors } from '../constants/colors';
import { rs } from '../hooks/useResponsive';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider, useToast } from '../components/Toast';
import { NetworkGuard } from '../components/NetworkGuard';
import { supabase } from '../lib/supabase';
import { restoreQueryCache } from '../lib/offlineCache';
import { initLocalDb } from '../lib/localDb';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';
import '../i18n';

// Activates the SQLite sync queue inside the QueryClientProvider context
function SyncQueueActivator() {
  useSyncQueue();
  return null;
}

// Handles /invite/TOKEN deep links — must be inside QueryClientProvider + ToastProvider
function InviteLinkHandler() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const match = url.match(/invite\/([a-zA-Z0-9-]+)/);
      if (!match) return;
      const token = match[1];
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; // not logged in — user needs to log in first
        const { error } = await supabase
          .from('pet_members')
          .update({
            user_id:      user.id,
            accepted_at:  new Date().toISOString(),
            invite_token: null,
          })
          .eq('invite_token', token)
          .is('accepted_at', null);
        if (!error) {
          toast(t('members.inviteAccepted'), 'success');
          qc.invalidateQueries({ queryKey: ['pets'] });
          router.push('/');
        }
      } catch (e) {
        console.error('[invite] erro ao aceitar:', e);
      }
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return null;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Sora_300Light,
    Sora_400Regular,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Caveat_400Regular,
    Caveat_600SemiBold,
    Caveat_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
    JetBrainsMono_700Bold,
  });

  // Sincronizar authStore com a sessão Supabase real.
  // Sem este listener, isAuthenticated fica false após Metro refresh
  // e usePets nunca executa (enabled: false).
  useEffect(() => {
    // Checar sessão existente imediatamente ao montar
    useAuthStore.getState().checkSession();

    // Manter em sincronia com qualquer mudança de sessão (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[_layout] onAuthStateChange:', _event, '| session:', !!session);
        useAuthStore.setState({
          user: session?.user
            ? { id: session.user.id, email: session.user.email, ...session.user.user_metadata } as never
            : null,
          session: session ? { access_token: session.access_token } : null,
          isAuthenticated: !!session,
          isLoading: false,
        });
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Listener de deep link para reset de senha
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      // O Supabase redireciona com tokens na URL
      // auexpert://reset-password#access_token=xxx&type=recovery
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        // Extrair tokens do fragmento
        const fragment = url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            // Setar a sessao com os tokens recebidos
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken ?? '',
            });
            // Navegar para a tela de nova senha
            router.replace('/(auth)/reset-password');
          }
        }
      }
    };

    // Verificar se o app foi aberto via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // Listener para deep links enquanto o app esta aberto
    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => subscription.remove();
  }, [router]);

  // Inicializar banco SQLite local (one-time, sync)
  useEffect(() => {
    initLocalDb();
  }, []);

  // Restaurar cache salvo ao abrir o app
  useEffect(() => {
    restoreQueryCache(queryClient);
  }, []);

  // Hide the native splash immediately — the in-app loading screen
  // (logotipotrans.png on dark bg) covers while fonts finish loading.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={splashStyles.container}>
        <Image
          source={require('../assets/images/logotipotrans.png')}
          style={splashStyles.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SyncQueueActivator />
        <ToastProvider>
          <InviteLinkHandler />
          <NetworkGuard>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'fade',
              }}
            />
            <StatusBar style="light" />
          </NetworkGuard>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: rs(260),
    height: rs(80),
  },
});
