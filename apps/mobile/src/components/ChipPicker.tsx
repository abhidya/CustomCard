import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, minTouchTarget, radius, spacing, typography } from "../theme";

/** Single-select chip group (radio semantics, 44pt targets). */
export function ChipPicker({
  label,
  options,
  labels,
  selected,
  onSelect
}: {
  label: string;
  options: string[];
  labels?: Record<string, string>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={labels?.[option] ?? option}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {labels?.[option] ?? option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label, color: colors.ink },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: minTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.inkMuted },
  chipTextActive: { color: colors.textOnBrand }
});
