import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FileText } from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';
import ExpensesLens from '../../../../components/lenses/ExpensesLens';

export default function ExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: pet, isLoading } = usePet(id);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await qc.invalidateQueries({ queryKey: ['pets', id, 'lens', 'expenses'] });
    setRefreshing(false);
  }, [qc, id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton width="100%" height={rs(80)} radius={radii.card} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={rs(120)} radius={radii.card} />
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
          tintColor={colors.gold}
          colors={[colors.gold]}
        />
      }
    >
      <View style={styles.headerBar}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>
            {t('expenses.screenTitle', { name: pet?.name ?? '' }).toUpperCase()}
          </Text>
          <Text style={styles.subtitle}>{t('expenses.screenSubtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.pdfBtn}
          onPress={() => router.push(`/pet/${id}/expenses-pdf`)}
          activeOpacity={0.7}
          accessibilityLabel={t('pdfCommon.printOrSave')}
        >
          <FileText size={rs(18)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {id && <ExpensesLens petId={id} />}

      <View style={{ height: spacing.xxl }} />
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
