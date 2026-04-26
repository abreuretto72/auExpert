/**
 * hooks/useProAgent.ts — wrapper React Query genérico para os 7 agentes IA.
 *
 * Cada agente é uma Edge Function que:
 *   - Recebe pet_id + body específico do agente
 *   - Retorna draft estruturado (e às vezes salva em tabela com status='draft')
 *
 * Este hook é puramente funcional — uma `useMutation` com timeout longo (140s
 * porque o Claude pode levar 30-60s pra processar contexto grande). Não tem
 * cache de resposta — toda chamada é "uma nova geração".
 *
 * Uso típico (na tela do agente):
 *
 *   const { run, isPending } = useProAgent('agent-anamnese');
 *   const handleGenerate = async () => {
 *     try {
 *       const result = await run({ pet_id, language: i18n.language });
 *       setBriefing(result);
 *     } catch (e) {
 *       toast(getErrorMessage(e), 'error');
 *     }
 *   };
 *
 * Os 7 nomes válidos (slug do Edge Function no Supabase):
 *   - agent-anamnese
 *   - agent-prontuario
 *   - agent-receituario
 *   - agent-asa
 *   - agent-tci
 *   - agent-notificacao
 *   - agent-relatorio-alta
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/withTimeout';

export type AgentSlug =
  | 'agent-anamnese'
  | 'agent-prontuario'
  | 'agent-receituario'
  | 'agent-asa'
  | 'agent-tci'
  | 'agent-notificacao'
  | 'agent-relatorio-alta';

/**
 * Invoca um agente IA. Lança erro em caso de falha (consumir via try/catch +
 * getErrorMessage). Timeout default = 140s (Claude com contexto grande +
 * fallback pode levar ~60s).
 */
export function useProAgent<TBody extends Record<string, unknown>, TResponse = unknown>(
  agent: AgentSlug,
  options?: { timeoutMs?: number },
) {
  const timeoutMs = options?.timeoutMs ?? 140_000;

  const mutation = useMutation<TResponse, Error, TBody>({
    mutationFn: async (body) => {
      const { data, error } = await withTimeout(
        supabase.functions.invoke(agent, { body }),
        timeoutMs,
        agent,
      );
      if (error) throw new Error(error.message ?? `${agent} failed`);
      // EFs retornam { error: 'msg' } em alguns casos (ex: 502 ai_unavailable)
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error(String(data.error));
      }
      return data as TResponse;
    },
  });

  return {
    run: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// ── Tipos de resposta dos 7 agentes (úteis para chamadores tipados) ──────────

export interface AnamneseResponse {
  pet_summary: string | null;
  recent_consultations: Array<{ date: string; type: string; summary: string; diagnosis: string | null }>;
  current_medications: Array<{ name: string; frequency: string; reason: string | null; started: string }>;
  vaccines_status: 'em dia' | 'atrasado' | 'pendente' | 'sem registro';
  weight_trend: 'estavel' | 'crescente' | 'decrescente' | 'unknown';
  recent_symptoms: string[];
  alerts: string[];
  suggested_questions: string[];
}

export interface ProntuarioResponse {
  id: string;
  draft: {
    history: string | null;
    current_medications: string | null;
    physical_exam_notes: string | null;
    diagnoses: string[];
    treatment_plan: string | null;
    follow_up_days: number;
    prognosis: string | null;
  };
}

export interface ReceituarioResponse {
  id: string;
  prescription_type: 'standard' | 'controlled' | 'special';
  items: Array<{
    name: string;
    dose: string | null;
    frequency: string;
    duration: string | null;
    route: string | null;
    notes: string | null;
  }>;
  observations: string | null;
  alerts: string[];
}

export interface AsaResponse {
  id: string;
  vaccines_up_to_date: boolean;
  parasite_control_ok: boolean;
  fit_for_travel: boolean;
  clinical_findings: string | null;
  observations: string | null;
  alerts: string[];
}

export interface TciResponse {
  id: string;
  procedure_type: string;
  procedure_description: string;
  risks_described: string | null;
  alternatives_described: string | null;
}

export interface NotificacaoResponse {
  id: string | null; // null se is_notifiable=false (não persistido)
  is_notifiable: boolean;
  cid_code: string | null;
  suspicion_level: 'suspeita' | 'provavel' | 'confirmada';
  notified_agency: string | null;
  observations: string | null;
  alerts: string[];
  next_steps: string[];
}

export interface RelatorioAltaResponse {
  diagnosis_summary: string | null;
  treatment_received: string[];
  home_care: string[];
  follow_up_schedule: string | null;
  red_flags: string[];
  contact_instructions: string | null;
}
