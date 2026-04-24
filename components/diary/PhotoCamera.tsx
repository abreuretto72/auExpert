/**
 * PhotoCamera — in-app camera for capturing diary photo attachments.
 *
 * Why in-app instead of ImagePicker.launchCameraAsync:
 *   launchCameraAsync launches an external Android Activity. Android can kill
 *   the Expo JS process to free memory for the camera app, causing a full app
 *   restart and losing all unsaved state (text, other attachments, draft).
 *   CameraView keeps the camera within the app — no process death risk.
 *
 * Returns a compressed local URI via onCapture(uri) callback.
 * Also provides a gallery picker option (launchImageLibraryAsync is safe —
 * the gallery picker does not trigger process death on Android).
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Zap, ZapOff, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';

// ── Types ──────────────────────────────────────────────────────────────────

interface PhotoCameraProps {
  onCapture: (uri: string) => void;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PhotoCamera({ onCapture, onClose }: PhotoCameraProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // ── Compress to 1200px / 78% JPEG (matches compressPhoto in new.tsx) ──────
  const compress = useCallback(async (uri: string): Promise<string> => {
    console.log('[PHOTOCAM] compress start | uri suffix:', uri?.slice(-40));
    try {
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
      const result = await manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.78, format: SaveFormat.JPEG },
      );
      console.log('[PHOTOCAM] compress done | result suffix:', result.uri?.slice(-40));
      return result.uri;
    } catch (e) {
      console.warn('[PHOTOCAM] compress failed — returning original URI:', e);
      return uri;
    }
  }, []);

  // ── In-app shutter capture ─────────────────────────────────────────────────
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    console.log('[PHOTOCAM] handleCapture start');
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0,      // raw capture — compression handles final quality
        base64: false,   // URI only — avoids in-memory base64 OOM
        exif: false,
      });
      console.log('[PHOTOCAM] takePictureAsync done | uri:', photo?.uri?.slice(-40));
      if (photo?.uri) {
        const compressedUri = await compress(photo.uri);
        console.log('[PHOTOCAM] calling onCapture with compressed URI');
        onCapture(compressedUri);
      } else {
        console.warn('[PHOTOCAM] takePictureAsync returned no URI');
      }
    } catch (e) {
      console.error('[PHOTOCAM] handleCapture error:', e);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, compress, onCapture]);

  // ── Gallery picker (safe — no process death on Android) ───────────────────
  const handlePickFromGallery = useCallback(async () => {
    if (isCapturing) return;
    console.log('[PHOTOCAM] handlePickFromGallery start');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('[PHOTOCAM] gallery permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0,
      allowsEditing: false,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) {
      console.log('[PHOTOCAM] gallery picker cancelled or no asset');
      return;
    }
    console.log('[PHOTOCAM] gallery asset selected | uri:', result.assets[0].uri?.slice(-40));
    setIsCapturing(true);
    try {
      const compressedUri = await compress(result.assets[0].uri);
      console.log('[PHOTOCAM] gallery: calling onCapture with compressed URI');
      onCapture(compressedUri);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, compress, onCapture]);

  // ── Permission gate ────────────────────────────────────────────────────────

  if (!permission) {
    return <View style={styles.root} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.permissionContainer]}>
        <Camera size={rs(48)} color={colors.textDim} strokeWidth={1.5} />
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

  // ── Camera UI ──────────────────────────────────────────────────────────────

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
          <Text style={styles.topTitle}>{t('mic.takePhoto')}</Text>
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

        {/* Live viewfinder (fills remaining space) */}
        <View style={styles.viewfinder} />

        {/* Bottom control row: gallery | shutter | spacer */}
        <View style={styles.captureArea}>
          <TouchableOpacity
            style={[styles.galleryBtn, isCapturing && styles.disabled]}
            onPress={handlePickFromGallery}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            <ImageIcon size={rs(22)} color="#fff" strokeWidth={1.8} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, isCapturing && styles.disabled]}
            onPress={handleCapture}
            disabled={isCapturing}
            activeOpacity={0.8}
          >
            {isCapturing
              ? <ActivityIndicator color="#fff" size="small" />
              : <View style={styles.captureInner} />
            }
          </TouchableOpacity>

          {/* Invisible spacer — keeps shutter visually centred */}
          <View style={styles.galleryBtn} />
        </View>
      </CameraView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

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

  // Live viewfinder area
  viewfinder: {
    flex: 1,
  },

  // Bottom controls: gallery | shutter | spacer
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
  disabled: {
    opacity: 0.5,
  },
  captureInner: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(28),
    backgroundColor: '#fff',
  },
});
