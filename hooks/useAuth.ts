import { useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { onAuthStateChange } from '../lib/auth';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const hasBioCredentials = useAuthStore((s) => s.hasBioCredentials);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Verificar se tem credenciais biometricas salvas
    useAuthStore.getState().checkBioCredentials();

    // onAuthStateChange com INITIAL_SESSION ja cuida de restaurar a sessao.
    // NAO chamar checkSession() aqui — isso causa race condition com o listener.
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth state changed:', {
        event,
        hasSession: !!session,
        email: session?.user?.email ?? 'nenhum',
      });

      if (event === 'INITIAL_SESSION') {
        hasInitialized.current = true;
        useAuthStore.setState({
          isAuthenticated: !!session,
          session: session ? { access_token: session.access_token } : null,
          user: session?.user ? { id: session.user.id, email: session.user.email, ...session.user.user_metadata } as ReturnType<typeof useAuthStore.getState>['user'] : null,
          isLoading: false,
        });
        return;
      }

      if (event === 'SIGNED_OUT') {
        // So processar SIGNED_OUT se ja inicializou (evitar logout espurio no startup)
        if (hasInitialized.current) {
          useAuthStore.setState({
            isAuthenticated: false,
            session: null,
            user: null,
            isLoading: false,
          });
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        useAuthStore.setState({
          isAuthenticated: !!session,
          session: session ? { access_token: session.access_token } : null,
          user: session?.user ? { id: session.user.id, email: session.user.email, ...session.user.user_metadata } as ReturnType<typeof useAuthStore.getState>['user'] : null,
          isLoading: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, isAuthenticated, isLoading, hasBioCredentials };
}
