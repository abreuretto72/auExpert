/**
 * PdfPreviewScreen — shared scaffold for `-pdf.tsx` preview screens.
 *
 * All lens/content screens that export to PDF share the exact same chrome:
 * header + icon box + "Print/save" action + "Share file" action + disclaimer.
 * Each caller supplies only the data-specific bits (title, icon, preview/share fns).
 *
 * Lives alongside the handful of dedicated preview screens that predate this
 * component (diary-pdf, ia-pdf, id-card-pdf, photo-analysis-pdf, prontuario-pdf).
 * Those screens are intentionally left as-is — they're working, they're not
 * in the inviolable-files list, and rewriting them would be churn unrelated
 * to the current task.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download, Share2, type LucideIcon } from 'lucide-react-native';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

export interface PdfPreviewScreenProps {
  /** i18n key for the header title (localized) */
  titleKey: string;
  /** optional params for titleKey interpolation (e.g. `{ name }`) */
  titleParams?: Record<string, string | number>;
  /** i18n key for the big hero title ("Ready to export!") */
  readyTitleKey: string;
  /** i18n key for the hero subtitle ("Ready to print or share with whoever…") */
  readySubtitleKey: string;
  /** optional params for readySubtitleKey interpolation (e.g. `{ name }`) */
  readySubtitleParams?: Record<string, string | number>;
  /** Lucide icon rendered in the hero box */
  icon: LucideIcon;
  /** Hero icon tint (defaults to `colors.accent`) */
  iconColor?: string;
  /** Ready to render / generate? If false, shows spinner and skips auto-open. */
  isReady: boolean;
  /** Opens the native print dialog — called on mount and when the user taps the first row. */
  onPreview: () => Promise<void>;
  /** Shares the PDF as a file — called when the user taps the second row. */
  onShare: () => Promise<void>;
  /** Auto-open print dialog on mount (default: true). */
  autoOpenOnMount?: boolean;
}

export function PdfPreviewScreen({
  titleKey,
  titleParams,
  readyTitleKey,
  readySubtitleKey,
  readySubtitleParams,
  icon: Icon,
  iconColor = colors.accent,
  isReady,
  onPreview,
  onShare,
  autoOpenOnMount = true,
}: PdfPreviewScreenProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-open print dialog on mount, but only once the caller signals isReady.
  useEffect(() => {
    if (!autoOpenOnMount || !isReady) return;
    let cancelled = false;
    (async () => {
      setIsGenerating(true);
      try {
        await onPreview();
      } catch { /* silent — user can retry via button */ }
      if (!cancelled) setIsGenerating(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const handlePreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      await onPreview();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [onPreview, toast]);

  const handleShare = useCallback(async () => {
    setIsGenerating(true);
    try {
      await onShare();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [onShare, toast]);

  // Not ready (still loading source data): show spinner.
  if (!isReady) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t(titleKey, titleParams)}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={s.loadingText}>{t('pdfCommon.generating')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{t(titleKey, titleParams)}</Text>
        <View style={s.headerBtn} />
      </View>

      <View style={s.content}>
        {/* Hero */}
        <View style={s.previewBox}>
          <View style={[s.previewIconWrap, { backgroundColor: iconColor + '18', borderColor: iconColor + '30' }]}>
            <Icon size={rs(48)} color={iconColor} strokeWidth={1.3} />
          </View>
          <Text style={s.previewTitle}>{t(readyTitleKey)}</Text>
          <Text style={s.previewSubtitle}>{t(readySubtitleKey, readySubtitleParams)}</Text>
        </View>

        {/* Action: print / save */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.accent + '40' }]}
            onPress={handlePreview}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.accentGlow }]}>
              {isGenerating
                ? <ActivityIndicator color={colors.accent} size="small" />
                : <Download size={rs(22)} color={colors.accent} strokeWidth={1.8} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('pdfCommon.printOrSave')}</Text>
              <Text style={s.actionSubtitle}>{t('pdfCommon.printOrSaveHint')}</Text>
            </View>
          </TouchableOpacity>

          {/* Action: share as file */}
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.petrol + '40' }]}
            onPress={handleShare}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.petrolSoft }]}>
              <Share2 size={rs(22)} color={colors.petrol} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('pdfCommon.shareFile')}</Text>
              <Text style={s.actionSubtitle}>{t('pdfCommon.shareFileHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={s.disclaimer}>{t('pdfCommon.disclaimer')}</Text>
      </View>
    </SafeAreaView>
  );
}

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
  headerTitle: {
    flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(15),
    color: colors.text, textAlign: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12) },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim },
  content: { flex: 1, padding: rs(24) },
  previewBox: { alignItems: 'center', paddingVertical: rs(32) },
  previewIconWrap: {
    width: rs(96), height: rs(96), borderRadius: rs(28),
    alignItems: 'center', justifyContent: 'center', marginBottom: rs(16),
    borderWidth: 1,
  },
  previewTitle: {
    fontFamily: 'Sora_700Bold', fontSize: fs(20),
    color: colors.text, textAlign: 'center',
  },
  previewSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim,
    textAlign: 'center', marginTop: rs(8), lineHeight: fs(13) * 1.6,
    paddingHorizontal: rs(16),
  },
  actions: { gap: rs(12) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16),
    padding: rs(16), borderWidth: 1,
  },
  actionIcon: {
    width: rs(48), height: rs(48), borderRadius: rs(14),
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(15), color: colors.text },
  actionSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, marginTop: rs(2),
  },
  disclaimer: {
    fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim,
    textAlign: 'center', marginTop: rs(24), lineHeight: fs(10) * 1.6,
  },
});
