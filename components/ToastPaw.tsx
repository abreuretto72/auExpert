import React from 'react';
import Svg, { Rect, Ellipse, Circle } from 'react-native-svg';

interface ToastPawProps {
  size?: number;
  pawColor: string;
  bgColor: string;
}

/**
 * Patinha estilo logo PetauLife+ com fundo colorido arredondado.
 * Usada exclusivamente nos baloes de toast.
 * - Fundo verde = mensagem boa
 * - Fundo vermelho = mensagem ruim
 * - Fundo amarelo = atencao
 * - Fundo azul = informacao
 */
const ToastPaw: React.FC<ToastPawProps> = ({ size = 56, pawColor, bgColor }) => {
  const s = size / 56; // escala proporcional

  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      {/* Fundo arredondado */}
      <Rect x="0" y="0" width="56" height="56" rx="16" fill={bgColor} />

      {/* Almofada principal - branca */}
      <Ellipse cx="28" cy="33" rx="11" ry="8.5" fill="#FFFFFF" />

      {/* 4 dedos - brancos */}
      <Circle cx="20" cy="24" r="4.5" fill="#FFFFFF" />
      <Circle cx="36" cy="24" r="4.5" fill="#FFFFFF" />
      <Circle cx="24" cy="17" r="3.8" fill="#FFFFFF" />
      <Circle cx="32" cy="17" r="3.8" fill="#FFFFFF" />
    </Svg>
  );
};

export default ToastPaw;
