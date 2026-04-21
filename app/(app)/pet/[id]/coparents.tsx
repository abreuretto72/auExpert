/**
 * CoparentsScreen — gerencia tutores do pet.
 *
 * Hierarquia de tutores:
 *   ROOT      = pets.user_id (fundador, imovível, único que designa owners)
 *   CO-OWNER  = pet_members.role='owner' (poderes operacionais de admin, sem poder de designar)
 *   CO-PARENT = pet_members.role='co_parent'
 *   CAREGIVER = pet_members.role='caregiver'
 *   VIEWER    = pet_members.role='viewer'
 *
 * Permissões são sempre escopadas ao pet específico.
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
  ChevronDown, ChevronUp, Share2, Crown, ShieldCheck,
  Clock, Check, X, Trash2, AlertTriangle, Info,
} from 'lucide-react-native';
import { usePet } from '../../../../hooks/usePets';
import { usePetMembers, useMyPetRole } from '../../../../hooks/usePetMembers';
import type { PetMember, MemberRole, InviteParams } from '../../../../hooks/usePetMembers';
import { useToast } from '../../../../components/Toast';
import { colors } from '../../../../constants/colors';
import { rs, fs } from '../../../../hooks/useResponsive';
import { radii, spacing } from '../../../../constants/spacing';

// ── Role visual config ─────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<MemberRole, {
  labelKey: string;
  descKey: string;
  color: string;
  Icon: React.ElementType;
}> = {
  owner:     { labelKey: 'members.roles.owner',     descKey: 'members.roles.ownerDesc',     color: colors.accent,  Icon: ShieldCheck },
  co_parent: { labelKey: 'members.roles.co_parent', descKey: 'members.roles.coParentDesc',  color: colors.purple,  Icon: UserCheck },
  caregiver: { labelKey: 'members.roles.caregiver', descKey: 'members.roles.caregiverDesc', color: colors.petrol,  Icon: Users },
  viewer:    { labelKey: 'members.roles.viewer',    descKey: 'members.roles.viewerDesc',    color: colors.textDim, Icon: Eye },
};

// Invite expiry — owner has no expiry (0 = permanent)
const DEFAULT_INVITE_DAYS: Partial<Record<MemberRole, number>> = {
  owner: 0, co_parent: 1, caregiver: 7, viewer: 30,
};

// ── canRemoveMember ────────────────────────────────────────────────────────────

function canRemoveMember(
  memberRole: MemberRole,
  isRoot: boolean,             // is this member the pet root?
  myRole: ReturnType<typeof useMyPetRole>,
): boolean {
  if (isRoot) return false;    // root is immovable
  if (memberRole === 'owner')     return myRole.canRemoveOwner;
  if (memberRole === 'co_parent') return myRole.canRemoveCoParent;
  if (memberRole === 'caregiver') return myRole.canRemoveCaregiver;
  if (memberRole === 'viewer')    return myRole.canRemoveViewer;
  return false;
}

// ── MemberCard ─────────────────────────────────────────────────────────────────

function MemberCard({
  member, petRootUserId, myRole, onRemove, t,
}: {
  member: PetMember;
  petRootUserId: string | undefined;
  myRole: ReturnType<typeof useMyPetRole>;
  onRemove: (id: string) => void;
  t: (k: string, opts?: Record<string, string | number>) => string;
}) {
  const cfg = ROLE_CONFIG[member.role];
  const Icon = cfg.Icon;
  const displayName = member.users?.full_name ?? member.nickname ?? member.email ?? '—';
  const isPending   = member.accepted_at === null;
  const isMemberRoot = member.user_id != null && member.user_id === petRootUserId;

  const isExpired = member.expires_at
    ? new Date(member.expires_at) < new Date()
    : false;
  const daysLeft = member.expires_at
    ? Math.ceil((new Date(member.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  const removable = canRemoveMember(member.role, isMemberRoot, myRole);

  return (
    <View style={[s.memberCard, isMemberRoot && s.memberCardRoot]}>
      <View style={[s.memberIconCircle, { backgroundColor: cfg.color + '18' }]}>
        <Icon size={rs(20)} color={cfg.color} strokeWidth={1.8} />
      </View>

      <View style={s.memberInfo}>
        <View style={s.memberNameRow}>
          <Text style={s.memberName}>{displayName}</Text>
          {isMemberRoot && (
            <View style={s.rootBadge}>
              <Crown size={rs(10)} color={colors.gold} strokeWidth={2} />
              <Text style={s.rootBadgeText}>{t('members.rootBadge')}</Text>
            </View>
          )}
        </View>
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
            <Text style={s.expiresText}>{t('members.expiresDays', { days: daysLeft })}</Text>
          )}
          {isExpired && (
            <Text style={[s.expiresText, { color: colors.danger }]}>{t('members.expired')}</Text>
          )}
        </View>
      </View>

      {removable && (
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

function InviteSheet({
  visible, onClose, onInvite, availableRoles, petName, t,
}: {
  visible: boolean;
  onClose: () => void;
  onInvite: (params: InviteParams) => Promise<string>;
  availableRoles: MemberRole[];
  petName: string;
  t: (k: string, opts?: Record<string, string | number>) => string;
}) {
  const [email, setEmail]                     = useState('');
  const [nickname, setNickname]               = useState('');
  const [role, setRole]                       = useState<MemberRole>(availableRoles[0] ?? 'caregiver');
  const [canSeeFinances, setCanSeeFinances]   = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [inviteStatus, setInviteStatus]       = useState<'granted' | 'pending' | null>(null);
  const [expiryDays, setExpiryDays]           = useState(7);

  const emailRequired = role === 'co_parent' || role === 'owner';
  const canGenerate   = !loading && (!emailRequired || email.trim().length > 0);

  const reset = () => {
    setEmail(''); setNickname('');
    setRole(availableRoles[0] ?? 'caregiver');
    setCanSeeFinances(false); setInviteStatus(null); setExpiryDays(7);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleRoleChange = (r: MemberRole) => {
    setRole(r);
    setCanSeeFinances(r === 'co_parent' || r === 'owner');
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const days = DEFAULT_INVITE_DAYS[role] ?? 7;
    setLoading(true);
    try {
      const status = await onInvite({
        email:            email.trim() || undefined,
        role,
        nickname:         nickname.trim() || undefined,
        can_see_finances: canSeeFinances,
        expires_days:     days > 0 ? days : undefined,  // 0 = no expiry
      });
      setInviteStatus(status === 'granted' ? 'granted' : 'pending');
      setExpiryDays(days);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!inviteStatus) return;
    await Share.share({
      message: t('members.inviteMessage', { pet: petName, email: email.trim() }),
      title:   t('members.inviteTitle'),
    });
  };

  const cfg = ROLE_CONFIG[role];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={s.sheetBackdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{t('members.add')}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={rs(20)} color={colors.textDim} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {!inviteStatus ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: rs(spacing.xl) }}>

              {/* Role selector */}
              <Text style={s.fieldLabel}>{t('members.roles.label')}</Text>
              <View style={s.roleGrid}>
                {availableRoles.map((r) => {
                  const rc    = ROLE_CONFIG[r];
                  const active = role === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[s.roleChip, active && { borderColor: rc.color, backgroundColor: rc.color + '15' }]}
                      onPress={() => handleRoleChange(r)}
                    >
                      <rc.Icon size={rs(16)} color={active ? rc.color : colors.textDim} strokeWidth={1.8} />
                      <Text style={[s.roleChipLabel, active && { color: rc.color }]}>{t(rc.labelKey)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Role description */}
              <View style={[s.roleDescBox, { backgroundColor: cfg.color + '10', borderColor: cfg.color + '30' }]}>
                <Info size={rs(13)} color={cfg.color} strokeWidth={1.8} />
                <Text style={[s.roleDescText, { color: cfg.color }]}>{t(cfg.descKey)}</Text>
              </View>

              {/* Owner warning */}
              {role === 'owner' && (
                <View style={s.ownerWarning}>
                  <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={1.8} />
                  <Text style={s.ownerWarningText}>{t('members.ownerWarning')}</Text>
                </View>
              )}

              {/* Expiry info */}
              {role !== 'owner' && (
                <View style={s.validityInfo}>
                  <Text style={s.validityText}>
                    {t('members.validFor', { days: DEFAULT_INVITE_DAYS[role] ?? 7 })}
                  </Text>
                </View>
              )}
              {role === 'owner' && (
                <View style={[s.validityInfo, { backgroundColor: colors.accentSoft }]}>
                  <Text style={[s.validityText, { color: colors.accent }]}>
                    {t('members.ownerNoExpiry')}
                  </Text>
                </View>
              )}

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
                placeholder={t('members.emailPlaceholder')}
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {/* No-email warning for non-required roles */}
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

              {/* Generate */}
              <TouchableOpacity
                style={[s.primaryBtn, !canGenerate && s.btnDisabled]}
                onPress={handleGenerate}
                disabled={!canGenerate}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.primaryBtnText}>{t('members.generateLink')}</Text>}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={s.linkSection}>
              <UserCheck size={rs(40)} color={colors.success} strokeWidth={1.8} />
              <Text style={s.linkTitle}>{t('members.linkReady')}</Text>
              <View style={[s.statusBox, inviteStatus === 'granted' ? s.statusBoxGranted : s.statusBoxPending]}>
                <Text style={[s.statusText2, inviteStatus === 'granted' ? { color: colors.success } : { color: colors.petrol }]}>
                  {inviteStatus === 'granted'
                    ? t('members.accessGrantedNow', { email: email.trim(), pet: petName })
                    : t('members.accessPending',    { email: email.trim(), pet: petName })}
                </Text>
              </View>
              {email.trim() && (
                <TouchableOpacity style={s.primaryBtn} onPress={handleShare}>
                  <Share2 size={rs(16)} color="#fff" strokeWidth={1.8} />
                  <Text style={s.primaryBtnText}>{t('members.shareInvite')}</Text>
                </TouchableOpacity>
              )}
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
  const { t }  = useTranslation();
  const { toast, confirm }   = useToast();
  const { data: pet }        = usePet(id!);
  const { members, activeMembers, pendingMembers, isLoading, refetch, inviteMember, removeMember } = usePetMembers(id!);
  const myRole = useMyPetRole(id!);

  // Build the list of roles this user can invite
  const availableRoles: MemberRole[] = [
    myRole.canInviteOwner     ? 'owner'     : null,
    myRole.canInviteCoParent  ? 'co_parent' : null,
    myRole.canInviteCaregiver ? 'caregiver' : null,
    myRole.canInviteViewer    ? 'viewer'    : null,
  ].filter(Boolean) as MemberRole[];

  const [inviteVisible, setInviteVisible] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [showPending, setShowPending]     = useState(true);

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
      return await inviteMember(params);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'email_required_for_co_parent')       toast(t('members.errorEmailRequired'), 'error');
      else if (msg === 'max_invites_reached')            toast(t('members.errorMaxInvites'), 'warning');
      else if (msg === 'only_root_can_invite_owner')     toast(t('members.errorOnlyRootCanInviteOwner'), 'error');
      else if (msg === 'only_owner_can_invite_coparent') toast(t('members.noPermissionCoparent'), 'error');
      else                                               toast(t('errors.editFailed'), 'error');
      throw e;
    }
  }, [inviteMember, toast, t]);

  const petRootUserId = pet?.user_id;

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
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
          {availableRoles.length > 0 && (
            <TouchableOpacity style={s.addBtn} onPress={() => setInviteVisible(true)}>
              <UserPlus size={rs(18)} color="#fff" strokeWidth={1.8} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: rs(32) }} />
        ) : (
          <>
            <Text style={s.sectionLabel}>{t('members.active')}</Text>

            {/* "You" card — always first */}
            <View style={[s.memberCard, myRole.isRoot && s.memberCardRoot]}>
              <View style={[s.memberIconCircle, { backgroundColor: ROLE_CONFIG[myRole.role].color + '18' }]}>
                {React.createElement(ROLE_CONFIG[myRole.role].Icon, {
                  size: rs(20), color: ROLE_CONFIG[myRole.role].color, strokeWidth: 1.8,
                })}
              </View>
              <View style={s.memberInfo}>
                <View style={s.memberNameRow}>
                  <Text style={s.memberName}>{t('members.you')}</Text>
                  {myRole.isRoot && (
                    <View style={s.rootBadge}>
                      <Crown size={rs(10)} color={colors.gold} strokeWidth={2} />
                      <Text style={s.rootBadgeText}>{t('members.rootBadge')}</Text>
                    </View>
                  )}
                </View>
                <View style={[s.roleBadge, { backgroundColor: ROLE_CONFIG[myRole.role].color + '18' }]}>
                  <Text style={[s.roleText, { color: ROLE_CONFIG[myRole.role].color }]}>
                    {t(ROLE_CONFIG[myRole.role].labelKey)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Other active members */}
            {activeMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                petRootUserId={petRootUserId}
                myRole={myRole}
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
                    : <ChevronDown size={rs(16)} color={colors.textDim} strokeWidth={1.8} />}
                </TouchableOpacity>
                {showPending && pendingMembers.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    petRootUserId={petRootUserId}
                    myRole={myRole}
                    onRemove={handleRemove}
                    t={t}
                  />
                ))}
              </>
            )}
          </>
        )}

        {/* Bottom invite button */}
        {availableRoles.length > 0 && !isLoading && (
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
        availableRoles={availableRoles}
        petName={pet?.name ?? ''}
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
  memberCardRoot: {
    borderColor: colors.gold + '40',
    backgroundColor: colors.card,
  },
  memberIconCircle: {
    width: rs(44), height: rs(44), borderRadius: rs(22),
    alignItems: 'center', justifyContent: 'center',
  },
  memberInfo: { flex: 1, gap: rs(4) },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), flexWrap: 'wrap' },
  memberName: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text },
  memberMeta: { flexDirection: 'row', gap: rs(6), flexWrap: 'wrap', alignItems: 'center' },

  // Root badge
  rootBadge: {
    flexDirection: 'row', alignItems: 'center', gap: rs(3),
    backgroundColor: colors.gold + '20', borderRadius: rs(radii.sm),
    paddingHorizontal: rs(6), paddingVertical: rs(2),
  },
  rootBadgeText: { fontFamily: 'Sora_700Bold', fontSize: fs(9), color: colors.gold, letterSpacing: 0.5 },

  // Role badge
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

  // Pending
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

  // Bottom add button
  addBottomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8),
    marginTop: rs(8), paddingVertical: rs(14), borderRadius: rs(radii.card),
    borderWidth: 1.5, borderColor: colors.accent + '40', borderStyle: 'dashed',
  },
  addBottomBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.accent },

  // Invite sheet
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(11,18,25,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: rs(26), borderTopRightRadius: rs(26),
    paddingHorizontal: rs(24), paddingBottom: rs(24), maxHeight: '90%',
  },
  sheetHandle: {
    width: rs(40), height: rs(5), borderRadius: rs(3), backgroundColor: colors.border,
    alignSelf: 'center', marginTop: rs(12), marginBottom: rs(8),
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: rs(20), marginTop: rs(4),
  },
  sheetTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text },

  // Form
  fieldLabel: {
    fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.textDim,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: rs(6), marginTop: rs(16),
  },
  fieldInput: {
    backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: rs(radii.lg), padding: rs(14),
    fontSize: fs(14), color: colors.text,
  },
  fieldInputError: { borderColor: colors.danger },
  emailRequiredNote: {
    fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim,
    marginBottom: rs(6), marginTop: rs(2),
  },

  // Role grid
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: rs(6),
    paddingVertical: rs(10), paddingHorizontal: rs(14),
    borderRadius: rs(radii.lg), borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  roleChipLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.textSec },

  // Role description
  roleDescBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(8),
    borderWidth: 1, borderRadius: rs(radii.md),
    paddingHorizontal: rs(12), paddingVertical: rs(10), marginTop: rs(10),
  },
  roleDescText: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12), lineHeight: fs(18) },

  // Owner warning
  ownerWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(8),
    backgroundColor: colors.warningSoft, borderRadius: rs(radii.md),
    padding: rs(12), marginTop: rs(8),
  },
  ownerWarningText: {
    flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12),
    color: colors.warning, lineHeight: fs(18),
  },

  // Security warning
  securityWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(6),
    backgroundColor: colors.warningSoft, borderRadius: rs(radii.sm),
    padding: rs(10), marginTop: rs(6),
  },
  securityWarningText: { flex: 1, fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.warning },

  // Validity / expiry info
  validityInfo: {
    backgroundColor: colors.petrolSoft, borderRadius: rs(radii.sm),
    paddingHorizontal: rs(10), paddingVertical: rs(6), marginTop: rs(8),
    alignSelf: 'flex-start',
  },
  validityText: { fontFamily: 'Sora_500Medium', fontSize: fs(12), color: colors.petrol },

  // Toggles
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: rs(16),
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

  // Link/status section
  linkSection: { alignItems: 'center', gap: rs(12), paddingTop: rs(8) },
  linkTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(16), color: colors.text },
  statusBox: {
    borderWidth: 1, borderRadius: rs(radii.lg),
    paddingHorizontal: rs(16), paddingVertical: rs(12), width: '100%',
  },
  statusBoxGranted: { backgroundColor: colors.successSoft, borderColor: colors.success + '30' },
  statusBoxPending:  { backgroundColor: colors.petrolSoft,  borderColor: colors.petrol  + '30' },
  statusText2: {
    fontFamily: 'Sora_500Medium', fontSize: fs(13), textAlign: 'center', lineHeight: fs(20),
  },
  closeLink: { marginTop: rs(4) },
  closeLinkText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(14), color: colors.textDim },
});
