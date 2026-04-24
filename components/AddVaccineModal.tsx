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
  Syringe,
  ScanEye,
  Sparkles,
  ImageIcon,
  PenLine,
  Calendar,
  Building2,
  FlaskConical,
  Hash,
  Stethoscope,
  FileText,
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

export interface VaccineData {
  name: string;
  laboratory?: string | null;
  batch_number?: string | null;
  date_administered: string;
  next_due_date?: string | null;
  dose_number?: number | null;
  veterinarian?: string | null;
  clinic?: string | null;
  notes?: string | null;
  pet_id: string;
  user_id: string;
}

interface OcrVaccineResult {
  name?: string;
  laboratory?: string;
  batch_number?: string;
  date_administered?: string;
  next_due_date?: string;
  dose_number?: number;
  veterinarian?: string;
  clinic?: string;
  notes?: string;
  confidence?: number;
}

interface AddVaccineModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (vaccine: VaccineData) => void;
  petId: string;
  userId: string;
  isSubmitting?: boolean;
}

type Step = 0 | 1;

/**
 * Parses a date string from display format (DD/MM/YYYY) to storage format (YYYY-MM-DD).
 * Returns the original string if it cannot be parsed.
 */
function displayToIso(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  // Already ISO or partial — return as-is
  return display;
}

/**
 * Parses a date string from storage format (YYYY-MM-DD) to display format (DD/MM/YYYY).
 */
function isoToDisplay(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return iso;
}

const DOSE_OPTIONS = [1, 2, 3, 4, 5];

const AddVaccineModal: React.FC<AddVaccineModalProps> = ({
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

  // Step: 0 = choose method, 1 = form
  const [step, setStep] = useState<Step>(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [laboratory, setLaboratory] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [dateAdministered, setDateAdministered] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [doseNumber, setDoseNumber] = useState<number | null>(null);
  const [veterinarian, setVeterinarian] = useState('');
  const [clinic, setClinic] = useState('');
  const [notes, setNotes] = useState('');

  // Validation
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
    setLaboratory('');
    setBatchNumber('');
    setDateAdministered('');
    setNextDueDate('');
    setDoseNumber(null);
    setVeterinarian('');
    setClinic('');
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

  const applyOcrResult = useCallback((result: OcrVaccineResult) => {
    if (result.name) setName(result.name);
    if (result.laboratory) setLaboratory(result.laboratory);
    if (result.batch_number) setBatchNumber(result.batch_number);
    if (result.date_administered) setDateAdministered(isoToDisplay(result.date_administered));
    if (result.next_due_date) setNextDueDate(isoToDisplay(result.next_due_date));
    if (result.dose_number) setDoseNumber(result.dose_number);
    if (result.veterinarian) setVeterinarian(result.veterinarian);
    if (result.clinic) setClinic(result.clinic);
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
            document_type: 'vaccine',
            language: i18n.language,
          },
        }),
        15_000,
        'ocr-document:vaccine',
      );

      if (error) throw error;

      const result = data as OcrVaccineResult;
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
      newErrors.name = t('health.vaccineNameRequired');
    }
    if (!dateAdministered.trim()) {
      newErrors.dateAdministered = t('health.dateRequired');
    } else {
      const iso = displayToIso(dateAdministered.trim());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        newErrors.dateAdministered = t('health.dateInvalid');
      }
    }
    if (nextDueDate.trim()) {
      const iso = displayToIso(nextDueDate.trim());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
        newErrors.nextDueDate = t('health.dateInvalid');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, dateAdministered, nextDueDate, t]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const vaccine: VaccineData = {
      name: name.trim(),
      laboratory: laboratory.trim() || null,
      batch_number: batchNumber.trim() || null,
      date_administered: displayToIso(dateAdministered.trim()),
      next_due_date: nextDueDate.trim() ? displayToIso(nextDueDate.trim()) : null,
      dose_number: doseNumber,
      veterinarian: veterinarian.trim() || null,
      clinic: clinic.trim() || null,
      notes: notes.trim() || null,
      pet_id: petId,
      user_id: userId,
    };

    onSubmit(vaccine);
  }, [validate, name, laboratory, batchNumber, dateAdministered, nextDueDate, doseNumber, veterinarian, clinic, notes, petId, userId, onSubmit]);

  if (!visible) return null;

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Syringe size={rs(22)} color={colors.click} strokeWidth={1.8} />
          <Text style={styles.title}>{t('health.addVaccine')}</Text>
        </View>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.step0Scroll}>
        <Input
          label={t('health.notes')}
          placeholder={t('health.vaccineNotesPlaceholder')}
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={styles.orLabel}>{t('health.orImportWith')}</Text>

        {/* OCR — Camera */}
        <TouchableOpacity style={styles.methodCard} onPress={handleTakePhoto} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.purpleSoft }]}>
          <Camera size={rs(28)} color={colors.purple} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.photoVaccineCard')}</Text>
          <Text style={styles.methodDesc}>{t('health.photoVaccineCardDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>

      {/* OCR — Gallery */}
      <TouchableOpacity style={styles.methodCard} onPress={handlePickFromGallery} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.petrolSoft }]}>
          <ImageIcon size={rs(28)} color={colors.petrol} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.galleryVaccineCard')}</Text>
          <Text style={styles.methodDesc}>{t('health.galleryVaccineCardDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>

      {/* Manual */}
      <TouchableOpacity style={styles.methodCard} onPress={handleManualEntry} activeOpacity={0.7}>
        <View style={[styles.methodIconWrap, { backgroundColor: colors.clickSoft }]}>
          <PenLine size={rs(28)} color={colors.click} strokeWidth={1.8} />
        </View>
        <View style={styles.methodTextWrap}>
          <Text style={styles.methodTitle}>{t('health.manualVaccineEntry')}</Text>
          <Text style={styles.methodDesc}>{t('health.manualVaccineEntryDesc')}</Text>
        </View>
        <ArrowRight size={rs(18)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>

        <View style={{ height: rs(16) }} />
      </ScrollView>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('health.vaccineDetails')}</Text>
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <X size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Analyzing indicator */}
      {analyzing && (
        <Animated.View style={[styles.analyzingBanner, { transform: [{ scale: pulseAnim }] }]}>
          <ScanEye size={rs(20)} color={colors.purple} strokeWidth={1.8} />
          <Text style={styles.analyzingText}>{t('health.analyzingVaccineCard')}</Text>
          <ActivityIndicator size="small" color={colors.purple} />
        </Animated.View>
      )}

      {/* OCR confidence badge */}
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
        {/* Vaccine name (required) */}
        <Input
          label={t('health.vaccineName')}
          placeholder={t('health.vaccineNamePlaceholder')}
          icon={<Syringe size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={name}
          onChangeText={setName}
          error={errors.name}
        />

        {/* Laboratory */}
        <Input
          label={t('health.lab')}
          placeholder={t('health.labPlaceholder')}
          icon={<FlaskConical size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={laboratory}
          onChangeText={setLaboratory}
        />

        {/* Batch number */}
        <Input
          label={t('health.batch')}
          placeholder={t('health.batchPlaceholder')}
          icon={<Hash size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={batchNumber}
          onChangeText={setBatchNumber}
        />

        {/* Date administered (required) */}
        <Input
          label={t('health.dateAdministered')}
          placeholder={t('health.datePlaceholder')}
          icon={<Calendar size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={dateAdministered}
          onChangeText={setDateAdministered}
          error={errors.dateAdministered}
          type="numeric"
          showMic={false}
        />

        {/* Next due date */}
        <Input
          label={t('health.nextDue')}
          placeholder={t('health.datePlaceholder')}
          icon={<Calendar size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={nextDueDate}
          onChangeText={setNextDueDate}
          error={errors.nextDueDate}
          type="numeric"
          showMic={false}
        />

        {/* Dose number */}
        <View style={styles.doseSection}>
          <Text style={styles.doseLabel}>{t('health.doseNumber')}</Text>
          <View style={styles.doseRow}>
            {DOSE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.doseChip, doseNumber === d && styles.doseChipActive]}
                onPress={() => setDoseNumber(doseNumber === d ? null : d)}
                activeOpacity={0.7}
              >
                <Text style={[styles.doseChipText, doseNumber === d && styles.doseChipTextActive]}>
                  {d === 5 ? t('health.booster') : `${d}${t('health.doseOrdinal')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Veterinarian */}
        <Input
          label={t('health.vet')}
          placeholder={t('health.vetPlaceholder')}
          icon={<Stethoscope size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={veterinarian}
          onChangeText={setVeterinarian}
        />

        {/* Clinic */}
        <Input
          label={t('health.clinic')}
          placeholder={t('health.clinicPlaceholder')}
          icon={<Building2 size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={clinic}
          onChangeText={setClinic}
        />

        {/* Notes */}
        <Input
          label={t('health.notes')}
          placeholder={t('health.vaccineNotesPlaceholder')}
          icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* AI disclaimer */}
        {ocrConfidence != null && (
          <Text style={styles.disclaimer}>{t('ai.disclaimer')}</Text>
        )}

        {/* Submit button */}
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
              <Text style={styles.submitBtnText}>{t('health.saveVaccine')}</Text>
              <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
            </>
          )}
        </TouchableOpacity>

        {/* Bottom spacer */}
        <View style={{ height: rs(32) }} />
      </ScrollView>
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Bottom sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Animated.View style={[styles.sheet, { paddingBottom: rs(16) + insets.bottom, transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {step === 0 ? renderStep0() : renderStep1()}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AddVaccineModal;

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
  // Method cards (step 0)
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
  // Analyzing banner
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
  // OCR confidence badge
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
  // Form
  formScroll: {
    maxHeight: rs(560),
  },
  formContent: {
    paddingBottom: spacing.md,
  },
  // Dose chips
  doseSection: {
    marginBottom: spacing.md,
  },
  doseLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textSec,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  doseRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  doseChip: {
    paddingVertical: rs(8),
    paddingHorizontal: rs(16),
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  doseChipActive: {
    borderColor: colors.click,
    backgroundColor: colors.clickSoft,
  },
  doseChipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textSec,
  },
  doseChipTextActive: {
    color: colors.click,
  },
  // Disclaimer
  disclaimer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  // Submit
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
