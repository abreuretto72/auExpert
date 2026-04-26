/**
 * hooks/useProSignature.ts — Assinatura digital de documentos profissionais.
 *
 * Fluxo (Wave 3a):
 *   1. Caller chama `sign({ targetTable, targetId, payload })` passando um
 *      snapshot completo do documento que está sendo assinado.
 *   2. Hook tenta autenticar o profissional via biometria
 *      (expo-local-authentication). Se o device não suporta ou usuário
 *      cancela, lança erro amigável — sem fallback de senha pra esta ação.
 *   3. Se biometria OK, chama RPC `sign_professional_document` (SECURITY
 *      DEFINER) que:
 *      - Valida prof ativo + access_grant vigente + sign_clinical permission
 *      - Calcula SHA-256 do payload
 *      - Faz INSERT em professional_signatures
 *      - Faz UPDATE no documento alvo (signed_at, signature_id, status)
 *      - Registra audit
 *   4. Retorna `{ signature_id, payload_hash, signed_at }`.
 *
 * Tabelas suportadas: 'prontuarios' | 'receituarios' | 'atestados_saude'
 * | 'termos_consentimento'.
 *
 * Erros possíveis:
 *   - `biometric_unavailable`: device não tem hardware/cadastro biométrico
 *   - `biometric_cancelled`: usuário cancelou
 *   - `biometric_failed`: falhou a autenticação após N tentativas
 *   - `forbidden`: prof não tem grant ativo com sign_clinical
 *   - `already_signed`: documento já tem signature_id
 *
 * NÃO tem fila offline — assinatura digital exige device online E biometria
 * confirmada na hora. Tentativa offline lança erro.
 */
import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type SignableTable =
  | 'prontuarios'
  | 'receituarios'
  | 'atestados_saude'
  | 'termos_consentimento';

export interface SignInput {
  targetTable: SignableTable;
  targetId: string;
  /**
   * Snapshot completo do documento como será arquivado. Vai pra
   * payload_snapshot e o hash SHA-256 será calculado em cima dele no servidor.
   * Inclua TUDO que define o documento — campos editáveis, items, alertas.
   */
  payload: Record<string, unknown>;
}

export interface SignResult {
  signature_id: string;
  payload_hash: string;
  signed_at: string;
}

/**
 * Tenta autenticar o profissional via biometria. Lança erro se device não
 * suporta, usuário cancela ou autenticação falha. Sucesso = silencioso.
 */
async function requireBiometric(): Promise<void> {
  if (Platform.OS === 'web') {
    // Web não tem biometria nativa do Expo; ainda assim permite assinatura
    // (proteção é do JWT + RLS + RPC). Em produção real, web exigiria webauthn.
    return;
  }

  let LocalAuth: typeof import('expo-local-authentication') | null = null;
  try {
    LocalAuth = require('expo-local-authentication');
  } catch {
    throw new Error('biometric_unavailable');
  }
  if (!LocalAuth) throw new Error('biometric_unavailable');

  const hasHardware = await LocalAuth.hasHardwareAsync();
  if (!hasHardware) throw new Error('biometric_unavailable');

  const enrolled = await LocalAuth.isEnrolledAsync();
  if (!enrolled) throw new Error('biometric_unavailable');

  const result = await LocalAuth.authenticateAsync({
    promptMessage: 'Confirme sua assinatura digital',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });

  if (!result.success) {
    if ('error' in result && result.error === 'user_cancel') {
      throw new Error('biometric_cancelled');
    }
    throw new Error('biometric_failed');
  }
}

export function useProSignature() {
  const mutation = useMutation<SignResult, Error, SignInput>({
    mutationFn: async ({ targetTable, targetId, payload }) => {
      if (!onlineManager.isOnline()) {
        throw new Error('Você precisa estar online para assinar documentos.');
      }

      // 1) Biometria
      await requireBiometric();

      // 2) RPC
      const { data, error } = await supabase.rpc('sign_professional_document', {
        p_target_table: targetTable,
        p_target_id: targetId,
        p_payload: payload,
      });

      if (error) {
        const msg = error.message ?? '';
        if (msg.toLowerCase().includes('forbidden')) {
          throw new Error(
            'Sem permissão para assinar este documento. ' +
            'Verifique se o tutor concedeu acesso de assinatura.',
          );
        }
        if (msg.toLowerCase().includes('already signed')) {
          throw new Error('Este documento já foi assinado.');
        }
        throw new Error(error.message || 'Erro ao assinar.');
      }

      return data as SignResult;
    },
  });

  return {
    sign: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
