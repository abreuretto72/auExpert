import {
  Users, Dog, Cat, Camera, Video, Mic, ScanLine, UtensilsCrossed, FileText,
  DollarSign, Gauge, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { StatCard } from '@/components/stat-card';
import { fmtNum, fmtUSD, fmtPercent, fmtLatency } from '@/lib/utils';
import type { AdminOverview } from '@/lib/types';

export default async function OverviewPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_overview');

  if (error) {
    return (
      <div className="text-danger">
        Erro ao carregar dados: {error.message}
      </div>
    );
  }

  const d = data as AdminOverview;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Visão geral</h1>
        <p className="text-text-muted">{d.period.label}</p>
      </header>

      {/* Totais do sistema */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Totais do sistema
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Usuários"    value={fmtNum(d.totals.users_total)} />
          <StatCard icon={Users} label="Ativos no mês" value={fmtNum(d.active_users.this_month)} color="ametista" />
          <StatCard icon={Dog}   label="Cães"        value={fmtNum(d.totals.pets_dogs)} color="ametista" />
          <StatCard icon={Cat}   label="Gatos"       value={fmtNum(d.totals.pets_cats)} color="ametista" />
        </div>
      </section>

      {/* Uso de IA no mês */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Uso de IA no mês
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Camera}          label="Imagens"      value={fmtNum(d.ai_usage_this_month.images)} />
          <StatCard icon={Video}           label="Vídeos"       value={fmtNum(d.ai_usage_this_month.videos)} />
          <StatCard icon={Mic}             label="Áudios"       value={fmtNum(d.ai_usage_this_month.audios)} />
          <StatCard icon={ScanLine}        label="Scanners"     value={fmtNum(d.ai_usage_this_month.scanners)} />
          <StatCard icon={UtensilsCrossed} label="Cardápios"    value={fmtNum(d.ai_usage_this_month.cardapios)} />
          <StatCard icon={FileText}        label="Prontuários"  value={fmtNum(d.ai_usage_this_month.prontuarios)} />
        </div>
      </section>

      {/* Saúde da IA */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Saúde da IA
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={DollarSign}
            label="Custo estimado"
            value={fmtUSD(d.cost.this_month_usd)}
            hint={`${fmtNum(d.cost.invocations)} invocações`}
            color="success"
          />
          <StatCard
            icon={CheckCircle2}
            label="Taxa de sucesso"
            value={fmtPercent(d.performance.success_rate)}
            color={d.performance.success_rate >= 0.95 ? 'success' : 'warning'}
          />
          <StatCard
            icon={Gauge}
            label="Latência média"
            value={fmtLatency(d.performance.avg_latency_ms)}
            color="ametista"
          />
          <StatCard
            icon={AlertTriangle}
            label="Erros no mês"
            value={fmtNum(d.performance.errors_total)}
            color={d.performance.errors_total > 0 ? 'warning' : 'success'}
          />
        </div>
      </section>

      {/* Breakdown por modelo */}
      {Object.keys(d.cost.by_model).length > 0 && (
        <section>
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
            Custo por modelo
          </h2>
          <div className="bg-bg-card border border-border rounded-xl p-5">
            <div className="space-y-3">
              {Object.entries(d.cost.by_model).map(([model, cost]) => {
                const total = d.cost.this_month_usd || 1;
                const pct = ((cost / total) * 100).toFixed(1);
                return (
                  <div key={model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-mono text-text">{model}</span>
                      <span className="text-jade">{fmtUSD(cost)}</span>
                    </div>
                    <div className="h-1.5 bg-bg-deep rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ametista to-jade"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
