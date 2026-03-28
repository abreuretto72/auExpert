import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ptBR from './pt-BR.json';
import enUS from './en-US.json';
import { normalizeLanguage, getTranslation } from '../lib/translationCache';

/**
 * Detecta o idioma do dispositivo e normaliza.
 * "pt-BR" → "pt-BR" (fonte de verdade)
 * "en-US" → "en" (fallback estático)
 * "es-MX" → "es" (tradução dinâmica via IA)
 */
function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    const tag = locales[0]?.languageTag ?? 'en-US';
    return normalizeLanguage(tag);
  } catch {
    return 'en';
  }
}

const deviceLang = getDeviceLanguage();

// Inicializar com pt-BR (fonte de verdade) + en-US (fallback offline)
// Se o dispositivo está em outro idioma, começa em en-US e carrega tradução em background
i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    'en': { translation: enUS },
  },
  lng: deviceLang === 'pt-BR' ? 'pt-BR' : (deviceLang === 'en' ? 'en' : 'en'),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Se o idioma não é pt-BR nem en, carregar tradução dinâmica em background
if (deviceLang !== 'pt-BR' && deviceLang !== 'en') {
  loadDynamicTranslation(deviceLang);
}

async function loadDynamicTranslation(lang: string) {
  const translations = await getTranslation(lang);
  if (translations) {
    // Registrar o novo idioma no i18next e trocar
    i18n.addResourceBundle(lang, 'translation', translations, true, true);
    i18n.changeLanguage(lang);
    console.log(`[i18n] Idioma "${lang}" carregado com sucesso`);
  } else {
    // Falhou — mantém en-US como fallback (já ativo)
    console.log(`[i18n] Tradução para "${lang}" indisponível, usando inglês`);
  }
}

export default i18n;
