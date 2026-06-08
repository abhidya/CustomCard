import { defineReadinessRegister } from "./readinessRegister.mjs";

const requiredCloudArtifactProofReadinessIds = [
  "static-artifact-iac-contract",
  "terraform-plan-review-contract",
  "applied-bucket-arn-proof",
  "iam-policy-output-proof",
  "signed-url-cloud-probe",
  "cloud-access-log-proof",
  "secret-manager-env-sync",
  "retention-restore-drill"
];

const requiredTerraformFiles = [
  "infra/aws/artifact-store/main.tf",
  "infra/aws/artifact-store/variables.tf",
  "infra/aws/artifact-store/outputs.tf"
];

const requiredCloudEnvOutputs = [
  "OBJECT_STORE_URL",
  "OBJECT_STORE_BUCKET",
  "OBJECT_STORE_REGION",
  "OBJECT_STORE_SIGNING_SECRET",
  "ARTIFACT_SIGNED_URL_TTL_MINUTES",
  "REAL_ORDER_KILL_SWITCH"
];

const allowedStatuses = new Set(["repo-local-ready", "evidence-missing"]);

export const cloudArtifactProofReadinessItems = [
  {
    id: "static-artifact-iac-contract",
    label: "Static artifact IaC contract",
    lane: "terraform-source",
    status: "repo-local-ready",
    terraformFiles: requiredTerraformFiles,
    envOutputNames: requiredCloudEnvOutputs,
    requiredSourceSignals: ["aws_s3_bucket_public_access_block", "aws_s3_bucket_server_side_encryption_configuration", "aws_iam_policy", "runtime_environment"],
    requiresAppliedCloud: false,
    requiresBucketArnProof: false,
    requiresIamPolicyProof: false,
    requiresSignedUrlProbe: false,
    requiresAccessLogProof: false,
    requiresSecretSync: false,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["infra/aws/artifact-store Terraform source", "npm run cloud:doctor static IaC gate"],
    requiredEvidence: ["Terraform plan review", "Applied bucket ARN", "IAM policy output"],
    blocker: "Static IaC is present; no applied cloud account output is attached."
  },
  {
    id: "terraform-plan-review-contract",
    label: "Terraform plan review contract",
    lane: "terraform-plan",
    status: "repo-local-ready",
    terraformFiles: requiredTerraformFiles,
    envOutputNames: requiredCloudEnvOutputs,
    requiredSourceSignals: ["required_version", "artifact_retention_days", "allow_force_destroy", "artifact_bucket_arn"],
    requiresAppliedCloud: false,
    requiresBucketArnProof: false,
    requiresIamPolicyProof: false,
    requiresSignedUrlProbe: false,
    requiresAccessLogProof: false,
    requiresSecretSync: false,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Terraform inputs constrain retention and force-destroy safety", "outputs declare bucket/IAM/runtime env proof shape"],
    requiredEvidence: ["terraform init output", "terraform plan output", "Reviewer plan approval"],
    blocker: "Plan contract is static; no reviewed terraform plan artifact is attached."
  },
  {
    id: "applied-bucket-arn-proof",
    label: "Applied bucket ARN proof",
    lane: "bucket-proof",
    status: "evidence-missing",
    terraformFiles: ["infra/aws/artifact-store/outputs.tf"],
    envOutputNames: ["OBJECT_STORE_URL", "OBJECT_STORE_BUCKET", "OBJECT_STORE_REGION"],
    requiredSourceSignals: ["artifact_bucket_name", "artifact_bucket_arn", "OBJECT_STORE_BUCKET"],
    requiresAppliedCloud: true,
    requiresBucketArnProof: true,
    requiresIamPolicyProof: false,
    requiresSignedUrlProbe: false,
    requiresAccessLogProof: false,
    requiresSecretSync: true,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Terraform output contract names artifact_bucket_arn and runtime env values"],
    requiredEvidence: ["terraform output artifact_bucket_arn", "Cloud console bucket ID", "Runtime env OBJECT_STORE_BUCKET value"],
    blocker: "No applied bucket ARN or account-specific bucket identifier is attached."
  },
  {
    id: "iam-policy-output-proof",
    label: "IAM policy output proof",
    lane: "iam-proof",
    status: "evidence-missing",
    terraformFiles: ["infra/aws/artifact-store/main.tf", "infra/aws/artifact-store/outputs.tf"],
    envOutputNames: [],
    requiredSourceSignals: ["artifact_writer_policy_arn", "aws_iam_role_policy_attachment", "projects/*"],
    requiresAppliedCloud: true,
    requiresBucketArnProof: false,
    requiresIamPolicyProof: true,
    requiresSignedUrlProbe: false,
    requiresAccessLogProof: false,
    requiresSecretSync: false,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Prefix-scoped artifact writer IAM policy source", "optional app/worker role attachment source"],
    requiredEvidence: ["terraform output artifact_writer_policy_arn", "App role attachment ARN", "Worker role attachment ARN", "IAM Access Analyzer review"],
    blocker: "No applied IAM policy output or app/worker role attachment proof is attached."
  },
  {
    id: "signed-url-cloud-probe",
    label: "Signed URL cloud probe",
    lane: "signed-url-probe",
    status: "evidence-missing",
    terraformFiles: ["infra/aws/artifact-store/outputs.tf"],
    envOutputNames: ["OBJECT_STORE_URL", "OBJECT_STORE_SIGNING_SECRET", "ARTIFACT_SIGNED_URL_TTL_MINUTES"],
    requiredSourceSignals: ["OBJECT_STORE_URL", "OBJECT_STORE_SIGNING_SECRET", "ARTIFACT_SIGNED_URL_TTL_MINUTES"],
    requiresAppliedCloud: true,
    requiresBucketArnProof: false,
    requiresIamPolicyProof: false,
    requiresSignedUrlProbe: true,
    requiresAccessLogProof: false,
    requiresSecretSync: true,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["filesystem, injected S3-compatible, and live MinIO/S3-compatible artifact doctors exist"],
    requiredEvidence: ["Production bucket write/read transcript", "Signed URL GET probe", "Expired URL rejection probe"],
    blocker: "No signed URL probe against an applied production bucket is attached."
  },
  {
    id: "cloud-access-log-proof",
    label: "Cloud access log proof",
    lane: "audit-log-proof",
    status: "evidence-missing",
    terraformFiles: ["infra/aws/artifact-store/main.tf"],
    envOutputNames: [],
    requiredSourceSignals: ["DenyInsecureTransport", "DenyUnencryptedObjectUploads", "common_tags"],
    requiresAppliedCloud: true,
    requiresBucketArnProof: false,
    requiresIamPolicyProof: true,
    requiresSignedUrlProbe: true,
    requiresAccessLogProof: true,
    requiresSecretSync: false,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["bucket policy denies insecure transport and unencrypted writes", "runtime security doctors block raw content"],
    requiredEvidence: ["Access log sample", "Denied insecure transport event", "Denied unencrypted upload event"],
    blocker: "No applied access log sample or policy-denial event is attached."
  },
  {
    id: "secret-manager-env-sync",
    label: "Secret manager env sync",
    lane: "secret-sync",
    status: "evidence-missing",
    terraformFiles: ["infra/aws/artifact-store/outputs.tf"],
    envOutputNames: requiredCloudEnvOutputs,
    requiredSourceSignals: ["runtime_environment", "set-in-secret-manager", "OBJECT_STORE_SIGNING_SECRET"],
    requiresAppliedCloud: true,
    requiresBucketArnProof: true,
    requiresIamPolicyProof: false,
    requiresSignedUrlProbe: true,
    requiresAccessLogProof: false,
    requiresSecretSync: true,
    requiresRestoreDrill: false,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Terraform runtime_environment output declares required object-store env keys"],
    requiredEvidence: ["Secret manager key list", "Runtime env sync output", "Redacted signed URL signing-secret proof"],
    blocker: "No production secret manager sync evidence is attached."
  },
  {
    id: "retention-restore-drill",
    label: "Retention and restore drill",
    lane: "retention-restore",
    status: "evidence-missing",
    terraformFiles: ["infra/aws/artifact-store/main.tf", "infra/aws/artifact-store/variables.tf"],
    envOutputNames: [],
    requiredSourceSignals: ["aws_s3_bucket_lifecycle_configuration", "artifact_retention_days", "noncurrent_artifact_retention_days"],
    requiresAppliedCloud: true,
    requiresBucketArnProof: false,
    requiresIamPolicyProof: false,
    requiresSignedUrlProbe: false,
    requiresAccessLogProof: true,
    requiresSecretSync: false,
    requiresRestoreDrill: true,
    terraformApplyExecuted: false,
    appliedBucketArnAttached: false,
    iamPolicyOutputAttached: false,
    signedUrlProbeAttached: false,
    accessLogAttached: false,
    secretSyncAttached: false,
    restoreDrillAttached: false,
    externalNetworkCalls: false,
    liveProviderCalls: false,
    realOrdersEnabled: false,
    currentEvidence: ["Lifecycle source expires render artifacts and noncurrent versions"],
    requiredEvidence: ["Lifecycle policy output", "Restore drill transcript", "Retention approval"],
    blocker: "No applied lifecycle policy output or restore drill is attached."
  }
];

const cloudArtifactProofReadinessRegister = defineReadinessRegister({
  domainLabel: "cloud artifact proof",
  items: cloudArtifactProofReadinessItems,
  requiredIds: requiredCloudArtifactProofReadinessIds,
  itemRules(item) {
    const issues = [];
    if (!allowedStatuses.has(item.status)) issues.push(`Cloud artifact proof readiness item ${item.id} has unsupported status.`);
    if (item.requiredSourceSignals.length < 2) issues.push(`Cloud artifact proof readiness item ${item.id} must list source signals.`);
    if (item.currentEvidence.length < 1) issues.push(`Cloud artifact proof readiness item ${item.id} must list current repo-local evidence.`);
    if (item.requiredEvidence.length < 2) issues.push(`Cloud artifact proof readiness item ${item.id} must list at least two required evidence items.`);
    if (!item.blocker) issues.push(`Cloud artifact proof readiness item ${item.id} must explain its blocker.`);
    if (item.terraformApplyExecuted !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim terraformApplyExecuted.`);
    if (item.appliedBucketArnAttached !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim appliedBucketArnAttached.`);
    if (item.iamPolicyOutputAttached !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim iamPolicyOutputAttached.`);
    if (item.signedUrlProbeAttached !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim signedUrlProbeAttached.`);
    if (item.accessLogAttached !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim accessLogAttached.`);
    if (item.secretSyncAttached !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim secretSyncAttached.`);
    if (item.restoreDrillAttached !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not claim restoreDrillAttached.`);
    if (item.externalNetworkCalls !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must not require live external network calls.`);
    if (item.liveProviderCalls !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must keep liveProviderCalls=false.`);
    if (item.realOrdersEnabled !== false) issues.push(`Cloud artifact proof readiness item ${item.id} must keep realOrdersEnabled=false.`);
    return issues;
  },
  crossRules(itemsById) {
    const issues = [];

    const staticIac = itemsById.get("static-artifact-iac-contract");
    if (staticIac) {
      assertCoversTerraformFiles(staticIac, issues, "Static artifact IaC contract");
      assertCoversEnvOutputs(staticIac, issues, "Static artifact IaC contract");
    }

    const appliedBucket = itemsById.get("applied-bucket-arn-proof");
    if (appliedBucket) {
      if (!appliedBucket.requiresAppliedCloud || !appliedBucket.requiresBucketArnProof || appliedBucket.appliedBucketArnAttached !== false) {
        issues.push("Applied bucket ARN proof must require applied cloud bucket evidence without claiming it.");
      }
    }

    const iamProof = itemsById.get("iam-policy-output-proof");
    if (iamProof) {
      if (!iamProof.requiresAppliedCloud || !iamProof.requiresIamPolicyProof || iamProof.iamPolicyOutputAttached !== false) {
        issues.push("IAM policy output proof must require applied IAM evidence without claiming it.");
      }
    }

    const signedProbe = itemsById.get("signed-url-cloud-probe");
    if (signedProbe) {
      if (!signedProbe.requiresSignedUrlProbe || !signedProbe.requiresSecretSync || signedProbe.signedUrlProbeAttached !== false) {
        issues.push("Signed URL cloud probe must require signed URL and secret sync evidence without claiming it.");
      }
    }

    const secretSync = itemsById.get("secret-manager-env-sync");
    if (secretSync) {
      assertCoversEnvOutputs(secretSync, issues, "Secret manager env sync");
      if (!secretSync.requiresSecretSync || secretSync.secretSyncAttached !== false) {
        issues.push("Secret manager env sync must require secret sync evidence without claiming it.");
      }
    }

    const restore = itemsById.get("retention-restore-drill");
    if (restore) {
      if (!restore.requiresRestoreDrill || restore.restoreDrillAttached !== false) {
        issues.push("Retention and restore drill must require restore evidence without claiming it.");
      }
    }

    return issues;
  },
  summarize(items) {
    return {
      repoLocalReady: items.filter((item) => item.status === "repo-local-ready").length,
      evidenceMissing: items.filter((item) => item.status === "evidence-missing").length,
      appliedCloudRequired: items.filter((item) => item.requiresAppliedCloud).length,
      bucketArnProofRequired: items.filter((item) => item.requiresBucketArnProof).length,
      iamPolicyProofRequired: items.filter((item) => item.requiresIamPolicyProof).length,
      signedUrlProbeRequired: items.filter((item) => item.requiresSignedUrlProbe).length,
      accessLogProofRequired: items.filter((item) => item.requiresAccessLogProof).length,
      secretSyncRequired: items.filter((item) => item.requiresSecretSync).length,
      restoreDrillRequired: items.filter((item) => item.requiresRestoreDrill).length,
      terraformFileContracts: new Set(items.flatMap((item) => item.terraformFiles)).size,
      envOutputContracts: new Set(items.flatMap((item) => item.envOutputNames)).size,
      terraformApplyExecutions: items.filter((item) => item.terraformApplyExecuted).length,
      appliedBucketArnProofs: items.filter((item) => item.appliedBucketArnAttached).length,
      iamPolicyOutputProofs: items.filter((item) => item.iamPolicyOutputAttached).length,
      signedUrlProbeProofs: items.filter((item) => item.signedUrlProbeAttached).length,
      accessLogProofs: items.filter((item) => item.accessLogAttached).length,
      secretSyncProofs: items.filter((item) => item.secretSyncAttached).length,
      restoreDrillProofs: items.filter((item) => item.restoreDrillAttached).length,
      externalNetworkCalls: items.filter((item) => item.externalNetworkCalls).length,
      liveProviderCalls: items.filter((item) => item.liveProviderCalls).length,
      realOrdersEnabled: items.filter((item) => item.realOrdersEnabled).length,
      requiredEvidence: Array.from(new Set(items.flatMap((item) => item.requiredEvidence))).sort()
    };
  }
});

export function summarizeCloudArtifactProofReadiness(items = cloudArtifactProofReadinessItems) {
  return cloudArtifactProofReadinessRegister.summarize(items);
}

export function validateCloudArtifactProofReadiness(items = cloudArtifactProofReadinessItems) {
  return cloudArtifactProofReadinessRegister.validate(items);
}

function assertCoversTerraformFiles(item, issues, label) {
  for (const file of requiredTerraformFiles) {
    if (!item.terraformFiles.includes(file)) issues.push(`${label} must include Terraform file: ${file}.`);
  }
}

function assertCoversEnvOutputs(item, issues, label) {
  for (const output of requiredCloudEnvOutputs) {
    if (!item.envOutputNames.includes(output)) issues.push(`${label} must include env output: ${output}.`);
  }
}
