import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

// ──────────────────────────────────────────
// Info Row Component
// ──────────────────────────────────────────
export function InfoRow({ label, value, isFirst = false }: { label: string; value: string; isFirst?: boolean }) {
  return (
    <View style={[styles.infoRow, !isFirst && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
