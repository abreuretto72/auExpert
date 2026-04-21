/**
 * PainelPdfScreen — PDF preview/share for the pet's full painel
 * (aggregate of all 8 lenses: prontuário, nutrição, gastos, amigos,
 * conquistas, felicidade, viagens, planos).
 * Uses the shared PdfPreviewScreen scaffold.
 */
import React, { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LayoutGrid } from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { usePet } from '../../../../hooks/usePets';
import { PdfPreviewScreen } from '../../../../components/pdf/PdfPreviewScreen';
import { previewPainelPdf, sharePainelPdf } from '../../../../lib/painelPdf';

export default function PainelPdfScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: pet, isLoading } = usePet(id!);

  const petName = pet?.name ?? '';

  const handlePreview = useCallback(
    () => previewPainelPdf({ petId: id!, petName }),
    [id, petName],
  );
  const handleShare = useCallback(
    () => sharePainelPdf({ petId: id!, petName }),
    [id, petName],
  );

  return (
    <PdfPreviewScreen
      titleKey="painelPdf.title"
      titleParams={{ name: petName }}
      readyTitleKey="painelPdf.ready"
      readySubtitleKey="painelPdf.readySubtitle"
      icon={LayoutGrid}
      iconColor={colors.accent}
      isReady={!isLoading && !!pet}
      onPreview={handlePreview}
      onShare={handleShare}
    />
  );
}
