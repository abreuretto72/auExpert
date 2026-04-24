import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft, Camera, ScanEye, Clock, Scale, Ruler,
  Palette, SmilePlus, ShieldCheck, AlertTriangle, Sparkles,
  Dog, Cat, ImageIcon, FileText,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { supabase } from '../../../../lib/supabase';
import { withTimeout } from '../../../../lib/withTimeout';
import { useAuthStore } from '../../../../stores/authStore';
import { useToast } from '../../../../components/Toast';
import { SectionErrorBoundary } from '../../../../components/SectionErrorBoundary';
import { getErrorMessage } from '../../../../utils/errorMessages';
import PdfActionModal from '../../../../components/pdf/PdfActionModal';
import { previewPhotoAnalysisPdf, sharePhotoAnalysisPdf } from '../../../../lib/photoAnalysisPdf';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';
import type { PhotoAnalysisResponse } from '../../../../types/ai';

interface AnalysisRecord {
  id: string;
  photo_url: string;
  findings: PhotoAnalysisResponse;
  confidence: number;
  created_at: string;
}

export default function PhotoAnalysisScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { data: pet } = usePet(id!);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pdfModal, setPdfModal] = useState(false);

  const loadAnalyses = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('photo_analyses')
      .select('id, photo_url, findings, confidence, created_at')
      .eq('pet_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (data) setAnalyses(data as AnalysisRecord[]);
  }, [id]);

  useEffect(() => {
    loadAnalyses().finally(() => setLoading(false));
  }, [loadAnalyses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAnalyses();
    setRefreshing(false);
  }, [loadAnalyses]);

  // Nova análise
  const handleNewAnalysis = useCallback(async (uri: string) => {
    if (!id || !user?.id) return;
    setAnalyzing(true);
    try {
      const FileSystem = require('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });

      const { data, error } = await withTimeout(
        supabase.functions.invoke('analyze-pet-photo', {
          body: {
            photo_base64: base64,
            species: pet?.species ?? 'dog',
            language: i18n.language,
          },
        }),
        30_000,
        'analyze-pet-photo:analysis',
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Salvar no banco
      const result = data as PhotoAnalysisResponse;

      // Upload da foto
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const fileName = `${user.id}/${id}/${Date.now()}_analysis.jpg`;
      const { data: upData } = await withTimeout(
        supabase.storage.from('pets').upload(fileName, bytes, { contentType: 'image/jpeg' }),
        30_000,
        'storage.upload:photo-analysis',
      );
      const photoUrl = upData?.path
        ? supabase.storage.from('pets').getPublicUrl(upData.path).data.publicUrl
        : '';

      await supabase.from('photo_analyses').insert({
        pet_id: id,
        user_id: user.id,
        photo_url: photoUrl,
        analysis_type: 'general',
        findings: result,
        raw_ai_response: result,
        confidence: result.breed?.confidence ?? 0,
      });

      toast(t('addPet.analysisComplete'), 'success');
      await loadAnalyses();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setAnalyzing(false);
    }
  }, [id, user?.id, pet?.species, i18n.language, toast, t, loadAnalyses]);

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4 });
    if (!result.canceled && result.assets[0]) handleNewAnalysis(result.assets[0].uri);
  }, [handleNewAnalysis, toast, t]);

  const handleGallery = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) handleNewAnalysis(result.assets[0].uri);
  }, [handleNewAnalysis]);

  const isDog = pet?.species === 'dog';
  const petColor = isDog ? colors.click : colors.purple;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Skeleton espelha a estrutura real: linha de ações + cards de análise.
  // CLAUDE.md §12.2: skeleton obrigatório, nunca spinner isolado em tela vazia.
  if (loading) {
    return (
      <View style={s.safe}>
        <View style={s.content}>
          {/* Action row (camera + gallery) */}
          <View style={{ flexDirection: 'row', gap: rs(spacing.sm) }}>
            <Skeleton width="48%" height={rs(72)} radius={radii.lg} />
            <Skeleton width="48%" height={rs(72)} radius={radii.lg} />
          </View>
          <View style={{ height: spacing.lg }} />
          {/* Analysis card 1 */}
          <Skeleton width="100%" height={rs(200)} radius={radii.card} />
          <View style={{ height: spacing.md }} />
          {/* Analysis card 2 */}
          <Skeleton width="100%" height={rs(200)} radius={radii.card} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <SectionErrorBoundary sectionName="photo-analysis" resetKeys={[id]} onReset={onRefresh}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.click} colors={[colors.click]} />}
      >
        {/* Botões nova análise */}
        <View style={s.actionRow}>
          <TouchableOpacity style={[s.actionBtn, { borderColor: petColor + '30' }]} onPress={handleCamera} disabled={analyzing} activeOpacity={0.7}>
            <Camera size={rs(22)} color={petColor} strokeWidth={1.8} />
            <Text style={[s.actionText, { color: petColor }]}>{t('addPet.takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { borderColor: colors.click + '30' }]} onPress={handleGallery} disabled={analyzing} activeOpacity={0.7}>
            <ImageIcon size={rs(22)} color={colors.click} strokeWidth={1.8} />
            <Text style={[s.actionText, { color: colors.click }]}>{t('addPet.pickFromGallery')}</Text>
          </TouchableOpacity>
        </View>

        {/* Export PDF — só quando há análises */}
        {analyses.length > 0 && !analyzing && (
          <TouchableOpacity
            style={s.exportBtn}
            onPress={() => setPdfModal(true)}
            activeOpacity={0.7}
          >
            <FileText size={rs(18)} color={colors.click} strokeWidth={1.8} />
            <Text style={s.exportBtnText}>{t('photoAnalysis.exportPdf')}</Text>
          </TouchableOpacity>
        )}

        {/* Analisando */}
        {analyzing && (
          <View style={s.analyzingCard}>
            <ActivityIndicator size="small" color={colors.purple} />
            <Text style={s.analyzingText}>{t('addPet.analyzing')}</Text>
          </View>
        )}

        {/* Lista de análises */}
        {analyses.length === 0 && !analyzing && (
          <View style={s.emptyState}>
            <ScanEye size={rs(48)} color={colors.purple + '40'} strokeWidth={1.5} />
            <Text style={s.emptyTitle}>{t('tutor.noPets')}</Text>
          </View>
        )}

        {analyses.map((analysis) => {
          const f = analysis.findings;
          const breed = f?.breed ?? f?.identification?.breed;
          const breedName = (breed as { name?: string; primary?: string } | undefined)?.name ?? (breed as { name?: string; primary?: string } | undefined)?.primary ?? '—';
          const breedConf = breed?.confidence ?? 0;
          const mood = f?.mood;
          const moodName = mood?.primary ?? (mood as unknown as { id: string })?.id ?? null;
          const health = f?.health;
          const alerts = f?.alerts;

          return (
            <View key={analysis.id} style={s.analysisCard}>
              {/* Header: foto + data */}
              <View style={s.cardHeader}>
                {analysis.photo_url ? (
                  <Image source={{ uri: analysis.photo_url }} style={s.cardPhoto} />
                ) : (
                  <View style={[s.cardPhotoPlaceholder, { backgroundColor: petColor + '10' }]}>
                    {isDog ? <Dog size={rs(24)} color={petColor} strokeWidth={1.8} /> : <Cat size={rs(24)} color={petColor} strokeWidth={1.8} />}
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={s.cardTitleRow}>
                    <Sparkles size={rs(14)} color={colors.purple} strokeWidth={2} />
                    <Text style={s.cardTitle}>{t('addPet.analysisComplete')}</Text>
                  </View>
                  <Text style={s.cardDate}>{formatDate(analysis.created_at)}</Text>
                  <View style={s.confBadge}>
                    <Text style={s.confText}>{Math.round(breedConf * 100)}%</Text>
                  </View>
                </View>
              </View>

              {/* Raça */}
              <View style={s.resultRow}>
                <ScanEye size={rs(16)} color={colors.purple} strokeWidth={1.8} />
                <Text style={s.resultLabel}>{t('addPet.breed')}</Text>
                <Text style={s.resultValue} numberOfLines={2}>{breedName}</Text>
              </View>

              {/* Idade + Peso + Porte */}
              {f?.estimated_age_months != null && (
                <View style={s.resultRow}>
                  <Clock size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
                  <Text style={s.resultLabel}>{t('addPet.estimatedAge')}</Text>
                  <Text style={s.resultValue}>{f.estimated_age_months}m</Text>
                </View>
              )}
              {f?.estimated_weight_kg != null && (
                <View style={s.resultRow}>
                  <Scale size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
                  <Text style={s.resultLabel}>{t('addPet.estimatedWeight')}</Text>
                  <Text style={s.resultValue}>{f.estimated_weight_kg} kg</Text>
                </View>
              )}
              {f?.size && (
                <View style={s.resultRow}>
                  <Ruler size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
                  <Text style={s.resultLabel}>{t('addPet.petSize')}</Text>
                  <Text style={s.resultValue}>{{ small: t('addPet.sizeSmall'), medium: t('addPet.sizeMedium'), large: t('addPet.sizeLarge') }[f.size] ?? f.size}</Text>
                </View>
              )}
              {f?.color && (
                <View style={s.resultRow}>
                  <Palette size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
                  <Text style={s.resultLabel}>{t('addPet.coatColor')}</Text>
                  <Text style={s.resultValue} numberOfLines={2}>{f.color}</Text>
                </View>
              )}

              {/* Humor */}
              {moodName && (
                <View style={s.resultRow}>
                  <SmilePlus size={rs(16)} color={colors.click} strokeWidth={1.8} />
                  <Text style={s.resultLabel}>{t('diary.mood')}</Text>
                  <Text style={[s.resultValue, { color: colors.click, textTransform: 'capitalize' }]}>{moodName}</Text>
                </View>
              )}

              {/* Saúde */}
              {health && (
                <View style={s.healthSection}>
                  <View style={s.healthHeader}>
                    <ShieldCheck size={rs(14)} color={colors.success} strokeWidth={1.8} />
                    <Text style={s.healthTitle}>{t('health.score')}</Text>
                    {health.body_condition_score != null && (
                      <Text style={s.bcsText}>{t('health.bcsLabel')} {health.body_condition_score}/9</Text>
                    )}
                  </View>
                  {['skin_coat', 'eyes', 'ears', 'mouth_teeth', 'posture_body'].map((cat) => {
                    const items = (health as unknown as Record<string, unknown>)[cat];
                    if (!Array.isArray(items) || items.length === 0) return null;
                    return items.map((item: { observation: string; severity: string }, i: number) => (
                      <View key={`${cat}-${i}`} style={s.healthItem}>
                        <View style={[s.healthDot, {
                          backgroundColor: item.severity === 'concern' ? colors.danger : item.severity === 'attention' ? colors.warning : colors.success,
                        }]} />
                        <Text style={s.healthText}>{item.observation}</Text>
                      </View>
                    ));
                  })}
                </View>
              )}

              {/* Alertas */}
              {alerts && alerts.length > 0 && (
                <View style={s.alertsSection}>
                  {alerts.map((alert: { message: string; severity: string }, i: number) => (
                    <View key={i} style={s.alertItem}>
                      <AlertTriangle size={rs(14)} color={alert.severity === 'concern' ? colors.danger : colors.warning} strokeWidth={1.8} />
                      <Text style={[s.alertText, { color: alert.severity === 'concern' ? colors.danger : colors.warning }]}>{alert.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Fontes da pesquisa — título + disclaimer em itálico */}
              <Text style={s.sourcesTitle}>{t('photoAnalysis.sourcesTitle')}</Text>
              <Text style={s.disclaimer}>{f?.disclaimer ?? t('common.aiVetDisclaimer')}</Text>
            </View>
          );
        })}

        <View style={{ height: rs(40) }} />
      </ScrollView>
      </SectionErrorBoundary>

      <PdfActionModal
        visible={pdfModal}
        onClose={() => setPdfModal(false)}
        title={t('photoAnalysis.pdfTitle', { name: pet?.name ?? '' })}
        subtitle={t('photoAnalysis.pdfSubtitle')}
        onPreview={() => previewPhotoAnalysisPdf(analyses, pet?.name ?? '')}
        onShare={() => sharePhotoAnalysisPdf(analyses, pet?.name ?? '')}
      />
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: rs(16), paddingVertical: rs(8) },
  backBtn: { width: rs(42), height: rs(42), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text },
  content: { paddingHorizontal: rs(20) },

  // Actions
  actionRow: { flexDirection: 'row', gap: rs(10), marginBottom: spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.card, borderWidth: 1, borderRadius: radii.xl, paddingVertical: rs(14) },
  actionText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12) },

  // Export PDF
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.click + '10', borderWidth: 1, borderColor: colors.click + '30', borderRadius: radii.xl, paddingVertical: rs(12), marginBottom: spacing.md },
  exportBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.click },

  // Analyzing
  analyzingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(10), backgroundColor: colors.purpleSoft, borderRadius: radii.xl, paddingVertical: rs(14), marginBottom: spacing.md },
  analyzingText: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.purple },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: rs(60), gap: rs(16) },
  emptyTitle: { fontFamily: 'Sora_500Medium', fontSize: fs(14), color: colors.textDim },

  // Analysis card
  analysisCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', gap: rs(14), marginBottom: spacing.md },
  cardPhoto: { width: rs(64), height: rs(64), borderRadius: rs(16) },
  cardPhotoPlaceholder: { width: rs(64), height: rs(64), borderRadius: rs(16), alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  cardTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.purple },
  cardDate: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(4) },
  confBadge: { backgroundColor: colors.purpleSoft, borderRadius: radii.sm, paddingHorizontal: rs(8), paddingVertical: rs(2), alignSelf: 'flex-start', marginTop: rs(6) },
  confText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(10), color: colors.purple },

  // Result rows
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), paddingVertical: rs(6), borderBottomWidth: 1, borderBottomColor: colors.border },
  resultLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.textDim, width: rs(70) },
  resultValue: { fontFamily: 'Sora_500Medium', fontSize: fs(13), color: colors.text, flex: 1 },

  // Health
  healthSection: { marginTop: spacing.sm, backgroundColor: colors.bgCard, borderRadius: radii.lg, padding: spacing.sm },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  healthTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.success, flex: 1 },
  bcsText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(10), color: colors.textSec },
  healthItem: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(8), marginBottom: rs(4) },
  healthDot: { width: rs(6), height: rs(6), borderRadius: rs(3), marginTop: rs(6) },
  healthText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, flex: 1, lineHeight: fs(18) },

  // Alerts
  alertsSection: { marginTop: spacing.sm },
  alertItem: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(8), marginBottom: rs(6) },
  alertText: { fontFamily: 'Sora_500Medium', fontSize: fs(12), flex: 1, lineHeight: fs(18) },

  // Fontes da pesquisa
  sourcesTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textSec, textAlign: 'center', letterSpacing: 0.5, marginTop: spacing.md, textTransform: 'uppercase' },
  disclaimer: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'center', marginTop: rs(4), fontStyle: 'italic' },
});
