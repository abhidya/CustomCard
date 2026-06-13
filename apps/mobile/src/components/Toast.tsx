import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { redactText } from "../lib/api/redact";
import { colors, radius, spacing, typography } from "../theme";

export type ToastTone = "success" | "error" | "info";

interface ToastApi {
  show: (message: string, tone?: ToastTone) => void;
}

// Default no-op so components can call useToast() safely outside a provider
// (e.g. in unit tests) without throwing.
const ToastContext = createContext<ToastApi>({ show: () => {} });

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

interface ToastState {
  message: string;
  tone: ToastTone;
  key: number;
}

const AUTO_DISMISS_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() =>
      setToast(null)
    );
  }, [opacity]);

  const show = useCallback((message: string, tone: ToastTone = "info") => {
    const safe = redactText(message);
    setToast({ message: safe, tone, key: Date.now() });
    // Announce for screen readers in addition to the live region below.
    AccessibilityInfo.announceForAccessibility(safe);
  }, []);

  useEffect(() => {
    if (!toast) return;
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast, opacity, dismiss]);

  const api = useMemo<ToastApi>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.wrap, { opacity, bottom: insets.bottom + spacing.lg }]}
        >
          <Pressable
            accessibilityRole="alert"
            accessibilityLabel={toast.message}
            accessibilityLiveRegion="polite"
            onPress={dismiss}
            style={[
              styles.toast,
              toast.tone === "success" && styles.success,
              toast.tone === "error" && styles.error
            ]}
          >
            <Text style={styles.text}>{toast.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center"
  },
  toast: {
    maxWidth: 560,
    width: "100%",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink
  },
  success: { backgroundColor: colors.success },
  error: { backgroundColor: colors.danger },
  text: { ...typography.body, color: colors.textOnBrand, fontWeight: "700" }
});
