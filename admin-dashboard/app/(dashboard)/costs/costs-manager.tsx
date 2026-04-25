'use client';

import { useState, useTransition } from 'react';
import { Pencil, Trash2, Plus, X, Check } from 'lucide-react';
import {
  CATEGORY_LABELS,
  BILLING_LABELS,
  type InfrastructureCostItem,
  type CostCategory,
  type BillingCycle,
} from '@/lib/types';
import { fmtUSD } from '@/lib/utils';
import { createCost, updateCost, deleteCost, type CostInput } from './actions';

const CATEGORY_OPTIONS: { value: CostCategory; label: string }[] = (
  Object.entries(CATEGORY_LABELS) as [CostCategory, string][]
).map(([value, label]) => ({ value, label }));

const BILLING_OPTIONS: { value: BillingCycle; label: string }[] = (
  Object.entries(BILLING_LABELS) as [BillingCycle, string][]
).map(([value, label]) => ({ value, label }));

const CURRENCY_OPTIONS = ['USD', 'BRL', 'EUR', 'GBP', 'other'] as const;

interface FormState {
  item: string;
  vendor: string;
  category: CostCategory;
  amount: string;
  currency: typeof CURRENCY_OPTIONS[number];
  fx_rate_to_usd: string;
  billing_cycle: BillingCycle;
  started_at: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  item: '',
  vendor: '',
  category: 'infrastructure',
  amount: '',
  currency: 'USD',
  fx_rate_to_usd: '',
  billing_cycle: 'monthly',
  started_at: new Date().toISOString().slice(0, 10),
  notes: '',
};

function itemToForm(it: InfrastructureCostItem): FormState {
  const isUsd = !it.original_currency || it.original_currency === 'USD';
  return {
    item:           it.item,
    vendor:         it.vendor ?? '',
    category:       it.category,
    amount:         String(isUsd ? it.amount_usd : it.original_amount ?? it.amount_usd),
    currency:       (it.original_currency as typeof CURRENCY_OPTIONS[number]) ?? 'USD',
    fx_rate_to_usd: it.fx_rate_to_usd && it.fx_rate_to_usd !== 1 ? String(it.fx_rate_to_usd) : '',
    billing_cycle:  it.billing_cycle,
    started_at:     it.started_at,
    notes:          it.notes ?? '',
  };
}

function formToInput(f: FormState): CostInput {
  return {
    item:             f.item,
    vendor:           f.vendor || null,
    category:         f.category,
    amount:           Number(f.amount),
    currency:         f.currency,
    fx_rate_to_usd:   f.currency === 'USD' ? null : Number(f.fx_rate_to_usd) || null,
    billing_cycle:    f.billing_cycle,
    started_at:       f.started_at,
    notes:            f.notes || null,
  };
}

export function CostsManager({ items }: { items: InfrastructureCostItem[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating]   = useState(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [error, setError]         = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function startEdit(it: InfrastructureCostItem) {
    setEditingId(it.id);
    setCreating(false);
    setFormState(itemToForm(it));
    setError(null);
  }

  function startCreate() {
    setEditingId(null);
    setCreating(true);
    setFormState(EMPTY_FORM);
    setError(null);
  }

  function cancel() {
    setEditingId(null);
    setCreating(false);
    setError(null);
  }

  function submit() {
    setError(null);
    const input = formToInput(formState);

    startTransition(async () => {
      const result = creating
        ? await createCost(input)
        : await updateCost(editingId!, input);

      if (!result.ok) {
        setError(result.error ?? 'Erro desconhecido');
        return;
      }
      cancel();
    });
  }

  function handleDelete(id: string, item: string) {
    if (!confirm(`Excluir "${item}"? (soft delete — pode ser restaurado via SQL)`)) return;
    startTransition(async () => {
      const result = await deleteCost(id);
      if (!result.ok) setError(result.error ?? 'Erro ao excluir');
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-ametista text-xs uppercase tracking-wider font-medium">
          Itens cadastrados ({items.length})
        </h2>
        {!creating && !editingId && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2 bg-jade/10 border border-jade/30 text-jade rounded-lg text-sm font-medium hover:bg-jade/20 transition"
          >
            <Plus size={16} strokeWidth={2} />
            Adicionar custo
          </button>
        )}
      </div>

      {(creating || editingId) && (
        <CostForm
          state={formState}
          onChange={setFormState}
          onSubmit={submit}
          onCancel={cancel}
          pending={pending}
          error={error}
          mode={creating ? 'create' : 'edit'}
        />
      )}

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-deep text-text-muted text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left  p-3 font-medium">Item</th>
              <th className="text-left  p-3 font-medium">Vendor</th>
              <th className="text-left  p-3 font-medium">Categoria</th>
              <th className="text-left  p-3 font-medium">Ciclo</th>
              <th className="text-right p-3 font-medium">USD pago</th>
              <th className="text-right p-3 font-medium">Mensal eq.</th>
              <th className="text-left  p-3 font-medium">Origem</th>
              <th className="text-right p-3 font-medium w-[100px]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map(it => (
              <tr key={it.id} className="hover:bg-bg-deep/40">
                <td className="p-3">
                  <div className="font-medium">{it.item}</div>
                  {it.notes && <div className="text-text-dim text-xs mt-0.5">{it.notes}</div>}
                </td>
                <td className="p-3 text-text-muted">{it.vendor ?? '—'}</td>
                <td className="p-3 text-text">{CATEGORY_LABELS[it.category]}</td>
                <td className="p-3 text-text-muted text-xs">{BILLING_LABELS[it.billing_cycle]}</td>
                <td className="p-3 text-right font-mono">{fmtUSD(Number(it.amount_usd))}</td>
                <td className="p-3 text-right font-mono text-jade">
                  {it.billing_cycle === 'one_time' ? '—' : fmtUSD(Number(it.monthly_equivalent_usd))}
                </td>
                <td className="p-3 text-text-dim text-xs font-mono">
                  {it.original_currency && it.original_currency !== 'USD'
                    ? `${it.original_currency} ${Number(it.original_amount).toLocaleString('pt-BR')} @ ${it.fx_rate_to_usd}`
                    : 'USD'}
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => startEdit(it)}
                      disabled={pending}
                      className="p-2 rounded hover:bg-ametista/20 text-ametista transition disabled:opacity-40"
                      title="Editar"
                    >
                      <Pencil size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => handleDelete(it.id, it.item)}
                      disabled={pending}
                      className="p-2 rounded hover:bg-danger/20 text-danger transition disabled:opacity-40"
                      title="Excluir"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-text-dim italic">
                  Nenhum custo cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface CostFormProps {
  state: FormState;
  onChange: (s: FormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  pending: boolean;
  error: string | null;
  mode: 'create' | 'edit';
}

function CostForm({ state, onChange, onSubmit, onCancel, pending, error, mode }: CostFormProps) {
  const isUsd = state.currency === 'USD';
  const computedUsd = isUsd
    ? Number(state.amount) || 0
    : (Number(state.amount) || 0) / (Number(state.fx_rate_to_usd) || 1);

  return (
    <div className="bg-bg-card border border-jade/30 rounded-xl p-5 mb-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-jade text-sm font-medium">
          {mode === 'create' ? 'Novo custo' : 'Editar custo'}
        </h3>
        <button onClick={onCancel} className="text-text-muted hover:text-text">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Item *">
          <input
            value={state.item}
            onChange={e => onChange({ ...state, item: e.target.value })}
            placeholder="Ex: Supabase Pro + Addons"
            className="input"
          />
        </Field>

        <Field label="Vendor">
          <input
            value={state.vendor}
            onChange={e => onChange({ ...state, vendor: e.target.value })}
            placeholder="Ex: Supabase, Anthropic"
            className="input"
          />
        </Field>

        <Field label="Categoria *">
          <select
            value={state.category}
            onChange={e => onChange({ ...state, category: e.target.value as CostCategory })}
            className="input"
          >
            {CATEGORY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Ciclo de cobrança *">
          <select
            value={state.billing_cycle}
            onChange={e => onChange({ ...state, billing_cycle: e.target.value as BillingCycle })}
            className="input"
          >
            {BILLING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label={`Valor (${state.currency}) *`}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={state.amount}
            onChange={e => onChange({ ...state, amount: e.target.value })}
            placeholder="500.00"
            className="input"
          />
        </Field>

        <Field label="Moeda *">
          <select
            value={state.currency}
            onChange={e => onChange({ ...state, currency: e.target.value as typeof CURRENCY_OPTIONS[number] })}
            className="input"
          >
            {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {!isUsd && (
          <Field label={`Cotação ${state.currency}→USD *`}>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={state.fx_rate_to_usd}
              onChange={e => onChange({ ...state, fx_rate_to_usd: e.target.value })}
              placeholder="5.20"
              className="input"
            />
          </Field>
        )}

        <Field label="Início (started_at)">
          <input
            type="date"
            value={state.started_at}
            onChange={e => onChange({ ...state, started_at: e.target.value })}
            className="input"
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Notas">
            <textarea
              value={state.notes}
              onChange={e => onChange({ ...state, notes: e.target.value })}
              rows={2}
              placeholder="Detalhes, ajustes, observações…"
              className="input resize-none"
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="text-text-dim text-xs">
          Equivale a <span className="font-mono text-jade">{fmtUSD(computedUsd)}</span> em USD
          {!isUsd && state.fx_rate_to_usd && ` (com FX ${state.fx_rate_to_usd})`}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={pending}
            className="px-4 py-2 text-sm text-text-muted hover:text-text rounded-lg disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={pending || !state.item || !state.amount}
            className="flex items-center gap-2 px-4 py-2 bg-jade text-bg-deep rounded-lg text-sm font-medium hover:bg-jade/80 transition disabled:opacity-40"
          >
            <Check size={16} strokeWidth={2.5} />
            {pending ? 'Salvando…' : mode === 'create' ? 'Adicionar' : 'Salvar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-danger text-sm border-t border-danger/30 pt-2">{error}</div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-text-muted text-xs uppercase tracking-wider font-medium block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
