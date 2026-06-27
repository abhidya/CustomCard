import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement, type ReactNode } from "react";
import App from "../webapp/App";
import { AdminCardGalleryView } from "../webapp/views/AdminCardGalleryView";
import { AdminView } from "../webapp/views/AdminView";
import { BusinessLandingView } from "../webapp/views/BusinessLandingView";
import { StudioView } from "../webapp/views/StudioView";
import { buildDefaultAiFlowAdminConfigs, summarizeAiFlowConfigs } from "../src/aiFlowConfig";
import type { AiGenerationJobEvidence } from "../src/aiGenerationJobs";
import { buildOpportunity, generateCardDraft, getDefaultDraftInput, parseFreeImport } from "../src/customerWorkflow";
import {
  customerVisibleFixtureTermPattern,
  customerVisibleImplementationTermPattern
} from "../src/customerWebExperience";

const clerkState = vi.hoisted(() => ({
  isLoaded: true,
  isSignedIn: true,
  user: {
    fullName: "Maya Patel",
    firstName: "Maya",
    lastName: "Patel",
    primaryEmailAddress: { emailAddress: "maya@example.com" },
    primaryPhoneNumber: null,
    phoneNumbers: [],
    publicMetadata: {}
  }
}));

vi.mock("@clerk/react", () => ({
  Show: ({ children, when }: { children: ReactNode; when: string }) =>
    when === (clerkState.isSignedIn ? "signed-in" : "signed-out") ? children : null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  useAuth: () => ({ getToken: async () => "test-customer-session-token" }),
  useUser: () => ({ isLoaded: clerkState.isLoaded, isSignedIn: clerkState.isSignedIn, user: clerkState.user })
}));

/**
 * Server-render smoke for the customer shell. Headless Chrome is not always
 * available (the full browser suite runs in CI), so this harness renders every
 * customer view in Node and asserts the copy and structure the browser tests
 * rely on. If a view crashes on render or loses a load-bearing string, this
 * fails locally before anything ships.
 */

interface ShellWindowOptions {
  admin?: boolean;
  loaded?: boolean;
  search?: string;
  signedIn?: boolean;
  storedWorkspace?: unknown;
}

function stubShellGlobals({ admin = false, loaded = true, search = "", signedIn = true }: ShellWindowOptions = {}) {
  clerkState.isLoaded = loaded;
  clerkState.isSignedIn = signedIn;
  clerkState.user = signedIn
    ? {
        fullName: "Maya Patel",
        firstName: "Maya",
        lastName: "Patel",
        primaryEmailAddress: { emailAddress: "maya@example.com" },
        primaryPhoneNumber: null,
        phoneNumbers: [],
        publicMetadata: admin ? { role: "admin" } : {}
      }
    : null as never;
  const href = `http://127.0.0.1/${search}`;
  vi.stubGlobal("window", {
    location: { href, pathname: "/", search, hash: "" },
    history: { pushState: () => undefined },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setTimeout,
    clearTimeout
  });
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("customer shell must not read browser localStorage");
    },
    setItem: () => {
      throw new Error("customer shell must not write browser localStorage");
    },
    removeItem: () => {
      throw new Error("customer shell must not mutate browser localStorage");
    }
  });
}

function renderShell(options: ShellWindowOptions = {}): { html: string; text: string } {
  stubShellGlobals(options);
  const html = renderToString(createElement(App));
  const text = textFromHtml(html);
  return { html, text };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&rsquo;|&#x27;|&#39;|’/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const sampleWorkspace = {
  id: "workspace-test",
  name: "Maya",
  email: "maya@example.com",
  createdAtIso: "2026-06-01T12:00:00.000Z",
  memories: [],
  events: [
    {
      id: "opp-test-1",
      title: "Anniversary card for Sara and Ahmed",
      recipient: "Sara and Ahmed",
      occasion: "anniversary",
      dateLabel: "Jul 12, 2026",
      status: "saved",
      savedAtIso: "2026-06-01T12:00:00.000Z"
    },
    {
      id: "opp-test-2",
      title: "Card for Leo",
      recipient: "Leo",
      occasion: "card",
      dateLabel: "Date needed",
      status: "saved",
      savedAtIso: "2026-06-02T12:00:00.000Z"
    }
  ],
  cardHistory: [
    {
      id: "draft-test-1",
      title: "Birthday card for Maya",
      recipient: "Maya",
      occasion: "birthday",
      exportedAtIso: "2026-06-03T12:00:00.000Z",
      frontSvg: "<svg xmlns='http://www.w3.org/2000/svg' width='1500' height='2100'></svg>"
    }
  ]
};

afterEach(() => {
  vi.unstubAllGlobals();
  clerkState.isLoaded = true;
  clerkState.isSignedIn = true;
});

describe("customer shell server render", () => {
  it("renders focused admin provider policy controls", () => {
    const aiFlowConfigs = buildDefaultAiFlowAdminConfigs();
    const html = renderToString(
      createElement(AdminView, {
        aiFlowConfigs,
        aiFlowSummary: summarizeAiFlowConfigs({}, aiFlowConfigs),
        aiGenerationJobs: [],
        fullAudit: createElement("div", null, "Full audit"),
        onAiFlowConfigsChange: () => undefined
      })
    );
    const text = textFromHtml(html);

    expect(text).toContain("Providers");
    expect(text).toContain("Provider");
    expect(text).toContain("Model");
    expect(text).toContain("Fallback");
    expect(text).toContain("Rate/min");
    expect(text).toContain("Request limit ($)");
    expect(text).toContain("Monthly limit ($)");
    expect(text).toContain("Live provider");
    expect(text).toContain("Queue primary");
    expect(text).toContain("Queue fallback");
    expect(text).toContain("Advanced policy");
    expect(text).toContain("Max retries");
    expect(text).toContain("Max tokens");
    expect(text).toContain("Temperature");
    expect(text).toContain("Prompt instructions");
    expect(html).toContain('aria-label="AI jobs queue board"');
    expect(text).toContain("Received");
    expect(text).toContain("Generating");
    expect(text).toContain("No active generation jobs yet");
    expect(text).toContain("Open Studio");
  });

  it("renders admin AI generation jobs as operator queue lanes", () => {
    const aiFlowConfigs = buildDefaultAiFlowAdminConfigs();
    const partialJob: AiGenerationJobEvidence = {
      id: "job-queue-1",
      draftId: "draft-queue-1",
      createdAtIso: "2026-06-11T12:00:00.000Z",
      status: "partial",
      generatedBy: "ai-text-and-image",
      copyProvider: "copy-provider",
      copyModel: "gpt-test",
      imageProvider: "image-provider",
      imageModel: "image-test",
      textProviderFailure: "",
      imageProviderFailure: "Inside panel image timed out.",
      panelCount: 4,
      imageCount: 2,
      panels: [
        {
          panelId: "front",
          label: "Front",
          headline: "Happy birthday",
          body: "A bright note.",
          artDirection: "Warm paper collage",
          visualCue: "Candles",
          imagePrompt: "Birthday card with candles",
          negativePrompt: "",
          revisedPrompt: "Warm birthday card with candles",
          imageUrl: "data:image/png;base64,AAAA",
          width: 1500,
          height: 2100,
          status: "generated"
        }
      ]
    };
    const html = renderToString(
      createElement(AdminView, {
        aiFlowConfigs,
        aiFlowSummary: summarizeAiFlowConfigs({}, aiFlowConfigs),
        aiGenerationJobs: [partialJob],
        fullAudit: createElement("div", null, "Full audit"),
        onAiFlowConfigsChange: () => undefined
      })
    );
    const text = textFromHtml(html);

    expect(html).toContain('aria-label="AI jobs queue board"');
    expect(text).toContain("Received");
    expect(text).toContain("1 recent browser job captured.");
    expect(text).toContain("Needs review");
    expect(text).toContain("1 job needs human review.");
    expect(text).toContain("Latest run");
    expect(text).toContain("Partial");
    expect(text).toContain("draft-queue-1");
    expect(text).toContain("copy-provider / gpt-test");
    expect(text).toContain("image-provider / image-test");
  });

  it("renders queued admin AI generation jobs as generating work", () => {
    const aiFlowConfigs = buildDefaultAiFlowAdminConfigs();
    const queuedJob: AiGenerationJobEvidence = {
      id: "job-ai-card-1",
      draftId: "draft-queue-1",
      createdAtIso: "2026-06-11T12:05:00.000Z",
      status: "queued",
      queueStatus: "queued",
      jobStatusUrl: "/api/ai/jobs/status?job_id=job-ai-card-1",
      generatedBy: "queued-worker",
      copyProvider: "pending",
      copyModel: "pending",
      imageProvider: "pending",
      imageModel: "pending",
      textProviderFailure: "",
      imageProviderFailure: "",
      panelCount: 4,
      imageCount: 0,
      panels: []
    };
    const html = renderToString(
      createElement(AdminView, {
        aiFlowConfigs,
        aiFlowSummary: summarizeAiFlowConfigs({}, aiFlowConfigs),
        aiGenerationJobs: [queuedJob],
        fullAudit: createElement("div", null, "Full audit"),
        onAiFlowConfigsChange: () => undefined
      })
    );
    const text = textFromHtml(html);

    expect(text).toContain("Received");
    expect(text).toContain("1 recent browser job captured.");
    expect(text).toContain("Generating");
    expect(text).toContain("1 background AI job is queued or running.");
    expect(text).toContain("Latest run");
    expect(text).toContain("Queued");
    expect(text).toContain("draft-queue-1");
  });

  it("renders the admin featured-card curation workflow shell", () => {
    const html = renderToString(createElement(AdminCardGalleryView, {}));
    const text = textFromHtml(html);

    expect(text).toContain("Card gallery");
    expect(text).toContain("Candidates");
    expect(text).toContain("Drafts");
    expect(text).toContain("Needs review");
    expect(text).toContain("Featured");
    expect(text).toContain("Select a card to curate.");
    expect(text).toContain("No generated cards yet.");
  });

  it("keeps the customer create flow visible when signed out", () => {
    const { text } = renderShell({ signedIn: false });

    expect(text).toContain("Make the card you meant to send.");
    expect(text).toContain("Make my card now");
    expect(text).toContain("Pick the occasion");
    expect(text).toContain("Sign in");
    expect(text).toContain("Sign up");
    expect(text).toContain("Start from invite or calendar");
    expect(text).not.toContain("Sign in to continue");
    expect(text).not.toContain("Admin panel");
    expect(text).not.toContain("Adapter readiness");
  });

  it("lets signed-out customers create and print while gating AI actions", () => {
    const studio = renderShell({ search: "?view=studio", signedIn: false });
    expect(studio.text).toContain("Your card, their story");
    expect(studio.text).toContain("Who it's for");
    expect(studio.html).toContain('aria-label="Sign in to generate AI card"');
    expect(studio.text).toContain("Create a free account to generate your card");
    expect(studio.text).toContain("Signing in does not connect your email or calendar.");
    expect(studio.text).toContain("Add details before proof");
    expect(studio.text).not.toContain("Ready for proof checks");

    const print = renderShell({ search: "?view=handoff", signedIn: false });
    expect(print.text).toContain("Finish at a print shop");
    expect(print.text).toContain("Approve your proof");
    expect(print.text).toContain("I approve this proof for printing");
    expect(print.text).toContain("Download print package");
    expect(print.text).toContain("Finish the proof approval checklist to unlock the print-shop package.");
    expect(print.text).toContain("Manual upload helpers");
    expect(print.text).not.toContain("Sign in to continue");
    expect(print.text).not.toContain("Account required");
  });

  it("renders the first-run home around the occasion-first hero", () => {
    const { text } = renderShell();

      expect(text).toContain("CustomCard");
      expect(text).toContain("Make the card you meant to send.");
      expect(text).toContain("edit, review, and print through your preferred print shop");
      expect(text).toContain("Make my card now");
      expect(text).toContain("Start from invite or calendar");
      expect(text).toContain("See example cards");
      expect(text).toContain("Pick the occasion");
      for (const label of ["Birthday", "Anniversary", "Wedding", "Thank you", "Graduation", "Sympathy"]) {
        expect(text).toContain(label);
      }
      expect(text).toContain("Made for real moments");
      // Landing sections explain the product and the print-shop payment boundary.
      expect(text).toContain("How it works");
      expect(text).toContain("Pick a moment");
      expect(text).toContain("Add relationship context");
      expect(text).toContain("AI drafts");
      expect(text).toContain("You review");
      expect(text).toContain("Finish at a print shop");
      expect(text).toContain("Made for real moments");
      expect(text).toContain("Free to create. Private by default.");
      expect(text).toContain("Free to create. Pay the print shop only if you print.");
      expect(text).toContain("You choose the printer and confirm payment directly with them.");
      expect(text).toContain("AI generation, saved history, Google Calendar, and Walgreens checkout require an account.");
      expect(text).toContain("Calendar connections are optional and separate from creating an account.");
      expect(text).not.toContain("Email and calendar connections are optional");
      expect(text).toContain("You review every word before creating the print-shop package.");
      // The invite import is a collapsed expander; personal details live under "My cards";
      // print is reached through the create flow, not a home tile.
      expect(text).toContain("Start from invite or calendar");
      expect(text).not.toContain("Print this card");

      // Console-era furniture must stay gone from the customer home.
      expect(text).not.toContain("Personal card workflow");
      expect(text).not.toContain("Manual import");
      expect(text).not.toContain("Google Calendar connection");
      expect(text).not.toContain("Card assistant");
      expect(text).not.toContain("Language readiness");
      expect(text).not.toContain("Print options after proof");
      expect(text).not.toContain("Admin panel");
      expect(text).not.toContain("Adapter readiness");
    });

    it("does not hydrate saved notes from browser storage", () => {
      const storedWorkspace = {
        ...sampleWorkspace,
        memories: [
          {
            id: "memory-sara",
            recipient: "Sara",
            note: "She still laughs about the burnt birthday pancakes.",
            approved: true,
            createdAtIso: "2026-06-01T12:00:00.000Z"
          }
        ]
      };
      const { text } = renderShell({ search: "?view=memory", storedWorkspace });

      // My cards stays card-focused; personal details live on the People page.
      expect(text).toContain("Your cards");
      expect(text).toContain("Start a card");
      expect(text).toContain("No cards yet. Start with a card, an invite, or a saved person.");
      expect(text).not.toContain("Save detail");
      expect(text).not.toContain("memory-sara");
    });

    it("keeps bottom next actions off the studio setup step", () => {
      for (const storedWorkspace of [undefined, sampleWorkspace]) {
        const home = renderShell({ storedWorkspace });
        expect(home.html).not.toContain('class="ctadock"');
        expect(home.html).toContain("importExpanderToggle");

        const studio = renderShell({ search: "?view=studio", storedWorkspace });
        const dockCount = studio.html.split('class="ctadock"').length - 1;
        expect(dockCount).toBe(0);
        expect(studio.text).not.toContain("Ready for proof checks");
      }
    });

    it("renders the hidden business landing for direct links without adding it to customer nav", () => {
      const { html, text } = renderShell({ search: "?view=business" });

      expect(text).toContain("For customer lifecycle teams");
      expect(text).toContain("No live CRM writes");
      expect(text).toContain("Human approval required");
      expect(text).not.toContain("Make the card you meant to send.");
      expect(html).not.toContain(">Business<");
      expect(html).not.toContain("navlink-admin");

      const admin = renderShell({ admin: true, search: "?view=business" });
      expect(admin.html).toContain('class="navlink navlink-admin" data-active="true" type="button">B2B</button>');
      expect(admin.text).not.toContain("Make the card you meant to send.");
    });

    it("renders the business landing content for admins", () => {
      const draftInput = getDefaultDraftInput(undefined, buildOpportunity(parseFreeImport(""), [], new Date("2026-06-11T12:00:00.000Z")));
      const html = renderToString(
        createElement(BusinessLandingView, {
          draft: generateCardDraft(draftInput, []),
          onCreate: () => undefined,
          onReview: () => undefined
        })
      );
      const text = textFromHtml(html);

      expect(text).toContain("For customer lifecycle teams");
      expect(text).toContain("Send the right card on time");
    });

    it("renders the events view with import box and calendar sources", () => {
      const { text } = renderShell({ search: "?view=opportunities" });

      // Google Calendar is the primary path; pasting is the manual fallback; Apple is a footnote.
      expect(text).toContain("Never miss a moment");
      expect(text).toContain("Checking your calendar connection");
      expect(text).toContain("Already have the details somewhere?");
      expect(text).toContain("Try an example");
      expect(text).toContain("Using Apple Calendar?");
      expect(text).not.toContain("Nothing here yet");

      const signedOut = renderShell({ search: "?view=opportunities", signedIn: false });
      expect(signedOut.text).toContain("Sign in to connect Google Calendar");
      expect(signedOut.text).toContain("Already have the details somewhere?");
    });

    it("renders the studio as a details-first draft setup stage", () => {
      const { html, text } = renderShell({ search: "?view=studio", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Your card, their story");
      expect(text).toContain("Who it's for");
      expect(text).toContain("Tone");
      expect(text).toContain("Style");
      expect(text).toContain("Funny");
      expect(text).not.toContain("Card language");
      expect(text).not.toContain("Language");
      for (const language of ["English", "Spanish", "Urdu", "Arabic"]) {
        expect(text).not.toContain(language);
      }
      expect(html).toContain("Type a tone");
      expect(html).toContain("Type a style");
      expect(text).toContain("Start from a design");
      expect(text).toContain("Birthday glow");
      expect(text).toContain("Friendship stars");
      expect(text).toContain("Make it personal");
      expect(text).toContain("Set up the card first");
      expect(text).toContain("Draft your card with AI");
      expect(text).toContain("four print panels");
      expect(text).toContain("Add who it's for, the occasion, and one real detail");
      expect(text).toContain("Review template instead");
      expect(text).not.toContain("Continue to proof checks");
      expect(html).not.toContain('role="tablist"');

      // Labeled create-flow stepper with a clickable back-path; the future
      // Print step is inert, so it does not point at a proof before one exists.
      expect(html).toContain('aria-label="Card creation steps"');
      expect(html).toContain('aria-current="step"');
      for (const label of ["Start", "Design", "Print"]) {
        expect(text).toContain(label);
      }
    });

    it("renders progressive AI generation panel states", () => {
      const opportunity = buildOpportunity(
        parseFreeImport("Sara birthday dinner on 2026-07-12"),
        [],
        new Date("2026-06-11T12:00:00.000Z")
      );
      const draftInput = {
        ...getDefaultDraftInput(undefined, opportunity),
        recipient: "Sara",
        sender: "Maya"
      };
      const baseDraft = generateCardDraft(draftInput, []);
      const aiDraft = {
        ...baseDraft,
        generatedBy: "ai-text-and-image" as const,
        panels: baseDraft.panels.map((panel) =>
          panel.id === "front" ? { ...panel, imageUrl: "data:image/png;base64,AAAA" } : panel
        )
      };

      const html = renderToString(
        createElement(StudioView, {
          aiActive: true,
          aiAvailable: true,
          aiLoading: true,
          aiPanelProgress: {
            front: "artwork-ready",
            "inside-left": "artwork-loading",
            "inside-right": "copy-ready",
            back: "queued"
          },
          aiRequiresSignIn: false,
          aiStale: false,
          aiStatus: "Loaded 1/4 artwork panels. Ready panels are available to review.",
          draft: aiDraft,
          draftInput,
          memories: [],
          onAddNote: () => undefined,
          onField: () => undefined,
          onGenerateAi: () => undefined,
          onKeepArtwork: () => undefined,
          onReviewProof: () => undefined,
          onTemplateReviewChange: () => undefined,
          onPanelEdit: () => undefined,
          onPanelRevert: () => undefined,
          panelOverrides: {},
          printFitPassed: true,
          templateReviewStarted: false
        })
      );
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

      expect(text).toContain("Building your AI card");
      expect(text).toContain("1/4 panels ready");
      expect(text).toContain("Loaded 1/4 artwork panels");
      expect(text).toContain("Artwork ready");
      expect(text).toContain("Loading art");
      expect(text).toContain("Copy ready");
      expect(text).toContain("Queued");
      expect(html).toContain('data-status="artwork-ready"');
      expect(html).toContain('data-status="artwork-loading"');
      expect(html).not.toContain("data:image/png;base64,AAAA");
    });

    it("renders print options with downloads and the outside-checkout boundary", () => {
    const { text } = renderShell({ search: "?view=handoff", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Finish at a print shop");
      expect(text).toContain("Print-shop details");
      expect(text).toContain("Upload helpers");
      expect(text).toContain("Download print package");
      expect(text).toContain("Save upload panels");
      expect(text).toContain("Copy steps");
      expect(text).toContain("Open print shop");
      expect(text).toContain("confirms the final total");

      // Wayfinding back to the design step.
      expect(text).toContain("Back to design");
      const { html } = renderShell({ search: "?view=handoff", storedWorkspace: sampleWorkspace });
      expect(html).toContain('aria-label="Card creation steps"');
      expect(html).not.toContain('class="ctadock"');
    });

    it("renders the exact-panel editor with tabs, fields, and local text tools after a draft exists", () => {
      const opportunity = buildOpportunity(
        parseFreeImport("Sara birthday dinner on 2026-07-12"),
        [],
        new Date("2026-06-11T12:00:00.000Z")
      );
      const draftInput = {
        ...getDefaultDraftInput(undefined, opportunity),
        recipient: "Sara",
        sender: "Maya"
      };
      const draft = generateCardDraft(draftInput, []);
      const html = renderToString(
        createElement(StudioView, {
          aiActive: true,
          aiAvailable: true,
          aiLoading: false,
          aiPanelProgress: {},
          aiRequiresSignIn: false,
          aiStale: false,
          aiStatus: "",
          draft,
          draftInput,
          memories: [],
          onAddNote: () => undefined,
          onField: () => undefined,
          onGenerateAi: () => undefined,
          onKeepArtwork: () => undefined,
          onReviewProof: () => undefined,
          onTemplateReviewChange: () => undefined,
          onPanelEdit: () => undefined,
          onPanelRevert: () => undefined,
          panelOverrides: {},
          printFitPassed: true,
          templateReviewStarted: false
        })
      );
      const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

      expect(html).toContain('data-proof-visible="true"');
      expect(text).toContain("Review details");
      expect(text).toContain("Edit original details");
      expect(text).toContain("Proof is ready to finish");
      expect(text).toContain("Continue to proof checks");
      expect(text).toContain("Choose what to improve");
      expect(text).toContain("Editing: Front");
      expect(text).toContain("These are the exact words that print on this panel.");
      expect(text).toContain("Shorten to fit");
      expect(text).toContain("Make warmer");
      expect(text).toContain("Make simpler");
      expect(text).toContain("Make less generic");
      expect(text).toContain("Revert panel");
      expect(text).toContain("Regenerate this panel");
      expect(text).toContain("Panel generation updates only the selected panel.");
      expect(text).toContain("Advanced: art direction");
      expect(text).toContain("Upload image");
      expect(text).toContain("Fill panel");
      expect(text).toContain("Photo window");
      expect(html).toContain('aria-label="Rich text formatting"');
      expect(html).toContain('accept="image/png,image/jpeg,image/webp"');
      // WAI-ARIA tabs pattern for the panel switcher.
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('role="tabpanel"');
      expect(html).toContain('aria-selected="true"');
    });

    it("renders the four-panel print proof with compact approval and trim toggle", () => {
      const { html, text } = renderShell({ search: "?view=handoff", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Your print proof");
      expect(text).toContain("Show trim / safe area");
      expect(html.split('class="proofpanel"').length - 1).toBe(4);
      for (const label of ["All four panels look right", "Names, spelling, and tone are approved", "Crop and safe area reviewed"]) {
        expect(text).toContain(label);
      }
      expect(text).toContain("I approve this proof for printing");
    });

  it("renders people with the detail form and use-once default", () => {
    const { text } = renderShell({ search: "?view=people" });

    expect(text).toContain("People");
    expect(text).toContain("Save a personal detail");
    expect(text).toContain("Save for future cards");
    expect(text).toContain("use once");
    expect(text).toContain("Remember this for next time");
    expect(text).toContain("No people saved yet.");
  });

  it("renders settings with account, connections, privacy choices, and policies", () => {
    const signedIn = renderShell({ search: "?view=settings" });
    expect(signedIn.text).toContain("Settings and privacy");
    expect(signedIn.text).toContain("Account");
    expect(signedIn.text).toContain("maya@example.com");
    expect(signedIn.text).toContain("Connections");
    expect(signedIn.text).toContain("Calendar connections are optional");
    expect(signedIn.text).toContain("Privacy choices");
    expect(signedIn.text).toContain("Send me a copy of my data");
    expect(signedIn.text).toContain("Delete my data");
    expect(signedIn.text).toContain("AI helps draft your cards");
    expect(signedIn.text).toContain("Terms");
    expect(signedIn.text).toContain("Privacy");
    expect(signedIn.text).toContain("AI disclosure");

    const signedOut = renderShell({ search: "?view=settings", signedIn: false });
    expect(signedOut.text).toContain("Sign in to send a privacy request.");
    expect(signedOut.text).toContain("You're browsing without an account.");
  });

  it("keeps the admin access gate calm while account status is loading", () => {
    const loading = renderShell({ search: "?view=admin", loaded: false, signedIn: false });

    expect(loading.text).toContain("Admin panel");
    expect(loading.text).toContain("Checking your account.");
    expect(loading.text).toContain("Checking account access");
    expect(loading.text).not.toContain("Admin access can be granted");
    expect(loading.html).not.toContain('class="adminGateActions"><span>Checking account access</span><button');
  });

  it("keeps customer-visible views free of fixture and implementation terms", () => {
    const views = ["", "?view=opportunities", "?view=studio", "?view=memory", "?view=people", "?view=settings", "?view=handoff"];
    for (const search of views) {
      for (const storedWorkspace of [undefined, sampleWorkspace]) {
        const { text } = renderShell({ search, storedWorkspace });
        expect(text).not.toMatch(customerVisibleFixtureTermPattern);
        expect(text).not.toMatch(customerVisibleImplementationTermPattern);
      }
    }
  });
});
