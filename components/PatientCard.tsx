/**
 * PatientCard — card de paciente na tela /pro (lista "Meus Pacientes").
 *
 * Variante do PetCard para o ângulo profissional:
 *   - Mostra tutor (nome + cidade/país) em vez de humor/agenda do pet.
 *   - Role chip (cor semântica por categoria).
 *   - Chip de "pode ver finanças" quando ag.can_see_finances = true.
 *   - Scope notes preview (2 linhas) — a "briefing" que o tutor escreveu.
 *   - Expira em … (relativo) quando expires_at está setado.
 *
 * Props 100% tipadas no shape `MyPatient` retornado pela RPC `get_my_patients`.
 * Toque no card → onPress (caller navega pra /pro/pet/[id]).
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  Dog, Cat, User, MapPin, Wallet, CalendarClock, Stethoscope,
} from 'lucide-react-native';

import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs, fs } from '../hooks/useResponsive';
import type { MyPatient } from '../hooks/useMyPatients';
import type { AccessRole } from '../types/database';

interface PatientCardProps {
  patient: MyPatient;
  onPress?: () => void;
}

// Role → cor semântica:
//   veterinário (full/read/tech) = petrol (dados clínicos)
//   groomer/sitter/boarding/walker/shop_employee = accent (cuidado diário)
//   trainer = purple (comportamento/IA-adjacente)
//   ong_member = rose (comunidade/legado)
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
      return colors.click;
  }
}

// Expira em N dias (ou hoje/amanhã) — simétrico com invite.expires*.
function formatRelativeExpiry(expiresAt: string | null, t: (k: string, p?: Record<string, unknown>) => string): string | null {
  if (!expiresAt) return null;
  const exp = new Date(expiresAt).getTime();
  const now = Date.now();
  if (Number.isNaN(exp)) return null;

  const diffMs = exp - now;
  if (diffMs <= 0) return t('pro.patients.expired');

  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 1) return t('pro.patients.expiresToday');
  if (diffDays === 2) return t('pro.patients.expiresTomorrow');
  return t('pro.patients.expiresInDays', { count: diffDays });
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onPress }) => {
  const { t } = useTranslation();
  const isDog = patient.species === 'dog';
  const petColor = isDog ? colors.click : colors.purple;
  const rc = roleColor(patient.role);

  const location = [patient.tutor_city, patient.tutor_country]
    .filter(Boolean)
    .join(', ');
  const expiryLabel = formatRelativeExpiry(patient.expires_at, t);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { shadowColor: petColor }]}
    >
      {/* Top row: avatar + name + role chip */}
      <View style={styles.topRow}>
        <View style={[styles.avatarOuter, { borderColor: petColor + '40' }]}>
          {patient.avatar_url ? (
            <Image source={{ uri: patient.avatar_url }} style={styles.avatarImage} />
          ) : (
            <>
              <View style={[styles.avatarGlow, { backgroundColor: petColor + '10' }]} />
              {isDog ? (
                <Dog size={rs(32)} color={colors.click} strokeWidth={1.8} />
              ) : (
                <Cat size={rs(32)} color={colors.purple} strokeWidth={1.8} />
              )}
            </>
          )}
        </View>

        <View style={styles.topInfo}>
          <Text style={styles.name} numberOfLines={1}>
            {patient.pet_name}
          </Text>
          <Text style={styles.breed} numberOfLines={1}>
            {patient.breed ?? (isDog ? t('pets.dog') : t('pets.cat'))}
          </Text>

          {/* Tutor row */}
          <View style={styles.tutorRow}>
            <User size={rs(12)} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.tutorText} numberOfLines={1}>
              {patient.tutor_name ?? t('pro.patients.unknownTutor')}
            </Text>
          </View>
        </View>

        <View style={[styles.roleChip, { backgroundColor: rc + '1F', borderColor: rc + '40' }]}>
          <Stethoscope size={rs(11)} color={rc} strokeWidth={2} />
          <Text style={[styles.roleChipText, { color: rc }]} numberOfLines={1}>
            {t(`pro.patients.roles.${patient.role}`)}
          </Text>
        </View>
      </View>

      {/* Scope notes preview (se houver) */}
      {patient.scope_notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>
            {t('pro.patients.scopeNotesLabel')}
          </Text>
          <Text style={styles.notesText} numberOfLines={2}>
            {patient.scope_notes}
          </Text>
        </View>
      ) : null}

      {/* Bottom row: finances chip · location · expiry */}
      <View style={styles.bottomRow}>
        {patient.can_see_finances ? (
          <View style={[styles.metaChip, { backgroundColor: colors.success + '1F' }]}>
            <Wallet size={rs(11)} color={colors.success} strokeWidth={2} />
            <Text style={[styles.metaChipText, { color: colors.success }]}>
              {t('pro.patients.canSeeFinances')}
            </Text>
          </View>
        ) : null}

        {location ? (
          <View style={styles.metaChip}>
            <MapPin size={rs(11)} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.metaChipText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        ) : null}

        {expiryLabel ? (
          <View style={[styles.metaChip, styles.metaChipRight]}>
            <CalendarClock size={rs(11)} color={colors.textDim} strokeWidth={1.8} />
            <Text style={styles.metaChipText} numberOfLines={1}>
              {expiryLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: rs(1),
    borderColor: colors.border,
    borderRadius: rs(radii.card),
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.15,
    shadowRadius: rs(16),
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarOuter: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    borderWidth: rs(2.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: rs(14),
  },
  avatarGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: rs(16),
  },
  topInfo: {
    flex: 1,
    marginLeft: rs(12),
    marginRight: rs(8),
  },
  name: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  breed: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    marginTop: rs(2),
  },
  tutorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    marginTop: rs(6),
  },
  tutorText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(12),
    color: colors.textSec,
    flexShrink: 1,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(radii.sm),
    borderWidth: rs(1),
    maxWidth: rs(120),
  },
  roleChipText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    letterSpacing: rs(0.3),
  },
  notesBox: {
    marginTop: rs(12),
    padding: rs(10),
    backgroundColor: colors.bgCard,
    borderRadius: rs(radii.md),
    borderLeftWidth: rs(3),
    borderLeftColor: colors.click,
  },
  notesLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    color: colors.textDim,
    letterSpacing: rs(1),
    textTransform: 'uppercase',
    marginBottom: rs(3),
  },
  notesText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: rs(17),
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: rs(6),
    marginTop: rs(12),
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(4),
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(radii.sm),
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
  },
  metaChipRight: {
    marginLeft: 'auto',
  },
  metaChipText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(10),
    color: colors.textDim,
  },
});

export default memo(PatientCard);
