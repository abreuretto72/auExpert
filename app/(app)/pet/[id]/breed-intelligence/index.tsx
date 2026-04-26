/**
 * /pet/[id]/breed-intelligence — Feed Breed Intelligence Elite.
 *
 * Lista feed personalizado por raça do pet. 4 tipos de card:
 *   - editorial (artigos clínicos auto-gerados ou WSAVA/PubMed)
 *   - tutor (posts de outros tutores moderados pela IA)
 *   - recommendation (The Inner Circle)
 *   - alert (urgency = high/critical, destaque vermelho)
 *
 * Acesso restrito ao plano Elite — paywall mostrado se feature_breed_intelligence=false.
 *
 * FAB de criar post abre bottom sheet com 3 opções:
 *   1. Câmera agora (vídeo até 60s ou foto)
 *   2. Da galeria
 *   3. Do meu diário
 * Em todas, depois da captura/seleção: mic abre, tutor fala, IA modera+publica.
 */
import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Image, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Newspaper, Users, Star, AlertTriangle, Heart, MessageCircle,
  Plus, Sparkles, Lock, Crown, Play, ArrowRight, FileText,
} from 'lucide-react-native';

import { colors } from '../../../../../constants/colors';
import { radii, spacing } from '../../../../../constants/spacing';
import { rs, fs } from '../../../../../hooks/useResponsive';
import { useToast } from '../../../../../components/Toast';
import PdfActionModal from '../../../../../components/pdf/PdfActionModal';
import {
  useBreedIntelligence,
  useBreedIntelligenceAccess,
  type BreedPost,
  type BreedFilter,
} from '../../../../../hooks/useBreedIntelligence';
import { supabase } from '../../../../../lib/supabase';
import { CreateBreedPostSheet } from '../../../../../components/breed-intelligence/CreateBreedPostSheet';
import { previewBreedFeedPdf, shareBreedFeedPdf } from '../../../../../lib/breedPdf';

interface PetMini { id: string; name: string; breed: string | null; species: string | null }

export default function BreedIntelligenceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const petId = String(params.id ?? '');

  const access = useBreedIntelligenceAccess();
  const [filter, setFilter] = useState<BreedFilter>('all');
  const [pet, setPet] = useState<PetMini | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  // Carrega pet (nome + raça pra header e prompts)
  React.useEffect(() => {
    if (!petId) return;
    (async () => {
      const { data } = await supabase
        .from('pets').select('id, name, breed, species').eq('id', petId).maybeSingle();
      if (data) setPet(data as PetMini);
    })();
  }, [petId]);

  const allowed = access.data?.allowed ?? false;
  const breedFeed = useBreedIntelligence(allowed ? petId : '', filter);

  const handleReact = useCallback(async (post: BreedPost) => {
    try {
      await breedFeed.react(post.id);
    } catch (e) {
      toast(String(e), 'error');
    }
  }, [breedFeed, toast]);

  // ── Paywall ────────────────────────────────────────────────────────────
  if (!access.isLoading && !allowed) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('breedIntel.title')}</Text>
          <View style={{ width: rs(26) }} />
        </View>

        <View style={s.paywallBox}>
          <View style={s.paywallIcon}>
            <Crown size={rs(40)} color={colors.click} strokeWidth={1.6} />
          </View>
          <Text style={s.paywallTitle}>{t('breedIntel.eliteOnly')}</Text>
          <Text style={s.paywallDesc}>{t('breedIntel.eliteOnlyDesc')}</Text>
          <TouchableOpacity
            style={s.paywallCta}
            onPress={() => router.push('/settings')}
            activeOpacity={0.85}
          >
            <Text style={s.paywallCtaTxt}>{t('breedIntel.eliteOnlyCta')}</Text>
            <ArrowRight size={rs(18)} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Feed ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.headerTitle}>{t('breedIntel.title')}</Text>
          {pet && (
            <Text style={s.headerSub}>{pet.breed ?? '—'}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => breedFeed.items.length > 0 && setShowPdf(true)}
          hitSlop={12}
          disabled={breedFeed.items.length === 0}
        >
          <FileText
            size={rs(22)}
            color={breedFeed.items.length > 0 ? colors.click : colors.textGhost}
            strokeWidth={1.8}
          />
        </TouchableOpacity>
      </View>

      <PdfActionModal
        visible={showPdf}
        onClose={() => setShowPdf(false)}
        title={t('breedIntel.title')}
        subtitle={`${pet?.name ?? ''} · ${pet?.breed ?? ''} · ${breedFeed.items.length} ${breedFeed.items.length === 1 ? 'item' : 'itens'}`}
        onPreview={() => previewBreedFeedPdf(breedFeed.items, pet?.name ?? '', filterLabelFor(filter, t))}
        onShare={() => shareBreedFeedPdf(breedFeed.items, pet?.name ?? '', filterLabelFor(filter, t))}
      />

      {/* Filtros (chips horizontais) — pílula "Todos" removida; quando nenhum
          chip está ativo, o feed mostra tudo (filter === 'all'). */}
      <View style={s.filtersRow}>
        <FilterChip
          label={t('breedIntel.filterEditorial')}
          active={filter === 'editorial'}
          onPress={() => setFilter(filter === 'editorial' ? 'all' : 'editorial')}
          icon={<Newspaper size={rs(14)} color={filter === 'editorial' ? '#fff' : colors.click} strokeWidth={1.8} />}
        />
        <FilterChip
          label={t('breedIntel.filterTutor')}
          active={filter === 'tutor'}
          onPress={() => setFilter(filter === 'tutor' ? 'all' : 'tutor')}
          icon={<Users size={rs(14)} color={filter === 'tutor' ? '#fff' : colors.click} strokeWidth={1.8} />}
        />
        <FilterChip
          label={t('breedIntel.filterRec')}
          active={filter === 'recommendation'}
          onPress={() => setFilter(filter === 'recommendation' ? 'all' : 'recommendation')}
          icon={<Star size={rs(14)} color={filter === 'recommendation' ? '#fff' : colors.click} strokeWidth={1.8} />}
        />
      </View>

      {/* Feed */}
      <FlatList
        data={breedFeed.items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} onReact={() => handleReact(item)} onPress={() => router.push(`/pet/${petId}/breed-intelligence/${item.id}`)} />
        )}
        contentContainerStyle={s.listContent}
        ListEmptyComponent={!breedFeed.isLoading ? (
          <View style={s.emptyBox}>
            <Sparkles size={rs(28)} color={colors.textDim} strokeWidth={1.6} />
            <Text style={s.emptyTxt}>{t('breedIntel.empty', { petName: pet?.name ?? '—' })}</Text>
          </View>
        ) : null}
        ListFooterComponent={breedFeed.isFetchingNextPage ? (
          <View style={{ padding: spacing.md }}>
            <ActivityIndicator size="small" color={colors.click} />
          </View>
        ) : breedFeed.hasNextPage ? (
          <TouchableOpacity style={s.loadMoreBtn} onPress={() => breedFeed.fetchNextPage()} activeOpacity={0.7}>
            <Text style={s.loadMoreTxt}>{t('breedIntel.loadMore')}</Text>
          </TouchableOpacity>
        ) : null}
        onEndReached={() => breedFeed.hasNextPage && !breedFeed.isFetchingNextPage && breedFeed.fetchNextPage()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={breedFeed.isLoading}
            onRefresh={breedFeed.refresh}
            tintColor={colors.click}
          />
        }
      />

      {/* FAB criar post */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => setShowCreate(true)}
        activeOpacity={0.85}
      >
        <Plus size={rs(24)} color="#fff" strokeWidth={2.2} />
      </TouchableOpacity>

      {/* Bottom sheet criar post */}
      <CreateBreedPostSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        petId={petId}
        petName={pet?.name ?? ''}
      />
    </SafeAreaView>
  );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────

function FilterChip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon: React.ReactNode }) {
  return (
    <TouchableOpacity
      style={[s.chip, active && s.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon}
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PostCard({ post, onReact, onPress }: { post: BreedPost; onReact: () => void; onPress: () => void }) {
  const { t } = useTranslation();
  const isAlert = post.urgency === 'high' || post.urgency === 'critical';
  const typeLabel =
    post.post_type === 'editorial' ? t('breedIntel.editorial') :
    post.post_type === 'recommendation' ? t('breedIntel.recommendation') :
    t('breedIntel.tutorPost');

  if (isAlert) return <AlertCard post={post} onPress={onPress} />;

  const typeIcon =
    post.post_type === 'editorial' ? <Newspaper size={rs(14)} color={colors.click} strokeWidth={1.8} /> :
    post.post_type === 'recommendation' ? <Star size={rs(14)} color={colors.gold} strokeWidth={1.8} /> :
    <Users size={rs(14)} color={colors.click} strokeWidth={1.8} />;

  // Aspect ratio adaptativo por tipo (Instagram-like híbrido):
  //   editorial      → 16:9 (paisagem editorial)
  //   tutor          → 4:5 (vertical instagram-style)
  //   recommendation → 1:1 (card quadrado de negócio)
  const aspectRatio =
    post.post_type === 'editorial' ? 16 / 9 :
    post.post_type === 'recommendation' ? 1 :
    4 / 5;

  return (
    <Pressable style={s.card} onPress={onPress}>
      {(post.thumbnail_url || post.media_thumbnails?.[0] || post.media_urls?.[0]) ? (
        <View style={[s.mediaWrap, { aspectRatio }]}>
          <Image
            source={{ uri: post.thumbnail_url ?? post.media_thumbnails?.[0] ?? post.media_urls?.[0] }}
            style={s.media}
            resizeMode="cover"
          />
          {post.media_type === 'video' && (
            <View style={s.playOverlay}>
              <Play size={rs(28)} color="#fff" strokeWidth={2} fill="#fff" />
            </View>
          )}
          {post.media_duration && (
            <View style={s.durationPill}>
              <Text style={s.durationTxt}>{formatDuration(post.media_duration)}</Text>
            </View>
          )}
        </View>
      ) : null}

      <View style={s.cardBody}>
        <View style={s.cardTypeRow}>
          {typeIcon}
          <Text style={s.cardType}>
            {typeLabel}
            {post.source_name ? ` · ${post.source_name}` : ''}
          </Text>
        </View>

        {post.published_at && (
          <Text style={s.cardDate}>
            {formatDateTime(post.published_at)}
            {post.pet_name ? ` · ${post.pet_name}` : ''}
          </Text>
        )}

        {post.title && <Text style={s.cardTitle}>{post.title}</Text>}
        <Text style={s.cardCaption}>{post.ai_caption}</Text>

        {!!post.ai_tags?.length && (
          <View style={s.tagsRow}>
            {post.ai_tags.slice(0, 4).map((tag) => (
              <View key={tag} style={s.tag}>
                <Text style={s.tagTxt}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* "Útil" só em posts de tutor e recomendações (conteúdo opinativo).
            Em editorials (curadoria clínica da IA), não cabe métrica de comunidade. */}
        {post.post_type !== 'editorial' && (
          <View style={s.cardActions}>
            <TouchableOpacity style={s.actionBtn} onPress={onReact} activeOpacity={0.7}>
              <Heart size={rs(16)} color={colors.click} strokeWidth={1.8} />
              <Text style={s.actionTxt}>{t('breedIntel.useful')} · {post.useful_count}</Text>
            </TouchableOpacity>
            <View style={s.actionBtn}>
              <MessageCircle size={rs(16)} color={colors.textDim} strokeWidth={1.8} />
              <Text style={s.actionTxtMuted}>{post.comment_count}</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function AlertCard({ post, onPress }: { post: BreedPost; onPress: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable style={[s.card, s.cardAlert]} onPress={onPress}>
      <View style={s.cardBody}>
        <View style={s.cardTypeRow}>
          <AlertTriangle size={rs(14)} color={colors.danger} strokeWidth={1.8} />
          <Text style={[s.cardType, { color: colors.danger }]}>
            {t('breedIntel.alert')}
            {post.source_name ? ` · ${post.source_name}` : ''}
          </Text>
        </View>
        {post.title && <Text style={s.cardTitleAlert}>{post.title}</Text>}
        <Text style={s.cardCaption}>{post.ai_caption}</Text>
        <Text style={s.viewMore}>{t('breedIntel.viewMore')} →</Text>
      </View>
    </Pressable>
  );
}

function filterLabelFor(filter: BreedFilter, t: (key: string) => string): string {
  switch (filter) {
    case 'editorial':      return t('breedIntel.filterEditorial');
    case 'tutor':          return t('breedIntel.filterTutor');
    case 'recommendation': return t('breedIntel.filterRec');
    default:               return t('breedIntel.filterAll');
  }
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ─── Styles ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700', letterSpacing: 0.3 },
  headerSub: { color: colors.textSec, fontSize: fs(11), marginTop: rs(2) },

  filtersRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: rs(8),
    paddingHorizontal: spacing.md, paddingVertical: rs(10),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: 999, paddingVertical: rs(7), paddingHorizontal: rs(12),
  },
  chipActive: { backgroundColor: colors.click, borderColor: colors.click },
  chipTxt: { color: colors.text, fontSize: fs(12), fontWeight: '600' },
  chipTxtActive: { color: '#fff' },

  listContent: { padding: spacing.md, paddingBottom: rs(100) },

  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card, borderWidth: 1, borderColor: colors.border,
    marginBottom: rs(14), overflow: 'hidden',
  },
  cardAlert: { borderColor: colors.danger + '60', backgroundColor: colors.danger + '08' },
  mediaWrap: { width: '100%', backgroundColor: colors.bg, position: 'relative' },  // aspectRatio aplicado inline por tipo
  media: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  durationPill: {
    position: 'absolute', bottom: rs(8), right: rs(8),
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4,
    paddingHorizontal: rs(6), paddingVertical: rs(2),
  },
  durationTxt: { color: '#fff', fontSize: fs(10), fontWeight: '600' },

  cardBody: { padding: rs(14) },
  cardTypeRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  cardType: {
    color: colors.textSec, fontSize: fs(10), fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  cardDate: {
    color: colors.textDim, fontSize: fs(10), fontWeight: '500',
    marginBottom: rs(8),
  },
  cardTitle: { color: colors.text, fontSize: fs(15), fontWeight: '700', lineHeight: fs(22), marginBottom: rs(8) },
  cardTitleAlert: { color: colors.danger, fontSize: fs(15), fontWeight: '700', lineHeight: fs(22), marginBottom: rs(8) },
  cardCaption: { color: colors.textSec, fontSize: fs(13), lineHeight: fs(19) },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6), marginTop: rs(10) },
  tag: { backgroundColor: colors.bg, borderRadius: 6, paddingHorizontal: rs(8), paddingVertical: rs(3) },
  tagTxt: { color: colors.click, fontSize: fs(10), fontWeight: '600' },

  cardActions: {
    flexDirection: 'row', gap: rs(16), marginTop: rs(12),
    paddingTop: rs(10), borderTopWidth: 1, borderTopColor: colors.border,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6) },
  actionTxt: { color: colors.click, fontSize: fs(12), fontWeight: '600' },
  actionTxtMuted: { color: colors.textDim, fontSize: fs(12), fontWeight: '600' },
  viewMore: { color: colors.click, fontSize: fs(12), fontWeight: '700', marginTop: rs(10) },

  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: rs(40), gap: rs(12) },
  emptyTxt: { color: colors.textDim, fontSize: fs(13), textAlign: 'center', lineHeight: fs(20) },

  loadMoreBtn: {
    paddingVertical: rs(12), alignItems: 'center',
    borderTopWidth: 1, borderTopColor: colors.border, marginTop: rs(8),
  },
  loadMoreTxt: { color: colors.click, fontSize: fs(13), fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: rs(24), right: rs(24),
    width: rs(58), height: rs(58), borderRadius: rs(29),
    backgroundColor: colors.click,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  // Paywall
  paywallBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32), gap: rs(16) },
  paywallIcon: {
    width: rs(80), height: rs(80), borderRadius: rs(40),
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing,
    alignItems: 'center', justifyContent: 'center',
  },
  paywallTitle: { color: colors.text, fontSize: fs(18), fontWeight: '700', textAlign: 'center' },
  paywallDesc: { color: colors.textSec, fontSize: fs(13), textAlign: 'center', lineHeight: fs(20) },
  paywallCta: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    backgroundColor: colors.click, paddingHorizontal: rs(20), paddingVertical: rs(12),
    borderRadius: radii.lg, marginTop: rs(8),
  },
  paywallCtaTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },
});
