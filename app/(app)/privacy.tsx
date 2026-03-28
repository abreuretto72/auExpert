import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Shield, Camera, Sparkles, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const items = [
    { icon: <Shield size={rs(20)} color={colors.success} strokeWidth={1.8} />, text: t('legal.privacyData'), color: colors.success },
    { icon: <Camera size={rs(20)} color={colors.purple} strokeWidth={1.8} />, text: t('legal.privacyPhotos'), color: colors.purple },
    { icon: <Sparkles size={rs(20)} color={colors.petrol} strokeWidth={1.8} />, text: t('legal.privacyAi'), color: colors.petrol },
    { icon: <Trash2 size={rs(20)} color={colors.danger} strokeWidth={1.8} />, text: t('legal.privacyDelete'), color: colors.danger },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={rs(22)} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('legal.privacyTitle')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{t('legal.privacyIntro')}</Text>

        {items.map((item, i) => (
          <View key={i} style={[styles.card, { borderColor: item.color + '25' }]}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '12' }]}>
              {item.icon}
            </View>
            <Text style={styles.cardText}>{item.text}</Text>
          </View>
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
  intro: { fontFamily: 'Sora_400Regular', fontSize: fs(14), color: colors.textSec, lineHeight: rs(22), marginTop: rs(spacing.md), marginBottom: rs(spacing.lg) },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: rs(spacing.md), backgroundColor: colors.card, borderWidth: 1, borderRadius: rs(radii.xxl), padding: rs(spacing.md), marginBottom: rs(spacing.sm) },
  iconWrap: { width: rs(40), height: rs(40), borderRadius: rs(12), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardText: { fontFamily: 'Sora_400Regular', fontSize: fs(13), color: colors.textSec, lineHeight: rs(22), flex: 1 },
  bottomSpacer: { height: rs(40) },
});
