import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { appConfig } from "../../config/env";
import { devSessionTokenStore, secureTokenCache } from "./secureTokenCache";

export type SessionStatus = "loading" | "signedOut" | "signedIn";

export interface AppSession {
  status: SessionStatus;
  /** "clerk" for hosted identity; "dev-token" for the local-dev API token. */
  mode: "clerk" | "dev-token";
  userLabel: string | null;
  getToken(): Promise<string | null>;
  signOut(): Promise<void>;
  /** Dev-only: store a local memory-runtime session token. */
  signInWithDevToken(token: string): Promise<void>;
}

const AuthContext = createContext<AppSession | null>(null);

export function useAppSession(): AppSession {
  const session = useContext(AuthContext);
  if (!session) throw new Error("useAppSession must be used within AuthProvider");
  return session;
}

/** Fires when any layer detects an expired/invalid session (e.g. API 401). */
type SignOutListener = () => void;
const signOutListeners = new Set<SignOutListener>();

export function notifySessionInvalid(): void {
  for (const listener of signOutListeners) listener();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const config = appConfig();

  if (config.clerkPublishableKey) {
    return (
      <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={secureTokenCache}>
        <ClerkSessionBridge>{children}</ClerkSessionBridge>
      </ClerkProvider>
    );
  }

  if (config.devSessionSignInAllowed) {
    return <DevTokenSessionProvider>{children}</DevTokenSessionProvider>;
  }

  // Misconfigured release build: fail closed with a permanent signed-out
  // session instead of silently allowing unauthenticated traffic.
  return <UnconfiguredSessionProvider>{children}</UnconfiguredSessionProvider>;
}

function ClerkSessionBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    const onInvalid = () => {
      void signOut();
    };
    signOutListeners.add(onInvalid);
    return () => {
      signOutListeners.delete(onInvalid);
    };
  }, [signOut]);

  const session = useMemo<AppSession>(
    () => ({
      status: !isLoaded ? "loading" : isSignedIn ? "signedIn" : "signedOut",
      mode: "clerk",
      userLabel: user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? null,
      getToken: async () => (await getToken()) ?? null,
      signOut: async () => {
        await signOut();
      },
      signInWithDevToken: async () => {
        throw new Error("Dev token sign-in is unavailable when Clerk is configured.");
      }
    }),
    [isLoaded, isSignedIn, getToken, signOut, user]
  );

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

function DevTokenSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void devSessionTokenStore.get().then((stored) => {
      if (cancelled) return;
      setToken(stored);
      setStatus(stored ? "signedIn" : "signedOut");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await devSessionTokenStore.clear();
    setToken(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    const onInvalid = () => {
      void signOut();
    };
    signOutListeners.add(onInvalid);
    return () => {
      signOutListeners.delete(onInvalid);
    };
  }, [signOut]);

  const session = useMemo<AppSession>(
    () => ({
      status,
      mode: "dev-token",
      userLabel: token ? "Local development session" : null,
      getToken: async () => token,
      signOut,
      signInWithDevToken: async (nextToken: string) => {
        const trimmed = nextToken.trim();
        if (!trimmed) throw new Error("Enter the local API session token.");
        await devSessionTokenStore.save(trimmed);
        setToken(trimmed);
        setStatus("signedIn");
      }
    }),
    [status, token, signOut]
  );

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

function UnconfiguredSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useMemo<AppSession>(
    () => ({
      status: "signedOut",
      mode: "clerk",
      userLabel: null,
      getToken: async () => null,
      signOut: async () => {},
      signInWithDevToken: async () => {
        throw new Error("Sign-in is not configured for this build.");
      }
    }),
    []
  );
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
