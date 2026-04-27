'use client';

/**
 * ResolutionCard — checkbox "Concluído" + textarea de observação por classe
 * de erro (signature). Marca a resolução em ai_error_resolutions via RPC
 * set_admin_ai_resolution.
 *
 * A resolução é por SIGNATURE (function + category + prefixo do message),
 * então marcar uma vez aplica a todas as ocorrências passadas e futuras
 * com o mesmo erro. Reabrir é só desmarcar o checkbox.
 */

import { useState, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-client';
import { fmtDate } from '@/lib/utils';

interface Props {
  invocationId: string;
  initialResolution: {
    is_resolved: boolean;
    resolution_notes: string | null;
    resolved_at: string;
    resolver_email: string | null;
  } | null;
}

export function ResolutionCard({ invocationId, initialResolution }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [isResolved, setIsResolved] = useState(initialResolution?.is_resolved ?? false);
  const [notes, setNotes] = useState(initialResolution?.resolution_notes ?? '');
  const [savedAt, setSavedAt] = useState<string | null>(initialResolution?.resolved_at ?? null);
  const [resolverEmail, setResolverEmail] = useState<string | null>(
    initialResolution?.resolver_email ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function persist(nextResolved: boolean, nextNotes: string) {
    setError(null);
    startTransition(async () => {
      const { data, error: rpcErr } = await supabase.rpc('set_admin_ai_resolution', {
        p_invocation_id: invocationId,
        p_resolved: nextResolved,
        p_notes: nextNotes.trim() ? nextNotes.trim() : null,
      });
      if (rpcErr) {
        setError(rpcErr.message);
        return;
      }
      const ok = (data as { ok?: boolean } | null)?.ok;
      if (!ok) {
        setError(String((data as { reason?: string } | null)?.reason ?? 'unknown'));
        return;
      }
      setSavedAt(new Date().toISOString());
      // Server only retorna ok+signature; mantemos resolverEmail = null aqui,
      // página recarrega ao navegar de novo pra puxar o email do RPC detail.
      setResolverEmail((prev) => prev ?? '(você)');
      setDirty(false);
    });
  }

  function handleToggle(next: boolean) {
    setIsResolved(next);
    persist(next, notes);
  }

  function handleSaveNotes() {
    persist(isResolved, notes);
  }

  return (
    <div className="bg-bg-deep border border-border rounded-xl p-4 space-y-3">
      <div className="text-ametista text-[10px] uppercase tracking-widest font-medium">
        Acompanhamento
      </div>

      {/* Checkbox + status */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isResolved}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={isPending}
          className="mt-0.5 w-4 h-4 accent-jade cursor-pointer"
        />
        <div className="flex-1">
          <div className={`text-sm font-medium ${isResolved ? 'text-jade' : 'text-text-muted'}`}>
            {isResolved ? '✓ Concluído' : 'Marcar como concluído'}
          </div>
          {isResolved && savedAt && (
            <div className="text-text-dim text-[11px] font-mono mt-0.5">
              {fmtDate(savedAt)}
              {resolverEmail && <span> · {resolverEmail}</span>}
            </div>
          )}
        </div>
      </label>

      {/* Textarea de observação */}
      <div>
        <label className="text-text-dim text-[10px] uppercase tracking-widest font-medium block mb-1">
          Observação
        </label>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          onBlur={() => {
            if (dirty) handleSaveNotes();
          }}
          placeholder="Diagnóstico aplicado, fix de código, escalado pra X, etc."
          rows={3}
          className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-text text-sm resize-y focus:outline-none focus:border-jade/50"
          disabled={isPending}
        />
        <div className="flex items-center justify-between mt-1.5">
          <div className="text-text-dim text-[10px]">
            Salva ao tirar o foco do campo.
          </div>
          {dirty && (
            <button
              onClick={handleSaveNotes}
              disabled={isPending}
              className="text-jade text-[11px] hover:underline"
            >
              Salvar agora
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-danger text-xs font-mono break-words">
          Erro ao salvar: {error}
        </div>
      )}
    </div>
  );
}
