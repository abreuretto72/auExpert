import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as DocumentPicker from 'expo-document-picker';
import {
  ChevronLeft, User, Mail, MapPin, Calendar,
  Camera, Heart, BookOpen, ScanEye, ShieldCheck, Trophy,
  ChevronRight, Phone, Navigation, Dog, Cat,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/Toast';
import { useAuthStore } from '../../stores/authStore';
import { usePets } from '../../hooks/usePets';
import { supabase } from '../../lib/supabase';
import { getErrorMessage } from '../../utils/errorMessages';

const SOCIAL_TYPES = ['whatsapp', 'telegram', 'messenger', 'wechat', 'line', 'signal', 'kakaotalk', 'viber', 'discord', 'other'] as const;
// Social placeholders are fetched via t('profile.socialPlaceholders.<type>') at render time
const PROOF_DISCOUNTS: Record<string, number> = { bronze: 5, silver: 10, gold: 15, diamond: 25 };

interface TutorData {
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  city: string;
  state: string;
  country: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_zip: string;
  social_network_type: string;
  social_network_handle: string;
  privacy_profile_public: boolean;
  privacy_show_location: boolean;
  privacy_show_pets: boolean;
  privacy_show_social: boolean;
  xp: number;
  level: number;
  title: string;
  proof_of_love_tier: string;
  created_at: string;
}

const EMPTY: TutorData = {
  full_name: '', email: '', phone: '', avatar_url: null,
  city: '', state: '', country: '',
  address_street: '', address_number: '', address_complement: '',
  address_neighborhood: '', address_zip: '',
  social_network_type: 'whatsapp', social_network_handle: '',
  privacy_profile_public: true, privacy_show_location: true,
  privacy_show_pets: true, privacy_show_social: false,
  xp: 0, level: 1, title: '', proof_of_love_tier: 'bronze',
  created_at: '',
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { pets } = usePets();
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [data, setData] = useState<TutorData>(EMPTY);
  const initialDataRef = useRef<string>('');
  const dataRef = useRef<TutorData>(EMPTY);
  const userIdRef = useRef<string>('');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const { data: row } = await supabase
          .from('users')
          .select('full_name, email, phone, avatar_url, city, state, country, address_street, address_number, address_complement, address_neighborhood, address_zip, social_network_type, social_network_handle, privacy_profile_public, privacy_show_location, privacy_show_pets, privacy_show_social, xp, level, title, proof_of_love_tier, created_at')
          .eq('id', user.id)
          .single();
        if (row) {
          const loaded = { ...EMPTY, ...row } as TutorData;
          setData(loaded);
          dataRef.current = loaded;
          initialDataRef.current = JSON.stringify(loaded);
          userIdRef.current = user.id;
        }
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  const update = (field: keyof TutorData, value: string | boolean) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      dataRef.current = next;
      return next;
    });
  };

  // Auto-save ao sair da tela (unmount) — usa refs para ter dados mais recentes
  useEffect(() => {
    return () => {
      const d = dataRef.current;
      const uid = userIdRef.current;
      if (!uid) return;
      const current = JSON.stringify(d);
      if (current === initialDataRef.current) return; // Nada mudou

      const s = (v: string | null | undefined) => v?.trim() || null;
      supabase.from('users').update({
        full_name: s(d.full_name) ?? '', phone: s(d.phone),
        city: s(d.city), state: s(d.state), country: s(d.country),
        address_street: s(d.address_street), address_number: s(d.address_number),
        address_complement: s(d.address_complement), address_neighborhood: s(d.address_neighborhood),
        address_zip: s(d.address_zip),
        social_network_type: d.social_network_type || null, social_network_handle: s(d.social_network_handle),
        privacy_profile_public: d.privacy_profile_public, privacy_show_location: d.privacy_show_location,
        privacy_show_pets: d.privacy_show_pets, privacy_show_social: d.privacy_show_social,
      }).eq('id', uid).then(({ error }) => {
        if (error) console.warn('[Profile] Auto-save failed:', error.message);
      });
    };
  }, []);

  const handleGps = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setGpsLoading(false); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (addr) {
        setData((prev) => ({
          ...prev,
          address_street: addr.street ?? addr.name ?? prev.address_street,
          address_neighborhood: addr.district ?? addr.subregion ?? prev.address_neighborhood,
          city: addr.city ?? addr.subregion ?? addr.region ?? prev.city,
          state: addr.region ?? prev.state,
          country: addr.country ?? prev.country,
          address_zip: addr.postalCode ?? prev.address_zip,
        }));
        toast(t('tutor.gpsDetected'), 'success');
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    } finally { setGpsLoading(false); }
  }, [toast, t]);

  const handleChangePhoto = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;

      // Ler como base64 e converter para Uint8Array para upload
      const FileSystem = require('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const fileName = `${user?.id}/${Date.now()}_avatar.jpg`;
      const { data: upData, error } = await supabase.storage.from('tutores').upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true });
      if (error) {
        console.error('[Profile] Upload error:', error.message);
        throw error;
      }
      const { data: urlData } = supabase.storage.from('tutores').getPublicUrl(upData.path);
      await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', user?.id ?? '');
      setData((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
      toast(t('tutor.profileSaved'), 'success');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [user?.id, toast, t]);

  if (loading) {
    return <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View></SafeAreaView>;
  }

  const memberDate = data.created_at ? new Date(data.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '';
  const xpPct = Math.min((data.xp / 1000) * 100, 100);
  const discount = PROOF_DISCOUNTS[data.proof_of_love_tier] ?? 5;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('tutor.profile')}</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Avatar + Name ── */}
        <View style={s.avatarSection}>
          <View>
            {data.avatar_url ? (
              <Image source={{ uri: data.avatar_url }} style={s.avatarImg} />
            ) : (
              <LinearGradient colors={[colors.accent, colors.accentDark]} style={s.avatarGrad}>
                <User size={rs(48)} color="#fff" strokeWidth={1.5} />
              </LinearGradient>
            )}
            <TouchableOpacity style={s.cameraBtn} onPress={handleChangePhoto}>
              <Camera size={rs(16)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>
          <Text style={s.avatarName}>{data.full_name || 'Tutor'}</Text>
          <View style={s.avatarMeta}>
            <Mail size={rs(12)} color={colors.textDim} strokeWidth={1.8} />
            <Text style={s.avatarMetaText}>{data.email}</Text>
          </View>
          {(data.city || data.state) && (
            <View style={s.avatarMeta}>
              <MapPin size={rs(12)} color={colors.petrol} strokeWidth={1.8} />
              <Text style={[s.avatarMetaText, { color: colors.petrol }]}>
                {[data.city, data.state, data.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Level + XP ── */}
        <View style={s.xpCard}>
          <View style={s.xpTop}>
            <View style={s.xpLevelRow}>
              <Trophy size={rs(18)} color={colors.gold} strokeWidth={1.8} />
              <Text style={s.xpLevelText}>{t('tutor.level', { level: data.level })}</Text>
            </View>
            <Text style={s.xpTitle}>{data.title}</Text>
          </View>
          <View style={s.xpTrack}><View style={[s.xpFill, { width: `${xpPct}%` }]} /></View>
          <View style={s.xpBottom}>
            <Text style={s.xpVal}>{data.xp} XP</Text>
            <Text style={s.xpNext}>{t('tutor.xpProgress', { xp: data.xp, next: 1000 })}</Text>
          </View>
        </View>

        {/* ── Proof of Love ── */}
        <TouchableOpacity style={s.proofCard} activeOpacity={0.7}>
          <View style={s.proofIcon}><Heart size={rs(20)} color={colors.gold} strokeWidth={1.8} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.proofTitle}>{t('tutor.proofOfLove')}</Text>
            <Text style={s.proofSub}>{t(`tutor.proofTier.${data.proof_of_love_tier}`)} — {t('tutor.proofDiscount', { percent: discount })}</Text>
          </View>
          <ChevronRight size={rs(14)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>

        {/* ── Estatísticas 2x2 ── */}
        <Text style={s.sectionLabel}>{t('tutor.stats').toUpperCase()}</Text>
        <View style={s.statsGrid}>
          {[
            { label: t('tutor.statPets'), value: pets.length, icon: <Heart size={rs(16)} color={colors.accent} strokeWidth={1.8} />, color: colors.accent },
            { label: t('tutor.statDiary'), value: 0, icon: <BookOpen size={rs(16)} color={colors.accent} strokeWidth={1.8} />, color: colors.accent },
            { label: t('tutor.statAnalysis'), value: 0, icon: <ScanEye size={rs(16)} color={colors.purple} strokeWidth={1.8} />, color: colors.purple },
            { label: t('tutor.statVaccines'), value: '—', icon: <ShieldCheck size={rs(16)} color={colors.success} strokeWidth={1.8} />, color: colors.success },
          ].map((st, i) => (
            <View key={i} style={s.statBox}>
              <View style={s.statHeader}>{st.icon}<Text style={s.statLabel}>{st.label}</Text></View>
              <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Meus Pets ── */}
        <Text style={s.sectionLabel}>{t('pets.myPets').toUpperCase()}</Text>
        {pets.map((pet) => {
          const petColor = pet.species === 'dog' ? colors.accent : colors.purple;
          return (
            <TouchableOpacity key={pet.id} style={s.petRow} activeOpacity={0.7} onPress={() => router.push(`/pet/${pet.id}` as never)}>
              {pet.avatar_url ? (
                <Image source={{ uri: pet.avatar_url }} style={s.petAvatar} />
              ) : (
                <View style={[s.petAvatarIcon, { backgroundColor: petColor + '10', borderColor: petColor + '20' }]}>
                  {pet.species === 'dog' ? <Dog size={rs(26)} color={petColor} strokeWidth={1.8} /> : <Cat size={rs(26)} color={petColor} strokeWidth={1.8} />}
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={s.petNameRow}>
                  <Text style={s.petName}>{pet.name}</Text>
                  {pet.current_mood && <View style={[s.moodDot, { backgroundColor: colors.success }]} />}
                </View>
                <Text style={s.petBreed}>{pet.breed ?? (pet.species === 'dog' ? t('pets.dog') : t('pets.cat'))}</Text>
              </View>
              <Text style={[s.petHealth, { color: (pet.health_score ?? 0) >= 80 ? colors.success : colors.warning }]}>
                {pet.health_score ?? '—'}
              </Text>
              <ChevronRight size={rs(14)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          );
        })}

        {/* ── Dados pessoais (sempre editável, auto-save ao sair) ── */}
        <Text style={s.sectionLabel}>{t('tutor.account').toUpperCase()}</Text>
        <Input label={t('tutor.fullName')} value={data.full_name} onChangeText={(v) => update('full_name', v)} icon={<User size={rs(20)} color={colors.petrol} strokeWidth={1.8} />} showMic />
        <Input label={t('tutor.phone')} value={data.phone} onChangeText={(v) => update('phone', v)} type="numeric" icon={<Phone size={rs(20)} color={colors.petrol} strokeWidth={1.8} />} showMic={false} />

        {/* Endereço */}
        <Text style={s.sectionLabel}>{t('tutor.address').toUpperCase()}</Text>
        <TouchableOpacity style={s.gpsBtn} onPress={handleGps} disabled={gpsLoading} activeOpacity={0.7}>
          {gpsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : <Navigation size={rs(18)} color={colors.accent} strokeWidth={1.8} />}
          <Text style={s.gpsBtnText}>{gpsLoading ? t('tutor.detectingGps') : t('tutor.detectGps')}</Text>
        </TouchableOpacity>
        <Input label={t('tutor.addressStreet')} value={data.address_street} onChangeText={(v) => update('address_street', v)} icon={<MapPin size={rs(20)} color={colors.petrol} strokeWidth={1.8} />} />
        <View style={s.row}>
          <View style={{ flex: 1 }}><Input label={t('tutor.addressNumber')} value={data.address_number} onChangeText={(v) => update('address_number', v)} type="numeric" showMic={false} /></View>
          <View style={{ flex: 2 }}><Input label={t('tutor.addressComplement')} value={data.address_complement} onChangeText={(v) => update('address_complement', v)} /></View>
        </View>
        <Input label={t('tutor.addressNeighborhood')} value={data.address_neighborhood} onChangeText={(v) => update('address_neighborhood', v)} />
        <View style={s.row}>
          <View style={{ flex: 2 }}><Input label={t('tutor.addressCity')} value={data.city} onChangeText={(v) => update('city', v)} /></View>
          <View style={{ flex: 1 }}><Input label={t('tutor.addressState')} value={data.state} onChangeText={(v) => update('state', v)} /></View>
        </View>
        <View style={s.row}>
          <View style={{ flex: 1 }}><Input label={t('tutor.addressZip')} value={data.address_zip} onChangeText={(v) => update('address_zip', v)} type="numeric" showMic={false} /></View>
          <View style={{ flex: 1 }}><Input label={t('tutor.addressCountry')} value={data.country} onChangeText={(v) => update('country', v)} /></View>
        </View>

        {/* App de mensagens */}
        <Text style={s.sectionLabel}>{t('tutor.socialNetwork').toUpperCase()}</Text>
        <View style={s.socialChips}>
          {SOCIAL_TYPES.map((sn) => (
            <TouchableOpacity key={sn} style={[s.socialChip, data.social_network_type === sn && s.socialChipActive]} onPress={() => update('social_network_type', sn)}>
              <Text style={[s.socialChipText, data.social_network_type === sn && s.socialChipTextActive]}>{t(`tutor.socialTypes.${sn}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label={t('tutor.socialHandle')} value={data.social_network_handle} onChangeText={(v) => update('social_network_handle', v)} placeholder={t(`profile.socialPlaceholders.${data.social_network_type}`, { defaultValue: t('profile.socialHandle') })} showMic={false} />

        {/* Privacidade */}
        <Text style={s.sectionLabel}>{t('tutor.privacy').toUpperCase()}</Text>
        {([
          { key: 'privacy_profile_public' as const, label: t('tutor.privacyPublicProfile'), desc: t('tutor.privacyPublicProfileDesc') },
          { key: 'privacy_show_location' as const, label: t('tutor.privacyShowLocation'), desc: t('tutor.privacyShowLocationDesc') },
          { key: 'privacy_show_pets' as const, label: t('tutor.privacyShowPets'), desc: t('tutor.privacyShowPetsDesc') },
          { key: 'privacy_show_social' as const, label: t('tutor.privacyShowSocial'), desc: t('tutor.privacyShowSocialDesc') },
        ]).map((item) => (
          <View key={item.key} style={s.privacyRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.privacyLabel}>{item.label}</Text>
              <Text style={s.privacyDesc}>{item.desc}</Text>
            </View>
            <Switch
              value={data[item.key] as boolean}
              onValueChange={(v) => update(item.key, v)}
              trackColor={{ false: colors.border, true: colors.accent + '50' }}
              thumbColor={data[item.key] ? colors.accent : colors.textDim}
            />
          </View>
        ))}

        <View style={{ height: rs(40) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: rs(16), paddingVertical: rs(8) },
  headerBtn: { width: rs(42), height: rs(42), borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(22), color: colors.text },
  content: { paddingHorizontal: rs(20) },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatarGrad: { width: rs(100), height: rs(100), borderRadius: rs(32), alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOffset: { width: 0, height: rs(6) }, shadowOpacity: 0.3, shadowRadius: rs(16), elevation: 6 },
  avatarImg: { width: rs(100), height: rs(100), borderRadius: rs(32) },
  cameraBtn: { position: 'absolute', bottom: rs(-4), right: rs(-4), width: rs(32), height: rs(32), borderRadius: rs(10), backgroundColor: colors.card, borderWidth: 2, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  avatarName: { fontFamily: 'Sora_700Bold', fontSize: fs(24), color: colors.text, marginTop: spacing.md },
  avatarMeta: { flexDirection: 'row', alignItems: 'center', gap: rs(5), marginTop: rs(4) },
  avatarMetaText: { fontFamily: 'Sora_400Regular', fontSize: fs(12), color: colors.textDim },

  // XP
  xpCard: { backgroundColor: colors.card, borderRadius: rs(20), padding: rs(20), marginBottom: rs(14), borderWidth: 1, borderColor: colors.gold + '12' },
  xpTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: rs(12) },
  xpLevelRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  xpLevelText: { fontFamily: 'Sora_800ExtraBold', fontSize: fs(16), color: colors.gold },
  xpTitle: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim },
  xpTrack: { height: rs(6), borderRadius: rs(3), backgroundColor: colors.border, marginBottom: rs(8) },
  xpFill: { height: '100%', borderRadius: rs(3), backgroundColor: colors.gold },
  xpBottom: { flexDirection: 'row', justifyContent: 'space-between' },
  xpVal: { fontFamily: 'JetBrainsMono_500Medium', fontSize: fs(10), color: colors.textDim },
  xpNext: { fontFamily: 'JetBrainsMono_400Regular', fontSize: fs(10), color: colors.textGhost },

  // Proof of Love
  proofCard: { flexDirection: 'row', alignItems: 'center', gap: rs(14), backgroundColor: colors.card, borderRadius: rs(18), padding: rs(16), marginBottom: rs(14), borderWidth: 1, borderColor: colors.border },
  proofIcon: { width: rs(42), height: rs(42), borderRadius: rs(14), backgroundColor: colors.gold + '10', alignItems: 'center', justifyContent: 'center' },
  proofTitle: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text },
  proofSub: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: 2 },

  // Stats
  sectionLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textGhost, letterSpacing: 2, marginTop: rs(20), marginBottom: rs(12) },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(10), marginBottom: rs(14) },
  statBox: { width: '48%', backgroundColor: colors.card, borderRadius: rs(16), padding: rs(16), borderWidth: 1, borderColor: colors.border },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(8), marginBottom: rs(8) },
  statLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.textDim },
  statValue: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(20) },

  // My Pets
  petRow: { flexDirection: 'row', alignItems: 'center', gap: rs(14), backgroundColor: colors.card, borderRadius: rs(16), padding: rs(14), marginBottom: rs(10), borderWidth: 1, borderColor: colors.border },
  petAvatar: { width: rs(48), height: rs(48), borderRadius: rs(16) },
  petAvatarIcon: { width: rs(48), height: rs(48), borderRadius: rs(16), borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  petName: { fontFamily: 'Sora_700Bold', fontSize: fs(15), color: colors.text },
  moodDot: { width: rs(6), height: rs(6), borderRadius: rs(3) },
  petBreed: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: 2 },
  petHealth: { fontFamily: 'JetBrainsMono_700Bold', fontSize: fs(16), marginRight: rs(4) },

  // Account
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderRadius: rs(14), padding: rs(14), marginBottom: rs(8), borderWidth: 1, borderColor: colors.border },
  accountLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(10), color: colors.textDim },
  accountValue: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text, marginTop: 2 },

  // Edit fields
  row: { flexDirection: 'row', gap: spacing.sm },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.accent + '12', borderWidth: 1, borderColor: colors.accent + '25', borderRadius: radii.lg, paddingVertical: rs(12), marginBottom: spacing.md },
  gpsBtnText: { fontFamily: 'Sora_700Bold', fontSize: fs(13), color: colors.accent },

  // Social
  socialChips: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8), marginBottom: spacing.md },
  socialChip: { paddingHorizontal: rs(14), paddingVertical: rs(8), borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  socialChipActive: { backgroundColor: colors.accent + '15', borderColor: colors.accent },
  socialChipText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.textSec },
  socialChipTextActive: { color: colors.accent },

  // Privacy
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: rs(12), backgroundColor: colors.card, borderRadius: rs(14), padding: rs(14), marginBottom: rs(8), borderWidth: 1, borderColor: colors.border },
  privacyLabel: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text },
  privacyDesc: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim, marginTop: 2 },
});
