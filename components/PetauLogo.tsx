import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient' ;
import { colors } from '../constants/colors';
import PawIcon from './PawIcon';
import { rs, fs } from '../hooks/useResponsive';

type LogoSize = 'large' | 'normal' | 'small';

interface PetauLogoProps {
  size?: LogoSize;
  showIcon?: boolean;
}

const multipliers: Record<LogoSize, number> = {
  large: 1.35,
  normal: 1.0,
  small: 0.7,
};

const PetauLogo: React.FC<PetauLogoProps> = ({ size = 'normal', showIcon = true }) => {
  const s = multipliers[size];

  const iconSize = rs(50 * s);
  const iconRadius = rs(16 * s);
  const pawSize = rs(28 * s);
  const fontSizeValue = fs(26 * s);
  const gapValue = rs(12 * s);

  return (
    <View style={[styles.container, { gap: gapValue }]}>
      {showIcon && (
        <View
          style={[
            styles.iconWrapper,
            {
              width: iconSize,
              height: iconSize,
              borderRadius: iconRadius,
            },
          ]}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentDark]}
            style={[StyleSheet.absoluteFill, { borderRadius: iconRadius }]}
          />
          <View style={{ position: 'absolute', zIndex: 1 }}>
            <PawIcon size={pawSize} color="#fff" />
          </View>
        </View>
      )}

      <Text style={[styles.text, { fontSize: fontSizeValue }]}>
        <Text style={{ color: colors.text }}>Pet</Text>
        <Text style={{ color: colors.petrol }}>au</Text>
        <Text style={{ color: colors.text }}>Life</Text>
        <Text style={{ color: colors.accent }}>+</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: rs(6) },
    shadowOpacity: 0.3,
    shadowRadius: rs(24),
    elevation: 8,
  },
  text: {
    fontFamily: 'Sora_700Bold',
    letterSpacing: rs(-0.8),
  },
});

export default PetauLogo;
