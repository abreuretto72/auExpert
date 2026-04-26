'use client';

import { useState, useTransition } from 'react';
import { resendInvite, revokeInvite } from './actions';
import { fmtDate } from '@/lib/utils';
import { Send, Ban, AlertCircle, CheckCircle, Clock, XCircle, Mail, MailX } from 'lucide-react';

export interface PartnershipInvite {
  id: string;
  invite_email: string;
  role: string;
  status: string;
  pet_id: string | null;
  pet_name: string | null;
  inviter_id: string | null;
  inviter_name: string | null;
  inviter_email: string | null;
  token_short: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  email_sent_at: string | null;
  email_error: string | null;
  email_attempts: number;
  is_expired: boolean;
  days_remaining: number;
}

const ROLE_LABELS: Record<string, string> = {
  vet_full:  'Vet — Acesso total',
  vet_read:  'Vet — Leitura',
  vet_tech:  'Vet — Técnico',
  co_parent: 'Co-tutor',
  caregiver: 'Cuidador',
};

interface Props {
  invites: PartnershipInvite[];
}

export function InvitesTable({ invites }: Props) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'expired' | 'revoked'>('all');
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string; type: 'ok' | 'error' } | null>(null);

  const filtered = invites.filter(i => {
    if (filter === 'all') return true;
    if (filter === 'expired') return i.status === 'pending' && i.is_expired;
    if (filter === 'pending') return i.status === 'pending' && !i.is_expired;
    return i.status === filter;
  });

  const handleResend = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const r = await resendInvite(id);
      setFeedback({
        id,
        message: r.ok ? 'Email reenviado.' : `Falha: ${r.error ?? 'desconhecida'}`,
        type: r.ok ? 'ok' : 'error',
      });
      setBusyId(null);
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  const handleRevoke = (id: string, email: string) => {
    if (!confirm(`Cancelar o convite enviado para ${email}?`)) return;
    setBusyId(id);
    startTransition(async () => {
      const r = await revokeInvite(id);
      setFeedback({
        id,
        message: r.ok ? 'Convite cancelado.' : `Falha: ${r.error ?? 'desconhecida'}`,
        type: r.ok ? 'ok' : 'error',
      });
      setBusyId(null);
      setTimeout(() => setFeedback(null), 4000);
    });
  };

  const buckets = [
    { key: 'all',      label: 'Todos',     count: invites.length },
    { key: 'pending',  label: 'Pendentes', count: invites.filter(i => i.status === 'pending' && !i.is_expired).length },
    { key: 'accepted', label: 'Aceitos',   count: invites.filter(i => i.status === 'accepted').length },
    { key: 'expired',  label: 'Expirados', count: invites.filter(i => i.status === 'pending' && i.is_expired).length },
    { key: 'revoked',  label: 'Cancelados',count: invites.filter(i => i.status === 'revoked').length },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Filter buckets */}
      <div className="flex flex-wrap gap-2">
        {buckets.map(b => (
          <button
            key={b.key}
            onClick={() => setFilter(b.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === b.key
                ? 'border-ametista/60 bg-ametista/15 text-ametista'
                : 'border-border bg-bg-card text-text-muted hover:text-text'
            }`}
          >
            {b.label} <span className="font-mono ml-1.5 opacity-60">{b.count}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-text-dim text-sm">
            Nenhum convite nesta categoria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-deep text-text-muted text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3 font-medium">E-mail</th>
                  <th className="text-left p-3 font-medium">Pet</th>
                  <th className="text-left p-3 font-medium">Tutor</th>
                  <th className="text-left p-3 font-medium">Perfil</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Email</th>
                  <th className="text-left p-3 font-medium">Criado</th>
                  <th className="text-right p-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-bg-deep/40">
                    <td className="p-3 font-mono text-xs text-text">{inv.invite_email}</td>
                    <td className="p-3 text-text-muted">{inv.pet_name ?? '—'}</td>
                    <td className="p-3 text-text-muted text-xs">
                      <div>{inv.inviter_name ?? '—'}</div>
                      <div className="text-text-dim text-[10px] font-mono">{inv.inviter_email ?? ''}</div>
                    </td>
                    <td className="p-3 text-text-muted text-xs">{ROLE_LABELS[inv.role] ?? inv.role}</td>
                    <td className="p-3"><StatusBadge inv={inv} /></td>
                    <td className="p-3"><EmailStatus inv={inv} /></td>
                    <td className="p-3 text-text-dim text-xs">
                      <div>{fmtDate(inv.created_at)}</div>
                      {inv.status === 'pending' && !inv.is_expired && (
                        <div className="text-[10px] mt-0.5">
                          Expira em {inv.days_remaining}d
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {feedback?.id === inv.id ? (
                        <span className={`text-xs ${feedback.type === 'ok' ? 'text-success' : 'text-danger'}`}>
                          {feedback.message}
                        </span>
                      ) : inv.status === 'pending' && !inv.is_expired ? (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => handleResend(inv.id)}
                            disabled={pending && busyId === inv.id}
                            className="px-2 py-1 text-xs rounded border border-jade/30 text-jade hover:bg-jade/10 disabled:opacity-40 disabled:cursor-wait flex items-center gap-1"
                            title="Reenviar email"
                          >
                            <Send size={12} strokeWidth={1.8} /> Reenviar
                          </button>
                          <button
                            onClick={() => handleRevoke(inv.id, inv.invite_email)}
                            disabled={pending && busyId === inv.id}
                            className="px-2 py-1 text-xs rounded border border-danger/30 text-danger hover:bg-danger/10 disabled:opacity-40 disabled:cursor-wait flex items-center gap-1"
                            title="Cancelar convite"
                          >
                            <Ban size={12} strokeWidth={1.8} /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <span className="text-text-ghost text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ inv }: { inv: PartnershipInvite }) {
  const isExpired = inv.status === 'pending' && inv.is_expired;
  const status = isExpired ? 'expired' : inv.status;

  const map: Record<string, { cls: string; Icon: typeof Clock; label: string }> = {
    pending:  { cls: 'bg-warning/10 text-warning border-warning/30',  Icon: Clock,       label: 'Pendente' },
    accepted: { cls: 'bg-success/10 text-success border-success/30',  Icon: CheckCircle, label: 'Aceito' },
    expired:  { cls: 'bg-bg-deep text-text-dim border-border',        Icon: XCircle,     label: 'Expirado' },
    revoked:  { cls: 'bg-danger/10 text-danger border-danger/30',     Icon: Ban,         label: 'Cancelado' },
  };
  const m = map[status] ?? map.pending;
  const Icon = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${m.cls}`}>
      <Icon size={10} strokeWidth={2} />
      {m.label}
    </span>
  );
}

function EmailStatus({ inv }: { inv: PartnershipInvite }) {
  if (inv.email_sent_at) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-success" title={`Enviado ${fmtDate(inv.email_sent_at)}`}>
        <Mail size={10} strokeWidth={2} /> enviado
      </span>
    );
  }
  if (inv.email_error) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-danger" title={inv.email_error}>
        <MailX size={10} strokeWidth={2} /> falhou
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-text-dim" title="Aguardando CRON">
      <AlertCircle size={10} strokeWidth={2} /> pendente
    </span>
  );
}
