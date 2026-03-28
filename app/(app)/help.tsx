import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageCircle,
  BookOpen,
  AlertCircle,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../../components/Toast';

export default function HelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqItems = [
    { q: t('help.faqItems.q1'), a: t('help.faqItems.a1') },
    { q: t('help.faqItems.q2'), a: t('help.faqItems.a2') },
    { q: t('help.faqItems.q3'), a: t('help.faqItems.a3') },
    { q: t('help.faqItems.q4'), a: t('help.faqItems.a4') },
    { q: t('help.faqItems.q5'), a: t('help.faqItems.a5') },
  ];

  const handleContact = () => {
    Linking.openURL('mailto:abreu@multiversodigital.com.br?subject=PetauLife%2B%20-%20Suporte');
  };

  const handleReportBug = () => {
    Linking.openURL('mailto:abreu@multiversodigital.com.br?subject=PetauLife%2B%20-%20Problema');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Acoes rapidas */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={handleContact} activeOpacity={0.7}>
            <MessageCircle size={rs(24)} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.actionLabel}>{t('help.contact')}</Text>
            <Text style={styles.actionDesc}>{t('help.contactDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleReportBug} activeOpacity={0.7}>
            <AlertCircle size={rs(24)} color={colors.warning} strokeWidth={1.8} />
            <Text style={styles.actionLabel}>{t('help.reportBug')}</Text>
            <Text style={styles.actionDesc}>{t('help.reportBugDesc')}</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <Text style={styles.sectionLabel}>{t('help.faq').toUpperCase()}</Text>

        {faqItems.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.faqItem}
            onPress={() => setOpenFaq(openFaq === idx ? null : idx)}
            activeOpacity={0.7}
          >
            <View style={styles.faqHeader}>
              <HelpCircle size={rs(18)} color={colors.accent} strokeWidth={1.8} />
              <Text style={styles.faqQuestion}>{item.q}</Text>
              {openFaq === idx ? (
                <ChevronUp size={rs(18)} color={colors.textDim} strokeWidth={1.8} />
              ) : (
                <ChevronDown size={rs(18)} color={colors.textDim} strokeWidth={1.8} />
              )}
            </View>
            {openFaq === idx && (
              <Text style={styles.faqAnswer}>{item.a}</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), paddingVertical: rs(8), gap: rs(12) },
  backBtn: { width: rs(40), height: rs(40), borderRadius: rs(radii.lg), backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: fs(18), color: colors.text },
  content: { paddingHorizontal: rs(20) },
  actionsRow: { flexDirection: 'row', gap: rs(spacing.sm), marginTop: rs(spacing.md) },
  actionCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: rs(radii.xxl), padding: rs(spacing.md), gap: rs(spacing.sm) },
  actionLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(14), color: colors.text },
  actionDesc: { fontFamily: 'Sora_400Regular', fontSize: fs(11), color: colors.textDim },
  sectionLabel: { fontFamily: 'Sora_700Bold', fontSize: fs(11), color: colors.textGhost, letterSpacing: 2, marginTop: rs(spacing.xl), marginBottom: rs(spacing.md) },
  faqItem: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: rs(radii.xl), padding: rs(spacing.md), marginBottom: rs(spacing.sm) },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: rs(spacing.sm) },
  faqQuestion: { fontFamily: 'Sora_600SemiBold', fontSize: fs(13), color: colors.text, flex: 1 },
  faqAnswer: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: rs(22), marginTop: rs(spacing.sm), paddingLeft: rs(26) },
  bottomSpacer: { height: rs(40) },
});
