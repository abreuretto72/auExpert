'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { ADMIN_ROLE_LABELS, type AdminRole } from '@/lib/types';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';

interface InviteInfo {
  email: string;
  role: AdminRole;
  expires_at: string;
}

export function AcceptInviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [pending, startTransition] = useTransition();

  // Busca info do convite ao carregar
  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    fetch(`${SUPABASE_URL}/functions/v1/admin-team-accept?token=${encodeURIComponent(token)}`, {
      headers: { apikey: ANON_KEY },
    })
      .then(r => r.json())
      .then(json => {
        if (json.error) setLoadError(json.error);
        else setInfo(json);
      })
      .catch(e => setLoadError(String(e)));
  }, [token]);

  function handleAccept() {
    setSubmitError(null);
    if (password.length < 8) {
      setSubmitError('Senha deve ter pelo menos 8 caracteres.');
      return;
    }

    startTransition(async () => {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      // Tenta com Bearer JWT se já houver sessão (caso o user já tenha conta no app)
      const supabase = createSupabaseBrowserClient();
      const sess = (await supabase.auth.getSession()).data.session;

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-team-accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          ...(sess ? { Authorization: `Bearer ${sess.access_token}` } : {}),
        },
        body: JSON.stringify({
          token,
          password,
          full_name: fullName,
        }),
      });
      const json = await resp.json();

      if (!resp.ok) {
        setSubmitError(json.error ?? json.message ?? `HTTP ${resp.status}`);
        return;
      }

      // Faz login automaticamente (caso novo user) usando a senha que acabou de cadastrar
      if (info?.email && password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: info.email,
          password,
        });
        if (signInError) {
          // Não é fatal — mostra sucesso e pede pra logar manualmente
          setSuccess(true);
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => router.push('/'), 1500);
    });
  }

  if (loadError) {
    return (
      <div className="text-danger text-sm text-center py-4 space-y-2">
        <div>Convite inválido</div>
        <div className="text-text-muted text-xs italic">{loadError}</div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-jade" size={24} />
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-success/20 border border-success flex items-center justify-center">
          <Check className="text-success" size={24} strokeWidth={2.5} />
        </div>
        <div className="font-display text-lg">Convite aceito!</div>
        <div className="text-text-muted text-sm">
          Redirecionando para o painel…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-deep border border-border rounded-lg p-4 text-sm">
        <div className="text-text-muted text-xs uppercase tracking-wider mb-1">Você foi convidado como</div>
        <div className="text-jade font-medium">{ADMIN_ROLE_LABELS[info.role]}</div>
        <div className="text-text-dim text-xs mt-2 font-mono">{info.email}</div>
      </div>

      <label className="block">
        <span className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1.5">
          Seu nome
        </span>
        <input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Como podemos te chamar?"
          className="input"
          disabled={pending}
        />
      </label>

      <label className="block">
        <span className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1.5">
          Senha (mín 8 caracteres) *
        </span>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="input"
          disabled={pending}
        />
        <div className="text-text-dim text-xs mt-1">
          Se você já tem conta no app auExpert com este e-mail, faça login pelo app antes de aceitar — sua senha do app vai funcionar aqui também.
        </div>
      </label>

      {submitError && (
        <div className="text-danger text-sm border-t border-danger/30 pt-3">
          {submitError}
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={pending || password.length < 8}
        className="w-full bg-jade text-bg-deep py-3 rounded-lg font-medium hover:bg-jade/80 disabled:opacity-40 transition flex items-center justify-center gap-2"
      >
        {pending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} strokeWidth={2.5} />}
        {pending ? 'Aceitando…' : 'Aceitar convite'}
      </button>
    </div>
  );
}
