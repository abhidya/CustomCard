import { NavigationContainer } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import type { CustomCardApi } from "../../lib/api/endpoints";
import type { AppSession } from "../../lib/auth/AuthProvider";
import type { CardGenerateResponse, DraftStateCurrentResponse } from "../../lib/api/types";
import { StudioScreen } from "../create/StudioScreen";

jest.setTimeout(15_000);

const emptyDraft: DraftStateCurrentResponse = {
  service: "customcard-api",
  status: "ok",
  draftState: null,
  updatedAtIso: null,
  repository: { runtimeMode: "memory", persisted: true }
};

const generated: CardGenerateResponse = {
  service: "customcard-api",
  draft_id: "draft-1",
  card_copy: {
    theme_guide: {
      theme_title: "Morning Garden",
      palette: ["warm cream", "deep green"],
      motifs: ["fern frond"],
      border_style: "botanical"
    },
    panels: [
      {
        id: "front",
        headline: "Happy birthday, Maya",
        body: "",
        art_direction: "fern frond border",
        visual_cue: "",
        text_layout: {
          headline_zone: "",
          body_zone: "",
          alignment: "center",
          font_pairing: "",
          color_mode: "",
          scale: ""
        }
      }
    ],
    memory_citations: ["Loves hiking in autumn"]
  },
  images: [],
  generated_by: "browser-svg-renderer",
  ai_flow: {},
  fallback_queued: false
};

const mockApi: Partial<CustomCardApi> = {};
let mockSession: AppSession;

jest.mock("../../lib/api/ApiProvider", () => ({
  useApi: () => mockApi
}));

jest.mock("../../lib/auth/AuthProvider", () => ({
  useAppSession: () => mockSession
}));

function session(overrides: Partial<AppSession> = {}): AppSession {
  return {
    status: "signedIn",
    userLabel: "person@example.com",
    getToken: async () => "token",
    signOut: async () => {},
    ...overrides
  };
}

async function renderStudio() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StudioScreen />
      </NavigationContainer>
    </QueryClientProvider>
  );
}

describe("StudioScreen", () => {
  beforeEach(() => {
    mockSession = session();
    mockApi.getCurrentDraftState = jest.fn(async () => emptyDraft);
    mockApi.saveDraftState = jest.fn(async () => ({
      service: "customcard-api",
      status: "accepted",
      route: "customer-draft-state-save",
      realOrdersEnabled: false,
      draftStateId: "draft-state-1",
      updatedAtIso: new Date().toISOString()
    }));
    mockApi.generateCard = jest.fn(async () => generated);
    mockApi.getAiJobStatus = jest.fn(async () => ({
      service: "customcard-api",
      status: "job-result-ready",
      job_id: "job-card-1",
      queue_status: "succeeded",
      result_available: true,
      result: { payload: generated }
    }));
  });

  it("blocks generation until required fields are filled", async () => {
    const user = userEvent.setup();
    await renderStudio();

    await user.press(await screen.findByLabelText("Draft my card"));

    expect(await screen.findByText("Your name is required.")).toBeTruthy();
    expect(mockApi.generateCard).not.toHaveBeenCalled();
  });

  it("generates a card and shows the panel preview", async () => {
    const user = userEvent.setup();
    await renderStudio();

    // userEvent is async and awaits each act() so state commits before the
    // submit handler reads it (avoids stale-closure validation failures).
    await user.type(await screen.findByTestId("studio-sender"), "Sam");
    await user.type(screen.getByTestId("studio-recipient"), "Maya");
    await user.type(screen.getByTestId("studio-relationship"), "Best friend");
    await user.press(screen.getByLabelText("Draft my card"));

    expect(await screen.findByText("Happy birthday, Maya")).toBeTruthy();
    expect(screen.getByText(/Theme: Morning Garden/)).toBeTruthy();
    expect(screen.getByText(/Uses approved memories/)).toBeTruthy();
    expect(mockApi.generateCard).toHaveBeenCalledWith(
      expect.objectContaining({ sender: "Sam", recipient: "Maya", occasion: "birthday" })
    );
    // Draft autosave fired alongside generation.
    expect(mockApi.saveDraftState).toHaveBeenCalled();
  });

  it("waits for queued card generation before showing the preview", async () => {
    const user = userEvent.setup();
    mockApi.generateCard = jest.fn(async () => ({
      service: "customcard-api",
      status: "queued",
      route: "ai-card-generate",
      queue_status: "queued",
      job_id: "job-card-1",
      job_status_url: "/api/ai/jobs/status?job_id=job-card-1",
      retry_after_seconds: 1,
      result_available: false
    }));
    await renderStudio();

    await user.type(await screen.findByTestId("studio-sender"), "Sam");
    await user.type(screen.getByTestId("studio-recipient"), "Maya");
    await user.type(screen.getByTestId("studio-relationship"), "Best friend");
    await user.press(screen.getByLabelText("Draft my card"));

    expect(await screen.findByText("Happy birthday, Maya")).toBeTruthy();
    expect(mockApi.getAiJobStatus).toHaveBeenCalledWith("job-card-1");
  });

  it("autosaves meaningful edits before generation", async () => {
    const user = userEvent.setup();
    await renderStudio();

    await user.type(await screen.findByTestId("studio-sender"), "Sam");

    await waitFor(
      () =>
        expect(mockApi.saveDraftState).toHaveBeenCalledWith(
          expect.objectContaining({
            draftInput: expect.objectContaining({ sender: "Sam", language: "English" }),
            localeCode: "en-US"
          })
        ),
      { timeout: 1500 }
    );
    expect(mockApi.generateCard).not.toHaveBeenCalled();
  });

  it("resumes a saved draft from the server", async () => {
    mockApi.getCurrentDraftState = jest.fn(async () => ({
      ...emptyDraft,
      draftState: {
        draftStateId: "draft-state-9",
        status: "in-progress",
        draftInput: { sender: "Sam", recipient: "Maya", relationship: "Sister" }
      },
      updatedAtIso: new Date().toISOString()
    }));
    await renderStudio();

    await waitFor(() => expect(screen.getByTestId("studio-sender").props.value).toBe("Sam"));
    expect(screen.getByTestId("studio-recipient").props.value).toBe("Maya");
  });

  it("round-trips saved locale codes as backend card languages", async () => {
    const user = userEvent.setup();
    mockApi.getCurrentDraftState = jest.fn(async () => ({
      ...emptyDraft,
      draftState: {
        draftStateId: "draft-state-ur",
        status: "in-progress",
        localeCode: "ur-PK",
        draftInput: {
          sender: "Sam",
          recipient: "Maya",
          relationship: "Sister",
          language: "Urdu"
        }
      },
      updatedAtIso: new Date().toISOString()
    }));
    await renderStudio();

    await waitFor(() => expect(screen.getByTestId("studio-sender").props.value).toBe("Sam"));
    await user.press(screen.getByLabelText("Draft my card"));

    expect(mockApi.generateCard).toHaveBeenCalledWith(
      expect.objectContaining({ language: "Urdu" })
    );
    expect(mockApi.saveDraftState).toHaveBeenCalledWith(
      expect.objectContaining({
        draftInput: expect.objectContaining({ language: "Urdu" }),
        localeCode: "ur-PK"
      })
    );
  });
});
