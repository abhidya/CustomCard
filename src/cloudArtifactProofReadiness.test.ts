import { describe, expect, it } from "vitest";
import {
  cloudArtifactProofReadinessItems,
  summarizeCloudArtifactProofReadiness,
  validateCloudArtifactProofReadiness,
  type CloudArtifactProofReadinessItem
} from "./cloudArtifactProofReadiness";

describe("cloud artifact proof readiness", () => {
  it("tracks applied cloud bucket and IAM evidence without claiming production proof", () => {
    const summary = summarizeCloudArtifactProofReadiness();

    expect(validateCloudArtifactProofReadiness()).toEqual([]);
    expect(summary).toMatchObject({
      total: 8,
      repoLocalReady: 2,
      evidenceMissing: 6,
      appliedCloudRequired: 6,
      bucketArnProofRequired: 2,
      iamPolicyProofRequired: 2,
      signedUrlProbeRequired: 3,
      accessLogProofRequired: 2,
      secretSyncRequired: 3,
      restoreDrillRequired: 1,
      terraformFileContracts: 3,
      envOutputContracts: 5,
      terraformApplyExecutions: 0,
      appliedBucketArnProofs: 0,
      iamPolicyOutputProofs: 0,
      signedUrlProbeProofs: 0,
      accessLogProofs: 0,
      secretSyncProofs: 0,
      restoreDrillProofs: 0,
      externalNetworkCalls: 0,
      liveProviderCalls: 0,
      realOrdersEnabled: 0,
      blockers: []
    });
    expect(summary.requiredEvidence).toEqual(
      expect.arrayContaining([
        "Applied bucket ARN",
        "IAM policy output",
        "Production bucket write/read transcript",
        "Access log sample",
        "Secret manager key list",
        "Restore drill transcript"
      ])
    );
  });

  it("covers Terraform source, runtime env outputs, signed URL probes, IAM, and restore requirements", () => {
    const staticIac = cloudArtifactProofReadinessItems.find((item) => item.id === "static-artifact-iac-contract");
    const bucket = cloudArtifactProofReadinessItems.find((item) => item.id === "applied-bucket-arn-proof");
    const iam = cloudArtifactProofReadinessItems.find((item) => item.id === "iam-policy-output-proof");
    const signedProbe = cloudArtifactProofReadinessItems.find((item) => item.id === "signed-url-cloud-probe");
    const secretSync = cloudArtifactProofReadinessItems.find((item) => item.id === "secret-manager-env-sync");
    const restore = cloudArtifactProofReadinessItems.find((item) => item.id === "retention-restore-drill");

    expect(staticIac?.terraformFiles).toEqual(
      expect.arrayContaining([
        "infra/aws/artifact-store/main.tf",
        "infra/aws/artifact-store/variables.tf",
        "infra/aws/artifact-store/outputs.tf"
      ])
    );
    expect(staticIac?.envOutputNames).toEqual(
      expect.arrayContaining([
        "OBJECT_STORE_URL",
        "OBJECT_STORE_BUCKET",
        "OBJECT_STORE_REGION",
        "OBJECT_STORE_SIGNING_SECRET",
        "ARTIFACT_SIGNED_URL_TTL_MINUTES"
      ])
    );
    expect(bucket).toMatchObject({ requiresAppliedCloud: true, requiresBucketArnProof: true, appliedBucketArnAttached: false });
    expect(iam).toMatchObject({ requiresAppliedCloud: true, requiresIamPolicyProof: true, iamPolicyOutputAttached: false });
    expect(signedProbe).toMatchObject({ requiresSignedUrlProbe: true, requiresSecretSync: true, signedUrlProbeAttached: false });
    expect(secretSync).toMatchObject({ requiresSecretSync: true, secretSyncAttached: false });
    expect(restore).toMatchObject({ requiresRestoreDrill: true, restoreDrillAttached: false });
  });

  it("flags unsafe applied-cloud claims before admin or API readiness can expose them", () => {
    const unsafeItems: CloudArtifactProofReadinessItem[] = [
      {
        ...cloudArtifactProofReadinessItems[0],
        terraformApplyExecuted: true,
        appliedBucketArnAttached: true,
        iamPolicyOutputAttached: true,
        signedUrlProbeAttached: true,
        accessLogAttached: true,
        secretSyncAttached: true,
        restoreDrillAttached: true,
        externalNetworkCalls: true,
        liveProviderCalls: true,
        realOrdersEnabled: true,
        requiredSourceSignals: ["one"],
        currentEvidence: [],
        requiredEvidence: ["one"],
        blocker: ""
      } as unknown as CloudArtifactProofReadinessItem,
      {
        ...cloudArtifactProofReadinessItems[0]
      }
    ];

    expect(validateCloudArtifactProofReadiness(unsafeItems)).toEqual(
      expect.arrayContaining([
        "Duplicate cloud artifact proof readiness item: static-artifact-iac-contract.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must list source signals.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must list current repo-local evidence.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must list at least two required evidence items.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must explain its blocker.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim terraformApplyExecuted.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim appliedBucketArnAttached.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim iamPolicyOutputAttached.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim signedUrlProbeAttached.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim accessLogAttached.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim secretSyncAttached.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not claim restoreDrillAttached.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must not require live external network calls.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must keep liveProviderCalls=false.",
        "Cloud artifact proof readiness item static-artifact-iac-contract must keep realOrdersEnabled=false.",
        "Missing cloud artifact proof readiness item: applied-bucket-arn-proof.",
        "Missing cloud artifact proof readiness item: iam-policy-output-proof."
      ])
    );

    expect(
      validateCloudArtifactProofReadiness([
        {
          ...cloudArtifactProofReadinessItems.find((item) => item.id === "static-artifact-iac-contract")!,
          terraformFiles: ["infra/aws/artifact-store/main.tf"],
          envOutputNames: ["OBJECT_STORE_BUCKET"]
        },
        {
          ...cloudArtifactProofReadinessItems.find((item) => item.id === "applied-bucket-arn-proof")!,
          requiresBucketArnProof: false
        },
        {
          ...cloudArtifactProofReadinessItems.find((item) => item.id === "iam-policy-output-proof")!,
          requiresIamPolicyProof: false
        },
        {
          ...cloudArtifactProofReadinessItems.find((item) => item.id === "signed-url-cloud-probe")!,
          requiresSecretSync: false
        },
        {
          ...cloudArtifactProofReadinessItems.find((item) => item.id === "secret-manager-env-sync")!,
          envOutputNames: ["OBJECT_STORE_BUCKET"],
          requiresSecretSync: false
        },
        {
          ...cloudArtifactProofReadinessItems.find((item) => item.id === "retention-restore-drill")!,
          requiresRestoreDrill: false
        }
      ])
    ).toEqual(
      expect.arrayContaining([
        "Static artifact IaC contract must include Terraform file: infra/aws/artifact-store/variables.tf.",
        "Static artifact IaC contract must include env output: OBJECT_STORE_URL.",
        "Applied bucket ARN proof must require applied cloud bucket evidence without claiming it.",
        "IAM policy output proof must require applied IAM evidence without claiming it.",
        "Signed URL cloud probe must require signed URL and secret sync evidence without claiming it.",
        "Secret manager env sync must include env output: OBJECT_STORE_URL.",
        "Secret manager env sync must require secret sync evidence without claiming it.",
        "Retention and restore drill must require restore evidence without claiming it."
      ])
    );
  });
});
