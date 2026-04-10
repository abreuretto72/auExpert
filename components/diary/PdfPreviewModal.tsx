/**
 * PdfPreviewModal — in-app PDF viewer with share button.
 * Uses react-native-pdf for rendering and expo-sharing for export.
 */

import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, Platform,
} from 'react-native';
import { Share2, X } from 'lucide-react-native';
import { shareAsync } from 'expo-sharing';
import Pdf from 'react-native-pdf';
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
          <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
            <Share2 size={rs(20)} color={colors.accent} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {pdfUri ? (
          <Pdf
            source={{ uri: pdfUri, cache: true }}
            style={styles.pdf}
            trustAllCerts={false}
            renderActivityIndicator={() => (
              <ActivityIndicator size="large" color={colors.accent} />
            )}
            onError={(err) => console.warn('[PdfPreview] error:', err)}
          />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
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
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
