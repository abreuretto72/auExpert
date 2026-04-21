/**
 * AgendaPdfScreen — PDF preview/share for the pet's agenda (past 12 months + future 12 months).
 *
 * Thin wrapper over PdfPreviewScreen — delegates all chrome to the shared scaffold
 * and plugs in agenda-specific fetch/render via lib/agendaPdf.ts.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewAgendaPdf, shareAgendaPdf } from '../../../../lib/agendaPdf';

export default function AgendaPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewAgendaPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => shareAgendaPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="agendaPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="agendaPdf.ready"
      readySubtitleKey="agendaPdf.readySubtitle"
      icon={Calendar}
      iconColor={colors.accent}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
