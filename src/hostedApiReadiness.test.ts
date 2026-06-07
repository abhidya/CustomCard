import { describe, expect, it } from "vitest";
import {
  hostedApiReadinessItems,
  summarizeHostedApiReadiness,
  validateHostedApiReadiness,
  type HostedApiReadinessItem
} from "./hostedApiReadiness";

describe("hosted API readiness", () => {
  it("tracks Vercel and hosted DB proof readiness without claiming public production proof", () => {
    const summary = summarizeHostedApiReadiness();

    expect(validateHostedApiReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 2,
      evidenceMissing: 5,
      protectionBlocked: 1,
      hostedDbRequired: 5,
      publicRouteProofRequired: 3,
      hostedTokenVerificationRequired: 3,
      backupPolicyRequired: 2,
      repoLocalContractProofs: 2,
      liveHostedProofRequired: 5,
      protectionBlockedProofs: 1,
      liveProofClaims: 0,
      routeContracts: 5,
      requiredEnvVars: 6,
      envSyncProofs: 0,
      hostedDbProofs: 0,
      publicRouteProofs: 0,
      hostedTokenVerificationProofs: 0,
      backupPolicies: 0,
      deploymentProtectionBypasses: 0,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      blockers: []
    });
    expect(summary.sourceSignals).toBeGreaterThanOrEqual(25);
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Vercel project link",
        "DATABASE_URL configured proof",
        "Hosted /api/admin/readiness runtime=postgres response",
        "Hosted customer token probe",
        "Hosted backup policy"
      ])
    );
  });

  it("covers hosted env, routes, deployment protection, token verification, and backup policy explicitly", () => {
    const envSync = hostedApiReadinessItems.find((item) => item.id === "hosted-env-sync");
    const publicProof = hostedApiReadinessItems.find((item) => item.id === "public-db-backed-route-proof");
    const protection = hostedApiReadinessItems.find((item) => item.id === "deployment-protection-boundary");
    const hostedToken = hostedApiReadinessItems.find((item) => item.id === "hosted-account-token-verification");
    const backup = hostedApiReadinessItems.find((item) => item.id === "backup-recovery-policy");

    expect(envSync?.envVarNames).toEqual(
      expect.arrayContaining([
        "CUSTOMCARD_API_RUNTIME",
        "DATABASE_URL",
        "CUSTOMCARD_CUSTOMER_SESSION_TOKEN",
        "CUSTOMCARD_ADMIN_SESSION_TOKEN",
        "AUTH_SESSION_SECRET",
        "IDEMPOTENCY_KEY_TTL_HOURS"
      ])
    );
    expect(publicProof?.routeIds).toEqual(
      expect.arrayContaining(["/api/health", "/api/admin/readiness", "/api/customer/bootstrap", "/api/render-packets"])
    );
    expect(publicProof).toMatchObject({
      proofScope: "live-hosted-required",
      requiresHostedDb: true,
      requiresPublicRouteProof: true,
      requiresHostedTokenVerification: true,
      liveProofClaimed: false,
      publicRouteProofAttached: false
    });
    expect(protection).toMatchObject({
      status: "protection-blocked",
      proofScope: "protection-blocked",
      requiresPublicRouteProof: true,
      liveProofClaimed: false,
      deploymentProtectionBypassed: false
    });
    expect(hostedToken).toMatchObject({
      proofScope: "live-hosted-required",
      requiresHostedTokenVerification: true,
      liveProofClaimed: false,
      hostedTokenVerificationAttached: false
    });
    expect(backup).toMatchObject({
      proofScope: "live-hosted-required",
      requiresBackupPolicy: true,
      liveProofClaimed: false,
      backupPolicyAttached: false
    });
  });

  it("flags unsafe hosted proof claims before admin or API readiness can expose them", () => {
    const unsafeItems: HostedApiReadinessItem[] = [
      {
        ...hostedApiReadinessItems[0],
        proofScope: "unsupported",
        liveProofClaimed: true,
        environmentSynced: true,
        hostedDbConnected: true,
        publicRouteProofAttached: true,
        hostedTokenVerificationAttached: true,
        backupPolicyAttached: true,
        deploymentProtectionBypassed: true,
        externalNetworkCalls: true,
        realOrdersEnabled: true,
        liveProviderCalls: true,
        requiredSourceSignals: ["one"],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as HostedApiReadinessItem,
      {
        ...hostedApiReadinessItems[0]
      }
    ];

    expect(validateHostedApiReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate hosted API readiness item: vercel-project-link.",
        "Hosted API readiness item vercel-project-link has unsupported proofScope.",
        "Hosted API readiness item vercel-project-link must not claim liveProofClaimed.",
        "Hosted API readiness item vercel-project-link must list source signals.",
        "Hosted API readiness item vercel-project-link must list current repo-local evidence.",
        "Hosted API readiness item vercel-project-link must list at least two required evidence items.",
        "Hosted API readiness item vercel-project-link must explain its blocker.",
        "Hosted API readiness item vercel-project-link must not claim environmentSynced.",
        "Hosted API readiness item vercel-project-link must not claim hostedDbConnected.",
        "Hosted API readiness item vercel-project-link must not claim publicRouteProofAttached.",
        "Hosted API readiness item vercel-project-link must not claim hostedTokenVerificationAttached.",
        "Hosted API readiness item vercel-project-link must not claim backupPolicyAttached.",
        "Hosted API readiness item vercel-project-link must not claim deploymentProtectionBypassed.",
        "Hosted API readiness item vercel-project-link must not require live external network calls.",
        "Hosted API readiness item vercel-project-link must keep realOrdersEnabled=false.",
        "Hosted API readiness item vercel-project-link must keep liveProviderCalls=false.",
        "Missing hosted API readiness item: public-db-backed-route-proof.",
        "Missing hosted API readiness item: hosted-account-token-verification."
      ])
    );

    expect(
      validateHostedApiReadiness([
        {
          ...hostedApiReadinessItems.find((item) => item.id === "hosted-env-sync")!,
          envVarNames: ["DATABASE_URL"]
        },
        {
          ...hostedApiReadinessItems.find((item) => item.id === "public-db-backed-route-proof")!,
          routeIds: ["/api/health"],
          envVarNames: ["DATABASE_URL"],
          requiresHostedTokenVerification: false
        },
        {
          ...hostedApiReadinessItems.find((item) => item.id === "deployment-protection-boundary")!,
          status: "evidence-missing",
          proofScope: "live-hosted-required",
          requiresPublicRouteProof: false
        },
        {
          ...hostedApiReadinessItems.find((item) => item.id === "hosted-account-token-verification")!,
          routeIds: ["/api/admin/readiness"],
          requiresHostedTokenVerification: false
        },
        {
          ...hostedApiReadinessItems.find((item) => item.id === "backup-recovery-policy")!,
          requiresBackupPolicy: false
        }
      ] as unknown as HostedApiReadinessItem[])
    ).toEqual(
      expect.arrayContaining([
        "Hosted env sync must include env var: CUSTOMCARD_API_RUNTIME.",
        "Public DB-backed route proof must include route: /api/admin/readiness.",
        "Public DB-backed route proof must include env var: CUSTOMCARD_CUSTOMER_SESSION_TOKEN.",
        "Public DB-backed route proof must require hosted DB, public route, and hosted token evidence.",
        "Deployment protection boundary must remain protection-blocked.",
        "Deployment protection boundary must require public route proof without claiming a bypass.",
        "Deployment protection boundary must keep proofScope=protection-blocked.",
        "Hosted account-token verification must require hosted token evidence without claiming it.",
        "Hosted account-token verification must include route: /api/customer/bootstrap.",
        "Backup and recovery policy must require backup evidence without claiming it."
      ])
    );
  });
});
