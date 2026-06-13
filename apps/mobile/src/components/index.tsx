import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { userMessageForError } from "../lib/api/errors";
import { colors, minTouchTarget, radius, spacing, typography } from "../theme";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.centered} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.stateLabel}>{label}</Text>
    </View>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Something went wrong"
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateLabel}>{userMessageForError(error)}</Text>
      {onRetry ? <AppButton label="Try again" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.stateTitle}>{title}</Text>
      {detail ? <Text style={styles.stateLabel}>{detail}</Text> : null}
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  accessibilityHint,
  style
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        pressed && styles.buttonPressed,
        blocked && styles.buttonDisabled,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.textOnBrand : colors.brand} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === "primary" && styles.buttonLabelPrimary,
            variant === "danger" && styles.buttonLabelDanger
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  multiline = false,
  autoCapitalize = "sentences",
  keyboardType = "default",
  secureTextEntry = false,
  testID
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.inputMultiline, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkSubtle}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        testID={testID}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  style
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A card title with optional trailing content (commonly a status Pill). */
export function CardRow({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.cardRow}>
      <Text style={styles.cardRowTitle}>{title}</Text>
      {trailing ?? null}
    </View>
  );
}

export function SectionHeading({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={styles.sectionHeading} accessibilityRole="header">
      <Text style={typography.heading}>{title}</Text>
      {detail ? <Text style={typography.body}>{detail}</Text> : null}
    </View>
  );
}

export function Pill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <Text
      style={[styles.pill, tone === "good" && styles.pillGood, tone === "warn" && styles.pillWarn]}
    >
      {label}
    </Text>
  );
}

export function InlineNotice({ text, tone = "info" }: { text: string; tone?: "info" | "warn" }) {
  return (
    <View style={[styles.notice, tone === "warn" && styles.noticeWarn]}>
      <Text style={[styles.noticeText, tone === "warn" && styles.noticeTextWarn]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl
  },
  stateTitle: { ...typography.heading, textAlign: "center" },
  stateLabel: { ...typography.body, textAlign: "center" },
  button: {
    minHeight: minTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonSecondary: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border
  },
  buttonDanger: {
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.danger
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonLabel: { fontSize: 16, fontWeight: "800", color: colors.brandInkOnSoft },
  buttonLabelPrimary: { color: colors.textOnBrand },
  buttonLabelDanger: { color: colors.danger },
  field: { gap: spacing.xs },
  fieldLabel: { ...typography.label, color: colors.ink },
  input: {
    minHeight: minTouchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface
  },
  inputMultiline: { minHeight: 96, textAlignVertical: "top" },
  inputError: { borderColor: colors.danger },
  fieldError: { fontSize: 13, color: colors.danger },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  sectionHeading: { gap: spacing.xs, marginTop: spacing.lg, marginBottom: spacing.sm },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  cardRowTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  pill: {
    alignSelf: "flex-start",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    fontSize: 12,
    fontWeight: "900",
    color: colors.brandInkOnSoft,
    backgroundColor: colors.brandSoft
  },
  pillGood: { color: colors.success, backgroundColor: colors.surfaceMuted },
  pillWarn: { color: colors.danger, backgroundColor: colors.dangerSurface },
  notice: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md
  },
  noticeWarn: { backgroundColor: colors.dangerSurface },
  noticeText: { ...typography.body, color: colors.brandInkOnSoft },
  noticeTextWarn: { color: colors.danger }
});
