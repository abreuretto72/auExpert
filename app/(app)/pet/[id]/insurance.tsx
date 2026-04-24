import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Shield, ShieldCheck, Calendar, Sparkles, Phone,
  TrendingUp, ChevronRight,
} from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
interface Plan {
  id: string;
  nameKey: string;
  providerKey: string;
  price: number;
  renewalKey: string;
  icon: React.ElementType;
  tintColor: string;
  coverageKeys: string[];
}

interface Contact {
  id: string;
  nameKey: string;
  phoneKey: string;
  tintColor: string;
}

// ──────────────────────────────────────────
// Mock Data
// ──────────────────────────────────────────
const ACTIVE_PLANS: Plan[] = [
  {
    id: 'p1',
    nameKey: 'insurance.planHealthName',
    providerKey: 'insurance.planHealthProvider',
    price: 89.90,
    renewalKey: 'insurance.planHealthRenewal',
    icon: ShieldCheck,
    tintColor: colors.petrol,
    coverageKeys: [
      'insurance.coverConsultations',
      'insurance.coverExams',
      'insurance.coverEmergency',
      'insurance.coverVaccines',
    ],
  },
  {
    id: 'p2',
    nameKey: 'insurance.planAccidentName',
    providerKey: 'insurance.planAccidentProvider',
    price: 99.00,
    renewalKey: 'insurance.planAccidentRenewal',
    icon: Shield,
    tintColor: colors.purple,
    coverageKeys: [
      'insurance.coverAccidents',
      'insurance.coverSurgery',
      'insurance.coverRehab',
    ],
  },
];

const CONTACTS: Contact[] = [
  { id: 'c1', nameKey: 'insurance.contactHealthName', phoneKey: 'insurance.contactHealthPhone', tintColor: colors.petrol },
  { id: 'c2', nameKey: 'insurance.contactAccidentName', phoneKey: 'insurance.contactAccidentPhone', tintColor: colors.purple },
];

// ──────────────────────────────────────────
// Section Header
// ──────────────────────────────────────────
function SectionHeader({ label, icon: Icon, iconColor }: { label: string; icon?: React.ElementType; iconColor?: string }) {
  return (
    <View style={s.sectionRow}>
      {Icon && <Icon size={rs(14)} color={iconColor ?? colors.textDim} strokeWidth={1.8} />}
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

// ──────────────────────────────────────────
// Overview Card
// ──────────────────────────────────────────
function OverviewCard({ t }: { t: (k: string, o?: Record<string, unknown>) => string }) {
  return (
    <View style={s.overviewCard}>
      <View style={s.overviewTop}>
        <View style={[s.iconCircle, { backgroundColor: colors.textSec }]}>
          <Shield size={rs(24)} color={colors.petrol} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.overviewBadge}>{t('insurance.activeProtection')}</Text>
          <Text style={s.overviewSub}>{t('insurance.activePlansCount', { count: 2 })}</Text>
        </View>
      </View>
      <View style={s.statsRow}>
        <View style={s.statBox}>
          <Text style={s.statLabel}>{t('insurance.monthlySpend')}</Text>
          <Text style={s.statValue}>R$ 189</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statLabel}>{t('insurance.savings')}</Text>
          <Text style={[s.statValue, { color: colors.success }]}>-R$ 32/{t('insurance.month')}</Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────
// Payment Alert
// ──────────────────────────────────────────
function PaymentAlert({ t }: { t: (k: string) => string }) {
  return (
    <View style={s.paymentCard}>
      <View style={[s.iconCircle, { backgroundColor: colors.warningSoft }]}>
        <Calendar size={rs(20)} color={colors.warning} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.paymentTitle}>{t('insurance.nextPayment')}</Text>
        <Text style={s.paymentSub}>{t('insurance.nextPaymentDetail')}</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────
// Plan Card
// ──────────────────────────────────────────
function PlanCard({ plan, t }: { plan: Plan; t: (k: string) => string }) {
  const Icon = plan.icon;
  return (
    <View style={[s.planCard, { borderColor: `${plan.tintColor}25` }]}>
      <View style={s.planHeader}>
        <View style={[s.iconCircle, { backgroundColor: `${plan.tintColor}15` }]}>
          <Icon size={rs(20)} color={plan.tintColor} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.planName}>{t(plan.nameKey)}</Text>
          <Text style={s.planProvider}>{t(plan.providerKey)}</Text>
        </View>
        <View style={s.activeBadge}>
          <Text style={s.activeBadgeText}>{t('insurance.active')}</Text>
        </View>
      </View>
      <View style={s.planPriceRow}>
        <Text style={s.planPrice}>R$ {plan.price.toFixed(2).replace('.', ',')}</Text>
        <Text style={s.planPriceUnit}>/{t('insurance.month')}</Text>
      </View>
      <Text style={s.renewalText}>{t(plan.renewalKey)}</Text>
      <View style={s.tagsWrap}>
        {plan.coverageKeys.map((ck) => (
          <View key={ck} style={[s.tag, { backgroundColor: `${plan.tintColor}12` }]}>
            <Text style={[s.tagText, { color: plan.tintColor }]}>{t(ck)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────
// Suggested Plan
// ──────────────────────────────────────────
function SuggestedPlan({ t }: { t: (k: string) => string }) {
  return (
    <View style={s.suggestedCard}>
      <View style={s.planHeader}>
        <View style={[s.iconCircle, { backgroundColor: colors.skySoft }]}>
          <Sparkles size={rs(20)} color={colors.sky} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.planName}>{t('insurance.suggestedDentalName')}</Text>
          <Text style={s.planProvider}>{t('insurance.suggestedDentalReason')}</Text>
        </View>
        <View style={s.suggestedBadge}>
          <Text style={s.suggestedBadgeText}>{t('insurance.suggested')}</Text>
        </View>
      </View>
      <View style={s.suggestedBottom}>
        <Text style={s.planPrice}>R$ 49,90</Text>
        <Text style={s.planPriceUnit}>/{t('insurance.month')}</Text>
        <TouchableOpacity style={s.knowBtn} activeOpacity={0.7}>
          <Text style={s.knowBtnText}>{t('insurance.explore')}</Text>
          <ChevronRight size={rs(16)} color="#fff" strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────
// Cost Summary
// ──────────────────────────────────────────
function CostSummary({ t }: { t: (k: string) => string }) {
  const total = 188.90;
  return (
    <View style={s.costCard}>
      {ACTIVE_PLANS.map((p) => (
        <View key={p.id} style={s.costRow}>
          <Text style={s.costName}>{t(p.nameKey)}</Text>
          <Text style={s.costPrice}>R$ {p.price.toFixed(2).replace('.', ',')}</Text>
          <View style={s.costBarTrack}>
            <View style={[s.costBarFill, { width: `${(p.price / total) * 100}%`, backgroundColor: p.tintColor }]} />
          </View>
        </View>
      ))}
      <View style={s.costTotalRow}>
        <Text style={s.costTotalLabel}>{t('insurance.monthlyTotal')}</Text>
        <Text style={s.costTotalValue}>R$ {total.toFixed(2).replace('.', ',')}</Text>
      </View>
      <View style={s.annualCard}>
        <TrendingUp size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
        <Text style={s.annualText}>{t('insurance.annualProjection')}</Text>
        <Text style={s.annualValue}>R$ {(total * 12).toFixed(2).replace('.', ',')}</Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────
// Emergency Contacts
// ──────────────────────────────────────────
function ContactCard({ contact, t }: { contact: Contact; t: (k: string) => string }) {
  return (
    <View style={s.contactCard}>
      <View style={[s.iconCircle, { backgroundColor: `${contact.tintColor}15` }]}>
        <Phone size={rs(18)} color={contact.tintColor} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.contactName}>{t(contact.nameKey)}</Text>
        <Text style={s.contactPhone}>{t(contact.phoneKey)}</Text>
      </View>
      <TouchableOpacity style={[s.callBtn, { borderColor: `${contact.tintColor}40` }]} activeOpacity={0.7}>
        <Phone size={rs(16)} color={contact.tintColor} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  );
}

// ──────────────────────────────────────────
// AI Insight
// ──────────────────────────────────────────
function AiInsight({ t, petName }: { t: (k: string, o?: Record<string, unknown>) => string; petName: string }) {
  return (
    <View style={s.aiCard}>
      <View style={s.aiHeader}>
        <Sparkles size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
        <Text style={s.aiLabel}>{t('insurance.aiInsightLabel')}</Text>
      </View>
      <Text style={s.aiText}>{t('insurance.aiInsightMock', { name: petName })}</Text>
    </View>
  );
}

// ──────────────────────────────────────────
// Main Screen
// ──────────────────────────────────────────
export default function InsuranceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: pet, isLoading } = usePet(id ?? '');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  if (isLoading) {
    return (
      <View style={s.container}>
        <Skeleton width="60%" height={rs(28)} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={rs(140)} style={{ marginBottom: spacing.md, borderRadius: radii.card }} />
        <Skeleton width="100%" height={rs(80)} style={{ marginBottom: spacing.md, borderRadius: radii.xxl }} />
        <Skeleton width="100%" height={rs(160)} style={{ marginBottom: spacing.md, borderRadius: radii.card }} />
        <Skeleton width="100%" height={rs(160)} style={{ borderRadius: radii.card }} />
      </View>
    );
  }

  const petName = pet?.name ?? '---';

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.click} colors={[colors.click]} />}
    >
      {/* Overview */}
      <OverviewCard t={t} />

      {/* Payment Alert */}
      <PaymentAlert t={t} />

      {/* Active Plans */}
      <SectionHeader label={t('insurance.activePlansLabel')} icon={ShieldCheck} iconColor={colors.success} />
      {ACTIVE_PLANS.map((p) => (
        <PlanCard key={p.id} plan={p} t={t} />
      ))}

      {/* Suggested */}
      <SectionHeader label={t('insurance.aiRecommended')} icon={Sparkles} iconColor={colors.purple} />
      <SuggestedPlan t={t} />

      {/* Cost Summary */}
      <SectionHeader label={t('insurance.costSummary')} icon={TrendingUp} iconColor={colors.petrol} />
      <CostSummary t={t} />

      {/* Emergency Contacts */}
      <SectionHeader label={t('insurance.contactCenters')} icon={Phone} iconColor={colors.textDim} />
      {CONTACTS.map((c) => (
        <ContactCard key={c.id} contact={c} t={t} />
      ))}

      {/* AI Insight */}
      <AiInsight t={t} petName={petName} />

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase' },

  // Overview
  overviewCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  overviewTop: { flexDirection: 'row', alignItems: 'center', gap: rs(12), marginBottom: spacing.md },
  overviewBadge: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.petrol, letterSpacing: 0.5, textTransform: 'uppercase' },
  overviewSub: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, marginTop: rs(2) },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radii.xxl, padding: spacing.sm, alignItems: 'center' },
  statLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: rs(4) },
  statValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(15), color: colors.text },

  // Payment
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderRadius: radii.xxl, padding: spacing.md, borderWidth: 1, borderColor: `${colors.warning}30`, marginTop: spacing.md },
  paymentTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.warning },
  paymentSub: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, marginTop: rs(2) },

  // Icon Circle
  iconCircle: { width: rs(42), height: rs(42), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },

  // Plan Card
  planCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.md, borderWidth: 1, marginBottom: spacing.sm },
  planHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(12) },
  planName: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: colors.text },
  planProvider: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, marginTop: rs(2) },
  activeBadge: { backgroundColor: colors.successSoft, paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: radii.sm },
  activeBadgeText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.success, textTransform: 'uppercase' },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.sm },
  planPrice: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(20), color: colors.text },
  planPriceUnit: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, marginLeft: rs(4) },
  renewalText: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(6) },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: spacing.sm },
  tag: { paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: radii.sm },
  tagText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), letterSpacing: 0.3 },

  // Suggested
  suggestedCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.md, borderWidth: 1.5, borderColor: `${colors.sky}30`, borderStyle: 'dashed', marginBottom: spacing.sm },
  suggestedBadge: { backgroundColor: colors.skySoft, paddingHorizontal: rs(10), paddingVertical: rs(4), borderRadius: radii.sm },
  suggestedBadgeText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.sky, textTransform: 'uppercase' },
  suggestedBottom: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  knowBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(4), backgroundColor: colors.click, paddingHorizontal: rs(16), paddingVertical: rs(8), borderRadius: radii.xl, marginLeft: 'auto' },
  knowBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: '#fff' },

  // Cost
  costCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  costRow: { marginBottom: spacing.sm },
  costName: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, marginBottom: rs(4) },
  costPrice: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(13), color: colors.text, marginBottom: rs(4) },
  costBarTrack: { height: rs(4), backgroundColor: colors.bgDeep, borderRadius: rs(2) },
  costBarFill: { height: rs(4), borderRadius: rs(2) },
  costTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  costTotalLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text },
  costTotalValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16), color: colors.click },
  annualCard: { flexDirection: 'row', alignItems: 'center', gap: rs(8), backgroundColor: colors.bgCard, borderRadius: radii.xxl, padding: spacing.sm, marginTop: spacing.sm },
  annualText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, flex: 1 },
  annualValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(13), color: colors.petrol },

  // Contacts
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderRadius: radii.xxl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  contactName: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },
  contactPhone: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(12), color: colors.textSec, marginTop: rs(2) },
  callBtn: { width: rs(40), height: rs(40), borderRadius: rs(12), borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },

  // AI
  aiCard: { backgroundColor: colors.card, borderRadius: radii.card, padding: spacing.md, borderWidth: 1, borderColor: `${colors.petrol}25`, marginTop: spacing.lg },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: spacing.sm },
  aiLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.petrol, letterSpacing: 1.5, textTransform: 'uppercase' },
  aiText: { fontFamily: 'Sora_400Regular', fontSize: fs(15), color: colors.textSec, lineHeight: fs(15) * 1.9 },
});
