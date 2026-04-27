/**
 * recordUserInstallLocation — captura GPS uma vez e grava em users.install_*.
 *
 * Comportamento:
 *  1. Lê AsyncStorage pra ver se já capturou. Se sim, no-op.
 *  2. Pede permissão (ACCURACY_BALANCED — não precisa de precisão sub-metro).
 *  3. Se negada, marca no AsyncStorage pra não pedir de novo nesta instalação.
 *  4. Captura coords, faz reverse-geocode pra cidade/estado/país, manda RPC.
 *  5. Best-effort: nunca lança. Tudo cai em warning silencioso.
 *
 * Privacidade:
 *  - Permissão é "When in use" (não precisa background).
 *  - Tutor pode negar e usar o app normalmente.
 *  - O RPC só atualiza linhas onde city/state estão null — não sobrescreve
 *    cadastro manual.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEY_DONE   = 'install_location_captured_v1';
const STORAGE_KEY_DENIED = 'install_location_denied_v1';

let _Location: typeof import('expo-location') | null = null;
try { _Location = require('expo-location'); } catch { /* opcional */ }

interface ReverseGeo {
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeo> {
  const empty: ReverseGeo = { city: null, state: null, country: null, countryCode: null };
  try {
    const results = await _Location?.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const r = results?.[0];
    if (!r) return empty;
    return {
      city:        r.city ?? r.subregion ?? null,
      state:       r.region ?? null,
      country:     r.country ?? null,
      countryCode: r.isoCountryCode ?? null,
    };
  } catch (e) {
    console.warn('[recordUserInstallLocation] reverseGeocode failed:', e);
    return empty;
  }
}

export async function recordUserInstallLocation(): Promise<void> {
  if (!_Location) return; // Expo Go ou módulo ausente

  // 1) Idempotência local — não tenta de novo se já capturou ou se tutor negou.
  try {
    const [doneRaw, deniedRaw] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_DONE),
      AsyncStorage.getItem(STORAGE_KEY_DENIED),
    ]);
    if (doneRaw === 'true' || deniedRaw === 'true') return;
  } catch {
    // AsyncStorage falhou — não trava o fluxo, segue.
  }

  try {
    // 2) Permissão. expo-location já mostra o native dialog quando precisa.
    //    O texto do prompt vem de NSLocationWhenInUseUsageDescription (iOS)
    //    e ACCESS_COARSE_LOCATION (Android) configurados em app.json.
    const { status, canAskAgain } = await _Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      // Marca como negado pra não perguntar a cada login. Se o tutor mudar
      // de ideia, settings → permissões reabilita e o flag é limpo na
      // próxima reinstalação ou via clearLocationFlags() abaixo.
      if (!canAskAgain) {
        await AsyncStorage.setItem(STORAGE_KEY_DENIED, 'true').catch(() => {});
      }
      return;
    }

    // 3) Captura — accuracy Balanced (~100m) é suficiente pra cidade.
    const pos = await _Location.getCurrentPositionAsync({
      accuracy: _Location.Accuracy?.Balanced ?? 3,
      mayShowUserSettingsDialog: false,
    });
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    // 4) Reverse geocode (nativo do device — não chama serviço externo).
    const geo = await reverseGeocode(lat, lng);

    // 5) RPC — best-effort.
    const { error } = await supabase.rpc('record_user_install_location', {
      p_lat:          lat,
      p_lng:          lng,
      p_city:         geo.city,
      p_state:        geo.state,
      p_country:      geo.country,
      p_country_code: geo.countryCode,
      p_source:       'gps',
    });
    if (error) {
      console.warn('[recordUserInstallLocation] RPC falhou:', error.message);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY_DONE, 'true').catch(() => {});
    console.log(
      `[recordUserInstallLocation] ✓ ${geo.city ?? '?'} / ${geo.state ?? '?'} / ${geo.country ?? '?'} (${Platform.OS})`,
    );
  } catch (err) {
    console.warn('[recordUserInstallLocation] exception:', err);
  }
}

/** Pra teste/admin: limpa flags locais de "já capturou" e "negou". */
export async function clearLocationFlags(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY_DONE),
    AsyncStorage.removeItem(STORAGE_KEY_DENIED),
  ]).catch(() => {});
}
