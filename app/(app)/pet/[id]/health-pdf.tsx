/**
 * HealthPdfScreen — PDF preview/share for the pet's full health record.
 * Covers all 8 tabs: vaccines, allergies, exams, medications, consultations,
 * surgeries, clinical metrics, and expenses.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { HeartPulse } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewHealthPdf, shareHealthPdf } from '../../../../lib/healthPdf';

export default function HealthPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewHealthPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareHealthPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="healthPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="healthPdf.ready"
      readySubtitleKey="healthPdf.readySubtitle"
      icon={HeartPulse}
      iconColor={colors.success}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
