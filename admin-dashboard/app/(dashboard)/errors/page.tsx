import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate, fmtLatency, fmtNum } from '@/lib/utils';
import {
  ERROR_LABELS,
  FUNCTION_LABELS,
  APP_ERROR_SEVERITY_LABELS,
  APP_ERROR_CATEGORY_LABELS,
  APP_ERROR_STATUS_LABELS,
  type AdminAiBreakdown,
  type AdminAppErrorsList,
  type AppErrorSeverity,
  type AppErrorCategory,
  type AppErrorStatus,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

type Tab = 'ai' | 'app' | 'manual';

const VALID_SEVERITIES: AppErrorSeverity[] = ['info', 'warning', 'error', 'critical'];
const VALID_CATEGORIES: AppErrorCategory[] = [
  'crash', 'unhandled', 'network', 'ai_failure',
  'validation', 'permission', 'manual_report', 'other',
];
const VALID_STATUSES: AppErrorStatus[] = ['open', 'investigating', 'resolved', 'wont_fix', 'duplicate'];

const SEVERITY_BADGE: Record<AppErrorSeverity, string> = {
  info:     'bg-jade/10 text-jade border-jade/30',
  warning:  'bg-warning/10 text-warning border-warning/30',
  error:    'bg-danger/10 text-danger border-danger/30',
  critical: 'bg-danger/30 text-danger border-danger/50 font-bold',
};

interface SearchParams {
  tab?: string;
  severity?: string;
  category?: string;
  status?: string;
  page?: string;
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === 'app' || sp.tab === 'manual' ? sp.tab : 'ai';

  const supabase = await createSupabaseServerClient();

  // Sempre busca os totais resumidos das duas fontes pra mostrar contadores
  const [aiRpc, appRpc] = await Promise.all([
    supabase.rpc('get_admin_ai_breakdown'),
    supabase.rpc('get_admin_app_errors_list', {
      p_severity: VALID_SEVERITIES.includes(sp.severity as AppErrorSeverity) ? sp.severity : null,
      p_category: tab === 'manual'
        ? 'manual_report'
        : (VALID_CATEGORIES.includes(sp.category as AppErrorCategory) ? sp.category : null),
      p_status:   VALID_STATUSES.includes(sp.status as AppErrorStatus) ? sp.status : null,
      p_page:     Math.max(1, Number(sp.page) || 1),
      p_per_page: 50,
    }),
  ]);

  if (aiRpc.error) {
    return <div className="text-danger">Erro AI breakdown: {aiRpc.error.message}</div>;
  }
  if (appRpc.error) {
    return <div className="text-danger">Erro app errors: {appRpc.error.message}</div>;
  }

  const ai  = aiRpc.data as AdminAiBreakdown;
  const app = appRpc.data as AdminAppErrorsList;

  const totalAiErrors = Object.values(ai.errors_by_category).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Erros & incidentes</h1>
        <p className="text-text-muted">
          Monitora erros de IA (Edge Functions) e do app (React Native client).
        </p>
      </header>

      {/* KPIs cabeçalho */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Erros IA (mês)"        value={fmtNum(totalAiErrors)} accent="warning" />
        <Kpi label="Erros App abertos"     value={fmtNum(app.totals.open)} accent="danger" />
        <Kpi label="Críticos (30d)"        value={fmtNum(app.totals.critical_30d)} accent={app.totals.critical_30d > 0 ? 'danger' : 'jade'} />
        <Kpi label="Hoje"                  value={fmtNum(app.totals.today)} accent="text" />
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <TabLink href="/errors?tab=ai"     active={tab === 'ai'}     label="IA"     count={totalAiErrors} />
        <TabLink href="/errors?tab=app"    active={tab === 'app'}    label="App"    count={app.totals.open} />
        <TabLink href="/errors?tab=manual" active={tab === 'manual'} label="Relatos" count={Number(app.by_category.manual_report ?? 0)} />
      </div>

      {tab === 'ai' && <AiErrorsTab data={ai} totalErrors={totalAiErrors} />}
      {tab === 'app' && <AppErrorsTab data={app} sp={sp} />}
      {tab === 'manual' && <ManualReportsTab data={app} />}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent: 'warning' | 'danger' | 'jade' | 'text' }) {
  const colorMap = {
    warning: 'text-warning',
    danger:  'text-danger',
    jade:    'text-jade',
    text:    'text-text',
  };
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="text-text-muted text-[10px] uppercase tracking-widest font-medium mb-1">
        {label}
      </div>
      <div className={`font-display text-2xl ${colorMap[accent]}`}>{value}</div>
    </div>
  );
}

function TabLink({ href, active, label, count }: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className={
        'px-5 py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ' +
        (active
          ? 'border-jade text-jade'
          : 'border-transparent text-text-muted hover:text-text')
      }
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={
          'text-[10px] font-mono px-1.5 py-0.5 rounded ' +
          (active ? 'bg-jade/20 text-jade' : 'bg-bg-deep text-text-muted')
        }>
          {count}
        </span>
      )}
    </Link>
  );
}

// ─── Tab IA (legado preservado) ──────────────────────────────────────────────

function AiErrorsTab({ data: d, totalErrors }: { data: AdminAiBreakdown; totalErrors: number }) {
  return (
    <div className="space-y-6">
      {totalErrors > 0 && (
        <section>
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">Por categoria</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(d.errors_by_category).map(([cat, count]) => (
              <div key={cat} className="bg-bg-card border border-border rounded-xl p-5">
                <div className="text-text-muted text-[11px] uppercase tracking-wider font-medium mb-2">
                  {ERROR_LABELS[cat] ?? cat}
                </div>
                <div className="font-display text-3xl text-warning">{fmtNum(count)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">Últimos incidentes IA</h2>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-4 font-medium">Quando</th>
                <th className="text-left p-4 font-medium">Usuário</th>
                <th className="text-left p-4 font-medium">Função</th>
                <th className="text-left p-4 font-medium">Modelo</th>
                <th className="text-left p-4 font-medium">Categoria</th>
                <th className="text-left p-4 font-medium">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.recent_errors.map(err => (
                <tr key={err.id} className="hover:bg-bg-deep/40">
                  <td className="p-4 text-text-dim text-xs whitespace-nowrap">{fmtDate(err.created_at)}</td>
                  <td className="p-4 font-mono text-xs">{err.user_email ?? '—'}</td>
                  <td className="p-4">
                    <div className="font-medium">{FUNCTION_LABELS[err.function_name] ?? err.function_name}</div>
                    {err.latency_ms && <div className="text-text-dim text-xs">{fmtLatency(err.latency_ms)}</div>}
                  </td>
                  <td className="p-4 font-mono text-xs text-text-muted">{err.model_used ?? '—'}</td>
                  <td className="p-4">
                    <span className="inline-block text-xs px-2 py-1 rounded-md font-mono uppercase bg-warning/10 text-warning border border-warning/30">
                      {ERROR_LABELS[err.error_category ?? 'unknown'] ?? err.error_category}
                    </span>
                  </td>
                  <td className="p-4 text-text-muted text-xs max-w-md truncate">
                    {err.user_message || err.error_message || '—'}
                  </td>
                </tr>
              ))}
              {d.recent_errors.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-success italic">Tudo funcionando sem erros este mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Tab App ────────────────────────────────────────────────────────────────

function AppErrorsTab({ data, sp }: { data: AdminAppErrorsList; sp: SearchParams }) {
  return (
    <div className="space-y-6">
      {/* Filtros (linkáveis via querystring) */}
      <section className="flex flex-wrap gap-2">
        <FilterChip label="Todos" active={!sp.severity} href={buildHref({ ...sp, severity: undefined, tab: 'app' })} />
        {(['critical', 'error', 'warning', 'info'] as AppErrorSeverity[]).map(sev => (
          <FilterChip
            key={sev}
            label={`${APP_ERROR_SEVERITY_LABELS[sev]} (${data.by_severity[sev] ?? 0})`}
            active={sp.severity === sev}
            href={buildHref({ ...sp, severity: sp.severity === sev ? undefined : sev, tab: 'app' })}
            severity={sev}
          />
        ))}
      </section>

      {/* Tabela */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium">
            {data.total === 0 ? 'Nenhum erro registrado' : `${fmtNum(data.total)} erros`}
          </h2>
          <span className="text-text-dim text-xs font-mono">
            página {data.page}/{data.pages}
          </span>
        </div>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left p-3 font-medium">Quando</th>
                <th className="text-left p-3 font-medium">Severidade</th>
                <th className="text-left p-3 font-medium">Categoria</th>
                <th className="text-left p-3 font-medium">Mensagem</th>
                <th className="text-left p-3 font-medium">Rota</th>
                <th className="text-left p-3 font-medium">Plataforma</th>
                <th className="text-left p-3 font-medium">Tutor</th>
                <th className="text-right p-3 font-medium">Ocorr.</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map(e => (
                <tr key={e.id} className="hover:bg-bg-deep/40 align-top">
                  <td className="p-3 text-text-dim text-xs whitespace-nowrap">{fmtDate(e.created_at)}</td>
                  <td className="p-3">
                    <span className={`inline-block text-[10px] px-2 py-1 rounded-md font-mono uppercase border ${SEVERITY_BADGE[e.severity]}`}>
                      {APP_ERROR_SEVERITY_LABELS[e.severity]}
                    </span>
                  </td>
                  <td className="p-3 text-text-muted text-xs">{APP_ERROR_CATEGORY_LABELS[e.category]}</td>
                  <td className="p-3 text-text max-w-sm">
                    <div className="truncate" title={e.message}>{e.message}</div>
                    {e.user_message && <div className="text-text-dim text-xs mt-1 italic">"{e.user_message}"</div>}
                  </td>
                  <td className="p-3 font-mono text-xs text-text-muted">{e.route ?? '—'}</td>
                  <td className="p-3 text-xs text-text-muted">
                    {e.platform && <div>{e.platform} {e.os_version}</div>}
                    {e.device_model && <div className="text-text-dim">{e.device_model}</div>}
                    {e.app_version && <div className="text-text-dim font-mono">v{e.app_version}</div>}
                  </td>
                  <td className="p-3 font-mono text-xs">{e.user_email ?? '—'}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {e.occurrence_count > 1 ? <span className="text-warning">×{e.occurrence_count}</span> : '1'}
                  </td>
                  <td className="p-3 text-xs text-text-muted">{APP_ERROR_STATUS_LABELS[e.status]}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-success italic">Nada por aqui.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Tab Manual reports ──────────────────────────────────────────────────────

function ManualReportsTab({ data }: { data: AdminAppErrorsList }) {
  const reports = data.items.filter(e => e.category === 'manual_report');
  return (
    <section className="space-y-3">
      <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
        Relatos manuais dos tutores
      </h2>
      {reports.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-text-dim italic">
          Nenhum relato manual recebido ainda.
        </div>
      )}
      {reports.map(r => (
        <div key={r.id} className="bg-bg-card border border-border rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-text-muted text-xs">
              <span className="font-mono">{r.user_email ?? 'anônimo'}</span>
              {r.route && <span className="text-text-dim"> · {r.route}</span>}
            </div>
            <div className="text-text-dim text-xs">{fmtDate(r.created_at)}</div>
          </div>
          {r.user_message && (
            <p className="text-text leading-relaxed mb-2">{r.user_message}</p>
          )}
          <div className="text-text-dim text-xs font-mono">{r.message}</div>
        </div>
      ))}
    </section>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function FilterChip({
  label, active, href, severity,
}: { label: string; active: boolean; href: string; severity?: AppErrorSeverity }) {
  return (
    <Link
      href={href}
      className={
        'px-3 py-1.5 text-xs rounded-lg border transition ' +
        (active
          ? (severity ? SEVERITY_BADGE[severity] : 'bg-jade/10 text-jade border-jade/30')
          : 'bg-bg-card text-text-muted border-border hover:text-text')
      }
    >
      {label}
    </Link>
  );
}

function buildHref(params: Record<string, string | undefined>): string {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
    .join('&');
  return `/errors${qs ? `?${qs}` : ''}`;
}
