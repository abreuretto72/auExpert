/**
 * PlansPdfScreen — PDF preview/share for the pet's plans
 * (health, insurance, funeral, assistance, emergency).
 * Uses the shared PdfPreviewScreen scaffold.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewPlansPdf, sharePlansPdf } from '../../../../lib/plansPdf';

export default function PlansPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewPlansPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => sharePlansPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="plansPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="plansPdf.ready"
      readySubtitleKey="plansPdf.readySubtitle"
      icon={FileText}
      iconColor={colors.rose}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
