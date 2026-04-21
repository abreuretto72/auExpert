/**
 * FriendsPdfScreen — PDF preview/share for the pet's friends (pet_connections).
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Users } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewFriendsPdf, shareFriendsPdf } from '../../../../lib/friendsPdf';

export default function FriendsPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewFriendsPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareFriendsPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="friendsPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="friendsPdf.ready"
      readySubtitleKey="friendsPdf.readySubtitle"
      readySubtitleParams={{ name: petName }}
      icon={Users}
      iconColor={colors.petrol}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
