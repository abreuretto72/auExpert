/**
 * nutrition/dicas.tsx — Tela 6: Dicas da IA / avaliação nutricional
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Sparkles, ThumbsUp, TrendingUp, AlertTriangle, RefreshCw, FileText } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { usePets } from '../../../../../hooks/usePets';
import PdfActionModal from '../../../../../components/pdf/PdfActionModal';
import { previewNutritionPdf, shareNutritionPdf } from '../../../../../lib/nutritionPdf';

export default function DicasScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const { nutricao, isLoadingNutricao, evaluateNutrition, isEvaluating } = useNutricao(petId ?? '');

  const eval_ = nutricao?.ai_evaluation;
  const [pdfModal, setPdfModal] = useState(false);
  const petName = pet?.name ?? '';

  if (isLoadingNutricao) {
    return (
      <SafeAreaView style={s.safeArea}>
        <Header onBack={() => router.back()} title={t('nutrition.dicasTitle')} onPdf={() => setPdfModal(true)} pdfLabel={t('nutritionPdf.icon')} />
        <View style={s.centered}>
          <ActivityIndicator color={colors.click} size="large" />
          <Text style={s.loadingText}>{t('nutrition.dicasLoading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <Header onBack={() => router.back()} title={t('nutrition.dicasTitle')} onPdf={() => setPdfModal(true)} pdfLabel={t('nutritionPdf.icon')} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Score hero */}
        <View style={s.scoreCard}>
          <View style={s.scoreIconWrap}>
            <Sparkles size={rs(32)} color={colors.purple} />
          </View>
          <Text style={s.scoreLabel}>{t('nutrition.dicasScoreTitle')}</Text>
          {eval_ ? (
            <Text style={s.scoreValue}>{t('nutrition.aiEvalScore', { score: eval_.score })}</Text>
          ) : (
            <Text style={s.scoreEmpty}>{t('nutrition.noAIEval')}</Text>
          )}
          {eval_?.summary && (
            <Text style={s.scoreSummary}>{eval_.summary}</Text>
          )}
        </View>

        {eval_ ? (
          <>
            {/* Pros */}
            {eval_.pros?.length > 0 && (
              <>
                <SectionLabel icon={<ThumbsUp size={rs(13)} color={colors.success} />} label={t('nutrition.dicasPros')} />
                <View style={s.listCard}>
                  {eval_.pros.map((pro, i) => (
                    <View key={i} style={s.listRow}>
                      <View style={[s.dot, { backgroundColor: colors.success }]} />
                      <Text style={s.listText}>{pro}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Cons */}
            {eval_.cons?.length > 0 && (
              <>
                <SectionLabel icon={<AlertTriangle size={rs(13)} color={colors.warning} />} label={t('nutrition.dicasCons')} />
                <View style={s.listCard}>
                  {eval_.cons.map((con, i) => (
                    <View key={i} style={s.listRow}>
                      <View style={[s.dot, { backgroundColor: colors.warning }]} />
                      <Text style={s.listText}>{con}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Recommendation */}
            {eval_.recommendation && (
              <>
                <SectionLabel icon={<TrendingUp size={rs(13)} color={colors.purple} />} label={t('nutrition.dicasRecommendation')} />
                <View style={[s.listCard, { backgroundColor: colors.purpleSoft }]}>
                  <Text style={[s.listText, { color: colors.purple }]}>{eval_.recommendation}</Text>
                </View>
              </>
            )}
          </>
        ) : (
          <View style={s.emptyCard}>
            <Sparkles size={rs(40)} color={colors.textGhost} />
            <Text style={s.emptyText}>{t('nutrition.dicasEmpty')}</Text>
          </View>
        )}

        {/* Refresh */}
        <TouchableOpacity
          style={[s.refreshBtn, isEvaluating && { opacity: 0.7 }]}
          onPress={() => evaluateNutrition()}
          activeOpacity={0.8}
          disabled={isEvaluating}
        >
          <RefreshCw size={rs(16)} color="#fff" />
          <Text style={s.refreshBtnText}>{isEvaluating ? t('nutrition.dicasEvaluating') : t('nutrition.dicasRetry')}</Text>
        </TouchableOpacity>
      </ScrollView>

      <PdfActionModal
        visible={pdfModal}
        onClose={() => setPdfModal(false)}
        title={t('nutritionPdf.title', { name: petName })}
        onPreview={() => previewNutritionPdf({ petId: petId ?? '', petName })}
        onShare={() => shareNutritionPdf({ petId: petId ?? '', petName })}
      />
    </SafeAreaView>
  );
}

function Header({
  onBack,
  title,
  onPdf,
  pdfLabel,
}: {
  onBack: () => void;
  title: string;
  onPdf?: () => void;
  pdfLabel?: string;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={onBack} style={s.backBtn}>
        <ChevronLeft size={rs(22)} color={colors.click} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      {onPdf ? (
        <TouchableOpacity onPress={onPdf} style={s.backBtn} accessibilityLabel={pdfLabel}>
          <FileText size={rs(20)} color={colors.click} />
        </TouchableOpacity>
      ) : (
        <View style={s.backBtn} />
      )}
    </View>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={s.sectionRow}>
      {icon}
      <Text style={s.sectionLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(17), fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: rs(16), gap: rs(14), paddingBottom: rs(40) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12) },
  loadingText: { fontSize: fs(14), color: colors.textSec },
  scoreCard: {
    backgroundColor: colors.purpleSoft, borderRadius: rs(18), padding: rs(24),
    alignItems: 'center', gap: rs(8), borderWidth: 1, borderColor: colors.purple + '30',
  },
  scoreIconWrap: {
    width: rs(64), height: rs(64), borderRadius: rs(32),
    backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center',
    marginBottom: rs(4),
  },
  scoreLabel: { fontSize: fs(11), fontWeight: '700', color: colors.purple, letterSpacing: 1.2 },
  scoreValue: { fontSize: fs(36), fontWeight: '800', color: colors.purple },
  scoreEmpty: { fontSize: fs(14), color: colors.textDim, fontStyle: 'italic' },
  scoreSummary: { fontSize: fs(14), color: colors.text, textAlign: 'center', lineHeight: rs(22), marginTop: rs(4) },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  sectionLabel: { fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 1.2 },
  listCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(10),
  },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(10) },
  dot: { width: rs(8), height: rs(8), borderRadius: rs(4), marginTop: rs(5) },
  listText: { flex: 1, fontSize: fs(14), color: colors.text, lineHeight: rs(22) },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(32),
    alignItems: 'center', gap: rs(14), borderWidth: 1, borderColor: colors.border,
  },
  emptyText: { fontSize: fs(13), color: colors.textDim, textAlign: 'center', lineHeight: rs(20) },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    backgroundColor: colors.click, borderRadius: rs(12), padding: rs(14),
  },
  refreshBtnText: { fontSize: fs(14), color: '#fff', fontWeight: '700' },
});
