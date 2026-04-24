import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate, fmtLatency, fmtNum } from '@/lib/utils';
import { ERROR_LABELS, FUNCTION_LABELS, type AdminAiBreakdown } from '@/lib/types';

export default async function ErrorsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_ai_breakdown');

  if (error) {
    return <div className="text-danger">Erro: {error.message}</div>;
  }

  const d = data as AdminAiBreakdown;
  const totalErrors = Object.values(d.errors_by_category).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Erros</h1>
        <p className="text-text-muted">
          {totalErrors === 0
            ? 'Nenhum erro registrado este mês.'
            : `${fmtNum(totalErrors)} ${totalErrors === 1 ? 'erro' : 'erros'} este mês`}
        </p>
      </header>

      {/* Por categoria */}
      {totalErrors > 0 && (
        <section>
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
            Por categoria
          </h2>
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

      {/* Lista de últimos erros */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Últimos incidentes
        </h2>
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
                  <td className="p-4 text-text-dim text-xs whitespace-nowrap">
                    {fmtDate(err.created_at)}
                  </td>
                  <td className="p-4 font-mono text-xs">{err.user_email ?? '—'}</td>
                  <td className="p-4">
                    <div className="font-medium">
                      {FUNCTION_LABELS[err.function_name] ?? err.function_name}
                    </div>
                    {err.latency_ms && (
                      <div className="text-text-dim text-xs">{fmtLatency(err.latency_ms)}</div>
                    )}
                  </td>
                  <td className="p-4 font-mono text-xs text-text-muted">
                    {err.model_used ?? '—'}
                  </td>
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
                <tr>
                  <td colSpan={6} className="p-8 text-center text-success italic">
                    Tudo funcionando sem erros este mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
