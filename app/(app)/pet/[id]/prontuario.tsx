/**
 * ProntuarioScreen — AI-generated pet medical record.
 *
 * Shows: pet identity, AI health summary, alerts, vaccines, active meds,
 * allergies, chronic conditions, last consultation.
 * Actions: Share PDF, view QR emergency card, regenerate.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  FileText,
  QrCode,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  Syringe,
  Pill,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  XCircle,
  Info,
  Dog,
  Cat,
  Scissors,
  Droplet,
  Calendar,
  CalendarClock,
  Activity,
  FlaskConical,
  Phone,
  Bug,
  Scale,
  Thermometer,
  Heart,
  Wind,
  UserCheck,
  FileHeart,
} from 'lucide-react-native';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import {
  useProntuario,
  type ProntuarioAlert,
  type ProntuarioVaccine,
  type ProntuarioSurgery,
  type ProntuarioBreedPredisposition,
  type ProntuarioDrugInteraction,
  type ProntuarioPreventiveCalendarItem,
  type ProntuarioBodySystemReview,
  type ProntuarioExamAbnormalFlag,
  type ProntuarioEmergencyCard,
  type ProntuarioBodyConditionScore,
  type ProntuarioParasiteControl,
  type ProntuarioChronicConditionRecord,
  type ProntuarioTrustedVet,
  type ProntuarioVitalSigns,
} from '../../../../hooks/useProntuario';
import { useToast } from '../../../../components/Toast';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatDate, formatWeight } from '../../../../utils/format';
import { sexContext } from '../../../../utils/petGender';

// ── Alert icon helper ─────────────────────────────────────────────────────────

function AlertIcon({ type }: { type: ProntuarioAlert['type'] }) {
  if (type === 'critical') return <XCircle size={rs(14)} color={colors.danger} strokeWidth={2} />;
  if (type === 'warning') return <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={2} />;
  return <Info size={rs(14)} color={colors.petrol} strokeWidth={2} />;
}

function alertBg(type: ProntuarioAlert['type']): string {
  if (type === 'critical') return colors.dangerSoft;
  if (type === 'warning') return colors.warningSoft;
  return colors.petrolSoft;
}

function alertBorder(type: ProntuarioAlert['type']): string {
  if (type === 'critical') return colors.danger;
  if (type === 'warning') return colors.warning;
  return colors.petrol;
}

function surgeryStatusColor(status: NonNullable<ProntuarioSurgery['status']>): string {
  if (status === 'scheduled') return colors.petrol;
  if (status === 'recovering') return colors.warning;
  if (status === 'recovered') return colors.success;
  return colors.danger; // complications
}

function surgeryStatusBg(status: NonNullable<ProntuarioSurgery['status']>): string {
  if (status === 'scheduled') return colors.petrolSoft;
  if (status === 'recovering') return colors.warningSoft;
  if (status === 'recovered') return colors.successSoft;
  return colors.dangerSoft; // complications
}

// ── Fase 2 — severity / status helpers ────────────────────────────────────────

function breedSeverityColor(sev: ProntuarioBreedPredisposition['severity']): string {
  if (sev === 'manage') return colors.danger;
  if (sev === 'watch') return colors.warning;
  return colors.petrol; // monitor
}

function breedSeverityBg(sev: ProntuarioBreedPredisposition['severity']): string {
  if (sev === 'manage') return colors.dangerSoft;
  if (sev === 'watch') return colors.warningSoft;
  return colors.petrolSoft; // monitor
}

function drugSeverityColor(sev: ProntuarioDrugInteraction['severity']): string {
  if (sev === 'severe') return colors.danger;
  if (sev === 'moderate') return colors.warning;
  return colors.petrol; // mild
}

function drugSeverityBg(sev: ProntuarioDrugInteraction['severity']): string {
  if (sev === 'severe') return colors.dangerSoft;
  if (sev === 'moderate') return colors.warningSoft;
  return colors.petrolSoft; // mild
}

function calendarStatusColor(st: ProntuarioPreventiveCalendarItem['status']): string {
  if (st === 'overdue') return colors.danger;
  if (st === 'upcoming') return colors.warning;
  if (st === 'scheduled') return colors.petrol;
  return colors.success; // done
}

function calendarStatusBg(st: ProntuarioPreventiveCalendarItem['status']): string {
  if (st === 'overdue') return colors.dangerSoft;
  if (st === 'upcoming') return colors.warningSoft;
  if (st === 'scheduled') return colors.petrolSoft;
  return colors.successSoft; // done
}

function bodyStatusColor(st: ProntuarioBodySystemReview['status']): string {
  if (st === 'abnormal') return colors.danger;
  if (st === 'attention') return colors.warning;
  if (st === 'normal') return colors.success;
  return colors.textDim; // unknown
}

function bodyStatusBg(st: ProntuarioBodySystemReview['status']): string {
  if (st === 'abnormal') return colors.dangerSoft;
  if (st === 'attention') return colors.warningSoft;
  if (st === 'normal') return colors.successSoft;
  return colors.card; // unknown
}

function examFlagColor(f: ProntuarioExamAbnormalFlag['flag']): string {
  if (f === 'high') return colors.danger;
  if (f === 'low') return colors.petrol;
  return colors.warning; // abnormal
}

function hasEmergencyContent(ec: ProntuarioEmergencyCard): boolean {
  return !!(
    (ec.critical_allergies?.length ?? 0) > 0 ||
    (ec.active_meds_with_dose?.length ?? 0) > 0 ||
    (ec.chronic_conditions_flagged?.length ?? 0) > 0 ||
    ec.blood_type ||
    ec.contact?.tutor_name ||
    ec.contact?.vet_name
  );
}

// ── Fase 4 — Tab navigation types + helpers ──────────────────────────────────

type TabId = 'geral' | 'saude' | 'prevencao' | 'sinais' | 'raca' | 'emergencia';

const TAB_IDS: TabId[] = ['geral', 'saude', 'prevencao', 'sinais', 'raca', 'emergencia'];

function tabIcon(id: TabId, color: string, size: number) {
  if (id === 'geral') return <FileHeart size={size} color={color} strokeWidth={1.8} />;
  if (id === 'saude') return <Stethoscope size={size} color={color} strokeWidth={1.8} />;
  if (id === 'prevencao') return <CalendarClock size={size} color={color} strokeWidth={1.8} />;
  if (id === 'sinais') return <Activity size={size} color={color} strokeWidth={1.8} />;
  if (id === 'raca') return <ShieldAlert size={size} color={color} strokeWidth={1.8} />;
  return <Phone size={size} color={color} strokeWidth={1.8} />; // emergencia
}

// Fase 3e — helpers for new sections

function bcsStatusColor(score: number): string {
  // WSAVA 1-9: 1-3 underweight (danger), 4-5 ideal (success), 6-7 overweight (warning), 8-9 obese (danger)
  if (score <= 3 || score >= 8) return colors.danger;
  if (score === 6 || score === 7) return colors.warning;
  return colors.success;
}

function bcsStatusBg(score: number): string {
  if (score <= 3 || score >= 8) return colors.dangerSoft;
  if (score === 6 || score === 7) return colors.warningSoft;
  return colors.successSoft;
}

function chronicStatusColor(status: ProntuarioChronicConditionRecord['status']): string {
  if (status === 'active') return colors.danger;
  if (status === 'controlled') return colors.warning;
  if (status === 'remission') return colors.petrol;
  return colors.success; // resolved
}

function chronicStatusBg(status: ProntuarioChronicConditionRecord['status']): string {
  if (status === 'active') return colors.dangerSoft;
  if (status === 'controlled') return colors.warningSoft;
  if (status === 'remission') return colors.petrolSoft;
  return colors.successSoft; // resolved
}

function parasiteStatusColor(isOverdue: boolean): string {
  return isOverdue ? colors.danger : colors.success;
}

function parasiteStatusBg(isOverdue: boolean): string {
  return isOverdue ? colors.dangerSoft : colors.successSoft;
}

function mucousColor(m: NonNullable<ProntuarioVitalSigns['mucous_color']>): string {
  if (m === 'pink') return colors.success;
  if (m === 'pale' || m === 'cyanotic' || m === 'icteric' || m === 'brick_red') return colors.danger;
  return colors.textDim; // unknown
}

function hydrationColor(h: NonNullable<ProntuarioVitalSigns['hydration_status']>): string {
  if (h === 'normal') return colors.success;
  if (h === 'mild_dehydration') return colors.warning;
  if (h === 'moderate_dehydration' || h === 'severe_dehydration') return colors.danger;
  return colors.textDim; // unknown
}

function hasVitalSignsContent(vs: ProntuarioVitalSigns | null | undefined): boolean {
  if (!vs) return false;
  return !!(
    vs.temperature_celsius !== null ||
    vs.heart_rate_bpm !== null ||
    vs.respiratory_rate_rpm !== null ||
    vs.capillary_refill_sec !== null ||
    (vs.mucous_color && vs.mucous_color !== 'unknown') ||
    (vs.hydration_status && vs.hydration_status !== 'unknown')
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProntuarioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  console.log('[ProntuarioScreen] RENDER | id:', id?.slice(-8));

  const { data: pet } = usePet(id!);
  const { prontuario, isLoading, isError, error, regenerate, isRegenerating, refetch } = useProntuario(id!);

  // Fase 4 — Tab navigation state (default: Geral)
  const [activeTab, setActiveTab] = useState<TabId>('geral');

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleRegenerate = useCallback(async () => {
    try {
      await regenerate();
      toast(t('prontuario.regenerateSuccess'), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [regenerate, toast, t]);

  const handleOpenPdf = useCallback(() => {
    router.push(`/pet/${id}/prontuario-pdf` as never);
  }, [router, id]);

  const handleQrCode = useCallback(() => {
    router.push(`/pet/${id}/prontuario-qr` as never);
  }, [router, id]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading || isRegenerating) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.replace(`/pet/${id}` as never)} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('prontuario.title', { name: pet?.name ?? '...', context: sexContext(pet?.sex) })}</Text>
          <TouchableOpacity onPress={handleOpenPdf} style={s.headerBtn} activeOpacity={0.7}>
            <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <View style={s.loadingCenter}>
          <View style={s.aiSpinner}>
            <Sparkles size={rs(28)} color={colors.purple} strokeWidth={1.8} />
          </View>
          <Text style={s.loadingTitle}>{t('prontuario.generating')}</Text>
          <Text style={s.loadingSubtitle}>{t('prontuario.generatingSubtitle', { name: pet?.name ?? '...', context: sexContext(pet?.sex) })}</Text>
          <ActivityIndicator color={colors.purple} style={{ marginTop: rs(16) }} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────

  if (isError || !prontuario) {
    const errMsg = isError
      ? ((error as any)?.message ?? (error as any)?.context?.message ?? String(error))
      : 'prontuario null after load';
    console.error('[ProntuarioScreen] ERROR STATE | pet:', id?.slice(-8), '| err:', errMsg);
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.replace(`/pet/${id}` as never)} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('prontuario.title', { name: pet?.name ?? '...', context: sexContext(pet?.sex) })}</Text>
          <TouchableOpacity onPress={handleOpenPdf} style={s.headerBtn} activeOpacity={0.7}>
            <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <View style={s.loadingCenter}>
          <XCircle size={rs(40)} color={colors.danger} strokeWidth={1.5} />
          <Text style={s.loadingTitle}>{t('prontuario.errorTitle')}</Text>
          <Text style={s.loadingSubtitle}>{t('prontuario.errorSubtitle')}</Text>
          {/* DEBUG — remover após diagnóstico */}
          <Text style={{ color: colors.danger, fontSize: fs(10), marginTop: rs(8), textAlign: 'center', paddingHorizontal: rs(16) }} numberOfLines={4}>
            {errMsg}
          </Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} activeOpacity={0.8}>
            <RefreshCw size={rs(16)} color={colors.accent} strokeWidth={1.8} />
            <Text style={s.retryText}>{t('prontuario.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vaccineStatusColor = {
    current: colors.success,
    partial: colors.warning,
    overdue: colors.danger,
    none: colors.textDim,
  }[prontuario.vaccines_status];

  const overdueVaccines = prontuario.vaccines.filter((v) => v.is_overdue);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace(`/pet/${id}` as never)} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('prontuario.title', { name: pet?.name ?? '...', context: sexContext(pet?.sex) })}</Text>
        <View style={{ flexDirection: 'row', gap: rs(8) }}>
          <TouchableOpacity onPress={handleOpenPdf} style={s.headerBtn} activeOpacity={0.7}>
            <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRegenerate}
            style={s.headerBtn}
            activeOpacity={0.7}
            disabled={isRegenerating}
          >
            <RefreshCw size={rs(18)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fase 4 — Tab bar (6 tabs) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsScroll}
        contentContainerStyle={s.tabsContent}
      >
        {TAB_IDS.map((id) => {
          const isActive = activeTab === id;
          const color = isActive ? colors.accent : colors.textDim;
          return (
            <TouchableOpacity
              key={id}
              style={[s.tabBtn, isActive && s.tabBtnActive]}
              onPress={() => setActiveTab(id)}
              activeOpacity={0.7}
            >
              {tabIcon(id, color, rs(14))}
              <Text style={[s.tabLabel, { color }]}>{t(`prontuario.tabs.${id}`)}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.accent} />
        }
      >
        {/* Pet identity card */}
        <View style={s.identityCard}>
          <View style={s.identityRow}>
            {pet?.avatar_url ? (
              <Image source={{ uri: pet.avatar_url }} style={s.petAvatar} />
            ) : (
              <View style={s.identityIconWrap}>
                {pet?.species === 'cat'
                  ? <Cat size={rs(24)} color={colors.purple} strokeWidth={1.8} />
                  : <Dog size={rs(24)} color={colors.accent} strokeWidth={1.8} />
                }
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.petName}>{pet?.name ?? '—'}</Text>
              <Text style={s.petMeta}>
                {[
                  prontuario.age_label,
                  prontuario.weight_kg ? formatWeight(prontuario.weight_kg) : null,
                  prontuario.is_neutered !== null
                    ? prontuario.is_neutered
                      ? t('prontuario.neutered')
                      : t('prontuario.notNeutered')
                    : null,
                ].filter(Boolean).join(' · ')}
              </Text>
              {prontuario.microchip && (
                <Text style={s.microchip}>{t('prontuario.microchipLabel', { value: prontuario.microchip })}</Text>
              )}
            </View>
          </View>

          {/* Demographic details — Fase 1: surface existing DB fields */}
          {(prontuario.sex || prontuario.birth_date || prontuario.size || prontuario.color || prontuario.blood_type) && (
            <View style={s.demoGrid}>
              {prontuario.sex && (
                <View style={s.demoItem}>
                  <Text style={s.demoLabel}>{t('prontuario.sexLabel')}</Text>
                  <Text style={s.demoValue}>{t(`prontuario.sex.${prontuario.sex}`)}</Text>
                </View>
              )}
              {prontuario.birth_date && (
                <View style={s.demoItem}>
                  <Text style={s.demoLabel}>{t('prontuario.birthDate')}</Text>
                  <Text style={s.demoValue}>{formatDate(prontuario.birth_date)}</Text>
                </View>
              )}
              {prontuario.size && (
                <View style={s.demoItem}>
                  <Text style={s.demoLabel}>{t('prontuario.sizeLabel')}</Text>
                  <Text style={s.demoValue}>{t(`prontuario.size.${prontuario.size}`)}</Text>
                </View>
              )}
              {prontuario.color && (
                <View style={s.demoItem}>
                  <Text style={s.demoLabel}>{t('prontuario.color')}</Text>
                  <Text style={s.demoValue}>{prontuario.color}</Text>
                </View>
              )}
              {prontuario.blood_type && (
                <View style={s.demoItem}>
                  <Text style={s.demoLabel}>{t('prontuario.bloodType')}</Text>
                  <Text style={[s.demoValue, { color: colors.danger }]}>{prontuario.blood_type}</Text>
                </View>
              )}
            </View>
          )}

          {/* Status badges */}
          <View style={s.badgesRow}>
            <View style={[s.badge, { backgroundColor: vaccineStatusColor + '18' }]}>
              <Syringe size={rs(11)} color={vaccineStatusColor} strokeWidth={2} />
              <Text style={[s.badgeText, { color: vaccineStatusColor }]}>
                {t(`prontuario.vaccinesStatus.${prontuario.vaccines_status}`)}
              </Text>
            </View>
            {prontuario.active_medications.length > 0 && (
              <View style={[s.badge, { backgroundColor: colors.purpleSoft }]}>
                <Pill size={rs(11)} color={colors.purple} strokeWidth={2} />
                <Text style={[s.badgeText, { color: colors.purple }]}>
                  {prontuario.active_medications.length} {t('prontuario.activeMeds')}
                </Text>
              </View>
            )}
            {prontuario.allergies.length > 0 && (
              <View style={[s.badge, { backgroundColor: colors.dangerSoft }]}>
                <AlertTriangle size={rs(11)} color={colors.danger} strokeWidth={2} />
                <Text style={[s.badgeText, { color: colors.danger }]}>
                  {prontuario.allergies.length} {t('prontuario.allergiesCount')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Emergency Card — Fase 2: critical info for first responders */}
        {activeTab === 'emergencia' && prontuario.emergency_card && hasEmergencyContent(prontuario.emergency_card) && (
          <View style={s.emergencyCard}>
            <View style={s.emergencyHeader}>
              <ShieldAlert size={rs(18)} color={colors.danger} strokeWidth={2} />
              <Text style={s.emergencyTitle}>{t('prontuario.emergencyCard.title').toUpperCase()}</Text>
            </View>
            <Text style={s.emergencySubtitle}>{t('prontuario.emergencyCard.subtitle')}</Text>

            {prontuario.emergency_card.critical_allergies && prontuario.emergency_card.critical_allergies.length > 0 && (
              <View style={s.emergencyRow}>
                <Text style={s.emergencyLabel}>{t('prontuario.emergencyCard.allergies')}</Text>
                <View style={s.emergencyChips}>
                  {prontuario.emergency_card.critical_allergies.map((a, i) => (
                    <View key={i} style={s.emergencyDangerChip}>
                      <AlertTriangle size={rs(10)} color={colors.danger} strokeWidth={2.2} />
                      <Text style={s.emergencyDangerChipText}>{a}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {prontuario.emergency_card.active_meds_with_dose && prontuario.emergency_card.active_meds_with_dose.length > 0 && (
              <View style={s.emergencyRow}>
                <Text style={s.emergencyLabel}>{t('prontuario.emergencyCard.activeMeds')}</Text>
                {prontuario.emergency_card.active_meds_with_dose.map((m, i) => (
                  <Text key={i} style={s.emergencyText}>
                    <Text style={s.emergencyBold}>{m.name}</Text>
                    {m.dose ? ` · ${m.dose}` : ''}
                  </Text>
                ))}
              </View>
            )}

            {prontuario.emergency_card.chronic_conditions_flagged && prontuario.emergency_card.chronic_conditions_flagged.length > 0 && (
              <View style={s.emergencyRow}>
                <Text style={s.emergencyLabel}>{t('prontuario.emergencyCard.chronic')}</Text>
                <View style={s.emergencyChips}>
                  {prontuario.emergency_card.chronic_conditions_flagged.map((c, i) => (
                    <View key={i} style={s.emergencyWarningChip}>
                      <Text style={s.emergencyWarningChipText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={s.emergencyGrid}>
              {prontuario.emergency_card.blood_type && (
                <View style={s.emergencyGridItem}>
                  <Droplet size={rs(11)} color={colors.danger} strokeWidth={2} />
                  <Text style={s.emergencyGridLabel}>{t('prontuario.emergencyCard.bloodType')}</Text>
                  <Text style={[s.emergencyGridValue, { color: colors.danger }]}>{prontuario.emergency_card.blood_type}</Text>
                </View>
              )}
              {prontuario.emergency_card.contact?.tutor_name && (
                <View style={s.emergencyGridItem}>
                  <Phone size={rs(11)} color={colors.petrol} strokeWidth={2} />
                  <Text style={s.emergencyGridLabel}>{t('prontuario.emergencyCard.tutor')}</Text>
                  <Text style={s.emergencyGridValue}>{prontuario.emergency_card.contact.tutor_name}</Text>
                </View>
              )}
              {prontuario.emergency_card.contact?.vet_name && (
                <View style={s.emergencyGridItem}>
                  <Stethoscope size={rs(11)} color={colors.petrol} strokeWidth={2} />
                  <Text style={s.emergencyGridLabel}>{t('prontuario.emergencyCard.vet')}</Text>
                  <Text style={s.emergencyGridValue}>{prontuario.emergency_card.contact.vet_name}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Alerts */}
        {prontuario.alerts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.alerts').toUpperCase()}</Text>
            {prontuario.alerts.map((alert, i) => (
              <View
                key={i}
                style={[s.alertCard, { backgroundColor: alertBg(alert.type), borderLeftColor: alertBorder(alert.type) }]}
              >
                <View style={s.alertHeader}>
                  <AlertIcon type={alert.type} />
                  <Text style={[s.alertMessage, { color: alertBorder(alert.type) }]} numberOfLines={3}>
                    {alert.message}
                  </Text>
                </View>
                {alert.action ? (
                  <Text style={s.alertAction}>{alert.action}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* AI Summary */}
        {prontuario.ai_summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.summary').toUpperCase()}</Text>
            <View style={s.aiSummaryCard}>
              <View style={s.aiSummaryHeader}>
                <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
                <Text style={s.aiSummaryLabel}>{t('prontuario.aiAnalysis')}</Text>
              </View>
              <Text style={s.aiSummaryText}>{prontuario.ai_summary}</Text>
            </View>
          </View>
        )}

        {/* Fase 2 — Breed predispositions (AI-derived) */}
        {prontuario.breed_predispositions && prontuario.breed_predispositions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.predispositions.title').toUpperCase()}</Text>
            <Text style={s.subSectionHint}>{t('prontuario.predispositions.hint')}</Text>
            {prontuario.breed_predispositions.map((bp: ProntuarioBreedPredisposition, i: number) => (
              <View key={i} style={s.insightItem}>
                <View style={[s.insightIconWrap, { backgroundColor: breedSeverityBg(bp.severity) }]}>
                  <ShieldAlert size={rs(16)} color={breedSeverityColor(bp.severity)} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.insightTitle}>{bp.condition}</Text>
                    <View style={[s.confirmChip, { backgroundColor: breedSeverityBg(bp.severity) }]}>
                      <Text style={[s.confirmChipText, { color: breedSeverityColor(bp.severity) }]}>
                        {t(`prontuario.predispositions.severity.${bp.severity}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.insightRationale}>{bp.rationale}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Vaccines */}
        {prontuario.vaccines.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('health.vaccines').toUpperCase()}</Text>
            {prontuario.vaccines.map((v) => (
              <VaccineRow key={v.id} vaccine={v} t={t} />
            ))}
          </View>
        )}

        {/* Fase 2 — Preventive calendar (AI-derived schedule of upcoming care) */}
        {prontuario.preventive_calendar && prontuario.preventive_calendar.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.preventive.title').toUpperCase()}</Text>
            <Text style={s.subSectionHint}>{t('prontuario.preventive.hint')}</Text>
            {prontuario.preventive_calendar.map((pc: ProntuarioPreventiveCalendarItem, i: number) => (
              <View key={i} style={s.preventiveItem}>
                <View style={[s.preventiveIconWrap, { backgroundColor: calendarStatusBg(pc.status) }]}>
                  <CalendarClock size={rs(14)} color={calendarStatusColor(pc.status)} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.preventiveLabel}>{pc.label}</Text>
                    <View style={[s.confirmChip, { backgroundColor: calendarStatusBg(pc.status) }]}>
                      <Text style={[s.confirmChipText, { color: calendarStatusColor(pc.status) }]}>
                        {t(`prontuario.preventive.status.${pc.status}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.preventiveMeta}>
                    <Text style={s.preventiveTypeTag}>{t(`prontuario.preventive.type.${pc.type}`)}</Text>
                    {pc.due_date ? `  ·  ${formatDate(pc.due_date)}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active medications */}
        {prontuario.active_medications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('health.medications').toUpperCase()}</Text>
            {prontuario.active_medications.map((m) => (
              <View key={m.id} style={s.listItem}>
                <View style={s.listIconWrap}>
                  <Pill size={rs(16)} color={colors.purple} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.listItemTitle}>{m.name}</Text>
                    {m.type && (
                      <View style={s.typeChip}>
                        <Text style={s.typeChipText}>{t(`prontuario.medicationType.${m.type}`)}</Text>
                      </View>
                    )}
                  </View>
                  {(m.dosage || m.frequency) && (
                    <Text style={s.listItemSub}>
                      {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {m.reason && (
                    <Text style={s.listItemSub}>
                      {t('prontuario.medicationReason')}: {m.reason}
                    </Text>
                  )}
                  {m.prescribed_by && (
                    <Text style={s.listItemSub}>
                      {t('prontuario.prescribedBy')}: {m.prescribed_by}
                    </Text>
                  )}
                  {m.end_date ? (
                    <Text style={s.listItemDate}>
                      {t('health.to')}: {formatDate(m.end_date)}
                    </Text>
                  ) : (
                    <Text style={[s.listItemDate, { color: colors.purple }]}>
                      {t('prontuario.ongoing')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Fase 2 — Drug interactions (AI-derived, only when ≥2 active meds) */}
        {prontuario.drug_interactions && prontuario.drug_interactions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.drugInteractions.title').toUpperCase()}</Text>
            <Text style={s.subSectionHint}>{t('prontuario.drugInteractions.hint')}</Text>
            {prontuario.drug_interactions.map((di: ProntuarioDrugInteraction, i: number) => (
              <View
                key={i}
                style={[
                  s.insightItem,
                  { borderLeftWidth: rs(3), borderLeftColor: drugSeverityColor(di.severity) },
                ]}
              >
                <View style={[s.insightIconWrap, { backgroundColor: drugSeverityBg(di.severity) }]}>
                  <FlaskConical size={rs(16)} color={drugSeverityColor(di.severity)} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.insightTitle}>{di.drugs.join(' + ')}</Text>
                    <View style={[s.confirmChip, { backgroundColor: drugSeverityBg(di.severity) }]}>
                      <Text style={[s.confirmChipText, { color: drugSeverityColor(di.severity) }]}>
                        {t(`prontuario.drugInteractions.severity.${di.severity}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.insightRationale}>{di.warning}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Allergies */}
        {prontuario.allergies.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('health.allergies').toUpperCase()}</Text>
            {prontuario.allergies.map((a) => (
              <View key={a.id} style={[s.listItem, { borderLeftColor: colors.danger, borderLeftWidth: rs(3) }]}>
                <View style={[s.listIconWrap, { backgroundColor: colors.dangerSoft }]}>
                  <AlertTriangle size={rs(16)} color={colors.danger} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={[s.listItemTitle, { color: colors.danger }]}>{a.allergen}</Text>
                    <View style={[s.confirmChip, { backgroundColor: a.confirmed ? colors.dangerSoft : colors.warningSoft }]}>
                      <Text style={[s.confirmChipText, { color: a.confirmed ? colors.danger : colors.warning }]}>
                        {a.confirmed ? t('prontuario.allergyConfirmed') : t('prontuario.allergyUnconfirmed')}
                      </Text>
                    </View>
                  </View>
                  {a.reaction ? (
                    <Text style={s.listItemSub}>{a.reaction}{a.severity ? ` · ${a.severity}` : ''}</Text>
                  ) : null}
                  {(a.diagnosed_date || a.diagnosed_by) && (
                    <Text style={s.listItemDate}>
                      {[
                        a.diagnosed_date ? `${t('prontuario.allergyDiagnosedDate')}: ${formatDate(a.diagnosed_date)}` : null,
                        a.diagnosed_by ? `${t('prontuario.allergyDiagnosedBy')}: ${a.diagnosed_by}` : null,
                      ].filter(Boolean).join('  ·  ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Chronic conditions */}
        {prontuario.chronic_conditions.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.chronicConditions').toUpperCase()}</Text>
            <View style={s.chipsRow}>
              {prontuario.chronic_conditions.map((c, i) => (
                <View key={i} style={s.conditionChip}>
                  <Text style={s.conditionChipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Fase 2 — Body systems review (AI-derived clinical overview) */}
        {prontuario.body_systems_review && prontuario.body_systems_review.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.bodySystems.title').toUpperCase()}</Text>
            <Text style={s.subSectionHint}>{t('prontuario.bodySystems.hint')}</Text>
            <View style={s.systemsGrid}>
              {prontuario.body_systems_review.map((bs: ProntuarioBodySystemReview, i: number) => (
                <View
                  key={i}
                  style={[
                    s.systemCell,
                    { backgroundColor: bodyStatusBg(bs.status), borderColor: bodyStatusColor(bs.status) + '30' },
                  ]}
                >
                  <View style={s.systemHeader}>
                    <Activity size={rs(12)} color={bodyStatusColor(bs.status)} strokeWidth={2} />
                    <Text style={[s.systemStatus, { color: bodyStatusColor(bs.status) }]}>
                      {t(`prontuario.bodySystems.status.${bs.status}`)}
                    </Text>
                  </View>
                  <Text style={s.systemName}>{t(`prontuario.bodySystems.name.${bs.system}`)}</Text>
                  {bs.notes && <Text style={s.systemNotes} numberOfLines={2}>{bs.notes}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Surgeries — Fase 1: nova seção */}
        {prontuario.surgeries && prontuario.surgeries.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.surgeriesTitle').toUpperCase()}</Text>
            {prontuario.surgeries.map((surg: ProntuarioSurgery) => (
              <View key={surg.id} style={s.listItem}>
                <View style={[s.listIconWrap, { backgroundColor: colors.purpleSoft }]}>
                  <Scissors size={rs(16)} color={colors.purple} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.listItemTitle}>{surg.name}</Text>
                    {surg.status && (
                      <View style={[s.confirmChip, { backgroundColor: surgeryStatusBg(surg.status) }]}>
                        <Text style={[s.confirmChipText, { color: surgeryStatusColor(surg.status) }]}>
                          {t(`prontuario.surgeryStatus.${surg.status}`)}
                        </Text>
                      </View>
                    )}
                  </View>
                  {surg.date && (
                    <Text style={s.listItemSub}>{formatDate(surg.date)}</Text>
                  )}
                  {(surg.veterinarian || surg.clinic) && (
                    <Text style={s.listItemSub}>
                      {[
                        surg.veterinarian,
                        surg.clinic ? `${t('prontuario.surgeryClinic')}: ${surg.clinic}` : null,
                      ].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  {surg.anesthesia && (
                    <Text style={s.listItemDate}>
                      {t('prontuario.surgeryAnesthesia')}: {surg.anesthesia}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Last consultation */}
        {prontuario.last_consultation && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.lastConsultation').toUpperCase()}</Text>
            <View style={s.listItem}>
              <View style={s.listIconWrap}>
                <Stethoscope size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.listItemTitle}>{formatDate(prontuario.last_consultation.date)}</Text>
                  {prontuario.last_consultation.type && (
                    <View style={s.typeChip}>
                      <Text style={s.typeChipText}>{t(`prontuario.consultationType.${prontuario.last_consultation.type}`)}</Text>
                    </View>
                  )}
                </View>
                {prontuario.last_consultation.veterinarian && (
                  <Text style={s.listItemSub}>
                    {prontuario.last_consultation.veterinarian}
                    {prontuario.last_consultation.clinic ? ` · ${prontuario.last_consultation.clinic}` : ''}
                  </Text>
                )}
                {prontuario.last_consultation.diagnosis && (
                  <Text style={s.listItemDate}>{prontuario.last_consultation.diagnosis}</Text>
                )}
                {prontuario.last_consultation.prescriptions && (
                  <Text style={s.listItemDate}>
                    {t('prontuario.consultationPrescriptions')}: {prontuario.last_consultation.prescriptions}
                  </Text>
                )}
                {prontuario.last_consultation.follow_up_at && (
                  <Text style={[s.listItemDate, { color: colors.petrol }]}>
                    {t('prontuario.consultationFollowUp')}: {formatDate(prontuario.last_consultation.follow_up_at)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Fase 2 — Exam abnormal flags (AI-surfaced out-of-range lab values) */}
        {prontuario.exam_abnormal_flags && prontuario.exam_abnormal_flags.length > 0 ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.examFlags.title').toUpperCase()}</Text>
            <Text style={s.subSectionHint}>{t('prontuario.examFlags.hint')}</Text>
            {prontuario.exam_abnormal_flags.map((ef: ProntuarioExamAbnormalFlag, i: number) => (
              <View key={i} style={s.flagItem}>
                <View style={[s.flagIconWrap, { backgroundColor: examFlagColor(ef.flag) + '15' }]}>
                  <AlertTriangle size={rs(14)} color={examFlagColor(ef.flag)} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.titleRow}>
                    <Text style={s.flagParam}>{ef.parameter}</Text>
                    <View style={[s.confirmChip, { backgroundColor: examFlagColor(ef.flag) + '15' }]}>
                      <Text style={[s.confirmChipText, { color: examFlagColor(ef.flag) }]}>
                        {t(`prontuario.examFlags.flag.${ef.flag}`)}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.flagValue}>
                    <Text style={s.flagValueBold}>{ef.value}</Text>
                    {ef.reference ? ` · ${t('prontuario.examFlags.ref')}: ${ef.reference}` : ''}
                  </Text>
                  <Text style={s.flagExam}>{ef.exam_name}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Exam abnormal count — subtle info line (fallback when no detailed flags) */
          prontuario.exam_abnormal_count > 0 && (
            <View style={s.examAbnormalPill}>
              <AlertTriangle size={rs(12)} color={colors.warning} strokeWidth={2} />
              <Text style={s.examAbnormalText}>
                {t('prontuario.examAbnormalCount', { n: prontuario.exam_abnormal_count })}
              </Text>
            </View>
          )
        )}

        {/* Generated at */}
        <Text style={s.generatedAt}>
          {t('prontuario.generatedAt')}: {formatDate(prontuario.generated_at)}
          {'  ·  '}{t('prontuario.aiDisclaimer')}
        </Text>

        {/* Action buttons */}
        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.petrol }]}
            onPress={handleQrCode}
            activeOpacity={0.8}
          >
            <QrCode size={rs(18)} color="#fff" strokeWidth={2} />
            <Text style={s.actionBtnText}>{t('prontuario.emergencyQr')}</Text>
          </TouchableOpacity>
        </View>

        {/* Manage health records link */}
        <TouchableOpacity
          style={s.manageLink}
          onPress={() => router.push(`/pet/${id}/health` as never)}
          activeOpacity={0.7}
        >
          <ShieldCheck size={rs(14)} color={colors.textDim} strokeWidth={1.8} />
          <Text style={s.manageLinkText}>{t('prontuario.manageRecords')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Vaccine row sub-component ─────────────────────────────────────────────────

function VaccineRow({ vaccine: v, t }: { vaccine: ProntuarioVaccine; t: (k: string) => string }) {
  const hasExtra = v.laboratory || v.dose_number || v.clinic;
  return (
    <View style={[vr.item, v.is_overdue && vr.itemOverdue]}>
      <View style={[vr.iconWrap, { backgroundColor: v.is_overdue ? colors.dangerSoft : colors.successSoft }]}>
        {v.is_overdue
          ? <XCircle size={rs(16)} color={colors.danger} strokeWidth={1.8} />
          : <CheckCircle size={rs(16)} color={colors.success} strokeWidth={1.8} />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={vr.name}>{v.name}</Text>
        <Text style={vr.meta}>
          {v.date_administered ? `${t('health.vaccineDate')}: ${formatDate(v.date_administered)}` : ''}
          {v.next_due_date ? `  ·  ${t('health.vaccineNext')}: ${formatDate(v.next_due_date)}` : ''}
        </Text>
        {hasExtra && (
          <Text style={vr.extra}>
            {[
              v.laboratory ? `${t('prontuario.vaccineLab')}: ${v.laboratory}` : null,
              v.dose_number ? `${t('prontuario.vaccineDose')}: ${v.dose_number}` : null,
              v.clinic ? `${t('prontuario.vaccineClinic')}: ${v.clinic}` : null,
            ].filter(Boolean).join('  ·  ')}
          </Text>
        )}
      </View>
      {v.is_overdue && (
        <View style={vr.overdueTag}>
          <Text style={vr.overdueTagText}>{t('health.overdue')}</Text>
        </View>
      )}
    </View>
  );
}

const vr = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: rs(12), padding: rs(12), marginBottom: rs(8), gap: rs(10), borderWidth: 1, borderColor: colors.border },
  itemOverdue: { borderColor: colors.danger + '40' },
  iconWrap: { width: rs(34), height: rs(34), borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },
  meta: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },
  extra: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.petrol, marginTop: rs(3) },
  overdueTag: { backgroundColor: colors.dangerSoft, borderRadius: rs(6), paddingHorizontal: rs(8), paddingVertical: rs(3) },
  overdueTagText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), color: colors.danger },
});

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(16), paddingVertical: rs(10),
    gap: rs(12), borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text, textAlign: 'center' },

  // Fase 4 — Tab bar
  tabsScroll: {
    flexGrow: 0,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContent: {
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
    gap: rs(8),
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(12),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: {
    backgroundColor: colors.accentGlow,
    borderColor: colors.accent + '40',
  },
  tabLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    letterSpacing: 0.3,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), paddingBottom: rs(32) },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32), gap: rs(12) },
  aiSpinner: { width: rs(64), height: rs(64), borderRadius: rs(20), backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text, textAlign: 'center' },
  loadingSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(8), backgroundColor: colors.card, borderRadius: rs(12), paddingHorizontal: rs(20), paddingVertical: rs(12), borderWidth: 1, borderColor: colors.border, marginTop: rs(8) },
  retryText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.accent },

  identityCard: { backgroundColor: colors.card, borderRadius: rs(18), padding: rs(16), marginBottom: rs(16), borderWidth: 1, borderColor: colors.border },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(12), marginBottom: rs(12) },
  identityIconWrap: { width: rs(56), height: rs(56), borderRadius: rs(16), backgroundColor: colors.accentGlow, alignItems: 'center', justifyContent: 'center' },
  petAvatar: { width: rs(56), height: rs(56), borderRadius: rs(16), backgroundColor: colors.card },
  petName: { fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text },
  petMeta: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, marginTop: rs(2) },
  microchip: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  badge: { flexDirection: 'row', alignItems: 'center', gap: rs(4), borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(4) },
  badgeText: { fontFamily: 'Sora_700Bold', fontSize: fs(10) },

  // Fase 2 — Emergency card (first-responder critical info)
  emergencyCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: rs(16),
    padding: rs(14),
    marginBottom: rs(16),
    borderWidth: 1.5,
    borderColor: colors.danger + '40',
  },
  emergencyHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4) },
  emergencyTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.danger, letterSpacing: 1.5 },
  emergencySubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginBottom: rs(10) },
  emergencyRow: { marginTop: rs(8) },
  emergencyLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.8, marginBottom: rs(6), textTransform: 'uppercase' },
  emergencyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  emergencyDangerChip: {
    flexDirection: 'row', alignItems: 'center', gap: rs(4),
    backgroundColor: colors.card, borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
    borderWidth: 1, borderColor: colors.danger + '40',
  },
  emergencyDangerChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.danger },
  emergencyWarningChip: {
    backgroundColor: colors.warningSoft, borderRadius: rs(8),
    paddingHorizontal: rs(8), paddingVertical: rs(4),
    borderWidth: 1, borderColor: colors.warning + '30',
  },
  emergencyWarningChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.warning },
  emergencyText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.text, marginBottom: rs(2) },
  emergencyBold: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.text },
  emergencyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: rs(10),
    marginTop: rs(12), paddingTop: rs(10),
    borderTopWidth: 1, borderTopColor: colors.danger + '20',
  },
  emergencyGridItem: { flexDirection: 'row', alignItems: 'center', gap: rs(6), minWidth: rs(110) },
  emergencyGridLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.4, textTransform: 'uppercase' },
  emergencyGridValue: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.text },

  section: { marginBottom: rs(20) },
  sectionTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1.5, marginBottom: rs(10) },

  alertCard: { borderLeftWidth: rs(3), borderRadius: rs(10), padding: rs(12), marginBottom: rs(8) },
  alertHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(8) },
  alertMessage: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: fs(13) },
  alertAction: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(4), marginLeft: rs(22) },

  aiSummaryCard: { backgroundColor: colors.purpleSoft, borderRadius: rs(14), padding: rs(14), borderWidth: 1, borderColor: colors.purple + '30' },
  aiSummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  aiSummaryLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.purple },
  aiSummaryText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.text, lineHeight: fs(13) * 1.6 },

  listItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.card, borderRadius: rs(12), padding: rs(12), marginBottom: rs(8), gap: rs(10), borderWidth: 1, borderColor: colors.border },
  listIconWrap: { width: rs(34), height: rs(34), borderRadius: rs(10), backgroundColor: colors.petrolSoft, alignItems: 'center', justifyContent: 'center' },
  listItemTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },
  listItemSub: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },
  listItemDate: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, marginTop: rs(2) },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), flexWrap: 'wrap' },
  typeChip: { backgroundColor: colors.purpleSoft, borderRadius: rs(6), paddingHorizontal: rs(6), paddingVertical: rs(2) },
  typeChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(9), color: colors.purple, letterSpacing: 0.2 },
  confirmChip: { borderRadius: rs(6), paddingHorizontal: rs(6), paddingVertical: rs(2) },
  confirmChipText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), letterSpacing: 0.2 },

  demoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10), marginTop: rs(4), marginBottom: rs(10), paddingTop: rs(10), borderTopWidth: 1, borderTopColor: colors.border },
  demoItem: { minWidth: rs(90) },
  demoLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim, letterSpacing: 0.5, textTransform: 'uppercase' },
  demoValue: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.text, marginTop: rs(2) },

  examAbnormalPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), backgroundColor: colors.warningSoft, borderRadius: rs(10), paddingVertical: rs(8), paddingHorizontal: rs(12), marginBottom: rs(16), borderWidth: 1, borderColor: colors.warning + '30' },
  examAbnormalText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.warning },

  // Fase 2 — Sub-section hint (explanatory caption under section title)
  subSectionHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(-4),
    marginBottom: rs(10),
    lineHeight: fs(11) * 1.5,
  },

  // Fase 2 — Insight item (predispositions + drug_interactions)
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: rs(12),
    padding: rs(12),
    marginBottom: rs(8),
    gap: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightIconWrap: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text, flex: 1 },
  insightRationale: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginTop: rs(4),
    lineHeight: fs(12) * 1.5,
  },

  // Fase 2 — Preventive calendar items
  preventiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: rs(10),
    padding: rs(10),
    marginBottom: rs(6),
    gap: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  preventiveIconWrap: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  preventiveLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text, flex: 1 },
  preventiveMeta: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(2),
  },
  preventiveTypeTag: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.purple,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  // Fase 2 — Body systems review grid
  systemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  systemCell: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: rs(140),
    borderRadius: rs(10),
    padding: rs(10),
    borderWidth: 1,
  },
  systemHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(4), marginBottom: rs(4) },
  systemStatus: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  systemName: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.text },
  systemNotes: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(4),
    lineHeight: fs(10) * 1.4,
  },

  // Fase 2 — Exam abnormal flags
  flagItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: rs(12),
    padding: rs(12),
    marginBottom: rs(8),
    gap: rs(10),
    borderWidth: 1,
    borderColor: colors.border,
  },
  flagIconWrap: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagParam: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text, flex: 1 },
  flagValue: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginTop: rs(2),
  },
  flagValueBold: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  flagExam: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
  },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  conditionChip: { backgroundColor: colors.dangerSoft, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(6) },
  conditionChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.danger },

  generatedAt: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'center', marginTop: rs(8), marginBottom: rs(20) },

  actionsRow: { flexDirection: 'row', gap: rs(12) },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), borderRadius: rs(14), paddingVertical: rs(14) },
  actionBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: '#fff' },

  manageLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), marginTop: rs(20), marginBottom: rs(8) },
  manageLinkText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim },
});
