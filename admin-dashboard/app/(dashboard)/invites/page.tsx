import { createSupabaseServerClient } from '@/lib/supabase-server';
import { PageError } from '@/components/page-error';
import { InvitesTable, type PartnershipInvite } from './invites-table';

export const dynamic = 'force-dynamic';

interface Totals {
  all: number;
  pending: number;
  accepted: number;
  expired: number;
  revoked: number;
  email_pending: number;
  email_failed: number;
}

interface Payload {
  invites: PartnershipInvite[];
  totals: Totals;
}

export default async function InvitesPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_partnership_invites');
  if (error) return <PageError pagePath="/invites" techMessage={error.message} />;

  const d = data as Payload;
  const t = d.totals;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Convites de parceria</h1>
        <p className="text-text-muted">
          Convites enviados a veterinários, co-tutores e cuidadores. Acompanhe quais foram aceitos,
          quais ainda estão aguardando e reenvie quando precisar.
        </p>
      </header>

      {/* Stat cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total"      value={t.all}      tone="neutral" />
        <Stat label="Pendentes"  value={t.pending}  tone="warning" />
        <Stat label="Aceitos"    value={t.accepted} tone="success" />
        <Stat label="Expirados"  value={t.expired}  tone="dim" />
        <Stat label="Cancelados" value={t.revoked}  tone="danger" />
      </section>

      {/* Email-status alert (só aparece se houver problema) */}
      {(t.email_failed > 0 || t.email_pending > 0) && (
        <section className="border border-warning/30 bg-warning/5 rounded-xl p-4 text-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-text-muted">
            {t.email_pending > 0 && (
              <span><strong className="text-warning font-mono">{t.email_pending}</strong> aguardando envio do email (CRON 5min)</span>
            )}
            {t.email_failed > 0 && (
              <span><strong className="text-danger font-mono">{t.email_failed}</strong> com falha de envio — clique em "Reenviar"</span>
            )}
          </div>
        </section>
      )}

      <InvitesTable invites={d.invites} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'warning' | 'success' | 'dim' | 'danger' }) {
  const map = {
    neutral: 'border-border bg-bg-card text-text',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    success: 'border-success/30 bg-success/5 text-success',
    dim:     'border-border bg-bg-card text-text-dim',
    danger:  'border-danger/30 bg-danger/5 text-danger',
  };
  return (
    <div className={`border ${map[tone]} rounded-xl p-4`}>
      <div className="text-[10px] uppercase tracking-widest opacity-60 mb-1">{label}</div>
      <div className="font-mono text-2xl">{value}</div>
    </div>
  );
}
