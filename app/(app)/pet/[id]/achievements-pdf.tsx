/**
 * AchievementsPdfScreen — PDF preview/share for the pet's achievements, level and XP.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewAchievementsPdf, shareAchievementsPdf } from '../../../../lib/achievementsPdf';

export default function AchievementsPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewAchievementsPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareAchievementsPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="achievementsPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="achievementsPdf.ready"
      readySubtitleKey="achievementsPdf.readySubtitle"
      readySubtitleParams={{ name: petName }}
      icon={Trophy}
      iconColor={colors.gold}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
