import React from 'react';
import { View, Text } from 'react-native';
import { FileText } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { styles } from '../styles';

// ──────────────────────────────────────────
// Empty State Component
// ──────────────────────────────────────────
export function EmptyState({ message, hint }: { message: string; hint: string }) {
  return (
    <View style={styles.emptyState}>
      <FileText size={rs(40)} color={colors.textGhost} strokeWidth={1.4} />
      <Text style={styles.emptyMessage}>{message}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}
