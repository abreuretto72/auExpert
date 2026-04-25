'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, UserPlus, Copy, Check, X, Mail } from 'lucide-react';
import { ADMIN_ROLE_LABELS, type AdminRole, type AdminTeamMember, type AdminInviteRow } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import { inviteAdmin, changeRole, revokeAdminAccess, revokeInvite } from './actions';

interface Props {
  members: AdminTeamMember[];
  pendingInvites: AdminInviteRow[];
}

export function TeamManager({ members, pendingInvites }: Props) {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ accept_url: string; emailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Form state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminRole>('admin_support');

  function handleInvite() {
    setError(null);
    setInviteResult(null);
    startTransition(async () => {
      const r = await inviteAdmin({ email: email.trim(), role });
      if (!r.ok) {
        setError(r.error ?? 'Erro desconhecido');
        return;
      }
      setInviteResult({ accept_url: r.accept_url ?? '', emailed: r.emailed ?? false });
      setEmail('');
    });
  }

  function handleChangeRole(userId: string, newRole: AdminRole) {
    startTransition(async () => {
      const r = await changeRole(userId, newRole);
      if (!r.ok) alert(r.error ?? 'Erro ao alterar perfil');
    });
  }

  function handleRevoke(userId: string, label: string) {
    if (!confirm(`Revogar acesso admin de ${label}? A pessoa vira tutor comum.`)) return;
    startTransition(async () => {
      const r = await revokeAdminAccess(userId);
      if (!r.ok) alert(r.error ?? 'Erro ao revogar');
    });
  }

  function handleRevokeInvite(inviteId: string, email: string) {
    if (!confirm(`Cancelar convite para ${email}?`)) return;
    startTransition(async () => {
      const r = await revokeInvite(inviteId);
      if (!r.ok) alert(r.error ?? 'Erro ao cancelar');
    });
  }

  return (
    <>
      {/* Form de convite */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium">
            Membros ativos ({members.length})
          </h2>
          {!showInviteForm && (
            <button
              onClick={() => { setShowInviteForm(true); setInviteResult(null); setError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-jade/10 border border-jade/30 text-jade rounded-lg text-sm font-medium hover:bg-jade/20 transition"
            >
              <UserPlus size={16} strokeWidth={2} />
              Convidar pessoa
            </button>
          )}
        </div>

        {showInviteForm && (
          <div className="bg-bg-card border border-jade/30 rounded-xl p-5 mb-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-jade text-sm font-medium">Novo convite</h3>
              <button
                onClick={() => { setShowInviteForm(false); setInviteResult(null); setError(null); }}
                className="text-text-muted hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1.5">
                  E-mail *
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="pessoa@empresa.com"
                  className="input"
                  disabled={pending}
                />
              </label>
              <label className="block">
                <span className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1.5">
                  Perfil *
                </span>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as AdminRole)}
                  className="input"
                  disabled={pending}
                >
                  <option value="admin_support">{ADMIN_ROLE_LABELS.admin_support}</option>
                  <option value="admin_financial">{ADMIN_ROLE_LABELS.admin_financial}</option>
                  <option value="admin">{ADMIN_ROLE_LABELS.admin}</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                onClick={() => { setShowInviteForm(false); setError(null); }}
                disabled={pending}
                className="px-4 py-2 text-sm text-text-muted hover:text-text rounded-lg disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={pending || !email.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-jade text-bg-deep rounded-lg text-sm font-medium hover:bg-jade/80 disabled:opacity-40"
              >
                <Mail size={16} strokeWidth={2.5} />
                {pending ? 'Enviando…' : 'Gerar convite'}
              </button>
            </div>

            {error && <div className="text-danger text-sm border-t border-danger/30 pt-2">{error}</div>}

            {inviteResult && (
              <div className="bg-jade/5 border border-jade/30 rounded-lg p-4 mt-3 space-y-2">
                <div className="text-jade text-sm font-medium flex items-center gap-2">
                  <Check size={16} /> Convite gerado!
                </div>
                <div className="text-text-muted text-xs">
                  {inviteResult.emailed
                    ? 'E-mail enviado automaticamente.'
                    : 'E-mail automático não disponível. Copie o link abaixo e envie manualmente:'}
                </div>
                <div className="flex items-center gap-2 bg-bg-deep border border-border rounded p-2">
                  <code className="text-jade text-xs font-mono truncate flex-1">{inviteResult.accept_url}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(inviteResult.accept_url)}
                    className="text-jade hover:text-jade/80"
                    title="Copiar link"
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="text-text-dim text-xs">Válido por 24h.</div>
              </div>
            )}
          </div>
        )}

        {/* Tabela de membros */}
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3 font-medium">Nome</th>
                <th className="text-left p-3 font-medium">E-mail</th>
                <th className="text-left p-3 font-medium">Perfil</th>
                <th className="text-left p-3 font-medium">Cadastrado em</th>
                <th className="text-left p-3 font-medium">Último acesso</th>
                <th className="text-right p-3 font-medium w-[180px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-bg-deep/40">
                  <td className="p-3 font-medium">{m.full_name ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{m.email}</td>
                  <td className="p-3">
                    <select
                      value={m.role}
                      onChange={e => handleChangeRole(m.id, e.target.value as AdminRole)}
                      disabled={pending}
                      className="input text-xs py-1"
                    >
                      <option value="admin_support">{ADMIN_ROLE_LABELS.admin_support}</option>
                      <option value="admin_financial">{ADMIN_ROLE_LABELS.admin_financial}</option>
                      <option value="admin">{ADMIN_ROLE_LABELS.admin}</option>
                    </select>
                  </td>
                  <td className="p-3 text-text-dim text-xs">{fmtDate(m.created_at)}</td>
                  <td className="p-3 text-text-dim text-xs">
                    {m.last_login_at ? fmtDate(m.last_login_at) : 'nunca'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleRevoke(m.id, m.full_name ?? m.email)}
                      disabled={pending}
                      className="p-2 rounded hover:bg-danger/20 text-danger transition disabled:opacity-40"
                      title="Revogar acesso (vira tutor)"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-text-dim italic">Nenhum admin além de você ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Convites pendentes */}
      {pendingInvites.length > 0 && (
        <section>
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
            Convites pendentes ({pendingInvites.length})
          </h2>
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3 font-medium">E-mail</th>
                  <th className="text-left p-3 font-medium">Perfil</th>
                  <th className="text-left p-3 font-medium">Convidado por</th>
                  <th className="text-left p-3 font-medium">Convidado em</th>
                  <th className="text-left p-3 font-medium">Expira</th>
                  <th className="text-right p-3 font-medium w-[120px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingInvites.map(inv => (
                  <tr key={inv.id} className="hover:bg-bg-deep/40">
                    <td className="p-3 font-mono text-xs">{inv.email}</td>
                    <td className="p-3 text-text-muted">{ADMIN_ROLE_LABELS[inv.role]}</td>
                    <td className="p-3 text-text-dim text-xs">{inv.invited_by_email ?? '—'}</td>
                    <td className="p-3 text-text-dim text-xs">{fmtDate(inv.created_at)}</td>
                    <td className="p-3 text-text-dim text-xs">{fmtDate(inv.expires_at)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleRevokeInvite(inv.id, inv.email)}
                        disabled={pending}
                        className="p-2 rounded hover:bg-danger/20 text-danger transition disabled:opacity-40"
                        title="Cancelar convite"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
