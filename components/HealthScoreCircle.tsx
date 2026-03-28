import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../constants/colors';

interface HealthScoreCircleProps {
  score: number | null;
  size?: number;
}

export function HealthScoreCircle({ score, size = 100 }: HealthScoreCircleProps) {
  const value = score ?? 0;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const scoreColor =
    value >= 80 ? colors.success : value >= 50 ? colors.warning : colors.danger;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        {score != null ? (
          <>
            <Text style={[styles.score, { color: scoreColor }]}>{value}</Text>
            <Text style={styles.label}>saude</Text>
          </>
        ) : (
          <>
            <ShieldCheck size={24} color={colors.textDim} strokeWidth={1.5} />
            <Text style={styles.label}>sem dados</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
  },
  score: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 28,
  },
  label: {
    fontFamily: 'Sora_500Medium',
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 0.5,
    marginTop: 2,
  },
});
