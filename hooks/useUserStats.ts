/**
 * useUserStats — React Query hook que consome a RPC `get_user_stats`
 * do Supabase e retorna estatísticas do tutor autenticado.
 *
 * Cache: 5 min stale / 15 min gc — o painel não precisa ser tempo real.
 * Pull-to-refresh força refetch via `query.refetch()` na tela.
 *
 * NÃO toca em rede no banco — apenas chama a RPC já existente.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { UserStats } from '../types/userStats';

interface Params {
  year: number;
  month: number;
  enabled?: boolean;
}

export function useUserStats({ year, month, enabled = true }: Params):
  UseQueryResult<UserStats, Error> {
  return useQuery({
    queryKey: ['user-stats', year, month],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_stats', {
        p_year: year,
        p_month: month,
      });
      if (error) throw new Error(error.message);
      return data as UserStats;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime:   15 * 60 * 1000,
  });
}

/** Retorna ano e mês do dispositivo no formato esperado pela RPC. */
export function getCurrentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/**
 * Lista os últimos N meses (incluindo o atual) com label localizada.
 * Usado pelo seletor de mês na tela. `language` aceita 'pt-BR', 'en-US', etc.
 * Defaulta pra pt-BR quando não passa locale.
 */
export function getLastNMonths(n = 12, language = 'pt-BR') {
  const fmt = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' });
  const result: Array<{ year: number; month: number; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      label: fmt.format(d).replace(/^\w/, (c) => c.toUpperCase()),
    });
  }
  return result;
}
