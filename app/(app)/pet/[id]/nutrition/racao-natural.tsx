/**
 * nutrition/racao-natural.tsx — Tela 9: Proporção ração + natural
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check, AlertTriangle } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { useToast } from '../../../../../components/Toast';
import { usePets } from '../../../../../hooks/usePets';

export default function RacaoNaturalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const { nutricao, setModalidade, isSettingModalidade } = useNutricao(petId ?? '');
  const { toast } = useToast();

  const [naturalPct, setNaturalPct] = useState(nutricao?.natural_pct ?? 30);
  const petName = pet?.name ?? '';

  const handleSave = async () => {
    try {
      await setModalidade({ modalidade: 'racao_natural', natural_pct: naturalPct });
      toast(t('nutrition.pctSaved'), 'success');
      router.back();
    } catch {
      toast(t('errors.generic'), 'error');
    }
  };

  const pct2 = 100 - naturalPct;

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.racaoNaturalScreenTitle')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.subtitle}>{t('nutrition.racaoNaturalScreenSubtitle', { name: petName })}</Text>

        {/* Proportion card */}
        <View style={s.propCard}>
          <Text style={s.sliderLabel}>
            {t('nutrition.sliderLabel', { pct: naturalPct, pct2 })}
          </Text>

          {/* Visual bar */}
          <View style={s.barOuter}>
            <View style={[s.barNatural, { flex: naturalPct }]} />
            <View style={[s.barRacao, { flex: pct2 }]} />
          </View>

          <View style={s.barLegend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.success }]} />
              <Text style={s.legendText}>{`${naturalPct}% Natural`}</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: colors.click }]} />
              <Text style={s.legendText}>{`${pct2}% Ração`}</Text>
            </View>
          </View>

          <Slider
            style={s.slider}
            minimumValue={10}
            maximumValue={90}
            step={5}
            value={naturalPct}
            onValueChange={(v) => setNaturalPct(Math.round(v))}
            minimumTrackTintColor={colors.success}
            maximumTrackTintColor={colors.click}
            thumbTintColor={colors.success}
          />
        </View>

        {/* Warning */}
        <View style={s.warningCard}>
          <AlertTriangle size={rs(16)} color={colors.warning} />
          <View style={s.warningInfo}>
            <Text style={s.warningTitle}>{t('nutrition.warningBalance')}</Text>
            <Text style={s.warningDesc}>{t('nutrition.warningVet')}</Text>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[s.saveBtn, isSettingModalidade && s.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSettingModalidade}
          activeOpacity={0.8}
        >
          <Check size={rs(18)} color="#fff" />
          <Text style={s.saveBtnText}>{t('nutrition.btnSavePct')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  propCard: {
    backgroundColor: colors.card, borderRadius: rs(18), padding: rs(20),
    borderWidth: 1, borderColor: colors.border, gap: rs(16),
  },
  sliderLabel: { fontSize: fs(15), fontWeight: '700', color: colors.text, textAlign: 'center' },
  barOuter: { flexDirection: 'row', height: rs(20), borderRadius: rs(10), overflow: 'hidden' },
  barNatural: { backgroundColor: colors.success },
  barRacao: { backgroundColor: colors.click },
  barLegend: { flexDirection: 'row', justifyContent: 'center', gap: rs(24) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  legendDot: { width: rs(10), height: rs(10), borderRadius: rs(5) },
  legendText: { fontSize: fs(13), color: colors.textSec },
  slider: { width: '100%', height: rs(40) },
  warningCard: {
    flexDirection: 'row', gap: rs(12), alignItems: 'flex-start',
    backgroundColor: colors.warningSoft, borderRadius: rs(14), padding: rs(14),
    borderWidth: 1, borderColor: colors.warning + '30',
  },
  warningInfo: { flex: 1 },
  warningTitle: { fontSize: fs(14), fontWeight: '700', color: colors.warning, marginBottom: rs(2) },
  warningDesc: { fontSize: fs(13), color: colors.textSec },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.click, borderRadius: rs(14), padding: rs(16),
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: fs(15), fontWeight: '700', color: '#fff' },
});
