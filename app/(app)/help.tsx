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
          <ChevronLeft size={22} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Acoes rapidas */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={handleContact} activeOpacity={0.7}>
            <MessageCircle size={24} color={colors.accent} strokeWidth={1.8} />
            <Text style={styles.actionLabel}>{t('help.contact')}</Text>
            <Text style={styles.actionDesc}>{t('help.contactDesc')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={handleReportBug} activeOpacity={0.7}>
            <AlertCircle size={24} color={colors.warning} strokeWidth={1.8} />
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
              <HelpCircle size={18} color={colors.accent} strokeWidth={1.8} />
              <Text style={styles.faqQuestion}>{item.q}</Text>
              {openFaq === idx ? (
                <ChevronUp size={18} color={colors.textDim} strokeWidth={1.8} />
              ) : (
                <ChevronDown size={18} color={colors.textDim} strokeWidth={1.8} />
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
  headerBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: 'Sora_700Bold', fontSize: 18, color: colors.text },
  content: { paddingHorizontal: 20 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionCard: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xxl, padding: spacing.md, gap: spacing.sm },
  actionLabel: { fontFamily: 'Sora_700Bold', fontSize: 14, color: colors.text },
  actionDesc: { fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textDim },
  sectionLabel: { fontFamily: 'Sora_700Bold', fontSize: 11, color: colors.textGhost, letterSpacing: 2, marginTop: spacing.xl, marginBottom: spacing.md },
  faqItem: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.xl, padding: spacing.md, marginBottom: spacing.sm },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  faqQuestion: { fontFamily: 'Sora_600SemiBold', fontSize: 13, color: colors.text, flex: 1 },
  faqAnswer: { fontFamily: 'Sora_400Regular', fontSize: 13, color: colors.textSec, lineHeight: 22, marginTop: spacing.sm, paddingLeft: 26 },
  bottomSpacer: { height: 40 },
});
