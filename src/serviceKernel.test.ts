import { describe, expect, it } from "vitest";
import {
  InMemoryRelationshipMemoryRepository,
  approveRelationshipMemory,
  buildDemoServiceSlice,
  connectProvider,
  createCardProject,
  createDraftOrder,
  decideOpportunity,
  evaluateRegulatoryDecision,
  getRuntimeConfig,
  importEvents,
  isValidImportedEvent,
  renderPrintPacket,
  transitionOrder,
  validatePrintLayout,
  validateRuntimeReadiness,
  type ImportedEvent,
  type OrderRecord,
  type OrderTransitionEvent,
  type UserAccount
} from "./serviceKernel";

const user: UserAccount = {
  id: "user-1",
  email: "founder@example.com",
  locale: "en-US",
  region: "US",
  platform: "web"
};

const event: ImportedEvent = {
  id: "event-1",
  title: "Sara and Ahmed wedding tomorrow",
  startsAt: "2026-06-02T12:00:00.000Z",
  timezone: "America/New_York",
  sourceEvidence: "calendar metadata: wedding invite",
  recipientHint: "Sara and Ahmed"
};

describe("production service kernel", () => {
  it("imports provider metadata without storing raw email/calendar content", () => {
    const connection = connectProvider(user, "gmail");
    const opportunities = importEvents(connection, [event], "2026-06-01T12:00:00.000Z");

    expect(connection.scopes).toEqual(["gmail.metadata.readonly"]);
    expect(connection.rawContentStored).toBe(false);
    expect(opportunities).toHaveLength(1);
    expect(opportunities[0]).toMatchObject({
      recipientName: "Sara and Ahmed",
      decision: "pending",
      leadTimeHours: 24
    });
    expect(opportunities[0].evidence).toContain("calendar metadata: wedding invite");
  });

  it("uses least-privilege scopes for calendar providers and ignores revoked connections", () => {
    const calendar = connectProvider(user, "google_calendar");
    const outlook = connectProvider(user, "outlook");
    const icloud = connectProvider(user, "icloud");
    const revoked = { ...calendar, status: "revoked" as const };

    expect(calendar.scopes).toEqual(["calendar.events.readonly"]);
    expect(outlook.scopes).toEqual(["Calendars.ReadBasic"]);
    expect(icloud.status).toBe("unsupported");
    expect(icloud.reason).toContain("manual calendar-export");
    expect(importEvents(revoked, [event])).toEqual([]);
    expect(importEvents(icloud, [event])).toEqual([]);
  });

  it("rejects provider payloads with raw content, missing fields, or invalid timestamps", () => {
    const connection = connectProvider(user, "gmail");
    const withRawContent = { ...event, rawContent: "Full email body must never enter import." };
    const missingRecipient = { ...event, recipientHint: "" };
    const invalidDate = { ...event, startsAt: "not-a-date" };

    expect(isValidImportedEvent(connection, event)).toBe(true);
    expect(importEvents(connection, [withRawContent, missingRecipient, invalidDate])).toEqual([]);
  });

  it("calculates deterministic lead time and clamps past events", () => {
    const connection = connectProvider(user, "gmail");
    const [future] = importEvents(connection, [event], "2026-06-01T00:00:00.000Z");
    const [past] = importEvents(connection, [{ ...event, startsAt: "2026-05-30T00:00:00.000Z" }]);

    expect(future.leadTimeHours).toBe(36);
    expect(future.id).toBe(importEvents(connection, [event], "2026-06-01T00:00:00.000Z")[0].id);
    expect(past.leadTimeHours).toBe(0);
  });

  it("persists approved relationship memory and supports forget controls", () => {
    const repository = new InMemoryRelationshipMemoryRepository();
    const memory = approveRelationshipMemory({
      recipientName: "Sara and Ahmed",
      sensitivity: "normal",
      text: "They prefer sincere cards with one specific shared memory.",
      source: "user_note",
      locale: "en-US",
      createdAt: "2026-06-01T12:00:00.000Z"
    });

    repository.save(memory);

    expect(repository.listForRecipient("Sara and Ahmed")).toEqual([memory]);
    expect(repository.forget(memory.id)).toBe(true);
    expect(repository.listForRecipient("Sara and Ahmed")).toEqual([]);
  });

  it("only creates card projects from explicit generate decisions and preserves user choice immutably", () => {
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const rejected = decideOpportunity(pending, "reject");
    const snoozed = decideOpportunity(pending, "snooze");
    const approved = decideOpportunity(pending, "generate");

    expect(pending.decision).toBe("pending");
    expect(createCardProject(user, rejected, [])).toBeUndefined();
    expect(createCardProject(user, snoozed, [])).toBeUndefined();
    expect(createCardProject(user, approved, [])?.operationalRun.printPacket.kind).toBe("mock_manifest");
  });

  it("filters project memories to approved memories for the matching recipient", () => {
    const repository = new InMemoryRelationshipMemoryRepository();
    const matching = repository.save(
      approveRelationshipMemory({
        recipientName: "Sara and Ahmed",
        sensitivity: "normal",
        text: "They like sincere cards.",
        source: "prior_card",
        locale: "en-US",
        createdAt: "2026-06-01T12:00:00.000Z"
      })
    );
    repository.save(
      approveRelationshipMemory({
        recipientName: "Someone Else",
        sensitivity: "normal",
        text: "Do not use this.",
        source: "prior_card",
        locale: "en-US",
        createdAt: "2026-06-01T12:00:00.000Z"
      })
    );
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const project = createCardProject(user, decideOpportunity(pending, "generate"), repository.listForRecipient("Sara and Ahmed"));

    expect(project?.approvedMemoryIds).toEqual([matching.id]);
    expect(project?.operationalRun.facts.map((fact) => fact.id)).toContain("people");
  });

  it("marks RTL locales as layout-sensitive before fulfillment", () => {
    const arabicUser: UserAccount = { ...user, locale: "ar-EG", region: "MENA" };
    const [pending] = importEvents(connectProvider(arabicUser, "gmail"), [event]);
    const project = createCardProject(arabicUser, decideOpportunity(pending, "generate"), []);

    expect(project?.requiresRtlLayout).toBe(true);
  });

  it("models order recovery for event moves, wrong stores, vendor rejection, and cancellation", () => {
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const project = createCardProject(user, decideOpportunity(pending, "generate"), []);
    if (!project) throw new Error("expected project");

    const draft = createDraftOrder(project);
    const rendered = transitionOrder(draft, { type: "render_validated" });
    const quoted = transitionOrder(rendered, {
      type: "quote_received",
      quoteCents: 699,
      storeId: "walgreens-1",
      pickupWindowMinutes: 60
    });
    const movedUp = transitionOrder(quoted, { type: "event_moved_up", hoursUntilEvent: 2 });
    const approvedForShare = transitionOrder(quoted, { type: "external_share_approved" });
    const wrongStore = transitionOrder(quoted, { type: "wrong_store", correctStoreId: "walgreens-2" });
    const rejected = transitionOrder(approvedForShare, { type: "vendor_rejected", reason: "image rejected" });
    const cancelled = transitionOrder(quoted, { type: "cancel" });

    expect(rendered.status).toBe("rendered");
    expect(quoted).toMatchObject({ status: "quoted", quoteCents: 699, storeId: "walgreens-1", pickupWindowMinutes: 60 });
    expect(movedUp.recoveryActions).toContain("switch to one-hour pickup");
    expect(wrongStore.recoveryActions.join(" ")).toContain("re-quote correct store walgreens-2");
    expect(rejected.recoveryActions).toContain("re-render packet");
    expect(cancelled.status).toBe("cancelled");
    expect(quoted.auditTrail).toEqual([
      "draft order created",
      "renderer packet validated",
      "quote received for walgreens-1"
    ]);
  });

  it("re-quotes instead of one-hour pickup when event movement still has safe lead time", () => {
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const project = createCardProject(user, decideOpportunity(pending, "generate"), []);
    if (!project) throw new Error("expected project");

    const movedUp = transitionOrder(createDraftOrder(project), { type: "event_moved_up", hoursUntilEvent: 8 });

    expect(movedUp.recoveryActions).toContain("re-quote pickup window");
    expect(movedUp.recoveryActions).toContain("ask user to approve updated deadline");
  });

  it("blocks live vendor handoff until certification and kill-switch policy are resolved", () => {
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const project = createCardProject(user, decideOpportunity(pending, "generate"), []);
    if (!project) throw new Error("expected project");

    const rendered = transitionOrder(createDraftOrder(project), { type: "render_validated" });
    const quoted = transitionOrder(rendered, {
      type: "quote_received",
      quoteCents: 699,
      storeId: "walgreens-1",
      pickupWindowMinutes: 60
    });
    const approvedForShare = transitionOrder(quoted, { type: "external_share_approved" });
    const order = transitionOrder(approvedForShare, {
      type: "attempt_vendor_handoff",
      certificationRecorded: true
    });

    expect(order.status).toBe("vendor_handoff_blocked");
    expect(order.recoveryActions).toContain("live order kill switch remains off");
  });

  it("rejects impossible order histories instead of mutating labels", () => {
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const project = createCardProject(user, decideOpportunity(pending, "generate"), []);
    if (!project) throw new Error("expected project");

    const draft = createDraftOrder(project);
    const cancelled = transitionOrder(draft, { type: "cancel" });

    expect(() => transitionOrder(draft, { type: "quote_received", quoteCents: 699, storeId: "walgreens-1", pickupWindowMinutes: 60 }))
      .toThrow("Invalid order transition: draft -> quote_received");
    expect(() => transitionOrder(draft, { type: "external_share_approved" }))
      .toThrow("Invalid order transition: draft -> external_share_approved");
    expect(() => transitionOrder(draft, { type: "attempt_vendor_handoff", certificationRecorded: true }))
      .toThrow("Invalid order transition: draft -> attempt_vendor_handoff");
    expect(() => transitionOrder(draft, { type: "fulfilled" }))
      .toThrow("Invalid order transition: draft -> fulfilled");
    expect(() => transitionOrder(cancelled, { type: "fulfilled" }))
      .toThrow("Invalid order transition: cancelled -> fulfilled");
  });

  it("rejects bypasses across quoted, approved, blocked, and terminal order states", () => {
    const [pending] = importEvents(connectProvider(user, "gmail"), [event]);
    const project = createCardProject(user, decideOpportunity(pending, "generate"), []);
    if (!project) throw new Error("expected project");

    const draft = createDraftOrder(project);
    const rendered = transitionOrder(draft, { type: "render_validated" });
    const quoted = transitionOrder(rendered, {
      type: "quote_received",
      quoteCents: 699,
      storeId: "walgreens-1",
      pickupWindowMinutes: 60
    });
    const approvedForShare = transitionOrder(quoted, { type: "external_share_approved" });
    const blockedHandoff = transitionOrder(approvedForShare, {
      type: "attempt_vendor_handoff",
      certificationRecorded: true
    });
    const fulfilled: OrderRecord = {
      ...blockedHandoff,
      status: "fulfilled",
      auditTrail: [...blockedHandoff.auditTrail, "test terminal state"]
    };
    const invalidCases: Array<[OrderRecord, OrderTransitionEvent, string]> = [
      [rendered, { type: "external_share_approved" }, "rendered -> external_share_approved"],
      [quoted, { type: "attempt_vendor_handoff", certificationRecorded: true }, "quoted -> attempt_vendor_handoff"],
      [approvedForShare, { type: "fulfilled" }, "external_share_approved -> fulfilled"],
      [blockedHandoff, { type: "fulfilled" }, "vendor_handoff_blocked -> fulfilled"],
      [fulfilled, { type: "cancel" }, "fulfilled -> cancel"]
    ];

    for (const [order, event, transition] of invalidCases) {
      expect(() => transitionOrder(order, event)).toThrow(`Invalid order transition: ${transition}`);
    }
  });

  it("validates layout-safe print panels and RTL locale requirements", () => {
    const valid = validatePrintLayout([
      { panel: "front", text: "For Sara and Ahmed", locale: "en-US" },
      { panel: "inside-left", text: "A concise message.", locale: "en-US" }
    ]);
    const overflowing = validatePrintLayout([
      { panel: "inside-right", text: "Very long ".repeat(80), locale: "en-US" }
    ]);
    const rtlMismatch = validatePrintLayout([{ panel: "front", text: "Hello", locale: "ar-EG" }]);

    expect(valid.every((panel) => panel.passed)).toBe(true);
    expect(overflowing[0].failures).toContain("text-overflow");
    expect(rtlMismatch[0].failures).toContain("rtl-locale-without-rtl-text");
  });

  it("renders deterministic 5x7 print assets only after layout validation passes", () => {
    const packet = renderPrintPacket([
      { panel: "front", text: "For Sara and Ahmed", locale: "en-US" },
      { panel: "inside-left", text: "A concise warm message.", locale: "en-US" },
      { panel: "inside-right", text: "Pickup-ready after review.", locale: "en-US" },
      { panel: "back", text: "CustomCard", locale: "en-US" }
    ]);
    const blocked = renderPrintPacket([{ panel: "front", text: "unbrokenword".repeat(8), locale: "en-US" }]);

    expect(packet.kind).toBe("validated_print_packet");
    expect(packet.assets).toHaveLength(4);
    expect(packet.assets[0]).toMatchObject({ width: 1500, height: 2100, dpi: 300, direction: "ltr" });
    expect(packet.assets[0].svg).toContain('viewBox="0 0 1500 2100"');
    expect(packet.assets[0].checksum).toMatch(/^cc_[0-9a-f]{8}$/);
    expect(blocked.kind).toBe("blocked");
    expect(blocked.reason).toContain("word-too-long");
    expect(blocked.assets).toEqual([]);
  });

  it("enforces regional controls and vendor-share approval", () => {
    const euUser: UserAccount = { ...user, region: "EU" };
    const blockedShare = evaluateRegulatoryDecision(euUser, "vendor_share", false);
    const approvedShare = evaluateRegulatoryDecision(euUser, "vendor_share", true);

    expect(blockedShare.allowed).toBe(false);
    expect(blockedShare.requiredControls).toContain("right to erasure");
    expect(blockedShare.requiredControls).toContain("just-in-time external sharing approval");
    expect(approvedShare.allowed).toBe(true);
  });

  it("separates dev/test/prod runtime config and blocks unsafe production defaults", () => {
    const dev = getRuntimeConfig("five-dollar-droplet", "dev");
    const prod = getRuntimeConfig("cloud-native-saas", "prod");
    const unsafeProd = {
      ...prod,
      database: {
        ...prod.database,
        kind: "sqlite" as const
      }
    };

    expect(dev.database.name).toBe("customcard_dev");
    expect(dev.storage.objectStore).toBe("filesystem");
    expect(validateRuntimeReadiness(dev).map((check) => check.id)).toContain("droplet-cost");
    expect(prod.database.name).toBe("customcard_prod");
    expect(prod.database.kind).toBe("postgres");
    expect(prod.jobs.mode).toBe("durable_queue");
    expect(prod.secrets.provider).toBe("managed_secret_store");
    expect(validateRuntimeReadiness(prod).every((check) => check.status !== "blocked")).toBe(true);
    expect(validateRuntimeReadiness(unsafeProd).find((check) => check.id === "prod-sqlite")?.status).toBe("blocked");
  });

  it("builds an end-to-end demo service slice with recovery and policy evidence", () => {
    const slice = buildDemoServiceSlice();

    expect(slice.opportunities[0].decision).toBe("generate");
    expect(slice.project?.operationalRun.printPacket.kind).toBe("mock_manifest");
    expect(slice.renderPacket.kind).toBe("validated_print_packet");
    expect(slice.renderPacket.assets).toHaveLength(4);
    expect(slice.order?.status).toBe("event_moved_up");
    expect(slice.order?.recoveryActions).toContain("switch to one-hour pickup");
    expect(slice.layoutValidations.every((panel) => panel.passed)).toBe(true);
    expect(slice.regulatoryDecisions.find((decision) => decision.action === "vendor_share")?.allowed).toBe(false);
  });
});
