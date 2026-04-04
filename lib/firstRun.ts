/**
 * firstRun.ts — detecta primeira execução após instalação limpa no iOS.
 *
 * O Keychain do iOS persiste após desinstalação, mas o AsyncStorage não.
 * Isso permite detectar reinstalações e limpar sessões residuais do Keychain.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_RUN_KEY = 'auexpert_has_launched';

export async function isFirstRun(): Promise<boolean> {
  const hasLaunched = await AsyncStorage.getItem(FIRST_RUN_KEY);
  return hasLaunched === null;
}

export async function markAsLaunched(): Promise<void> {
  await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
}
