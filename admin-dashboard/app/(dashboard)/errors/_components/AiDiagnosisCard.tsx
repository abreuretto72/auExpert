'use client';

/**
 * AiDiagnosisCard — botão "Diagnosticar com IA" + display do diagnóstico.
 *
 * Fluxo:
 *   1. Mount: chama RPC get_admin_ai_diagnosis_by_invocation pra ver se já há
 *      diagnóstico cacheado pra essa signature. Se sim, mostra direto.
 *   2. Sem cache: mostra botão "Diagnosticar com IA".
 *   3. Click: invoca EF diagnose-ai-error, salva resultado, exibe.
 *   4. Botão "Re-diagnosticar" force=true revalida (ignora cache).
 */

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { fmtDate } from '@/lib/utils';
import type { AiDiagnosis, AiDiagnosisResponse } from '@/lib/types';

interface Props {
  invocationId: string;
}

type State =
  | { kind: 'checking_cache' }
  | { kind: 'no_cache' }
  | { kind: 'running' }
  | { kind: 'ready'; data: AiDiagnosisResponse }
  | { kind: 'error'; message: string };

export function AiDiagnosisCard({ invocationId }: Props) {
  const [state, setState] = useState<State>({ kind: 'checking_cache' });
  const supabase = createSupabaseBrowserClient();

  // 1) Cache check on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_admin_ai_diagnosis_by_invocation', {
        p_invocation_id: invocationId,
      });
      if (cancelled) return;
      if (error) {
        setState({ kind: 'error', message: error.message });
        return;
      }
      if (data?.found) {
        setState({
          kind: 'ready',
          data: {
            from_cache: true,
            signature: data.signature,
            id: data.id,
            diagnosis: data.diagnosis,
            model_used: data.model_used,
            tokens_in: data.tokens_in ?? 0,
            tokens_out: data.tokens_out ?? 0,
            latency_ms: data.latency_ms ?? 0,
            occurrences_when_diagnosed: data.occurrences_when_diagnosed ?? 0,
            generated_at: data.generated_at,
          },
        });
      } else {
        setState({ kind: 'no_cache' });
      }
    })();
    return () => { cancelled = true; };
  }, [invocationId, supabase]);

  async function runDiagnosis(force: boolean) {
    setState({ kind: 'running' });
    const { data, error } = await supabase.functions.invoke<AiDiagnosisResponse>(
      'diagnose-ai-error',
      { body: { invocation_id: invocationId, force } },
    );
    if (error) {
      setState({ kind: 'error', message: error.message });
      return;
    }
    if (!data || !data.diagnosis) {
      setState({ kind: 'error', message: 'Resposta vazia do diagnóstico' });
      return;
    }
    setState({ kind: 'ready', data });
  }

  if (state.kind === 'checking_cache') {
    return (
      <div className="bg-bg-deep border border-border rounded-xl p-4">
        <div className="text-text-muted text-xs">Procurando diagnóstico em cache…</div>
      </div>
    );
  }

  if (state.kind === 'no_cache') {
    return (
      <div className="bg-bg-deep border border-border rounded-xl p-5">
        <div className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-3">
          Diagnóstico assistido por IA
        </div>
        <p className="text-text-muted text-sm mb-4">
          A IA pode analisar o erro, os diag_logs correlatos e a recorrência, propondo
          causa raiz, severidade e ações de correção. O resultado é cacheado por
          assinatura — diagnosticar o mesmo erro de novo é gratuito.
        </p>
        <button
          onClick={() => runDiagnosis(false)}
          className="bg-jade text-bg px-4 py-2 rounded-lg text-sm font-medium hover:bg-jade/90 transition"
        >
          Diagnosticar com IA
        </button>
      </div>
    );
  }

  if (state.kind === 'running') {
    return (
      <div className="bg-bg-deep border border-jade/30 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-jade animate-pulse" />
          <span className="text-text-muted text-sm">Diagnosticando — pode levar 5 a 15 segundos…</span>
        </div>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="bg-bg-deep border border-danger/30 rounded-xl p-5">
        <div className="text-danger text-sm font-medium mb-2">Não foi possível diagnosticar</div>
        <pre className="text-text-dim text-xs font-mono whitespace-pre-wrap break-words">
{state.message}
        </pre>
        <button
          onClick={() => runDiagnosis(false)}
          className="mt-3 text-jade text-xs hover:underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── ready ──
  const { data } = state;
  return <DiagnosisDisplay data={data} onRediagnose={() => runDiagnosis(true)} />;
}

// ── Display ──────────────────────────────────────────────────────────────────

function DiagnosisDisplay({
  data,
  onRediagnose,
}: {
  data: AiDiagnosisResponse;
  onRediagnose: () => void;
}) {
  const d: AiDiagnosis = data.diagnosis;
  const severityColors = {
    low:      'bg-jade/10 text-jade border-jade/30',
    medium:   'bg-warning/10 text-warning border-warning/30',
    high:     'bg-danger/10 text-danger border-danger/30',
    critical: 'bg-danger/30 text-danger border-danger/50 font-bold',
  };
  const confidenceColors = {
    low:    'text-text-dim',
    medium: 'text-warning',
    high:   'text-jade',
  };

  return (
    <div className="bg-bg-deep border border-jade/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-jade/10 px-5 py-3 border-b border-jade/20 flex items-baseline justify-between">
        <div className="text-ametista text-[10px] uppercase tracking-widest font-medium">
          Diagnóstico IA · {data.from_cache ? 'cache' : 'novo'}
        </div>
        <div className="text-text-dim text-[10px] font-mono">
          {data.model_used} · {data.tokens_in}+{data.tokens_out} tok · {data.latency_ms}ms
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Severity + confidence chips */}
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] px-2 py-1 rounded-md font-mono uppercase border ${severityColors[d.severity] ?? severityColors.medium}`}>
            severidade: {d.severity}
          </span>
          <span className={`text-[10px] px-2 py-1 rounded-md font-mono uppercase border border-border ${confidenceColors[d.confidence] ?? 'text-text-muted'}`}>
            confiança: {d.confidence}
          </span>
        </div>

        {/* Summary */}
        <div>
          <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
            Resumo
          </div>
          <p className="text-text text-sm leading-relaxed">{d.summary}</p>
        </div>

        {/* Root cause */}
        <div>
          <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
            Causa raiz
          </div>
          <p className="text-text text-sm leading-relaxed">{d.root_cause}</p>
        </div>

        {/* Evidence */}
        {d.evidence?.length > 0 && (
          <div>
            <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-2">
              Evidências
            </div>
            <ul className="space-y-1.5">
              {d.evidence.map((e, i) => (
                <li key={i} className="text-text-muted text-xs flex gap-2">
                  <span className="text-jade font-mono mt-0.5">·</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fix actions */}
        {d.fix_actions?.length > 0 && (
          <div>
            <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-2">
              Ações sugeridas ({d.fix_actions.length})
            </div>
            <ol className="space-y-3">
              {d.fix_actions.map((a, i) => (
                <li key={i} className="bg-bg-card border border-border rounded-lg p-3">
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-ametista/10 text-ametista border border-ametista/30">
                      {a.type}
                    </span>
                    <span className="text-text text-sm font-medium">#{i + 1}</span>
                  </div>
                  <p className="text-text-muted text-sm leading-relaxed mb-2">{a.description}</p>
                  {a.command_or_sql && (
                    <pre className="bg-bg-deep border border-border rounded p-2 text-[11px] font-mono text-text-muted whitespace-pre-wrap break-words max-h-40 overflow-auto">
{a.command_or_sql}
                    </pre>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* References */}
        {d.references && d.references.length > 0 && (
          <div>
            <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
              Referências
            </div>
            <ul className="space-y-1">
              {d.references.map((r, i) => (
                <li key={i} className="text-text-dim text-xs font-mono">{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-baseline justify-between text-[10px] text-text-dim">
          <span className="font-mono">
            gerado {fmtDate(data.generated_at)}
            {data.occurrences_when_diagnosed > 0 && ` · ${data.occurrences_when_diagnosed} ocorr/24h no momento`}
          </span>
          <button
            onClick={onRediagnose}
            className="text-jade hover:underline"
          >
            Re-diagnosticar
          </button>
        </div>
      </div>
    </div>
  );
}
