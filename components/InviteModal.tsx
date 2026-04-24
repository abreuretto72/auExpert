import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/colors';
import { rs, fs } from '../hooks/useResponsive';
import { radii, spacing } from '../constants/spacing';
import PawIcon from './PawIcon';

export type InviteMemberRole = 'co_parent' | 'caregiver' | 'viewer';

export interface InviteInfo {
  token: string;
  petName: string;
  inviterName: string;
  role: InviteMemberRole;
}

interface Props {
  invite: InviteInfo | null;
  onAccept: (token: string) => void;
  onDecline: (token: string) => void;
}

const ROLE_CONFIG: Record<InviteMemberRole, { labelKey: string; color: string }> = {
  co_parent: { labelKey: 'members.roles.co_parent', color: colors.purple },
  caregiver: { labelKey: 'members.roles.caregiver', color: colors.petrol },
  viewer:    { labelKey: 'members.roles.viewer',    color: colors.textDim },
};

export default function InviteModal({ invite, onAccept, onDecline }: Props) {
  const { t } = useTranslation();
  if (!invite) return null;

  const cfg = ROLE_CONFIG[invite.role] ?? ROLE_CONFIG.co_parent;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => onDecline(invite.token)}
    >
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <PawIcon size={rs(32)} color={colors.click} />
          </View>

          <Text style={s.title}>{t('invite.title')}</Text>

          <Text style={s.desc}>
            {t('invite.description', {
              inviter: invite.inviterName,
              pet: invite.petName,
            })}
          </Text>

          <View style={[s.badge, { backgroundColor: cfg.color + '18' }]}>
            <Text style={[s.badgeText, { color: cfg.color }]}>
              {t(cfg.labelKey)}
            </Text>
          </View>

          <View style={s.actions}>
            <TouchableOpacity
              style={s.declineBtn}
              onPress={() => onDecline(invite.token)}
              activeOpacity={0.7}
            >
              <Text style={s.declineText}>{t('invite.decline')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.acceptBtn}
              onPress={() => onAccept(invite.token)}
              activeOpacity={0.7}
            >
              <Text style={s.acceptText}>{t('invite.accept')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: rs(24),
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: rs(radii.xxl),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(28),
    alignItems: 'center',
    gap: rs(spacing.sm),
  },
  iconWrap: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(20),
    backgroundColor: colors.click + '12',
    borderWidth: 1,
    borderColor: colors.click + '25',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(4),
  },
  title: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(20),
    color: colors.text,
    textAlign: 'center',
  },
  desc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(14),
    color: colors.textSec,
    textAlign: 'center',
    lineHeight: fs(22),
  },
  badge: {
    paddingHorizontal: rs(16),
    paddingVertical: rs(6),
    borderRadius: rs(radii.lg),
    marginTop: rs(4),
  },
  badgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(12),
  },
  actions: {
    flexDirection: 'row',
    gap: rs(spacing.sm),
    marginTop: rs(spacing.md),
    width: '100%',
  },
  declineBtn: {
    flex: 1,
    paddingVertical: rs(14),
    borderRadius: rs(radii.xl),
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  declineText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.textSec,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: rs(14),
    borderRadius: rs(radii.xl),
    backgroundColor: colors.click,
    alignItems: 'center',
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(12),
    elevation: 6,
  },
  acceptText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: '#fff',
  },
});
