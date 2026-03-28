import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient' ;
import { colors } from '../constants/colors';
import PawIcon from './PawIcon';

type LogoSize = 'large' | 'normal' | 'small';

interface PetauLogoProps {
  size?: LogoSize;
}

const multipliers: Record<LogoSize, number> = {
  large: 1.35,
  normal: 1.0,
  small: 0.7,
};

const PetauLogo: React.FC<PetauLogoProps> = ({ size = 'normal' }) => {
  const s = multipliers[size];

  const iconSize = Math.round(50 * s);
  const iconRadius = Math.round(16 * s);
  const pawSize = Math.round(28 * s);
  const fontSize = Math.round(26 * s);
  const gap = Math.round(12 * s);

  return (
    <View style={[styles.container, { gap }]}>
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

      <Text style={[styles.text, { fontSize }]}>
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  text: {
    fontFamily: 'Sora_700Bold',
    letterSpacing: -0.8,
  },
});

export default PetauLogo;
