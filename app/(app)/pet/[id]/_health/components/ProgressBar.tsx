import React from 'react';
import { View, Animated } from 'react-native';
import { colors } from '../../../../../../constants/colors';
import { styles } from '../styles';

// ──────────────────────────────────────────
// Progress Bar Component
// ──────────────────────────────────────────
export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  const barColor = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[styles.progressFill, { width: `${pct}%` as unknown as number, backgroundColor: barColor }]}
      />
    </View>
  );
}
