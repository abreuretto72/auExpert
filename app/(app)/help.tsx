import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
  AlertCircle,
  ShieldCheck,
  Pill,
  AlertTriangle,
  Stethoscope,
  Scissors,
  Thermometer,
  FileText,
  Scale,
  Activity,
  UtensilsCrossed,
  CreditCard,
  SmilePlus,
  Sparkles,
  Heart,
  MapPin,
  DollarSign,
  Home,
  PersonStanding,
  Camera,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import PdfActionModal from '../../components/pdf/PdfActionModal';
import { previewHelpPdf, shareHelpPdf } from '../../lib/helpPdf';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';

type LensType =
  | 'vaccine'
  | 'medication'
  | 'allergy'
  | 'consultation'
  | 'surgery'
  | 'symptom'
  | 'exam'
  | 'weight'
  | 'clinical_metric'
  | 'food'
  | 'plan'
  | 'mood'
  | 'moment'
  | 'connection'
  | 'travel'
  | 'expense'
  | 'boarding'
  | 'dog_walker'
  | 'grooming'
  | 'photo_analysis';

interface LensItem {
  type: LensType;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  color: string;
}

const LENSES: LensItem[] = [
  { type: 'vaccine',         Icon: ShieldCheck,      color: colors.success },
  { type: 'medication',      Icon: Pill,              color: colors.petrol },
  { type: 'allergy',         Icon: AlertTriangle,     color: colors.danger },
  { type: 'consultation',    Icon: Stethoscope,       color: colors.petrol },
  { type: 'surgery',         Icon: Scissors,          color: colors.danger },
  { type: 'symptom',         Icon: Thermometer,       color: colors.warning },
  { type: 'exam',            Icon: FileText,          color: colors.petrol },
  { type: 'weight',          Icon: Scale,             color: colors.petrol },
  { type: 'clinical_metric', Icon: Activity,          color: colors.success },
  { type: 'food',            Icon: UtensilsCrossed,   color: colors.success },
  { type: 'plan',            Icon: CreditCard,        color: colors.petrol },
  { type: 'mood',            Icon: SmilePlus,         color: colors.click },
  { type: 'moment',          Icon: Sparkles,          color: colors.purple },
  { type: 'connection',      Icon: Heart,             color: colors.rose },
  { type: 'travel',          Icon: MapPin,            color: colors.sky },
  { type: 'expense',         Icon: DollarSign,        color: colors.warning },
  { type: 'boarding',        Icon: Home,              color: colors.petrol },
  { type: 'dog_walker',      Icon: PersonStanding,    color: colors.click },
  { type: 'grooming',        Icon: Scissors,          color: colors.petrol },
  { type: 'photo_analysis',  Icon: Camera,            color: colors.purple },
];

type TabId = 'faq' | 'panel';

export default function HelpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('faq');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [pdfModal, setPdfModal] = useState(false);

  const faqItems = [
    { q: t('help.faqItems.q1'), a: t('help.faqItems.a1') },
    { q: t('help.faqItems.q2'), a: t('help.faqItems.a2') },
    { q: t('help.faqItems.q3'), a: t('help.faqItems.a3') },
    { q: t('help.faqItems.q4'), a: t('help.faqItems.a4') },
    { q: t('help.faqItems.q5'), a: t('help.faqItems.a5') },
    { q: t('help.faqItems.q6'), a: t('help.faqItems.a6') },
  ];

  const handleContact = () => {
    Linking.openURL('mailto:abreu@multiversodigital.com.br?subject=AuExpert%20-%20Suporte');
  };

  const handleReportBug = () => {
    Linking.openURL('mailto:abreu@multiversodigital.com.br?subject=AuExpert%20-%20Problema');
  };

  const renderLensItem = ({ item }: { item: LensItem }) => {
    const { Icon, color, type } = item;
    return (
      <View style={styles.lensRow}>
        <View style={[styles.lensIconWrap, { backgroundColor: color + '15' }]}>
          <Icon size={rs(20)} color={color} strokeWidth={1.8} />
        </View>
        <View style={styles.lensText}>
          <Text style={styles.lensName}>{t(`help.lens.${type}`)}</Text>
          <Text style={styles.lensDesc}>{t(`help.lensDesc.${type}`)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setPdfModal(true)}
          activeOpacity={0.7}
        >
          <FileText size={rs(20)} color={colors.click} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'faq' && styles.tabActive]}
          onPress={() => setActiveTab('faq')}
          activeOpacity={0.7}
        >
          <HelpCircle
            size={rs(16)}
            color={activeTab === 'faq' ? colors.click : colors.textDim}
            strokeWidth={1.8}
          />
          <Text style={[styles.tabLabel, activeTab === 'faq' && styles.tabLabelActive]}>
            {t('help.tabFaq')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'panel' && styles.tabActive]}
          onPress={() => setActiveTab('panel')}
          activeOpacity={0.7}
        >
          <Sparkles
            size={rs(16)}
            color={activeTab === 'panel' ? colors.click : colors.textDim}
            strokeWidth={1.8}
          />
          <Text style={[styles.tabLabel, activeTab === 'panel' && styles.tabLabelActive]}>
            {t('help.tabPanel')}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'faq' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Acoes rapidas */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard} onPress={handleContact} activeOpacity={0.7}>
              <MessageCircle size={rs(24)} color={colors.click} strokeWidth={1.8} />
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
                <HelpCircle size={rs(18)} color={colors.click} strokeWidth={1.8} />
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
      ) : (
        <FlatList
          data={LENSES}
          keyExtractor={(item) => item.type}
          renderItem={renderLensItem}
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.panelHeader}>
              <Text style={styles.sectionLabel}>{t('help.panelTitle').toUpperCase()}</Text>
              <Text style={styles.panelDesc}>{t('help.panelDesc')}</Text>
            </View>
          }
          ListFooterComponent={<View style={styles.bottomSpacer} />}
          ItemSeparatorComponent={() => <View style={styles.lensSeparator} />}
        />
      )}
      <PdfActionModal
        visible={pdfModal}
        onClose={() => setPdfModal(false)}
        title={t('help.pdfTitle', { defaultValue: 'Ajuda e Suporte' })}
        subtitle={t('help.pdfSubtitle', { defaultValue: 'Manual do app + 20 lentes da IA' })}
        onPreview={() => previewHelpPdf()}
        onShare={() => shareHelpPdf()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    paddingVertical: rs(8),
    gap: rs(12),
  },
  backBtn: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(radii.lg),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: rs(20),
    marginTop: rs(spacing.sm),
    marginBottom: rs(spacing.xs),
    backgroundColor: colors.card,
    borderRadius: rs(radii.xl),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(4),
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    paddingVertical: rs(9),
    borderRadius: rs(radii.lg),
  },
  tabActive: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.textDim,
  },
  tabLabelActive: {
    color: colors.click,
  },

  // FAQ tab
  content: { paddingHorizontal: rs(20) },
  actionsRow: {
    flexDirection: 'row',
    gap: rs(spacing.sm),
    marginTop: rs(spacing.md),
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.xxl),
    padding: rs(spacing.md),
    gap: rs(spacing.sm),
  },
  actionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: colors.text,
  },
  actionDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
  },
  sectionLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(11),
    color: colors.textGhost,
    letterSpacing: 2,
    marginTop: rs(spacing.xl),
    marginBottom: rs(spacing.md),
  },
  faqItem: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.xl),
    padding: rs(spacing.md),
    marginBottom: rs(spacing.sm),
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.sm),
  },
  faqQuestion: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
    flex: 1,
  },
  faqAnswer: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: rs(22),
    marginTop: rs(spacing.sm),
    paddingLeft: rs(26),
  },

  // Panel tab
  panelContent: { paddingHorizontal: rs(20) },
  panelHeader: {},
  panelDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    lineHeight: rs(20),
    marginBottom: rs(spacing.md),
  },
  lensRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(spacing.md),
    paddingVertical: rs(spacing.sm),
  },
  lensIconWrap: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(radii.lg),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lensText: { flex: 1 },
  lensName: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(13),
    color: colors.text,
    marginBottom: rs(2),
  },
  lensDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: rs(18),
  },
  lensSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: rs(2),
  },

  bottomSpacer: { height: rs(40) },
});
