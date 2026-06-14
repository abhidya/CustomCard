import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTouchTarget, radius, spacing, typography } from "../theme";

/**
 * A single-select option row (radio semantics) with a clear selected state and
 * a checkmark — the native-feeling alternative to stacking full-width buttons
 * for picking one item from a short list.
 */
export function SelectableOption({
  label,
  detail,
  selected,
  onPress,
  accessibilityHint
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        pressed && styles.rowPressed
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      <Ionicons
        accessibilityElementsHidden
        importantForAccessibility="no"
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? colors.brand : colors.inkSubtle}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: minTouchTarget,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  rowSelected: { borderColor: colors.brand, backgroundColor: colors.surfaceMuted },
  rowPressed: { opacity: 0.85 },
  copy: { flex: 1, gap: 2 },
  label: { ...typography.body, color: colors.ink, fontWeight: "700" },
  labelSelected: { color: colors.brandInkOnSoft },
  detail: { ...typography.body, fontSize: 13 }
});
