/**
 * recordUserLogin — registra um login bem-sucedido em audit_log via RPC.
 *
 * Chamado APENAS após autenticação explícita do tutor (senha OU biometria que
 * faz re-login). NÃO chamar em refresh automático de token, restoração silenciosa
 * de sessão, ou re-auth interna (ex: confirmação de exclusão).
 *
 * Best-effort: nunca lança exceção. Em caso de falha, apenas loga warning.
 * O card "Dias ativos no mês" depende dessa função — sem ela, fica zerado.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

export type AuthMethod =
  | 'password'
  | 'biometric'
  | 'oauth'
  | 'magic_link'
  | 'social';

export async function recordUserLogin(
  authMethod: AuthMethod = 'password',
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_user_login', {
      p_platform:    Platform.OS,
      p_device:      Platform.Version != null ? String(Platform.Version) : null,
      p_auth_method: authMethod,
    });
    if (error) {
      console.warn('[recordUserLogin] falhou:', error.message);
    }
  } catch (err) {
    console.warn('[recordUserLogin] exception:', err);
  }
}
