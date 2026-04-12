/**
 * Timeline card components for the diary.
 * Each card renders a different event type (diary, health, milestone, etc.).
 * All cards are memoized for FlatList performance.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Keyboard } from 'react-native';
import {
  AlertCircle, AlertTriangle, Camera, Calendar, Check, Divide, EyeOff, FileText, Gift, Heart, LayoutGrid,
  Lightbulb, Lock, Mic, Music2, PawPrint, Pencil, Play, RefreshCw, ShieldCheck, Star,
  Trash2, Trophy, User, Video, WifiOff, X,
} from 'lucide-react-native';
import MediaViewerModal from './MediaViewerModal';
import { supabase } from '../../lib/supabase';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import i18n from '../../i18n';
import { getPublicUrl } from '../../lib/storage';
import { useAuthStore } from '../../stores/authStore';
import type { TimelineEvent, MediaAnalysisItem } from './timelineTypes';
import { DiaryModuleCard, type ModuleRow } from './DiaryModuleCard';
import DiaryNarration from './DiaryNarration';

// ── Shared types ──

interface CardProps {
  event: TimelineEvent;
  t: (k: string, opts?: Record<string, string>) => string;
  onDelete?: (id: string) => void;
  /** True when the current user is the pet's root admin (owner role). */
  isOwner?: boolean;
  /** Admin-only: deactivate a record that belongs to another tutor. */
  onAdminDeactivate?: (id: string) => void;
}

interface DiaryCardProps extends CardProps {
  petName: string;
  getMoodData: (id: string | null | undefined) => { label: string; color: string } | null;
  onEdit: (id: string) => void;
  onRetry?: (id: string) => void;
}

// ── CardActions ── permission-aware: creator gets pencil→trash; owner gets EyeOff

const HIT = { top: 12, bottom: 12, left: 12, right: 12 } as const;

function CardActions({
  event, onDelete, isOwner, onAdminDeactivate,
}: {
  event: TimelineEvent;
  onDelete?: (id: string) => void;
  isOwner?: boolean;
  onAdminDeactivate?: (id: string) => void;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [deleteMode, setDeleteMode] = useState(false);

  if (!currentUserId) return null;

  const isCreator = event.registeredBy === currentUserId;

  // Admin (owner) viewing another tutor's record → deactivate button
  if (!isCreator && isOwner && onAdminDeactivate) {
    return (
      <TouchableOpacity
        onPress={() => onAdminDeactivate(event.id)}
        style={cas.trashBtn}
        hitSlop={HIT}
      >
        <EyeOff size={rs(14)} color={colors.danger} strokeWidth={1.8} />
      </TouchableOpacity>
    );
  }

  // Record creator → pencil toggle → trash + cancel
  if (!isCreator || !onDelete) return null;

  if (deleteMode) {
    return (
      <View style={cas.row}>
        <TouchableOpacity
          onPress={() => { setDeleteMode(false); onDelete(event.id); }}
          style={cas.trashBtn}
          hitSlop={HIT}
        >
          <Trash2 size={rs(15)} color={colors.danger} strokeWidth={1.8} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDeleteMode(false)} style={cas.cancelBtn} hitSlop={HIT}>
          <X size={rs(13)} color={colors.textDim} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity onPress={() => setDeleteMode(true)} style={cas.editBtn} hitSlop={HIT}>
      <Pencil size={rs(14)} color={colors.accent} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

// ── Helper: match classification type → module row ──

const MODULE_TYPE_TO_KEY: Record<string, keyof NonNullable<TimelineEvent['modules']>> = {
  vaccine:       'vaccines',
  consultation:  'consultations',
  return_visit:  'consultations',
  expense:       'expenses',
  weight:        'clinical_metrics',
  medication:    'medications',
};

function resolveModuleRow(
  type: string,
  index: number,
  modules: TimelineEvent['modules'],
): ModuleRow | undefined {
  if (!modules) return undefined;
  const key = MODULE_TYPE_TO_KEY[type];
  if (!key) return undefined;
  const arr = modules[key] as ModuleRow[] | undefined;
  if (!arr || arr.length === 0) return undefined;
  // Match by index within same type (most entries have only 1 per type)
  const sameTypeIndex = index; // caller already filtered by type confidence
  return arr[sameTypeIndex] ?? arr[0];
}

// ── PhotoSubcard ──

function PhotoSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const uri = media.mediaUrl?.startsWith('http')
    ? media.mediaUrl
    : media.mediaUrl ? getPublicUrl('pet-photos', media.mediaUrl) : null;
  const desc = (media.analysis as Record<string, unknown> | undefined)?.description as string | undefined;
  const toxCheck = (media.analysis as Record<string, unknown> | undefined)?.toxicity_check as Record<string, unknown> | undefined;
  const sources = (media.analysis as Record<string, unknown> | undefined)?.sources as string[] | undefined;
  const hasToxic = toxCheck?.has_toxic_items === true;
  const toxItems = toxCheck?.items as Array<{name: string; toxicity_level: string; description: string}> | undefined;

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={styles.subcard}>
      <View style={styles.subcardHeader}>
        <Camera size={rs(12)} color={colors.success} strokeWidth={1.8} />
        <Text style={styles.subcardLabel}>{t('diary.photoAnalysis').toUpperCase()}</Text>
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
      {hasToxic && toxItems && toxItems.length > 0 && (
        <View style={[styles.toxicAlert, { backgroundColor: colors.danger + '12' }]}>
          <AlertTriangle size={rs(14)} color={colors.danger} strokeWidth={1.8} />
          <View style={{ flex: 1, gap: rs(2) }}>
            {toxItems.map((item, i) => (
              <Text key={i} style={[styles.toxicText, { color: colors.danger }]}>
                {item.name}: {item.description}
              </Text>
            ))}
          </View>
        </View>
      )}
      {desc && <Text style={styles.subcardBodyText}>{desc}</Text>}
      {sources && sources.length > 0 && (
        <View style={styles.sourcesContainer}>
          {sources.map((src, i) => (
            <Text key={i} style={styles.sourceText}>📚 {src}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ── VideoSubcard ──

function VideoSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const thumbUri = media.thumbnailUrl
    ? (media.thumbnailUrl.startsWith('http') ? media.thumbnailUrl : getPublicUrl('pet-photos', media.thumbnailUrl))
    : null;
  const videoUri = media.mediaUrl?.startsWith('http')
    ? media.mediaUrl
    : media.mediaUrl ? getPublicUrl('pet-photos', media.mediaUrl) : null;
  const desc = (media.analysis as Record<string, unknown> | undefined)?.description as string | undefined;
  const va = media.videoAnalysis;
  const hasAIData = !!(desc || va?.behavior_summary);

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={[styles.subcard, { borderColor: colors.sky + '30' }]}>
      <View style={styles.subcardHeader}>
        <Video size={rs(12)} color={colors.sky} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.sky }]}>
          {(hasAIData ? t('diary.videoAnalysis') : t('diary.video')).toUpperCase()}
        </Text>
      </View>
      {(thumbUri || videoUri) && (
        <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85} style={styles.videoThumbWrap}>
          {thumbUri
            ? <Image source={{ uri: thumbUri }} style={styles.subcardImage} resizeMode="cover" />
            : <View style={[styles.subcardImage, { backgroundColor: colors.bgDeep }]} />}
          <View style={styles.videoThumbPlayOverlay}>
            <View style={styles.videoThumbPlayBtn}>
              <Play size={rs(22)} color="#fff" fill="#fff" strokeWidth={0} />
            </View>
          </View>
        </TouchableOpacity>
      )}
      {videoUri && (
        <MediaViewerModal
          visible={viewerOpen}
          type="video"
          uri={videoUri}
          thumbnailUri={thumbUri}
          openInPlayerLabel={t('diary.openInPlayer')}
          onClose={() => setViewerOpen(false)}
        />
      )}
      {desc && <Text style={styles.subcardBodyText}>{desc}</Text>}
      {va?.behavior_summary && <Text style={styles.subcardBodyText}>{va.behavior_summary}</Text>}
      {(() => {
        const videoSources = (media.analysis as Record<string, unknown> | undefined)?.sources as string[] | undefined;
        return videoSources && videoSources.length > 0 ? (
          <View style={styles.sourcesContainer}>
            {videoSources.map((src, i) => (
              <Text key={i} style={styles.sourceText}>📚 {src}</Text>
            ))}
          </View>
        ) : null;
      })()}
      {va && (va.energy_score != null || va.calm_score != null || va.locomotion_score != null) && (
        <View style={styles.subcardScores}>
          {va.energy_score != null && <SubcardScore label={t('diary.energy')} value={va.energy_score} color={colors.gold} />}
          {va.calm_score != null && <SubcardScore label={t('diary.calm')} value={va.calm_score} color={colors.success} />}
          {va.locomotion_score != null && <SubcardScore label={t('diary.locomotion')} value={va.locomotion_score} color={colors.sky} />}
        </View>
      )}
      {va?.health_observations && va.health_observations.length > 0 && (
        <View style={{ paddingHorizontal: rs(10), paddingBottom: rs(8), gap: rs(4) }}>
          {va.health_observations.map((obs, i) => (
            <View key={i} style={styles.observationRow}>
              <Lightbulb size={rs(12)} color={colors.gold} strokeWidth={1.8} />
              <Text style={styles.observationText}>{obs}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── AudioSubcard ──

function AudioSubcard({ media, t }: { media: MediaAnalysisItem; t: (k: string, opts?: Record<string, string>) => string }) {
  const pa = media.petAudioAnalysis;
  const fileName = media.fileName ?? t('diary.audioFile');
  const audioUri = media.mediaUrl?.startsWith('http')
    ? media.mediaUrl
    : media.mediaUrl ? getPublicUrl('pet-photos', media.mediaUrl) : null;

  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={[styles.subcard, { borderColor: colors.rose + '30' }]}>
      <View style={styles.subcardHeader}>
        <Mic size={rs(12)} color={colors.rose} strokeWidth={1.8} />
        <Text style={[styles.subcardLabel, { color: colors.rose }]}>{t('diary.audioAnalysis').toUpperCase()}</Text>
      </View>
      <TouchableOpacity
        onPress={() => audioUri && setViewerOpen(true)}
        activeOpacity={audioUri ? 0.75 : 1}
        style={styles.audioFileRow}
      >
        <Music2 size={rs(20)} color={colors.rose} strokeWidth={1.6} />
        <Text style={styles.audioFileName} numberOfLines={1}>{fileName}</Text>
        {audioUri && <Play size={rs(16)} color={colors.rose} fill={colors.rose} strokeWidth={0} />}
      </TouchableOpacity>
      {audioUri && (
        <MediaViewerModal
          visible={viewerOpen}
          type="audio"
          uri={audioUri}
          fileName={fileName}
          onClose={() => setViewerOpen(false)}
        />
      )}
      {pa && (
        <>
          <Text style={styles.subcardBodyText}>
            {t('listen.soundType')}: {pa.sound_type}{'  ·  '}{pa.intensity}
          </Text>
          {pa.pattern_notes ? <Text style={styles.subcardBodyText}>{pa.pattern_notes}</Text> : null}
        </>
      )}
    </View>
  );
}

// ── OCRSubcard ──

const PRIORITY_KEYS = ['total', 'valor total', 'total a pagar', 'nf', 'nf_number', 'nota', 'data', 'issue_date', 'data de emissão'];
// Chaves específicas para o campo de total financeiro (mais específicas primeiro, evita "tributos/impostos")
const TOTAL_FIELD_KEYS = ['valor total nf', 'valor total da nota', 'total da nota', 'total nf', 'total a pagar', 'valor a pagar', 'total geral', 'valor total'];
const TOTAL_FIELD_EXCLUDE = ['tributo', 'imposto', 'icms', 'aproximado', 'iss', 'ipi', 'pis', 'cofins'];

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

function OCRSubcard({
  media, t, entryId, mediaIndex, allMediaAnalyses,
}: {
  media: MediaAnalysisItem;
  t: (k: string, opts?: Record<string, string>) => string;
  entryId: string;
  mediaIndex: number;
  allMediaAnalyses: MediaAnalysisItem[];
}) {
  console.log('[OCRSUBCARD] fields:', media.ocrData?.fields?.length ?? 0,
    'docType:', media.ocrData?.document_type ?? 'none',
    'items:', media.ocrData?.items?.length ?? 0);
  if (media.ocrData?.fields?.length) {
    console.log('[OCRSUBCARD] first 3 fields:', JSON.stringify(media.ocrData.fields.slice(0, 3)));
  } else {
    console.warn('[OCRSUBCARD] NO FIELDS | full ocrData:', JSON.stringify(media.ocrData));
  }

  const uri = media.mediaUrl?.startsWith('http')
    ? media.mediaUrl
    : media.mediaUrl ? getPublicUrl('pet-photos', media.mediaUrl) : null;

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
          <Pencil size={rs(14)} color={colors.accent} strokeWidth={1.8} />
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
                    placeholder="qtd"
                    placeholderTextColor={colors.textDim}
                  />
                  <TextInput
                    style={[styles.ocrItemPrice, styles.ocrEditInput, { minWidth: rs(60) }]}
                    value={item.unit_price != null ? String(item.unit_price).replace('.', ',') : ''}
                    onChangeText={(v) => handleItemChange(i, 'unit_price', v)}
                    keyboardType="decimal-pad"
                    placeholder="0,00"
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
        .filter((f) => isEditing || (f.value != null && String(f.value).trim() !== ''))
        .map((field, i) => (
          <View key={i} style={styles.ocrField}>
            <Text style={[styles.ocrKey, isMonetaryKey(field.key) && isFinancial && { color: colors.accent }]}>
              {field.key}
            </Text>
            {isEditing ? (
              <TextInput
                style={[styles.ocrValue, styles.ocrEditInput]}
                value={field.value ?? ''}
                onChangeText={(v) => handleFieldChange(i, v)}
                keyboardType={isMonetaryKey(field.key) ? 'decimal-pad' : 'default'}
                placeholder="—"
                placeholderTextColor={colors.textDim}
                multiline={!isMonetaryKey(field.key)}
              />
            ) : (
              <Text
                numberOfLines={5}
                style={[
                  styles.ocrValue,
                  field.confidence != null && field.confidence < 0.5 && styles.ocrValueLow,
                  isMonetaryKey(field.key) && isFinancial && { color: colors.accent, fontFamily: 'JetBrainsMono_700Bold' },
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

// ── SubcardScore (used by VideoSubcard) ──

function SubcardScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.subcardScoreItem}>
      <Text style={[styles.subcardScoreValue, { color }]}>{value}</Text>
      <Text style={styles.subcardScoreLabel}>{label}</Text>
    </View>
  );
}

// ── MonthSummaryCard ──

export const MonthSummaryCard = React.memo(({ event, t }: CardProps) => {
  const stats = event.monthStats;
  return (
    <View style={styles.cardBase}>
      <View style={styles.monthHeader}>
        <Calendar size={rs(16)} color={colors.accent} strokeWidth={1.8} />
        <Text style={styles.monthTitle}>{event.monthLabel}</Text>
      </View>
      <Text style={styles.monthSummaryLabel}>{t('diary.monthSummary')}</Text>
      <Text style={styles.cardDetail}>{event.monthSummaryText}</Text>
      {stats && (
        <View style={styles.monthStatsRow}>
          {[
            { value: stats.walks, label: t('diary.walks') },
            { value: stats.photos, label: t('diary.photos') },
            { value: stats.vet, label: t('diary.vet') },
            { value: stats.mood, label: t('diary.moodLabel'), color: colors.success },
          ].map((s) => (
            <View key={s.label} style={styles.monthStat}>
              <Text style={[styles.monthStatValue, s.color ? { color: s.color } : undefined]}>{s.value}</Text>
              <Text style={styles.monthStatLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── DiaryCard ──

export const DiaryCard = React.memo(({ event, petName, t, getMoodData, onEdit, onRetry, onDelete, isOwner, onAdminDeactivate }: DiaryCardProps) => {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const isCreator = !!currentUserId && event.registeredBy === currentUserId;
  console.log('[CARD]', event.id.slice(-8), '| fotos:', event.photos?.length ?? 0, '| narration:', !!event.narration, '| photoAnalysis:', !!event.photoAnalysisData, '| videoUrl:', !!event.videoUrl, '| classif:', event.classifications?.length ?? 0, '| modules:', !!event.modules);
  console.log('[CARD-MEDIA]', event.id?.slice(0,8),
    'mediaAnalyses:', event.mediaAnalyses?.length ?? 0,
    'types:', event.mediaAnalyses?.map((m: any) => m.type).join(',') ?? 'none',
    'ocrFields:', event.mediaAnalyses?.find((m: any) => m.type === 'document')?.ocrData?.fields?.length ?? 0
  );
  const moodData = getMoodData(event.moodId);
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  // Tutor attribution — only show when a different tutor created this entry
  const tutorName = !isCreator
    ? (event.registeredByUser?.full_name
        ?? event.registeredByUser?.email?.split('@')[0]
        ?? null)
    : null;

  // ── Pending state (saved offline, waiting for sync) ───────────────────────
  if (event.processingStatus === 'pending') {
    return (
      <View style={[styles.cardBase, styles.pendingCard]}>
        <View style={styles.pendingRow}>
          <WifiOff size={rs(14)} color={colors.warning} strokeWidth={1.8} />
          <Text style={styles.pendingText}>{t('diary.pendingSync')}</Text>
        </View>
        {!!event.content && event.content !== '(media)' && (
          <Text style={styles.processingContent} numberOfLines={2}>{event.content}</Text>
        )}
      </View>
    );
  }

  // ── Processing state ──────────────────────────────────────────────────────
  if (event.processingStatus === 'processing') {
    const processingMsg =
      event.inputType === 'photo' || event.inputType === 'gallery' || event.inputType === 'ocr_scan'
        ? t('diary.processingPhoto')
        : event.inputType === 'video'
        ? t('diary.processingVideo')
        : event.inputType === 'pet_audio'
        ? t('diary.processingAudio')
        : t('diary.processingEntry');

    return (
      <View style={[styles.cardBase, styles.processingCard]}>
        <View style={styles.processingRow}>
          <ActivityIndicator size="small" color={colors.purple} />
          <Text style={styles.processingText}>{processingMsg}</Text>
        </View>
        {!!event.content && event.content !== '(media)' && (
          <Text style={styles.processingContent} numberOfLines={2}>{event.content}</Text>
        )}
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (event.processingStatus === 'error') {
    return (
      <View style={[styles.cardBase, styles.errorCard]}>
        <View style={styles.errorRow}>
          <AlertCircle size={rs(16)} color={colors.danger} strokeWidth={1.8} />
          <Text style={styles.errorText}>{t('diary.processingError')}</Text>
        </View>
        {!!event.content && event.content !== '(media)' && (
          <Text style={styles.errorContent} numberOfLines={3}>{event.content}</Text>
        )}
        {onRetry && (
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => onRetry(event.id)}
            activeOpacity={0.7}
          >
            <RefreshCw size={rs(14)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.retryText}>{t('diary.retryEntry')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.cardBase}>
      {event.isSpecial && (
        <View style={styles.specialHeader}>
          <Star size={rs(14)} color={colors.gold} strokeWidth={1.8} />
          <Text style={styles.specialText}>{t('diary.specialMoment')}</Text>
        </View>
      )}

      {event.isRegistrationEntry && (
        <View style={styles.registrationBadge}>
          <PawPrint size={rs(12)} color={colors.accent} strokeWidth={2} />
          <Text style={styles.registrationText}>{t('diary.registrationEntry')}</Text>
        </View>
      )}

      <View style={styles.entryHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.entryDate}>{dateStr}</Text>
          <Text style={styles.entryTime}>{timeStr}</Text>
          {!!tutorName && (
            <View style={styles.tutorAttribution}>
              <User size={rs(10)} color={colors.petrol} strokeWidth={1.8} />
              <Text style={styles.tutorAttributionText}>
                {t('diary.byTutor', { name: tutorName })}
              </Text>
            </View>
          )}
        </View>
        {!event.isRegistrationEntry && (isCreator || (!isCreator && isOwner && onAdminDeactivate)) && (
          <View style={styles.diaryCardActions}>
            {isCreator ? (
              <TouchableOpacity onPress={() => onEdit(event.id)} hitSlop={HIT}>
                <Pencil size={rs(16)} color={colors.accent} strokeWidth={1.8} />
              </TouchableOpacity>
            ) : (
              // Admin (owner) deactivating another tutor's diary entry
              <TouchableOpacity onPress={() => onAdminDeactivate!(event.id)} style={cas.trashBtn} hitSlop={HIT}>
                <EyeOff size={rs(15)} color={colors.danger} strokeWidth={1.8} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {moodData && (
        <View style={styles.moodBadge}>
          <View style={[styles.moodDot, { backgroundColor: moodData.color }]} />
          <Text style={[styles.moodLabel, { color: moodData.color }]}>{moodData.label}</Text>
        </View>
      )}

      {event.narration ? (
        <View style={styles.narrationWrapper}>
          <DiaryNarration
            entryId={event.id}
            narration={event.narration}
            petName={petName}
          />
        </View>
      ) : event.content && event.content !== '(media)' ? (
        <Text style={styles.tutorContent}>{event.content}</Text>
      ) : null}

      {/* Media subcards — one per attachment */}
      {event.mediaAnalyses && event.mediaAnalyses.length > 0 ? (
        <View style={styles.mediaSubcardsContainer}>
          {event.mediaAnalyses.map((media, idx) => {
            console.log('[SUBCARD]', 'type:', media.type,
              'mediaUrl:', !!media.mediaUrl,
              'ocrFields:', media.ocrData?.fields?.length ?? 0,
              'analysis:', !!media.analysis,
              'desc:', (media.analysis?.description as string)?.slice(0, 50) ?? 'none'
            );
            if (media.type === 'photo') return <PhotoSubcard key={idx} media={media} t={t} />;
            if (media.type === 'video') return <VideoSubcard key={idx} media={media} t={t} />;
            if (media.type === 'audio') return <AudioSubcard key={idx} media={media} t={t} />;
            if (media.type === 'document') return (
              <OCRSubcard
                key={idx}
                media={media}
                t={t}
                entryId={event.id}
                mediaIndex={idx}
                allMediaAnalyses={event.mediaAnalyses!}
              />
            );
            return null;
          })}
        </View>
      ) : (
        /* Fallback for legacy entries without media_analyses */
        <>
          {event.photos && event.photos.length > 0 && (
            <PhotoSubcard
              media={{
                type: 'photo',
                mediaUrl: event.photos[0],
                analysis: event.photoAnalysisData ?? null,
              }}
              t={t}
            />
          )}
          {event.videoUrl && (
            <VideoSubcard
              media={{
                type: 'video',
                mediaUrl: event.videoUrl,
                thumbnailUrl: event.photos?.[0] ?? null,
                videoAnalysis: event.videoAnalysis,
                analysis: event.photoAnalysisData ?? null,
              }}
              t={t}
            />
          )}
          {event.audioUrl && (
            <AudioSubcard
              media={{
                type: 'audio',
                mediaUrl: event.audioUrl,
                petAudioAnalysis: event.petAudioAnalysis,
                analysis: null,
              }}
              t={t}
            />
          )}
        </>
      )}

      {/* Lenses subcard — AI-classified health/finance data */}
      {event.classifications && event.classifications.filter((c) => c.confidence >= 0.5).length > 0 && (
        <View style={styles.subcard}>
          <View style={styles.subcardHeader}>
            <LayoutGrid size={rs(12)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.subcardLabel}>{t('diary.registered').toUpperCase()}</Text>
          </View>
          <View style={styles.moduleList}>
            {event.classifications
              .filter((c) => c.confidence >= 0.5)
              .map((cls, idx) => {
                const moduleRow = resolveModuleRow(cls.type, idx, event.modules);
                return (
                  <DiaryModuleCard
                    key={`${cls.type}-${idx}`}
                    classification={cls}
                    moduleRow={moduleRow}
                    t={t}
                  />
                );
              })}
          </View>
        </View>
      )}

      {event.tags && event.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{t(`diary.${tag}`, { defaultValue: tag })}</Text>
            </View>
          ))}
        </View>
      )}

      {event.registeredBy && (
        <View style={styles.auditSection}>
          <Text style={styles.auditText}>
            {t('diary.registeredBy', {
              name: event.registeredBy === currentUserId
                ? t('diary.registeredByYou')
                : (event.registeredByUser?.full_name
                  ?? event.registeredByUser?.email?.split('@')[0]
                  ?? t('diary.registeredByUnknown')),
              date: new Date(event.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
            })}
          </Text>
          {!!event.updatedBy && event.updatedBy !== event.registeredBy && !!event.updatedAt && (
            <Text style={styles.auditText}>
              {t('diary.editedBy', {
                name: event.updatedBy === currentUserId
                  ? t('diary.registeredByYou')
                  : (event.updatedByUser?.full_name
                    ?? event.updatedByUser?.email?.split('@')[0]
                    ?? t('diary.anotherTutor')),
                date: new Date(event.updatedAt).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }),
              })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

// ── HealthCard ──

export const HealthCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => {
  const severityColor = event.severity === 'high' ? colors.danger
    : event.severity === 'medium' ? colors.warning : colors.success;
  const severityLabel = event.severity === 'high' ? t('diary.severityHigh')
    : event.severity === 'medium' ? t('diary.severityMedium') : t('diary.severityLow');
  const sourceLabel = event.source === 'vet' ? t('diary.sourceVet')
    : event.source === 'ai_photo' ? t('diary.sourceAiPhoto')
      : event.source === 'ai_audio' ? t('diary.sourceAiAudio') : t('diary.sourceTutor');

  return (
    <View style={[styles.cardBase, { borderLeftWidth: 3, borderLeftColor: severityColor }]}>
      <View style={styles.cardIconRow}>
        <ShieldCheck size={rs(16)} color={colors.success} strokeWidth={1.8} />
        <Text style={styles.cardTypeLabel}>{t('diary.healthEvent')}</Text>
        <View style={[styles.severityBadge, { backgroundColor: severityColor + '20' }]}>
          <Text style={[styles.severityText, { color: severityColor }]}>{severityLabel}</Text>
        </View>
        <CardActions event={event} onDelete={onDelete} isOwner={isOwner} onAdminDeactivate={onAdminDeactivate} />
      </View>
      <Text style={styles.cardTitle}>{event.title}</Text>
      <Text style={styles.cardDetail}>{event.detail}</Text>
      <View style={styles.sourceBadge}>
        <Text style={styles.healthSourceText}>{sourceLabel}</Text>
      </View>
    </View>
  );
});

// ── AudioAnalysisCard ──

const INTENSITY_COLOR: Record<string, string> = {
  low: '#2ECC71',
  medium: '#F1C40F',
  high: '#E74C3C',
};

export const AudioAnalysisCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => {
  const pa = event.petAudioAnalysis;
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const intensityColor = pa?.intensity ? (INTENSITY_COLOR[pa.intensity] ?? colors.rose) : colors.rose;

  const audioUri = event.audioUrl
    ? (event.audioUrl.startsWith('http') ? event.audioUrl : getPublicUrl('pet-photos', event.audioUrl))
    : null;
  const audioFileName = event.audioUrl?.split('/').pop() ?? t('diary.audioFile');

  const [playerOpen, setPlayerOpen] = useState(false);

  return (
    <View style={styles.cardBase}>
      <View style={styles.cardIconRow}>
        <Mic size={rs(16)} color={colors.rose} strokeWidth={1.8} />
        <Text style={[styles.cardTypeLabel, { color: colors.rose }]}>{t('diary.audioAnalysis')}</Text>
        {event.audioDuration != null && (
          <View style={[styles.severityBadge, { backgroundColor: colors.rose + '20' }]}>
            <Text style={[styles.severityText, { color: colors.rose }]}>
              {formatDuration(event.audioDuration)}
            </Text>
          </View>
        )}
        <CardActions event={event} onDelete={onDelete} isOwner={isOwner} onAdminDeactivate={onAdminDeactivate} />
      </View>

      <Text style={styles.entryDate}>{dateStr}</Text>
      <Text style={styles.entryTime}>{timeStr}</Text>

      {audioUri && (
        <>
          <TouchableOpacity
            style={styles.audioBanner}
            onPress={() => setPlayerOpen(true)}
            activeOpacity={0.75}
          >
            <View style={styles.audioIconCircle}>
              <Music2 size={rs(22)} color={colors.rose} strokeWidth={1.6} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.audioFileName} numberOfLines={1}>{audioFileName}</Text>
              {event.audioDuration != null && (
                <Text style={styles.audioFileMeta}>{formatDuration(event.audioDuration)}</Text>
              )}
            </View>
            <Play size={rs(18)} color={colors.rose} fill={colors.rose} strokeWidth={0} style={{ marginRight: rs(4) }} />
          </TouchableOpacity>
          <MediaViewerModal
            visible={playerOpen}
            type="audio"
            uri={audioUri}
            fileName={audioFileName}
            onClose={() => setPlayerOpen(false)}
          />
        </>
      )}

      {event.narration && (
        <View style={styles.narrationSection}>
          <Text style={styles.narrationText}>{event.narration}</Text>
        </View>
      )}

      {pa && (
        <>
          <View style={[styles.infoBox, { backgroundColor: colors.rose + '12', marginTop: rs(10) }]}>
            <Text style={[styles.infoBoxLabel, { color: colors.rose }]}>
              {t('listen.soundType')}: {t(`listen.sound_${pa.sound_type}`, { defaultValue: pa.sound_type })}
            </Text>
            <Text style={[styles.infoBoxValue, { color: colors.text }]}>
              {t(`listen.emotion_${pa.emotional_state}`, { defaultValue: pa.emotional_state })}
            </Text>
          </View>

          {pa.intensity && (
            <View style={[styles.severityBadge, { backgroundColor: intensityColor + '20', alignSelf: 'flex-start', marginTop: rs(8) }]}>
              <Text style={[styles.severityText, { color: intensityColor }]}>
                {t(`listen.intensity_${pa.intensity}`, { defaultValue: pa.intensity })}
              </Text>
            </View>
          )}

          {pa.pattern_notes ? (
            <View style={styles.observationRow}>
              <Lightbulb size={rs(12)} color={colors.warning} strokeWidth={1.8} />
              <Text style={styles.observationText}>{pa.pattern_notes}</Text>
            </View>
          ) : null}
        </>
      )}

      {event.tags && event.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── PhotoAnalysisCard ──

export const PhotoAnalysisCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Camera size={rs(16)} color={colors.success} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.success }]}>{t('diary.photoAnalysis')}</Text>
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
  </View>
));

// ── ScoreBadge (used by VideoAnalysisCard) ──

function ScoreBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.scoreBadgeItem}>
      <Text style={[styles.scoreBadgeValue, { color }]}>{value}</Text>
      <Text style={styles.scoreBadgeLabel}>{label}</Text>
    </View>
  );
}

// ── VideoAnalysisCard ──

export const VideoAnalysisCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => {
  const va = event.videoAnalysis;
  const dateObj = new Date(event.date);
  const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // First frame: stored as photos[0] (uploaded), falling back to nothing
  const framePhoto = event.photos?.[0];
  const frameUri = framePhoto
    ? (framePhoto.startsWith('http') ? framePhoto : getPublicUrl('pet-photos', framePhoto))
    : null;
  const videoUri = event.videoUrl
    ? (event.videoUrl.startsWith('http') ? event.videoUrl : getPublicUrl('pet-photos', event.videoUrl))
    : null;

  const photoDesc = event.photoAnalysisData?.description as string | undefined;
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <View style={styles.videoCard}>
      {/* Header row */}
      <View style={styles.videoCardHeader}>
        <Video size={rs(14)} color={colors.sky} strokeWidth={1.8} />
        <Text style={styles.videoCardLabel}>{t('diary.videoAnalysis').toUpperCase()}</Text>
        {event.videoDuration != null && (
          <View style={[styles.severityBadge, { backgroundColor: colors.sky + '20' }]}>
            <Text style={[styles.severityText, { color: colors.sky }]}>
              {formatDuration(event.videoDuration)}
            </Text>
          </View>
        )}
        {event.severity && event.severity !== 'low' && (
          <View style={[styles.severityBadge, { backgroundColor: (event.severity === 'high' ? colors.danger : colors.warning) + '20' }]}>
            <Text style={[styles.severityText, { color: event.severity === 'high' ? colors.danger : colors.warning }]}>
              {t(`diary.urgency_${event.severity}`)}
            </Text>
          </View>
        )}
        <CardActions event={event} onDelete={onDelete} isOwner={isOwner} onAdminDeactivate={onAdminDeactivate} />
      </View>

      <Text style={[styles.entryDate, { paddingHorizontal: rs(12) }]}>{dateStr}</Text>
      <Text style={[styles.entryTime, { paddingHorizontal: rs(12), marginBottom: rs(8) }]}>{timeStr}</Text>

      {/* Frame image (uploaded as photos[0]) — tap to open video in player */}
      {frameUri && (
        <TouchableOpacity onPress={() => setViewerOpen(true)} activeOpacity={0.85} style={styles.videoThumbWrap}>
          <Image source={{ uri: frameUri }} style={styles.videoCardFrame} resizeMode="cover" />
          {(videoUri || frameUri) && (
            <View style={styles.videoThumbPlayOverlay}>
              <View style={styles.videoThumbPlayBtn}>
                <Play size={rs(22)} color="#fff" fill="#fff" strokeWidth={0} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      )}
      {(videoUri || frameUri) && (
        <MediaViewerModal
          visible={viewerOpen}
          type="video"
          uri={videoUri ?? frameUri!}
          thumbnailUri={frameUri}
          openInPlayerLabel={t('diary.openInPlayer')}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Frame description from analyze-pet-photo */}
      {photoDesc && (
        <View style={styles.videoCardFrameDesc}>
          <Camera size={rs(12)} color={colors.success} strokeWidth={1.8} />
          <Text style={styles.videoCardFrameDescText}>{photoDesc}</Text>
        </View>
      )}

      <View style={{ paddingHorizontal: rs(12), paddingBottom: rs(4) }}>
        {/* Behavior summary */}
        {va?.behavior_summary && (
          <Text style={styles.videoCardBehavior}>{va.behavior_summary}</Text>
        )}

        {/* Scores row */}
        {va && (va.energy_score != null || va.calm_score != null || va.locomotion_score != null) && (
          <View style={styles.videoCardScores}>
            {va.energy_score != null && (
              <ScoreBadge label={t('diary.energy')} value={va.energy_score} color={colors.gold} />
            )}
            {va.calm_score != null && (
              <ScoreBadge label={t('diary.calm')} value={va.calm_score} color={colors.success} />
            )}
            {va.locomotion_score != null && (
              <ScoreBadge label={t('diary.locomotion')} value={va.locomotion_score} color={colors.sky} />
            )}
          </View>
        )}

        {/* Health observations */}
        {va?.health_observations && va.health_observations.length > 0 && (
          <View style={[styles.observationsContainer, { marginTop: rs(8) }]}>
            {va.health_observations.map((obs, i) => (
              <View key={i} style={styles.observationRow}>
                <Lightbulb size={rs(12)} color={colors.warning} strokeWidth={1.8} />
                <Text style={styles.observationText}>{obs}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Narration */}
      {event.narration && (
        <View style={styles.videoCardNarration}>
          <Text style={styles.narrationText}>{event.narration}</Text>
        </View>
      )}

      {/* Tags */}
      {event.tags && event.tags.length > 0 && (
        <View style={[styles.tagsRow, { paddingHorizontal: rs(12), paddingBottom: rs(12) }]}>
          {event.tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// ── MilestoneCard ──

export const MilestoneCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={[styles.cardBase, styles.milestoneCard]}>
    <View style={styles.milestoneActions}>
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Trophy size={rs(28)} color={colors.gold} strokeWidth={1.8} />
    <Text style={styles.milestoneTitle}>{event.title}</Text>
    <Text style={styles.milestoneDetail}>{event.detail}</Text>
    {event.badgeName && (
      <View style={styles.badgeChip}>
        <Star size={rs(12)} color={colors.gold} strokeWidth={1.8} />
        <Text style={styles.badgeChipText}>{event.badgeName}</Text>
      </View>
    )}
  </View>
));

// ── CapsuleCard ──

export const CapsuleCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      {event.locked
        ? <Lock size={rs(16)} color={colors.purple} strokeWidth={1.8} />
        : <Gift size={rs(16)} color={colors.purple} strokeWidth={1.8} />}
      <Text style={[styles.cardTypeLabel, { color: colors.purple }]}>{t('diary.capsuleLabel')}</Text>
      {event.locked && (
        <View style={[styles.severityBadge, { backgroundColor: colors.purple + '20' }]}>
          <Lock size={rs(10)} color={colors.purple} strokeWidth={2} />
          <Text style={[styles.severityText, { color: colors.purple, marginLeft: rs(4) }]}>
            {t('diary.capsuleLocked')}
          </Text>
        </View>
      )}
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Text style={styles.cardTitle}>{event.title}</Text>
    {event.locked && event.condition && (
      <Text style={styles.capsuleCondition}>{t('diary.capsuleCondition')}: {event.condition}</Text>
    )}
    {!event.locked && event.capsuleMessage && (
      <Text style={styles.capsuleMessage}>{event.capsuleMessage}</Text>
    )}
    {!event.locked && (
      <View style={styles.capsuleDates}>
        {event.recordedDate && (
          <Text style={styles.capsuleDateText}>{t('diary.capsuleRecorded')} {event.recordedDate}</Text>
        )}
        {event.unlockedDate && (
          <Text style={styles.capsuleDateText}>{t('diary.capsuleUnlocked')} {event.unlockedDate}</Text>
        )}
      </View>
    )}
  </View>
));

// ── ConnectionCard ──

export const ConnectionCard = React.memo(({ event, t, onDelete, isOwner, onAdminDeactivate }: CardProps) => (
  <View style={styles.cardBase}>
    <View style={styles.cardIconRow}>
      <Heart size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
      <Text style={[styles.cardTypeLabel, { color: colors.petrol }]}>{t('diary.connectionLabel')}</Text>
      <CardActions event={event} onDelete={onDelete} />
    </View>
    <Text style={styles.cardTitle}>{t('diary.newFriend')}: {event.friendName}</Text>
    <Text style={styles.cardDetail}>{event.detail}</Text>
    {event.matchPct != null && (
      <View style={[styles.severityBadge, { backgroundColor: colors.petrol + '20', alignSelf: 'flex-start', marginTop: rs(8) }]}>
        <Text style={[styles.severityText, { color: colors.petrol }]}>
          {t('diary.matchPercent', { pct: String(event.matchPct) })}
        </Text>
      </View>
    )}
  </View>
));

// ── ScheduledEventCard ──

const SCHED_EVENT_ICON: Record<string, React.ElementType> = {
  consultation:      Calendar,
  return_visit:      Calendar,
  exam:              FileText,
  surgery:           AlertCircle,
  physiotherapy:     Calendar,
  vaccine:           ShieldCheck,
  travel_vaccine:    ShieldCheck,
  medication_dose:   Calendar,
  medication_series: Calendar,
  deworming:         Calendar,
  antiparasitic:     Calendar,
  grooming:          Calendar,
  nail_trim:         Calendar,
  dental_cleaning:   Calendar,
  microchip:         Calendar,
  plan_renewal:      Calendar,
  insurance_renewal: Calendar,
  plan_payment:      Calendar,
  training:          Calendar,
  behaviorist:       Calendar,
  socialization:     Calendar,
  travel_checklist:  Calendar,
  custom:            Calendar,
};

export const ScheduledEventCard = React.memo(({ event, t }: CardProps) => {
  const IconComponent = SCHED_EVENT_ICON[event.scheduledEventType ?? 'custom'] ?? Calendar;
  const isAI = event.scheduledSource === 'ai';
  const formattedDate = event.scheduledFor
    ? new Date(event.scheduledFor).toLocaleDateString(
        i18n.language === 'en-US' || i18n.language === 'en' ? 'en-US' : 'pt-BR',
        { weekday: 'short', day: '2-digit', month: 'short', hour: event.scheduledAllDay ? undefined : '2-digit', minute: event.scheduledAllDay ? undefined : '2-digit' },
      )
    : '—';

  return (
    <View style={[styles.cardBase, styles.schedCard]}>
      <View style={styles.schedHeader}>
        <View style={styles.schedIconWrap}>
          <IconComponent size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
        </View>
        <Text style={styles.schedTypeLabel}>{t('diary.upcomingEvent')}</Text>
        {isAI && (
          <View style={styles.schedAIBadge}>
            <Text style={styles.schedAIText}>IA</Text>
          </View>
        )}
      </View>

      <Text style={styles.schedTitle}>{event.title}</Text>

      <View style={styles.schedDateRow}>
        <Calendar size={rs(12)} color={colors.petrol} strokeWidth={1.8} />
        <Text style={styles.schedDateText}>{formattedDate}</Text>
      </View>

      {event.detail ? (
        <Text style={styles.schedDetail}>{event.detail}</Text>
      ) : null}

      {(event.scheduledProfessional || event.scheduledLocation) ? (
        <View style={styles.schedMetaRow}>
          {event.scheduledProfessional ? (
            <Text style={styles.schedMetaText}>{event.scheduledProfessional}</Text>
          ) : null}
          {event.scheduledLocation ? (
            <Text style={styles.schedMetaText}>{event.scheduledLocation}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

// ── Styles ──

const styles = StyleSheet.create({
  cardBase: { backgroundColor: colors.card, borderRadius: rs(22), borderWidth: 1, borderColor: colors.border, padding: rs(16) },

  // Month summary
  monthHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(8) },
  monthTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.accent },
  monthSummaryLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1.5, marginBottom: rs(6) },
  monthStatsRow: { flexDirection: 'row', marginTop: rs(12), gap: rs(8) },
  monthStat: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(8), alignItems: 'center' },
  monthStatValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(14), color: colors.accent },
  monthStatLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Diary card
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: rs(8) },
  entryDate: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  entryTime: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(11), color: colors.textDim },
  tutorAttribution: { flexDirection: 'row', alignItems: 'center', gap: rs(4), marginTop: rs(3) },
  tutorAttributionText: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim },
  specialHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.gold + '15', paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(8), marginBottom: rs(10), alignSelf: 'flex-start' },
  specialText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.gold, letterSpacing: 0.5 },
  registrationBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.accentGlow, paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(8), marginBottom: rs(10), alignSelf: 'flex-start' },
  registrationText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.accent, letterSpacing: 0.5 },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(12) },
  moodDot: { width: rs(8), height: rs(8), borderRadius: rs(4) },
  moodLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11) },
  tutorSection: { backgroundColor: colors.bgCard, borderLeftWidth: 3, borderLeftColor: colors.textGhost, borderRadius: rs(10), padding: rs(12), marginBottom: rs(10) },
  tutorLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, marginBottom: rs(6) },
  tutorContent: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: fs(20) },
  narrationSection: { backgroundColor: colors.accent + '08', borderWidth: 1, borderColor: colors.accent + '12', borderRadius: rs(12), padding: rs(12) },
  narrationHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  narrationTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.accent, flex: 1 },
  narrationText: { fontFamily: 'Caveat_400Regular', fontSize: fs(15), color: colors.textSec, lineHeight: rs(27), fontStyle: 'italic' },
  narrationWrapper: { marginTop: rs(10) },
  moduleList: { gap: rs(6), padding: rs(4) },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: rs(10) },
  tagChip: { backgroundColor: colors.bgCard, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  tagText: { fontFamily: 'Sora_500Medium', fontSize: fs(10), color: colors.textDim },

  // Generic card elements
  cardIconRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  cardTypeLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, flex: 1, textTransform: 'uppercase' },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text, marginBottom: rs(4) },
  cardDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18) },

  // Health card
  severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
  severityText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), letterSpacing: 0.5 },
  sourceBadge: { marginTop: rs(8), backgroundColor: colors.bgCard, borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4), alignSelf: 'flex-start' },
  healthSourceText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim },

  // Info boxes
  infoBox: { borderRadius: rs(10), padding: rs(10), marginTop: rs(8) },
  infoBoxLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), letterSpacing: 0.5, marginBottom: rs(4) },
  infoBoxValue: { fontFamily: 'Sora_500Medium', fontSize: fs(12), lineHeight: fs(18) },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(4) },

  // Score boxes
  scoreBox: { marginTop: rs(10), backgroundColor: colors.bgCard, borderRadius: rs(12), borderWidth: 1, borderColor: colors.border, padding: rs(12), alignItems: 'center' },
  scoreLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, letterSpacing: 0.5, marginBottom: rs(4) },
  scoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(28) },
  scoresRow: { flexDirection: 'row', marginTop: rs(10), gap: rs(8) },
  scoreItem: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(10), alignItems: 'center' },
  scoreItemValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(18) },
  scoreItemLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Milestone
  milestoneCard: { alignItems: 'center', paddingVertical: rs(20) },
  milestoneTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.gold, textAlign: 'center', marginTop: rs(10) },
  milestoneDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, textAlign: 'center', marginTop: rs(4), lineHeight: fs(18) },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.gold + '15', paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8), marginTop: rs(10) },
  badgeChipText: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.gold },

  // VideoAnalysisCard
  videoCard: { backgroundColor: colors.card, borderRadius: rs(16), borderWidth: 1, borderColor: colors.sky + '30', overflow: 'hidden' },
  videoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), padding: rs(12), paddingBottom: rs(4) },
  videoCardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.sky, letterSpacing: 1.2, flex: 1 },
  videoCardFrame: { width: '100%', height: rs(180) },
  videoCardFrameDesc: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6), padding: rs(10), backgroundColor: colors.success + '08' },
  videoCardFrameDescText: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(18) },
  videoCardBehavior: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.text, lineHeight: fs(20), marginTop: rs(10) },
  videoCardScores: { flexDirection: 'row', marginTop: rs(10), gap: rs(8) },
  videoCardNarration: { borderTopWidth: 1, borderTopColor: colors.border, padding: rs(12) },

  // ScoreBadge
  scoreBadgeItem: { flex: 1, backgroundColor: colors.bgCard, borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, padding: rs(8), alignItems: 'center' },
  scoreBadgeValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(18) },
  scoreBadgeLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(9), color: colors.textDim, marginTop: rs(2) },

  // Video health observations
  observationsContainer: { marginTop: rs(8), gap: rs(6) },
  observationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6) },
  observationText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, flex: 1, lineHeight: fs(18) },

  // Capsule
  capsuleCondition: { fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.textDim, marginTop: rs(4) },
  capsuleMessage: { fontFamily: 'Caveat_400Regular', fontSize: fs(16), color: colors.textSec, fontStyle: 'italic', lineHeight: rs(28), marginTop: rs(8) },
  capsuleDates: { marginTop: rs(8), gap: rs(4) },
  capsuleDateText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textDim },

  // Pending / processing / error states
  pendingCard: { borderLeftWidth: rs(3), borderLeftColor: colors.warning },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  pendingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.warning },
  processingCard: { borderLeftWidth: rs(3), borderLeftColor: colors.purple },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  processingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.purple },
  processingContent: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, fontStyle: 'italic', lineHeight: fs(18) },
  errorCard: { borderLeftWidth: rs(3), borderLeftColor: colors.danger },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  errorText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.danger },
  errorContent: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18), marginBottom: rs(10) },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), alignSelf: 'flex-start', paddingVertical: rs(6), paddingHorizontal: rs(12), backgroundColor: colors.accentGlow, borderRadius: rs(8) },
  retryText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.accent },

  // Media attachment thumbnails (video/audio in DiaryCard)

  // Audit
  auditSection: { marginTop: rs(8), gap: rs(2) },
  auditText: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost, lineHeight: fs(15) },

  // Subcards (media: photo/video/audio/document + lenses)
  mediaSubcardsContainer: { gap: rs(4), marginTop: rs(10) },
  subcard: { borderRadius: rs(12), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bg, overflow: 'hidden', marginTop: rs(8) },
  subcardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), paddingHorizontal: rs(12), paddingVertical: rs(8) },
  subcardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.success, letterSpacing: 1.2 },
  subcardImage: { width: '100%', height: rs(180) },
  sourcesContainer: {
    paddingHorizontal: rs(10),
    paddingBottom: rs(8),
    gap: rs(4),
  },
  sourceText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(9),
    color: colors.textDim,
    lineHeight: fs(14),
    fontStyle: 'italic',
  },
  subcardBodyText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, fontStyle: 'italic', lineHeight: fs(18), padding: rs(10), paddingTop: rs(4) },
  toxicAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(6), padding: rs(10) },
  toxicText: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(12), lineHeight: fs(18) },
  subcardScores: { flexDirection: 'row', paddingHorizontal: rs(10), paddingBottom: rs(8) },
  subcardScoreItem: { flex: 1, alignItems: 'center' },
  subcardScoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16) },
  subcardScoreLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim },
  audioFileRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10), padding: rs(12), paddingTop: rs(4) },
  audioFileName: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  audioFileMeta: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(10), color: colors.rose, marginTop: rs(2) },
  audioBanner: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.rose + '12', borderRadius: rs(12), borderWidth: 1, borderColor: colors.rose + '25', padding: rs(12), marginTop: rs(10), marginBottom: rs(6) },
  audioIconCircle: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: colors.rose + '20', alignItems: 'center', justifyContent: 'center' },
  ocrField: { flexDirection: 'row', paddingHorizontal: rs(12), paddingVertical: rs(3), gap: rs(8) },
  ocrKey: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, minWidth: rs(80) },
  ocrValue: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.text },
  ocrValueLow: { color: colors.textDim, fontStyle: 'italic' },
  ocrDocTypeBadge: { backgroundColor: colors.purple + '20', paddingHorizontal: rs(8), paddingVertical: rs(2), borderRadius: rs(6) },
  ocrDocTypeText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), color: colors.purple, letterSpacing: 0.5 },
  ocrTotalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: rs(8), backgroundColor: colors.accent + '12', borderWidth: 1, borderColor: colors.accent + '25', borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(8), marginHorizontal: rs(10), marginVertical: rs(6) },
  ocrTotalLabel: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.accent, letterSpacing: 0.5 },
  ocrTotalValue: { flexShrink: 0, fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16), color: colors.accent },
  ocrItemsContainer: { marginTop: rs(8), paddingHorizontal: rs(10), paddingBottom: rs(8), gap: rs(4) },
  ocrItemsHeader: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1, marginBottom: rs(4) },
  ocrItemRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), paddingVertical: rs(3), borderBottomWidth: 1, borderBottomColor: colors.border },
  ocrItemName: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.text },
  ocrItemQty: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(11), color: colors.textDim, minWidth: rs(28) },
  ocrItemPrice: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(11), color: colors.petrol },
  ocrEmptyHint: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, fontStyle: 'italic', padding: rs(10), textAlign: 'center' },
  ocrActionBar: { flexDirection: 'row', gap: rs(8), marginHorizontal: rs(10), marginTop: rs(8), marginBottom: rs(4) },
  ocrEditBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), marginHorizontal: rs(10), marginTop: rs(8), marginBottom: rs(4), paddingVertical: rs(9), borderRadius: rs(10), borderWidth: 1, borderColor: colors.accent + '50', backgroundColor: colors.accent + '10' },
  ocrEditBarText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.accent },
  ocrCancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), paddingHorizontal: rs(14), paddingVertical: rs(9), borderRadius: rs(10), borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  ocrCancelBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.textDim },
  ocrSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), paddingHorizontal: rs(14), paddingVertical: rs(9), borderRadius: rs(10), backgroundColor: colors.accent },
  ocrSaveBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: '#fff' },
  ocrEditInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.accent + '60', paddingVertical: rs(2), paddingHorizontal: rs(4), color: colors.text, backgroundColor: colors.bgCard },
  ocrScaleBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: rs(10), marginTop: rs(8), borderRadius: rs(10), borderWidth: 1, borderColor: colors.warning + '50', backgroundColor: colors.warningSoft, overflow: 'hidden' },
  ocrScaleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), paddingVertical: rs(8) },
  ocrScaleBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.warning },
  ocrScaleSep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.warning + '40' },
  ocrScaleMultiplyIcon: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.warning },

  // DiaryCard actions (pencil + trash side-by-side)
  diaryCardActions: { flexDirection: 'row', alignItems: 'center', gap: rs(10) },

  // MilestoneCard actions (top-right absolute area)
  milestoneActions: { position: 'absolute', top: rs(12), right: rs(12) },

  // Video thumbnail with play overlay
  videoThumbWrap: { position: 'relative' },
  videoThumbPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  videoThumbPlayBtn: { width: rs(52), height: rs(52), borderRadius: rs(26), backgroundColor: 'rgba(0,0,0,0.55)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' },

  // ScheduledEventCard
  schedCard: { borderColor: colors.petrol + '40', backgroundColor: colors.petrolSoft },
  schedHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  schedIconWrap: { width: rs(26), height: rs(26), borderRadius: rs(8), backgroundColor: colors.petrolGlow, alignItems: 'center', justifyContent: 'center' },
  schedTypeLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.petrol, letterSpacing: 1.2, flex: 1, textTransform: 'uppercase' },
  schedAIBadge: { backgroundColor: colors.purple + '20', paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(6) },
  schedAIText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), color: colors.purple, letterSpacing: 0.5 },
  schedTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text, marginBottom: rs(6) },
  schedDateRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(4) },
  schedDateText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(12), color: colors.petrol },
  schedDetail: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(18), marginTop: rs(4) },
  schedMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8), marginTop: rs(8) },
  schedMetaText: { fontFamily: 'Sora_500Medium', fontSize: fs(11), color: colors.textDim, backgroundColor: colors.bgCard, paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(8) },
});

// ── CardActions styles ──
const cas = StyleSheet.create({
  editBtn: {
    width: rs(28), height: rs(28), borderRadius: rs(8),
    backgroundColor: colors.accent + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  trashBtn: {
    width: rs(28), height: rs(28), borderRadius: rs(8),
    backgroundColor: colors.danger + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: {
    width: rs(26), height: rs(26), borderRadius: rs(7),
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
});
