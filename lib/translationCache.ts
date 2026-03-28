import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import ptBR from '../i18n/pt-BR.json';

const CACHE_PREFIX = 'petaulife_i18n_';
const CACHE_VERSION_KEY = 'petaulife_i18n_version';
// Incrementar ao alterar pt-BR.json para forçar retradução
const CURRENT_VERSION = '1';

// Mapa de códigos de idioma para nomes legíveis (ajuda a IA traduzir melhor)
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese (Simplified)',
  'zh-Hant': 'Chinese (Traditional)',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  tr: 'Turkish',
  nl: 'Dutch',
  pl: 'Polish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
  th: 'Thai',
  vi: 'Vietnamese',
  id: 'Indonesian',
  ms: 'Malay',
  uk: 'Ukrainian',
  cs: 'Czech',
  ro: 'Romanian',
  hu: 'Hungarian',
  el: 'Greek',
  he: 'Hebrew',
  ca: 'Catalan',
};

function getLanguageName(langCode: string): string {
  // Tentar código exato, depois base (ex: "es-MX" → "es")
  return LANGUAGE_NAMES[langCode] ?? LANGUAGE_NAMES[langCode.split('-')[0]] ?? langCode;
}

/**
 * Normaliza o languageTag do dispositivo para um código base.
 * "pt-BR" → "pt-BR", "en-US" → "en", "es-MX" → "es", "fr-FR" → "fr"
 * Português fica com o tag completo pois é a língua base.
 */
export function normalizeLanguage(tag: string): string {
  if (tag.startsWith('pt')) return 'pt-BR';
  // Para outros, usar apenas o código base (en, es, fr, etc.)
  return tag.split('-')[0];
}

/**
 * Busca tradução do cache local (AsyncStorage).
 * Retorna null se não encontrar ou se a versão mudou.
 */
export async function getCachedTranslation(lang: string): Promise<Record<string, unknown> | null> {
  try {
    const version = await AsyncStorage.getItem(CACHE_VERSION_KEY);
    if (version !== CURRENT_VERSION) return null;

    const cached = await AsyncStorage.getItem(CACHE_PREFIX + lang);
    if (!cached) return null;

    return JSON.parse(cached);
  } catch {
    return null;
  }
}

/**
 * Salva tradução no cache local.
 */
export async function setCachedTranslation(lang: string, translations: Record<string, unknown>): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(translations));
    await AsyncStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
  } catch {
    // Falha silenciosa — cache é best-effort
  }
}

/**
 * Chama a Edge Function para traduzir pt-BR.json para o idioma alvo.
 * Retorna as strings traduzidas ou null em caso de erro.
 */
export async function fetchTranslation(targetLang: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase.functions.invoke('translate-strings', {
      body: {
        strings: ptBR,
        targetLanguage: targetLang,
        targetLanguageName: getLanguageName(targetLang),
      },
    });

    if (error) {
      console.warn('[i18n] Translation fetch failed:', error.message);
      return null;
    }

    return data?.translations ?? null;
  } catch (err) {
    console.warn('[i18n] Translation fetch error:', err);
    return null;
  }
}

/**
 * Obtém tradução para um idioma: cache → Edge Function → fallback.
 * Retorna as strings traduzidas ou null (usar fallback en-US).
 */
export async function getTranslation(lang: string): Promise<Record<string, unknown> | null> {
  // 1. Tentar cache local
  const cached = await getCachedTranslation(lang);
  if (cached) {
    console.log(`[i18n] Usando cache para "${lang}"`);
    return cached;
  }

  // 2. Buscar via Edge Function
  console.log(`[i18n] Traduzindo para "${lang}" via IA...`);
  const translated = await fetchTranslation(lang);

  if (translated) {
    // 3. Salvar no cache para próximas vezes
    await setCachedTranslation(lang, translated);
    console.log(`[i18n] Tradução para "${lang}" salva no cache`);
    return translated;
  }

  // 4. Falhou — retorna null (caller usa fallback)
  return null;
}
