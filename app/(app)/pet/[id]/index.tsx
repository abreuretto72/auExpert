import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Dog, Cat, BookOpen, Camera, AlertTriangle, ShieldCheck, Clock,
  Sparkles, TrendingUp, Users, Trophy, Hourglass, ScrollText, QrCode,
  Apple, Map, Umbrella, ScanEye, ChevronRight, Syringe,
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
import { Skeleton } from '../../../../components/Skeleton';
import { useToast } from '../../../../components/Toast';
import { supabase } from '../../../../lib/supabase';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatAge, formatWeight, formatRelativeDate } from '../../../../utils/format';

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const { data: pet, isLoading, refetch } = usePet(id!);
  const { updatePet } = usePets();
  const { vaccines, overdueCount } = useVaccines(id!);
  const { allergies } = useAllergies(id!);
  const { moodLogs } = useMoodLogs(id!);
  const { entries: diaryEntries } = useDiary(id!);

  // ── Editable fields + auto-save ──
  const [editBreed, setEditBreed] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editColor, setEditColor] = useState('');
  const initialRef = useRef('');
  const dataRef = useRef({ breed: '', age: '', weight: '', size: '', color: '' });

  useEffect(() => {
    if (!pet) return;
    const b = pet.breed ?? '';
    const a = pet.estimated_age_months != null
      ? (pet.estimated_age_months >= 12
        ? `${Math.floor(pet.estimated_age_months / 12)}a${pet.estimated_age_months % 12 ? pet.estimated_age_months % 12 + 'm' : ''}`
        : `${pet.estimated_age_months}m`)
      : '';
    const w = pet.weight_kg != null ? String(pet.weight_kg) : '';
    const sz = pet.size ?? '';
    const c = pet.color ?? '';
    setEditBreed(b); setEditAge(a); setEditWeight(w); setEditSize(sz); setEditColor(c);
    const snap = JSON.stringify({ breed: b, age: a, weight: w, size: sz, color: c });
    initialRef.current = snap;
    dataRef.current = { breed: b, age: a, weight: w, size: sz, color: c };
  }, [pet?.id]);

  useEffect(() => {
    dataRef.current = { breed: editBreed, age: editAge, weight: editWeight, size: editSize, color: editColor };
  }, [editBreed, editAge, editWeight, editSize, editColor]);

  useEffect(() => {
    return () => {
      const d = dataRef.current;
      if (!id || JSON.stringify(d) === initialRef.current) return;
      const parseAge = (input: string): number | null => {
        if (!input.trim()) return null;
        const s = input.trim().toLowerCase();
        const mx = s.match(/(\d+)\s*a\D*(\d+)\s*m/);
        if (mx) return parseInt(mx[1], 10) * 12 + parseInt(mx[2], 10);
        const yr = s.match(/^(\d+)\s*(a|ano|anos|year|years|y)$/);
        if (yr) return parseInt(yr[1], 10) * 12;
        const mo = s.match(/^(\d+)\s*(m|mes|meses|month|months)$/);
        if (mo) return parseInt(mo[1], 10);
        const n = parseInt(s, 10);
        return isNaN(n) ? null : n;
      };
      const wNum = d.weight ? parseFloat(d.weight) : null;
      supabase.from('pets').update({
        breed: d.breed.trim() || null, estimated_age_months: parseAge(d.age),
        weight_kg: wNum && !isNaN(wNum) ? wNum : null, size: d.size || null, color: d.color.trim() || null,
      }).eq('id', id).then(({ error }) => {
        if (error) console.warn('[Pet] Auto-save failed:', error.message);
      });
    };
  }, [id]);

  // ── Photo handlers ──
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
  }, [id, user?.id, refetch]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4 });
      if (!result.canceled && result.assets[0]) await uploadPetPhoto(result.assets[0].uri);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [uploadPetPhoto, toast, t]);

  const handlePickPhoto = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) await uploadPetPhoto(result.assets[0].uri);
    } catch (err) { toast(getErrorMessage(err), 'error'); }
  }, [uploadPetPhoto, toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading || !pet) {
    return (
      <View style={s.container}>
        <View style={s.loadingCenter}>
          <Skeleton width={rs(90)} height={rs(90)} radius={rs(28)} />
          <Skeleton width={rs(160)} height={rs(24)} style={{ marginTop: rs(16) }} />
        </View>
      </View>
    );
  }

  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const latestMood = moodLogs.length > 0 ? moods.find((m) => m.id === moodLogs[0].mood_id) : null;
  const healthScore = pet.health_score ?? 0;
  const happinessScore = pet.happiness_score ?? 0;
  const lastEntry = diaryEntries[0] ?? null;

  const mvpFeatures = [
    { id: 'diary', label: t('common.diary'), sub: `${diaryEntries.length} ${t('diary.entries', { defaultValue: diaryEntries.length === 1 ? 'entrada' : 'entradas' })}`, icon: BookOpen, color: colors.accent, route: `/pet/${id}/diary` },
    { id: 'health', label: t('common.health'), sub: `${vaccines.length} ${t('health.vaccines').toLowerCase()}`, icon: ShieldCheck, color: colors.success, route: `/pet/${id}/health`, badge: overdueCount > 0 ? String(overdueCount) : undefined },
    { id: 'ai', label: t('common.ia'), sub: '—', icon: ScanEye, color: colors.purple, route: `/pet/${id}/photo-analysis` },
  ];

  const extraFeatures = [
    { id: 'happiness', label: t('pet.happiness'), sub: t('pet.happinessSub'), icon: TrendingUp, color: colors.success, route: `/pet/${id}/happiness` },
    { id: 'coparents', label: t('pet.coparents'), sub: t('pet.coparentsSub'), icon: Users, color: colors.petrol, route: `/pet/${id}/coparents` },
    { id: 'achievements', label: t('pet.achievements'), sub: t('pet.achievementsSub'), icon: Trophy, color: colors.gold, route: `/pet/${id}/achievements` },
    { id: 'capsules', label: t('pet.capsules'), sub: t('pet.capsulesSub'), icon: Hourglass, color: colors.rose, route: `/pet/${id}/capsules` },
    { id: 'testament', label: t('pet.testament'), sub: t('pet.testamentSub'), icon: ScrollText, color: colors.rose, route: `/pet/${id}/testament` },
    { id: 'idCard', label: t('pet.idCard'), sub: t('pet.idCardSub'), icon: QrCode, color: colors.sky, route: `/pet/${id}/id-card` },
    { id: 'nutrition', label: t('pet.nutrition'), sub: t('pet.nutritionSub'), icon: Apple, color: colors.lime, route: `/pet/${id}/nutrition` },
    { id: 'travel', label: t('pet.travel'), sub: t('pet.travelSub'), icon: Map, color: colors.sky, route: `/pet/${id}/travel` },
    { id: 'insurance', label: t('pet.insurance'), sub: t('pet.insuranceSub'), icon: Umbrella, color: colors.petrol, route: `/pet/${id}/insurance` },
  ];

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} progressBackgroundColor={colors.card} />}
      >
        {/* ── Profile Hero ── */}
        <View style={s.heroRow}>
          <TouchableOpacity onPress={() => setShowPhotoOptions(!showPhotoOptions)} activeOpacity={0.8}>
            <View style={[s.avatar, { borderColor: petColor + '25' }]}>
              {pet.avatar_url ? (
                <Image source={{ uri: pet.avatar_url }} style={s.avatarImg} />
              ) : (
                isDog ? <Dog size={rs(48)} color={petColor} strokeWidth={1.5} /> : <Cat size={rs(48)} color={petColor} strokeWidth={1.5} />
              )}
            </View>
            <View style={s.cameraBtn}><Camera size={rs(14)} color={colors.accent} strokeWidth={1.8} /></View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.petName}>{pet.name}</Text>
              {pet.sex && (
                <Text style={{ fontFamily: 'Sora_700Bold', fontSize: fs(16), color: pet.sex === 'male' ? colors.petrol : colors.rose }}>
                  {pet.sex === 'male' ? '♂' : '♀'}
                </Text>
              )}
              {latestMood && (
                <View style={[s.moodBadge, { backgroundColor: latestMood.color + '15' }]}>
                  <View style={[s.moodDot, { backgroundColor: latestMood.color }]} />
                  <Text style={[s.moodText, { color: latestMood.color }]}>{latestMood.label}</Text>
                </View>
              )}
            </View>
            <Text style={s.breedText}>{pet.breed ?? t('addPet.unknownBreed')}</Text>
            <View style={s.tagsRow}>
              {[
                pet.estimated_age_months ? formatAge(pet.estimated_age_months) : null,
                pet.weight_kg ? formatWeight(pet.weight_kg) : null,
                isDog ? t('pets.dog') : t('pets.cat'),
              ].filter(Boolean).map((tag, i) => (
                <View key={i} style={s.tag}><Text style={s.tagText}>{tag}</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* Photo options */}
        {showPhotoOptions && (
          <View style={s.photoOpts}>
            <TouchableOpacity style={s.photoOptBtn} onPress={() => { setShowPhotoOptions(false); handleTakePhoto(); }}>
              <Camera size={rs(16)} color={colors.accent} strokeWidth={1.8} />
              <Text style={s.photoOptText}>{t('addPet.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.photoOptBtn} onPress={() => { setShowPhotoOptions(false); handlePickPhoto(); }}>
              <Dog size={rs(16)} color={colors.accent} strokeWidth={1.8} />
              <Text style={s.photoOptText}>{t('addPet.pickFromGallery')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Score Cards ── */}
        <View style={s.scoresRow}>
          {[
            { label: t('health.aiHealthScore'), value: healthScore || '—', color: healthScore >= 80 ? colors.success : healthScore >= 50 ? colors.warning : colors.danger, sub: overdueCount > 0 ? `${overdueCount} ${t('health.vaccineOverdue')}` : t('health.upToDate'), subColor: overdueCount > 0 ? colors.danger : colors.success },
            { label: t('pet.happiness'), value: happinessScore || '—', color: colors.accent, sub: '—', subColor: colors.textDim },
            { label: t('tutor.level', { level: 1 }), value: 1, color: colors.gold, sub: '0 XP', subColor: colors.textDim },
          ].map((sc, i) => (
            <View key={i} style={s.scoreCard}>
              <Text style={[s.scoreValue, { color: sc.color }]}>{sc.value}</Text>
              <Text style={s.scoreLabel}>{sc.label}</Text>
              <Text style={[s.scoreSub, { color: sc.subColor }]}>{sc.sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Vaccine Alert ── */}
        {overdueCount > 0 && (
          <TouchableOpacity style={s.vaccineAlert} onPress={() => router.replace(`/pet/${id}/health` as never)} activeOpacity={0.7}>
            <AlertTriangle size={rs(16)} color={colors.danger} strokeWidth={2} />
            <Text style={s.vaccineAlertText}>{overdueCount} {t('health.vaccineOverdue')}</Text>
            <ChevronRight size={rs(12)} color={colors.danger} strokeWidth={1.8} />
          </TouchableOpacity>
        )}

        {/* ── AI Personality ── */}
        {pet.ai_personality && (
          <View style={s.aiCard}>
            <View style={s.aiHeader}>
              <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
              <Text style={s.aiLabel}>{t('pet.personality')}</Text>
            </View>
            <Text style={s.aiText}>{pet.ai_personality}</Text>
          </View>
        )}

        {/* ── Feature Grid MVP ── */}
        <Text style={s.sectionLabel}>{t('pet.features')}</Text>
        <View style={s.mvpRow}>
          {mvpFeatures.map((f) => (
            <TouchableOpacity key={f.id} style={s.mvpCard} onPress={() => router.replace(f.route as never)} activeOpacity={0.7}>
              {f.badge && <View style={s.mvpBadge}><Text style={s.mvpBadgeText}>{f.badge}</Text></View>}
              <View style={[s.mvpIcon, { backgroundColor: f.color + '12' }]}>
                <f.icon size={rs(24)} color={f.color} strokeWidth={1.8} />
              </View>
              <Text style={s.mvpLabel}>{f.label}</Text>
              <Text style={s.mvpSub}>{f.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Extra Features Grid ── */}
        <View style={s.futureGrid}>
          {extraFeatures.map((f) => (
            <TouchableOpacity key={f.id} style={s.futureCard} onPress={() => router.push(f.route as never)} activeOpacity={0.7}>
              <View style={[s.futureIcon, { backgroundColor: f.color + '10' }]}>
                <f.icon size={rs(20)} color={f.color} strokeWidth={1.8} />
              </View>
              <Text style={s.futureLabel}>{f.label}</Text>
              <Text style={s.futureSub}>{f.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Allergies ── */}
        {allergies.length > 0 && (
          <View style={s.allergiesCard}>
            <View style={s.allergiesHeader}>
              <AlertTriangle size={rs(12)} color={colors.danger} strokeWidth={1.8} />
              <Text style={s.allergiesTitle}>{t('health.allergies').toUpperCase()}</Text>
            </View>
            <View style={s.allergiesRow}>
              {allergies.map((a) => (
                <View key={a.id} style={s.allergyChip}>
                  <Text style={s.allergyText}>{a.allergen}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Last Diary Narration ── */}
        {lastEntry?.narration && (
          <View style={s.narrationCard}>
            <View style={s.narrationHeader}>
              <Sparkles size={rs(14)} color={colors.accent} strokeWidth={1.8} />
              <Text style={s.narrationLabel}>{t('pet.lastNarration')}</Text>
              <View style={{ flex: 1 }} />
              <Clock size={rs(10)} color={colors.textGhost} strokeWidth={1.8} />
              <Text style={s.narrationTime}>{formatRelativeDate(lastEntry.created_at)}</Text>
            </View>
            <Text style={s.narrationText}>"{lastEntry.narration}"</Text>
            <View style={s.narrationFooter}>
              <Text style={s.narrationAuthor}>— {pet.name}</Text>
              {isDog ? <Dog size={rs(14)} color={colors.accent} strokeWidth={1.8} /> : <Cat size={rs(14)} color={colors.purple} strokeWidth={1.8} />}
            </View>
          </View>
        )}

        {/* ── Recent Timeline ── */}
        {diaryEntries.length > 0 && (
          <>
            <View style={s.timelineHeader}>
              <Text style={s.sectionLabel}>{t('pet.recentActivity')}</Text>
              <TouchableOpacity onPress={() => router.replace(`/pet/${id}/diary` as never)}>
                <Text style={s.seeAll}>{t('pet.seeAll')}</Text>
              </TouchableOpacity>
            </View>
            {diaryEntries.slice(0, 4).map((entry, i) => {
              const entryMood = moods.find((m) => m.id === entry.mood_id);
              return (
                <View key={entry.id} style={[s.timelineItem, i < Math.min(diaryEntries.length, 4) - 1 && s.timelineBorder]}>
                  <View style={[s.timelineDot, { backgroundColor: (entryMood?.color ?? colors.accent) + '15' }]}>
                    <BookOpen size={rs(16)} color={entryMood?.color ?? colors.accent} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.timelineTitle} numberOfLines={1}>{entry.content}</Text>
                    <Text style={s.timelineTime}>{formatRelativeDate(entry.created_at)}</Text>
                  </View>
                  <ChevronRight size={rs(12)} color={colors.accent} strokeWidth={1.8} />
                </View>
              );
            })}
          </>
        )}

        {/* ── Microchip ── */}
        {pet.microchip_id && (
          <View style={s.chipCard}>
            <QrCode size={rs(18)} color={colors.sky} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.chipLabel}>Microchip</Text>
              <Text style={s.chipValue}>{pet.microchip_id}</Text>
            </View>
            <TouchableOpacity style={s.chipQrBtn} onPress={() => router.push(`/pet/${id}/id-card` as never)} activeOpacity={0.7}>
              <QrCode size={rs(14)} color={colors.accent} strokeWidth={1.8} />
              <Text style={s.chipQrText}>{t('pet.qrCode')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: rs(20) }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: rs(20) },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: rs(18), paddingTop: rs(8), paddingBottom: rs(16) },
  avatar: { width: rs(90), height: rs(90), borderRadius: rs(28), backgroundColor: colors.bgCard, borderWidth: rs(3), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: rs(26) },
  cameraBtn: { position: 'absolute', bottom: rs(-4), right: rs(-4), width: rs(28), height: rs(28), borderRadius: rs(9), backgroundColor: colors.card, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: rs(10), marginBottom: rs(4) },
  petName: { fontFamily: 'Sora_700Bold', fontSize: fs(24), color: colors.text },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(4), paddingHorizontal: rs(10), paddingVertical: rs(3), borderRadius: rs(8) },
  moodDot: { width: rs(6), height: rs(6), borderRadius: rs(3) },
  moodText: { fontFamily: 'Sora_700Bold', fontSize: fs(10) },
  breedText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim, marginBottom: rs(8) },
  tagsRow: { flexDirection: 'row', gap: rs(6), flexWrap: 'wrap' },
  tag: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: rs(7), paddingHorizontal: rs(10), paddingVertical: rs(3) },
  tagText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim },

  // Photo options
  photoOpts: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  photoOptBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent + '30', borderRadius: radii.lg, paddingHorizontal: rs(14), paddingVertical: rs(10) },
  photoOptText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.accent },

  // Scores
  scoresRow: { flexDirection: 'row', gap: rs(8), marginBottom: spacing.md },
  scoreCard: { flex: 1, backgroundColor: colors.card, borderRadius: rs(18), padding: rs(16), alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  scoreValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(28) },
  scoreLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim, marginTop: rs(4) },
  scoreSub: { fontFamily: 'Sora_700Bold', fontSize: fs(9), marginTop: rs(2) },

  // Vaccine alert
  vaccineAlert: { flexDirection: 'row', alignItems: 'center', gap: rs(10), backgroundColor: colors.dangerSoft, borderRadius: rs(14), paddingHorizontal: rs(16), paddingVertical: rs(12), marginBottom: spacing.md, borderWidth: 1, borderColor: colors.danger + '18' },
  vaccineAlertText: { fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.danger, flex: 1 },

  // AI Personality
  aiCard: { backgroundColor: colors.purple + '08', borderRadius: rs(18), padding: rs(16), marginBottom: spacing.md, borderWidth: 1, borderColor: colors.purple + '12' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  aiLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.purple, letterSpacing: 0.5 },
  aiText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, lineHeight: fs(19) },

  // Section
  sectionLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textGhost, letterSpacing: 2, marginBottom: rs(14) },

  // MVP features
  mvpRow: { flexDirection: 'row', gap: rs(8), marginBottom: rs(10) },
  mvpCard: { flex: 1, backgroundColor: colors.card, borderRadius: rs(18), paddingVertical: rs(20), paddingHorizontal: rs(10), alignItems: 'center', gap: rs(10), borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  mvpBadge: { position: 'absolute', top: rs(8), right: rs(8), width: rs(20), height: rs(20), borderRadius: rs(6), backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  mvpBadgeText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(10), color: '#fff' },
  mvpIcon: { width: rs(48), height: rs(48), borderRadius: rs(16), alignItems: 'center', justifyContent: 'center' },
  mvpLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.text },
  mvpSub: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim },

  // Future features
  futureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8), marginBottom: spacing.md },
  futureCard: { width: '31%', backgroundColor: colors.card, borderRadius: rs(14), paddingVertical: rs(14), paddingHorizontal: rs(8), alignItems: 'center', gap: rs(6), borderWidth: 1, borderColor: colors.border },
  futureIcon: { width: rs(36), height: rs(36), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center' },
  futureLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.text, textAlign: 'center' },
  futureSub: { fontFamily: 'Sora_400Regular', fontSize: fs(8), color: colors.textDim, textAlign: 'center' },

  // Allergies
  allergiesCard: { backgroundColor: colors.dangerSoft, borderRadius: rs(14), padding: rs(14), marginBottom: spacing.md, borderWidth: 1, borderColor: colors.danger + '10' },
  allergiesHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(6) },
  allergiesTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.danger },
  allergiesRow: { flexDirection: 'row', gap: rs(6), flexWrap: 'wrap' },
  allergyChip: { backgroundColor: colors.danger + '15', borderRadius: rs(8), paddingHorizontal: rs(12), paddingVertical: rs(4) },
  allergyText: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.danger },

  // Narration
  narrationCard: { backgroundColor: colors.card, borderRadius: rs(20), padding: rs(18), marginBottom: spacing.md, borderWidth: 1, borderColor: colors.accent + '10' },
  narrationHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(12) },
  narrationLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.accent },
  narrationTime: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textGhost, marginLeft: rs(4) },
  narrationText: { fontFamily: 'Caveat_400Regular', fontSize: fs(15), color: colors.textSec, lineHeight: fs(27), fontStyle: 'italic' },
  narrationFooter: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginTop: rs(12), justifyContent: 'flex-end' },
  narrationAuthor: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim },

  // Timeline
  timelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rs(14) },
  seeAll: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.accent },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: rs(14), paddingVertical: rs(12) },
  timelineBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  timelineDot: { width: rs(36), height: rs(36), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center' },
  timelineTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },
  timelineTime: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textGhost, marginTop: rs(2) },

  // Microchip
  chipCard: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderRadius: rs(14), padding: rs(14), marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  chipLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim },
  chipValue: { fontFamily: 'JetBrainsMono_600SemiBold', fontSize: fs(13), color: colors.text, marginTop: rs(2) },
  chipQrBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(5), backgroundColor: colors.accent + '12', borderWidth: 1, borderColor: colors.accent + '20', borderRadius: rs(10), paddingHorizontal: rs(14), paddingVertical: rs(6) },
  chipQrText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.accent },
});
