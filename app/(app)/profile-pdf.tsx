/**
 * ProfilePdfScreen — PDF preview and share for the tutor's profile.
 *
 * Mirrors IdCardPdfScreen structure (per CLAUDE.md §12.8):
 *   - Fetches the extended tutor row + pets list
 *   - Auto-previews on mount
 *   - Two action rows: print/save + share
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import {
  ChevronLeft,
  Download,
  Share2,
  UserCircle2,
} from 'lucide-react-native';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { usePets } from '../../hooks/usePets';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useConsent } from '../../hooks/useConsent';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/errorMessages';
import { supabase } from '../../lib/supabase';
import {
  previewProfilePdf,
  shareProfilePdf,
  type TutorProfileData,
  type PreferencesData,
} from '../../lib/profilePdf';

const EMPTY_TUTOR: TutorProfileData = {
  full_name: '',
  email: '',
  phone: '',
  avatar_url: null,
  city: '',
  state: '',
  country: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_zip: '',
  social_network_type: 'whatsapp',
  social_network_handle: '',
  privacy_profile_public: true,
  privacy_show_location: true,
  privacy_show_pets: true,
  privacy_show_social: false,
  xp: 0,
  level: 1,
  title: '',
  proof_of_love_tier: 'bronze',
  created_at: null,
};

export default function ProfilePdfScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();

  const user = useAuthStore((s) => s.user);
  const { pets } = usePets();
  const notificationsEnabled = useUIStore((s) => s.notificationsEnabled);
  const biometricEnabled = useUIStore((s) => s.biometricEnabled);
  const { granted: aiTrainingGranted } = useConsent('ai_training_anonymous');
  const prefs = React.useMemo<PreferencesData>(() => ({
    notificationsEnabled,
    biometricEnabled,
    aiTrainingGranted,
    language: i18n.language,
  }), [notificationsEnabled, biometricEnabled, aiTrainingGranted]);

  const [tutor, setTutor] = useState<TutorProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Load tutor extended data ──────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data: row } = await supabase
          .from('users')
          .select('full_name, email, phone, avatar_url, city, state, country, address_street, address_number, address_complement, address_neighborhood, address_zip, social_network_type, social_network_handle, privacy_profile_public, privacy_show_location, privacy_show_pets, privacy_show_social, xp, level, title, proof_of_love_tier, created_at')
          .eq('id', user.id)
          .single();
        if (cancelled) return;
        if (row) {
          setTutor({ ...EMPTY_TUTOR, ...row } as TutorProfileData);
        } else {
          setTutor({ ...EMPTY_TUTOR, email: user.email ?? null });
        }
      } catch {
        if (!cancelled) setTutor({ ...EMPTY_TUTOR, email: user.email ?? null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  // ── Auto-preview once data is ready ───────────────────────────────────────

  useEffect(() => {
    if (!tutor || loading) return;
    let cancelled = false;
    (async () => {
      setIsGenerating(true);
      try {
        await previewProfilePdf(tutor, pets, prefs);
        if (!cancelled) setIsGenerating(false);
      } catch {
        if (!cancelled) setIsGenerating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tutor, pets, prefs, loading]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handlePreview = useCallback(async () => {
    if (!tutor) return;
    setIsGenerating(true);
    try {
      await previewProfilePdf(tutor, pets, prefs);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [tutor, pets, prefs, toast]);



  const handleShare = useCallback(async () => {
    if (!tutor) return;
    setIsGenerating(true);
    try {
      await shareProfilePdf(tutor, pets, prefs);
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [tutor, pets, prefs, toast]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || !tutor) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
            <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{t('profilePdf.pdfTitle', { name: '' })}</Text>
          <View style={s.headerBtn} />
        </View>
        <View style={s.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={s.loadingText}>{t('profilePdf.generating')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn} activeOpacity={0.7}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('profilePdf.pdfTitle', { name: tutor.full_name ?? '' })}</Text>
        <View style={s.headerBtn} />
      </View>

      <View style={s.content}>
        {/* Preview illustration */}
        <View style={s.previewBox}>
          <View style={s.previewIconWrap}>
            <UserCircle2 size={rs(48)} color={colors.accent} strokeWidth={1.3} />
          </View>
          <Text style={s.previewTitle}>{t('profilePdf.pdfReady')}</Text>
          <Text style={s.previewSubtitle}>{t('profilePdf.pdfReadySubtitle')}</Text>
        </View>

        {/* Action buttons */}
        <View style={s.actions}>
          {/* Print / Preview */}
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.accent + '40' }]}
            onPress={handlePreview}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.accentGlow }]}>
              {isGenerating
                ? <ActivityIndicator color={colors.accent} size="small" />
                : <Download size={rs(22)} color={colors.accent} strokeWidth={1.8} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('profilePdf.printOrSave')}</Text>
              <Text style={s.actionSubtitle}>{t('profilePdf.printOrSaveHint')}</Text>
            </View>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={[s.actionRow, { borderColor: colors.petrol + '40' }]}
            onPress={handleShare}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <View style={[s.actionIcon, { backgroundColor: colors.petrolSoft }]}>
              <Share2 size={rs(22)} color={colors.petrol} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.actionTitle}>{t('profilePdf.shareFile')}</Text>
              <Text style={s.actionSubtitle}>{t('profilePdf.shareFileHint')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Disclaimer */}
        <Text style={s.disclaimer}>{t('profilePdf.pdfDisclaimer')}</Text>
      </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12) },
  loadingText: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim },

  content: { flex: 1, padding: rs(24) },
  previewBox: { alignItems: 'center', padding: rs(32) },
  previewIconWrap: { width: rs(96), height: rs(96), borderRadius: rs(28), backgroundColor: colors.accentGlow, alignItems: 'center', justifyContent: 'center', marginBottom: rs(16) },
  previewTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(20), color: colors.text, textAlign: 'center' },
  previewSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textDim, textAlign: 'center', marginTop: rs(8), lineHeight: fs(14) * 1.6 },

  actions: { gap: rs(12), marginTop: rs(8) },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: rs(14),
    backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16),
    borderWidth: 1,
  },
  actionIcon: { width: rs(48), height: rs(48), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: 'Sora_600SemiBold', fontSize: fs(15), color: colors.text },
  actionSubtitle: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim, marginTop: rs(2) },

  disclaimer: { fontFamily: 'Sora_400Regular', fontSize: fs(10), color: colors.textDim, textAlign: 'center', marginTop: rs(24) },
});
