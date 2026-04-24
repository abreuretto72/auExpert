/**
 * Hook para buscar estatísticas do tutor autenticado.
 * Arquivo destino: src/hooks/useUserStats.ts
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';   // ajuste o path conforme seu projeto
import type { UserStats } from '@/types/userStats';

interface Params {
  year: number;
  month: number;   // 1-12
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

/** Mês atual (month é 1-indexed). */
export function getCurrentYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** Gera lista dos últimos N meses pra seletor. */
export function getLastNMonths(n = 12) {
  const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const result: Array<{ year: number; month: number; label: string }> = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      year:  d.getFullYear(),
      month: d.getMonth() + 1,
      label: fmt.format(d).replace(/^\w/, c => c.toUpperCase()),
    });
  }
  return result;
}
