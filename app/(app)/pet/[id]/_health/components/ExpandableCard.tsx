import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { rs } from '../../../../../../hooks/useResponsive';
import { colors } from '../../../../../../constants/colors';
import { styles } from '../styles';

// ──────────────────────────────────────────
// Expandable Card Component
// ──────────────────────────────────────────
export function ExpandableCard({
  header,
  children,
  defaultExpanded = false,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.expandableCard}>
      <TouchableOpacity
        style={styles.expandableHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={styles.expandableHeaderContent}>{header}</View>
        {expanded ? (
          <ChevronUp size={rs(18)} color={colors.accent} strokeWidth={1.8} />
        ) : (
          <ChevronDown size={rs(18)} color={colors.accent} strokeWidth={1.8} />
        )}
      </TouchableOpacity>
      {expanded && <View style={styles.expandableBody}>{children}</View>}
    </View>
  );
}
