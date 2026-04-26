/**
 * hooks/useBreedIntelligence.ts — Feed unificado por raça (Elite).
 *
 * Reúne 4 capacidades:
 *   1. feed: useInfiniteQuery → breed-feed EF
 *   2. createPost: mutation → breed-post-create EF
 *   3. createComment: mutation → breed-comment-create EF
 *   4. react: mutation → upsert direto em breed_post_reactions
 *
 * Filosofia: zero digitação. Texto sempre vem de STT no client (useSimpleSTT)
 * ou de uma entrada do diário existente. Mídia já upada antes via storage.
 *
 * Elite gating: a EF retorna 403 se o tutor não é Elite. Tela trata mostrando
 * paywall — UI também checa via subscription_plans pra esconder o ponto de
 * entrada antes do click.
 */
import { useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { withTimeout } from '../lib/withTimeout';

// ─── Types ────────────────────────────────────────────────────────────────

export type BreedPostType = 'editorial' | 'tutor' | 'recommendation';
export type BreedPostUrgency = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type BreedFilter = 'all' | 'editorial' | 'tutor' | 'recommendation';

export interface BreedPost {
  id: string;
  post_type: BreedPostType | string;
  source: string | null;
  title: string | null;
  body: string | null;
  ai_caption: string;
  ai_tags: string[] | null;
  urgency: BreedPostUrgency | string;
  ai_relevance_score: number | null;
  source_name: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  media_type: string;
  media_urls: string[] | null;
  media_thumbnails: string[] | null;
  media_duration: number | null;
  target_breeds: string[];
  target_species: string | null;
  pet_id: string | null;
  pet_name: string | null;
  pet_breed: string | null;
  tutor_user_id: string | null;
  recommendation_id: string | null;
  pet_age_months: number | null;
  useful_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  published_at: string | null;
  created_at: string;
}

export interface BreedFeedPage {
  items: BreedPost[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface CreatePostParams {
  tutorRawText: string;
  mediaUrls?: string[];
  mediaThumbnails?: string[];
  mediaType?: 'photo' | 'video' | 'mixed' | 'none';
  mediaDuration?: number;
  audioUrl?: string;
  fromDiaryEntryId?: string;
  recommendationId?: string;
}

// ─── Elite gate (UI-side, para esconder o ponto de entrada) ───────────────

export function useBreedIntelligenceAccess() {
  return useQuery<{ allowed: boolean; plan_id: string | null }>({
    queryKey: ['breed-intel-access'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { allowed: false, plan_id: null };
      const { data, error } = await supabase
        .from('users')
        .select('plan_id, subscription_plans!inner(feature_breed_intelligence)')
        .eq('id', user.id)
        .maybeSingle();
      if (error || !data) return { allowed: false, plan_id: null };
      const plan = (data as { plan_id: string | null; subscription_plans: { feature_breed_intelligence: boolean } | null });
      return {
        allowed: !!plan.subscription_plans?.feature_breed_intelligence,
        plan_id: plan.plan_id,
      };
    },
    staleTime: 60 * 1000,
  });
}

// ─── Hook principal ──────────────────────────────────────────────────────

export function useBreedIntelligence(petId: string, filter: BreedFilter = 'all') {
  const qc = useQueryClient();
  const { i18n } = useTranslation();

  const feedQuery = useInfiniteQuery<BreedFeedPage>({
    queryKey: ['breed-intel', petId, filter, i18n.language],
    queryFn: async ({ pageParam }) => {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('breed-feed', {
          body: { pet_id: petId, cursor: pageParam ?? null, limit: 20, filter, language: i18n.language },
        }),
        20000,
        'breed-feed',
      );
      if (error) throw error;
      return (data ?? { items: [], next_cursor: null, has_more: false }) as BreedFeedPage;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    enabled: !!petId,
    staleTime: 30 * 1000,
  });

  const createPost = useMutation<unknown, Error, CreatePostParams>({
    mutationFn: async (params) => {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('breed-post-create', {
          body: {
            pet_id: petId,
            tutor_raw_text: params.tutorRawText,
            media_urls: params.mediaUrls ?? [],
            media_thumbnails: params.mediaThumbnails ?? [],
            media_type: params.mediaType ?? 'none',
            media_duration: params.mediaDuration ?? null,
            audio_url: params.audioUrl ?? null,
            from_diary_entry_id: params.fromDiaryEntryId ?? null,
            recommendation_id: params.recommendationId ?? null,
            language: i18n.language,
          },
        }),
        140000,
        'breed-post-create',
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breed-intel'] });
    },
  });

  const react = useMutation<{ created: boolean }, Error, string>({
    mutationFn: async (postId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not_authenticated');
      // Toggle: se já existe → DELETE; senão INSERT (upsert idempotente).
      const { data: existing } = await supabase
        .from('breed_post_reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('tutor_user_id', user.id)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from('breed_post_reactions')
          .delete().eq('id', existing.id);
        if (error) throw error;
        return { created: false };
      }
      const { error } = await supabase
        .from('breed_post_reactions')
        .insert({ post_id: postId, tutor_user_id: user.id, reaction: 'useful' });
      if (error) throw error;
      return { created: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['breed-intel'] });
    },
  });

  // Dedupe por id — paginação cursor-based pode retornar o mesmo post 2x
  // se published_at for igual entre páginas (o CRON gerou várias com timestamps próximos).
  const items: BreedPost[] = (() => {
    const seen = new Set<string>();
    const out: BreedPost[] = [];
    for (const page of feedQuery.data?.pages ?? []) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        out.push(item);
      }
    }
    return out;
  })();
  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['breed-intel'] });
  }, [qc]);

  return {
    items,
    isLoading: feedQuery.isLoading,
    isFetchingNextPage: feedQuery.isFetchingNextPage,
    hasNextPage: !!feedQuery.hasNextPage,
    error: feedQuery.error as Error | null,
    fetchNextPage: feedQuery.fetchNextPage,
    refresh,
    createPost: createPost.mutateAsync,
    isPosting: createPost.isPending,
    react: react.mutateAsync,
    isReacting: react.isPending,
  };
}
