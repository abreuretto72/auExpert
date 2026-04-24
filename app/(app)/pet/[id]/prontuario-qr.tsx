/**
 * ProntuarioQrScreen — Emergency QR code for the pet medical record.
 *
 * Shows a QR code linking to the public emergency URL so that
 * vets, shelters, or rescuers can access the pet's health data
 * without requiring app login.
 *
 * URL format: https://auexpert.app/emergency/{emergency_token}
 *
 * NOTE: react-native-qrcode-svg must be installed:
 *   npx expo install react-native-qrcode-svg react-native-svg
 */
import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Share2,
  AlertTriangle,
  Pill,
  Syringe,
  Heart,
  QrCode as QrIcon,
  Shield,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { rs, fs } from '../../../../hooks/useResponsive';
import { colors } from '../../../../constants/colors';
import { radii, spacing } from '../../../../constants/spacing';
import { usePet } from '../../../../hooks/usePets';
import { useProntuario } from '../../../../hooks/useProntuario';
import { useToast } from '../../../../components/Toast';
import { Skeleton } from '../../../../components/Skeleton';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatDate } from '../../../../utils/format';

const EMERGENCY_BASE_URL = 'https://auexpert.app/emergency';

export default function ProntuarioQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: pet } = usePet(id!);
  const { prontuario, isLoading } = useProntuario(id!);

  const qrUrl = prontuario?.emergency_token
    ? `${EMERGENCY_BASE_URL}/${prontuario.emergency_token}`
    : null;

  const handleShare = useCallback(async () => {
    if (!qrUrl || !pet) {
      toast(t('prontuario.qrNotReady'), 'warning');
      return;
    }
    try {
      await Share.share({
        message: `${t('prontuario.qrShareMessage', { name: pet.name })}\n${qrUrl}`,
        url: qrUrl,
        title: t('prontuario.qrShareTitle', { name: pet.name }),
      });
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [qrUrl, pet, toast, t]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading || !prontuario) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('prontuario.emergencyQr')}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <Skeleton width={rs(180)} height={rs(180)} radius={rs(16)} />
          <Skeleton width={rs(200)} height={rs(20)} style={{ marginTop: rs(20) }} />
          <Skeleton width={rs(280)} height={rs(14)} style={{ marginTop: rs(10) }} />
        </View>
      </SafeAreaView>
    );
  }

  const criticalAlerts = prontuario.alerts.filter((a) => a.type === 'critical');
  const overdueVaccines = prontuario.vaccines.filter((v) => v.is_overdue);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('prontuario.emergencyQr')}</Text>
        <TouchableOpacity style={s.headerBtn} onPress={handleShare} activeOpacity={0.7}>
          <Share2 size={rs(18)} color={qrUrl ? colors.click : colors.textDim} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* QR Card */}
        <View style={s.qrCard}>
          <View style={s.qrLabelRow}>
            <Shield size={rs(16)} color={colors.danger} strokeWidth={2} />
            <Text style={s.qrCardLabel}>{t('prontuario.qrCardLabel').toUpperCase()}</Text>
          </View>

          <Text style={s.qrPetName}>{pet?.name ?? '—'}</Text>
          <Text style={s.qrPetMeta}>
            {[
              prontuario.age_label,
              pet?.species === 'dog' ? t('pets.dog') : t('pets.cat'),
            ].filter(Boolean).join(' · ')}
          </Text>

          {/* QR Code */}
          {qrUrl ? (
            <View style={s.qrWrapper}>
              <QRCode
                value={qrUrl}
                size={rs(180)}
                color={colors.bg}
                backgroundColor="#fff"
                logo={undefined}
              />
            </View>
          ) : (
            <View style={[s.qrWrapper, s.qrPlaceholder]}>
              <QrIcon size={rs(64)} color={colors.textDim} strokeWidth={1} />
              <Text style={s.qrPlaceholderText}>{t('prontuario.qrGenerating')}</Text>
            </View>
          )}

          <Text style={s.qrHint}>{t('prontuario.qrHint')}</Text>
          {qrUrl && (
            <Text style={s.qrUrl} numberOfLines={1} ellipsizeMode="middle">
              {qrUrl}
            </Text>
          )}
        </View>

        {/* Critical alerts */}
        {criticalAlerts.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.criticalAlerts').toUpperCase()}</Text>
            {criticalAlerts.map((a, i) => (
              <View key={i} style={s.dangerRow}>
                <AlertTriangle size={rs(16)} color={colors.danger} strokeWidth={2} />
                <Text style={s.dangerText}>{a.message}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Allergies */}
        {prontuario.allergies.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('health.allergies').toUpperCase()}</Text>
            {prontuario.allergies.map((a) => (
              <View key={a.id} style={s.allergyRow}>
                <View style={s.allergyDot} />
                <Text style={s.allergyText}>
                  {a.allergen}
                  {a.reaction ? ` — ${a.reaction}` : ''}
                  {a.severity ? ` (${a.severity})` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Active medications */}
        {prontuario.active_medications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('health.medications').toUpperCase()}</Text>
            {prontuario.active_medications.map((m) => (
              <View key={m.id} style={s.infoRow}>
                <Pill size={rs(14)} color={colors.purple} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>{m.name}</Text>
                  {(m.dosage || m.frequency) && (
                    <Text style={s.infoSub}>
                      {[m.dosage, m.frequency].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Overdue vaccines */}
        {overdueVaccines.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('health.overdueVaccines').toUpperCase()}</Text>
            {overdueVaccines.map((v) => (
              <View key={v.id} style={s.infoRow}>
                <Syringe size={rs(14)} color={colors.warning} strokeWidth={1.8} />
                <View style={{ flex: 1 }}>
                  <Text style={s.infoTitle}>{v.name}</Text>
                  {v.next_due_date && (
                    <Text style={[s.infoSub, { color: colors.warning }]}>
                      {t('health.vaccineDue')}: {formatDate(v.next_due_date)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Usual vet */}
        {prontuario.usual_vet && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t('prontuario.usualVet').toUpperCase()}</Text>
            <View style={s.infoRow}>
              <Heart size={rs(14)} color={colors.click} strokeWidth={1.8} />
              <Text style={s.infoTitle}>{prontuario.usual_vet}</Text>
            </View>
          </View>
        )}

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{t('prontuario.qrDisclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: rs(16), paddingVertical: rs(10),
    gap: rs(12), borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerBtn: {
    width: rs(40), height: rs(40), borderRadius: rs(12),
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(17), color: colors.text, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(32), gap: rs(12) },

  scroll: { flex: 1 },
  scrollContent: { padding: rs(16), paddingBottom: rs(32) },

  qrCard: {
    backgroundColor: colors.card, borderRadius: rs(20), padding: rs(20),
    marginBottom: rs(20), borderWidth: 1, borderColor: colors.danger + '40',
    alignItems: 'center',
  },
  qrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(8) },
  qrCardLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.danger, letterSpacing: 1.5 },
  qrPetName: { fontFamily: 'Sora_700Bold', fontSize: fs(22), color: colors.text, textAlign: 'center' },
  qrPetMeta: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textDim, textAlign: 'center', marginTop: rs(4), marginBottom: rs(20) },

  qrWrapper: {
    backgroundColor: '#fff', borderRadius: rs(16), padding: rs(16),
    marginBottom: rs(16), borderWidth: 1, borderColor: colors.border,
  },
  qrPlaceholder: { width: rs(212), height: rs(212), alignItems: 'center', justifyContent: 'center', gap: rs(8) },
  qrPlaceholderText: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim },

  qrHint: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, textAlign: 'center' },
  qrUrl: { fontFamily: 'Sora_400Regular', fontSize: fs(9), color: colors.textDim, marginTop: rs(4), textAlign: 'center', maxWidth: '90%' },

  section: { marginBottom: rs(16) },
  sectionTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(10), color: colors.textDim, letterSpacing: 1.5, marginBottom: rs(8) },

  dangerRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(10),
    backgroundColor: colors.dangerSoft, borderRadius: rs(10),
    padding: rs(12), marginBottom: rs(6), borderLeftWidth: rs(3), borderLeftColor: colors.danger,
  },
  dangerText: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.danger },

  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(6) },
  allergyDot: { width: rs(8), height: rs(8), borderRadius: rs(4), backgroundColor: colors.danger },
  allergyText: { flex: 1, fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: rs(10),
    backgroundColor: colors.card, borderRadius: rs(10), padding: rs(12),
    marginBottom: rs(6), borderWidth: 1, borderColor: colors.border,
  },
  infoTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },
  infoSub: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: rs(2) },

  disclaimer: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'center', marginTop: rs(8) },
});
