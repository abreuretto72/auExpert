/**
 * hooks/usePetAgentAccess.ts — quais agentes IA estao disponiveis para o pet.
 *
 * Chama RPC get_pet_available_agents(pet_id) que retorna um objeto bool por
 * agente baseado no plano de assinatura do tutor DONO do pet.
 *
 * Usado no hub /professional/agents pra esconder agentes bloqueados e mostrar
 * disclaimer/upgrade CTA quando todos estao bloqueados.
 *
 * Cache: 60s (planos não mudam frequentemente; reduz spam de RPC).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface PetAgentAccess {
  plan_id: string | null;
  anamnese: boolean;
  prontuario: boolean;
  receituario: boolean;
  asa: boolean;
  tci: boolean;
  notificacao: boolean;
  alta: boolean;
}

export type AgentSlug = keyof Omit<PetAgentAccess, 'plan_id'>;

const DEFAULT_ACCESS: PetAgentAccess = {
  plan_id: null,
  anamnese: false, prontuario: false, receituario: false,
  asa: false, tci: false, notificacao: false, alta: false,
};

export function usePetAgentAccess(petId: string | undefined) {
  return useQuery<PetAgentAccess>({
    queryKey: ['pet-agent-access', petId],
    queryFn: async () => {
      if (!petId) return DEFAULT_ACCESS;
      const { data, error } = await supabase.rpc('get_pet_available_agents', { p_pet_id: petId });
      if (error) throw error;
      return (data as PetAgentAccess) ?? DEFAULT_ACCESS;
    },
    enabled: !!petId,
    staleTime: 60 * 1000,
  });
}
