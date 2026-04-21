import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pill } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { formatDate } from '../../../../../../utils/format';
import { styles } from '../styles';
import { EmptyState, ExpandableCard, InfoRow } from '../components';

interface Props {
  medications: Record<string, unknown>[];
  onAdd: () => void;
}

export function MedicationsTab({ medications, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.7}>
        <Pill size={rs(18)} color="#fff" strokeWidth={2} />
        <Text style={styles.addButtonText}>{t('health.addMedication')}</Text>
      </TouchableOpacity>
      {medications.length === 0 ? (
        <EmptyState message={t('health.emptyMedications')} hint={t('health.emptyHint')} />
      ) : (
        medications.map((m: Record<string, unknown>, i: number) => {
          const isActive = m.active !== false;
          const statusColor = isActive ? colors.success : colors.textDim;
          return (
            <ExpandableCard
              key={String(m.id ?? i)}
              header={
                <View style={styles.vaccineHeaderRow}>
                  <Pill size={rs(16)} color={statusColor} strokeWidth={1.8} />
                  <View style={styles.vaccineHeaderInfo}>
                    <Text style={styles.vaccineHeaderName}>{String(m.name ?? '')}{m.dosage ? ` ${String(m.dosage)}` : ''}</Text>
                    <Text style={styles.vaccineHeaderDate}>{String(m.frequency ?? '')} · {formatDate(String(m.start_date ?? ''))}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{isActive ? t('health.active') : t('health.inactive')}</Text>
                  </View>
                </View>
              }
            >
              <View style={styles.vaccineDetails}>
                {!!m.type && <InfoRow label={t('health.medType')} value={String(m.type)} isFirst />}
                {!!m.end_date && <InfoRow label={t('health.endDate')} value={formatDate(String(m.end_date))} />}
                {!!m.prescribed_by && <InfoRow label={t('health.vet')} value={String(m.prescribed_by)} />}
                {!!m.reason && <InfoRow label={t('health.reason')} value={String(m.reason)} />}
                {!!m.notes && <InfoRow label={t('health.notes')} value={String(m.notes)} />}
              </View>
            </ExpandableCard>
          );
        })
      )}
    </>
  );
}
