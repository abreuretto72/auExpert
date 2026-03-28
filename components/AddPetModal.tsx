import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  Dog,
  Cat,
  Camera,
  Sparkles,
  ChevronLeft,
  ArrowRight,
  X,
  ImageIcon,
  RotateCcw,
  ScanEye,
  Scale,
  Ruler,
  Palette,
  Clock,
  SmilePlus,
  ShieldCheck,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { Input } from './ui/Input';
import { useToast } from './Toast';
import { getErrorMessage } from '../utils/errorMessages';
import { supabase } from '../lib/supabase';
import type { PhotoAnalysisResponse } from '../types/ai';

type Species = 'dog' | 'cat';
type Step = 0 | 1 | 2;

export interface AddPetData {
  name: string;
  species: Species;
  breed?: string | null;
  estimated_age_months?: number | null;
  weight_kg?: number | null;
  size?: 'small' | 'medium' | 'large' | null;
  color?: string | null;
  mood?: string | null;
  health_observations?: string[] | null;
  photoUri?: string | null;
  /** Análise completa da IA — salvar na tabela photo_analyses */
  full_analysis?: PhotoAnalysisResponse | null;
}

interface AddPetModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AddPetData) => void;
  isSubmitting?: boolean;
}

const AddPetModal: React.FC<AddPetModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [step, setStep] = useState<Step>(0);
  const [species, setSpecies] = useState<Species | null>(null);
  const [petName, setPetName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysisResponse | null>(null);
  // Campos editáveis — pré-preenchidos pela IA
  const [editBreed, setEditBreed] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editSize, setEditSize] = useState<'small' | 'medium' | 'large' | ''>('');
  const [editColor, setEditColor] = useState('');
  const [editMood, setEditMood] = useState('');
  const [editHealth, setEditHealth] = useState('');
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Pulse animation for analyzing state
  useEffect(() => {
    if (analyzing) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [analyzing]);

  const handleClose = useCallback(() => {
    setStep(0);
    setSpecies(null);
    setPetName('');
    setPhotoUri(null);
    setAnalysis(null);
    setAnalyzing(false);
    setEditBreed('');
    setEditAge('');
    setEditWeight('');
    setEditSize('');
    setEditColor('');
    setEditMood('');
    setEditHealth('');
    onClose();
  }, [onClose]);

  // Tirou foto ou escolheu da galeria → já vai direto pra análise
  const handlePhotoTaken = useCallback((uri: string) => {
    setPhotoUri(uri);
    setAnalysis(null);
    setStep(2);
    // Análise dispara no useEffect abaixo
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast(t('toast.cameraPermission'), 'warning');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.4,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]) {
        handlePhotoTaken(result.assets[0].uri);
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [toast, t, handlePhotoTaken]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        handlePhotoTaken(result.assets[0].uri);
      }
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  }, [toast, handlePhotoTaken]);

  const handleSelectSpecies = useCallback((s: Species) => {
    setSpecies(s);
    setStep(1);
  }, []);

  const handleBack = useCallback(() => {
    if (step === 2) {
      setAnalysis(null);
      setAnalyzing(false);
      setStep(1);
    } else if (step === 1) {
      setSpecies(null);
      setPhotoUri(null);
      setStep(0);
    }
  }, [step]);

  // Análise automática quando entra no Step 2 com foto
  useEffect(() => {
    if (step !== 2 || !photoUri || !species || analyzing || analysis) return;

    let cancelled = false;
    (async () => {
      setAnalyzing(true);
      try {
        const base64 = await FileSystem.readAsStringAsync(photoUri, {
          encoding: 'base64',
        });

        console.log('[AddPet] Sending photo for analysis, base64 size:', Math.round(base64.length / 1024), 'KB');

        const { data, error } = await supabase.functions.invoke('analyze-pet-photo', {
          body: {
            photo_base64: base64,
            species,
            language: i18n.language,
          },
        });

        if (cancelled) return;

        if (error) {
          console.error('[AddPet] Supabase error:', error.message ?? error);
          throw error;
        }
        if (data?.error) {
          console.error('[AddPet] Function error:', data.error, data.details);
          throw new Error(data.error);
        }

        console.log('[AddPet] Analysis result received, keys:', Object.keys(data));
        const result = data as PhotoAnalysisResponse;
        setAnalysis(result);

        // Pré-preencher campos editáveis (atalhos top-level)
        if (result.breed?.name) setEditBreed(result.breed.name);
        if (result.estimated_age_months != null) {
          const m = result.estimated_age_months;
          if (m >= 12) {
            const y = Math.floor(m / 12);
            const rem = m % 12;
            setEditAge(rem > 0 ? `${y}a${rem}m` : `${y}a`);
          } else {
            setEditAge(`${m}m`);
          }
        }
        if (result.estimated_weight_kg != null) setEditWeight(String(result.estimated_weight_kg));
        if (result.size) setEditSize(result.size);
        if (result.color) setEditColor(result.color);

        // Humor — nova estrutura ou legada
        const moodId = result.mood?.primary ?? (result.mood as unknown as { id: string })?.id;
        if (moodId) setEditMood(moodId);

        // Saúde — agregar todas as observações das categorias
        const healthObs: string[] = [];
        if (result.health) {
          const categories = ['skin_coat', 'eyes', 'ears', 'mouth_teeth', 'posture_body'] as const;
          for (const cat of categories) {
            const items = result.health[cat];
            if (Array.isArray(items)) {
              for (const item of items) {
                if (item.observation) healthObs.push(item.observation);
              }
            }
          }
          if (result.health.nails?.observation) healthObs.push(result.health.nails.observation);
        }
        // Fallback legado
        if (healthObs.length === 0 && Array.isArray((result as Record<string, unknown>).health_observations)) {
          const legacy = (result as Record<string, unknown>).health_observations as unknown[];
          for (const h of legacy) {
            if (typeof h === 'string') healthObs.push(h);
            else if (h && typeof h === 'object' && 'observation' in h) healthObs.push((h as { observation: string }).observation);
          }
        }
        if (healthObs.length) setEditHealth(healthObs.join('\n'));
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[AddPet] AI analysis failed:', msg);
        toast(t('addPet.analysisError'), 'warning');
        setAnalysis(null);
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    })();

    return () => { cancelled = true; };
  }, [step, photoUri, species]);

  // Skip photo — go to step 2 manual
  const handleSkipPhoto = useCallback(() => {
    setPhotoUri(null);
    setAnalysis(null);
    setStep(2);
  }, []);

  // Converte idade em formato livre para meses: "2a" → 24, "4m" → 4, "1a6m" → 18, "18" → 18
  const parseAgeToMonths = (input: string): number | null => {
    if (!input.trim()) return null;
    const s = input.trim().toLowerCase();
    // "1a6m" ou "1a 6m"
    const mixed = s.match(/(\d+)\s*a\D*(\d+)\s*m/);
    if (mixed) return parseInt(mixed[1], 10) * 12 + parseInt(mixed[2], 10);
    // "2a" ou "2 anos" ou "2 years"
    const years = s.match(/^(\d+)\s*(a|ano|anos|year|years|y)$/);
    if (years) return parseInt(years[1], 10) * 12;
    // "4m" ou "4 meses" ou "4 months"
    const months = s.match(/^(\d+)\s*(m|mes|meses|month|months)$/);
    if (months) return parseInt(months[1], 10);
    // Número puro → meses
    const num = parseInt(s, 10);
    return isNaN(num) ? null : num;
  };

  const handleSubmit = useCallback(() => {
    console.log('[AddPet][Submit] INICIO', { species, petName: petName.trim(), editBreed, editAge, editWeight, editSize, editColor, editMood, hasAnalysis: !!analysis });
    if (!species || !petName.trim()) {
      console.log('[AddPet][Submit] ABORTADO — species ou nome vazio', { species, petName });
      return;
    }
    const ageNum = parseAgeToMonths(editAge);
    const weightNum = editWeight ? parseFloat(editWeight) : null;
    console.log('[AddPet][Submit] Parsed — age:', editAge, '→', ageNum, 'meses | weight:', editWeight, '→', weightNum);
    const healthObs = editHealth.trim()
      ? editHealth.trim().split('\n').filter(Boolean)
      : null;
    const submitData = {
      name: petName.trim(),
      species,
      breed: editBreed.trim() || null,
      estimated_age_months: ageNum && !isNaN(ageNum) ? ageNum : null,
      weight_kg: weightNum && !isNaN(weightNum) ? weightNum : null,
      size: (editSize as 'small' | 'medium' | 'large') || null,
      color: editColor.trim() || null,
      mood: editMood.trim() || null,
      health_observations: healthObs,
      photoUri,
      full_analysis: analysis,
    };
    console.log('[AddPet][Submit] Chamando onSubmit com:', JSON.stringify({
      ...submitData, full_analysis: submitData.full_analysis ? '[PRESENT]' : null, photoUri: submitData.photoUri ? '[PRESENT]' : null,
    }));
    onSubmit(submitData);
  }, [species, petName, editBreed, editAge, editWeight, editSize, editColor, editMood, editHealth, photoUri, onSubmit]);

  if (!visible) return null;

  const isDog = species === 'dog';
  const petColor = isDog ? colors.accent : colors.purple;

  const formatAge = (months: number) => {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const rem = months % 12;
      return rem > 0 ? `${years}a ${rem}m` : `${years} ${t('addPet.years', { count: years })}`;
    }
    return t('addPet.months', { count: months });
  };

  const formatSize = (size: string) => {
    const map: Record<string, string> = {
      small: t('addPet.sizeSmall'),
      medium: t('addPet.sizeMedium'),
      large: t('addPet.sizeLarge'),
    };
    return map[size] ?? size;
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={analyzing ? undefined : handleClose} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* Handle bar */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            {step > 0 && !analyzing ? (
              <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                <ChevronLeft size={22} color={colors.accent} strokeWidth={1.8} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
            <Text style={styles.sheetTitle}>
              {step === 0 ? t('addPet.title') : step === 1 ? t('addPet.photoTitle') : t('addPet.nameTitle')}
            </Text>
            {!analyzing ? (
              <TouchableOpacity onPress={handleClose} style={styles.backBtn}>
                <X size={22} color={colors.accent} strokeWidth={1.8} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Step 0: Species selection ─── */}
            {step === 0 && (
              <>
                <Text style={styles.question}>{t('addPet.speciesQuestion')}</Text>

                <TouchableOpacity
                  style={[styles.speciesBtn, { borderColor: colors.accent + '30' }]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectSpecies('dog')}
                >
                  <View style={[styles.speciesIcon, { backgroundColor: colors.accent + '12' }]}>
                    <Dog size={40} color={colors.accent} strokeWidth={1.5} />
                  </View>
                  <View style={styles.speciesInfo}>
                    <Text style={styles.speciesLabel}>{t('pets.dog')}</Text>
                    <Text style={styles.speciesSub}>{t('addPet.allBreeds')}</Text>
                  </View>
                  <ArrowRight size={20} color={colors.accent} strokeWidth={1.8} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.speciesBtn, { borderColor: colors.purple + '30' }]}
                  activeOpacity={0.7}
                  onPress={() => handleSelectSpecies('cat')}
                >
                  <View style={[styles.speciesIcon, { backgroundColor: colors.purple + '12' }]}>
                    <Cat size={40} color={colors.purple} strokeWidth={1.5} />
                  </View>
                  <View style={styles.speciesInfo}>
                    <Text style={styles.speciesLabel}>{t('pets.cat')}</Text>
                    <Text style={styles.speciesSub}>{t('addPet.allBreeds')}</Text>
                  </View>
                  <ArrowRight size={20} color={colors.purple} strokeWidth={1.8} />
                </TouchableOpacity>

                <Text style={styles.onlyDogsAndCats}>{t('addPet.onlyDogsAndCats')}</Text>
              </>
            )}

            {/* ─── Step 1: Photo ─── */}
            {step === 1 && species && (
              <>
                <View style={styles.aiBanner}>
                  <Sparkles size={18} color={colors.purple} strokeWidth={1.8} />
                  <Text style={styles.aiBannerText}>{t('addPet.aiWillIdentify')}</Text>
                </View>

                <Text style={styles.photoInstructions}>
                  {t('addPet.photoInstructions', { pet: isDog ? t('pets.dog').toLowerCase() : t('pets.cat').toLowerCase() })}
                </Text>

                <TouchableOpacity
                  style={[styles.cameraBtn, { borderColor: petColor + '30' }]}
                  activeOpacity={0.7}
                  onPress={handleTakePhoto}
                >
                  <LinearGradient colors={[petColor + '08', petColor + '04']} style={styles.cameraBtnGradient}>
                    <View style={[styles.cameraCircle, { backgroundColor: petColor + '15' }]}>
                      <Camera size={36} color={petColor} strokeWidth={1.5} />
                    </View>
                    <Text style={[styles.cameraBtnText, { color: petColor }]}>{t('addPet.takePhoto')}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.galleryBtn} activeOpacity={0.7} onPress={handlePickFromGallery}>
                  <ImageIcon size={18} color={colors.accent} strokeWidth={1.8} />
                  <Text style={styles.galleryBtnText}>{t('addPet.pickFromGallery')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.skipPhotoBtn} activeOpacity={0.7} onPress={handleSkipPhoto}>
                  <Text style={styles.skipPhotoText}>{t('addPet.skipPhoto')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ─── Step 2: AI Results + Name + Confirm ─── */}
            {step === 2 && species && (
              <>
                {/* ── Analyzing state ── */}
                {analyzing && (
                  <View style={styles.analyzingContainer}>
                    {photoUri && (
                      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <Image source={{ uri: photoUri }} style={[styles.analyzingPhoto, { borderColor: colors.purple + '50' }]} />
                      </Animated.View>
                    )}
                    <View style={styles.analyzingRow}>
                      <ActivityIndicator size="small" color={colors.purple} />
                      <Text style={styles.analyzingText}>{t('addPet.analyzing')}</Text>
                    </View>
                    <Text style={styles.analyzingHint}>{t('addPet.analyzingHint')}</Text>
                  </View>
                )}

                {/* ── AI Results (editáveis) ou Manual entry ── */}
                {!analyzing && (
                  <>
                    {analysis && (
                      <View style={styles.aiResultsHeader}>
                        <Sparkles size={16} color={colors.purple} strokeWidth={2} />
                        <Text style={styles.aiResultsTitle}>{t('addPet.analysisComplete')}</Text>
                        {analysis.breed && (
                          <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>
                              {t('addPet.confidence', { value: Math.round(analysis.breed.confidence * 100) })}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}

                    {!analysis && (
                      <View style={[styles.aiSummary, { borderColor: petColor + '25' }]}>
                        <View style={styles.aiSummaryTop}>
                          {isDog ? <Dog size={24} color={petColor} strokeWidth={1.8} /> : <Cat size={24} color={petColor} strokeWidth={1.8} />}
                          <View style={styles.aiSummaryBadge}>
                            <Sparkles size={12} color={colors.purple} strokeWidth={2} />
                            <Text style={styles.aiSummaryBadgeText}>{t('addPet.manualEntry')}</Text>
                          </View>
                        </View>
                        <Text style={styles.aiSummaryHint}>{t('addPet.completeDataLater')}</Text>
                      </View>
                    )}
                  </>
                )}

                {/* ── Campos editáveis (hidden while analyzing) ── */}
                {!analyzing && (
                  <>
                    {/* Nome */}
                    <Input
                      label={t('addPet.whatIsName', { pronoun: isDog ? t('common.he') : t('common.she') })}
                      placeholder={t('addPet.petNamePlaceholder', { pet: isDog ? t('pets.dog').toLowerCase() : t('pets.cat').toLowerCase() })}
                      value={petName}
                      onChangeText={setPetName}
                      icon={isDog ? <Dog size={20} color={petColor} strokeWidth={1.8} /> : <Cat size={20} color={petColor} strokeWidth={1.8} />}
                      showMic
                    />

                    {/* Raça */}
                    <Input
                      label={t('addPet.breed')}
                      placeholder={t('addPet.breed')}
                      value={editBreed}
                      onChangeText={setEditBreed}
                      icon={<ScanEye size={20} color={colors.purple} strokeWidth={1.8} />}
                    />

                    {/* Idade + Peso (lado a lado) */}
                    <View style={styles.rowFields}>
                      <View style={styles.halfField}>
                        <Input
                          label={t('addPet.estimatedAge')}
                          placeholder="ex: 4m, 2a, 1a6m"
                          value={editAge}
                          onChangeText={setEditAge}
                          icon={<Clock size={20} color={colors.petrol} strokeWidth={1.8} />}
                        />
                      </View>
                      <View style={styles.halfField}>
                        <Input
                          label={t('addPet.estimatedWeight')}
                          placeholder="kg"
                          value={editWeight}
                          onChangeText={setEditWeight}
                          type="numeric"
                          icon={<Scale size={20} color={colors.petrol} strokeWidth={1.8} />}
                        />
                      </View>
                    </View>

                    {/* Porte (chips) */}
                    <Text style={styles.fieldLabel}>{t('addPet.petSize')}</Text>
                    <View style={styles.sizeChips}>
                      {(['small', 'medium', 'large'] as const).map((s) => (
                        <TouchableOpacity
                          key={s}
                          style={[styles.sizeChip, editSize === s && { backgroundColor: petColor + '20', borderColor: petColor }]}
                          onPress={() => setEditSize(s)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.sizeChipText, editSize === s && { color: petColor }]}>
                            {formatSize(s)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Cor */}
                    <Input
                      label={t('addPet.coatColor')}
                      placeholder={t('addPet.coatColor')}
                      value={editColor}
                      onChangeText={setEditColor}
                      icon={<Palette size={20} color={colors.petrol} strokeWidth={1.8} />}
                    />

                    {/* Humor */}
                    {editMood ? (
                      <View style={styles.moodRow}>
                        <SmilePlus size={18} color={colors.accent} strokeWidth={1.8} />
                        <Text style={styles.moodLabel}>{t('diary.mood')}</Text>
                        <View style={[styles.moodChip, { backgroundColor: colors.accent + '15', borderColor: colors.accent + '40' }]}>
                          <Text style={[styles.moodChipText, { color: colors.accent }]}>{editMood}</Text>
                        </View>
                        {analysis?.mood?.confidence != null && (
                          <View style={styles.confidenceBadge}>
                            <Text style={styles.confidenceText}>
                              {t('addPet.confidence', { value: Math.round(analysis.mood.confidence * 100) })}
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}

                    {/* Observações de saúde */}
                    {editHealth ? (
                      <View style={styles.healthCard}>
                        <View style={styles.healthHeader}>
                          <ShieldCheck size={16} color={colors.success} strokeWidth={1.8} />
                          <Text style={styles.healthTitle}>{t('health.score', 'Saúde')}</Text>
                        </View>
                        {editHealth.split('\n').filter(Boolean).map((obs, i) => (
                          <View key={i} style={styles.healthItem}>
                            <View style={styles.healthDot} />
                            <Text style={styles.healthText}>{obs}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Alertas da IA */}
                    {analysis?.alerts && analysis.alerts.length > 0 && (
                      <View style={styles.alertsCard}>
                        {analysis.alerts.map((alert, i) => (
                          <View key={i} style={styles.alertItem}>
                            <View style={[
                              styles.alertDot,
                              { backgroundColor: alert.severity === 'concern' ? colors.danger : alert.severity === 'attention' ? colors.warning : colors.petrol },
                            ]} />
                            <Text style={[
                              styles.alertText,
                              { color: alert.severity === 'concern' ? colors.danger : alert.severity === 'attention' ? colors.warning : colors.textSec },
                            ]}>
                              {alert.message}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Condição corporal */}
                    {analysis?.health?.body_condition_score != null && (
                      <View style={styles.bcsRow}>
                        <Text style={styles.bcsLabel}>BCS</Text>
                        <View style={styles.bcsBar}>
                          {[1,2,3,4,5,6,7,8,9].map((n) => (
                            <View key={n} style={[
                              styles.bcsSegment,
                              n <= (analysis.health?.body_condition_score ?? 0) && {
                                backgroundColor: n <= 3 ? colors.warning : n <= 6 ? colors.success : colors.danger,
                              },
                            ]} />
                          ))}
                        </View>
                        <Text style={styles.bcsValue}>
                          {analysis.health.body_condition_score}/9
                          {analysis.health.body_condition ? ` (${analysis.health.body_condition})` : ''}
                        </Text>
                      </View>
                    )}

                    {/* Disclaimer */}
                    {analysis && (
                      <Text style={styles.aiDisclaimer}>{t('addPet.aiDisclaimer')}</Text>
                    )}

                    {/* Submit */}
                    <TouchableOpacity
                      style={[styles.submitBtn, !petName.trim() && styles.submitBtnDisabled]}
                      activeOpacity={0.8}
                      onPress={handleSubmit}
                      disabled={!petName.trim() || isSubmitting}
                    >
                      <LinearGradient
                        colors={petName.trim() ? [petColor, isDog ? colors.accentDark : '#7D3C98'] : [colors.card, colors.card]}
                        style={styles.submitBtnGradient}
                      >
                        {isDog ? <Dog size={18} color="#fff" strokeWidth={2} /> : <Cat size={18} color="#fff" strokeWidth={2} />}
                        <Text style={styles.submitBtnText}>
                          {isSubmitting ? t('addPet.registering') : t('addPet.register', { name: petName.trim() || 'pet' })}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  keyboardView: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  handleRow: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.textGhost },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { fontFamily: 'Sora_700Bold', fontSize: 18, color: colors.text },
  sheetContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Step 0
  question: { fontFamily: 'Sora_600SemiBold', fontSize: 16, color: colors.text, textAlign: 'center', marginBottom: spacing.lg, marginTop: spacing.sm },
  speciesBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderRadius: radii.xxl, padding: spacing.md, marginBottom: spacing.md, gap: spacing.md },
  speciesIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  speciesInfo: { flex: 1 },
  speciesLabel: { fontFamily: 'Sora_700Bold', fontSize: 20, color: colors.text },
  speciesSub: { fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textDim, marginTop: 2 },
  onlyDogsAndCats: { fontFamily: 'Sora_400Regular', fontSize: 12, color: colors.textGhost, textAlign: 'center', marginTop: spacing.sm },

  // Step 1
  aiBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.purpleSoft, borderWidth: 1, borderColor: colors.purple + '25', borderRadius: radii.lg, paddingVertical: 10, marginBottom: spacing.md },
  aiBannerText: { fontFamily: 'Sora_700Bold', fontSize: 13, color: colors.purple },
  photoInstructions: { fontFamily: 'Sora_400Regular', fontSize: 14, color: colors.textSec, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  cameraBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radii.card, overflow: 'hidden', marginBottom: spacing.md },
  cameraBtnGradient: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  cameraCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cameraBtnText: { fontFamily: 'Sora_700Bold', fontSize: 16 },
  galleryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, paddingVertical: 14, marginBottom: spacing.md },
  galleryBtnText: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.accent },
  skipPhotoBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  skipPhotoText: { fontFamily: 'Sora_500Medium', fontSize: 13, color: colors.textDim, textDecorationLine: 'underline' },
  photoPreview: { alignItems: 'center', marginBottom: spacing.lg },
  photoImage: { width: 200, height: 200, borderRadius: radii.card, borderWidth: 3, marginBottom: spacing.md },
  photoActions: { flexDirection: 'row', gap: spacing.md },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 10 },
  photoActionText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: colors.accent },
  confirmPhotoBtn: { borderRadius: radii.xl, overflow: 'hidden' },
  confirmPhotoBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: spacing.sm },
  confirmPhotoBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },

  // Step 2: Analyzing
  analyzingContainer: { alignItems: 'center', paddingVertical: spacing.xl },
  analyzingPhoto: { width: 140, height: 140, borderRadius: radii.card, borderWidth: 3, marginBottom: spacing.lg },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  analyzingText: { fontFamily: 'Sora_700Bold', fontSize: 16, color: colors.purple },
  analyzingHint: { fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textDim, textAlign: 'center' },

  // Step 2: AI Results header
  aiResultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  aiResultsTitle: { fontFamily: 'Sora_700Bold', fontSize: 14, color: colors.purple, flex: 1 },
  confidenceBadge: { backgroundColor: colors.purpleSoft, borderRadius: radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  confidenceText: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 10, color: colors.purple },
  aiDisclaimer: { fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textDim, textAlign: 'center', marginTop: 4, marginBottom: spacing.md, fontStyle: 'italic' },

  // Step 2: Manual
  aiSummary: { backgroundColor: colors.card, borderWidth: 1, borderRadius: radii.xxl, padding: spacing.md, marginBottom: spacing.lg },
  aiSummaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  aiSummaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.purpleSoft, borderRadius: radii.sm, paddingHorizontal: 8, paddingVertical: 4 },
  aiSummaryBadgeText: { fontFamily: 'Sora_600SemiBold', fontSize: 10, color: colors.purple },
  aiSummaryHint: { fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textSec, lineHeight: 20 },

  // Alerts + BCS
  alertsCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.warning + '25', borderRadius: radii.xxl, padding: spacing.md, marginBottom: spacing.md },
  alertItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  alertDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  alertText: { fontFamily: 'Sora_500Medium', fontSize: 13, flex: 1, lineHeight: 20 },
  bcsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, paddingHorizontal: 4 },
  bcsLabel: { fontFamily: 'Sora_700Bold', fontSize: 11, color: colors.textDim, width: 30 },
  bcsBar: { flex: 1, flexDirection: 'row', gap: 2, height: 8 },
  bcsSegment: { flex: 1, borderRadius: 2, backgroundColor: colors.border },
  bcsValue: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 11, color: colors.textSec, width: 80, textAlign: 'right' },

  // Mood + Health
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md, paddingVertical: 8 },
  moodLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.textDim },
  moodChip: { borderRadius: radii.sm, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  moodChipText: { fontFamily: 'Sora_700Bold', fontSize: 12, textTransform: 'capitalize' },
  healthCard: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.success + '25', borderRadius: radii.xxl, padding: spacing.md, marginBottom: spacing.md },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  healthTitle: { fontFamily: 'Sora_700Bold', fontSize: 13, color: colors.success },
  healthItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  healthDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginTop: 6 },
  healthText: { fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textSec, flex: 1, lineHeight: 20 },

  // Editable fields
  rowFields: { flexDirection: 'row', gap: spacing.sm },
  halfField: { flex: 1 },
  fieldLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 12, color: colors.textDim, marginBottom: 6, marginTop: 4 },
  sizeChips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  sizeChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  sizeChipText: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: colors.textSec },

  // Preview + Submit
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderRadius: radii.xxl, padding: spacing.md, gap: spacing.md, marginBottom: spacing.lg },
  previewAvatar: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewInfo: { flex: 1 },
  previewName: { fontFamily: 'Sora_700Bold', fontSize: 20, color: colors.text },
  previewSpecies: { fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textDim, marginTop: 2 },
  submitBtn: { borderRadius: radii.xl, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 52, gap: 8 },
  submitBtnText: { fontFamily: 'Sora_700Bold', fontSize: 15, color: '#fff' },
});

export default AddPetModal;
