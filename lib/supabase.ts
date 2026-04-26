import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';


const createStorageAdapter = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
    };
  }
  // Native: use SecureStore
  const SecureStore = require('expo-secure-store');
  return {
    getItem: (key: string) => SecureStore.getItemAsync(key),
    setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
    removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  };
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createStorageAdapter(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Silencia o `Invalid Refresh Token: Refresh Token Not Found` no startup.
// Esse erro é cosmético: o supabase-js tenta auto-refresh ao boot mesmo quando
// não há token salvo, joga AuthApiError no console.error, mas o cliente
// recupera sozinho (event INITIAL_SESSION com session:true ou SIGNED_OUT).
// Nada quebrou; o erro só polui o log e assusta o desenvolvedor. Filtro:
// preserva qualquer outro erro de auth.
// ─────────────────────────────────────────────────────────────────────────────
const _origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  const first = args[0];
  const msg = typeof first === 'string' ? first
    : first instanceof Error ? first.message
    : (first && typeof first === 'object' && 'message' in first
        ? String((first as { message: unknown }).message)
        : '');
  if (
    msg.includes('Invalid Refresh Token: Refresh Token Not Found') ||
    msg.includes('Refresh Token Not Found')
  ) {
    return; // silencia
  }
  _origConsoleError(...args);
};
