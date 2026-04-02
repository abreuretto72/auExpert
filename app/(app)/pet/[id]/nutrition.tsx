import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Apple,
  Sparkles,
  Clock,
  Check,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  UtensilsCrossed,
  CookingPot,
  Cookie,
} from 'lucide-react-native';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { Skeleton } from '../../../../components/Skeleton';
import { NutritionLensContent } from '../../../../components/lenses/NutritionLensContent';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
type TabId = 'today' | 'foods' | 'recipes' | 'records';

interface TabDef {
  readonly id: TabId;
  readonly labelKey: string;
}

interface MacroData {
  readonly labelKey: string;
  readonly value: number;
  readonly max: number;
  readonly unit: string;
  readonly color: string;
}

interface MealEntry {
  readonly time: string;
  readonly nameKey: string;
  readonly itemsKey: string;
  readonly kcal: number;
  readonly done: boolean;
  readonly dotColor: string;
}

interface FoodItem {
  readonly nameKey: string;
  readonly noteKey: string;
  readonly dotColor: string;
}

interface FoodSection {
  readonly titleKey: string;
  readonly borderColor: string;
  readonly items: readonly FoodItem[];
}

interface RecipeCard {
  readonly nameKey: string;
  readonly kcal: number;
  readonly color: string;
  readonly icon: React.ElementType;
}

// ──────────────────────────────────────────
// Constants
// ──────────────────────────────────────────
const TABS: readonly TabDef[] = [
  { id: 'records', labelKey: 'nutrition.tabRecords' },
  { id: 'today', labelKey: 'nutrition.tabToday' },
  { id: 'foods', labelKey: 'nutrition.tabFoods' },
  { id: 'recipes', labelKey: 'nutrition.tabRecipes' },
];

const MACROS: readonly MacroData[] = [
  { labelKey: 'nutrition.macroProtein', value: 45, max: 55, unit: 'g', color: colors.danger },
  { labelKey: 'nutrition.macroFat', value: 22, max: 30, unit: 'g', color: colors.gold },
  { labelKey: 'nutrition.macroFiber', value: 8, max: 12, unit: 'g', color: colors.lime },
  { labelKey: 'nutrition.macroCarbs', value: 15, max: 25, unit: 'g', color: colors.petrol },
];

const MEALS: readonly MealEntry[] = [
  { time: '08:00', nameKey: 'nutrition.mealBreakfast', itemsKey: 'nutrition.mealBreakfastItems', kcal: 280, done: true, dotColor: colors.lime },
  { time: '13:00', nameKey: 'nutrition.mealSnack', itemsKey: 'nutrition.mealSnackItems', kcal: 45, done: true, dotColor: colors.gold },
  { time: '18:00', nameKey: 'nutrition.mealDinner', itemsKey: 'nutrition.mealDinnerItems', kcal: 300, done: false, dotColor: colors.border },
  { time: '20:30', nameKey: 'nutrition.mealSupper', itemsKey: 'nutrition.mealSupperItems', kcal: 155, done: false, dotColor: colors.border },
];

const FOOD_SECTIONS: readonly FoodSection[] = [
  {
    titleKey: 'nutrition.foodsSafe',
    borderColor: colors.lime,
    items: [
      { nameKey: 'nutrition.foodChicken', noteKey: 'nutrition.foodChickenNote', dotColor: colors.lime },
      { nameKey: 'nutrition.foodCarrot', noteKey: 'nutrition.foodCarrotNote', dotColor: colors.lime },
      { nameKey: 'nutrition.foodRice', noteKey: 'nutrition.foodRiceNote', dotColor: colors.lime },
    ],
  },
  {
    titleKey: 'nutrition.foodsCaution',
    borderColor: colors.warning,
    items: [
      { nameKey: 'nutrition.foodCheese', noteKey: 'nutrition.foodCheeseNote', dotColor: colors.warning },
      { nameKey: 'nutrition.foodEgg', noteKey: 'nutrition.foodEggNote', dotColor: colors.warning },
    ],
  },
  {
    titleKey: 'nutrition.foodsToxic',
    borderColor: colors.danger,
    items: [
      { nameKey: 'nutrition.foodChocolate', noteKey: 'nutrition.foodChocolateNote', dotColor: colors.danger },
      { nameKey: 'nutrition.foodGrapes', noteKey: 'nutrition.foodGrapesNote', dotColor: colors.danger },
    ],
  },
];

const RECIPES: readonly RecipeCard[] = [
  { nameKey: 'nutrition.recipeNatural', kcal: 320, color: colors.lime, icon: UtensilsCrossed },
  { nameKey: 'nutrition.recipeSnack', kcal: 45, color: colors.gold, icon: Cookie },
  { nameKey: 'nutrition.recipeSoup', kcal: 180, color: colors.petrol, icon: CookingPot },
];

// ──────────────────────────────────────────
// Progress Bar
// ──────────────────────────────────────────
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

// ──────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────
export default function NutritionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { pet, isLoading, refetch } = usePet(id);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('records');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const currentKcal = 624;
  const goalKcal = 780;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Skeleton width="100%" height={rs(80)} borderRadius={radii.card} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={rs(200)} borderRadius={radii.card} />
          <View style={{ height: spacing.md }} />
          <Skeleton width="100%" height={rs(160)} borderRadius={radii.card} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* ── Breed Info Bar ── */}
      <View style={styles.breedBar}>
        <View style={styles.breedLeft}>
          <View style={[styles.breedIconWrap, { backgroundColor: colors.limeSoft }]}>
            <Apple size={rs(20)} color={colors.lime} strokeWidth={1.8} />
          </View>
          <View style={styles.breedTextWrap}>
            <Text style={styles.breedName}>
              {pet?.breed ?? t('health.unknown')} {' \u00B7 '} {pet?.weight ? `${pet.weight} kg` : ''}
            </Text>
            <Text style={styles.breedGoal}>
              {t('nutrition.goalLabel', { kcal: goalKcal })}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.limeSoft }]}>
          <Text style={[styles.badgeText, { color: colors.lime }]}>{t('nutrition.idealWeight')}</Text>
        </View>
      </View>

      {/* ── Tab Navigation ── */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {t(tab.labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab Content ── */}
      {activeTab === 'records' && id && (
        <NutritionLensContent petId={id} />
      )}

      {activeTab === 'today' && (
        <>
          {/* Daily Calories Card */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('nutrition.dailyCalories')}</Text>
            <View style={styles.kcalRow}>
              <Text style={styles.kcalCurrent}>{currentKcal}</Text>
              <Text style={styles.kcalDivider}>/</Text>
              <Text style={styles.kcalGoal}>{goalKcal}</Text>
              <Text style={styles.kcalUnit}>kcal</Text>
            </View>
            <ProgressBar value={currentKcal} max={goalKcal} color={colors.lime} />
            <View style={styles.macroGrid}>
              {MACROS.map((m) => (
                <View key={m.labelKey} style={styles.macroItem}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroLabel}>{t(m.labelKey)}</Text>
                    <Text style={[styles.macroValue, { color: m.color }]}>
                      {m.value}{m.unit}
                    </Text>
                  </View>
                  <ProgressBar value={m.value} max={m.max} color={m.color} />
                </View>
              ))}
            </View>
          </View>

          {/* Meals Timeline */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>{t('nutrition.mealsTimeline')}</Text>
            {MEALS.map((meal, idx) => (
              <View key={idx} style={styles.mealRow}>
                <View style={styles.mealTimelineCol}>
                  <View style={[styles.mealDot, { backgroundColor: meal.dotColor }]}>
                    {meal.done && <Check size={rs(10)} color={colors.bg} strokeWidth={2.5} />}
                  </View>
                  {idx < MEALS.length - 1 && <View style={styles.mealLine} />}
                </View>
                <View style={styles.mealInfo}>
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealTime}>{meal.time}</Text>
                    <Text style={styles.mealName}>{t(meal.nameKey)}</Text>
                  </View>
                  <Text style={styles.mealItems}>{t(meal.itemsKey)}</Text>
                  <Text style={styles.mealKcal}>{meal.kcal} kcal</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {activeTab === 'foods' && (
        <>
          {FOOD_SECTIONS.map((section) => (
            <View key={section.titleKey} style={[styles.card, { borderLeftWidth: rs(3), borderLeftColor: section.borderColor }]}>
              <Text style={[styles.sectionLabel, { color: section.borderColor }]}>
                {t(section.titleKey)}
              </Text>
              {section.items.map((item) => (
                <View key={item.nameKey} style={styles.foodRow}>
                  <View style={[styles.foodDot, { backgroundColor: item.dotColor }]} />
                  <View style={styles.foodTextWrap}>
                    <Text style={styles.foodName}>{t(item.nameKey)}</Text>
                    <Text style={styles.foodNote}>{t(item.noteKey)}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </>
      )}

      {activeTab === 'recipes' && (
        <>
          {RECIPES.map((recipe) => {
            const IconComp = recipe.icon;
            return (
              <View key={recipe.nameKey} style={styles.card}>
                <View style={styles.recipeRow}>
                  <View style={[styles.recipeIconWrap, { backgroundColor: `${recipe.color}18` }]}>
                    <IconComp size={rs(22)} color={recipe.color} strokeWidth={1.8} />
                  </View>
                  <View style={styles.recipeTextWrap}>
                    <Text style={styles.recipeName}>{t(recipe.nameKey)}</Text>
                    <View style={styles.recipeBadges}>
                      <View style={[styles.badge, { backgroundColor: `${recipe.color}18` }]}>
                        <Text style={[styles.badgeText, { color: recipe.color }]}>
                          {recipe.kcal} kcal
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
                        <ShieldCheck size={rs(12)} color={colors.success} strokeWidth={2} />
                        <Text style={[styles.badgeText, { color: colors.success, marginLeft: rs(4) }]}>
                          {t('nutrition.vetApproved')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* ── AI Note ── */}
      <View style={[styles.card, styles.aiCard]}>
        <View style={styles.aiHeader}>
          <Sparkles size={rs(18)} color={colors.lime} strokeWidth={1.8} />
          <Text style={styles.aiLabel}>{t('nutrition.aiNoteLabel')}</Text>
        </View>
        <Text style={styles.aiText}>
          {t('nutrition.aiNote', { name: pet?.name ?? '' })}
        </Text>
      </View>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  // Breed Info Bar
  breedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  breedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breedIconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breedTextWrap: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  breedName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
  },
  breedGoal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: rs(2),
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: rs(4),
    borderRadius: radii.sm,
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: rs(10),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.limeSoft,
    borderWidth: 1,
    borderColor: colors.lime,
  },
  tabText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  tabTextActive: {
    color: colors.lime,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textSec,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Kcal
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  kcalCurrent: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(32),
    color: colors.lime,
  },
  kcalDivider: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(20),
    color: colors.textGhost,
    marginHorizontal: rs(4),
  },
  kcalGoal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(20),
    color: colors.textDim,
  },
  kcalUnit: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    marginLeft: rs(6),
  },

  // Progress
  progressTrack: {
    height: rs(4),
    backgroundColor: colors.border,
    borderRadius: rs(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: rs(2),
  },

  // Macros
  macroGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  macroItem: {
    gap: rs(4),
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
  },
  macroValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(12),
  },

  // Meals
  mealRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  mealTimelineCol: {
    alignItems: 'center',
    width: rs(24),
    marginRight: spacing.sm,
  },
  mealDot: {
    width: rs(18),
    height: rs(18),
    borderRadius: rs(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: rs(4),
  },
  mealInfo: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealTime: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(12),
    color: colors.textDim,
  },
  mealName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  mealItems: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    marginTop: rs(2),
  },
  mealKcal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: fs(11),
    color: colors.lime,
    marginTop: rs(2),
  },

  // Foods
  foodRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: rs(6),
  },
  foodDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    marginTop: rs(5),
    marginRight: spacing.sm,
  },
  foodTextWrap: {
    flex: 1,
  },
  foodName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
  },
  foodNote: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textSec,
    marginTop: rs(1),
  },

  // Recipes
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeIconWrap: {
    width: rs(44),
    height: rs(44),
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeTextWrap: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  recipeName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
    marginBottom: rs(4),
  },
  recipeBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // AI Note
  aiCard: {
    backgroundColor: `${colors.lime}08`,
    borderWidth: 1,
    borderColor: `${colors.lime}20`,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  aiLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.lime,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  aiText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.textSec,
    lineHeight: fs(15) * 1.9,
    fontStyle: 'italic',
  },
});
