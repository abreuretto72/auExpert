/**
 * Helper pra registrar login do usuário em audit_log.
 * Arquivo destino: src/lib/recordUserLogin.ts
 *
 * USO no fluxo de autenticação do app:
 *
 *   import { recordUserLogin } from '@/lib/recordUserLogin';
 *   import { Platform } from 'react-native';
 *
 *   // Após signInWithPassword ou signInWithOAuth bem-sucedido:
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
 *   if (!error && data.session) {
 *     await recordUserLogin('password');   // 'password' | 'biometric' | 'oauth' | 'magic_link'
 *   }
 */

import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';   // ajuste o path conforme seu projeto

export async function recordUserLogin(
  authMethod: 'password' | 'biometric' | 'oauth' | 'magic_link' | 'social' = 'password',
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_user_login', {
      p_platform:    Platform.OS,           // 'ios' | 'android' | 'web'
      p_device:      Platform.Version ? String(Platform.Version) : null,
      p_auth_method: authMethod,
    });
    if (error) {
      console.warn('[recordUserLogin] falhou:', error.message);
      // Não lança — login tracking é best-effort, não deve bloquear o fluxo
    }
  } catch (err) {
    console.warn('[recordUserLogin] exception:', err);
  }
}
