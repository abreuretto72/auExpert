/**
 * /partnerships — Hub de Parceiros (lado tutor).
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco E · sub-passo 2.6.1
 *
 * Entrada: TutorCard.onPressPartnership (ícone Handshake no card do tutor).
 *
 * O que expõe:
 *   - Tab "Parceiros Ativos" (access_grants aceitos + não revogados + não expirados)
 *     • Cada card mostra pet, profissional, role chip, can_see_finances,
 *       scope_notes, aceito em X, expira em Y
 *     • Long-press OU botão Revogar → confirm + useRevokeGrant
 *   - Tab "Convites Pendentes" (access_invites status=pending)
 *     • Cada card mostra pet, email convidado, role, expira em X
 *     • Botão Cancelar → confirm + useCancelInvite
 *   - FAB "+" laranja → push /partnerships/invite (form)
 *   - Offline banner quando sem rede
 *   - Pull-to-refresh
 *   - Empty state específico por tab
 *
 * Sem CTA pra "aceitar convite" — isso é fluxo do profissional convidado,
 * feito em /invite/[token] via deep link.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Handshake, Plus, WifiOff, ChevronLeft, Mail, Clock,
  Wallet, Dog, Cat, Trash2, RefreshCw, Stethoscope,
} from 'lucide-react-native';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import { useToast } from '../../../components/Toast';
import { useNetwork } from '../../../hooks/useNetwork';
import {
  useMyInvites,
  useMyGrants,
  useCancelInvite,
  useRevokeGrant,
  type TutorInviteItem,
  type TutorGrantItem,
} from '../../../hooks/useTutorPartnerships';
import type { AccessRole } from '../../../types/database';

type Tab = 'partners' | 'invites';

// ═══ Helpers ═════════════════════════════════════════════════════════════════

/** Cor semântica por role (mesma convenção do PatientCard). */
function roleColor(role: AccessRole): string {
  switch (role) {
    case 'vet_full':
    case 'vet_read':
    case 'vet_tech':
      return colors.petrol;
    case 'trainer':
      return colors.purple;
    case 'ong_member':
      return colors.rose;
    default:
      return colors.accent;
  }
}

/** Formata "expira em X dias" / "hoje" / "amanhã" / "expirado". */
function formatRelativeExpiry(
  expiresAt: string | null | undefined,
  t: (k: string, p?: Record<string, unknown>) => string,
): string | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt).getTime();
  if (Number.isNaN(exp)) return null;
  const diffMs = exp - Date.now();
  if (diffMs <= 0) return t('partnerships.expired');
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 1) return t('partnerships.expiresToday');
  if (diffDays === 2) return t('partnerships.expiresTomorrow');
  return t('partnerships.expiresInDays', { count: diffDays });
}

/** Mapeia code/status de EF cancel → chave i18n. */
function cancelErrorKey(code: string): string {
  switch (code) {
    case 'INVITE_NOT_FOUND': return 'partnerships.errors.inviteNotFound';
    case 'UNAUTHORIZED':     return 'partnerships.errors.notInviter';
    case 'INVALID_STATE':    return 'partnerships.errors.alreadyResolved';
    case 'offline_action':   return 'partnerships.errors.offline';
    default:                 return 'partnerships.errors.generic';
  }
}

/** Mapeia code/status de revoke → chave i18n. */
function revokeErrorKey(code: string): string {
  switch (code) {
    case 'GRANT_NOT_FOUND_OR_ALREADY_REVOKED': return 'partnerships.errors.alreadyRevoked';
    case 'offline_action':                     return 'partnerships.errors.offline';
    default:                                   return 'partnerships.errors.generic';
  }
}

// ═══ Card: parceiro ativo (grant) ═════════════════════════════════════════════

interface PartnerGrantCardProps {
  grant: TutorGrantItem;
  onRevoke: (grant: TutorGrantItem) => void;
  isRevoking: boolean;
}

const PartnerGrantCard = React.memo<PartnerGrantCardProps>(({ grant, onRevoke, isRevoking }) => {
  const { t } = useTranslation();
  const isDog = grant.pet_species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const rc = roleColor(grant.role);
  const expiryLabel = formatRelativeExpiry(grant.expires_at, t);

  return (
    <View style={styles.card}>
      {/* Topo: pet avatar + pet name + role chip */}
      <View style={styles.cardTop}>
        <View
          style={[
            styles.petAvatar,
            { borderColor: petColor + '40', backgroundColor: colors.bgCard },
          ]}
        >
          {isDog ? (
            <Dog size={rs(22)} color={petColor} strokeWidth={1.8} />
          ) : (
            <Cat size={rs(22)} color={petColor} strokeWidth={1.8} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.petName} numberOfLines={1}>{grant.pet_name}</Text>
          <View style={[styles.roleChip, { backgroundColor: rc + '1F', borderColor: rc + '40' }]}>
            <Text style={[styles.roleChipText, { color: rc }]} numberOfLines={1}>
              {t(`roles.${grant.role}`, { defaultValue: grant.role })}
            </Text>
          </View>
        </View>
      </View>

      {/* Meio: profissional + finanças */}
      <View style={styles.cardMid}>
        <View style={styles.metaRow}>
          <Stethoscope size={rs(13)} color={colors.textDim} strokeWidth={1.8} />
          <Text style={styles.metaText} numberOfLines={1}>
            {grant.professional_display_name || t('partnerships.unknownProfessional')}
          </Text>
        </View>

        {grant.can_see_finances ? (
          <View style={styles.metaRow}>
            <Wallet size={rs(13)} color={colors.accent} strokeWidth={1.8} />
            <Text style={[styles.metaText, { color: colors.accent }]}>
              {t('partnerships.canSeeFinances')}
            </Text>
          </View>
        ) : null}

        {grant.scope_notes ? (
          <Text style={styles.scopeNotes} numberOfLines={2}>
            {grant.scope_notes}
          </Text>
        ) : null}

        {expiryLabel ? (
          <View style={styles.metaRow}>
            <Clock size={rs(12)} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.expiryText}>{expiryLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Rodapé: botão revogar */}
      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={() => onRevoke(grant)}
        disabled={isRevoking}
        activeOpacity={0.7}
      >
        <Trash2 size={rs(14)} color={colors.danger} strokeWidth={2} />
        <Text style={styles.dangerBtnText}>{t('partnerships.revokeAccess')}</Text>
      </TouchableOpacity>
    </View>
  );
});
PartnerGrantCard.displayName = 'PartnerGrantCard';

// ═══ Card: convite pendente ══════════════════════════════════════════════════

interface PendingInviteCardProps {
  invite: TutorInviteItem;
  onCancel: (invite: TutorInviteItem) => void;
  isCancelling: boolean;
}

const PendingInviteCard = React.memo<PendingInviteCardProps>(({ invite, onCancel, isCancelling }) => {
  const { t } = useTranslation();
  const isDog = invite.pet_species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;
  const rc = roleColor(invite.role);
  const expiryLabel = formatRelativeExpiry(invite.expires_at, t);

  return (
    <View style={styles.card}>
      {/* Topo: pet + role chip */}
      <View style={styles.cardTop}>
        <View
          style={[
            styles.petAvatar,
            { borderColor: petColor + '40', backgroundColor: colors.bgCard },
          ]}
        >
          {isDog ? (
            <Dog size={rs(22)} color={petColor} strokeWidth={1.8} />
          ) : (
            <Cat size={rs(22)} color={petColor} strokeWidth={1.8} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.petName} numberOfLines={1}>{invite.pet_name}</Text>
          <View style={[styles.roleChip, { backgroundColor: rc + '1F', borderColor: rc + '40' }]}>
            <Text style={[styles.roleChipText, { color: rc }]} numberOfLines={1}>
              {t(`roles.${invite.role}`, { defaultValue: invite.role })}
            </Text>
          </View>
        </View>
      </View>

      {/* Meio: email + expiry */}
      <View style={styles.cardMid}>
        <View style={styles.metaRow}>
          <Mail size={rs(13)} color={colors.petrol} strokeWidth={1.8} />
          <Text style={styles.metaText} numberOfLines={1}>{invite.invite_email}</Text>
        </View>

        {invite.can_see_finances ? (
          <View style={styles.metaRow}>
            <Wallet size={rs(13)} color={colors.accent} strokeWidth={1.8} />
            <Text style={[styles.metaText, { color: colors.accent }]}>
              {t('partnerships.canSeeFinances')}
            </Text>
          </View>
        ) : null}

        {invite.scope_notes ? (
          <Text style={styles.scopeNotes} numberOfLines={2}>
            {invite.scope_notes}
          </Text>
        ) : null}

        {expiryLabel ? (
          <View style={styles.metaRow}>
            <Clock size={rs(12)} color={colors.warning} strokeWidth={1.8} />
            <Text style={[styles.expiryText, { color: colors.warning }]}>{expiryLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* Rodapé: botão cancelar */}
      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={() => onCancel(invite)}
        disabled={isCancelling}
        activeOpacity={0.7}
      >
        <Trash2 size={rs(14)} color={colors.danger} strokeWidth={2} />
        <Text style={styles.dangerBtnText}>{t('partnerships.cancelInvite')}</Text>
      </TouchableOpacity>
    </View>
  );
});
PendingInviteCard.displayName = 'PendingInviteCard';

// ═══ Empty / Offline states ══════════════════════════════════════════════════

function EmptyState({ tab, onInvite }: { tab: Tab; onInvite: () => void }) {
  const { t } = useTranslation();
  const Icon = tab === 'partners' ? Handshake : Mail;
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconWrap}>
        <Icon size={rs(40)} color={colors.accent} strokeWidth={1.5} />
      </View>
      <Text style={styles.emptyTitle}>
        {tab === 'partners' ? t('partnerships.emptyPartnersTitle') : t('partnerships.emptyInvitesTitle')}
      </Text>
      <Text style={styles.emptyText}>
        {tab === 'partners' ? t('partnerships.emptyPartnersText') : t('partnerships.emptyInvitesText')}
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onInvite} activeOpacity={0.85}>
        <Plus size={rs(16)} color="#FFFFFF" strokeWidth={2} />
        <Text style={styles.emptyCtaText}>{t('partnerships.inviteCta')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function OfflineBanner() {
  const { t } = useTranslation();
  return (
    <View style={styles.offlineBanner}>
      <WifiOff size={rs(14)} color={colors.warning} strokeWidth={2} />
      <Text style={styles.offlineText}>{t('partnerships.offline')}</Text>
    </View>
  );
}

// ═══ Tela ════════════════════════════════════════════════════════════════════

export default function PartnershipsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const { isOnline } = useNetwork();

  const [tab, setTab] = useState<Tab>('partners');

  const invitesQ = useMyInvites();
  const grantsQ = useMyGrants();
  const { cancelInvite, isCancelling } = useCancelInvite();
  const { revokeGrant, isRevoking } = useRevokeGrant();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)' as never);
  }, [router]);

  const handleRefresh = useCallback(() => {
    if (tab === 'partners') grantsQ.refetch();
    else invitesQ.refetch();
  }, [tab, grantsQ, invitesQ]);

  const handleNewInvite = useCallback(() => {
    router.push('/(app)/partnerships/invite' as never);
  }, [router]);

  const handleCancelInvite = useCallback(async (invite: TutorInviteItem) => {
    const ok = await confirm({
      text: t('partnerships.confirmCancel', { email: invite.invite_email, pet: invite.pet_name }),
      type: 'warning',
    });
    if (!ok) return;
    try {
      await cancelInvite({ invite_id: invite.id });
      toast(t('partnerships.toast.cancelled'), 'success');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'INTERNAL';
      toast(t(cancelErrorKey(code)), 'error');
    }
  }, [cancelInvite, confirm, t, toast]);

  const handleRevokeGrant = useCallback(async (grant: TutorGrantItem) => {
    const ok = await confirm({
      text: t('partnerships.confirmRevoke', {
        name: grant.professional_display_name || t('partnerships.unknownProfessional'),
        pet: grant.pet_name,
      }),
      type: 'warning',
    });
    if (!ok) return;
    try {
      await revokeGrant({ grant_id: grant.id, reason: null });
      toast(t('partnerships.toast.revoked'), 'success');
    } catch (err) {
      const code = err instanceof Error ? err.message : 'INTERNAL';
      toast(t(revokeErrorKey(code)), 'error');
    }
  }, [revokeGrant, confirm, t, toast]);

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderGrant = useCallback(({ item }: { item: TutorGrantItem }) => (
    <PartnerGrantCard grant={item} onRevoke={handleRevokeGrant} isRevoking={isRevoking} />
  ), [handleRevokeGrant, isRevoking]);

  const renderInvite = useCallback(({ item }: { item: TutorInviteItem }) => (
    <PendingInviteCard invite={item} onCancel={handleCancelInvite} isCancelling={isCancelling} />
  ), [handleCancelInvite, isCancelling]);

  const grantKey = useCallback((item: TutorGrantItem) => item.id, []);
  const inviteKey = useCallback((item: TutorInviteItem) => item.id, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const partnersCount = grantsQ.count;
  const invitesCount = invitesQ.count;
  const activeQ = tab === 'partners' ? grantsQ : invitesQ;
  const isInitialLoading =
    activeQ.isLoading && (tab === 'partners' ? grantsQ.count === 0 : invitesQ.count === 0);

  const headerTitle = useMemo(() => t('partnerships.title'), [t]);

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={rs(24)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Handshake size={rs(18)} color={colors.accent} strokeWidth={1.8} />
          <Text style={styles.headerTitle}>{headerTitle}</Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={handleRefresh}
          disabled={activeQ.isFetching}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          {activeQ.isFetching ? (
            <ActivityIndicator size={rs(14)} color={colors.accent} />
          ) : (
            <RefreshCw size={rs(16)} color={colors.accent} strokeWidth={1.8} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'partners' && styles.tabActive]}
          onPress={() => setTab('partners')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'partners' && styles.tabTextActive]}>
            {t('partnerships.tabPartners', { count: partnersCount })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'invites' && styles.tabActive]}
          onPress={() => setTab('invites')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'invites' && styles.tabTextActive]}>
            {t('partnerships.tabInvites', { count: invitesCount })}
          </Text>
        </TouchableOpacity>
      </View>

      {!isOnline ? <OfflineBanner /> : null}

      {/* Content */}
      {isInitialLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size={rs(24)} color={colors.accent} />
        </View>
      ) : activeQ.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{t('partnerships.errors.generic')}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : tab === 'partners' ? (
        <FlatList
          data={grantsQ.grants}
          renderItem={renderGrant}
          keyExtractor={grantKey}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={<EmptyState tab="partners" onInvite={handleNewInvite} />}
          refreshControl={
            <RefreshControl
              refreshing={grantsQ.isFetching && grantsQ.count > 0}
              onRefresh={grantsQ.refetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={invitesQ.invites}
          renderItem={renderInvite}
          keyExtractor={inviteKey}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={<EmptyState tab="invites" onInvite={handleNewInvite} />}
          refreshControl={
            <RefreshControl
              refreshing={invitesQ.isFetching && invitesQ.count > 0}
              onRefresh={invitesQ.refetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleNewInvite}
        activeOpacity={0.85}
        accessibilityLabel={t('partnerships.inviteCta')}
      >
        <Plus size={rs(24)} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ═══ Estilos ═════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.sm),
    paddingBottom: rs(spacing.md),
    gap: rs(12),
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  refreshBtn: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: rs(spacing.md),
    marginBottom: rs(spacing.md),
    backgroundColor: colors.bgCard,
    borderRadius: rs(radii.lg),
    padding: rs(4),
  },
  tab: {
    flex: 1,
    paddingVertical: rs(10),
    alignItems: 'center',
    borderRadius: rs(radii.md),
  },
  tabActive: {
    backgroundColor: colors.card,
    borderWidth: rs(1),
    borderColor: colors.border,
  },
  tabText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.textDim,
    letterSpacing: rs(0.3),
  },
  tabTextActive: {
    color: colors.text,
  },

  // Offline
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginHorizontal: rs(spacing.md),
    marginBottom: rs(spacing.sm),
    paddingHorizontal: rs(12),
    paddingVertical: rs(8),
    borderRadius: rs(radii.md),
    backgroundColor: colors.warning + '1F',
    borderWidth: rs(1),
    borderColor: colors.warning + '40',
  },
  offlineText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.warning,
    flex: 1,
  },

  // List
  listPadding: {
    paddingHorizontal: rs(spacing.md),
    paddingBottom: rs(spacing.xxl) + rs(72), // espaço pro FAB
    flexGrow: 1,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: rs(1),
    borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
    gap: rs(spacing.sm),
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
  },
  petAvatar: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(14),
    borderWidth: rs(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  petName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
    marginBottom: rs(4),
  },
  roleChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: rs(10),
    paddingVertical: rs(3),
    borderRadius: rs(8),
    borderWidth: rs(1),
  },
  roleChipText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    letterSpacing: rs(0.4),
    textTransform: 'uppercase',
  },
  cardMid: {
    gap: rs(6),
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
  },
  metaText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.textSec,
    flex: 1,
  },
  expiryText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(11),
    color: colors.textDim,
    letterSpacing: rs(0.3),
  },
  scopeNotes: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    lineHeight: rs(18),
    marginTop: rs(2),
  },

  // Danger button (cancel/revoke)
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    paddingVertical: rs(10),
    borderRadius: rs(radii.md),
    backgroundColor: colors.danger + '12',
    borderWidth: rs(1),
    borderColor: colors.danger + '30',
  },
  dangerBtnText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
    color: colors.danger,
    letterSpacing: rs(0.3),
  },

  // Empty
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(spacing.xxl),
    paddingHorizontal: rs(spacing.lg),
  },
  emptyIconWrap: {
    width: rs(80),
    height: rs(80),
    borderRadius: rs(24),
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.md),
  },
  emptyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(17),
    color: colors.text,
    textAlign: 'center',
    marginBottom: rs(8),
  },
  emptyText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: rs(19),
    marginBottom: rs(spacing.md),
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(spacing.lg),
    paddingVertical: rs(12),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.accent,
  },
  emptyCtaText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: '#FFFFFF',
  },

  // Loading + error
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(spacing.xxl),
  },
  errorBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(spacing.xxl),
    paddingHorizontal: rs(spacing.lg),
  },
  errorText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(14),
    color: colors.danger,
    textAlign: 'center',
    marginBottom: rs(spacing.md),
  },
  retryBtn: {
    paddingHorizontal: rs(spacing.lg),
    paddingVertical: rs(spacing.sm),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.accent,
  },
  retryText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: '#FFFFFF',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: rs(spacing.md),
    bottom: rs(spacing.lg),
    width: rs(56),
    height: rs(56),
    borderRadius: rs(20),
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});
