/**
 * TravelPdfScreen — PDF preview/share for the pet's trips.
 * Uses the shared PdfPreviewScreen scaffold.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Plane } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewTravelPdf, shareTravelPdf } from '../../../../lib/travelPdf';

export default function TravelPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewTravelPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareTravelPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="travelPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="travelPdf.ready"
      readySubtitleKey="travelPdf.readySubtitle"
      icon={Plane}
      iconColor={colors.sky}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
