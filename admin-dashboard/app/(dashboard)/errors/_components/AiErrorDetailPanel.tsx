/**
 * AiErrorDetailPanel — server component carregado quando ?ai=<id> está presente
 * na rota /errors. Mostra:
 *   - Cabeçalho: função, modelo, latência, request_id (extraído do payload)
 *   - Pet/usuário, status, categoria, contadores de recorrência
 *   - error_message completo (não truncado) + payload JSON
 *   - Timeline de diag_logs da janela ±10 min na mesma EF
 *
 * Não interativo (futura Onda C adiciona o botão "Diagnosticar com IA"
 * que dispara EF e mostra o resultado aqui).
 */

import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { fmtDate, fmtLatency, fmtNum } from '@/lib/utils';
import { ERROR_LABELS, FUNCTION_LABELS, type AdminAiErrorDetail } from '@/lib/types';
import { AiDiagnosisCard } from './AiDiagnosisCard';
import { ResolutionCard } from './ResolutionCard';

interface AiErrorDetailPanelProps {
  invocationId: string;
  closeHref: string;
}

export async function AiErrorDetailPanel({ invocationId, closeHref }: AiErrorDetailPanelProps) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_admin_ai_error_detail', { p_id: invocationId });

  if (error) {
    return (
      <div className="bg-bg-card border border-danger/30 rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-display text-xl text-danger">Não foi possível carregar o detalhe</h3>
          <CloseLink href={closeHref} />
        </div>
        <pre className="text-text-dim text-xs whitespace-pre-wrap font-mono">{error.message}</pre>
      </div>
    );
  }

  const detail = data as AdminAiErrorDetail | null;
  if (!detail || !detail.invocation || ('error' in (detail as Record<string, unknown>))) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-display text-xl">Invocação não encontrada</h3>
          <CloseLink href={closeHref} />
        </div>
      </div>
    );
  }

  const inv = detail.invocation;
  const rec = detail.recurrence;
  const resolution = detail.resolution;
  const requestId = (inv.payload?.request_id as string | undefined) ?? null;
  const appVersion = (inv.payload?.app_version as string | undefined)
    ?? (inv.payload?.appVersion as string | undefined)
    ?? null;
  const fnLabel = FUNCTION_LABELS[inv.function_name] ?? inv.function_name;
  const catLabel = inv.error_category ? (ERROR_LABELS[inv.error_category] ?? inv.error_category) : '—';

  return (
    <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-bg-deep px-5 py-4 border-b border-border flex items-baseline justify-between gap-4">
        <div>
          <div className="text-text-muted text-[10px] uppercase tracking-widest font-medium mb-1">
            Detalhe do incidente
          </div>
          <h3 className="font-display text-2xl text-text">{fnLabel}</h3>
          <div className="text-text-dim text-xs mt-1 font-mono">{fmtDate(inv.created_at)}</div>
        </div>
        <CloseLink href={closeHref} />
      </div>

      {/* Diagnóstico IA — client component que checa cache + invoca EF se necessário */}
      <div className="px-5 py-4 border-b border-border">
        <AiDiagnosisCard invocationId={inv.id} />
      </div>

      {/* Acompanhamento — checkbox concluído + textarea de observação */}
      <div className="px-5 py-4 border-b border-border">
        <ResolutionCard
          invocationId={inv.id}
          initialResolution={
            resolution
              ? {
                  is_resolved:      resolution.is_resolved,
                  resolution_notes: resolution.resolution_notes,
                  resolved_at:      resolution.resolved_at,
                  resolver_email:   resolution.resolver_email,
                }
              : null
          }
        />
      </div>

      {/* Resumo: chips factuais */}
      <div className="px-5 py-4 border-b border-border grid grid-cols-2 md:grid-cols-4 gap-3">
        <Chip label="Categoria" value={catLabel} accent="warning" />
        <Chip label="Modelo" value={inv.model_used ?? '—'} accent="text" />
        <Chip label="Latência" value={inv.latency_ms ? fmtLatency(inv.latency_ms) : '—'} accent="text" />
        <Chip label="Tokens (in/out)" value={`${fmtNum(inv.tokens_in ?? 0)} / ${fmtNum(inv.tokens_out ?? 0)}`} accent="text" />
        <Chip label="Provider" value={inv.provider ?? '—'} accent="text" />
        <Chip label="Versão do app" value={appVersion ?? '—'} accent="text" mono />
        <Chip label="Tutor" value={inv.user_email ?? '—'} accent="text" mono />
        <Chip label="Pet" value={inv.pet_name ?? (inv.pet_id ? inv.pet_id.slice(0, 8) : '—')} accent="text" />
        <Chip label="Request ID" value={requestId ?? '—'} accent="text" mono />
      </div>

      {/* Recorrência */}
      <div className="px-5 py-4 border-b border-border">
        <div className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-2">
          Recorrência (mesma função + mesma categoria + prefixo idêntico)
        </div>
        <div className="grid grid-cols-3 gap-3">
          <RecCard label="24h" value={rec.count_24h} accent={rec.count_24h > 5 ? 'danger' : 'warning'} />
          <RecCard label="7 dias" value={rec.count_7d} accent="text" />
          <RecCard label="Tutores afetados (24h)" value={rec.users_24h} accent={rec.users_24h > 1 ? 'danger' : 'text'} />
        </div>
        {rec.first_seen && (
          <div className="text-text-dim text-xs mt-2">
            Primeira ocorrência: <span className="font-mono">{fmtDate(rec.first_seen)}</span>
          </div>
        )}
      </div>

      {/* Mensagem técnica completa */}
      <div className="px-5 py-4 border-b border-border">
        <div className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-2">
          Mensagem técnica
        </div>
        <pre className="bg-bg-deep border border-border rounded-lg p-3 text-xs font-mono text-text-muted whitespace-pre-wrap break-words max-h-64 overflow-auto">
{inv.error_message ?? '(vazia)'}
        </pre>
        {inv.user_message && (
          <div className="mt-3">
            <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-1">
              Mensagem mostrada ao tutor
            </div>
            <div className="text-text-muted text-sm italic">"{inv.user_message}"</div>
          </div>
        )}
      </div>

      {/* Payload */}
      {inv.payload && Object.keys(inv.payload).length > 0 && (
        <div className="px-5 py-4 border-b border-border">
          <div className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-2">
            Payload
          </div>
          <pre className="bg-bg-deep border border-border rounded-lg p-3 text-xs font-mono text-text-muted whitespace-pre-wrap break-words max-h-64 overflow-auto">
{JSON.stringify(inv.payload, null, 2)}
          </pre>
        </div>
      )}

      {/* Diag logs timeline */}
      <div className="px-5 py-4">
        <div className="text-ametista text-[10px] uppercase tracking-widest font-medium mb-3">
          Timeline diag_logs ({detail.diag_logs.length}) — janela ±10 min na mesma EF
        </div>
        {detail.diag_logs.length === 0 ? (
          <div className="text-text-dim text-xs italic">
            Nenhuma entrada em edge_function_diag_logs nesta janela. A EF pode não estar instrumentada
            com diag logs detalhados, ou o erro ocorreu antes do primeiro breadcrumb.
          </div>
        ) : (
          <ol className="space-y-2">
            {detail.diag_logs.map(log => (
              <li key={log.id} className="bg-bg-deep border border-border rounded-lg p-3">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="flex items-baseline gap-2">
                    <LevelBadge level={log.level} />
                    <span className="text-text text-sm font-medium">{log.message}</span>
                  </div>
                  <div className="text-text-dim text-xs font-mono whitespace-nowrap">
                    {fmtDate(log.created_at)}
                  </div>
                </div>
                {log.request_id && (
                  <div className="text-text-dim text-[10px] font-mono mb-1">req: {log.request_id}</div>
                )}
                {log.payload && Object.keys(log.payload).length > 0 && (
                  <pre className="bg-bg-card border border-border rounded p-2 text-[11px] font-mono text-text-muted whitespace-pre-wrap break-words max-h-40 overflow-auto mt-2">
{JSON.stringify(log.payload, null, 2)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function CloseLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="text-text-muted hover:text-text text-xs px-3 py-1.5 rounded-lg border border-border hover:border-text-muted transition"
    >
      Fechar ✕
    </Link>
  );
}

function Chip({
  label, value, accent, mono = false,
}: { label: string; value: string; accent: 'warning' | 'danger' | 'jade' | 'text'; mono?: boolean }) {
  const colorMap = {
    warning: 'text-warning',
    danger:  'text-danger',
    jade:    'text-jade',
    text:    'text-text',
  };
  return (
    <div className="bg-bg-deep border border-border rounded-lg px-3 py-2">
      <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-0.5">{label}</div>
      <div className={`${colorMap[accent]} text-sm ${mono ? 'font-mono' : ''} truncate`}>{value}</div>
    </div>
  );
}

function RecCard({ label, value, accent }: { label: string; value: number; accent: 'warning' | 'danger' | 'text' }) {
  const colorMap = {
    warning: 'text-warning',
    danger:  'text-danger',
    text:    'text-text',
  };
  return (
    <div className="bg-bg-deep border border-border rounded-lg px-3 py-2 text-center">
      <div className="text-text-dim text-[10px] uppercase tracking-widest font-medium mb-0.5">{label}</div>
      <div className={`font-display text-2xl ${colorMap[accent]}`}>{fmtNum(value)}</div>
    </div>
  );
}

function LevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    info:  'bg-jade/10 text-jade border-jade/30',
    warn:  'bg-warning/10 text-warning border-warning/30',
    error: 'bg-danger/10 text-danger border-danger/30',
    debug: 'bg-bg-card text-text-muted border-border',
  };
  return (
    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${map[level] ?? map.debug}`}>
      {level}
    </span>
  );
}
