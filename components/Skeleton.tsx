import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  radius = radii.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function PetCardSkeleton() {
  return (
    <View style={skeletonStyles.petCard}>
      <View style={skeletonStyles.petCardHeader}>
        <Skeleton width={52} height={52} radius={16} />
        <View style={skeletonStyles.petCardInfo}>
          <Skeleton width={120} height={20} />
          <Skeleton width={80} height={14} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={skeletonStyles.petCardStats}>
        <Skeleton width={'30%' as unknown as number} height={44} radius={radii.md} />
        <Skeleton width={'30%' as unknown as number} height={44} radius={radii.md} />
        <Skeleton width={'30%' as unknown as number} height={44} radius={radii.md} />
      </View>
    </View>
  );
}

export function HubSkeleton() {
  return (
    <View style={skeletonStyles.hub}>
      <Skeleton width={180} height={16} />
      <Skeleton width={140} height={28} style={{ marginTop: 4 }} />
      <Skeleton
        width={'100%' as unknown as number}
        height={48}
        radius={radii.xl}
        style={{ marginTop: spacing.md }}
      />
      <View style={skeletonStyles.sectionHeader}>
        <Skeleton width={80} height={12} />
        <Skeleton width={100} height={32} radius={radii.md} />
      </View>
      <PetCardSkeleton />
      <PetCardSkeleton />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  hub: {
    paddingHorizontal: 20,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  petCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  petCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  petCardInfo: {
    flex: 1,
  },
  petCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
