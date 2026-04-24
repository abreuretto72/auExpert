import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtNum, fmtUSD, fmtPercent, fmtLatency } from '@/lib/utils';
import { FUNCTION_LABELS, type AdminAiBreakdown } from '@/lib/types';

export default async function AiCostsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_ai_breakdown');

  if (error) {
    return <div className="text-danger">Erro: {error.message}</div>;
  }

  const d = data as AdminAiBreakdown;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Custos de IA</h1>
        <p className="text-text-muted">Breakdown por função e modelo no mês atual</p>
      </header>

      {/* Por função */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Por função (Edge Function)
        </h2>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left  p-4 font-medium">Função</th>
                <th className="text-right p-4 font-medium">Total</th>
                <th className="text-right p-4 font-medium">Sucesso</th>
                <th className="text-right p-4 font-medium">Erros</th>
                <th className="text-right p-4 font-medium">Taxa</th>
                <th className="text-right p-4 font-medium">Latência</th>
                <th className="text-right p-4 font-medium">Custo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.by_function.map(row => (
                <tr key={row.function_name} className="hover:bg-bg-deep/40">
                  <td className="p-4">
                    <div className="font-medium">{FUNCTION_LABELS[row.function_name] ?? row.function_name}</div>
                    <div className="text-text-dim text-xs font-mono">{row.function_name}</div>
                  </td>
                  <td className="p-4 text-right font-mono">{fmtNum(row.total)}</td>
                  <td className="p-4 text-right font-mono text-success">{fmtNum(row.success)}</td>
                  <td className="p-4 text-right font-mono text-danger">{fmtNum(row.errors)}</td>
                  <td className={`p-4 text-right font-mono ${
                    row.success_rate >= 0.95 ? 'text-success' : 'text-warning'
                  }`}>
                    {fmtPercent(row.success_rate)}
                  </td>
                  <td className="p-4 text-right font-mono">{fmtLatency(row.avg_latency_ms)}</td>
                  <td className="p-4 text-right font-mono text-jade">{fmtUSD(row.cost_usd)}</td>
                </tr>
              ))}
              {d.by_function.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-dim italic">
                    Nenhum dado ainda. Instrumente suas Edge Functions com logAiInvocation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Por modelo */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Por modelo de IA
        </h2>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left  p-4 font-medium">Modelo</th>
                <th className="text-right p-4 font-medium">Invocações</th>
                <th className="text-right p-4 font-medium">Tokens IN</th>
                <th className="text-right p-4 font-medium">Tokens OUT</th>
                <th className="text-right p-4 font-medium">Latência</th>
                <th className="text-right p-4 font-medium">Custo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {d.by_model.map(row => (
                <tr key={row.model_used} className="hover:bg-bg-deep/40">
                  <td className="p-4 font-mono">{row.model_used}</td>
                  <td className="p-4 text-right font-mono">{fmtNum(row.total)}</td>
                  <td className="p-4 text-right font-mono">{fmtNum(row.tokens_in)}</td>
                  <td className="p-4 text-right font-mono">{fmtNum(row.tokens_out)}</td>
                  <td className="p-4 text-right font-mono">{fmtLatency(row.avg_latency_ms)}</td>
                  <td className="p-4 text-right font-mono text-jade">{fmtUSD(row.cost_usd)}</td>
                </tr>
              ))}
              {d.by_model.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-dim italic">
                    Nenhum dado ainda.
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
