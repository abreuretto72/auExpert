/**
 * /partnerships/invite — Form de criação de convite profissional (lado tutor).
 * ═══════════════════════════════════════════════════════════════════════════
 * Fase 2 · Bloco E · sub-passo 2.6.1
 *
 * Entrada:
 *   - FAB do Hub de Parceiros (/partnerships)
 *   - CTA do EmptyState em cada tab do Hub
 *
 * Fluxo:
 *   1. Tutor escolhe pet (chips com avatar — só lista pets dele via usePets()).
 *   2. Informa email do convidado (AI-first: mic STT ativo).
 *   3. Escolhe papel (role) — 10 opções, chips com cor semântica.
 *   4. Opcional: toggle "pode ver finanças" (só significa algo pros roles vet).
 *   5. Opcional: scope_notes — briefing livre (multiline + mic).
 *   6. Escolhe prazo do convite em dias: 1 · 7 · 14 · 30 (default 7).
 *   7. Submit → useCreateInvite → EF professional-invite-create
 *      • Sucesso: toast + router.back() pro Hub (vê convite na aba "Pendentes")
 *      • Erro: toast com mensagem mapeada (voz do pet)
 *
 * Validação: Zod inline. Email lowercase trim. Email obrigatório + regex simples.
 * Pet + role + expires_days obrigatórios. can_see_finances default false.
 *
 * Offline: o próprio hook throw 'offline_action' → mapeado pra toast.offline.
 * Sem modo rascunho — convite é síncrono; se sem rede, o tutor tenta de novo.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft, Mail, Send, Dog, Cat, Wallet, Clock, Stethoscope,
} from 'lucide-react-native';
import { z } from 'zod';

import { colors } from '../../../constants/colors';
import { radii, spacing } from '../../../constants/spacing';
import { rs, fs } from '../../../hooks/useResponsive';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/Toast';
import { useNetwork } from '../../../hooks/useNetwork';
import { usePets } from '../../../hooks/usePets';
import { useCreateInvite } from '../../../hooks/useTutorPartnerships';
import type { AccessRole } from '../../../types/database';

// ── Config ───────────────────────────────────────────────────────────────────

/** 10 roles do Bloco A — mesmo enum do banco. Ordem importa pra UI. */
const ROLES: readonly AccessRole[] = [
  'vet_full', 'vet_read', 'vet_tech',
  'groomer', 'trainer', 'walker',
  'sitter', 'boarding', 'shop_employee', 'ong_member',
] as const;

/** Prazos curtos/médios/longos. Backend aceita 1..30. */
const EXPIRES_OPTIONS: readonly number[] = [1, 7, 14, 30] as const;

/** Roles onde ver finanças faz sentido. Os outros a toggle fica dimmed/off. */
const FINANCE_ROLES: ReadonlySet<AccessRole> = new Set<AccessRole>([
  'vet_full', 'vet_read',
]);

// ── Schema Zod ───────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  pet_id: z.string().uuid(),
  invite_email: z
    .string()
    .min(3)
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid_email'),
  role: z.enum([
    'vet_full', 'vet_read', 'vet_tech', 'groomer', 'trainer',
    'walker', 'sitter', 'boarding', 'shop_employee', 'ong_member',
  ] as const),
  can_see_finances: z.boolean(),
  scope_notes: z.string().max(500).nullable(),
  expires_days: z.number().int().min(1).max(30),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Cor semântica por role — mesma convenção do Hub + PatientCard. */
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

/** Mapeia erro da EF → chave i18n (voz do pet). */
function createErrorKey(code: string): string {
  switch (code) {
    case 'DUPLICATE_INVITE':   return 'partnerships.errors.duplicateInvite';
    case 'RATE_LIMIT':         return 'partnerships.errors.rateLimit';
    case 'NOT_OWNER':          return 'partnerships.errors.notOwner';
    case 'PET_NOT_FOUND':      return 'partnerships.errors.petNotFound';
    case 'INVALID_PAYLOAD':    return 'partnerships.errors.invalidPayload';
    case 'MISSING_EMAIL':      return 'partnerships.errors.missingEmail';
    case 'offline_action':     return 'partnerships.errors.offline';
    case 'not_authenticated':  return 'partnerships.errors.notAuthenticated';
    default:                   return 'partnerships.errors.generic';
  }
}

// ── Tela ─────────────────────────────────────────────────────────────────────

export default function PartnershipInviteScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { isOnline } = useNetwork();
  const { petId: presetPetId } = useLocalSearchParams<{ petId?: string }>();

  const { pets, isLoading: petsLoading } = usePets();
  const { createInvite, isCreating } = useCreateInvite();

  // ── Form state ─────────────────────────────────────────────────────────────

  const [petId, setPetId] = useState<string>(
    typeof presetPetId === 'string' ? presetPetId : '',
  );
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<AccessRole | ''>('');
  const [canSeeFinances, setCanSeeFinances] = useState<boolean>(false);
  const [scopeNotes, setScopeNotes] = useState<string>('');
  const [expiresDays, setExpiresDays] = useState<number>(7);

  // Se mudar pra role que não suporta finanças, zera o toggle.
  const onSelectRole = useCallback((r: AccessRole) => {
    setRole(r);
    if (!FINANCE_ROLES.has(r)) setCanSeeFinances(false);
  }, []);

  const canSubmit = useMemo(() => {
    if (!petId || !role || !email.trim() || !expiresDays) return false;
    if (isCreating) return false;
    return true;
  }, [petId, role, email, expiresDays, isCreating]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/partnerships' as never);
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const candidate = {
      pet_id: petId,
      invite_email: email.trim().toLowerCase(),
      role: role as AccessRole,
      can_see_finances: canSeeFinances,
      scope_notes: scopeNotes.trim() ? scopeNotes.trim() : null,
      expires_days: expiresDays,
    };

    const parsed = inviteSchema.safeParse(candidate);
    if (!parsed.success) {
      // Emite um erro específico pra email inválido (quem mais comumente falha).
      const emailIssue = parsed.error.issues.find((i) => i.path[0] === 'invite_email');
      if (emailIssue) {
        toast(t('partnerships.errors.invalidEmail'), 'error');
      } else {
        toast(t('partnerships.errors.validation'), 'error');
      }
      return;
    }

    try {
      await createInvite(parsed.data);
      toast(t('partnerships.toast.inviteCreated'), 'success');
      handleBack();
    } catch (err) {
      const code = err instanceof Error ? err.message : 'INTERNAL';
      toast(t(createErrorKey(code)), 'error');
    }
  }, [canSubmit, petId, email, role, canSeeFinances, scopeNotes, expiresDays,
      createInvite, toast, t, handleBack]);

  // ── Render ────────────────────────────────────────────────────────────────

  const selectedPet = pets.find((p) => p.id === petId);
  const financeEnabled = role !== '' && FINANCE_ROLES.has(role as AccessRole);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
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
            <Send size={rs(18)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.headerTitle}>{t('partnerships.invite.title')}</Text>
          </View>
          <View style={{ width: rs(24) }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>{t('partnerships.invite.intro')}</Text>

          {/* ── 1. Pet picker ─────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>
            {t('partnerships.invite.petLabel')} <Text style={styles.required}>*</Text>
          </Text>
          {petsLoading ? (
            <Text style={styles.hint}>{t('common.loading')}</Text>
          ) : pets.length === 0 ? (
            <View style={styles.emptyPetsBox}>
              <Text style={styles.emptyPetsText}>{t('partnerships.invite.noPets')}</Text>
            </View>
          ) : (
            <View style={styles.petChipRow}>
              {pets.map((p) => {
                const selected = petId === p.id;
                const isDog = p.species === 'dog';
                const petColor = isDog ? colors.accent : colors.purple;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setPetId(p.id)}
                    activeOpacity={0.85}
                    style={[
                      styles.petChip,
                      selected && { borderColor: petColor, backgroundColor: petColor + '14' },
                    ]}
                  >
                    <View style={[
                      styles.petChipAvatar,
                      { borderColor: petColor + '40', backgroundColor: colors.bgCard },
                    ]}>
                      {p.avatar_url ? (
                        <Image source={{ uri: p.avatar_url }} style={styles.petChipAvatarImg} />
                      ) : isDog ? (
                        <Dog size={rs(18)} color={petColor} strokeWidth={1.8} />
                      ) : (
                        <Cat size={rs(18)} color={petColor} strokeWidth={1.8} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.petChipText,
                        selected && { color: colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── 2. Email ──────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>
            {t('partnerships.invite.emailLabel')} <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>{t('partnerships.invite.emailHint')}</Text>
          <View style={styles.field}>
            <Input
              placeholder={t('partnerships.invite.emailPlaceholder')}
              value={email}
              onChangeText={setEmail}
              type="email"
              icon={<Mail size={rs(18)} color={colors.petrol} strokeWidth={1.8} />}
            />
          </View>

          {/* ── 3. Role ───────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>
            {t('partnerships.invite.roleLabel')} <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>{t('partnerships.invite.roleHint')}</Text>
          <View style={styles.roleChipRow}>
            {ROLES.map((r) => {
              const selected = role === r;
              const rc = roleColor(r);
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => onSelectRole(r)}
                  activeOpacity={0.85}
                  style={[
                    styles.roleChip,
                    selected && {
                      backgroundColor: rc + '1F',
                      borderColor: rc,
                    },
                  ]}
                >
                  <Stethoscope
                    size={rs(12)}
                    color={selected ? rc : colors.textDim}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.roleChipText,
                      selected && { color: rc },
                    ]}
                    numberOfLines={1}
                  >
                    {t(`roles.${r}`, { defaultValue: r })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── 4. Finance toggle ────────────────────────────────────────── */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleIconWrap}>
              <Wallet
                size={rs(18)}
                color={financeEnabled ? colors.accent : colors.textDim}
                strokeWidth={1.8}
              />
            </View>
            <View style={styles.toggleTextWrap}>
              <Text style={[
                styles.toggleLabel,
                !financeEnabled && { color: colors.textDim },
              ]}>
                {t('partnerships.invite.financesLabel')}
              </Text>
              <Text style={styles.toggleHint}>
                {financeEnabled
                  ? t('partnerships.invite.financesHint')
                  : t('partnerships.invite.financesDisabled')}
              </Text>
            </View>
            <Switch
              value={canSeeFinances && financeEnabled}
              onValueChange={setCanSeeFinances}
              disabled={!financeEnabled}
              trackColor={{ false: colors.border, true: colors.accent + '66' }}
              thumbColor={canSeeFinances && financeEnabled ? colors.accent : colors.textDim}
            />
          </View>

          {/* ── 5. Scope notes ────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>{t('partnerships.invite.scopeLabel')}</Text>
          <Text style={styles.hint}>{t('partnerships.invite.scopeHint')}</Text>
          <View style={styles.field}>
            <Input
              placeholder={t('partnerships.invite.scopePlaceholder')}
              value={scopeNotes}
              onChangeText={setScopeNotes}
              multiline
            />
          </View>

          {/* ── 6. Expires ────────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>
            {t('partnerships.invite.expiresLabel')} <Text style={styles.required}>*</Text>
          </Text>
          <Text style={styles.hint}>{t('partnerships.invite.expiresHint')}</Text>
          <View style={styles.expiresRow}>
            {EXPIRES_OPTIONS.map((n) => {
              const selected = expiresDays === n;
              return (
                <TouchableOpacity
                  key={n}
                  onPress={() => setExpiresDays(n)}
                  activeOpacity={0.85}
                  style={[styles.expiresChip, selected && styles.expiresChipSelected]}
                >
                  <Clock
                    size={rs(12)}
                    color={selected ? colors.accent : colors.textDim}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.expiresChipText,
                      selected && { color: colors.accent },
                    ]}
                  >
                    {n === 1
                      ? t('partnerships.invite.expiresDay', { count: n })
                      : t('partnerships.invite.expiresDays', { count: n })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Summary preview ───────────────────────────────────────────── */}
          {selectedPet && role ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>
                {t('partnerships.invite.summaryLabel')}
              </Text>
              <Text style={styles.summaryText}>
                {t('partnerships.invite.summaryText', {
                  pet: selectedPet.name,
                  role: t(`roles.${role}`, { defaultValue: role }),
                  days: expiresDays,
                })}
              </Text>
            </View>
          ) : null}

          {/* ── Submit ───────────────────────────────────────────────────── */}
          <View style={styles.submitWrap}>
            <Button
              label={t('partnerships.invite.submit')}
              onPress={handleSubmit}
              disabled={!canSubmit || !isOnline}
              loading={isCreating}
              icon={<Send size={rs(16)} color="#FFFFFF" strokeWidth={2} />}
            />
            {!isOnline ? (
              <Text style={styles.offlineNote}>{t('partnerships.errors.offline')}</Text>
            ) : (
              <Text style={styles.disclaimer}>{t('partnerships.invite.disclaimer')}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(spacing.md),
    paddingVertical: rs(spacing.sm),
    borderBottomWidth: rs(1),
    borderBottomColor: colors.border,
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(16),
    color: colors.text,
  },

  scroll: {
    paddingHorizontal: rs(spacing.md),
    paddingTop: rs(spacing.md),
    paddingBottom: rs(spacing.xxl),
  },

  intro: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: rs(20),
    marginBottom: rs(spacing.md),
  },

  // Sections
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
    marginTop: rs(spacing.md),
    marginBottom: rs(4),
    letterSpacing: rs(0.3),
  },
  required: { color: colors.accent },
  hint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    lineHeight: rs(16),
    marginBottom: rs(spacing.sm),
  },
  field: { marginBottom: rs(spacing.xs) },

  // Pet picker
  petChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(8),
    marginBottom: rs(spacing.sm),
  },
  petChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    borderRadius: rs(radii.lg),
    borderWidth: rs(1.5),
    borderColor: colors.border,
    backgroundColor: colors.card,
    maxWidth: '100%',
  },
  petChipAvatar: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(10),
    borderWidth: rs(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  petChipAvatarImg: {
    width: '100%',
    height: '100%',
  },
  petChipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textSec,
    maxWidth: rs(110),
  },
  emptyPetsBox: {
    padding: rs(spacing.md),
    borderRadius: rs(radii.md),
    backgroundColor: colors.bgCard,
    borderWidth: rs(1),
    borderColor: colors.border,
  },
  emptyPetsText: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    textAlign: 'center',
  },

  // Role picker
  roleChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: rs(6),
    marginBottom: rs(spacing.sm),
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(5),
    paddingHorizontal: rs(10),
    paddingVertical: rs(7),
    borderRadius: rs(radii.md),
    borderWidth: rs(1.5),
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  roleChipText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(11),
    color: colors.textSec,
    letterSpacing: rs(0.3),
    textTransform: 'uppercase',
  },

  // Toggle row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(12),
    padding: rs(spacing.md),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: rs(1),
    borderColor: colors.border,
    marginTop: rs(spacing.sm),
  },
  toggleIconWrap: {
    width: rs(32),
    height: rs(32),
    borderRadius: rs(10),
    backgroundColor: colors.accent + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTextWrap: { flex: 1 },
  toggleLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
    marginBottom: rs(2),
  },
  toggleHint: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    lineHeight: rs(16),
  },

  // Expires
  expiresRow: {
    flexDirection: 'row',
    gap: rs(8),
    marginBottom: rs(spacing.sm),
  },
  expiresChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(5),
    paddingVertical: rs(10),
    borderRadius: rs(radii.md),
    borderWidth: rs(1.5),
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  expiresChipSelected: {
    backgroundColor: colors.accent + '14',
    borderColor: colors.accent,
  },
  expiresChipText: {
    fontFamily: 'JetBrainsMono_500Medium',
    fontSize: fs(12),
    color: colors.textSec,
    letterSpacing: rs(0.3),
  },

  // Summary
  summaryBox: {
    marginTop: rs(spacing.md),
    padding: rs(spacing.md),
    borderRadius: rs(radii.md),
    backgroundColor: colors.petrol + '10',
    borderLeftWidth: rs(3),
    borderLeftColor: colors.petrol,
  },
  summaryLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(10),
    color: colors.petrol,
    letterSpacing: rs(1),
    textTransform: 'uppercase',
    marginBottom: rs(4),
  },
  summaryText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(13),
    color: colors.text,
    lineHeight: rs(19),
  },

  // Submit
  submitWrap: {
    marginTop: rs(spacing.lg),
  },
  disclaimer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    textAlign: 'center',
    marginTop: rs(spacing.sm),
    lineHeight: rs(16),
  },
  offlineNote: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(11),
    color: colors.warning,
    textAlign: 'center',
    marginTop: rs(spacing.sm),
  },
});
