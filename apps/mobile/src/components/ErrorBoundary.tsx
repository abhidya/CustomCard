import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { devLog } from "../lib/api/redact";
import { colors, spacing, typography } from "../theme";
import { AppButton } from "./index";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level error boundary so an unexpected render error shows a recovery UI
 * instead of a blank screen. Error details are redacted before logging and are
 * never shown to the user.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    devLog("Unhandled UI error", error);
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. You can try again — your account and saved work are safe.
        </Text>
        <AppButton label="Try again" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background
  },
  title: { ...typography.heading, textAlign: "center" },
  body: { ...typography.body, textAlign: "center" }
});
