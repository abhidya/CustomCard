import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement, type ReactNode } from "react";
import App from "../webapp/App";
import {
  customerVisibleFixtureTermPattern,
  customerVisibleImplementationTermPattern
} from "../src/customerWebExperience";

vi.mock("@clerk/react", () => ({
  Show: ({ children, when }: { children: ReactNode; when: string }) => when === "signed-out" ? children : null,
  SignInButton: ({ children }: { children: ReactNode }) => children,
  SignUpButton: ({ children }: { children: ReactNode }) => children,
  UserButton: () => null,
  useAuth: () => ({ getToken: async () => undefined }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null })
}));

/**
 * Server-render smoke for the customer shell. Headless Chrome is not always
 * available (the full browser suite runs in CI), so this harness renders every
 * customer view in Node and asserts the copy and structure the browser tests
 * rely on. If a view crashes on render or loses a load-bearing string, this
 * fails locally before anything ships.
 */

interface ShellWindowOptions {
  search?: string;
  storedWorkspace?: unknown;
}

function stubShellGlobals({ search = "", storedWorkspace }: ShellWindowOptions = {}) {
  const href = `http://127.0.0.1/${search}`;
  vi.stubGlobal("window", {
    location: { href, search, hash: "" },
    history: { pushState: () => undefined },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    setTimeout,
    clearTimeout
  });
  const store = new Map<string, string>();
  if (storedWorkspace !== undefined) {
    store.set("customcard-free-workspace-v1", JSON.stringify(storedWorkspace));
  }
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key)
  });
}

function renderShell(options: ShellWindowOptions = {}): { html: string; text: string } {
  stubShellGlobals(options);
  const html = renderToString(createElement(App));
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&rsquo;|&#x27;|&#39;|’/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  return { html, text };
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
});

describe("customer shell server render", () => {
  it("renders the first-run home around the occasion-first hero", () => {
    const { text } = renderShell();

      expect(text).toContain("CustomCard");
      expect(text).toContain("Make someone's");
      expect(text).toContain("Pick the occasion");
      for (const label of ["Birthday", "Anniversary", "Wedding", "Thank you", "Graduation", "Sympathy"]) {
        expect(text).toContain(label);
      }
      expect(text).toContain("Cards that feel hand-made");
      expect(text).toContain("Or paste an invite or calendar event");
      expect(text).toContain("Sign in");
      expect(text).toContain("Sign up");

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

    it("renders saved notes from a returning workspace", () => {
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

      expect(text).toContain("Little things worth remembering");
      expect(text).toContain("Save a note");
      expect(text).toContain("Sara");
      expect(text).toContain("burnt birthday pancakes");
      expect(text).not.toContain("No notes yet");
    });

    it("keeps exactly one primary next action on the home view", () => {
      for (const storedWorkspace of [undefined, sampleWorkspace]) {
        const { html } = renderShell({ storedWorkspace });
        const primaryCount = html.split('class="btn btn-primary"').length - 1;
        expect(primaryCount).toBe(1);
      }
    });

    it("renders the events view with import box and calendar sources", () => {
      const { text } = renderShell({ search: "?view=opportunities" });

      expect(text).toContain("Never miss a moment");
      expect(text).toContain("Paste invite or ICS");
      expect(text).toContain("Google Calendar");
      expect(text).toContain("Apple Calendar export");
      expect(text).toContain("Add an occasion");
      expect(text).toContain("Try an example");
      expect(text).toContain("Nothing here yet");
    });

    it("renders the studio as a print-preview card stage", () => {
      const { html, text } = renderShell({ search: "?view=studio", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Your card, their story");
      expect(text).toContain("Who it's for");
      expect(text).toContain("Tone");
      expect(text).toContain("Style");
      expect(text).toContain("Card language");
      expect(text).toContain("Make it personal");
      expect(text).toContain("Continue to print");
      expect(html.split("pagetab").length - 1).toBeGreaterThanOrEqual(4);
    });

    it("renders print options with downloads and the outside-checkout boundary", () => {
      const { text } = renderShell({ search: "?view=handoff", storedWorkspace: sampleWorkspace });

      expect(text).toContain("Checkout at Walgreens");
      expect(text).toContain("Walgreens partner checkout");
      expect(text).toContain("Save print package");
      expect(text).toContain("Panels only");
      expect(text).toContain("Copy checklist");
      expect(text).toContain("Walgreens confirms the final total");
    });

  it("keeps customer-visible views free of fixture and implementation terms", () => {
    const views = ["", "?view=opportunities", "?view=studio", "?view=memory"];
    for (const search of views) {
      for (const storedWorkspace of [undefined, sampleWorkspace]) {
        const { text } = renderShell({ search, storedWorkspace });
        expect(text).not.toMatch(customerVisibleFixtureTermPattern);
        expect(text).not.toMatch(customerVisibleImplementationTermPattern);
      }
    }
  });
});
