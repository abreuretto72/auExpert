/**
 * /invite/[token] — Landing do deep link de convite profissional.
 *
 * Fluxo:
 *   1. Recebe o token via useLocalSearchParams (deep-link web ou notif push).
 *   2. Faz PREVIEW (action='preview') na Edge Function professional-invite-accept:
 *      — Valida JWT do user logado.
 *      — Confere email do user = invite.invite_email (WRONG_RECIPIENT).
 *      — Retorna pet (nome/espécie/avatar) + inviter (full_name) + role
 *        + can_see_finances + scope_notes + expires_at + needs_onboarding
 *        + duplicate_active_grant.
 *   3. Exibe card com: inviter te convidou para cuidar de {pet} / role /
 *      validade / observações.
 *   4. Botões [Aceitar convite] [Recusar] (+ confirm modal no decline).
 *   5. Ao aceitar:
 *      — Se PREVIEW retornou needs_onboarding=true: redireciona pra
 *        /pro/onboarding?returnTo=/invite/<token> (nunca tenta aceitar sem
 *        perfil profissional; evita 403 NEEDS_ONBOARDING).
 *      — Se duplicate_active_grant=true: mostra mensagem e desabilita o
 *        botão (nada a fazer — já tem acesso).
 *      — Senão chama action='accept'. Em sucesso → router.replace('/pro').
 *   6. Ao recusar: confirm → action='decline' → toast → router.back().
 *
 * Error mapping (EF retorna { error: { code, message } }):
 *   - INVITE_NOT_FOUND (404)      → invite.errors.notFound
 *   - GONE (410)                   → invite.errors.gone
 *   - WRONG_RECIPIENT (403)        → invite.errors.wrongRecipient
 *   - DUPLICATE_ACTIVE_GRANT (409) → invite.errors.duplicateGrant
 *   - RACE (409)                   → invite.errors.race
 *   - NEEDS_ONBOARDING (403)       → handled via redirect (não mostra erro)
 *   - MISSING_TOKEN (400)          → invite.errors.invalidToken
 *   - INTERNAL/outros              → invite.errors.generic
 *
 * Offline: landing exige rede — sem cache de preview, sem fila pra
 * aceitar/recusar. Banner discreto se offline.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery, onlineManager } from '@tanstack/react-query';
import {
  ChevronLeft, Dog, Cat, Mail, Clock, FileText,
  AlertCircle, UserCheck, WifiOff,
} from 'lucide-react-native';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/Toast';
import { supabase } from '../../../lib/supabase';
import type { AccessRole } from '../../../types/database';

// ── Shape da resposta do preview ─────────────────────────────────────────────

interface PreviewResponse {
  ok: true;
  invite_id: string;
  role: AccessRole;
  can_see_finances: boolean;
  scope_notes: string | null;
  expires_at: string;
  needs_onboarding: boolean;
  duplicate_active_grant: boolean;
  pet: {
    id: string;
    name: string;
    species: 'dog' | 'cat';
    avatar_url: string | null;
  } | null;
  inviter: {
    display_name: string | null;
  };
}

interface EfErrorBody {
  error?: { code?: string; message?: string };
}

// Pega o código de erro estruturado do FunctionsHttpError.context (Response body)
async function extractEfErrorCode(err: unknown): Promise<string | null> {
  const ctx = (err as Record<string, unknown>)?.context;
  if (!ctx || typeof ctx !== 'object') return null;
  const res = ctx as Response;
  try {
    const body = (await res.clone().json()) as EfErrorBody;
    return body?.error?.code ?? null;
  } catch {
    return null;
  }
}

// Mapeia código EF → chave i18n
function errorCodeToI18n(code: string | null): string {
  switch (code) {
    case 'INVITE_NOT_FOUND': return 'invite.errors.notFound';
    case 'GONE':             return 'invite.errors.gone';
    case 'WRONG_RECIPIENT':  return 'invite.errors.wrongRecipient';
    case 'DUPLICATE_ACTIVE_GRANT': return 'invite.errors.duplicateGrant';
    case 'RACE':             return 'invite.errors.race';
    case 'MISSING_TOKEN':    return 'invite.errors.invalidToken';
    case 'INVALID_ACTION':   return 'invite.errors.invalidToken';
    default:                 return 'invite.errors.generic';
  }
}

// Relative "expires in X days" do tipo que cabe no card
function expiresKey(expiresAt: string): { key: string; params?: Record<string, number> } {
  const now = Date.now();
  const then = new Date(expiresAt).getTime();
  const ms = then - now;
  if (ms <= 0) return { key: 'invite.expiredAlready' };
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days <= 1) return { key: 'invite.expiresToday' };
  if (days === 2) return { key: 'invite.expiresTomorrow' };
  return { key: 'invite.expiresInDays', params: { days } };
}

// ── Tela ─────────────────────────────────────────────────────────────────────

export default function InviteLandingScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  const rawToken = typeof token === 'string' ? token.trim() : '';
  const isOnline = onlineManager.isOnline();

  // ── Preview query ──────────────────────────────────────────────────────────
  const preview = useQuery<PreviewResponse, Error>({
    queryKey: ['invite-preview', rawToken],
    queryFn: async () => {
      if (!rawToken) throw new Error('missing_token');
      if (!onlineManager.isOnline()) throw new Error('offline');

      const { data, error } = await supabase.functions.invoke<PreviewResponse>(
        'professional-invite-accept',
        { body: { token: rawToken, action: 'preview' } },
      );
      if (error) {
        const code = await extractEfErrorCode(error);
        console.error('[invite-preview] EF error', { code, message: error.message });
        const e = new Error(error.message) as Error & { efCode?: string };
        e.efCode = code ?? 'UNKNOWN';
        throw e;
      }
      if (!data || !data.ok) throw new Error('invalid_response');
      return data;
    },
    enabled: !!rawToken && isOnline,
    retry: false,
    staleTime: 30 * 1000,
  });

  const roleLabel = useMemo(() => {
    if (!preview.data) return '';
    return t(`invite.role.${preview.data.role}`);
  }, [preview.data, t]);

  const expires = useMemo(() => {
    if (!preview.data) return null;
    const { key, params } = expiresKey(preview.data.expires_at);
    return t(key, params ?? {});
  }, [preview.data, t]);

  // ── Accept handler ─────────────────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    if (!preview.data || isAccepting || isDeclining) return;
    if (!onlineManager.isOnline()) {
      toast(t('invite.offline'), 'warning');
      return;
    }

    // Guard: se ainda não tem perfil profissional, redireciona pro onboarding.
    // O onboarding lê returnTo e manda de volta pra /invite/<token> quando cria.
    // Push (não replace) pra preservar /invite/[token] na stack — assim, se o
    // vet apertar ← na tela de onboarding, volta pra cá em vez de quebrar a nav.
    if (preview.data.needs_onboarding) {
      router.push({
        pathname: '/pro/onboarding',
        params: { returnTo: `/invite/${rawToken}` },
      } as never);
      return;
    }

    // Guard: já tem grant ativo pro mesmo par (pet, professional) — nada a fazer.
    if (preview.data.duplicate_active_grant) {
      toast(t('invite.errors.duplicateGrant'), 'warning');
      return;
    }

    setIsAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: true; grant_id: string; pet_id: string; role: AccessRole;
      }>('professional-invite-accept', {
        body: { token: rawToken, action: 'accept' },
      });
      if (error) {
        const code = await extractEfErrorCode(error);
        // NEEDS_ONBOARDING pode aparecer aqui se preview estava stale — redireciona.
        if (code === 'NEEDS_ONBOARDING') {
          router.push({
            pathname: '/pro/onboarding',
            params: { returnTo: `/invite/${rawToken}` },
          } as never);
          return;
        }
        const key = errorCodeToI18n(code);
        toast(t(key), 'error');
        console.error('[invite-accept] EF error', { code, message: error.message });
        return;
      }
      if (!data?.ok) {
        toast(t('invite.errors.generic'), 'error');
        return;
      }
      toast(t('invite.accepted'), 'success');
      router.replace('/pro' as never);
    } catch (err) {
      console.error('[invite-accept] exception', err);
      toast(t('invite.errors.generic'), 'error');
    } finally {
      setIsAccepting(false);
    }
  }, [preview.data, isAccepting, isDeclining, rawToken, router, toast, t]);

  // ── Decline handler ────────────────────────────────────────────────────────
  const handleDecline = useCallback(async () => {
    if (!preview.data || isAccepting || isDeclining) return;
    if (!onlineManager.isOnline()) {
      toast(t('invite.offline'), 'warning');
      return;
    }

    const ok = await confirm({
      text: t('invite.confirmDecline'),
      type: 'warning',
    });
    if (!ok) return;

    setIsDeclining(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        ok: true; invite_id: string; status: 'declined';
      }>('professional-invite-accept', {
        body: { token: rawToken, action: 'decline' },
      });
      if (error) {
        const code = await extractEfErrorCode(error);
        const key = errorCodeToI18n(code);
        toast(t(key), 'error');
        console.error('[invite-decline] EF error', { code, message: error.message });
        return;
      }
      if (!data?.ok) {
        toast(t('invite.errors.generic'), 'error');
        return;
      }
      toast(t('invite.declined'), 'info');
      // Fallback seguro: se a stack está vazia (caso comum quando o user chega
      // direto via redirect do _layout), volta pro hub.
      if (router.canGoBack()) router.back();
      else router.replace('/' as never);
    } catch (err) {
      console.error('[invite-decline] exception', err);
      toast(t('invite.errors.generic'), 'error');
    } finally {
      setIsDeclining(false);
    }
  }, [preview.data, isAccepting, isDeclining, rawToken, router, toast, t, confirm]);

  // ── Render: estados ────────────────────────────────────────────────────────

  // 1. Token ausente ou formato inválido (deep-link quebrado)
  if (!rawToken) {
    return (
      <ErrorShell
        router={router}
        headerTitle={t('invite.title')}
        icon={<AlertCircle size={rs(40)} color={colors.danger} strokeWidth={1.6} />}
        title={t('invite.errors.invalidToken')}
      />
    );
  }

  // 2. Offline — preview precisa de rede
  if (!isOnline) {
    return (
      <ErrorShell
        router={router}
        headerTitle={t('invite.title')}
        icon={<WifiOff size={rs(40)} color={colors.warning} strokeWidth={1.6} />}
        title={t('invite.offline')}
      />
    );
  }

  // 3. Loading
  if (preview.isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header router={router} title={t('invite.title')} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.click} />
          <Text style={styles.loadingText}>{t('invite.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Error no preview — mostra mensagem amigável + botão voltar
  if (preview.isError || !preview.data) {
    const code = (preview.error as (Error & { efCode?: string }) | null)?.efCode ?? null;
    const key = errorCodeToI18n(code);
    return (
      <ErrorShell
        router={router}
        headerTitle={t('invite.title')}
        icon={<AlertCircle size={rs(40)} color={colors.danger} strokeWidth={1.6} />}
        title={t(key)}
      />
    );
  }

  // 5. Success path — mostra o card
  const p = preview.data;
  const pet = p.pet;
  const inviterName = p.inviter.display_name || t('invite.inviterFallback');
  const petName = pet?.name || t('invite.unknownPet');
  const SpeciesIcon = pet?.species === 'cat' ? Cat : Dog;
  const speciesColor = pet?.species === 'cat' ? colors.click : colors.click;

  return (
    <SafeAreaView style={styles.safe}>
      <Header router={router} title={t('invite.title')} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card: pet + inviter */}
        <View style={styles.heroCard}>
          <View style={styles.heroAvatarWrap}>
            {pet?.avatar_url ? (
              <Image source={{ uri: pet.avatar_url }} style={styles.heroAvatar} />
            ) : (
              <View style={[styles.heroAvatar, styles.heroAvatarFallback, { borderColor: speciesColor }]}>
                <SpeciesIcon size={rs(36)} color={speciesColor} strokeWidth={1.8} />
              </View>
            )}
          </View>
          <Text style={styles.heroTitle}>
            {t('invite.description', { inviter: inviterName, pet: petName })}
          </Text>
        </View>

        {/* Detalhes */}
        <View style={styles.detailsCard}>
          <DetailRow
            icon={<UserCheck size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
            label={t('invite.roleLabel')}
            value={roleLabel}
          />
          {/* Linha de finanças removida 2026-04-27: a tela de aceite não é o
              lugar pra falar sobre permissões granulares. O profissional vê na
              ficha do paciente o que pode ou não acessar. Decisão Elite: tela
              limpa, sem expor granularidade ao convidado. */}
          {expires && (
            <DetailRow
              icon={<Clock size={rs(18)} color={colors.textDim} strokeWidth={1.8} />}
              label={t('invite.expiresLabel')}
              value={expires}
            />
          )}
          {p.scope_notes && p.scope_notes.trim().length > 0 && (
            <View style={styles.scopeNotesWrap}>
              <View style={styles.scopeNotesHeader}>
                <FileText size={rs(16)} color={colors.petrol} strokeWidth={1.8} />
                <Text style={styles.scopeNotesLabel}>{t('invite.scopeNotesLabel')}</Text>
              </View>
              <Text style={styles.scopeNotesText}>{p.scope_notes}</Text>
            </View>
          )}
        </View>

        {/* Avisos (needs_onboarding, duplicate_active_grant) */}
        {p.needs_onboarding && (
          <View style={styles.noticeCard}>
            <Mail size={rs(18)} color={colors.click} strokeWidth={1.8} />
            <Text style={styles.noticeText}>{t('invite.needsOnboarding')}</Text>
          </View>
        )}
        {p.duplicate_active_grant && (
          <View style={[styles.noticeCard, styles.noticeCardWarning]}>
            <AlertCircle size={rs(18)} color={colors.warning} strokeWidth={1.8} />
            <Text style={styles.noticeText}>{t('invite.duplicateGrant')}</Text>
          </View>
        )}

        {/* Ações */}
        <View style={styles.actions}>
          <Button
            label={
              isAccepting
                ? t('invite.accepting')
                : p.needs_onboarding
                  ? t('invite.needsOnboardingCta')
                  : p.duplicate_active_grant
                    ? t('invite.goToPatients')
                    : t('invite.accept')
            }
            onPress={
              p.duplicate_active_grant
                ? () => router.replace('/pro' as never)
                : handleAccept
            }
            disabled={isAccepting || isDeclining}
            loading={isAccepting}
          />
          <View style={{ height: spacing.sm }} />
          <Button
            label={isDeclining ? t('invite.declining') : t('invite.decline')}
            onPress={handleDecline}
            variant="secondary"
            disabled={isAccepting || isDeclining || p.duplicate_active_grant}
            loading={isDeclining}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Subcomponentes ───────────────────────────────────────────────────────────

function Header({ router, title }: { router: ReturnType<typeof useRouter>; title: string }) {
  // Fallback seguro: se a stack está vazia (ex: cheguei aqui via push depois de
  // um redirect inicial pelo _layout), router.back() lança "GO_BACK was not
  // handled". Caímos no hub silenciosamente em vez de quebrar a nav.
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as never);
  };
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} hitSlop={12}>
        <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: rs(26) }} />
    </View>
  );
}

function ErrorShell({
  router, headerTitle, icon, title,
}: {
  router: ReturnType<typeof useRouter>;
  headerTitle: string;
  icon: React.ReactNode;
  title: string;
}) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <Header router={router} title={headerTitle} />
      <View style={styles.centered}>
        <View style={styles.errorIconWrap}>{icon}</View>
        <Text style={styles.errorTitle}>{title}</Text>
        <View style={{ height: spacing.lg }} />
        <Button
          label={t('common.back')}
          onPress={() => router.back()}
          variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
}

function DetailRow({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        {value.length > 0 && <Text style={styles.detailValue}>{value}</Text>}
      </View>
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },

  scroll: { padding: spacing.md, paddingBottom: rs(40) },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  loadingText: {
    color: colors.textSec, fontSize: fs(13), marginTop: spacing.md,
  },

  // Hero
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  heroAvatarWrap: { marginBottom: spacing.md },
  heroAvatar: {
    width: rs(88), height: rs(88), borderRadius: rs(44),
    backgroundColor: colors.bgCard,
  },
  heroAvatarFallback: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5,
  },
  heroTitle: {
    color: colors.text, fontSize: fs(16), fontWeight: '600',
    textAlign: 'center', lineHeight: fs(23),
  },

  // Details
  detailsCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: rs(12),
  },
  detailIcon: {
    width: rs(32), height: rs(32), borderRadius: rs(16),
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
  },
  detailTextWrap: { flex: 1 },
  detailLabel: {
    color: colors.textSec, fontSize: fs(12), fontWeight: '600',
    letterSpacing: 0.3,
  },
  detailValue: {
    color: colors.text, fontSize: fs(14), fontWeight: '600',
    marginTop: rs(2),
  },

  scopeNotesWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  scopeNotesHeader: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    marginBottom: rs(6),
  },
  scopeNotesLabel: {
    color: colors.textSec, fontSize: fs(11), fontWeight: '700',
    letterSpacing: 0.4,
  },
  scopeNotesText: {
    color: colors.text, fontSize: fs(13), lineHeight: fs(19),
  },

  // Notices
  noticeCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(10),
    backgroundColor: colors.clickSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1, borderColor: colors.clickRing,
    marginBottom: spacing.md,
  },
  noticeCardWarning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  noticeText: {
    flex: 1,
    color: colors.text, fontSize: fs(13), lineHeight: fs(19),
  },

  actions: { marginTop: spacing.sm },

  errorIconWrap: {
    width: rs(80), height: rs(80), borderRadius: rs(40),
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  errorTitle: {
    color: colors.text, fontSize: fs(15), fontWeight: '600',
    textAlign: 'center', lineHeight: fs(22),
    paddingHorizontal: spacing.md,
  },
});
