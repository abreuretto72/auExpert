import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Bell,
  Fingerprint,
  Info,
  Trash2,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { useAuthStore } from '../../stores/authStore';
import { useToast } from '../../components/Toast';
import { getErrorMessage } from '../../utils/errorMessages';

type ConfirmOptions = {
  text: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  yesLabel?: string;
  noLabel?: string;
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast, confirm } = useToast();
  const logout = useAuthStore((s) => s.logout);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  const handleLogout = async () => {
    const yes = await confirm({
      text: t('settings.logoutConfirm'),
      type: 'warning',
      yesLabel: t('settings.logout'),
      noLabel: t('common.cancel'),
    });
    if (!yes) return;

    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (err) {
      toast(getErrorMessage(err), 'error');
    }
  };

  const handleDeleteAccount = async () => {
    const yes = await confirm({
      text: t('settings.deleteConfirm'),
      type: 'error',
      yesLabel: t('settings.deleteAccount'),
      noLabel: t('common.cancel'),
    });
    if (!yes) return;
    // TODO: implementar exclusao de conta
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notificações */}
        <Text style={styles.sectionLabel}>{t('settings.notifications').toUpperCase()}</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Bell size={20} color={colors.accent} strokeWidth={1.8} />
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>{t('settings.notifications')}</Text>
                <Text style={styles.toggleDesc}>{t('settings.notificationsDesc')}</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.border, true: colors.accent + '50' }}
              thumbColor={notificationsEnabled ? colors.accent : colors.textDim}
            />
          </View>
        </View>

        {/* Biometria */}
        <Text style={styles.sectionLabel}>{t('settings.biometric').toUpperCase()}</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Fingerprint size={20} color={colors.accent} strokeWidth={1.8} />
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleLabel}>{t('settings.biometric')}</Text>
                <Text style={styles.toggleDesc}>{t('settings.biometricDesc')}</Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
              trackColor={{ false: colors.border, true: colors.accent + '50' }}
              thumbColor={biometricEnabled ? colors.accent : colors.textDim}
            />
          </View>
        </View>

        {/* Sobre */}
        <Text style={styles.sectionLabel}>{t('settings.about').toUpperCase()}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Info size={18} color={colors.petrol} strokeWidth={1.8} />
            <Text style={styles.infoLabel}>{t('settings.version')}</Text>
            <Text style={styles.infoValue}>1.0.0-beta</Text>
          </View>
        </View>

        {/* Zona de perigo */}
        <Text style={[styles.sectionLabel, { color: colors.danger }]}>
          {t('settings.dangerZone').toUpperCase()}
        </Text>
        <View style={[styles.card, styles.dangerCard]}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount} activeOpacity={0.7}>
            <Trash2 size={20} color={colors.danger} strokeWidth={1.8} />
            <View style={styles.toggleTextCol}>
              <Text style={[styles.toggleLabel, { color: colors.danger }]}>{t('settings.deleteAccount')}</Text>
              <Text style={styles.toggleDesc}>{t('settings.deleteAccountDesc')}</Text>
            </View>
          </TouchableOpacity>
        </View>

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
  sectionLabel: { fontFamily: 'Sora_700Bold', fontSize: 11, color: colors.textGhost, letterSpacing: 2, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, padding: spacing.md, marginBottom: spacing.sm },
  dangerCard: { borderColor: colors.danger + '30' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  toggleTextCol: { flex: 1 },
  toggleLabel: { fontFamily: 'Sora_600SemiBold', fontSize: 14, color: colors.text },
  toggleDesc: { fontFamily: 'Sora_400Regular', fontSize: 11, color: colors.textDim, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoLabel: { fontFamily: 'Sora_500Medium', fontSize: 14, color: colors.textSec, flex: 1 },
  infoValue: { fontFamily: 'JetBrainsMono_500Medium', fontSize: 13, color: colors.textDim },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bottomSpacer: { height: 40 },
});
