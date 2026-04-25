'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { CostCategory, BillingCycle } from '@/lib/types';

/**
 * Server Actions para CRUD em infrastructure_costs.
 *
 * Defesa em profundidade:
 *  - middleware.ts já valida users.role = 'admin' na rota /costs
 *  - RLS na tabela exige is_admin() para INSERT/UPDATE/DELETE
 *  - RPC get_admin_total_costs faz check is_admin() no corpo
 *
 * Conversão BRL → USD: se original_currency = 'BRL' e fx_rate informado,
 * amount_usd é calculado servidor-side aqui (mesmo arquivo, fonte única).
 */

export interface CostInput {
  item: string;
  vendor: string | null;
  category: CostCategory;
  amount: number;                    // valor na moeda original
  currency: 'USD' | 'BRL' | 'EUR' | 'GBP' | 'other';
  fx_rate_to_usd?: number | null;    // obrigatório se currency != USD
  billing_cycle: BillingCycle;
  started_at?: string;               // YYYY-MM-DD; default = today
  notes?: string | null;
}

function computeUsd(input: CostInput): number {
  if (input.currency === 'USD') return Number(input.amount);
  const fx = input.fx_rate_to_usd ?? 1;
  if (!fx || fx <= 0) {
    throw new Error('fx_rate_to_usd é obrigatório e maior que zero quando moeda é diferente de USD');
  }
  return Number(input.amount) / fx;
}

export async function createCost(input: CostInput): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!input.item?.trim()) return { ok: false, error: 'item obrigatório' };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'valor deve ser maior que zero' };
    }

    const amount_usd = Number(computeUsd(input).toFixed(2));

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('infrastructure_costs').insert({
      item:              input.item.trim(),
      vendor:            input.vendor?.trim() || null,
      category:          input.category,
      amount_usd,
      billing_cycle:     input.billing_cycle,
      original_amount:   Number(input.amount),
      original_currency: input.currency,
      fx_rate_to_usd:    input.currency === 'USD' ? 1 : input.fx_rate_to_usd ?? null,
      started_at:        input.started_at || new Date().toISOString().slice(0, 10),
      notes:             input.notes?.trim() || null,
    });

    if (error) return { ok: false, error: error.message };
    revalidatePath('/costs');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateCost(
  id: string,
  input: CostInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!id) return { ok: false, error: 'id obrigatório' };
    if (!input.item?.trim()) return { ok: false, error: 'item obrigatório' };
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, error: 'valor deve ser maior que zero' };
    }

    const amount_usd = Number(computeUsd(input).toFixed(2));

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('infrastructure_costs').update({
      item:              input.item.trim(),
      vendor:            input.vendor?.trim() || null,
      category:          input.category,
      amount_usd,
      billing_cycle:     input.billing_cycle,
      original_amount:   Number(input.amount),
      original_currency: input.currency,
      fx_rate_to_usd:    input.currency === 'USD' ? 1 : input.fx_rate_to_usd ?? null,
      started_at:        input.started_at || undefined,
      notes:             input.notes?.trim() || null,
      updated_at:        new Date().toISOString(),
    }).eq('id', id);

    if (error) return { ok: false, error: error.message };
    revalidatePath('/costs');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Soft delete: marca is_active = false e ended_at = hoje.
 * Preserva o registro pra histórico.
 */
export async function deleteCost(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!id) return { ok: false, error: 'id obrigatório' };
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('infrastructure_costs').update({
      is_active: false,
      ended_at:  new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }).eq('id', id);

    if (error) return { ok: false, error: error.message };
    revalidatePath('/costs');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
