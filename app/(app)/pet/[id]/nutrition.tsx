/**
 * nutrition.tsx — Tela 1: Visão geral de nutrição do pet
 *
 * Mostra: modalidade, ração atual, peso, fase de vida, alertas, avaliação IA.
 * Rota: /pet/[id]/nutrition
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import PdfActionModal from '../../../../components/pdf/PdfActionModal';
import { previewNutritionPdf, shareNutritionPdf } from '../../../../lib/nutritionPdf';
import {
  ChevronLeft,
  Leaf,
  Weight,
  AlertTriangle,
  Utensils,
  Plus,
  ChevronRight,
  Sparkles,
  BookOpen,
  TrendingUp,
  ShieldAlert,
  CalendarDays,
  Settings2,
  Venus,
  Mars,
  FileText,
} from 'lucide-react-native';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { useNutricao } from '../../../../hooks/useNutricao';
import { usePets } from '../../../../hooks/usePets';
import { sexContext } from '../../../../utils/petGender';
import { calcAgeMonths } from '../../../../utils/format';
import { Skeleton } from '../../../../components/Skeleton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function lifeStageLabel(t: (k: string) => string, stage: string): string {
  const map: Record<string, string> = {
    puppy: t('nutrition.lifeStagePuppy'),
    kitten: t('nutrition.lifeStageKitten'),
    adult: t('nutrition.lifeStageAdult'),
    senior: t('nutrition.lifeStageSenior'),
  };
  return map[stage] ?? stage;
}

function modalidadeLabel(t: (k: string) => string, mod: string): string {
  const map: Record<string, string> = {
    so_racao: t('nutrition.modalidadeLabelSoRacao'),
    racao_natural: t('nutrition.modalidadeLabelRacaoNatural'),
    so_natural: t('nutrition.modalidadeLabelSoNatural'),
  };
  return map[mod] ?? mod;
}

/**
 * Infere modalidade real quando nutrition_profiles.modalidade é null/undefined.
 *
 * Sem isso, o default `so_racao` mostrava "Só ração" mesmo pra pets em
 * alimentação natural — lamentável visual de inconsistência. A inferência
 * usa product_name (palavras-chave "natural", "barf", "caseira") + category
 * (raw/homemade → natural; dry/wet → ração).
 */
function inferModalidade(
  modalidade: string | null | undefined,
  currentFood: { product_name?: string | null; category?: string | null } | null | undefined,
): string {
  if (modalidade) return modalidade;

  const name = (currentFood?.product_name ?? '').toLowerCase();
  const cat = (currentFood?.category ?? '').toLowerCase();

  // Sinais explícitos de alimentação natural
  if (name.includes('natural') || name.includes('barf') || name.includes('caseira')
      || cat === 'raw' || cat === 'homemade') {
    return 'so_natural';
  }

  // Ração de fato
  if (cat === 'dry_food' || cat === 'wet_food' || name.includes('ração') || name.includes('racao')) {
    return 'so_racao';
  }

  // Sem sinais — não chuta, retorna vazio pra UI mostrar fallback discreto
  return '';
}

function categoryLabel(t: (k: string) => string, cat: string | null): string {
  if (!cat) return '';
  const map: Record<string, string> = {
    dry_food: t('nutrition.categoryDryFood'),
    wet_food: t('nutrition.categoryWetFood'),
    raw: t('nutrition.categoryRaw'),
    homemade: t('nutrition.categoryHomemade'),
    treat: t('nutrition.categoryTreat'),
    supplement: t('nutrition.categorySupplement'),
    prescription: t('nutrition.categoryPrescription'),
  };
  return map[cat] ?? cat;
}

function ageMonthsFromPet(pet: { birth_date?: string | null; estimated_age_months?: number | null }): number {
  // calcAgeMonths faz parse local-safe de "yyyy-mm-dd" — ver utils/format.ts.
  // NUNCA trocar por `new Date(pet.birth_date)` direto — bug de timezone UTC.
  if (pet.birth_date) {
    return Math.max(0, calcAgeMonths(pet.birth_date));
  }
  return pet.estimated_age_months ?? 0;
}

function calcLifeStageClient(
  species: string,
  ageMonths: number,
  size: string | null,
): { life_stage: string; age_label: string } {
  let life_stage = 'adult';
  if (species === 'dog') {
    const puppyEnd = size === 'large' ? 18 : size === 'medium' ? 15 : 12;
    const seniorStart = size === 'large' ? 60 : size === 'medium' ? 84 : 96;
    if (ageMonths < puppyEnd) life_stage = 'puppy';
    else if (ageMonths >= seniorStart) life_stage = 'senior';
  } else {
    // cat
    if (ageMonths < 12) life_stage = 'kitten';
    else if (ageMonths >= 120) life_stage = 'senior';
  }
  let age_label = '';
  if (ageMonths < 12) {
    age_label = `${ageMonths}m`;
  } else {
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    age_label = months > 0 ? `${years}a ${months}m` : `${years}a`;
  }
  return { life_stage, age_label };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NutricaoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: petId } = useLocalSearchParams<{ id: string }>();
  const { pets } = usePets();
  const pet = pets.find((p) => p.id === petId);

  console.log('[NutricaoScreen] render — petId:', petId, 'isAuth:', !!pet);
  const { nutricao, isLoadingNutricao, refetchNutricao } = useNutricao(petId ?? '');
  const [pdfModal, setPdfModal] = useState(false);

  const onRefresh = useCallback(() => {
    refetchNutricao();
  }, [refetchNutricao]);

  const nav = (sub: string) => router.push(`/pet/${petId}/nutrition/${sub}` as never);

  // ── Loading ───────────────────────────────────────────────────────────────
  // Skeleton que espelha a estrutura real: pills → food card → 2 feature cards.
  // CLAUDE.md §12.2: nunca mostrar tela vazia / spinner infinito.
  if (isLoadingNutricao) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={rs(22)} color={colors.click} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('nutrition.title')}</Text>
          <View style={styles.headerActions}>
            <View style={styles.actionBtn} />
            <View style={styles.actionBtn} />
          </View>
        </View>
        <View style={styles.scrollContent}>
          {/* Subtitle + sex pill row */}
          <Skeleton width="80%" height={rs(20)} />
          <View style={{ height: spacing.md }} />
          {/* Info pills row */}
          <Skeleton width="100%" height={rs(32)} radius={radii.md} />
          <View style={{ height: spacing.lg }} />
          {/* Current food card */}
          <Skeleton width="100%" height={rs(130)} radius={radii.card} />
          <View style={{ height: spacing.md }} />
          {/* Modalidade feature card */}
          <Skeleton width="100%" height={rs(100)} radius={radii.card} />
          <View style={{ height: spacing.md }} />
          {/* IA evaluation card */}
          <Skeleton width="100%" height={rs(120)} radius={radii.card} />
        </View>
      </SafeAreaView>
    );
  }

  const petName = pet?.name ?? '';

  // Client-side life stage: calculated from birth_date/estimated_age_months directly
  // so we're not affected by the Edge Function defaulting to 24 months when birth_date is null.
  const clientStage = pet
    ? calcLifeStageClient(pet.species, ageMonthsFromPet(pet), pet.size ?? null)
    : null;
  const displayLifeStage = clientStage?.life_stage ?? nutricao?.life_stage ?? 'adult';
  const displayAgeLabel = clientStage?.age_label ?? nutricao?.age_label ?? '';

  const alertColor = (severity: string) => {
    if (severity === 'error') return colors.danger;
    if (severity === 'warning') return colors.warning;
    return colors.petrol;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('nutrition.title')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setPdfModal(true)}
            style={styles.actionBtn}
            accessibilityLabel={t('nutritionPdf.icon')}
          >
            <FileText size={rs(20)} color={colors.click} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => nav('modalidade')} style={styles.actionBtn}>
            <Settings2 size={rs(20)} color={colors.click} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingNutricao}
            onRefresh={onRefresh}
            tintColor={colors.click}
          />
        }
      >
        {/* Subtitle + sex pill */}
        <View style={styles.subtitleRow}>
          <Text style={styles.subtitle}>
            {t('nutrition.subtitle', { name: petName, context: sexContext(pet?.sex) })}
          </Text>
          {pet?.sex && (
            <View style={styles.infoPill}>
              {pet.sex === 'female'
                ? <Venus size={rs(14)} color={colors.rose} />
                : <Mars size={rs(14)} color={colors.sky} />
              }
              <Text style={[styles.infoPillText, { color: pet.sex === 'female' ? colors.rose : colors.sky }]}>
                {pet.sex === 'female' ? t('nutrition.sexFemale') : t('nutrition.sexMale')}
              </Text>
            </View>
          )}
        </View>

        {/* Modalidade + life stage + weight pills */}
        <View style={styles.infoRow}>
          {(() => {
            // Infere modalidade real quando o backend não tem (current_food
            // existe mas nutrition_profiles.modalidade é null). Evita mostrar
            // "Só ração" pra quem está em alimentação natural.
            const inferredMod = inferModalidade(nutricao?.modalidade, nutricao?.current_food);
            if (!inferredMod) {
              // Sem sinais — chip discreto neutro
              return (
                <View style={styles.infoPill}>
                  <Leaf size={rs(14)} color={colors.textDim} />
                  <Text style={[styles.infoPillText, { color: colors.textDim }]}>
                    {t('nutrition.modalidadeUnknown')}
                  </Text>
                </View>
              );
            }
            return (
              <View style={styles.infoPill}>
                <Leaf size={rs(14)} color={colors.success} />
                <Text style={[styles.infoPillText, { color: colors.success }]}>
                  {modalidadeLabel(t, inferredMod)}
                </Text>
              </View>
            );
          })()}
          <View style={styles.infoPill}>
            <TrendingUp size={rs(14)} color={colors.petrol} />
            <Text style={[styles.infoPillText, { color: colors.petrol }]}>
              {lifeStageLabel(t, displayLifeStage)}
              {displayAgeLabel ? `  ·  ${displayAgeLabel}` : ''}
            </Text>
          </View>
          <View style={styles.infoPill}>
            <Weight size={rs(14)} color={colors.petrol} />
            <Text style={[styles.infoPillText, { color: colors.petrol }]}>
              {nutricao?.weight_kg != null
                ? t('nutrition.weightKg', { weight: nutricao.weight_kg })
                : t('nutrition.weightUnknown')}
            </Text>
          </View>
        </View>

        {/* Alerts */}
        {(nutricao?.alerts ?? []).length > 0 && (
          <View style={styles.alertsCard}>
            {nutricao!.alerts.map((alert, i) => (
              <View key={i} style={styles.alertRow}>
                <AlertTriangle size={rs(16)} color={alertColor(alert.severity)} />
                <Text style={[styles.alertText, { color: alertColor(alert.severity) }]}>
                  {t(alert.message_key, { name: petName })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Current food */}
        <View style={styles.sectionHeaderRow}>
          <Utensils size={rs(13)} color={colors.success} />
          <Text style={styles.sectionLabel}>{t('nutrition.sectionCurrentFood')}</Text>
        </View>

        {nutricao?.current_food ? (
          <TouchableOpacity style={styles.foodCard} onPress={() => nav('racao')} activeOpacity={0.8}>
            <View style={styles.foodCardMain}>
              <Text style={styles.foodName} numberOfLines={1}>
                {nutricao.current_food.product_name ?? '—'}
              </Text>
              {nutricao.current_food.brand && (
                <Text style={styles.foodBrand}>{nutricao.current_food.brand}</Text>
              )}
              <View style={styles.foodStatsRow}>
                {nutricao.current_food.portion_grams != null && (
                  <StatChip label={t('nutrition.racaoPortionValue', { g: nutricao.current_food.portion_grams })} />
                )}
                {nutricao.current_food.daily_portions != null && (
                  <StatChip label={t('nutrition.racaoDailyPortions', { n: nutricao.current_food.daily_portions })} />
                )}
                {nutricao.current_food.calories_kcal != null && (
                  <StatChip label={t('nutrition.racaoCalories', { kcal: nutricao.current_food.calories_kcal })} />
                )}
                {nutricao.current_food.category && (
                  <StatChip label={categoryLabel(t, nutricao.current_food.category)} />
                )}
              </View>
            </View>
            <ChevronRight size={rs(18)} color={colors.textDim} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.emptyCard} onPress={() => nav('trocar')} activeOpacity={0.8}>
            <Plus size={rs(20)} color={colors.click} />
            <Text style={styles.emptyText}>{t('nutrition.addFirstFood')}</Text>
          </TouchableOpacity>
        )}

        {/* Restrictions summary */}
        {(nutricao?.restrictions ?? []).length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <ShieldAlert size={rs(13)} color={colors.warning} />
              <Text style={styles.sectionLabel}>{t('nutrition.sectionRestrictions')}</Text>
            </View>
            <TouchableOpacity style={styles.restrictionsCard} onPress={() => nav('restricoes')} activeOpacity={0.8}>
              {nutricao!.restrictions.slice(0, 3).map((r) => (
                <View key={r.id} style={styles.restrictionRow}>
                  <View style={styles.restrictionDot} />
                  <Text style={styles.restrictionText} numberOfLines={1}>
                    {r.product_name ?? r.notes ?? '—'}
                  </Text>
                </View>
              ))}
              {nutricao!.restrictions.length > 3 && (
                <Text style={styles.restrictionMore}>
                  +{nutricao!.restrictions.length - 3}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Action grid */}
        <View style={styles.actionGrid}>
          <ActionBtn icon={<ShieldAlert size={rs(22)} color={colors.click} />} label={t('nutrition.btnRestrictions')} onPress={() => nav('restricoes')} />
          <ActionBtn icon={<BookOpen size={rs(22)} color={colors.click} />} label={t('nutrition.btnHistory')} onPress={() => nav('historico')} />
          <ActionBtn icon={<Sparkles size={rs(22)} color={colors.click} />} label={t('nutrition.btnAITips')} onPress={() => nav('dicas')} />
          <ActionBtn icon={<Settings2 size={rs(22)} color={colors.click} />} label={t('nutrition.btnModalidade')} onPress={() => nav('modalidade')} />
          <ActionBtn icon={<CalendarDays size={rs(22)} color={colors.click} />} label={t('nutrition.btnWeeklyMenu')} onPress={() => nav('cardapio')} />
        </View>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function StatChip({ label }: { label: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.text}>{label}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={actionStyles.btn} onPress={onPress} activeOpacity={0.7}>
      <View style={actionStyles.iconWrap}>{icon}</View>
      <Text style={actionStyles.label} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(16),
    paddingVertical: rs(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(17), fontWeight: '700', color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: rs(2) },
  actionBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: rs(16), paddingBottom: rs(40) },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rs(14),
    marginBottom: rs(10),
    gap: rs(8),
  },
  subtitle: { fontSize: fs(13), color: colors.textSec, flex: 1 },
  infoRow: { flexDirection: 'row', gap: rs(8), marginBottom: rs(12), flexWrap: 'wrap' },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    backgroundColor: colors.card,
    borderRadius: rs(20),
    paddingHorizontal: rs(10),
    paddingVertical: rs(5),
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoPillText: { fontSize: fs(12), fontWeight: '600' },
  alertsCard: {
    backgroundColor: colors.card,
    borderRadius: rs(12),
    padding: rs(12),
    marginBottom: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
    gap: rs(8),
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(8) },
  alertText: { flex: 1, fontSize: fs(13) },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(8),
    marginTop: rs(8),
  },
  sectionLabel: { fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 1.2 },
  foodCard: {
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    marginBottom: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(10),
  },
  foodCardMain: { flex: 1 },
  foodName: { fontSize: fs(15), fontWeight: '700', color: colors.text, marginBottom: rs(2) },
  foodBrand: { fontSize: fs(12), color: colors.textSec, marginBottom: rs(6) },
  foodStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(20),
    marginBottom: rs(14),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.click,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  emptyText: { fontSize: fs(14), color: colors.click, fontWeight: '600' },
  evalCard: {
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    marginBottom: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
  },
  doubleRow: { flexDirection: 'row', gap: rs(10), marginBottom: rs(14) },
  halfCard: {
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
  },
  halfCardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(5), marginBottom: rs(6) },
  halfCardTitle: { fontSize: fs(11), fontWeight: '700', color: colors.textDim, letterSpacing: 0.5 },
  halfCardValue: { fontSize: fs(18), fontWeight: '800', color: colors.text },
  halfCardValueDim: { fontSize: fs(12), color: colors.textDim, fontStyle: 'italic' },
  evalGenerating: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(2) },
  evalGeneratingText: { fontSize: fs(11), color: colors.textDim, fontStyle: 'italic', flex: 1 },
  evalScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: rs(2) },
  evalScore: { fontSize: fs(22), fontWeight: '800', color: colors.click },
  evalScoreMax: { fontSize: fs(11), color: colors.textDim },
  evalSummary: { fontSize: fs(11), color: colors.textSec, marginTop: rs(4), lineHeight: fs(15) },
  evalCons: { fontSize: fs(10), color: colors.warning, marginTop: rs(4), fontWeight: '600' },
  restrictionsCard: {
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    marginBottom: rs(14),
    borderWidth: 1,
    borderColor: colors.border,
  },
  restrictionRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4) },
  restrictionDot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: colors.warning },
  restrictionText: { flex: 1, fontSize: fs(13), color: colors.text },
  restrictionMore: { fontSize: fs(12), color: colors.textDim, marginTop: rs(4) },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10), marginTop: rs(10) },
});

const chipStyles = StyleSheet.create({
  chip: {
    backgroundColor: colors.bgCard,
    borderRadius: rs(6),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { fontSize: fs(11), color: colors.textSec },
});

const actionStyles = StyleSheet.create({
  btn: {
    flexGrow: 1,
    flexBasis: '30%',
    backgroundColor: colors.card,
    borderRadius: rs(14),
    padding: rs(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: rs(8),
    minWidth: rs(90),
  },
  iconWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(22),
    backgroundColor: colors.clickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: fs(11), fontWeight: '600', color: colors.textSec, textAlign: 'center' },
});
