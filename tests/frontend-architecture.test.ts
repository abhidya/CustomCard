import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolveCalendarConnectionResult } from "../webapp/calendarConnectionAdapter";
import {
  buildCheckoutCustomer,
  isCheckoutCustomerComplete,
  mergeCheckoutCustomerDefaults,
  updateCheckoutCustomerField,
  validateCheckoutCustomer
} from "../webapp/checkoutModel";
import {
  buildProofSignature,
  emptyProofChecklistState,
  isProofApproved,
  proofApprovalProgressLabel,
  proofChecklistItems,
  toggleProofChecklistItem,
  type ProofChecklistState
} from "../webapp/proofApproval";
import {
  buildDraftAutosaveIdempotencyKey,
  buildBrowserIdempotencyKey,
  buildHandoffChecklistText,
  buildZipArchiveBlob,
  postCustomerMutation
} from "../webapp/customerShellCommands";
import {
  applyCalendarMomentToDraftInput,
  buildCalendarMomentDraftContext,
  buildCalendarMomentOpportunity
} from "../webapp/calendarMomentDraft";
import { buildDraftProgressState, displayDraftValue } from "../webapp/draftProgress";
import { buildAiCardGenerationHeaders, readAiGenerationResponse } from "../src/appStateOrchestrator";
import { jpegDataUrlByteLength, jpegDataUrlToBytes } from "../webapp/panelMediaAdapter";
import {
  adminNavItems,
  createFlowStepIndex,
  createFlowSteps,
  customerNavItems,
  getAdminAccessStatus,
  getAdminSurfaceHeading,
  getAdminTargetLabel,
  resolveActiveCustomerNavView,
  resolveCreateFlowEntryView,
  resolveVisibleCustomerView,
  shouldRenderBusinessLanding,
  shouldRenderCustomerNav,
  shouldShowCreateFlowStepper,
  shouldShowCustomerCta,
  shouldShowTopNav
} from "../webapp/routePolicy";
import { createWalgreensCheckoutSession } from "../webapp/walgreensCheckoutAdapter";
import type { CardPanel, VendorHandoff } from "../src/customerWorkflow";
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
  it("keeps legacy admin views lazy-loaded outside the customer shell chunk", () => {
    const appSource = readFileSync(new URL("../webapp/App.tsx", import.meta.url), "utf8");
    const adminSource = readFileSync(new URL("../webapp/AdminOperationalView.tsx", import.meta.url), "utf8");
    const appStateSource = readFileSync(new URL("../src/appStateOrchestrator.ts", import.meta.url), "utf8");

    expect(appSource).toContain('lazy(() => import("./AdminOperationalView")');
    expect(appSource).toContain("AdminLazyPanel");
    expect(appSource).not.toContain("../src/App");
    expect(appSource).not.toContain("providerCatalog");
    expect(appStateSource).not.toContain("providerCatalog");
    expect(adminSource).toContain('import { AdminPanelView, AdaptersView } from "../src/App"');
    expect(adminSource).toContain("buildRuntimeReadinessMap");
  });

  it("keeps PrintView lifecycle events lint-clean without hook dependency bypasses", () => {
    const printViewSource = readFileSync(new URL("../webapp/views/PrintView.tsx", import.meta.url), "utf8");

    expect(printViewSource).not.toContain("eslint-disable-next-line react-hooks/exhaustive-deps");
    expect(printViewSource).toContain("const onCardEventRef = useRef(onCardEvent)");
    expect(printViewSource).toContain('onCardEventRef.current?.("ready-to-print")');
    expect(printViewSource).toContain('onCardEventRef.current?.("returned-from-walgreens")');
  });

  it("keeps route visibility policy out of the app shell render logic", () => {
    expect(resolveVisibleCustomerView("admin")).toBe("customer");
    expect(resolveVisibleCustomerView("adapters")).toBe("customer");
    expect(resolveVisibleCustomerView("legal")).toBe("customer");
    expect(resolveVisibleCustomerView("business")).toBe("customer");
    expect(resolveVisibleCustomerView("opportunities")).toBe("opportunities");

    expect(resolveActiveCustomerNavView("business")).toBe("business");
    expect(resolveActiveCustomerNavView("legal")).toBe("customer");
    expect(resolveActiveCustomerNavView("studio")).toBe("customer");
    expect(resolveActiveCustomerNavView("handoff")).toBe("customer");
    expect(resolveActiveCustomerNavView("opportunities")).toBe("customer");
    expect(resolveActiveCustomerNavView("memory")).toBe("memory");
    expect(resolveActiveCustomerNavView("settings")).toBe("settings");
    expect(resolveActiveCustomerNavView("people")).toBe("people");
    expect(resolveVisibleCustomerView("settings")).toBe("settings");
    expect(resolveVisibleCustomerView("people")).toBe("people");
    expect(customerNavItems.map((item) => item.label)).toEqual(["Create", "My cards", "People", "Settings"]);
    expect(adminNavItems.map((item) => item.label)).toEqual(["Admin", "B2B", "Adapters", "Legal"]);

    expect(shouldShowCustomerCta("customer")).toBe(false);
    expect(shouldShowCustomerCta("studio")).toBe(false);
    expect(shouldShowCustomerCta("handoff")).toBe(true);
    expect(shouldShowCustomerCta("settings")).toBe(false);
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

  it("keeps the internal B2B landing admin-only until real marketing copy exists", () => {
    expect(shouldRenderBusinessLanding("business", false)).toBe(false);
    expect(shouldRenderBusinessLanding("business", true)).toBe(true);
    expect(shouldRenderBusinessLanding("customer", true)).toBe(false);
  });

  it("routes empty print deep-links to the studio and labels the create flow steps", () => {
    expect(resolveCreateFlowEntryView("handoff", false)).toBe("studio");
    expect(resolveCreateFlowEntryView("handoff", true)).toBe("handoff");
    expect(resolveCreateFlowEntryView("studio", false)).toBe("studio");
    expect(resolveCreateFlowEntryView("customer", false)).toBe("customer");

    expect(createFlowSteps.map((step) => step.label)).toEqual(["Start", "Design", "Print"]);
    expect(createFlowSteps.map((step) => step.view)).toEqual(["customer", "studio", "handoff"]);
    expect(createFlowStepIndex("studio")).toBe(1);
    expect(createFlowStepIndex("handoff")).toBe(2);
    expect(createFlowStepIndex("settings")).toBe(-1);

    expect(shouldShowCreateFlowStepper("studio")).toBe(true);
    expect(shouldShowCreateFlowStepper("handoff")).toBe(true);
    expect(shouldShowCreateFlowStepper("customer")).toBe(false);
    expect(shouldShowCreateFlowStepper("business")).toBe(false);
  });

  it("keeps admin gate labels and statuses behind one policy interface", () => {
    expect(getAdminTargetLabel("adapters")).toBe("Adapters");
    expect(getAdminTargetLabel("legal")).toBe("Legal docs");
    expect(getAdminTargetLabel("admin")).toBe("Admin panel");
    expect(getAdminSurfaceHeading("adapters")).toBe("Adapter readiness");
    expect(getAdminSurfaceHeading("legal")).toBe("Legal readiness and policy docs");
    expect(getAdminSurfaceHeading("admin")).toBe("Admin panel");

    expect(getAdminAccessStatus({ isLoaded: false, isSignedIn: false, isAdmin: false })).toBe("Checking account access");
    expect(getAdminAccessStatus({ isLoaded: true, isSignedIn: false, isAdmin: false })).toBe("Sign in required");
    expect(getAdminAccessStatus({ isLoaded: true, isSignedIn: true, isAdmin: false })).toBe("Admin access required");
  });

  it("turns imported calendar birthdays into a real studio draft instead of a placeholder", () => {
    const papaMoment = {
      opportunityId: "opportunity-papa-birthday",
      eventId: "event-papa-birthday",
      recipientName: "Papa's",
      title: "Papa's birthday",
      startsAt: "2027-05-02T00:00:00.000Z",
      timezone: "UTC",
      confidence: 0.88,
      decision: "pending"
    };
    const genericMoment = {
      ...papaMoment,
      opportunityId: "opportunity-happy-birthday",
      recipientName: "Happy !",
      title: "Happy birthday!"
    };
    const baseOpportunity = {
      id: "opportunity-empty",
      title: "Card for Someone important",
      recipient: "Someone important",
      occasion: "card",
      dateLabel: "Date needed",
      urgency: "needs-date" as const,
      status: "needs-more-detail" as const,
      confidence: 32,
      evidence: [],
      recommendedPath: "Ask for the event date before choosing a printer path.",
      memoryIds: []
    };

    expect(buildCalendarMomentDraftContext(papaMoment)).toMatchObject({
      title: "Papa's birthday",
      recipient: "Papa",
      occasion: "birthday",
      dateLabel: "May 2, 2027",
      sourceLabel: "Google Calendar",
      confidenceLabel: "88% match"
    });
    expect(buildCalendarMomentDraftContext(genericMoment).recipient).toBe("");
    expect(applyCalendarMomentToDraftInput(defaultDraftInput, papaMoment)).toMatchObject({
      recipient: "Papa",
      occasion: "birthday"
    });
    expect(buildCalendarMomentOpportunity(baseOpportunity, papaMoment)).toMatchObject({
      id: "opportunity-papa-birthday",
      title: "Birthday card for Papa",
      recipient: "Papa",
      occasion: "birthday",
      dateLabel: "May 2, 2027"
    });
    expect(buildCalendarMomentOpportunity(baseOpportunity, genericMoment)).toMatchObject({
      id: "opportunity-happy-birthday",
      title: "Happy birthday!",
      recipient: "Recipient needed",
      occasion: "birthday"
    });
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

  it("keeps customer API mutation command details outside App shell", () => {
    const key = buildBrowserIdempotencyKey("/api/customer/draft-state");
    expect(key).toMatch(/^api-customer-draft-state-/);
  });

  it("uses deterministic autosave idempotency keys for identical draft snapshots", () => {
    const snapshot = JSON.stringify({ draftInput: { recipient: "Sara" }, status: "in-progress" });
    const first = buildDraftAutosaveIdempotencyKey("/api/customer/draft-state", snapshot);
    const second = buildDraftAutosaveIdempotencyKey("/api/customer/draft-state", snapshot);
    const changed = buildDraftAutosaveIdempotencyKey(
      "/api/customer/draft-state",
      JSON.stringify({ draftInput: { recipient: "Mina" }, status: "in-progress" })
    );

    expect(first).toBe(second);
    expect(first).toMatch(/^api-customer-draft-state-snapshot-[0-9a-f]{16}$/);
    expect(changed).not.toBe(first);
  });

  it("sends the signed-in customer token with AI card generation requests", async () => {
    const headers = await buildAiCardGenerationHeaders(async () => "customer-token-123");

    expect(headers.get("Authorization")).toBe("Bearer customer-token-123");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Idempotency-Key")).toMatch(/^card-gen-/);
  });

  it("blocks AI card generation before posting without an active customer token", async () => {
    await expect(buildAiCardGenerationHeaders(async () => null)).rejects.toThrow(
      "AI card generation needs an active signed-in session."
    );
  });

  it("keeps API auth failure details visible for signed-in AI card sessions", async () => {
    const response = new Response(
      JSON.stringify({
        status: "invalid-session",
        detail: "Clerk session token is expired"
      }),
      { status: 401, headers: { "content-type": "application/json" } }
    );

    await expect(readAiGenerationResponse(response)).rejects.toThrow(
      "AI card generation could not verify your signed-in session: Clerk session token is expired."
    );
  });

  it("builds one archive for browser print downloads", async () => {
    const archive = buildZipArchiveBlob([
      { path: "upload-jpg/01-front.jpg", bytes: new Uint8Array([1, 2, 3]) },
      { path: "manual-upload-steps.txt", bytes: "Open Walgreens and upload the numbered panels." }
    ]);
    const bytes = new Uint8Array(await archive.arrayBuffer());
    const archiveText = new TextDecoder().decode(bytes);

    expect(archive.type).toBe("application/zip");
    expect(Array.from(bytes.slice(0, 4))).toEqual([80, 75, 3, 4]);
    expect(Array.from(bytes.slice(-22, -18))).toEqual([80, 75, 5, 6]);
    expect(archiveText).toContain("upload-jpg/01-front.jpg");
    expect(archiveText).toContain("manual-upload-steps.txt");
    expect(archiveText).toContain("Open Walgreens and upload the numbered panels.");
  });

  it("turns the handoff checklist into package and clipboard copy", () => {
    const handoff: VendorHandoff = {
      vendorId: "walgreens",
      vendorName: "Walgreens",
      mode: "manual-upload",
      costControl: "free-app-no-paid-api",
      realOrdersEnabled: false,
      canPlaceRealOrder: false,
      checklist: ["Save the print package from CustomCard.", "Upload the numbered JPG panels in order."],
      disabledReasons: []
    };

    expect(buildHandoffChecklistText(handoff)).toContain("Walgreens print checklist");
    expect(buildHandoffChecklistText(handoff)).toContain("1. Save the print package from CustomCard.");
    expect(buildHandoffChecklistText(handoff)).toContain("2. Upload the numbered JPG panels in order.");
  });

  it("surfaces failed customer mutations instead of reporting false persistence success", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ status: "draft-save-failed" })
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    try {
      await expect(
        postCustomerMutation(async () => "token-123", "/api/customer/draft-state", { status: "draft" })
      ).rejects.toThrow("draft-save-failed");
      const [, init] = fetchMock.mock.calls[0];
      expect(init?.method).toBe("POST");
      expect(init?.headers).toBeInstanceOf(Headers);
      expect((init?.headers as Headers).get("Authorization")).toBe("Bearer token-123");
      expect((init?.headers as Headers).get("X-Idempotency-Key")).toMatch(/^api-customer-draft-state-/);
    } finally {
      vi.unstubAllGlobals();
    }
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

  it("validates checkout prefill fields before Walgreens checkout", () => {
    const valid = { firstName: "Maya", lastName: "Patel", email: "maya@example.com", phone: "2125550199" };
    expect(validateCheckoutCustomer(valid)).toEqual([]);
    expect(isCheckoutCustomerComplete(valid)).toBe(true);

    const issues = validateCheckoutCustomer({ firstName: " ", lastName: "", email: "not-an-email", phone: "555" });
    expect(issues.map((issue) => issue.field)).toEqual(["firstName", "lastName", "email", "phone"]);
    expect(isCheckoutCustomerComplete({ ...valid, phone: "555" })).toBe(false);
  });

  it("requires every proof checklist item before approval unlocks checkout", () => {
    expect(isProofApproved(emptyProofChecklistState)).toBe(false);
    expect(proofApprovalProgressLabel(emptyProofChecklistState)).toBe(`0 of ${proofChecklistItems.length} checks done`);

    let state: ProofChecklistState = emptyProofChecklistState;
    for (const item of proofChecklistItems) {
      expect(isProofApproved(state)).toBe(false);
      state = toggleProofChecklistItem(state, item.id);
    }
    expect(isProofApproved(state)).toBe(true);
    expect(proofApprovalProgressLabel(state)).toBe("Proof approved");

    // Unchecking any line revokes approval.
    const revoked = toggleProofChecklistItem(state, "approve");
    expect(isProofApproved(revoked)).toBe(false);
  });

  it("requires a reviewed check for every printed panel", () => {
    const ids = proofChecklistItems.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining(["panel-front", "panel-inside-left", "panel-inside-right", "panel-back", "approve"])
    );
  });

  it("resets proof approval when any printed aspect of the draft changes", () => {
    const panel: CardPanel = {
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
    };
    const draft = {
      generatedBy: "deterministic-free-template" as const,
      input: { style: "botanical" },
      panels: [panel]
    };
    const base = buildProofSignature(draft);

    // Every printed aspect — text, design notes, artwork, layout, direction, fit, generator — busts the signature.
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, headline: "Hi" }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, body: "Other" }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, artDirection: "Minimal" }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, imageUrl: "data:image/png;base64,AA" }] })).not.toBe(base);
    expect(
      buildProofSignature({ ...draft, panels: [{ ...panel, imagePlacement: { frame: "photo-window", focus: "top" } }] })
    ).not.toBe(base);
    expect(
      buildProofSignature({
        ...draft,
        panels: [
          {
            ...panel,
            textLayout: {
              headlineZone: "lower",
              bodyZone: "bottom",
              alignment: "center",
              fontPairing: "serif-sans",
              colorMode: "dark-ink",
              scale: "standard"
            }
          }
        ]
      })
    ).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, textFormat: { headline: { bold: true } } }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, styleId: "minimal" }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, rtl: true }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [{ ...panel, overflowRisk: true }] })).not.toBe(base);
    expect(buildProofSignature({ ...draft, input: { style: "minimal" } })).not.toBe(base);
    expect(buildProofSignature({ ...draft, generatedBy: "ai-text-and-image" })).not.toBe(base);
    expect(buildProofSignature({ ...draft, panels: [panel] })).toBe(base);
  });

  it("measures JPEG data URLs before Walgreens upload", () => {
    expect(jpegDataUrlByteLength("data:image/jpeg;base64,/9j/AA==")).toBe(4);
    expect(jpegDataUrlByteLength("/9j/AA==")).toBe(4);
    expect(Array.from(jpegDataUrlToBytes("data:image/jpeg;base64,SGVsbG8="))).toEqual([72, 101, 108, 108, 111]);
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

    // Setup failures must never leak env vars or internals to the customer.
    expect(resolveCalendarConnectionResult(true, 200, { missingEnv: ["GOOGLE_CLIENT_ID"] }).status.detail)
      .toBe("Calendar connection isn't available right now. Paste an invite instead — it works the same way.");
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
      if (String(url).endsWith("/status")) {
        return { ok: true, json: async () => ({ ok: true, status: "walgreens-checkout-ready" }) };
      }
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
      "/api/walgreens/checkout/status",
      "/api/walgreens/checkout/upload",
      "/api/walgreens/checkout/upload",
      "/api/walgreens/checkout/session"
    ]);
    expect(calls[0].authorization).toBe("Bearer token-123");
    expect(calls[3].body).toMatchObject({
      affNotes: "CustomCard draft-maya",
      images: ["https://cdn.example/2.jpg", "https://cdn.example/3.jpg"]
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
    const fetchImpl = (async (url: string | URL | Request) => {
      if (String(url).endsWith("/status")) {
        return { ok: true, json: async () => ({ ok: true, status: "walgreens-checkout-ready" }) };
      }
      return {
        ok: false,
        status: 400,
        json: async () => ({ status: "invalid-json" })
      };
    }) as typeof fetch;

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

  it("shows the friendly Walgreens provider block instead of raw upstream detail", async () => {
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
      status: 503,
      json: async () => ({
        ok: false,
        status: "walgreens-provider-credential-blocked",
        error:
          "Walgreens PhotoPrints checkout is waiting on Walgreens enablement. Save the print package and upload it manually for now.",
        detail: "Walgreens /api/photo/creds/v3 error 112: AffiliateID is set up incorrectly for Walgreens hosted checkout."
      })
    })) as typeof fetch;

    await expect(
      createWalgreensCheckoutSession({
        checkoutCustomer: { firstName: "Maya", lastName: "Patel", email: "maya@example.com", phone: "2125550199" },
        fetchImpl,
        panels: [panel],
        printPackage: { draftId: "draft-maya" } as PrintExportPackage,
        renderPanel: async () => "jpeg-front"
      })
    ).rejects.toThrow(
      "Walgreens PhotoPrints checkout is waiting on Walgreens enablement. Save the print package and upload it manually for now."
    );
  });
});
