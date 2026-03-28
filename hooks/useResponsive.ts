import { Dimensions, PixelRatio } from 'react-native';

// ══════════════════════════════════════
// RESPONSIVIDADE — BASE DO DESIGN SYSTEM
// ══════════════════════════════════════
//
// Design base: iPhone 14 (390px largura)
// Tudo é calculado proporcionalmente a essa largura.
// Em telas menores (320px), tudo encolhe. Em maiores (428px+), tudo cresce.
//
// USO:
//   import { wp, hp, fs, rs } from '../hooks/useResponsive';
//   <View style={{ width: wp(90), padding: rs(16), borderRadius: rs(12) }}>
//     <Text style={{ fontSize: fs(16) }}>Texto responsivo</Text>
//   </View>

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base de design: iPhone 14 = 390 x 844
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

// Escala proporcional à largura
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
// Escala proporcional à altura
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

/**
 * wp — Width Percentage
 * Converte percentual da largura em pixels.
 * wp(50) = 50% da largura da tela
 */
export function wp(percentage: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
}

/**
 * hp — Height Percentage
 * Converte percentual da altura em pixels.
 * hp(50) = 50% da altura da tela
 */
export function hp(percentage: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
}

/**
 * rs — Responsive Size
 * Escala um valor de pixel proporcionalmente à largura da tela.
 * rs(16) em 390px = 16, em 320px = ~13, em 428px = ~17.5
 * Usar para: padding, margin, borderRadius, width, height de ícones, etc.
 */
export function rs(size: number): number {
  return PixelRatio.roundToNearestPixel(size * widthScale);
}

/**
 * fs — Font Size
 * Escala tamanho de fonte com limite para não ficar muito grande/pequeno.
 * Respeita configuração de acessibilidade do dispositivo.
 * fs(16) em 390px = 16, em 320px = ~14, em 428px = ~17
 */
export function fs(size: number): number {
  const scaled = size * widthScale;
  // Limitar: nunca menor que 80% nem maior que 120% do original
  const min = size * 0.8;
  const max = size * 1.2;
  return PixelRatio.roundToNearestPixel(Math.max(min, Math.min(max, scaled)));
}

/**
 * rh — Responsive Height (baseado na altura da tela)
 * Para elementos que dependem da altura (modais, headers).
 */
export function rh(size: number): number {
  return PixelRatio.roundToNearestPixel(size * heightScale);
}

/**
 * Constantes úteis exportadas
 */
export const screen = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scale: widthScale,
  isSmall: SCREEN_WIDTH < 360,    // SE, iPod, Android compacto
  isMedium: SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 414,  // iPhone 14, maioria dos Androids
  isLarge: SCREEN_WIDTH >= 414,   // iPhone Pro Max, tablets
} as const;
