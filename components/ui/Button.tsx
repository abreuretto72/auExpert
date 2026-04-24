import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { rs, fs } from '../../hooks/useResponsive';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
}) => {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';

  const content = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.textSec : '#fff'} size="small" />
      ) : (
        <>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text
            style={[
              styles.label,
              isSecondary && { color: colors.textSec },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </View>
  );

  if (isPrimary || isDanger) {
    const gradientColors = isDanger
      ? [colors.danger, '#C0392B'] as const
      : [colors.click, colors.clickDark] as const;

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.base, disabled && styles.disabled]}
      >
        <LinearGradient
          colors={gradientColors}
          style={[styles.base, styles.gradient]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.base, styles.secondary, disabled && styles.disabled]}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.xl,
    height: rs(52),
    overflow: 'hidden',
  },
  gradient: {
    shadowColor: colors.click,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 6,
  },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconWrap: {
    marginRight: spacing.sm,
  },
  label: {
    fontFamily: 'Sora_700Bold',
    fontSize: fs(15),
    color: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});
