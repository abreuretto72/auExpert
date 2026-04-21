import { useTranslation } from 'react-i18next';
import {
  getArticle,
  getContraction,
  getPronoun,
  getPossessivePronoun,
  inflectAdjective,
  withArticle,
  getI18nContext,
  type PetGenderInfo,
  type Preposition,
  type Locale,
} from '../utils/petGender';

export function usePetGender(pet: PetGenderInfo | null | undefined) {
  const { i18n } = useTranslation();
  const locale = i18n.language as Locale;

  if (!pet) return null;

  return {
    article: getArticle(pet, locale),
    withArticle: withArticle(pet, locale),
    pronoun: getPronoun(pet, locale),
    possessive: getPossessivePronoun(pet, locale),
    contraction: (prep: Preposition) => getContraction(pet, prep, locale),
    inflect: (adj: string) => inflectAdjective(adj, pet, locale),
    i18nContext: getI18nContext(pet),
    locale,
  };
}
