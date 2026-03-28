import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Dog,
  Cat,
  BookOpen,
  Camera,
  Syringe,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { moods } from '../../../../constants/moods';
import { usePet, usePets } from '../../../../hooks/usePets';
import { useVaccines, useAllergies, useMoodLogs } from '../../../../hooks/useHealth';
import { useDiary } from '../../../../hooks/useDiary';
import { useAuthStore } from '../../../../stores/authStore';
import { HealthScoreCircle } from '../../../../components/HealthScoreCircle';
import { Skeleton } from '../../../../components/Skeleton';
import { Input } from '../../../../components/ui/Input';
import { useToast } from '../../../../components/Toast';
import { supabase } from '../../../../lib/supabase';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatAge, formatWeight, formatDate, formatRelativeDate } from '../../../../utils/format';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data: pet, isLoading, refetch } = usePet(id!);
  const { updatePet } = usePets();
  const { vaccines, overdueCount } = useVaccines(id!);
  const { allergies } = useAllergies(id!);
  const { moodLogs } = useMoodLogs(id!);
  const { entries: diaryEntries } = useDiary(id!);

  // Campos editáveis
  const [editBreed, setEditBreed] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editColor, setEditColor] = useState('');
  const initialRef = useRef('');
  const dataRef = useRef({ breed: '', age: '', weight: '', size: '', color: '' });

  // Preencher quando pet carrega
  useEffect(() => {
    if (!pet) return;
    const b = pet.breed ?? '';
    const a = pet.estimated_age_months != null
      ? (pet.estimated_age_months >= 12
        ? `${Math.floor(pet.estimated_age_months / 12)}a${pet.estimated_age_months % 12 ? pet.estimated_age_months % 12 + 'm' : ''}`
        : `${pet.estimated_age_months}m`)
      : '';
    const w = pet.weight_kg != null ? String(pet.weight_kg) : '';
    const s = pet.size ?? '';
    const c = pet.color ?? '';
    setEditBreed(b); setEditAge(a); setEditWeight(w); setEditSize(s); setEditColor(c);
    const snap = JSON.stringify({ breed: b, age: a, weight: w, size: s, color: c });
    initialRef.current = snap;
    dataRef.current = { breed: b, age: a, weight: w, size: s, color: c };
  }, [pet?.id]);

  // Sync ref
  useEffect(() => {
    dataRef.current = { breed: editBreed, age: editAge, weight: editWeight, size: editSize, color: editColor };
  }, [editBreed, editAge, editWeight, editSize, editColor]);

  // Auto-save ao sair
  useEffect(() => {
    return () => {
      const d = dataRef.current;
      if (!id || JSON.stringify(d) === initialRef.current) return;
      const parseAge = (input: string): number | null => {
        if (!input.trim()) return null;
        const s = input.trim().toLowerCase();
        const mixed = s.match(/(\d+)\s*a\D*(\d+)\s*m/);
        if (mixed) return parseInt(mixed[1], 10) * 12 + parseInt(mixed[2], 10);
        const years = s.match(/^(\d+)\s*(a|ano|anos|year|years|y)$/);
        if (years) return parseInt(years[1], 10) * 12;
        const months = s.match(/^(\d+)\s*(m|mes|meses|month|months)$/);
        if (months) return parseInt(months[1], 10);
        const num = parseInt(s, 10);
        return isNaN(num) ? null : num;
      };
      const wNum = d.weight ? parseFloat(d.weight) : null;
      console.log('[PetProfile] Auto-saving...');
      supabase.from('pets').update({
        breed: d.breed.trim() || null,
        estimated_age_months: parseAge(d.age),
        weight_kg: wNum && !isNaN(wNum) ? wNum : null,
        size: d.size || null,
        color: d.color.trim() || null,
      }).eq('id', id).then(({ error }) => {
        if (error) console.warn('[PetProfile] Auto-save failed:', error.message);
        else console.log('[PetProfile] Auto-saved OK');
      });
    };
  }, [id]);

  // Upload foto do pet para o bucket
  const uploadPetPhoto = useCallback(async (uri: string) => {
    const FileSystem = require('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const fileName = `${user?.id}/${id}/${Date.now()}_avatar.jpg`;
    const { data: upData, error } = await supabase.storage.from('pets').upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('pets').getPublicUrl(upData.path);
    await supabase.from('pets').update({ avatar_url: urlData.publicUrl }).eq('id', id);
    refetch();
    toast(t('tutor.profileSaved'), 'success');
  }, [id, user?.id, refetch, toast, t]);

  // Tirar foto com câmera
  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4,
      });
      if (!result.canceled && result.assets[0]) await uploadPetPhoto(result.assets[0].uri);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [uploadPetPhoto, toast, t]);

  // Escolher da galeria
  const handlePickPhoto = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) await uploadPetPhoto(result.assets[0].uri);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [uploadPetPhoto, toast]);

  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !pet) {
    return (
      <View style={styles.safe}>
        <View style={styles.loadingCenter}>
          <Skeleton width={rs(100)} height={rs(100)} radius={rs(28)} />
          <Skeleton width={rs(160)} height={rs(24)} style={{ marginTop: rs(16) }} />
          <Skeleton width={rs(100)} height={rs(14)} style={{ marginTop: rs(8) }} />
        </View>
      </View>
    );
  }

  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const latestMood = moodLogs.length > 0
    ? moods.find((m) => m.id === moodLogs[0].mood_id)
    : null;

  return (
    <View style={styles.safe}>
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
          <TouchableOpacity onPress={() => setShowPhotoOptions(!showPhotoOptions)} activeOpacity={0.8}>
            <View style={[styles.avatarLarge, { borderColor: petColor + '40' }]}>
              {pet.avatar_url ? (
                <Image source={{ uri: pet.avatar_url }} style={styles.avatarImg} />
              ) : (
                <>
                  <View style={[styles.avatarGlow, { backgroundColor: petColor + '10' }]} />
                  {isDog ? <Dog size={rs(52)} color={petColor} strokeWidth={1.5} /> : <Cat size={rs(52)} color={petColor} strokeWidth={1.5} />}
                </>
              )}
            </View>
            <View style={styles.cameraBtn}>
              <Camera size={rs(14)} color={colors.accent} strokeWidth={1.8} />
            </View>
          </TouchableOpacity>

          {/* Opções de foto */}
          {showPhotoOptions && (
            <View style={styles.photoOptions}>
              <TouchableOpacity style={styles.photoOptionBtn} onPress={() => { setShowPhotoOptions(false); handleTakePhoto(); }} activeOpacity={0.7}>
                <Camera size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.photoOptionText}>{t('addPet.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoOptionBtn} onPress={() => { setShowPhotoOptions(false); handlePickPhoto(); }} activeOpacity={0.7}>
                <Dog size={rs(18)} color={colors.accent} strokeWidth={1.8} />
                <Text style={styles.photoOptionText}>{t('addPet.pickFromGallery')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petBreed}>{pet.breed ?? t('addPet.unknownBreed')}</Text>

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
              pet.size ? ({ small: t('addPet.sizeSmall'), medium: t('addPet.sizeMedium'), large: t('addPet.sizeLarge') }[pet.size]) : null,
              isDog ? t('pets.dog') : t('pets.cat'),
            ].filter(Boolean).map((tag, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Health Score + Stats ── */}
        <View style={styles.healthRow}>
          <HealthScoreCircle score={pet.health_score} size={rs(110)} />
          <View style={styles.statsCol}>
            <View style={styles.statItem}>
              <BookOpen size={rs(16)} color={colors.accent} strokeWidth={1.8} />
              <Text style={styles.statValue}>{diaryEntries.length}</Text>
              <Text style={styles.statLabel}>diario</Text>
            </View>
            <View style={styles.statItem}>
              <Camera size={rs(16)} color={colors.purple} strokeWidth={1.8} />
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>fotos</Text>
            </View>
            <View style={styles.statItem}>
              <Syringe
                size={rs(16)}
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
            <AlertTriangle size={rs(18)} color={colors.danger} strokeWidth={2} />
            <Text style={styles.vaccineAlertText}>
              {overdueCount} {overdueCount === 1 ? 'vacina atrasada' : 'vacinas atrasadas'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Pet Info (editável, auto-save ao sair) ── */}
        <Text style={styles.sectionLabel}>{t('addPet.breed').toUpperCase()}</Text>
        <Input label={t('addPet.breed')} value={editBreed} onChangeText={setEditBreed} showMic={false} />

        <View style={styles.editRow}>
          <View style={{ flex: 1 }}>
            <Input label={t('addPet.estimatedAge')} value={editAge} onChangeText={setEditAge} placeholder="ex: 2a, 4m" showMic={false} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('addPet.estimatedWeight')} value={editWeight} onChangeText={setEditWeight} placeholder="kg" type="numeric" showMic={false} />
          </View>
        </View>

        <Text style={styles.fieldLabel}>{t('addPet.petSize')}</Text>
        <View style={styles.sizeChips}>
          {(['small', 'medium', 'large'] as const).map((sz) => (
            <TouchableOpacity
              key={sz}
              style={[styles.sizeChip, editSize === sz && { backgroundColor: petColor + '20', borderColor: petColor }]}
              onPress={() => setEditSize(sz)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sizeChipText, editSize === sz && { color: petColor }]}>
                {{ small: t('addPet.sizeSmall'), medium: t('addPet.sizeMedium'), large: t('addPet.sizeLarge') }[sz]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label={t('addPet.coatColor')} value={editColor} onChangeText={setEditColor} showMic={false} multiline />

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
              <Sparkles size={rs(16)} color={colors.purple} strokeWidth={1.8} />
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
                    <Clock size={rs(12)} color={colors.textDim} strokeWidth={1.8} />
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
    </View>
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
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    gap: rs(12),
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  editBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(radii.lg),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: rs(20),
  },

  // Profile
  profileSection: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatarLarge: {
    width: rs(100),
    height: rs(100),
    borderRadius: rs(28),
    borderWidth: 3,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: rs(26),
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: rs(28),
  },
  photoOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  photoOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    borderRadius: rs(radii.lg),
    paddingHorizontal: rs(14),
    paddingVertical: rs(10),
  },
  photoOptionText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.accent,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: rs(8),
    right: rs(-4),
    width: rs(28),
    height: rs(28),
    borderRadius: rs(8),
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(28),
    color: colors.text,
  },
  petBreed: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textDim,
    marginTop: 2,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(12),
    paddingVertical: rs(5),
    borderRadius: rs(radii.md),
    gap: rs(6),
    marginTop: spacing.sm,
  },
  moodDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
  },
  moodText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
  },
  tagsRow: {
    flexDirection: 'row',
    gap: rs(6),
    marginTop: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.sm),
    paddingHorizontal: rs(10),
    paddingVertical: rs(4),
  },
  tagText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(11),
    color: colors.textSec,
  },

  // Health row
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.card),
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
    fontSize: fs(18),
    color: colors.text,
  },
  statLabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
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
    borderRadius: rs(radii.xl),
    paddingHorizontal: rs(14),
    paddingVertical: rs(12),
    marginBottom: spacing.md,
  },
  vaccineAlertText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.danger,
    flex: 1,
  },

  // Section
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
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
    fontSize: fs(12),
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
    borderRadius: rs(radii.xxl),
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
    flexBasis: '45%',
  },
  actionIcon: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  actionHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.card),
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: rs(14),
  },
  infoRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.textDim,
  },
  infoValue: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
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
    borderRadius: rs(radii.sm),
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
  },
  allergyChipSevere: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger + '25',
  },
  allergyText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.warning,
  },

  // AI card
  aiCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.purple + '25',
    borderRadius: rs(radii.xxl),
    padding: spacing.md,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  aiText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: rs(20),
    flex: 1,
  },

  // Diary preview
  diaryPreview: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.xl),
    padding: rs(14),
    marginBottom: spacing.sm,
  },
  diaryPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(6),
    marginBottom: rs(6),
  },
  diaryMoodDot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
  },
  diaryDate: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
  },
  diaryContent: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: rs(20),
  },

  editRow: { flexDirection: 'row', gap: spacing.sm },
  fieldLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.textDim, marginBottom: rs(6), marginTop: rs(4) },
  sizeChips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sizeChip: { flex: 1, alignItems: 'center', paddingVertical: rs(12), borderRadius: rs(radii.lg), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  sizeChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.textSec },
  bottomSpacer: {
    height: rs(80),
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: rs(24),
    right: rs(20),
    width: rs(56),
    height: rs(56),
    borderRadius: rs(18),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.3,
    shadowRadius: rs(16),
    elevation: 8,
  },
});
