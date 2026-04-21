/**
 * nutrition/restricoes.tsx — Tela 3: Restrições e intolerâncias + lista ASPCA
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Plus, ShieldAlert, Trash2, AlertOctagon, FileText } from 'lucide-react-native';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { colors } from '../../../../../constants/colors';
import { useNutricao } from '../../../../../hooks/useNutricao';
import { useToast } from '../../../../../components/Toast';
import { usePets } from '../../../../../hooks/usePets';

const ASPCA_KEYS = [
  'aspcaChocolate', 'aspcaGrapes', 'aspcaOnion', 'aspcaXylitol', 'aspcaMacadamia',
  'aspcaAvocado', 'aspcaAlcohol', 'aspcaCaffeine', 'aspcaRawDough', 'aspcaStoneFruit',
];

export default function RestricoesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);
  const { nutricao, addRestricao, removeRestricao, isAddingRestricao } = useNutricao(petId ?? '');
  const { confirm, toast } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<'restriction' | 'intolerance'>('restriction');

  const handleAdd = async () => {
    if (!name.trim()) return;
    try {
      await addRestricao({ product_name: name.trim(), record_type: type });
      setName('');
      toast(t('toast.entrySaved'), 'success');
    } catch {
      toast(t('errors.generic'), 'error');
    }
  };

  const handleRemove = async (id: string, itemName: string) => {
    const yes = await confirm({ text: t('nutrition.confirmRemoveRestricao', { name: itemName }), type: 'warning' });
    if (!yes) return;
    try {
      await removeRestricao(id);
      toast(t('toast.entrySaved'), 'success');
    } catch {
      toast(t('errors.generic'), 'error');
    }
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('nutrition.restricoesTitle')}</Text>
        <TouchableOpacity
          onPress={() => router.push(`/pet/${petId}/nutrition-pdf` as never)}
          style={s.backBtn}
          accessibilityLabel={t('nutritionPdf.icon')}
        >
          <FileText size={rs(20)} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Known restrictions */}
        <Text style={s.sectionLabel}>{t('nutrition.restricoesKnown')}</Text>

        {(nutricao?.restrictions ?? []).length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>{t('nutrition.restricoesEmpty')}</Text>
          </View>
        ) : (
          <View style={s.listCard}>
            {nutricao!.restrictions.map((r) => (
              <View key={r.id} style={s.listRow}>
                <ShieldAlert size={rs(16)} color={colors.warning} />
                <Text style={s.listItemText} numberOfLines={1}>
                  {r.product_name ?? r.notes ?? '—'}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemove(r.id, r.product_name ?? '?')}
                  style={s.removeBtn}
                >
                  <Trash2 size={rs(16)} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add form */}
        <Text style={s.sectionLabel}>{t('nutrition.btnAddRestricao')}</Text>
        <View style={s.addCard}>
          {/* Type selector */}
          <View style={s.typeRow}>
            <TouchableOpacity
              style={[s.typeChip, type === 'restriction' && s.typeChipActive]}
              onPress={() => setType('restriction')}
            >
              <Text style={[s.typeChipText, type === 'restriction' && s.typeChipTextActive]}>
                {t('nutrition.typeRestriction')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.typeChip, type === 'intolerance' && s.typeChipActive]}
              onPress={() => setType('intolerance')}
            >
              <Text style={[s.typeChipText, type === 'intolerance' && s.typeChipTextActive]}>
                {t('nutrition.typeIntolerance')}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder={t('nutrition.addRestricaoPlaceholder')}
            placeholderTextColor={colors.placeholder}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[s.addBtn, (!name.trim() || isAddingRestricao) && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!name.trim() || isAddingRestricao}
            activeOpacity={0.8}
          >
            <Plus size={rs(18)} color="#fff" />
            <Text style={s.addBtnText}>{t('nutrition.btnAddRestricao')}</Text>
          </TouchableOpacity>
        </View>

        {/* ASPCA list */}
        <Text style={s.sectionLabel}>{t('nutrition.restricoesASPCA')}</Text>
        <View style={s.aspcaCard}>
          {ASPCA_KEYS.map((key) => (
            <View key={key} style={s.aspcaRow}>
              <AlertOctagon size={rs(15)} color={colors.danger} />
              <Text style={s.aspcaText}>{t(`nutrition.${key}`)}</Text>
            </View>
          ))}
        </View>
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
  content: { padding: rs(16), gap: rs(14), paddingBottom: rs(40) },
  sectionLabel: { fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 1.2 },
  emptyCard: {
    backgroundColor: colors.card, borderRadius: rs(12), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  emptyText: { fontSize: fs(13), color: colors.textDim },
  listCard: {
    backgroundColor: colors.card, borderRadius: rs(14), overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(10),
    padding: rs(14), borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  listItemText: { flex: 1, fontSize: fs(14), color: colors.text },
  removeBtn: { padding: rs(4) },
  addCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.border, gap: rs(12),
  },
  typeRow: { flexDirection: 'row', gap: rs(8) },
  typeChip: {
    flex: 1, paddingVertical: rs(8), borderRadius: rs(10),
    backgroundColor: colors.bgCard, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.accentGlow, borderColor: colors.accent },
  typeChipText: { fontSize: fs(13), color: colors.textSec, fontWeight: '600' },
  typeChipTextActive: { color: colors.accent },
  input: {
    backgroundColor: colors.bgCard, borderRadius: rs(12), padding: rs(14),
    fontSize: fs(14), color: colors.text, borderWidth: 1, borderColor: colors.border,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(8), backgroundColor: colors.accent, borderRadius: rs(12), padding: rs(14),
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontSize: fs(14), fontWeight: '700', color: '#fff' },
  aspcaCard: {
    backgroundColor: colors.card, borderRadius: rs(14), padding: rs(16),
    borderWidth: 1, borderColor: colors.danger + '30', gap: rs(10),
  },
  aspcaRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10) },
  aspcaText: { fontSize: fs(13), color: colors.text },
});
