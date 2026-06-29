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
      evidenceMissing: 2,
      liveProofAttached: 2,
      partialLiveProof: 2,
      protectionBlocked: 0,
      hostedDbRequired: 5,
      publicRouteProofRequired: 3,
      hostedTokenVerificationRequired: 3,
      backupPolicyRequired: 2,
      repoLocalContractProofs: 2,
      liveHostedProofRequired: 2,
      liveHostedProofAttached: 2,
      partialLiveHostedProofs: 2,
      protectionBlockedProofs: 0,
      liveProofClaims: 2,
      routeContracts: 5,
      requiredEnvVars: 13,
      envSyncProofs: 0,
      hostedDbProofs: 2,
      publicRouteProofs: 2,
      hostedTokenVerificationProofs: 0,
      backupPolicies: 0,
      deploymentProtectionBypasses: 1,
      externalNetworkCalls: 0,
      realOrdersEnabled: 0,
      liveProviderCalls: 0,
      evidenceArtifacts: 10,
      blockers: []
    });
    expect(summary.sourceSignals).toBeGreaterThanOrEqual(25);
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Vercel project link",
        "DATABASE_URL configured proof",
        "Keep hosted health runtime=postgres capture current",
        "Hosted Clerk customer JWT probe",
        "Hosted backup policy"
      ])
    );
  });

  it("covers hosted env, routes, deployment protection, token verification, and backup policy explicitly", () => {
    const envSync = hostedApiReadinessItems.find((item) => item.id === "hosted-env-sync");
    const publicProof = hostedApiReadinessItems.find((item) => item.id === "public-db-backed-route-proof");
    const protection = hostedApiReadinessItems.find((item) => item.id === "deployment-protection-boundary");
    const hostedToken = hostedApiReadinessItems.find((item) => item.id === "hosted-clerk-token-verification");
    const backup = hostedApiReadinessItems.find((item) => item.id === "backup-recovery-policy");

    expect(envSync?.envVarNames).toEqual(
      expect.arrayContaining([
        "CUSTOMCARD_API_RUNTIME",
        "DATABASE_URL",
        "AUTH_SESSION_SECRET",
        "CLERK_JWT_KEY",
        "CLERK_AUTHORIZED_PARTIES",
        "CLERK_ISSUER",
        "CLERK_AUDIENCE",
        "IDEMPOTENCY_KEY_TTL_HOURS"
      ])
    );
    expect(envSync).toMatchObject({
      status: "partial-live-proof",
      proofScope: "partial-live-hosted",
      environmentSynced: false,
      evidenceArtifactRefs: [
        "docs/evidence/hosted-api/2026-06-15-vercel-env-inventory.json",
        "docs/evidence/hosted-api/2026-06-15-vercel-env-repair-plan.json",
        "docs/evidence/hosted-api/2026-06-15-vercel-env-repair-partial-ttl.json",
        "docs/evidence/hosted-api/2026-06-15-vercel-env-inventory-after-ttl-repair.json"
      ]
    });
    expect(envSync?.requiredSourceSignals).toEqual(
      expect.arrayContaining([
        "hosted:env:inventory",
        "hosted:env:repair",
        "npm run hosted:env:inventory -- --confirm-hosted-env-inventory",
        "npm run hosted:env:repair -- --confirm-hosted-env-repair",
        "npm run hosted:env:repair -- --confirm-hosted-env-repair --apply",
        "npm run hosted:env:repair -- --confirm-hosted-env-repair --apply --allow-partial",
        "npm run hosted:env:repair -- --confirm-hosted-env-repair --apply --acknowledge-production",
        "CUSTOMCARD_HOSTED_API_ENV",
        "CUSTOMCARD_VERCEL_ENV_TARGET"
      ])
    );
    expect(envSync?.currentEvidence).toEqual(
      expect.arrayContaining([
        "scripts/hosted-vercel-env-inventory.mjs provides a guarded, redacted QA/production Vercel env inventory probe",
        "scripts/hosted-vercel-env-repair.mjs provides a guarded, redacted plan/apply path for missing Vercel production env keys",
        "2026-06-15 redacted Vercel production env inventory confirms CUSTOMCARD_API_RUNTIME, DATABASE_URL, AUTH_SESSION_SECRET, CLERK_JWT_KEY, and CLERK_AUTHORIZED_PARTIES",
        "2026-06-15 redacted Vercel production env inventory is missing CLERK_ISSUER, CLERK_AUDIENCE, and IDEMPOTENCY_KEY_TTL_HOURS",
        "2026-06-15 redacted Vercel env repair plan confirms CLERK_ISSUER, CLERK_AUDIENCE, and IDEMPOTENCY_KEY_TTL_HOURS still need operator-supplied values before apply",
        "2026-06-15 guarded partial repair applied IDEMPOTENCY_KEY_TTL_HOURS to production without exposing its value",
        "2026-06-15 post-repair redacted Vercel production env inventory confirms IDEMPOTENCY_KEY_TTL_HOURS is now present and only CLERK_ISSUER plus CLERK_AUDIENCE remain missing"
      ])
    );
    expect(envSync?.requiredEvidence).toEqual(
      expect.arrayContaining(["Sanitized npm run hosted:env:inventory output", "Sanitized npm run hosted:env:repair output"])
    );
    expect(publicProof?.routeIds).toEqual(
      expect.arrayContaining(["/api/health", "/api/admin/readiness", "/api/customer/bootstrap", "/api/render-packets"])
    );
    expect(publicProof).toMatchObject({
      proofScope: "partial-live-hosted",
      requiresHostedDb: true,
      requiresPublicRouteProof: true,
      requiresHostedTokenVerification: true,
      liveProofClaimed: false,
      hostedDbConnected: true,
      publicRouteProofAttached: true
    });
    expect(publicProof?.currentEvidence).toEqual(
      expect.arrayContaining([
        "scripts/hosted-clerk-route-probe.mjs provides a read-only hosted Clerk route probe for QA or production",
        "scripts/hosted-mutation-audit-probe.mjs provides a guarded hosted render-packet mutation, idempotency replay/conflict, and audit-counter probe"
      ])
    );
    expect(publicProof?.requiredEvidence).toEqual(
      expect.arrayContaining(["Sanitized npm run hosted:mutation:probe output"])
    );
    expect(protection).toMatchObject({
      status: "live-proof-attached",
      proofScope: "live-hosted-attached",
      requiresPublicRouteProof: true,
      liveProofClaimed: true,
      publicRouteProofAttached: true,
      deploymentProtectionBypassed: true,
      evidenceArtifactRefs: ["docs/evidence/hosted-api/2026-06-15-public-route-probes.md"]
    });
    expect(hostedToken).toMatchObject({
      proofScope: "live-hosted-required",
      requiresHostedTokenVerification: true,
      liveProofClaimed: false,
      hostedTokenVerificationAttached: false,
      evidenceArtifactRefs: [
        "docs/evidence/hosted-api/2026-06-15-clerk-public-config-probe.json",
        "docs/evidence/hosted-api/2026-06-15-clerk-config-repair-plan.json"
      ]
    });
    expect(hostedToken?.requiredSourceSignals).toEqual(
      expect.arrayContaining([
        "hosted:clerk:public-config",
        "hosted:clerk:repair",
        "npm run hosted:clerk:public-config -- --confirm-hosted-clerk-public-config-probe",
        "npm run hosted:clerk:repair -- --confirm-hosted-clerk-config-repair",
        "npm run hosted:clerk:repair -- --confirm-hosted-clerk-config-repair --apply",
        "npm run hosted:clerk:repair -- --confirm-hosted-clerk-config-repair --apply --acknowledge-production",
        "npm run hosted:clerk:repair -- --confirm-hosted-clerk-config-repair --apply --acknowledge-public-key-replace",
        "VITE_CLERK_PUBLISHABLE_KEY",
        "pk_test",
        "pk_live",
        "hosted:auth:probe",
        "npm run hosted:auth:probe -- --confirm-hosted-auth-probe",
        "CUSTOMCARD_HOSTED_CUSTOMER_JWT",
        "CUSTOMCARD_HOSTED_ADMIN_JWT",
        "wrong-role blocking"
      ])
    );
    expect(hostedToken?.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Hosted public app bundle Clerk pk_live proof",
        "Sanitized npm run hosted:clerk:public-config output",
        "Sanitized npm run hosted:clerk:repair output",
        "Sanitized npm run hosted:auth:probe output"
      ])
    );
    expect(hostedToken?.currentEvidence).toEqual(
      expect.arrayContaining([
        "scripts/hosted-clerk-public-config-probe.mjs provides a guarded, redacted hosted public bundle check for Clerk pk_test versus pk_live configuration",
        "2026-06-15 production hosted public app bundle probe found one redacted Clerk pk_test publishable key, no pk_live publishable key, and decoded issuer candidate https://model-bluejay-21.clerk.accounts.dev",
        "scripts/hosted-clerk-config-repair.mjs provides a guarded, redacted plan/apply path for replacing VITE_CLERK_PUBLISHABLE_KEY with pk_live, deriving CLERK_ISSUER, and applying CLERK_AUDIENCE",
        "2026-06-15 guarded Clerk config repair plan confirms no pk_live publishable key or CLERK_AUDIENCE value is available locally, public config still ships pk_test, and CLERK_ISSUER plus CLERK_AUDIENCE are missing in Vercel production"
      ])
    );
    expect(backup).toMatchObject({
      proofScope: "live-hosted-required",
      requiresBackupPolicy: true,
      liveProofClaimed: false,
      backupPolicyAttached: false
    });
    expect(backup?.envVarNames).toEqual(
      expect.arrayContaining([
        "DATABASE_URL",
        "CUSTOMCARD_RESTORE_DATABASE_URL",
        "CUSTOMCARD_BACKUP_RETENTION_DAYS",
        "CUSTOMCARD_BACKUP_RPO_MINUTES",
        "CUSTOMCARD_BACKUP_RTO_MINUTES",
        "CUSTOMCARD_RESTORE_POINT_IN_TIME"
      ])
    );
    expect(backup?.requiredSourceSignals).toEqual(
      expect.arrayContaining([
        "hosted:rollback:plan:doctor",
        "docs/hosted-migration-rollback-plan.md",
        "hosted:db:restore:drill",
        "npm run hosted:db:restore:drill -- --confirm-hosted-db-restore-drill"
      ])
    );
    expect(backup?.currentEvidence).toEqual(
      expect.arrayContaining([
        "docs/hosted-migration-rollback-plan.md attaches the Migration rollback plan",
        "scripts/hosted-migration-rollback-plan-doctor.mjs validates the rollback plan without claiming live rollback execution"
      ])
    );
    expect(backup?.requiredEvidence).toEqual(
      expect.arrayContaining(["Sanitized npm run hosted:db:restore:drill output", "Executed rollback drill output"])
    );
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
        evidenceArtifactRefs: [],
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
        "Hosted API readiness item vercel-project-link cannot claim liveProofClaimed without evidenceArtifactRefs.",
        "Hosted API readiness item vercel-project-link must list source signals.",
        "Hosted API readiness item vercel-project-link must list current repo-local evidence.",
        "Hosted API readiness item vercel-project-link must list at least two required evidence items.",
        "Hosted API readiness item vercel-project-link must explain its blocker.",
        "Hosted API readiness item vercel-project-link cannot claim environmentSynced without evidenceArtifactRefs.",
        "Hosted API readiness item vercel-project-link cannot claim hostedDbConnected without evidenceArtifactRefs.",
        "Hosted API readiness item vercel-project-link cannot claim publicRouteProofAttached without evidenceArtifactRefs.",
        "Hosted API readiness item vercel-project-link must not claim hostedTokenVerificationAttached.",
        "Hosted API readiness item vercel-project-link must not claim backupPolicyAttached.",
        "Hosted API readiness item vercel-project-link cannot claim deploymentProtectionBypassed without deployment-protection evidence.",
        "Hosted API readiness item vercel-project-link must not require live external network calls.",
        "Hosted API readiness item vercel-project-link must keep realOrdersEnabled=false.",
        "Hosted API readiness item vercel-project-link must keep liveProviderCalls=false.",
        "Missing hosted API readiness item: public-db-backed-route-proof.",
        "Missing hosted API readiness item: hosted-clerk-token-verification."
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
          ...hostedApiReadinessItems.find((item) => item.id === "hosted-clerk-token-verification")!,
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
        "Public DB-backed route proof must include env var: CUSTOMCARD_API_RUNTIME.",
        "Public DB-backed route proof must include env var: CLERK_JWT_KEY.",
        "Public DB-backed route proof must require hosted DB, public route, and hosted token evidence.",
        "Deployment protection boundary must remain live-proof-attached once public probes are attached.",
        "Deployment protection boundary must include public route proof and deployment-protection bypass evidence.",
        "Deployment protection boundary must keep proofScope=live-hosted-attached.",
        "Hosted Clerk token verification must require hosted token evidence without claiming it.",
        "Hosted Clerk token verification must include route: /api/customer/bootstrap.",
        "Backup and recovery policy must require backup evidence without claiming it."
      ])
    );
  });
});
