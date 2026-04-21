import React from 'react';
import { Text, type TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getI18nContext, type PetGenderInfo } from '../../utils/petGender';

interface PetTextProps extends TextProps {
  pet: PetGenderInfo;
  tKey: string;
  values?: Record<string, unknown>;
}

export function PetText({ pet, tKey, values, ...rest }: PetTextProps) {
  const { t } = useTranslation();
  return (
    <Text {...rest}>
      {t(tKey, { context: getI18nContext(pet), petName: pet.name, name: pet.name, ...values })}
    </Text>
  );
}
