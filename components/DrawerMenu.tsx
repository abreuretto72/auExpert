import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Settings,
  Users,
  Shield,
  FileText,
  HelpCircle,
  Cloud,
  Trash2,
  LogOut,
  User,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs, fs } from '../hooks/useResponsive';
import { useAuthStore } from '../stores/authStore';
import { useToast } from './Toast';
import { getErrorMessage } from '../utils/errorMessages';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.84;
const ANIM_DURATION = 300;

interface DrawerMenuProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  badge?: string;
  route?: string;
}

const DrawerMenu: React.FC<DrawerMenuProps> = ({
  visible,
  onClose,
  userName = 'Tutor',
  userEmail = '',
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const logout = useAuthStore((s) => s.logout);

  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleLogout = async () => {
    onClose();
    const yes = await confirm({
      text: t('settings.logoutConfirm'),
      type: 'warning',
      yesLabel: t('menu.logoutLabel'),
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

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route as never);
  };

  const menuItems: MenuItem[] = [
    {
      icon: <Settings size={rs(20)} color={colors.accent} strokeWidth={1.8} />,
      label: t('menu.preferences'),
      sublabel: t('menu.preferencesDesc'),
      route: '/settings',
    },
    {
      icon: <Users size={rs(20)} color={colors.accent} strokeWidth={1.8} />,
      label: t('menu.assistants'),
      sublabel: t('menu.assistantsDesc'),
      badge: t('menu.comingSoon'),
    },
    {
      icon: <Shield size={rs(20)} color={colors.accent} strokeWidth={1.8} />,
      label: t('menu.privacy'),
      sublabel: t('menu.privacyDesc'),
      route: '/privacy',
    },
    {
      icon: <FileText size={rs(20)} color={colors.accent} strokeWidth={1.8} />,
      label: t('menu.terms'),
      sublabel: t('menu.termsDesc'),
      route: '/terms',
    },
    {
      icon: <HelpCircle size={rs(20)} color={colors.accent} strokeWidth={1.8} />,
      label: t('menu.helpSupport'),
      sublabel: t('menu.helpSupportDesc'),
      route: '/help',
    },
    {
      icon: <Cloud size={rs(20)} color={colors.accent} strokeWidth={1.8} />,
      label: t('menu.backup'),
      sublabel: t('menu.backupDesc'),
      badge: t('menu.auto'),
    },
  ];

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[styles.overlay, { opacity: overlayAnim }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          { transform: [{ translateX: slideAnim }] },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Close */}
          <View style={styles.topBar}>
            <View />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={rs(22)} color={colors.accent} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {/* Profile */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                style={StyleSheet.absoluteFill}
              />
              <User size={rs(26)} color="#fff" strokeWidth={1.8} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Menu Items */}
          <View style={styles.menuList}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.menuItem}
                onPress={item.route ? () => handleNavigate(item.route!) : undefined}
                activeOpacity={0.7}
              >
                <View style={styles.menuIconBox}>{item.icon}</View>
                <View style={styles.menuTextCol}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSublabel}>{item.sublabel}</Text>
                </View>
                {item.badge ? (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{item.badge}</Text>
                  </View>
                ) : (
                  <ChevronRight size={rs(16)} color={colors.textGhost} strokeWidth={1.8} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Danger Zone */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => handleNavigate('/settings')}
          >
            <View style={[styles.menuIconBox, styles.dangerIconBox]}>
              <Trash2 size={rs(20)} color={colors.danger} strokeWidth={1.8} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuLabel, { color: colors.danger }]}>
                {t('menu.dangerZone')}
              </Text>
              <Text style={styles.menuSublabel}>{t('menu.dangerZoneDesc')}</Text>
            </View>
            <ChevronRight size={rs(16)} color={colors.danger + '50'} strokeWidth={1.8} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Logout */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleLogout}
          >
            <View style={styles.menuIconBox}>
              <LogOut size={rs(20)} color={colors.accent} strokeWidth={1.8} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={styles.menuLabel}>{t('menu.logoutLabel')}</Text>
              <Text style={styles.menuSublabel}>{t('menu.logoutDesc')}</Text>
            </View>
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>PetauLife+ v1.0.0-beta</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.bgCard,
    borderTopRightRadius: rs(28),
    borderBottomRightRadius: rs(28),
    shadowColor: '#000',
    shadowOffset: { width: rs(8), height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: rs(30),
    elevation: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: rs(52),
    paddingBottom: rs(32),
    paddingHorizontal: rs(20),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  closeBtn: {
    width: rs(40),
    height: rs(40),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.card,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(4) },
    shadowOpacity: 0.3,
    shadowRadius: rs(12),
    elevation: 6,
  },
  profileInfo: {
    marginLeft: rs(14),
    flex: 1,
  },
  profileName: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  profileEmail: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textDim,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: rs(12),
  },
  menuList: {
    gap: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(10),
    gap: rs(12),
  },
  menuIconBox: {
    width: rs(42),
    height: rs(42),
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerIconBox: {
    backgroundColor: colors.dangerSoft,
  },
  menuTextCol: {
    flex: 1,
  },
  menuLabel: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.text,
  },
  menuSublabel: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(11),
    color: colors.textDim,
    marginTop: 1,
  },
  menuBadge: {
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent + '20',
    borderRadius: rs(6),
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
  },
  menuBadgeText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(9),
    color: colors.accent,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  versionText: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: fs(10),
    color: colors.textGhost,
  },
});

export default DrawerMenu;
