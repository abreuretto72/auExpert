import React from 'react';
import Svg, { Ellipse, Circle } from 'react-native-svg';

interface PawIconProps {
  size?: number;
  color?: string;
}

const PawIcon: React.FC<PawIconProps> = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Ellipse cx="12" cy="17" rx="4.5" ry="4" fill={color} />
    <Circle cx="7" cy="10.5" r="2.2" fill={color} />
    <Circle cx="17" cy="10.5" r="2.2" fill={color} />
    <Circle cx="9.5" cy="6.5" r="1.8" fill={color} />
    <Circle cx="14.5" cy="6.5" r="1.8" fill={color} />
  </Svg>
);

export default PawIcon;
