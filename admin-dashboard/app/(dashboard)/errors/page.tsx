import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { PageError } from '@/components/page-error';
import { fmtDate, fmtLatency, fmtNum } from '@/lib/utils';
import {
  ERROR_LABELS,
  FUNCTION_LABELS,
  APP_ERROR_SEVERITY_LABELS,
  APP_ERROR_CATEGORY_LABELS,
  APP_ERROR_STATUS_LABELS,
  type AdminAiBreakdown,
  type AdminRecentError,
  type AdminAppErrorsList,
  type AppErrorSeverity,
  type AppErrorCategory,
  type AppErrorStatus,
} from '@/lib/types';
import { AiErrorDetailPanel } from './_components/AiErrorDetailPanel';

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
  // Tab IA — filtros de função/categoria + ID do incidente aberto no painel
  fn?: string;
  ai_cat?: string;
  ai?: string;
}

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab: Tab = sp.tab === 'app' || sp.tab === 'manual' ? sp.tab : 'ai';

  const supabase = await createSupabaseServerClient();

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
    return <PageError pagePath="/errors" techMessage={`AI: ${aiRpc.error.message}`} />;
  }
  if (appRpc.error) {
    return <PageError pagePath="/errors" techMessage={`App: ${appRpc.error.message}`} />;
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

      {tab === 'ai' && <AiErrorsTab data={ai} totalErrors={totalAiErrors} sp={sp} />}
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

// ─── Tab IA ──────────────────────────────────────────────────────────────────

interface ErrorGroup {
  /** Hash deterministico baseado em function + category + prefixo do error_message */
  key: string;
  /** Linha mais recente do grupo (= a que o admin clica pra abrir) */
  representative: AdminRecentError;
  /** Todas as ocorrências */
  occurrences: AdminRecentError[];
}

function groupErrors(rows: AdminRecentError[]): ErrorGroup[] {
  const map = new Map<string, ErrorGroup>();
  for (const r of rows) {
    // 200 chars do error_message captura "raiz" sem variar com timestamp/req_id
    const sigMessage = (r.error_message ?? '').slice(0, 200);
    const key = `${r.function_name}|${r.error_category ?? '_'}|${sigMessage}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { key, representative: r, occurrences: [r] });
    } else {
      existing.occurrences.push(r);
      // Manter o mais recente como representante (rows já vêm desc por created_at, mas garantimos)
      if (r.created_at > existing.representative.created_at) {
        existing.representative = r;
      }
    }
  }
  return [...map.values()].sort(
    (a, b) => b.representative.created_at.localeCompare(a.representative.created_at),
  );
}

function AiErrorsTab({
  data: d,
  totalErrors,
  sp,
}: {
  data: AdminAiBreakdown;
  totalErrors: number;
  sp: SearchParams;
}) {
  // Aplicar filtros antes de agrupar
  const filtered = d.recent_errors.filter(e => {
    if (sp.fn && e.function_name !== sp.fn) return false;
    if (sp.ai_cat && (e.error_category ?? '_') !== sp.ai_cat) return false;
    return true;
  });
  const groups = groupErrors(filtered);

  // Funções únicas presentes nos erros recentes pra montar o filtro
  const fnCounts = new Map<string, number>();
  for (const e of d.recent_errors) {
    fnCounts.set(e.function_name, (fnCounts.get(e.function_name) ?? 0) + 1);
  }
  const fnList = [...fnCounts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna esquerda: filtros + tabela */}
      <div className={sp.ai ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
        {totalErrors > 0 && (
          <section>
            <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
              Por categoria — clique pra filtrar
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(d.errors_by_category).map(([cat, count]) => {
                const isActive = sp.ai_cat === cat;
                return (
                  <Link
                    key={cat}
                    href={buildAiHref({ ...sp, ai_cat: isActive ? undefined : cat })}
                    className={
                      'bg-bg-card border rounded-xl p-5 transition hover:border-warning/50 ' +
                      (isActive ? 'border-warning' : 'border-border')
                    }
                  >
                    <div className="text-text-muted text-[11px] uppercase tracking-wider font-medium mb-2">
                      {ERROR_LABELS[cat] ?? cat}
                    </div>
                    <div className="font-display text-3xl text-warning">{fmtNum(count)}</div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Filtros por função */}
        {fnList.length > 1 && (
          <section className="flex flex-wrap gap-2">
            <FilterChip
              label="Todas as funções"
              active={!sp.fn}
              href={buildAiHref({ ...sp, fn: undefined })}
            />
            {fnList.map(([fn, count]) => (
              <FilterChip
                key={fn}
                label={`${FUNCTION_LABELS[fn] ?? fn} (${count})`}
                active={sp.fn === fn}
                href={buildAiHref({ ...sp, fn: sp.fn === fn ? undefined : fn })}
              />
            ))}
          </section>
        )}

        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-ametista text-xs uppercase tracking-wider font-medium">
              {groups.length === 0
                ? 'Nenhum incidente IA neste filtro'
                : `${groups.length} grupo${groups.length === 1 ? '' : 's'} de incidentes (${filtered.length} total)`}
            </h2>
            {(sp.fn || sp.ai_cat) && (
              <Link
                href={buildAiHref({ ...sp, fn: undefined, ai_cat: undefined })}
                className="text-text-muted hover:text-text text-xs"
              >
                Limpar filtros
              </Link>
            )}
          </div>
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3 font-medium">Quando</th>
                  <th className="text-left p-3 font-medium">Função</th>
                  <th className="text-left p-3 font-medium">Categoria</th>
                  <th className="text-left p-3 font-medium">Mensagem técnica</th>
                  <th className="text-right p-3 font-medium">Ocorr.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map(g => {
                  const isOpen = sp.ai === g.representative.id;
                  return (
                    <tr
                      key={g.key}
                      className={
                        'hover:bg-bg-deep/40 transition ' + (isOpen ? 'bg-jade/5' : '')
                      }
                    >
                      <td className="p-3 text-text-dim text-xs whitespace-nowrap align-top">
                        {fmtDate(g.representative.created_at)}
                        {g.occurrences.length > 1 && (
                          <div className="text-text-dim text-[10px] mt-1">
                            +{g.occurrences.length - 1} antes
                          </div>
                        )}
                      </td>
                      <td className="p-3 align-top">
                        <div className="font-medium">
                          {FUNCTION_LABELS[g.representative.function_name] ?? g.representative.function_name}
                        </div>
                        {g.representative.model_used && (
                          <div className="text-text-dim text-xs font-mono">{g.representative.model_used}</div>
                        )}
                        {g.representative.latency_ms != null && (
                          <div className="text-text-dim text-xs">{fmtLatency(g.representative.latency_ms)}</div>
                        )}
                      </td>
                      <td className="p-3 align-top">
                        <span className="inline-block text-[10px] px-2 py-1 rounded-md font-mono uppercase bg-warning/10 text-warning border border-warning/30">
                          {ERROR_LABELS[g.representative.error_category ?? 'unknown'] ?? g.representative.error_category}
                        </span>
                      </td>
                      <td className="p-3 align-top max-w-md">
                        <div className="text-text-muted text-xs font-mono line-clamp-2 break-words">
                          {g.representative.error_message ?? g.representative.user_message ?? '—'}
                        </div>
                        <Link
                          href={buildAiHref({ ...sp, ai: isOpen ? undefined : g.representative.id })}
                          className="inline-block mt-2 text-jade hover:underline text-xs font-medium"
                        >
                          {isOpen ? 'Fechar detalhe' : 'Abrir detalhe →'}
                        </Link>
                      </td>
                      <td className="p-3 text-right font-mono text-xs align-top">
                        {g.occurrences.length > 1 ? (
                          <span className="text-warning">×{g.occurrences.length}</span>
                        ) : (
                          '1'
                        )}
                      </td>
                    </tr>
                  );
                })}
                {groups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-success italic">
                      Tudo funcionando sem erros neste filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Coluna direita: painel de detalhe (renderiza só se ?ai presente) */}
      {sp.ai && (
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <AiErrorDetailPanel
              invocationId={sp.ai}
              closeHref={buildAiHref({ ...sp, ai: undefined })}
            />
          </div>
        </aside>
      )}
    </div>
  );
}

// ─── Tab App ────────────────────────────────────────────────────────────────

function AppErrorsTab({ data, sp }: { data: AdminAppErrorsList; sp: SearchParams }) {
  return (
    <div className="space-y-6">
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

/** Versão restrita aos params da tab IA — preserva tab, fn, ai_cat, ai */
function buildAiHref(params: SearchParams): string {
  return buildHref({
    tab: 'ai',
    fn: params.fn,
    ai_cat: params.ai_cat,
    ai: params.ai,
  });
}
