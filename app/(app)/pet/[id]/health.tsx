import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Syringe,
  AlertCircle,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FileText,
  Pill,
  Stethoscope,
  Scissors,
  AlertTriangle,
  Droplet,
  Info,
  X,
  TrendingUp,
} from 'lucide-react-native';
import MetricsCharts from '../../../../components/lenses/MetricsCharts';
import ExpensesLens from '../../../../components/lenses/ExpensesLens';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { useVaccines, useAllergies, useExams, useMedications, useConsultations, useSurgeries } from '../../../../hooks/useHealth';
import { HealthScoreCircle } from '../../../../components/HealthScoreCircle';
import { Skeleton } from '../../../../components/Skeleton';
import AddVaccineModal, { type VaccineData } from '../../../../components/AddVaccineModal';
import AddExamModal, { type ExamData } from '../../../../components/AddExamModal';
import AddMedicationModal, { type MedicationData } from '../../../../components/AddMedicationModal';
import AddConsultationModal, { type ConsultationData } from '../../../../components/AddConsultationModal';
import AddSurgeryModal, { type SurgeryData } from '../../../../components/AddSurgeryModal';
import { useToast } from '../../../../components/Toast';
import { useAuthStore } from '../../../../stores/authStore';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatAge, formatWeight, formatDate } from '../../../../utils/format';

type TabId = 'general' | 'vaccines' | 'exams' | 'medications' | 'consultations' | 'surgeries' | 'metrics' | 'expenses';

interface TabDef {
  id: TabId;
  labelKey: string;
}

const TABS: TabDef[] = [
  { id: 'general', labelKey: 'health.tabGeneral' },
  { id: 'consultations', labelKey: 'health.tabConsultations' },
  { id: 'vaccines', labelKey: 'health.tabVaccines' },
  { id: 'exams', labelKey: 'health.tabExams' },
  { id: 'medications', labelKey: 'health.tabMedications' },
  { id: 'surgeries', labelKey: 'health.tabSurgeries' },
  { id: 'metrics', labelKey: 'health.tabMetrics' },
  { id: 'expenses', labelKey: 'health.tabExpenses' },
];

// ──────────────────────────────────────────
// Empty State Component
// ──────────────────────────────────────────
function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <View style={styles.emptyState}>
      <FileText size={rs(40)} color={colors.textGhost} strokeWidth={1.4} />
      <Text style={styles.emptyMessage}>{message}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

// ──────────────────────────────────────────
// Expandable Card Component
// ──────────────────────────────────────────
function ExpandableCard({
  header,
  children,
  defaultExpanded = false,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.expandableCard}>
      <TouchableOpacity
        style={styles.expandableHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.expandableHeaderContent}>{header}</View>
        {expanded ? (
          <ChevronUp size={rs(18)} color={colors.accent} strokeWidth={1.8} />
        ) : (
          <ChevronDown size={rs(18)} color={colors.accent} strokeWidth={1.8} />
        )}
      </TouchableOpacity>
      {expanded && <View style={styles.expandableBody}>{children}</View>}
    </View>
  );
}

// ──────────────────────────────────────────
// Info Row Component
// ──────────────────────────────────────────
function InfoRow({ label, value, isFirst = false }: { label: string; value: string; isFirst?: boolean }) {
  return (
    <View style={[styles.infoRow, !isFirst && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ──────────────────────────────────────────
// Stat Card Component
// ──────────────────────────────────────────
function StatCard({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: iconColor + '12' }]}>{icon}</View>
      <Text style={[styles.statCardValue, { color: iconColor }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}

// ──────────────────────────────────────────
// Progress Bar Component
// ──────────────────────────────────────────
function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  const barColor = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressFill, { width: `${pct}%` as unknown as number, backgroundColor: barColor }]}
      />
    </View>
  );
}

// ──────────────────────────────────────────
// Severity Badge Component
// ──────────────────────────────────────────
function SeverityBadge({ severity, t }: { severity: string; t: (key: string) => string }) {
  const config: Record<string, { color: string; bg: string; key: string }> = {
    mild: { color: colors.warning, bg: colors.warningSoft, key: 'health.severityMild' },
    moderate: { color: colors.accent, bg: colors.accentGlow, key: 'health.severityModerate' },
    severe: { color: colors.danger, bg: colors.dangerSoft, key: 'health.severitySevere' },
  };
  const c = config[severity] ?? config.mild;

  return (
    <View style={[styles.severityBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.severityText, { color: c.color }]}>{t(c.key)}</Text>
    </View>
  );
}

// ══════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════
export default function HealthScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { t } = useTranslation();
  const validTabs: TabId[] = ['general', 'vaccines', 'exams', 'medications', 'consultations', 'surgeries', 'metrics', 'expenses'];
  const initialTab: TabId = (tab && validTabs.includes(tab as TabId)) ? (tab as TabId) : 'general';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, isLoading: petLoading, refetch: refetchPet } = usePet(id!);
  const { vaccines, overdueCount, isLoading: vaccinesLoading, refetch: refetchVaccines, addVaccine, isAdding: isAddingVaccine } = useVaccines(id!);
  const { allergies, isLoading: allergiesLoading, refetch: refetchAllergies } = useAllergies(id!);
  const { exams, refetch: refetchExams, addExam, isAdding: isAddingExam } = useExams(id!);
  const { medications, refetch: refetchMeds, addMedication, isAdding: isAddingMed } = useMedications(id!);
  const { consultations, refetch: refetchCons, addConsultation, isAdding: isAddingCons } = useConsultations(id!);
  const { surgeries, refetch: refetchSurg, addSurgery, isAdding: isAddingSurg } = useSurgeries(id!);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showAddCons, setShowAddCons] = useState(false);
  const [showAddSurg, setShowAddSurg] = useState(false);
  const [showBloodTypeInfo, setShowBloodTypeInfo] = useState(false);

  const isLoading = petLoading || vaccinesLoading || allergiesLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPet(), refetchVaccines(), refetchAllergies(), refetchExams(), refetchMeds(), refetchCons(), refetchSurg()]);
    setRefreshing(false);
  }, [refetchPet, refetchVaccines, refetchAllergies, refetchExams, refetchMeds, refetchCons, refetchSurg]);

  const upToDateCount = useMemo(() => {
    return vaccines.filter((v) => {
      if (!v.next_due_date) return true;
      return new Date(v.next_due_date) >= new Date();
    }).length;
  }, [vaccines]);

  const isDog = pet?.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;

  const healthLabel = useMemo(() => {
    const s = pet?.health_score;
    if (s == null) return t('health.noData');
    if (s >= 80) return t('health.excellent');
    if (s >= 60) return t('health.good');
    if (s >= 40) return t('health.attention');
    return t('health.critical');
  }, [pet?.health_score, t]);

  // ──────────────────────────────────────
  // TAB: GENERAL
  // ──────────────────────────────────────
  const renderGeneral = useCallback(() => {
    if (!pet) return null;

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
          <TouchableOpacity onPress={() => setShowBloodTypeInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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
            value={0}
            label={t('health.totalExams')}
          />
          <StatCard
            icon={<Stethoscope size={rs(18)} color={colors.sky} strokeWidth={1.8} />}
            iconColor={colors.sky}
            value={0}
            label={t('health.totalConsultations')}
          />
          <StatCard
            icon={<Pill size={rs(18)} color={colors.purple} strokeWidth={1.8} />}
            iconColor={colors.purple}
            value={0}
            label={t('health.totalMedications')}
          />
          <StatCard
            icon={<Scissors size={rs(18)} color={colors.rose} strokeWidth={1.8} />}
            iconColor={colors.rose}
            value={0}
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
  }, [pet, vaccines, allergies, overdueCount, isDog, healthLabel, t]);

  // ──────────────────────────────────────
  // TAB: VACCINES
  // ──────────────────────────────────────
  const handleAddVaccine = useCallback(async (vaccine: VaccineData) => {
    try {
      await addVaccine({
        pet_id: id!,
        user_id: user?.id ?? '',
        name: vaccine.name,
        lot_number: vaccine.batch_number ?? null,
        date_administered: vaccine.date_administered,
        next_due_date: vaccine.next_due_date ?? null,
        veterinarian: vaccine.veterinarian ?? null,
        clinic: vaccine.clinic ?? null,
        notes: vaccine.notes ?? null,
      });
      setShowAddVaccine(false);
      toast(t('toast.petCreated', { name: vaccine.name }), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [addVaccine, id, user?.id, toast, t]);

  const handleAddExam = useCallback(async (data: ExamData) => {
    try {
      await addExam({ ...data, pet_id: id, user_id: user?.id });
      setShowAddExam(false);
      toast(t('toast.petCreated', { name: data.name }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addExam, id, user?.id, toast, t]);

  const handleAddMedication = useCallback(async (data: MedicationData) => {
    try {
      await addMedication({ ...data, pet_id: id, user_id: user?.id });
      setShowAddMed(false);
      toast(t('toast.petCreated', { name: data.name }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addMedication, id, user?.id, toast, t]);

  const handleAddConsultation = useCallback(async (data: ConsultationData) => {
    try {
      await addConsultation({ ...data, pet_id: id, user_id: user?.id });
      setShowAddCons(false);
      toast(t('toast.petCreated', { name: data.veterinarian }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addConsultation, id, user?.id, toast, t]);

  const handleAddSurgery = useCallback(async (data: SurgeryData) => {
    try {
      await addSurgery({ ...data, pet_id: id, user_id: user?.id });
      setShowAddSurg(false);
      toast(t('toast.petCreated', { name: data.name }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addSurgery, id, user?.id, toast, t]);

  const renderVaccines = useCallback(() => {
    return (
      <>
        {/* Botão adicionar vacina */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddVaccine(true)}
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
                {vaccine.lot_number && (
                  <InfoRow label={t('health.batch')} value={vaccine.lot_number} isFirst />
                )}
                {vaccine.veterinarian && (
                  <InfoRow
                    label={t('health.vet')}
                    value={vaccine.veterinarian}
                    isFirst={!vaccine.lot_number}
                  />
                )}
                {vaccine.clinic && (
                  <InfoRow
                    label={t('health.clinic')}
                    value={vaccine.clinic}
                    isFirst={!vaccine.lot_number && !vaccine.veterinarian}
                  />
                )}
                <InfoRow
                  label={t('health.dateAdministered')}
                  value={formatDate(vaccine.date_administered)}
                  isFirst={!vaccine.lot_number && !vaccine.veterinarian && !vaccine.clinic}
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
  }, [vaccines, overdueCount, upToDateCount, t]);

  // ──────────────────────────────────────
  // TAB: EXAMS (empty state)
  // ──────────────────────────────────────
  const renderExams = useCallback(() => {
    const STATUS_COLORS: Record<string, string> = {
      normal: colors.success, attention: colors.warning, abnormal: colors.danger,
      critical: colors.danger, pending: colors.textDim,
    };
    return (
      <>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddExam(true)} activeOpacity={0.7}>
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
  }, [exams, t]);

  const renderMedications = useCallback(() => {
    return (
      <>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddMed(true)} activeOpacity={0.7}>
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
  }, [medications, t]);

  const renderConsultations = useCallback(() => {
    const TYPE_COLORS: Record<string, string> = {
      routine: colors.petrol, emergency: colors.danger, specialist: colors.purple,
      surgery: colors.warning, follow_up: colors.sky,
    };
    return (
      <>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddCons(true)} activeOpacity={0.7}>
          <Stethoscope size={rs(18)} color="#fff" strokeWidth={2} />
          <Text style={styles.addButtonText}>{t('health.addConsultation')}</Text>
        </TouchableOpacity>
        {consultations.length === 0 ? (
          <EmptyState message={t('health.emptyConsultations')} hint={t('health.emptyHint')} />
        ) : (
          consultations.map((c: Record<string, unknown>, i: number) => {
            const typeColor = TYPE_COLORS[String(c.type ?? 'routine')] ?? colors.petrol;
            return (
              <ExpandableCard
                key={String(c.id ?? i)}
                header={
                  <View style={styles.vaccineHeaderRow}>
                    <Stethoscope size={rs(16)} color={typeColor} strokeWidth={1.8} />
                    <View style={styles.vaccineHeaderInfo}>
                      <Text style={styles.vaccineHeaderName}>{String(c.veterinarian ?? '')}</Text>
                      <Text style={styles.vaccineHeaderDate}>{formatDate(String(c.date ?? ''))}{c.clinic ? ` · ${String(c.clinic)}` : ''}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: typeColor + '15' }]}>
                      <Text style={[styles.statusBadgeText, { color: typeColor }]}>{String(c.type ?? '')}</Text>
                    </View>
                  </View>
                }
              >
                <View style={styles.vaccineDetails}>
                  {!!c.summary && <InfoRow label={t('health.summary')} value={String(c.summary)} isFirst />}
                  {!!c.diagnosis && <InfoRow label={t('health.diagnosis')} value={String(c.diagnosis)} />}
                  {!!c.prescriptions && <InfoRow label={t('health.prescriptions')} value={String(c.prescriptions)} />}
                  {!!c.follow_up_at && <InfoRow label={t('health.followUp')} value={formatDate(String(c.follow_up_at))} />}
                  {!!c.notes && <InfoRow label={t('health.notes')} value={String(c.notes)} />}
                </View>
              </ExpandableCard>
            );
          })
        )}
      </>
    );
  }, [consultations, t]);

  const renderSurgeries = useCallback(() => {
    const STATUS_COLORS: Record<string, string> = {
      recovered: colors.success, recovering: colors.warning,
      scheduled: colors.petrol, complications: colors.danger,
    };
    return (
      <>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddSurg(true)} activeOpacity={0.7}>
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
  }, [surgeries, t]);

  const renderMetrics = useCallback(() => (
    <MetricsCharts petId={id} />
  ), [id]);

  const renderExpenses = useCallback(() => (
    <ExpensesLens petId={id} />
  ), [id]);

  // ──────────────────────────────────────
  // Tab content renderer
  // ──────────────────────────────────────
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'general':
        return renderGeneral();
      case 'vaccines':
        return renderVaccines();
      case 'exams':
        return renderExams();
      case 'medications':
        return renderMedications();
      case 'consultations':
        return renderConsultations();
      case 'surgeries':
        return renderSurgeries();
      case 'metrics':
        return renderMetrics();
      case 'expenses':
        return renderExpenses();
      default:
        return null;
    }
  }, [activeTab, renderGeneral, renderVaccines, renderExams, renderMedications, renderConsultations, renderSurgeries, renderMetrics, renderExpenses]);

  // ──────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.skeletonTabs}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={rs(70)} height={rs(32)} radius={rs(16)} />
          ))}
        </View>
        <View style={styles.skeletonContent}>
          <Skeleton width={rs(200)} height={rs(16)} />
          <Skeleton
            width={'100%' as unknown as number}
            height={rs(140)}
            radius={radii.card}
            style={{ marginTop: rs(12) }}
          />
          <Skeleton width={rs(120)} height={rs(12)} style={{ marginTop: rs(20) }} />
          <Skeleton
            width={'100%' as unknown as number}
            height={rs(200)}
            radius={radii.card}
            style={{ marginTop: rs(12) }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Sub-tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBar}
        style={styles.tabBarScroll}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {renderTabContent()}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AddVaccineModal
        visible={showAddVaccine}
        onClose={() => setShowAddVaccine(false)}
        onSubmit={handleAddVaccine}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingVaccine}
      />
      <AddExamModal
        visible={showAddExam}
        onClose={() => setShowAddExam(false)}
        onSubmit={handleAddExam}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingExam}
      />
      <AddMedicationModal
        visible={showAddMed}
        onClose={() => setShowAddMed(false)}
        onSubmit={handleAddMedication}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingMed}
      />
      <AddConsultationModal
        visible={showAddCons}
        onClose={() => setShowAddCons(false)}
        onSubmit={handleAddConsultation}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingCons}
      />
      <AddSurgeryModal
        visible={showAddSurg}
        onClose={() => setShowAddSurg(false)}
        onSubmit={handleAddSurgery}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingSurg}
      />

      {/* Blood Type Info Modal */}
      <Modal visible={showBloodTypeInfo} transparent animationType="slide" onRequestClose={() => setShowBloodTypeInfo(false)}>
        <Pressable style={styles.btOverlay} onPress={() => setShowBloodTypeInfo(false)}>
          <Pressable style={styles.btSheet} onPress={() => {}}>
            <View style={styles.btHandle} />
            <View style={styles.btHeader}>
              <Droplet size={rs(20)} color={colors.danger} strokeWidth={1.8} />
              <Text style={styles.btTitle}>{t('health.bloodTypeTitle')}</Text>
              <TouchableOpacity onPress={() => setShowBloodTypeInfo(false)} style={{ marginLeft: 'auto' }}>
                <X size={rs(18)} color={colors.accent} strokeWidth={1.8} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Dog types */}
              <Text style={styles.btSectionLabel}>{t('health.bloodTypeDog')}</Text>
              {[
                { type: 'DEA 1.1+', freq: '40-60%', desc: 'Universal recipient' },
                { type: 'DEA 1.1-', freq: '40-60%', desc: 'Universal donor' },
                { type: 'DEA 1.2', freq: '20%', desc: 'Common' },
                { type: 'DEA 3', freq: '6%', desc: 'Rare' },
                { type: 'DEA 4', freq: '98%', desc: 'Very common, low antigenicity' },
                { type: 'DEA 5', freq: '25%', desc: 'Uncommon' },
                { type: 'DEA 7', freq: '45%', desc: 'Common' },
              ].map((bt) => (
                <View key={bt.type} style={styles.btRow}>
                  <Text style={styles.btType}>{bt.type}</Text>
                  <Text style={styles.btFreq}>{bt.freq}</Text>
                  <Text style={styles.btDesc}>{isDog ? bt.desc : ''}</Text>
                </View>
              ))}

              {/* Cat types */}
              <Text style={[styles.btSectionLabel, { marginTop: rs(16) }]}>{t('health.bloodTypeCat')}</Text>
              {[
                { type: 'A', freq: '85-95%', desc: 'Most common worldwide' },
                { type: 'B', freq: '5-15%', desc: 'More common in some breeds (British, Devon Rex)' },
                { type: 'AB', freq: '<1%', desc: 'Very rare, universal recipient' },
              ].map((bt) => (
                <View key={bt.type} style={styles.btRow}>
                  <Text style={styles.btType}>{bt.type}</Text>
                  <Text style={styles.btFreq}>{bt.freq}</Text>
                  <Text style={styles.btDesc}>{bt.desc}</Text>
                </View>
              ))}

              <Text style={styles.btDisclaimer}>{t('health.bloodTypeDisclaimer')}</Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ══════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Tabs ──
  tabBarScroll: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: rs(16),
    gap: rs(4),
    paddingVertical: rs(8),
  },
  tabItem: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(16),
    backgroundColor: 'transparent',
  },
  tabItemActive: {
    backgroundColor: colors.accent + '18',
  },
  tabLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  tabLabelActive: {
    color: colors.accent,
  },

  // ── Add button ──
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    paddingVertical: rs(14),
    marginBottom: spacing.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.25,
    shadowRadius: rs(12),
    elevation: 4,
  },
  addButtonText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: '#fff',
  },
  simpleCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xxl,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  simpleCardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  simpleCardSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    marginTop: rs(4),
  },
  simpleCardBody: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginTop: rs(8),
    lineHeight: fs(18),
  },

  // ── Content ──
  content: {
    paddingHorizontal: rs(20),
    paddingTop: rs(16),
  },
  bottomSpacer: {
    height: rs(40),
  },

  // ── Section Label ──
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textGhost,
    letterSpacing: 2,
    marginBottom: rs(12),
    marginTop: rs(24),
  },

  // ── Score Card ──
  scoreCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(22),
    padding: rs(18),
  },
  scoreCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(16),
  },
  scoreCardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.purple,
    flex: 1,
  },
  scoreCardSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  scoreCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(20),
  },
  scoreCardInfo: {
    flex: 1,
    gap: rs(8),
  },
  scoreLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger + '25',
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    alignSelf: 'flex-start',
  },
  alertBadgeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.danger,
  },

  // ── Info Card ──
  // Blood Type
  bloodTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(14),
    padding: rs(14),
    marginBottom: rs(16),
  },
  bloodTypeValue: {
    flex: 1,
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(16),
    color: colors.text,
  },
  // Blood Type Info Modal
  btOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 25, 0.6)',
    justifyContent: 'flex-end',
  },
  btSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(26),
    borderTopRightRadius: rs(26),
    padding: rs(20),
    paddingBottom: rs(40),
    maxHeight: '80%',
  },
  btHandle: {
    width: rs(40),
    height: rs(5),
    borderRadius: rs(3),
    backgroundColor: colors.textGhost,
    alignSelf: 'center',
    marginBottom: rs(16),
  },
  btHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    marginBottom: rs(16),
  },
  btTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(17),
    color: colors.text,
  },
  btSectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: colors.accent,
    letterSpacing: 0.5,
    marginBottom: rs(8),
  },
  btRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  btType: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(13),
    color: colors.text,
    width: rs(80),
  },
  btFreq: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.petrol,
    width: rs(60),
  },
  btDesc: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
  },
  btDisclaimer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(9),
    color: colors.textGhost,
    textAlign: 'center',
    marginTop: rs(16),
    lineHeight: fs(14),
  },
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(18),
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(14),
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.textDim,
  },
  infoValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },

  // ── Allergy Card ──
  allergyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(14),
    padding: rs(14),
    marginBottom: rs(8),
  },
  allergyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  allergyName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
    flex: 1,
  },
  allergyDetail: {
    flexDirection: 'row',
    marginTop: rs(8),
    paddingLeft: rs(24),
    gap: rs(6),
  },
  allergyDetailLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.textDim,
  },
  allergyDetailValue: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    flex: 1,
  },

  // ── Severity Badge ──
  severityBadge: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(3),
    borderRadius: rs(8),
  },
  severityText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
  },

  // ── Stats Grid ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  statCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(14),
    padding: rs(14),
    alignItems: 'center',
    gap: rs(6),
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: rs(95),
  },
  statIconBg: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(20),
  },
  statCardLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 0.3,
  },

  // ── Vaccine Progress Card ──
  vaccineProgressCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(14),
    padding: rs(14),
    marginBottom: rs(12),
    gap: rs(10),
  },
  vaccineProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  vaccineProgressText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
    flex: 1,
  },

  // ── Progress Bar ──
  progressTrack: {
    height: rs(5),
    backgroundColor: colors.border,
    borderRadius: rs(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: rs(3),
  },

  // ── Expandable Card ──
  expandableCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(14),
    marginBottom: rs(8),
    overflow: 'hidden',
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rs(14),
  },
  expandableHeaderContent: {
    flex: 1,
  },
  expandableBody: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // ── Vaccine Header ──
  vaccineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
  },
  vaccineHeaderInfo: {
    flex: 1,
  },
  vaccineHeaderName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  vaccineHeaderDate: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: 2,
  },
  vaccineDetails: {
    backgroundColor: colors.bgCard,
  },

  // ── Status Badge ──
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(8),
  },
  statusBadgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(60),
    gap: rs(12),
  },
  emptyMessage: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.textSec,
    textAlign: 'center',
  },
  emptyHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    textAlign: 'center',
    maxWidth: rs(260),
  },
  emptyInline: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(14),
    padding: rs(16),
    alignItems: 'center',
  },
  emptyInlineText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
  },

  // ── Skeleton ──
  skeletonTabs: {
    flexDirection: 'row',
    gap: rs(8),
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  skeletonContent: {
    paddingHorizontal: rs(20),
    paddingTop: rs(16),
  },
});
