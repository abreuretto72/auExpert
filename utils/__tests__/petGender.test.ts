import {
  getArticle,
  getContraction,
  getPronoun,
  getPossessivePronoun,
  inflectAdjective,
  getI18nContext,
  withArticle,
} from '../petGender';
import type { PetGenderInfo, Preposition, Locale } from '../petGender';

// ─────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────

const MALE: PetGenderInfo   = { sex: 'male',    name: 'Pico' };
const FEMALE: PetGenderInfo = { sex: 'female',  name: 'Mana' };
const UNKNOWN: PetGenderInfo = { sex: 'unknown', name: 'Mana' };
const NULL_SEX: PetGenderInfo = { sex: null,     name: 'Rex'  };
const UNDEF_SEX: PetGenderInfo = { sex: undefined, name: 'Rex' };

// ─────────────────────────────────────────────────────────────
// 1. getContraction — pt-BR — all 6 prepositions × 3 sexes
// ─────────────────────────────────────────────────────────────

describe('getContraction — pt-BR', () => {
  describe.each<[Preposition, string, string, string]>([
    ['de',   'do',     'da',     'de'  ],
    ['em',   'no',     'na',     'em'  ],
    ['a',    'ao',     'à',      'a'   ],
    ['por',  'pelo',   'pela',   'por' ],
    ['com',  'com o',  'com a',  'com' ],
    ['para', 'para o', 'para a', 'para'],
  ])('preposition "%s"', (prep, expectedMale, expectedFemale, expectedUnknown) => {
    it(`male → "${expectedMale}"`, () => {
      expect(getContraction(MALE, prep, 'pt-BR')).toBe(expectedMale);
    });

    it(`female → "${expectedFemale}"`, () => {
      expect(getContraction(FEMALE, prep, 'pt-BR')).toBe(expectedFemale);
    });

    it(`unknown → "${expectedUnknown}"`, () => {
      expect(getContraction(UNKNOWN, prep, 'pt-BR')).toBe(expectedUnknown);
    });
  });

  it('null sex is treated as unknown', () => {
    expect(getContraction(NULL_SEX, 'de', 'pt-BR')).toBe('de');
  });

  it('undefined sex is treated as unknown', () => {
    expect(getContraction(UNDEF_SEX, 'de', 'pt-BR')).toBe('de');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. getContraction — es-MX — spot-check all prepositions
// ─────────────────────────────────────────────────────────────

describe('getContraction — es-MX', () => {
  describe.each<[Preposition, string, string]>([
    ['de',   'del',     'de la'  ],
    ['em',   'en el',   'en la'  ],
    ['a',    'al',      'a la'   ],
    ['por',  'por el',  'por la' ],
    ['com',  'con el',  'con la' ],
    ['para', 'para el', 'para la'],
  ])('preposition "%s"', (prep, expectedMale, expectedFemale) => {
    it(`male → "${expectedMale}"`, () => {
      expect(getContraction(MALE, prep, 'es-MX')).toBe(expectedMale);
    });

    it(`female → "${expectedFemale}"`, () => {
      expect(getContraction(FEMALE, prep, 'es-MX')).toBe(expectedFemale);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 3. getContraction — en-US — returns plain preposition strings
// ─────────────────────────────────────────────────────────────

describe('getContraction — en-US', () => {
  it.each<[Preposition]>([
    ['de'], ['em'], ['a'], ['por'], ['com'], ['para'],
  ])('preposition "%s" returns itself', ([prep]) => {
    expect(getContraction(MALE, prep, 'en-US')).toBe(prep);
    expect(getContraction(FEMALE, prep, 'en-US')).toBe(prep);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. inflectAdjective
// ─────────────────────────────────────────────────────────────

describe('inflectAdjective', () => {
  describe('pt-BR — female inflection', () => {
    it.each<[string, string]>([
      ['cansado',     'cansada'     ],
      ['bonito',      'bonita'      ],
      ['treinado',    'treinada'    ],
      ['português',   'portuguesa'  ],  // ês → esa
      ['trabalhador', 'trabalhadora'],  // or → ora
    ])('%s → %s', (input, expected) => {
      expect(inflectAdjective(input, FEMALE, 'pt-BR')).toBe(expected);
    });
  });

  describe('pt-BR — invariant adjectives (same for female)', () => {
    it.each<[string]>([
      ['feliz'],
      ['triste'],
      ['saudável'],
      ['útil'],
      ['jovial'],
      ['capaz'],
    ])('%s stays unchanged', ([adj]) => {
      expect(inflectAdjective(adj, FEMALE, 'pt-BR')).toBe(adj);
    });
  });

  describe('pt-BR — male → unchanged', () => {
    it.each<[string]>([
      ['cansado'],
      ['bonito'],
      ['feliz'],
    ])('%s stays unchanged for male', ([adj]) => {
      expect(inflectAdjective(adj, MALE, 'pt-BR')).toBe(adj);
    });
  });

  describe('es-MX — female inflection', () => {
    it('cansado → cansada', () => {
      expect(inflectAdjective('cansado', FEMALE, 'es-MX')).toBe('cansada');
    });
    it('trabajador → trabajadora', () => {
      expect(inflectAdjective('trabajador', FEMALE, 'es-MX')).toBe('trabajadora');
    });
  });

  describe('en-US — always returns masculine unchanged', () => {
    it.each<[string]>([
      ['cansado'],
      ['tired'],
      ['happy'],
    ])('%s → %s (no change)', ([adj]) => {
      expect(inflectAdjective(adj, FEMALE, 'en-US')).toBe(adj);
      expect(inflectAdjective(adj, MALE,   'en-US')).toBe(adj);
    });
  });

  it('unknown sex in pt-BR returns masculine form unchanged', () => {
    expect(inflectAdjective('cansado', UNKNOWN, 'pt-BR')).toBe('cansado');
  });
});

// ─────────────────────────────────────────────────────────────
// 5. getPronoun
// ─────────────────────────────────────────────────────────────

describe('getPronoun', () => {
  describe('pt-BR', () => {
    it('male → "ele"',    () => expect(getPronoun(MALE,    'pt-BR')).toBe('ele'));
    it('female → "ela"',  () => expect(getPronoun(FEMALE,  'pt-BR')).toBe('ela'));
    it('unknown → "ele"', () => expect(getPronoun(UNKNOWN, 'pt-BR')).toBe('ele'));
  });

  describe('pt-PT', () => {
    it('male → "ele"',   () => expect(getPronoun(MALE,   'pt-PT')).toBe('ele'));
    it('female → "ela"', () => expect(getPronoun(FEMALE, 'pt-PT')).toBe('ela'));
  });

  describe('es-MX', () => {
    it('male → "él"',    () => expect(getPronoun(MALE,   'es-MX')).toBe('él'));
    it('female → "ella"',() => expect(getPronoun(FEMALE, 'es-MX')).toBe('ella'));
  });

  describe('es-AR', () => {
    it('male → "él"',     () => expect(getPronoun(MALE,   'es-AR')).toBe('él'));
    it('female → "ella"', () => expect(getPronoun(FEMALE, 'es-AR')).toBe('ella'));
  });

  describe('en-US', () => {
    it('male → "he"',     () => expect(getPronoun(MALE,    'en-US')).toBe('he'));
    it('female → "she"',  () => expect(getPronoun(FEMALE,  'en-US')).toBe('she'));
    it('unknown → "they"',() => expect(getPronoun(UNKNOWN, 'en-US')).toBe('they'));
    it('null → "they"',   () => expect(getPronoun(NULL_SEX,'en-US')).toBe('they'));
  });
});

// ─────────────────────────────────────────────────────────────
// 6. getPossessivePronoun
// ─────────────────────────────────────────────────────────────

describe('getPossessivePronoun', () => {
  it('pt-BR male   → "dele"',  () => expect(getPossessivePronoun(MALE,    'pt-BR')).toBe('dele'));
  it('pt-BR female → "dela"',  () => expect(getPossessivePronoun(FEMALE,  'pt-BR')).toBe('dela'));
  it('pt-BR unknown → "dele"', () => expect(getPossessivePronoun(UNKNOWN, 'pt-BR')).toBe('dele'));

  it('es-MX male → "su" (invariant)',   () => expect(getPossessivePronoun(MALE,   'es-MX')).toBe('su'));
  it('es-MX female → "su" (invariant)', () => expect(getPossessivePronoun(FEMALE, 'es-MX')).toBe('su'));

  it('en-US male → "his"',    () => expect(getPossessivePronoun(MALE,    'en-US')).toBe('his'));
  it('en-US female → "her"',  () => expect(getPossessivePronoun(FEMALE,  'en-US')).toBe('her'));
  it('en-US unknown → "their"',() => expect(getPossessivePronoun(UNKNOWN,'en-US')).toBe('their'));
});

// ─────────────────────────────────────────────────────────────
// 7. withArticle
// ─────────────────────────────────────────────────────────────

describe('withArticle', () => {
  it('pt-BR male   → "o Pico"', () => {
    expect(withArticle(MALE,    'pt-BR')).toBe('o Pico');
  });

  it('pt-BR female → "a Mana"', () => {
    expect(withArticle(FEMALE,  'pt-BR')).toBe('a Mana');
  });

  it('pt-BR unknown → "Mana" (no article)', () => {
    expect(withArticle(UNKNOWN, 'pt-BR')).toBe('Mana');
  });

  it('es-MX male   → "el Pico"', () => {
    expect(withArticle(MALE,   'es-MX')).toBe('el Pico');
  });

  it('es-MX female → "la Mana"', () => {
    expect(withArticle(FEMALE, 'es-MX')).toBe('la Mana');
  });

  it('en-US male   → "Pico" (no article in English)', () => {
    expect(withArticle(MALE,   'en-US')).toBe('Pico');
  });

  it('en-US female → "Mana" (no article in English)', () => {
    expect(withArticle(FEMALE, 'en-US')).toBe('Mana');
  });

  it('null sex → just the name', () => {
    expect(withArticle(NULL_SEX, 'pt-BR')).toBe('Rex');
  });
});

// ─────────────────────────────────────────────────────────────
// 8. getArticle
// ─────────────────────────────────────────────────────────────

describe('getArticle', () => {
  describe.each<[Locale, string, string, string]>([
    ['pt-BR', 'o',  'a',  ''  ],
    ['pt-PT', 'o',  'a',  ''  ],
    ['es-MX', 'el', 'la', ''  ],
    ['es-AR', 'el', 'la', ''  ],
    ['en-US', '',   '',   ''  ],
  ])('locale %s', (locale, male, female, unknown) => {
    it(`male → "${male}"`,    () => expect(getArticle(MALE,    locale)).toBe(male));
    it(`female → "${female}"`,() => expect(getArticle(FEMALE,  locale)).toBe(female));
    it(`unknown → "${unknown}"`,() => expect(getArticle(UNKNOWN,locale)).toBe(unknown));
  });

  it('null sex treated as unknown', () => {
    expect(getArticle(NULL_SEX,  'pt-BR')).toBe('');
    expect(getArticle(UNDEF_SEX, 'pt-BR')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────
// 9. getI18nContext
// ─────────────────────────────────────────────────────────────

describe('getI18nContext', () => {
  it('male → "male"',      () => expect(getI18nContext(MALE)).toBe('male'));
  it('female → "female"',  () => expect(getI18nContext(FEMALE)).toBe('female'));
  it('unknown → "unknown"',() => expect(getI18nContext(UNKNOWN)).toBe('unknown'));
  it('null → "unknown"',   () => expect(getI18nContext(NULL_SEX)).toBe('unknown'));
  it('undefined → "unknown"',() => expect(getI18nContext(UNDEF_SEX)).toBe('unknown'));
});
