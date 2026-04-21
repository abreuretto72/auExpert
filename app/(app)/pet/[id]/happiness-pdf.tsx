/**
 * HappinessPdfScreen — PDF preview/share for the pet's mood trend (last 90 days).
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Smile } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewHappinessPdf, shareHappinessPdf } from '../../../../lib/happinessPdf';

export default function HappinessPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewHappinessPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareHappinessPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="happinessPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="happinessPdf.ready"
      readySubtitleKey="happinessPdf.readySubtitle"
      icon={Smile}
      iconColor={colors.gold}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
