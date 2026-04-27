/**
 * about.tsx — Tela "Sobre" com logo, versão automática, copyright e suporte.
 *
 * Versão vem de `expo-constants` (Constants.expoConfig.version) — atualiza
 * sozinha a cada build do Expo, sem mexer em nada.
 */
import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Mail, ExternalLink, Info } from 'lucide-react-native';
import Constants from 'expo-constants';
import { rs, fs } from '../../hooks/useResponsive';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import AuExpertLogo from '../../components/AuExpertLogo';

const SUPPORT_EMAIL = 'support@auexpert.com.br';
const COMPANY_URL = 'https://www.multiversodigital.com.br';
const PRIVACY_URL = 'https://abreuretto72.github.io/auExpert/legal/privacy.html';
const TERMS_URL = 'https://abreuretto72.github.io/auExpert/legal/terms.html';

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : String(Constants.expoConfig?.android?.versionCode ?? '');
  const currentYear = new Date().getFullYear();

  const handleEmailSupport = () => {
    const subject = encodeURIComponent(t('about.emailSubject', { version: appVersion }));
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t('about.title')}</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo + nome */}
        <View style={s.logoWrap}>
          <AuExpertLogo size="large" />
          <Text style={s.tagline}>{t('about.tagline')}</Text>
        </View>

        {/* Versão */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={s.cardIconWrap}>
              <Info size={rs(18)} color={colors.click} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>{t('about.versionLabel')}</Text>
              <Text style={s.cardValue}>
                {appVersion}
                {buildNumber ? ` · build ${buildNumber}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Empresa */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={[s.cardIconWrap, { backgroundColor: colors.aiSoft }]}>
              <ExternalLink size={rs(18)} color={colors.ai} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>{t('about.companyLabel')}</Text>
              <Text style={s.cardValue}>Multiverso Digital</Text>
              <TouchableOpacity onPress={() => Linking.openURL(COMPANY_URL)} activeOpacity={0.7}>
                <Text style={s.cardLink}>{COMPANY_URL.replace('https://', '')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Suporte */}
        <TouchableOpacity style={s.card} onPress={handleEmailSupport} activeOpacity={0.85}>
          <View style={s.cardRow}>
            <View style={[s.cardIconWrap, { backgroundColor: colors.successSoft }]}>
              <Mail size={rs(18)} color={colors.success} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>{t('about.supportLabel')}</Text>
              <Text style={s.cardValueLink}>{SUPPORT_EMAIL}</Text>
              <Text style={s.cardHint}>{t('about.supportHint')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Links legais */}
        <View style={s.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)} activeOpacity={0.7}>
            <Text style={s.legalLink}>{t('about.privacy')}</Text>
          </TouchableOpacity>
          <Text style={s.legalSep}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)} activeOpacity={0.7}>
            <Text style={s.legalLink}>{t('about.terms')}</Text>
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <View style={s.copyright}>
          <Text style={s.copyText}>
            © {currentYear} Multiverso Digital
          </Text>
          <Text style={s.copySubtext}>{t('about.allRightsReserved')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: rs(16), paddingVertical: rs(12),
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: rs(36), height: rs(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fs(17), fontWeight: '700', color: colors.text },
  scroll: { flex: 1 },
  content: { padding: rs(20), paddingBottom: rs(40), gap: rs(14) },

  logoWrap: { alignItems: 'center', marginVertical: rs(20), gap: rs(10) },
  tagline: {
    fontSize: fs(13), color: colors.textDim, textAlign: 'center', fontStyle: 'italic',
    paddingHorizontal: rs(20),
  },

  card: {
    backgroundColor: colors.card, borderRadius: radii.card,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(12) },
  cardIconWrap: {
    width: rs(40), height: rs(40), borderRadius: radii.lg,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.clickSoft,
  },
  cardLabel: {
    fontSize: fs(11), color: colors.textDim, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  cardValue: { fontSize: fs(15), color: colors.text, fontWeight: '600', marginTop: rs(2) },
  cardValueLink: {
    fontSize: fs(15), color: colors.click, fontWeight: '600', marginTop: rs(2),
  },
  cardLink: { fontSize: fs(12), color: colors.click, marginTop: rs(2) },
  cardHint: { fontSize: fs(11), color: colors.textDim, marginTop: rs(4), fontStyle: 'italic' },

  legalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: rs(10), marginTop: rs(8),
  },
  legalLink: { fontSize: fs(12), color: colors.click, fontWeight: '600' },
  legalSep: { color: colors.textDim, fontSize: fs(12) },

  copyright: { alignItems: 'center', gap: rs(2), marginTop: rs(20) },
  copyText: {
    fontSize: fs(12), color: colors.textDim, fontWeight: '600', letterSpacing: 0.3,
  },
  copySubtext: { fontSize: fs(10), color: colors.textGhost },
});
