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
import { X, ArrowRight, TrendingUp, FileText, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../hooks/useResponsive';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { Input } from './ui/Input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ── Metric types ────────────────────────────────────────────────────────────

const METRIC_TYPES = [
  { key: 'weight',       labelKey: 'health.metricWeight',       unit: 'kg' },
  { key: 'temperature',  labelKey: 'health.metricTemperature',  unit: '°C' },
  { key: 'heart_rate',   labelKey: 'health.metricHeartRate',    unit: 'bpm' },
  { key: 'glucose',      labelKey: 'health.metricGlucose',      unit: 'mg/dL' },
  { key: 'health_score', labelKey: 'health.metricHealthScore',  unit: '/100' },
] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface MetricData {
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
  notes?: string | null;
  pet_id: string;
  user_id: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: MetricData) => Promise<void>;
  petId: string;
  userId: string;
  isSubmitting?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function todayDDMMYYYY(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function parseDDMMYYYY(text: string): string | null {
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  if (isNaN(d.getTime())) return null;
  return `${yyyy}-${mm}-${dd}T12:00:00Z`;
}

function formatDateInput(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AddMetricsModal({
  visible, onClose, onSubmit, petId, userId, isSubmitting,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [metricType, setMetricType] = useState('weight');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(todayDDMMYYYY);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const overlayAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, overlayAnim, slideAnim]);

  const reset = useCallback(() => {
    setMetricType('weight');
    setValue('');
    setDate(todayDDMMYYYY());
    setNotes('');
    setErrors({});
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!value.trim() || isNaN(parseFloat(value.replace(',', '.')))) {
      errs.value = t('health.metricValueRequired');
    }
    if (!parseDDMMYYYY(date)) errs.date = t('health.dateInvalid');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [value, date, t]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    const selectedType = METRIC_TYPES.find((m) => m.key === metricType)!;
    await onSubmit({
      metric_type: metricType,
      value: parseFloat(value.replace(',', '.')),
      unit: selectedType.unit,
      measured_at: parseDDMMYYYY(date)!,
      notes: notes.trim() || null,
      pet_id: petId,
      user_id: userId,
    });
    reset();
  }, [validate, metricType, value, date, notes, petId, userId, onSubmit, reset]);

  const selectedUnit = METRIC_TYPES.find((m) => m.key === metricType)?.unit ?? '';

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

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <TrendingUp size={rs(20)} color={colors.petrol} strokeWidth={1.8} />
              <Text style={styles.title}>{t('health.addMetric')}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={rs(22)} color={colors.click} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Type chips */}
            <View style={styles.chipSection}>
              <Text style={styles.chipLabel}>{t('health.metricType')}</Text>
              <View style={styles.chipRow}>
                {METRIC_TYPES.map((mt) => (
                  <TouchableOpacity
                    key={mt.key}
                    style={[styles.chip, metricType === mt.key && styles.chipActive]}
                    onPress={() => setMetricType(mt.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, metricType === mt.key && styles.chipTextActive]}>
                      {t(mt.labelKey)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Value */}
            <Input
              label={`${t('health.metricValue')} (${selectedUnit})`}
              placeholder={t('health.metricValuePlaceholder')}
              icon={<TrendingUp size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
              value={value}
              onChangeText={setValue}
              error={errors.value}
              type="numeric"
              showMic={false}
            />

            {/* Date */}
            <Input
              label={t('health.metricDate')}
              placeholder={t('health.datePlaceholder')}
              icon={<Calendar size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
              value={date}
              onChangeText={(text) => setDate(formatDateInput(text))}
              error={errors.date}
              type="numeric"
              showMic={false}
            />

            {/* Notes — free text with mic */}
            <Input
              label={t('health.notes')}
              placeholder={t('health.metricNotesPlaceholder')}
              icon={<FileText size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>{t('health.saveMetric')}</Text>
                  <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: rs(32) }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,18,25,0.6)',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    maxHeight: '88%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: rs(10),
    paddingBottom: rs(4),
  },
  handle: {
    width: rs(40),
    height: rs(5),
    backgroundColor: colors.textGhost,
    borderRadius: rs(3),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
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
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: rs(8),
    gap: rs(4),
  },
  chipSection: {
    marginBottom: rs(4),
  },
  chipLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textSec,
    letterSpacing: 0.5,
    marginBottom: rs(8),
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  chip: {
    paddingHorizontal: rs(14),
    paddingVertical: rs(7),
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.textSec,
    borderColor: colors.petrol,
  },
  chipText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.textSec,
  },
  chipTextActive: {
    color: colors.petrol,
    fontFamily: 'Sora_600SemiBold',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.click,
    borderRadius: radii.xl,
    paddingVertical: rs(16),
    marginTop: rs(8),
    gap: rs(8),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: '#fff',
  },
});
