/**
 * PdfPreviewModal — PDF ready screen with native share/open.
 * Does NOT use react-native-pdf (requires unbuilt native module).
 * Opens the system PDF viewer via expo-sharing.
 */

import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Share2, X, FileText, Download } from 'lucide-react-native';
import { shareAsync } from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

interface PdfPreviewModalProps {
  visible: boolean;
  pdfUri: string | null;
  fileName: string;
  onClose: () => void;
}

export default function PdfPreviewModal({
  visible, pdfUri, fileName, onClose,
}: PdfPreviewModalProps) {
  const { t } = useTranslation();

  const handleShare = useCallback(async () => {
    if (!pdfUri) return;
    await shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: fileName,
    });
  }, [pdfUri, fileName]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
            <X size={rs(20)} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{fileName}</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare} disabled={!pdfUri}>
            <Share2 size={rs(20)} color={colors.click} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {pdfUri ? (
            <>
              <View style={styles.iconWrap}>
                <FileText size={rs(56)} color={colors.click} strokeWidth={1.4} />
              </View>
              <Text style={styles.readyTitle}>{t('diary.pdfReady')}</Text>
              <Text style={styles.readyDesc}>{t('diary.pdfReadyDesc')}</Text>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.7}>
                <Download size={rs(18)} color="#fff" strokeWidth={2} />
                <Text style={styles.shareBtnText}>{t('diary.pdfOpen')}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ActivityIndicator size="large" color={colors.click} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: Platform.OS === 'android' ? rs(28) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  headerBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
    textAlign: 'center',
    marginHorizontal: rs(8),
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: rs(32),
    gap: rs(16),
  },
  iconWrap: {
    width: rs(100),
    height: rs(100),
    borderRadius: rs(22),
    backgroundColor: colors.clickSoft,
    borderWidth: 1.5,
    borderColor: colors.click + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(8),
  },
  readyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
    textAlign: 'center',
  },
  readyDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: fs(20),
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: colors.click,
    borderRadius: rs(14),
    paddingVertical: rs(14),
    paddingHorizontal: rs(28),
    marginTop: rs(8),
  },
  shareBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: '#fff',
  },
});
