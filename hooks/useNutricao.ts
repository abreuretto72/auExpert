/**
 * useNutricao — hook for the Nutrition module.
 *
 * - get-nutricao: aggregates pet nutrition data (fast, no AI).
 * - generate-cardapio: AI-generated weekly menu (3-day TTL).
 * - Mutations: set modalidade, register food change, add restriction, add supplement.
 */
import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { addToQueue } from '../lib/offlineQueue';
import i18n from '../i18n';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface NutritionFood {
  id: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  portion_grams: number | null;
  daily_portions: number | null;
  calories_kcal: number | null;
  started_at: string | null;
  ended_at?: string | null;
  notes: string | null;
  /** Snapshot da foto da ração (capturada via análise IA da embalagem). */
  photo_url?: string | null;
  /** so_racao | racao_natural | so_natural — modalidade vigente quando registrada. */
  modalidade?: string | null;
  extracted_data?: Record<string, unknown> | null;
}

export interface NutritionRestriction {
  id: string;
  product_name: string | null;
  notes: string | null;
  created_at: string;
}

export interface NutritionSupplement {
  id: string;
  product_name: string | null;
  brand: string | null;
  portion_grams: number | null;
  daily_portions: number | null;
  notes: string | null;
}

export interface NutritionAlert {
  type: string;
  message_key: string;
  severity: 'info' | 'warning' | 'error';
}

export interface NutritionAIEvaluation {
  score: number;
  summary: string;
  pros: string[];
  cons: string[];
  recommendation: string;
}

export interface Nutricao {
  life_stage: 'puppy' | 'adult' | 'senior' | 'kitten';
  age_label: string;
  weight_kg: number | null;
  modalidade: 'so_racao' | 'racao_natural' | 'so_natural';
  natural_pct: number;
  current_food: NutritionFood | null;
  food_history: NutritionFood[];
  restrictions: NutritionRestriction[];
  supplements: NutritionSupplement[];
  alerts: NutritionAlert[];
  ai_evaluation: NutritionAIEvaluation | null;
  ai_evaluation_updated_at: string | null;
}

const EVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isEvalStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > EVAL_TTL_MS;
}

export interface Receita {
  name: string;
  prep_minutes: number;
  servings: number;
  portion_g: number;
  is_safe: boolean;
  ingredients: string[];
  steps: string[];
  storage_fridge: string;
  storage_freezer: string;
  ai_tip: string;
}

export interface CardapioDia {
  weekday: string;
  title: string;
  description: string;
  ingredients: string[];
  recipes: Receita[];
}

export interface Cardapio {
  pet_name: string;
  modalidade_label: string;
  days: CardapioDia[];
  generated_at: string;
  is_fallback?: boolean;
}

export interface CardapioHistoryItem {
  id: string;
  modalidade: string;
  data: Cardapio;
  is_fallback: boolean;
  generated_at: string;
  /** Snapshot da foto da ração ATIVA do pet no momento da geração. Pode ser
   *  null se a ração nunca teve foto. Pegado de nutrition_records.photo_url
   *  via JOIN client-side (a EF generate-cardapio popula prospectivamente
   *  quando a ração tiver foto). */
  food_photo_url: string | null;
}

// ── Keys ───────────────────────────────────────────────────────────────────────

const nutricaoKey = (petId: string) => ['nutricao', petId] as const;
const cardapioKey = (petId: string) => ['cardapio', petId] as const;
const cardapioHistoryKey = (petId: string) => ['cardapio-history', petId] as const;

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useNutricao(petId: string) {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const language = i18n.language ?? 'pt-BR';

  // ── Query: nutrition data ─────────────────────────────────────────────────
  const nutricaoQuery = useQuery({
    queryKey: nutricaoKey(petId),
    queryFn: async (): Promise<Nutricao> => {
      const t0 = Date.now();
      console.log('[useNutricao] get-nutricao → START petId:', petId);
      const { data, error } = await supabase.functions.invoke<{ nutricao: Nutricao }>(
        'get-nutricao',
        { body: { pet_id: petId, language } },
      );
      console.log('[useNutricao] get-nutricao ← DONE ms:', Date.now() - t0, 'error:', error?.message ?? null, 'hasData:', !!data?.nutricao);
      if (error) throw error;
      if (!data?.nutricao) throw new Error('no nutricao data');
      return data.nutricao;
    },
    enabled: isAuthenticated && !!petId,
    staleTime: 5 * 60 * 1000,   // 5 min
    gcTime: 30 * 60 * 1000,
  });

  // ── Query: cardapio ───────────────────────────────────────────────────────
  const cardapioQuery = useQuery({
    queryKey: cardapioKey(petId),
    queryFn: async (): Promise<Cardapio> => {
      const t0 = Date.now();
      console.log('[cardapio] query START petId:', petId, 'lang:', language);
      const { data, error } = await supabase.functions.invoke<{ cardapio: Cardapio; cached: boolean }>(
        'generate-cardapio',
        { body: { pet_id: petId, language } },
      );
      const ms = Date.now() - t0;
      console.log('[cardapio] query DONE ms:', ms, 'error:', error?.message ?? null, 'cached:', data?.cached ?? null, 'days:', data?.cardapio?.days?.length ?? null, 'generatedAt:', data?.cardapio?.generated_at ?? null);
      if (error) {
        console.error('[cardapio] query THROW error:', error);
        throw error;
      }
      if (!data?.cardapio) {
        console.error('[cardapio] query THROW no cardapio in response — raw keys:', Object.keys(data ?? {}));
        throw new Error('no cardapio data');
      }
      return data.cardapio;
    },
    enabled: isAuthenticated && !!petId,
    staleTime: 60 * 60 * 1000,        // 1h — pings server periodically; server cache handles 72h TTL
    gcTime: 24 * 60 * 60 * 1000,      // keeps in memory for 24h to avoid cold first render
    retry: 1,
  });

  // ── Query: cardapio history ───────────────────────────────────────────────
  const cardapioHistoryQuery = useQuery({
    queryKey: cardapioHistoryKey(petId),
    queryFn: async (): Promise<CardapioHistoryItem[]> => {
      // 1) Histórico — agora com food_photo_url (snapshot do momento da geração).
      const { data, error } = await supabase
        .from('nutrition_cardapio_history')
        .select('id, modalidade, data, is_fallback, generated_at, food_photo_url')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .order('generated_at', { ascending: false })
        .limit(50);
      if (error) throw error;

      // 2) Fallback pra registros antigos sem snapshot: foto da ração ATIVA
      //    do pet. Se ela continua a mesma, faz sentido visualmente. Se mudou,
      //    o snapshot dos cardápios novos já captura a nova foto.
      const { data: currentFood } = await supabase
        .from('nutrition_records')
        .select('photo_url')
        .eq('pet_id', petId)
        .eq('record_type', 'food')
        .eq('is_current', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const fallbackPhoto = (currentFood as { photo_url?: string | null } | null)?.photo_url ?? null;

      return (data ?? []).map((row) => ({
        ...row,
        food_photo_url: (row as { food_photo_url?: string | null }).food_photo_url ?? fallbackPhoto,
      })) as CardapioHistoryItem[];
    },
    enabled: isAuthenticated && !!petId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ── Mutation: set modalidade ──────────────────────────────────────────────
  const setModalidadeMutation = useMutation({
    mutationFn: async (params: {
      modalidade: 'so_racao' | 'racao_natural' | 'so_natural';
      natural_pct?: number;
    }) => {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (!user || authErr) throw new Error('not authenticated');

      // Offline path: queue mutation, optimistic cache update runs in onSuccess
      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'upsertNutritionProfile',
          payload: {
            pet_id: petId,
            user_id: user.id,
            modalidade: params.modalidade,
            natural_pct: params.natural_pct ?? 0,
          },
        });
        return;
      }

      // Check for existing active profile
      const { data: existing, error: selectErr } = await supabase
        .from('nutrition_profiles')
        .select('id')
        .eq('pet_id', petId)
        .eq('is_active', true)
        .maybeSingle();
      if (selectErr) throw selectErr;

      if (existing) {
        const { error } = await supabase
          .from('nutrition_profiles')
          .update({
            modalidade: params.modalidade,
            natural_pct: params.natural_pct ?? 0,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('nutrition_profiles')
          .insert({
            pet_id: petId,
            user_id: user.id,
            modalidade: params.modalidade,
            natural_pct: params.natural_pct ?? 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      // Optimistic update
      qc.setQueryData<Nutricao>(nutricaoKey(petId), (old) =>
        old ? {
          ...old,
          modalidade: variables.modalidade,
          natural_pct: variables.natural_pct ?? 0,
        } : old,
      );
      // Force-regenerate cardapio in background so it reflects the new modalidade immediately.
      // Using fire-and-forget: UI remains responsive while AI generates the new menu.
      const lang = language;
      supabase.functions
        .invoke<{ cardapio: Cardapio; cached: boolean }>('generate-cardapio', {
          body: { pet_id: petId, force: true, language: lang },
        })
        .then(({ data }) => {
          if (data?.cardapio) {
            qc.setQueryData(cardapioKey(petId), data.cardapio);
            qc.invalidateQueries({ queryKey: cardapioHistoryKey(petId) });
          }
        })
        .catch(() => {
          // On failure just mark stale so screen refetches on next visit
          qc.invalidateQueries({ queryKey: cardapioKey(petId) });
        });
    },
  });

  // ── Mutation: register food (change/add current food) ─────────────────────
  const registrarRacaoMutation = useMutation({
    mutationFn: async (params: {
      product_name: string;
      brand?: string;
      category?: string;
      portion_grams?: number;
      daily_portions?: number;
      calories_kcal?: number;
      notes?: string;
      source?: string;
      extracted_data?: Record<string, unknown>;
    }) => {
      console.log('[useNutricao] registrarRacao START petId:', petId, 'params:', JSON.stringify(params));
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      console.log('[useNutricao] registrarRacao auth — userId:', user?.id ?? null, 'authErr:', authErr?.message ?? null);
      if (!user) throw new Error('not authenticated');

      const insertPayload = {
        pet_id: petId,
        user_id: user.id,
        record_type: 'food',
        is_current: true,
        ...params,
      };

      if (!onlineManager.isOnline()) {
        console.log('[useNutricao] registrarRacao OFFLINE → queue');
        await addToQueue({ type: 'createNutritionRecord', payload: insertPayload });
        return;
      }

      console.log('[useNutricao] registrarRacao INSERT payload:', JSON.stringify(insertPayload));
      const { error } = await supabase
        .from('nutrition_records')
        .insert(insertPayload);
      console.log('[useNutricao] registrarRacao INSERT result — error:', error?.message ?? null, 'code:', error?.code ?? null, 'details:', error?.details ?? null);
      if (error) throw error;
      console.log('[useNutricao] registrarRacao DONE');
    },
    onSuccess: () => {
      console.log('[useNutricao] registrarRacao onSuccess — invalidating nutricaoKey');
      qc.invalidateQueries({ queryKey: nutricaoKey(petId) });
    },
    onError: (err) => {
      console.error('[useNutricao] registrarRacao onError:', err);
    },
  });

  // ── Mutation: add restriction / intolerance ───────────────────────────────
  const addRestricaoMutation = useMutation({
    mutationFn: async (params: {
      product_name: string;
      record_type: 'restriction' | 'intolerance';
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');

      const insertPayload = {
        pet_id: petId,
        user_id: user.id,
        ...params,
      };

      if (!onlineManager.isOnline()) {
        await addToQueue({ type: 'createNutritionRecord', payload: insertPayload });
        return;
      }

      const { error } = await supabase
        .from('nutrition_records')
        .insert(insertPayload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nutricaoKey(petId) });
    },
  });

  // ── Mutation: remove restriction (soft delete) ────────────────────────────
  const removeRestricaoMutation = useMutation({
    mutationFn: async (recordId: string) => {
      if (!onlineManager.isOnline()) {
        await addToQueue({
          type: 'deleteNutritionRecord',
          payload: { id: recordId, petId, pet_id: petId },
        });
        return;
      }

      const { error } = await supabase
        .from('nutrition_records')
        .update({ is_active: false })
        .eq('id', recordId)
        .eq('pet_id', petId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nutricaoKey(petId) });
    },
  });

  // ── Mutation: evaluate nutrition (AI, cached 7 days) ─────────────────────
  const evaluateMutation = useMutation({
    mutationFn: async (): Promise<NutritionAIEvaluation> => {
      const t0 = Date.now();
      console.log('[useNutricao] evaluate-nutrition → START petId:', petId);
      const { data, error } = await supabase.functions.invoke<{
        evaluation: NutritionAIEvaluation;
        generated_at: string;
      }>('evaluate-nutrition', { body: { pet_id: petId, language } });
      console.log('[useNutricao] evaluate-nutrition ← DONE ms:', Date.now() - t0, 'error:', error?.message ?? null, 'score:', data?.evaluation?.score ?? null);
      if (error) throw error;
      if (!data?.evaluation) throw new Error('no evaluation data');
      return data.evaluation;
    },
    onSuccess: (evaluation) => {
      console.log('[useNutricao] evaluate-nutrition onSuccess — score:', evaluation.score);
      // Optimistic update so the UI reflects immediately without a full refetch
      qc.setQueryData<Nutricao>(nutricaoKey(petId), (old) =>
        old ? {
          ...old,
          ai_evaluation: evaluation,
          ai_evaluation_updated_at: new Date().toISOString(),
        } : old,
      );
    },
  });

  // ── Mutation: regenerate cardapio (force refresh) ────────────────────────
  // Histórico (2026-04-28): regenerar abortava silenciosamente sem chegar ao
  // log DONE. Causa típica: supabase.functions.invoke fazendo fetch que
  // demora mais que o timeout default do RN (~60s) e disparando exceção de
  // rede que NÃO era pega pelo `if (error)` interno (porque o erro é throw,
  // não retorno). Agora envolvemos tudo em try/catch e logamos cada estágio.
  const regenerarMutation = useMutation({
    mutationFn: async (): Promise<Cardapio> => {
      const t0 = Date.now();
      console.log('[cardapio] regenerar START petId:', petId, 'force:true lang:', language);

      let invokeResult: { data: { cardapio: Cardapio; cached: boolean; fallback_reason: string | null } | null; error: unknown } | null = null;
      try {
        console.log('[cardapio] regenerar invoke calling…');
        invokeResult = await supabase.functions.invoke<{ cardapio: Cardapio; cached: boolean; fallback_reason: string | null }>(
          'generate-cardapio',
          { body: { pet_id: petId, force: true, language } },
        );
        const ms = Date.now() - t0;
        console.log('[cardapio] regenerar invoke returned ms:', ms, 'hasData:', !!invokeResult?.data, 'hasError:', !!invokeResult?.error);
      } catch (networkErr) {
        const ms = Date.now() - t0;
        console.error('[cardapio] regenerar invoke THREW after ms:', ms, 'err:', networkErr);
        // Re-throw pra useMutation pegar no onError
        throw networkErr instanceof Error
          ? networkErr
          : new Error(`Network error: ${String(networkErr)}`);
      }

      const { data, error } = invokeResult;
      const ms = Date.now() - t0;
      const fallbackReason = (data as Record<string, unknown> | null)?.fallback_reason ?? null;
      console.log('[cardapio] regenerar DONE ms:', ms, 'error:', (error as { message?: string })?.message ?? null, 'cached:', data?.cached ?? null, 'days:', data?.cardapio?.days?.length ?? null, 'isFallback:', data?.cardapio?.is_fallback ?? null);
      if (fallbackReason) console.error('[cardapio] *** FALLBACK_REASON ***', fallbackReason);
      if (error) {
        const status = (error as Record<string, unknown>)?.context
          ? ((error as Record<string, unknown>).context as Response)?.status
          : undefined;
        console.error('[cardapio] regenerar THROW error:', error, 'status:', status ?? 'unknown');
        throw error;
      }
      if (!data?.cardapio) {
        console.error('[cardapio] regenerar THROW no cardapio — raw keys:', Object.keys(data ?? {}));
        throw new Error('no cardapio data');
      }
      return data.cardapio;
    },
    onSuccess: (cardapio) => {
      console.log('[cardapio] regenerar onSuccess — days:', cardapio.days?.length, 'isFallback:', cardapio.is_fallback ?? false, 'generatedAt:', cardapio.generated_at);
      qc.setQueryData(cardapioKey(petId), cardapio);
      // Invalida o histórico — a EF salva uma row nova em nutrition_cardapio_history
      // a cada regeneração com sucesso (when !fallback). Sem isso, o tutor abre o
      // histórico e vê dados em cache antigos sem o cardápio recém-gerado.
      qc.invalidateQueries({ queryKey: cardapioHistoryKey(petId) });
    },
    onError: (err) => {
      console.error('[cardapio] regenerar onError:', err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    },
  });

  // ── Fn: get single recipe by name ─────────────────────────────────────────
  function getRecipe(weekdayIndex: number, recipeName: string): Receita | null {
    const cardapio = cardapioQuery.data;
    if (!cardapio) return null;
    const day = cardapio.days[weekdayIndex];
    return day?.recipes.find((r) => r.name === recipeName) ?? null;
  }

  return {
    // Data
    nutricao: nutricaoQuery.data ?? null,
    cardapio: cardapioQuery.data ?? null,
    cardapioHistory: cardapioHistoryQuery.data ?? [],

    // Loading states
    isLoadingNutricao: nutricaoQuery.isLoading,
    isLoadingCardapio: cardapioQuery.isLoading,
    isLoadingCardapioHistory: cardapioHistoryQuery.isLoading,
    isRegeneratingCardapio: regenerarMutation.isPending,
    errorNutricao: nutricaoQuery.error,
    cardapioError: cardapioQuery.error,
    errorCardapio: cardapioQuery.error,

    // Refetch
    refetchNutricao: nutricaoQuery.refetch,
    refetchCardapio: cardapioQuery.refetch,
    refetchCardapioHistory: cardapioHistoryQuery.refetch,

    // Mutations
    setModalidade: setModalidadeMutation.mutateAsync,
    isSettingModalidade: setModalidadeMutation.isPending,

    registrarRacao: registrarRacaoMutation.mutateAsync,
    isRegistrandoRacao: registrarRacaoMutation.isPending,

    addRestricao: addRestricaoMutation.mutateAsync,
    isAddingRestricao: addRestricaoMutation.isPending,

    removeRestricao: removeRestricaoMutation.mutateAsync,
    isRemovingRestricao: removeRestricaoMutation.isPending,

    // Functions
    regenerarCardapio: regenerarMutation.mutateAsync,
    getRecipe,

    // AI evaluation
    evaluateNutrition: evaluateMutation.mutateAsync,
    isEvaluating: evaluateMutation.isPending,
  };
}
