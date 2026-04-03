/**
 * DiaryModuleCard — compact summary of an AI-classified module
 * (vaccine, consultation, weight, expense, etc.) inside a diary card.
 *
 * When a `moduleRow` is provided (DB row joined from fetchDiaryEntries),
 * the card becomes expandable and supports inline editing per type.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  Syringe, Stethoscope, Scale, FlaskConical, Pill,
  DollarSign, UtensilsCrossed, AlertCircle, Plane, Heart,
  ChevronDown, ChevronUp, Check, X, Trash2,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { radii, spacing } from '../../constants/spacing';

// ── Types ──

interface Classification {
  type: string;
  confidence: number;
  extracted_data: Record<string, unknown>;
}

export interface ModuleRow {
  id: string;
  [key: string]: unknown;
}

interface DiaryModuleCardProps {
  classification: Classification;
  moduleRow?: ModuleRow;
  onUpdated?: (id: string, updates: Record<string, unknown>) => void;
  onDeleted?: (id: string) => void;
  /** Show delete button — true only inside the edit screen, never on the timeline */
  showDelete?: boolean;
  t: (key: string, opts?: Record<string, string>) => string;
}

// ── Visual config per classification type ──

const MODULE_CONFIG: Record<string, {
  icon: React.ElementType;
  color: string;
  labelKey: string;
  table: string;
}> = {
  vaccine:       { icon: Syringe,        color: '#1D9E75', labelKey: 'diary.module_vaccine',      table: 'vaccines' },
  consultation:  { icon: Stethoscope,    color: '#1D9E75', labelKey: 'diary.module_consultation', table: 'consultations' },
  return_visit:  { icon: Stethoscope,    color: '#1D9E75', labelKey: 'diary.module_consultation', table: 'consultations' },
  weight:        { icon: Scale,          color: '#1D9E75', labelKey: 'diary.module_weight',       table: 'clinical_metrics' },
  exam:          { icon: FlaskConical,   color: '#1D9E75', labelKey: 'diary.module_exam',         table: 'exams' },
  medication:    { icon: Pill,           color: '#3B6D11', labelKey: 'diary.module_medication',   table: 'medications' },
  food:          { icon: UtensilsCrossed,color: '#3B6D11', labelKey: 'diary.module_food',         table: 'nutrition_records' },
  expense:       { icon: DollarSign,     color: '#534AB7', labelKey: 'diary.module_expense',      table: 'expenses' },
  symptom:       { icon: AlertCircle,    color: '#E24B4A', labelKey: 'diary.module_symptom',      table: '' },
  travel:        { icon: Plane,          color: colors.sky,  labelKey: 'diary.module_travel',     table: '' },
  connection:    { icon: Heart,          color: colors.rose, labelKey: 'diary.module_connection', table: '' },
};

const FALLBACK_CONFIG = {
  icon: AlertCircle,
  color: colors.textDim,
  labelKey: 'diary.module_symptom',
  table: '',
};

// ── Summary builder (read-only collapsed view) ──

function buildSummary(type: string, data: Record<string, unknown>): string {
  const str = (key: string) => (data[key] as string | undefined) ?? '';

  switch (type) {
    case 'vaccine': {
      const name = str('vaccine_name') || str('vaccine_type') || str('name');
      const lab = str('laboratory') || str('lab');
      return lab ? `${name} · ${lab}` : name;
    }
    case 'consultation':
    case 'return_visit': {
      const vet = str('veterinarian') || str('vet_name');
      const clinic = str('clinic') || str('clinic_name');
      const diag = str('diagnosis');
      return [vet || clinic, diag].filter(Boolean).join(' · ');
    }
    case 'weight': {
      const val = data['weight_value'] ?? data['weight'];
      const unit = str('weight_unit') || 'kg';
      return val ? `${val} ${unit}` : '';
    }
    case 'exam': {
      const name = str('exam_name') || str('exam_type');
      const lab = str('laboratory') || str('lab');
      return lab ? `${name} · ${lab}` : name;
    }
    case 'medication': {
      const name = str('medication_name') || str('drug_name');
      const dosage = str('dosage');
      return dosage ? `${name} · ${dosage}` : name;
    }
    case 'expense': {
      const total = data['amount'] ?? data['total'];
      const currency = str('currency') || 'R$';
      const category = str('category');
      return total ? `${currency} ${total}${category ? ` · ${category}` : ''}` : '';
    }
    case 'food': {
      const name = str('food_name') || str('product_name') || str('brand');
      const qty = str('quantity');
      return qty ? `${name} · ${qty}` : name;
    }
    case 'symptom':
      return str('symptom') || str('description') || str('observation');
    case 'travel': {
      const dest = str('destination');
      const mode = str('transport');
      return dest || mode ? [dest, mode].filter(Boolean).join(' · ') : '';
    }
    case 'connection':
      return str('friend_name') || str('name');
    default:
      return '';
  }
}

// ── Editable fields definition per module type ──

interface FieldDef {
  key: string;       // key in moduleRow
  labelKey: string;  // i18n key
  multiline?: boolean;
}

const EDIT_FIELDS: Record<string, FieldDef[]> = {
  vaccine: [
    { key: 'vaccine_name', labelKey: 'diary.field_vaccine_name' },
    { key: 'laboratory',   labelKey: 'diary.field_laboratory' },
    { key: 'vet_name',     labelKey: 'diary.field_vet_name' },
    { key: 'clinic',       labelKey: 'diary.field_clinic' },
  ],
  consultation: [
    { key: 'vet_name',   labelKey: 'diary.field_vet_name' },
    { key: 'clinic',     labelKey: 'diary.field_clinic' },
    { key: 'reason',     labelKey: 'diary.field_reason',    multiline: true },
    { key: 'diagnosis',  labelKey: 'diary.field_diagnosis', multiline: true },
  ],
  return_visit: [
    { key: 'vet_name',  labelKey: 'diary.field_vet_name' },
    { key: 'clinic',    labelKey: 'diary.field_clinic' },
    { key: 'diagnosis', labelKey: 'diary.field_diagnosis', multiline: true },
  ],
  expense: [
    { key: 'amount',        labelKey: 'diary.field_amount' },
    { key: 'category',      labelKey: 'diary.field_category' },
    { key: 'merchant_name', labelKey: 'diary.field_merchant' },
    { key: 'description',   labelKey: 'diary.field_description', multiline: true },
  ],
  medication: [
    { key: 'medication_name', labelKey: 'diary.field_medication_name' },
    { key: 'dosage',          labelKey: 'diary.field_dosage' },
    { key: 'frequency',       labelKey: 'diary.field_frequency' },
    { key: 'vet_name',        labelKey: 'diary.field_vet_name' },
  ],
  weight: [
    { key: 'value', labelKey: 'diary.field_weight_value' },
    { key: 'unit',  labelKey: 'diary.field_unit' },
  ],
  food: [
    { key: 'product_name', labelKey: 'diary.field_product_name' },
    { key: 'brand',        labelKey: 'diary.field_brand' },
    { key: 'quantity',     labelKey: 'diary.field_quantity' },
  ],
};

// ── DiaryModuleCard ──

// Tables that have is_active column and support soft-delete
const DELETABLE_TABLES = new Set(['vaccines', 'consultations', 'clinical_metrics', 'exams', 'medications', 'expenses']);

export const DiaryModuleCard = React.memo(({ classification, moduleRow, onUpdated, onDeleted, showDelete = false, t }: DiaryModuleCardProps) => {
  const cfg = MODULE_CONFIG[classification.type] ?? FALLBACK_CONFIG;
  const Icon = cfg.icon;
  const label = t(cfg.labelKey);
  const editFields = EDIT_FIELDS[classification.type];
  const canEdit = !!moduleRow && !!cfg.table && !!editFields;
  const canDelete = !!moduleRow && DELETABLE_TABLES.has(cfg.table);

  const { confirm, toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Source for summary: prefer moduleRow data, fall back to extracted_data
  const displayData: Record<string, unknown> = moduleRow ?? classification.extracted_data;
  const summary = buildSummary(classification.type, displayData);

  const handleExpand = useCallback(() => {
    if (!canEdit) return;
    const initial: Record<string, string> = {};
    editFields.forEach(({ key }) => {
      const val = moduleRow?.[key];
      initial[key] = val != null ? String(val) : '';
    });
    setEditValues(initial);
    setExpanded(true);
  }, [canEdit, editFields, moduleRow]);

  const handleCancel = useCallback(() => {
    setExpanded(false);
    setEditValues({});
  }, []);

  const handleDeleteModule = useCallback(async () => {
    if (!moduleRow || !cfg.table) return;
    const yes = await confirm({ text: t('diary.deleteModuleConfirm'), type: 'warning' });
    if (!yes) return;
    try {
      const { error } = await supabase
        .from(cfg.table)
        .update({ is_active: false })
        .eq('id', moduleRow.id);
      if (error) throw error;
      setIsDeleted(true);
      toast(t('diary.moduleDeleted'), 'success');
      onDeleted?.(moduleRow.id);
    } catch {
      toast(t('errors.editFailed'), 'error');
    }
  }, [moduleRow, cfg.table, confirm, t, toast, onDeleted]);

  const handleSave = useCallback(async () => {
    if (!moduleRow || !cfg.table) return;
    const updates: Record<string, unknown> = {};
    editFields?.forEach(({ key }) => {
      const v = editValues[key];
      if (v !== undefined && v !== String(moduleRow[key] ?? '')) {
        updates[key] = v.trim() || null;
      }
    });
    if (Object.keys(updates).length === 0) {
      setExpanded(false);
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from(cfg.table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', moduleRow.id);
      if (!error) {
        onUpdated?.(moduleRow.id, updates);
        setExpanded(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [moduleRow, cfg.table, editFields, editValues, onUpdated]);

  if (!summary && !label) return null;
  if (isDeleted) return null;

  return (
    <View style={[s.card, { borderLeftColor: cfg.color }]}>
      {/* Collapsed row */}
      <TouchableOpacity
        style={s.row}
        onPress={canEdit && !expanded ? handleExpand : undefined}
        activeOpacity={canEdit ? 0.7 : 1}
      >
        <View style={[s.iconBox, { backgroundColor: cfg.color + '18' }]}>
          <Icon size={rs(14)} color={cfg.color} strokeWidth={1.8} />
        </View>
        <View style={s.info}>
          <Text style={[s.typeLabel, { color: cfg.color }]}>{label}</Text>
          {!!summary && <Text style={s.summary} numberOfLines={expanded ? undefined : 1}>{summary}</Text>}
        </View>
        <View style={s.rowActions}>
          {showDelete && canDelete && !expanded && (
            <TouchableOpacity
              onPress={handleDeleteModule}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Trash2 size={rs(14)} color={colors.danger} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
          {canEdit && !expanded && <ChevronDown size={rs(14)} color={colors.textDim} strokeWidth={1.8} />}
          {canEdit && expanded && <ChevronUp size={rs(14)} color={colors.accent} strokeWidth={1.8} />}
        </View>
      </TouchableOpacity>

      {/* Expanded edit fields */}
      {expanded && editFields && (
        <View style={s.editSection}>
          {editFields.map(({ key, labelKey, multiline }) => (
            <View key={key} style={s.fieldRow}>
              <Text style={s.fieldLabel}>{t(labelKey)}</Text>
              <TextInput
                style={[s.fieldInput, multiline && s.fieldInputMulti]}
                value={editValues[key] ?? ''}
                onChangeText={(v) => setEditValues((prev) => ({ ...prev, [key]: v }))}
                multiline={multiline}
                placeholderTextColor={colors.placeholder}
                selectionColor={colors.accent}
              />
            </View>
          ))}
          <View style={s.editActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={isSaving} activeOpacity={0.7}>
              <X size={rs(12)} color={colors.textDim} strokeWidth={2} />
              <Text style={s.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isSaving} activeOpacity={0.7}>
              {isSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Check size={rs(12)} color="#fff" strokeWidth={2} />
              }
              <Text style={s.saveText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
});

DiaryModuleCard.displayName = 'DiaryModuleCard';

// ── DiaryModuleSeparator ──

export const DiaryModuleSeparator = React.memo(({ t }: { t: (key: string) => string }) => (
  <View style={s.separatorRow}>
    <View style={s.separatorLine} />
    <Text style={s.separatorText}>{t('diary.registered')}</Text>
    <View style={s.separatorLine} />
  </View>
));

DiaryModuleSeparator.displayName = 'DiaryModuleSeparator';

// ── Styles ──

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: rs(radii.md + 2),
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: rs(3),
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(8),
  },
  iconBox: {
    width: rs(26),
    height: rs(26),
    borderRadius: rs(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: rs(2),
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
  },
  typeLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summary: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },

  // Expanded edit section
  editSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: rs(10),
    paddingTop: rs(spacing.sm),
    paddingBottom: rs(spacing.sm),
    gap: rs(spacing.sm),
  },
  fieldRow: {
    gap: rs(4),
  },
  fieldLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  fieldInput: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.md),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    height: rs(36),
  },
  fieldInputMulti: {
    height: undefined,
    minHeight: rs(60),
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: rs(8),
    marginTop: rs(4),
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(5),
    paddingHorizontal: rs(10),
    borderRadius: rs(radii.md),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textDim,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingVertical: rs(5),
    paddingHorizontal: rs(12),
    borderRadius: rs(radii.md),
    backgroundColor: colors.accent,
  },
  saveText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: '#fff',
  },

  // Separator
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginVertical: rs(6),
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(10),
    color: colors.textDim,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
