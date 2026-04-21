/**
 * Shared StyleSheet used by all timeline card components.
 * Extracted verbatim from TimelineCards.tsx.
 */

import { StyleSheet } from 'react-native';
import { colors } from '../../../constants/colors';
import { rs, fs } from '../../../hooks/useResponsive';

export const styles = StyleSheet.create({
  cardBase: { backgroundColor: colors.card, borderRadius: rs(22), borderWidth: 1, borderColor: colors.border, padding: rs(16) },

  // Month summary
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(8) },
  monthTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.accent },
  monthSummaryLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1.5, marginBottom: rs(6) },
  monthStatsRow: { flexDirection: 'row', marginTop: rs(12), gap: rs(8) },
  monthStat: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(8), alignItems: 'center' },
  monthStatValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(14), color: colors.accent },
  monthStatLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Diary card
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(8) },
  entryDate: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  entryTime: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(11), color: colors.textDim },
  tutorAttribution: { flexDirection: 'row', alignItems: 'center', gap: rs(4), marginTop: rs(3) },
  tutorAttributionText: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim },
  specialHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.gold + '15', paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(8), marginBottom: rs(10), alignSelf: 'flex-start' },
  specialText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.gold, letterSpacing: 0.5 },
  registrationBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.accentGlow, paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(8), marginBottom: rs(10), alignSelf: 'flex-start' },
  registrationText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.accent, letterSpacing: 0.5 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(12) },
  moodDot: { width: rs(8), height: rs(8), borderRadius: rs(4) },
  moodLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11) },
  tutorSection: { backgroundColor: colors.bgCard, borderLeftWidth: 3, borderLeftColor: colors.textGhost, borderRadius: rs(10), padding: rs(12), marginBottom: rs(10) },
  tutorLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, marginBottom: rs(6) },
  tutorContent: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: fs(20) },
  narrationSection: { backgroundColor: colors.accent + '08', borderWidth: 1, borderColor: colors.accent + '12', borderRadius: rs(12), padding: rs(12) },
  narrationHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  narrationTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.accent, flex: 1 },
  narrationText: { fontSize: fs(15), color: colors.textSec, lineHeight: rs(27), fontStyle: 'italic' },
  narrationWrapper: { marginTop: rs(10) },
  moduleList: { gap: rs(6), padding: rs(4) },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: rs(10) },
  tagChip: { backgroundColor: colors.bgCard, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  tagText: { fontFamily: 'Sora_500Medium', fontSize: fs(10), color: colors.textDim },

  // Generic card elements
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  cardTypeLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, flex: 1, textTransform: 'uppercase' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text, marginBottom: rs(4) },
  cardDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18) },

  // Health card
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
  severityText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), letterSpacing: 0.5 },
  sourceBadge: { marginTop: rs(8), backgroundColor: colors.bgCard, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4), alignSelf: 'flex-start' },
  healthSourceText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim },

  // Info boxes
  infoBox: { borderRadius: rs(10), padding: rs(10), marginTop: rs(8) },
  infoBoxLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), letterSpacing: 0.5, marginBottom: rs(4) },
  infoBoxValue: { fontFamily: 'Sora_500Medium', fontSize: fs(12), lineHeight: fs(18) },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(4) },

  // Score boxes
  scoreBox: { marginTop: rs(10), backgroundColor: colors.bgCard, borderRadius: rs(12), borderWidth: 1, borderColor: colors.border, padding: rs(12), alignItems: 'center' },
  scoreLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.5, marginBottom: rs(4) },
  scoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(28) },
  scoresRow: { flexDirection: 'row', marginTop: rs(10), gap: rs(8) },
  scoreItem: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(10), alignItems: 'center' },
  scoreItemValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(18) },
  scoreItemLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Milestone
  milestoneCard: { alignItems: 'center', paddingVertical: rs(20) },
  milestoneTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.gold, textAlign: 'center', marginTop: rs(10) },
  milestoneDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, textAlign: 'center', marginTop: rs(4), lineHeight: fs(18) },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.gold + '15', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8), marginTop: rs(10) },
  badgeChipText: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.gold },

  // VideoAnalysisCard
  videoCard: { backgroundColor: colors.card, borderRadius: rs(16), borderWidth: 1, borderColor: colors.sky + '30', overflow: 'hidden' },
  videoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), padding: rs(12), paddingBottom: rs(4) },
  videoCardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.sky, letterSpacing: 1.2, flex: 1 },
  videoCardFrame: { width: '100%', height: rs(180) },
  videoCardFrameDesc: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6), padding: rs(10), backgroundColor: colors.success + '08' },
  videoCardFrameDescText: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(18) },
  videoCardBehavior: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.text, lineHeight: fs(20), marginTop: rs(10) },
  videoCardScores: { flexDirection: 'row', marginTop: rs(10), gap: rs(8) },
  videoCardNarration: { borderTopWidth: 1, borderTopColor: colors.border, padding: rs(12) },

  // ScoreBadge
  scoreBadgeItem: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(8), alignItems: 'center' },
  scoreBadgeValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(18) },
  scoreBadgeLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Video health observations
  observationsContainer: { marginTop: rs(8), gap: rs(6) },
  observationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6) },
  observationText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, flex: 1, lineHeight: fs(18) },

  // Capsule
  capsuleCondition: { fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.textDim, marginTop: rs(4) },
  capsuleMessage: { fontFamily: 'Caveat_400Regular', fontSize: fs(16), color: colors.textSec, fontStyle: 'italic', lineHeight: rs(28), marginTop: rs(8) },
  capsuleDates: { marginTop: rs(8), gap: rs(4) },
  capsuleDateText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textDim },

  // Pending / processing / error states
  pendingCard: { borderLeftWidth: rs(3), borderLeftColor: colors.warning },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  pendingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.warning },
  processingCard: { borderLeftWidth: rs(3), borderLeftColor: colors.purple },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  processingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.purple },
  processingContent: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, fontStyle: 'italic', lineHeight: fs(18) },
  errorCard: { borderLeftWidth: rs(3), borderLeftColor: colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  errorText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.danger },
  errorContent: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18), marginBottom: rs(10) },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), alignSelf: 'flex-start', paddingVertical: rs(6), paddingHorizontal: rs(12), backgroundColor: colors.accentGlow, borderRadius: rs(8) },
  retryText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.accent },

  // Media attachment thumbnails (video/audio in DiaryCard)

  // Audit
  auditSection: { marginTop: rs(8), gap: rs(2) },
  auditText: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost, lineHeight: fs(15) },

  // Subcards (media: photo/video/audio/document + lenses)
  mediaSubcardsContainer: { gap: rs(4), marginTop: rs(10) },
  subcard: { borderRadius: rs(12), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, overflow: 'hidden', marginTop: rs(8) },
  subcardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), paddingHorizontal: rs(12), paddingVertical: rs(8) },
  subcardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.success, letterSpacing: 1.2 },
  subcardImage: { width: '100%', height: rs(180) },
  sourcesContainer: {
    paddingHorizontal: rs(10),
    paddingBottom: rs(8),
    gap: rs(4),
  },
  sourceText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(9),
    color: colors.textDim,
    lineHeight: fs(14),
  },
  sourcesTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textSec,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    paddingHorizontal: rs(10),
    paddingTop: rs(6),
    paddingBottom: rs(2),
  },
  subcardBodyText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18), padding: rs(10), paddingTop: rs(4) },
  toxicAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6), padding: rs(10) },
  toxicText: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(12), lineHeight: fs(18) },
  subcardScores: { flexDirection: 'row', paddingHorizontal: rs(10), paddingBottom: rs(8) },
  subcardScoreItem: { flex: 1, alignItems: 'center' },
  subcardScoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16) },
  subcardScoreLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim },
  audioFileRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10), padding: rs(12), paddingTop: rs(4) },
  audioFileName: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  audioFileMeta: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(10), color: colors.rose, marginTop: rs(2) },
  audioBanner: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.rose + '12', borderRadius: rs(12), borderWidth: 1, borderColor: colors.rose + '25', padding: rs(12), marginTop: rs(10), marginBottom: rs(6) },
  audioIconCircle: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: colors.rose + '20', alignItems: 'center', justifyContent: 'center' },
  ocrField: { flexDirection: 'row', paddingHorizontal: rs(12), paddingVertical: rs(3), gap: rs(8) },
  ocrKey: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, minWidth: rs(80) },
  ocrValue: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.text },
  ocrValueLow: { color: colors.textDim, fontStyle: 'italic' },
  ocrDocTypeBadge: { backgroundColor: colors.purple + '20', paddingHorizontal: rs(8), paddingVertical: rs(2), borderRadius: rs(6) },
  ocrDocTypeText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), color: colors.purple, letterSpacing: 0.5 },
  ocrTotalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: rs(8), backgroundColor: colors.accent + '12', borderWidth: 1, borderColor: colors.accent + '25', borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(8), marginHorizontal: rs(10), marginVertical: rs(6) },
  ocrTotalLabel: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.accent, letterSpacing: 0.5 },
  ocrTotalValue: { flexShrink: 0, fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16), color: colors.accent },
  ocrItemsContainer: { marginTop: rs(8), paddingHorizontal: rs(10), paddingBottom: rs(8), gap: rs(4) },
  ocrItemsHeader: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, marginBottom: rs(4) },
  ocrItemRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), paddingVertical: rs(3), borderBottomWidth: 1, borderBottomColor: colors.border },
  ocrItemName: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.text },
  ocrItemQty: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(11), color: colors.textDim, minWidth: rs(28) },
  ocrItemPrice: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(11), color: colors.petrol },
  ocrEmptyHint: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, fontStyle: 'italic', padding: rs(10), textAlign: 'center' },
  ocrActionBar: { flexDirection: 'row', gap: rs(8), marginHorizontal: rs(10), marginTop: rs(8), marginBottom: rs(4) },
  ocrEditBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), marginHorizontal: rs(10), marginTop: rs(8), marginBottom: rs(4), paddingVertical: rs(9), borderRadius: rs(10), borderWidth: 1, borderColor: colors.accent + '50', backgroundColor: colors.accent + '10' },
  ocrEditBarText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.accent },
  ocrCancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), paddingHorizontal: rs(14), paddingVertical: rs(9), borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  ocrCancelBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.textDim },
  ocrSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), paddingHorizontal: rs(14), paddingVertical: rs(9), borderRadius: rs(10), backgroundColor: colors.accent },
  ocrSaveBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: '#fff' },
  ocrEditInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.accent + '60', paddingVertical: rs(2), paddingHorizontal: rs(4), color: colors.text, backgroundColor: colors.bgCard },
  ocrScaleBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: rs(10), marginTop: rs(8), borderRadius: rs(10), borderWidth: 1, borderColor: colors.warning + '50', backgroundColor: colors.warningSoft, overflow: 'hidden' },
  ocrScaleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), paddingVertical: rs(8) },
  ocrScaleBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.warning },
  ocrScaleSep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.warning + '40' },
  ocrScaleMultiplyIcon: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.warning },

  // DiaryCard actions (pencil + trash side-by-side)
  diaryCardActions: { flexDirection: 'row', alignItems: 'center', gap: rs(10) },

  // MilestoneCard actions (top-right absolute area)
  milestoneActions: { position: 'absolute', top: rs(12), right: rs(12) },

  // Video thumbnail with play overlay
  videoThumbWrap: { position: 'relative' },
  videoThumbPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  videoThumbPlayBtn: { width: rs(52), height: rs(52), borderRadius: rs(26), backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },

  // ScheduledEventCard
  schedCard: { borderColor: colors.petrol + '40', backgroundColor: colors.petrolSoft },
  schedHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  schedIconWrap: { width: rs(26), height: rs(26), borderRadius: rs(8), backgroundColor: colors.petrolGlow, alignItems: 'center', justifyContent: 'center' },
  schedTypeLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.petrol, letterSpacing: 1.2, flex: 1, textTransform: 'uppercase' },
  schedAIBadge: { backgroundColor: colors.purple + '20', paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(6) },
  schedAIText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), color: colors.purple, letterSpacing: 0.5 },
  schedTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text, marginBottom: rs(6) },
  schedDateRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(4) },
  schedDateText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(12), color: colors.petrol },
  schedDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18), marginTop: rs(4) },
  schedMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8), marginTop: rs(8) },
  schedMetaText: { fontFamily: 'Sora_500Medium', fontSize: fs(11), color: colors.textDim, backgroundColor: colors.bgCard, paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
});
