import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement, type ReactNode } from "react";
import App from "../webapp/App";
import { AdminCardGalleryView } from "../webapp/views/AdminCardGalleryView";
import { StudioView } from "../webapp/views/StudioView";
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
  search?: string;
  signedIn?: boolean;
  storedWorkspace?: unknown;
}

function stubShellGlobals({ admin = false, search = "", signedIn = true }: ShellWindowOptions = {}) {
  clerkState.isLoaded = true;
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

    expect(text).toContain("Never miss the card-worthy moment.");
    expect(text).toContain("Create a card");
    expect(text).toContain("Pick the occasion");
    expect(text).toContain("Sign in");
    expect(text).toContain("Sign up");
    expect(text).toContain("Start from an invite or calendar event");
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
    expect(studio.text).toContain("Continue to print");

    const print = renderShell({ search: "?view=handoff", signedIn: false });
    expect(print.text).toContain("Print at Walgreens");
    expect(print.text).toContain("Approve your proof");
    expect(print.text).toContain("I approve this proof for printing");
    expect(print.text).toContain("Continue to Walgreens");
    expect(print.text).toContain("Finish the proof approval checklist to unlock Walgreens checkout.");
    expect(print.text).toContain("Save print package");
    expect(print.text).not.toContain("Sign in to continue");
    expect(print.text).not.toContain("Account required");
  });

  it("renders the first-run home around the occasion-first hero", () => {
    const { text } = renderShell();

      expect(text).toContain("CustomCard");
      expect(text).toContain("Never miss the card-worthy moment.");
      expect(text).toContain("review and print through Walgreens");
      expect(text).toContain("Create a card");
      expect(text).toContain("Find moments from calendar or invite");
      expect(text).toContain("See examples");
      expect(text).toContain("Pick the occasion");
      for (const label of ["Birthday", "Anniversary", "Wedding", "Thank you", "Graduation", "Sympathy"]) {
        expect(text).toContain(label);
      }
      expect(text).toContain("Cards that feel hand-made");
      // Landing sections explain the product and the Walgreens boundary.
      expect(text).toContain("How it works");
      expect(text).toContain("Pick a moment");
      expect(text).toContain("Add relationship context");
      expect(text).toContain("AI drafts");
      expect(text).toContain("You review");
      expect(text).toContain("Continue to Walgreens");
      expect(text).toContain("Made for real moments");
      expect(text).toContain("Free to create. Private by default.");
      expect(text).toContain("Free to create. Pay Walgreens only if you print.");
      expect(text).toContain("Walgreens handles payment and final checkout.");
      expect(text).toContain("AI generation, saved history, Google Calendar, and Walgreens checkout require an account.");
      expect(text).toContain("Calendar connections are optional and separate from creating an account.");
      expect(text).not.toContain("Email and calendar connections are optional");
      expect(text).toContain("You review every word before checkout.");
      // The invite import is a collapsed expander; personal details live under "My cards";
      // print is reached through the create flow, not a home tile.
      expect(text).toContain("Start from an invite or calendar event");
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

    it("keeps bottom next actions scoped to active creation steps", () => {
      for (const storedWorkspace of [undefined, sampleWorkspace]) {
        const home = renderShell({ storedWorkspace });
        expect(home.html).not.toContain('class="ctadock"');
        expect(home.html).toContain("importExpanderToggle");

        const studio = renderShell({ search: "?view=studio", storedWorkspace });
        const dockCount = studio.html.split('class="ctadock"').length - 1;
        expect(dockCount).toBe(1);
        expect(studio.text).toContain("Continue to print");
      }
    });

    it("renders the business landing page by direct route and exposes it in admin nav", () => {
      const { html, text } = renderShell({ search: "?view=business" });

      expect(text).toContain("For customer lifecycle teams");
      expect(text).toContain("Send the right card on time");
      expect(text).toContain("What this page needs");
      expect(text).toContain("No live CRM writes");
      expect(text).toContain("Human approval required");
      expect(text).not.toContain("Never miss the card-worthy moment.");
      expect(html).not.toContain(">Business<");
      expect(html).not.toContain("navlink-admin");

      const admin = renderShell({ admin: true, search: "?view=business" });
      expect(admin.html).toContain('class="navlink navlink-admin" data-active="true" type="button">B2B</button>');
    });

    it("renders the events view with import box and calendar sources", () => {
      const { text } = renderShell({ search: "?view=opportunities" });

      // Google Calendar is the primary path; pasting is the manual fallback; Apple is a footnote.
      expect(text).toContain("Never miss a moment");
      expect(text).toContain("Checking your calendar connection");
      expect(text).toContain("Or paste it in");
      expect(text).toContain("Try an example");
      expect(text).toContain("Using Apple Calendar?");
      expect(text).not.toContain("Nothing here yet");

      const signedOut = renderShell({ search: "?view=opportunities", signedIn: false });
      expect(signedOut.text).toContain("Sign in to connect Google Calendar");
      expect(signedOut.text).toContain("Or paste it in");
    });

    it("renders the studio as a print-preview card stage", () => {
      const { html, text } = renderShell({ search: "?view=studio", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Your card, their story");
      expect(text).toContain("Who it's for");
      expect(text).toContain("Tone");
      expect(text).toContain("Style");
      expect(text).toContain("Card language");
      expect(text).toContain("Make it personal");
      expect(text).toContain("Generate AI card");
      expect(text).toContain("4 print panels");
      expect(text).toContain("Drafts editable copy first, then loads artwork panel by panel.");
      expect(text).toContain("Continue to print");
      expect(html.split("pagetab").length - 1).toBeGreaterThanOrEqual(4);
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
          printFitPassed: true
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
    });

    it("renders print options with downloads and the outside-checkout boundary", () => {
    const { text } = renderShell({ search: "?view=handoff", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Print at Walgreens");
      expect(text).toContain("Walgreens print details");
      expect(text).toContain("Manual Walgreens upload");
      expect(text).toContain("Save print package");
      expect(text).toContain("Save upload panels");
      expect(text).toContain("Copy steps");
      expect(text).toContain("Open Walgreens upload");
      expect(text).toContain("Walgreens confirms the final total");
    });

  it("renders people with the detail form and use-once default", () => {
    const { text } = renderShell({ search: "?view=people" });

    expect(text).toContain("People");
    expect(text).toContain("Save a personal detail");
    expect(text).toContain("Save for future cards");
    expect(text).toContain("use once");
    expect(text).toContain("Save detail");
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
