/**
 * DocumentScanner — full-screen camera with 4-corner document guide overlay.
 * Used for OCR scanning of vaccine cards, invoices, prescriptions, etc.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Zap, ZapOff, ScanLine, Image as ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

// ── Types ──────────────────────────────────────────────────────────────────

interface DocumentScannerProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DocumentScanner({ onCapture, onClose }: DocumentScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Garante que o documento não passe de 2400px de largura @ 0.92 JPEG.
  // Valores altos preservam nitidez do texto — OCR de documento exige qualidade.
  // O ganho aqui NÃO está em comprimir forte, mas em evitar o base64 duplo do
  // takePictureAsync({ base64: true }) que criava ~8MB em memória antes do resize.
  const prepareDocument = async (uri: string): Promise<string | null> => {
    try {
      const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
      const ImageManipulator = require('expo-image-manipulator');
      const t0 = Date.now();
      const prepared = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 2400 } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
      );
      const b64 = await readAsStringAsync(prepared.uri, { encoding: EncodingType.Base64 });
      console.log('[SCANNER] prepared base64 KB:', Math.round(b64.length * 0.75 / 1024), '| ms:', Date.now() - t0);
      return b64;
    } catch (err) {
      console.warn('[SCANNER] prepare failed:', String(err));
      return null;
    }
  };

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      // Captura em qualidade máxima e apenas URI (sem base64 inline) — evita
      // o custo de materializar ~8MB de base64 em memória antes do resize.
      // O prepareDocument aplica resize leve (2400px) só se a imagem for maior.
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 1,
        exif: false,
      });
      if (photo?.uri) {
        const b64 = await prepareDocument(photo.uri);
        if (b64) onCapture(b64);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  const handlePickFromGallery = useCallback(async () => {
    if (isCapturing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    // Sem base64 no picker — prepareDocument comprime depois (qualidade alta p/ OCR)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
      base64: false,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const b64 = await prepareDocument(result.assets[0].uri);
    if (b64) onCapture(b64);
  }, [isCapturing, onCapture]);

  // ── Permission gate ──

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.permissionContainer]}>
        <ScanLine size={rs(48)} color={colors.textDim} strokeWidth={1.5} />
        <Text style={styles.permissionTitle}>{t('diary.cameraRequired')}</Text>
        <Text style={styles.permissionSub}>{t('diary.scannerNeedsCamera')}</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permissionBtnText}>{t('diary.allowCamera')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtnAlt} onPress={onClose} activeOpacity={0.7}>
          <Text style={styles.backBtnAltText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Scanner UI ──

  return (
    <View style={styles.root}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flash}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onClose} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>{t('diary.scannerTitle')}</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
            activeOpacity={0.7}
          >
            {flash === 'on'
              ? <Zap size={rs(20)} color={colors.warning} strokeWidth={2} />
              : <ZapOff size={rs(20)} color="#fff" strokeWidth={1.8} />
            }
          </TouchableOpacity>
        </View>

        {/* Document guide frame */}
        <View style={styles.guideFrame}>
          {/* Corners */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Hint text */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>{t('diary.scannerHint')}</Text>
        </View>

        {/* Capture button + gallery upload */}
        <View style={styles.captureArea}>
          {/* Gallery upload button */}
          <TouchableOpacity
            style={[styles.galleryBtn, isCapturing && styles.captureBtnDisabled]}
            onPress={handlePickFromGallery}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <ImageIcon size={rs(22)} color="#fff" strokeWidth={1.8} />
          </TouchableOpacity>

          {/* Camera shutter */}
          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.captureBtnDisabled]}
            onPress={handleCapture}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            {isCapturing
              ? <ActivityIndicator color="#fff" size="small" />
              : <View style={styles.captureInner} />
            }
          </TouchableOpacity>

          {/* Spacer to keep shutter centered */}
          <View style={styles.galleryBtn} />
        </View>
      </CameraView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const CORNER_SIZE = rs(28);
const CORNER_THICK = 3;
const CORNER_COLOR = colors.success;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },

  // Permission screen
  permissionContainer: {
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(16),
    padding: rs(32),
  },
  permissionTitle: {
    color: colors.text,
    fontSize: fs(18),
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionSub: {
    color: colors.textSec,
    fontSize: fs(14),
    textAlign: 'center',
    lineHeight: fs(20),
  },
  permissionBtn: {
    backgroundColor: colors.click,
    paddingHorizontal: rs(32),
    paddingVertical: rs(14),
    borderRadius: rs(14),
    marginTop: rs(8),
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '700',
  },
  backBtnAlt: {
    paddingVertical: rs(12),
  },
  backBtnAltText: {
    color: colors.textDim,
    fontSize: fs(14),
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingTop: rs(56),
    paddingBottom: rs(16),
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  iconBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '700',
  },

  // Guide frame with 4 corners
  guideFrame: {
    flex: 1,
    marginHorizontal: rs(32),
    marginVertical: rs(20),
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderTopLeftRadius: rs(4),
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderTopRightRadius: rs(4),
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
    borderBottomLeftRadius: rs(4),
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
    borderBottomRightRadius: rs(4),
  },

  // Hint
  hintContainer: {
    alignItems: 'center',
    paddingVertical: rs(12),
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fs(13),
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Capture
  captureArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(48),
    paddingBottom: rs(48),
    paddingTop: rs(16),
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  galleryBtn: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(24),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  captureBtnDisabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: '#fff',
  },
});
