/**
 * ExpensesPdfScreen — PDF preview/share for the pet's expenses (all-time).
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { DollarSign } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewExpensesPdf, shareExpensesPdf } from '../../../../lib/expensesPdf';

export default function ExpensesPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewExpensesPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareExpensesPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="expensesPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="expensesPdf.ready"
      readySubtitleKey="expensesPdf.readySubtitle"
      icon={DollarSign}
      iconColor={colors.gold}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
