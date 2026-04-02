/**
 * PlansLensContent — Pet plans and insurance overview lens.
 * Shows active health/insurance plans, monthly cost summary,
 * renewal alerts, and reimbursement totals.
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import {
  Shield, Heart, Star, Zap, Wallet,
  CalendarClock, Sparkles, BadgeCheck, ChevronRight,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';
import { Skeleton } from '../Skeleton';
import { useLensPlans, type PetPlan } from '../../hooks/useLens';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; labelKey: string }> = {
  health:     { icon: Shield,    color: colors.success,  labelKey: 'plans.typeHealth' },
  insurance:  { icon: Heart,     color: colors.rose,     labelKey: 'plans.typeInsurance' },
  funeral:    { icon: Star,      color: colors.purple,   labelKey: 'plans.typeFuneral' },
  assistance: { icon: Zap,       color: colors.petrol,   labelKey: 'plans.typeAssistance' },
  emergency:  { icon: Wallet,    color: colors.warning,  labelKey: 'plans.typeEmergency' },
};

const STATUS_COLOR: Record<string, string> = {
  active:    colors.success,
  expired:   colors.danger,
  cancelled: colors.textDim,
  pending:   colors.warning,
};

function formatCurrency(value: number | null, currency: string): string {
  if (value == null) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency, minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ── PlansSummaryCard ──────────────────────────────────────────────────────────

function PlansSummaryCard({
  activeCount,
  totalMonthlyCost,
  totalReimbursed,
  nextRenewalDate,
  currency,
}: {
  activeCount: number;
  totalMonthlyCost: number;
  totalReimbursed: number;
  nextRenewalDate: string | null;
  currency: string;
}) {
  const { t } = useTranslation();
  const days = daysUntil(nextRenewalDate);
  const renewalUrgent = days != null && days <= 30 && days >= 0;

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        {/* Active plans count */}
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryValue}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>{t('plans.activePlans')}</Text>
        </View>

        {/* Monthly cost */}
        <View style={[styles.summaryBlock, styles.summaryBlockCenter]}>
          <Text style={[styles.summaryValue, { color: colors.accent }]}>
            {formatCurrency(totalMonthlyCost, currency)}
          </Text>
          <Text style={styles.summaryLabel}>{t('plans.monthlyTotal')}</Text>
        </View>

        {/* Total reimbursed */}
        <View style={styles.summaryBlock}>
          <Text style={[styles.summaryValue, { color: colors.success }]}>
            {formatCurrency(totalReimbursed, currency)}
          </Text>
          <Text style={styles.summaryLabel}>{t('plans.reimbursed')}</Text>
        </View>
      </View>

      {/* Next renewal alert */}
      {nextRenewalDate && (
        <View style={[styles.renewalBanner, renewalUrgent && styles.renewalBannerUrgent]}>
          <CalendarClock
            size={rs(14)}
            color={renewalUrgent ? colors.warning : colors.textDim}
            strokeWidth={2}
          />
          <Text style={[styles.renewalText, renewalUrgent && styles.renewalTextUrgent]}>
            {renewalUrgent
              ? t('plans.renewalSoon', { days })
              : t('plans.nextRenewal', { date: formatDate(nextRenewalDate) })}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── PlanCard ──────────────────────────────────────────────────────────────────

const PlanCard = React.memo(function PlanCard({ plan }: { plan: PetPlan }) {
  const { t } = useTranslation();
  const config = PLAN_TYPE_CONFIG[plan.plan_type] ?? PLAN_TYPE_CONFIG.health;
  const IconComp = config.icon;
  const statusColor = STATUS_COLOR[plan.status] ?? colors.textDim;
  const days = daysUntil(plan.renewal_date);
  const renewalSoon = days != null && days <= 30 && days >= 0;

  return (
    <View style={styles.planCard}>
      {/* Icon + type */}
      <View style={[styles.planIcon, { backgroundColor: config.color + '14', borderColor: config.color + '30' }]}>
        <IconComp size={rs(20)} color={config.color} strokeWidth={1.8} />
      </View>

      <View style={styles.planInfo}>
        {/* Provider + status badge */}
        <View style={styles.planHeaderRow}>
          <Text style={styles.planProvider} numberOfLines={1}>{plan.provider}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`plans.status_${plan.status}`)}
            </Text>
          </View>
        </View>

        {/* Plan name + type */}
        <View style={styles.planSubRow}>
          <Text style={[styles.planType, { color: config.color }]}>
            {t(config.labelKey)}
          </Text>
          {plan.plan_name && (
            <Text style={styles.planName}> · {plan.plan_name}</Text>
          )}
        </View>

        {/* Cost + renewal */}
        <View style={styles.planFooter}>
          {plan.monthly_cost != null && (
            <Text style={styles.planCost}>
              {formatCurrency(plan.monthly_cost, plan.currency)}{t('plans.perMonth')}
            </Text>
          )}
          {plan.renewal_date && (
            <Text style={[styles.planRenewal, renewalSoon && styles.planRenewalUrgent]}>
              {renewalSoon
                ? t('plans.renewsIn', { days })
                : t('plans.renewsOn', { date: formatDate(plan.renewal_date) })}
            </Text>
          )}
        </View>

        {/* Coverage items */}
        {plan.coverage_items.length > 0 && (
          <View style={styles.coverageRow}>
            {plan.coverage_items.slice(0, 3).map((item, i) => (
              <View key={i} style={styles.coverageChip}>
                <BadgeCheck size={rs(9)} color={config.color} strokeWidth={2} />
                <Text style={[styles.coverageText, { color: config.color }]}>{item}</Text>
              </View>
            ))}
            {plan.coverage_items.length > 3 && (
              <Text style={styles.coverageMore}>+{plan.coverage_items.length - 3}</Text>
            )}
          </View>
        )}
      </View>

      <ChevronRight size={rs(14)} color={colors.textGhost} strokeWidth={2} />
    </View>
  );
});

// ── PlanSuggestionCard ────────────────────────────────────────────────────────

function PlanSuggestionCard() {
  const { t } = useTranslation();
  return (
    <View style={styles.suggestionCard}>
      <Sparkles size={rs(20)} color={colors.purple} strokeWidth={1.8} />
      <View style={styles.suggestionText}>
        <Text style={styles.suggestionTitle}>{t('plans.suggestionTitle')}</Text>
        <Text style={styles.suggestionHint}>{t('plans.suggestionHint')}</Text>
      </View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PlansLensContentProps {
  petId: string;
}

export function PlansLensContent({ petId }: PlansLensContentProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useLensPlans(petId);

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <Skeleton width="100%" height={rs(96)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(108)} radius={radii.card} />
        <View style={{ height: spacing.sm }} />
        <Skeleton width="100%" height={rs(108)} radius={radii.card} />
      </View>
    );
  }

  const { plans = [], summary } = data ?? { plans: [], summary: { active_count: 0, total_monthly_cost: 0, total_reimbursed: 0, next_renewal_date: null } };
  const activePlans = plans.filter((p) => p.status === 'active');
  const expiredPlans = plans.filter((p) => p.status !== 'active');
  const primaryCurrency = activePlans[0]?.currency ?? 'BRL';

  return (
    <View>
      {/* Summary card — always visible */}
      <PlansSummaryCard
        activeCount={summary.active_count}
        totalMonthlyCost={summary.total_monthly_cost}
        totalReimbursed={summary.total_reimbursed}
        nextRenewalDate={summary.next_renewal_date}
        currency={primaryCurrency}
      />

      {plans.length === 0 ? (
        <PlanSuggestionCard />
      ) : (
        <>
          {activePlans.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>{t('plans.activeSectionTitle').toUpperCase()}</Text>
              <FlatList
                data={activePlans}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PlanCard plan={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              />
            </>
          )}

          {expiredPlans.length > 0 && (
            <>
              <Text style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
                {t('plans.historySectionTitle').toUpperCase()}
              </Text>
              <FlatList
                data={expiredPlans}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <PlanCard plan={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: {
    gap: spacing.sm,
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryBlock: {
    alignItems: 'flex-start',
    flex: 1,
  },
  summaryBlockCenter: {
    alignItems: 'center',
  },
  summaryValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(20),
    color: colors.text,
    lineHeight: fs(24),
  },
  summaryLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
  },
  renewalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginTop: rs(12),
    paddingTop: rs(10),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  renewalBannerUrgent: {
    borderTopColor: colors.warning + '40',
  },
  renewalText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  renewalTextUrgent: {
    color: colors.warning,
    fontFamily: 'Sora_600SemiBold',
  },

  // Section headers
  sectionHeader: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
    marginBottom: rs(10),
  },

  // Plan card
  planCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  planIcon: {
    width: rs(42),
    height: rs(42),
    borderRadius: rs(21),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  planInfo: {
    flex: 1,
    gap: rs(4),
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: rs(8),
  },
  planProvider: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(6),
  },
  statusText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  planSubRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  planType: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planName: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },
  planFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    flexWrap: 'wrap',
  },
  planCost: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(13),
    color: colors.accent,
  },
  planRenewal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
  },
  planRenewalUrgent: {
    color: colors.warning,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    flexWrap: 'wrap',
    marginTop: rs(2),
  },
  coverageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(3),
    backgroundColor: colors.bgCard,
    borderRadius: rs(6),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
  },
  coverageText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(9),
    textTransform: 'lowercase',
  },
  coverageMore: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
  },

  // Suggestion
  suggestionCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
    marginBottom: rs(6),
  },
  suggestionHint: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(14),
    color: colors.textDim,
    fontStyle: 'italic',
    lineHeight: fs(14) * 1.6,
  },
});
