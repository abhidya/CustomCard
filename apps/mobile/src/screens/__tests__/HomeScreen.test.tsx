import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import React from "react";

import { ApiError } from "../../lib/api/errors";
import type { CustomCardApi } from "../../lib/api/endpoints";
import { mobileBootstrapFixture } from "../../lib/api/__tests__/fixtures";
import { HomeScreen } from "../home/HomeScreen";

const mockApi: Partial<CustomCardApi> = {};

jest.mock("../../lib/api/ApiProvider", () => ({
  useApi: () => mockApi
}));

async function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <HomeScreen />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

describe("HomeScreen", () => {
  it("shows a loading state while the bootstrap is pending", async () => {
    mockApi.getMobileBootstrap = jest.fn(() => new Promise(() => {}));
    await renderHome();
    expect(await screen.findByLabelText("Loading your cards…")).toBeTruthy();
  });

  it("renders today's card, the queue, and the safety banner on success", async () => {
    mockApi.getMobileBootstrap = jest.fn(async () => mobileBootstrapFixture);
    await renderHome();

    // Both today's-card and the queue row carry this label, so expect two.
    const matches = await screen.findAllByText(/Sara and Ahmed · Anniversary/);
    expect(matches.length).toBe(2);
    expect(screen.getByText(/Confirm before checkout/)).toBeTruthy();
    expect(screen.getByText("Cards to review")).toBeTruthy();
    expect(screen.getByLabelText("Review Sara and Ahmed's card")).toBeTruthy();
  });

  it("shows an empty state when the queue has no visible items", async () => {
    mockApi.getMobileBootstrap = jest.fn(async () => ({
      ...mobileBootstrapFixture,
      queueItems: [],
      todaySummary: { ...mobileBootstrapFixture.todaySummary, customerVisible: false }
    }));
    await renderHome();

    expect(await screen.findByText("No cards in your queue yet")).toBeTruthy();
  });

  it("shows a retryable error state when the bootstrap fails", async () => {
    mockApi.getMobileBootstrap = jest.fn(async () => {
      throw new ApiError({ message: "down", kind: "server", status: 503 });
    });
    await renderHome();

    expect(await screen.findByText("Something went wrong")).toBeTruthy();
    expect(screen.getByLabelText("Try again")).toBeTruthy();
  });
});
