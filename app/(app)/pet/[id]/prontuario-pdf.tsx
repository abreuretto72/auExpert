/**
 * ProntuarioPdfScreen — PDF preview and share for the pet medical record.
 *
 * Opens the native print/share dialog immediately on mount.
 * Shows sharing options as action buttons (WhatsApp, email, etc.)
 * while the user is on the screen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Download,
  Share2,
  FileText,
} from 'lucide-react-native';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { useProntuario } from '../../../../hooks/useProntuario';
import { useToast } from '../../../../components/Toast';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { previewProntuarioPdf, shareProntuarioPdf } from '../../../../lib/prontuarioPdf';

export default function ProntuarioPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: pet } = usePet(id!);
  const { prontuario, isLoading } = useProntuario(id!);

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // ── Generate PDF on mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (!prontuario || !pet || isLoading) return;
    let cancelled = false;

    (async () => {
      setIsGenerating(true);
      try {
        const { previewPdf } = await import('../../../../lib/pdf');
        // We just preview immediately
        await previewProntuarioPdf(prontuario, pet.name, pet.avatar_url);
        if (!cancelled) setIsGenerating(false);
      } catch {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [prontuario, pet, isLoading]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (!prontuario || !pet) return;
    setIsGenerating(true);
    try {
      await previewProntuarioPdf(prontuario, pet.name, pet.avatar_url);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [prontuario, pet, toast]);

  const handleShare = useCallback(async () => {
    if (!prontuario || !pet) return;
    setIsGenerating(true);
    try {
      await shareProntuarioPdf(prontuario, pet.name, pet.avatar_url);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [prontuario, pet, toast]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading || !prontuario) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('prontuario.pdfTitle', { name: pet?.name ?? '' })}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator color={colors.click} />
          <Text style={s.loadingText}>{t('prontuario.generating')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('prontuario.pdfTitle', { name: pet?.name ?? '' })}</Text>
        <View style={s.headerBtn} />
      </View>

      <View style={s.content}>
        {/* Preview illustration */}
        <View style={s.previewBox}>
          <View style={s.previewIconWrap}>
            <FileText size={rs(48)} color={colors.click} strokeWidth={1.3} />
          </View>
          <Text style={s.previewTitle}>{t('prontuario.pdfReady')}</Text>
          <Text style={s.previewSubtitle}>{t('prontuario.pdfReadySubtitle')}</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          {/* Print / Preview */}
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.click + '40' }]}
            onPress={handlePreview}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.clickSoft }]}>
              {isGenerating
                ? <ActivityIndicator color={colors.click} size="small" />
                : <Download size={rs(22)} color={colors.click} strokeWidth={1.8} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('prontuario.printOrSave')}</Text>
              <Text style={s.actionSubtitle}>{t('prontuario.printOrSaveHint')}</Text>
            </View>
          </TouchableOpacity>

          {/* Share */}
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
              <Text style={s.actionTitle}>{t('prontuario.shareFile')}</Text>
              <Text style={s.actionSubtitle}>{t('prontuario.shareFileHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{t('prontuario.pdfDisclaimer')}</Text>
      </View>
    </SafeAreaView>
  );
}

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
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12) },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim },

  content: { flex: 1, padding: rs(24) },
  previewBox: { alignItems: 'center', padding: rs(32) },
  previewIconWrap: { width: rs(96), height: rs(96), borderRadius: rs(28), backgroundColor: colors.clickSoft, alignItems: 'center', justifyContent: 'center', marginBottom: rs(16) },
  previewTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text, textAlign: 'center' },
  previewSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim, textAlign: 'center', marginTop: rs(8), lineHeight: fs(14) * 1.6 },

  actions: { gap: rs(12), marginTop: rs(8) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16),
    borderWidth: 1,
  },
  actionIcon: { width: rs(48), height: rs(48), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(15), color: colors.text },
  actionSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, marginTop: rs(2) },

  disclaimer: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'center', marginTop: rs(24) },
});
