import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import PetauLogo from '../../components/PetauLogo';
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
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { getErrorMessage } from '../../utils/errorMessages';
import { supabase } from '../../lib/supabase';

interface TutorProfile {
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  xp: number;
  level: number;
  created_at: string | null;
}

export default function HubScreen() {
  console.log('[HubScreen] Renderizando...');
  const { t } = useTranslation();
  const router = useRouter();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [addPetVisible, setAddPetVisible] = useState(false);
  const { pets, isLoading, refetch, addPet, isAdding } = usePets();
  const { user } = useAuth();
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [tutorProfile, setTutorProfile] = useState<TutorProfile | null>(null);

  // Carregar perfil do tutor
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) return;
    // Buscar com auth.uid() via RLS — não depende de user?.id do store
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        console.log('[Hub] No session for tutor profile');
        return;
      }
      const { data, error } = await supabase
        .from('users')
        .select('avatar_url, city, state, xp, level, created_at')
        .eq('id', session.user.id)
        .single();
      console.log('[Hub] Tutor profile:', { avatar: !!data?.avatar_url, city: data?.city, err: error?.message });
      if (data) setTutorProfile(data as TutorProfile);
    })();
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const userName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Tutor';
  const userEmail = user?.email ?? '';
  console.log('[Hub] user:', { id: user?.id, name: userName, hasAvatar: !!tutorProfile?.avatar_url });

  const petCards: PetCardData[] = pets.map((p) => ({
    id: p.id,
    name: p.name,
    species: p.species,
    breed: p.breed,
    weight_kg: p.weight_kg,
    health_score: p.health_score,
    happiness_score: null,
    current_mood: null,
    user_id: p.user_id,
    estimated_age_months: p.estimated_age_months,
    diary_count: 0,
    photo_count: 0,
    vaccine_status: 'up_to_date' as const,
    last_activity: p.updated_at,
    avatar_url: p.avatar_url,
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

  const handleAddPet = useCallback(() => {
    setAddPetVisible(true);
  }, []);

  const handleAddPetSubmit = useCallback(
    async (data: AddPetData) => {
      console.log('[Hub] handleAddPetSubmit called:', JSON.stringify({
        name: data.name, species: data.species, breed: data.breed,
        age: data.estimated_age_months, weight: data.weight_kg,
        size: data.size, color: data.color, mood: data.mood,
        hasAnalysis: !!data.full_analysis, userId: user?.id,
      }));
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
            console.log('[Hub] Pet photo size:', Math.round(bytes.length / 1024), 'KB');

            const fileName = `${user.id}/${Date.now()}_pet_avatar.jpg`;
            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('pets')
              .upload(fileName, bytes, { contentType: 'image/jpeg', upsert: false });

            if (uploadErr) {
              console.warn('[Hub] Pet avatar upload error:', uploadErr.message);
            } else if (uploadData?.path) {
              const { data: urlData } = supabase.storage.from('pets').getPublicUrl(uploadData.path);
              avatarUrl = urlData.publicUrl;
              console.log('[Hub] Pet avatar uploaded:', avatarUrl);
            }
          } catch (e) {
            console.warn('[Hub] Pet avatar upload failed:', e);
          }
        }

        const petPayload = {
          name: data.name,
          species: data.species,
          breed: data.breed ?? null,
          estimated_age_months: data.estimated_age_months ?? null,
          weight_kg: data.weight_kg ?? null,
          size: data.size ?? null,
          color: data.color ?? null,
          current_mood: data.mood ?? null,
          avatar_url: avatarUrl,
          user_id: user?.id ?? '',
        };
        console.log('[Hub] Creating pet with avatar:', !!avatarUrl);
        const newPet = await addPet(petPayload as Parameters<typeof addPet>[0]);
        console.log('[Hub] Pet created:', newPet?.id);

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

        setAddPetVisible(false);
        toast(t('toast.petCreated', { name: data.name }), 'success');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Hub] addPet FAILED:', msg, err);
        toast(getErrorMessage(err), 'error');
      }
    },
    [addPet, user?.id, toast, t],
  );

  // ── Header da lista ──────────────────────────────

  const renderHeader = useCallback(
    () => {
      const memberDate = tutorProfile?.created_at
        ? new Date(tutorProfile.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
        : '';
      return (
      <>
        {/* Rede Solidária */}
        <RedeSolidariaCard
          city={tutorProfile?.city ?? undefined}
          aldeiaName={tutorProfile?.city ? t('rede.village') : undefined}
          tutorCount={0}
          sosCount={0}
          newRequests={0}
          onPress={() => toast(t('rede.comingSoon'), 'info')}
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
          diaryCount={0}
          photoCount={0}
          level={tutorProfile?.level ?? 1}
          xp={tutorProfile?.xp ?? 0}
          xpNext={1000}
          onPress={() => router.push('/(app)/profile' as never)}
        />

        {/* Vaccine alert */}
        {hasOverdueVaccine && (
          <TouchableOpacity style={styles.vaccineAlert} activeOpacity={0.7}>
            <AlertTriangle
              size={rs(18)}
              color={colors.danger}
              strokeWidth={2}
            />
            <Text style={styles.vaccineAlertText}>
              {t(
                'pets.vaccinesOverdue',
                'Vacinas atrasadas! Verifique o prontuario.',
              )}
            </Text>
            <ChevronRight
              size={rs(16)}
              color={colors.danger}
              strokeWidth={1.8}
            />
          </TouchableOpacity>
        )}

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            {t('pets.myPets', 'MEUS PETS').toUpperCase()}
          </Text>
          <TouchableOpacity
            style={styles.newPetBtn}
            activeOpacity={0.7}
            onPress={handleAddPet}
          >
            <Plus size={rs(16)} color="#fff" strokeWidth={2} />
            <Text style={styles.newPetBtnText}>
              {t('pets.addNew', 'Novo Pet')}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );},
    [pets, userName, userEmail, hasOverdueVaccine, t, handleAddPet, router, tutorProfile],
  );

  // ── Footer da lista ──────────────────────────────

  const renderFooter = useCallback(
    () => (
      <>
        {/* AI insight card */}
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Sparkles size={rs(18)} color={colors.purple} strokeWidth={1.8} />
            <Text style={styles.insightLabel}>INSIGHT DA IA</Text>
          </View>
          <Text style={styles.insightText}>
            {pets.length > 0
              ? 'Seus pets estao bem cuidados. Continue registrando o diario para insights mais detalhados.'
              : 'Cadastre seu primeiro pet para receber insights personalizados da IA.'}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </>
    ),
    [pets.length, t, handleAddPet],
  );

  // ── Render item ──────────────────────────────────

  const renderPetCard = useCallback(
    ({ item }: { item: PetCardData }) => (
      <PetCard pet={item} onPress={() => handlePetPress(item.id)} />
    ),
    [handlePetPress],
  );

  // ── Empty state ──────────────────────────────────

  const renderEmpty = useCallback(
    () =>
      !isLoading ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconRow}>
            <Dog size={rs(40)} color={colors.accent + '50'} strokeWidth={1.5} />
            <Cat size={rs(40)} color={colors.purple + '50'} strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>Nenhum pet cadastrado</Text>
          <Text style={styles.emptyText}>
            Cadastre seu primeiro pet e comece a usar a inteligencia do
            PetauLife+
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            activeOpacity={0.7}
            onPress={handleAddPet}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentDark]}
              style={styles.emptyBtnGradient}
            >
              <Plus size={rs(20)} color="#fff" strokeWidth={2} />
              <Text style={styles.emptyBtnText}>Cadastrar meu pet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null,
    [isLoading, handleAddPet],
  );

  // ── Loading skeleton ─────────────────────────────

  if (isLoading && pets.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Ambient glow */}
          <LinearGradient
            colors={[colors.accent + '08', 'transparent']}
            style={styles.ambientGlow}
          />
          <View style={styles.header}>
            <View style={styles.headerBtn} />
            <PetauLogo size="normal" showIcon={false} />
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
          colors={[colors.accent + '08', 'transparent']}
          style={styles.ambientGlow}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setDrawerVisible(true)}
            style={styles.headerBtn}
          >
            <Menu size={rs(24)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <PetauLogo size="normal" showIcon={false} />
          <TouchableOpacity style={styles.headerBtn}>
            <Bell size={rs(24)} color={colors.accent} strokeWidth={1.8} />
            <View style={styles.bellDot} />
          </TouchableOpacity>
        </View>

        {/* Pet list */}
        <FlatList
          data={petCards}
          keyExtractor={(item) => item.id}
          renderItem={renderPetCard}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={petCards.length > 0 ? renderFooter : undefined}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.scrollContent,
            petCards.length === 0 && styles.scrollContentEmpty,
          ]}
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
        />

        {/* Drawer menu */}
        <DrawerMenu
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          userName={userName}
          userEmail={userEmail}
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
    paddingBottom: rs(8),
    zIndex: 1,
  },
  headerBtn: {
    width: rs(44),
    height: rs(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: rs(10),
    right: rs(10),
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
    paddingVertical: rs(12),
    marginBottom: rs(16),
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
    marginBottom: rs(16),
    marginTop: rs(4),
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
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    gap: rs(6),
    shadowColor: colors.accent,
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
    borderColor: colors.purple + '25',
    borderRadius: radii.xxl,
    padding: spacing.md,
    marginBottom: spacing.md,
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
    color: colors.purple,
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
    shadowColor: colors.accent,
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
