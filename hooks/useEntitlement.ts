/**
 * useEntitlement — hook reativo de entitlement RevenueCat.
 *
 * Uso:
 *   const { isActive, isLoading, willExpireAt } = useEntitlement('elite');
 *   if (!isActive) return <Paywall />;
 *
 * Comportamento:
 *  - 1ª render: dispara getCustomerInfo() async, retorna isLoading=true
 *  - Em mudanças (compra, cancelamento, expiração): SDK dispara
 *    addCustomerInfoUpdateListener e o hook re-renderiza
 *  - Sem SDK disponível (Expo Go, Web): isActive=false, isLoading=false
 *
 * Pra revalidação manual (ex: depois de "Restaurar compras"), chame
 * Purchases.invalidateCustomerInfoCache() no caller — o listener atualiza.
 */

import { useEffect, useState } from 'react';
import { isRevenueCatAvailable } from '../lib/revenuecat';

let _Purchases: typeof import('react-native-purchases') | null = null;
try {
  _Purchases = require('react-native-purchases');
} catch { /* sem SDK */ }

interface EntitlementState {
  isActive: boolean;
  isLoading: boolean;
  willExpireAt: string | null;
  productIdentifier: string | null;
  willRenew: boolean;
}

const INITIAL: EntitlementState = {
  isActive: false,
  isLoading: true,
  willExpireAt: null,
  productIdentifier: null,
  willRenew: false,
};

export function useEntitlement(entitlementId: string): EntitlementState {
  const [state, setState] = useState<EntitlementState>(INITIAL);

  useEffect(() => {
    if (!isRevenueCatAvailable() || !_Purchases) {
      setState({ ...INITIAL, isLoading: false });
      return;
    }
    const Purchases = _Purchases;
    let mounted = true;

    function applyInfo(info: import('react-native-purchases').CustomerInfo) {
      if (!mounted) return;
      const ent = info.entitlements.active[entitlementId];
      setState({
        isActive: Boolean(ent),
        isLoading: false,
        willExpireAt:       ent?.expirationDate ?? null,
        productIdentifier:  ent?.productIdentifier ?? null,
        willRenew:          ent?.willRenew ?? false,
      });
    }

    // Fetch inicial
    Purchases.getCustomerInfo()
      .then(applyInfo)
      .catch((e) => {
        console.warn('[useEntitlement] getCustomerInfo falhou:', e);
        if (mounted) setState((prev) => ({ ...prev, isLoading: false }));
      });

    // Listener: SDK dispara em compra, expiração, restauração, mudança de user
    const sub = Purchases.addCustomerInfoUpdateListener(applyInfo);

    return () => {
      mounted = false;
      // RNPurchases retorna um objeto com .remove() OU registra cleanup via removeCustomerInfoUpdateListener
      try {
        if (typeof (sub as unknown as { remove?: () => void })?.remove === 'function') {
          (sub as unknown as { remove: () => void }).remove();
        } else {
          (Purchases as unknown as { removeCustomerInfoUpdateListener: (l: unknown) => void })
            .removeCustomerInfoUpdateListener?.(applyInfo);
        }
      } catch { /* ignora cleanup falho */ }
    };
  }, [entitlementId]);

  return state;
}
