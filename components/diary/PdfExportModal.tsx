/**
 * PDF export modal for the diary timeline.
 * Filters by date range, mood, and special moments.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, Pressable,
  TextInput, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Download, FileText, Share2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import * as FileSystem from 'expo-file-system/legacy';
import { previewPdf, sharePdf } from '../../lib/pdf';
import { getPublicUrl } from '../../lib/storage';
import { useToast } from '../Toast';
import type { TimelineEvent } from './timelineTypes';

/**
 * Download a photo and return a base64 data URI for PDF embedding.
 * Photos may be stored as full public URLs (https://…) or storage paths —
 * both cases are handled.
 */
async function photoToDataUri(path: string): Promise<string | null> {
  try {
    // If already a full URL use it directly; otherwise derive the public URL
    const isFullUrl = path.startsWith('https://') || path.startsWith('http://');
    const downloadUrl = isFullUrl ? path : getPublicUrl('pet-photos', path);

    const ext = path.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    const mime = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/jpeg';
    const tmpExt = ext === 'webp' ? 'webp' : ext === 'png' ? 'png' : 'jpg';
    const tmpPath = `${FileSystem.cacheDirectory}pdf_p_${Date.now()}_${Math.random().toString(36).slice(2)}.${tmpExt}`;

    const result = await FileSystem.downloadAsync(downloadUrl, tmpPath);
    if (result.status < 200 || result.status >= 300) return null;

    const b64 = await FileSystem.readAsStringAsync(tmpPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return b64 ? `data:${mime};base64,${b64}` : null;
  } catch {
    return null;
  }
}

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
  const insets = useSafeAreaInsets();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generating, setGenerating] = useState(false);

  const formatDateInput = useCallback((text: string, setter: (v: string) => void) => {
    const clean = text.replace(/\D/g, '');
    if (clean.length <= 2) { setter(clean); return; }
    if (clean.length <= 4) { setter(`${clean.slice(0, 2)}/${clean.slice(2)}`); return; }
    setter(`${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`);
  }, []);

  const buildPdfOptions = useCallback(async () => {
    const parseDate = (d: string): number => {
      const parts = d.split('/');
      if (parts.length !== 3 || parts[2].length !== 4) return 0;
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    };
    const fromTs = dateFrom.length === 10 ? parseDate(dateFrom) : 0;
    const toTs = dateTo.length === 10 ? parseDate(dateTo) + 86399000 : Infinity;

    let filtered = events
      .filter((e) => e.type === 'diary' || e.type === 'photo_analysis')
      .filter((e) => e.sortDate >= fromTs && e.sortDate <= toTs);

    const totalFound = filtered.length;
    const wasTruncated = totalFound > MAX_PDF_ENTRIES;
    filtered = filtered.slice(0, MAX_PDF_ENTRIES);

    if (filtered.length === 0) return null;

    const uniquePhotoPaths = [...new Set(
      filtered.flatMap((e) => e.photos ?? []).filter((p) => !p.endsWith('.mp4') && !p.endsWith('.mov')),
    )];
    const photoDataUriMap = new Map<string, string>();
    await Promise.all(uniquePhotoPaths.map(async (p) => {
      const uri = await photoToDataUri(p);
      if (uri) photoDataUriMap.set(p, uri);
    }));

    const entriesHtml = filtered.map((e) => {
      const dateObj = new Date(e.date);
      const dateStr = dateObj.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' });
      const timeStr = dateObj.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
      const moodColor = MOOD_COLORS[e.moodId ?? ''] ?? '#95A5A6';
      const moodLabel = getMoodData(e.moodId)?.label ?? e.moodId ?? '';

      const photosHtml = (e.photos && e.photos.length > 0)
        ? `<div class="entry-photos">${e.photos.map((p) => {
            const isVideo = p.endsWith('.mp4') || p.endsWith('.mov');
            if (isVideo) return '<span style="font-size:9px;color:#888;">video</span>';
            const isUrl = p.startsWith('https://') || p.startsWith('http://');
            const fallback = isUrl ? p : getPublicUrl('pet-photos', p);
            const src = photoDataUriMap.get(p) ?? fallback;
            return `<img src="${src}" class="entry-photo" />`;
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

    return {
      title: t('diary.pdfTitle', { name: petName }),
      subtitle: t('diary.pdfSubtitle', { count: String(filtered.length) }),
      bodyHtml: entriesHtml + truncNote,
      language: i18n.language,
      count: filtered.length,
    };
  }, [events, dateFrom, dateTo, petName, t, i18n.language, getMoodData]);

  const handlePreview = useCallback(async () => {
    setGenerating(true);
    try {
      const opts = await buildPdfOptions();
      if (!opts) { toast(t('diary.pdfNoResults'), 'warning'); return; }
      await previewPdf(opts);
      onClose();
    } catch {
      toast(t('errors.generic'), 'error');
    } finally {
      setGenerating(false);
    }
  }, [buildPdfOptions, toast, t, onClose]);

  const handleShare = useCallback(async () => {
    setGenerating(true);
    try {
      const opts = await buildPdfOptions();
      if (!opts) { toast(t('diary.pdfNoResults'), 'warning'); return; }
      const fileName = `diario_${petName.toLowerCase().replace(/\s+/g, '_')}.pdf`;
      await sharePdf(opts, fileName);
      onClose();
    } catch {
      toast(t('errors.generic'), 'error');
    } finally {
      setGenerating(false);
    }
  }, [buildPdfOptions, petName, toast, t, onClose]);


  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: rs(20) + insets.bottom }]} onPress={() => {}}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <FileText size={rs(20)} color={colors.click} strokeWidth={1.8} />
            <Text style={styles.headerTitle}>{t('diary.pdfExport')}</Text>
            <TouchableOpacity onPress={onClose} style={{ marginLeft: 'auto' }}>
              <X size={rs(18)} color={colors.click} strokeWidth={1.8} />
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

            <Text style={styles.info}>{t('diary.pdfMaxEntries', { max: String(MAX_PDF_ENTRIES) })}</Text>

            <TouchableOpacity
              style={[styles.actionRow, { borderColor: colors.click + '40' }]}
              onPress={handlePreview}
              disabled={generating}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.clickSoft }]}>
                {generating
                  ? <ActivityIndicator color={colors.click} size="small" />
                  : <Download size={rs(20)} color={colors.click} strokeWidth={1.8} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{t('diary.printOrSave')}</Text>
                <Text style={styles.actionSubtitle}>{t('diary.printOrSaveHint')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionRow, { borderColor: colors.petrol + '40' }]}
              onPress={handleShare}
              disabled={generating}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.petrolSoft }]}>
                <Share2 size={rs(20)} color={colors.petrol} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{t('diary.shareFile')}</Text>
                <Text style={styles.actionSubtitle}>{t('diary.shareFileHint')}</Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(11, 18, 25, 0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26), padding: rs(20), maxHeight: '85%' },
  handle: { width: rs(40), height: rs(5), borderRadius: rs(3), backgroundColor: colors.textGhost, alignSelf: 'center', marginBottom: rs(16) },
  header: { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(20) },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text },
  label: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, letterSpacing: 0.5, marginBottom: rs(8), marginTop: rs(14) },
  dateRow: { flexDirection: 'row', gap: rs(10) },
  dateField: { flex: 1 },
  dateLabel: { fontFamily: 'Sora_500Medium', fontSize: fs(10), color: colors.textDim, marginBottom: rs(4) },
  dateInput: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(10), paddingHorizontal: rs(12), paddingVertical: rs(10), fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(13), color: colors.text, textAlign: 'center' },
  dateHint: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textGhost, textAlign: 'center', marginTop: rs(6) },
  info: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost, textAlign: 'center', marginTop: rs(14), marginBottom: rs(4) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(14),
    borderWidth: 1, marginTop: rs(10),
  },
  actionIcon: { width: rs(44), height: rs(44), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.text },
  actionSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },
});
