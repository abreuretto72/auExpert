/**
 * AgentVoiceInput — Camadas 2 + 3 (digitação ZERO) para as telas de agentes.
 *
 * Camada 2 — VOZ:
 *   Botão grande de microfone. STT contínuo via useSimpleSTT.
 *   Cada transcrição final é entregue ao caller via onText(text, append=true)
 *   para que ele concatene na queixa principal / indicação / descrição.
 *
 * Camada 3 — CÂMERA / GALERIA:
 *   Vet fotografa receita escrita à mão, carteira de vacina, exame impresso,
 *   ou anotação de papel. A foto vai pra ocr-document EF (existing v12) que
 *   retorna JSON estruturado. O componente serializa esse JSON em texto
 *   legível e entrega via onText(text, append=false) — substitui o campo.
 *
 * Por que entrega texto cru e não JSON: as 7 EFs de agente já recebem texto
 * livre como chief_complaint / clinical_indication / procedure_description e
 * usam Claude pra estruturar. Não precisa duplicar inteligência.
 *
 * Filosofia: o vet NUNCA digita. Ele fala ou fotografa.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { Mic, Camera, Image as ImageIcon, Square } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../Toast';
import { useSimpleSTT } from '../../hooks/useSimpleSTT';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';
import { getErrorMessage } from '../../utils/errorMessages';

type DocType = 'general' | 'prescription' | 'exam' | 'vaccine';

interface Props {
  /**
   * Recebe texto novo do componente.
   *   append=true  → veio do mic (STT) — concatenar ao campo existente.
   *   append=false → veio da câmera (OCR) — substituir o campo.
   */
  onText: (text: string, append: boolean) => void;
  /** Tipo de documento esperado pelo OCR. Afeta o schema retornado pela EF. */
  ocrDocType?: DocType;
  /** Mostrar botão de câmera. Default: true. */
  showCamera?: boolean;
  /** Locale customizado pro STT. Default: locale do dispositivo. */
  lang?: string;
  /** Desabilita os botões (ex: depois que a IA já gerou o resultado). */
  disabled?: boolean;
}

export function AgentVoiceInput({
  onText, ocrDocType = 'general', showCamera = true, lang, disabled,
}: Props) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [ocrLoading, setOcrLoading] = useState(false);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (!isFinal) return;
    const cleaned = text.trim();
    if (cleaned.length === 0) return;
    onText(cleaned, true);
  }, [onText]);

  const handleSttError = useCallback((msg: string) => {
    toast(msg, 'warning');
  }, [toast]);

  const { isListening, isAvailable: micAvailable, toggle, stop } = useSimpleSTT({
    onTranscript: handleTranscript,
    onError: handleSttError,
    lang,
  });

  const handleOcr = useCallback(async (uri: string) => {
    setOcrLoading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('ocr-document', {
          body: {
            photo_base64: base64,
            document_type: ocrDocType,
            language: i18n.language,
          },
        }),
        140000,
        'ocr-document:agent',
      );

      if (error) throw error;
      if (!data) throw new Error(t('agentVoiceInput.ocrEmpty'));

      const text = stringifyOcrResult(data, ocrDocType);
      if (!text) {
        toast(t('agentVoiceInput.ocrEmpty'), 'warning');
        return;
      }
      onText(text, false);
      toast(t('agentVoiceInput.ocrOk'), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setOcrLoading(false);
    }
  }, [ocrDocType, i18n.language, onText, t, toast]);

  const handleTakePhoto = useCallback(async () => {
    if (isListening) stop();
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast(t('toast.cameraPermission'), 'warning');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]) {
        handleOcr(result.assets[0].uri);
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [handleOcr, isListening, stop, t, toast]);

  const handlePickFromGallery = useCallback(async () => {
    if (isListening) stop();
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        handleOcr(result.assets[0].uri);
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [handleOcr, isListening, stop, toast]);

  const busy = ocrLoading || disabled;

  return (
    <View style={s.container}>
      <Text style={s.hint}>{t('agentVoiceInput.hint')}</Text>

      <View style={s.row}>
        {/* Botão grande de microfone (Camada 2) */}
        <TouchableOpacity
          style={[
            s.micBtn,
            isListening && s.micBtnActive,
            busy && s.btnDisabled,
          ]}
          onPress={toggle}
          disabled={busy || !micAvailable}
          activeOpacity={0.85}
          accessibilityLabel={isListening ? t('agentVoiceInput.stopListening') : t('agentVoiceInput.startListening')}
        >
          {isListening ? (
            <Square size={rs(28)} color="#fff" strokeWidth={2} fill="#fff" />
          ) : (
            <Mic size={rs(30)} color="#fff" strokeWidth={2} />
          )}
          <Text style={s.micBtnTxt}>
            {isListening ? t('agentVoiceInput.listening') : t('agentVoiceInput.speak')}
          </Text>
        </TouchableOpacity>

        {/* Botões de câmera (Camada 3) */}
        {showCamera && (
          <View style={s.cameraColumn}>
            <TouchableOpacity
              style={[s.camBtn, busy && s.btnDisabled]}
              onPress={handleTakePhoto}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityLabel={t('agentVoiceInput.takePhoto')}
            >
              {ocrLoading ? (
                <ActivityIndicator size="small" color={colors.click} />
              ) : (
                <Camera size={rs(22)} color={colors.click} strokeWidth={1.8} />
              )}
              <Text style={s.camBtnTxt}>
                {ocrLoading ? t('agentVoiceInput.scanning') : t('agentVoiceInput.takePhoto')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.camBtn, busy && s.btnDisabled]}
              onPress={handlePickFromGallery}
              disabled={busy}
              activeOpacity={0.7}
              accessibilityLabel={t('agentVoiceInput.fromGallery')}
            >
              <ImageIcon size={rs(22)} color={colors.click} strokeWidth={1.8} />
              <Text style={s.camBtnTxt}>{t('agentVoiceInput.fromGallery')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!micAvailable && (
        <Text style={s.warning}>{t('agentVoiceInput.micUnavailable')}</Text>
      )}
    </View>
  );
}

/**
 * Converte o JSON retornado por ocr-document em texto plano legível
 * para o agente IA processar como queixa / indicação / descrição.
 *
 * Estratégia: serializa as chaves em formato "Label: valor" linha a linha.
 * Como a EF agente sempre repassa o texto pro Claude, a estruturação
 * acontece lá — aqui não precisamos de parser sofisticado.
 */
function stringifyOcrResult(data: unknown, docType: DocType): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as Record<string, unknown>;

  // Documentos com lista (vaccines/exams/medications) — concatena cada item.
  const arrayKey = ({ vaccine: 'vaccines', exam: 'exams', prescription: 'medications' } as Record<DocType, string | undefined>)[docType];
  if (arrayKey && Array.isArray(obj[arrayKey])) {
    const items = obj[arrayKey] as Array<Record<string, unknown>>;
    return items
      .map((item, i) => `[${i + 1}] ${stringifyFlat(item)}`)
      .join('\n\n')
      .trim();
  }

  // Tipo general retorna { type, data } ou flat
  if ('data' in obj && typeof obj.data === 'object' && obj.data) {
    return stringifyFlat(obj.data as Record<string, unknown>);
  }
  return stringifyFlat(obj);
}

function stringifyFlat(obj: Record<string, unknown>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => {
      const label = humanizeKey(k);
      if (Array.isArray(v)) {
        const inner = v.map((it) => typeof it === 'object' && it ? stringifyFlat(it as Record<string, unknown>) : String(it)).join('; ');
        return `${label}: ${inner}`;
      }
      if (typeof v === 'object') {
        return `${label}: ${stringifyFlat(v as Record<string, unknown>)}`;
      }
      return `${label}: ${String(v)}`;
    })
    .join('\n');
}

function humanizeKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: rs(14),
    marginBottom: spacing.md,
    gap: rs(10),
  },
  hint: {
    color: colors.textSec,
    fontSize: fs(11),
    textAlign: 'center',
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: rs(10),
    alignItems: 'stretch',
  },
  micBtn: {
    flex: 1.2,
    backgroundColor: colors.click,
    borderRadius: radii.lg,
    paddingVertical: rs(20),
    paddingHorizontal: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    minHeight: rs(120),
  },
  micBtnActive: {
    backgroundColor: colors.danger,
  },
  micBtnTxt: {
    color: '#fff',
    fontSize: fs(14),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cameraColumn: {
    flex: 1,
    gap: rs(8),
  },
  camBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    borderWidth: 1.5,
    borderColor: colors.click,
    borderRadius: radii.lg,
    paddingVertical: rs(10),
    paddingHorizontal: rs(8),
    backgroundColor: 'transparent',
    minHeight: rs(56),
  },
  camBtnTxt: {
    color: colors.click,
    fontSize: fs(11),
    fontWeight: '700',
    flexShrink: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  warning: {
    color: colors.warning,
    fontSize: fs(11),
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
