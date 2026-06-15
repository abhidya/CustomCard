import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import React from "react";

import type { CustomCardApi } from "../../lib/api/endpoints";
import type { AppSession } from "../../lib/auth/AuthProvider";
import { MemoriesScreen } from "../memories/MemoriesScreen";
import { PrintScreen } from "../print/PrintScreen";

const mockApi: Partial<CustomCardApi> = {};
let mockSession: AppSession;

jest.mock("../../lib/api/ApiProvider", () => ({
  useApi: () => mockApi
}));

jest.mock("../../lib/auth/AuthProvider", () => ({
  useAppSession: () => mockSession
}));

function signedOutSession(): AppSession {
  return {
    status: "signedOut",
    userLabel: null,
    getToken: async () => null,
    signOut: async () => {}
  };
}

async function renderScreen(screenNode: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>{screenNode}</NavigationContainer>
    </QueryClientProvider>
  );
}

describe("guest account tabs", () => {
  beforeEach(() => {
    mockSession = signedOutSession();
    mockApi.getConnections = jest.fn();
    mockApi.getMobileBootstrap = jest.fn();
  });

  it("shows My cards empty state without fetching account data", async () => {
    await renderScreen(<PrintScreen />);

    expect(await screen.findByText("Your cards")).toBeTruthy();
    expect(
      screen.getByText("No cards yet. Start with a card, an invite, or a saved person.")
    ).toBeTruthy();
    expect(mockApi.getConnections).not.toHaveBeenCalled();
    expect(mockApi.getMobileBootstrap).not.toHaveBeenCalled();
  });

  it("shows People empty state without fetching account data", async () => {
    await renderScreen(<MemoriesScreen />);

    expect(await screen.findByText("People")).toBeTruthy();
    expect(screen.getByText("No saved people yet")).toBeTruthy();
    expect(mockApi.getMobileBootstrap).not.toHaveBeenCalled();
  });
});
