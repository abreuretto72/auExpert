import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
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
} from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { useVaccines, useAllergies } from '../../../../hooks/useHealth';
import { HealthScoreCircle } from '../../../../components/HealthScoreCircle';
import { Skeleton } from '../../../../components/Skeleton';
import AddVaccineModal from '../../../../components/AddVaccineModal';
import { useToast } from '../../../../components/Toast';
import { useAuthStore } from '../../../../stores/authStore';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatAge, formatWeight, formatDate } from '../../../../utils/format';

type TabId = 'general' | 'vaccines' | 'exams' | 'medications' | 'consultations' | 'surgeries';

interface TabDef {
  id: TabId;
  labelKey: string;
}

const TABS: TabDef[] = [
  { id: 'general', labelKey: 'health.tabGeneral' },
  { id: 'vaccines', labelKey: 'health.tabVaccines' },
  { id: 'exams', labelKey: 'health.tabExams' },
  { id: 'medications', labelKey: 'health.tabMedications' },
  { id: 'consultations', labelKey: 'health.tabConsultations' },
  { id: 'surgeries', labelKey: 'health.tabSurgeries' },
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, isLoading: petLoading, refetch: refetchPet } = usePet(id!);
  const { vaccines, overdueCount, isLoading: vaccinesLoading, refetch: refetchVaccines, addVaccine, isAdding } = useVaccines(id!);
  const { allergies, isLoading: allergiesLoading, refetch: refetchAllergies } = useAllergies(id!);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [showAddVaccine, setShowAddVaccine] = useState(false);

  const isLoading = petLoading || vaccinesLoading || allergiesLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPet(), refetchVaccines(), refetchAllergies()]);
    setRefreshing(false);
  }, [refetchPet, refetchVaccines, refetchAllergies]);

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

        {/* Pet Info Grid */}
        <Text style={styles.sectionLabel}>{t('health.petInfo').toUpperCase()}</Text>
        <View style={styles.infoCard}>
          <InfoRow
            label={t('health.species')}
            value={isDog ? t('pets.dog') : t('pets.cat')}
            isFirst
          />
          <InfoRow label={t('health.breed')} value={pet.breed ?? t('health.unknown')} />
          <InfoRow
            label={t('health.age')}
            value={pet.estimated_age_months ? formatAge(pet.estimated_age_months) : t('health.unknown')}
          />
          <InfoRow
            label={t('health.weight')}
            value={pet.weight_kg ? formatWeight(pet.weight_kg) : t('health.unknown')}
          />
          <InfoRow
            label={t('health.microchip')}
            value={pet.microchip_id ?? t('health.notRegistered')}
          />
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
  const handleAddVaccine = useCallback(async (vaccine: Record<string, unknown>) => {
    try {
      await addVaccine({
        pet_id: id!,
        user_id: user?.id ?? '',
        name: vaccine.name as string,
        laboratory: (vaccine.laboratory as string) || null,
        batch_number: (vaccine.batch_number as string) || null,
        date_administered: vaccine.date_administered as string,
        next_due_date: (vaccine.next_due_date as string) || null,
        dose_number: (vaccine.dose_number as string) || null,
        veterinarian: (vaccine.veterinarian as string) || null,
        clinic: (vaccine.clinic as string) || null,
        status: 'up_to_date',
        source: vaccine.source as string ?? 'manual',
        notes: (vaccine.notes as string) || null,
      });
      setShowAddVaccine(false);
      toast(t('toast.petCreated', { name: vaccine.name }), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [addVaccine, id, user?.id, toast, t]);

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
    return <EmptyState message={t('health.emptyExams')} hint={t('health.emptyHint')} />;
  }, [t]);

  // ──────────────────────────────────────
  // TAB: MEDICATIONS (empty state)
  // ──────────────────────────────────────
  const renderMedications = useCallback(() => {
    return <EmptyState message={t('health.emptyMedications')} hint={t('health.emptyHint')} />;
  }, [t]);

  // ──────────────────────────────────────
  // TAB: CONSULTATIONS (empty state)
  // ──────────────────────────────────────
  const renderConsultations = useCallback(() => {
    return <EmptyState message={t('health.emptyConsultations')} hint={t('health.emptyHint')} />;
  }, [t]);

  // ──────────────────────────────────────
  // TAB: SURGERIES (empty state)
  // ──────────────────────────────────────
  const renderSurgeries = useCallback(() => {
    return <EmptyState message={t('health.emptySurgeries')} hint={t('health.emptyHint')} />;
  }, [t]);

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
      default:
        return null;
    }
  }, [activeTab, renderGeneral, renderVaccines, renderExams, renderMedications, renderConsultations, renderSurgeries]);

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
        isSubmitting={isAdding}
      />
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
