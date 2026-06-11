import { describe, expect, it, vi, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "../src/App";
import {
  customerVisibleFixtureTermPattern,
  customerVisibleImplementationTermPattern
} from "../src/customerWebExperience";

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
    expect(text).toContain("Or paste an invite, calendar export, or short note");
    expect(text).toContain("Create private workspace");
    expect(text).toContain("Create local workspace");
    expect(text).toContain("No account needed. Cards stay private in this browser.");
    expect(text).toContain("Import an invite");
    expect(text).toContain("Private by design");

    // Console-era furniture must stay gone from the customer home.
    expect(text).not.toContain("Personal card workflow");
    expect(text).not.toContain("Manual import");
    expect(text).not.toContain("Google Calendar connection");
    expect(text).not.toContain("Card assistant");
    expect(text).not.toContain("Language readiness");
    expect(text).not.toContain("Print options after proof");
  });

  it("renders the returning-customer home with queue and history", () => {
    const { text, html } = renderShell({ storedWorkspace: sampleWorkspace });

    expect(text).toContain("Hello, Maya");
    expect(text).toContain("Coming up");
    expect(text).toContain("Workspace ready");
    expect(text).toContain("Review event");
    expect(text).toContain("Anniversary card for Sara and Ahmed");
    expect(text).toContain("Date needed");
    expect(text).toContain("Make card");
    expect(text).toContain("Recent cards");
    expect(text).toContain("Birthday card for Maya");
    expect(html).toContain("data:image/svg+xml");
    expect(text).not.toContain("Create local workspace");
  });

  it("keeps exactly one primary next action on the home view", () => {
    for (const storedWorkspace of [undefined, sampleWorkspace]) {
      const { html } = renderShell({ storedWorkspace });
      const primaryCount = html.split('data-action-priority="primary"').length - 1;
      expect(primaryCount).toBe(1);
    }
  });

  it("renders the events view with import box and calendar sources", () => {
    const { text } = renderShell({ search: "?view=opportunities" });

    expect(text).toContain("Add event details");
    expect(text).toContain("Read event");
    expect(text).toContain("Generate card");
    expect(text).toContain("Save for later");
    expect(text).toContain("Where events can come from");
    expect(text).toContain("Google Calendar connection");
    expect(text).toContain("Apple Calendar ICS export");
    expect(text).toContain("Coming soon");
    expect(text).toContain("Export from app");
  });

  it("renders the studio as a card stage with the assistant inside", () => {
    const { html, text } = renderShell({ search: "?view=studio", storedWorkspace: sampleWorkspace });

    expect(text).toContain("Your card");
    expect(text).toContain("Make it theirs");
    expect(text).toContain("Tone");
    expect(text).toContain("Style");
    expect(text).toContain("Card language");
    expect(text).toContain("Ar EG");
    expect(text).toContain("Print safe");
    expect(text).toContain("Continue to print options");
    expect(text).toContain("Card assistant");
    expect(text).toContain("Private local replies");
    expect(text).toContain("Runs in this browser");
    expect(text).toContain("No outside transcript");
    expect(html).toContain('aria-label="Customer chat message"');
    expect(html.split("panelPreview").length - 1).toBeGreaterThanOrEqual(4);
  });

  it("renders print options with downloads and the outside-checkout boundary", () => {
    const { text } = renderShell({ search: "?view=handoff", storedWorkspace: sampleWorkspace });

    expect(text).toContain("Print your card");
    expect(text).toContain("Download print package");
    expect(text).toContain("Download SVG set");
    expect(text).toContain("Print-ready files");
    expect(text).toContain("Checkout happens outside CustomCard");
    expect(text).toContain("Price estimate");
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
