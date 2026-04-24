import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, Pressable, TouchableOpacity } from 'react-native';
import {
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  HelpCircle,
} from 'lucide-react-native';
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

// ─── Icon + cor por tipo (Elite palette) ──────────────────────────────────
// Substitui as patinhas cartoon do branding antigo. Cada tipo usa um ícone
// Lucide sobre um círculo da cor semântica com 15% de opacidade — padrão
// de design Elite, consistente com as sem outras superfícies do app.

type IconComp = React.ComponentType<{ size: number; color: string; strokeWidth: number }>;

function iconAndColor(type: ToastType): { Icon: IconComp; color: string } {
  switch (type) {
    case 'success': return { Icon: CheckCircle2,  color: colors.success };
    case 'error':   return { Icon: AlertCircle,   color: colors.danger  };
    case 'warning': return { Icon: AlertTriangle, color: colors.warning };
    case 'info':    return { Icon: Info,          color: colors.click   };
  }
}

// ─── Balão de mensagem simples ────────────────────────────────────────────

function ToastItem({ message, onDone }: { message: ToastMessage; onDone: () => void }) {
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

  const { Icon, color } = iconAndColor(message.type);

  return (
    <Animated.View style={[styles.bubble, { opacity, transform: [{ scale }] }]}>
      <TouchableOpacity onPress={onDone} style={styles.closeBtn} activeOpacity={0.7}>
        <View style={styles.closeBtnCircle}>
          <X size={rs(14)} color={colors.textSec} strokeWidth={2} />
        </View>
      </TouchableOpacity>

      <View style={[styles.iconCircle, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Icon size={rs(32)} color={color} strokeWidth={1.8} />
      </View>

      <Text style={styles.bubbleText}>{message.text}</Text>
    </Animated.View>
  );
}

// ─── Balão de confirmação (sim / não) ─────────────────────────────────────

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

  // Confirm usa HelpCircle em ametista por default — cor que indica "pergunta"
  // sem ser alarmante. Se o caller passa type='warning', respeita.
  const { Icon, color } =
    message.type === 'info' || message.type === undefined
      ? { Icon: HelpCircle, color: colors.click }
      : iconAndColor(message.type);

  return (
    <Animated.View style={[styles.bubble, { opacity, transform: [{ scale }] }]}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20', borderColor: color + '40' }]}>
        <Icon size={rs(32)} color={color} strokeWidth={1.8} />
      </View>

      <Text style={styles.bubbleText}>{message.text}</Text>

      <View style={styles.confirmRow}>
        {/* Não */}
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
    </Animated.View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────

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
            {messages.map((msg) => (
              <ToastItem
                key={msg.id}
                message={msg}
                onDone={() => removeMessage(msg.id)}
              />
            ))}

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
    // Backdrop em ametista-muito-escuro, mantém a coerência Elite em vez do
    // preto azulado antigo. Ainda assim bem transparente pra ver contexto.
    backgroundColor: 'rgba(13, 14, 22, 0.72)',
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
    maxWidth: rs(320),
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
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ícone circular com a cor semântica suave (padrão Elite)
  iconCircle: {
    width: rs(64),
    height: rs(64),
    borderRadius: rs(32),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(spacing.md),
  },

  bubbleText: {
    fontFamily: 'Sora_500Medium',
    fontSize: fs(15),
    color: colors.text,
    textAlign: 'center',
    lineHeight: fs(23),
    paddingHorizontal: rs(spacing.sm),
  },

  // Confirmação
  confirmRow: {
    flexDirection: 'row',
    gap: rs(spacing.sm),
    marginTop: rs(spacing.lg),
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
    backgroundColor: colors.click,
    borderRadius: rs(radii.lg),
    paddingVertical: rs(12),
  },
  confirmBtnYesText: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(14),
    color: '#FFFFFF',
  },
});
