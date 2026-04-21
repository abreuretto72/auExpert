/**
 * petGender.ts
 *
 * Helpers for grammatically correct gendered phrases across 5 locales.
 * All lookups use static tables — no if/else chains.
 *
 * Usage with react-i18next context:
 *   import { getI18nContext } from '../utils/petGender';
 *   t('diary.diaryOf', { name: pet.name, context: getI18nContext(pet) })
 *
 * Translation keys must have `_female` and `_male` variants where needed:
 *   "diary.diaryOf":        "Diário do {{name}}"
 *   "diary.diaryOf_female": "Diário da {{name}}"
 */

declare const __DEV__: boolean | undefined;

const DEV = typeof __DEV__ !== 'undefined' && __DEV__;

function devLog(fn: string, input: unknown, output: unknown): void {
  if (DEV) {
    console.log(`[petGender.${fn}]`, input, '→', output);
  }
}

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PetSex = 'male' | 'female' | 'unknown';
export type Preposition = 'de' | 'em' | 'a' | 'por' | 'com' | 'para';
export type Locale = 'pt-BR' | 'pt-PT' | 'es-MX' | 'es-AR' | 'en-US';

export interface PetGenderInfo {
  sex: PetSex | null | undefined;
  name: string;
}

/** Resolved sex — coerces null/undefined to 'unknown' */
type ResolvedSex = 'male' | 'female' | 'unknown';

function resolveSex(sex: PetSex | null | undefined): ResolvedSex {
  return sex === 'male' ? 'male' : sex === 'female' ? 'female' : 'unknown';
}

// ─────────────────────────────────────────────────────────────
// ARTICLES table
// ─────────────────────────────────────────────────────────────

type ArticleRow = Record<ResolvedSex, string>;
type ArticleTable = Record<Locale, ArticleRow>;

const ARTICLES: ArticleTable = {
  'pt-BR': { male: 'o',  female: 'a',  unknown: '' },
  'pt-PT': { male: 'o',  female: 'a',  unknown: '' },
  'es-MX': { male: 'el', female: 'la', unknown: '' },
  'es-AR': { male: 'el', female: 'la', unknown: '' },
  'en-US': { male: '',   female: '',   unknown: '' },
};

// ─────────────────────────────────────────────────────────────
// CONTRACTIONS table
// ─────────────────────────────────────────────────────────────

type ContractionRow = Record<ResolvedSex, string>;
type ContractionTable = Record<Locale, Record<Preposition, ContractionRow>>;

const CONTRACTIONS: ContractionTable = {
  'pt-BR': {
    de:   { male: 'do',     female: 'da',     unknown: 'de'  },
    em:   { male: 'no',     female: 'na',     unknown: 'em'  },
    a:    { male: 'ao',     female: 'à',      unknown: 'a'   },
    por:  { male: 'pelo',   female: 'pela',   unknown: 'por' },
    com:  { male: 'com o',  female: 'com a',  unknown: 'com' },
    para: { male: 'para o', female: 'para a', unknown: 'para' },
  },
  'pt-PT': {
    de:   { male: 'do',     female: 'da',     unknown: 'de'  },
    em:   { male: 'no',     female: 'na',     unknown: 'em'  },
    a:    { male: 'ao',     female: 'à',      unknown: 'a'   },
    por:  { male: 'pelo',   female: 'pela',   unknown: 'por' },
    com:  { male: 'com o',  female: 'com a',  unknown: 'com' },
    para: { male: 'para o', female: 'para a', unknown: 'para' },
  },
  'es-MX': {
    de:   { male: 'del',     female: 'de la',  unknown: 'de'  },
    em:   { male: 'en el',   female: 'en la',  unknown: 'em'  },
    a:    { male: 'al',      female: 'a la',   unknown: 'a'   },
    por:  { male: 'por el',  female: 'por la', unknown: 'por' },
    com:  { male: 'con el',  female: 'con la', unknown: 'con' },
    para: { male: 'para el', female: 'para la', unknown: 'para' },
  },
  'es-AR': {
    de:   { male: 'del',     female: 'de la',  unknown: 'de'  },
    em:   { male: 'en el',   female: 'en la',  unknown: 'em'  },
    a:    { male: 'al',      female: 'a la',   unknown: 'a'   },
    por:  { male: 'por el',  female: 'por la', unknown: 'por' },
    com:  { male: 'con el',  female: 'con la', unknown: 'con' },
    para: { male: 'para el', female: 'para la', unknown: 'para' },
  },
  'en-US': {
    de:   { male: 'de',   female: 'de',   unknown: 'de'   },
    em:   { male: 'em',   female: 'em',   unknown: 'em'   },
    a:    { male: 'a',    female: 'a',    unknown: 'a'    },
    por:  { male: 'por',  female: 'por',  unknown: 'por'  },
    com:  { male: 'com',  female: 'com',  unknown: 'com'  },
    para: { male: 'para', female: 'para', unknown: 'para' },
  },
};

// ─────────────────────────────────────────────────────────────
// PRONOUNS table
// ─────────────────────────────────────────────────────────────

type PronounRow = Record<ResolvedSex, string>;
type PronounTable = Record<Locale, PronounRow>;

const PRONOUNS: PronounTable = {
  'pt-BR': { male: 'ele',  female: 'ela',  unknown: 'ele'  },
  'pt-PT': { male: 'ele',  female: 'ela',  unknown: 'ele'  },
  'es-MX': { male: 'él',   female: 'ella', unknown: 'él'   },
  'es-AR': { male: 'él',   female: 'ella', unknown: 'él'   },
  'en-US': { male: 'he',   female: 'she',  unknown: 'they' },
};

// ─────────────────────────────────────────────────────────────
// POSSESSIVE PRONOUNS table
// ─────────────────────────────────────────────────────────────

type PossessiveTable = Record<Locale, PronounRow>;

const POSSESSIVES: PossessiveTable = {
  'pt-BR': { male: 'dele', female: 'dela', unknown: 'dele'  },
  'pt-PT': { male: 'dele', female: 'dela', unknown: 'dele'  },
  'es-MX': { male: 'su',   female: 'su',   unknown: 'su'    },
  'es-AR': { male: 'su',   female: 'su',   unknown: 'su'    },
  'en-US': { male: 'his',  female: 'her',  unknown: 'their' },
};

// ─────────────────────────────────────────────────────────────
// ADJECTIVE INFLECTION — suffix rules (ordered, first match wins)
// Only applies to pt-* and es-* locales for female sex.
// ─────────────────────────────────────────────────────────────

type SuffixRule = {
  test: (word: string) => boolean;
  transform: (word: string) => string;
};

const SUFFIX_RULES: SuffixRule[] = [
  // 'ês' → 'esa'  (português → portuguesa)
  {
    test: (w) => w.endsWith('ês'),
    transform: (w) => w.slice(0, -2) + 'esa',
  },
  // 'or' → 'ora'  (trabalhador → trabalhadora)
  {
    test: (w) => w.endsWith('or'),
    transform: (w) => w + 'a',
  },
  // 'o' → 'a'     (cansado → cansada, bonito → bonita)
  {
    test: (w) => w.endsWith('o'),
    transform: (w) => w.slice(0, -1) + 'a',
  },
  // invariant (feliz, triste, saudável, -vel, -z, -e, -al, -il)
  {
    test: () => true,
    transform: (w) => w,
  },
];

const PT_ES_LOCALES = new Set<Locale>(['pt-BR', 'pt-PT', 'es-MX', 'es-AR']);

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Returns the definite article for the pet's sex in the given locale.
 * English always returns empty string.
 *
 * @example getArticle({ sex: 'male', name: 'Pico' }, 'pt-BR') → 'o'
 * @example getArticle({ sex: 'female', name: 'Mana' }, 'es-MX') → 'la'
 */
export function getArticle(pet: PetGenderInfo, locale: Locale): string {
  const sex = resolveSex(pet.sex);
  const result = ARTICLES[locale][sex];
  devLog('getArticle', { pet, locale }, result);
  return result;
}

/**
 * Returns the contracted form of a preposition + article for the pet's sex.
 *
 * @example getContraction({ sex: 'male', name: 'Pico' }, 'de', 'pt-BR') → 'do'
 * @example getContraction({ sex: 'female', name: 'Mana' }, 'a', 'pt-BR') → 'à'
 */
export function getContraction(
  pet: PetGenderInfo,
  preposition: Preposition,
  locale: Locale,
): string {
  const sex = resolveSex(pet.sex);
  const result = CONTRACTIONS[locale][preposition][sex];
  devLog('getContraction', { pet, preposition, locale }, result);
  return result;
}

/**
 * Returns the subject pronoun for the pet in the given locale.
 *
 * @example getPronoun({ sex: 'male', name: 'Pico' }, 'pt-BR') → 'ele'
 * @example getPronoun({ sex: 'unknown', name: 'X' }, 'en-US') → 'they'
 */
export function getPronoun(pet: PetGenderInfo, locale: Locale): string {
  const sex = resolveSex(pet.sex);
  const result = PRONOUNS[locale][sex];
  devLog('getPronoun', { pet, locale }, result);
  return result;
}

/**
 * Returns the possessive pronoun for the pet in the given locale.
 * Spanish 'su' is invariant (same for male/female).
 *
 * @example getPossessivePronoun({ sex: 'female', name: 'Mana' }, 'pt-BR') → 'dela'
 * @example getPossessivePronoun({ sex: 'male', name: 'Pico' }, 'en-US') → 'his'
 */
export function getPossessivePronoun(pet: PetGenderInfo, locale: Locale): string {
  const sex = resolveSex(pet.sex);
  const result = POSSESSIVES[locale][sex];
  devLog('getPossessivePronoun', { pet, locale }, result);
  return result;
}

/**
 * Inflects an adjective (given in masculine form) to match the pet's sex and locale.
 * Only inflects for female sex in pt-* and es-* locales.
 * en-US always returns the masculine form unchanged.
 *
 * @example inflectAdjective('cansado', { sex: 'female', name: 'Mana' }, 'pt-BR') → 'cansada'
 * @example inflectAdjective('feliz',   { sex: 'female', name: 'Mana' }, 'pt-BR') → 'feliz'
 * @example inflectAdjective('cansado', { sex: 'female', name: 'Mana' }, 'en-US') → 'cansado'
 */
export function inflectAdjective(
  masculineForm: string,
  pet: PetGenderInfo,
  locale: Locale,
): string {
  const sex = resolveSex(pet.sex);
  let result = masculineForm;

  if (PT_ES_LOCALES.has(locale) && sex === 'female') {
    const rule = SUFFIX_RULES.find((r) => r.test(masculineForm));
    result = rule ? rule.transform(masculineForm) : masculineForm;
  }

  devLog('inflectAdjective', { masculineForm, pet, locale }, result);
  return result;
}

/**
 * Returns the i18next `context` string for the pet's sex.
 * Pass this as `context` in any `t()` call that has `_male` / `_female` variants.
 * Returns 'unknown' when sex is null or undefined (i18next falls back to base key).
 *
 * @example getI18nContext({ sex: 'female', name: 'Mana' }) → 'female'
 * @example getI18nContext({ sex: null, name: 'X' }) → 'unknown'
 */
export function getI18nContext(pet: PetGenderInfo): string {
  const result = resolveSex(pet.sex);
  devLog('getI18nContext', { pet }, result);
  return result;
}

/**
 * Returns the article + name string for natural reference.
 * If sex is unknown/null/undefined, returns just the name without article.
 *
 * @example withArticle({ sex: 'male', name: 'Pico' }, 'pt-BR') → 'o Pico'
 * @example withArticle({ sex: 'female', name: 'Mana' }, 'pt-BR') → 'a Mana'
 * @example withArticle({ sex: 'unknown', name: 'Mana' }, 'pt-BR') → 'Mana'
 */
export function withArticle(pet: PetGenderInfo, locale: Locale): string {
  const article = getArticle(pet, locale);
  const result = article ? `${article} ${pet.name}` : pet.name;
  devLog('withArticle', { pet, locale }, result);
  return result;
}

// ─────────────────────────────────────────────────────────────
// Legacy export (kept for backward compatibility with usages of sexContext)
// ─────────────────────────────────────────────────────────────

/**
 * @deprecated Use getI18nContext(pet) instead.
 * Returns 'female' when sex is female, undefined otherwise.
 */
export function sexContext(sex: PetSex | null | undefined): 'female' | undefined {
  return sex === 'female' ? 'female' : undefined;
}
