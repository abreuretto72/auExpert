import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { useFonts, Sora_300Light, Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, Sora_800ExtraBold } from '@expo-google-fonts/sora';
import { Caveat_400Regular, Caveat_600SemiBold, Caveat_700Bold } from '@expo-google-fonts/caveat';
import { JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { colors } from '../constants/colors';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastProvider } from '../components/Toast';
import { NetworkGuard } from '../components/NetworkGuard';
import { supabase } from '../lib/supabase';
import { restoreQueryCache } from '../lib/offlineCache';
import { initLocalDb } from '../lib/localDb';
import { useSyncQueue } from '../hooks/useSyncQueue';
import '../i18n';

// Activates the SQLite sync queue inside the QueryClientProvider context
function SyncQueueActivator() {
  useSyncQueue();
  return null;
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  console.log('[RootLayout] Renderizando...');
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
    backgroundColor: '#0F1923',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 260,
    height: 80,
  },
});
