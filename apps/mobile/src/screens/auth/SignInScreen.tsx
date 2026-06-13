import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, InlineNotice } from "../../components";
import { Screen } from "../../components/Screen";
import { appConfig } from "../../config/env";
import { devLog } from "../../lib/api/redact";
import { useAppSession } from "../../lib/auth/AuthProvider";
import { requireEmail, requireText } from "../../forms/validation";
import { colors, spacing, typography } from "../../theme";

export function SignInScreen() {
  const config = appConfig();
  const session = useAppSession();

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Your card assistant</Text>
        <Text style={styles.heroTitle}>CustomCard</Text>
        <Text style={styles.heroSubtitle}>
          Turn the moments you already have planned into printed cards — reviewed and approved by
          you before anything is ordered.
        </Text>
      </View>

      {config.clerkPublishableKey ? (
        <ClerkEmailCodeForm />
      ) : config.devSessionSignInAllowed ? (
        <DevTokenForm />
      ) : (
        <InlineNotice
          tone="warn"
          text="Sign-in is not configured for this build. Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY and rebuild."
        />
      )}

      {session.mode === "dev-token" ? (
        <Text style={styles.devHint}>
          Development build connected to {config.apiBaseUrl}. Real accounts use Clerk in configured
          builds.
        </Text>
      ) : null}
    </Screen>
  );
}

/**
 * Email + one-time-code sign-in via Clerk. Falls back to creating the account
 * when the email is unknown, so one form covers sign-in and sign-up.
 */
function ClerkEmailCodeForm() {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [flow, setFlow] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = signInLoaded && signUpLoaded;

  async function sendCode() {
    const emailError = requireEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    if (!ready || !signIn || !signUp) return;
    setBusy(true);
    setError(null);
    try {
      await signIn.create({ identifier: email.trim(), strategy: "email_code" });
      setFlow("sign-in");
      setPhase("code");
    } catch (signInError) {
      if (isIdentifierNotFound(signInError)) {
        try {
          await signUp.create({ emailAddress: email.trim() });
          await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
          setFlow("sign-up");
          setPhase("code");
        } catch (signUpError) {
          setError(clerkMessage(signUpError, "We couldn't create your account. Try again."));
        }
      } else {
        setError(clerkMessage(signInError, "We couldn't start sign-in. Try again."));
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const codeError = requireText(code, "Verification code", 10);
    if (codeError) {
      setError(codeError);
      return;
    }
    if (!ready || !signIn || !signUp) return;
    setBusy(true);
    setError(null);
    try {
      if (flow === "sign-in") {
        const result = await signIn.attemptFirstFactor({
          strategy: "email_code",
          code: code.trim()
        });
        if (result.status === "complete" && result.createdSessionId) {
          await setActiveSignIn({ session: result.createdSessionId });
        } else {
          setError("That code didn't work. Request a new one and try again.");
        }
      } else {
        const result = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (result.status === "complete" && result.createdSessionId) {
          await setActiveSignUp({ session: result.createdSessionId });
        } else {
          setError("That code didn't work. Request a new one and try again.");
        }
      }
    } catch (verifyError) {
      setError(clerkMessage(verifyError, "Verification failed. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={typography.heading}>
        {phase === "email" ? "Sign in or create an account" : "Check your email"}
      </Text>
      {phase === "email" ? (
        <>
          <FormField
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            error={error}
            testID="sign-in-email"
          />
          <AppButton label="Email me a code" onPress={() => void sendCode()} loading={busy} />
        </>
      ) : (
        <>
          <Text style={typography.body}>We sent a one-time code to {email.trim()}.</Text>
          <FormField
            label="Verification code"
            value={code}
            onChangeText={(value) => {
              setCode(value);
              setError(null);
            }}
            placeholder="123456"
            autoCapitalize="none"
            keyboardType="number-pad"
            error={error}
            testID="sign-in-code"
          />
          <AppButton label="Verify and continue" onPress={() => void verifyCode()} loading={busy} />
          <AppButton
            label="Use a different email"
            variant="secondary"
            onPress={() => {
              setPhase("email");
              setCode("");
              setError(null);
            }}
          />
        </>
      )}
    </Card>
  );
}

/** Development-only sign-in against the local memory-runtime API. */
function DevTokenForm() {
  const session = useAppSession();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await session.signInWithDevToken(token);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the token.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Text style={typography.heading}>Local development sign-in</Text>
      <Text style={typography.body}>
        Paste the customer session token configured on your local API server
        (CUSTOMCARD_CUSTOMER_SESSION_TOKEN).
      </Text>
      <FormField
        label="Local API session token"
        value={token}
        onChangeText={(value) => {
          setToken(value);
          setError(null);
        }}
        autoCapitalize="none"
        secureTextEntry
        error={error}
        testID="dev-token-input"
      />
      <AppButton label="Connect" onPress={() => void submit()} loading={busy} />
    </Card>
  );
}

function isIdentifierNotFound(error: unknown): boolean {
  const errors = (error as { errors?: { code?: string }[] })?.errors;
  return Boolean(errors?.some((entry) => entry.code === "form_identifier_not_found"));
}

function clerkMessage(error: unknown, fallback: string): string {
  const errors = (error as { errors?: { message?: string; longMessage?: string }[] })?.errors;
  const message = errors?.[0]?.longMessage ?? errors?.[0]?.message;
  if (!message) devLog("Clerk error without message", error);
  return message ?? fallback;
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.brand,
    borderRadius: 8,
    padding: spacing.xl,
    gap: spacing.sm,
    marginTop: spacing.xxl
  },
  heroEyebrow: {
    color: colors.brandSoft,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  heroTitle: { color: colors.textOnBrand, fontSize: 34, fontWeight: "900" },
  heroSubtitle: { color: colors.textOnBrandMuted, fontSize: 15, lineHeight: 22 },
  devHint: { ...typography.body, fontSize: 12, textAlign: "center" }
});
