/**
 * lib/revenuecat.ts — wrapper único do SDK RevenueCat.
 *
 * Responsabilidades:
 *  - Inicializar UMA VEZ no boot do app (chamado pelo _layout)
 *  - Identificar o tutor logado (Purchases.logIn → vincula dispositivo ao user_id)
 *  - Fazer logout do RC quando o tutor desloga (Purchases.logOut → app id anônimo)
 *  - Expor helper síncrono pra checar entitlements
 *
 * Status: as chaves atuais começam com `test_` — sandbox/test keys da RC.
 * Funcionam em dev/sandbox. Pra produção, registrar os apps em
 * Project Settings → Apps na RC e trocar pra appl_xxx / goog_xxx.
 */

import { Platform } from 'react-native';

// Lazy load: react-native-purchases não funciona em Expo Go nem na Web.
// O try/catch garante que o app não crashe nesses ambientes.
let _Purchases: typeof import('react-native-purchases') | null = null;
try {
  _Purchases = require('react-native-purchases');
} catch {
  /* SDK não disponível neste ambiente — todas as funções viram no-ops */
}

const IOS_KEY     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

let initialized = false;

export function isRevenueCatAvailable(): boolean {
  return _Purchases !== null && (Platform.OS === 'ios' || Platform.OS === 'android');
}

/**
 * Configura o SDK uma vez. Idempotente — chamadas extras viram no-op.
 * Chamar no boot do app, ANTES de qualquer outra função do RC.
 */
export async function initializeRevenueCat(): Promise<void> {
  if (initialized || !isRevenueCatAvailable()) return;

  const Purchases = _Purchases!;
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;

  if (!apiKey) {
    console.warn('[revenuecat] API key vazia — pulando init. Defina EXPO_PUBLIC_REVENUECAT_IOS_KEY e EXPO_PUBLIC_REVENUECAT_ANDROID_KEY no .env.');
    return;
  }

  // VERBOSE em dev (logs detalhados de receipts/cache); WARN em prod (silencioso).
  Purchases.setLogLevel(__DEV__ ? Purchases.LOG_LEVEL.VERBOSE : Purchases.LOG_LEVEL.WARN);

  Purchases.configure({ apiKey });
  initialized = true;
  console.log('[revenuecat] inicializado (', Platform.OS, ', key prefix:', apiKey.slice(0, 5), ')');
}

/**
 * Vincula o usuário do app ao customer da RC. Chamar logo após login bem-sucedido.
 * Sem isso, RC trata cada dispositivo como anônimo e perde histórico ao reinstalar.
 */
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (!isRevenueCatAvailable() || !initialized) return;
  try {
    await _Purchases!.logIn(userId);
    console.log('[revenuecat] identificado user', userId.slice(0, 8));
  } catch (e) {
    console.warn('[revenuecat] logIn falhou:', e);
  }
}

/**
 * Desvincula o usuário (chamado no logout). RC volta a tratar como anônimo.
 */
export async function logoutRevenueCat(): Promise<void> {
  if (!isRevenueCatAvailable() || !initialized) return;
  try {
    await _Purchases!.logOut();
  } catch (e) {
    // logOut lança quando user já é anônimo — ignorar.
    console.warn('[revenuecat] logOut:', e instanceof Error ? e.message : e);
  }
}

/**
 * Retorna se o usuário tem um entitlement ativo. Use no boot ou em revalidações
 * forçadas. Pra reatividade em tela, prefira o hook useEntitlement.
 */
export async function hasEntitlement(entitlementId: string): Promise<boolean> {
  if (!isRevenueCatAvailable() || !initialized) return false;
  try {
    const info = await _Purchases!.getCustomerInfo();
    return Boolean(info.entitlements.active[entitlementId]);
  } catch (e) {
    console.warn('[revenuecat] getCustomerInfo falhou:', e);
    return false;
  }
}

/**
 * Lista as ofertas configuradas no painel da RC (Offerings → default).
 * Use na paywall pra renderizar packages disponíveis.
 */
export async function getOfferings() {
  if (!isRevenueCatAvailable() || !initialized) return null;
  try {
    return await _Purchases!.getOfferings();
  } catch (e) {
    console.warn('[revenuecat] getOfferings falhou:', e);
    return null;
  }
}

/**
 * Restaura compras do user (botão "Restaurar compras" na paywall).
 * Útil quando o tutor reinstalou o app ou trocou de device.
 */
export async function restorePurchases() {
  if (!isRevenueCatAvailable() || !initialized) return null;
  try {
    return await _Purchases!.restorePurchases();
  } catch (e) {
    console.warn('[revenuecat] restorePurchases falhou:', e);
    return null;
  }
}
