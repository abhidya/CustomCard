import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-expo";
import React, { createContext, useContext, useEffect, useMemo } from "react";

import { appConfig } from "../../config/env";
import { secureTokenCache } from "./secureTokenCache";

export type SessionStatus = "loading" | "signedOut" | "signedIn";

export interface AppSession {
  status: SessionStatus;
  userLabel: string | null;
  getToken(): Promise<string | null>;
  signOut(): Promise<void>;
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

  return (
    <ClerkProvider publishableKey={config.clerkPublishableKey} tokenCache={secureTokenCache}>
      <ClerkSessionBridge>{children}</ClerkSessionBridge>
    </ClerkProvider>
  );
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
      userLabel: user?.primaryEmailAddress?.emailAddress ?? user?.fullName ?? null,
      getToken: async () => (await getToken()) ?? null,
      signOut: async () => {
        await signOut();
      }
    }),
    [isLoaded, isSignedIn, getToken, signOut, user]
  );

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}
