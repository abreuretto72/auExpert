import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ClipboardList,
  FileText,
} from 'lucide-react-native';

import { rs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii } from '../../../../constants/spacing';
import { styles } from './_health/styles';
import { BloodTypeInfoModal } from './_health/BloodTypeInfoModal';
import {
  GeneralTab,
  VaccinesTab,
  ExamsTab,
  MedicationsTab,
  ConsultationsTab,
  SurgeriesTab,
  MetricsTab,
  ExpensesTab,
} from './_health/tabs';
import { usePet } from '../../../../hooks/usePets';
import { useVaccines, useAllergies, useExams, useMedications, useConsultations, useSurgeries, useMetrics, useExpensesMutations } from '../../../../hooks/useHealth';
import { Skeleton } from '../../../../components/Skeleton';
import AddVaccineModal, { type VaccineData } from '../../../../components/AddVaccineModal';
import AddExamModal, { type ExamData } from '../../../../components/AddExamModal';
import AddMedicationModal, { type MedicationData } from '../../../../components/AddMedicationModal';
import AddSurgeryModal, { type SurgeryData } from '../../../../components/AddSurgeryModal';
import AddMetricsModal, { type MetricData } from '../../../../components/AddMetricsModal';
import AddExpensesModal, { type ExpenseData } from '../../../../components/AddExpensesModal';
import { useToast } from '../../../../components/Toast';
import { useAuthStore } from '../../../../stores/authStore';
import PetBottomNav, { type PetTab } from '../../../../components/layout/PetBottomNav';
import { SectionErrorBoundary } from '../../../../components/SectionErrorBoundary';
import { getErrorMessage } from '../../../../utils/errorMessages';

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


// ══════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════
export default function HealthScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  console.log('[HealthScreen] RENDER | id:', id?.slice(-8), '| tab param:', tab);
  const validTabs: TabId[] = ['general', 'vaccines', 'exams', 'medications', 'consultations', 'surgeries', 'metrics', 'expenses'];
  const initialTab: TabId = (tab && validTabs.includes(tab as TabId)) ? (tab as TabId) : 'general';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, isLoading: petLoading, refetch: refetchPet } = usePet(id!);
  const { vaccines, overdueCount, isLoading: vaccinesLoading, refetch: refetchVaccines, addVaccine, isAdding: isAddingVaccine } = useVaccines(id!);
  const { allergies, isLoading: allergiesLoading, refetch: refetchAllergies } = useAllergies(id!);
  const { exams, refetch: refetchExams, addExam, isAdding: isAddingExam } = useExams(id!);
  const { medications, refetch: refetchMeds, addMedication, isAdding: isAddingMed } = useMedications(id!);
  const { consultations, hasMore: consultationsHasMore, refetch: refetchCons } = useConsultations(id!);
  const { surgeries, refetch: refetchSurg, addSurgery, isAdding: isAddingSurg } = useSurgeries(id!);
  const { addMetric, isAdding: isAddingMetric } = useMetrics(id!);
  const { addExpense, isAdding: isAddingExpense } = useExpensesMutations(id!);
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [showAddExam, setShowAddExam] = useState(false);
  const [showAddMed, setShowAddMed] = useState(false);
  const [showAddSurg, setShowAddSurg] = useState(false);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
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
      <GeneralTab
        pet={pet}
        vaccines={vaccines}
        allergies={allergies}
        exams={exams}
        consultations={consultations}
        medications={medications}
        surgeries={surgeries}
        overdueCount={overdueCount}
        healthLabel={healthLabel}
        onShowBloodTypeInfo={() => setShowBloodTypeInfo(true)}
      />
    );
  }, [pet, vaccines, allergies, exams, consultations, medications, surgeries, overdueCount, isDog, healthLabel, t]);

  // ──────────────────────────────────────
  // TAB: VACCINES
  // ──────────────────────────────────────
  const handleAddVaccine = useCallback(async (vaccine: VaccineData) => {
    try {
      await addVaccine({
        pet_id: id!,
        user_id: user?.id ?? '',
        name: vaccine.name,
        batch_number: vaccine.batch_number ?? null,
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

  const handleAddSurgery = useCallback(async (data: SurgeryData) => {
    try {
      await addSurgery({ ...data, pet_id: id, user_id: user?.id });
      setShowAddSurg(false);
      toast(t('toast.petCreated', { name: data.name }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addSurgery, id, user?.id, toast, t]);

  const handleAddMetric = useCallback(async (data: MetricData) => {
    try {
      await addMetric({ ...data, pet_id: id!, user_id: user?.id ?? '' });
      setShowAddMetric(false);
      toast(t('toast.petCreated', { name: t(`health.${data.metric_type}` as never, { defaultValue: data.metric_type }) }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addMetric, id, user?.id, toast, t]);

  const handleAddExpense = useCallback(async (data: ExpenseData) => {
    try {
      await addExpense({ ...data, pet_id: id!, user_id: user?.id ?? '' });
      setShowAddExpense(false);
      toast(t('toast.petCreated', { name: t(`expenses.category.${data.category}` as never, { defaultValue: data.category }) }), 'success');
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [addExpense, id, user?.id, toast, t]);

  const renderVaccines = useCallback(() => (
    <VaccinesTab
      vaccines={vaccines}
      overdueCount={overdueCount}
      upToDateCount={upToDateCount}
      onAdd={() => setShowAddVaccine(true)}
    />
  ), [vaccines, overdueCount, upToDateCount, t]);

  // ──────────────────────────────────────
  // TAB: EXAMS (empty state)
  // ──────────────────────────────────────
  const renderExams = useCallback(() => (
    <ExamsTab exams={exams} onAdd={() => setShowAddExam(true)} />
  ), [exams, t]);

  const renderMedications = useCallback(() => (
    <MedicationsTab medications={medications} onAdd={() => setShowAddMed(true)} />
  ), [medications, t]);

  const renderConsultations = useCallback(() => (
    <ConsultationsTab
      consultations={consultations}
      consultationsHasMore={consultationsHasMore}
      currentUserId={user?.id}
    />
  ), [consultations, consultationsHasMore, user?.id, t]);

  const renderSurgeries = useCallback(() => (
    <SurgeriesTab surgeries={surgeries} onAdd={() => setShowAddSurg(true)} />
  ), [surgeries, t]);

  const renderMetrics = useCallback(() => (
    <MetricsTab petId={id} onAdd={() => setShowAddMetric(true)} />
  ), [id]);

  const renderExpenses = useCallback(() => (
    <ExpensesTab petId={id} onAdd={() => setShowAddExpense(true)} />
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
        {/* Keep header visible during load so layout doesn't jump */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {pet?.name ?? '...'}
          </Text>
          <View style={{ flexDirection: 'row', gap: rs(8) }}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push(`/pet/${id}/health-pdf` as never)}
              activeOpacity={0.7}
              accessibilityLabel={t('pdfCommon.printOrSave')}
            >
              <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push(`/pet/${id}/prontuario` as never)}
              activeOpacity={0.7}
            >
              <ClipboardList size={rs(20)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.skeletonTabs}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={rs(70)} height={rs(32)} radius={rs(16)} />
          ))}
        </View>
        <View style={[styles.skeletonContent, { flex: 1 }]}>
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
        <PetBottomNav
          active="painel"
          onChange={(navTab: PetTab) => {
            if (navTab === 'painel') return;
            router.replace(`/pet/${id}?initialTab=${navTab}` as never);
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {pet?.name ?? '...'}
        </Text>
        <View style={{ flexDirection: 'row', gap: rs(8) }}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push(`/pet/${id}/health-pdf` as never)}
            activeOpacity={0.7}
            accessibilityLabel={t('pdfCommon.printOrSave')}
          >
            <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push(`/pet/${id}/prontuario` as never)}
            activeOpacity={0.7}
          >
            <ClipboardList size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

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
      <SectionErrorBoundary sectionName="health" resetKeys={[id, activeTab]} onReset={onRefresh}>
        <ScrollView
          style={styles.contentScroll}
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
      </SectionErrorBoundary>

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
      <AddSurgeryModal
        visible={showAddSurg}
        onClose={() => setShowAddSurg(false)}
        onSubmit={handleAddSurgery}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingSurg}
      />
      <AddMetricsModal
        visible={showAddMetric}
        onClose={() => setShowAddMetric(false)}
        onSubmit={handleAddMetric}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingMetric}
      />
      <AddExpensesModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSubmit={handleAddExpense}
        petId={id!}
        userId={user?.id ?? ''}
        isSubmitting={isAddingExpense}
      />

      {/* Bottom Nav — same as diary/painel tabs */}
      <PetBottomNav
        active="painel"
        onChange={(navTab: PetTab) => {
          if (navTab === 'painel') return; // already here
          router.replace(`/pet/${id}?initialTab=${navTab}` as never);
        }}
      />

      {/* Blood Type Info Modal */}
      <BloodTypeInfoModal
        visible={showBloodTypeInfo}
        onClose={() => setShowBloodTypeInfo(false)}
        isDog={isDog}
      />
    </View>
  );
}
