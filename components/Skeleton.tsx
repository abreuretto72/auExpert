import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';
import { rs } from '../hooks/useResponsive';

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
        <Skeleton width={rs(52)} height={rs(52)} radius={rs(16)} />
        <View style={skeletonStyles.petCardInfo}>
          <Skeleton width={rs(120)} height={rs(20)} />
          <Skeleton width={rs(80)} height={rs(14)} style={{ marginTop: rs(6) }} />
        </View>
      </View>
      <View style={skeletonStyles.petCardStats}>
        <Skeleton width={'30%' as unknown as number} height={rs(44)} radius={rs(radii.md)} />
        <Skeleton width={'30%' as unknown as number} height={rs(44)} radius={rs(radii.md)} />
        <Skeleton width={'30%' as unknown as number} height={rs(44)} radius={rs(radii.md)} />
      </View>
    </View>
  );
}

export function HubSkeleton() {
  return (
    <View style={skeletonStyles.hub}>
      <Skeleton width={rs(180)} height={rs(16)} />
      <Skeleton width={rs(140)} height={rs(28)} style={{ marginTop: rs(4) }} />
      <Skeleton
        width={'100%' as unknown as number}
        height={rs(48)}
        radius={rs(radii.xl)}
        style={{ marginTop: rs(spacing.md) }}
      />
      <View style={skeletonStyles.sectionHeader}>
        <Skeleton width={rs(80)} height={rs(12)} />
        <Skeleton width={rs(100)} height={rs(32)} radius={rs(radii.md)} />
      </View>
      <PetCardSkeleton />
      <PetCardSkeleton />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  hub: {
    paddingHorizontal: rs(20),
    paddingTop: rs(spacing.sm),
    gap: rs(spacing.xs),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rs(spacing.lg),
    marginBottom: rs(spacing.md),
  },
  petCard: {
    backgroundColor: colors.card,
    borderRadius: rs(radii.card),
    borderWidth: 1,
    borderColor: colors.border,
    padding: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  petCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(spacing.md),
    marginBottom: rs(spacing.md),
  },
  petCardInfo: {
    flex: 1,
  },
  petCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rs(spacing.sm),
  },
});
