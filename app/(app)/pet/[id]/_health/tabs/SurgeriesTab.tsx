import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Scissors } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { formatDate } from '../../../../../../utils/format';
import { styles } from '../styles';
import { EmptyState, ExpandableCard, InfoRow } from '../components';

interface Props {
  surgeries: Record<string, unknown>[];
  onAdd: () => void;
}

export function SurgeriesTab({ surgeries, onAdd }: Props) {
  const { t } = useTranslation();
  const STATUS_COLORS: Record<string, string> = {
    recovered: colors.success, recovering: colors.warning,
    scheduled: colors.petrol, complications: colors.danger,
  };
  return (
    <>
      <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.7}>
        <Scissors size={rs(18)} color="#fff" strokeWidth={2} />
        <Text style={styles.addButtonText}>{t('health.addSurgery')}</Text>
      </TouchableOpacity>
      {surgeries.length === 0 ? (
        <EmptyState message={t('health.emptySurgeries')} hint={t('health.emptyHint')} />
      ) : (
        surgeries.map((s: Record<string, unknown>, i: number) => {
          const statusColor = STATUS_COLORS[String(s.status ?? 'recovered')] ?? colors.textDim;
          return (
            <ExpandableCard
              key={String(s.id ?? i)}
              header={
                <View style={styles.vaccineHeaderRow}>
                  <Scissors size={rs(16)} color={statusColor} strokeWidth={1.8} />
                  <View style={styles.vaccineHeaderInfo}>
                    <Text style={styles.vaccineHeaderName}>{String(s.name ?? '')}</Text>
                    <Text style={styles.vaccineHeaderDate}>{formatDate(String(s.date ?? ''))}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{String(s.status ?? '')}</Text>
                  </View>
                </View>
              }
            >
              <View style={styles.vaccineDetails}>
                {!!s.veterinarian && <InfoRow label={t('health.vet')} value={String(s.veterinarian)} isFirst />}
                {!!s.clinic && <InfoRow label={t('health.clinic')} value={String(s.clinic)} isFirst={!s.veterinarian} />}
                {!!s.anesthesia && <InfoRow label={t('health.anesthesia')} value={String(s.anesthesia)} />}
                {!!s.notes && <InfoRow label={t('health.notes')} value={String(s.notes)} />}
              </View>
            </ExpandableCard>
          );
        })
      )}
    </>
  );
}
