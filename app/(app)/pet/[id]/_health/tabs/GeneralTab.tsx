import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Sparkles,
  FileText,
  Pill,
  Stethoscope,
  Scissors,
  AlertTriangle,
  AlertCircle,
  Droplet,
  Info,
  Syringe,
} from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import type { Pet, Vaccine, Allergy } from '../../../../../../types/database';
import { HealthScoreCircle } from '../../../../../../components/HealthScoreCircle';
import { styles } from '../styles';
import { StatCard, SeverityBadge } from '../components';

interface Props {
  pet: Pet;
  vaccines: Vaccine[];
  allergies: Allergy[];
  exams: Record<string, unknown>[];
  consultations: Record<string, unknown>[];
  medications: Record<string, unknown>[];
  surgeries: Record<string, unknown>[];
  overdueCount: number;
  healthLabel: string;
  onShowBloodTypeInfo: () => void;
}

export function GeneralTab({
  pet,
  vaccines,
  allergies,
  exams,
  consultations,
  medications,
  surgeries,
  overdueCount,
  healthLabel,
  onShowBloodTypeInfo,
}: Props) {
  const { t } = useTranslation();
  return (
    <>
      {/* AI Health Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCardHeader}>
          <Sparkles size={rs(16)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.scoreCardTitle}>{t('health.aiHealthScore')}</Text>
          <Text style={styles.scoreCardSub}>{t('health.updatedToday')}</Text>
        </View>
        <View style={styles.scoreCardBody}>
          <HealthScoreCircle score={pet.health_score} size={rs(110)} />
          <View style={styles.scoreCardInfo}>
            <Text style={styles.scoreLabel}>{healthLabel}</Text>
            {overdueCount > 0 && (
              <View style={styles.alertBadge}>
                <AlertTriangle size={rs(14)} color={colors.danger} strokeWidth={2} />
                <Text style={styles.alertBadgeText}>
                  {overdueCount} {t('health.overdue').toLowerCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Blood Type */}
      <Text style={styles.sectionLabel}>{t('health.bloodType').toUpperCase()}</Text>
      <View style={styles.bloodTypeCard}>
        <Droplet size={rs(20)} color={colors.danger} strokeWidth={1.8} />
        <Text style={styles.bloodTypeValue}>
          {pet.blood_type ?? t('health.bloodTypeUnknown')}
        </Text>
        <TouchableOpacity onPress={onShowBloodTypeInfo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Info size={rs(18)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Allergies */}
      <Text style={styles.sectionLabel}>{t('health.allergies').toUpperCase()}</Text>
      {allergies.length > 0 ? (
        allergies.map((allergy) => (
          <View key={allergy.id} style={styles.allergyCard}>
            <View style={styles.allergyCardHeader}>
              <AlertCircle
                size={rs(16)}
                color={allergy.severity === 'severe' ? colors.danger : colors.warning}
                strokeWidth={1.8}
              />
              <Text style={styles.allergyName}>{allergy.allergen}</Text>
              <SeverityBadge severity={allergy.severity} t={t} />
            </View>
            {allergy.reaction && (
              <View style={styles.allergyDetail}>
                <Text style={styles.allergyDetailLabel}>{t('health.reaction')}:</Text>
                <Text style={styles.allergyDetailValue}>{allergy.reaction}</Text>
              </View>
            )}
            {allergy.diagnosed_by && (
              <View style={styles.allergyDetail}>
                <Text style={styles.allergyDetailLabel}>{t('health.diagnosedBy')}:</Text>
                <Text style={styles.allergyDetailValue}>{allergy.diagnosed_by}</Text>
              </View>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyInline}>
          <Text style={styles.emptyInlineText}>{t('health.emptyAllergies')}</Text>
        </View>
      )}

      {/* Summary Stats Grid */}
      <Text style={styles.sectionLabel}>{t('health.summaryStats').toUpperCase()}</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon={<Syringe size={rs(18)} color={colors.success} strokeWidth={1.8} />}
          iconColor={colors.success}
          value={vaccines.length}
          label={t('health.totalVaccines')}
        />
        <StatCard
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          iconColor={colors.petrol}
          value={exams.length}
          label={t('health.totalExams')}
        />
        <StatCard
          icon={<Stethoscope size={rs(18)} color={colors.sky} strokeWidth={1.8} />}
          iconColor={colors.sky}
          value={consultations.length}
          label={t('health.totalConsultations')}
        />
        <StatCard
          icon={<Pill size={rs(18)} color={colors.purple} strokeWidth={1.8} />}
          iconColor={colors.purple}
          value={medications.length}
          label={t('health.totalMedications')}
        />
        <StatCard
          icon={<Scissors size={rs(18)} color={colors.rose} strokeWidth={1.8} />}
          iconColor={colors.rose}
          value={surgeries.length}
          label={t('health.totalSurgeries')}
        />
        <StatCard
          icon={<AlertCircle size={rs(18)} color={colors.warning} strokeWidth={1.8} />}
          iconColor={colors.warning}
          value={allergies.length}
          label={t('health.totalAllergies')}
        />
      </View>
    </>
  );
}
