import React, { useState, useCallback, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Eye, EyeOff, Mic } from 'lucide-react-native';
import { getLocales } from 'expo-localization';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

// Speech recognition é opcional (não funciona no Expo Go)
let SpeechModule: typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule | null = null;
let useSpeechEvent: typeof import('expo-speech-recognition').useSpeechRecognitionEvent | null = null;
try {
  const sr = require('expo-speech-recognition');
  SpeechModule = sr.ExpoSpeechRecognitionModule;
  useSpeechEvent = sr.useSpeechRecognitionEvent;
} catch {
  // Módulo nativo indisponível (Expo Go) — mic desabilitado silenciosamente
}

interface InputProps {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  type?: 'text' | 'password' | 'email' | 'numeric';
  showMic?: boolean;
  onMicPress?: () => void;
  multiline?: boolean;
}

export function Input(props: InputProps) {
  const {
    label, placeholder, icon, value, onChangeText,
    error, type = 'text', showMic = true, onMicPress, multiline = false,
  } = props;
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const [listening, setListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isPassword = type === 'password';

  // STT events (no-op se módulo indisponível)
  const noopHook = (_event: string, _cb: (...args: unknown[]) => void) => {};
  const useEvent = useSpeechEvent ?? noopHook;

  useEvent('result', (event: { results: { transcript: string }[] }) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) onChangeText(transcript);
  });

  useEvent('end', () => {
    setListening(false);
    pulseAnim.setValue(1);
  });

  useEvent('error', () => {
    setListening(false);
    pulseAnim.setValue(1);
  });

  const handleMicPress = useCallback(async () => {
    if (onMicPress) {
      onMicPress();
      return;
    }

    if (!SpeechModule) return; // Indisponível no Expo Go

    if (listening) {
      SpeechModule.stop();
      setListening(false);
      pulseAnim.setValue(1);
      return;
    }

    try {
      const { granted } = await SpeechModule.requestPermissionsAsync();
      if (!granted) return;

      setListening(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ).start();

      SpeechModule.start({
        lang: getLocales()[0]?.languageTag ?? 'pt-BR',
        interimResults: false,
        maxAlternatives: 1,
      });
    } catch {
      setListening(false);
      pulseAnim.setValue(1);
    }
  }, [listening, onMicPress, pulseAnim]);

  const parts: React.ReactNode[] = [];

  if (icon) {
    parts.push(<View key="icon" style={styles.iconPrefix}>{icon}</View>);
  }

  parts.push(
    <TextInput
      key="input"
      style={[styles.input, multiline && styles.multiline]}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      secureTextEntry={isPassword && !secureVisible}
      keyboardType={type === 'email' ? 'email-address' : type === 'numeric' ? 'numeric' : 'default'}
      autoCapitalize={type === 'email' ? 'none' : 'sentences'}
      multiline={multiline}
    />,
  );

  if (isPassword) {
    parts.push(
      <TouchableOpacity key="eye" onPress={() => setSecureVisible(!secureVisible)} style={styles.suffix}>
        {secureVisible
          ? <EyeOff size={20} color={colors.textDim} strokeWidth={1.8} />
          : <Eye size={20} color={colors.textDim} strokeWidth={1.8} />}
      </TouchableOpacity>,
    );
  } else if (showMic) {
    parts.push(
      <Animated.View key="mic" style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          onPress={handleMicPress}
          style={[styles.suffix, listening && styles.micActive]}
        >
          <Mic size={20} color={listening ? '#fff' : colors.accent} strokeWidth={1.8} />
        </TouchableOpacity>
      </Animated.View>,
    );
  }

  const wrapperParts: React.ReactNode[] = [];

  if (label) {
    wrapperParts.push(<Text key="label" style={styles.label}>{label}</Text>);
  }

  wrapperParts.push(
    <View key="wrap" style={[styles.inputWrap, focused && styles.inputFocused, error ? styles.inputError : null]}>
      {parts}
    </View>,
  );

  if (error) {
    wrapperParts.push(<Text key="error" style={styles.errorText}>{error}</Text>);
  }

  return <View style={styles.container}>{wrapperParts}</View>;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: 'Sora_600SemiBold',
    fontSize: 12,
    color: colors.textSec,
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.xl,
    height: 56,
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: colors.accent,
  },
  inputError: {
    borderColor: colors.danger,
  },
  iconPrefix: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: 'Sora_400Regular',
    fontSize: 15,
    color: colors.text,
    height: '100%' as unknown as number,
  },
  multiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.sm,
  },
  suffix: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  micActive: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 6,
  },
  errorText: {
    fontFamily: 'Sora_400Regular',
    fontSize: 11,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
