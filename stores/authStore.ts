import { create } from 'zustand';
import { Platform } from 'react-native';
import type { User } from '../types/database';
import * as auth from '../lib/auth';
import { recordUserLogin } from '../lib/recordUserLogin';

// SecureStore — criptografado pelo hardware (Keychain/Keystore)
export const getSecureStore = () => {
  if (Platform.OS === 'web') {
    return {
      getItemAsync: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItemAsync: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
      deleteItemAsync: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
    };
  }
  return require('expo-secure-store') as {
    getItemAsync: (key: string) => Promise<string | null>;
    setItemAsync: (key: string, value: string) => Promise<void>;
    deleteItemAsync: (key: string) => Promise<void>;
  };
};

export const BIO_EMAIL_KEY = 'auexpert_bio_email';
export const BIO_PASS_KEY = 'auexpert_bio_pass';

interface AuthState {
  user: User | null;
  session: { access_token: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasBioCredentials: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  biometricLogin: () => Promise<void>;
  checkBioCredentials: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  hasBioCredentials: false,

  login: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await auth.signIn(email, password);
    if (error) {
      set({ isLoading: false });
      throw error;
    }

    // Salvar credenciais no SecureStore para biometria futura
    // SecureStore usa Keychain (iOS) / EncryptedSharedPreferences (Android)
    const store = getSecureStore();
    await store.setItemAsync(BIO_EMAIL_KEY, email);
    await store.setItemAsync(BIO_PASS_KEY, password);

    // Registrar login em audit_log — best-effort, alimenta o card "Dias ativos
    // no mês" da tela de estatísticas. Não bloqueia nem lança em caso de falha.
    await recordUserLogin('password');

    set({
      user: { id: data.user?.id, email: data.user?.email, ...data.user?.user_metadata } as User | null,
      session: data.session ? { access_token: data.session.access_token } : null,
      isAuthenticated: !!data.session,
      isLoading: false,
      hasBioCredentials: true,
    });
  },

  logout: async () => {
    await auth.signOut();
    // NAO limpar credenciais — biometria precisa funcionar apos logout
    set({ user: null, session: null, isAuthenticated: false });
  },

  checkSession: async () => {
    set({ isLoading: true });
    const { data } = await auth.getSession();
    console.log(
      '[authStore] checkSession resultado:',
      data.session ? `SESSÃO OK uid=${data.session.user.id.slice(0, 8)}…` : 'SEM SESSÃO',
    );
    set({
      user: data.session?.user ? { id: data.session.user.id, email: data.session.user.email, ...data.session.user.user_metadata } as User | null : null,
      session: data.session ? { access_token: data.session.access_token } : null,
      isAuthenticated: !!data.session,
      isLoading: false,
    });
  },

  biometricLogin: async () => {
    const store = getSecureStore();
    const email = await store.getItemAsync(BIO_EMAIL_KEY);
    const password = await store.getItemAsync(BIO_PASS_KEY);

    if (!email || !password) {
      throw new Error('NO_BIO_CREDENTIALS');
    }

    // Re-login real com as credenciais salvas
    const { data, error } = await auth.signIn(email, password);
    if (error) {
      // Credenciais invalidas (senha mudou?) — limpar
      await store.deleteItemAsync(BIO_EMAIL_KEY);
      await store.deleteItemAsync(BIO_PASS_KEY);
      set({ hasBioCredentials: false });
      throw new Error('SESSION_EXPIRED');
    }

    // Login biométrico bem-sucedido → registrar em audit_log. Best-effort,
    // alimenta o card "Dias ativos no mês". Não bloqueia, não lança.
    await recordUserLogin('biometric');

    // Atualizar credenciais salvas (caso o token tenha rotacionado)
    set({
      user: { id: data.user?.id, email: data.user?.email, ...data.user?.user_metadata } as User | null,
      session: data.session ? { access_token: data.session.access_token } : null,
      isAuthenticated: !!data.session,
      hasBioCredentials: true,
    });
  },

  checkBioCredentials: async () => {
    const store = getSecureStore();
    const email = await store.getItemAsync(BIO_EMAIL_KEY);
    set({ hasBioCredentials: !!email });
  },
}));
