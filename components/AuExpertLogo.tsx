import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { rs } from '../hooks/useResponsive';

type LogoSize = 'large' | 'normal' | 'small';

interface AuExpertLogoProps {
  size?: LogoSize;
  showIcon?: boolean;
}

const dimensions: Record<LogoSize, { width: number; height: number }> = {
  large: { width: rs(260), height: rs(80) },
  normal: { width: rs(180), height: rs(55) },
  small: { width: rs(130), height: rs(40) },
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
