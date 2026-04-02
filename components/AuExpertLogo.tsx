import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { rs } from '../hooks/useResponsive';

type LogoSize = 'large' | 'normal' | 'small';

interface AuExpertLogoProps {
  size?: LogoSize;
  showIcon?: boolean;
}

// Aspect ratio real: 512 x 127 ≈ 4.03:1
const LOGO_RATIO = 512 / 127;

const dimensions: Record<LogoSize, { width: number; height: number }> = {
  large: { width: rs(260), height: rs(Math.round(260 / LOGO_RATIO)) },  // ~64
  normal: { width: rs(180), height: rs(Math.round(180 / LOGO_RATIO)) }, // ~45
  small: { width: rs(130), height: rs(Math.round(130 / LOGO_RATIO)) },  // ~32
};

const AuExpertLogo: React.FC<AuExpertLogoProps> = ({ size = 'normal' }) => {
  const { width, height } = dimensions[size];

  return (
    <Image
      source={require('../assets/images/logotipotrans.png')}
      style={[styles.image, { width, height }]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    alignSelf: 'center',
  },
});

export default AuExpertLogo;
