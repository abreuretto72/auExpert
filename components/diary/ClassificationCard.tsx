// DEPRECATED 01/04/2026 — ClassificationCards removed from diary entry flow.
// Only used in OCRResultScreen. Will be removed once OCR is refactored.
import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Syringe,
  Stethoscope,
  Scale,
  FileText,
  Pill,
  AlertTriangle,
  Scissors,
  Thermometer,
  UtensilsCrossed,
  Receipt,
  BookOpen,
  Check,
  X,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

type ClassificationType =
  | 'vaccine'
  | 'consultation'
  | 'weight'
  | 'exam'
  | 'medication'
  | 'allergy'
  | 'surgery'
  | 'symptom'
  | 'food'
  | 'expense'
  | 'moment';

interface ClassificationCardProps {
  type: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  suggestion: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

// ══════════════════════════════════════
// TYPE CONFIG — color + icon per type
// ══════════════════════════════════════

interface TypeConfig {
  readonly color: string;
  readonly softColor: string;
  readonly icon: LucideIcon;
  readonly i18nKey: string;
}

const TYPE_CONFIG: Readonly<Record<ClassificationType, TypeConfig>> = {
  vaccine: {
    color: colors.danger,
    softColor: colors.dangerSoft,
    icon: Syringe,
    i18nKey: 'diary.classificationVaccine',
  },
  consultation: {
    color: colors.petrol,
    softColor: colors.petrolSoft,
    icon: Stethoscope,
    i18nKey: 'diary.classificationConsultation',
  },
  weight: {
    color: colors.success,
    softColor: colors.successSoft,
    icon: Scale,
    i18nKey: 'diary.classificationWeight',
  },
  exam: {
    color: colors.purple,
    softColor: colors.purpleSoft,
    icon: FileText,
    i18nKey: 'diary.classificationExam',
  },
  medication: {
    color: colors.warning,
    softColor: colors.warningSoft,
    icon: Pill,
    i18nKey: 'diary.classificationMedication',
  },
  allergy: {
    color: colors.danger,
    softColor: colors.dangerSoft,
    icon: AlertTriangle,
    i18nKey: 'diary.classificationAllergy',
  },
  surgery: {
    color: colors.gold,
    softColor: colors.goldSoft,
    icon: Scissors,
    i18nKey: 'diary.classificationSurgery',
  },
  symptom: {
    color: colors.danger,
    softColor: colors.dangerSoft,
    icon: Thermometer,
    i18nKey: 'diary.classificationSymptom',
  },
  food: {
    color: colors.lime,
    softColor: colors.limeSoft,
    icon: UtensilsCrossed,
    i18nKey: 'diary.classificationFood',
  },
  expense: {
    color: colors.gold,
    softColor: colors.goldSoft,
    icon: Receipt,
    i18nKey: 'diary.classificationExpense',
  },
  moment: {
    color: colors.accent,
    softColor: colors.accentSoft,
    icon: BookOpen,
    i18nKey: 'diary.classificationMoment',
  },
};

const DEFAULT_CONFIG: TypeConfig = {
  color: colors.textDim,
  softColor: `${colors.textDim}12`,
  icon: BookOpen,
  i18nKey: 'diary.classificationMoment',
};

// ══════════════════════════════════════
// HELPERS
// ══════════════════════════════════════

const getTypeConfig = (type: string): TypeConfig =>
  TYPE_CONFIG[type as ClassificationType] ?? DEFAULT_CONFIG;

const formatConfidence = (value: number): string =>
  `${Math.round(value * 100)}%`;

const formatDataValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return JSON.stringify(value);
};

// ══════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════

const ClassificationCard: React.FC<ClassificationCardProps> = ({
  type,
  confidence,
  extractedData,
  suggestion,
  onConfirm,
  onDismiss,
}) => {
  const { t } = useTranslation();

  const config = useMemo(() => getTypeConfig(type), [type]);
  const IconComponent = config.icon;
  const dataEntries = useMemo(
    () => Object.entries(extractedData).filter(([, v]) => v !== null && v !== undefined),
    [extractedData],
  );

  const handleConfirm = useCallback(() => onConfirm(), [onConfirm]);
  const handleDismiss = useCallback(() => onDismiss(), [onDismiss]);

  return (
    <View style={[styles.card, { borderLeftColor: config.color }]}>
      {/* Header: icon + type + confidence */}
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: config.softColor }]}>
          <IconComponent size={rs(18)} color={config.color} strokeWidth={1.8} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.typeLabel, { color: config.color }]}>
            {t(config.i18nKey)}
          </Text>
          <Text style={styles.confidenceText}>
            {t('diary.classificationConfidence')}: {formatConfidence(confidence)}
          </Text>
        </View>
      </View>

      {/* Suggestion */}
      <Text style={styles.suggestion}>{suggestion}</Text>

      {/* Extracted data key:value pairs */}
      {dataEntries.length > 0 && (
        <View style={styles.dataContainer}>
          {dataEntries.map(([key, value]) => (
            <View key={key} style={styles.dataRow}>
              <Text style={styles.dataKey}>{t(`diary.field_${key}`, { defaultValue: key })}</Text>
              <Text style={styles.dataValue}>{formatDataValue(value)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <X size={rs(14)} color={colors.textDim} strokeWidth={2} />
          <Text style={styles.dismissText}>
            {t('diary.classificationDismiss')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.7}
        >
          <Check size={rs(14)} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.confirmText}>
            {t('diary.classificationConfirm')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    borderLeftWidth: rs(4),
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconBadge: {
    width: rs(36),
    height: rs(36),
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  typeLabel: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: fs(13),
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  confidenceText: {
    fontFamily: 'JetBrains Mono',
    fontWeight: '500',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(2),
  },
  suggestion: {
    fontFamily: 'Sora',
    fontWeight: '400',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: fs(13) * 1.5,
    marginBottom: spacing.sm,
  },
  dataContainer: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rs(3),
  },
  dataKey: {
    fontFamily: 'JetBrains Mono',
    fontWeight: '500',
    fontSize: fs(10),
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dataValue: {
    fontFamily: 'JetBrains Mono',
    fontWeight: '600',
    fontSize: fs(11),
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(8),
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    gap: rs(6),
  },
  dismissText: {
    fontFamily: 'Sora',
    fontWeight: '600',
    fontSize: fs(13),
    color: colors.textDim,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(8),
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    gap: rs(6),
  },
  confirmText: {
    fontFamily: 'Sora',
    fontWeight: '700',
    fontSize: fs(13),
    color: '#FFFFFF',
  },
});

export default memo(ClassificationCard);
