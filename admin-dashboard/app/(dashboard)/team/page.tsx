import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate } from '@/lib/utils';
import { ADMIN_ROLE_LABELS, type AdminTeamList } from '@/lib/types';
import { TeamManager } from './team-manager';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_team_list');
  if (error) return <div className="text-danger">Erro: {error.message}</div>;

  const d = data as AdminTeamList;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Equipe do admin</h1>
        <p className="text-text-muted">
          Convide pessoas com acesso restrito ao painel. Cada perfil vê apenas as telas correspondentes.
        </p>
      </header>

      {/* Cartões de cada perfil — referência rápida */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RoleCard
          label="Super-admin"
          desc="Acesso total. Pode gerenciar a equipe."
          accent="ametista"
        />
        <RoleCard
          label="Financeiro"
          desc="Vê apenas /costs e /ai-costs. Pode editar custos fixos."
          accent="jade"
        />
        <RoleCard
          label="Suporte"
          desc="Vê apenas /support e /errors. Responde tutores."
          accent="warning"
        />
      </section>

      <TeamManager
        members={d.members}
        pendingInvites={d.pending_invites}
      />

      {/* Histórico de convites */}
      {d.history && d.history.length > 0 && (
        <section>
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
            Histórico de convites
          </h2>
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3 font-medium">E-mail</th>
                  <th className="text-left p-3 font-medium">Perfil</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Convidado em</th>
                  <th className="text-left p-3 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.history.map(inv => (
                  <tr key={inv.id} className="hover:bg-bg-deep/40">
                    <td className="p-3 font-mono text-xs">{inv.email}</td>
                    <td className="p-3 text-text-muted">{ADMIN_ROLE_LABELS[inv.role]}</td>
                    <td className="p-3">
                      <StatusBadge status={inv.status ?? 'pending'} />
                    </td>
                    <td className="p-3 text-text-dim text-xs">{fmtDate(inv.created_at)}</td>
                    <td className="p-3 text-text-dim text-xs">
                      {inv.accepted_at ? `Aceito ${fmtDate(inv.accepted_at)}`
                        : inv.revoked_at ? `Revogado ${fmtDate(inv.revoked_at)}`
                        : 'Expirado'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function RoleCard({ label, desc, accent }: { label: string; desc: string; accent: 'ametista' | 'jade' | 'warning' }) {
  const map = {
    ametista: 'border-ametista/30 bg-ametista/5',
    jade:     'border-jade/30 bg-jade/5',
    warning:  'border-warning/30 bg-warning/5',
  };
  const textMap = {
    ametista: 'text-ametista',
    jade:     'text-jade',
    warning:  'text-warning',
  };
  return (
    <div className={`border ${map[accent]} rounded-xl p-5`}>
      <div className={`text-xs uppercase tracking-widest font-medium mb-2 ${textMap[accent]}`}>
        {label}
      </div>
      <div className="text-text text-sm leading-relaxed">{desc}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'bg-warning/10 text-warning border-warning/30',
    accepted: 'bg-success/10 text-success border-success/30',
    expired:  'bg-bg-deep text-text-dim border-border',
    revoked:  'bg-danger/10 text-danger border-danger/30',
  };
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${map[status] ?? map.pending}`}>
      {status}
    </span>
  );
}
