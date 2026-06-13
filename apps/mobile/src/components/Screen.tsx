import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../theme";
import { useNetworkStatus } from "../lib/offline/useNetworkStatus";

/**
 * Standard screen scaffold: safe-area aware, keyboard avoiding, scrollable,
 * with a global offline banner and optional pull-to-refresh.
 */
export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.brand}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, { paddingBottom: insets.bottom + spacing.md }]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <View style={[styles.fill, styles.background]}>
        {isOffline ? (
          <View accessibilityLiveRegion="polite" style={styles.offlineBanner}>
            <Text style={styles.offlineText}>
              You're offline. Showing saved data; changes will need a connection.
            </Text>
          </View>
        ) : null}
        {body}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  background: { backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  offlineBanner: {
    backgroundColor: colors.warningSurface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  offlineText: { color: colors.warning, fontSize: 13, fontWeight: "700" }
});
