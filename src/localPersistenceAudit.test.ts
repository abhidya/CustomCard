import { describe, expect, it } from "vitest";
import { reviewerWorkspaceKey } from "./reviewerBootstrap";
import {
  browserThemeStorageKey,
  localPersistenceAuditItems,
  reviewerLocalWorkspaceStorageKey,
  summarizeLocalPersistenceAudit
} from "./localPersistenceAudit";

describe("local persistence audit", () => {
  it("keeps customer state out of browser-local persistence", () => {
    const summary = summarizeLocalPersistenceAudit();

    expect(reviewerLocalWorkspaceStorageKey).toBe(reviewerWorkspaceKey);
    expect(summary).toMatchObject({
      service: "customcard-local-persistence-audit",
      status: "browser-only-ok",
      total: 6,
      dbRequired: 0,
      objectStoreRequired: 0,
      browserOnly: 0,
      customerDataItems: 5,
      localStorageKeys: []
    });
    expect(summary.actions).toEqual([]);
    expect(summary.targetTables).toEqual(
      expect.arrayContaining([
        "users",
        "account_identities",
        "auth_sessions",
        "relationship_memories",
        "provider_connections",
        "imported_events",
        "card_opportunities",
        "draft_states",
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
        "/api/customer/draft-state/current",
        "/api/customer/draft-state",
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
      currentSurface: "browser-memory",
      currentKey: "",
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
