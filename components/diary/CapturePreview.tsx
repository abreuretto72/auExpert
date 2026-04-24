/**
 * CapturePreview — preview steps for all diary entry types.
 *
 * Universal pattern: captured content + optional caption/context + single [Confirmar].
 * No ClassificationCards, no [Ignorar]/[Registrar], no percentuais de confiança.
 */
import React from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity,
  ScrollView, StyleSheet,
} from 'react-native';
import { Mic, Check, Ear, Video, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { sexContext, type PetSex } from '../../utils/petGender';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

export type DocType = 'prescription' | 'exam' | 'vaccine' | 'invoice' | 'receipt' | 'other';

const DOC_TYPES: { key: DocType; i18nKey: string }[] = [
  { key: 'prescription', i18nKey: 'diary.docTypePrescription' },
  { key: 'exam',         i18nKey: 'diary.docTypeExam' },
  { key: 'vaccine',      i18nKey: 'diary.docTypeVaccine' },
  { key: 'invoice',      i18nKey: 'diary.docTypeInvoice' },
  { key: 'receipt',      i18nKey: 'diary.docTypeReceipt' },
  { key: 'other',        i18nKey: 'diary.docTypeOther' },
];

function formatDuration(secs: number): string {
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

// ══════════════════════════════════════
// SHARED: CAPTION FIELD
// ══════════════════════════════════════

interface CaptionFieldProps {
  value: string;
  onChange: (v: string) => void;
  isListening: boolean;
  onMicToggle: () => void;
  labelKey?: string;
  placeholderKey?: string;
}

function CaptionField({
  value, onChange, isListening, onMicToggle, labelKey, placeholderKey,
}: CaptionFieldProps) {
  const { t } = useTranslation();
  return (
    <View style={s.captionWrapper}>
      {labelKey && (
        <Text style={s.captionLabel}>{t(labelKey)}</Text>
      )}
      <View style={[s.captionInputRow, isListening && s.captionInputRowActive]}>
        <TextInput
          style={s.captionInput}
          value={value}
          onChangeText={onChange}
          placeholder={t(placeholderKey ?? 'diary.captionPlaceholder')}
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[s.inlineMic, isListening && s.inlineMicActive]}
          onPress={onMicToggle}
          activeOpacity={0.7}
        >
          <Mic size={rs(18)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ══════════════════════════════════════
// SHARED: CONFIRM BUTTON
// ══════════════════════════════════════

function ConfirmButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity style={s.confirmBtn} onPress={onPress} activeOpacity={0.8}>
      <Check size={rs(18)} color="#fff" strokeWidth={2} />
      <Text style={s.confirmBtnText}>{t('diary.confirmEntry')}</Text>
    </TouchableOpacity>
  );
}

// ══════════════════════════════════════
// PHOTO PREVIEW
// ══════════════════════════════════════

export interface PhotoPreviewStepProps {
  photoUri: string;
  caption: string;
  onCaptionChange: (v: string) => void;
  isListening: boolean;
  onMicToggle: () => void;
  onConfirm: () => void;
}

export function PhotoPreviewStep({
  photoUri, caption, onCaptionChange, isListening, onMicToggle, onConfirm,
}: PhotoPreviewStepProps) {
  const { t } = useTranslation();
  return (
    <View style={s.container}>
      <Text style={s.stepTitle}>{t('diary.photoPreviewTitle')}</Text>
      <Image source={{ uri: photoUri }} style={s.photoPreview} resizeMode="cover" />
      <CaptionField
        value={caption}
        onChange={onCaptionChange}
        isListening={isListening}
        onMicToggle={onMicToggle}
        labelKey="diary.captionOptional"
      />
      <ConfirmButton onPress={onConfirm} />
    </View>
  );
}

// ══════════════════════════════════════
// GALLERY PREVIEW
// ══════════════════════════════════════

export interface GalleryPreviewStepProps {
  uris: string[];
  caption: string;
  onCaptionChange: (v: string) => void;
  isListening: boolean;
  onMicToggle: () => void;
  onConfirm: () => void;
  petName: string;
}

export function GalleryPreviewStep({
  uris, caption, onCaptionChange, isListening, onMicToggle, onConfirm, petName: _petName,
}: GalleryPreviewStepProps) {
  const { t } = useTranslation();
  const titleKey = uris.length === 1 ? 'diary.galleryPreviewTitle' : 'diary.galleryPreviewTitlePlural';
  return (
    <View style={s.container}>
      <Text style={s.stepTitle}>{t(titleKey, { count: uris.length })}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.galleryRow}
      >
        {uris.map((uri, i) => (
          <Image key={i} source={{ uri }} style={s.galleryThumb} resizeMode="cover" />
        ))}
      </ScrollView>
      <CaptionField
        value={caption}
        onChange={onCaptionChange}
        isListening={isListening}
        onMicToggle={onMicToggle}
        labelKey="diary.captionOptional"
      />
      <ConfirmButton onPress={onConfirm} />
    </View>
  );
}

// ══════════════════════════════════════
// VIDEO PREVIEW
// ══════════════════════════════════════

export interface VideoPreviewStepProps {
  durationSeconds: number;
  caption: string;
  onCaptionChange: (v: string) => void;
  isListening: boolean;
  onMicToggle: () => void;
  onConfirm: () => void;
}

export function VideoPreviewStep({
  durationSeconds, caption, onCaptionChange, isListening, onMicToggle, onConfirm,
}: VideoPreviewStepProps) {
  const { t } = useTranslation();
  return (
    <View style={s.container}>
      <Text style={s.stepTitle}>{t('diary.videoPreviewTitle')}</Text>
      {/* Thumbnail not available without expo-video-thumbnails — show icon placeholder */}
      <View style={s.mediaPlaceholder}>
        <Video size={rs(40)} color={colors.sky} strokeWidth={1.5} />
        <Text style={s.durationText}>{formatDuration(durationSeconds)}</Text>
      </View>
      <CaptionField
        value={caption}
        onChange={onCaptionChange}
        isListening={isListening}
        onMicToggle={onMicToggle}
        labelKey="diary.captionOptional"
      />
      <ConfirmButton onPress={onConfirm} />
    </View>
  );
}

// ══════════════════════════════════════
// AUDIO PREVIEW
// ══════════════════════════════════════

export interface AudioPreviewStepProps {
  durationSeconds: number;
  petName: string;
  petSex?: PetSex;
  context: string;
  onContextChange: (v: string) => void;
  isListening: boolean;
  onMicToggle: () => void;
  onConfirm: () => void;
}

export function AudioPreviewStep({
  durationSeconds, petName, petSex, context, onContextChange, isListening, onMicToggle, onConfirm,
}: AudioPreviewStepProps) {
  const { t } = useTranslation();
  return (
    <View style={s.container}>
      <Text style={s.stepTitle}>{t('diary.audioPreviewTitle', { name: petName, context: sexContext(petSex) })}</Text>
      <View style={s.mediaPlaceholder}>
        <Ear size={rs(40)} color={colors.rose} strokeWidth={1.5} />
        <Text style={s.durationText}>{formatDuration(durationSeconds)}</Text>
      </View>
      <CaptionField
        value={context}
        onChange={onContextChange}
        isListening={isListening}
        onMicToggle={onMicToggle}
        labelKey="diary.contextOptional"
        placeholderKey="diary.contextPlaceholder"
      />
      <ConfirmButton onPress={onConfirm} />
    </View>
  );
}

// ══════════════════════════════════════
// DOCUMENT PREVIEW
// ══════════════════════════════════════

export interface DocumentPreviewStepProps {
  docBase64: string;
  docType: DocType;
  onDocTypeChange: (t: DocType) => void;
  onConfirm: () => void;
}

export function DocumentPreviewStep({
  docBase64, docType, onDocTypeChange, onConfirm,
}: DocumentPreviewStepProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      style={s.docScrollRoot}
      contentContainerStyle={s.docScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={s.stepTitle}>{t('diary.docPreviewTitle')}</Text>
      {docBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${docBase64}` }}
          style={s.docPreview}
          resizeMode="contain"
        />
      ) : (
        <View style={s.mediaPlaceholder}>
          <FileText size={rs(40)} color={colors.warning} strokeWidth={1.5} />
        </View>
      )}
      <Text style={s.sectionLabel}>{t('diary.docTypeSelectorTitle')}</Text>
      <View style={s.docTypeRow}>
        {DOC_TYPES.map((d) => (
          <TouchableOpacity
            key={d.key}
            style={[s.docTypeChip, docType === d.key && s.docTypeChipActive]}
            onPress={() => onDocTypeChange(d.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.docTypeText, docType === d.key && s.docTypeTextActive]}>
              {t(d.i18nKey)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ConfirmButton onPress={onConfirm} />
    </ScrollView>
  );
}

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════

const s = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    padding: rs(16),
    gap: rs(14),
  },
  stepTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(17),
    color: colors.text,
  },

  // Photo
  photoPreview: {
    width: '100%',
    height: rs(240),
    borderRadius: rs(14),
    backgroundColor: colors.card,
  },

  // Gallery
  galleryRow: {
    gap: rs(8),
    paddingVertical: rs(4),
  },
  galleryThumb: {
    width: rs(108),
    height: rs(108),
    borderRadius: rs(12),
    backgroundColor: colors.card,
  },

  // Video / Audio placeholder
  mediaPlaceholder: {
    width: '100%',
    height: rs(150),
    borderRadius: rs(14),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
  },
  durationText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(18),
    color: colors.textSec,
  },

  // Document
  docScrollRoot: { flex: 1 },
  docScrollContent: {
    padding: rs(16),
    gap: rs(14),
    paddingBottom: rs(32),
  },
  docPreview: {
    width: '100%',
    height: rs(220),
    borderRadius: rs(12),
    backgroundColor: colors.card,
  },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginTop: rs(4),
  },
  docTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  docTypeChip: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(8),
    borderRadius: rs(10),
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  docTypeChipActive: {
    backgroundColor: colors.clickSoft,
    borderColor: `${colors.click}60`,
  },
  docTypeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textSec,
  },
  docTypeTextActive: {
    color: colors.click,
  },

  // Caption field
  captionWrapper: { gap: rs(6) },
  captionLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  captionInputRow: {
    backgroundColor: colors.card,
    borderRadius: rs(12),
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: rs(12),
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rs(8),
  },
  captionInputRowActive: {
    borderColor: `${colors.click}60`,
  },
  captionInput: {
    flex: 1,
    fontSize: fs(14),
    color: colors.text,
    lineHeight: fs(20),
    maxHeight: rs(80),
    textAlignVertical: 'top',
  },
  inlineMic: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    backgroundColor: colors.clickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineMicActive: {
    backgroundColor: colors.clickRing,
  },

  // Confirm button
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: colors.click,
    paddingVertical: rs(16),
    borderRadius: rs(14),
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(12),
    elevation: 6,
    marginTop: 'auto',
  },
  confirmBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: '#fff',
  },
});
