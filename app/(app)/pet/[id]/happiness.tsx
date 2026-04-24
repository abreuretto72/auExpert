import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';
import { HappinessLensContent } from '../../../../components/lenses/HappinessLensContent';
import PdfActionModal from '../../../../components/pdf/PdfActionModal';
import { previewHappinessPdf, shareHappinessPdf } from '../../../../lib/happinessPdf';

export default function HappinessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: pet, isLoading } = usePet(id);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfModal, setPdfModal] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['pets', id, 'lens', 'mood_trend'] });
    setRefreshing(false);
  }, [qc, id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton width="100%" height={rs(110)} radius={radii.card} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={rs(100)} radius={radii.card} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={rs(120)} radius={radii.card} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.click}
          colors={[colors.click]}
        />
      }
    >
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>
            {t('happiness.screenTitle', { name: pet?.name ?? '' }).toUpperCase()}
          </Text>
          <Text style={styles.subtitle}>{t('happiness.screenSubtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => setPdfModal(true)}
          activeOpacity={0.7}
          accessibilityLabel={t('pdfCommon.printOrSave')}
        >
          <FileText size={rs(18)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {id && <HappinessLensContent petId={id} />}

      <View style={{ height: spacing.xxl }} />

      <PdfActionModal
        visible={pdfModal}
        onClose={() => setPdfModal(false)}
        title={t('happinessPdf.title', { name: pet?.name ?? '' })}
        onPreview={() => previewHappinessPdf({ petId: id ?? '', petName: pet?.name ?? '' })}
        onShare={() => shareHappinessPdf({ petId: id ?? '', petName: pet?.name ?? '' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rs(12),
    marginBottom: spacing.md,
  },
  headerTextCol: {
    flex: 1,
  },
  pdfBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(10),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
    letterSpacing: 1.8,
  },
  subtitle: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(14),
    color: colors.textDim,
    fontStyle: 'italic',
    marginTop: rs(4),
  },
});
