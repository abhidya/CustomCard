import { describe, expect, it } from "vitest";
import { reviewerWorkspaceKey } from "./reviewerBootstrap";
import {
  browserThemeStorageKey,
  localPersistenceAuditItems,
  reviewerLocalWorkspaceStorageKey,
  summarizeLocalPersistenceAudit
} from "./localPersistenceAudit";

describe("local persistence audit", () => {
  it("names the browser-local customer data that must move to durable storage", () => {
    const summary = summarizeLocalPersistenceAudit();

    expect(reviewerLocalWorkspaceStorageKey).toBe(reviewerWorkspaceKey);
    expect(summary).toMatchObject({
      service: "customcard-local-persistence-audit",
      status: "action-required",
      total: 5,
      dbRequired: 4,
      objectStoreRequired: 1,
      browserOnly: 1,
      customerDataItems: 4,
      localStorageKeys: [reviewerLocalWorkspaceStorageKey, browserThemeStorageKey]
    });
    expect(summary.actions.map((action) => action.id)).toEqual([
      "local-workspace-identity",
      "approved-relationship-memories",
      "saved-event-queue-decisions",
      "card-history-render-preview"
    ]);
    expect(summary.targetTables).toEqual(
      expect.arrayContaining([
        "users",
        "account_identities",
        "auth_sessions",
        "relationship_memories",
        "provider_connections",
        "imported_events",
        "card_opportunities",
        "card_projects",
        "render_packets",
        "orders",
        "order_events",
        "audit_log"
      ])
    );
    expect(summary.apiRoutes).toEqual(
      expect.arrayContaining([
        "/api/customer/bootstrap",
        "/api/mobile/bootstrap",
        "/api/import-preview",
        "/api/memories/review",
        "/api/card-projects",
        "/api/render-packets",
        "/api/vendor-handoff/manual"
      ])
    );
  });

  it("keeps device-only preferences out of the database migration list", () => {
    const themePreference = localPersistenceAuditItems.find((item) => item.id === "theme-preference");
    const cardHistory = localPersistenceAuditItems.find((item) => item.id === "card-history-render-preview");

    expect(themePreference).toMatchObject({
      currentKey: browserThemeStorageKey,
      productionStorage: "browser-only",
      customerData: false,
      targetTables: [],
      apiRoutes: []
    });
    expect(cardHistory).toMatchObject({
      productionStorage: "postgres-and-object-store",
      targetTables: expect.arrayContaining(["card_projects", "render_packets"])
    });
    expect(cardHistory?.productionAction).toContain("object storage");
  });
});
