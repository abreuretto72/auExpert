/**
 * NutritionPdfScreen — PDF preview/share for the pet's nutrition module
 * (modalidade, current food, restrictions, supplements, history, AI evaluation).
 * Uses the shared PdfPreviewScreen scaffold.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Leaf } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewNutritionPdf, shareNutritionPdf } from '../../../../lib/nutritionPdf';

export default function NutritionPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewNutritionPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareNutritionPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="nutritionPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="nutritionPdf.ready"
      readySubtitleKey="nutritionPdf.readySubtitle"
      icon={Leaf}
      iconColor={colors.success}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
