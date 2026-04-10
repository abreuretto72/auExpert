/**
 * PDF export modal for the diary timeline.
 * Filters by date range, mood, and special moments.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Pressable,
  TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Download, FileText, Star, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { moods } from '../../constants/moods';
import { generatePdfUri } from '../../lib/pdf';
import PdfPreviewModal from './PdfPreviewModal';
import { getPublicUrl } from '../../lib/storage';
import { useToast } from '../Toast';
import type { TimelineEvent } from './timelineTypes';

interface PdfExportModalProps {
  visible: boolean;
  onClose: () => void;
  events: TimelineEvent[];
  petName: string;
  getMoodData: (id: string | null | undefined) => { label: string; color: string } | null;
}

const MAX_PDF_ENTRIES = 200;

const MOOD_COLORS: Record<string, string> = {
  ecstatic: '#E74C3C', happy: '#2ECC71', playful: '#E8813A', calm: '#3498DB',
  tired: '#95A5A6', anxious: '#F1C40F', sad: '#8E44AD', sick: '#E74C3C',
};

export default function PdfExportModal({ visible, onClose, events, petName, getMoodData }: PdfExportModalProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [onlySpecial, setOnlySpecial] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFileName, setPreviewFileName] = useState('');

  const formatDateInput = useCallback((text: string, setter: (v: string) => void) => {
    const clean = text.replace(/\D/g, '');
    if (clean.length <= 2) { setter(clean); return; }
    if (clean.length <= 4) { setter(`${clean.slice(0, 2)}/${clean.slice(2)}`); return; }
    setter(`${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`);
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const parseDate = (d: string): number => {
        const parts = d.split('/');
        if (parts.length !== 3 || parts[2].length !== 4) return 0;
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      };
      const fromTs = dateFrom.length === 10 ? parseDate(dateFrom) : 0;
      const toTs = dateTo.length === 10 ? parseDate(dateTo) + 86399000 : Infinity;

      let filtered = events
        .filter((e) => e.type === 'diary' || e.type === 'photo_analysis')
        .filter((e) => e.sortDate >= fromTs && e.sortDate <= toTs)
        .filter((e) => !moodFilter || e.moodId === moodFilter)
        .filter((e) => !onlySpecial || e.isSpecial);

      const totalFound = filtered.length;
      const wasTruncated = totalFound > MAX_PDF_ENTRIES;
      filtered = filtered.slice(0, MAX_PDF_ENTRIES);

      if (filtered.length === 0) {
        toast(t('diary.pdfNoResults'), 'warning');
        setGenerating(false);
        return;
      }

      const entriesHtml = filtered.map((e) => {
        const dateObj = new Date(e.date);
        const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
        const moodColor = MOOD_COLORS[e.moodId ?? ''] ?? '#95A5A6';
        const moodLabel = getMoodData(e.moodId)?.label ?? e.moodId ?? '';

        const photosHtml = (e.photos && e.photos.length > 0)
          ? `<div class="entry-photos">${e.photos.map((p) => {
              const isVideo = p.endsWith('.mp4') || p.endsWith('.mov');
              return isVideo ? '<span style="font-size:9px;color:#888;">video</span>'
                : `<img src="${getPublicUrl('pet-photos', p)}" class="entry-photo" />`;
            }).join('')}</div>`
          : '';

        return `<div class="entry">
          <div class="entry-header">
            <span class="entry-date">${dateStr} ${timeStr}</span>
            ${moodLabel ? `<span class="entry-mood" style="background-color:${moodColor}">${moodLabel}</span>` : ''}
          </div>
          ${e.isSpecial ? `<div class="entry-special">${t('diary.specialMoment')}</div>` : ''}
          ${e.content ? `<div class="entry-content">${e.content.replace(/\n/g, '<br/>')}</div>` : ''}
          ${photosHtml}
          ${e.narration ? `<div class="entry-narration">"${e.narration}" — ${petName}</div>` : ''}
          ${e.tags && e.tags.length > 0 ? `<div class="entry-tags">${e.tags.map((tg) => `#${tg}`).join(' ')}</div>` : ''}
        </div>`;
      }).join('');

      const truncNote = wasTruncated
        ? `<p style="text-align:center;color:#888;font-size:10px;margin-top:16px;">${t('diary.pdfTruncated', { shown: String(MAX_PDF_ENTRIES), total: String(totalFound) })}</p>`
        : '';

      const fname = `auExpert_${petName}_${new Date().toISOString().split('T')[0]}.pdf`;
      const uri = await generatePdfUri({
        title: t('diary.pdfTitle', { name: petName }),
        subtitle: t('diary.pdfSubtitle', { count: String(filtered.length) }),
        bodyHtml: entriesHtml + truncNote,
        language: i18n.language,
      }, fname);
      setPreviewFileName(fname);
      setPreviewUri(uri);
      onClose();
      setPreviewVisible(true);
    } catch {
      toast(t('errors.generic'), 'error');
    } finally {
      setGenerating(false);
    }
  }, [events, dateFrom, dateTo, moodFilter, onlySpecial, petName, t, i18n.language, getMoodData, toast, onClose]);

  return (
    <PdfPreviewModal
      visible={previewVisible}
      pdfUri={previewUri}
      fileName={previewFileName}
      onClose={() => setPreviewVisible(false)}
    />
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.headerTitle}>{t('diary.pdfExport')}</Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
              <X size={rs(18)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date range */}
            <Text style={styles.label}>{t('diary.pdfPeriod')}</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>{t('diary.pdfFrom')}</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder={t('common.placeholderDate')}
                  placeholderTextColor={colors.placeholder}
                  value={dateFrom}
                  onChangeText={(text) => formatDateInput(text, setDateFrom)}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
              <View style={styles.dateField}>
                <Text style={styles.dateLabel}>{t('diary.pdfTo')}</Text>
                <TextInput
                  style={styles.dateInput}
                  placeholder={t('common.placeholderDate')}
                  placeholderTextColor={colors.placeholder}
                  value={dateTo}
                  onChangeText={(text) => formatDateInput(text, setDateTo)}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>
            </View>
            <Text style={styles.dateHint}>{t('diary.pdfDateHint')}</Text>

            {/* Mood filter */}
            <Text style={styles.label}>{t('diary.pdfMoodFilter')}</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity style={[styles.chip, !moodFilter && styles.chipActive]} onPress={() => setMoodFilter(null)}>
                <Text style={[styles.chipText, !moodFilter && styles.chipTextActive]}>{t('diary.pdfAllMoods')}</Text>
              </TouchableOpacity>
              {moods.filter((m) => !['playful', 'sick'].includes(m.id)).map((m) => {
                const sel = moodFilter === m.id;
                return (
                  <TouchableOpacity key={m.id} style={[styles.chip, sel && { backgroundColor: m.color + '20', borderColor: m.color + '50' }]} onPress={() => setMoodFilter(sel ? null : m.id)}>
                    <Text style={[styles.chipText, sel && { color: m.color }]}>{isEnglish ? m.label_en : m.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Special only */}
            <TouchableOpacity style={[styles.toggle, onlySpecial && styles.toggleActive]} onPress={() => setOnlySpecial(!onlySpecial)}>
              <Star size={rs(16)} color={onlySpecial ? colors.gold : colors.textGhost} strokeWidth={1.8} fill={onlySpecial ? colors.gold : 'none'} />
              <Text style={[styles.toggleText, onlySpecial && { color: colors.gold }]}>{t('diary.pdfOnlySpecial')}</Text>
            </TouchableOpacity>

            <Text style={styles.info}>{t('diary.pdfMaxEntries', { max: String(MAX_PDF_ENTRIES) })}</Text>

            <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={generating} activeOpacity={0.7}>
              {generating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Download size={rs(18)} color="#fff" strokeWidth={2} />}
              <Text style={styles.generateBtnText}>{t('diary.pdfGenerate')}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(11, 18, 25, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26), padding: rs(20), paddingBottom: rs(40), maxHeight: '80%' },
  handle: { width: rs(40), height: rs(5), borderRadius: rs(3), backgroundColor: colors.textGhost, alignSelf: 'center', marginBottom: rs(16) },
  header: { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(20) },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text },
  label: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, letterSpacing: 0.5, marginBottom: rs(8), marginTop: rs(14) },
  dateRow: { flexDirection: 'row', gap: rs(10) },
  dateField: { flex: 1 },
  dateLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(10), color: colors.textDim, marginBottom: rs(4) },
  dateInput: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(10), fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(13), color: colors.text, textAlign: 'center' },
  dateHint: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textGhost, textAlign: 'center', marginTop: rs(6) },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  chip: { paddingHorizontal: rs(12), paddingVertical: rs(6), borderRadius: rs(8), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent + '15', borderColor: colors.accent + '50' },
  chipText: { fontFamily: 'Sora_500Medium', fontSize: fs(11), color: colors.textDim },
  chipTextActive: { color: colors.accent, fontFamily: 'Sora_700Bold' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: rs(10), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(12), padding: rs(12), marginTop: rs(14) },
  toggleActive: { backgroundColor: colors.gold + '08', borderColor: colors.gold + '30' },
  toggleText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.textSec },
  info: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost, textAlign: 'center', marginTop: rs(14) },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.accent, borderRadius: rs(14), paddingVertical: rs(14), marginTop: rs(16) },
  generateBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: '#fff' },
});
