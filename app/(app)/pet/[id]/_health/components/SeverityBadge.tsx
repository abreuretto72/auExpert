import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../../../../../../constants/colors';
import { styles } from '../styles';

// ──────────────────────────────────────────
// Severity Badge Component
// ──────────────────────────────────────────
export function SeverityBadge({ severity, t }: { severity: string; t: (key: string) => string }) {
  const config: Record<string, { color: string; bg: string; key: string }> = {
    mild: { color: colors.warning, bg: colors.warningSoft, key: 'health.severityMild' },
    moderate: { color: colors.accent, bg: colors.accentGlow, key: 'health.severityModerate' },
    severe: { color: colors.danger, bg: colors.dangerSoft, key: 'health.severitySevere' },
  };
  const c = config[severity] ?? config.mild;

  return (
    <View style={[styles.severityBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.severityText, { color: c.color }]}>{t(c.key)}</Text>
    </View>
  );
}
