/**
 * /tci-sign — Tela do TUTOR para revisar e assinar um TCI.
 *
 * Acessada via push (route='/tci-sign?id=<tciId>') ou da lista de TCIs pendentes.
 *
 * Fluxo:
 *   1. Carrega o TCI completo
 *   2. Tutor le tudo
 *   3. Confirma com biometria (expo-local-authentication)
 *   4. Chama RPC tutor_sign_tci(tciId)
 *   5. Trigger no banco enfileira push pro vet
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, AlertTriangle, FileSignature, Fingerprint, CheckCircle } from 'lucide-react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { getErrorMessage } from '../../utils/errorMessages';

interface TciDoc {
  id: string;
  pet_id: string;
  procedure_type: string;
  procedure_description: string;
  risks_described: string | null;
  alternatives_described: string | null;
  tutor_signed_at: string | null;
  professional_signed_at: string | null;
  status: string;
}

async function biometricConfirm(promptMessage: string, cancelLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const LocalAuth = require('expo-local-authentication');
    const has = await LocalAuth.hasHardwareAsync();
    const enrolled = await LocalAuth.isEnrolledAsync();
    if (!has || !enrolled) return false;
    const r = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: false,
    });
    return !!r.success;
  } catch {
    return false;
  }
}

export default function TciSignScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { id: tciId } = useLocalSearchParams<{ id?: string }>();

  const [doc, setDoc] = useState<TciDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    if (!tciId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('termos_consentimento')
        .select('id, pet_id, procedure_type, procedure_description, risks_described, alternatives_described, tutor_signed_at, professional_signed_at, status')
        .eq('id', tciId)
        .maybeSingle();
      if (error) throw error;
      setDoc(data as TciDoc | null);
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [tciId, toast]);

  useEffect(() => { load(); }, [load]);

  const handleSign = useCallback(async () => {
    if (!doc) return;
    setSigning(true);
    try {
      const ok = await biometricConfirm(
        t('agents.tci.tutor.signWithBio'),
        t('common.cancel'),
      );
      if (!ok) {
        toast(t('agents.tci.tutor.biometricFailed'), 'warning');
        return;
      }
      const { error } = await supabase.rpc('tutor_sign_tci', { p_tci_id: doc.id });
      if (error) throw error;
      toast(t('agents.tci.tutor.signed'), 'success');
      router.back();
    } catch (e) {
      toast(getErrorMessage(e), 'error');
    } finally {
      setSigning(false);
    }
  }, [doc, toast, router, t]);

  if (!tciId) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.errorBox}>
          <AlertTriangle size={rs(28)} color={colors.warning} strokeWidth={1.6} />
          <Text style={s.errorTxt}>{t('agents.tci.tutor.noTciSelected')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={colors.click} />
        </View>
      </SafeAreaView>
    );
  }

  if (!doc) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.errorBox}>
          <AlertTriangle size={rs(28)} color={colors.warning} strokeWidth={1.6} />
          <Text style={s.errorTxt}>{t('agents.tci.tutor.notFound')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <Text style={s.backBtnTxt}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const alreadySigned = !!doc.tutor_signed_at;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={rs(26)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('agents.tci.tutor.title')}</Text>
        <View style={{ width: rs(26) }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.heroCard}>
          <View style={s.heroIcon}>
            <FileSignature size={rs(22)} color={colors.click} strokeWidth={1.8} />
          </View>
          <Text style={s.heroTitle}>{t('agents.tci.tutor.reviewBeforeSigning')}</Text>
          <Text style={s.heroDesc}>{t('agents.tci.tutor.reviewDesc')}</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t('agents.tci.tutor.procedureLabel')}</Text>
          <Text style={s.cardBody}>{doc.procedure_type}</Text>
          <Text style={[s.cardBody, { marginTop: rs(8), color: colors.textSec }]}>{doc.procedure_description}</Text>
        </View>

        {doc.risks_described && (
          <View style={[s.card, s.cardWarning]}>
            <View style={s.cardHeader}>
              <AlertTriangle size={rs(14)} color={colors.warning} strokeWidth={1.8} />
              <Text style={[s.cardTitle, { color: colors.warning }]}>{t('agents.tci.tutor.risksLabel')}</Text>
            </View>
            <Text style={s.cardBody}>{doc.risks_described}</Text>
          </View>
        )}

        {doc.alternatives_described && (
          <View style={s.card}>
            <Text style={s.cardTitle}>{t('agents.tci.tutor.alternativesLabel')}</Text>
            <Text style={s.cardBody}>{doc.alternatives_described}</Text>
          </View>
        )}

        {alreadySigned ? (
          <View style={s.signedBanner}>
            <CheckCircle size={rs(20)} color={colors.success} strokeWidth={1.8} />
            <View style={{ flex: 1 }}>
              <Text style={s.signedTitle}>{t('agents.tci.tutor.alreadySigned')}</Text>
              <Text style={s.signedDate}>
                {t('agents.tci.tutor.signedAt', { date: new Date(doc.tutor_signed_at!).toLocaleString() })}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.primaryBtn, signing && s.primaryBtnDisabled]}
            onPress={handleSign}
            disabled={signing}
            activeOpacity={0.85}
          >
            {signing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Fingerprint size={rs(20)} color="#fff" strokeWidth={2} />
                <Text style={s.primaryBtnTxt}>{t('agents.tci.tutor.signWithBio')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { color: colors.text, fontSize: fs(17), fontWeight: '700' },
  scroll: { padding: spacing.md, paddingBottom: rs(40) },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: rs(12), padding: spacing.lg },
  errorTxt: { color: colors.text, fontSize: fs(13), textAlign: 'center' },
  backBtn: { paddingHorizontal: rs(20), paddingVertical: rs(10), borderRadius: radii.lg, backgroundColor: colors.click },
  backBtnTxt: { color: '#fff', fontSize: fs(13), fontWeight: '700' },
  heroCard: { backgroundColor: colors.clickSoft, borderWidth: 1, borderColor: colors.clickRing, borderRadius: radii.card, padding: rs(18), alignItems: 'center', gap: rs(8), marginBottom: spacing.md },
  heroIcon: { width: rs(44), height: rs(44), borderRadius: rs(22), backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontSize: fs(15), fontWeight: '700', textAlign: 'center' },
  heroDesc: { color: colors.textSec, fontSize: fs(12), textAlign: 'center', lineHeight: fs(18) },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: rs(14), marginBottom: rs(10) },
  cardWarning: { backgroundColor: colors.warning + '08', borderColor: colors.warning + '30' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(6), marginBottom: rs(6) },
  cardTitle: { color: colors.textSec, fontSize: fs(11), fontWeight: '700', marginBottom: rs(6), textTransform: 'uppercase' },
  cardBody: { color: colors.text, fontSize: fs(13), lineHeight: fs(19) },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(8), backgroundColor: colors.click, paddingVertical: rs(14), borderRadius: radii.lg, marginTop: spacing.md },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnTxt: { color: '#fff', fontSize: fs(14), fontWeight: '700' },
  signedBanner: { flexDirection: 'row', alignItems: 'center', gap: rs(10), backgroundColor: colors.success + '15', borderRadius: radii.lg, padding: rs(14), marginTop: spacing.md, borderWidth: 1, borderColor: colors.success + '40' },
  signedTitle: { color: colors.success, fontSize: fs(13), fontWeight: '700' },
  signedDate: { color: colors.textSec, fontSize: fs(11), marginTop: rs(2) },
});
