/**
 * PdfActionModal — standard bottom sheet for every PDF export in the app.
 *
 * Shows two action cards (Print/Save + Share) before any PDF is generated.
 * All PDF entry points must use this component — no direct pdf generation
 * without first showing this modal.
 */
import React, { useCallback, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, Share2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { useToast } from '../Toast';
import { getErrorMessage } from '../../utils/errorMessages';

export interface PdfActionModalProps {
  visible: boolean;
  onClose: () => void;
  /** Main title shown in the sheet header */
  title: string;
  /** Optional subtitle (e.g. entry count, pet name) */
  subtitle?: string;
  /** Called when user taps "Print / Save" — should call previewPdf/previewXxxPdf */
  onPreview: () => Promise<void>;
  /** Called when user taps "Share file" — should call sharePdf/shareXxxPdf */
  onShare: () => Promise<void>;
}

export default function PdfActionModal({
  visible, onClose, title, subtitle, onPreview, onShare,
}: PdfActionModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handlePreview = useCallback(async () => {
    setIsPrinting(true);
    try {
      await onPreview();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsPrinting(false);
    }
  }, [onPreview, onClose, toast]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      await onShare();
      onClose();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsSharing(false);
    }
  }, [onShare, onClose, toast]);

  const busy = isPrinting || isSharing;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={[s.sheet, { paddingBottom: rs(16) + insets.bottom }]} onPress={() => {}}>
          <View style={s.handle} />

          <Text style={s.title} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionRow, { borderColor: colors.click + '40' }, busy && s.disabled]}
              onPress={handlePreview}
              disabled={busy}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.clickSoft }]}>
                {isPrinting
                  ? <ActivityIndicator color={colors.click} size="small" />
                  : <Download size={rs(20)} color={colors.click} strokeWidth={1.8} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>{t('pdfCommon.printOrSave')}</Text>
                <Text style={s.actionSubtitle}>{t('pdfCommon.printOrSaveHint')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionRow, { borderColor: colors.petrol + '40' }, busy && s.disabled]}
              onPress={handleShare}
              disabled={busy}
              activeOpacity={0.8}
            >
              <View style={[s.actionIcon, { backgroundColor: colors.petrolSoft }]}>
                {isSharing
                  ? <ActivityIndicator color={colors.petrol} size="small" />
                  : <Share2 size={rs(20)} color={colors.petrol} strokeWidth={1.8} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>{t('pdfCommon.shareFile')}</Text>
                <Text style={s.actionSubtitle}>{t('pdfCommon.shareFileHint')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.closeBtn} onPress={onClose} disabled={busy} activeOpacity={0.7}>
            <X size={rs(16)} color={colors.textDim} strokeWidth={1.8} />
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(11, 18, 25, 0.7)', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26),
    paddingHorizontal: rs(20), paddingTop: rs(12),
  },
  handle: {
    width: rs(40), height: rs(5), borderRadius: rs(3),
    backgroundColor: colors.textGhost, alignSelf: 'center', marginBottom: rs(18),
  },
  title: {
    fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text,
    marginBottom: rs(4),
  },
  subtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim,
    marginBottom: rs(4),
  },
  actions: { gap: rs(10), marginTop: rs(16) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(14),
    borderWidth: 1,
  },
  actionIcon: {
    width: rs(44), height: rs(44), borderRadius: rs(12),
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.text },
  actionSubtitle: {
    fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2),
  },
  closeBtn: {
    alignSelf: 'center', marginTop: rs(18), padding: rs(8),
  },
  disabled: { opacity: 0.5 },
});
