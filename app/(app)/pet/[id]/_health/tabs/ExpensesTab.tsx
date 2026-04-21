import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Receipt } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import ExpensesLens from '../../../../../../components/lenses/ExpensesLens';
import { styles } from '../styles';

interface Props {
  petId: string;
  onAdd: () => void;
}

export function ExpensesTab({ petId, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAdd}
        activeOpacity={0.7}
      >
        <Receipt size={rs(18)} color="#fff" strokeWidth={2} />
        <Text style={styles.addButtonText}>{t('health.addExpense')}</Text>
      </TouchableOpacity>
      <ExpensesLens petId={petId} />
    </>
  );
}
