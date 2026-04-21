import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import MetricsCharts from '../../../../../../components/lenses/MetricsCharts';
import { styles } from '../styles';

interface Props {
  petId: string;
  onAdd: () => void;
}

export function MetricsTab({ petId, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAdd}
        activeOpacity={0.7}
      >
        <TrendingUp size={rs(18)} color="#fff" strokeWidth={2} />
        <Text style={styles.addButtonText}>{t('health.addMetric')}</Text>
      </TouchableOpacity>
      <MetricsCharts petId={petId} />
    </>
  );
}
