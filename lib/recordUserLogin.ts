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

// Lazy-loads — todos opcionais. Se algum não estiver instalado, só não envia
// a info correspondente (RPC tem default null nos params novos).
let _Application: typeof import('expo-application') | null = null;
let _Device: typeof import('expo-device') | null = null;
let _Localization: typeof import('expo-localization') | null = null;
try { _Application = require('expo-application'); } catch { /* opcional */ }
try { _Device = require('expo-device'); } catch { /* opcional */ }
try { _Localization = require('expo-localization'); } catch { /* opcional */ }

export type AuthMethod =
  | 'password'
  | 'biometric'
  | 'oauth'
  | 'magic_link'
  | 'social';

function getDeviceLocale(): string | null {
  // Prefere expo-localization (locale completo do sistema, ex: 'pt-BR'),
  // fallback pra Intl runtime do JS.
  try {
    const locales = _Localization?.getLocales?.();
    const tag = locales?.[0]?.languageTag;
    if (tag) return tag;
  } catch { /* fallback abaixo */ }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
  } catch {
    return null;
  }
}

function getDeviceModel(): string | null {
  // expo-device retorna modelName legível ("iPhone 15 Pro", "Pixel 8 Pro");
  // se ausente, retorna null pra a coluna ficar vazia (ao invés de ruído).
  return _Device?.modelName ?? null;
}

export async function recordUserLogin(
  authMethod: AuthMethod = 'password',
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_user_login', {
      p_platform:     Platform.OS,
      p_device:       Platform.Version != null ? String(Platform.Version) : null,
      p_auth_method:  authMethod,
      p_app_version:  _Application?.nativeApplicationVersion ?? null,
      p_build_number: _Application?.nativeBuildVersion ?? null,
      p_device_model: getDeviceModel(),
      p_device_locale: getDeviceLocale(),
    });
    if (error) {
      console.warn('[recordUserLogin] falhou:', error.message);
    }
  } catch (err) {
    console.warn('[recordUserLogin] exception:', err);
  }
}
