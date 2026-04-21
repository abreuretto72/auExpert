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
  Building2,
  Stethoscope,
  FileText,
  FlaskConical,
  ClipboardList,
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

export interface ExamData {
  name: string;
  date: string;
  status: 'normal' | 'attention' | 'critical';
  laboratory?: string | null;
  veterinarian?: string | null;
  notes?: string | null;
  pet_id: string;
  user_id: string;
}

interface OcrExamResult {
  name?: string;
  date?: string;
  status?: 'normal' | 'attention' | 'critical';
  laboratory?: string;
  veterinarian?: string;
  notes?: string;
  confidence?: number;
}

interface AddExamModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (exam: ExamData) => void;
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

const STATUS_OPTIONS: Array<'normal' | 'attention' | 'critical'> = ['normal', 'attention', 'critical'];

const AddExamModal: React.FC<AddExamModalProps> = ({
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
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'normal' | 'attention' | 'critical'>('normal');
  const [laboratory, setLaboratory] = useState('');
  const [veterinarian, setVeterinarian] = useState('');
  const [notes, setNotes] = useState('');

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
    setName('');
    setDate('');
    setStatus('normal');
    setLaboratory('');
    setVeterinarian('');
    setNotes('');
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

  const applyOcrResult = useCallback((result: OcrExamResult) => {
    if (result.name) setName(result.name);
    if (result.date) setDate(isoToDisplay(result.date));
    if (result.status) setStatus(result.status);
    if (result.laboratory) setLaboratory(result.laboratory);
    if (result.veterinarian) setVeterinarian(result.veterinarian);
    if (result.notes) setNotes(result.notes);
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
            document_type: 'exam',
            language: i18n.language,
          },
        }),
        15_000,
        'ocr-document:exam',
      );

      if (error) throw error;

      const result = data as OcrExamResult;
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
    if (!name.trim()) {
      newErrors.name = t('health.examNameRequired');
    }
    if (!date.trim()) {
      newErrors.date = t('health.dateRequired');
    } else {
      const iso = displayToIso(date.trim());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        newErrors.date = t('health.dateInvalid');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, date, t]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const exam: ExamData = {
      name: name.trim(),
      date: displayToIso(date.trim()),
      status,
      laboratory: laboratory.trim() || null,
      veterinarian: veterinarian.trim() || null,
      notes: notes.trim() || null,
      pet_id: petId,
      user_id: userId,
    };

    onSubmit(exam);
  }, [validate, name, date, status, laboratory, veterinarian, notes, petId, userId, onSubmit]);

  if (!visible) return null;

  const statusLabelKey: Record<string, string> = {
    normal: 'health.normal',
    attention: 'health.attentionStatus',
    critical: 'health.critical',
  };

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <ClipboardList size={rs(22)} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.title}>{t('health.addExam')}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.step0Scroll}>
        <Input
          label={t('health.notes')}
          placeholder={t('health.examNotesPlaceholder')}
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={styles.orLabel}>{t('health.orImportWith')}</Text>

        <TouchableOpacity style={styles.methodCard} onPress={handleTakePhoto} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.purpleSoft }]}>
          <Camera size={rs(28)} color={colors.purple} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.photoExam')}</Text>
          <Text style={styles.methodDesc}>{t('health.photoExamDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.accent} strokeWidth={1.8} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.methodCard} onPress={handlePickFromGallery} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.petrolSoft }]}>
          <ImageIcon size={rs(28)} color={colors.petrol} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.galleryExam')}</Text>
          <Text style={styles.methodDesc}>{t('health.galleryExamDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.accent} strokeWidth={1.8} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.methodCard} onPress={handleManualEntry} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.accentGlow }]}>
          <PenLine size={rs(28)} color={colors.accent} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.manualExamEntry')}</Text>
          <Text style={styles.methodDesc}>{t('health.manualExamEntryDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.accent} strokeWidth={1.8} />
      </TouchableOpacity>
    </ScrollView>
  </View>
);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('health.examDetails')}</Text>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {analyzing && (
        <Animated.View style={[styles.analyzingBanner, { transform: [{ scale: pulseAnim }] }]}>
          <ScanEye size={rs(20)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.analyzingText}>{t('health.analyzingExam')}</Text>
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
          label={t('health.examName')}
          placeholder={t('health.examNamePlaceholder')}
          icon={<ClipboardList size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

        <Input
          label={t('health.examDate')}
          placeholder={t('health.datePlaceholder')}
          icon={<Calendar size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={date}
          onChangeText={setDate}
          error={errors.date}
          type="numeric"
          showMic={false}
        />

        {/* Status chips */}
        <View style={styles.chipSection}>
          <Text style={styles.chipLabel}>{t('health.status')}</Text>
          <View style={styles.chipRow}>
            {STATUS_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, status === s && styles.chipActive]}
                onPress={() => setStatus(s)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                  {t(statusLabelKey[s])}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label={t('health.lab')}
          placeholder={t('health.labPlaceholder')}
          icon={<FlaskConical size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={laboratory}
          onChangeText={setLaboratory}
        />

        <Input
          label={t('health.vet')}
          placeholder={t('health.vetPlaceholder')}
          icon={<Stethoscope size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={veterinarian}
          onChangeText={setVeterinarian}
        />

        <Input
          label={t('health.notes')}
          placeholder={t('health.examNotesPlaceholder')}
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={notes}
          onChangeText={setNotes}
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
              <Text style={styles.submitBtnText}>{t('health.saveExam')}</Text>
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

export default AddExamModal;

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
  step0Scroll: {
    maxHeight: rs(520),
  },
  orLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textSec,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  formScroll: {
    maxHeight: rs(560),
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
    borderColor: colors.accent,
    backgroundColor: colors.accentGlow,
  },
  chipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textSec,
  },
  chipTextActive: {
    color: colors.accent,
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
    backgroundColor: colors.accent,
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
