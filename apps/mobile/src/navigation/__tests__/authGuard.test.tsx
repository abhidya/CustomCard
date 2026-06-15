/**
 * Navigation tests: the customer shell is visible before sign-in, while
 * account-backed data appears for signed-in sessions.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import React from "react";

import type { AppSession } from "../../lib/auth/AuthProvider";
import { RootNavigator } from "../RootNavigator";

let mockSession: AppSession;

jest.mock("../../lib/auth/AuthProvider", () => ({
  useAppSession: () => mockSession,
  notifySessionInvalid: jest.fn()
}));

jest.mock("@clerk/clerk-expo", () => ({
  useSSO: () => ({
    startSSOFlow: jest.fn()
  }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: { create: jest.fn() },
    setActive: jest.fn()
  }),
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: jest.fn(),
      prepareEmailAddressVerification: jest.fn(),
      attemptEmailAddressVerification: jest.fn()
    },
    setActive: jest.fn()
  })
}));

jest.mock("../../lib/api/ApiProvider", () => ({
  useApi: () => ({
    // Lazy require: jest.mock factories cannot close over imports.
    getMobileBootstrap: jest.fn(
      async () => jest.requireActual("../../lib/api/__tests__/fixtures").mobileBootstrapFixture
    ),
    getConnections: jest.fn(async () => ({
      service: "customcard-api",
      status: "ok",
      connections: [],
      opportunities: [],
      repository: { runtimeMode: "memory", persisted: true }
    })),
    getCurrentDraftState: jest.fn(async () => ({
      service: "customcard-api",
      status: "ok",
      draftState: null,
      updatedAtIso: null,
      repository: { runtimeMode: "memory", persisted: true }
    }))
  })
}));

function GuideScreen() {
  return <Text>guide</Text>;
}

async function renderNavigator() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={queryClient}>
      <RootNavigator WorkflowGuideScreen={GuideScreen} />
    </QueryClientProvider>
  );
}

function session(overrides: Partial<AppSession>): AppSession {
  return {
    status: "signedOut",
    userLabel: null,
    getToken: async () => null,
    signOut: async () => {},
    ...overrides
  };
}

describe("RootNavigator customer shell", () => {
  it("keeps the customer landing visible while the session is resolving", async () => {
    mockSession = session({ status: "loading" });
    await renderNavigator();
    expect(await screen.findByText("Make the card you meant to send.")).toBeTruthy();
    expect(screen.getByText("See example cards")).toBeTruthy();
  });

  it("shows the customer create surface for signed-out users", async () => {
    mockSession = session({ status: "signedOut" });
    await renderNavigator();

    expect(await screen.findByText("Make the card you meant to send.")).toBeTruthy();
    expect(screen.getByText("Make my card now")).toBeTruthy();
    expect(screen.getByText("My cards")).toBeTruthy();
    expect(screen.getByText("People")).toBeTruthy();
    expect(screen.queryByText("Design")).toBeNull();
    expect(screen.queryByText("Events")).toBeNull();
    expect(screen.queryByText("Cards to review")).toBeNull();
  });

  it("mounts the customer tabs for a signed-in session", async () => {
    mockSession = session({
      status: "signedIn",
      userLabel: "person@example.com",
      getToken: async () => "token"
    });
    await renderNavigator();

    expect((await screen.findAllByText(/Sara and Ahmed · Anniversary/)).length).toBeGreaterThan(0);
  });
});
