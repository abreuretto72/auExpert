import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Dog,
  Cat,
  Pencil,
  BookOpen,
  Camera,
  Syringe,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { moods } from '../../../../constants/moods';
import { usePet } from '../../../../hooks/usePets';
import { useVaccines, useAllergies, useMoodLogs } from '../../../../hooks/useHealth';
import { useDiary } from '../../../../hooks/useDiary';
import { HealthScoreCircle } from '../../../../components/HealthScoreCircle';
import { Skeleton } from '../../../../components/Skeleton';
import { formatAge, formatWeight, formatDate, formatRelativeDate } from '../../../../utils/format';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, isLoading, refetch } = usePet(id!);
  const { vaccines, overdueCount } = useVaccines(id!);
  const { allergies } = useAllergies(id!);
  const { moodLogs } = useMoodLogs(id!);
  const { entries: diaryEntries } = useDiary(id!);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !pet) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingCenter}>
          <Skeleton width={100} height={100} radius={28} />
          <Skeleton width={160} height={24} style={{ marginTop: 16 }} />
          <Skeleton width={100} height={14} style={{ marginTop: 8 }} />
        </View>
      </SafeAreaView>
    );
  }

  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const latestMood = moodLogs.length > 0
    ? moods.find((m) => m.id === moodLogs[0].mood_id)
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pet.name}</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Pencil size={18} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* ── Avatar + Info ── */}
        <View style={styles.profileSection}>
          <View style={[styles.avatarLarge, { borderColor: petColor + '40' }]}>
            <View style={[styles.avatarGlow, { backgroundColor: petColor + '10' }]} />
            {isDog ? (
              <Dog size={52} color={petColor} strokeWidth={1.5} />
            ) : (
              <Cat size={52} color={petColor} strokeWidth={1.5} />
            )}
          </View>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed ?? 'Sem raca definida'}</Text>

          {latestMood && (
            <View style={[styles.moodBadge, { backgroundColor: latestMood.color + '1F' }]}>
              <View style={[styles.moodDot, { backgroundColor: latestMood.color }]} />
              <Text style={[styles.moodText, { color: latestMood.color }]}>
                {latestMood.label}
              </Text>
            </View>
          )}

          <View style={styles.tagsRow}>
            {[
              pet.estimated_age_months ? formatAge(pet.estimated_age_months) : null,
              pet.weight_kg ? formatWeight(pet.weight_kg) : null,
              pet.size ? ({ small: 'Pequeno', medium: 'Medio', large: 'Grande' }[pet.size]) : null,
              isDog ? 'Cao' : 'Gato',
            ].filter(Boolean).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Health Score + Stats ── */}
        <View style={styles.healthRow}>
          <HealthScoreCircle score={pet.health_score} size={110} />
          <View style={styles.statsCol}>
            <View style={styles.statItem}>
              <BookOpen size={16} color={colors.accent} strokeWidth={1.8} />
              <Text style={styles.statValue}>{diaryEntries.length}</Text>
              <Text style={styles.statLabel}>diario</Text>
            </View>
            <View style={styles.statItem}>
              <Camera size={16} color={colors.purple} strokeWidth={1.8} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>fotos</Text>
            </View>
            <View style={styles.statItem}>
              <Syringe
                size={16}
                color={overdueCount > 0 ? colors.danger : colors.success}
                strokeWidth={1.8}
              />
              <Text style={[styles.statValue, { color: overdueCount > 0 ? colors.danger : colors.success }]}>
                {vaccines.length}
              </Text>
              <Text style={styles.statLabel}>vacinas</Text>
            </View>
          </View>
        </View>

        {/* ── Vaccine Alert ── */}
        {overdueCount > 0 && (
          <TouchableOpacity
            style={styles.vaccineAlert}
            activeOpacity={0.7}
            onPress={() => router.push(`/pet/${id}/health` as never)}
          >
            <AlertTriangle size={18} color={colors.danger} strokeWidth={2} />
            <Text style={styles.vaccineAlertText}>
              {overdueCount} {overdueCount === 1 ? 'vacina atrasada' : 'vacinas atrasadas'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>ACOES RAPIDAS</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/pet/${id}/diary` as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.accent + '12' }]}>
              <BookOpen size={22} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text style={styles.actionLabel}>Diario</Text>
            <Text style={styles.actionHint}>Ver entradas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/pet/${id}/health` as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.success + '12' }]}>
              <ShieldCheck size={22} color={colors.success} strokeWidth={1.8} />
            </View>
            <Text style={styles.actionLabel}>Saude</Text>
            <Text style={styles.actionHint}>Vacinas e alergias</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/pet/${id}/photo-analysis` as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.purple + '12' }]}>
              <Sparkles size={22} color={colors.purple} strokeWidth={1.8} />
            </View>
            <Text style={styles.actionLabel}>Analise IA</Text>
            <Text style={styles.actionHint}>Foto inteligente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: colors.petrol + '12' }]}>
              <TrendingUp size={22} color={colors.petrol} strokeWidth={1.8} />
            </View>
            <Text style={styles.actionLabel}>Evolucao</Text>
            <Text style={styles.actionHint}>Graficos</Text>
          </TouchableOpacity>
        </View>

        {/* ── Pet Info ── */}
        <Text style={styles.sectionLabel}>INFORMACOES</Text>
        <View style={styles.infoCard}>
          {[
            { label: 'Raca', value: pet.breed ?? '—' },
            { label: 'Nascimento', value: formatDate(pet.birth_date) },
            { label: 'Peso', value: pet.weight_kg ? formatWeight(pet.weight_kg) : '—' },
            { label: 'Porte', value: pet.size ? { small: 'Pequeno', medium: 'Medio', large: 'Grande' }[pet.size] : '—' },
            { label: 'Cor', value: pet.color ?? '—' },
            { label: 'Microchip', value: pet.microchip_id ?? '—' },
          ].map((item, i) => (
            <View key={i} style={[styles.infoRow, i > 0 && styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Allergies ── */}
        {allergies.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>ALERGIAS</Text>
            <View style={styles.allergiesRow}>
              {allergies.map((a) => (
                <View
                  key={a.id}
                  style={[
                    styles.allergyChip,
                    a.severity === 'severe' && styles.allergyChipSevere,
                  ]}
                >
                  <Text
                    style={[
                      styles.allergyText,
                      a.severity === 'severe' && { color: colors.danger },
                    ]}
                  >
                    {a.allergen}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── AI Personality ── */}
        {pet.personality_summary && (
          <>
            <Text style={styles.sectionLabel}>PERSONALIDADE (IA)</Text>
            <View style={styles.aiCard}>
              <Sparkles size={16} color={colors.purple} strokeWidth={1.8} />
              <Text style={styles.aiText}>{pet.personality_summary}</Text>
            </View>
          </>
        )}

        {/* ── Recent Diary ── */}
        {diaryEntries.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>DIARIO RECENTE</Text>
              <TouchableOpacity onPress={() => router.push(`/pet/${id}/diary` as never)}>
                <Text style={styles.seeAll}>Ver tudo</Text>
              </TouchableOpacity>
            </View>
            {diaryEntries.slice(0, 3).map((entry) => {
              const entryMood = moods.find((m) => m.id === entry.mood_id);
              return (
                <View key={entry.id} style={styles.diaryPreview}>
                  <View style={styles.diaryPreviewLeft}>
                    {entryMood && (
                      <View style={[styles.diaryMoodDot, { backgroundColor: entryMood.color }]} />
                    )}
                    <Clock size={12} color={colors.textDim} strokeWidth={1.8} />
                    <Text style={styles.diaryDate}>
                      {formatRelativeDate(entry.created_at)}
                    </Text>
                  </View>
                  <Text style={styles.diaryContent} numberOfLines={2}>
                    {entry.content}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── FAB: Nova entrada no diario ── */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: petColor }]}
        activeOpacity={0.8}
        onPress={() => router.push(`/pet/${id}/diary/new` as never)}
      >
        <BookOpen size={22} color="#fff" strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.text,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 3,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
  },
  petName: {
    fontFamily: 'Sora_700Bold',
    fontSize: 28,
    color: colors.text,
  },
  petBreed: {
    fontFamily: 'Sora_400Regular',
    fontSize: 14,
    color: colors.textDim,
    marginTop: 2,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radii.md,
    gap: 6,
    marginTop: spacing.sm,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: 'Sora_500Medium',
    fontSize: 11,
    color: colors.textSec,
  },

  // Health row
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  statsCol: {
    flex: 1,
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 18,
    color: colors.text,
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: 12,
    color: colors.textDim,
  },

  // Vaccine alert
  vaccineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    borderRadius: radii.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  vaccineAlertText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },

  // Section
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 11,
    color: colors.textGhost,
    letterSpacing: 2,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAll: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: colors.accent,
  },

  // Actions grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xxl,
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
    flexBasis: '45%',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: colors.text,
  },
  actionHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: colors.textDim,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: 13,
    color: colors.textDim,
  },
  infoValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },

  // Allergies
  allergiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  allergyChip: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning + '25',
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  allergyChipSevere: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger + '25',
  },
  allergyText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: colors.warning,
  },

  // AI card
  aiCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.purple + '25',
    borderRadius: radii.xxl,
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  aiText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: colors.textSec,
    lineHeight: 20,
    flex: 1,
  },

  // Diary preview
  diaryPreview: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 14,
    marginBottom: spacing.sm,
  },
  diaryPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  diaryMoodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  diaryDate: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: 10,
    color: colors.textDim,
  },
  diaryContent: {
    fontFamily: 'Sora_400Regular',
    fontSize: 13,
    color: colors.textSec,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 80,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
