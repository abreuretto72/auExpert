import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { formatDate } from '../../../../../../utils/format';
import { styles } from '../styles';
import { EmptyState, ExpandableCard, InfoRow } from '../components';

interface Props {
  exams: Record<string, unknown>[];
  onAdd: () => void;
}

export function ExamsTab({ exams, onAdd }: Props) {
  const { t } = useTranslation();
  const STATUS_COLORS: Record<string, string> = {
    normal: colors.success, attention: colors.warning, abnormal: colors.danger,
    critical: colors.danger, pending: colors.textDim,
  };
  return (
    <>
      <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.7}>
        <FileText size={rs(18)} color="#fff" strokeWidth={2} />
        <Text style={styles.addButtonText}>{t('health.addExam')}</Text>
      </TouchableOpacity>
      {exams.length === 0 ? (
        <EmptyState message={t('health.emptyExams')} hint={t('health.emptyHint')} />
      ) : (
        exams.map((ex: Record<string, unknown>, i: number) => {
          const statusColor = STATUS_COLORS[String(ex.status ?? 'normal')] ?? colors.textDim;
          return (
            <ExpandableCard
              key={String(ex.id ?? i)}
              header={
                <View style={styles.vaccineHeaderRow}>
                  <FileText size={rs(16)} color={statusColor} strokeWidth={1.8} />
                  <View style={styles.vaccineHeaderInfo}>
                    <Text style={styles.vaccineHeaderName}>{String(ex.name ?? '')}</Text>
                    <Text style={styles.vaccineHeaderDate}>{formatDate(String(ex.date ?? ''))}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor }]}>{String(ex.status ?? 'normal')}</Text>
                  </View>
                </View>
              }
            >
              <View style={styles.vaccineDetails}>
                {!!ex.laboratory && <InfoRow label={t('health.laboratory')} value={String(ex.laboratory)} isFirst />}
                {!!ex.veterinarian && <InfoRow label={t('health.vet')} value={String(ex.veterinarian)} isFirst={!ex.laboratory} />}
                {!!ex.notes && <InfoRow label={t('health.notes')} value={String(ex.notes)} />}
              </View>
            </ExpandableCard>
          );
        })
      )}
    </>
  );
}
