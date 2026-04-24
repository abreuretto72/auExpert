import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ChevronLeft, Camera, Dog, Cat, QrCode, FileText,
} from 'lucide-react-native';
import { colors } from '../../../../constants/colors';
import { rs, fs } from '../../../../hooks/useResponsive';
import { analyzePetPhoto } from '../../../../lib/ai';
import { generateEmbedding } from '../../../../lib/rag';
import { usePet, usePets } from '../../../../hooks/usePets';
import { useAuthStore } from '../../../../stores/authStore';
import { useToast } from '../../../../components/Toast';
import { supabase } from '../../../../lib/supabase';
import { withTimeout } from '../../../../lib/withTimeout';
import { getErrorMessage } from '../../../../utils/errorMessages';
import { formatDateInput, parseDateInput, getDatePlaceholder, isoToDateInput, calcAgeMonths } from '../../../../utils/format';
import { validatePetName } from '../../../../utils/validatePetName';
import { Skeleton } from '../../../../components/Skeleton';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const user = useAuthStore((s) => s.user);
  const { data: pet, isLoading, refetch } = usePet(id!);
  const { updatePet } = usePets();

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sex, setSex] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Initialize fields from pet data (once loaded)
  if (pet && !initialized) {
    setName(pet.name ?? '');
    setBreed(pet.breed ?? '');
    setBirthDate(pet.birth_date ? isoToDateInput(pet.birth_date, i18n.language) : '');
    setWeight(pet.weight_kg != null ? String(pet.weight_kg) : '');
    setSize(pet.size ?? '');
    setColor(pet.color ?? '');
    setSex(pet.sex ?? '');
    setMicrochip(pet.microchip_id ?? '');
    setBloodType(pet.blood_type ?? '');
    setInitialized(true);
  }

  const isDog = pet?.species === 'dog';
  const petColor = isDog ? colors.click : colors.purple;

  // ── Photo upload + AI analysis ──
  const uploadPhoto = useCallback(async (uri: string) => {
    try {
      // 1. Upload photo to storage
      const FileSystem = require('expo-file-system/legacy');
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const binaryStr = atob(base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      const fileName = `${user?.id}/${id}/${Date.now()}_avatar.jpg`;
      const { data: upData, error } = await withTimeout(
        supabase.storage.from('pets').upload(fileName, bytes, { contentType: 'image/jpeg', upsert: true }),
        30_000,
        'storage.upload:pet-avatar',
      );
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('pets').getPublicUrl(upData.path);
      const publicUrl = urlData.publicUrl;

      // 2. Save avatar URL immediately
      await updatePet(id!, { avatar_url: publicUrl });
      toast(t('editPet.photoUpdated'), 'success');

      // 3. Run AI analysis on the new photo
      setIsAnalyzing(true);
      toast(t('editPet.analyzing'), 'info');

      try {
        const analysis = await analyzePetPhoto(id!, publicUrl, 'general');

        // 4. Update fields with AI results (tutor can still edit/override)
        const updates: Record<string, unknown> = { avatar_url: publicUrl };

        if (analysis.breed?.name && analysis.breed.confidence > 0.5) {
          setBreed(analysis.breed.name);
          updates.breed = analysis.breed.name;
        }
        if (analysis.estimated_age_months != null) {
          const months = analysis.estimated_age_months;
          updates.estimated_age_months = months;
        }
        if (analysis.estimated_weight_kg != null) {
          setWeight(String(analysis.estimated_weight_kg));
          updates.weight_kg = analysis.estimated_weight_kg;
        }
        if (analysis.size) {
          setSize(analysis.size);
          updates.size = analysis.size;
        }
        if (analysis.color) {
          setColor(analysis.color);
          updates.color = analysis.color;
        }
        if (analysis.mood?.primary) {
          updates.current_mood = analysis.mood.primary;
        }
        if (analysis.health?.body_condition_score != null) {
          const bcs = analysis.health.body_condition_score;
          const healthScore = Math.round(((9 - Math.abs(bcs - 5)) / 4) * 100);
          updates.health_score = Math.min(100, Math.max(0, healthScore));
        }

        // 5. Save AI-detected data to pet
        await updatePet(id!, updates as Record<string, never>);

        // 6. Feed RAG with analysis
        const embeddingText = `Análise de foto: ${analysis.breed?.name ?? ''}, ${analysis.color ?? ''}, saúde visual: ${JSON.stringify(analysis.health?.skin_coat ?? [])}, humor: ${analysis.mood?.primary ?? ''}`;
        generateEmbedding(id!, 'photo', 'avatar-' + Date.now(), embeddingText, 0.8).catch(() => {});

        toast(t('editPet.analysisComplete'), 'success');
      } catch {
        // AI analysis failed — photo was still saved, just no auto-fill
        toast(t('editPet.analysisFailed'), 'warning');
      } finally {
        setIsAnalyzing(false);
      }

      refetch();
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [id, user?.id, updatePet, refetch, toast, t]);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { toast(t('toast.cameraPermission'), 'warning'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.4 });
    if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri);
  }, [uploadPhoto, toast, t]);

  const handlePickPhoto = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) await uploadPhoto(result.assets[0].uri);
  }, [uploadPhoto]);


  // ── Auto-save (ref-based to avoid dependency loops) ──
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef({ name, breed, birthDate, weight, size, color, sex, microchip, bloodType });
  const lastSavedSnap = useRef('');
  const updatePetRef = useRef(updatePet);
  const isSaving = useRef(false);

  // Keep refs in sync — no effects, no re-renders
  dataRef.current = { name, breed, birthDate, weight, size, color, sex, microchip, bloodType };
  updatePetRef.current = updatePet;

  // Capture initial snapshot once loaded
  useEffect(() => {
    if (initialized && !lastSavedSnap.current) {
      lastSavedSnap.current = JSON.stringify(buildPayload(dataRef.current));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  const buildPayload = useCallback((data: typeof dataRef.current) => {
    const wNum = data.weight ? parseFloat(data.weight) : null;
    const birthIso = parseDateInput(data.birthDate, i18n.language);
    // Use normalized name when valid; fallback to trimmed raw to preserve
    // legacy behavior — actual save-time validation happens in doSave.
    const nameCheck = validatePetName(data.name);
    return {
      name: nameCheck.ok ? nameCheck.normalized : data.name.trim(),
      breed: data.breed.trim() || null,
      birth_date: birthIso,
      estimated_age_months: birthIso ? calcAgeMonths(birthIso) : null,
      weight_kg: wNum && !isNaN(wNum) ? wNum : null,
      size: (data.size as 'small' | 'medium' | 'large') || null,
      color: data.color.trim() || null,
      sex: (data.sex as 'male' | 'female') || null,
      microchip_id: data.microchip.trim() || null,
      blood_type: data.bloodType.trim() || null,
    };
  }, [i18n.language]);

  const doSave = useCallback(async () => {
    const data = dataRef.current;
    if (!initialized || isSaving.current) return;
    // Pet name defensive validation (added 2026-04-23). Silently block save
    // when the current name is invalid (e.g., user deleted everything and
    // typed "&&&"). The last-valid-name stays in the DB. No toast — this is
    // an auto-save flow and toasting on every keystroke would be noise.
    const nameCheck = validatePetName(data.name);
    if (!nameCheck.ok) return;
    const payload = buildPayload(data);
    const snap = JSON.stringify(payload);
    if (snap === lastSavedSnap.current) return;

    isSaving.current = true;
    try {
      await updatePetRef.current(id!, payload);
      lastSavedSnap.current = snap;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Silent fail — will retry on next change
    } finally {
      isSaving.current = false;
    }
  }, [id, initialized, buildPayload]);

  // Debounced auto-save on field changes — deps are ONLY data values
  useEffect(() => {
    if (!initialized) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, breed, birthDate, weight, color, sex, microchip, bloodType, initialized]);

  // Immediate save when size changes
  const handleSizeChange = useCallback((newSize: string) => {
    setSize(newSize);
    // doSave will pick up the new size via dataRef on next tick
    setTimeout(doSave, 50);
  }, [doSave]);

  // Save on unmount if data changed
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const data = dataRef.current;
      // Same guard as doSave — don't persist invalid names on unmount either.
      if (!validatePetName(data.name).ok) return;
      const payload = buildPayload(data);
      const snap = JSON.stringify(payload);
      if (snap === lastSavedSnap.current) return;
      supabase.from('pets').update({
        ...payload,
        updated_at: new Date().toISOString(),
      }).eq('id', id!).then(({ error }) => {
        if (error) console.warn('[EditPet] Save on exit failed:', error.message);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading || !pet) {
    return (
      <View style={S.container}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
            <ChevronLeft size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>{t('editPet.title')}</Text>
          <TouchableOpacity
            style={S.headerBtn}
            onPress={() => router.push(`/pet/${id}/id-card-pdf` as never)}
            activeOpacity={0.7}
            accessibilityLabel={t('pdfCommon.printOrSave')}
          >
            <FileText size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center', paddingTop: rs(40) }}>
          <Skeleton width={rs(100)} height={rs(100)} radius={rs(32)} />
        </View>
      </View>
    );
  }

  const sizes: { key: string; label: string }[] = [
    { key: 'small', label: t('pets.small') },
    { key: 'medium', label: t('pets.medium') },
    { key: 'large', label: t('pets.large') },
  ];

  return (
    <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={S.container}>
        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} style={S.headerBtn}>
            <ChevronLeft size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>{t('editPet.title')}</Text>
          <TouchableOpacity
            style={S.headerBtn}
            onPress={() => router.push(`/pet/${id}/id-card-pdf` as never)}
            activeOpacity={0.7}
            accessibilityLabel={t('pdfCommon.printOrSave')}
          >
            <FileText size={rs(20)} color={colors.click} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <ScrollView style={S.flex} contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* ── Avatar ── */}
          <View style={S.avatarSection}>
            <View style={[S.avatarWrap, { borderColor: petColor + '25' }]}>
              {pet.avatar_url
                ? <Image source={{ uri: pet.avatar_url }} style={S.avatarImg} />
                : isDog
                  ? <Dog size={rs(48)} color={petColor} strokeWidth={1.5} />
                  : <Cat size={rs(48)} color={petColor} strokeWidth={1.5} />}
            </View>
            <View style={S.photoButtons}>
              <TouchableOpacity style={S.photoBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
                <Camera size={rs(16)} color={colors.click} strokeWidth={1.8} />
                <Text style={S.photoBtnText}>{t('addPet.takePhoto')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.photoBtn} onPress={handlePickPhoto} activeOpacity={0.7}>
                <Dog size={rs(16)} color={colors.click} strokeWidth={1.8} />
                <Text style={S.photoBtnText}>{t('addPet.pickFromGallery')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── AI Analyzing Banner ── */}
          {isAnalyzing && (
            <View style={S.analyzingBanner}>
              <ActivityIndicator size="small" color={colors.purple} />
              <Text style={S.analyzingText}>{t('editPet.analyzing')}</Text>
            </View>
          )}

          {/* ── Saved indicator ── */}
          {saved && (
            <View style={S.savedBadge}>
              <Text style={S.savedText}>{t('editPet.autoSaved')}</Text>
            </View>
          )}

          {/* ── Fields (auto-save on blur) ── */}
          <Text style={S.label}>{t('pets.name')} *</Text>
          <View style={S.inputWrap}>
            <TextInput style={S.input} value={name} onChangeText={setName} onBlur={doSave} placeholder={t('pets.name')} placeholderTextColor={colors.placeholder} />
          </View>

          <Text style={S.label}>{t('pets.breed')}</Text>
          <View style={S.inputWrap}>
            <TextInput style={S.input} value={breed} onChangeText={setBreed} onBlur={doSave} placeholder={t('editPet.breedPlaceholder')} placeholderTextColor={colors.placeholder} />
          </View>

          <View style={S.row}>
            <View style={S.halfField}>
              <Text style={S.label}>{t('addPet.birthDate')} *</Text>
              <View style={S.inputWrap}>
                <TextInput style={S.input} value={birthDate} onChangeText={(text) => setBirthDate(formatDateInput(text, i18n.language))} onBlur={doSave} placeholder={getDatePlaceholder(i18n.language)} placeholderTextColor={colors.placeholder} keyboardType="numeric" />
              </View>
            </View>
            <View style={S.halfField}>
              <Text style={S.label}>{t('pets.weight')}</Text>
              <View style={S.inputWrap}>
                <TextInput style={S.input} value={weight} onChangeText={setWeight} onBlur={doSave} placeholder={t('pets.weightPlaceholder')} placeholderTextColor={colors.placeholder} keyboardType="decimal-pad" />
              </View>
            </View>
          </View>

          <Text style={S.label}>{t('pets.size')}</Text>
          <View style={S.sizeRow}>
            {sizes.map((sz) => (
              <TouchableOpacity
                key={sz.key}
                style={[S.sizeBtn, size === sz.key && S.sizeBtnActive]}
                onPress={() => handleSizeChange(sz.key)}
                activeOpacity={0.7}
              >
                <Text style={[S.sizeBtnText, size === sz.key && S.sizeBtnTextActive]}>{sz.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={S.label}>{t('addPet.petSex')}</Text>
          <View style={S.sizeRow}>
            {[
              { key: 'male', label: t('addPet.sexMale') },
              { key: 'female', label: t('addPet.sexFemale') },
            ].map((sx) => (
              <TouchableOpacity
                key={sx.key}
                style={[S.sizeBtn, sex === sx.key && S.sizeBtnActive]}
                onPress={() => { setSex(sx.key); setTimeout(doSave, 50); }}
                activeOpacity={0.7}
              >
                <Text style={[S.sizeBtnText, sex === sx.key && S.sizeBtnTextActive]}>{sx.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={S.label}>{t('editPet.color')}</Text>
          <View style={S.inputWrap}>
            <TextInput style={S.input} value={color} onChangeText={setColor} onBlur={doSave} placeholder={t('editPet.colorPlaceholder')} placeholderTextColor={colors.placeholder} />
          </View>

          <Text style={S.label}>{t('health.microchip')}</Text>
          <View style={[S.inputWrap, S.microchipWrap]}>
            <TextInput style={[S.input, S.microchipInput]} value={microchip} onChangeText={setMicrochip} onBlur={doSave} placeholder={t('editPet.microchipPlaceholder')} placeholderTextColor={colors.placeholder} />
            {microchip.trim().length > 0 && (
              <TouchableOpacity
                style={S.microchipQrBtn}
                onPress={() => router.push(`/pet/${id}/id-card` as never)}
                activeOpacity={0.7}
              >
                <QrCode size={rs(13)} color={colors.click} strokeWidth={1.8} />
                <Text style={S.microchipQrText}>{t('pet.qrCode')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={S.label}>{t('health.bloodType')}</Text>
          <View style={S.bloodRow}>
            {(isDog
              ? ['DEA 1.1+', 'DEA 1.1-', 'DEA 1.2', 'DEA 3', 'DEA 4', 'DEA 5', 'DEA 7']
              : ['A', 'B', 'AB']
            ).map((bt) => (
              <TouchableOpacity
                key={bt}
                style={[S.bloodBtn, bloodType === bt && S.sizeBtnActive]}
                onPress={() => { setBloodType(bloodType === bt ? '' : bt); setTimeout(doSave, 50); }}
                activeOpacity={0.7}
              >
                <Text style={[S.sizeBtnText, bloodType === bt && S.sizeBtnTextActive]}>{bt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: rs(40) }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: rs(20) },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(8) },
  headerBtn: { width: rs(42), height: rs(42), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text, textAlign: 'center' },

  avatarSection: { alignItems: 'center', paddingVertical: rs(20), gap: rs(14) },
  avatarWrap: { width: rs(100), height: rs(100), borderRadius: rs(32), backgroundColor: colors.bgCard, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: rs(30) },
  photoButtons: { flexDirection: 'row', gap: rs(10) },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.click + '30', borderRadius: rs(12), paddingHorizontal: rs(14), paddingVertical: rs(10) },
  photoBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(12), color: colors.click },

  label: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textDim, letterSpacing: 1, marginBottom: rs(6), marginTop: rs(16) },
  inputWrap: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: rs(14), overflow: 'hidden' },
  input: { fontSize: fs(15), color: colors.text, paddingHorizontal: rs(16), paddingVertical: rs(14) },
  microchipWrap: { flexDirection: 'row', alignItems: 'center' },
  microchipInput: { flex: 1 },
  microchipQrBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(4), backgroundColor: colors.clickSoft, borderLeftWidth: 1, borderLeftColor: colors.click + '25', paddingHorizontal: rs(12), paddingVertical: rs(14) },
  microchipQrText: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.click },

  row: { flexDirection: 'row', gap: rs(12) },
  halfField: { flex: 1 },

  sizeRow: { flexDirection: 'row', gap: rs(8) },
  sizeBtn: { flex: 1, paddingVertical: rs(12), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },
  sizeBtnActive: { backgroundColor: colors.click, borderColor: colors.click },
  sizeBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.textDim },
  sizeBtnTextActive: { color: '#fff' },
  // Blood types: 7 opções pra cão não cabem numa linha só. Wrap + largura mínima pra cada chip.
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: rs(8) },
  bloodBtn: { minWidth: rs(72), paddingVertical: rs(10), paddingHorizontal: rs(12), borderRadius: rs(12), backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center' },

  analyzingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.purple + '10', borderWidth: 1, borderColor: colors.purple + '20', borderRadius: rs(14), paddingVertical: rs(12), marginBottom: rs(4) },
  analyzingText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.purple },

  savedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), paddingVertical: rs(8) },
  savedText: { fontFamily: 'Sora_600SemiBold', fontSize: fs(11), color: colors.success },
});
