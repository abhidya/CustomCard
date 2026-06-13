import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, View, type DimensionValue } from "react-native";

import { colors, radius, spacing } from "../theme";

/** A single shimmering placeholder block. */
export function Skeleton({
  width = "100%",
  height = 16,
  style
}: {
  width?: DimensionValue;
  height?: number;
  style?: object;
}) {
  const [pulse] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[styles.block, { width, height, opacity: pulse }, style]} />;
}

/** A card-shaped cluster of skeleton lines. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View
      style={styles.card}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Skeleton width="60%" height={20} />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? "40%" : "90%"} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border, borderRadius: radius.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  }
});
