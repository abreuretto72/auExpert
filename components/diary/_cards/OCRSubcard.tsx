/**
 * OCRSubcard — rendered inside DiaryCard for OCR/document media items.
 * Includes all monetary helpers used only by this card.
 * Extracted verbatim from TimelineCards.tsx.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { FileText, Divide, X, Check, Pencil } from 'lucide-react-native';
import MediaViewerModal from '../MediaViewerModal';
import { supabase } from '../../../lib/supabase';
import { colors } from '../../../constants/colors';
import { rs } from '../../../hooks/useResponsive';
import i18n from '../../../i18n';
import type { MediaAnalysisItem } from '../timelineTypes';
import { resolveMediaUri } from './shared';
import { styles } from './styles';

// ── OCRSubcard ──

const PRIORITY_KEYS = ['total', 'valor total', 'total a pagar', 'nf', 'nf_number', 'nota', 'data', 'issue_date', 'data de emissão'];
// Chaves específicas para o campo de total financeiro (mais específicas primeiro, evita "tributos/impostos")
const TOTAL_FIELD_KEYS = ['valor total nf', 'valor total da nota', 'total da nota', 'total nf', 'total a pagar', 'valor a pagar', 'total geral', 'valor total'];
const TOTAL_FIELD_EXCLUDE = ['tributo', 'imposto', 'icms', 'aproximado', 'iss', 'ipi', 'pis', 'cofins'];

// Defensive filter: if Claude returns a descriptive "not readable" text instead of null,
// suppress the field so the tutor doesn't see apology messages in their OCR card.
function isIllegibleDescription(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return (
    v.includes('não legível') ||
    v.includes('nao legível') ||
    v.includes('ilegível') ||
    v.includes('not readable') ||
    v.includes('illegible') ||
    v.includes('campo presente mas') ||
    v.includes('parcialmente visível') ||
    (v.includes('visível') && v.includes('não legível')) ||
    (v.includes('visível') && v.includes('não legivel'))
  );
}

type OCRFieldItem = { key: string; value: string; confidence?: number };
type OCRLineItem = { name: string; qty: number; unit_price: number };

function detectCurrencySymbol(value: string): string {
  const match = String(value ?? '').trim().match(/^(R\$|\$|€|£|¥|₹)/);
  return match ? match[1] : (i18n.language?.startsWith('pt') ? 'R$' : '$');
}

function formatBRCurrency(value: string): string {
  // If Claude returned a dot-decimal number, convert to locale format for display
  const lang = i18n.language ?? 'pt-BR';
  const sym = detectCurrencySymbol(value);
  const cleaned = value.replace(/[R$€£¥₹\s]/g, '');
  const num = parseFloat(cleaned.replace(',', '.'));
  if (!isNaN(num) && cleaned.match(/^\d+[.,]\d{2}$/)) {
    return `${sym} ${num.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return value;
}

function formatMonetaryOutput(num: number, originalValue: string): string {
  const lang = i18n.language ?? 'pt-BR';
  const sym = detectCurrencySymbol(originalValue);
  return `${sym} ${num.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isMonetaryKey(key: string): boolean {
  const k = key.toLowerCase();
  return ['valor', 'total', 'preço', 'preco', 'price', 'amount', 'subtotal', 'desconto', 'frete'].some((w) => k.includes(w));
}

function parseMonetaryValue(value: string): number | null {
  // Strip known currency symbols and non-numeric prefixes
  const s = String(value ?? '').replace(/R\$|[$€£¥₹]/g, '').trim();
  if (!s) return null;

  const isBR = (i18n.language ?? 'pt-BR').startsWith('pt');

  if (isBR) {
    // PT-BR rule: dot is ALWAYS thousands separator, comma is ALWAYS decimal separator
    // "11.830" → 11830  |  "1.234,56" → 1234.56  |  "890,00" → 890  |  "26.860" → 26860
    const clean = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? null : n;
  } else {
    // EN-US rule: comma is ALWAYS thousands separator, dot is ALWAYS decimal separator
    // "11,830" → 11830  |  "1,234.56" → 1234.56  |  "890.00" → 890
    if (s.includes('.')) {
      const n = parseFloat(s.replace(/,/g, ''));
      return isNaN(n) ? null : n;
    }
    if (s.includes(',')) {
      const parts = s.split(',');
      // Comma followed by exactly 3 digits → thousands separator
      if (parts[parts.length - 1].length === 3) {
        const n = parseFloat(s.replace(/,/g, ''));
        return isNaN(n) ? null : n;
      }
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  }
}

export function OCRSubcard({
  media, t, entryId, mediaIndex, allMediaAnalyses,
}: {
  media: MediaAnalysisItem;
  t: (k: string, opts?: Record<string, string>) => string;
  entryId: string;
  mediaIndex: number;
  allMediaAnalyses: MediaAnalysisItem[];
}) {
  const uri = resolveMediaUri(media.mediaUrl);

  const docType = (media.ocrData as Record<string, unknown>)?.document_type as string | undefined;
  const isFinancial = docType === 'nota_fiscal' || docType === 'invoice' || docType === 'receipt';

  // ── Viewer state ──────────────────────────────────────────────────────────
  const [viewerOpen, setViewerOpen] = useState(false);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<OCRFieldItem[]>(() => media.ocrData?.fields ?? []);
  const [editedItems, setEditedItems] = useState<OCRLineItem[]>(
    () => ((media.ocrData as Record<string, unknown>)?.items ?? []) as OCRLineItem[]
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleFieldChange = useCallback((idx: number, value: string) => {
    setEditedFields((prev) => prev.map((f, i) => i === idx ? { ...f, value } : f));
  }, []);

  const handleItemChange = useCallback((idx: number, field: 'name' | 'qty' | 'unit_price', value: string) => {
    setEditedItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'qty') return { ...item, qty: parseInt(value, 10) || 0 };
      if (field === 'unit_price') return { ...item, unit_price: parseFloat(value.replace(',', '.')) || 0 };
      return { ...item, name: value };
    }));
  }, []);

  const handleSave = useCallback(async () => {
    Keyboard.dismiss();
    setIsSaving(true);
    try {
      const updatedOcrData = {
        ...(media.ocrData as Record<string, unknown>),
        fields: editedFields,
        items: editedItems,
      };
      const updatedAnalyses = allMediaAnalyses.map((m, i) =>
        i === mediaIndex ? { ...m, ocrData: updatedOcrData } : m
      );
      const { error } = await supabase
        .from('diary_entries')
        .update({ media_analyses: updatedAnalyses })
        .eq('id', entryId);
      if (error) throw error;
      setIsEditing(false);
    } catch (e) {
      console.error('[OCR-EDIT] save error:', e);
    } finally {
      setIsSaving(false);
    }
  }, [editedFields, editedItems, allMediaAnalyses, mediaIndex, entryId, media.ocrData]);

  const handleCancel = useCallback(() => {
    setEditedFields(media.ocrData?.fields ?? []);
    setEditedItems(((media.ocrData as Record<string, unknown>)?.items ?? []) as OCRLineItem[]);
    setIsEditing(false);
    Keyboard.dismiss();
  }, [media.ocrData]);

  const applyMonetaryFactor = useCallback((factor: number) => {
    setEditedFields((prev) =>
      prev.map((f) => {
        if (!isMonetaryKey(f.key)) return f;
        const num = parseMonetaryValue(f.value ?? '');
        if (num === null) return f;
        const result = num * factor;
        return {
          ...f,
          value: formatMonetaryOutput(result, f.value ?? ''),
        };
      })
    );
    setEditedItems((prev) =>
      prev.map((item) => ({ ...item, unit_price: item.unit_price * factor }))
    );
  }, []);

  const handleDivideBy100 = useCallback(() => applyMonetaryFactor(0.01), [applyMonetaryFactor]);
  const handleMultiplyBy100 = useCallback(() => applyMonetaryFactor(100), [applyMonetaryFactor]);

  // ── Derived values (use edited state for display) ─────────────────────────
  const sorted = [...editedFields].sort((a, b) => {
    const aP = PRIORITY_KEYS.some((k) => a.key.toLowerCase().includes(k)) ? 0 : 1;
    const bP = PRIORITY_KEYS.some((k) => b.key.toLowerCase().includes(k)) ? 0 : 1;
    return aP - bP;
  });

  const totalField = editedFields.find((f) => {
    const key = f.key.toLowerCase();
    return TOTAL_FIELD_KEYS.some((k) => key.includes(k)) && !TOTAL_FIELD_EXCLUDE.some((ex) => key.includes(ex));
  });

  return (
    <View style={[styles.subcard, { borderColor: colors.purple + '30' }]}>
      {/* Header */}
      <View style={styles.subcardHeader}>
        <FileText size={rs(12)} color={colors.purple} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.purple }]}>{t('diary.ocrAnalysis').toUpperCase()}</Text>
        {docType && docType !== 'other' && (
          <View style={styles.ocrDocTypeBadge}>
            <Text style={styles.ocrDocTypeText}>{docType.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        )}
      </View>

      {uri && (
        <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85}>
          <Image source={{ uri }} style={styles.subcardImage} resizeMode="cover" />
        </TouchableOpacity>
      )}
      {uri && (
        <MediaViewerModal
          visible={viewerOpen}
          type="photo"
          uri={uri}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Barra de ação — editar / salvar / cancelar */}
      {isEditing ? (
        <>
          {/* Correção rápida: ÷100 ou ×100 em todos os valores monetários */}
          <View style={styles.ocrScaleBar}>
            <TouchableOpacity onPress={handleDivideBy100} style={styles.ocrScaleBtn}>
              <Divide size={rs(13)} color={colors.warning} strokeWidth={2} />
              <Text style={styles.ocrScaleBtnText}>{t('diary.ocrDivideBy100')}</Text>
            </TouchableOpacity>
            <View style={styles.ocrScaleSep} />
            <TouchableOpacity onPress={handleMultiplyBy100} style={styles.ocrScaleBtn}>
              <Text style={styles.ocrScaleMultiplyIcon}>×</Text>
              <Text style={styles.ocrScaleBtnText}>{t('diary.ocrMultiplyBy100')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.ocrActionBar}>
            <TouchableOpacity onPress={handleCancel} disabled={isSaving} style={styles.ocrCancelBtn}>
              <X size={rs(14)} color={colors.textDim} strokeWidth={2} />
              <Text style={styles.ocrCancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.ocrSaveBtn, { flex: 1 }]}>
              {isSaving
                ? <ActivityIndicator size={rs(13)} color="#fff" />
                : <Check size={rs(14)} color="#fff" strokeWidth={2.5} />}
              {!isSaving && <Text style={styles.ocrSaveBtnText}>{t('common.save')}</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.ocrEditBar}>
          <Pencil size={rs(14)} color={colors.click} strokeWidth={1.8} />
          <Text style={styles.ocrEditBarText}>{t('diary.ocrEditHint')}</Text>
        </TouchableOpacity>
      )}

      {/* Total destacado — apenas em view mode */}
      {!isEditing && isFinancial && totalField && (
        <View style={styles.ocrTotalBox}>
          <Text style={styles.ocrTotalLabel} numberOfLines={2}>{totalField.key.toUpperCase()}</Text>
          <Text style={styles.ocrTotalValue} numberOfLines={1}>
            {formatBRCurrency(totalField.value)}
          </Text>
        </View>
      )}

      {/* Itens da nota */}
      {editedItems.length > 0 && (
        <View style={styles.ocrItemsContainer}>
          <Text style={styles.ocrItemsHeader}>{t('diary.ocrItems').toUpperCase()}</Text>
          {editedItems.map((item, i) => (
            <View key={i} style={styles.ocrItemRow}>
              {isEditing ? (
                <>
                  <TextInput
                    style={[styles.ocrItemName, styles.ocrEditInput]}
                    value={item.name}
                    onChangeText={(v) => handleItemChange(i, 'name', v)}
                    placeholder={t('diary.ocrItemName')}
                    placeholderTextColor={colors.textDim}
                  />
                  <TextInput
                    style={[styles.ocrItemQty, styles.ocrEditInput, { minWidth: rs(36) }]}
                    value={String(item.qty ?? '')}
                    onChangeText={(v) => handleItemChange(i, 'qty', v)}
                    keyboardType="number-pad"
                    placeholder={t('diary.ocrItemQtyPlaceholder')}
                    placeholderTextColor={colors.textDim}
                  />
                  <TextInput
                    style={[styles.ocrItemPrice, styles.ocrEditInput, { minWidth: rs(60) }]}
                    value={item.unit_price != null ? String(item.unit_price).replace('.', ',') : ''}
                    onChangeText={(v) => handleItemChange(i, 'unit_price', v)}
                    keyboardType="decimal-pad"
                    placeholder={t('diary.ocrItemPricePlaceholder')}
                    placeholderTextColor={colors.textDim}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.ocrItemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.ocrItemQty}>x{item.qty ?? 1}</Text>
                  <Text style={styles.ocrItemPrice}>
                    {item.unit_price != null
                      ? formatMonetaryOutput(Number(item.unit_price), totalField?.value ?? '')
                      : '—'}
                  </Text>
                </>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Campos principais */}
      {sorted
        .filter((f) => !(isFinancial && !isEditing && totalField && f.key === totalField.key))
        .filter((f) => isEditing || (f.value != null && String(f.value).trim() !== '' && !isIllegibleDescription(f.value)))
        .map((field, i) => (
          <View key={i} style={styles.ocrField}>
            <Text style={[styles.ocrKey, isMonetaryKey(field.key) && isFinancial && { color: colors.click }]}>
              {field.key}
            </Text>
            {isEditing ? (
              <TextInput
                style={[styles.ocrValue, styles.ocrEditInput]}
                value={field.value ?? ''}
                onChangeText={(v) => handleFieldChange(i, v)}
                keyboardType={isMonetaryKey(field.key) ? 'decimal-pad' : 'default'}
                placeholder={t('diary.ocrValuePlaceholder')}
                placeholderTextColor={colors.textDim}
                multiline={!isMonetaryKey(field.key)}
              />
            ) : (
              <Text
                numberOfLines={5}
                style={[
                  styles.ocrValue,
                  field.confidence != null && field.confidence < 0.5 && styles.ocrValueLow,
                  isMonetaryKey(field.key) && isFinancial && { color: colors.click, fontFamily: 'JetBrainsMono_700Bold' },
                ]}
              >
                {isMonetaryKey(field.key) && isFinancial ? formatBRCurrency(field.value) : field.value}
                {field.confidence != null && field.confidence < 0.5 ? ' ?' : ''}
              </Text>
            )}
          </View>
        ))}

      {editedFields.length === 0 && (
        <Text style={styles.ocrEmptyHint}>{t('diary.ocrNoFields')}</Text>
      )}
    </View>
  );
}
