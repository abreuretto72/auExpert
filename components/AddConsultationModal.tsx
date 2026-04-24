import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  X,
  ArrowRight,
  ChevronLeft,
  ScanEye,
  Sparkles,
  ImageIcon,
  PenLine,
  Calendar,
  Clock,
  Building2,
  Stethoscope,
  FileText,
  ClipboardCheck,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../hooks/useResponsive';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { Input } from './ui/Input';
import { useToast } from './Toast';
import { getErrorMessage } from '../utils/errorMessages';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/withTimeout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ConsultationType = 'check-up' | 'emergency' | 'specialty' | 'follow-up';

export interface ConsultationData {
  date: string;
  time?: string | null;
  veterinarian: string;
  clinic?: string | null;
  type: ConsultationType;
  summary: string;
  pet_id: string;
  user_id: string;
}

interface OcrConsultationResult {
  date?: string;
  veterinarian?: string;
  clinic?: string;
  type?: ConsultationType;
  summary?: string;
  confidence?: number;
}

interface AddConsultationModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (consultation: ConsultationData) => void;
  petId: string;
  userId: string;
  isSubmitting?: boolean;
}

type Step = 0 | 1;

function displayToIso(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return display;
}

function isoToDisplay(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return iso;
}

const CONSULT_TYPE_OPTIONS: ConsultationType[] = ['check-up', 'emergency', 'specialty', 'follow-up'];

const AddConsultationModal: React.FC<AddConsultationModalProps> = ({
  visible,
  onClose,
  onSubmit,
  petId,
  userId,
  isSubmitting = false,
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Form fields
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [veterinarian, setVeterinarian] = useState('');
  const [clinic, setClinic] = useState('');
  const [consultType, setConsultType] = useState<ConsultationType>('check-up');
  const [summary, setSummary] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Animations
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (analyzing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [analyzing]);

  const resetForm = useCallback(() => {
    setStep(0);
    setAnalyzing(false);
    setOcrConfidence(null);
    setDate('');
    setTime('');
    setVeterinarian('');
    setClinic('');
    setConsultType('check-up');
    setSummary('');
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleBack = useCallback(() => {
    if (step === 1) {
      resetForm();
    }
  }, [step, resetForm]);

  const applyOcrResult = useCallback((result: OcrConsultationResult) => {
    if (result.date) setDate(isoToDisplay(result.date));
    if (result.veterinarian) setVeterinarian(result.veterinarian);
    if (result.clinic) setClinic(result.clinic);
    if (result.type) setConsultType(result.type);
    if (result.summary) setSummary(result.summary);
    if (result.confidence != null) setOcrConfidence(Math.round(result.confidence * 100));
  }, []);

  const handleOcrPhoto = useCallback(async (uri: string) => {
    setAnalyzing(true);
    setStep(1);
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('ocr-document', {
          body: {
            photo_base64: base64,
            document_type: 'general',
            type: 'consultation',
            language: i18n.language,
          },
        }),
        15_000,
        'ocr-document:consultation',
      );

      if (error) throw error;

      const result = data as OcrConsultationResult;
      applyOcrResult(result);
      toast(t('health.ocrSuccess'), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [i18n.language, toast, t, applyOcrResult]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status: permStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (permStatus !== 'granted') {
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
        handleOcrPhoto(result.assets[0].uri);
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [toast, t, handleOcrPhoto]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        handleOcrPhoto(result.assets[0].uri);
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [toast, handleOcrPhoto]);

  const handleManualEntry = useCallback(() => {
    setOcrConfidence(null);
    setStep(1);
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!date.trim()) {
      newErrors.date = t('health.dateRequired');
    } else {
      const iso = displayToIso(date.trim());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        newErrors.date = t('health.dateInvalid');
      }
    }
    if (!veterinarian.trim()) {
      newErrors.veterinarian = t('health.vetRequired');
    }
    if (!summary.trim()) {
      newErrors.summary = t('health.summaryRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [date, veterinarian, summary, t]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const consultation: ConsultationData = {
      date: displayToIso(date.trim()),
      time: time.trim() || null,
      veterinarian: veterinarian.trim(),
      clinic: clinic.trim() || null,
      type: consultType,
      summary: summary.trim(),
      pet_id: petId,
      user_id: userId,
    };

    onSubmit(consultation);
  }, [validate, date, veterinarian, clinic, consultType, summary, petId, userId, onSubmit]);

  if (!visible) return null;

  const consultTypeLabelKey: Record<ConsultationType, string> = {
    'check-up': 'health.consultCheckUp',
    emergency: 'health.consultEmergency',
    specialty: 'health.consultSpecialty',
    'follow-up': 'health.consultFollowUp',
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <ClipboardCheck size={rs(22)} color={colors.click} strokeWidth={1.8} />
          <Text style={styles.title}>{t('health.addConsultation')}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.step0Scroll}>
        <Input
          label={t('health.summary')}
          placeholder={t('health.summaryPlaceholder')}
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={summary}
          onChangeText={setSummary}
          multiline
        />

        <Text style={styles.orLabel}>{t('health.orImportWith')}</Text>

        <TouchableOpacity style={styles.methodCard} onPress={handleTakePhoto} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.purpleSoft }]}>
          <Camera size={rs(28)} color={colors.purple} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.photoConsultation')}</Text>
          <Text style={styles.methodDesc}>{t('health.photoConsultationDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.methodCard} onPress={handlePickFromGallery} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.petrolSoft }]}>
          <ImageIcon size={rs(28)} color={colors.petrol} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.galleryConsultation')}</Text>
          <Text style={styles.methodDesc}>{t('health.galleryConsultationDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.methodCard} onPress={handleManualEntry} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.clickSoft }]}>
          <PenLine size={rs(28)} color={colors.click} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.manualConsultEntry')}</Text>
          <Text style={styles.methodDesc}>{t('health.manualConsultEntryDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>

        <View style={{ height: rs(16) }} />
      </ScrollView>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('health.consultDetails')}</Text>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {analyzing && (
        <Animated.View style={[styles.analyzingBanner, { transform: [{ scale: pulseAnim }] }]}>
          <ScanEye size={rs(20)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.analyzingText}>{t('health.analyzingConsultation')}</Text>
          <ActivityIndicator size="small" color={colors.purple} />
        </Animated.View>
      )}

      {ocrConfidence != null && !analyzing && (
        <View style={styles.ocrBadge}>
          <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.ocrBadgeText}>
            {t('health.ocrFilled', { confidence: ocrConfidence })}
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label={t('health.consultDate')}
          placeholder={t('health.datePlaceholder')}
          icon={<Calendar size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={date}
          onChangeText={setDate}
          error={errors.date}
          type="numeric"
          showMic={false}
        />

        <Input
          label={t('health.consultTime')}
          placeholder={t('health.consultTimePlaceholder')}
          icon={<Clock size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={time}
          onChangeText={setTime}
          type="numeric"
          showMic={false}
        />

        <Input
          label={t('health.vet')}
          placeholder={t('health.vetPlaceholder')}
          icon={<Stethoscope size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={veterinarian}
          onChangeText={setVeterinarian}
          error={errors.veterinarian}
        />

        <Input
          label={t('health.clinic')}
          placeholder={t('health.clinicPlaceholder')}
          icon={<Building2 size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={clinic}
          onChangeText={setClinic}
        />

        {/* Consultation type chips */}
        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>{t('health.consultationType')}</Text>
          <View style={styles.chipRow}>
            {CONSULT_TYPE_OPTIONS.map((ct) => (
              <TouchableOpacity
                key={ct}
                style={[styles.chip, consultType === ct && styles.chipActive]}
                onPress={() => setConsultType(ct)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, consultType === ct && styles.chipTextActive]}>
                  {t(consultTypeLabelKey[ct])}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label={t('health.summary')}
          placeholder={t('health.summaryPlaceholder')}
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={summary}
          onChangeText={setSummary}
          error={errors.summary}
          multiline
        />

        {ocrConfidence != null && (
          <Text style={styles.disclaimer}>{t('ai.disclaimer')}</Text>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (isSubmitting || analyzing) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || analyzing}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.submitBtnText}>{t('health.saveConsultation')}</Text>
              <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: rs(32) }} />
      </ScrollView>
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View style={[styles.sheet, { paddingBottom: rs(16) + insets.bottom, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {step === 0 ? renderStep0() : renderStep1()}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AddConsultationModal;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 25, 0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    maxHeight: '92%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: rs(10),
    paddingBottom: rs(6),
  },
  handle: {
    width: rs(40),
    height: rs(5),
    backgroundColor: colors.textGhost,
    borderRadius: rs(3),
  },
  stepContainer: {
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(20),
    color: colors.text,
  },
  subtitle: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textSec,
    marginBottom: spacing.lg,
  },
  step0Scroll: {
    maxHeight: rs(520),
  },
  orLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  methodIconWrap: {
    width: rs(52),
    height: rs(52),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTextWrap: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  methodTitle: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
    marginBottom: rs(2),
  },
  methodDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
  },
  analyzingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purpleSoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  analyzingText: {
    flex: 1,
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.purple,
  },
  ocrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.purpleSoft,
    borderRadius: radii.sm,
    paddingVertical: rs(4),
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    gap: rs(4),
  },
  ocrBadgeText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.purple,
  },
  formScroll: {
    maxHeight: rs(480),
  },
  formContent: {
    paddingBottom: spacing.md,
  },
  chipSection: {
    marginBottom: spacing.md,
  },
  chipLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textSec,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: rs(8),
    paddingHorizontal: rs(16),
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.click,
    backgroundColor: colors.clickSoft,
  },
  chipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textSec,
  },
  chipTextActive: {
    color: colors.click,
  },
  disclaimer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.click,
    borderRadius: radii.xl,
    paddingVertical: rs(16),
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: '#fff',
  },
});
