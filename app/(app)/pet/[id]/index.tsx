/**
 * PetScreen — Single-route pet view with 4 tabs.
 *
 *   [Diário]  [Lentes]  [Agenda]  [IA]
 *
 * Routing: stays at /pet/[id] — tabs are internal state, not sub-routes.
 * Header (PetHeader) is fixed across all tabs.
 * Bottom nav (PetBottomNav) is fixed across all tabs.
 *
 * The Diário tab preserves all existing behavior:
 *   - Pet hero section (scores, allergies, personality) as DiaryTimeline headerExtra
 *   - Filters, FAB [+], pull-to-refresh
 *   - Photo upload on avatar tap
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Dog, Cat, Camera, AlertTriangle, ShieldCheck,
  Sparkles, Clock, ChevronLeft, FileText, Users, Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { moods } from '../../../../constants/moods';
import { usePet } from '../../../../hooks/usePets';
import { useVaccines, useAllergies, useMoodLogs } from '../../../../hooks/useHealth';
import { useDiary } from '../../../../hooks/useDiary';
import { useAuthStore } from '../../../../stores/authStore';
import { useMyPetRole } from '../../../../hooks/usePetMembers';
import { Skeleton } from '../../../../components/Skeleton';
import { useToast } from '../../../../components/Toast';
import { supabase } from '../../../../lib/supabase';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatAge, formatWeight } from '../../../../utils/format';
import DiaryTimeline from '../../../../components/diary/DiaryTimeline';
import PdfExportModal from '../../../../components/diary/PdfExportModal';
import { diaryEntryToEvent } from '../../../../components/diary/timelineTypes';
import PetBottomNav, { PetTab } from '../../../../components/layout/PetBottomNav';
import LentesTab from '../../../../components/pet/LentesTab';
import IATab from '../../../../components/pet/IATab';
import { AgendaLensContent } from '../../../../components/lenses/AgendaLensContent';

export default function PetScreen() {
  const { id, initialTab } = useLocalSearchParams<{ id: string; initialTab?: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);

  const myRole = useMyPetRole(id ?? '');
  const canSeeDeleted = myRole.isOwner || myRole.role === 'co_parent';

  const [activeTab, setActiveTab] = useState<PetTab>((initialTab as PetTab) ?? 'diario');
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);

  const { data: pet, isLoading, refetch } = usePet(id!);
  const { vaccines, overdueCount } = useVaccines(id!);
  const { allergies } = useAllergies(id!);
  const { moodLogs } = useMoodLogs(id!);
  const { entries: diaryEntries, isLoading: diaryLoading, refetch: diaryRefetch } = useDiary(id!);
  const isEnglish = i18n.language === 'en-US' || i18n.language === 'en';

  const timelineEvents = useMemo(() => {
    const events = diaryEntries.map(diaryEntryToEvent);
    events.sort((a, b) => b.sortDate - a.sortDate);
    return events;
  }, [diaryEntries]);

  const getMoodData = useCallback(
    (moodId: string | null | undefined) => {
      if (!moodId) return null;
      const mood = moods.find((m) => m.id === moodId);
      if (!mood) return null;
      return { label: isEnglish ? mood.label_en : mood.label, color: mood.color };
    },
    [isEnglish],
  );

  // ── Pet photo upload ──────────────────────────────────────────────────────

  const uploadPetPhoto = useCallback(async (uri: string) => {
    const FileSystem = require('expo-file-system/legacy');
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
    const fileName = `${user?.id}/${id}/${Date.now()}_avatar.jpg`;
    const { data: upData, error } = await supabase.storage
      .from('pets')
      .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });
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

  // ── Diary navigation ──────────────────────────────────────────────────────

  const onRefresh = useCallback(async () => {
    await Promise.all([refetch(), diaryRefetch()]);
  }, [refetch, diaryRefetch]);

  const handleNewEntry = useCallback(() => {
    router.push(`/pet/${id}/diary/new`);
  }, [router, id]);

  const handleEditEntry = useCallback((entryId: string) => {
    router.push(`/pet/${id}/diary/${entryId}/edit` as never);
  }, [router, id]);

  const handleOpenPdf = useCallback(() => {
    if (timelineEvents.length === 0) { toast(t('diary.emptyTitle'), 'warning'); return; }
    setPdfModalVisible(true);
  }, [timelineEvents.length, toast, t]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading || !pet) {
    return (
      <View style={s.safe}>
        <View style={s.loadingCenter}>
          <Skeleton width={rs(90)} height={rs(90)} radius={rs(28)} />
          <Skeleton width={rs(160)} height={rs(24)} style={{ marginTop: rs(16) }} />
          <Skeleton width={rs(260)} height={rs(80)} style={{ marginTop: rs(24) }} radius={rs(18)} />
        </View>
      </View>
    );
  }

  const isDog = pet.species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const latestMood = moodLogs.length > 0 ? moods.find((m) => m.id === moodLogs[0].mood_id) : null;


  // ── Pet hero section — used as DiaryTimeline headerExtra ─────────────────

  const petHeroSection = (
    <View style={s.heroWrapper}>
      {/* Avatar row */}
      <View style={s.heroRow}>
        <TouchableOpacity onPress={() => setShowPhotoOptions(!showPhotoOptions)} activeOpacity={0.8}>
          <View style={[s.avatar, { borderColor: petColor + '25' }]}>
            {pet.avatar_url ? (
              <Image source={{ uri: pet.avatar_url }} style={s.avatarImg} />
            ) : (
              isDog
                ? <Dog size={rs(48)} color={petColor} strokeWidth={1.5} />
                : <Cat size={rs(48)} color={petColor} strokeWidth={1.5} />
            )}
          </View>
          <View style={s.cameraBtn}>
            <Camera size={rs(14)} color={colors.accent} strokeWidth={1.8} />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <View style={s.nameRow}>
            <Text style={s.petName}>{pet.name}</Text>
            {pet.sex && (
              <Text style={{ fontFamily: 'Sora_700Bold', fontSize: fs(16), color: pet.sex === 'male' ? colors.petrol : colors.rose }}>
                {pet.sex === 'male' ? '♂' : '♀'}
              </Text>
            )}
            {pet.blood_type && (
              <View style={s.bloodBadge}>
                <Text style={s.bloodText}>{pet.blood_type}</Text>
              </View>
            )}
            {latestMood && (
              <View style={[s.moodBadge, { backgroundColor: latestMood.color + '15' }]}>
                <View style={[s.moodDot, { backgroundColor: latestMood.color }]} />
                <Text style={[s.moodText, { color: latestMood.color }]}>
                  {isEnglish ? latestMood.label_en : latestMood.label}
                </Text>
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


      {/* Vaccine alert */}
      {overdueCount > 0 && (
        <TouchableOpacity
          style={s.vaccineAlert}
          onPress={() => router.push(`/pet/${id}/health` as never)}
          activeOpacity={0.7}
        >
          <AlertTriangle size={rs(16)} color={colors.danger} strokeWidth={2} />
          <Text style={s.vaccineAlertText}>{overdueCount} {t('health.vaccineOverdue')}</Text>
          <ShieldCheck size={rs(14)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      )}

      {/* AI Personality */}
      {pet.ai_personality && (
        <View style={s.aiCard}>
          <View style={s.aiHeader}>
            <Sparkles size={rs(14)} color={colors.purple} strokeWidth={1.8} />
            <Text style={s.aiLabel}>{t('pet.personality')}</Text>
          </View>
          <Text style={s.aiText}>{pet.ai_personality}</Text>
        </View>
      )}

      {/* Allergies */}
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


    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={[]}>
      {/* Header — back + pet name + PDF (diary tab only) */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{pet.name}</Text>
        <View style={s.headerRight}>
          {canSeeDeleted && (
            <TouchableOpacity
              onPress={() => router.push(`/pet/${id}/deleted-records` as never)}
              style={s.headerBtn}
              activeOpacity={0.7}
            >
              <Trash2 size={rs(20)} color={colors.danger} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.push(`/pet/${id}/coparents` as never)}
            style={s.headerBtn}
            activeOpacity={0.7}
          >
            <Users size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          {activeTab === 'diario' && (
            <TouchableOpacity onPress={handleOpenPdf} style={s.headerBtn} activeOpacity={0.7}>
              <FileText size={rs(20)} color="#FFFFFF" strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab content */}
      <View style={s.tabContent}>

        {/* ── Aba Diário ─────────────────────────────────────────── */}
        {activeTab === 'diario' && (
          <DiaryTimeline
            entries={diaryEntries}
            isLoading={diaryLoading}
            petName={pet.name}
            petSpecies={pet.species}
            petAvatarUrl={pet.avatar_url}
            petCreatedAt={pet.created_at}
            petPersonality={pet.ai_personality}
            onRefresh={onRefresh}
            onNewEntry={handleNewEntry}
            onEditEntry={handleEditEntry}
            headerExtra={petHeroSection}
          />
        )}

        {/* ── Aba Painel ─────────────────────────────────────────── */}
        {activeTab === 'painel' && (
          <LentesTab
            petId={id!}
            petName={pet.name}
            overdueVaccines={overdueCount}
          />
        )}

        {/* ── Aba Agenda ─────────────────────────────────────────── */}
        {activeTab === 'agenda' && (
          <AgendaLensContent
            petId={id!}
            petName={pet.name}
          />
        )}

        {/* ── Aba IA ─────────────────────────────────────────────── */}
        {activeTab === 'ia' && (
          <IATab petId={id!} petName={pet?.name} />
        )}
      </View>

      {/* Fixed bottom nav */}
      <PetBottomNav active={activeTab} onChange={setActiveTab} />

      {/* PDF export modal (used from Diário tab) */}
      <PdfExportModal
        visible={pdfModalVisible}
        onClose={() => setPdfModalVisible(false)}
        events={timelineEvents}
        petName={pet.name}
        getMoodData={getMoodData}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(8), gap: rs(12), borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: rs(40), height: rs(40), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  tabContent: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  // Hero wrapper (passed as DiaryTimeline headerExtra)
  heroWrapper: { paddingHorizontal: rs(16), paddingBottom: rs(8), gap: rs(12) },

  // Avatar row
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: rs(18), paddingTop: rs(8) },
  avatar: { width: rs(90), height: rs(90), borderRadius: rs(28), backgroundColor: colors.bgCard, borderWidth: rs(3), alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: rs(26) },
  cameraBtn: { position: 'absolute', bottom: rs(-4), right: rs(-4), width: rs(28), height: rs(28), borderRadius: rs(9), backgroundColor: colors.card, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(4), flexWrap: 'wrap' },
  petName: { fontFamily: 'Sora_700Bold', fontSize: fs(24), color: colors.text },
  moodBadge: { flexDirection: 'row', alignItems: 'center', gap: rs(4), paddingHorizontal: rs(10), paddingVertical: rs(3), borderRadius: rs(8) },
  moodDot: { width: rs(6), height: rs(6), borderRadius: rs(3) },
  moodText: { fontFamily: 'Sora_700Bold', fontSize: fs(10) },
  bloodBadge: { backgroundColor: colors.danger + '12', paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(6) },
  bloodText: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(10), color: colors.danger },
  breedText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim, marginBottom: rs(6) },
  tagsRow: { flexDirection: 'row', gap: rs(6), flexWrap: 'wrap' },
  tag: { backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: rs(7), paddingHorizontal: rs(10), paddingVertical: rs(3) },
  tagText: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim },

  // Photo options
  photoOpts: { flexDirection: 'row', gap: spacing.sm },
  photoOptBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.accent + '30', borderRadius: radii.lg, paddingHorizontal: rs(14), paddingVertical: rs(10) },
  photoOptText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.accent },


  // Vaccine alert
  vaccineAlert: { flexDirection: 'row', alignItems: 'center', gap: rs(8), backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger + '40', borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(10) },
  vaccineAlertText: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(12), color: colors.danger },

  // AI Personality
  aiCard: { backgroundColor: colors.bgCard, borderRadius: rs(18), borderWidth: 1, borderColor: colors.purple + '20', padding: rs(16), gap: rs(8) },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  aiLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.purple, letterSpacing: 0.8 },
  aiText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: fs(20) },

  // Allergies
  allergiesCard: { backgroundColor: colors.dangerSoft, borderRadius: rs(14), borderWidth: 1, borderColor: colors.danger + '30', padding: rs(14), gap: rs(8) },
  allergiesHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  allergiesTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.danger, letterSpacing: 1 },
  allergiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  allergyChip: { backgroundColor: colors.danger + '15', borderRadius: rs(8), paddingHorizontal: rs(10), paddingVertical: rs(4) },
  allergyText: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.danger },

});
