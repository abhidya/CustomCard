import { describe, expect, it } from "vitest";
import { buildDemoSeedPlan, buildDemoSeedSqlPreview } from "./demoSeed";
import {
  reviewerDbSeedReadinessItems,
  summarizeReviewerDbSeedReadiness,
  validateReviewerDbSeedReadiness,
  type ReviewerDbSeedReadinessItem
} from "./reviewerDbSeedReadiness";

describe("reviewer DB seed readiness", () => {
  it("tracks hosted reviewer seed proof requirements without claiming hosted DB mutation evidence", () => {
    const summary = summarizeReviewerDbSeedReadiness();

    expect(validateReviewerDbSeedReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 3,
      evidenceMissing: 5,
      hostedDatabaseRequired: 5,
      hostedSeedExecutionRequired: 3,
      hostedTokenProbeRequired: 4,
      vercelEnvSyncRequired: 5,
      rollbackRequired: 6,
      sqlPreviewOnly: 8,
      tableContracts: 14,
      routeContracts: 5,
      requiredEnvVars: 6,
      hostedSeedProofs: 0,
      hostedTokenProbeProofs: 0,
      vercelEnvSyncProofs: 0,
      destructiveLiveMutations: 0,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Hosted reviewer database URL",
        "Hosted demo reset response",
        "Hosted admin readiness token probe",
        "Vercel env ls with required keys",
        "Hosted rollback run"
      ])
    );
  });

  it("matches the demo seed plan tables, rows, SQL preview, and account-token contract", async () => {
    const plan = await buildDemoSeedPlan();
    const preview = buildDemoSeedSqlPreview(plan);
    const summary = summarizeReviewerDbSeedReadiness();
    const seedPlan = reviewerDbSeedReadinessItems.find((item) => item.id === "reviewer-seed-plan-contract");
    const tokenContract = reviewerDbSeedReadinessItems.find((item) => item.id === "reviewer-session-token-contract");

    expect(plan.rows).toHaveLength(17);
    expect(new Set(plan.rows.map((row) => row.table)).size).toBe(summary.tableContracts);
    expect(seedPlan?.tableNames).toEqual(expect.arrayContaining(Array.from(new Set(plan.rows.map((row) => row.table)))));
    expect(tokenContract?.envVarNames).toEqual(
      expect.arrayContaining(["CUSTOMCARD_CUSTOMER_SESSION_TOKEN", "CUSTOMCARD_ADMIN_SESSION_TOKEN", "AUTH_SESSION_SECRET"])
    );
    expect(tokenContract?.routeIds).toEqual(expect.arrayContaining(["/api/admin/readiness", "/api/customer/bootstrap"]));
    expect(preview.resetSql).toHaveLength(summary.tableContracts);
    expect(preview.insertSql).toHaveLength(plan.rows.length);
    expect(preview.resetSql.join("\n")).toContain("DELETE FROM auth_sessions");
    expect(preview.insertSql.join("\n")).toContain("INSERT INTO auth_sessions");
  });

  it("flags unsafe hosted seed claims before admin or API readiness can expose them", () => {
    const unsafeItems: ReviewerDbSeedReadinessItem[] = [
      {
        ...reviewerDbSeedReadinessItems[0],
        hostedSeedExecuted: true,
        hostedTokenProbeAttached: true,
        vercelEnvSynced: true,
        destructiveLiveMutation: true,
        externalNetworkCalls: true,
        liveProviderCalls: true,
        realOrdersEnabled: true,
        requiredSourceSignals: ["one"],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as ReviewerDbSeedReadinessItem,
      {
        ...reviewerDbSeedReadinessItems[0]
      }
    ];

    expect(validateReviewerDbSeedReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate reviewer DB seed readiness item: reviewer-seed-plan-contract.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must list source signals.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must list current repo-local evidence.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must list at least two required evidence items.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must explain its blocker.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must not claim hostedSeedExecuted.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must not claim hostedTokenProbeAttached.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must not claim vercelEnvSynced.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must not enable destructive live mutations.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must not require live external network calls.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must keep liveProviderCalls=false.",
        "Reviewer DB seed readiness item reviewer-seed-plan-contract must keep realOrdersEnabled=false.",
        "Missing reviewer DB seed readiness item: hosted-seed-execution-proof.",
        "Missing reviewer DB seed readiness item: hosted-admin-customer-token-probe."
      ])
    );

    expect(
      validateReviewerDbSeedReadiness([
        {
          ...reviewerDbSeedReadinessItems.find((item) => item.id === "reviewer-seed-plan-contract")!,
          tableNames: ["users"],
          rollbackRequired: false
        },
        {
          ...reviewerDbSeedReadinessItems.find((item) => item.id === "reviewer-session-token-contract")!,
          envVarNames: ["CUSTOMCARD_CUSTOMER_SESSION_TOKEN"],
          routeIds: ["/api/admin/readiness"]
        },
        {
          ...reviewerDbSeedReadinessItems.find((item) => item.id === "hosted-seed-execution-proof")!,
          tableNames: ["users"],
          envVarNames: ["DATABASE_URL"],
          requiresHostedTokenProbe: false
        },
        {
          ...reviewerDbSeedReadinessItems.find((item) => item.id === "hosted-admin-customer-token-probe")!,
          routeIds: ["/api/admin/readiness"],
          requiresHostedTokenProbe: false
        },
        {
          ...reviewerDbSeedReadinessItems.find((item) => item.id === "vercel-env-seed-sync")!,
          envVarNames: ["DATABASE_URL"],
          requiresVercelEnvSync: false
        },
        {
          ...reviewerDbSeedReadinessItems.find((item) => item.id === "rollback-cleanup-drill")!,
          tableNames: ["users"],
          rollbackRequired: false
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Reviewer seed plan contract must include table: auth_sessions.",
        "Reviewer seed plan contract must stay rollback-required and SQL-preview-only.",
        "Reviewer session token contract must include env var: CUSTOMCARD_ADMIN_SESSION_TOKEN.",
        "Reviewer session token contract must include route: /api/customer/bootstrap.",
        "Hosted seed execution proof must include table: auth_sessions.",
        "Hosted seed execution proof must include env var: CUSTOMCARD_API_RUNTIME.",
        "Hosted seed execution proof must require hosted database, seed execution, and token probe evidence.",
        "Hosted admin and customer token probe must include route: /api/customer/bootstrap.",
        "Hosted admin and customer token probe must require hosted token evidence without claiming it.",
        "Vercel env seed sync must include env var: CUSTOMCARD_API_RUNTIME.",
        "Vercel env seed sync must require env sync evidence without claiming it.",
        "Rollback cleanup drill must include table: auth_sessions.",
        "Rollback cleanup drill must require hosted seed execution and rollback evidence."
      ])
    );
  });
});
