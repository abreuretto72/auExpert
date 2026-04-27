import { createSupabaseServerClient } from '@/lib/supabase-server';
import { PageError } from '@/components/page-error';
import { fmtUSD } from '@/lib/utils';
import {
  CATEGORY_LABELS,
  type AdminTotalCosts,
  type CostCategory,
} from '@/lib/types';
import { CostsManager } from './costs-manager';

export const dynamic = 'force-dynamic';

const CATEGORY_COLORS: Record<CostCategory, string> = {
  infrastructure: 'text-jade',
  platform:       'text-warning',
  development:    'text-ametista',
  labor:          'text-text',
  equipment:      'text-text-muted',
  training:       'text-success',
  other:          'text-text-dim',
};

export default async function CostsPage() {
  const supabase = await createSupabaseServerClient();
  const [costsRpc, tutorsCountRes] = await Promise.all([
    supabase.rpc('get_admin_total_costs'),
    // Tutores ativos hoje — denominador pra estimar custo IA por assinante.
    // Usar `head: true, count: 'exact'` evita trazer linhas, só metadado.
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'tutor_owner')
      .eq('is_active', true),
  ]);

  if (costsRpc.error) return <PageError pagePath="/costs" techMessage={costsRpc.error.message} />;

  const d = costsRpc.data as AdminTotalCosts;
  const activeTutors = tutorsCountRes.count ?? 0;

  // Sorted breakdown por categoria (descendente)
  const byCategory = Object.entries(d.by_category)
    .map(([k, v]) => ({ category: k as CostCategory, total: Number(v ?? 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const byVendor = Object.entries(d.by_vendor)
    .map(([k, v]) => ({ vendor: k, total: Number(v ?? 0) }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  const grandTotalAnnual = Number(d.grand_total_usd) * 12;

  // ── Break-even com custo variável + taxas das stores ────────────────────
  // Fórmula REAL: N × (preço × (1 − fee_store) × (1 − fee_rc)) = Fixo + (Var/user × N)
  //               → N = ceil(Fixo / (preço_líquido − Var/user))
  //
  // Taxas aplicadas (assinaturas, prática 2025-2026):
  //   - Apple/Google Play: 15% (Small Business Program / subscription rate)
  //     → padrão é 30% pro 1º ano da Apple sem programa, mas auExpert qualifica
  //   - RevenueCat: 1% (após $2.5K MTR; antes disso, 0%)
  //   - Soma efetiva: 1 - (1-0.15)*(1-0.01) ≈ 15.85% das receitas vão pra
  //     intermediários antes de chegar na conta da empresa.
  //
  // Os números abaixo estão hardcoded — quando o auExpert escalar acima de
  // $1M/ano, considerar mudar STORE_FEE_PCT pra 0.30. Quando passar de $2.5K
  // MTR no RevenueCat, RC_FEE_PCT já está em 1%. Caminho futuro: mover essas
  // taxas pra app_config pra editar via UI sem deploy.
  const STORE_FEE_PCT = 0.15;
  const RC_FEE_PCT    = 0.01;
  const NET_REVENUE_RATE = (1 - STORE_FEE_PCT) * (1 - RC_FEE_PCT);  // ≈ 0.8415

  const fixedTotalUsd =
    Number(d.fixed_monthly_usd) + Number(d.one_time_paid_this_month_usd);
  const variableAiUsd = Number(d.variable_ai_usd);
  const aiPerUser = activeTutors > 0 ? variableAiUsd / activeTutors : 0;

  const ELITE_MARGIN = 1.7;

  const scenarios = [
    { price: 50, label: 'Premium (US$ 50/mês)' },
    { price: 30, label: 'Médio (US$ 30/mês)' },
    { price: 20, label: 'Acessível (US$ 20/mês)' },
    { price: 10, label: 'Massa (US$ 10/mês)' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl mb-2">Custo total da infraestrutura</h1>
        <p className="text-text-muted">
          Fixos + variáveis (IA) consolidados em USD. Período: {String(d.period.year)}-{String(d.period.month).padStart(2, '0')}
        </p>
      </header>

      {/* Hero — total mensal */}
      <section className="bg-gradient-to-br from-bg-card to-bg-deep border border-border rounded-2xl p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="text-text-muted text-xs uppercase tracking-widest font-medium mb-2">
              Custo mensal total
            </div>
            <div className="font-display text-6xl text-text">
              {fmtUSD(Number(d.grand_total_usd))}
            </div>
            <div className="text-text-dim text-sm mt-2 font-mono">
              Anualizado: {fmtUSD(grandTotalAnnual)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-right">
            <div>
              <div className="text-text-dim text-[10px] uppercase tracking-widest">Fixos</div>
              <div className="font-mono text-xl text-text mt-1">{fmtUSD(Number(d.fixed_monthly_usd))}</div>
            </div>
            <div>
              <div className="text-text-dim text-[10px] uppercase tracking-widest">Únicos no mês</div>
              <div className="font-mono text-xl text-text mt-1">{fmtUSD(Number(d.one_time_paid_this_month_usd))}</div>
            </div>
            <div>
              <div className="text-text-dim text-[10px] uppercase tracking-widest">IA variável</div>
              <div className="font-mono text-xl text-jade mt-1">{fmtUSD(Number(d.variable_ai_usd))}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Por categoria */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Por categoria (custos fixos recorrentes)
        </h2>
        <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left  p-4 font-medium">Categoria</th>
                <th className="text-right p-4 font-medium">Mensal USD</th>
                <th className="text-right p-4 font-medium">% do total fixo</th>
                <th className="p-4 font-medium w-[40%]">Distribuição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byCategory.map(row => {
                const pct = (row.total / Number(d.fixed_monthly_usd)) * 100;
                return (
                  <tr key={row.category} className="hover:bg-bg-deep/40">
                    <td className={`p-4 font-medium ${CATEGORY_COLORS[row.category] ?? 'text-text'}`}>
                      {CATEGORY_LABELS[row.category]}
                    </td>
                    <td className="p-4 text-right font-mono">{fmtUSD(row.total)}</td>
                    <td className="p-4 text-right font-mono text-text-muted">
                      {pct.toFixed(1)}%
                    </td>
                    <td className="p-4">
                      <div className="h-2 bg-bg-deep rounded-full overflow-hidden">
                        <div
                          className="h-full bg-jade/60"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cenarios de assinatura — fórmula com taxas + custo fixo + variável + lucro */}
      <section>
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
          Break-even por cenário de assinatura
        </h2>
        <p className="text-text-muted text-sm mb-2">
          Cada assinatura passa por <strong>taxas das stores</strong> (Apple/Google = {(STORE_FEE_PCT * 100).toFixed(0)}%
          em assinaturas elegíveis) e <strong>RevenueCat</strong> ({(RC_FEE_PCT * 100).toFixed(0)}%
          após $2,5K MTR). Sobra <strong className="text-jade">{(NET_REVENUE_RATE * 100).toFixed(2)}%</strong> da receita bruta
          pra cobrir <strong>custo fixo</strong> ({fmtUSD(fixedTotalUsd)}) + <strong>custo variável de IA</strong>{' '}
          por assinante (~{fmtUSD(aiPerUser)}/mês, estimado em {activeTutors} tutor{activeTutors === 1 ? '' : 'es'} ativo{activeTutors === 1 ? '' : 's'}) + <strong>lucro</strong>. Margem Elite é 1,7× sobre o break-even.
        </p>
        <p className="text-text-dim text-xs mb-3">
          Fórmula: N = ⌈Fixo / (preço × {NET_REVENUE_RATE.toFixed(4)} − var/user)⌉. Cenários onde o líquido após taxas
          não cobre o IA por usuário são marcados como inviáveis.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {scenarios.map(s => {
            // Receita líquida POR assinante = preço × (1 - store_fee) × (1 - rc_fee)
            const netPerUser = s.price * NET_REVENUE_RATE;
            const feesPerUser = s.price - netPerUser;
            // Margem unitária: do líquido, sobra o que? Após pagar IA dele.
            const unitMargin = netPerUser - aiPerUser;

            if (unitMargin <= 0) {
              return (
                <div key={s.price} className="bg-bg-card border border-danger/40 rounded-xl p-5">
                  <div className="text-text-dim text-xs uppercase tracking-widest mb-2">{s.label}</div>
                  <div className="font-display text-xl text-danger">Inviável</div>
                  <div className="text-xs text-text-muted mt-2 leading-relaxed">
                    Líquido após taxas ({fmtUSD(netPerUser)}) ≤ custo IA/assinante ({fmtUSD(aiPerUser)}).
                    Aumente preço, reduza IA ou negocie taxa enterprise.
                  </div>
                </div>
              );
            }

            const breakeven = Math.ceil(fixedTotalUsd / unitMargin);
            const withMargin = Math.ceil(breakeven * ELITE_MARGIN);

            // Bruto vs líquido — o que entra na conta
            const breakevenGross = breakeven * s.price;
            const breakevenNet   = breakeven * netPerUser;
            const breakevenFees  = breakeven * feesPerUser;
            const breakevenVarCost = breakeven * aiPerUser;
            const breakevenTotalCost = fixedTotalUsd + breakevenVarCost;

            const eliteGross = withMargin * s.price;
            const eliteNet   = withMargin * netPerUser;
            const eliteFees  = withMargin * feesPerUser;
            const eliteVarCost = withMargin * aiPerUser;
            const eliteTotalCost = fixedTotalUsd + eliteVarCost;
            const eliteProfit = eliteNet - eliteTotalCost;

            return (
              <div key={s.price} className="bg-bg-card border border-border rounded-xl p-5">
                <div className="text-text-dim text-xs uppercase tracking-widest mb-1">{s.label}</div>
                <div className="text-[10px] text-text-dim mb-3">
                  líquido por user: <span className="font-mono text-jade">{fmtUSD(netPerUser)}</span>
                </div>

                {/* Break-even */}
                <div className="font-mono text-2xl text-text">{breakeven.toLocaleString('pt-BR')}</div>
                <div className="text-xs text-text-muted mt-1">assinantes break-even</div>
                <div className="text-[11px] text-text-dim mt-1.5 space-y-0.5">
                  <div>Bruto: <span className="font-mono text-text-muted">{fmtUSD(breakevenGross)}</span></div>
                  <div>− Taxas: <span className="font-mono text-warning">{fmtUSD(breakevenFees)}</span></div>
                  <div>= Líquido: <span className="font-mono text-text">{fmtUSD(breakevenNet)}</span></div>
                  <div>Custo total: <span className="font-mono text-text-muted">{fmtUSD(breakevenTotalCost)}</span></div>
                  <div>(fixo {fmtUSD(fixedTotalUsd)} + IA {fmtUSD(breakevenVarCost)})</div>
                </div>

                {/* Margem Elite */}
                <div className="border-t border-border mt-3 pt-3">
                  <div className="font-mono text-lg text-jade">{withMargin.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-text-dim mt-0.5">com margem 1,7× (Elite)</div>
                  <div className="text-[11px] text-text-dim mt-1.5 space-y-0.5">
                    <div>Bruto: <span className="font-mono text-text-muted">{fmtUSD(eliteGross)}</span></div>
                    <div>− Taxas: <span className="font-mono text-warning">{fmtUSD(eliteFees)}</span></div>
                    <div>= Líquido: <span className="font-mono text-jade">{fmtUSD(eliteNet)}</span></div>
                    <div>Custo total: <span className="font-mono text-text-muted">{fmtUSD(eliteTotalCost)}</span></div>
                    <div>Lucro líquido: <span className="font-mono text-jade font-bold">{fmtUSD(eliteProfit)}</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Lista de itens — editável inline */}
      <CostsManager items={d.items} />

      {/* Por vendor */}
      {byVendor.length > 0 && (
        <section>
          <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-3">
            Por vendor
          </h2>
          <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left  p-4 font-medium">Vendor</th>
                  <th className="text-right p-4 font-medium">Mensal USD</th>
                  <th className="text-right p-4 font-medium">Anualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byVendor.map(v => (
                  <tr key={v.vendor} className="hover:bg-bg-deep/40">
                    <td className="p-4 font-medium">{v.vendor}</td>
                    <td className="p-4 text-right font-mono">{fmtUSD(v.total)}</td>
                    <td className="p-4 text-right font-mono text-text-muted">{fmtUSD(v.total * 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Metodologia — explicação completa do cálculo de break-even */}
      <section className="bg-bg-card border border-border rounded-xl p-6 mt-4">
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium mb-4">
          Como o cálculo de break-even funciona
        </h2>

        <div className="space-y-5 text-sm text-text-muted leading-relaxed">

          {/* 1. Fórmula */}
          <div>
            <h3 className="text-text font-semibold mb-2">A fórmula completa</h3>
            <p className="mb-2">
              O preço cobrado pelo app não é tudo que entra na conta. Antes do auExpert
              receber o pagamento, ele passa por <strong className="text-text">duas camadas
              de taxas</strong>:
            </p>
            <ul className="list-disc list-inside text-text-dim space-y-1 ml-2 mb-3">
              <li><strong className="text-text">Apple App Store / Google Play</strong>: 30% padrão, 15% pra Small Business Program (receita anual {`<`} $1M) e pra assinaturas após 12 meses do mesmo assinante. Configuração padrão aqui: <strong className="text-jade">{(STORE_FEE_PCT * 100).toFixed(0)}%</strong></li>
              <li><strong className="text-text">RevenueCat</strong>: 0% até $2,5K MTR (Monthly Tracked Revenue), 1% acima. Configuração padrão aqui: <strong className="text-jade">{(RC_FEE_PCT * 100).toFixed(0)}%</strong></li>
            </ul>
            <p className="mb-2">Receita líquida por assinante:</p>
            <pre className="bg-bg-deep border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto">
preço_líquido  =  preço × (1 − {STORE_FEE_PCT}) × (1 − {RC_FEE_PCT})  =  preço × {NET_REVENUE_RATE.toFixed(4)}
            </pre>
            <p className="mt-3 mb-2">A receita líquida precisa cobrir 3 coisas: <strong className="text-text">custo fixo</strong>, <strong className="text-text">custo variável (IA por assinante)</strong> e <strong className="text-text">lucro</strong>:</p>
            <pre className="bg-bg-deep border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto">
N × preço_líquido  =  Fixo  +  (Var/user × N)  +  Lucro
            </pre>
            <p className="mt-2">Resolvendo para break-even (Lucro = 0):</p>
            <pre className="bg-bg-deep border border-border rounded-lg p-3 text-xs font-mono text-jade overflow-x-auto">
N = ⌈ Fixo ÷ (preço_líquido − Var/user) ⌉
            </pre>
            <p className="mt-2 text-text-dim">
              Importante: a margem Elite 1,7× é aplicada sobre N, e o lucro líquido
              real é calculado com receita líquida (após taxas) menos custo total
              (fixo + IA × N). O lucro NÃO inclui as taxas porque elas saem antes.
            </p>
          </div>

          {/* 1b. Quando ajustar as taxas */}
          <div>
            <h3 className="text-text font-semibold mb-2">Quando revisar as taxas</h3>
            <ul className="list-disc list-inside text-text-dim space-y-1 ml-2">
              <li>Receita anual {`>`} $1M sem Small Business Program → trocar STORE_FEE_PCT pra 0,30</li>
              <li>Sair da Apple Small Business → também 0,30 (Apple é por developer, não por app)</li>
              <li>RevenueCat acima de $2,5K MTR → RC_FEE_PCT já está em 0,01</li>
              <li>RevenueCat acima de $10K MTR → considerar plano enterprise (negociado, pode ser {`<`} 1%)</li>
              <li>Apple/Google às vezes oferecem deals enterprise pra apps grandes — vale negociar</li>
            </ul>
            <p className="text-text-dim text-xs mt-2 italic">
              As taxas estão hardcoded em <code className="bg-bg-deep px-1.5 py-0.5 rounded font-mono text-[11px]">costs/page.tsx</code> como
              constantes <code className="bg-bg-deep px-1.5 py-0.5 rounded font-mono text-[11px]">STORE_FEE_PCT</code> e
              <code className="bg-bg-deep px-1.5 py-0.5 rounded font-mono text-[11px]"> RC_FEE_PCT</code>. Pra mudar sem deploy,
              futuramente migrar pra <code className="bg-bg-deep px-1.5 py-0.5 rounded font-mono text-[11px]">app_config</code>.
            </p>
          </div>

          {/* 2. Por que a fórmula simples (custo total ÷ preço) está errada */}
          <div>
            <h3 className="text-text font-semibold mb-2">Por que NÃO é só "custo total ÷ preço"</h3>
            <p>
              Dividir o custo total mensal pelo preço da assinatura trata todo o custo como fixo —
              ignora que mais assinantes geram mais custo de IA. Se 187 tutores geram um certo
              consumo de IA, 318 tutores geram <strong>mais</strong> consumo. A fórmula simples
              dá uma falsa sensação de break-even porque os 131 tutores extras (de 187 para 318)
              também trazem custo variável que precisa ser coberto.
            </p>
          </div>

          {/* 3. Estado atual vs cenário escalado */}
          <div>
            <h3 className="text-text font-semibold mb-2">Estado atual vs escala saudável</h3>
            <p className="mb-3">
              Hoje temos <strong className="text-text">{activeTutors} tutor{activeTutors === 1 ? '' : 'es'} ativo{activeTutors === 1 ? '' : 's'}</strong>{' '}
              consumindo <strong className="text-text">{fmtUSD(variableAiUsd)}/mês</strong> de IA, ou seja{' '}
              <strong className="text-jade">{fmtUSD(aiPerUser)}/user</strong>. Esse número é alto
              porque a base é pequena (beta-testers concentrando uso). Conforme escalar, ele cai —
              o custo de IA se dilui em mais usuários e o uso médio por tutor tende a ser
              razoavelmente esparso (cache de prompt, períodos sem ativar nenhum agente).
            </p>
            <div className="bg-bg-deep border border-border rounded-lg p-4 space-y-3">
              <div>
                <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
                  Cenário 1 — hoje ({activeTutors} tutor{activeTutors === 1 ? '' : 'es'})
                </div>
                <div className="text-xs">
                  Plano Premium $50: margem unitária = $50 − {fmtUSD(aiPerUser)} ={' '}
                  {aiPerUser >= 50
                    ? <span className="text-danger font-mono">NEGATIVA → Inviável</span>
                    : <span className="text-jade font-mono">{fmtUSD(50 - aiPerUser)}</span>}
                </div>
                {aiPerUser >= 50 && (
                  <div className="text-text-dim text-xs italic mt-1">
                    Custo IA por assinante excede o preço — qualquer aumento de base agrava o prejuízo.
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
                  Cenário 2 — com escala saudável (Var/user = $5)
                </div>
                {(() => {
                  const netUnit = 50 * NET_REVENUE_RATE;
                  const margem = netUnit - 5;
                  const N = Math.ceil(fixedTotalUsd / margem);
                  const bruto = N * 50;
                  const liquido = N * netUnit;
                  const custo = fixedTotalUsd + N * 5;
                  return (
                    <div className="text-xs space-y-0.5 font-mono">
                      <div>preço líquido = $50 × {NET_REVENUE_RATE.toFixed(4)} = <span className="text-jade">{fmtUSD(netUnit)}</span></div>
                      <div>margem unitária = {fmtUSD(netUnit)} − $5 = <span className="text-jade">{fmtUSD(margem)}</span></div>
                      <div>N break-even = ⌈ {fmtUSD(fixedTotalUsd)} ÷ {fmtUSD(margem)} ⌉ = <span className="text-jade">{N} assinantes</span></div>
                      <div>Receita bruta = {N} × $50 = {fmtUSD(bruto)}</div>
                      <div>Receita líquida = {N} × {fmtUSD(netUnit)} = {fmtUSD(liquido)}</div>
                      <div>Custo total = {fmtUSD(fixedTotalUsd)} + ({N} × $5) = {fmtUSD(custo)} <span className="text-jade">✓</span></div>
                    </div>
                  );
                })()}
              </div>

              <div className="border-t border-border pt-3">
                <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
                  Margem Elite 1,7× sobre o cenário 2
                </div>
                {(() => {
                  const netUnit = 50 * NET_REVENUE_RATE;
                  const margem = netUnit - 5;
                  const N = Math.ceil(fixedTotalUsd / margem);
                  const elite = Math.ceil(N * 1.7);
                  const eliteBruto = elite * 50;
                  const eliteLiquido = elite * netUnit;
                  const eliteFees = eliteBruto - eliteLiquido;
                  const eliteCost = fixedTotalUsd + elite * 5;
                  const eliteProfit = eliteLiquido - eliteCost;
                  return (
                    <div className="text-xs space-y-0.5 font-mono">
                      <div>N Elite = ⌈ {N} × 1,7 ⌉ = <span className="text-jade">{elite} assinantes</span></div>
                      <div>Receita bruta = {elite} × $50 = {fmtUSD(eliteBruto)}</div>
                      <div>− Taxas stores+RC = <span className="text-warning">{fmtUSD(eliteFees)}</span></div>
                      <div>= Receita líquida = {fmtUSD(eliteLiquido)}</div>
                      <div>Custo total = {fmtUSD(fixedTotalUsd)} + ({elite} × $5) = {fmtUSD(eliteCost)}</div>
                      <div>Lucro líquido = {fmtUSD(eliteLiquido)} − {fmtUSD(eliteCost)} = <span className="text-jade font-bold">{fmtUSD(eliteProfit)}/mês</span></div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* 4. Quando o cenário é "Inviável" */}
          <div>
            <h3 className="text-text font-semibold mb-2">Quando aparece "Inviável"</h3>
            <p>
              Se <em>Var/user ≥ preço</em>, a margem unitária é zero ou negativa — cada novo assinante
              piora o prejuízo. Com a base pequena de hoje isso pode acontecer nos planos baixos
              (Massa $10, Acessível $20). É o sinal econômico correto de que a tabela de preços
              precisa ser ajustada <strong>ou</strong> que o custo de IA por usuário precisa cair antes
              do plano fazer sentido. Caminhos pra reduzir <em>Var/user</em>: substituir Opus por
              Sonnet/Haiku onde possível, ampliar prompt caching, mover trabalho síncrono para CRONs
              em lote, esperar a base crescer (diluição natural).
            </p>
          </div>

          {/* 5. Limites da estimativa */}
          <div>
            <h3 className="text-text font-semibold mb-2">Limites desta estimativa</h3>
            <p>
              <em>Var/user</em> é calculado como{' '}
              <code className="bg-bg-deep px-1.5 py-0.5 rounded font-mono text-[11px]">
                IA mensal ÷ tutores ativos
              </code>
              . Com poucos tutores, beta-testers ativos puxam a média para cima. Em produção com
              ~10k assinantes, esse número converge para o uso médio real (provavelmente bem
              menor). Os cenários acima usam $5/user como aproximação de regime de escala —
              ajuste mentalmente conforme suas projeções.
            </p>
          </div>

        </div>
      </section>

      <p className="text-text-dim text-xs italic text-center pt-4">
        Edição inline: clique no lápis ao lado de cada item, ou em "Adicionar custo" pra incluir um novo.
        Para BRL/EUR/etc., informe o valor na moeda original e a cotação — o USD é calculado automaticamente.
      </p>
    </div>
  );
}
