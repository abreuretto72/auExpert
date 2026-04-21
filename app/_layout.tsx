import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, AppState } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, getSecureStore, BIO_EMAIL_KEY, BIO_PASS_KEY } from '../stores/authStore';
import { isFirstRun, markAsLaunched } from '../lib/firstRun';
import { useTranslation } from 'react-i18next';
import InviteModal, { type InviteInfo, type InviteMemberRole } from '../components/InviteModal';
import { PetAgeSync } from '../components/PetAgeSync';
import '../i18n';

// Activates the SQLite sync queue inside the QueryClientProvider context
function SyncQueueActivator() {
  useSyncQueue();
  return null;
}

const PENDING_INVITE_KEY = 'auexpert_pending_invite';

function extractInviteToken(url: string): string | null {
  // Formato atual: supabase/functions/v1/invite-web?token=TOKEN
  try {
    const parsed = new URL(url);
    const qToken = parsed.searchParams.get('token');
    if (qToken) return qToken;
  } catch { /* not a valid URL or custom scheme — fall through */ }
  // Deep link recebido de volta do web page: auexpert://invite/TOKEN
  const pathMatch = url.match(/\/invite\/([a-zA-Z0-9]+)/);
  return pathMatch?.[1] ?? null;
}

function extractInviteParams(url: string): { from?: string; pet?: string; role?: string } {
  try {
    const parsed = new URL(url);
    return {
      from: parsed.searchParams.get('from') ?? undefined,
      pet:  parsed.searchParams.get('pet')  ?? undefined,
      role: parsed.searchParams.get('role') ?? undefined,
    };
  } catch {
    return {};
  }
}

// Handles /invite/TOKEN deep links — must be inside QueryClientProvider + ToastProvider
function InviteLinkHandler() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const userEmail = useAuthStore((s) => s.user?.email);

  const [pendingInvite, setPendingInvite] = useState<InviteInfo | null>(null);

  // Busca os detalhes do convite pelo token e exibe o modal.
  // urlParams é fallback quando o SELECT falha (e.g. race condition ou RLS residual).
  const showInviteModal = async (
    token: string,
    urlParams?: { from?: string; pet?: string; role?: string },
  ) => {
    const { data: invite } = await supabase
      .from('pet_members')
      .select('invite_token, role, invited_by, pets(name)')
      .eq('invite_token', token)
      .is('accepted_at', null)
      .maybeSingle();

    // If DB select fails, fall back to URL params so the modal still appears
    const petName =
      (invite?.pets as { name: string } | null)?.name ??
      urlParams?.pet ??
      '—';
    const role = (invite?.role ?? urlParams?.role ?? 'co_parent') as InviteMemberRole;

    let inviterName = urlParams?.from ?? 'Tutor';

    if (invite?.invited_by) {
      const { data: inviter } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', invite.invited_by)
        .maybeSingle();
      inviterName =
        (inviter as { full_name: string | null; email: string } | null)?.full_name ??
        (inviter as { full_name: string | null; email: string } | null)?.email?.split('@')[0] ??
        inviterName;
    }

    // Still show modal even if DB row wasn't readable — doAcceptInvite uses the token directly
    setPendingInvite({ token, petName, inviterName, role });
  };

  const doAcceptInvite = async (token: string, uid: string) => {
    try {
      const { error } = await supabase
        .from('pet_members')
        .update({
          user_id:      uid,
          accepted_at:  new Date().toISOString(),
          invite_token: null,
        })
        .eq('invite_token', token)
        .is('accepted_at', null);

      await AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {});

      if (!error) {
        toast(t('members.inviteAccepted'), 'success');
        qc.invalidateQueries({ queryKey: ['pets'] });
        router.replace('/');
      } else {
        console.error('[invite] erro ao aceitar:', error);
        toast(t('members.inviteError'), 'error');
      }
    } catch (e) {
      console.error('[invite] erro ao aceitar:', e);
    }
  };

  const handleAccept = async (token: string) => {
    setPendingInvite(null);
    await doAcceptInvite(token, userId!);
  };

  const handleDecline = async (token: string) => {
    setPendingInvite(null);
    await AsyncStorage.removeItem(PENDING_INVITE_KEY).catch(() => {});
    await supabase
      .from('pet_members')
      .update({ is_active: false })
      .eq('invite_token', token);
    toast(t('invite.declined'), 'info');
  };

  // Após login: auto-aceitar convites pendentes pelo email (sem modal).
  // Também dispara ao trazer o app para o primeiro plano.
  useEffect(() => {
    if (!isAuthenticated || !userId || !userEmail) return;

    const check = async () => {
      // Deep link token salvo antes do login → ainda mostra modal (fluxo legado)
      const pendingRaw = await AsyncStorage.getItem(PENDING_INVITE_KEY).catch(() => null);
      if (pendingRaw) {
        try {
          const parsed = JSON.parse(pendingRaw) as { token: string; from?: string; pet?: string; role?: string };
          const { token, ...params } = parsed;
          if (token) { await showInviteModal(token, params); return; }
        } catch {
          await showInviteModal(pendingRaw); return;
        }
      }

      // Auto-aceitar todos os convites pendentes pelo e-mail do usuário
      const { data: invites } = await supabase
        .from('pet_members')
        .select('id, pets(name)')
        .eq('email', userEmail)
        .eq('is_active', true)
        .is('accepted_at', null)
        .is('user_id', null);

      let accepted = 0;
      for (const invite of (invites ?? [])) {
        const { error } = await supabase
          .from('pet_members')
          .update({
            user_id:      userId,
            accepted_at:  new Date().toISOString(),
            invite_token: null,
          })
          .eq('id', invite.id)
          .is('accepted_at', null);

        if (!error) {
          const petName = (invite.pets as { name: string } | null)?.name ?? 'Pet';
          toast(t('members.autoAccepted', { petName }), 'success');
          accepted++;
        }
      }

      if (accepted > 0) qc.invalidateQueries({ queryKey: ['pets'] });
    };

    check();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => sub.remove();
  }, [isAuthenticated, userId, userEmail]);

  // Deep link recebido enquanto o app está aberto ou ao abrir
  useEffect(() => {
    const handleUrl = async (url: string) => {
      const token = extractInviteToken(url);
      if (!token) return;

      const params = extractInviteParams(url);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Persist token + params so we can restore after login
        const stored = JSON.stringify({ token, ...params });
        await AsyncStorage.setItem(PENDING_INVITE_KEY, stored);
        toast(t('members.inviteLoginRequired'), 'info');
        router.push('/(auth)/login');
        return;
      }

      await showInviteModal(token, params);
    };

    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return (
    <InviteModal
      invite={pendingInvite}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
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
    (async () => {
      const firstRun = await isFirstRun();

      if (firstRun) {
        // iOS não limpa o Keychain ao desinstalar — sessão do Supabase persiste.
        // AsyncStorage é limpo na desinstalação, então usamos como detector.
        await supabase.auth.signOut();
        const store = getSecureStore();
        await store.deleteItemAsync(BIO_EMAIL_KEY).catch(() => {});
        await store.deleteItemAsync(BIO_PASS_KEY).catch(() => {});
        await markAsLaunched();
        useAuthStore.setState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          hasBioCredentials: false,
        });
      } else {
        // Execução normal — verificar sessão existente
        useAuthStore.getState().checkSession();
      }
    })();

    // Manter em sincronia com qualquer mudança de sessão (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
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
          <PetAgeSync />
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
