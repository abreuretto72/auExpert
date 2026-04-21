import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

// ──────────────────────────────────────────
// Stat Card Component
// ──────────────────────────────────────────
export function StatCard({
  icon,
  iconColor,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBg, { backgroundColor: iconColor + '12' }]}>{icon}</View>
      <Text style={[styles.statCardValue, { color: iconColor }]}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </View>
  );
}
