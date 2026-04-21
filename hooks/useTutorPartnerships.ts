/**
 * useTutorPartnerships — hooks do lado tutor para o Hub de Parceiros.
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco E · sub-passo 2.6.1
 *
 * Expõe ao tutor tudo que foi construído nos Blocos A–D:
 *   - listar convites pendentes que ele emitiu (access_invites)
 *   - listar grants ativos em pets que ele é dono (access_grants)
 *   - criar novo convite (invoca EF professional-invite-create)
 *   - cancelar convite pendente (invoca EF professional-invite-cancel)
 *   - revogar grant ativo (UPDATE direto — RLS permite ao owner)
 *
 * Decisões:
 *   - Criação e cancelamento de convite SEMPRE via EF. Não há policy UPDATE
 *     aberta em access_invites para authenticated; fronteira é a EF (rate-limit,
 *     dedup, audit, notifications_queue → tudo atômico com service_role).
 *   - Revogação de grant via REST direto. Policy UPDATE permite is_pet_owner,
 *     e o trigger do banco escreve audit log + bloqueia reverter revoked_at.
 *   - Listagens via REST direto. RLS já filtra por owner/member. A lista de
 *     grants faz join com `pets!inner` (pet_id NOT NULL) e `professionals`
 *     (display_name + type). Invites lista apenas `pets` (pet_name só).
 *   - Offline: leitura serve do cache. Mutations requerem rede — throw
 *     `offline_action` que o screen traduz em toast.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useQuery, useMutation, useQueryClient, onlineManager } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type {
  AccessRole,
  AccessInviteStatus,
  AccessInviteCreateResult,
} from '../types/database';

// ── Shape dos itens listados pelo Hub ────────────────────────────────────────

/** Convite pendente na visão do tutor (quem emitiu). */
export interface TutorInviteItem {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_avatar_url: string | null;
  pet_species: 'dog' | 'cat';
  invite_email: string;
  role: AccessRole;
  can_see_finances: boolean;
  scope_notes: string | null;
  status: AccessInviteStatus;
  expires_at: string;
  created_at: string;
}

/** Grant ativo na visão do tutor (parceiro com acesso hoje). */
export interface TutorGrantItem {
  id: string;
  pet_id: string;
  pet_name: string;
  pet_avatar_url: string | null;
  pet_species: 'dog' | 'cat';
  professional_id: string;
  professional_display_name: string;
  professional_type: string;
  role: AccessRole;
  can_see_finances: boolean | null;
  scope_notes: string | null;
  accepted_at: string;
  expires_at: string | null;
  created_at: string;
}

// ── Payloads de mutação ──────────────────────────────────────────────────────

export interface CreateInviteInput {
  pet_id: string;
  invite_email: string;
  role: AccessRole;
  can_see_finances?: boolean;
  scope_notes?: string | null;
  expires_days?: number; // 1..30, default 7 no backend
  locale?: string;        // default 'pt-BR' no backend
}

export interface CancelInviteInput {
  invite_id: string;
}

export interface RevokeGrantInput {
  grant_id: string;
  reason?: string | null;
}

// ── Chaves de cache ──────────────────────────────────────────────────────────

const keys = {
  invites: (userId: string | undefined) => ['my-invites', userId] as const,
  grants: (userId: string | undefined) => ['my-grants', userId] as const,
};

// ── Error extraction ─────────────────────────────────────────────────────────

/**
 * Extrai { status, code, message } do FunctionsHttpError que vem de
 * supabase.functions.invoke. O `context` é o Response cru.
 *
 * EFs do módulo profissional usam shapes divergentes no corpo:
 *   - professional-invite-accept   → { error: { code, message } }
 *   - professional-invite-cancel   → { error: message, code }
 *   - professional-invite-create   → { error: message }  (sem code, status diz tudo)
 *
 * Então olhamos code em ambos os lugares e, se não achar, usamos o HTTP status
 * como chave estável pra i18n (401/403/404/409/429/500).
 */
export interface EfErrorInfo {
  status: number | null;
  code: string | null;
  message: string | null;
}

async function extractEfError(err: unknown): Promise<EfErrorInfo> {
  const ctx = (err as Record<string, unknown>)?.context;
  if (!ctx || typeof ctx !== 'object') return { status: null, code: null, message: null };
  const res = ctx as Response;
  const status = typeof res.status === 'number' ? res.status : null;
  try {
    const body: any = await res.clone().json();
    const nestedCode =
      body?.error && typeof body.error === 'object' ? body.error.code : undefined;
    const flatCode = typeof body?.code === 'string' ? body.code : undefined;
    const nestedMsg =
      body?.error && typeof body.error === 'object' ? body.error.message : undefined;
    const flatMsg = typeof body?.error === 'string' ? body.error : undefined;
    return {
      status,
      code: nestedCode ?? flatCode ?? null,
      message: nestedMsg ?? flatMsg ?? null,
    };
  } catch {
    return { status, code: null, message: null };
  }
}

// ── useMyInvites ─────────────────────────────────────────────────────────────

/**
 * Convites emitidos pelo tutor logado — apenas status='pending'.
 * RLS já garante que `invited_by=auth.uid()` retorna só as linhas dele.
 * Join com `pets` pra exibir nome/avatar/espécie no card.
 */
export function useMyInvites() {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery<TutorInviteItem[]>({
    queryKey: keys.invites(userId),
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('access_invites')
        .select(`
          id,
          pet_id,
          invite_email,
          role,
          can_see_finances,
          scope_notes,
          status,
          expires_at,
          created_at,
          pet:pets!access_invites_pet_id_fkey ( name, avatar_url, species )
        `)
        .eq('invited_by', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useMyInvites] query error:', error.code, error.message);
        throw error;
      }
      if (!data) return [];

      // Normaliza shape — `pet` pode vir como objeto ou array (depende do client).
      return data.map((row: any) => {
        const pet = Array.isArray(row.pet) ? row.pet[0] : row.pet;
        return {
          id: row.id,
          pet_id: row.pet_id,
          pet_name: pet?.name ?? '',
          pet_avatar_url: pet?.avatar_url ?? null,
          pet_species: (pet?.species ?? 'dog') as 'dog' | 'cat',
          invite_email: row.invite_email,
          role: row.role as AccessRole,
          can_see_finances: !!row.can_see_finances,
          scope_notes: row.scope_notes,
          status: row.status as AccessInviteStatus,
          expires_at: row.expires_at,
          created_at: row.created_at,
        } satisfies TutorInviteItem;
      });
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1min — convites têm estado mais volátil que patients
  });

  return {
    invites: query.data ?? [],
    count: query.data?.length ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

// ── useMyGrants ──────────────────────────────────────────────────────────────

/**
 * Grants ativos em pets do tutor logado (accepted + não revogado + não expirado).
 * RLS: `is_pet_owner()` permite ao dono enxergar todos os grants dos seus pets.
 * Join com `pets` (filtra NOT NULL via !inner) e `professionals` (display_name).
 */
export function useMyGrants() {
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery<TutorGrantItem[]>({
    queryKey: keys.grants(userId),
    queryFn: async () => {
      if (!userId) return [];

      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from('access_grants')
        .select(`
          id,
          pet_id,
          professional_id,
          role,
          can_see_finances,
          scope_notes,
          accepted_at,
          expires_at,
          created_at,
          pet:pets!access_grants_pet_id_fkey!inner ( name, avatar_url, species ),
          professional:professionals!access_grants_professional_id_fkey ( display_name, professional_type )
        `)
        .eq('is_active', true)
        .is('revoked_at', null)
        .not('accepted_at', 'is', null)
        .order('accepted_at', { ascending: false });

      if (error) {
        console.warn('[useMyGrants] query error:', error.code, error.message);
        throw error;
      }
      if (!data) return [];

      return data
        .map((row: any) => {
          const pet = Array.isArray(row.pet) ? row.pet[0] : row.pet;
          const prof = Array.isArray(row.professional) ? row.professional[0] : row.professional;
          if (!pet) return null;
          // Filtro de expiração feito em memória porque PostgREST exige OR complexo
          // (expires_at IS NULL OR expires_at > now()) que vira nested filter custoso.
          if (row.expires_at && row.expires_at < nowIso) return null;
          return {
            id: row.id,
            pet_id: row.pet_id,
            pet_name: pet.name ?? '',
            pet_avatar_url: pet.avatar_url ?? null,
            pet_species: (pet.species ?? 'dog') as 'dog' | 'cat',
            professional_id: row.professional_id,
            professional_display_name: prof?.display_name ?? '',
            professional_type: prof?.professional_type ?? '',
            role: row.role as AccessRole,
            can_see_finances: row.can_see_finances,
            scope_notes: row.scope_notes,
            accepted_at: row.accepted_at as string,
            expires_at: row.expires_at,
            created_at: row.created_at,
          } satisfies TutorGrantItem;
        })
        .filter((g): g is TutorGrantItem => g !== null);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2min — grants mudam pouco
  });

  return {
    grants: query.data ?? [],
    count: query.data?.length ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

// ── useCreateInvite ──────────────────────────────────────────────────────────

/**
 * Cria convite via EF `professional-invite-create`.
 * Erros mapeados: 403 (not owner), 404 (pet not found), 409 (dup), 429 (rate),
 * 400 (validação), 500 (interno). Screen traduz para toast (voz do pet).
 */
export function useCreateInvite() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  const mutation = useMutation<AccessInviteCreateResult, Error, CreateInviteInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error('not_authenticated');
      if (!onlineManager.isOnline()) throw new Error('offline_action');

      const email = input.invite_email.trim().toLowerCase();
      if (!email) throw new Error('MISSING_EMAIL');

      const { data, error } = await supabase.functions.invoke<
        AccessInviteCreateResult | { error?: string; code?: string }
      >('professional-invite-create', {
        body: {
          pet_id: input.pet_id,
          invite_email: email,
          role: input.role,
          can_see_finances: input.can_see_finances ?? false,
          scope_notes: input.scope_notes ?? null,
          expires_days: input.expires_days ?? 7,
          locale: input.locale ?? 'pt-BR',
        },
      });

      if (error) {
        const info = await extractEfError(error);
        // Prioridade: código explícito > HTTP status mapeado > message genérica.
        const codeFromStatus =
          info.status === 409 ? 'DUPLICATE_INVITE' :
          info.status === 429 ? 'RATE_LIMIT' :
          info.status === 403 ? 'NOT_OWNER' :
          info.status === 404 ? 'PET_NOT_FOUND' :
          info.status === 400 ? 'INVALID_PAYLOAD' :
          null;
        throw new Error(info.code ?? codeFromStatus ?? info.message ?? 'INTERNAL');
      }

      if (!data || typeof data !== 'object' || !('invite_id' in data)) {
        throw new Error('INTERNAL');
      }
      return data as AccessInviteCreateResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.invites(userId) });
    },
  });

  return {
    createInvite: mutation.mutateAsync,
    isCreating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

// ── useCancelInvite ──────────────────────────────────────────────────────────

/**
 * Cancela convite pendente via EF `professional-invite-cancel`.
 * Só o emissor (invited_by) pode cancelar. Só status='pending' transiciona.
 */
export function useCancelInvite() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  const mutation = useMutation<{ invite_id: string; status: 'cancelled' }, Error, CancelInviteInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error('not_authenticated');
      if (!onlineManager.isOnline()) throw new Error('offline_action');
      if (!input.invite_id) throw new Error('MISSING_INVITE_ID');

      const { data, error } = await supabase.functions.invoke<
        { ok: true; invite_id: string; status: 'cancelled' } | { error?: string; code?: string }
      >('professional-invite-cancel', {
        body: { invite_id: input.invite_id },
      });

      if (error) {
        const info = await extractEfError(error);
        const codeFromStatus =
          info.status === 403 ? 'UNAUTHORIZED' :
          info.status === 404 ? 'INVITE_NOT_FOUND' :
          info.status === 409 ? 'INVALID_STATE' :
          info.status === 400 ? 'MISSING_INVITE_ID' :
          null;
        throw new Error(info.code ?? codeFromStatus ?? info.message ?? 'INTERNAL');
      }

      if (!data || typeof data !== 'object' || !('invite_id' in data)) {
        throw new Error('INTERNAL');
      }
      return { invite_id: (data as { invite_id: string }).invite_id, status: 'cancelled' };
    },
    onMutate: async (input) => {
      // Optimistic — remove do cache ANTES da resposta pra UI sumir o card
      // imediatamente. Em caso de erro, onError reverte via refetch.
      await qc.cancelQueries({ queryKey: keys.invites(userId) });
      const previous = qc.getQueryData<TutorInviteItem[]>(keys.invites(userId));
      if (previous) {
        qc.setQueryData<TutorInviteItem[]>(
          keys.invites(userId),
          previous.filter((i) => i.id !== input.invite_id),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: TutorInviteItem[] } | undefined)?.previous;
      if (prev) qc.setQueryData(keys.invites(userId), prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.invites(userId) });
    },
  });

  return {
    cancelInvite: mutation.mutateAsync,
    isCancelling: mutation.isPending,
    error: mutation.error,
  };
}

// ── useRevokeGrant ───────────────────────────────────────────────────────────

/**
 * Revoga grant ativo via UPDATE direto em access_grants.
 * Policy UPDATE permite is_pet_owner (ver migration 20260422_access_grants_rls).
 * Trigger do banco escreve audit log `grant_revoked` automaticamente.
 *
 * Nota: o trigger também impede reverter `revoked_at` (colocar de volta pra NULL).
 * Só seta, não limpa — idempotência defensiva.
 */
export function useRevokeGrant() {
  const userId = useAuthStore((s) => s.user?.id);
  const qc = useQueryClient();

  const mutation = useMutation<{ grant_id: string }, Error, RevokeGrantInput>({
    mutationFn: async (input) => {
      if (!userId) throw new Error('not_authenticated');
      if (!onlineManager.isOnline()) throw new Error('offline_action');
      if (!input.grant_id) throw new Error('MISSING_GRANT_ID');

      const { data, error } = await supabase
        .from('access_grants')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: input.reason ?? null,
          is_active: false,
        })
        .eq('id', input.grant_id)
        .is('revoked_at', null)
        .select('id')
        .maybeSingle();

      if (error) throw new Error(error.message || 'INTERNAL');
      if (!data) throw new Error('GRANT_NOT_FOUND_OR_ALREADY_REVOKED');
      return { grant_id: data.id as string };
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.grants(userId) });
      const previous = qc.getQueryData<TutorGrantItem[]>(keys.grants(userId));
      if (previous) {
        qc.setQueryData<TutorGrantItem[]>(
          keys.grants(userId),
          previous.filter((g) => g.id !== input.grant_id),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      const prev = (ctx as { previous?: TutorGrantItem[] } | undefined)?.previous;
      if (prev) qc.setQueryData(keys.grants(userId), prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.grants(userId) });
    },
  });

  return {
    revokeGrant: mutation.mutateAsync,
    isRevoking: mutation.isPending,
    error: mutation.error,
  };
}
