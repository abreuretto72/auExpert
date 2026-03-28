import { rs } from '../hooks/useResponsive';

export const spacing = {
  xs: rs(4),
  sm: rs(8),
  md: rs(16),
  lg: rs(24),
  xl: rs(32),
  xxl: rs(40),
} as const;

export const radii = {
  sm: rs(8),
  md: rs(10),
  lg: rs(12),
  xl: rs(14),
  xxl: rs(18),
  card: rs(22),
  modal: rs(26),
  phone: rs(44),
} as const;
