/**
 * SignDocumentButton — botão "Assinar com biometria" reutilizável.
 *
 * Usado nas 4 telas de agentes que persistem documentos:
 *   - prontuario.tsx
 *   - receituario.tsx
 *   - asa.tsx
 *   - tci.tsx
 *
 * Props:
 *   targetTable, targetId, payload — passados pra useProSignature
 *   onSigned (opcional) — callback após sucesso, recebe SignResult
 *   label (opcional) — texto custom (default: t('agents.sign'))
 */
import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Fingerprint } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../constants/colors';
import { radii } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../Toast';
import { useProSignature, type SignableTable, type SignResult } from '../../hooks/useProSignature';

interface Props {
  targetTable: SignableTable;
  targetId: string;
  payload: Record<string, unknown>;
  onSigned?: (result: SignResult) => void;
  /** Override do label do botão. Default: t('agents.sign') */
  label?: string;
  disabled?: boolean;
}

export function SignDocumentButton({
  targetTable, targetId, payload, onSigned, label, disabled,
}: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { sign, isPending } = useProSignature();

  const handlePress = useCallback(async () => {
    try {
      const result = await sign({ targetTable, targetId, payload });
      toast(t('agents.signed'), 'success');
      onSigned?.(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Mensagens específicas pra cada modo de falha de biometria
      if (msg === 'biometric_unavailable') {
        toast(t('agents.errors.biometricUnavailable'), 'error');
      } else if (msg === 'biometric_cancelled') {
        // Cancelar não é erro — silencioso
      } else if (msg === 'biometric_failed') {
        toast(t('agents.errors.biometricFailed'), 'error');
      } else {
        toast(msg, 'error');
      }
    }
  }, [sign, targetTable, targetId, payload, onSigned, toast, t]);

  return (
    <TouchableOpacity
      style={[s.btn, (isPending || disabled) && s.btnDisabled]}
      onPress={handlePress}
      disabled={isPending || disabled}
      activeOpacity={0.85}
    >
      {isPending ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Fingerprint size={rs(18)} color="#fff" strokeWidth={2} />
          <Text style={s.btnTxt}>{label ?? t('agents.sign')}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, paddingVertical: rs(14), borderRadius: radii.lg,
  },
  btnDisabled: { opacity: 0.7 },
  btnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },
});
