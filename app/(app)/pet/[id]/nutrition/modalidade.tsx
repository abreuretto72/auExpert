/**
 * nutrition/modalidade.tsx — Tela 7: Escolher modalidade alimentar
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check, Leaf, FlameKindling, Salad, FileText } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { useToast } from '../../../../../components/Toast';
import { usePets } from '../../../../../hooks/usePets';
import PdfActionModal from '../../../../../components/pdf/PdfActionModal';
import { previewNutritionPdf, shareNutritionPdf } from '../../../../../lib/nutritionPdf';

type Modalidade = 'so_racao' | 'racao_natural' | 'so_natural';

const OPTIONS: Array<{
  key: Modalidade;
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  color: string;
}> = [
  {
    key: 'so_racao',
    titleKey: 'nutrition.soRacaoTitle',
    descKey: 'nutrition.soRacaoDesc',
    icon: <FlameKindling size={rs(28)} color={colors.click} />,
    color: colors.click,
  },
  {
    key: 'racao_natural',
    titleKey: 'nutrition.racaoNaturalTitle',
    descKey: 'nutrition.racaoNaturalDesc',
    icon: <Leaf size={rs(28)} color={colors.success} />,
    color: colors.success,
  },
  {
    key: 'so_natural',
    titleKey: 'nutrition.soNaturalTitle',
    descKey: 'nutrition.soNaturalDesc',
    icon: <Salad size={rs(28)} color={colors.success} />,
    color: colors.success,
  },
];

export default function ModalidadeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const { nutricao, setModalidade, isSettingModalidade } = useNutricao(petId ?? '');
  const { toast } = useToast();

  const [selected, setSelected] = useState<Modalidade>(nutricao?.modalidade ?? 'so_racao');
  const [pdfModal, setPdfModal] = useState(false);

  const handleConfirm = async () => {
    try {
      await setModalidade({ modalidade: selected });
      toast(t('nutrition.modalidadeChanged'), 'success');
      // Navigate to the specific sub-screen
      if (selected === 'so_racao') {
        router.replace(`/pet/${petId}/nutrition/so-racao` as never);
      } else if (selected === 'racao_natural') {
        router.replace(`/pet/${petId}/nutrition/racao-natural` as never);
      } else {
        router.replace(`/pet/${petId}/nutrition/so-natural` as never);
      }
    } catch (err) {
      console.error('[ModalidadeScreen] handleConfirm error:', err);
      toast(t('errors.generic'), 'error');
    }
  };

  const petName = pet?.name ?? '';

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.modalidadeTitle')}</Text>
        <TouchableOpacity
          onPress={() => setPdfModal(true)}
          style={s.backBtn}
          accessibilityLabel={t('nutritionPdf.icon')}
        >
          <FileText size={rs(20)} color={colors.click} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>{t('nutrition.modalidadeSubtitle', { name: petName })}</Text>

        <View style={s.optionsList}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[s.optionCard, isSelected && { borderColor: opt.color }]}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.8}
              >
                <View style={[s.iconWrap, { backgroundColor: opt.color + '15' }]}>
                  {opt.icon}
                </View>
                <View style={s.optionInfo}>
                  <Text style={s.optionTitle}>{t(opt.titleKey)}</Text>
                  <Text style={s.optionDesc}>{t(opt.descKey)}</Text>
                </View>
                <View style={[s.radioOuter, isSelected && { borderColor: opt.color }]}>
                  {isSelected && <View style={[s.radioInner, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[s.confirmBtn, isSettingModalidade && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={isSettingModalidade}
          activeOpacity={0.8}
        >
          <Check size={rs(18)} color="#fff" />
          <Text style={s.confirmBtnText}>{t('nutrition.btnConfirmModalidade')}</Text>
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
  content: { padding: rs(16), gap: rs(16), paddingBottom: rs(40) },
  subtitle: { fontSize: fs(14), color: colors.textSec, textAlign: 'center' },
  optionsList: { gap: rs(12) },
  optionCard: {
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16),
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    borderWidth: 2, borderColor: colors.border,
  },
  iconWrap: {
    width: rs(56), height: rs(56), borderRadius: rs(28),
    alignItems: 'center', justifyContent: 'center',
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: fs(15), fontWeight: '700', color: colors.text, marginBottom: rs(4) },
  optionDesc: { fontSize: fs(13), color: colors.textSec, lineHeight: rs(18) },
  radioOuter: {
    width: rs(22), height: rs(22), borderRadius: rs(11),
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: rs(12), height: rs(12), borderRadius: rs(6) },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.click, borderRadius: rs(14), padding: rs(16),
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { fontSize: fs(15), fontWeight: '700', color: '#fff' },
});
