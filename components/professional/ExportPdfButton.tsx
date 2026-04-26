/**
 * ExportPdfButton — botão "Exportar PDF" para os 4 documentos profissionais.
 *
 * Props:
 *   docType — 'prontuario' | 'receituario' | 'asa' | 'tci'
 *   docId   — id do documento na tabela respectiva
 *
 * Internamente chama o helper correto de lib/professionalDocsPdf.ts.
 */
import React, { useCallback, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../constants/colors';
import { radii } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../Toast';
import {
  previewProntuarioPdf,
  previewReceituarioPdf,
  previewAsaPdf,
  previewTciPdf,
} from '../../lib/professionalDocsPdf';
import { getErrorMessage } from '../../utils/errorMessages';

type DocType = 'prontuario' | 'receituario' | 'asa' | 'tci';

interface Props {
  docType: DocType;
  docId: string;
  label?: string;
}

export function ExportPdfButton({ docType, docId, label }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handlePress = useCallback(async () => {
    setBusy(true);
    try {
      if (docType === 'prontuario') await previewProntuarioPdf(docId);
      else if (docType === 'receituario') await previewReceituarioPdf(docId);
      else if (docType === 'asa') await previewAsaPdf(docId);
      else if (docType === 'tci') await previewTciPdf(docId);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }, [docType, docId, toast]);

  return (
    <TouchableOpacity
      style={[s.btn, busy && s.btnDisabled]}
      onPress={handlePress}
      disabled={busy}
      activeOpacity={0.7}
    >
      {busy ? (
        <ActivityIndicator size="small" color={colors.click} />
      ) : (
        <>
          <FileText size={rs(16)} color={colors.click} strokeWidth={2} />
          <Text style={s.btnTxt}>{label ?? t('agents.exportPdf')}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    paddingVertical: rs(12), borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.click,
  },
  btnDisabled: { opacity: 0.7 },
  btnTxt: { color: colors.click, fontSize: fs(13), fontWeight: '700' },
});
