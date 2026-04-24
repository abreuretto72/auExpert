/**
 * OCRResultScreen — shows OCR extraction results with editable fields.
 * Used after DocumentScanner captures a document and classify-diary-entry
 * returns ocr_data with extracted fields.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator,
} from 'react-native';
import { Check, Pencil, X, ScanLine, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { spacing, radii } from '../../constants/spacing';
import type { ClassifyDiaryResponse, OCRField, OCRItem } from '../../lib/ai';

// ── Types ──────────────────────────────────────────────────────────────────

interface OCRResultScreenProps {
  result: ClassifyDiaryResponse;
  photoUri: string | null;
  petName: string;
  onConfirm: (editedFields: OCRField[]) => void;
  onSaveDiaryOnly: () => void;
  isSaving?: boolean;
}

// ── Confidence badge ────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 90 ? colors.success : pct >= 70 ? colors.warning : colors.danger;
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.badgeText, { color }]}>{pct}%</Text>
    </View>
  );
}

// ── Editable field row ──────────────────────────────────────────────────────

function OCRFieldRow({
  field,
  onEdit,
}: {
  field: OCRField;
  onEdit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(field.value);

  const handleSave = useCallback(() => {
    onEdit(draft.trim());
    setEditing(false);
  }, [draft, onEdit]);

  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldHeader}>
        <Text style={styles.fieldKey}>{field.key}</Text>
        <View style={styles.fieldRight}>
          <ConfidenceBadge confidence={field.confidence} />
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.7} style={styles.editBtn}>
              <Pencil size={rs(14)} color={colors.click} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.editInput}
            value={draft}
            onChangeText={setDraft}
            autoFocus
            selectTextOnFocus
          />
          <TouchableOpacity onPress={handleSave} activeOpacity={0.7} style={styles.saveBtn}>
            <Check size={rs(16)} color={colors.success} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setDraft(field.value); setEditing(false); }} activeOpacity={0.7} style={styles.cancelBtn}>
            <X size={rs(16)} color={colors.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.fieldValue}>{field.value || '—'}</Text>
      )}
    </View>
  );
}

// ── Items table ─────────────────────────────────────────────────────────────

function ItemsTable({ items }: { items: OCRItem[] }) {
  const { t } = useTranslation();
  const total = items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);

  return (
    <View style={styles.itemsTable}>
      {items.map((item, i) => (
        <View key={i} style={[styles.itemRow, i < items.length - 1 && styles.itemRowBorder]}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemPrice}>
            {item.qty > 1 ? `${item.qty}x ` : ''}
            {item.unit_price.toLocaleString(i18n.language, { style: 'currency', currency: 'BRL' })}
          </Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>{t('diary.ocrTotal')}</Text>
        <Text style={styles.totalValue}>
          {total.toLocaleString(i18n.language, { style: 'currency', currency: 'BRL' })}
        </Text>
      </View>
    </View>
  );
}

// ── Document type label ─────────────────────────────────────────────────────

const DOC_TYPE_KEYS: Record<string, string> = {
  vaccine_card:  'diary.docTypeVaccine',
  prescription:  'diary.docTypePrescription',
  exam_result:   'diary.docTypeExam',
  invoice:       'diary.docTypeInvoice',
  receipt:       'diary.docTypeReceipt',
  insurance:     'diary.docTypeInsurance',
  vet_report:    'diary.docTypeVetReport',
  medication_box:'diary.docTypeMedBox',
  other:         'diary.docTypeOther',
};

// ── Main component ──────────────────────────────────────────────────────────

export default function OCRResultScreen({
  result,
  photoUri,
  petName,
  onConfirm,
  onSaveDiaryOnly,
  isSaving = false,
}: OCRResultScreenProps) {
  const { t } = useTranslation();

  const [fields, setFields] = useState<OCRField[]>(result.ocr_data?.fields ?? []);

  const handleEditField = useCallback((index: number, value: string) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  }, []);

  const docTypeKey = DOC_TYPE_KEYS[result.document_type ?? 'other'] ?? 'diary.docTypeOther';
  const primaryType = result.classifications?.[0]?.type ?? 'moment';

  const confirmLabel = primaryType === 'expense'
    ? t('diary.ocrRegisterExpense')
    : primaryType === 'vaccine'
      ? t('diary.ocrRegisterVaccine')
      : primaryType === 'exam'
        ? t('diary.ocrRegisterExam')
        : primaryType === 'medication'
          ? t('diary.ocrRegisterMedication')
          : t('diary.ocrRegisterHealth');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Document preview */}
      <View style={styles.previewCard}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.docImage} resizeMode="cover" />
        ) : (
          <View style={styles.docPlaceholder}>
            <FileText size={rs(40)} color={colors.textDim} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.readBadge}>
          <ScanLine size={rs(12)} color={colors.success} strokeWidth={2} />
          <Text style={styles.readBadgeText}>{t('diary.ocrReadOk')}</Text>
        </View>
        <Text style={styles.docTypeLabel}>{t(docTypeKey)}</Text>
      </View>

      {/* Extracted fields */}
      {fields.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('diary.ocrExtractedData')}</Text>
          <View style={styles.fieldsCard}>
            {fields.map((field, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.divider} />}
                <OCRFieldRow
                  field={field}
                  onEdit={(val) => handleEditField(i, val)}
                />
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {/* Items table (invoices) */}
      {(result.ocr_data?.items?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('diary.ocrItems')}</Text>
          <ItemsTable items={result.ocr_data!.items!} />
        </View>
      )}

      {/* Suggestions / auto-links */}
      {result.suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('diary.ocrAutoLinks')}</Text>
          <View style={styles.suggestionsCard}>
            {result.suggestions.map((s, i) => (
              <View key={i} style={styles.suggestionRow}>
                <Check size={rs(14)} color={colors.success} strokeWidth={2} />
                <Text style={styles.suggestionText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* AI Narration */}
      {result.narration?.length > 0 && (
        <View style={styles.narrationCard}>
          <Text style={styles.narrationText}>{result.narration}</Text>
          <Text style={styles.narrationSig}>— {petName}</Text>
        </View>
      )}

      {/* Fontes da pesquisa — título + disclaimer em itálico */}
      <Text style={styles.sourcesTitle}>{t('photoAnalysis.sourcesTitle')}</Text>
      <Text style={styles.aiDisclaimer}>{t('common.aiVetDisclaimer')}</Text>

      {/* Action buttons */}
      <TouchableOpacity
        style={[styles.primaryBtn, isSaving && styles.btnDisabled]}
        onPress={() => onConfirm(fields)}
        disabled={isSaving}
        activeOpacity={0.8}
      >
        {isSaving
          ? <ActivityIndicator color="#fff" size="small" />
          : <><Check size={rs(18)} color="#fff" strokeWidth={2} /><Text style={styles.primaryBtnText}>{confirmLabel}</Text></>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryBtn, isSaving && styles.btnDisabled]}
        onPress={onSaveDiaryOnly}
        disabled={isSaving}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryBtnText}>{t('diary.ocrSaveDiaryOnly')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: rs(spacing.md),
    gap: rs(spacing.md),
    paddingBottom: rs(spacing.xxl),
  },

  // Preview
  previewCard: {
    borderRadius: rs(radii.card),
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  docImage: {
    width: '100%',
    height: rs(180),
  },
  docPlaceholder: {
    width: '100%',
    height: rs(120),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(12),
    paddingTop: rs(10),
    paddingBottom: rs(4),
  },
  readBadgeText: {
    color: colors.success,
    fontSize: fs(11),
    fontWeight: '700',
  },
  docTypeLabel: {
    color: colors.textDim,
    fontSize: fs(11),
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: rs(12),
    paddingBottom: rs(12),
  },

  // Sections
  section: {
    gap: rs(8),
  },
  sectionTitle: {
    color: colors.textDim,
    fontSize: fs(10),
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginLeft: rs(4),
  },

  // Fields
  fieldsCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fieldRow: {
    padding: rs(12),
    gap: rs(4),
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldKey: {
    color: colors.textDim,
    fontSize: fs(11),
    fontWeight: '600',
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  fieldValue: {
    color: colors.text,
    fontSize: fs(14),
    fontWeight: '500',
  },
  editBtn: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    backgroundColor: colors.clickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  editInput: {
    flex: 1,
    color: colors.text,
    fontSize: fs(14),
    backgroundColor: colors.bgCard,
    borderRadius: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderWidth: 1,
    borderColor: colors.click,
  },
  saveBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(8),
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(8),
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: rs(12),
  },

  // Badge
  badge: {
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(6),
  },
  badgeText: {
    fontSize: fs(10),
    fontWeight: '700',
  },

  // Items table
  itemsTable: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(12),
    paddingVertical: rs(10),
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemName: {
    flex: 1,
    color: colors.textSec,
    fontSize: fs(13),
  },
  itemPrice: {
    color: colors.text,
    fontSize: fs(13),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rs(12),
    paddingVertical: rs(12),
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  totalLabel: {
    color: colors.textSec,
    fontSize: fs(13),
    fontWeight: '700',
  },
  totalValue: {
    color: colors.click,
    fontSize: fs(15),
    fontWeight: '700',
  },

  // Suggestions
  suggestionsCard: {
    backgroundColor: colors.successSoft,
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    borderColor: colors.success + '20',
    padding: rs(12),
    gap: rs(8),
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(8),
  },
  suggestionText: {
    flex: 1,
    color: colors.textSec,
    fontSize: fs(13),
    lineHeight: fs(19),
  },

  // Narration
  narrationCard: {
    backgroundColor: colors.purpleSoft,
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    borderColor: colors.purple + '20',
    padding: rs(14),
    gap: rs(6),
  },
  narrationText: {
    color: colors.text,
    fontSize: fs(15),
    lineHeight: fs(23),
    fontFamily: 'Sora_400Regular',
  },
  narrationSig: {
    color: colors.textDim,
    fontSize: fs(13),
    textAlign: 'right',
    fontFamily: 'Sora_400Regular',
  },

  sourcesTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textSec,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: rs(spacing.md),
    textTransform: 'uppercase',
  },
  aiDisclaimer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: colors.textDim,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: rs(4),
    marginBottom: rs(spacing.sm),
    paddingHorizontal: rs(spacing.md),
  },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(spacing.xs),
    backgroundColor: colors.click,
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(12),
    elevation: 6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: rs(spacing.md),
    borderRadius: rs(radii.xl),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textSec,
    fontSize: fs(14),
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
