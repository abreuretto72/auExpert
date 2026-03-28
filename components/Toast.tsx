import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, Pressable, TouchableOpacity, Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs, fs } from '../hooks/useResponsive';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ConfirmMessage {
  id: number;
  text: string;
  type: ToastType;
  onYes: () => void;
  onNo: () => void;
  yesLabel?: string;
  noLabel?: string;
}

interface ToastContextValue {
  toast: (text: string, type?: ToastType) => void;
  confirm: (options: {
    text: string;
    type?: ToastType;
    yesLabel?: string;
    noLabel?: string;
  }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  confirm: () => Promise.resolve(false),
});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_DURATION = 4000;
const ANIM_DURATION = 300;

/* eslint-disable @typescript-eslint/no-var-requires */
const pawImageMap: Record<ToastType, ImageSourcePropType> = {
  success: require('../assets/images/pata_verde.png'),
  error: require('../assets/images/pata_vermelha.png'),
  warning: require('../assets/images/pata_amarela.png'),
  info: require('../assets/images/pata_rosa.png'),
};

// ─── Balao de mensagem simples ───

function ToastItem({ message, onDone }: { message: ToastMessage; onDone: () => void }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: ANIM_DURATION, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start(onDone);
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.bubble, { opacity, transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onDone} style={styles.closeBtn} activeOpacity={0.7}>
        <View style={styles.closeBtnCircle}>
          <X size={rs(14)} color={colors.danger} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>

      <Image source={pawImageMap[message.type]} style={styles.pawImage} />

      <Text style={styles.bubbleText}>{message.text}</Text>
      <Text style={styles.bubbleSignature}>{t('toast.petSignature')}</Text>
    </Animated.View>
  );
}

// ─── Balao de confirmacao (sim / nao) ───

function ConfirmItem({ message, onDone }: { message: ConfirmMessage; onDone: () => void }) {
  const { t } = useTranslation();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ANIM_DURATION, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.8, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      cb();
      onDone();
    });
  };

  return (
    <Animated.View style={[styles.bubble, { opacity, transform: [{ scale }] }]}>
      <Image source={pawImageMap[message.type]} style={styles.pawImage} />

      <Text style={styles.bubbleText}>{message.text}</Text>

      <View style={styles.confirmRow}>
        {/* Nao */}
        <TouchableOpacity
          style={styles.confirmBtnNo}
          onPress={() => dismiss(message.onNo)}
          activeOpacity={0.7}
        >
          <X size={rs(18)} color={colors.textSec} strokeWidth={2} />
          <Text style={styles.confirmBtnNoText}>
            {message.noLabel ?? t('common.cancel')}
          </Text>
        </TouchableOpacity>

        {/* Sim */}
        <TouchableOpacity
          style={styles.confirmBtnYes}
          onPress={() => dismiss(message.onYes)}
          activeOpacity={0.7}
        >
          <Check size={rs(18)} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.confirmBtnYesText}>
            {message.yesLabel ?? t('common.confirm')}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.bubbleSignature}>{t('toast.petSignature')}</Text>
    </Animated.View>
  );
}

// ─── Provider ───

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);
  const [confirmMsg, setConfirmMsg] = useState<ConfirmMessage | null>(null);
  const idRef = useRef(0);

  const toast = useCallback((text: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setMessages((prev) => [...prev, { id, text, type }]);
  }, []);

  const confirm = useCallback((options: {
    text: string;
    type?: ToastType;
    yesLabel?: string;
    noLabel?: string;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = ++idRef.current;
      setConfirmMsg({
        id,
        text: options.text,
        type: options.type ?? 'warning',
        yesLabel: options.yesLabel,
        noLabel: options.noLabel,
        onYes: () => resolve(true),
        onNo: () => resolve(false),
      });
    });
  }, []);

  const removeMessage = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setMessages([]);
  }, []);

  const hasOverlay = messages.length > 0 || confirmMsg !== null;

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      {hasOverlay && (
        <Pressable
          style={styles.overlay}
          onPress={confirmMsg ? undefined : dismissAll}
        >
          <View style={styles.center}>
            {/* Mensagens simples */}
            {messages.map((msg) => (
              <ToastItem
                key={msg.id}
                message={msg}
                onDone={() => removeMessage(msg.id)}
              />
            ))}

            {/* Confirmacao */}
            {confirmMsg && (
              <ConfirmItem
                message={confirmMsg}
                onDone={() => setConfirmMsg(null)}
              />
            )}
          </View>
        </Pressable>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: 'rgba(11, 18, 25, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: rs(spacing.xl),
  },
  center: {
    width: '100%',
    alignItems: 'center',
    gap: rs(spacing.md),
  },
  bubble: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.modal),
    paddingHorizontal: rs(spacing.lg),
    paddingTop: rs(spacing.xl),
    paddingBottom: rs(spacing.lg),
    alignItems: 'center',
    width: '100%',
    maxWidth: rs(300),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: rs(16) },
    shadowOpacity: 0.5,
    shadowRadius: rs(32),
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: rs(10),
    right: rs(10),
    zIndex: 1,
  },
  closeBtnCircle: {
    width: rs(28),
    height: rs(28),
    borderRadius: rs(14),
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawImage: {
    width: rs(56),
    height: rs(56),
    borderRadius: rs(16),
    marginBottom: rs(spacing.md),
  },
  bubbleText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
    lineHeight: fs(24),
    marginBottom: rs(spacing.md),
  },
  bubbleSignature: {
    fontFamily: 'Caveat_400Regular',
    fontSize: fs(16),
    color: colors.textDim,
    fontStyle: 'italic',
  },

  // Confirmacao
  confirmRow: {
    flexDirection: 'row',
    gap: rs(spacing.sm),
    marginBottom: rs(spacing.md),
    width: '100%',
  },
  confirmBtnNo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(12),
  },
  confirmBtnNoText: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: fs(14),
    color: colors.textSec,
  },
  confirmBtnYes: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    backgroundColor: colors.accent,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(12),
  },
  confirmBtnYesText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: '#FFFFFF',
  },
});
