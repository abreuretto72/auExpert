'use client';

import { Suspense, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { useRouter, useSearchParams } from 'next/navigation';

// Email padrão exibido na tela (pode ser sobrescrito pelo usuário)
const DEFAULT_ADMIN_EMAIL = 'abreu@multiversodigital.com.br';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('error') === 'not_admin'
      ? 'Acesso restrito a administradores.'
      : null,
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email ou senha inválidos.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="font-display text-4xl mb-2 text-text">
          <span className="italic text-ametista">au</span>Expert
        </h1>
        <p className="text-text-muted text-sm tracking-widest uppercase">
          Painel administrativo
        </p>
        <div className="h-px w-16 mx-auto mt-6 bg-gradient-to-r from-ametista to-jade" />
      </div>

      <form
        onSubmit={handleLogin}
        className="bg-bg-card border border-border rounded-2xl p-8 space-y-5"
      >
        <div>
          <label className="block text-xs uppercase tracking-wider text-ametista font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-bg-deep border border-border rounded-lg px-4 py-3 text-text focus:border-jade focus:outline-none"
            placeholder="abreu@multiversodigital.com.br"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-ametista font-medium mb-2">
            Senha
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-bg-deep border border-border rounded-lg px-4 py-3 text-text focus:border-jade focus:outline-none"
            autoComplete="current-password"
            autoFocus
          />
        </div>

        {error && (
          <div className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ametista hover:bg-ametista/90 text-bg-deep font-semibold py-3 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="text-center text-text-dim text-xs mt-8 font-mono uppercase tracking-wider">
        Seu pet merece inteligência.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-text-muted">Carregando…</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
