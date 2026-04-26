/**
 * /pet/[id]/breed-intelligence/[postId] — Tela de detalhe do post.
 *
 * Estrutura:
 *   - Header com voltar + título
 *   - Mídia grande (foto/vídeo) com overlay de play
 *   - Tipo + fonte (editorial: WSAVA / tutor / rec)
 *   - Título do artigo + caption + body completo
 *   - Tags clicáveis
 *   - Link para fonte externa (source_url, quando editorial)
 *   - Botões: Útil + contador
 *
 * NÃO há comentários nesta tela (decisão do produto).
 * Acesso restrito ao plano Elite.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
  Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Heart, Newspaper, Star, Users, AlertTriangle,
  Play, ExternalLink, Crown, FileText,
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
} from '../../../../../hooks/useBreedIntelligence';
import { supabase } from '../../../../../lib/supabase';
import { previewBreedPostPdf, shareBreedPostPdf } from '../../../../../lib/breedPdf';

export default function BreedPostDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ id: string; postId: string }>();
  const petId = String(params.id ?? '');
  const postId = String(params.postId ?? '');

  const access = useBreedIntelligenceAccess();
  const allowed = access.data?.allowed ?? false;

  const [post, setPost] = useState<BreedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [petName, setPetName] = useState('');
  const [showPdf, setShowPdf] = useState(false);
  const breedIntel = useBreedIntelligence(allowed ? petId : '');

  // Carrega nome do pet pra usar no subtítulo do PDF
  useEffect(() => {
    if (!petId) return;
    supabase.from('pets').select('name').eq('id', petId).maybeSingle()
      .then(({ data }) => { if (data?.name) setPetName(data.name as string); });
  }, [petId]);

  useEffect(() => {
    if (!postId || !allowed) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('breed_posts')
        .select(`
          id, post_type, source, title, body, ai_caption, ai_tags, urgency,
          ai_relevance_score, source_name, source_url, thumbnail_url,
          media_type, media_urls, media_thumbnails, media_duration,
          target_breeds, target_species, pet_id, tutor_user_id, recommendation_id,
          pet_age_months, useful_count, comment_count, share_count, view_count,
          published_at, created_at
        `)
        .eq('id', postId)
        .eq('moderation_status', 'approved')
        .eq('is_active', true)
        .maybeSingle();
      setPost(data as BreedPost | null);
      setLoading(false);
      if (data) {
        supabase.from('breed_posts')
          .update({ view_count: (data as { view_count: number }).view_count + 1 })
          .eq('id', postId)
          .then(() => {}, () => {});
      }
    })();
  }, [postId, allowed]);

  if (!access.isLoading && !allowed) {
    return <PaywallScreen onBack={() => router.back()} />;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>
          {post?.title ?? t('breedIntel.title')}
        </Text>
        <TouchableOpacity
          onPress={() => post && setShowPdf(true)}
          hitSlop={12}
          disabled={!post}
        >
          <FileText size={rs(22)} color={post ? colors.click : colors.textGhost} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {post && (
        <PdfActionModal
          visible={showPdf}
          onClose={() => setShowPdf(false)}
          title={post.title ?? t('breedIntel.title')}
          subtitle={`${petName ? petName + ' · ' : ''}${post.target_breeds?.[0] ?? ''}`}
          onPreview={() => previewBreedPostPdf(post, petName)}
          onShare={() => shareBreedPostPdf(post, petName)}
        />
      )}

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.click} />
        </View>
      ) : !post ? (
        <View style={s.loadingBox}>
          <Text style={s.errorTxt}>—</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {(post.media_urls?.[0] || post.thumbnail_url) && (
            <View style={[s.mediaWrap, {
              aspectRatio:
                post.post_type === 'editorial' ? 16 / 9 :
                post.post_type === 'recommendation' ? 1 :
                4 / 5,
            }]}>
              <Image
                source={{ uri: post.media_urls?.[0] ?? post.thumbnail_url ?? undefined }}
                style={s.media}
                resizeMode="cover"
              />
              {post.media_type === 'video' && (
                <View style={s.playOverlay}>
                  <Play size={rs(44)} color="#fff" strokeWidth={2} fill="#fff" />
                </View>
              )}
            </View>
          )}

          <View style={s.bodyBox}>
            <TypeBadge post={post} />

            {post.published_at && (
              <Text style={s.publishedAt}>
                {t('breedIntel.publishedAt', { date: formatDateTime(post.published_at) })}
              </Text>
            )}

            {post.title && <Text style={s.title}>{post.title}</Text>}

            <Text style={s.caption}>{post.ai_caption}</Text>

            {post.body && <Text style={s.body}>{post.body}</Text>}

            {!!post.ai_tags?.length && (
              <View style={s.tagsRow}>
                {post.ai_tags.map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagTxt}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {post.source_url && (
              <TouchableOpacity
                style={s.sourceRow}
                onPress={() => Linking.openURL(post.source_url!)}
                activeOpacity={0.7}
              >
                <ExternalLink size={rs(14)} color={colors.click} strokeWidth={1.8} />
                <Text style={s.sourceTxt}>{post.source_name ?? 'Fonte'}</Text>
              </TouchableOpacity>
            )}

            {/* "Útil" só em posts de tutor / recomendações — editorials são curados, não opinativos */}
            {post.post_type !== 'editorial' && (
              <View style={s.actionsRow}>
                <TouchableOpacity
                  style={s.useful}
                  onPress={() => breedIntel.react(post.id).catch((e) => toast(String(e), 'error'))}
                  activeOpacity={0.7}
                >
                  <Heart size={rs(18)} color={colors.click} strokeWidth={1.8} />
                  <Text style={s.usefulTxt}>{t('breedIntel.useful')} · {post.useful_count}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────

function TypeBadge({ post }: { post: BreedPost }) {
  const { t } = useTranslation();
  const isAlert = post.urgency === 'high' || post.urgency === 'critical';
  const isEditorial = post.post_type === 'editorial';
  const isRec = post.post_type === 'recommendation';

  if (isAlert) {
    return (
      <View style={[s.typeBadge, s.typeAlert]}>
        <AlertTriangle size={rs(13)} color={colors.danger} strokeWidth={1.8} />
        <Text style={[s.typeTxt, { color: colors.danger }]}>
          {t('breedIntel.alert')}
          {post.source_name ? ` · ${post.source_name}` : ''}
        </Text>
      </View>
    );
  }
  if (isEditorial) {
    return (
      <View style={s.typeBadge}>
        <Newspaper size={rs(13)} color={colors.click} strokeWidth={1.8} />
        <Text style={s.typeTxt}>
          {t('breedIntel.editorial')}
          {post.source_name ? ` · ${post.source_name}` : ''}
        </Text>
      </View>
    );
  }
  if (isRec) {
    return (
      <View style={s.typeBadge}>
        <Star size={rs(13)} color={colors.gold} strokeWidth={1.8} />
        <Text style={[s.typeTxt, { color: colors.gold }]}>
          {t('breedIntel.recommendation')}
        </Text>
      </View>
    );
  }
  return (
    <View style={s.typeBadge}>
      <Users size={rs(13)} color={colors.click} strokeWidth={1.8} />
      <Text style={s.typeTxt}>{t('breedIntel.tutorPost')}</Text>
    </View>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function PaywallScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
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
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: fs(15), fontWeight: '700', textAlign: 'center', marginHorizontal: rs(8) },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorTxt: { color: colors.textDim, fontSize: fs(13) },

  scroll: { paddingBottom: rs(40) },

  mediaWrap: {
    width: '100%', backgroundColor: colors.bgDeep, position: 'relative',
    // aspectRatio aplicado inline conforme post_type
  },
  media: { width: '100%', height: '100%' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  bodyBox: { padding: spacing.md, gap: rs(12) },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    backgroundColor: colors.clickSoft, borderRadius: 6,
    paddingHorizontal: rs(8), paddingVertical: rs(4),
    alignSelf: 'flex-start',
  },
  typeAlert: { backgroundColor: colors.danger + '15' },
  typeTxt: {
    color: colors.click, fontSize: fs(10), fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },

  publishedAt: {
    color: colors.textDim, fontSize: fs(11), fontWeight: '500',
    fontStyle: 'italic',
  },
  title: { color: colors.text, fontSize: fs(22), fontWeight: '700', lineHeight: fs(30) },
  caption: { color: colors.textSec, fontSize: fs(15), lineHeight: fs(22), fontStyle: 'italic' },
  body: { color: colors.text, fontSize: fs(14), lineHeight: fs(22) },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(6) },
  tag: { backgroundColor: colors.bgCard, borderRadius: 6, paddingHorizontal: rs(8), paddingVertical: rs(4) },
  tagTxt: { color: colors.click, fontSize: fs(11), fontWeight: '600' },

  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    paddingVertical: rs(6),
  },
  sourceTxt: { color: colors.click, fontSize: fs(12), fontWeight: '600' },

  actionsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: rs(8), paddingTop: rs(12),
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  useful: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  usefulTxt: { color: colors.click, fontSize: fs(13), fontWeight: '700' },

  paywallBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32), gap: rs(16) },
  paywallIcon: {
    width: rs(80), height: rs(80), borderRadius: rs(40),
    backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing,
    alignItems: 'center', justifyContent: 'center',
  },
  paywallTitle: { color: colors.text, fontSize: fs(18), fontWeight: '700', textAlign: 'center' },
  paywallDesc: { color: colors.textSec, fontSize: fs(13), textAlign: 'center', lineHeight: fs(20) },
});
