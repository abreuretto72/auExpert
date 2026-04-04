/**
 * CoparentsScreen — gerencia co-tutores do pet.
 *
 * Mostra membros ativos e pendentes, permite convidar novos
 * co-tutores via link de convite e remover acesso existente.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, TextInput, Switch, Modal, Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Users, UserPlus, UserCheck, Eye, Heart,
  ChevronDown, ChevronUp, Share2,
  Clock, Check, X, Trash2, AlertTriangle,
} from 'lucide-react-native';
import { usePet } from '../../../../hooks/usePets';
import { usePetMembers, useMyPetRole } from '../../../../hooks/usePetMembers';
import type { PetMember, MemberRole, InviteParams } from '../../../../hooks/usePetMembers';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../constants/colors';
import { rs, fs } from '../../../../hooks/useResponsive';
import { radii, spacing } from '../../../../constants/spacing';

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<MemberRole, { labelKey: string; color: string; Icon: React.ElementType }> = {
  owner:     { labelKey: 'members.roles.owner',     color: colors.accent,   Icon: Heart },
  co_parent: { labelKey: 'members.roles.co_parent', color: colors.purple,   Icon: UserCheck },
  caregiver: { labelKey: 'members.roles.caregiver', color: colors.petrol,   Icon: Users },
  viewer:    { labelKey: 'members.roles.viewer',    color: colors.textDim,  Icon: Eye },
};

const INVITE_ROLES: Array<'co_parent' | 'caregiver' | 'viewer'> = [
  'co_parent', 'caregiver', 'viewer',
];

// ── MemberCard ─────────────────────────────────────────────────────────────────

function MemberCard({
  member, canManage, onRemove, t,
}: {
  member: PetMember;
  canManage: boolean;
  onRemove: (id: string) => void;
  t: (k: string, opts?: Record<string, string | number>) => string;
}) {
  const cfg = ROLE_CONFIG[member.role];
  const Icon = cfg.Icon;
  const displayName = member.users?.full_name ?? member.nickname ?? member.email ?? '—';
  const isPending = member.accepted_at === null;

  const isExpired = member.expires_at
    ? new Date(member.expires_at) < new Date()
    : false;

  const daysLeft = member.expires_at
    ? Math.ceil((new Date(member.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <View style={s.memberCard}>
      <View style={[s.memberIconCircle, { backgroundColor: cfg.color + '18' }]}>
        <Icon size={rs(22)} color={cfg.color} strokeWidth={1.8} />
      </View>
      <View style={s.memberInfo}>
        <Text style={s.memberName}>{displayName}</Text>
        <View style={s.memberMeta}>
          <View style={[s.roleBadge, { backgroundColor: cfg.color + '18' }]}>
            <Text style={[s.roleText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
          </View>
          {isPending && (
            <View style={[s.statusBadge, { backgroundColor: colors.warningSoft }]}>
              <Clock size={rs(10)} color={colors.warning} strokeWidth={2} />
              <Text style={[s.statusText, { color: colors.warning }]}>{t('members.pending')}</Text>
            </View>
          )}
          {!isPending && !isExpired && daysLeft !== null && daysLeft <= 7 && (
            <Text style={s.expiresText}>
              {t('members.expiresDays', { days: daysLeft })}
            </Text>
          )}
          {isExpired && (
            <Text style={[s.expiresText, { color: colors.danger }]}>{t('members.expired')}</Text>
          )}
        </View>
      </View>
      {canManage && (
        <TouchableOpacity
          style={s.removeBtn}
          onPress={() => onRemove(member.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={rs(16)} color={colors.danger} strokeWidth={1.8} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── InviteSheet ────────────────────────────────────────────────────────────────

const DEFAULT_INVITE_DAYS: Record<string, number> = { co_parent: 1, caregiver: 7, viewer: 30 };

function InviteSheet({
  visible, onClose, onInvite, t,
}: {
  visible: boolean;
  onClose: () => void;
  onInvite: (params: InviteParams) => Promise<string>;
  t: (k: string, opts?: Record<string, string | number>) => string;
}) {
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'co_parent' | 'caregiver' | 'viewer'>('co_parent');
  const [canSeeFinances, setCanSeeFinances] = useState(true);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [expiryDays, setExpiryDays] = useState(1);

  const emailRequired = role === 'co_parent';
  const canGenerate = !loading && (!emailRequired || email.trim().length > 0);

  const reset = () => {
    setEmail(''); setNickname(''); setRole('co_parent');
    setCanSeeFinances(true); setInviteLink(null); setExpiryDays(1);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleRoleChange = (r: 'co_parent' | 'caregiver' | 'viewer') => {
    setRole(r);
    setCanSeeFinances(r === 'co_parent');
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const days = DEFAULT_INVITE_DAYS[role] ?? 7;
    setLoading(true);
    try {
      const link = await onInvite({
        email: email.trim() || undefined,
        role,
        nickname: nickname.trim() || undefined,
        can_see_finances: canSeeFinances,
        expires_days: days,
      });
      setInviteLink(link);
      setExpiryDays(days);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    await Share.share({
      message: t('members.inviteMessage', { link: inviteLink }),
      title: t('members.inviteTitle'),
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.sheetBackdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{t('members.add')}</Text>
            <TouchableOpacity onPress={handleClose}>
              <X size={rs(20)} color={colors.textDim} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {!inviteLink ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: rs(spacing.xl) }}>
              {/* Role selector — first */}
              <Text style={s.fieldLabel}>{t('members.roles.label')}</Text>
              <View style={s.roleRow}>
                {INVITE_ROLES.map((r) => {
                  const cfg = ROLE_CONFIG[r];
                  const active = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[s.roleChip, active && { borderColor: cfg.color, backgroundColor: cfg.color + '18' }]}
                      onPress={() => handleRoleChange(r)}
                    >
                      <Text style={[s.roleChipText, active && { color: cfg.color }]}>
                        {t(cfg.labelKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Validity info */}
              <View style={s.validityInfo}>
                <Text style={s.validityText}>
                  {t('members.validFor', { days: DEFAULT_INVITE_DAYS[role] ?? 7 })}
                </Text>
              </View>

              {/* Email */}
              <Text style={s.fieldLabel}>
                {emailRequired ? t('members.emailRequired') : t('members.emailOptional')}
              </Text>
              {emailRequired && (
                <Text style={s.emailRequiredNote}>{t('members.emailRequiredForCoparent')}</Text>
              )}
              <TextInput
                style={[s.fieldInput, emailRequired && !email.trim() && s.fieldInputError]}
                value={email}
                onChangeText={setEmail}
                placeholder="email@exemplo.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {/* No-email warning */}
              {!emailRequired && !email.trim() && (
                <View style={s.securityWarning}>
                  <AlertTriangle size={rs(13)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={s.securityWarningText}>{t('members.noEmailWarning')}</Text>
                </View>
              )}

              {/* Nickname */}
              <Text style={s.fieldLabel}>{t('members.nickname')}</Text>
              <TextInput
                style={s.fieldInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder={t('members.nicknamePH')}
                placeholderTextColor={colors.placeholder}
              />

              {/* Finances toggle */}
              <View style={s.toggleRow}>
                <Text style={s.toggleLabel}>{t('members.seeFinances')}</Text>
                <Switch
                  value={canSeeFinances}
                  onValueChange={setCanSeeFinances}
                  trackColor={{ false: colors.border, true: colors.accent + '80' }}
                  thumbColor={canSeeFinances ? colors.accent : colors.textDim}
                />
              </View>

              {/* Generate button */}
              <TouchableOpacity
                style={[s.primaryBtn, !canGenerate && s.btnDisabled]}
                onPress={handleGenerate}
                disabled={!canGenerate}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.primaryBtnText}>{t('members.generateLink')}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* Link gerado */
            <View style={s.linkSection}>
              <Check size={rs(32)} color={colors.success} strokeWidth={2} />
              <Text style={s.linkTitle}>{t('members.linkReady')}</Text>
              <View style={s.linkBox}>
                <Text style={s.linkText} numberOfLines={2}>{inviteLink}</Text>
              </View>
              <View style={s.linkValidity}>
                <Text style={s.validityText}>
                  {t('members.linkExpiresIn', { days: expiryDays })}
                </Text>
              </View>
              <TouchableOpacity style={s.primaryBtn} onPress={handleShare}>
                <Share2 size={rs(16)} color="#fff" strokeWidth={1.8} />
                <Text style={s.primaryBtnText}>{t('members.shareInvite')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.closeLink} onPress={handleClose}>
                <Text style={s.closeLinkText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export default function CoparentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { data: pet } = usePet(id!);
  const { members, activeMembers, pendingMembers, isLoading, refetch, inviteMember, removeMember } = usePetMembers(id!);
  const myRole = useMyPetRole(id!);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPending, setShowPending] = useState(true);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleRemove = useCallback(async (memberId: string) => {
    const yes = await confirm({ text: t('members.removeConfirm'), type: 'warning' });
    if (!yes) return;
    try {
      await removeMember(memberId);
      toast(t('members.removeSuccess'), 'success');
    } catch {
      toast(t('errors.editFailed'), 'error');
    }
  }, [confirm, removeMember, toast, t]);

  const handleInvite = useCallback(async (params: InviteParams): Promise<string> => {
    try {
      const link = await inviteMember(params);
      return link;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'email_required_for_co_parent') {
        toast(t('members.errorEmailRequired'), 'error');
      } else if (msg === 'max_invites_reached') {
        toast(t('members.errorMaxInvites'), 'warning');
      } else {
        toast(t('errors.editFailed'), 'error');
      }
      throw e;
    }
  }, [inviteMember, toast, t]);

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header card */}
        <View style={s.headerCard}>
          <Users size={rs(20)} color={colors.accent} strokeWidth={1.8} />
          <View style={s.headerInfo}>
            <Text style={s.headerTitle}>
              {t('members.delegateTitle', { name: pet?.name ?? '…' })}
            </Text>
            <Text style={s.headerSub}>
              {t('members.activeCount', { count: activeMembers.length + 1 })}
            </Text>
          </View>
          {(myRole.canManageMembers || myRole.isOwner) && (
            <TouchableOpacity style={s.addBtn} onPress={() => setInviteVisible(true)}>
              <UserPlus size={rs(18)} color="#fff" strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>

        {/* Active members */}
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: rs(32) }} />
        ) : (
          <>
            <Text style={s.sectionLabel}>{t('members.active')}</Text>

            {/* Owner (yourself or pet.user_id) */}
            <View style={s.memberCard}>
              <View style={[s.memberIconCircle, { backgroundColor: colors.accent + '18' }]}>
                <Heart size={rs(22)} color={colors.accent} strokeWidth={1.8} />
              </View>
              <View style={s.memberInfo}>
                <Text style={s.memberName}>{t('members.you')}</Text>
                <View style={[s.roleBadge, { backgroundColor: colors.accent + '18' }]}>
                  <Text style={[s.roleText, { color: colors.accent }]}>
                    {t(ROLE_CONFIG[myRole.role].labelKey)}
                  </Text>
                </View>
              </View>
            </View>

            {activeMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                canManage={myRole.canManageMembers}
                onRemove={handleRemove}
                t={t}
              />
            ))}

            {activeMembers.length === 0 && (
              <Text style={s.emptyText}>{t('members.noOthers')}</Text>
            )}

            {/* Pending invites */}
            {pendingMembers.length > 0 && (
              <>
                <TouchableOpacity
                  style={s.pendingHeader}
                  onPress={() => setShowPending(!showPending)}
                >
                  <Clock size={rs(14)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={s.pendingHeaderText}>
                    {t('members.pendingCount', { count: pendingMembers.length })}
                  </Text>
                  {showPending
                    ? <ChevronUp size={rs(16)} color={colors.textDim} strokeWidth={1.8} />
                    : <ChevronDown size={rs(16)} color={colors.textDim} strokeWidth={1.8} />
                  }
                </TouchableOpacity>
                {showPending && pendingMembers.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    canManage={myRole.canManageMembers}
                    onRemove={handleRemove}
                    t={t}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Add button (bottom) */}
        {(myRole.canManageMembers || myRole.isOwner) && !isLoading && (
          <TouchableOpacity style={s.addBottomBtn} onPress={() => setInviteVisible(true)}>
            <UserPlus size={rs(18)} color={colors.accent} strokeWidth={1.8} />
            <Text style={s.addBottomBtnText}>{t('members.add')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <InviteSheet
        visible={inviteVisible}
        onClose={() => setInviteVisible(false)}
        onInvite={handleInvite}
        t={t}
      />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: rs(spacing.md), paddingBottom: rs(spacing.xxl), gap: rs(spacing.sm) },

  // Header card
  headerCard: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: rs(radii.card), padding: rs(spacing.md),
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.text },
  headerSub: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textSec, marginTop: rs(2) },
  addBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },

  // Section label
  sectionLabel: {
    fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim,
    letterSpacing: 1.5, textTransform: 'uppercase', marginTop: rs(8),
  },

  // Member card
  memberCard: {
    flexDirection: 'row', alignItems: 'center', gap: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: rs(radii.card), padding: rs(spacing.md),
  },
  memberIconCircle: {
    width: rs(44), height: rs(44), borderRadius: rs(22),
    alignItems: 'center', justifyContent: 'center',
  },
  memberInfo: { flex: 1, gap: rs(4) },
  memberName: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text },
  memberMeta: { flexDirection: 'row', gap: rs(6), flexWrap: 'wrap', alignItems: 'center' },
  roleBadge: {
    alignSelf: 'flex-start', paddingHorizontal: rs(8), paddingVertical: rs(2),
    borderRadius: rs(radii.sm),
  },
  roleText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10) },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: rs(3),
    paddingHorizontal: rs(6), paddingVertical: rs(2), borderRadius: rs(radii.sm),
  },
  statusText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10) },
  expiresText: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim },
  removeBtn: {
    width: rs(36), height: rs(36), borderRadius: rs(10),
    backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center',
  },

  // Pending section
  pendingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: rs(8),
    paddingVertical: rs(8), marginTop: rs(4),
  },
  pendingHeaderText: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.warning },

  // Empty
  emptyText: {
    fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim,
    textAlign: 'center', paddingVertical: rs(16),
  },

  // Add bottom button
  addBottomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    marginTop: rs(8), paddingVertical: rs(14), borderRadius: rs(radii.card),
    borderWidth: 1.5, borderColor: colors.accent + '40', borderStyle: 'dashed',
  },
  addBottomBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.accent },

  // Invite sheet
  sheetBackdrop: {
    flex: 1, backgroundColor: 'rgba(11,18,25,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26),
    padding: rs(24), maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: rs(20),
  },
  sheetTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text },

  // Form fields
  fieldLabel: {
    fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.textDim,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: rs(6), marginTop: rs(12),
  },
  fieldInput: {
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: rs(radii.lg), padding: rs(14),
    fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.text,
  },

  // Role chips
  roleRow: { flexDirection: 'row', gap: rs(8) },
  roleChip: {
    flex: 1, paddingVertical: rs(10), borderRadius: rs(radii.lg),
    borderWidth: 1.5, borderColor: colors.border, alignItems: 'center',
  },
  roleChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.textSec },

  // Toggles
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: rs(16),
  },
  toggleLabel: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textSec },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    marginTop: rs(20), backgroundColor: colors.accent,
    borderRadius: rs(radii.xl), paddingVertical: rs(16),
  },
  primaryBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: '#fff' },
  btnDisabled: { opacity: 0.45 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    marginTop: rs(12), borderWidth: 1.5, borderColor: colors.accent + '50',
    borderRadius: rs(radii.xl), paddingVertical: rs(14),
  },
  secondaryBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(15), color: colors.accent },

  // Link section
  linkSection: { alignItems: 'center', gap: rs(12), paddingTop: rs(8) },
  linkTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.text },
  linkBox: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: rs(radii.lg), padding: rs(12), width: '100%',
  },
  linkText: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(12), color: colors.textSec },
  closeLink: { marginTop: rs(4) },
  closeLinkText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.textDim },

  // Invite form extras
  emailRequiredNote: {
    fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim,
    marginBottom: rs(6), marginTop: rs(2),
  },
  fieldInputError: { borderColor: colors.danger },
  securityWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(6),
    backgroundColor: colors.warningSoft, borderRadius: rs(radii.sm),
    padding: rs(10), marginTop: rs(6),
  },
  securityWarningText: {
    flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.warning,
  },
  validityInfo: {
    backgroundColor: colors.petrolSoft, borderRadius: rs(radii.sm),
    paddingHorizontal: rs(10), paddingVertical: rs(6), marginTop: rs(8),
    alignSelf: 'flex-start',
  },
  validityText: { fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.petrol },
  linkValidity: {
    backgroundColor: colors.successSoft, borderRadius: rs(radii.sm),
    paddingHorizontal: rs(14), paddingVertical: rs(6),
  },
});
