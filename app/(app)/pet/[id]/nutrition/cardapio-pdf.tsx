/**
 * cardapio-pdf.tsx — PDF preview screen for the weekly nutrition menu.
 * Receives cardapioData (serialized JSON) via route params.
 * Shows Print and Share action buttons, same pattern as prontuario-pdf.tsx.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Download, Share2, Utensils } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { usePets } from '../../../../../hooks/usePets';
import { useToast } from '../../../../../components/Toast';
import { getErrorMessage } from '../../../../../utils/errorMessages';
import { previewPdf, sharePdf } from '../../../../../lib/pdf';
import { buildCardapioPdfBody } from '../../../../../lib/cardapioPdf';
import type { Cardapio } from '../../../../../hooks/useNutricao';
import type { PetPdfInfo } from '../../../../../lib/cardapioPdf';

export default function CardapioPdfScreen() {
  const { id: petId, cardapioData, isHistory } = useLocalSearchParams<{
    id: string;
    cardapioData: string;
    isHistory?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);

  const [isBusy, setIsBusy] = useState(false);

  let cardapio: Cardapio | null = null;
  try {
    cardapio = cardapioData ? (JSON.parse(cardapioData) as Cardapio) : null;
  } catch {
    cardapio = null;
  }

  const petInfo: PetPdfInfo | undefined = pet && cardapio ? {
    name: pet.name,
    species: pet.species,
    sex: pet.sex ?? null,
    neutered: pet.neutered,
    birth_date: pet.birth_date ?? null,
    estimated_age_months: pet.estimated_age_months ?? null,
    avatar_url: pet.avatar_url ?? null,
    weight_kg: pet.weight_kg ?? null,
    breed: pet.breed ?? null,
    modalidade_label: cardapio.modalidade_label ?? '',
  } : undefined;

  const buildPdfOptions = useCallback(() => {
    if (!cardapio || !pet) return null;
    const bodyHtml = buildCardapioPdfBody(cardapio, t, petInfo);
    const subtitle = isHistory === 'true'
      ? t('nutrition.cardapioHistoryPdfSubtitle', { date: cardapio.generated_at ? new Date(cardapio.generated_at).toLocaleDateString() : '' })
      : t('nutrition.cardapioPdfSubtitle', { days: cardapio.days?.length ?? 7 });
    return {
      title: t('nutrition.cardapioPdfTitle', { name: pet.name }),
      subtitle,
      bodyHtml,
    };
  }, [cardapio, pet, petInfo, t, isHistory]);

  const handlePrint = useCallback(async () => {
    const opts = buildPdfOptions();
    if (!opts || isBusy) return;
    setIsBusy(true);
    try {
      await previewPdf(opts);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsBusy(false);
    }
  }, [buildPdfOptions, isBusy, toast]);

  const handleShare = useCallback(async () => {
    const opts = buildPdfOptions();
    if (!opts || isBusy) return;
    setIsBusy(true);
    try {
      const fileName = `cardapio_${(pet?.name ?? '').toLowerCase().replace(/\s+/g, '_')}.pdf`;
      await sharePdf(opts, fileName);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsBusy(false);
    }
  }, [buildPdfOptions, isBusy, pet, toast]);

  if (!cardapio || !pet) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('nutrition.cardapioPdfTitle', { name: '' })}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator color={colors.click} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.cardapioPdfTitle', { name: pet.name })}</Text>
        <View style={s.headerBtn} />
      </View>

      <View style={s.content}>
        <View style={s.previewBox}>
          <View style={s.iconWrap}>
            <Utensils size={rs(48)} color={colors.success} strokeWidth={1.3} />
          </View>
          <Text style={s.readyTitle}>{t('nutrition.cardapioPdfReady')}</Text>
          <Text style={s.readySubtitle}>{t('nutrition.cardapioPdfReadySubtitle')}</Text>
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.click + '40' }]}
            onPress={handlePrint}
            activeOpacity={0.8}
            disabled={isBusy}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.clickSoft }]}>
              {isBusy
                ? <ActivityIndicator color={colors.click} size="small" />
                : <Download size={rs(22)} color={colors.click} strokeWidth={1.8} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('nutrition.cardapioPrintOrSave')}</Text>
              <Text style={s.actionSubtitle}>{t('nutrition.cardapioPrintOrSaveHint')}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.petrol + '40' }]}
            onPress={handleShare}
            activeOpacity={0.8}
            disabled={isBusy}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.petrolSoft }]}>
              <Share2 size={rs(22)} color={colors.petrol} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('nutrition.cardapioShareFile')}</Text>
              <Text style={s.actionSubtitle}>{t('nutrition.cardapioShareFileHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={s.disclaimer}>{t('nutrition.cardapioPdfDisclaimer')}</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(16), paddingVertical: rs(10),
    gap: rs(12), borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: fs(17), fontWeight: '700', color: colors.text, textAlign: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, padding: rs(24) },
  previewBox: { alignItems: 'center', padding: rs(32) },
  iconWrap: {
    width: rs(96), height: rs(96), borderRadius: rs(28),
    backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: rs(16),
  },
  readyTitle: { fontSize: fs(20), fontWeight: '700', color: colors.text, textAlign: 'center' },
  readySubtitle: {
    fontSize: fs(14), color: colors.textDim, textAlign: 'center',
    marginTop: rs(8), lineHeight: fs(14) * 1.6,
  },
  actions: { gap: rs(12), marginTop: rs(8) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16), borderWidth: 1,
  },
  actionIcon: {
    width: rs(48), height: rs(48), borderRadius: rs(14),
    alignItems: 'center', justifyContent: 'center',
  },
  actionTitle: { fontSize: fs(15), fontWeight: '600', color: colors.text },
  actionSubtitle: { fontSize: fs(12), color: colors.textDim, marginTop: rs(2) },
  disclaimer: {
    fontSize: fs(10), color: colors.textDim, textAlign: 'center', marginTop: rs(24),
  },
});
