/**
 * /pro/pet/[id] — "Ficha do Paciente" (visão profissional).
 *
 * Tela read-only que mostra um pet sob o ângulo do profissional:
 *   - Header com avatar, nome, raça, role do profissional.
 *   - Badge persistente "Visualizando como profissional" (2.5.4.4) — lembrete
 *     visual de que NÃO é o tutor; toda leitura é auditada.
 *   - 3 abas: Visão Geral · Clínico · Diário.
 *
 * Fontes de dados:
 *   - `useMyPatients()` → pega metadados do grant (role, tutor, scope_notes,
 *     expiry, can_see_finances) sem uma chamada extra ao banco. React Query
 *     já cacheou a lista em /pro.
 *   - `useProClinicalBundle(petId)` → vaccines/allergies/consultations/
 *     medications/exams/surgeries/clinical_metrics/diary_entries (subset
 *     clínico). RPC SECURITY DEFINER com audit automático (Bloco A).
 *   - `useProDiaryBundle(petId)` → diário completo paginado (50 por página).
 *     RPC SECURITY DEFINER com audit automático (2.5.4.1).
 *
 * Escrita:
 *   Desabilitada. Fase 2 entrega só leitura. Escrita (write_clinical,
 *   comment_thread) é Fase 3 — há TODO comments nos cards.
 *
 * Estados:
 *   - Loading inicial: skeleton cards.
 *   - 403 (PGRST/42501): mensagem de "sem permissão" + botão voltar.
 *   - Grant expirado/revogado durante a sessão: RPC retorna 403, cai no
 *     estado acima.
 *   - Offline: o React Query serve do cache (staleTime 30s); banner do
 *     NetworkGuard já é renderizado no layout raiz.
 *
 * Navegação: header tem ChevronLeft pra voltar a /pro.
 *
 * NÃO reusa os Tabs do tutor em `_health/tabs/` porque cada um traz
 * botão "Adicionar" que não faz sentido no contexto profissional
 * (escrita desabilitada). Reusa os átomos stateless
 * (ExpandableCard/InfoRow/EmptyState) da mesma pasta — esses são puros.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Dog, Cat, Shield, Stethoscope, Syringe,
  AlertTriangle, Pill, FileText, Scissors, Activity,
  BookOpen, User, MapPin, Wallet, CalendarClock, Eye, Smile,
} from 'lucide-react-native';

import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { rs, fs } from '../../../../hooks/useResponsive';
import { formatDate } from '../../../../utils/format';
import { useMyPatients, type MyPatient } from '../../../../hooks/useMyPatients';
import {
  useProClinicalBundle,
  type ClinicalMetric,
} from '../../../../hooks/useProClinicalBundle';
import { useProDiaryBundle } from '../../../../hooks/useProDiaryBundle';
import { ExpandableCard, InfoRow, EmptyState } from '../../../../components/health/components';
import type {
  Vaccine, Allergy, Consultation, Medication, Exam, Surgery, DiaryEntry,
} from '../../../../types/database';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'clinical' | 'diary';

interface TabDef {
  id: TabId;
  labelKey: string;
  icon: (props: { size: number; color: string; strokeWidth: number }) => React.ReactElement;
}

const TABS: TabDef[] = [
  { id: 'overview', labelKey: 'pro.petView.tabOverview', icon: (p) => <Eye {...p} /> },
  { id: 'clinical', labelKey: 'pro.petView.tabClinical', icon: (p) => <Stethoscope {...p} /> },
  { id: 'diary',    labelKey: 'pro.petView.tabDiary',    icon: (p) => <BookOpen {...p} /> },
];

// ── Badge persistente "Visualizando como profissional" (2.5.4.4) ──────────────

function ProContextBadge({ role }: { role: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.contextBadge}>
      <Shield size={rs(13)} color={colors.purple} strokeWidth={2} />
      <Text style={styles.contextBadgeText}>
        {t('pro.petView.contextBadge', {
          role: t(`pro.patients.roles.${role}`, { defaultValue: role }),
        })}
      </Text>
    </View>
  );
}

// ── Tab bar horizontal ────────────────────────────────────────────────────────

function TabsBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.tabsBar}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const tint = isActive ? colors.click : colors.textDim;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBtn, isActive && styles.tabBtnActive]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.7}
          >
            {tab.icon({ size: rs(16), color: tint, strokeWidth: 1.8 })}
            <Text style={[styles.tabLabel, { color: tint }]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Secção de card genérica (com ícone de cor semântica) ───────────────────────

function SectionHeader({
  icon, color, title, count,
}: {
  icon: React.ReactElement;
  color: string;
  title: string;
  count: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: color + '1F' }]}>
        {icon}
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    </View>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ patient, clinicalLoading }: { patient: MyPatient; clinicalLoading: boolean }) {
  const { t } = useTranslation();

  const tutorLocation = [patient.tutor_city, patient.tutor_country]
    .filter(Boolean)
    .join(', ');

  const acceptedAt = patient.accepted_at ? formatDate(patient.accepted_at) : '—';
  const expiresAt = patient.expires_at
    ? formatDate(patient.expires_at)
    : t('pro.petView.noExpiry');

  return (
    <View style={styles.tabContent}>
      {/* Briefing do tutor — caixa de destaque */}
      {patient.scope_notes ? (
        <View style={styles.briefingBox}>
          <Text style={styles.briefingLabel}>
            {t('pro.patients.scopeNotesLabel')}
          </Text>
          <Text style={styles.briefingText}>{patient.scope_notes}</Text>
        </View>
      ) : null}

      {/* Pet info */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewCardTitle}>{t('pro.petView.petInfo')}</Text>
        <InfoRow
          label={t('pro.petView.species')}
          value={patient.species === 'dog' ? t('pets.dog') : t('pets.cat')}
          isFirst
        />
        {patient.breed ? (
          <InfoRow label={t('pro.petView.breed')} value={patient.breed} />
        ) : null}
        {patient.birth_date ? (
          <InfoRow
            label={t('pro.petView.birthDate')}
            value={formatDate(patient.birth_date)}
          />
        ) : null}
        {patient.current_mood ? (
          <InfoRow
            label={t('pro.petView.currentMood')}
            value={t(`moods.${patient.current_mood}`, { defaultValue: patient.current_mood })}
          />
        ) : null}
        {patient.health_score != null ? (
          <InfoRow
            label={t('pro.petView.healthScore')}
            value={`${patient.health_score}/100`}
          />
        ) : null}
        {patient.happiness_score != null ? (
          <InfoRow
            label={t('pro.petView.happinessScore')}
            value={`${patient.happiness_score}/100`}
          />
        ) : null}
      </View>

      {/* Tutor info */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewCardTitle}>{t('pro.petView.tutorInfo')}</Text>
        <InfoRow
          label={t('pro.petView.tutorName')}
          value={patient.tutor_name ?? t('pro.patients.unknownTutor')}
          isFirst
        />
        {tutorLocation ? (
          <InfoRow label={t('pro.petView.tutorLocation')} value={tutorLocation} />
        ) : null}
      </View>

      {/* Grant info */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewCardTitle}>{t('pro.petView.grantInfo')}</Text>
        <InfoRow
          label={t('pro.petView.role')}
          value={t(`pro.patients.roles.${patient.role}`, { defaultValue: patient.role })}
          isFirst
        />
        <InfoRow label={t('pro.petView.grantedAt')} value={acceptedAt} />
        <InfoRow label={t('pro.petView.expiresAt')} value={expiresAt} />
        <InfoRow
          label={t('pro.petView.financesAccess')}
          value={patient.can_see_finances ? t('common.yes') : t('common.no')}
        />
      </View>

      {/* Hint de auditoria */}
      <View style={styles.auditHint}>
        <Shield size={rs(13)} color={colors.petrol} strokeWidth={1.8} />
        <Text style={styles.auditHintText}>
          {clinicalLoading
            ? t('pro.petView.auditLoading')
            : t('pro.petView.auditHint')}
        </Text>
      </View>
    </View>
  );
}

// ── Clinical tab ──────────────────────────────────────────────────────────────

function ClinicalTab({
  vaccines, allergies, consultations, medications,
  exams, surgeries, metrics, isLoading, error,
}: {
  vaccines: Vaccine[];
  allergies: Allergy[];
  consultations: Consultation[];
  medications: Medication[];
  exams: Exam[];
  surgeries: Surgery[];
  metrics: ClinicalMetric[];
  isLoading: boolean;
  error: unknown;
}) {
  const { t } = useTranslation();

  if (error) {
    return <PermissionDenied messageKey="pro.petView.clinicalDenied" />;
  }

  if (isLoading) {
    return <SkeletonList />;
  }

  const totalRecords =
    vaccines.length + allergies.length + consultations.length +
    medications.length + exams.length + surgeries.length + metrics.length;

  if (totalRecords === 0) {
    return (
      <View style={styles.tabContent}>
        <EmptyState
          message={t('pro.petView.clinicalEmpty')}
          hint={t('pro.petView.clinicalEmptyHint')}
        />
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {/* Vaccines */}
      {vaccines.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<Syringe size={rs(16)} color={colors.success} strokeWidth={1.8} />}
            color={colors.success}
            title={t('health.tabVaccines')}
            count={vaccines.length}
          />
          {vaccines.map((v) => {
            const overdue = v.next_due_date != null && new Date(v.next_due_date) < new Date();
            const statusColor = overdue ? colors.danger : colors.success;
            return (
              <ExpandableCard
                key={v.id}
                header={
                  <View style={styles.cardHeader}>
                    <Syringe size={rs(14)} color={statusColor} strokeWidth={1.8} />
                    <View style={styles.cardHeaderInfo}>
                      <Text style={styles.cardHeaderTitle}>{v.name}</Text>
                      <Text style={styles.cardHeaderSub}>{formatDate(v.date_administered)}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusColor + '1F' }]}>
                      <Text style={[styles.badgeText, { color: statusColor }]}>
                        {overdue ? t('health.vaccineOverdue') : t('health.upToDate')}
                      </Text>
                    </View>
                  </View>
                }
              >
                <View style={styles.cardBody}>
                  <InfoRow label={t('health.dateAdministered')} value={formatDate(v.date_administered)} isFirst />
                  {v.next_due_date ? <InfoRow label={t('health.nextDue')} value={formatDate(v.next_due_date)} /> : null}
                  {v.batch_number ? <InfoRow label={t('health.batch')} value={v.batch_number} /> : null}
                  {v.veterinarian ? <InfoRow label={t('health.vet')} value={v.veterinarian} /> : null}
                  {v.clinic ? <InfoRow label={t('health.clinic')} value={v.clinic} /> : null}
                  {v.notes ? <InfoRow label={t('health.notes')} value={v.notes} /> : null}
                </View>
              </ExpandableCard>
            );
          })}
        </View>
      ) : null}

      {/* Allergies */}
      {allergies.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<AlertTriangle size={rs(16)} color={colors.warning} strokeWidth={1.8} />}
            color={colors.warning}
            title={t('pro.petView.allergies')}
            count={allergies.length}
          />
          {allergies.map((a) => (
            <ExpandableCard
              key={a.id}
              header={
                <View style={styles.cardHeader}>
                  <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={1.8} />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardHeaderTitle}>{a.allergen}</Text>
                    {a.reaction ? (
                      <Text style={styles.cardHeaderSub} numberOfLines={1}>{a.reaction}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: severityColor(a.severity) + '1F' }]}>
                    <Text style={[styles.badgeText, { color: severityColor(a.severity) }]}>
                      {t(`health.severity${capitalize(a.severity)}`, { defaultValue: a.severity })}
                    </Text>
                  </View>
                </View>
              }
            >
              <View style={styles.cardBody}>
                {a.reaction ? <InfoRow label={t('health.reaction')} value={a.reaction} isFirst /> : null}
                {a.diagnosed_date ? (
                  <InfoRow label={t('health.diagnosedDate')} value={formatDate(a.diagnosed_date)} />
                ) : null}
                {a.diagnosed_by ? <InfoRow label={t('health.diagnosedBy')} value={a.diagnosed_by} /> : null}
              </View>
            </ExpandableCard>
          ))}
        </View>
      ) : null}

      {/* Consultations */}
      {consultations.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<Stethoscope size={rs(16)} color={colors.petrol} strokeWidth={1.8} />}
            color={colors.petrol}
            title={t('health.tabConsultations')}
            count={consultations.length}
          />
          {consultations.map((c) => (
            <ExpandableCard
              key={c.id}
              header={
                <View style={styles.cardHeader}>
                  <Stethoscope size={rs(14)} color={colors.petrol} strokeWidth={1.8} />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardHeaderTitle}>
                      {formatDate(c.date)}{c.time ? ` · ${c.time.substring(0, 5)}` : ''}
                    </Text>
                    <Text style={styles.cardHeaderSub} numberOfLines={1}>
                      {c.veterinarian}{c.clinic ? ` · ${c.clinic}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.petrol + '1F' }]}>
                    <Text style={[styles.badgeText, { color: colors.petrol }]}>
                      {t(`health.consultType.${c.type}`, { defaultValue: c.type })}
                    </Text>
                  </View>
                </View>
              }
            >
              <View style={styles.cardBody}>
                {c.summary ? <InfoRow label={t('health.summary')} value={c.summary} isFirst /> : null}
                {/* diagnosis has wider type than string in some schemas — stringify defensively */}
                {(c as unknown as { diagnosis?: string }).diagnosis &&
                  (c as unknown as { diagnosis?: string }).diagnosis !== c.summary ? (
                    <InfoRow
                      label={t('health.diagnosis')}
                      value={String((c as unknown as { diagnosis?: string }).diagnosis)}
                    />
                  ) : null}
                {c.notes ? <InfoRow label={t('health.notes')} value={c.notes} /> : null}
              </View>
            </ExpandableCard>
          ))}
        </View>
      ) : null}

      {/* Medications */}
      {medications.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<Pill size={rs(16)} color={colors.purple} strokeWidth={1.8} />}
            color={colors.purple}
            title={t('health.tabMedications')}
            count={medications.length}
          />
          {medications.map((m) => (
            <ExpandableCard
              key={m.id}
              header={
                <View style={styles.cardHeader}>
                  <Pill size={rs(14)} color={colors.purple} strokeWidth={1.8} />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardHeaderTitle}>{m.name}</Text>
                    <Text style={styles.cardHeaderSub} numberOfLines={1}>
                      {m.frequency}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: (m.active ? colors.success : colors.textDim) + '1F' }]}>
                    <Text style={[styles.badgeText, { color: m.active ? colors.success : colors.textDim }]}>
                      {m.active ? t('health.active') : t('health.ended')}
                    </Text>
                  </View>
                </View>
              }
            >
              <View style={styles.cardBody}>
                {m.dosage ? <InfoRow label={t('health.dosage')} value={m.dosage} isFirst /> : null}
                <InfoRow label={t('health.frequency')} value={m.frequency} isFirst={!m.dosage} />
                <InfoRow label={t('health.startDate')} value={formatDate(m.start_date)} />
                {m.end_date ? <InfoRow label={t('health.endDate')} value={formatDate(m.end_date)} /> : null}
                {m.reason ? <InfoRow label={t('health.reason')} value={m.reason} /> : null}
                {m.prescribed_by ? <InfoRow label={t('health.prescribedBy')} value={m.prescribed_by} /> : null}
              </View>
            </ExpandableCard>
          ))}
        </View>
      ) : null}

      {/* Exams */}
      {exams.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<FileText size={rs(16)} color={colors.sky} strokeWidth={1.8} />}
            color={colors.sky}
            title={t('health.tabExams')}
            count={exams.length}
          />
          {exams.map((e) => (
            <ExpandableCard
              key={e.id}
              header={
                <View style={styles.cardHeader}>
                  <FileText size={rs(14)} color={colors.sky} strokeWidth={1.8} />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardHeaderTitle}>{e.name}</Text>
                    <Text style={styles.cardHeaderSub}>{formatDate(e.date)}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: examStatusColor(e.status) + '1F' }]}>
                    <Text style={[styles.badgeText, { color: examStatusColor(e.status) }]}>
                      {t(`health.examStatus.${e.status}`, { defaultValue: e.status })}
                    </Text>
                  </View>
                </View>
              }
            >
              <View style={styles.cardBody}>
                <InfoRow label={t('health.date')} value={formatDate(e.date)} isFirst />
                {e.laboratory ? <InfoRow label={t('health.laboratory')} value={e.laboratory} /> : null}
                {e.veterinarian ? <InfoRow label={t('health.vet')} value={e.veterinarian} /> : null}
                {e.notes ? <InfoRow label={t('health.notes')} value={e.notes} /> : null}
              </View>
            </ExpandableCard>
          ))}
        </View>
      ) : null}

      {/* Surgeries */}
      {surgeries.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<Scissors size={rs(16)} color={colors.rose} strokeWidth={1.8} />}
            color={colors.rose}
            title={t('health.tabSurgeries')}
            count={surgeries.length}
          />
          {surgeries.map((s) => (
            <ExpandableCard
              key={s.id}
              header={
                <View style={styles.cardHeader}>
                  <Scissors size={rs(14)} color={colors.rose} strokeWidth={1.8} />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardHeaderTitle}>{s.name}</Text>
                    <Text style={styles.cardHeaderSub}>{formatDate(s.date)}</Text>
                  </View>
                </View>
              }
            >
              <View style={styles.cardBody}>
                <InfoRow label={t('health.date')} value={formatDate(s.date)} isFirst />
                {s.veterinarian ? <InfoRow label={t('health.vet')} value={s.veterinarian} /> : null}
                {s.clinic ? <InfoRow label={t('health.clinic')} value={s.clinic} /> : null}
                {s.notes ? <InfoRow label={t('health.notes')} value={s.notes} /> : null}
              </View>
            </ExpandableCard>
          ))}
        </View>
      ) : null}

      {/* Clinical metrics */}
      {metrics.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            icon={<Activity size={rs(16)} color={colors.click} strokeWidth={1.8} />}
            color={colors.click}
            title={t('health.tabMetrics')}
            count={metrics.length}
          />
          {metrics.slice(0, 20).map((m) => (
            <ExpandableCard
              key={m.id}
              header={
                <View style={styles.cardHeader}>
                  <Activity size={rs(14)} color={colors.click} strokeWidth={1.8} />
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.cardHeaderTitle}>
                      {m.marker_name ?? m.metric_type}
                    </Text>
                    <Text style={styles.cardHeaderSub}>
                      {m.value != null ? `${m.value}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                      {m.measured_at ? ` · ${formatDate(m.measured_at)}` : ''}
                    </Text>
                  </View>
                  {m.is_abnormal ? (
                    <View style={[styles.badge, { backgroundColor: colors.danger + '1F' }]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>
                        {t('pro.petView.abnormal')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              }
            >
              <View style={styles.cardBody}>
                <InfoRow label={t('pro.petView.metricType')} value={m.metric_type} isFirst />
                {m.reference_min != null && m.reference_max != null ? (
                  <InfoRow
                    label={t('pro.petView.referenceRange')}
                    value={`${m.reference_min} – ${m.reference_max}${m.unit ? ` ${m.unit}` : ''}`}
                  />
                ) : null}
                {m.status ? <InfoRow label={t('pro.petView.status')} value={m.status} /> : null}
                {m.notes ? <InfoRow label={t('health.notes')} value={m.notes} /> : null}
              </View>
            </ExpandableCard>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// ── Diary tab ─────────────────────────────────────────────────────────────────

function DiaryTab({
  entries, total, hasNextPage, isLoading, isFetchingNextPage, error, onLoadMore,
}: {
  entries: DiaryEntry[];
  total: number;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: unknown;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation();

  if (error) {
    return <PermissionDenied messageKey="pro.petView.diaryDenied" />;
  }

  if (isLoading && entries.length === 0) {
    return <SkeletonList />;
  }

  if (entries.length === 0) {
    return (
      <View style={styles.tabContent}>
        <EmptyState
          message={t('pro.petView.diaryEmpty')}
          hint={t('pro.petView.diaryEmptyHint')}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <DiaryEntryCard entry={item} />}
      contentContainerStyle={styles.tabContent}
      ListHeaderComponent={
        <Text style={styles.diaryCount}>
          {t('pro.petView.diaryCount', { shown: entries.length, total })}
        </Text>
      }
      ListFooterComponent={
        hasNextPage ? (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={onLoadMore}
            disabled={isFetchingNextPage}
            activeOpacity={0.7}
          >
            {isFetchingNextPage ? (
              <ActivityIndicator size={rs(16)} color={colors.click} />
            ) : (
              <Text style={styles.loadMoreText}>{t('pro.petView.loadMore')}</Text>
            )}
          </TouchableOpacity>
        ) : null
      }
      onEndReached={hasNextPage && !isFetchingNextPage ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      showsVerticalScrollIndicator={false}
    />
  );
}

function DiaryEntryCard({ entry }: { entry: DiaryEntry }) {
  const { t } = useTranslation();
  const date = entry.entry_date ?? entry.created_at;

  return (
    <View style={styles.diaryCard}>
      <View style={styles.diaryHeader}>
        <Text style={styles.diaryDate}>{formatDate(date)}</Text>
        {entry.mood_id ? (
          <View style={styles.diaryMood}>
            <Smile size={rs(11)} color={colors.click} strokeWidth={1.8} />
            <Text style={styles.diaryMoodText}>
              {t(`moods.${entry.mood_id}`, { defaultValue: entry.mood_id })}
            </Text>
          </View>
        ) : null}
      </View>
      {entry.content ? (
        <Text style={styles.diaryContent}>{entry.content}</Text>
      ) : null}
      {entry.narration ? (
        <View style={styles.narrationBox}>
          <Text style={styles.narrationLabel}>{t('pro.petView.narration')}</Text>
          <Text style={styles.narrationText}>{entry.narration}</Text>
        </View>
      ) : null}
      {entry.tags && entry.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {entry.tags.slice(0, 5).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {entry.photos && entry.photos.length > 0 ? (
        <View style={styles.photosRow}>
          {entry.photos.slice(0, 3).map((photo, i) => (
            <Image key={i} source={{ uri: photo }} style={styles.photo} />
          ))}
          {entry.photos.length > 3 ? (
            <View style={styles.photoMore}>
              <Text style={styles.photoMoreText}>+{entry.photos.length - 3}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PermissionDenied({ messageKey }: { messageKey: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.tabContent}>
      <View style={styles.denyBox}>
        <Shield size={rs(36)} color={colors.textDim} strokeWidth={1.6} />
        <Text style={styles.denyTitle}>{t('pro.petView.accessDeniedTitle')}</Text>
        <Text style={styles.denyText}>{t(messageKey)}</Text>
      </View>
    </View>
  );
}

function SkeletonList() {
  return (
    <View style={styles.tabContent}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.skeleton}>
          <View style={[styles.skeletonLine, { width: '70%' }]} />
          <View style={[styles.skeletonLine, { width: '40%', marginTop: rs(6) }]} />
        </View>
      ))}
    </View>
  );
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'severe': return colors.danger;
    case 'moderate': return colors.click;
    case 'mild': return colors.warning;
    default: return colors.textDim;
  }
}

function examStatusColor(status: string): string {
  switch (status) {
    case 'critical':
    case 'abnormal': return colors.danger;
    case 'attention': return colors.warning;
    case 'normal': return colors.success;
    case 'pending': return colors.textDim;
    default: return colors.textDim;
  }
}

function capitalize(s: string): string {
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ProPetViewScreen() {
  const { id } = useLocalSearchParams<{ id: string; grantId?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Patient metadata (grant, tutor, role, scope_notes) — do cache de /pro
  const { patients } = useMyPatients();
  const patient = useMemo(
    () => patients.find((p) => p.pet_id === id) ?? null,
    [patients, id],
  );

  // Clinical bundle
  const {
    vaccines, allergies, consultations, medications,
    exams, surgeries, clinicalMetrics,
    isLoading: clinicalLoading,
    isFetching: clinicalFetching,
    error: clinicalError,
    refetch: refetchClinical,
  } = useProClinicalBundle(id);

  // Diary bundle (paginated)
  const {
    entries: diaryEntries,
    total: diaryTotal,
    hasNextPage: diaryHasNext,
    fetchNextPage: fetchNextDiary,
    isFetchingNextPage: diaryFetchingNext,
    isLoading: diaryLoading,
    error: diaryError,
    refetch: refetchDiary,
  } = useProDiaryBundle(id);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchClinical(), refetchDiary()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchClinical, refetchDiary]);

  const handleLoadMore = useCallback(() => {
    if (diaryHasNext && !diaryFetchingNext) {
      fetchNextDiary();
    }
  }, [diaryHasNext, diaryFetchingNext, fetchNextDiary]);

  // Guard: patient não encontrado no cache (acesso direto por URL sem passar
  // por /pro, ou grant revogado entre as chamadas). Voltar pro /pro — a RPC
  // de ambos os bundles vai 403 se o grant não existir mais, mas é melhor
  // não expor a tela quebrada por um frame.
  if (!patient) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <ChevronLeft size={rs(24)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('pro.petView.title')}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.tabContent}>
          <EmptyState
            message={t('pro.petView.patientNotFound')}
            hint={t('pro.petView.patientNotFoundHint')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const isDog = patient.species === 'dog';
  const petColor = isDog ? colors.click : colors.purple;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={rs(24)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {patient.pet_name}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Pet summary row (avatar + name + breed + tutor) */}
      <View style={styles.summaryRow}>
        <View style={[styles.avatarOuter, { borderColor: petColor + '40' }]}>
          {patient.avatar_url ? (
            <Image source={{ uri: patient.avatar_url }} style={styles.avatarImage} />
          ) : (
            <>
              <View style={[styles.avatarGlow, { backgroundColor: petColor + '10' }]} />
              {isDog ? (
                <Dog size={rs(28)} color={colors.click} strokeWidth={1.8} />
              ) : (
                <Cat size={rs(28)} color={colors.purple} strokeWidth={1.8} />
              )}
            </>
          )}
        </View>
        <View style={styles.summaryInfo}>
          <Text style={styles.summaryName} numberOfLines={1}>{patient.pet_name}</Text>
          <Text style={styles.summarySub} numberOfLines={1}>
            {patient.breed ?? (isDog ? t('pets.dog') : t('pets.cat'))}
          </Text>
          <View style={styles.summaryTutorRow}>
            <User size={rs(11)} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.summaryTutor} numberOfLines={1}>
              {patient.tutor_name ?? t('pro.patients.unknownTutor')}
            </Text>
          </View>
        </View>
      </View>

      {/* Badge persistente de contexto profissional (2.5.4.4) */}
      <ProContextBadge role={patient.role} />

      {/* Tabs */}
      <TabsBar active={activeTab} onChange={setActiveTab} />

      {/* Content */}
      {activeTab === 'diary' ? (
        // Diary usa FlatList próprio (scroll virtual pra paginação)
        <DiaryTab
          entries={diaryEntries}
          total={diaryTotal}
          hasNextPage={diaryHasNext}
          isLoading={diaryLoading}
          isFetchingNextPage={diaryFetchingNext}
          error={diaryError}
          onLoadMore={handleLoadMore}
        />
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (clinicalFetching && !clinicalLoading)}
              onRefresh={onRefresh}
              tintColor={colors.click}
              colors={[colors.click]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' ? (
            <OverviewTab patient={patient} clinicalLoading={clinicalLoading} />
          ) : (
            <ClinicalTab
              vaccines={vaccines}
              allergies={allergies}
              consultations={consultations}
              medications={medications}
              exams={exams}
              surgeries={surgeries}
              metrics={clinicalMetrics}
              isLoading={clinicalLoading}
              error={clinicalError}
            />
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.sm),
    paddingBottom: rs(spacing.sm),
  },
  backBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: colors.click + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
  },
  headerRight: {
    width: rs(36),
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.sm),
  },
  avatarOuter: {
    width: rs(52),
    height: rs(52),
    borderRadius: rs(16),
    borderWidth: rs(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: rs(13),
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: rs(16),
  },
  summaryInfo: {
    flex: 1,
    marginLeft: rs(12),
  },
  summaryName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  summarySub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    marginTop: rs(2),
  },
  summaryTutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    marginTop: rs(5),
  },
  summaryTutor: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.textSec,
    flexShrink: 1,
  },
  // Context badge (persistente)
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginHorizontal: rs(spacing.md),
    marginBottom: rs(spacing.sm),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(radii.md),
    backgroundColor: colors.purple + '1F',
    borderWidth: rs(1),
    borderColor: colors.purple + '40',
  },
  contextBadgeText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(11),
    color: colors.purple,
    flex: 1,
    letterSpacing: rs(0.2),
  },
  // Tabs
  tabsBar: {
    flexDirection: 'row',
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.sm),
    gap: rs(8),
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    paddingVertical: rs(10),
    borderRadius: rs(radii.md),
    backgroundColor: colors.card,
    borderWidth: rs(1),
    borderColor: colors.border,
  },
  tabBtnActive: {
    borderColor: colors.click + '60',
    backgroundColor: colors.click + '12',
  },
  tabLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
  },
  // Content
  tabContent: {
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.xxl),
  },
  section: {
    marginBottom: rs(spacing.lg),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    marginBottom: rs(spacing.sm),
    paddingTop: rs(spacing.xs),
  },
  sectionIcon: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
    letterSpacing: rs(0.3),
  },
  sectionCount: {
    minWidth: rs(28),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.sm),
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
  },
  // Overview
  briefingBox: {
    padding: rs(spacing.md),
    backgroundColor: colors.purple + '0F',
    borderRadius: rs(radii.card),
    borderLeftWidth: rs(3),
    borderLeftColor: colors.purple,
    marginBottom: rs(spacing.md),
  },
  briefingLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.purple,
    letterSpacing: rs(1),
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  briefingText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.text,
    lineHeight: rs(19),
  },
  overviewCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: rs(1),
    borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  overviewCardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.textDim,
    letterSpacing: rs(1),
    textTransform: 'uppercase',
    marginBottom: rs(spacing.sm),
  },
  auditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    padding: rs(spacing.sm),
    borderRadius: rs(radii.md),
    backgroundColor: colors.petrol + '0F',
    borderWidth: rs(1),
    borderColor: colors.petrol + '30',
    marginTop: rs(spacing.sm),
  },
  auditHintText: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    lineHeight: rs(16),
  },
  // Card (clinical)
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flex: 1,
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardHeaderTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  cardHeaderSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(2),
  },
  cardBody: {
    paddingTop: rs(spacing.sm),
  },
  badge: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.sm),
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    letterSpacing: rs(0.3),
    textTransform: 'uppercase',
  },
  // Diary card
  diaryCount: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(11),
    color: colors.textDim,
    marginBottom: rs(spacing.sm),
    letterSpacing: rs(0.3),
  },
  diaryCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: rs(1),
    borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  diaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(spacing.sm),
  },
  diaryDate: {
    fontFamily: 'JetBrainsMono_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
    letterSpacing: rs(0.3),
  },
  diaryMood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.sm),
    backgroundColor: colors.click + '12',
  },
  diaryMoodText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.click,
  },
  diaryContent: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.text,
    lineHeight: rs(19),
    marginBottom: rs(spacing.sm),
  },
  narrationBox: {
    padding: rs(10),
    backgroundColor: colors.bgCard,
    borderRadius: rs(radii.md),
    borderLeftWidth: rs(3),
    borderLeftColor: colors.click,
    marginBottom: rs(spacing.sm),
  },
  narrationLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    color: colors.textDim,
    letterSpacing: rs(1),
    textTransform: 'uppercase',
    marginBottom: rs(3),
  },
  narrationText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: rs(17),
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
    marginBottom: rs(spacing.sm),
  },
  tag: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(radii.sm),
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
  },
  tagText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
  },
  photosRow: {
    flexDirection: 'row',
    gap: rs(6),
  },
  photo: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(radii.md),
  },
  photoMore: {
    width: rs(60),
    height: rs(60),
    borderRadius: rs(radii.md),
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoMoreText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  // Load more
  loadMoreBtn: {
    paddingVertical: rs(spacing.md),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(radii.md),
    backgroundColor: colors.card,
    borderWidth: rs(1),
    borderColor: colors.border,
    marginTop: rs(spacing.sm),
  },
  loadMoreText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.click,
    letterSpacing: rs(0.3),
  },
  // Permission denied
  denyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(spacing.xxl),
    paddingHorizontal: rs(spacing.lg),
  },
  denyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
    textAlign: 'center',
    marginTop: rs(spacing.md),
    marginBottom: rs(spacing.xs),
  },
  denyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: rs(19),
  },
  // Skeleton
  skeleton: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: rs(1),
    borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  skeletonLine: {
    height: rs(12),
    borderRadius: rs(4),
    backgroundColor: colors.bgCard,
  },
});
