/**
 * ProfessionalDocScanner — bloco AI-first do onboarding profissional.
 *
 * Tira foto da carteirinha CRMV / diploma / crachá / licença, manda pra EF
 * `scan-professional-document` (Claude Vision) e retorna os campos extraídos
 * pra autopreenchimento do form.
 *
 * Filosofia AI-first: digitação é último recurso. O onboarding começa pela
 * câmera — uma foto preenche 5+ campos de uma vez. O profissional só revisa
 * e ajusta antes de salvar.
 *
 * Estados visuais:
 *   - idle:        Hero card grande "Escanear documento" + hint
 *   - actionSheet: 2 botões (câmera / galeria) + cancelar
 *   - scanning:    Spinner + "Lendo o documento..."
 *   - extracted:   Thumbnail + lista campos extraídos + "{N} campos preenchidos pela IA · 92%"
 *   - error:       Toast — fallback pra digitação manual sem barreiras
 *
 * Não persiste nada. Apenas dispara `onExtract(data)` pra tela parent gerenciar
 * os campos do form.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, Modal, Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { Camera, FileScan, Image as ImageIcon, Sparkles, X } from 'lucide-react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';

// ── Shape do retorno da EF ────────────────────────────────────────────────────

export interface ProfessionalScanResult {
  document_type: string;
  full_name: string | null;
  council_name: string | null;
  council_number: string | null;
  council_uf: string | null;
  country: string | null;
  specialties: string[];
  valid_until: string | null;
  institution: string | null;
  confidence: number;
  /** URI local da foto pra exibir thumbnail. Não vai pro server. */
  thumbnailUri: string;
}

interface Props {
  onExtract: (data: ProfessionalScanResult) => void;
  /** Texto pra mostrar quando já houve scan (badge "Escanear outro"). */
  hasExtractedOnce?: boolean;
  /** Quando true, oculta o componente inteiro (ex: scan já processado). */
  hidden?: boolean;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ProfessionalDocScanner({ onExtract, hasExtractedOnce = false, hidden = false }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Lê arquivo local em base64 (sem prefixo data:image/...)
  const readBase64 = useCallback(async (uri: string): Promise<string | null> => {
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      return await readAsStringAsync(uri, { encoding: EncodingType.Base64 });
    } catch (e) {
      console.warn('[ProfDocScanner] base64 read failed:', e);
      return null;
    }
  }, []);

  // Chama a EF scan-professional-document e propaga via onExtract
  const processImage = useCallback(async (uri: string) => {
    setScanning(true);
    try {
      const b64 = await readBase64(uri);
      if (!b64) {
        toast(t('onboarding.pro.scanError'), 'error');
        return;
      }

      const { data, error } = await supabase.functions.invoke('scan-professional-document', {
        body: { photo_base64: b64 },
      });

      if (error || !data) {
        console.error('[ProfDocScanner] EF error:', error?.message);
        toast(t('onboarding.pro.scanError'), 'error');
        return;
      }

      const result: ProfessionalScanResult = {
        document_type: (data as { document_type?: string }).document_type ?? 'other',
        full_name:     (data as { full_name?: string | null }).full_name ?? null,
        council_name:  (data as { council_name?: string | null }).council_name ?? null,
        council_number:(data as { council_number?: string | null }).council_number ?? null,
        council_uf:    (data as { council_uf?: string | null }).council_uf ?? null,
        country:       (data as { country?: string | null }).country ?? null,
        specialties:   Array.isArray((data as { specialties?: unknown }).specialties)
                         ? (data as { specialties: string[] }).specialties
                         : [],
        valid_until:   (data as { valid_until?: string | null }).valid_until ?? null,
        institution:   (data as { institution?: string | null }).institution ?? null,
        confidence:    typeof (data as { confidence?: number }).confidence === 'number'
                         ? (data as { confidence: number }).confidence
                         : 0,
        thumbnailUri:  uri,
      };
      onExtract(result);
    } catch (e) {
      console.error('[ProfDocScanner] processImage error:', e);
      toast(t('onboarding.pro.scanError'), 'error');
    } finally {
      setScanning(false);
    }
  }, [readBase64, onExtract, toast, t]);

  const handleCamera = useCallback(async () => {
    setActionSheetOpen(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast(t('toast.cameraPermission'), 'warning');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('[ProfDocScanner] camera error:', e);
    }
  }, [processImage, toast, t]);

  const handleGallery = useCallback(async () => {
    setActionSheetOpen(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]) {
        processImage(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('[ProfDocScanner] gallery error:', e);
    }
  }, [processImage]);

  if (hidden) return null;

  return (
    <View style={styles.wrap}>
      {/* Hero card */}
      <View style={styles.heroCard}>
        <View style={styles.heroIconWrap}>
          <View style={styles.heroIcon}>
            <FileScan size={rs(28)} color={colors.ai} strokeWidth={1.6} />
          </View>
          <View style={styles.aiBadge}>
            <Sparkles size={rs(11)} color={colors.ai} strokeWidth={1.8} />
            <Text style={styles.aiBadgeText}>{t('onboarding.pro.scanAiBadge')}</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>{t('onboarding.pro.scanCardTitle')}</Text>
        <Text style={styles.heroHint}>{t('onboarding.pro.scanCardHint')}</Text>

        <TouchableOpacity
          style={styles.scanBtn}
          activeOpacity={0.8}
          onPress={() => setActionSheetOpen(true)}
          disabled={scanning}
        >
          {scanning ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.scanBtnText}>{t('onboarding.pro.scanning')}</Text>
            </>
          ) : (
            <>
              <Camera size={rs(18)} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.scanBtnText}>
                {hasExtractedOnce
                  ? t('onboarding.pro.scanBtnRescan')
                  : t('onboarding.pro.scanBtnIdle')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Action sheet (câmera / galeria) */}
      <Modal
        transparent
        visible={actionSheetOpen}
        animationType="slide"
        onRequestClose={() => setActionSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setActionSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('onboarding.pro.scanBtnIdle')}</Text>
              <TouchableOpacity onPress={() => setActionSheetOpen(false)} hitSlop={12}>
                <X size={rs(20)} color={colors.textSec} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sheetItem} activeOpacity={0.7} onPress={handleCamera}>
              <View style={styles.sheetItemIcon}>
                <Camera size={rs(20)} color={colors.click} strokeWidth={1.8} />
              </View>
              <Text style={styles.sheetItemText}>{t('onboarding.pro.scanFromCamera')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetItem} activeOpacity={0.7} onPress={handleGallery}>
              <View style={styles.sheetItemIcon}>
                <ImageIcon size={rs(20)} color={colors.click} strokeWidth={1.8} />
              </View>
              <Text style={styles.sheetItemText}>{t('onboarding.pro.scanFromGallery')}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ── Subcomponente: ScanResultPreview ──────────────────────────────────────────
// Mostra thumbnail + nº de campos preenchidos + confidence, abaixo do scanner
// quando algum extract aconteceu. Renderizado pela tela parent.

export function ScanResultPreview({
  thumbnailUri,
  fieldsFilled,
  confidence,
}: {
  thumbnailUri: string;
  fieldsFilled: number;
  confidence: number;
}) {
  const { t } = useTranslation();
  const pct = Math.round(confidence * 100);
  const lowConfidence = confidence > 0 && confidence < 0.6;

  return (
    <View style={styles.resultCard}>
      <Image source={{ uri: thumbnailUri }} style={styles.resultThumb} />
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle}>
          {t('onboarding.pro.scanFieldsFilled', { count: fieldsFilled })}
        </Text>
        <View style={styles.resultRow}>
          <Sparkles size={rs(12)} color={colors.ai} strokeWidth={1.8} />
          <Text style={styles.resultMeta}>
            {t('onboarding.pro.scanConfidence', { percent: pct })}
          </Text>
        </View>
        {lowConfidence && (
          <Text style={styles.resultLowConfidence}>
            {t('onboarding.pro.scanLowConfidence')}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  heroCard: {
    backgroundColor: colors.aiSoft,
    borderRadius: radii.card,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.aiRing ?? colors.ai + '40',
    alignItems: 'center',
  },
  heroIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: spacing.sm,
  },
  heroIcon: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.ai + '40',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: radii.sm,
    backgroundColor: colors.bgCard,
  },
  aiBadgeText: {
    color: colors.ai,
    fontSize: fs(10),
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: fs(15),
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: rs(6),
  },
  heroHint: {
    color: colors.textSec,
    fontSize: fs(12),
    textAlign: 'center',
    lineHeight: fs(18),
    marginBottom: spacing.md,
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: colors.click,
    paddingVertical: rs(13),
    paddingHorizontal: rs(20),
    borderRadius: radii.lg,
    minWidth: rs(220),
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: fs(14),
    fontWeight: '700',
  },

  // Action sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 25, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(26),
    borderTopRightRadius: rs(26),
    padding: spacing.lg,
    paddingBottom: rs(40),
  },
  sheetHandle: {
    width: rs(40),
    height: rs(5),
    backgroundColor: colors.textGhost,
    borderRadius: rs(3),
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: fs(16),
    fontWeight: '700',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    paddingVertical: rs(14),
    paddingHorizontal: rs(12),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
  },
  sheetItemIcon: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: colors.clickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemText: {
    color: colors.text,
    fontSize: fs(14),
    fontWeight: '600',
  },

  // Result preview
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.ai + '40',
  },
  resultThumb: {
    width: rs(60),
    height: rs(60),
    borderRadius: radii.md,
    backgroundColor: colors.bgDeep,
  },
  resultBody: { flex: 1 },
  resultTitle: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '700',
    marginBottom: rs(4),
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
  },
  resultMeta: {
    color: colors.textSec,
    fontSize: fs(11),
  },
  resultLowConfidence: {
    color: colors.warning,
    fontSize: fs(11),
    marginTop: rs(4),
    lineHeight: fs(15),
  },
});
