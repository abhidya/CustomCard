import { describe, expect, it } from "vitest";
import { resolveCalendarConnectionResult } from "../webapp/calendarConnectionAdapter";
import { buildCheckoutCustomer, mergeCheckoutCustomerDefaults, updateCheckoutCustomerField } from "../webapp/checkoutModel";
import { buildDraftProgressState, displayDraftValue } from "../webapp/draftProgress";
import { jpegDataUrlByteLength } from "../webapp/panelMediaAdapter";
import {
  adminNavItems,
  customerNavItems,
  getAdminAccessStatus,
  getAdminSurfaceHeading,
  getAdminTargetLabel,
  resolveActiveCustomerNavView,
  resolveVisibleCustomerView,
  shouldRenderCustomerNav,
  shouldShowCustomerCta,
  shouldShowTopNav
} from "../webapp/routePolicy";
import { createWalgreensCheckoutSession } from "../webapp/walgreensCheckoutAdapter";
import type { CardPanel } from "../src/customerWorkflow";
import type { PrintExportPackage } from "../src/printExport";
import type { CardDraftInput } from "../src/customerWorkflow";

const defaultDraftInput: CardDraftInput = {
  recipient: "Someone important",
  sender: "Local User",
  relationship: "Friends",
  occasion: "card",
  tone: "warm",
  style: "botanical",
  language: "English",
  personalNote: "",
  useMemory: true
};

describe("frontend architecture seams", () => {
  it("keeps route visibility policy out of the app shell render logic", () => {
    expect(resolveVisibleCustomerView("admin")).toBe("customer");
    expect(resolveVisibleCustomerView("adapters")).toBe("customer");
    expect(resolveVisibleCustomerView("legal")).toBe("customer");
    expect(resolveVisibleCustomerView("business")).toBe("customer");
    expect(resolveVisibleCustomerView("opportunities")).toBe("opportunities");

    expect(resolveActiveCustomerNavView("business")).toBe("customer");
    expect(resolveActiveCustomerNavView("legal")).toBe("customer");
    expect(customerNavItems.map((item) => item.label)).toEqual(["Create", "Occasions", "Notes", "Print"]);
    expect(adminNavItems.map((item) => item.label)).toEqual(["Admin", "Adapters", "Legal"]);

    expect(shouldShowCustomerCta("customer")).toBe(false);
    expect(shouldShowCustomerCta("studio")).toBe(true);
    expect(shouldShowCustomerCta("handoff")).toBe(true);
    expect(shouldShowCustomerCta("legal")).toBe(false);
    expect(shouldShowCustomerCta("business")).toBe(false);
    expect(shouldShowCustomerCta("admin")).toBe(false);

    expect(shouldRenderCustomerNav(undefined)).toBe(true);
    expect(shouldRenderCustomerNav(1280)).toBe(true);
    expect(shouldRenderCustomerNav(390)).toBe(false);

    expect(shouldShowTopNav({ hasCustomerNavItems: true, isAdmin: false, renderCustomerNav: true })).toBe(true);
    expect(shouldShowTopNav({ hasCustomerNavItems: false, isAdmin: true, renderCustomerNav: true })).toBe(true);
    expect(shouldShowTopNav({ hasCustomerNavItems: true, isAdmin: true, renderCustomerNav: false })).toBe(false);
  });

  it("keeps admin gate labels and statuses behind one policy interface", () => {
    expect(getAdminTargetLabel("adapters")).toBe("Adapters");
    expect(getAdminTargetLabel("legal")).toBe("Legal docs");
    expect(getAdminTargetLabel("admin")).toBe("Admin panel");
    expect(getAdminSurfaceHeading("adapters")).toBe("Adapter readiness");
    expect(getAdminSurfaceHeading("legal")).toBe("Legal readiness and generated docs");
    expect(getAdminSurfaceHeading("admin")).toBe("Admin panel");

    expect(getAdminAccessStatus({ isLoaded: false, isSignedIn: false, isAdmin: false })).toBe("Checking account access");
    expect(getAdminAccessStatus({ isLoaded: true, isSignedIn: false, isAdmin: false })).toBe("Sign in required");
    expect(getAdminAccessStatus({ isLoaded: true, isSignedIn: true, isAdmin: false })).toBe("Admin access required");
  });

  it("centralizes draft progress and placeholder display rules", () => {
    expect(buildDraftProgressState(defaultDraftInput, false)).toEqual({
      hasMeaningfulProgress: false,
      status: "draft"
    });
    expect(displayDraftValue("Someone important")).toBe("");
    expect(displayDraftValue("Local User")).toBe("");
    expect(displayDraftValue("Sara")).toBe("Sara");

    const namedDraft = { ...defaultDraftInput, recipient: "Sara" };
    expect(buildDraftProgressState(namedDraft, false)).toEqual({
      hasMeaningfulProgress: true,
      status: "in-progress"
    });
    expect(buildDraftProgressState(namedDraft, true).status).toBe("ready-for-review");
  });

  it("normalizes checkout customer defaults and edits outside PrintView", () => {
    expect(buildCheckoutCustomer({ name: "Maya Patel", email: "maya@example.com", phone: "+1 (212) 555-0199" })).toEqual({
      firstName: "Maya",
      lastName: "Patel",
      email: "maya@example.com",
      phone: "2125550199"
    });

    expect(
      mergeCheckoutCustomerDefaults(
        { firstName: "", lastName: "Custom", email: "", phone: "" },
        { name: "Maya Patel", email: "maya@example.com", phone: "212-555-0199" }
      )
    ).toEqual({
      firstName: "Maya",
      lastName: "Custom",
      email: "maya@example.com",
      phone: "2125550199"
    });

    expect(updateCheckoutCustomerField({ firstName: "", lastName: "", email: "", phone: "" }, "phone", "1-212-555-0199"))
      .toMatchObject({ phone: "2125550199" });
  });

  it("measures JPEG data URLs before Walgreens upload", () => {
    expect(jpegDataUrlByteLength("data:image/jpeg;base64,/9j/AA==")).toBe(4);
    expect(jpegDataUrlByteLength("/9j/AA==")).toBe(4);
  });

  it("normalizes calendar connection outcomes outside EventsView", () => {
    expect(resolveCalendarConnectionResult(false, 401, undefined).status).toMatchObject({
      tone: "warn",
      title: "Sign in required"
    });

    expect(resolveCalendarConnectionResult(true, 200, { providerRequestUrl: "https://accounts.google.com/o/oauth2/v2/auth" }))
      .toMatchObject({
        providerRequestUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        status: { tone: "ok", title: "Opening Google Calendar" }
      });

    expect(resolveCalendarConnectionResult(true, 200, { missingEnv: ["GOOGLE_CLIENT_ID"] }).status.detail)
      .toBe("Missing env: GOOGLE_CLIENT_ID.");
  });

  it("creates Walgreens checkout sessions outside PrintView", async () => {
    const panel = {
      id: "front",
      label: "Front",
      headline: "Hello",
      body: "Body",
      artDirection: "Botanical",
      width: 1500,
      height: 2100,
      dpi: 300,
      rtl: false,
      overflowRisk: false
    } satisfies CardPanel;
    const calls: Array<{ url: string; body: unknown; authorization?: string }> = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        url: String(url),
        body,
        authorization: init?.headers && "Authorization" in init.headers ? String(init.headers.Authorization) : undefined
      });
      if (String(url).endsWith("/upload")) {
        return { ok: true, json: async () => ({ ok: true, imageUrl: `https://cdn.example/${calls.length}.jpg` }) };
      }
      return {
        ok: true,
        json: async () => ({ ok: true, checkoutUrl: "https://photo.walgreens.com/checkout", window: { width: 600, height: 700 } })
      };
    }) as typeof fetch;

    const session = await createWalgreensCheckoutSession({
      checkoutCustomer: { firstName: "Maya", lastName: "Patel", email: "maya@example.com", phone: "2125550199" },
      fetchImpl,
      getCustomerApiToken: async () => "token-123",
      panels: [panel, { ...panel, id: "back", label: "Back" }],
      printPackage: { draftId: "draft-maya" } as PrintExportPackage,
      renderPanel: async (candidate) => `jpeg-${candidate.id}`
    });

    expect(session).toEqual({
      checkoutUrl: "https://photo.walgreens.com/checkout",
      window: { width: 600, height: 700 }
    });
    expect(calls.map((call) => call.url)).toEqual([
      "/api/walgreens/checkout/upload",
      "/api/walgreens/checkout/upload",
      "/api/walgreens/checkout/session"
    ]);
    expect(calls[0].authorization).toBe("Bearer token-123");
    expect(calls[2].body).toMatchObject({
      affNotes: "CustomCard draft-maya",
      images: ["https://cdn.example/1.jpg", "https://cdn.example/2.jpg"]
    });
  });

  it("keeps media sizing and Walgreens upload fallback copy outside PrintView", async () => {
    expect(jpegDataUrlByteLength("data:image/jpeg;base64,SGVsbG8=")).toBe(5);
    expect(jpegDataUrlByteLength("AA==")).toBe(1);

    const panel = {
      id: "front",
      label: "Front",
      headline: "Hello",
      body: "Body",
      artDirection: "Botanical",
      width: 1500,
      height: 2100,
      dpi: 300,
      rtl: false,
      overflowRisk: false
    } satisfies CardPanel;
    const fetchImpl = (async () => ({
      ok: false,
      status: 400,
      json: async () => ({ status: "invalid-json" })
    })) as typeof fetch;

    await expect(
      createWalgreensCheckoutSession({
        checkoutCustomer: { firstName: "Maya", lastName: "Patel", email: "maya@example.com", phone: "2125550199" },
        fetchImpl,
        panels: [panel],
        printPackage: { draftId: "draft-maya" } as PrintExportPackage,
        renderPanel: async () => "jpeg-front"
      })
    ).rejects.toThrow("Walgreens image upload is not ready. (invalid-json)");
  });
});
