/**
 * hooks/useProfessionalCapabilities.ts
 *
 * Hook que retorna o conjunto de permissoes do PROFISSIONAL autenticado para
 * um pet especifico via RPC unica (1 round-trip).
 *
 * Tutor owner / pet_member sempre recebe true em todas as 12 capabilities.
 *
 * Cache: 60s.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type Capability =
  | 'analyze_image'
  | 'view_panel'
  | 'view_agenda'
  | 'view_finances'
  | 'read_clinical'
  | 'write_clinical'
  | 'sign_clinical'
  | 'read_diary'
  | 'write_diary'
  | 'read_contact'
  | 'request_access'
  | 'export_data';

export type CapabilitySet = Record<Capability, boolean>;

const ALL_FALSE: CapabilitySet = {
  analyze_image: false, view_panel: false, view_agenda: false, view_finances: false,
  read_clinical: false, write_clinical: false, sign_clinical: false,
  read_diary: false, write_diary: false, read_contact: false,
  request_access: false, export_data: false,
};

export function useProfessionalCapabilities(petId: string | undefined) {
  return useQuery<CapabilitySet>({
    queryKey: ['professional-capabilities', petId],
    queryFn: async () => {
      if (!petId) return ALL_FALSE;
      const { data, error } = await supabase.rpc('get_professional_capabilities', {
        p_pet_id: petId,
      });
      if (error) {
        console.warn('[useProfessionalCapabilities] failed:', error.message);
        return ALL_FALSE;
      }
      return (data as CapabilitySet) ?? ALL_FALSE;
    },
    enabled: !!petId,
    staleTime: 60 * 1000,
  });
}
