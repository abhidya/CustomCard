import { describe, expect, it } from "vitest";
import {
  buildDemoSeedPlan,
  buildDemoSeedSqlPreview,
  summarizeDemoSeedPlan,
  validateDemoSeedPlan,
  type DemoSeedPlan
} from "./demoSeed";

describe("demo seed reset contract", () => {
  it("builds a deterministic reviewer seed plan with signed artifact handoff coverage", async () => {
    const plan = await buildDemoSeedPlan();
    const summary = summarizeDemoSeedPlan(plan);

    expect(validateDemoSeedPlan(plan)).toEqual([]);
    expect(summary).toMatchObject({
      service: "customcard-demo-seed",
      status: "ready",
      tables: 14,
      rows: 17,
      renderArtifacts: 6,
      signedArtifactUrls: true,
      idempotentReset: true,
      rawContentStored: false,
      liveExternalCalls: false,
      realOrdersEnabled: false
    });
    expect(plan.workspace).toMatchObject({
      userId: "user-demo",
      adminId: "admin-demo",
      email: "demo@customcard.local"
    });
    expect(plan.artifactHandoff).toMatchObject({
      projectId: "project-demo",
      artifactCount: 6,
      storageProvider: "filesystem"
    });
    expect(plan.rows.map((row) => row.table)).toEqual(
      expect.arrayContaining([
        "users",
        "auth_sessions",
        "provider_connections",
        "imported_events",
        "card_opportunities",
        "relationship_memories",
        "card_projects",
        "render_packets",
        "orders",
        "order_events",
        "vendor_quotes",
        "consent_records",
        "data_requests",
        "audit_log"
      ])
    );
  });

  it("generates a reset SQL preview without live commerce or raw-content claims", async () => {
    const plan = await buildDemoSeedPlan();
    const preview = buildDemoSeedSqlPreview(plan);
    const sql = [...preview.resetSql, ...preview.insertSql].join("\n");

    expect(preview.resetSql[0]).toContain("DELETE FROM audit_log");
    expect(sql).toContain("id IN ('mem-sara-ahmed-10-year-thread', 'mem-family-reverent-tone')");
    expect(sql).toContain("INSERT INTO users");
    expect(sql).toContain("INSERT INTO render_packets");
    expect(sql).toContain("artifact_manifest");
    expect(sql).toContain("real_orders_enabled");
    expect(sql).toContain("FALSE");
    expect(sql).not.toContain("TRUE, 'live_quote'");
  });

  it("flags unsafe seed edits before a demo reset is trusted", async () => {
    const plan = await buildDemoSeedPlan();
    const unsafePlan = {
      ...plan,
      safety: {
        ...plan.safety,
        realOrdersEnabled: true
      },
      rows: plan.rows.map((row) =>
        row.table === "orders"
          ? {
              ...row,
              values: {
                ...row.values,
                real_orders_enabled: true
              }
            }
          : row
      )
    } as unknown as DemoSeedPlan;

    expect(validateDemoSeedPlan(unsafePlan)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("must not enable live commerce"),
        "Demo seed must not enable real orders."
      ])
    );
    expect(summarizeDemoSeedPlan(unsafePlan).status).toBe("blocked");
  });
});
