import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Syringe, AlertCircle, Check } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { formatDate } from '../../../../../../utils/format';
import type { Vaccine } from '../../../../../../types/database';
import { styles } from '../styles';
import { EmptyState, ExpandableCard, InfoRow, ProgressBar } from '../components';

interface Props {
  vaccines: Vaccine[];
  overdueCount: number;
  upToDateCount: number;
  onAdd: () => void;
}

export function VaccinesTab({ vaccines, overdueCount, upToDateCount, onAdd }: Props) {
  const { t } = useTranslation();
  return (
    <>
      {/* Botão adicionar vacina */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={onAdd}
        activeOpacity={0.7}
      >
        <Syringe size={rs(18)} color="#fff" strokeWidth={2} />
        <Text style={styles.addButtonText}>{t('health.addVaccine')}</Text>
      </TouchableOpacity>

      {vaccines.length === 0 ? (
        <EmptyState message={t('health.emptyVaccines')} hint={t('health.emptyHint')} />
      ) : (
      <>
      {/* Progress */}
      <View style={styles.vaccineProgressCard}>
        <View style={styles.vaccineProgressHeader}>
          <Syringe
            size={rs(16)}
            color={overdueCount > 0 ? colors.danger : colors.success}
            strokeWidth={1.8}
          />
          <Text style={styles.vaccineProgressText}>
            {t('health.vaccineProgress', { current: upToDateCount, total: vaccines.length })}
          </Text>
        </View>
        <ProgressBar current={upToDateCount} total={vaccines.length} />
      </View>

      {/* Vaccine Cards */}
      {vaccines.map((vaccine) => {
        const isOverdue =
          vaccine.next_due_date != null && new Date(vaccine.next_due_date) < new Date();
        const statusColor = isOverdue ? colors.danger : colors.success;
        const statusLabel = isOverdue ? t('health.vaccineOverdue') : t('health.upToDate');

        return (
          <ExpandableCard
            key={vaccine.id}
            header={
              <View style={styles.vaccineHeaderRow}>
                <Syringe size={rs(16)} color={statusColor} strokeWidth={1.8} />
                <View style={styles.vaccineHeaderInfo}>
                  <Text style={styles.vaccineHeaderName}>{vaccine.name}</Text>
                  <Text style={styles.vaccineHeaderDate}>
                    {formatDate(vaccine.date_administered)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                  {isOverdue ? (
                    <AlertCircle size={rs(12)} color={statusColor} strokeWidth={2} />
                  ) : (
                    <Check size={rs(12)} color={statusColor} strokeWidth={2} />
                  )}
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
            }
          >
            <View style={styles.vaccineDetails}>
              {vaccine.batch_number && (
                <InfoRow label={t('health.batch')} value={vaccine.batch_number} isFirst />
              )}
              {vaccine.veterinarian && (
                <InfoRow
                  label={t('health.vet')}
                  value={vaccine.veterinarian}
                  isFirst={!vaccine.batch_number}
                />
              )}
              {vaccine.clinic && (
                <InfoRow
                  label={t('health.clinic')}
                  value={vaccine.clinic}
                  isFirst={!vaccine.batch_number && !vaccine.veterinarian}
                />
              )}
              <InfoRow
                label={t('health.dateAdministered')}
                value={formatDate(vaccine.date_administered)}
                isFirst={!vaccine.batch_number && !vaccine.veterinarian && !vaccine.clinic}
              />
              {vaccine.next_due_date && (
                <InfoRow label={t('health.nextDue')} value={formatDate(vaccine.next_due_date)} />
              )}
              {vaccine.notes && <InfoRow label={t('health.notes')} value={vaccine.notes} />}
            </View>
          </ExpandableCard>
        );
      })}
    </>
      )}
    </>
  );
}
