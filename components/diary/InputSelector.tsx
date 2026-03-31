import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Camera,
  Ear,
  FileText,
  HelpCircle,
  ImageIcon,
  Mic,
  ScanLine,
  Type,
  Video,
  X,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { rs, fs } from '../../hooks/useResponsive';
import { useToast } from '../Toast';

// ══════════════════════════════════════
// TYPES
// ══════════════════════════════════════

interface InputSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectPhoto: () => void;
  onSelectVoice: () => void;
  onSelectText: () => void;
  onSelectGallery: () => void;
  onSelectScanner: () => void;
  onSelectDocument: () => void;
  onSelectVideo: () => void;
  onSelectListen: () => void;
  petName: string;
}

interface EntryMethod {
  key: string;
  icon: React.ElementType;
  labelKey: string;
  subKey: string;
  gradient: readonly [string, string];
  large: boolean;
  phase1: boolean;
  onPress?: () => void;
}

// ══════════════════════════════════════
// HELP CONTENT (static — no callbacks)
// ══════════════════════════════════════

const HELP_ITEMS = [
  { key: 'voice',    icon: Mic,       labelKey: 'diary.inputVoice',    helpKey: 'diary.helpVoice',    gradient: ['#E8813A', '#CC6E2E'] as const },
  { key: 'photo',    icon: Camera,    labelKey: 'diary.inputPhoto',    helpKey: 'diary.helpPhoto',    gradient: ['#1B8EAD', '#15748F'] as const },
  { key: 'scanner',  icon: ScanLine,  labelKey: 'diary.inputScanner',  helpKey: 'diary.helpScanner',  gradient: ['#2ECC71', '#27AE60'] as const },
  { key: 'document', icon: FileText,  labelKey: 'diary.inputDocument', helpKey: 'diary.helpDocument', gradient: ['#F39C12', '#D68910'] as const },
  { key: 'video',    icon: Video,     labelKey: 'diary.inputVideo',    helpKey: 'diary.helpVideo',    gradient: ['#E74C3C', '#C0392B'] as const },
  { key: 'gallery',  icon: ImageIcon, labelKey: 'diary.inputGallery',  helpKey: 'diary.helpGallery',  gradient: ['#9B59B6', '#7D3C98'] as const },
  { key: 'listen',   icon: Ear,       labelKey: 'diary.inputListen',   helpKey: 'diary.helpListen',   gradient: ['#E84393', '#C0396B'] as const },
  { key: 'text',     icon: Type,      labelKey: 'diary.inputText',     helpKey: 'diary.helpText',     gradient: ['#3498DB', '#1F77BD'] as const },
] as const;

// ══════════════════════════════════════
// AI TIP ROTATION
// ══════════════════════════════════════

const AI_TIP_KEYS = [
  'diary.aiTip1',
  'diary.aiTip2',
  'diary.aiTip3',
  'diary.aiTip4',
  'diary.aiTip5',
] as const;

const TIP_INTERVAL_MS = 5000;

function useRotatingTip(petName: string): string {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % AI_TIP_KEYS.length);
    }, TIP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return t(AI_TIP_KEYS[index], { name: petName });
}

// ══════════════════════════════════════
// GRID BUTTON
// ══════════════════════════════════════

const GridButton = React.memo(function GridButton({
  method,
  onPress,
}: {
  method: EntryMethod;
  onPress: () => void;
}) {
  const Icon = method.icon;
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[styles.gridBtn, method.large && styles.gridBtnLarge]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      <LinearGradient
        colors={method.gradient as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gridBtnGradient,
          method.large && styles.gridBtnGradientLarge,
        ]}
      >
        <Icon
          size={method.large ? rs(28) : rs(22)}
          color="#FFFFFF"
          strokeWidth={1.8}
        />
        <Text
          style={[styles.gridBtnLabel, method.large && styles.gridBtnLabelLarge]}
          numberOfLines={1}
        >
          {t(method.labelKey)}
        </Text>
        <Text
          style={[styles.gridBtnSub, method.large && styles.gridBtnSubLarge]}
          numberOfLines={1}
        >
          {t(method.subKey)}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
});

// ══════════════════════════════════════
// HELP MODAL
// ══════════════════════════════════════

function HelpModal({
  visible,
  onClose,
  petName,
}: {
  visible: boolean;
  onClose: () => void;
  petName: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.helpSheet}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>{t('diary.helpModalTitle')}</Text>
              <Text style={styles.headerSub}>
                {t('diary.helpModalSub', { name: petName })}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <X size={rs(20)} color={colors.accent} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Panel note */}
          <View style={styles.helpPanelNote}>
            <Text style={styles.helpPanelNoteText}>{t('diary.helpPanelNote')}</Text>
          </View>

          {/* Modes list */}
          <ScrollView
            style={styles.helpScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.helpScrollContent,
              { paddingBottom: rs(24) + insets.bottom },
            ]}
          >
            {HELP_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.key} style={styles.helpRow}>
                  <LinearGradient
                    colors={item.gradient as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.helpIconBox}
                  >
                    <Icon size={rs(20)} color="#FFFFFF" strokeWidth={1.8} />
                  </LinearGradient>
                  <View style={styles.helpRowText}>
                    <Text style={styles.helpRowLabel}>{t(item.labelKey)}</Text>
                    <Text style={styles.helpRowDesc}>{t(item.helpKey)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ══════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════

export default function InputSelector({
  visible,
  onClose,
  onSelectPhoto,
  onSelectVoice,
  onSelectText,
  onSelectGallery,
  onSelectScanner,
  onSelectDocument,
  onSelectVideo,
  onSelectListen,
  petName,
}: InputSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const tip = useRotatingTip(petName);
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        damping: 18,
        stiffness: 140,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible, slideAnim]);

  const handleComingSoon = useCallback(() => {
    toast(t('diary.comingSoon'), 'info');
  }, [toast, t]);

  // Order: voice (large), photo (large), scanner, document, video, gallery, listen, text
  const methods: readonly EntryMethod[] = [
    {
      key: 'voice',
      icon: Mic,
      labelKey: 'diary.inputVoice',
      subKey: 'diary.inputVoiceSub',
      gradient: [colors.accent, colors.accentDark] as const,
      large: true,
      phase1: true,
      onPress: onSelectVoice,
    },
    {
      key: 'photo',
      icon: Camera,
      labelKey: 'diary.inputPhoto',
      subKey: 'diary.inputPhotoSub',
      gradient: [colors.petrol, colors.petrolDark] as const,
      large: true,
      phase1: true,
      onPress: onSelectPhoto,
    },
    {
      key: 'scanner',
      icon: ScanLine,
      labelKey: 'diary.inputScanner',
      subKey: 'diary.inputScannerSub',
      gradient: [colors.success, '#27AE60'] as const,
      large: false,
      phase1: true,
      onPress: onSelectScanner,
    },
    {
      key: 'document',
      icon: FileText,
      labelKey: 'diary.inputDocument',
      subKey: 'diary.inputDocumentSub',
      gradient: [colors.gold, '#D68910'] as const,
      large: false,
      phase1: true,
      onPress: onSelectDocument,
    },
    {
      key: 'video',
      icon: Video,
      labelKey: 'diary.inputVideo',
      subKey: 'diary.inputVideoSub',
      gradient: [colors.danger, '#C0392B'] as const,
      large: false,
      phase1: true,
      onPress: onSelectVideo,
    },
    {
      key: 'gallery',
      icon: ImageIcon,
      labelKey: 'diary.inputGallery',
      subKey: 'diary.inputGallerySub',
      gradient: [colors.purple, '#7D3C98'] as const,
      large: false,
      phase1: true,
      onPress: onSelectGallery,
    },
    {
      key: 'listen',
      icon: Ear,
      labelKey: 'diary.inputListen',
      subKey: 'diary.inputListenSub',
      gradient: ['#E84393', '#C0396B'] as const,
      large: false,
      phase1: true,
      onPress: onSelectListen,
    },
    {
      key: 'text',
      icon: Type,
      labelKey: 'diary.inputText',
      subKey: 'diary.inputTextSub',
      gradient: ['#3498DB', '#1F77BD'] as const,
      large: false,
      phase1: true,
      onPress: onSelectText,
    },
  ];

  const handlePress = useCallback(
    (method: EntryMethod) => {
      if (method.phase1 && method.onPress) {
        method.onPress();
      } else {
        handleComingSoon();
      }
    },
    [handleComingSoon],
  );

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
            <Pressable>
              {/* Handle bar */}
              <View style={styles.handleRow}>
                <View style={styles.handle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.headerTitle}>
                    {t('diary.inputSelectorTitle', { name: petName })}
                  </Text>
                  <Text style={styles.headerSub}>{t('diary.inputSelectorSub')}</Text>
                </View>
                <View style={styles.headerBtns}>
                  <TouchableOpacity
                    style={styles.helpBtn}
                    onPress={() => setHelpVisible(true)}
                    activeOpacity={0.7}
                  >
                    <HelpCircle size={rs(20)} color={colors.accent} strokeWidth={1.8} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <X size={rs(20)} color={colors.accent} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Grid 2×4 */}
              <View style={styles.grid}>
                <View style={styles.row}>
                  <GridButton method={methods[0]} onPress={() => handlePress(methods[0])} />
                  <GridButton method={methods[1]} onPress={() => handlePress(methods[1])} />
                </View>
                <View style={styles.row}>
                  <GridButton method={methods[2]} onPress={() => handlePress(methods[2])} />
                  <GridButton method={methods[3]} onPress={() => handlePress(methods[3])} />
                </View>
                <View style={styles.row}>
                  <GridButton method={methods[4]} onPress={() => handlePress(methods[4])} />
                  <GridButton method={methods[5]} onPress={() => handlePress(methods[5])} />
                </View>
                <View style={styles.row}>
                  <GridButton method={methods[6]} onPress={() => handlePress(methods[6])} />
                  <GridButton method={methods[7]} onPress={() => handlePress(methods[7])} />
                </View>
              </View>

              {/* AI Tip */}
              <View
                style={[
                  styles.tipContainer,
                  { marginBottom: rs(16) + insets.bottom },
                ]}
              >
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      <HelpModal
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
        petName={petName}
      />
    </>
  );
}

// ══════════════════════════════════════
// STYLES
// ══════════════════════════════════════

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 25, 0.6)',
    justifyContent: 'flex-end',
  },

  // Main sheet
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(26),
    borderTopRightRadius: rs(26),
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: rs(10),
    paddingBottom: rs(6),
  },
  handle: {
    width: rs(40),
    height: rs(5),
    borderRadius: rs(3),
    backgroundColor: colors.textGhost,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(20),
    paddingTop: rs(8),
    paddingBottom: rs(16),
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(18),
    color: colors.text,
  },
  headerSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(13),
    color: colors.textSec,
    marginTop: rs(2),
  },
  headerBtns: {
    flexDirection: 'row',
    gap: rs(8),
  },
  helpBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: colors.accentGlow,
    borderWidth: 1,
    borderColor: colors.accent + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grid
  grid: {
    paddingHorizontal: rs(16),
    gap: rs(10),
  },
  row: {
    flexDirection: 'row',
    gap: rs(10),
  },
  gridBtn: {
    flex: 1,
    borderRadius: rs(14),
    overflow: 'hidden',
  },
  gridBtnLarge: {},
  gridBtnGradient: {
    paddingVertical: rs(14),
    paddingHorizontal: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(4),
    borderRadius: rs(14),
  },
  gridBtnGradientLarge: {
    paddingVertical: rs(22),
  },
  gridBtnLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: '#FFFFFF',
    marginTop: rs(4),
  },
  gridBtnLabelLarge: {
    fontSize: fs(15),
  },
  gridBtnSub: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(10),
    color: 'rgba(255, 255, 255, 0.75)',
  },
  gridBtnSubLarge: {
    fontSize: fs(11),
  },

  // AI Tip
  tipContainer: {
    marginTop: rs(16),
    marginHorizontal: rs(20),
    paddingVertical: rs(10),
    paddingHorizontal: rs(16),
    backgroundColor: colors.purpleSoft,
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: colors.purple + '20',
    alignItems: 'center',
  },
  tipText: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(15),
    color: colors.purple,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: fs(22),
  },

  // Help sheet
  helpSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: rs(26),
    borderTopRightRadius: rs(26),
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
    maxHeight: '85%',
  },
  helpPanelNote: {
    marginHorizontal: rs(20),
    marginBottom: rs(12),
    paddingVertical: rs(10),
    paddingHorizontal: rs(14),
    backgroundColor: colors.accentGlow,
    borderRadius: rs(12),
    borderWidth: 1,
    borderColor: colors.accent + '25',
  },
  helpPanelNoteText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(12),
    color: colors.accentLight,
    textAlign: 'center',
    lineHeight: fs(18),
  },
  helpScroll: {
    flexGrow: 0,
  },
  helpScrollContent: {
    paddingHorizontal: rs(20),
    gap: rs(12),
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: rs(14),
  },
  helpIconBox: {
    width: rs(44),
    height: rs(44),
    borderRadius: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  helpRowText: {
    flex: 1,
    paddingTop: rs(2),
  },
  helpRowLabel: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(13),
    color: colors.text,
    marginBottom: rs(3),
  },
  helpRowDesc: {
    fontFamily: 'Sora_400Regular',
    fontSize: fs(12),
    color: colors.textSec,
    lineHeight: fs(18),
  },
});
