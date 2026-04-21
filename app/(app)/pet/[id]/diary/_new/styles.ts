/**
 * styles — StyleSheet extracted verbatim from app/(app)/pet/[id]/diary/new.tsx.
 *
 * Move-only extraction. Same `styles` object, same keys, same values —
 * imported back into new.tsx via `import { styles } from './_new/styles'`.
 */
import { StyleSheet } from 'react-native';
import { colors } from '../../../../../../constants/colors';
import { rs, fs } from '../../../../../../hooks/useResponsive';
import { spacing, radii } from '../../../../../../constants/spacing';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.lg),
    paddingBottom: rs(spacing.sm),
    gap: rs(spacing.sm),
  },
  backBtn: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, color: colors.text,
    fontSize: fs(17), fontFamily: 'Sora_700Bold',
  },
  deleteBtn: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.dangerSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBtn: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.accentGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  helpBackdrop: {
    flex: 1, backgroundColor: 'rgba(11,18,25,0.6)',
  },
  helpSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(radii.modal),
    borderTopRightRadius: rs(radii.modal),
    padding: rs(spacing.lg),
    gap: rs(spacing.md),
  },
  helpHandle: {
    width: rs(40), height: rs(5),
    borderRadius: rs(3),
    backgroundColor: colors.textGhost,
    alignSelf: 'center',
    marginBottom: rs(spacing.sm),
  },
  helpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(spacing.sm),
  },
  helpTitle: {
    color: colors.text,
    fontSize: fs(17),
    fontFamily: 'Sora_700Bold',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(spacing.md),
  },
  helpItemIcon: {
    width: rs(40), height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  helpItemText: {
    flex: 1,
    gap: rs(4),
  },
  helpItemTitle: {
    color: colors.text,
    fontSize: fs(14),
    fontFamily: 'Sora_600SemiBold',
  },
  helpItemDesc: {
    color: colors.textSec,
    fontSize: fs(13),
    fontFamily: 'Sora_400Regular',
    lineHeight: fs(13) * 1.5,
  },
  helpItemLimit: {
    color: colors.textDim,
    fontSize: fs(11),
    fontFamily: 'Sora_400Regular',
    marginTop: rs(2),
  },
  helpScrollArea: {
    maxHeight: rs(480),
  },
  helpScrollContent: {
    gap: rs(spacing.md),
  },
  helpWifiCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(spacing.sm),
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning + '30',
    borderRadius: rs(radii.lg),
    padding: rs(spacing.md),
    marginTop: rs(spacing.md),
  },
  helpWifiTitle: {
    color: colors.warning,
    fontSize: fs(13),
    fontFamily: 'Sora_600SemiBold',
    marginBottom: rs(2),
  },
  helpWifiDesc: {
    color: colors.textSec,
    fontSize: fs(12),
    fontFamily: 'Sora_400Regular',
    lineHeight: fs(12) * 1.55,
  },
  helpAICard: {
    flexDirection: 'column',
    gap: rs(spacing.sm),
    backgroundColor: colors.purpleSoft,
    borderWidth: 1,
    borderColor: colors.purple + '30',
    borderRadius: rs(radii.lg),
    padding: rs(spacing.md),
    marginTop: rs(spacing.md),
  },
  helpAIHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(2),
  },
  helpAITitle: {
    color: colors.purple,
    fontSize: fs(13),
    fontFamily: 'Sora_600SemiBold',
  },
  helpAIStateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(spacing.sm),
  },
  helpAIBadge: {
    borderRadius: rs(radii.sm),
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    marginTop: rs(1),
  },
  helpAIBadgeOn: {
    backgroundColor: colors.purple + '20',
  },
  helpAIBadgeOff: {
    backgroundColor: colors.border,
  },
  helpAIBadgeText: {
    fontSize: fs(10),
    fontFamily: 'Sora_700Bold',
  },
  helpAIStateDesc: {
    flex: 1,
    color: colors.textSec,
    fontSize: fs(12),
    fontFamily: 'Sora_400Regular',
    lineHeight: fs(12) * 1.55,
  },
  helpTabRow: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderRadius: rs(10),
    padding: rs(3),
    marginBottom: rs(16),
  },
  helpTabBtn: {
    flex: 1,
    paddingVertical: rs(7),
    borderRadius: rs(8),
    alignItems: 'center',
  },
  helpTabBtnActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: rs(4),
    elevation: 2,
  },
  helpTabText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  helpTabTextActive: {
    color: colors.text,
  },

  // Text step
  textContainer: {
    flex: 1, padding: rs(spacing.md), gap: rs(spacing.md),
  },
  textLabel: {
    color: colors.textSec, fontSize: fs(13),
    fontFamily: 'Sora_600SemiBold', letterSpacing: 0.4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1.5, borderColor: colors.border,
    padding: rs(spacing.md),
    maxHeight: rs(300),
  },
  textInput: {
    flex: 1, color: colors.text,
    fontSize: fs(15),
    lineHeight: fs(22), textAlignVertical: 'top',
  },
  inlineMic: {
    alignSelf: 'flex-end',
    width: rs(36), height: rs(36),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.accentGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  inlineMicActive: { backgroundColor: colors.accentMed },
  interimText: {
    color: colors.textDim, fontSize: fs(13),
    fontFamily: 'Sora_400Regular',
    fontStyle: 'italic', marginHorizontal: rs(4),
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(spacing.xs),
    backgroundColor: colors.accent,
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3, shadowRadius: rs(12), elevation: 6,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  attachRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(spacing.xs),
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(8),
    paddingHorizontal: rs(12),
  },
  attachLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
  },
  primaryBtnText: {
    color: '#fff', fontSize: fs(15),
    fontFamily: 'Sora_700Bold',
  },

  // Mic / unified entry step
  micContent: {
    padding: rs(spacing.md),
    gap: rs(spacing.md),
  },
  waveCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.xxl),
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: rs(20),
    paddingHorizontal: rs(16),
    justifyContent: 'center',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: rs(52),
  },
  waveBar: {
    width: rs(4),
    height: rs(40),
    borderRadius: rs(3),
    backgroundColor: colors.accent,
  },
  transcriptionCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: rs(100),
    padding: rs(spacing.md),
  },
  transcriptionInput: {
    color: colors.text,
    fontSize: fs(15),
    lineHeight: fs(22),
    textAlignVertical: 'top',
    minHeight: rs(80),
  },
  attachThumb: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(12),
  },
  aiHint: {
    fontSize: fs(13),
    color: colors.text,
    textAlign: 'center',
    paddingHorizontal: rs(16),
  },
  aiToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.sm),
    marginHorizontal: rs(spacing.sm),
    marginTop: rs(spacing.sm),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(12),
    paddingHorizontal: rs(spacing.md),
  },
  aiToggleLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  aiToggleDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    marginTop: rs(2),
  },
  micBottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.sm),
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  micBtn: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentDark,
  },
  recordBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(spacing.xs),
    backgroundColor: colors.accent,
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(12),
    elevation: 6,
  },
  recordBtnDisabled: { opacity: 0.4 },
  recordBtnText: {
    color: '#fff',
    fontSize: fs(15),
    fontFamily: 'Sora_700Bold',
  },

  // Analyzing overlay
  analyzingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,18,25,0.92)',
    alignItems: 'center', justifyContent: 'center',
    gap: rs(20), zIndex: 999,
  },
  analyzingCenter: {
    width: rs(140), height: rs(140),
    alignItems: 'center', justifyContent: 'center',
  },
  analyzingRing: {
    position: 'absolute',
    width: rs(140), height: rs(140),
    borderRadius: rs(70),
    borderWidth: 2, borderColor: colors.accent,
  },
  analyzingPawContainer: {
    width: rs(96), height: rs(96),
    borderRadius: rs(48),
    backgroundColor: colors.accentGlow,
    borderWidth: 1.5, borderColor: colors.accent + '40',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: rs(20),
    elevation: 8,
  },
  analyzingTitle: {
    fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text,
    letterSpacing: 0.5,
  },
  analyzingSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec,
    textAlign: 'center', maxWidth: rs(260), lineHeight: fs(20),
  },
  analyzerDisclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textGhost,
    textAlign: 'center', paddingHorizontal: rs(24), marginTop: rs(8),
  },
  mediaDisclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: '#FFFFFF',
    textAlign: 'center', paddingHorizontal: rs(20), paddingVertical: rs(4),
    fontStyle: 'italic',
  },
  mediaHint: {
    fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textGhost,
    textAlign: 'center', marginTop: rs(2),
  },

});
