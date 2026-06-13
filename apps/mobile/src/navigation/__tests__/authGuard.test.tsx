/**
 * Navigation guard tests: signed-out sessions only see the sign-in screen;
 * signed-in sessions land on the authenticated tabs.
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
    mode: "dev-token",
    userLabel: null,
    getToken: async () => null,
    signOut: async () => {},
    signInWithDevToken: async () => {},
    ...overrides
  };
}

describe("RootNavigator auth gate", () => {
  it("shows a loading state while the session is resolving", async () => {
    mockSession = session({ status: "loading" });
    await renderNavigator();
    expect(await screen.findByLabelText("Checking your session…")).toBeTruthy();
  });

  it("keeps signed-out users on the sign-in screen", async () => {
    mockSession = session({ status: "signedOut" });
    await renderNavigator();

    expect(await screen.findByText("Local development sign-in")).toBeTruthy();
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
    expect(screen.queryByText("Local development sign-in")).toBeNull();
  });
});
