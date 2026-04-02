import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Shield, Check, AlertCircle, UserCheck, Star,
  AlertTriangle, Pill, Apple, ShieldAlert,
  Mail, Pencil, RefreshCw,
} from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

interface ChecklistItem {
  id: string;
  labelKey: string;
  done: boolean;
}

interface CriticalCard {
  id: string;
  labelKey: string;
  valueKey: string;
  icon: React.ElementType;
  color: string;
}

// ──────────────────────────────────────────
// Mock Data
// ──────────────────────────────────────────

const MOCK_CHECKLIST: ChecklistItem[] = [
  { id: '1', labelKey: 'testament.checkGuardian', done: true },
  { id: '2', labelKey: 'testament.checkAllergies', done: true },
  { id: '3', labelKey: 'testament.checkMedication', done: true },
  { id: '4', labelKey: 'testament.checkFeeding', done: true },
  { id: '5', labelKey: 'testament.checkVet', done: true },
  { id: '6', labelKey: 'testament.checkRoutine', done: true },
  { id: '7', labelKey: 'testament.checkLetter', done: true },
  { id: '8', labelKey: 'testament.checkVerification', done: false },
];

const MOCK_CRITICAL: CriticalCard[] = [
  { id: '1', labelKey: 'testament.allergiesLabel', valueKey: 'testament.allergiesValue', icon: AlertTriangle, color: colors.danger },
  { id: '2', labelKey: 'testament.medicationLabel', valueKey: 'testament.medicationValue', icon: Pill, color: colors.purple },
  { id: '3', labelKey: 'testament.feedingLabel', valueKey: 'testament.feedingValue', icon: Apple, color: colors.success },
  { id: '4', labelKey: 'testament.fearsLabel', valueKey: 'testament.fearsValue', icon: ShieldAlert, color: colors.warning },
];

// ──────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function ProtectionStatus({ t }: { t: TFunction }) {
  return (
    <View style={styles.card}>
      <View style={styles.protectionHeader}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.rose}18` }]}>
          <Shield size={rs(22)} color={colors.rose} strokeWidth={1.8} />
        </View>
        <View style={styles.protectionInfo}>
          <Text style={styles.protectionLabel}>{t('testament.title')}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.protectionScore}>87%</Text>
            <View style={[styles.badge, { backgroundColor: `${colors.success}18` }]}>
              <Text style={[styles.badgeText, { color: colors.success }]}>
                {t('testament.statusActive')}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: '87%' }]} />
      </View>
    </View>
  );
}

function Checklist({ t, items }: { t: (k: string) => string; items: ChecklistItem[] }) {
  const doneCount = items.filter((i) => i.done).length;
  return (
    <View style={styles.card}>
      <SectionLabel text={t('testament.checklist')} />
      <Text style={styles.checklistCount}>
        {(t as (k: string, opts: Record<string, unknown>) => string)('testament.checklistProgress', { done: doneCount, total: items.length })}
      </Text>
      {items.map((item) => (
        <View key={item.id} style={styles.checkRow}>
          {item.done ? (
            <Check size={rs(16)} color={colors.success} strokeWidth={2} />
          ) : (
            <AlertCircle size={rs(16)} color={colors.warning} strokeWidth={1.8} />
          )}
          <Text style={[styles.checkText, !item.done && styles.checkTextPending]}>
            {t(item.labelKey)}
          </Text>
          <View style={[styles.badge, {
            backgroundColor: item.done ? `${colors.success}18` : `${colors.warning}18`,
          }]}>
            <Text style={[styles.badgeText, {
              color: item.done ? colors.success : colors.warning,
            }]}>
              {item.done ? t('testament.done') : t('testament.pending')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function BackupGuardian({ t }: { t: TFunction }) {
  return (
    <View style={styles.card}>
      <SectionLabel text={t('testament.guardianSection')} />
      <View style={styles.guardianRow}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.rose}18` }]}>
          <UserCheck size={rs(22)} color={colors.rose} strokeWidth={1.8} />
        </View>
        <View style={styles.guardianInfo}>
          <Text style={styles.guardianName}>{t('testament.guardianName')}</Text>
          <Text style={styles.guardianRelation}>{t('testament.guardianRelation')}</Text>
          <View style={styles.guardianStats}>
            <Star size={rs(12)} color={colors.gold} strokeWidth={2} />
            <Text style={styles.guardianStatText}>4.9</Text>
            <Text style={styles.guardianStatDim}>{t('testament.guardianActivities', { count: 45 })}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: `${colors.success}18` }]}>
          <Text style={[styles.badgeText, { color: colors.success }]}>
            {t('testament.verified')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function CriticalInfo({ t, items }: { t: (k: string) => string; items: CriticalCard[] }) {
  return (
    <View style={styles.card}>
      <SectionLabel text={t('testament.criticalInfo')} />
      <View style={styles.criticalGrid}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <View key={item.id} style={styles.criticalItem}>
              <Icon size={rs(18)} color={item.color} strokeWidth={1.8} />
              <Text style={styles.criticalLabel}>{t(item.labelKey)}</Text>
              <Text style={styles.criticalValue}>{t(item.valueKey)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function PersonalLetter({ t }: { t: TFunction }) {
  return (
    <View style={[styles.card, { borderColor: `${colors.rose}30`, borderWidth: 1 }]}>
      <View style={styles.letterHeader}>
        <Mail size={rs(18)} color={colors.rose} strokeWidth={1.8} />
        <Text style={styles.letterTitle}>{t('testament.letterTitle')}</Text>
      </View>
      <Text style={styles.letterExcerpt}>{t('testament.letterExcerpt')}</Text>
      <TouchableOpacity style={styles.editBtn} activeOpacity={0.7}>
        <Pencil size={rs(14)} color={colors.accent} strokeWidth={1.8} />
        <Text style={styles.editBtnText}>{t('common.edit')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function Verification({ t }: { t: TFunction }) {
  return (
    <View style={styles.card}>
      <View style={styles.verificationRow}>
        <RefreshCw size={rs(18)} color={colors.petrol} strokeWidth={1.8} />
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationLabel}>{t('testament.verificationTitle')}</Text>
          <Text style={styles.verificationFreq}>{t('testament.verificationFreq')}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: `${colors.petrol}18` }]}>
          <Text style={[styles.badgeText, { color: colors.petrol }]}>
            {t('testament.nextVerification')}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────

export default function TestamentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: pet, isLoading } = usePet(id!);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Skeleton width="100%" height={rs(120)} radius={rs(22)} style={{ marginBottom: rs(16) }} />
        <Skeleton width="100%" height={rs(280)} radius={rs(22)} style={{ marginBottom: rs(16) }} />
        <Skeleton width="100%" height={rs(100)} radius={rs(22)} style={{ marginBottom: rs(16) }} />
        <Skeleton width="100%" height={rs(140)} radius={rs(22)} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <ProtectionStatus t={t} />
      <Checklist t={t} items={MOCK_CHECKLIST} />
      <BackupGuardian t={t} />
      <CriticalInfo t={t} items={MOCK_CRITICAL} />
      <PersonalLetter t={t} />
      <Verification t={t} />
      <View style={{ height: rs(32) }} />
    </ScrollView>
  );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: rs(16),
    gap: rs(14),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: rs(22),
    padding: rs(18),
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: rs(12),
  },

  // Protection Status
  protectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    marginBottom: rs(14),
  },
  iconCircle: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectionInfo: {
    flex: 1,
  },
  protectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    marginTop: rs(4),
  },
  protectionScore: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(28),
    color: colors.success,
  },
  progressTrack: {
    height: rs(4),
    backgroundColor: colors.border,
    borderRadius: rs(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: rs(2),
  },

  // Badges
  badge: {
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: rs(8),
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
  },

  // Checklist
  checklistCount: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginBottom: rs(10),
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    paddingVertical: rs(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkText: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.text,
  },
  checkTextPending: {
    color: colors.textSec,
  },

  // Guardian
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  guardianInfo: {
    flex: 1,
  },
  guardianName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: colors.text,
  },
  guardianRelation: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginTop: rs(2),
  },
  guardianStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    marginTop: rs(6),
  },
  guardianStatText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(12),
    color: colors.gold,
  },
  guardianStatDim: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginLeft: rs(4),
  },

  // Critical Info
  criticalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(10),
  },
  criticalItem: {
    width: '47%',
    backgroundColor: colors.bgCard,
    borderRadius: rs(14),
    padding: rs(12),
    gap: rs(6),
  },
  criticalLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
  },
  criticalValue: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.text,
  },

  // Letter
  letterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(10),
  },
  letterTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.rose,
  },
  letterExcerpt: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textSec,
    fontStyle: 'italic',
    lineHeight: fs(15) * 1.9,
    marginBottom: rs(12),
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: rs(6),
  },
  editBtnText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.accent,
  },

  // Verification
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  verificationInfo: {
    flex: 1,
  },
  verificationLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  verificationFreq: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    marginTop: rs(2),
  },
});
