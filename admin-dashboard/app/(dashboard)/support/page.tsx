import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate, fmtNum } from '@/lib/utils';
import {
  type AdminSupportConversations,
  type SupportConvStatus,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string;
  escalated?: string;
  page?: string;
}

const STATUS_LABELS: Record<SupportConvStatus, string> = {
  open:     'Abertas',
  closed:   'Fechadas',
  archived: 'Arquivadas',
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const validStatuses: SupportConvStatus[] = ['open', 'closed', 'archived'];
  const status = validStatuses.includes(sp.status as SupportConvStatus)
    ? sp.status
    : 'open';
  const onlyEscalated = sp.escalated === '1';
  const page = Math.max(1, Number(sp.page) || 1);

  const { data, error } = await supabase.rpc('get_admin_support_conversations', {
    p_status:         status,
    p_only_escalated: onlyEscalated,
    p_page:           page,
    p_per_page:       30,
  });

  if (error) return <div className="text-danger">Erro: {error.message}</div>;

  const d = data as AdminSupportConversations;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Suporte</h1>
        <p className="text-text-muted">
          Chats com tutores. IA atende em primeiro turno; você assume quando o tutor pedir ou quando IA não conseguir.
        </p>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard label="Conversas abertas"    value={fmtNum(d.totals.open)}        accent="text" />
        <KpiCard label="Aguardando humano"    value={fmtNum(d.totals.escalated)}   accent={d.totals.escalated > 0 ? 'warning' : 'jade'} />
        <KpiCard label="Mensagens não lidas"  value={fmtNum(d.totals.unread_admin)} accent={d.totals.unread_admin > 0 ? 'danger' : 'jade'} />
      </section>

      {/* Filtros */}
      <section className="flex flex-wrap gap-2">
        {(['open', 'closed', 'archived'] as SupportConvStatus[]).map(s => (
          <Chip
            key={s}
            label={STATUS_LABELS[s]}
            active={status === s}
            href={`/support?status=${s}${onlyEscalated ? '&escalated=1' : ''}`}
          />
        ))}
        <Chip
          label="Só escaladas"
          active={onlyEscalated}
          href={`/support?status=${status}${onlyEscalated ? '' : '&escalated=1'}`}
        />
      </section>

      {/* Lista */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium">
            {d.total === 0 ? 'Nenhuma conversa' : `${fmtNum(d.total)} conversa${d.total > 1 ? 's' : ''}`}
          </h2>
          <span className="text-text-dim text-xs font-mono">página {d.page}/{d.pages}</span>
        </div>

        <div className="space-y-2">
          {d.items.map(c => (
            <Link
              key={c.id}
              href={`/support/${c.id}`}
              className="block bg-bg-card border border-border rounded-xl p-4 hover:bg-bg-deep/40 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-text">
                      {c.user_name ?? c.user_email ?? 'Tutor anônimo'}
                    </span>
                    {c.escalated_to_human && (
                      <Badge color="warning">Aguardando humano</Badge>
                    )}
                    {!c.ia_active && !c.escalated_to_human && (
                      <Badge color="success">Você assumiu</Badge>
                    )}
                    {c.unread_admin_count > 0 && (
                      <Badge color="danger">{c.unread_admin_count} não lida{c.unread_admin_count > 1 ? 's' : ''}</Badge>
                    )}
                  </div>
                  <div className="text-text-muted text-sm truncate">
                    {c.subject ?? '(sem assunto definido)'}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-dim mt-2 flex-wrap">
                    <span className="font-mono">{c.user_email}</span>
                    {c.app_version && <span className="font-mono">app v{c.app_version}</span>}
                    {c.platform && <span>{c.platform}</span>}
                    {c.locale && <span>{c.locale}</span>}
                    <span>{c.message_count} msg{c.message_count !== 1 ? 's' : ''}</span>
                    <span>último: <span className="text-text-muted">{fmtDate(c.last_message_at)}</span></span>
                  </div>
                </div>
                <span className="text-jade text-sm">→</span>
              </div>
            </Link>
          ))}

          {d.items.length === 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-dim italic">
              Nenhuma conversa nessa categoria.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent: 'text' | 'warning' | 'danger' | 'jade' }) {
  const colorMap = { text: 'text-text', warning: 'text-warning', danger: 'text-danger', jade: 'text-jade' };
  return (
    <div className="bg-bg-card border border-border rounded-xl p-5">
      <div className="text-text-muted text-[11px] uppercase tracking-widest font-medium mb-2">{label}</div>
      <div className={`font-display text-3xl ${colorMap[accent]}`}>{value}</div>
    </div>
  );
}

function Chip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={
        'px-3 py-1.5 text-xs rounded-lg border transition ' +
        (active
          ? 'bg-jade/10 text-jade border-jade/30'
          : 'bg-bg-card text-text-muted border-border hover:text-text')
      }
    >
      {label}
    </Link>
  );
}

function Badge({ color, children }: { color: 'warning' | 'success' | 'danger'; children: React.ReactNode }) {
  const map = {
    warning: 'bg-warning/10 text-warning border-warning/30',
    success: 'bg-success/10 text-success border-success/30',
    danger:  'bg-danger/15 text-danger border-danger/30',
  };
  return (
    <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${map[color]}`}>
      {children}
    </span>
  );
}
