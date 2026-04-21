/**
 * StyleSheet for the Health screen — extracted verbatim from health.tsx.
 * Imported by health.tsx and by every component/tab file under _health/.
 */

import { StyleSheet } from 'react-native';
import { colors } from '../../../../../constants/colors';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { radii, spacing } from '../../../../../constants/spacing';

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    gap: rs(12),
  },
  headerBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(12),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
    textAlign: 'center',
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
  // ── Consultation card ──
  diaryHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    paddingVertical: rs(10),
    paddingHorizontal: rs(4),
    marginBottom: rs(8),
  },
  diaryHintText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    flex: 1,
  },
  consHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(10),
  },
  consTypeDot: {
    width: rs(4),
    borderRadius: rs(2),
    alignSelf: 'stretch',
    minHeight: rs(32),
    marginTop: rs(2),
  },
  consHeaderInfo: {
    flex: 1,
    gap: rs(2),
  },
  consDate: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  consVet: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.textSec,
  },
  consSummaryPreview: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    fontStyle: 'italic',
    marginTop: rs(2),
  },
  consMoreRow: {
    alignItems: 'center',
    paddingVertical: rs(12),
  },
  consMoreText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    fontStyle: 'italic',
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
  contentScroll: {
    flex: 1,
  },
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
    marginTop: rs(2),
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
