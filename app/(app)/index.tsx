import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Menu,
  Bell,
  Plus,
  AlertTriangle,
  Sparkles,
  Dog,
  Cat,
  ChevronRight,
  FileText,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import AuExpertLogo from '../../components/AuExpertLogo';
import PetCard from '../../components/PetCard';
import type { PetCardData } from '../../components/PetCard';
import TutorCard from '../../components/TutorCard';
import RedeSolidariaCard from '../../components/RedeSolidariaCard';
import DrawerMenu from '../../components/DrawerMenu';
import { HubSkeleton } from '../../components/Skeleton';
import AddPetModal from '../../components/AddPetModal';
import type { AddPetData } from '../../components/AddPetModal';
import { useToast } from '../../components/Toast';
import { usePets } from '../../hooks/usePets';
import { usePetSearch } from '../../hooks/usePetSearch';
import { usePreferencesStore } from '../../stores/usePreferencesStore';
import { UI_THRESHOLDS } from '../../constants/uiThresholds';
import PetListHeader from '../../components/pets/PetListHeader';
import PetRowCompact from '../../components/pets/PetRowCompact';
import { useBackfillRAG } from '../../hooks/useBackfillRAG';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../utils/errorMessages';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../lib/withTimeout';

interface TutorProfile {
  full_name: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  xp: number;
  level: number;
  created_at: string | null;
  /**
   * Papel do user logado.
   * 'tutor_owner' e 'admin' podem cadastrar pets; profissionais não.
   */
  role: string | null;
}

/** Roles autorizados a criar pets (regra de negócio 2026-04-25). */
const ROLES_CAN_ADD_PET = new Set(['tutor_owner', 'admin']);

export default function HubScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [addPetVisible, setAddPetVisible] = useState(false);
  const { pets, isLoading, refetch, addPet, isAdding } = usePets();
  const { user } = useAuth();
  const { toast } = useToast();
  const { query, setQuery, filtered, recent, isSearching } = usePetSearch(pets);
  const { petListDensity, toggleDensity, hasSeenSearchHint, markSearchHintSeen } = usePreferencesStore();

  // Fire-and-forget RAG backfill for pre-existing pets (runs once per install
  // per pet; no UI effect — see hooks/useBackfillRAG.ts for rationale).
  useBackfillRAG(pets);

  useEffect(() => {
    if (Platform.OS === 'android') {
      UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const prevPetCountRef = useRef(pets.length);
  useEffect(() => {
    if (!hasSeenSearchHint && prevPetCountRef.current < UI_THRESHOLDS.SEARCH && pets.length >= UI_THRESHOLDS.SEARCH) {
      toast(t('pets.searchHintBody'), 'info');
      markSearchHintSeen();
    }
    prevPetCountRef.current = pets.length;
  }, [pets.length, hasSeenSearchHint, markSearchHintSeen, toast, t]);

  // LOG TEMPORÁRIO — remover após diagnóstico
  console.log('[Hub] pets:', pets.length, '| isLoading:', isLoading, '| user:', user?.id ?? 'NULL');
  const [refreshing, setRefreshing] = useState(false);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);
  const [diaryCount, setDiaryCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);

  // LOG TEMPORÁRIO — verificar sessão Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      console.log('[Hub] session user:', data.session?.user?.id ?? 'NULL');
    });
  }, []);

  // Carregar perfil do tutor + contadores
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const userId = session.user.id;

      // Perfil
      const { data } = await supabase
        .from('users')
        .select('full_name, avatar_url, city, state, xp, level, created_at, role')
        .eq('id', userId)
        .single();
      if (data) {
        setTutorProfile(data as TutorProfile);
        // Primeiro login: redirecionar para completar o perfil se nome estiver vazio
        // Só redireciona se a conta foi criada há menos de 2 minutos (primeiro login real)
        if (!data.full_name?.trim() && data.created_at) {
          const createdMs = new Date(data.created_at).getTime();
          const ageMinutes = (Date.now() - createdMs) / 60000;
          if (ageMinutes < 2) {
            router.push('/profile' as never);
          }
        }
      }

      // Contadores — buscar pets do tutor e contar entradas/análises
      const { data: userPets } = await supabase
        .from('pets')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);
      const petIds = userPets?.map((p) => p.id) ?? [];

      if (petIds.length > 0) {
        const { count: dCount } = await supabase
          .from('diary_entries')
          .select('id', { count: 'exact', head: true })
          .in('pet_id', petIds);
        setDiaryCount(dCount ?? 0);

        const { count: pCount } = await supabase
          .from('photo_analyses')
          .select('id', { count: 'exact', head: true })
          .in('pet_id', petIds);
        setPhotoCount(pCount ?? 0);
      }
    })();
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const userName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Tutor';
  const userEmail = user?.email ?? '';

  const petCards: PetCardData[] = pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    sex: p.sex,
    breed: p.breed,
    weight_kg: p.weight_kg,
    health_score: p.health_score,
    current_mood: null,
    user_id: p.user_id,
    estimated_age_months: p.estimated_age_months,
    vaccine_status: 'up_to_date' as const,
    last_activity: p.updated_at,
    avatar_url: p.avatar_url,
    last_diary_entry: p.updated_at ?? null,
    agenda_count: null,
  }));

  const filteredCards: PetCardData[] = filtered.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    sex: p.sex,
    breed: p.breed,
    weight_kg: p.weight_kg,
    health_score: p.health_score,
    current_mood: null,
    user_id: p.user_id,
    estimated_age_months: p.estimated_age_months,
    vaccine_status: 'up_to_date' as const,
    last_activity: p.updated_at,
    avatar_url: p.avatar_url,
    last_diary_entry: p.updated_at ?? null,
    agenda_count: null,
  }));

  const hasOverdueVaccine = petCards.some(
    (p) => p.vaccine_status === 'overdue',
  );

  const handlePetPress = useCallback(
    (id: string) => {
      router.push(`/pet/${id}` as never);
    },
    [router],
  );

  const handlePressDiary = useCallback(
    (id: string) => { router.push(`/pet/${id}` as never); },
    [router],
  );

  const handleAddPet = useCallback(() => {
    setAddPetVisible(true);
  }, []);

  const handleToggleDensity = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    toggleDensity();
  }, [toggleDensity]);

  const handleAddPetSubmit = useCallback(
    async (data: AddPetData) => {
      try {
        // Upload da foto comprimida como avatar do pet no Supabase Storage
        let avatarUrl: string | null = null;
        if (data.photoUri && user?.id) {
          try {
            const FileSystem = require('expo-file-system/legacy');
            const base64 = await FileSystem.readAsStringAsync(data.photoUri, { encoding: 'base64' });
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }

            const fileName = `${user.id}/${Date.now()}_pet_avatar.jpg`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('pets')
              .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: false });

            if (uploadErr) {
              console.warn('[Hub] Pet avatar upload error:', uploadErr.message);
            } else if (uploadData?.path) {
              const { data: urlData } = supabase.storage.from('pets').getPublicUrl(uploadData.path);
              avatarUrl = urlData.publicUrl;
            }
          } catch (e) {
            console.warn('[Hub] Pet avatar upload failed:', e);
          }
        }

        const petPayload = {
          name: data.name,
          species: data.species,
          sex: data.sex,
          neutered: data.neutered ?? false,
          birth_date: data.birth_date,
          breed: data.breed ?? null,
          estimated_age_months: data.estimated_age_months ?? null,
          weight_kg: data.weight_kg ?? null,
          size: data.size ?? null,
          color: data.color ?? null,
          blood_type: data.blood_type ?? null,
          current_mood: data.mood ?? null,
          avatar_url: avatarUrl,
          user_id: user?.id ?? '',
        };
        const newPet = await addPet(petPayload as Parameters<typeof addPet>[0]);

        // Salvar análise completa da IA na tabela photo_analyses
        if (data.full_analysis && newPet?.id && user?.id) {
          try {
            await supabase.from('photo_analyses').insert({
              pet_id: newPet.id,
              user_id: user.id,
              photo_url: avatarUrl ?? '',
              analysis_type: 'general',
              findings: data.full_analysis,
              raw_ai_response: data.full_analysis,
              confidence: data.full_analysis.breed?.confidence ?? 0,
            });
          } catch (e) {
            console.warn('[Hub] Failed to save photo analysis:', e);
          }
        }

        // Gravar entrada no diário de registro — sempre, independente de ter análise de foto
        console.log('[REG-DIARY] iniciando | newPet:', newPet?.id?.slice(-8), '| user:', user?.id?.slice(-8), '| avatarUrl:', !!avatarUrl, '| full_analysis:', !!data.full_analysis);
        if (newPet?.id && user?.id) {
          try {
            const fa = data.full_analysis ?? null;
            const breedName = fa?.breed?.name ?? fa?.identification?.breed?.primary ?? null;
            const mood = fa?.mood?.primary ?? null;
            const ageMonths = fa?.estimated_age_months ?? fa?.identification?.estimated_age_months ?? null;
            const weight = fa?.estimated_weight_kg ?? fa?.identification?.estimated_weight_kg ?? null;
            const color = fa?.color ?? fa?.identification?.coat?.color ?? null;
            const size = fa?.size ?? fa?.identification?.size ?? null;

            console.log('[REG-DIARY] fa:', !!fa, '| breed:', breedName, '| mood:', mood, '| ageMonths:', ageMonths);

            // Resumo estruturado passado como contexto para a narração (nunca exibido diretamente)
            const parts: string[] = [];
            if (breedName) parts.push(`breed:${breedName}`);
            if (ageMonths != null) parts.push(`age_months:${ageMonths}`);
            if (weight != null) parts.push(`weight_kg:${weight}`);
            if (size) parts.push(`size:${size}`);
            if (color) parts.push(`color:${color}`);
            if (mood) parts.push(`mood:${mood}`);
            const analysisContext = parts.join(',');

            // Content visível ao tutor — sempre legível, mesmo sem narração
            const visibleContent = i18n.t('addPet.registrationDayContent', { name: data.name });
            console.log('[REG-DIARY] visibleContent:', visibleContent?.slice(0, 60));

            // Gera narração em 3ª pessoa via Edge Function
            let narration: string | null = null;
            try {
              console.log('[REG-DIARY] chamando generate-diary-narration...');
              const { data: narData } = await withTimeout(
                supabase.functions.invoke('generate-diary-narration', {
                  body: {
                    pet_id: newPet.id,
                    content: analysisContext || data.name,
                    mood_id: mood ?? 'happy',
                    language: i18n.language,
                    context: 'pet_registration',
                  },
                }),
                140000,
                'generate-diary-narration:registration',
              );
              narration = narData?.narration ?? null;
              console.log('[REG-DIARY] narration OK:', narration?.slice(0, 60) ?? 'null');
            } catch (e) {
              console.warn('[REG-DIARY] narration falhou (não bloqueante):', e);
            }

            // Cria a entrada sempre — narração e foto são opcionais
            console.log('[REG-DIARY] inserindo entry | entry_type:', fa ? 'photo_analysis' : 'manual', '| hasPhotos:', !!avatarUrl, '| hasAnalysis:', !!fa, '| hasNarration:', !!narration);
            const { error: insertErr } = await supabase.from('diary_entries').insert({
              pet_id: newPet.id,
              user_id: user.id,
              content: visibleContent,
              input_type: 'text',
              input_method: 'text',
              primary_type: 'moment',
              entry_type: fa ? 'photo_analysis' : 'manual',
              ...(fa ? { photo_analysis_data: fa } : {}),
              ...(narration ? { narration } : {}),
              mood_id: mood ?? 'happy',
              mood_score: 80,
              mood_source: 'ai_suggested',
              ...(avatarUrl ? { photos: [avatarUrl] } : {}),
              tags: ['registration'],
              is_special: true,
              is_registration_entry: true,
              is_active: true,
              entry_date: new Date().toISOString().split('T')[0],
            });
            if (insertErr) {
              console.error('[REG-DIARY] INSERT FALHOU:', insertErr.message, '| code:', insertErr.code, '| details:', insertErr.details);
            } else {
              console.log('[REG-DIARY] INSERT OK');
            }
          } catch (e) {
            console.warn('[REG-DIARY] erro geral (não bloqueante):', e);
          }
        } else {
          console.warn('[REG-DIARY] pulando — newPet.id:', newPet?.id, '| user.id:', user?.id);
        }

        setAddPetVisible(false);
        toast(t('toast.petCreated', { name: data.name }), 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Hub] addPet FAILED:', msg, err);
        toast(getErrorMessage(err), 'error');
      }
    },
    [addPet, user?.id, toast, t, i18n.language],
  );

  // ── Header da lista ──────────────────────────────

  const renderHeader = useCallback(
    () => {
      const memberDate = tutorProfile?.created_at
        ? new Date(tutorProfile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : '';
      return (
        <PetListHeader
          totalPets={pets.length}
          density={petListDensity}
          onToggleDensity={handleToggleDensity}
          onAddPet={handleAddPet}
          // Profissionais não podem cadastrar pets — só veem os delegados
          canAddPet={ROLES_CAN_ADD_PET.has(tutorProfile?.role ?? 'tutor_owner')}
          query={query}
          onChangeQuery={setQuery}
          recent={recent}
          onSelectRecent={(name) => setQuery(name)}
          isSearching={isSearching}
        >
          {/* Breed Intelligence — conteúdo clínico exclusivo por raça (Elite) */}
          <RedeSolidariaCard
            city={tutorProfile?.city ?? undefined}
            aldeiaName={tutorProfile?.city ? t('rede.village') : undefined}
            tutorCount={0}
            sosCount={0}
            newRequests={0}
            onPress={() => {
              // Navega pra Breed Intelligence do primeiro pet com raça definida
              const firstPet = pets?.find(p => !!p.breed) ?? pets?.[0];
              if (firstPet) {
                router.push(`/pet/${firstPet.id}/breed-intelligence`);
              } else {
                toast(t('rede.comingSoon'), 'info');
              }
            }}
          />

          {/* Tutor card */}
          <TutorCard
            name={userName}
            email={userEmail}
            avatarUrl={tutorProfile?.avatar_url}
            city={tutorProfile?.city}
            state={tutorProfile?.state}
            memberSince={memberDate}
            petsCount={pets.length}
            diaryCount={diaryCount}
            photoCount={photoCount}
            coTutorsCount={0}
            level={tutorProfile?.level ?? 1}
            xp={tutorProfile?.xp ?? 0}
            xpNext={1000}
            onPress={() => router.push('/(app)/profile' as never)}
            onPressPartnership={() => router.push('/(app)/partnerships' as never)}
          />

          {/* Vaccine alert */}
          {hasOverdueVaccine && (
            <TouchableOpacity style={styles.vaccineAlert} activeOpacity={0.7}>
              <AlertTriangle size={rs(18)} color={colors.danger} strokeWidth={2} />
              <Text style={styles.vaccineAlertText}>
                {t('pets.vaccinesOverdue', 'Vacinas atrasadas! Verifique o prontuario.')}
              </Text>
              <ChevronRight size={rs(16)} color={colors.danger} strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </PetListHeader>
      );
    },
    [pets.length, petListDensity, handleToggleDensity, handleAddPet, query, setQuery, recent, isSearching, userName, userEmail, hasOverdueVaccine, t, toast, router, tutorProfile, diaryCount, photoCount],
  );

  // ── Footer da lista ──────────────────────────────

  const renderFooter = useCallback(
    () => (
      <>
        {/* AI insight card */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Sparkles size={rs(18)} color={colors.ai} strokeWidth={1.8} />
            <Text style={styles.insightLabel}>{t('pets.insightLabel')}</Text>
          </View>
          <Text style={styles.insightText}>
            {pets.length > 0
              ? t('pets.insightWithPets')
              : t('pets.insightNoPets')}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </>
    ),
    [pets.length, t, handleAddPet],
  );

  // ── Render item ──────────────────────────────────

  const handleEditPet = useCallback((petId: string) => {
    router.push(`/pet/${petId}/edit` as never);
  }, [router]);

  const renderPetCard = useCallback(
    ({ item }: { item: PetCardData }) => {
      if (petListDensity === 'compact') {
        return <PetRowCompact pet={item} onPress={handlePetPress} />;
      }
      return (
        <PetCard
          pet={item}
          onPress={() => handlePetPress(item.id)}
          onEdit={() => handleEditPet(item.id)}
          onPressIA={() => router.push({ pathname: `/pet/${item.id}`, params: { initialTab: 'ia' } } as never)}
          onPressDiary={() => handlePressDiary(item.id)}
          onPressAgenda={() => router.push({ pathname: `/pet/${item.id}`, params: { initialTab: 'agenda' } } as never)}
          onPressMembers={() => router.push(`/pet/${item.id}/coparents` as never)}
        />
      );
    },
    [petListDensity, handlePetPress, handleEditPet, handlePressDiary, router],
  );

  // ── Empty state ──────────────────────────────────

  const renderEmpty = useCallback(
    () => {
      if (isSearching) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {t('pets.noResults', { query })}
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { marginTop: rs(16) }]}
              onPress={() => setQuery('')}
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyBtnText, { color: colors.click }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (!isLoading) {
        return (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconRow}>
              <Dog size={rs(40)} color={colors.click + '50'} strokeWidth={1.5} />
              <Cat size={rs(40)} color={colors.click + '50'} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>{t('pets.noPets')}</Text>
            <Text style={styles.emptyText}>{t('pets.noPetsHint')}</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              activeOpacity={0.7}
              onPress={handleAddPet}
            >
              <View style={[styles.emptyBtnGradient, { backgroundColor: colors.click }]}>
                <Plus size={rs(20)} color="#fff" strokeWidth={2} />
                <Text style={styles.emptyBtnText}>{t('pets.registerFirstPet')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        );
      }
      return null;
    },
    [isSearching, query, setQuery, isLoading, handleAddPet, t],
  );

  // ── Loading skeleton ─────────────────────────────

  if (isLoading && pets.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Ambient glow */}
          <LinearGradient
            colors={[colors.click + '08', 'transparent']}
            style={styles.ambientGlow}
          />
          <View style={styles.header}>
            <View style={styles.headerBtn} />
            <AuExpertLogo size="normal" showIcon={false} />
            <View style={styles.headerBtn} />
          </View>
          <HubSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ──────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Ambient glow */}
        <LinearGradient
          colors={[colors.click + '08', 'transparent']}
          style={styles.ambientGlow}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={styles.headerBtn}
          >
            <Menu size={rs(24)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <AuExpertLogo size="normal" showIcon={false} />
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              onPress={() => router.push('/profile-pdf' as never)}
              style={styles.headerBtnCompact}
              accessibilityLabel={t('hubPdf.icon')}
            >
              <FileText size={rs(22)} color={colors.click} strokeWidth={1.8} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/notifications' as never)}
              style={styles.headerBtnCompact}
            >
              <Bell size={rs(22)} color={colors.click} strokeWidth={1.8} />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pet list */}
        <FlatList
          data={filteredCards}
          keyExtractor={(item) => item.id}
          renderItem={renderPetCard}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={filteredCards.length > 0 ? renderFooter : undefined}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.scrollContent,
            filteredCards.length === 0 && styles.scrollContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.click}
              colors={[colors.click]}
              progressBackgroundColor={colors.card}
            />
          }
        />

        {/* Drawer menu */}
        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={tutorProfile?.avatar_url}
        />

        {/* Add Pet modal */}
        <AddPetModal
          visible={addPetVisible}
          onClose={() => setAddPetVisible(false)}
          onSubmit={handleAddPetSubmit}
          isSubmitting={isAdding}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: rs(200),
    zIndex: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(20),
    paddingTop: rs(12),
    paddingBottom: rs(16),
    zIndex: 1,
  },
  headerBtn: {
    width: rs(44),
    height: rs(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(2),
  },
  headerBtnCompact: {
    width: rs(40),
    height: rs(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: rs(10),
    right: rs(8),
    width: rs(8),
    height: rs(8),
    borderRadius: rs(4),
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: rs(20),
  },
  scrollContentEmpty: {
    flexGrow: 1,
  },
  vaccineAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    borderRadius: radii.xl,
    paddingHorizontal: rs(14),
    paddingVertical: rs(14),
    marginBottom: rs(20),
    gap: rs(8),
  },
  vaccineAlertText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.danger,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rs(20),
    marginTop: rs(8),
  },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textGhost,
    letterSpacing: 2,
  },
  newPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.click,
    borderRadius: radii.md,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    gap: rs(6),
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.25,
    shadowRadius: rs(12),
    elevation: 4,
  },
  newPetBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: '#fff',
  },
  insightCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.ai + '30',
    borderRadius: radii.xxl,
    padding: rs(18),
    marginBottom: spacing.lg,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginBottom: rs(10),
  },
  insightLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.ai,
    letterSpacing: 1,
  },
  insightText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: rs(20),
  },
  bottomSpacer: {
    height: rs(24),
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: rs(60),
  },
  emptyIconRow: {
    flexDirection: 'row',
    gap: rs(20),
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(20),
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: rs(22),
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
    maxWidth: rs(280),
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: rs(52),
    gap: rs(8),
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: rs(8) },
    shadowOpacity: 0.25,
    shadowRadius: rs(20),
    elevation: 6,
  },
  emptyBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: '#fff',
  },
});
