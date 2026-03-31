/**
 * PDFImportScreen — shows the result of a PDF analysis and lets the tutor
 * select which records to import.
 *
 * Each classification in the AI result becomes a toggleable row.
 * The tutor can deselect individual items before importing.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  FileText, ChevronLeft, CheckSquare, Square, Download,
  Syringe, Stethoscope, FlaskConical, Pill, Scissors,
  Weight, AlertTriangle, FileBarChart, Check,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import type { ClassifyDiaryResponse, ClassificationResult } from '../../lib/ai';

// ── Type icons ──────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ElementType> = {
  vaccine: Syringe,
  consultation: Stethoscope,
  exam: FlaskConical,
  medication: Pill,
  surgery: Scissors,
  weight: Weight,
  allergy: AlertTriangle,
};

const TYPE_COLORS: Record<string, string> = {
  vaccine: colors.success,
  consultation: colors.petrol,
  exam: colors.purple,
  medication: colors.sky,
  surgery: colors.danger,
  weight: colors.accent,
  allergy: colors.danger,
};

// ── ClassificationRow ────────────────────────────────────────────────────────

const ClassificationRow = React.memo(function ClassificationRow({
  item,
  selected,
  onToggle,
  t,
}: {
  item: ClassificationResult;
  selected: boolean;
  onToggle: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const Icon = TYPE_ICONS[item.type] ?? FileBarChart;
  const color = TYPE_COLORS[item.type] ?? colors.textDim;
  const ex = item.extracted_data;

  const label = (ex.vaccine_name ?? ex.medication_name ?? ex.exam_name
    ?? ex.allergen ?? ex.name ?? t(`pdf.type_${item.type}`, { defaultValue: item.type })) as string;

  const dateStr = (ex.date ?? ex.date_administered ?? ex.start_date) as string | undefined;

  return (
    <TouchableOpacity style={[s.row, selected && s.rowSelected]} onPress={onToggle} activeOpacity={0.7}>
      <View style={[s.typeIcon, { backgroundColor: color + '18' }]}>
        <Icon size={rs(16)} color={color} strokeWidth={1.8} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowLabel} numberOfLines={1}>{label}</Text>
        <View style={s.rowMeta}>
          <Text style={[s.rowType, { color }]}>{t(`pdf.type_${item.type}`, { defaultValue: item.type })}</Text>
          {dateStr && <Text style={s.rowDate}>{dateStr}</Text>}
          <Text style={s.rowConf}>{Math.round(item.confidence * 100)}%</Text>
        </View>
      </View>
      {selected
        ? <CheckSquare size={rs(20)} color={colors.accent} strokeWidth={1.8} />
        : <Square size={rs(20)} color={colors.textGhost} strokeWidth={1.8} />}
    </TouchableOpacity>
  );
});

// ── Main component ───────────────────────────────────────────────────────────

interface PDFImportScreenProps {
  result: ClassifyDiaryResponse;
  fileName: string;
  onBack: () => void;
  onImport: (selected: ClassificationResult[]) => Promise<void>;
  isImporting: boolean;
}

export default function PDFImportScreen({
  result, fileName, onBack, onImport, isImporting,
}: PDFImportScreenProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(result.classifications.map((_, i) => i)),
  );

  const toggle = useCallback((idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === result.classifications.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(result.classifications.map((_, i) => i)));
    }
  }, [selected.size, result.classifications]);

  const handleImport = useCallback(() => {
    const items = result.classifications.filter((_, i) => selected.has(i));
    onImport(items);
  }, [result.classifications, selected, onImport]);

  const ic = result.import_count;
  const summaryBadges = ic ? [
    ic.vaccines > 0 && { label: t('pdf.countVaccines', { n: ic.vaccines }), color: colors.success },
    ic.consultations > 0 && { label: t('pdf.countConsultations', { n: ic.consultations }), color: colors.petrol },
    ic.exams > 0 && { label: t('pdf.countExams', { n: ic.exams }), color: colors.purple },
    ic.medications > 0 && { label: t('pdf.countMedications', { n: ic.medications }), color: colors.sky },
    ic.surgeries > 0 && { label: t('pdf.countSurgeries', { n: ic.surgeries }), color: colors.danger },
  ].filter(Boolean) as Array<{ label: string; color: string }> : [];

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ChevronLeft size={rs(20)} color={colors.accent} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('pdf.title')}</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* File card */}
        <View style={s.fileCard}>
          <FileText size={rs(24)} color={colors.gold} strokeWidth={1.8} />
          <View style={{ flex: 1 }}>
            <Text style={s.fileName} numberOfLines={1}>{fileName}</Text>
            {result.date_range && (
              <Text style={s.fileDate}>
                {result.date_range.from} → {result.date_range.to}
              </Text>
            )}
          </View>
        </View>

        {/* Summary badges */}
        {summaryBadges.length > 0 && (
          <View style={s.badgesRow}>
            {summaryBadges.map((b, i) => (
              <View key={i} style={[s.badge, { backgroundColor: b.color + '18', borderColor: b.color + '30' }]}>
                <Text style={[s.badgeText, { color: b.color }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Document summary */}
        {result.document_summary && (
          <View style={s.summaryCard}>
            <Text style={s.summaryText}>{result.document_summary}</Text>
          </View>
        )}

        {/* Narration */}
        {result.narration && (
          <View style={s.narrationCard}>
            <Text style={s.narrationText}>{result.narration}</Text>
          </View>
        )}

        {/* Classifications list */}
        {result.classifications.length > 0 ? (
          <>
            <View style={s.listHeader}>
              <Text style={s.listTitle}>{t('pdf.selectToImport')}</Text>
              <TouchableOpacity onPress={toggleAll} activeOpacity={0.7}>
                <Text style={s.selectAllText}>
                  {selected.size === result.classifications.length ? t('pdf.deselectAll') : t('pdf.selectAll')}
                </Text>
              </TouchableOpacity>
            </View>

            {result.classifications.map((item, i) => (
              <ClassificationRow
                key={i}
                item={item}
                selected={selected.has(i)}
                onToggle={() => toggle(i)}
                t={t}
              />
            ))}
          </>
        ) : (
          <View style={s.emptyState}>
            <FileText size={rs(32)} color={colors.textGhost} strokeWidth={1.5} />
            <Text style={s.emptyText}>{t('pdf.noRecordsFound')}</Text>
          </View>
        )}

        <View style={{ height: rs(120) }} />
      </ScrollView>

      {/* Import button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.importBtn, (selected.size === 0 || isImporting) && s.importBtnDisabled]}
          onPress={handleImport}
          activeOpacity={0.8}
          disabled={selected.size === 0 || isImporting}
        >
          {isImporting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Download size={rs(18)} color="#fff" strokeWidth={2} />}
          <Text style={s.importBtnText}>
            {isImporting
              ? t('pdf.importing')
              : t('pdf.importSelected', { n: selected.size })}
          </Text>
          {!isImporting && selected.size > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{selected.size}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingTop: rs(16),
    paddingBottom: rs(12),
    gap: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },

  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), gap: rs(12) },

  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    backgroundColor: colors.card,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: colors.gold + '30',
    padding: rs(14),
  },
  fileName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
  },
  fileDate: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
    marginTop: rs(2),
  },

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
  },
  badge: {
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
    borderRadius: rs(8),
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
  },

  summaryCard: {
    backgroundColor: colors.bgCard,
    borderRadius: rs(12),
    padding: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: fs(20),
  },

  narrationCard: {
    backgroundColor: colors.purpleSoft,
    borderRadius: rs(12),
    padding: rs(14),
    borderWidth: 1,
    borderColor: colors.purple + '20',
  },
  narrationText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.purple,
    fontStyle: 'italic',
    lineHeight: fs(22),
    textAlign: 'center',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs(4),
  },
  listTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: colors.textDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  selectAllText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: colors.accent,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
    backgroundColor: colors.card,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(12),
  },
  rowSelected: {
    borderColor: colors.accent + '40',
    backgroundColor: colors.accentSoft,
  },
  typeIcon: {
    width: rs(34),
    height: rs(34),
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: rs(3) },
  rowLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  rowType: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowDate: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textDim,
  },
  rowConf: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(10),
    color: colors.textGhost,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: rs(40),
    gap: rs(12),
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textDim,
    textAlign: 'center',
  },

  footer: {
    padding: rs(16),
    paddingBottom: rs(24),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
    backgroundColor: colors.accent,
    borderRadius: rs(14),
    paddingVertical: rs(16),
  },
  importBtnDisabled: {
    opacity: 0.4,
  },
  importBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: '#fff',
  },
  countBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: rs(10),
    paddingHorizontal: rs(8),
    paddingVertical: rs(2),
  },
  countBadgeText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(12),
    color: '#fff',
  },
});
